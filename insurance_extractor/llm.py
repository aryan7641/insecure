from __future__ import annotations

import os
from openai import OpenAI

from .models import ExtractionEnvelope
from .prompts import SYSTEM_PROMPT, build_user_prompt


class LLMExtractionError(RuntimeError):
    pass


class OpenAIExtractor:
    def __init__(self, model: str | None = None) -> None:
        self.model = model or os.environ.get("EXTRACTION_MODEL") or "gpt-4o-mini"
        if not self.model:
            raise LLMExtractionError("EXTRACTION_MODEL is not set")
        self.client = OpenAI()

    def extract(self, document_text: str) -> ExtractionEnvelope:
        try:
            response = self.client.responses.parse(
                model=self.model,
                input=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_prompt(document_text)},
                ],
                text_format=ExtractionEnvelope,
            )
            parsed = response.output_parsed
            if parsed is None:
                raise LLMExtractionError("Model returned no structured extraction")
            return parsed
        except Exception as exc:  # noqa: BLE001
            if isinstance(exc, LLMExtractionError):
                raise
            raise LLMExtractionError(f"LLM extraction failed: {exc}") from exc
