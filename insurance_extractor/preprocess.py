from __future__ import annotations

import hashlib
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .models import PageText

ZERO_WIDTH_RE = re.compile(r"[\u200b-\u200f\u2060\ufeff]")
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
SPACE_RE = re.compile(r"[ \t\r\f\v]+")

GENERIC_TERMS = {
    "general exceptions", "policy wordings", "what's not covered", "key exclusions",
    "standard exclusions", "general conditions", "definitions", "glossary",
    "important notice", "terms and conditions", "policy wording", "claim procedure",
}

MOTOR_TERMS = {
    "vehicle", "engine no", "chassis no", "registration no", "cubic capacity",
    "insured's declared value", "own damage", "motor vehicle", "vehicle insured",
}
HEALTH_TERMS = {
    "insured person", "sum insured", "hospitalization", "health insurance",
    "medical history", "maternity care", "family floater", "policyholder",
}


@dataclass(frozen=True)
class PageProfile:
    page: int
    text: str
    normalized: str
    compact: str
    is_generic: bool
    motor_score: int
    health_score: int


def clean_page_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    text = ZERO_WIDTH_RE.sub("", text)
    text = CONTROL_RE.sub(" ", text)
    text = text.replace("\u00a0", " ")
    return text.strip()


def normalize_for_match(text: str) -> str:
    text = clean_page_text(text).lower()
    text = re.sub(r"[|¦]+", " ", text)
    text = re.sub(r"[^a-z0-9@%₹$./:+()&'_-]+", " ", text)
    return SPACE_RE.sub(" ", text).strip()


def page_profiles(pages: Iterable[PageText]) -> list[PageProfile]:
    out: list[PageProfile] = []
    for p in pages:
        cleaned = clean_page_text(p.text)
        normalized = normalize_for_match(cleaned)
        compact = re.sub(r"\s+", " ", normalized)
        is_generic = sum(term in normalized for term in GENERIC_TERMS) >= 2
        motor_score = sum(term in normalized for term in MOTOR_TERMS)
        health_score = sum(term in normalized for term in HEALTH_TERMS)
        out.append(PageProfile(p.page, cleaned, normalized, compact, is_generic, motor_score, health_score))
    return out


def fingerprint_file(path: str | Path) -> str:
    """Hash the uploaded bytes for an O(1) cache lookup before PDF parsing."""
    h = hashlib.sha256()
    with Path(path).open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def fingerprint_pages(profiles: Iterable[PageProfile]) -> str:
    material = "\n".join(f"{p.page}:{p.normalized}" for p in profiles)
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def sanitize_for_model(text: str) -> str:
    # Treat source text as untrusted data. Remove only characters that can create malformed prompts.
    text = clean_page_text(text)
    return text.replace("```", "'''").strip()
