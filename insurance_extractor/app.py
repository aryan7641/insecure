from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile

from insurance_extractor.service import extract_policy_async

app = FastAPI(title="Insurance Policy Extractor", version="3.1.0")


@app.get("/health")
def health():
    return {"status": "ok", "version": "3.1.0"}


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Upload a PDF file")

    max_mb = int(os.environ.get("MAX_PDF_MB", "25"))
    max_bytes = max_mb * 1024 * 1024
    path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            path = tmp.name
            total = 0
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(status_code=413, detail=f"PDF exceeds configured size limit ({max_mb} MB)")
                tmp.write(chunk)
        response = await extract_policy_async(path, model=os.environ.get("EXTRACTION_MODEL"))
        return response.model_dump(mode="json")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        if path:
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Extract an insurance policy PDF into UI-ready JSON")
    parser.add_argument("pdf")
    parser.add_argument("--output", default=None, help="Output file path (prints JSON to stdout if omitted)")
    parser.add_argument("--model", default=None)
    args = parser.parse_args()

    from insurance_extractor.service import extract_policy
    result = extract_policy(args.pdf, model=args.model)
    dumped = json.dumps(result.model_dump(mode="json"), indent=2)
    if args.output and args.output != "-":
        Path(args.output).write_text(dumped, encoding="utf-8")
        print(f"Wrote {args.output}")
        if result.metrics:
            print(f"Total time: {result.metrics.total_ms:.1f}ms | Deterministic path: {result.metrics.deterministic_path} | LLM called: {result.metrics.llm_called}")
    else:
        print(dumped)
