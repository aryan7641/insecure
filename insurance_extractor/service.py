from __future__ import annotations

import uuid

from .llm import OpenAIExtractor
from .models import ExtractionResponse
from .normalize import detect_cross_document_conflicts, normalize_extraction, review_required, validate_evidence
from .pdf import build_llm_document, extract_pages
from .ui import to_ui_payload


def extract_policy(pdf_path: str, model: str | None = None) -> ExtractionResponse:
    request_id = str(uuid.uuid4())
    pages = extract_pages(pdf_path)
    document_text = build_llm_document(pages)

    llm = OpenAIExtractor(model=model)
    result = llm.extract(document_text)
    result = normalize_extraction(result)
    validate_evidence(result, [(p.page, p.text) for p in pages])
    result.global_conflicts = detect_cross_document_conflicts(result)

    return ExtractionResponse(
        request_id=request_id,
        result=result,
        ui_payload=to_ui_payload(result),
        review_required=review_required(result),
    )
