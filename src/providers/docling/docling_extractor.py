#!/usr/bin/env python3
"""
Docling Document Extractor for INSecure Insurance CRM
Processes insurance policy PDFs to extract structured elements:
- Text, paragraphs, and headings
- 2D Tabular structures and data grids (Premium schedules, IDV tables, Add-ons)
- Document metadata and page counts
- Digital vs Scanned classification with RapidOCR fallback
- Key-Value pairs with page and spatial context
"""

import sys
import json
import os
import io
import traceback
from typing import Dict, Any, List, Optional

def is_pdf_digital(file_path: str) -> bool:
    """
    Inspects if the PDF has an embedded digital text layer
    or if it is purely a scanned image.
    """
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        total_text_len = 0
        for page in reader.pages[:3]: # inspect first 3 pages
            text = page.extract_text() or ''
            total_text_len += len(text.strip())
        return total_text_len > 60
    except Exception:
        # Fallback inspection via basic file read
        return True

def extract_with_docling(file_path: str, force_ocr: bool = False) -> Dict[str, Any]:
    """
    Extracts structured document output using IBM Docling DocumentConverter.
    """
    result: Dict[str, Any] = {
        "status": "success",
        "engine": "docling",
        "isDigital": True,
        "pageCount": 1,
        "headings": [],
        "paragraphs": [],
        "tables": [],
        "keyValues": {},
        "markdown": "",
        "fullText": "",
        "metadata": {}
    }

    is_digital = is_pdf_digital(file_path)
    result["isDigital"] = is_digital

    try:
        from docling.document_converter import DocumentConverter, PdfFormatOption
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions, TableFormerMode

        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_table_structure = True
        pipeline_options.table_structure_options.mode = TableFormerMode.ACCURATE
        
        # If scanned or OCR forced, enable OCR in Docling pipeline
        if not is_digital or force_ocr:
            pipeline_options.do_ocr = True
            result["ocrApplied"] = True
        else:
            pipeline_options.do_ocr = False
            result["ocrApplied"] = False

        doc_converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )

        conv_res = doc_converter.convert(file_path)
        doc = conv_res.document

        # 1. Export Markdown
        try:
            markdown_content = doc.export_to_markdown()
            result["markdown"] = markdown_content
            result["fullText"] = markdown_content
        except Exception:
            result["markdown"] = ""

        # 2. Extract Document Tables with rich 2D representation
        tables_list: List[Dict[str, Any]] = []
        if hasattr(doc, 'tables') and doc.tables:
            for idx, tbl in enumerate(doc.tables):
                table_dict: Dict[str, Any] = {
                    "tableIndex": idx,
                    "caption": getattr(tbl, 'caption', '') or '',
                    "page": getattr(tbl, 'page_no', 1) or 1,
                    "numRows": 0,
                    "numCols": 0,
                    "headers": [],
                    "rows": [],
                    "rawMarkdown": ""
                }
                
                # Export table to markdown or DataFrame if available
                try:
                    if hasattr(tbl, 'export_to_markdown'):
                        table_dict["rawMarkdown"] = tbl.export_to_markdown()
                    if hasattr(tbl, 'export_to_dataframe'):
                        df = tbl.export_to_dataframe()
                        table_dict["headers"] = list(df.columns)
                        table_dict["rows"] = df.values.tolist()
                        table_dict["numRows"] = len(table_dict["rows"])
                        table_dict["numCols"] = len(table_dict["headers"])
                except Exception:
                    pass

                # If dataframe export wasn't used, check grid data directly
                if not table_dict["rows"] and hasattr(tbl, 'data') and hasattr(tbl.data, 'grid'):
                    grid = tbl.data.grid
                    raw_grid = []
                    for row in grid:
                        raw_row = [cell.text for cell in row]
                        raw_grid.append(raw_row)
                    if raw_grid:
                        table_dict["headers"] = raw_grid[0] if raw_grid else []
                        table_dict["rows"] = raw_grid[1:] if len(raw_grid) > 1 else []
                        table_dict["numRows"] = len(table_dict["rows"])
                        table_dict["numCols"] = len(table_dict["headers"])

                tables_list.append(table_dict)

        result["tables"] = tables_list

        # 3. Extract Headings and Paragraphs from Docling Document Items
        headings_list: List[Dict[str, Any]] = []
        paragraphs_list: List[Dict[str, Any]] = []

        if hasattr(doc, 'texts') and doc.texts:
            for item in doc.texts:
                item_text = getattr(item, 'text', '') or ''
                item_label = getattr(item, 'label', '') or ''
                item_page = getattr(item, 'page_no', 1) or 1

                if 'header' in item_label.lower() or 'title' in item_label.lower() or 'heading' in item_label.lower():
                    headings_list.append({
                        "text": item_text.strip(),
                        "level": 1 if 'title' in item_label.lower() else 2,
                        "page": item_page
                    })
                else:
                    if item_text.strip():
                        paragraphs_list.append({
                            "text": item_text.strip(),
                            "page": item_page
                        })

        result["headings"] = headings_list
        result["paragraphs"] = paragraphs_list

        # 4. Extract Key-Values from Structured Elements
        kv_pairs: Dict[str, Any] = {}
        for p in paragraphs_list:
            t = p["text"]
            if ':' in t and len(t) < 250:
                parts = t.split(':', 1)
                k = parts[0].strip()
                v = parts[1].strip()
                if k and v and len(k) < 60:
                    kv_pairs[k] = { "value": v, "page": p["page"] }
        
        result["keyValues"] = kv_pairs

        # 5. Metadata
        if hasattr(doc, 'pages') and doc.pages:
            result["pageCount"] = len(doc.pages)

        return result

    except ImportError as ie:
        # Fallback if docling module is not found
        result["status"] = "warning"
        result["warning"] = f"Docling import error: {str(ie)}. Using fallback digital PDF parser."
        return fallback_extract_digital(file_path, result)
    except Exception as e:
        result["status"] = "warning"
        result["warning"] = f"Docling conversion exception: {str(e)}. Using fallback digital PDF parser."
        result["errorTrace"] = traceback.format_exc()
        return fallback_extract_digital(file_path, result)

def fallback_extract_digital(file_path: str, base_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Robust fallback when Docling is compiling or encountering native library exceptions.
    Extracts text, pages, and tabular layout using pypdf / pdfplumber if available.
    """
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        base_result["pageCount"] = len(reader.pages)
        full_text_list = []
        paragraphs_list = []
        headings_list = []
        key_values = {}

        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            page_text = page.extract_text() or ''
            full_text_list.append(f"--- Page {page_num} ---\n{page_text}")
            
            lines = [l.strip() for l in page_text.splitlines() if l.strip()]
            for line in lines:
                if len(line) < 60 and (line.isupper() or line.endswith(':')):
                    headings_list.append({ "text": line, "level": 2, "page": page_num })
                else:
                    paragraphs_list.append({ "text": line, "page": page_num })
                
                if ':' in line and len(line) < 250:
                    parts = line.split(':', 1)
                    k = parts[0].strip()
                    v = parts[1].strip()
                    if k and v and len(k) < 60:
                        key_values[k] = { "value": v, "page": page_num }

        base_result["fullText"] = "\n\n".join(full_text_list)
        base_result["markdown"] = base_result["fullText"]
        base_result["paragraphs"] = paragraphs_list
        base_result["headings"] = headings_list
        base_result["keyValues"] = key_values
        base_result["isDigital"] = len(base_result["fullText"].strip()) > 50
        return base_result
    except Exception as fe:
        base_result["status"] = "error"
        base_result["error"] = f"Fallback digital parse failed: {str(fe)}"
        return base_result

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
        output = extract_with_docling(file_path, force_ocr=force_ocr)
        print(json.dumps(output, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
