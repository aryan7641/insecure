from insurance_extractor.models import (
    ExtractedField, ExtractionEnvelope, HealthExtraction, HealthBasicDetails,
    HealthPolicy, HealthPremium, InsuredCustomer, Nominee, PaymentDetails,
    HealthMember, MedicalQuestion
)
from insurance_extractor.normalize import normalize_extraction


def f(value=None, source="not_found"):
    return ExtractedField(value=value, raw_value=value, source=source, confidence=0.95 if value else 0)


def health_with_members(questions):
    h = HealthExtraction(
        basic_details=HealthBasicDetails(), policy=HealthPolicy(), insured_customer=InsuredCustomer(),
        members=[
            HealthMember(name=f("A"), age=f("40"), dob=f("1986-01-01")),
            HealthMember(name=f("B"), age=f("10"), dob=f("2016-01-01"), relationship=f("Son"))
        ],
        nominee=Nominee(), premium=HealthPremium(), payment=PaymentDetails(), medical_questions=questions,
    )
    return ExtractionEnvelope(document_type="health", document_type_confidence=0.99, health=h)


def test_ped_ignores_non_ped_questions():
    q1 = MedicalQuestion(question_id="q1", question="Has any health or life insurance policy ever been terminated in the past?", answers_by_member=[f("Yes"), f("No")])
    q2 = MedicalQuestion(question_id="q2", question="Have you undergone any annual health check-up?", answers_by_member=[f("Yes"), f("No")])
    result = normalize_extraction(health_with_members([q1, q2]))
    assert result.health.basic_details.ped.value is None


def test_ped_uses_medical_condition_questions():
    q = MedicalQuestion(question_id="q1", question="Any other illness/disease/injury/disability in the past?", answers_by_member=[f("No"), f("No")])
    result = normalize_extraction(health_with_members([q]))
    assert result.health.basic_details.ped.value == "No"
