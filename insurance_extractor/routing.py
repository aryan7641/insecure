from __future__ import annotations

import os
import re
from typing import Iterable

from .preprocess import PageProfile, sanitize_for_model

MOTOR_ROUTE = {
    "vehicle": ["vehicle", "engine no", "chassis no", "registration no", "cubic capacity", "make", "model", "mfg", "year of mfg", "seating including driver"],
    "motor_policy": ["policy no", "period of insurance", "policy type", "insured's declared value", "own damage", "premium", "document date", "receipt number"],
    "motor_tp": ["existing tp policy", "tp policy", "policy no insurer name insurer address policy start date policy end date", "financier name", "hypothecation"],
    "motor_insured": ["insured", "customer id", "email", "mobile", "contact number", "address"],
    "motor_premium": ["schedule of premium", "gross od", "basic premium", "cgst", "sgst", "igst", "total"],
    "motor_payment": ["receipt number", "receipt date", "amount", "payment", "online", "cash", "cheque"],
}

HEALTH_ROUTE = {
    "health_policy": ["policy schedule", "policy number", "policy period", "product name", "plan type", "business type", "policy tenure", "premium amount", "sum insured"],
    "health_members": ["insured persons details", "proposed insured person", "member id", "date of birth", "relationship to policyholder", "height", "weight", "gender"],
    "health_options": ["optional covers", "consumables benefit", "aggregate deductible", "room category", "long term claim free", "rider package", "member wise applicability"],
    "health_nominee": ["nominee details", "percentage share", "relationship", "bank details of the nominee"],
    "health_previous": ["existing/previous insurer details", "already insured", "portability", "policy/application number"],
    "health_medical": ["medical and lifestyle details", "medical history", "decline disease name", "regular medication", "thyroid disorder", "pregnant currently"],
    "health_payment": ["payment details", "premium payer", "payment mode", "modal premium", "receipt", "source of funds"],
}


def classify_document(profiles: Iterable[PageProfile]) -> tuple[str, float]:
    profiles = list(profiles)
    motor = sum(p.motor_score for p in profiles[:7]) + 2 * sum("own damage" in p.normalized for p in profiles[:7])
    health = sum(p.health_score for p in profiles[:10]) + 2 * sum("medical" in p.normalized for p in profiles[:10])
    if motor == health == 0:
        header = " ".join(p.normalized for p in profiles[:10])
        motor = sum(header.count(k) for k in ("vehicle", "engine no", "chassis no", "own damage"))
        health = sum(header.count(k) for k in ("medical", "hospital", "insured person", "sum insured"))
    if motor >= max(1, health) * 1.25:
        return "motor", min(0.995, 0.76 + 0.04 * min(motor, 6))
    if health >= max(1, motor) * 1.25:
        return "health", min(0.995, 0.76 + 0.04 * min(health, 8))
    first = " ".join(p.normalized for p in profiles[:4])
    if any(x in first for x in ("vehicle", "own damage", "motor vehicle")):
        return "motor", 0.68
    if any(x in first for x in ("health", "medical", "hospital", "insured person")):
        return "health", 0.68
    return "health", 0.50


def _page_route_score(p: PageProfile, routes: dict[str, list[str]]) -> int:
    score = 0
    for terms in routes.values():
        for term in terms:
            if term in p.normalized:
                score += 3 if len(term.split()) >= 2 else 1
    if p.is_generic and p.page > 6:
        score -= 8
    return max(0, score)


def _snippets_for_page(p: PageProfile, routes: dict[str, list[str]], max_chars: int = 2100) -> str:
    text = sanitize_for_model(p.text)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        return ""
    joined = "\n".join(lines)
    normalized_joined = joined.lower()
    windows: list[str] = []
    windows.append("\n".join(lines[:16]))
    terms = [t for group in routes.values() for t in group]
    for term in terms:
        pos = normalized_joined.find(term.lower())
        if pos < 0:
            continue
        start = max(0, pos - 300)
        end = min(len(joined), pos + 950)
        windows.append(joined[start:end])
        if len(windows) >= 6:
            break
    deduped: list[str] = []
    seen: set[str] = set()
    for w in windows:
        w = re.sub(r"\n{3,}", "\n\n", w).strip()
        key = re.sub(r"\s+", " ", w).lower()
        if key and key not in seen:
            seen.add(key)
            deduped.append(w)
    return "\n---\n".join(deduped)[:max_chars]


def select_pages(profiles: Iterable[PageProfile], doc_type: str, max_pages: int | None = None) -> list[PageProfile]:
    profiles = list(profiles)
    routes = MOTOR_ROUTE if doc_type == "motor" else HEALTH_ROUTE
    default_max = int(os.environ.get("MOTOR_MAX_MODEL_PAGES", "6")) if doc_type == "motor" else int(os.environ.get("HEALTH_MAX_MODEL_PAGES", "8"))
    max_pages = max_pages or default_max

    keep: set[int] = set()
    # First guarantee one high-quality page for each business section. This makes the
    # router layout-agnostic: insurer page numbers may change, but section language
    # remains useful.
    for terms in routes.values():
        candidates = [p for p in profiles if any(term in p.normalized for term in terms)]
        candidates.sort(key=lambda p: (_page_route_score(p, {"route": terms}), -int(p.is_generic), -p.page), reverse=True)
        if candidates:
            keep.add(candidates[0].page)

    scored = [(p, _page_route_score(p, routes)) for p in profiles]
    scored.sort(key=lambda item: (item[1], -int(item[0].is_generic), -item[0].page), reverse=True)
    for p, score in scored:
        if score > 0 and len(keep) < max_pages:
            keep.add(p.page)

    return [p for p in profiles if p.page in keep][:max_pages]


def build_targeted_context(profiles: Iterable[PageProfile], doc_type: str) -> tuple[str, list[int]]:
    routes = MOTOR_ROUTE if doc_type == "motor" else HEALTH_ROUTE
    selected = select_pages(profiles, doc_type)
    blocks: list[str] = []
    for p in selected:
        snippet = _snippets_for_page(p, routes)
        if snippet:
            blocks.append(f"===== PAGE {p.page} =====\n{snippet}")
    return "\n\n".join(blocks), [p.page for p in selected]


def visual_pages_for_document(profiles: Iterable[PageProfile], doc_type: str) -> list[int]:
    """Only pages whose meaning depends on visual checkbox/radio/table state."""
    profiles = list(profiles)
    if doc_type == "motor":
        return []
    terms = ("optional covers", "member wise applicability", "rider package", "medical history")
    candidates = [p.page for p in profiles if any(t in p.normalized for t in terms)]
    # Medical matrices often continue onto the following page after the heading disappears.
    medical_pages = {p.page for p in profiles if "medical history" in p.normalized or "medical and lifestyle details" in p.normalized}
    candidate_pages = {p.page for p in profiles}
    for page_no in list(medical_pages):
        if page_no + 1 in candidate_pages:
            candidates.append(page_no + 1)
    return sorted(set(candidates))
