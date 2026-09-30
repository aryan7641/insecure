from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile

from insurance_extractor.service import extract_policy

app = FastAPI(title="Insurance Policy Extractor", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract")
def extract(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Upload a PDF file")

    suffix = Path(file.filename).suffix.lower()
    path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            while chunk := file.file.read(1024 * 1024):
                tmp.write(chunk)
            path = tmp.name
        response = extract_policy(path, model=os.environ.get("EXTRACTION_MODEL"))
        return response.model_dump(mode="json")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        if path:
            try:
                os.unlink(path)
            except Exception:
                pass


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Extract an insurance policy PDF into UI-ready JSON")
    parser.add_argument("pdf", help="Path to input PDF file")
    parser.add_argument("--output", default=None, help="Path to output JSON file")
    parser.add_argument("--model", default=None, help="OpenAI model name")
    args = parser.parse_args()

    result = extract_policy(args.pdf, model=args.model)
    dumped = json.dumps(result.model_dump(mode="json"), indent=2)
    if args.output:
        Path(args.output).write_text(dumped, encoding="utf-8")
        print(f"Wrote {args.output}")
    else:
        print(dumped)
