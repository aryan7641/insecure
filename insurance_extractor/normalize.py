from __future__ import annotations

import re
from collections import defaultdict
from datetime import datetime
from typing import Iterable

from .models import ExtractedField, ExtractionEnvelope, Evidence, Conflict, HealthExtraction, MotorExtraction, MedicalQuestion

DATE_PATTERNS = ("%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y")


def normalize_date(value: str | None) -> str | None:
    if not value:
        return value
    v = value.strip().replace("/", "-").replace(".", "-")
    for fmt in DATE_PATTERNS:
        try:
            return datetime.strptime(v, fmt).strftime("%d-%m-%Y")
        except ValueError:
            pass
    return value


def normalize_yes_no(value: str | None) -> str | None:
    if value is None:
        return None
    v = value.strip().lower()
    if v in {"y", "yes", "true", "selected", "checked"}:
        return "Yes"
    if v in {"n", "no", "false", "unselected", "unchecked"}:
        return "No"
    return value


def normalize_email(value: str | None) -> str | None:
    return value.strip().lower() if value and "@" in value else value


def normalize_phone(value: str | None) -> str | None:
    if not value:
        return value
    digits = re.sub(r"\D", "", value)
    return digits[-10:] if len(digits) >= 10 else value


def normalize_amount(value: str | None) -> str | None:
    if value is None:
        return None
    return re.sub(r"[^0-9.]", "", value.replace(",", "")) or None


def apply_common_field_normalizers(field: ExtractedField) -> None:
    note = field.notes or ""
    key = note.lower()
    if "date" in key or key.endswith("dob"):
        field.value = normalize_date(field.value)
    if "email" in key:
        field.value = normalize_email(field.value)
    if "mobile" in key or "phone" in key:
        field.value = normalize_phone(field.value)
    if "premium" in key or "amount" in key or "sum_insured" in key or "idv" in key or "share_percent" in key:
        field.value = normalize_amount(field.value)
    if "yes_no" in key or "available" in key or "financed" in key or key.endswith("ped"):
        field.value = normalize_yes_no(field.value)


def set_field(field: ExtractedField, value: str | None, source: str, confidence: float, evidence: list[Evidence] | None = None, notes: str | None = None):
    field.value = value
    field.raw_value = value
    field.source = source  # type: ignore[assignment]
    field.confidence = max(0.0, min(1.0, confidence))
    field.evidence = evidence or []
    field.notes = notes


def iter_fields(obj, prefix: str = ""):
    if isinstance(obj, ExtractedField):
        yield prefix.rstrip(".") , obj
        return
    if isinstance(obj, BaseException):
        return
    if hasattr(type(obj), "model_fields"):
        for name in type(obj).model_fields:
            value = getattr(obj, name)
            child = f"{prefix}{name}."
            yield from iter_fields(value, child)
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            yield from iter_fields(value, f"{prefix}{i}.")


def normalize_extraction(result: ExtractionEnvelope) -> ExtractionEnvelope:
    # Normalize only scalar fields. The actual application can use stricter per-field rules later.
    for path, field in iter_fields(result):
        lower = path.lower()
        if any(x in lower for x in ["date", "dob"]):
            field.value = normalize_date(field.value)
        if any(x in lower for x in ["mobile", "phone"]):
            field.value = normalize_phone(field.value)
        if "email" in lower:
            field.value = normalize_email(field.value)
        if any(x in lower for x in ["premium", "sum_assured", "idv", "share_percent", "amount", "cubic_capacity", "height_cm", "weight_kg", "age", "ppt", "number_of"]):
            field.value = normalize_amount(field.value)
        if any(x in lower for x in ["previous_policy_available", "senior_citizen_policy", "ped", "financed", "maternity_care", "reduction_maternity_waiting_period", "renewal", "portability_requested"]):
            field.value = normalize_yes_no(field.value)

    # Derive health PED from detailed medical answers only when all relevant answers are explicit.
    if result.health:
        _derive_health_flags(result.health)
        _derive_health_counts(result.health)

    return result


def _derive_health_counts(health: HealthExtraction) -> None:
    members = health.members
    if not members:
        return
    adults = 0
    children = 0
    parents = 0
    for m in members:
        try:
            age = int(float(m.age.value)) if m.age.value else None
        except (ValueError, TypeError):
            age = None
        if age is not None:
            if age >= 18:
                adults += 1
            else:
                children += 1
        rel = (m.relationship.value or "").lower()
        if "parent" in rel or "father" in rel or "mother" in rel or "in-law" in rel:
            parents += 1
    if health.basic_details.number_of_adult.source == "not_found":
        set_field(health.basic_details.number_of_adult, str(adults), "derived", 0.96, notes="Derived from insured-member ages")
    if health.basic_details.number_of_child.source == "not_found":
        set_field(health.basic_details.number_of_child, str(children), "derived", 0.96, notes="Derived from insured-member ages")
    if health.basic_details.number_of_parent.source == "not_found":
        set_field(health.basic_details.number_of_parent, str(parents), "derived", 0.93, notes="Derived from insured-member relationships")

    oldest = min(
        (m for m in members if m.dob.value),
        key=lambda m: datetime.strptime(normalize_date(m.dob.value), "%d-%m-%Y"),
        default=None,
    )
    if oldest and health.basic_details.eldest_person_dob.source == "not_found":
        set_field(health.basic_details.eldest_person_dob, oldest.dob.value, "derived", 0.98, oldest.dob.evidence, "Oldest insured member DOB")

    if health.basic_details.eldest_person_age_type.source == "not_found" and oldest:
        set_field(health.basic_details.eldest_person_age_type, "DOB", "derived", 0.90, notes="DOB available for oldest insured member")


def _derive_health_flags(health: HealthExtraction) -> None:
    answers = []
    for q in health.medical_questions:
        for a in q.answers_by_member:
            if a.value is not None:
                answers.append(a.value.lower())
    if answers and health.basic_details.ped.source == "not_found":
        if all(a in {"no", "n"} for a in answers):
            set_field(health.basic_details.ped, "No", "derived", 0.98, notes="All extracted medical/PED answers are negative")
        elif any(a in {"yes", "y"} for a in answers):
            set_field(health.basic_details.ped, "Yes", "derived", 0.98, notes="At least one extracted medical/PED answer is positive")
        else:
            health.basic_details.ped.requires_review = True


def detect_cross_document_conflicts(result: ExtractionEnvelope) -> list[Conflict]:
    conflicts: list[Conflict] = []
    # LLM already reports conflicts. This hook is intentionally conservative; add deterministic checks here later.
    conflicts.extend(result.global_conflicts)
    return conflicts


def validate_evidence(result: ExtractionEnvelope, pages: Iterable[tuple[int, str]]) -> None:
    page_text = {p: re.sub(r"\s+", " ", t).lower() for p, t in pages}
    for path, field in iter_fields(result):
        if not field.evidence:
            continue
        good = []
        for ev in field.evidence:
            normalized_quote = re.sub(r"\s+", " ", ev.quote).lower().strip()
            source_page = page_text.get(ev.page, "")
            if normalized_quote and normalized_quote in source_page:
                good.append(ev)
        if field.source == "document" and not good:
            field.requires_review = True
            field.notes = (field.notes or "") + " Evidence quote could not be verified against extracted page text."
        else:
            field.evidence = good

    for q in (result.health.medical_questions if result.health else []):
        good = []
        for ev in q.evidence:
            quote = re.sub(r"\s+", " ", ev.quote).lower().strip()
            if quote in page_text.get(ev.page, ""):
                good.append(ev)
        q.evidence = good


def review_required(result: ExtractionEnvelope, confidence_threshold: float = 0.88) -> bool:
    if result.global_conflicts:
        return True
    for path, field in iter_fields(result):
        if field.requires_review:
            return True
        if field.source != "not_found" and field.confidence < confidence_threshold:
            return True
    return False
