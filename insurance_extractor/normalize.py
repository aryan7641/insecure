from __future__ import annotations

import re
from datetime import datetime
from typing import Iterable

from .models import Conflict, ExtractedField, ExtractionEnvelope, Evidence, HealthExtraction

DATE_PATTERNS = ("%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y", "%Y-%m-%d")


def normalize_date(value: str | None) -> str | None:
    """Normalize dates to YYYY-MM-DD (ISO 8601) for standard UI date inputs."""
    if not value:
        return value
    v = value.strip().replace("/", "-").replace(".", "-")
    for fmt in DATE_PATTERNS:
        try:
            return datetime.strptime(v, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return value


def normalize_yes_no(value: str | None) -> str | None:
    if value is None:
        return None
    v = value.strip().lower()
    if v in {"y", "yes", "true", "selected", "checked", "tick"}:
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
    compact = value.replace(",", "")
    m = re.search(r"-?\d+(?:\.\d+)?", compact)
    return m.group(0) if m else None


def normalize_extraction(result: ExtractionEnvelope) -> ExtractionEnvelope:
    for path, field in iter_fields(result):
        lower = path.lower()
        if "date" in lower or lower.endswith("dob"):
            field.value = normalize_date(field.value)
        if "mobile" in lower or "phone" in lower:
            field.value = normalize_phone(field.value)
        if "email" in lower:
            field.value = normalize_email(field.value)
        if any(x in lower for x in ("premium", "sum_assured", "idv", "share_percent", "amount", "cubic_capacity", "height_cm", "weight_kg", "age", "ppt", "number_of")):
            field.value = normalize_amount(field.value)
        if any(x in lower for x in ("previous_policy_available", "senior_citizen_policy", "ped", "financed", "maternity_care", "reduction_maternity_waiting_period", "renewal", "portability_requested")):
            field.value = normalize_yes_no(field.value)

    if result.health:
        _derive_health_counts(result.health)
        _derive_health_total_sum_assured(result.health)
        _derive_health_ped(result.health)
        _derive_health_senior_citizen(result.health)
        _derive_health_title(result.health)
    if result.health and result.health.basic_details.treatment_zone.value:
        result.health.basic_details.treatment_zone.value = re.sub(r"^zone\s+", "", result.health.basic_details.treatment_zone.value, flags=re.I).strip()
    if result.motor:
        _normalize_motor_registration(result.motor)
    return result


def _derive_health_counts(health: HealthExtraction) -> None:
    if not health.members:
        return
    adults = children = parents = 0
    for m in health.members:
        age = None
        try:
            age = int(float(m.age.value)) if m.age.value else None
        except (ValueError, TypeError):
            pass
        if age is not None:
            if age >= 18:
                adults += 1
            else:
                children += 1
        rel = (m.relationship.value or "").lower()
        if any(token in rel for token in ("parent", "father", "mother", "parent-in-law", "father-in-law", "mother-in-law")):
            parents += 1

    if health.basic_details.number_of_adult.source == "not_found":
        set_field(health.basic_details.number_of_adult, str(adults), "derived", .97, notes="Counted insured members with age >= 18")
    if health.basic_details.number_of_child.source == "not_found":
        set_field(health.basic_details.number_of_child, str(children), "derived", .97, notes="Counted insured members with age < 18")
    if health.basic_details.number_of_parent.source == "not_found":
        set_field(health.basic_details.number_of_parent, str(parents), "derived", .95, notes="Counted insured members whose relationship is a parent/parent-in-law")

    dated = []
    for m in health.members:
        if not m.dob.value:
            continue
        try:
            dated.append((datetime.strptime(normalize_date(m.dob.value), "%Y-%m-%d"), m))
        except (TypeError, ValueError):
            continue
    if dated:
        oldest = min(dated, key=lambda x: x[0])[1]
        if health.basic_details.eldest_person_dob.source == "not_found":
            set_field(health.basic_details.eldest_person_dob, normalize_date(oldest.dob.value), "derived", .99, oldest.dob.evidence, "Oldest insured member based on DOB")
        if health.basic_details.eldest_person_age_type.source == "not_found":
            set_field(health.basic_details.eldest_person_age_type, "DOB", "derived", .96, oldest.dob.evidence, "DOB is available for the oldest insured member")


def _derive_health_total_sum_assured(health: HealthExtraction) -> None:
    field = health.policy.total_sum_assured
    if field.source != "not_found" or not health.policy.base_sum_assured.value:
        return
    try:
        base = float(normalize_amount(health.policy.base_sum_assured.value) or 0)
        bonus = float(normalize_amount(health.policy.bonus_sum_assured.value) or 0) if health.policy.bonus_sum_assured.value else 0.0
    except (ValueError, TypeError):
        return
    if base <= 0 and bonus <= 0:
        return
    total = base + bonus
    ev = list(health.policy.base_sum_assured.evidence) + list(health.policy.bonus_sum_assured.evidence)
    set_field(field, str(int(total)) if total.is_integer() else str(total), "derived", .96, ev[:4], "Derived as Base Sum Assured + Bonus Sum Assured")


# Only medical-condition questions are valid inputs to the UI's single PED field.
# Insurance underwriting history, pregnancy, annual check-up and lifestyle questions are not PED by themselves.
_PED_QUESTION_CUES = (
    "suffered from", "other illness/disease/injury/disability", "regular medication",
    "elevated blood sugar", "diabetes", "blood pressure", "hypertension", "high cholesterol",
    "asthma", "thyroid disorder", "signs, symptoms, illness or injury",
)


def _derive_health_ped(health: HealthExtraction) -> None:
    if health.basic_details.ped.source != "not_found":
        return
    relevant_answers: list[str] = []
    for q in health.medical_questions:
        qn = q.question.lower()
        if not any(cue in qn for cue in _PED_QUESTION_CUES):
            continue
        relevant_answers.extend(a.value for a in q.answers_by_member if a.value)
    if not relevant_answers:
        return
    normalized = {normalize_yes_no(a) for a in relevant_answers}
    if normalized <= {"No"}:
        set_field(health.basic_details.ped, "No", "derived", .99, notes="All relevant medical-condition declarations are explicitly negative")
    elif "Yes" in normalized:
        set_field(health.basic_details.ped, "Yes", "derived", .99, notes="At least one relevant medical-condition declaration is positive")
    else:
        health.basic_details.ped.requires_review = True


def _derive_health_senior_citizen(health: HealthExtraction, threshold: int = 60) -> None:
    if health.basic_details.senior_citizen_policy.source != "not_found":
        return
    ages = []
    for m in health.members:
        try:
            if m.age.value is not None:
                ages.append(int(float(m.age.value)))
        except (TypeError, ValueError):
            continue
    if not ages:
        return
    set_field(health.basic_details.senior_citizen_policy, "Yes" if max(ages) >= threshold else "No", "derived", .96, notes=f"Derived from maximum insured age using threshold {threshold}")


def _derive_health_title(health: HealthExtraction) -> None:
    if health.insured_customer.title.source != "not_found":
        return
    primary_name = (health.insured_customer.name.value or "").strip().lower()
    member = next((m for m in health.members if (m.name.value or "").strip().lower() == primary_name), None)
    if member and member.gender.value:
        g = member.gender.value.lower()
        if g in {"m", "male", "man"}:
            set_field(health.insured_customer.title, "Mr.", "derived", .94, member.gender.evidence, "Derived from insured person's gender")
        elif g in {"f", "female", "woman"}:
            set_field(health.insured_customer.title, "Ms.", "derived", .90, member.gender.evidence, "Derived from insured person's gender; UI title may require manual selection")


def _normalize_motor_registration(motor) -> None:
    field = motor.vehicle.registration_no
    if field.value:
        field.value = re.sub(r"\s+", "", field.value).replace("—", "-").upper()


def set_field(field: ExtractedField, value: str | None, source: str, confidence: float, evidence: list[Evidence] | None = None, notes: str | None = None) -> None:
    field.value = value
    field.raw_value = value
    field.source = source  # type: ignore[assignment]
    field.confidence = max(0.0, min(1.0, confidence))
    if evidence:
        field.evidence = evidence
    if notes:
        field.notes = notes


def iter_fields(obj, prefix: str = ""):
    if isinstance(obj, ExtractedField):
        yield prefix.rstrip("."), obj
        return
    if hasattr(type(obj), "model_fields"):
        for name in type(obj).model_fields:
            value = getattr(obj, name)
            if isinstance(value, list):
                for i, item in enumerate(value):
                    yield from iter_fields(item, f"{prefix}{name}.{i}.")
            else:
                yield from iter_fields(value, f"{prefix}{name}.")


def detect_cross_document_conflicts(result: ExtractionEnvelope) -> list[Conflict]:
    return list(result.global_conflicts)


def validate_evidence(result: ExtractionEnvelope, pages: Iterable[tuple[int, str]]) -> None:
    page_text = {p: re.sub(r"\s+", " ", t).lower() for p, t in pages}
    for path, field in iter_fields(result):
        if field.source != "document" or not field.value or not field.evidence:
            continue
        good: list[Evidence] = []
        for ev in field.evidence:
            quote = re.sub(r"\s+", " ", ev.quote).lower().strip()
            if quote and quote in page_text.get(ev.page, ""):
                good.append(ev)
        if not good:
            field.requires_review = True
            field.confidence = min(field.confidence, .72)
            field.notes = (field.notes or "") + " Evidence could not be verified against extracted source text."
        else:
            field.evidence = good


def validate_business_consistency(result: ExtractionEnvelope) -> None:
    if result.motor:
        _motor_consistency(result)
    if result.health:
        _health_consistency(result.health, result)


def _motor_consistency(result: ExtractionEnvelope) -> None:
    m = result.motor
    if not m:
        return
    # The policy and TP date windows should not be inverted.
    try:
        if m.policy.active_tp_policy_start_date.value and m.policy.active_tp_policy_end_date.value:
            sd = datetime.strptime(m.policy.active_tp_policy_start_date.value, "%Y-%m-%d")
            ed = datetime.strptime(m.policy.active_tp_policy_end_date.value, "%Y-%m-%d")
            if sd >= ed:
                m.policy.active_tp_policy_end_date.requires_review = True
    except ValueError:
        pass
    if m.policy.idv_sum_assured.value and m.premium.final_premium.value:
        try:
            if float(m.policy.idv_sum_assured.value) <= 0 or float(m.premium.final_premium.value) <= 0:
                m.policy.idv_sum_assured.requires_review = True
        except ValueError:
            pass


def _health_consistency(health: HealthExtraction, result: ExtractionEnvelope) -> None:
    if health.members:
        name_fields = [m.name.value for m in health.members if m.name.value]
        if len(name_fields) != len(set(n.strip().lower() for n in name_fields)):
            for m in health.members:
                m.name.requires_review = True

    # Age/DOB consistency is a strong quality signal when both are present.
    policy_date = None
    if health.policy.policy_start_date.value:
        try:
            policy_date = datetime.strptime(health.policy.policy_start_date.value, "%Y-%m-%d")
        except ValueError:
            pass
    if policy_date:
        for m in health.members:
            if not m.dob.value or not m.age.value:
                continue
            try:
                dob = datetime.strptime(m.dob.value, "%Y-%m-%d")
                age = policy_date.year - dob.year - ((policy_date.month, policy_date.day) < (dob.month, dob.day))
                if abs(age - int(float(m.age.value))) > 1:
                    m.age.requires_review = True
                    m.dob.requires_review = True
            except (ValueError, TypeError):
                pass


def review_required(result: ExtractionEnvelope, confidence_threshold: float = .88) -> bool:
    if result.global_conflicts:
        return True
    for _, field in iter_fields(result):
        if field.requires_review:
            return True
        if field.source != "not_found" and field.confidence < confidence_threshold:
            return True
    return False
