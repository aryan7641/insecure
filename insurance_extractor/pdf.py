from __future__ import annotations

from pathlib import Path
from typing import List

from pypdf import PdfReader

from .models import PageText


class PDFExtractionError(RuntimeError):
    pass


def extract_pages(path: str | Path) -> List[PageText]:
    path = Path(path)
    if not path.exists():
        raise PDFExtractionError(f"PDF not found: {path}")
    if path.suffix.lower() != ".pdf":
        raise PDFExtractionError("Input must be a PDF")

    reader = PdfReader(str(path))
    pages: List[PageText] = []
    for idx, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        pages.append(PageText(page=idx, text=text))

    if not pages:
        raise PDFExtractionError("PDF has no pages")

    total_chars = sum(len(p.text) for p in pages)
    if total_chars < 100:
        raise PDFExtractionError(
            "PDF contains insufficient extractable text. This extractor currently expects text PDFs, not scanned images."
        )
    return pages


def build_llm_document(pages: List[PageText]) -> str:
    blocks = []
    for p in pages:
        blocks.append(f"===== PAGE {p.page} =====\n{p.text}")
    return "\n\n".join(blocks)
