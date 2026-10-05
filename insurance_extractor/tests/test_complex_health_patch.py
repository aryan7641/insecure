import os
from pathlib import Path
import pytest

from insurance_extractor.compact_models import (
    CompactHealthOutput, HealthMemberPatch, HealthOptionalCoverPatch,
    HealthRiderPatch, MedicalQuestionPatch, MedicalAnswerPatch
)
from insurance_extractor.fast_extract import fast_health
from insurance_extractor.models import ExtractionEnvelope
from insurance_extractor.normalize import normalize_extraction
from insurance_extractor.patch import apply_health_patch
from insurance_extractor.pdf import extract_pages
from insurance_extractor.preprocess import page_profiles


def get_health_pdf():
    candidates = [
        Path("/mnt/data/health-ins.pdf"),
        Path("/app/health-ins.pdf"),
        Path("/tmp/health-ins.pdf"),
        Path(os.path.expanduser("~/health-ins.pdf")),
        Path("C:/Users/aryan/OneDrive/Documents/health-ins.pdf"),
        Path("./fixtures/health-ins.pdf"),
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def test_health_complex_mapping_on_sample():
    pdf = get_health_pdf()
    if not pdf:
        pytest.skip("sample PDF not mounted/found")
    profiles = page_profiles(extract_pages(pdf))
    result = fast_health(profiles)
    patch = CompactHealthOutput(
        previous_policy_available="No",
        members=[
            HealthMemberPatch(member_id="IDV00351242201036", name="Kamal Sharma", gender="Male", relationship="Self", dob="28/10/1989", age="36", insured_since="23/09/2026", height_cm="172", weight_kg="85", abha_no=None, sum_insured="500000"),
            HealthMemberPatch(member_id="IDV00351242202034", name="Sushma Rani", gender="Female", relationship="Spouse", dob="01/04/1992", age="34", insured_since="23/09/2026", height_cm="167", weight_kg="62", sum_insured="500000"),
            HealthMemberPatch(member_id="IDV00351242203009", name="Vinayak Sharma", gender="Male", relationship="Son 1", dob="05/02/2017", age="9", insured_since="23/09/2026", height_cm="127", weight_kg="31", sum_insured="500000"),
            HealthMemberPatch(member_id="IDV00351242204004", name="Yug Sharma", gender="Male", relationship="Son 2", dob="23/02/2022", age="4", insured_since="23/09/2026", height_cm="99", weight_kg="21", sum_insured="500000"),
        ],
        optional_covers=[
            HealthOptionalCoverPatch(name="Consumables Benefit", selected=True),
            HealthOptionalCoverPatch(name="Infinite Advantage", selected=True),
            HealthOptionalCoverPatch(name="Early Access", selected=True),
            HealthOptionalCoverPatch(name="Long Term Claim Free Benefit", selected=True),
        ],
        riders=[
            HealthRiderPatch(package_name="Flexi Shield", rider_name="Accidental Death Benefit Rider", selected=True, applicable_members=["Kamal Sharma", "Sushma Rani"]),
            HealthRiderPatch(package_name="Flexi Shield", rider_name="Supercharge Bonus Rider", selected=True, applicable_members=["Kamal Sharma", "Sushma Rani", "Vinayak Sharma", "Yug Sharma"]),
        ],
        medical_questions=[
            MedicalQuestionPatch(question_id="q1", question="Have you or any of the persons proposed for insurance, ever suffered from or taken treatment...", answers_by_member=[MedicalAnswerPatch(value="No"), MedicalAnswerPatch(value="No"), MedicalAnswerPatch(value="No"), MedicalAnswerPatch(value="No")]),
        ],
    )
    apply_health_patch(result, patch)
    result = normalize_extraction(result)
    assert result.health is not None
    assert len(result.health.members) == 4
    assert result.health.basic_details.number_of_adult.value == "2"
    assert result.health.basic_details.number_of_child.value == "2"
    assert result.health.basic_details.number_of_parent.value == "0"
    assert result.health.basic_details.previous_policy_available.value == "No"
    assert len(result.health.policy.optional_covers) == 4
    assert len(result.health.policy.riders) == 2
    assert len(result.health.medical_questions) == 1
