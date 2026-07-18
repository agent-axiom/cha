from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest
from PIL import Image
from pypdf.generic import ArrayObject, DictionaryObject, NameObject


BOOK = Path(__file__).resolve().parents[1]


def load_script(name: str):
    path = BOOK / "scripts" / f"{name}.py"
    assert path.is_file(), f"missing preflight script: {path}"
    spec = importlib.util.spec_from_file_location(f"puer_{name}", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_current_editorial_proofs_pass_structured_preflight() -> None:
    verifier = load_script("verify_pdf")
    cases = (
        ("puer-album-proof.pdf", "album", "album.json", 208),
        ("puer-guide-proof.pdf", "guide", "guide.json", 48),
    )
    for filename, kind, flatplan, pages in cases:
        report = verifier.verify(BOOK / "output/pdf" / filename, kind, flatplan)
        assert report.errors == []
        assert report.evidence["pages"] == pages
        assert report.evidence["text_pages"] == pages
        assert report.evidence["ordered_page_ids"] is True
        assert report.evidence["editorial_metadata"] is True
        assert report.evidence["all_fonts_embedded"] is True
        assert report.evidence["boxes_verified"] == pages
        assert isinstance(report.notices, list)


def test_preflight_rejects_the_wrong_flatplan_and_page_id_order() -> None:
    verifier = load_script("verify_pdf")
    report = verifier.verify(
        BOOK / "output/pdf/puer-album-proof.pdf", "guide", "guide.json"
    )
    assert report.errors
    assert any("pages" in error or "page id" in error.lower() for error in report.errors)


def test_preflight_fails_closed_without_pdffonts(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    verifier = load_script("verify_pdf")
    monkeypatch.setattr(verifier, "locate_poppler_tool", lambda _name: None)
    errors, notices, evidence = verifier.external_font_check(tmp_path / "proof.pdf")
    assert errors == ["pdffonts unavailable; external font preflight is required"]
    assert notices == []
    assert evidence["pdffonts_available"] is False


def test_preflight_detects_pdfx_output_intent_in_catalog() -> None:
    verifier = load_script("verify_pdf")
    catalog = DictionaryObject(
        {
            NameObject("/OutputIntents"): ArrayObject(
                [
                    DictionaryObject(
                        {
                            NameObject("/S"): NameObject("/GTS_PDFX"),
                        }
                    )
                ]
            )
        }
    )
    assert verifier.catalog_has_pdfx_output_intent(catalog) is True
    assert verifier.catalog_has_pdfx_output_intent(DictionaryObject()) is False


def test_contact_sheet_natural_order_chunking_and_empty_guard(tmp_path: Path) -> None:
    contacts = load_script("make_contact_sheet")
    pages = tmp_path / "pages"
    pages.mkdir()
    for name, color in (
        ("page-3.png", "#0000ff"),
        ("page-2.png", "#00ff00"),
        ("page-1.png", "#ff0000"),
    ):
        Image.new("RGB", (40, 60), color).save(pages / name)

    outputs = contacts.build(
        pages,
        tmp_path / "contact.jpg",
        columns=2,
        chunk_size=2,
        thumb_size=(40, 60),
        gap=8,
        label_height=18,
    )
    assert [path.name for path in outputs] == [
        "contact-001-002.jpg",
        "contact-003-003.jpg",
    ]
    first = Image.open(outputs[0]).convert("RGB")
    # First two thumbnails must be page-1 (red), page-2 (green), never lexicographic 1,10.
    assert first.getpixel((8 + 20, 8 + 30))[0] > 200
    assert first.getpixel((8 + (40 + 8) + 20, 8 + 30))[1] > 200

    empty = tmp_path / "empty"
    empty.mkdir()
    with pytest.raises(ValueError, match="no PNG pages"):
        contacts.build(empty, tmp_path / "empty.jpg")


def test_contact_sheet_rejects_missing_or_duplicate_page_numbers(tmp_path: Path) -> None:
    contacts = load_script("make_contact_sheet")
    missing = tmp_path / "missing"
    missing.mkdir()
    for name in ("proof-1.png", "proof-3.png"):
        Image.new("RGB", (20, 20), "#ffffff").save(missing / name)
    with pytest.raises(ValueError, match="continuous page sequence"):
        contacts.build(missing, tmp_path / "missing.jpg")

    duplicate = tmp_path / "duplicate"
    duplicate.mkdir()
    for name in ("proof-a-1.png", "proof-b-1.png"):
        Image.new("RGB", (20, 20), "#ffffff").save(duplicate / name)
    with pytest.raises(ValueError, match="continuous page sequence"):
        contacts.build(duplicate, tmp_path / "duplicate.jpg")
