from __future__ import annotations

from typing import Any, Dict
from .models import ExtractionEnvelope, ExtractedField


def _val(field: ExtractedField | None, default: Any = None) -> Any:
    if field is None or field.value is None:
        return default
    return field.value


def _field_dict(field: ExtractedField | None) -> Dict[str, Any]:
    if field is None:
        return {"value": None, "state": "not_found", "confidence": 0.0, "source": "not_found"}
    return {
        "value": field.value,
        "rawValue": field.raw_value,
        "state": "extracted" if field.value is not None and field.source != "not_found" else "not_found",
        "source": field.source,
        "confidence": field.confidence,
        "requiresReview": field.requires_review,
        "notes": field.notes,
        "evidence": [e.model_dump() for e in field.evidence],
    }


def to_ui_payload(result: ExtractionEnvelope) -> dict:
    """Transform an ExtractionEnvelope into UI-ready dictionaries for INSecure frontend."""
    payload: Dict[str, Any] = {
        "document_type": result.document_type,
        "document_type_confidence": result.document_type_confidence,
        "review_required": len(result.global_conflicts) > 0,
        "global_conflicts": [c.model_dump() for c in result.global_conflicts],
        "global_notes": result.global_notes,
    }

    if result.document_type == "motor" and result.motor:
        m = result.motor
        payload["motor"] = {
            "customer": {
                "title": _val(m.insured_customer.title, ""),
                "name": _val(m.insured_customer.name, ""),
                "mobile": _val(m.insured_customer.mobile, ""),
                "email": _val(m.insured_customer.email, ""),
                "dob": _val(m.insured_customer.dob, ""),
                "pan": _val(m.insured_customer.pan, ""),
                "aadhaar": _val(m.insured_customer.aadhaar, ""),
                "gstNumber": _val(m.insured_customer.gst_number, ""),
                "address": _val(m.insured_customer.address, ""),
                "pincode": _val(m.insured_customer.pincode, ""),
                "city": _val(m.insured_customer.city_district, ""),
                "state": _val(m.insured_customer.state, ""),
                "customerType": _val(m.insured_customer.customer_type, "individual"),
            },
            "vehicle": {
                "vehicleType": _val(m.vehicle.type_of_vehicle, "Private Car"),
                "vehicleCategory": _val(m.vehicle.vehicle_category, "Private Car"),
                "make": _val(m.vehicle.make, ""),
                "model": _val(m.vehicle.model, ""),
                "variant": _val(m.vehicle.variant, ""),
                "fuelType": _val(m.vehicle.fuel_type, "Petrol"),
                "cubicCapacity": _val(m.vehicle.cubic_capacity, ""),
                "seatingCapacity": _val(m.vehicle.seats_including_driver, ""),
                "registrationNumber": _val(m.vehicle.registration_no, ""),
                "zone": _val(m.vehicle.zone, ""),
                "registrationDate": _val(m.vehicle.registration_date, ""),
                "manufacturingMonth": _val(m.vehicle.mfg_month, ""),
                "manufacturingYear": _val(m.vehicle.mfg_year, ""),
                "engineNumber": _val(m.vehicle.engine_no, ""),
                "chassisNumber": _val(m.vehicle.chassis_no, ""),
                "vehicleColor": _val(m.vehicle.vehicle_color, ""),
                "numberOfTyres": _val(m.vehicle.number_of_tire, ""),
                "financierName": _val(m.vehicle.financier, ""),
                "financed": _val(m.vehicle.financed, "No") == "Yes",
                "previousPolicyAvailable": _val(m.vehicle.previous_policy_available, "No") == "Yes",
            },
            "policy": {
                "insurer": _val(m.policy.insurer_name, ""),
                "policyType": _val(m.policy.policy_type, "Package Policy"),
                "policyNumber": _val(m.policy.policy_number, ""),
                "issueDate": _val(m.policy.policy_issue_date, ""),
                "startDate": _val(m.policy.policy_start_date, ""),
                "endDate": _val(m.policy.policy_end_date, ""),
                "idv": _val(m.policy.idv_sum_assured, ""),
                "ncb": _val(m.policy.current_ncb, "0"),
                "activeTpInsurerName": _val(m.policy.active_tp_insurer_name, ""),
                "activeTpPolicyNumber": _val(m.policy.active_tp_policy_number, ""),
                "activeTpPolicyStartDate": _val(m.policy.active_tp_policy_start_date, ""),
                "activeTpPolicyEndDate": _val(m.policy.active_tp_policy_end_date, ""),
                "financed": _val(m.policy.financed, "No") == "Yes",
                "financedBy": _val(m.policy.financed_by, ""),
                "addons": [a.model_dump() for a in m.policy.add_ons],
            },
            "premium": {
                "ownDamagePremium": _val(m.premium.od_premium, ""),
                "basicPremium": _val(m.premium.net_premium, ""),
                "gst": _val(m.premium.gst_cess, ""),
                "finalPremium": _val(m.premium.final_premium, ""),
            },
            "nominee": {
                "name": _val(m.nominee.name, ""),
                "dob": _val(m.nominee.dob, ""),
                "relation": _val(m.nominee.relationship, "Spouse"),
                "share": _val(m.nominee.share_percent, "100"),
                "address": _val(m.nominee.address, ""),
                "mobile": _val(m.nominee.mobile, ""),
                "email": _val(m.nominee.email, ""),
            },
            "payment": {
                "paymentStatus": _val(m.payment.status, "completed"),
                "paymentMethod": _val(m.payment.mode, "Online"),
                "payerName": _val(m.payment.payer_name, ""),
                "paymentAmount": _val(m.payment.amount_paid, ""),
                "receiptNumber": _val(m.payment.receipt_number, ""),
                "receiptDate": _val(m.payment.receipt_date, ""),
            },
            # Also provide field-level provenance object
            "fields": {
                "customer.name": _field_dict(m.insured_customer.name),
                "customer.mobile": _field_dict(m.insured_customer.mobile),
                "customer.email": _field_dict(m.insured_customer.email),
                "customer.dob": _field_dict(m.insured_customer.dob),
                "customer.pan": _field_dict(m.insured_customer.pan),
                "customer.aadhaar": _field_dict(m.insured_customer.aadhaar),
                "customer.address": _field_dict(m.insured_customer.address),
                "customer.pincode": _field_dict(m.insured_customer.pincode),
                "customer.city": _field_dict(m.insured_customer.city_district),
                "customer.state": _field_dict(m.insured_customer.state),
                "motor.registrationNumber": _field_dict(m.vehicle.registration_no),
                "motor.make": _field_dict(m.vehicle.make),
                "motor.model": _field_dict(m.vehicle.model),
                "motor.variant": _field_dict(m.vehicle.variant),
                "motor.fuelType": _field_dict(m.vehicle.fuel_type),
                "motor.cubicCapacity": _field_dict(m.vehicle.cubic_capacity),
                "motor.seatingCapacity": _field_dict(m.vehicle.seats_including_driver),
                "motor.engineNumber": _field_dict(m.vehicle.engine_no),
                "motor.chassisNumber": _field_dict(m.vehicle.chassis_no),
                "motor.idv": _field_dict(m.policy.idv_sum_assured),
                "motor.ncb": _field_dict(m.policy.current_ncb),
                "policy.insurer": _field_dict(m.policy.insurer_name),
                "policy.policyNumber": _field_dict(m.policy.policy_number),
                "policy.policyType": _field_dict(m.policy.policy_type),
                "policy.startDate": _field_dict(m.policy.policy_start_date),
                "policy.endDate": _field_dict(m.policy.policy_end_date),
                "premium.finalPremium": _field_dict(m.premium.final_premium),
                "premium.basicPremium": _field_dict(m.premium.net_premium),
                "premium.gst": _field_dict(m.premium.gst_cess),
            }
        }

    elif result.document_type == "health" and result.health:
        h = result.health
        payload["health"] = {
            "customer": {
                "title": _val(h.insured_customer.title, ""),
                "name": _val(h.insured_customer.name, ""),
                "mobile": _val(h.insured_customer.mobile, ""),
                "email": _val(h.insured_customer.email, ""),
                "dob": _val(h.insured_customer.dob, ""),
                "pan": _val(h.insured_customer.pan, ""),
                "aadhaar": _val(h.insured_customer.aadhaar, ""),
                "gstNumber": _val(h.insured_customer.gst_number, ""),
                "address": _val(h.insured_customer.address, ""),
                "pincode": _val(h.insured_customer.pincode, ""),
                "city": _val(h.insured_customer.city_district, ""),
                "state": _val(h.insured_customer.state, ""),
                "customerType": _val(h.insured_customer.customer_type, "individual"),
            },
            "basic_details": {
                "lobCategory": _val(h.basic_details.lob_category, "health"),
                "subLobCategory": _val(h.basic_details.sub_lob_category, "family_floater"),
                "businessType": _val(h.basic_details.business_type, "new"),
                "policyType": _val(h.basic_details.policy_type, "Family Floater"),
                "seniorCitizenPolicy": _val(h.basic_details.senior_citizen_policy, "No") == "Yes",
                "numberOfAdult": _val(h.basic_details.number_of_adult, "1"),
                "numberOfChild": _val(h.basic_details.number_of_child, "0"),
                "numberOfParent": _val(h.basic_details.number_of_parent, "0"),
                "eldestPersonAgeType": _val(h.basic_details.eldest_person_age_type, "DOB"),
                "eldestPersonDob": _val(h.basic_details.eldest_person_dob, ""),
                "treatmentZone": _val(h.basic_details.treatment_zone, ""),
                "ped": _val(h.basic_details.ped, "No"),
                "previousPolicyAvailable": _val(h.basic_details.previous_policy_available, "No") == "Yes",
            },
            "policy": {
                "insurer": _val(h.policy.insurer_name, ""),
                "productName": _val(h.policy.plan_name, ""),
                "planName": _val(h.policy.plan_name, ""),
                "policyNumber": _val(h.policy.policy_number, ""),
                "tenureYears": _val(h.policy.policy_tenure, "1"),
                "issueDate": _val(h.policy.policy_issue_date, ""),
                "startDate": _val(h.policy.policy_start_date, ""),
                "endDate": _val(h.policy.policy_end_date, ""),
                "sumAssured": _val(h.policy.total_sum_assured or h.policy.base_sum_assured, ""),
                "baseSumAssured": _val(h.policy.base_sum_assured, ""),
                "bonusSumAssured": _val(h.policy.bonus_sum_assured, ""),
                "ppt": _val(h.policy.ppt, "1"),
                "renewal": _val(h.policy.renewal, ""),
                "premiumFrequency": _val(h.policy.ppm_frequency, "yearly"),
                "optionalCovers": [c.model_dump() for c in h.policy.optional_covers],
                "riders": [r.model_dump() for r in h.policy.riders],
                "previousPolicies": [p.model_dump() for p in h.policy.previous_policies],
            },
            "members": [
                {
                    "memberId": _val(mem.member_id, f"M-{i+1}"),
                    "name": _val(mem.name, ""),
                    "gender": _val(mem.gender, ""),
                    "relationship": _val(mem.relationship, "Self"),
                    "dob": _val(mem.dob, ""),
                    "age": _val(mem.age, ""),
                    "insuredSince": _val(mem.insured_since, ""),
                    "heightCm": _val(mem.height_cm, ""),
                    "weightKg": _val(mem.weight_kg, ""),
                    "abhaNo": _val(mem.abha_no, ""),
                    "sumInsured": _val(mem.sum_insured, ""),
                    "aggregateDeductible": _val(mem.aggregate_deductible, ""),
                    "maternityCare": _val(mem.maternity_care, "No"),
                    "reductionMaternityWaitingPeriod": _val(mem.reduction_maternity_waiting_period, "No"),
                }
                for i, mem in enumerate(h.members)
            ],
            "medicalQuestions": [
                {
                    "questionId": q.question_id,
                    "question": q.question,
                    "answersByMember": [_val(a) for a in q.answers_by_member],
                    "details": q.details,
                    "evidence": [e.model_dump() for e in q.evidence],
                }
                for q in h.medical_questions
            ],
            "nominee": {
                "name": _val(h.nominee.name, ""),
                "dob": _val(h.nominee.dob, ""),
                "relation": _val(h.nominee.relationship, "Spouse"),
                "share": _val(h.nominee.share_percent, "100"),
                "address": _val(h.nominee.address, ""),
                "mobile": _val(h.nominee.mobile, ""),
                "email": _val(h.nominee.email, ""),
            },
            "premium": {
                "basicPremium": _val(h.premium.basic_premium, ""),
                "otherPremium": _val(h.premium.other_premium, ""),
                "netPremium": _val(h.premium.net_premium, ""),
                "gst": _val(h.premium.gst_percent, ""),
                "finalPremium": _val(h.premium.final_premium, ""),
                "installmentAmount": _val(h.premium.installment_amount, ""),
                "numberOfInstallment": _val(h.premium.number_of_installment, ""),
                "initialInstallment": _val(h.premium.initial_installment, ""),
                "initialReceivedAmount": _val(h.premium.initial_received_amount, ""),
            },
            "payment": {
                "paymentStatus": _val(h.payment.status, "completed"),
                "paymentMethod": _val(h.payment.mode, "Online"),
                "payerName": _val(h.payment.payer_name, ""),
                "paymentAmount": _val(h.payment.amount_paid, ""),
                "receiptNumber": _val(h.payment.receipt_number, ""),
                "receiptDate": _val(h.payment.receipt_date, ""),
            },
            "fields": {
                "customer.name": _field_dict(h.insured_customer.name),
                "customer.mobile": _field_dict(h.insured_customer.mobile),
                "customer.email": _field_dict(h.insured_customer.email),
                "customer.dob": _field_dict(h.insured_customer.dob),
                "customer.pan": _field_dict(h.insured_customer.pan),
                "customer.aadhaar": _field_dict(h.insured_customer.aadhaar),
                "customer.address": _field_dict(h.insured_customer.address),
                "customer.pincode": _field_dict(h.insured_customer.pincode),
                "customer.city": _field_dict(h.insured_customer.city_district),
                "customer.state": _field_dict(h.insured_customer.state),
                "policy.insurer": _field_dict(h.policy.insurer_name),
                "policy.planName": _field_dict(h.policy.plan_name),
                "policy.policyNumber": _field_dict(h.policy.policy_number),
                "policy.startDate": _field_dict(h.policy.policy_start_date),
                "policy.endDate": _field_dict(h.policy.policy_end_date),
                "policy.sumAssured": _field_dict(h.policy.total_sum_assured or h.policy.base_sum_assured),
                "premium.finalPremium": _field_dict(h.premium.final_premium),
                "premium.basicPremium": _field_dict(h.premium.basic_premium),
                "premium.gst": _field_dict(h.premium.gst_percent),
            }
        }

    return payload
