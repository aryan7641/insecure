from __future__ import annotations

import asyncio
import os
import time
import uuid
from pathlib import Path

from .cache import EXTRACTION_CACHE
from .fast_extract import fast_health, fast_motor
from .grounding import ground_fields
from .llm import CompactLLMExtractor, PROMPT_VERSION
from .models import ExtractionEnvelope, ExtractionResponse, PipelineMetrics
from .normalize import detect_cross_document_conflicts, normalize_extraction, review_required, validate_business_consistency, validate_evidence
from .patch import apply_health_patch, apply_motor_patch, requested_scalar_paths
from .pdf import extract_pages
from .preprocess import fingerprint_file, fingerprint_pages, page_profiles
from .routing import build_targeted_context, classify_document, visual_pages_for_document
from .ui import to_ui_payload
from .vision import render_pages_as_data_urls
from .singleflight import SINGLE_FLIGHT


PIPELINE_VERSION = "hybrid-v3.1-2026-10-05"

CORE_MOTOR_PATHS = {
    "motor.vehicle.make", "motor.vehicle.model", "motor.vehicle.registration_no", "motor.vehicle.cubic_capacity", "motor.vehicle.seats_including_driver",
    "motor.vehicle.mfg_year", "motor.vehicle.engine_no", "motor.vehicle.chassis_no", "motor.policy.insurer_name", "motor.policy.policy_number",
    "motor.policy.policy_start_date", "motor.policy.policy_end_date", "motor.policy.idv_sum_assured", "motor.premium.od_premium", "motor.premium.final_premium",
    "motor.insured_customer.name", "motor.insured_customer.mobile", "motor.insured_customer.email", "motor.insured_customer.address",
}


def _field_count(result: ExtractionEnvelope, only_core: set[str] | None = None) -> int:
    from .normalize import iter_fields
    n = 0
    for path, field in iter_fields(result):
        if only_core is not None and path not in only_core:
            continue
        if field.source != "not_found":
            n += 1
    return n


def _should_call_llm(result: ExtractionEnvelope) -> bool:
    if result.document_type == "health":
        # Member/medical/optional-cover tables are semantically/layout complex and are the LLM's job.
        return True
    core_total = len(CORE_MOTOR_PATHS)
    coverage_threshold = float(os.environ.get("MOTOR_FAST_PATH_COVERAGE", "0.90"))
    return _field_count(result, CORE_MOTOR_PATHS) < core_total * coverage_threshold


def _empty_fast_result(doc_type: str) -> ExtractionEnvelope:
    if doc_type == "motor":
        return fast_motor([])
    return fast_health([])


def _extract_sync(pdf_path: str, model: str | None = None) -> ExtractionResponse:
    started = time.perf_counter()
    request_id = str(uuid.uuid4())

    # Fast cache lookup from the uploaded bytes. This avoids reparsing a repeated PDF.
    file_hash = fingerprint_file(pdf_path)
    model_name = model or os.environ.get("EXTRACTION_MODEL", "")
    cache_key = f"{file_hash}:{model_name}:{PROMPT_VERSION}:{PIPELINE_VERSION}"
    cached = EXTRACTION_CACHE.get(cache_key)
    if cached is not None:
        cached.request_id = request_id
        if cached.metrics:
            cached.metrics.cache_hit = True
            cached.metrics.total_ms = (time.perf_counter() - started) * 1000
            cached.metrics.pdf_ms = 0.0
        return cached

    t0 = time.perf_counter()
    pages = extract_pages(pdf_path)
    pdf_ms = (time.perf_counter() - t0) * 1000
    profiles = page_profiles(pages)
    fingerprint = fingerprint_pages(profiles)

    t0 = time.perf_counter()
    doc_type, doc_conf = classify_document(profiles)
    result = fast_motor(profiles) if doc_type == "motor" else fast_health(profiles)
    result.document_type_confidence = doc_conf
    result.global_notes.append("Hybrid extractor: deterministic candidate extraction first; LLM is used only for unresolved/complex content.")
    routing_ms = (time.perf_counter() - t0) * 1000
    deterministic_count = _field_count(result)

    llm_called = False
    llm_fields_filled = 0
    pages_sent = 0
    visual_pages_sent = 0
    model_chars = 0
    llm_ms = 0.0
    if _should_call_llm(result):
        context, selected_pages = build_targeted_context(profiles, doc_type)
        pages_sent = len(selected_pages)
        model_chars = len(context)
        requested = requested_scalar_paths(result)
        visual_candidates = [p for p in visual_pages_for_document([x for x in profiles if x.page in set(selected_pages)], doc_type)]
        visual_limit = int(os.environ.get("MAX_VISUAL_PAGES", "4"))
        images = render_pages_as_data_urls(pdf_path, visual_candidates, max_images=visual_limit, dpi=int(os.environ.get("VISUAL_RENDER_DPI", "120")))
        visual_pages_sent = len(images)
        if visual_candidates and not images:
            result.global_notes.append("Visual extraction pages were required but selective rendering is unavailable; affected checkbox/table fields may require manual review.")
        t0 = time.perf_counter()
        llm = CompactLLMExtractor(model=model)
        # Prevent a burst of identical uploads from issuing duplicate remote calls.
        patch = SINGLE_FLIGHT.run(
            f"{cache_key}:llm",
            lambda: llm.extract(doc_type, context, requested, images=images),
        )
        llm_ms = (time.perf_counter() - t0) * 1000
        llm_called = True
        before = _field_count(result)
        if doc_type == "motor":
            apply_motor_patch(result, patch)
        else:
            apply_health_patch(result, patch)
        llm_fields_filled = max(0, _field_count(result) - before)

    t0 = time.perf_counter()
    result = normalize_extraction(result)
    validate_business_consistency(result)
    normalization_ms = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    ground_fields(result, profiles)
    validate_evidence(result, [(p.page, p.text) for p in pages])
    result.global_conflicts = detect_cross_document_conflicts(result)
    grounding_ms = (time.perf_counter() - t0) * 1000

    response = ExtractionResponse(
        request_id=request_id,
        result=result,
        ui_payload=to_ui_payload(result),
        review_required=review_required(result),
        metrics=PipelineMetrics(
            total_ms=(time.perf_counter() - started) * 1000,
            pdf_ms=pdf_ms,
            routing_ms=routing_ms,
            llm_ms=llm_ms,
            normalization_ms=normalization_ms,
            grounding_ms=grounding_ms,
            pages_total=len(pages),
            pages_sent_to_model=pages_sent,
            visual_pages_sent=visual_pages_sent,
            source_chars=sum(len(p.text) for p in pages),
            model_input_chars=model_chars,
            deterministic_path=not llm_called,
            llm_called=llm_called,
            deterministic_fields_filled=deterministic_count,
            llm_fields_filled=llm_fields_filled,
            cache_hit=False,
        ),
    )
    EXTRACTION_CACHE.set(cache_key, response)
    return response


async def _extract_async(pdf_path: str, model: str | None = None) -> ExtractionResponse:
    return await asyncio.to_thread(_extract_sync, pdf_path, model)


def extract_policy(pdf_path: str, model: str | None = None) -> ExtractionResponse:
    return _extract_sync(pdf_path, model)


async def extract_policy_async(pdf_path: str, model: str | None = None) -> ExtractionResponse:
    return await _extract_async(pdf_path, model)
