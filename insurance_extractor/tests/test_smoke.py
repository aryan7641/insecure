import os
from pathlib import Path
from insurance_extractor.pdf import extract_pages


def find_pdf(name: str) -> Path | None:
    candidates = [
        Path(f"/mnt/data/{name}"),
        Path(f"/app/{name}"),
        Path(f"/tmp/{name}"),
        Path(os.path.expanduser(f"~/{name}")),
        Path(f"C:/Users/aryan/OneDrive/Documents/{name}"),
        Path(f"./fixtures/{name}"),
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def test_motor_pdf_has_text():
    path = find_pdf("motor.pdf")
    if not path or not path.exists():
        return
    pages = extract_pages(path)
    joined = "\n".join(p.text for p in pages)
    assert "POLICY NO" in joined.upper()
    assert "VEHICLE NO" in joined.upper()


def test_health_pdf_has_text():
    path = find_pdf("health-ins.pdf")
    if not path or not path.exists():
        return
    pages = extract_pages(path)
    joined = "\n".join(p.text for p in pages)
    assert "POLICY SCHEDULE" in joined.upper()
    assert "POLICYHOLDER" in joined.upper()
