from __future__ import annotations

import html
import importlib.util
import json
import os
import re
import sys
from copy import deepcopy
from dataclasses import FrozenInstanceError
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
READER_METADATA = {
    "/PuerProofStatus": "reader-proof",
    "/PuerPrintReadiness": "not-print-ready",
    "/PuerPdfStandard": "not-pdf-x",
}
READER_FOOTER = "READER PROOF · NOT PRINT-READY · NOT PDF/X"
READER_PLACEHOLDER_CAPTION = "Место иллюстрации в читательской пробе"
READER_FILENAMES = (
    "puer-album-reader-proof.pdf",
    "puer-guide-reader-proof.pdf",
)
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
    sys.modules[spec.name] = module
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


def test_proof_policy_exposes_immutable_editorial_and_reader_modes() -> None:
    policies = BUILD_PROOF.PROOF_POLICIES
    assert set(policies) == {"editorial", "reader"}

    editorial = policies["editorial"]
    reader = policies["reader"]
    assert editorial.mode == "editorial"
    assert editorial.output_suffix == "-proof.pdf"
    assert editorial.show_role is True
    assert editorial.show_claim_band is True
    assert editorial.show_placeholder_details is True
    assert editorial.footer == "EDITORIAL PROOF · NOT PRINT-READY · NOT PDF/X"
    assert dict(editorial.metadata) == BUILD_PROOF.PROOF_METADATA

    assert reader.mode == "reader"
    assert reader.output_suffix == "-reader-proof.pdf"
    assert reader.show_role is False
    assert reader.show_claim_band is False
    assert reader.show_placeholder_details is False
    assert reader.footer == READER_FOOTER
    assert reader.placeholder_label == READER_PLACEHOLDER_CAPTION
    assert reader.placeholder_title is None
    assert reader.placeholder_detail is None
    assert reader.preview_label == "PRELIMINARY · NOT PRINT-READY"
    for key, value in READER_METADATA.items():
        assert reader.metadata[key] == value
    assert "reader proof" in reader.metadata["/Title"].lower()
    assert "not print-ready" in reader.metadata["/Title"].lower()
    assert "reader proof" in reader.metadata["/Subject"].lower()
    assert "not print-ready" in reader.metadata["/Subject"].lower()

    with pytest.raises(FrozenInstanceError):
        reader.mode = "editorial"
    with pytest.raises(TypeError):
        reader.metadata["/Title"] = "mutable reader title"
    with pytest.raises(TypeError):
        policies["reader"] = editorial


def test_readme_limits_transaction_recovery_to_the_next_build_of_the_same_mode() -> None:
    readme = (BOOK / "README.md").read_text(encoding="utf-8")

    assert "при следующей сборке того же режима" in readme


def test_reader_unresolved_visual_renders_one_neutral_caption(
    tmp_path: Path,
) -> None:
    BUILD_PROOF.register_fonts()
    output = tmp_path / "reader-placeholder.pdf"
    asset_id = "unit-unresolved-asset"
    canvas = Canvas(str(output), pagesize=(400, 200), invariant=1)
    result = BUILD_PROOF.draw_visual(
        canvas,
        {"assetIds": [asset_id]},
        {
            asset_id: {
                "id": asset_id,
                "kind": "photo",
                "title": "Будущая финальная иллюстрация",
            }
        },
        10,
        10,
        380,
        180,
        dark=False,
        policy=BUILD_PROOF.PROOF_POLICIES["reader"],
    )
    canvas.showPage()
    canvas.save()

    assert result == "placeholder"
    text = " ".join((PdfReader(output).pages[0].extract_text() or "").split())
    assert text == READER_PLACEHOLDER_CAPTION


EVIDENCE_LABELS = (
    "[ИСТОЧНИК]",
    "[РЕТРОСПЕКТИВА]",
    "[ЛЕГЕНДА]",
    "[ГИПОТЕЗА]",
    "[СОВРЕМЕННАЯ ПРОВЕРКА]",
    "[ОТКЛОНЕНО]",
)


def test_reader_projection_preserves_the_six_evidence_labels_on_a_p011() -> None:
    body = BUILD_PROOF.manuscript_pages("album")["A-P011"]
    projected = BUILD_PROOF.PROOF_POLICIES["reader"].project_body("A-P011", body)

    for label in EVIDENCE_LABELS:
        assert projected.count(label) == 1


def test_reader_projection_preserves_ordinary_token_like_prose() -> None:
    body = (
        "Обычный абзац обсуждает commission brief как термин, а claim-id, "
        "source-id, provenance-only и prepared-not-dispatched — как примеры."
    )

    projected = BUILD_PROOF.PROOF_POLICIES["reader"].project_body("A-P050", body)

    assert projected == body


@pytest.mark.parametrize(
    ("page_id", "meaningful_phrases"),
    [
        ("A-P109", ("два маршрута", "пар, ткань, распределение, давление")),
        ("A-P111", ("четыре поля", "форму, поверхность, среду и время осмотра")),
    ],
)
def test_reader_projection_keeps_meaning_without_commission_briefs(
    page_id: str,
    meaningful_phrases: tuple[str, ...],
) -> None:
    body = BUILD_PROOF.manuscript_pages("album")[page_id]
    projected = BUILD_PROOF.PROOF_POLICIES["reader"].project_body(page_id, body)

    assert "commission brief" not in projected.lower()
    for phrase in meaningful_phrases:
        assert phrase in projected


def test_reader_projection_rewrites_a_p208_without_raw_status_or_keys() -> None:
    body = BUILD_PROOF.manuscript_pages("album")["A-P208"]
    projected = BUILD_PROOF.PROOF_POLICIES["reader"].project_body("A-P208", body)

    for forbidden in (
        "prepared-not-dispatched",
        "claim-id",
        "source-id",
        "provenance-only",
        "редакционный proof",
    ):
        assert forbidden not in projected.lower()
    assert "ИИ применялся" in projected
    assert "0 внешних согласований" in projected
    assert "внешняя проверка ещё не получена" in projected
    assert "читательская проба" in projected
    assert "не готова к печати" in projected
    assert "не является PDF/X" in projected


@pytest.mark.parametrize(
    ("source_fragment", "mutated_fragment"),
    [
        ("0 внешних согласований", "2 внешних согласования"),
        ("provenance-only запись", "provenance запись"),
        ("но не печатный PDF/X", "но ещё не печатный PDF/X"),
    ],
)
def test_reader_projection_rejects_drift_in_each_a_p208_source_paragraph(
    source_fragment: str,
    mutated_fragment: str,
) -> None:
    body = BUILD_PROOF.manuscript_pages("album")["A-P208"]
    mutated = body.replace(source_fragment, mutated_fragment)
    assert mutated != body

    with pytest.raises(ValueError, match="reader transform paragraph mismatch on A-P208"):
        BUILD_PROOF.PROOF_POLICIES["reader"].project_body("A-P208", mutated)


def test_build_all_defaults_to_editorial_policy_and_filenames(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    book = tmp_path / "book"
    calls: list[tuple[str, str, object, bool, str]] = []
    published: list[tuple[tuple[tuple[Path, Path], ...], str]] = []
    monkeypatch.setattr(BUILD_PROOF, "BOOK", book)
    monkeypatch.setattr(BUILD_PROOF, "register_fonts", lambda: None)

    def fake_build(
        kind,
        _flatplan,
        _manuscript,
        output_name,
        *,
        reviewer_marks,
        policy,
        run_id,
    ):
        calls.append((kind, output_name, policy, reviewer_marks, run_id))
        return tmp_path / f"{kind}.{run_id}.pair-stage"

    monkeypatch.setattr(BUILD_PROOF, "build", fake_build)
    monkeypatch.setattr(
        BUILD_PROOF,
        "publish_pair",
        lambda *pairs, transaction_id: published.append((pairs, transaction_id)),
    )

    outputs = BUILD_PROOF.build_all()

    editorial = BUILD_PROOF.PROOF_POLICIES["editorial"]
    assert [path.name for path in outputs] == [
        "puer-album-proof.pdf",
        "puer-guide-proof.pdf",
    ]
    assert [(kind, name) for kind, name, _, _, _ in calls] == [
        ("album", "puer-album-proof.pdf"),
        ("guide", "puer-guide-proof.pdf"),
    ]
    assert all(policy is editorial for _, _, policy, _, _ in calls)
    assert all(reviewer_marks is False for _, _, _, reviewer_marks, _ in calls)
    run_ids = {run_id for _, _, _, _, run_id in calls}
    assert len(run_ids) == 1
    assert len(published) == 1
    pairs, transaction_id = published[0]
    assert transaction_id in run_ids
    assert [final.name for _, final in pairs] == [
        "puer-album-proof.pdf",
        "puer-guide-proof.pdf",
    ]


def test_build_all_reader_publishes_transactionally_to_reader_filenames_only(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    book = tmp_path / "book"
    output = book / "output" / "pdf"
    output.mkdir(parents=True)
    editorial_album = output / "puer-album-proof.pdf"
    editorial_guide = output / "puer-guide-proof.pdf"
    editorial_album.write_bytes(b"frozen editorial album")
    editorial_guide.write_bytes(b"frozen editorial guide")
    monkeypatch.setattr(BUILD_PROOF, "BOOK", book)
    monkeypatch.setattr(BUILD_PROOF, "register_fonts", lambda: None)

    def fake_build(
        kind,
        _flatplan,
        _manuscript,
        output_name,
        *,
        reviewer_marks,
        policy,
        run_id,
    ):
        assert reviewer_marks is False
        assert policy is BUILD_PROOF.PROOF_POLICIES["reader"]
        staged = output / f".{output_name}.{run_id}.pair-stage"
        staged.write_bytes(f"reader {kind}".encode())
        return staged

    monkeypatch.setattr(BUILD_PROOF, "build", fake_build)

    outputs = BUILD_PROOF.build_all(mode="reader")

    assert [path.name for path in outputs] == list(READER_FILENAMES)
    assert outputs[0].read_bytes() == b"reader album"
    assert outputs[1].read_bytes() == b"reader guide"
    assert editorial_album.read_bytes() == b"frozen editorial album"
    assert editorial_guide.read_bytes() == b"frozen editorial guide"


@pytest.mark.parametrize("interruption", [KeyboardInterrupt, SystemExit])
def test_build_all_cleans_current_run_artifacts_after_base_exception(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    interruption: type[BaseException],
) -> None:
    book = tmp_path / "book"
    output = book / "output/pdf"
    monkeypatch.setattr(BUILD_PROOF, "BOOK", book)
    monkeypatch.setattr(BUILD_PROOF, "register_fonts", lambda: None)
    observed_artifacts: list[Path] = []

    def interrupted_build(
        kind,
        _flatplan_name,
        _manuscript_subdir,
        output_name,
        *,
        reviewer_marks,
        policy,
        run_id,
    ):
        assert reviewer_marks is False
        assert policy is BUILD_PROOF.PROOF_POLICIES["reader"]
        final = output / output_name
        stage = BUILD_PROOF.run_artifact_path(final, run_id, "pair-stage")
        canvas = BUILD_PROOF.run_artifact_path(final, run_id, "canvas.pdf")
        stage.parent.mkdir(parents=True, exist_ok=True)
        stage.write_bytes(f"staged {kind}".encode())
        canvas.write_bytes(f"canvas {kind}".encode())
        observed_artifacts.extend((stage, canvas))
        if kind == "guide":
            raise interruption("injected build interruption")
        return stage

    monkeypatch.setattr(BUILD_PROOF, "build", interrupted_build)

    with pytest.raises(interruption, match="injected build interruption"):
        BUILD_PROOF.build_all(mode="reader")

    assert len(observed_artifacts) == 4
    assert all(not path.exists() for path in observed_artifacts)


def test_cli_selects_reader_mode_without_enabling_reviewer_marks(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    calls: list[tuple[str, bool]] = []
    monkeypatch.setattr(sys, "argv", ["build_proof.py", "--mode", "reader"])
    monkeypatch.setattr(
        BUILD_PROOF,
        "build_all",
        lambda *, mode, reviewer_marks: (
            calls.append((mode, reviewer_marks))
            or (Path("album-reader.pdf"), Path("guide-reader.pdf"))
        ),
    )

    BUILD_PROOF.main()

    assert calls == [("reader", False)]
    output = capsys.readouterr().out
    assert "reader proof written: album-reader.pdf" in output
    assert "reader proof written: guide-reader.pdf" in output


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


def test_reader_metadata_staging_is_incremental_and_policy_selected(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.pdf"
    target = tmp_path / "reader.pdf"
    canvas = Canvas(str(source), pagesize=(100, 100), invariant=1)
    canvas.drawString(10, 50, "reader-resource-regression")
    canvas.save()
    source_bytes = source.read_bytes()

    BUILD_PROOF.stage_proof_metadata(
        source,
        target,
        BUILD_PROOF.PROOF_POLICIES["reader"],
    )

    assert target.read_bytes().startswith(source_bytes)
    metadata = PdfReader(target).metadata or {}
    for key, value in READER_METADATA.items():
        assert metadata.get(key) == value
    assert "reader proof" in metadata["/Title"].lower()
    assert "not print-ready" in metadata["/Subject"].lower()


def assert_close(actual: float, expected: float, *, label: str) -> None:
    assert abs(actual - expected) < POINT_TOLERANCE, (
        f"{label}: {actual:.3f} pt != {expected:.3f} pt"
    )


def resolved(value):
    return value.get_object() if hasattr(value, "get_object") else value


def registered_assets() -> dict[str, dict]:
    records = json.loads((BOOK / "data" / "assets.json").read_text(encoding="utf-8"))
    return {record["id"]: record for record in records}


def reader_visual_expectations(
    flatplan_name: str,
) -> tuple[set[str], set[str]]:
    assets = registered_assets()
    flatplan = json.loads(
        (BOOK / "flatplan" / flatplan_name).read_text(encoding="utf-8")
    )
    unresolved: set[str] = set()
    previews: set[str] = set()
    for page in flatplan["pages"]:
        asset_ids = page.get("assetIds", [])
        if asset_ids and BUILD_PROOF.preview_path(assets[asset_ids[0]]) is not None:
            previews.add(page["id"])
        elif asset_ids or page.get("visualPlaceholder"):
            unresolved.add(page["id"])
    return unresolved, previews


def normalized_markup_text(markdown: str) -> str:
    markup = BUILD_PROOF.paragraph_markup(markdown)
    without_tags = re.sub(r"<[^>]+>", " ", markup)
    return " ".join(html.unescape(without_tags).split())


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


@pytest.fixture(scope="session")
def reader_proof_paths() -> tuple[Path, Path]:
    paths = BUILD_PROOF.build_all(mode="reader")
    assert tuple(path.name for path in paths) == READER_FILENAMES
    return paths


def assert_reader_proof(
    path: Path,
    *,
    pages: int,
    prefix: str,
    trim_width_mm: int,
    trim_height_mm: int,
    bleed_mm: int = 3,
) -> PdfReader:
    assert path.exists(), f"missing reader proof PDF: {path}"
    reader = PdfReader(path)
    assert len(reader.pages) == pages

    metadata = reader.metadata or {}
    for key, value in READER_METADATA.items():
        assert metadata.get(key) == value
    assert "reader proof" in metadata["/Title"].lower()
    assert "not print-ready" in metadata["/Title"].lower()
    assert "reader proof" in metadata["/Subject"].lower()
    assert "not print-ready" in metadata["/Subject"].lower()
    assert "not pdf/x" in metadata["/Subject"].lower()
    assert "/GTS_PDFXVersion" not in metadata
    assert "/GTS_PDFXConformance" not in metadata

    output_intents = resolved(reader.trailer["/Root"].get("/OutputIntents", []))
    for intent in output_intents:
        intent = resolved(intent)
        assert str(intent.get("/S", "")) != "/GTS_PDFX"

    media_width_mm = trim_width_mm + bleed_mm * 2
    media_height_mm = trim_height_mm + bleed_mm * 2
    observed_fonts: set[str] = set()
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
        resources = resolved(page["/Resources"])
        assert isinstance(resources, DictionaryObject)
        fonts = resolved(resources.get("/Font", {}))
        for font_name in selected_fonts(page, reader):
            observed_fonts.add(font_name)
            assert font_name in fonts, f"{path.name} page {page_number}: missing {font_name}"
            files = embedded_font_files(fonts[font_name])
            assert files, f"{path.name} page {page_number}: {font_name} is not embedded"
            assert all(file.get_data() for file in files)

        text = page.extract_text() or ""
        expected_id = f"{prefix}-P{page_number:03d}"
        assert VISIBLE_PAGE_ID_RE.findall(text) == [expected_id]
        assert READER_FOOTER in text
        assert f"{expected_id} · {page_number}" in text
    assert observed_fonts, f"{path.name}: no selected fonts found"
    return reader


@pytest.mark.parametrize(
    ("index", "pages", "prefix", "trim_width_mm", "trim_height_mm"),
    [
        (0, 208, "A", 240, 300),
        (1, 48, "G", 150, 220),
    ],
)
def test_reader_proof_geometry_metadata_fonts_and_page_order(
    reader_proof_paths: tuple[Path, Path],
    index: int,
    pages: int,
    prefix: str,
    trim_width_mm: int,
    trim_height_mm: int,
) -> None:
    assert_reader_proof(
        reader_proof_paths[index],
        pages=pages,
        prefix=prefix,
        trim_width_mm=trim_width_mm,
        trim_height_mm=trim_height_mm,
    )


def test_reader_proof_hides_editorial_scaffolding_and_uses_reader_labels(
    reader_proof_paths: tuple[Path, Path],
) -> None:
    readers = [PdfReader(path) for path in reader_proof_paths]
    page_texts = [
        page.extract_text() or ""
        for reader in readers
        for page in reader.pages
    ]
    corpus = "\n".join(page_texts)
    lowercase = corpus.lower()
    for forbidden in (
        "claim-id",
        "source-id",
        "provenance-only",
        "prepared-not-dispatched",
        "commission brief",
        "unresolved visual",
        "editorial placeholder",
        "editorial proof · not print-ready · not pdf/x",
        "status:",
        "rights:",
    ):
        assert forbidden not in lowercase
    assert not re.search(r"Тезис\s+[a-z0-9-]+\s+→\s+источники", corpus)

    for asset_id in registered_assets():
        assert asset_id not in corpus

    unresolved_total = 0
    observed_caption_total = 0
    for flatplan_name, reader in zip(("album.json", "guide.json"), readers):
        flatplan = json.loads(
            (BOOK / "flatplan" / flatplan_name).read_text(encoding="utf-8")
        )
        manuscript = BUILD_PROOF.manuscript_pages(flatplan_name.removesuffix(".json"))
        reader_policy = BUILD_PROOF.PROOF_POLICIES["reader"]
        unresolved_ids, preview_ids = reader_visual_expectations(flatplan_name)
        unresolved_total += len(unresolved_ids)
        for page_definition, page in zip(flatplan["pages"], reader.pages):
            role = " ".join(page_definition.get("role", "").split())
            page_text = " ".join((page.extract_text() or "").split())
            if role:
                assert role not in page_text, page_definition["id"]
            caption_count = page_text.count(READER_PLACEHOLDER_CAPTION)
            if page_definition["id"] in unresolved_ids:
                assert caption_count == 1, page_definition["id"]
                observed_caption_total += caption_count
                body_text = normalized_markup_text(
                    reader_policy.project_body(
                        page_definition["id"], manuscript[page_definition["id"]]
                    )
                )
                body_anchor = body_text[:80]
                caption_start = page_text.find(READER_PLACEHOLDER_CAPTION)
                caption_end = caption_start + len(READER_PLACEHOLDER_CAPTION)
                body_start = page_text.find(body_anchor, caption_end)
                assert caption_start >= 0, page_definition["id"]
                assert body_start >= 0, page_definition["id"]
                placeholder_context = page_text[caption_start:body_start]
                assert placeholder_context.count(READER_PLACEHOLDER_CAPTION) == 1
                assert "финальн" not in placeholder_context.lower()
                assert "будущ" not in placeholder_context.lower()
            else:
                assert caption_count == 0, page_definition["id"]
            if page_definition["id"] in preview_ids:
                assert "PRELIMINARY · NOT PRINT-READY" in page_text

    assert unresolved_total == 136
    assert observed_caption_total == unresolved_total
    assert corpus.count(READER_PLACEHOLDER_CAPTION) == unresolved_total
    assert "PRELIMINARY · NOT PRINT-READY" in corpus
    page_011 = " ".join((readers[0].pages[10].extract_text() or "").split())
    for label in EVIDENCE_LABELS:
        assert page_011.count(label) == 1


def test_reader_album_keeps_honest_review_and_ai_boundaries(
    reader_proof_paths: tuple[Path, Path],
) -> None:
    page = PdfReader(reader_proof_paths[0]).pages[207]
    text = " ".join((page.extract_text() or "").split())
    assert "ИИ применялся" in text
    assert "не является внешней экспертной рецензией" in text
    assert "0 внешних согласований" in text
    assert "внешняя проверка ещё не получена" in text
    assert "читательская проба" in text
    assert "не готова к печати" in text
    assert "не является PDF/X" in text


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


def test_run_artifact_paths_are_unique_and_transaction_scoped(tmp_path: Path) -> None:
    final = tmp_path / "album.pdf"

    first = BUILD_PROOF.run_artifact_path(final, "run-a", "pair-stage")
    second = BUILD_PROOF.run_artifact_path(final, "run-b", "pair-stage")
    backup = BUILD_PROOF.run_artifact_path(final, "run-a", "pair-backup")

    assert len({first, second, backup}) == 3
    assert "run-a" in first.name
    assert "run-b" in second.name
    assert first.parent == final.parent


def test_publish_pair_holds_an_exclusive_output_set_lock(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    album_staged = tmp_path / "album.staged.pdf"
    guide_staged = tmp_path / "guide.staged.pdf"
    album_final = tmp_path / "album.pdf"
    guide_final = tmp_path / "guide.pdf"
    album_staged.write_bytes(b"album")
    guide_staged.write_bytes(b"guide")
    lock_operations: list[int] = []
    monkeypatch.setattr(
        BUILD_PROOF.fcntl,
        "flock",
        lambda _descriptor, operation: lock_operations.append(operation),
    )

    BUILD_PROOF.publish_pair(
        (album_staged, album_final),
        (guide_staged, guide_final),
        transaction_id="locked-run",
    )

    assert lock_operations == [BUILD_PROOF.fcntl.LOCK_EX, BUILD_PROOF.fcntl.LOCK_UN]


def test_recovery_rolls_back_an_incomplete_pre_published_transaction(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    album_staged = tmp_path / "album.staged.pdf"
    guide_staged = tmp_path / "guide.staged.pdf"
    album_final = tmp_path / "album.pdf"
    guide_final = tmp_path / "guide.pdf"
    album_staged.write_bytes(b"new album")
    guide_staged.write_bytes(b"new guide")
    album_final.write_bytes(b"old album")
    guide_final.write_bytes(b"old guide")
    real_replace = os.replace

    def crash_during_publish(source, target) -> None:
        if Path(source) == guide_staged and Path(target) == guide_final:
            raise SystemExit("simulated process death")
        real_replace(source, target)

    monkeypatch.setattr(BUILD_PROOF.os, "replace", crash_during_publish)
    with pytest.raises(SystemExit, match="simulated process death"):
        BUILD_PROOF.publish_pair(
            (album_staged, album_final),
            (guide_staged, guide_final),
            transaction_id="pre-published-run",
        )
    monkeypatch.setattr(BUILD_PROOF.os, "replace", real_replace)

    BUILD_PROOF.recover_publish_pair(album_final, guide_final)

    assert album_final.read_bytes() == b"old album"
    assert guide_final.read_bytes() == b"old guide"
    assert not list(tmp_path.glob("*.journal.json"))
    assert not list(tmp_path.glob("*.pair-backup-*"))


def test_recovery_finalizes_a_published_transaction(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    album_staged = tmp_path / "album.staged.pdf"
    guide_staged = tmp_path / "guide.staged.pdf"
    album_final = tmp_path / "album.pdf"
    guide_final = tmp_path / "guide.pdf"
    album_staged.write_bytes(b"new album")
    guide_staged.write_bytes(b"new guide")
    album_final.write_bytes(b"old album")
    guide_final.write_bytes(b"old guide")
    real_cleanup = BUILD_PROOF._cleanup_published_transaction
    monkeypatch.setattr(
        BUILD_PROOF,
        "_cleanup_published_transaction",
        lambda _transaction: (_ for _ in ()).throw(SystemExit("cleanup crash")),
    )

    with pytest.raises(SystemExit, match="cleanup crash"):
        BUILD_PROOF.publish_pair(
            (album_staged, album_final),
            (guide_staged, guide_final),
            transaction_id="published-run",
        )
    monkeypatch.setattr(BUILD_PROOF, "_cleanup_published_transaction", real_cleanup)

    BUILD_PROOF.recover_publish_pair(album_final, guide_final)

    assert album_final.read_bytes() == b"new album"
    assert guide_final.read_bytes() == b"new guide"
    assert not list(tmp_path.glob("*.journal.json"))
    assert not list(tmp_path.glob("*.pair-backup-*"))


def test_build_cleans_run_scoped_canvas_when_metadata_staging_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: list[tuple[Path, Path]] = []
    BUILD_PROOF.register_fonts()

    def fail_metadata(source: Path, target: Path, _policy) -> None:
        captured.append((source, target))
        raise RuntimeError("injected metadata failure")

    monkeypatch.setattr(BUILD_PROOF, "stage_proof_metadata", fail_metadata)
    with pytest.raises(RuntimeError, match="injected metadata failure"):
        BUILD_PROOF.build(
            "guide",
            "guide.json",
            "guide",
            "cleanup-reader-proof.pdf",
            reviewer_marks=False,
            policy=BUILD_PROOF.PROOF_POLICIES["reader"],
            run_id="cleanup-run",
        )

    assert len(captured) == 1
    canvas_path, staged_path = captured[0]
    assert "cleanup-run" in canvas_path.name
    assert "cleanup-run" in staged_path.name
    assert not canvas_path.exists()


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
