from insurance_extractor.models import (
    ExtractionEnvelope, HealthBasicDetails, HealthExtraction, HealthMember,
    InsuredCustomer, Nominee, HealthPolicy, HealthPremium, PaymentDetails,
    ExtractedField, MotorExtraction, MotorVehicle, MotorPolicy, MotorPremium
)
from insurance_extractor.normalize import normalize_extraction, normalize_address_for_ui


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
    r = normalize_extraction(ExtractionEnvelope(document_type="health", document_type_confidence=1, health=h))
    assert r.health.basic_details.number_of_adult.value == "2"
    assert r.health.basic_details.number_of_child.value == "2"
    assert r.health.basic_details.eldest_person_dob.value == "1989-10-28"


def test_dates_are_normalized():
    m = MotorExtraction(
        vehicle=MotorVehicle(), policy=MotorPolicy(policy_issue_date=ef("25/09/2026", "document")),
        premium=MotorPremium(), insured_customer=InsuredCustomer(), nominee=Nominee(), payment=PaymentDetails()
    )
    r = normalize_extraction(ExtractionEnvelope(document_type="motor", document_type_confidence=1, motor=m))
    assert r.motor.policy.policy_issue_date.value == "2026-09-25"


def test_address_is_normalized_for_ui():
    m = MotorExtraction(
        vehicle=MotorVehicle(), policy=MotorPolicy(),
        premium=MotorPremium(),
        insured_customer=InsuredCustomer(address=ef("A 4 KUMAWAT COLONY\r\nKHATIPURA ROAD\nJHOTWARA\tJAIPUR", "document")),
        nominee=Nominee(), payment=PaymentDetails()
    )
    r = normalize_extraction(ExtractionEnvelope(document_type="motor", document_type_confidence=1, motor=m))
    assert r.motor.insured_customer.address.value == "A 4 KUMAWAT COLONY KHATIPURA ROAD JHOTWARA JAIPUR"


def test_motor_address_line_break():
    assert normalize_address_for_ui(
        "A 4 KUMAWAT COLONY KHATIPURA\nROAD JHOTWARA JAIPUR"
    ) == "A 4 KUMAWAT COLONY KHATIPURA ROAD JHOTWARA JAIPUR"


def test_health_address_line_breaks():
    assert normalize_address_for_ui(
        "33, SHRI GOVIND NAGAR\n1ST JHOTWARA NIWAROO\nJAIPUR RAJASTHAN 302012"
    ) == "33, SHRI GOVIND NAGAR 1ST JHOTWARA NIWAROO JAIPUR RAJASTHAN 302012"


def test_address_multiple_spaces():
    assert normalize_address_for_ui(
        "A  4   KUMAWAT   COLONY"
    ) == "A 4 KUMAWAT COLONY"


def test_address_none():
    assert normalize_address_for_ui(None) is None


def test_gender_from_title_mr():
    from insurance_extractor.normalize import normalize_gender_from_title
    gender, conflict = normalize_gender_from_title("Mr.", None)
    assert gender == "Male"
    assert conflict is None

    gender, conflict = normalize_gender_from_title("MR", None)
    assert gender == "Male"
    assert conflict is None


def test_gender_from_title_mrs_ms_miss():
    from insurance_extractor.normalize import normalize_gender_from_title
    for t in ["Mrs.", "MRS", "Ms.", "MS", "Miss", "MISS"]:
        gender, conflict = normalize_gender_from_title(t, None)
        assert gender == "Female"
        assert conflict is None


def test_gender_from_title_dr_does_not_infer():
    from insurance_extractor.normalize import normalize_gender_from_title
    gender, conflict = normalize_gender_from_title("Dr.", None)
    assert gender is None
    assert conflict is None

    gender, conflict = normalize_gender_from_title("Dr.", "Male")
    assert gender == "Male"
    assert conflict is None


def test_gender_from_title_conflict():
    from insurance_extractor.normalize import normalize_gender_from_title
    # Title is Mr. but extracted gender was Female
    gender, conflict = normalize_gender_from_title("Mr.", "Female")
    assert gender == "Male"
    assert conflict is not None
    assert conflict.field == "gender"
    assert conflict.values == ["Female", "Male"]

    # Title is Mrs. but extracted gender was Male
    gender, conflict = normalize_gender_from_title("Mrs.", "Male")
    assert gender == "Female"
    assert conflict is not None
    assert conflict.field == "gender"


def test_motor_gender_derived_in_envelope():
    m = MotorExtraction(
        vehicle=MotorVehicle(), policy=MotorPolicy(),
        premium=MotorPremium(),
        insured_customer=InsuredCustomer(name=ef("MR. RAHUL SHARMA", "document")),
        nominee=Nominee(), payment=PaymentDetails()
    )
    r = normalize_extraction(ExtractionEnvelope(document_type="motor", document_type_confidence=1, motor=m))
    assert r.motor.insured_customer.title.value == "Mr."
    assert r.motor.insured_customer.gender.value == "Male"



