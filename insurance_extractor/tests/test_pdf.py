from pathlib import Path
import pytest

from insurance_extractor.pdf import extract_pages, PDFExtractionError


def test_motor_pdf_has_text():
    path = Path("/mnt/data/motor.pdf")
    if not path.exists():
        pytest.skip("Test sample motor.pdf not present")
    pages = extract_pages(path)
    joined = "\n".join(p.text for p in pages)
    assert "POLICY NO" in joined.upper()
    assert "VEHICLE NO" in joined.upper()


def test_health_pdf_has_text():
    path = Path("/mnt/data/health-ins.pdf")
    if not path.exists():
        pytest.skip("Test sample health-ins.pdf not present")
    pages = extract_pages(path)
    joined = "\n".join(p.text for p in pages)
    assert "POLICY SCHEDULE" in joined.upper()
    assert "POLICYHOLDER" in joined.upper()
