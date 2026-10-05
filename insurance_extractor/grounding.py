from __future__ import annotations

import re
from typing import Iterable

from .models import ExtractionEnvelope, Evidence, ExtractedField, MedicalQuestion
from .patch import ALIASES
from .preprocess import PageProfile, normalize_for_match


def _find_exact(value: str, page: PageProfile) -> str | None:
    norm = normalize_for_match(value)
    if not norm:
        return None
    text = normalize_for_match(page.text)
    pos = text.find(norm)
    if pos >= 0:
        start = max(0, pos - 110)
        end = min(len(text), pos + len(norm) + 160)
        return text[start:end]
    return None


def ground_fields(result: ExtractionEnvelope, profiles: Iterable[PageProfile]) -> None:
    profiles = list(profiles)
    for path, field in _iter_fields(result):
        if field.source == "not_found" or not field.value:
            continue
        if field.evidence:
            continue
        grounded = False
        for p in profiles:
            quote = _find_exact(field.value, p)
            if quote:
                field.evidence = [Evidence(page=p.page, quote=quote[:480])]
                field.confidence = min(0.99, max(field.confidence, 0.97 if field.source == "document" else 0.93))
                grounded = True
                break
        if not grounded and path in ALIASES:
            for p in profiles:
                for cue in ALIASES[path]:
                    if cue in p.normalized:
                        field.evidence = [Evidence(page=p.page, quote=cue)]
                        field.confidence = min(field.confidence or 0.9, 0.92)
                        grounded = True
                        break
                if grounded:
                    break
        if not grounded and field.source == "document":
            field.requires_review = True
            field.confidence = min(field.confidence, 0.70)
            field.notes = (field.notes or "") + " Could not ground LLM value to extracted page text."

    if result.health:
        _ground_medical(result.health.medical_questions, profiles)
        for member in result.health.members:
            for path, field in _iter_fields(member):
                if field.source != "not_found" and field.value and not field.evidence:
                    for p in profiles:
                        quote = _find_exact(field.value, p)
                        if quote:
                            field.evidence = [Evidence(page=p.page, quote=quote[:480])]
                            field.confidence = max(field.confidence, 0.94)
                            break


def _ground_medical(questions: list[MedicalQuestion], profiles: list[PageProfile]) -> None:
    for q in questions:
        if q.evidence:
            continue
        for p in profiles:
            if normalize_for_match(q.question)[:45] in p.normalized or any(k in p.normalized for k in ("medical history", "medical and lifestyle details")):
                q.evidence = [Evidence(page=p.page, quote=q.question[:480])]
                break
        for a in q.answers_by_member:
            if a.value and not a.evidence:
                for p in profiles:
                    if re.search(rf"\b{re.escape(a.value.strip())}\b", p.text, re.I):
                        a.evidence = [Evidence(page=p.page, quote=a.value[:80])]
                        break


def _iter_fields(obj, prefix: str = ""):
    if isinstance(obj, ExtractedField):
        yield prefix.rstrip("."), obj
        return
    if hasattr(type(obj), "model_fields"):
        for name in type(obj).model_fields:
            value = getattr(obj, name)
            if isinstance(value, list):
                for i, item in enumerate(value):
                    yield from _iter_fields(item, f"{prefix}{name}.{i}.")
            else:
                yield from _iter_fields(value, f"{prefix}{name}.")
