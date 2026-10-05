import time
import os
import json
from pathlib import Path
from insurance_extractor.service import extract_policy
from insurance_extractor.cache import EXTRACTION_CACHE


def find_pdf(name: str) -> Path | None:
    candidates = [
        Path(f"/mnt/data/{name}"),
        Path(f"/app/insecure-backend/fixtures/{name}"),
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


def run_benchmark():
    motor_pdf = find_pdf("motor.pdf")
    health_pdf = find_pdf("health-ins.pdf")
    
    print("=" * 60)
    print("V3 HYBRID PIPELINE PERFORMANCE BENCHMARK")
    print("=" * 60)

    if motor_pdf:
        # Clear cache first
        EXTRACTION_CACHE.clear()
        t0 = time.perf_counter()
        res_motor = extract_policy(str(motor_pdf))
        ms_motor_cold = (time.perf_counter() - t0) * 1000
        
        print(f"\n[MOTOR COLD] File: {motor_pdf.name}")
        print(f"Total time: {ms_motor_cold:.1f}ms (Internal metric: {res_motor.metrics.total_ms:.1f}ms)")
        print(f"PDF extraction: {res_motor.metrics.pdf_ms:.1f}ms")
        print(f"Deterministic path: {res_motor.metrics.deterministic_path} (LLM Called: {res_motor.metrics.llm_called})")
        print(f"Deterministic fields filled: {res_motor.metrics.deterministic_fields_filled}")
        print(f"Cache hit: {res_motor.metrics.cache_hit}")
        print(f"Review required: {res_motor.review_required}")
        print(f"Insurer: {res_motor.result.motor.policy.insurer_name.value}")
        print(f"Policy Number: {res_motor.result.motor.policy.policy_number.value}")
        print(f"Vehicle: {res_motor.result.motor.vehicle.registration_no.value} ({res_motor.result.motor.vehicle.make.value} {res_motor.result.motor.vehicle.model.value})")
        print(f"Printed Premium: OD={res_motor.result.motor.premium.od_premium.value}, GST={res_motor.result.motor.premium.gst_cess.value}, Total={res_motor.result.motor.premium.final_premium.value}")

        # Repeated Motor extraction (Cache hit)
        t0 = time.perf_counter()
        res_motor_warm = extract_policy(str(motor_pdf))
        ms_motor_warm = (time.perf_counter() - t0) * 1000
        print(f"\n[MOTOR WARM / CACHE HIT]")
        print(f"Total time: {ms_motor_warm:.2f}ms")
        print(f"Cache hit: {res_motor_warm.metrics.cache_hit}")

    if health_pdf:
        EXTRACTION_CACHE.clear()
        t0 = time.perf_counter()
        res_health = extract_policy(str(health_pdf))
        ms_health_cold = (time.perf_counter() - t0) * 1000
        
        print(f"\n[HEALTH COLD] File: {health_pdf.name}")
        print(f"Total time: {ms_health_cold:.1f}ms (Internal metric: {res_health.metrics.total_ms:.1f}ms)")
        print(f"PDF extraction: {res_health.metrics.pdf_ms:.1f}ms")
        print(f"Routing time: {res_health.metrics.routing_ms:.1f}ms")
        print(f"LLM time: {res_health.metrics.llm_ms:.1f}ms (LLM Called: {res_health.metrics.llm_called})")
        print(f"Pages sent to model: {res_health.metrics.pages_sent_to_model} (Visual pages: {res_health.metrics.visual_pages_sent})")
        print(f"Cache hit: {res_health.metrics.cache_hit}")
        print(f"Review required: {res_health.review_required}")
        print(f"Insurer: {res_health.result.health.policy.insurer_name.value}")
        print(f"Plan: {res_health.result.health.policy.plan_name.value}")
        print(f"Members extracted: {len(res_health.result.health.members)}")
        for idx, m in enumerate(res_health.result.health.members, 1):
            print(f"  Member {idx}: {m.name.value} | {m.gender.value} | {m.relationship.value} | DOB: {m.dob.value} | Age: {m.age.value}")
        print(f"Counts: Adults={res_health.result.health.basic_details.number_of_adult.value}, Children={res_health.result.health.basic_details.number_of_child.value}, Parents={res_health.result.health.basic_details.number_of_parent.value}")
        print(f"Eldest DOB: {res_health.result.health.basic_details.eldest_person_dob.value}")
        print(f"PED: {res_health.result.health.basic_details.ped.value}")
        print(f"Optional Covers: {len(res_health.result.health.policy.optional_covers)} covers")
        print(f"Riders: {len(res_health.result.health.policy.riders)} riders")
        print(f"Medical Questions: {len(res_health.result.health.medical_questions)} questions")

        # Repeated Health extraction (Cache hit)
        t0 = time.perf_counter()
        res_health_warm = extract_policy(str(health_pdf))
        ms_health_warm = (time.perf_counter() - t0) * 1000
        print(f"\n[HEALTH WARM / CACHE HIT]")
        print(f"Total time: {ms_health_warm:.2f}ms")
        print(f"Cache hit: {res_health_warm.metrics.cache_hit}")

    print("\n" + "=" * 60)
    print("BENCHMARK COMPLETED")
    print("=" * 60)


if __name__ == "__main__":
    run_benchmark()
