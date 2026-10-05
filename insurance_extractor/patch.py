from __future__ import annotations

from typing import Any

from .compact_models import CompactHealthOutput, CompactMotorOutput
from .models import Evidence, ExtractedField, ExtractionEnvelope, HealthMember, MedicalQuestion, PreviousHealthPolicy, AddOn, OptionalCover, Rider, Conflict
from .preprocess import PageProfile, normalize_for_match

DERIVED_PATHS = {
    "motor.vehicle.type_of_vehicle", "motor.vehicle.vehicle_category", "motor.policy.policy_type",
    "motor.insured_customer.customer_type", "motor.insured_customer.title",
    "health.basic_details.lob_category", "health.basic_details.sub_lob_category",
    "health.basic_details.business_type", "health.basic_details.policy_type",
    "health.basic_details.senior_citizen_policy", "health.basic_details.number_of_adult",
    "health.basic_details.number_of_child", "health.basic_details.number_of_parent",
    "health.basic_details.eldest_person_age_type", "health.basic_details.eldest_person_dob",
    "health.basic_details.ped", "health.policy.ppt", "health.policy.ppm_frequency", "health.policy.renewal",
    "health.insured_customer.customer_type", "health.insured_customer.title",
}

ALIASES = {
    "motor.policy.policy_type": ["standalone own damage", "own damage policy", "od only"],
    "motor.vehicle.vehicle_category": ["private car", "private passenger car"],
    "motor.vehicle.type_of_vehicle": ["renewal", "rollover", "renewal / rollover"],
    "health.basic_details.lob_category": ["health insurance", "health policy"],
    "health.basic_details.sub_lob_category": ["health insurance"],
    "health.basic_details.business_type": ["new business", "renewal"],
    "health.basic_details.policy_type": ["floater", "family floater"],
    "health.policy.ppm_frequency": ["one time premium payment", "single payment mode", "annual"],
}

MOTOR_PATH_MAP = {
    "make": "motor.vehicle.make", "model": "motor.vehicle.model", "variant": "motor.vehicle.variant", "fuel_type": "motor.vehicle.fuel_type",
    "vehicle_category": "motor.vehicle.vehicle_category", "type_of_vehicle": "motor.vehicle.type_of_vehicle", "registration_no": "motor.vehicle.registration_no",
    "cubic_capacity": "motor.vehicle.cubic_capacity", "seats_including_driver": "motor.vehicle.seats_including_driver", "mfg_month": "motor.vehicle.mfg_month",
    "mfg_year": "motor.vehicle.mfg_year", "engine_no": "motor.vehicle.engine_no", "chassis_no": "motor.vehicle.chassis_no", "financier": "motor.vehicle.financier",
    "policy_type": "motor.policy.policy_type", "policy_number": "motor.policy.policy_number", "policy_issue_date": "motor.policy.policy_issue_date",
    "policy_start_date": "motor.policy.policy_start_date", "policy_end_date": "motor.policy.policy_end_date", "idv_sum_assured": "motor.policy.idv_sum_assured",
    "current_ncb": "motor.policy.current_ncb", "active_tp_insurer_name": "motor.policy.active_tp_insurer_name", "active_tp_policy_number": "motor.policy.active_tp_policy_number",
    "active_tp_policy_start_date": "motor.policy.active_tp_policy_start_date", "active_tp_policy_end_date": "motor.policy.active_tp_policy_end_date", "insurer_name": "motor.policy.insurer_name",
    "od_premium": "motor.premium.od_premium", "net_premium": "motor.premium.net_premium", "gst_cess": "motor.premium.gst_cess", "final_premium": "motor.premium.final_premium",
    "customer_type": "motor.insured_customer.customer_type", "title": "motor.insured_customer.title", "customer_name": "motor.insured_customer.name", "customer_mobile": "motor.insured_customer.mobile",
    "customer_email": "motor.insured_customer.email", "customer_dob": "motor.insured_customer.dob", "customer_pan": "motor.insured_customer.pan", "customer_aadhaar": "motor.insured_customer.aadhaar",
    "customer_gst_number": "motor.insured_customer.gst_number", "customer_address": "motor.insured_customer.address", "customer_pincode": "motor.insured_customer.pincode",
    "city_district": "motor.insured_customer.city_district", "state": "motor.insured_customer.state", "payment_status": "motor.payment.status", "payment_mode": "motor.payment.mode",
    "payer_name": "motor.payment.payer_name", "amount_paid": "motor.payment.amount_paid", "receipt_number": "motor.payment.receipt_number", "receipt_date": "motor.payment.receipt_date",
}

HEALTH_PATH_MAP = {
    "lob_category": "health.basic_details.lob_category", "sub_lob_category": "health.basic_details.sub_lob_category", "business_type": "health.basic_details.business_type",
    "policy_type": "health.basic_details.policy_type", "senior_citizen_policy": "health.basic_details.senior_citizen_policy", "number_of_adult": "health.basic_details.number_of_adult",
    "number_of_child": "health.basic_details.number_of_child", "number_of_parent": "health.basic_details.number_of_parent", "eldest_person_age_type": "health.basic_details.eldest_person_age_type",
    "eldest_person_dob": "health.basic_details.eldest_person_dob", "treatment_zone": "health.basic_details.treatment_zone", "ped": "health.basic_details.ped", "previous_policy_available": "health.basic_details.previous_policy_available",
    "insurer_name": "health.policy.insurer_name", "plan_name": "health.policy.plan_name", "policy_number": "health.policy.policy_number", "policy_tenure": "health.policy.policy_tenure",
    "policy_issue_date": "health.policy.policy_issue_date", "policy_start_date": "health.policy.policy_start_date", "policy_end_date": "health.policy.policy_end_date", "base_sum_assured": "health.policy.base_sum_assured",
    "bonus_sum_assured": "health.policy.bonus_sum_assured", "total_sum_assured": "health.policy.total_sum_assured", "ppt": "health.policy.ppt", "renewal": "health.policy.renewal", "ppm_frequency": "health.policy.ppm_frequency",
    "customer_type": "health.insured_customer.customer_type", "title": "health.insured_customer.title", "customer_name": "health.insured_customer.name", "customer_mobile": "health.insured_customer.mobile",
    "customer_email": "health.insured_customer.email", "customer_dob": "health.insured_customer.dob", "customer_pan": "health.insured_customer.pan", "customer_aadhaar": "health.insured_customer.aadhaar",
    "customer_gst_number": "health.insured_customer.gst_number", "customer_address": "health.insured_customer.address", "customer_pincode": "health.insured_customer.pincode", "city_district": "health.insured_customer.city_district", "state": "health.insured_customer.state",
    "nominee_name": "health.nominee.name", "nominee_dob": "health.nominee.dob", "nominee_relationship": "health.nominee.relationship", "nominee_share_percent": "health.nominee.share_percent", "nominee_address": "health.nominee.address", "nominee_mobile": "health.nominee.mobile", "nominee_email": "health.nominee.email",
    "basic_premium": "health.premium.basic_premium", "other_premium": "health.premium.other_premium", "net_premium": "health.premium.net_premium", "gst_percent": "health.premium.gst_percent", "final_premium": "health.premium.final_premium",
    "installment_amount": "health.premium.installment_amount", "number_of_installment": "health.premium.number_of_installment", "initial_installment": "health.premium.initial_installment", "initial_received_amount": "health.premium.initial_received_amount",
    "payment_status": "health.payment.status", "payment_mode": "health.payment.mode", "payer_name": "health.payment.payer_name", "amount_paid": "health.payment.amount_paid", "receipt_number": "health.payment.receipt_number", "receipt_date": "health.payment.receipt_date",
}


def _get_path(root: ExtractionEnvelope, path: str) -> Any:
    obj: Any = root
    for part in path.split("."):
        obj = getattr(obj, part)
    return obj


def _set_scalar(root: ExtractionEnvelope, path: str, value: str | None, *, source: str = "document", confidence: float = 0.95) -> None:
    if value is None or not str(value).strip():
        return
    field: ExtractedField = _get_path(root, path)
    incoming = str(value).strip()
    current = field.value.strip() if field.value else None
    if current and field.source == "document":
        if normalize_for_match(current) != normalize_for_match(incoming):
            root.global_conflicts.append(Conflict(field=path, values=[current, incoming], pages=[e.page for e in field.evidence], explanation="Deterministic extraction and LLM extraction disagree; deterministic document value retained."))
        return
    field.value = incoming
    field.raw_value = incoming
    field.source = source  # type: ignore[assignment]
    field.confidence = confidence


def requested_scalar_paths(result: ExtractionEnvelope) -> list[str]:
    paths: list[str] = []
    mapping = MOTOR_PATH_MAP if result.document_type == "motor" else HEALTH_PATH_MAP
    for short, path in mapping.items():
        f: ExtractedField = _get_path(result, path)
        if f.source == "not_found":
            paths.append(path)
    if result.document_type == "motor":
        if not result.motor or not result.motor.policy.add_ons:
            paths.append("motor.add_ons")
    else:
        if not result.health:
            return paths
        paths.extend(["health.members", "health.medical_questions", "health.policy.optional_covers", "health.policy.riders", "health.policy.previous_policies"])
    return paths


def apply_motor_patch(result: ExtractionEnvelope, patch: CompactMotorOutput) -> None:
    for key, path in MOTOR_PATH_MAP.items():
        _set_scalar(result, path, getattr(patch, key), source="derived" if path in DERIVED_PATHS else "document", confidence=0.94 if path in DERIVED_PATHS else 0.95)
    if result.motor:
        for item in patch.add_ons:
            existing = next((a for a in result.motor.policy.add_ons if normalize_for_match(a.name) == normalize_for_match(item.name)), None)
            if existing is None:
                result.motor.policy.add_ons.append(AddOn(name=item.name, selected=item.selected, premium=item.premium))
            elif existing.selected != item.selected:
                result.global_conflicts.append(Conflict(field=f"motor.policy.add_ons[{item.name}]", values=[str(existing.selected), str(item.selected)], explanation="Add-on selection differs between deterministic and LLM extraction."))


def _merge_member(existing: HealthMember | None, patch) -> HealthMember:
    if existing is None:
        existing = HealthMember()
    mapping = {
        "member_id": "member_id", "name": "name", "gender": "gender", "relationship": "relationship", "dob": "dob", "age": "age", "insured_since": "insured_since",
        "height_cm": "height_cm", "weight_kg": "weight_kg", "abha_no": "abha_no", "sum_insured": "sum_insured", "aggregate_deductible": "aggregate_deductible",
        "maternity_care": "maternity_care", "reduction_maternity_waiting_period": "reduction_maternity_waiting_period",
    }
    for key, attr in mapping.items():
        value = getattr(patch, key)
        if value is not None and value != "":
            f = getattr(existing, attr)
            if f.source == "not_found":
                f.value = str(value).strip(); f.raw_value = str(value).strip(); f.source = "document"; f.confidence = 0.95
            elif f.value and normalize_for_match(f.value) != normalize_for_match(str(value)):
                f.requires_review = True
    return existing


def apply_health_patch(result: ExtractionEnvelope, patch: CompactHealthOutput) -> None:
    for key, path in HEALTH_PATH_MAP.items():
        _set_scalar(result, path, getattr(patch, key), source="derived" if path in DERIVED_PATHS else "document", confidence=0.94 if path in DERIVED_PATHS else 0.95)
    h = result.health
    if not h:
        return
    for mp in patch.members:
        mid = normalize_for_match(mp.member_id or "")
        nm = normalize_for_match(mp.name or "")
        existing = next((m for m in h.members if mid and normalize_for_match(m.member_id.value or "") == mid or nm and normalize_for_match(m.name.value or "") == nm), None)
        candidate = _merge_member(existing, mp)
        if existing is None:
            h.members.append(candidate)

    for oc in patch.optional_covers:
        existing = next((x for x in h.policy.optional_covers if normalize_for_match(x.name) == normalize_for_match(oc.name)), None)
        if existing is None:
            h.policy.optional_covers.append(OptionalCover(name=oc.name, selected=oc.selected, option=oc.option, value=oc.value))
    for r in patch.riders:
        existing = next((x for x in h.policy.riders if normalize_for_match(x.rider_name) == normalize_for_match(r.rider_name)), None)
        if existing is None:
            h.policy.riders.append(Rider(package_name=r.package_name, rider_name=r.rider_name, selected=r.selected, coverage_limit=r.coverage_limit, applicable_members=r.applicable_members))
    for prev in patch.previous_policies:
        h.policy.previous_policies.append(PreviousHealthPolicy(
            insurer_name=ExtractedField(value=str(prev.get("insurer_name")) if prev.get("insurer_name") else None, raw_value=str(prev.get("insurer_name")) if prev.get("insurer_name") else None, source="document", confidence=0.9),
            policy_number=ExtractedField(value=str(prev.get("policy_number")) if prev.get("policy_number") else None, raw_value=str(prev.get("policy_number")) if prev.get("policy_number") else None, source="document", confidence=0.9),
            continuously_insured_since=ExtractedField(value=str(prev.get("continuously_insured_since")) if prev.get("continuously_insured_since") else None, raw_value=str(prev.get("continuously_insured_since")) if prev.get("continuously_insured_since") else None, source="document", confidence=0.9),
            portability_requested=ExtractedField(value=str(prev.get("portability_requested")) if prev.get("portability_requested") is not None else None, raw_value=str(prev.get("portability_requested")) if prev.get("portability_requested") is not None else None, source="document", confidence=0.9),
        ))
    for mq in patch.medical_questions:
        existing_q = next((q for q in h.medical_questions if q.question_id == mq.question_id), None)
        if existing_q is not None:
            if normalize_for_match(existing_q.question) != normalize_for_match(mq.question):
                existing_q.evidence = existing_q.evidence
            continue
        details = next((a.details for a in mq.answers_by_member if a.details), None)
        h.medical_questions.append(MedicalQuestion(
            question_id=mq.question_id,
            question=mq.question,
            answers_by_member=[ExtractedField(value=a.value, raw_value=a.value, source="document", confidence=0.95) for a in mq.answers_by_member],
            details=details,
        ))
