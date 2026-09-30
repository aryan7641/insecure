from __future__ import annotations

import json
import os
from typing import Optional

from .models import ExtractionEnvelope
from .prompts import SYSTEM_PROMPT, build_user_prompt


class LLMExtractionError(RuntimeError):
    pass


class OpenAIExtractor:
    def __init__(self, model: str | None = None) -> None:
        self.model = model or os.environ.get("EXTRACTION_MODEL") or "gemini-3.5-flash-lite"
        self.api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise LLMExtractionError("GEMINI_API_KEY or OPENAI_API_KEY is not configured")

    def extract(self, document_text: str) -> ExtractionEnvelope:
        # 1. If using Gemini or Gemini key, use Google GenAI
        if self.model.startswith("gemini") or self.api_key.startswith("AQ.") or "generativelanguage" in os.environ.get("OPENAI_BASE_URL", ""):
            return self._extract_gemini(document_text)

        # 2. Standard OpenAI structured parsing
        return self._extract_openai(document_text)

    def _extract_gemini(self, document_text: str) -> ExtractionEnvelope:
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)

            models_to_try = [self.model, "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"]
            # Deduplicate while preserving order
            seen = set()
            models_to_try = [m for m in models_to_try if not (m in seen or seen.add(m))]

            schema_json = json.dumps(ExtractionEnvelope.model_json_schema(), indent=2)
            prompt = (
                f"Extract the policy data into a valid JSON object strictly matching this schema:\n\n"
                f"```json\n{schema_json}\n```\n\n"
                f"{build_user_prompt(document_text)}"
            )

            last_err = None
            for m in models_to_try:
                try:
                    gen_model = genai.GenerativeModel(
                        model_name=m,
                        system_instruction=SYSTEM_PROMPT,
                        generation_config={
                            "response_mime_type": "application/json",
                            "temperature": 0.1,
                        }
                    )
                    res = gen_model.generate_content(prompt)
                    raw_text = res.text.strip()
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    return ExtractionEnvelope.model_validate_json(raw_text.strip())
                except Exception as model_err:
                    last_err = model_err
                    continue

            raise LLMExtractionError(f"All Gemini models failed. Last error: {last_err}")
        except Exception as exc:
            if isinstance(exc, LLMExtractionError):
                raise
            raise LLMExtractionError(f"Gemini extraction failed: {exc}") from exc

    def _extract_openai(self, document_text: str) -> ExtractionEnvelope:
        try:
            from openai import OpenAI
            client = OpenAI(
                api_key=self.api_key,
                base_url=os.environ.get("OPENAI_BASE_URL", None)
            )
            response = client.responses.parse(
                model=self.model,
                input=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_prompt(document_text)},
                ],
                text_format=ExtractionEnvelope,
            )
            parsed = response.output_parsed
            if parsed is None:
                raise LLMExtractionError("OpenAI model returned no structured extraction")
            return parsed
        except Exception as exc:
            if isinstance(exc, LLMExtractionError):
                raise
            raise LLMExtractionError(f"OpenAI extraction failed: {exc}") from exc
