import os
from pathlib import Path
import pytest

from insurance_extractor.fast_extract import fast_health, fast_motor
from insurance_extractor.normalize import normalize_extraction
from insurance_extractor.pdf import extract_pages
from insurance_extractor.preprocess import page_profiles
from insurance_extractor.routing import build_targeted_context, select_pages, visual_pages_for_document
from insurance_extractor.vision import render_pages_as_data_urls


def find_pdf(name: str) -> Path | None:
    candidates = [
        Path(f"/mnt/data/{name}"),
        Path(f"/app/{name}"),
        Path(f"/tmp/{name}"),
        Path(os.path.expanduser(f"~/{name}")),
        Path(f"C:/Users/aryan/OneDrive/Documents/{name}"),
        Path(f"./fixtures/{name}"),
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def test_motor_deterministic_sample():
    motor_pdf = find_pdf("motor.pdf")
    if not motor_pdf:
        pytest.skip("motor.pdf not found")
    result = normalize_extraction(fast_motor(page_profiles(extract_pages(motor_pdf))))
    assert result.motor is not None
    m = result.motor
    assert m.vehicle.make.value == "HYUNDAI"
    assert m.vehicle.model.value == "I20 SPORTZ"
    assert m.vehicle.variant.value == "1.2"
    assert m.vehicle.registration_no.value == "RJ-60-CE-5618"
    assert m.vehicle.cubic_capacity.value == "1197"
    assert m.vehicle.seats_including_driver.value == "5"
    assert m.vehicle.engine_no.value == "G4LFSM297016"
    assert m.vehicle.chassis_no.value == "MALBH512LSM357883"
    assert m.vehicle.financier.value == "FEDERAL BANK LTD."
    assert m.vehicle.zone.value == "B"
    assert m.insured_customer.city_district.value == "JAIPUR"
    assert m.insured_customer.state.value == "RAJASTHAN"
    assert m.policy.active_tp_policy_number.value == "OG261401182500001006"
    assert m.policy.active_tp_insurer_name.value == "BAJAJ ALLIANZ GENERAL INSURANCE CO.LTD"
    assert m.premium.od_premium.value == "10038"
    assert m.premium.gst_cess.value == "1807"
    assert m.premium.final_premium.value == "11845"
    addon = {x.name: x.premium for x in m.policy.add_ons}
    assert addon["Zero Depreciation"] == "4467.40"
    assert addon["Engine Protector"] == "1120.00"
    assert addon["Key Replacement"] == "150.00"


def test_health_fast_scalar_sample():
    health_pdf = find_pdf("health-ins.pdf")
    if not health_pdf:
        pytest.skip("health-ins.pdf not found")
    result = normalize_extraction(fast_health(page_profiles(extract_pages(health_pdf))))
    assert result.health is not None
    h = result.health
    assert h.policy.insurer_name.value == "TATA AIG General Insurance Company Limited"
    assert h.policy.plan_name.value == "TATA AIG MediCare Select"
    assert h.policy.policy_number.value == "7330359466"
    assert h.policy.base_sum_assured.value == "500000"
    assert h.policy.bonus_sum_assured.value == "0"
    assert h.policy.total_sum_assured.value == "500000"
    assert h.basic_details.treatment_zone.value == "C"
    assert h.payment.status.value == "Online"
    assert h.payment.amount_paid.value == "15127.00"
    assert h.nominee.name.value == "SUSHMA RANI"
    assert h.nominee.relationship.value == "Wife"
    assert h.nominee.share_percent.value == "100"


def test_router_is_section_complete_on_samples():
    health_pdf = find_pdf("health-ins.pdf")
    if not health_pdf:
        pytest.skip("health-ins.pdf not found")
    profiles = page_profiles(extract_pages(health_pdf))
    selected = select_pages(profiles, "health")
    pages = {p.page for p in selected}
    # These are discovered from headings/section terms, not hard-coded in the router.
    assert {4, 5, 6, 15, 16, 18, 19, 20}.issubset(pages)
    visual = visual_pages_for_document(selected, "health")
    assert 15 in visual
    assert 16 in visual
    context, ctx_pages = build_targeted_context(profiles, "health")
    assert len(ctx_pages) <= 8
    assert len(context) < 19000


def test_selective_rendering_only_renders_requested_pages():
    health_pdf = find_pdf("health-ins.pdf")
    if not health_pdf:
        pytest.skip("health-ins.pdf not found")
    rendered = render_pages_as_data_urls(health_pdf, [15, 16, 19], max_images=3, dpi=90)
    assert set(rendered) == {15, 16, 19}
    assert all(value.startswith("data:image/jpeg;base64,") for value in rendered.values())
