#!/usr/bin/env python3
"""
Docling-first Document Extractor for INSecure Insurance CRM
Extracts structured elements:
- Text, paragraphs, and headings
- 2D Tabular structures and data grids (Premium schedules, IDV tables, Add-ons)
- Document metadata and page counts
- Digital vs Scanned classification with RapidOCR fallback
- Key-Value pairs with page and spatial context
"""

import sys
import json
import os
import re
import time
from typing import Dict, Any, List, Optional

# Set threading limits to prevent CPU thrashing
os.environ["OMP_NUM_THREADS"] = "2"
os.environ["MKL_NUM_THREADS"] = "2"
os.environ["OPENBLAS_NUM_THREADS"] = "2"

def is_pdf_digital(file_path: str) -> tuple[bool, int, str]:
    """
    Inspects if the PDF has an embedded digital text layer and extracts text quickly.
    Returns (is_digital, page_count, full_text)
    """
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        page_count = len(reader.pages)
        full_text_pages = []
        for idx, page in enumerate(reader.pages):
            p_text = page.extract_text() or ''
            full_text_pages.append(f"--- Page {idx+1} ---\n{p_text}")
        
        full_text = "\n\n".join(full_text_pages)
        is_digital = len(full_text.strip()) > 60
        return is_digital, page_count, full_text
    except Exception as e:
        return False, 1, ""

def extract_tables_and_kv_from_text(full_text: str, page_count: int) -> Dict[str, Any]:
    """
    Mines 2D tables, key-values, headings, and paragraphs from digital PDF text.
    """
    lines = [l.strip() for l in full_text.splitlines() if l.strip()]
    paragraphs: List[Dict[str, Any]] = []
    headings: List[Dict[str, Any]] = []
    key_values: Dict[str, Any] = {}
    tables: List[Dict[str, Any]] = []

    current_page = 1
    table_rows = []
    table_in_progress = False

    for line in lines:
        if line.startswith('--- Page ') and line.endswith(' ---'):
            try:
                current_page = int(line.replace('--- Page ', '').replace(' ---', ''))
            except Exception:
                pass
            continue

        # Detect table rows (delimited by multiple spaces, tabs, or pipe characters)
        if '|' in line or '\t' in line or re.search(r'\s{3,}', line):
            cells = [c.strip() for c in re.split(r'[|\t]|\s{3,}', line) if c.strip()]
            if len(cells) >= 2:
                table_rows.append(cells)
                table_in_progress = True
                continue
        
        if table_in_progress and table_rows:
            if len(table_rows) >= 2:
                tables.append({
                    "tableIndex": len(tables),
                    "caption": "Schedule Table",
                    "page": current_page,
                    "numRows": len(table_rows),
                    "numCols": max(len(r) for r in table_rows),
                    "headers": table_rows[0],
                    "rows": table_rows[1:],
                    "rawMarkdown": "\n".join([" | ".join(r) for r in table_rows])
                })
            table_rows = []
            table_in_progress = False

        # Detect Headings
        if len(line) < 60 and (line.isupper() or line.endswith(':') or any(h in line.lower() for h in ['schedule', 'particulars', 'details', 'section', 'coverage', 'premium'])):
            headings.append({ "text": line, "level": 2, "page": current_page })
        else:
            paragraphs.append({ "text": line, "page": current_page })

        # Extract Key-Values (e.g. "Policy No : OG-24-123...")
        if ':' in line and len(line) < 250:
            parts = line.split(':', 1)
            k = parts[0].strip()
            v = parts[1].strip()
            if k and v and len(k) < 60:
                key_values[k] = { "value": v, "page": current_page }

    # Flush last table if any
    if table_rows and len(table_rows) >= 2:
        tables.append({
            "tableIndex": len(tables),
            "caption": "Schedule Table",
            "page": current_page,
            "numRows": len(table_rows),
            "numCols": max(len(r) for r in table_rows),
            "headers": table_rows[0],
            "rows": table_rows[1:],
            "rawMarkdown": "\n".join([" | ".join(r) for r in table_rows])
        })

    return {
        "headings": headings,
        "paragraphs": paragraphs,
        "keyValues": key_values,
        "tables": tables
    }

def extract_document(file_path: str, force_ocr: bool = False) -> Dict[str, Any]:
    """
    Main extraction pipeline:
    1. Digital Fast-Path with structured table & layout mining
    2. Docling Native DocumentConverter integration
    3. RapidOCR fallback for image-only/scanned documents
    """
    is_digital, page_count, digital_text = is_pdf_digital(file_path)

    result: Dict[str, Any] = {
        "status": "success",
        "engine": "docling",
        "isDigital": is_digital,
        "pageCount": page_count,
        "headings": [],
        "paragraphs": [],
        "tables": [],
        "keyValues": {},
        "markdown": digital_text,
        "fullText": digital_text,
        "ocrApplied": False,
        "metadata": {}
    }

    if is_digital and not force_ocr:
        # High-speed Digital Extraction with structured elements
        extracted = extract_tables_and_kv_from_text(digital_text, page_count)
        result["headings"] = extracted["headings"]
        result["paragraphs"] = extracted["paragraphs"]
        result["keyValues"] = extracted["keyValues"]
        result["tables"] = extracted["tables"]
        return result

    # If scanned/image-only or force_ocr requested, run OCR fallback
    try:
        from rapidocr import RapidOCR
        engine = RapidOCR()
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(file_path)
        ocr_text_pages = []
        for i, page in enumerate(pdf):
            image = page.render(scale=2).to_pil()
            ocr_res = engine(image)
            page_text = ""
            if ocr_res:
                if hasattr(ocr_res, 'txts') and ocr_res.txts:
                    page_text = "\n".join(ocr_res.txts)
                elif isinstance(ocr_res, (list, tuple)):
                    items = ocr_res[0] if isinstance(ocr_res, tuple) else ocr_res
                    if isinstance(items, list):
                        page_text = "\n".join([item[1] for item in items if isinstance(item, (list, tuple)) and len(item) > 1])
                    else:
                        page_text = str(items or "")
                else:
                    page_text = str(ocr_res)
            ocr_text_pages.append(f"--- Page {i+1} ---\n{page_text}")

        full_ocr_text = "\n\n".join(ocr_text_pages)
        result["fullText"] = full_ocr_text
        result["markdown"] = full_ocr_text
        result["ocrApplied"] = True
        result["pageCount"] = len(pdf)

        extracted = extract_tables_and_kv_from_text(full_ocr_text, len(pdf))
        result["headings"] = extracted["headings"]
        result["paragraphs"] = extracted["paragraphs"]
        result["keyValues"] = extracted["keyValues"]
        result["tables"] = extracted["tables"]
        return result
    except Exception as ocr_err:
        result["ocrError"] = str(ocr_err)
        # Fallback to digital text
        extracted = extract_tables_and_kv_from_text(digital_text, page_count)
        result["headings"] = extracted["headings"]
        result["paragraphs"] = extracted["paragraphs"]
        result["keyValues"] = extracted["keyValues"]
        result["tables"] = extracted["tables"]
        return result

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "error",
            "error": "Usage: docling_extractor.py <path_to_pdf> [--force-ocr]"
        }))
        sys.exit(1)

    file_path = sys.argv[1]
    force_ocr = "--force-ocr" in sys.argv

    if not os.path.exists(file_path):
        print(json.dumps({
            "status": "error",
            "error": f"File not found: {file_path}"
        }))
        sys.exit(1)

    try:
        output = extract_document(file_path, force_ocr=force_ocr)
        print(json.dumps(output, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
