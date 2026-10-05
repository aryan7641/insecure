from __future__ import annotations

from .models import ExtractionEnvelope, ExtractedField, AddOn
from .normalize import normalize_address_for_ui


def v(f: ExtractedField | None):
    if f is None:
        return None
    return f.value


def addon_map(addons: list[AddOn]) -> dict:
    aliases = {
        "road side assistance": "road_side_assistance",
        "road side assistance / rsa": "road_side_assistance",
        "rsa": "road_side_assistance",
        "nil depreciation": "zero_depreciation",
        "zero depreciation": "zero_depreciation",
        "engine and gearbox protection": "engine_protector",
        "engine protector": "engine_protector",
        "return to invoice": "return_to_invoice",
        "loss of key cover": "key_replacement",
        "key replacement": "key_replacement",
        "consumables cover": "consumables",
        "consumables": "consumables",
        "ncb protector": "ncb_protector",
        "tyre protector": "tyre_protector",
        "personal belongings": "personal_belongings",
    }
    out = {
        "road_side_assistance": False,
        "zero_depreciation": False,
        "engine_protector": False,
        "consumables": False,
        "return_to_invoice": False,
        "ncb_protector": False,
        "tyre_protector": False,
        "key_replacement": False,
        "personal_belongings": False,
    }
    for item in addons:
        key = aliases.get(item.name.strip().lower())
        if key:
            out[key] = bool(item.selected)
    return out


def motor_ui(result: ExtractionEnvelope) -> dict:
    assert result.motor
    m = result.motor
    return {
        "vehicle_details": {
            "type_of_vehicle": v(m.vehicle.type_of_vehicle),
            "vehicle_category": v(m.vehicle.vehicle_category),
            "make": v(m.vehicle.make),
            "model": v(m.vehicle.model),
            "variant": v(m.vehicle.variant),
            "fuel_type": v(m.vehicle.fuel_type),
            "cubic_capacity": v(m.vehicle.cubic_capacity),
            "seat_including_driver": v(m.vehicle.seats_including_driver),
            "registration_no": v(m.vehicle.registration_no),
            "zone": v(m.vehicle.zone),
            "reg_date": v(m.vehicle.registration_date),
            "mfg_month": v(m.vehicle.mfg_month),
            "mfg_year": v(m.vehicle.mfg_year),
            "engine_no": v(m.vehicle.engine_no),
            "chassis_no": v(m.vehicle.chassis_no),
            "vehicle_color": v(m.vehicle.vehicle_color),
            "number_of_tire": v(m.vehicle.number_of_tire),
            "previous_policy_available": v(m.vehicle.previous_policy_available),
        },
        "new_policy_details": {
            "insurer_name": v(m.policy.insurer_name),
            "policy_type": v(m.policy.policy_type),
            "policy_number": v(m.policy.policy_number),
            "policy_issue_date": v(m.policy.policy_issue_date),
            "policy_start_date": v(m.policy.policy_start_date),
            "policy_end_date": v(m.policy.policy_end_date),
            "idv_sum_assured": v(m.policy.idv_sum_assured),
            "current_ncb": v(m.policy.current_ncb),
            "active_tp_insurer_name": v(m.policy.active_tp_insurer_name),
            "active_tp_policy_number": v(m.policy.active_tp_policy_number),
            "active_tp_policy_start_date": v(m.policy.active_tp_policy_start_date),
            "active_tp_policy_end_date": v(m.policy.active_tp_policy_end_date),
            "financed": v(m.policy.financed),
            "financed_by": v(m.policy.financed_by),
            "add_ons": addon_map(m.policy.add_ons),
        },
        "premium_details": {
            "own_damage_od_premium": v(m.premium.od_premium),
            "net_premium": v(m.premium.net_premium),
            "gst_cess": v(m.premium.gst_cess),
            "final_premium": v(m.premium.final_premium),
        },
        "insured_details": {
            "customer_type": v(m.insured_customer.customer_type),
            "title": v(m.insured_customer.title),
            "gender": v(m.insured_customer.gender),
            "full_name": v(m.insured_customer.name),
            "mobile_number": v(m.insured_customer.mobile),
            "email": v(m.insured_customer.email),
            "date_of_birth": v(m.insured_customer.dob),
            "address": normalize_address_for_ui(v(m.insured_customer.address)),
            "pincode": v(m.insured_customer.pincode),
            "city_district": v(m.insured_customer.city_district),
            "state": v(m.insured_customer.state),
            "nominee_name": v(m.nominee.name),
            "nominee_dob": v(m.nominee.dob),
            "nominee_relationship": v(m.nominee.relationship),
            "nominee_address": normalize_address_for_ui(v(m.nominee.address)),
        },
        "payment_details": {
            "payment_status": v(m.payment.status),
        },
    }


def health_ui(result: ExtractionEnvelope) -> dict:
    assert result.health
    h = result.health
    primary = next((x for x in h.members if v(x.name) and v(x.name).strip().lower() == (v(h.insured_customer.name) or "").strip().lower()), None)
    if primary is None and h.members:
        primary = h.members[0]

    other_members = [x for x in h.members if primary is not x]

    return {
        "basic_details": {
            "lob_category": v(h.basic_details.lob_category),
            "sub_lob_category": v(h.basic_details.sub_lob_category),
            "business_type": v(h.basic_details.business_type),
            "policy_type": v(h.basic_details.policy_type),
            "senior_citizen_policy": v(h.basic_details.senior_citizen_policy),
            "number_of_adult": v(h.basic_details.number_of_adult),
            "number_of_child": v(h.basic_details.number_of_child),
            "number_of_parent": v(h.basic_details.number_of_parent),
            "eldest_person_age_type": v(h.basic_details.eldest_person_age_type),
            "eldest_person_dob": v(h.basic_details.eldest_person_dob),
            "treatment_zone": v(h.basic_details.treatment_zone),
            "ped": v(h.basic_details.ped),
            "previous_policy_available": v(h.basic_details.previous_policy_available),
        },
        "new_policy_details": {
            "insurer_name": v(h.policy.insurer_name),
            "plan_name": v(h.policy.plan_name),
            "policy_number": v(h.policy.policy_number),
            "policy_tenure": v(h.policy.policy_tenure),
            "policy_issue_date": v(h.policy.policy_issue_date),
            "policy_start_date": v(h.policy.policy_start_date),
            "policy_end_date": v(h.policy.policy_end_date),
            "base_sum_assured": v(h.policy.base_sum_assured),
            "bonus_sum_assured": v(h.policy.bonus_sum_assured),
            "total_sum_assured": v(h.policy.total_sum_assured),
            "ppt": v(h.policy.ppt),
            "renewal": v(h.policy.renewal),
            "ppm_frequency": v(h.policy.ppm_frequency),
            "optional_covers": [
                {
                    "name": x.name,
                    "selected": x.selected,
                    "option": x.option,
                    "value": x.value,
                }
                for x in h.policy.optional_covers
            ],
            "riders": [
                {
                    "package_name": x.package_name,
                    "rider_name": x.rider_name,
                    "selected": x.selected,
                    "coverage_limit": x.coverage_limit,
                    "applicable_members": x.applicable_members,
                }
                for x in h.policy.riders
            ],
        },
        "insured_details": {
            "customer_type": v(h.insured_customer.customer_type),
            "title": v(h.insured_customer.title),
            "gender": v(h.insured_customer.gender) or (v(primary.gender) if primary else None),
            "customer_name": v(h.insured_customer.name),
            "customer_mobile": v(h.insured_customer.mobile),
            "customer_email": v(h.insured_customer.email),
            "customer_dob": v(h.insured_customer.dob),
            "customer_pan": v(h.insured_customer.pan),
            "customer_aadhaar": v(h.insured_customer.aadhaar),
            "customer_gst_number": v(h.insured_customer.gst_number),
            "customer_address": normalize_address_for_ui(v(h.insured_customer.address)),
            "customer_pincode": v(h.insured_customer.pincode),
            "city_district": v(h.insured_customer.city_district),
            "state": v(h.insured_customer.state),
            "primary_member": primary.model_dump() if primary else None,
            "other_family_members": [x.model_dump() for x in other_members],
        },
        "nominee": {
            "name": v(h.nominee.name),
            "dob": v(h.nominee.dob),
            "relationship": v(h.nominee.relationship),
            "share_percent": v(h.nominee.share_percent),
            "nominee_address": normalize_address_for_ui(v(h.nominee.address)),
        },
        "premium_details": {
            "basic_premium": v(h.premium.basic_premium),
            "other_premium": v(h.premium.other_premium),
            "net_premium": v(h.premium.net_premium),
            "gst_percent": v(h.premium.gst_percent),
            "final_premium": v(h.premium.final_premium),
            "installment_amount": v(h.premium.installment_amount),
            "number_of_installment": v(h.premium.number_of_installment),
            "initial_installment": v(h.premium.initial_installment),
            "initial_received_amount": v(h.premium.initial_received_amount),
        },
        "payment_details": {
            "payment_status": v(h.payment.status),
        },
        "medical_details": [
            {
                "question_id": q.question_id,
                "question": q.question,
                "answers_by_member": [v(a) for a in q.answers_by_member],
                "details": q.details,
            }
            for q in h.medical_questions
        ],
        "previous_policies": [
            {
                "insurer_name": v(x.insurer_name),
                "policy_number": v(x.policy_number),
                "continuously_insured_since": v(x.continuously_insured_since),
                "portability_requested": v(x.portability_requested),
            }
            for x in h.policy.previous_policies
        ],
    }


def to_ui_payload(result: ExtractionEnvelope) -> dict:
    return motor_ui(result) if result.document_type == "motor" else health_ui(result)
