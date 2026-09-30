from insurance_extractor.models import (
    ExtractionEnvelope,
    HealthBasicDetails,
    HealthExtraction,
    HealthMember,
    InsuredCustomer,
    Nominee,
    HealthPolicy,
    HealthPremium,
    PaymentDetails,
    ExtractedField,
    MotorExtraction,
    MotorVehicle,
    MotorPolicy,
    MotorPremium,
)
from insurance_extractor.normalize import normalize_extraction
from insurance_extractor.ui import to_ui_payload


def ef(value=None, source="not_found"):
    return ExtractedField(value=value, raw_value=value, source=source, confidence=1.0 if value else 0.0)


def test_health_counts_and_oldest():
    members = [
        HealthMember(name=ef("A"), age=ef("36"), dob=ef("28/10/1989"), relationship=ef("Self")),
        HealthMember(name=ef("B"), age=ef("34"), dob=ef("01/04/1992"), relationship=ef("Spouse")),
        HealthMember(name=ef("C"), age=ef("9"), dob=ef("05/02/2017"), relationship=ef("Son 1")),
        HealthMember(name=ef("D"), age=ef("4"), dob=ef("23/02/2022"), relationship=ef("Son 2")),
    ]
    h = HealthExtraction(
        basic_details=HealthBasicDetails(),
        policy=HealthPolicy(),
        insured_customer=InsuredCustomer(),
        members=members,
        nominee=Nominee(),
        premium=HealthPremium(),
        payment=PaymentDetails(),
        medical_questions=[],
    )
    r = normalize_extraction(ExtractionEnvelope(document_type="health", document_type_confidence=1.0, health=h))
    assert r.health.basic_details.number_of_adult.value == "2"
    assert r.health.basic_details.number_of_child.value == "2"
    assert r.health.basic_details.eldest_person_dob.value == "28-10-1989"

    # Test ui payload conversion
    payload = to_ui_payload(r)
    assert payload["document_type"] == "health"
    assert len(payload["health"]["members"]) == 4
    assert payload["health"]["basic_details"]["numberOfAdult"] == "2"


def test_dates_are_normalized():
    m = MotorExtraction(
        vehicle=MotorVehicle(),
        policy=MotorPolicy(policy_issue_date=ef("25/09/2026", "document")),
        premium=MotorPremium(),
        insured_customer=InsuredCustomer(),
        nominee=Nominee(),
        payment=PaymentDetails(),
    )
    r = normalize_extraction(ExtractionEnvelope(document_type="motor", document_type_confidence=1.0, motor=m))
    assert r.motor.policy.policy_issue_date.value == "25-09-2026"

    payload = to_ui_payload(r)
    assert payload["document_type"] == "motor"
    assert payload["motor"]["policy"]["issueDate"] == "25-09-2026"
