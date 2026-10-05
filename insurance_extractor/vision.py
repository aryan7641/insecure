from __future__ import annotations

import base64
from pathlib import Path
from typing import Iterable

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    fitz = None


class VisionRenderError(RuntimeError):
    pass


def render_pages_as_data_urls(
    pdf_path: str | Path,
    pages: Iterable[int],
    *,
    dpi: int = 120,
    max_images: int = 4,
    jpeg_quality: int = 72,
) -> dict[int, str]:
    """Render only selected PDF pages for visual extraction (checkboxes/tables).

    Page numbers are 1-based. This intentionally does not rasterize the entire PDF.
    """
    if fitz is None:
        return {}
    selected = sorted({int(p) for p in pages if int(p) > 0})[:max_images]
    if not selected:
        return {}

    path = Path(pdf_path)
    try:
        doc = fitz.open(str(path))
    except Exception as exc:  # noqa: BLE001
        raise VisionRenderError(f"Could not open PDF for selective rendering: {exc}") from exc

    out: dict[int, str] = {}
    zoom = dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)
    try:
        for page_no in selected:
            index = page_no - 1
            if index < 0 or index >= len(doc):
                continue
            page = doc[index]
            pix = page.get_pixmap(matrix=matrix, alpha=False, colorspace=fitz.csRGB)
            data = pix.tobytes("jpeg", jpg_quality=jpeg_quality)
            out[page_no] = "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii")
    finally:
        doc.close()
    return out
