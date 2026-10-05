from __future__ import annotations

import os
from pathlib import Path
from typing import List

from .models import PageText
from .preprocess import clean_page_text

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    fitz = None

from pypdf import PdfReader


class PDFExtractionError(RuntimeError):
    pass


def _limits(path: Path) -> tuple[int, int]:
    max_mb = int(os.environ.get("MAX_PDF_MB", "25"))
    max_pages = int(os.environ.get("MAX_PDF_PAGES", "100"))
    if path.stat().st_size > max_mb * 1024 * 1024:
        raise PDFExtractionError(f"PDF exceeds configured size limit ({max_mb} MB)")
    return max_mb, max_pages


def _extract_with_pymupdf(path: Path, max_pages: int) -> List[PageText]:
    if fitz is None:
        raise PDFExtractionError("PyMuPDF is not installed")
    doc = fitz.open(str(path))
    try:
        if doc.needs_pass:
            raise PDFExtractionError("Encrypted/password-protected PDFs are not supported")
        if len(doc) > max_pages:
            raise PDFExtractionError(f"PDF exceeds configured page limit ({max_pages})")
        pages: List[PageText] = []
        for idx, page in enumerate(doc, start=1):
            text = clean_page_text(page.get_text("text") or "")
            pages.append(PageText(page=idx, text=text))
        return pages
    finally:
        doc.close()


def _extract_with_pypdf(path: Path, max_pages: int) -> List[PageText]:
    reader = PdfReader(str(path), strict=False)
    if reader.is_encrypted:
        try:
            if not reader.decrypt(""):
                raise PDFExtractionError("Encrypted/password-protected PDFs are not supported")
        except Exception as exc:  # noqa: BLE001
            raise PDFExtractionError("Encrypted/password-protected PDFs are not supported") from exc
    if len(reader.pages) > max_pages:
        raise PDFExtractionError(f"PDF exceeds configured page limit ({max_pages})")
    pages: List[PageText] = []
    for idx, page in enumerate(reader.pages, start=1):
        try:
            text = clean_page_text(page.extract_text() or "")
        except Exception as exc:  # noqa: BLE001
            raise PDFExtractionError(f"Failed to extract text from page {idx}: {exc}") from exc
        pages.append(PageText(page=idx, text=text))
    return pages


def extract_pages(path: str | Path) -> List[PageText]:
    path = Path(path)
    if not path.exists():
        raise PDFExtractionError(f"PDF not found: {path}")
    if path.suffix.lower() != ".pdf":
        raise PDFExtractionError("Input must be a PDF")
    _, max_pages = _limits(path)

    # PyMuPDF is materially faster for text extraction and is already used for selective
    # rendering later. Keep pypdf as a compatibility fallback for unusual PDFs.
    if fitz is not None:
        try:
            pages = _extract_with_pymupdf(path, max_pages)
        except PDFExtractionError:
            raise
        except Exception:
            pages = _extract_with_pypdf(path, max_pages)
    else:
        pages = _extract_with_pypdf(path, max_pages)

    if not pages:
        raise PDFExtractionError("PDF has no pages")
    total_chars = sum(len(p.text) for p in pages)
    min_chars = int(os.environ.get("MIN_EXTRACTABLE_TEXT_CHARS", "100"))
    if total_chars < min_chars:
        raise PDFExtractionError(
            "PDF contains insufficient extractable text. This extractor currently expects digitally generated/text PDFs; add an OCR ingress stage for scanned PDFs."
        )
    return pages


def build_llm_document(pages: List[PageText]) -> str:
    # Backwards-compatible helper. Production pipeline uses page routing instead.
    return "\n\n".join(f"===== PAGE {p.page} =====\n{p.text}" for p in pages)
