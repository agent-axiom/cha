from __future__ import annotations

import importlib.util
import json
import os
import re
from copy import deepcopy
from pathlib import Path

import pytest
from pypdf import PdfReader
from pypdf.generic import ContentStream, DictionaryObject
from reportlab.pdfgen.canvas import Canvas


BOOK = Path(__file__).resolve().parents[1]
OUTPUT = BOOK / "output" / "pdf"
POINT_TOLERANCE = 0.5
PROOF_METADATA = {
    "/PuerProofStatus": "editorial-proof",
    "/PuerPrintReadiness": "not-print-ready",
    "/PuerPdfStandard": "not-pdf-x",
}
AI_ILLUSTRATION_PREVIEWS = {
    "illustration-cover-living-mountain": (
        "illustration-cover-living-mountain--preview-v01.png"
    ),
    "illustration-shennong-gate": "illustration-shennong-gate--preview-v01.png",
    "illustration-zhuge-liang-legend": (
        "illustration-zhuge-liang-legend--preview-v01.png"
    ),
}
VISIBLE_PAGE_ID_RE = re.compile(r"\b[AG]-P\d{3}\b")


def load_build_proof_module():
    path = BOOK / "scripts" / "build_proof.py"
    spec = importlib.util.spec_from_file_location("puer_build_proof", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BUILD_PROOF = load_build_proof_module()


def mm(value: float) -> float:
    return value * 72 / 25.4


def test_paragraph_markup_drops_standalone_markdown_rules() -> None:
    markup = BUILD_PROOF.paragraph_markup("Первый абзац\n\n---\n\nВторой абзац")
    assert "---" not in markup
    assert "Первый абзац" in markup
    assert "Второй абзац" in markup


def test_claim_source_lines_are_readable_deduplicated_and_provenance_labeled() -> None:
    assert BUILD_PROOF.CLAIM_NOTE_FONT_SIZE >= 7.0
    body = """
<!-- claim:claim-a -->
Текст.
<!-- claim:claim-a -->
<!-- claim:claim-b -->
"""
    claims = {
        "claim-a": {"sourceIds": ["source-a", "registry-source"]},
        "claim-b": {"sourceIds": ["source-b"]},
    }
    lines = BUILD_PROOF.claim_source_lines(
        body,
        claims,
        known_source_ids={"source-a", "source-b", "registry-source"},
        provenance_only_ids={"registry-source"},
    )
    assert lines == [
        "Тезис claim-a → источники: source-a; registry-source [редакционный реестр]",
        "Тезис claim-b → источники: source-b",
    ]
    with pytest.raises(ValueError, match="unknown source key for proof: missing-source"):
        BUILD_PROOF.claim_source_lines(
            "<!-- claim:claim-c -->",
            {"claim-c": {"sourceIds": ["missing-source"]}},
            known_source_ids={"source-a"},
            provenance_only_ids=set(),
        )


def test_claim_source_lines_reject_unknown_claim_marker() -> None:
    with pytest.raises(ValueError, match="unknown claim marker in proof: missing-claim"):
        BUILD_PROOF.claim_source_lines(
            "<!-- claim:missing-claim -->",
            {},
            known_source_ids=set(),
            provenance_only_ids=set(),
        )


def test_claim_note_band_rejects_overflow() -> None:
    BUILD_PROOF.register_fonts()
    lines = [
        f"Тезис claim-{index} → источники: source-{index}; another-source-{index}"
        for index in range(80)
    ]
    with pytest.raises(ValueError, match="claim-to-source note band overflow"):
        BUILD_PROOF.claim_note_paragraph(lines, mm(20), color=BUILD_PROOF.INK)


def test_metadata_staging_is_incremental_and_preserves_canvas_bytes(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.pdf"
    target = tmp_path / "target.pdf"
    canvas = Canvas(str(source), pagesize=(100, 100), invariant=1)
    canvas.drawString(10, 50, "render-resource-regression")
    canvas.save()
    source_bytes = source.read_bytes()

    BUILD_PROOF.stage_editorial_metadata(source, target)

    # A full pypdf rewrite changed valid ReportLab resource graphs enough for
    # Poppler to drop text and vector fragments. Incremental metadata staging
    # must leave the complete canvas PDF byte-for-byte intact as its prefix.
    assert target.read_bytes().startswith(source_bytes)
    metadata = PdfReader(target).metadata or {}
    for key, value in PROOF_METADATA.items():
        assert metadata.get(key) == value


def assert_close(actual: float, expected: float, *, label: str) -> None:
    assert abs(actual - expected) < POINT_TOLERANCE, (
        f"{label}: {actual:.3f} pt != {expected:.3f} pt"
    )


def resolved(value):
    return value.get_object() if hasattr(value, "get_object") else value


def registered_assets() -> dict[str, dict]:
    records = json.loads((BOOK / "data" / "assets.json").read_text(encoding="utf-8"))
    return {record["id"]: record for record in records}


def selected_fonts(page, reader: PdfReader) -> set[str]:
    used: set[str] = set()
    content = page.get_contents()
    if content is None:
        return used
    for operands, operator in ContentStream(content, reader).operations:
        if operator == b"Tf":
            used.add(str(operands[0]))
    return used


def embedded_font_files(font) -> list:
    font = resolved(font)
    descendants = font.get("/DescendantFonts") if font.get("/Subtype") == "/Type0" else None
    concrete_fonts = [resolved(value) for value in resolved(descendants or [font])]
    embedded = []
    for concrete in concrete_fonts:
        descriptor = concrete.get("/FontDescriptor")
        if descriptor is None:
            continue
        descriptor = resolved(descriptor)
        for key in ("/FontFile", "/FontFile2", "/FontFile3"):
            if key in descriptor:
                embedded.append(resolved(descriptor[key]))
    return embedded


def assert_box(
    box,
    *,
    left_mm: float,
    bottom_mm: float,
    width_mm: float,
    height_mm: float,
    label: str,
) -> None:
    expected = (
        mm(left_mm),
        mm(bottom_mm),
        mm(left_mm + width_mm),
        mm(bottom_mm + height_mm),
    )
    actual = tuple(float(value) for value in box)
    for coordinate, (actual_value, expected_value) in enumerate(zip(actual, expected)):
        assert_close(
            actual_value,
            expected_value,
            label=f"{label} coordinate {coordinate}",
        )


def assert_editorial_proof(
    path: Path,
    *,
    pages: int,
    trim_width_mm: int,
    trim_height_mm: int,
    bleed_mm: int = 3,
) -> PdfReader:
    assert path.exists(), f"missing editorial proof PDF: {path}"
    reader = PdfReader(path)
    assert len(reader.pages) == pages

    metadata = reader.metadata or {}
    assert metadata.get("/Subject") == (
        "Editorial proof for review only - not print-ready and not PDF/X."
    )
    for key, value in PROOF_METADATA.items():
        assert metadata.get(key) == value

    media_width_mm = trim_width_mm + bleed_mm * 2
    media_height_mm = trim_height_mm + bleed_mm * 2
    for page_number, page in enumerate(reader.pages, start=1):
        assert_box(
            page.mediabox,
            left_mm=0,
            bottom_mm=0,
            width_mm=media_width_mm,
            height_mm=media_height_mm,
            label=f"{path.name} page {page_number} MediaBox",
        )
        assert_box(
            page.trimbox,
            left_mm=bleed_mm,
            bottom_mm=bleed_mm,
            width_mm=trim_width_mm,
            height_mm=trim_height_mm,
            label=f"{path.name} page {page_number} TrimBox",
        )
        assert_box(
            page.bleedbox,
            left_mm=0,
            bottom_mm=0,
            width_mm=media_width_mm,
            height_mm=media_height_mm,
            label=f"{path.name} page {page_number} BleedBox",
        )
        assert "/Resources" in page, f"{path.name} page {page_number}: no resources"
        assert isinstance(resolved(page["/Resources"]), DictionaryObject)

    return reader


@pytest.mark.parametrize(
    ("filename", "pages", "trim_width_mm", "trim_height_mm"),
    [
        ("puer-album-proof.pdf", 208, 240, 300),
        ("puer-guide-proof.pdf", 48, 150, 220),
    ],
)
def test_editorial_proof_geometry_and_resources(
    filename: str,
    pages: int,
    trim_width_mm: int,
    trim_height_mm: int,
) -> None:
    assert_editorial_proof(
        OUTPUT / filename,
        pages=pages,
        trim_width_mm=trim_width_mm,
        trim_height_mm=trim_height_mm,
    )


@pytest.mark.parametrize(
    "filename",
    ["puer-album-proof.pdf", "puer-guide-proof.pdf"],
)
def test_proofs_do_not_claim_print_readiness_or_pdf_x(filename: str) -> None:
    path = OUTPUT / filename
    assert path.exists(), f"missing editorial proof PDF: {path}"
    reader = PdfReader(path)
    metadata = reader.metadata or {}

    assert metadata.get("/PuerProofStatus") == "editorial-proof"
    assert metadata.get("/PuerPrintReadiness") == "not-print-ready"
    assert metadata.get("/PuerPdfStandard") == "not-pdf-x"
    assert "/GTS_PDFXVersion" not in metadata
    assert "/GTS_PDFXConformance" not in metadata

    output_intents = resolved(reader.trailer["/Root"].get("/OutputIntents", []))
    for intent in output_intents:
        intent = resolved(intent)
        assert str(intent.get("/S", "")) != "/GTS_PDFX"


def test_owned_ai_illustrations_resolve_to_committed_previews() -> None:
    assets = registered_assets()
    for asset_id, filename in AI_ILLUSTRATION_PREVIEWS.items():
        asset = assets[asset_id]
        assert asset["kind"] == "illustration"
        assert asset["status"] == "preview"
        assert asset["rights"] == "owned"
        assert (BOOK.parent / asset["licenseFile"]).is_file()

        expected = BOOK / "assets" / "previews" / filename
        assert expected.is_file()
        assert BUILD_PROOF.preview_path(asset) == expected


@pytest.mark.parametrize("asset_id", sorted(AI_ILLUSTRATION_PREVIEWS))
@pytest.mark.parametrize(
    ("field", "invalid_value"),
    [
        ("status", "concept"),
        ("rights", "pending"),
        ("kind", "photo"),
    ],
)
def test_ai_preview_resolution_fails_closed(
    asset_id: str,
    field: str,
    invalid_value: str,
) -> None:
    asset = deepcopy(registered_assets()[asset_id])
    asset[field] = invalid_value
    assert BUILD_PROOF.preview_path(asset) is None


def test_publish_pair_rolls_back_both_previous_outputs(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    album_staged = tmp_path / "album.staged.pdf"
    album_final = tmp_path / "album.pdf"
    guide_staged = tmp_path / "guide.staged.pdf"
    guide_final = tmp_path / "guide.pdf"
    album_staged.write_bytes(b"new album")
    guide_staged.write_bytes(b"new guide")
    album_final.write_bytes(b"previous album")
    guide_final.write_bytes(b"previous guide")

    publisher = getattr(BUILD_PROOF, "publish_pair", None) or getattr(
        BUILD_PROOF, "_publish_pair", None
    )
    assert callable(publisher), "build_proof must expose publish_pair or _publish_pair"

    real_replace = os.replace

    def fail_on_second_staged_publish(source, target) -> None:
        if Path(source) == guide_staged and Path(target) == guide_final:
            raise OSError("injected second publish failure")
        real_replace(source, target)

    monkeypatch.setattr(BUILD_PROOF.os, "replace", fail_on_second_staged_publish)
    with pytest.raises(OSError, match="injected second publish failure"):
        publisher(
            (album_staged, album_final),
            (guide_staged, guide_final),
        )

    assert album_final.read_bytes() == b"previous album"
    assert guide_final.read_bytes() == b"previous guide"


@pytest.mark.parametrize(
    ("filename", "prefix", "pages"),
    [
        ("puer-album-proof.pdf", "A", 208),
        ("puer-guide-proof.pdf", "G", 48),
    ],
)
def test_page_ids_are_exact_and_editorial_markers_are_hidden(
    filename: str,
    prefix: str,
    pages: int,
) -> None:
    reader = PdfReader(OUTPUT / filename)
    assert len(reader.pages) == pages
    for number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        expected_id = f"{prefix}-P{number:03d}"
        assert VISIBLE_PAGE_ID_RE.findall(text) == [expected_id]
        assert "<!--" not in text
        assert "-->" not in text
        assert "claim:" not in text.lower()
        assert "page:" not in text.lower()


def test_key_claim_source_mappings_are_visible_in_extracted_proof_text() -> None:
    claim_records = {
        item["id"]: item
        for item in json.loads((BOOK / "data/claims.json").read_text(encoding="utf-8"))
    }
    required_claims = [
        "hist-early-tea-evidence",
        "hist-warring-states-remains",
        "hist-qing-puer-administration",
        "hist-zhao-six-mountains",
        "prod-shou-chronology-disagreement",
        "medical-human-efficacy-is-extract-evidence",
        "medical-mycotoxin-evidence-limited",
    ]
    texts = []
    for filename in ("puer-album-proof.pdf", "puer-guide-proof.pdf"):
        texts.extend((page.extract_text() or "") for page in PdfReader(OUTPUT / filename).pages)

    for claim_id in required_claims:
        pages = [text for text in texts if f"Тезис {claim_id}" in text]
        assert pages, f"claim mapping is not visible: {claim_id}"
        joined = "\n".join(pages)
        for source_id in claim_records[claim_id]["sourceIds"]:
            assert source_id in joined, f"source mapping is not visible: {claim_id}/{source_id}"


@pytest.mark.parametrize(
    ("filename", "folder"),
    [
        ("puer-album-proof.pdf", "album"),
        ("puer-guide-proof.pdf", "guide"),
    ],
)
def test_every_manuscript_claim_has_one_same_page_source_mapping(
    filename: str,
    folder: str,
) -> None:
    claim_records = {
        item["id"]: item
        for item in json.loads((BOOK / "data/claims.json").read_text(encoding="utf-8"))
    }
    manuscript = BUILD_PROOF.manuscript_pages(folder)
    reader = PdfReader(OUTPUT / filename)
    for page in reader.pages:
        text = page.extract_text() or ""
        page_ids = VISIBLE_PAGE_ID_RE.findall(text)
        assert len(page_ids) == 1
        page_id = page_ids[0]
        body = manuscript[page_id]
        claim_ids = list(dict.fromkeys(BUILD_PROOF.CLAIM_RE.findall(body)))
        for claim_id in claim_ids:
            assert text.count(f"Тезис {claim_id} →") == 1, f"{page_id}/{claim_id}"
            for source_id in claim_records[claim_id]["sourceIds"]:
                assert source_id in text, f"{page_id}/{claim_id}/{source_id}"


def test_album_page_146_has_no_standalone_diagnostics_orphan() -> None:
    text = PdfReader(OUTPUT / "puer-album-proof.pdf").pages[145].extract_text() or ""
    assert not re.search(r"(?m)^\s*диагностики\.\s*$", text, flags=re.IGNORECASE)


@pytest.mark.parametrize(
    "filename",
    ["puer-album-proof.pdf", "puer-guide-proof.pdf"],
)
def test_every_selected_font_is_embedded(filename: str) -> None:
    reader = PdfReader(OUTPUT / filename)
    observed_fonts: set[str] = set()
    for page_number, page in enumerate(reader.pages, start=1):
        resources = resolved(page["/Resources"])
        fonts = resolved(resources.get("/Font", {}))
        for font_name in selected_fonts(page, reader):
            observed_fonts.add(font_name)
            assert font_name in fonts, f"{filename} page {page_number}: missing {font_name}"
            files = embedded_font_files(fonts[font_name])
            assert files, f"{filename} page {page_number}: {font_name} is not embedded"
            assert all(file.get_data() for file in files)
    assert observed_fonts, f"{filename}: no selected fonts found"
