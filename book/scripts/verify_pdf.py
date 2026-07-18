from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pypdf import PdfReader


BOOK = Path(__file__).resolve().parents[1]
MM = 72 / 25.4
TOLERANCE = 0.5
PAGE_ID_RE = re.compile(r"\b[AG]-P\d{3}\b")
PROOF_METADATA = {
    "/PuerProofStatus": "editorial-proof",
    "/PuerPrintReadiness": "not-print-ready",
    "/PuerPdfStandard": "not-pdf-x",
}


@dataclass
class VerificationReport:
    path: Path
    errors: list[str] = field(default_factory=list)
    notices: list[str] = field(default_factory=list)
    evidence: dict[str, Any] = field(default_factory=dict)


def load(relative: str) -> Any:
    return json.loads((BOOK / relative).read_text(encoding="utf-8"))


def close(actual: float, expected: float) -> bool:
    return abs(actual - expected) < TOLERANCE


def resolved(value):
    return value.get_object() if hasattr(value, "get_object") else value


def font_files(font) -> list:
    font = resolved(font)
    descendants = font.get("/DescendantFonts") if font.get("/Subtype") == "/Type0" else None
    concrete = [resolved(item) for item in resolved(descendants or [font])]
    files = []
    for item in concrete:
        descriptor = item.get("/FontDescriptor")
        if descriptor is None:
            continue
        descriptor = resolved(descriptor)
        for key in ("/FontFile", "/FontFile2", "/FontFile3"):
            if key in descriptor:
                files.append(resolved(descriptor[key]))
    return files


def internal_font_errors(reader: PdfReader, filename: str) -> tuple[list[str], int]:
    errors: list[str] = []
    seen: set[tuple[int, int] | tuple[str, str]] = set()
    embedded_count = 0
    for page_number, page in enumerate(reader.pages, start=1):
        resources = resolved(page.get("/Resources", {}))
        fonts = resolved(resources.get("/Font", {}))
        for resource_name, font_reference in fonts.items():
            reference = getattr(font_reference, "indirect_reference", None)
            identity = (
                (reference.idnum, reference.generation)
                if reference is not None
                else (str(resource_name), str(resolved(font_reference).get("/BaseFont")))
            )
            if identity in seen:
                continue
            seen.add(identity)
            files = font_files(font_reference)
            if not files:
                errors.append(
                    f"{filename}:{page_number}: font {resource_name} is not embedded"
                )
                continue
            if any(not stream.get_data() for stream in files):
                errors.append(
                    f"{filename}:{page_number}: font {resource_name} has an empty font stream"
                )
                continue
            embedded_count += 1
    return errors, embedded_count


def locate_poppler_tool(name: str) -> Path | None:
    direct = shutil.which(name)
    if direct:
        return Path(direct)
    anchor = shutil.which("pdfinfo") or shutil.which("pdftoppm")
    if anchor:
        dependencies = Path(anchor).resolve().parents[2]
        candidate = dependencies / "native/poppler/poppler/bin" / name
        if candidate.is_file():
            return candidate
    return None


def external_font_check(path: Path) -> tuple[list[str], list[str], dict[str, Any]]:
    errors: list[str] = []
    notices: list[str] = []
    evidence: dict[str, Any] = {"pdffonts_available": False}
    tool = locate_poppler_tool("pdffonts")
    if tool is None:
        errors.append("pdffonts unavailable; external font preflight is required")
        return errors, notices, evidence
    evidence["pdffonts_available"] = True
    evidence["pdffonts_path"] = str(tool)
    version = subprocess.run(
        [str(tool), "-v"], check=True, capture_output=True, text=True
    )
    version_text = (version.stderr or version.stdout).splitlines()
    evidence["pdffonts_version"] = version_text[0] if version_text else "unknown"
    result = subprocess.run(
        [str(tool), str(path)], check=True, capture_output=True, text=True
    )
    rows = 0
    for line in result.stdout.splitlines()[2:]:
        columns = re.split(r"\s{2,}", line.strip())
        if len(columns) < 6:
            continue
        rows += 1
        if columns[3].split()[0].lower() != "yes":
            errors.append(f"{path.name}: pdffonts reports nonembedded font {columns[0]}")
    evidence["pdffonts_rows"] = rows
    return errors, notices, evidence


def catalog_has_pdfx_output_intent(catalog) -> bool:
    intents = resolved(resolved(catalog).get("/OutputIntents", []))
    return any(
        str(resolved(intent).get("/S", "")) == "/GTS_PDFX" for intent in intents
    )


def verify(path: Path, kind: str, flatplan_name: str) -> VerificationReport:
    report = VerificationReport(path=path)
    if not path.is_file():
        report.errors.append(f"missing proof PDF: {path}")
        return report
    publication = load("config/publication.json")
    if kind not in publication:
        report.errors.append(f"unknown publication kind: {kind}")
        return report
    config = publication[kind]
    flatplan = load(f"flatplan/{flatplan_name}")
    reader = PdfReader(path)
    expected_pages = config["pages"]
    actual_pages = len(reader.pages)
    report.evidence["pages"] = actual_pages
    if actual_pages != expected_pages:
        report.errors.append(f"{path.name}: pages {actual_pages} != {expected_pages}")
    if len(flatplan.get("pages", [])) != expected_pages:
        report.errors.append(
            f"{flatplan_name}: pages {len(flatplan.get('pages', []))} != {expected_pages}"
        )

    metadata = reader.metadata or {}
    editorial_metadata = all(metadata.get(key) == value for key, value in PROOF_METADATA.items())
    editorial_metadata = editorial_metadata and not any(
        key in metadata for key in ("/GTS_PDFXVersion", "/GTS_PDFXConformance")
    )
    report.evidence["editorial_metadata"] = editorial_metadata
    if not editorial_metadata:
        report.errors.append(f"{path.name}: editorial/not-PDF-X metadata is invalid")
    pdfx_output_intent = catalog_has_pdfx_output_intent(reader.trailer["/Root"])
    report.evidence["pdfx_output_intent"] = pdfx_output_intent
    if pdfx_output_intent:
        report.errors.append(f"{path.name}: catalog contains a PDF/X output intent")

    expected_width = (config["widthMm"] + config["bleedMm"] * 2) * MM
    expected_height = (config["heightMm"] + config["bleedMm"] * 2) * MM
    expected_trim_w = config["widthMm"] * MM
    expected_trim_h = config["heightMm"] * MM
    boxes_verified = 0
    text_pages = 0
    ordered_ids = True
    flatplan_pages = flatplan.get("pages", [])
    for index, page in enumerate(reader.pages):
        page_number = index + 1
        boxes_ok = (
            close(float(page.mediabox.left), 0)
            and close(float(page.mediabox.bottom), 0)
            and close(float(page.mediabox.width), expected_width)
            and close(float(page.mediabox.height), expected_height)
            and close(float(page.trimbox.left), config["bleedMm"] * MM)
            and close(float(page.trimbox.bottom), config["bleedMm"] * MM)
            and close(float(page.trimbox.width), expected_trim_w)
            and close(float(page.trimbox.height), expected_trim_h)
            and tuple(float(value) for value in page.bleedbox)
            == tuple(float(value) for value in page.mediabox)
        )
        if boxes_ok:
            boxes_verified += 1
        else:
            report.errors.append(f"{path.name}:{page_number}: invalid page boxes")
        text = page.extract_text() or ""
        if text.strip():
            text_pages += 1
        else:
            report.errors.append(f"{path.name}:{page_number}: page has no extractable text")
        expected_id = flatplan_pages[index]["id"] if index < len(flatplan_pages) else None
        visible_ids = PAGE_ID_RE.findall(text)
        if expected_id is None or visible_ids != [expected_id]:
            ordered_ids = False
            report.errors.append(
                f"{path.name}:{page_number}: page id {visible_ids!r} != {[expected_id]!r}"
            )
    report.evidence["boxes_verified"] = boxes_verified
    report.evidence["text_pages"] = text_pages
    report.evidence["ordered_page_ids"] = ordered_ids

    font_errors, embedded_count = internal_font_errors(reader, path.name)
    report.errors.extend(font_errors)
    report.evidence["embedded_font_resources"] = embedded_count
    report.evidence["all_fonts_embedded"] = not font_errors
    external_errors, external_notices, external_evidence = external_font_check(path)
    report.errors.extend(external_errors)
    report.notices.extend(external_notices)
    report.evidence.update(external_evidence)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify editorial proof PDFs.")
    parser.add_argument("paths", nargs="*")
    args = parser.parse_args()
    supplied = [Path(value) for value in args.paths]
    paths = supplied or [
        BOOK / "output/pdf/puer-album-proof.pdf",
        BOOK / "output/pdf/puer-guide-proof.pdf",
    ]
    if len(paths) != 2:
        raise SystemExit("pass album and guide proof paths")
    reports = (
        verify(paths[0], "album", "album.json"),
        verify(paths[1], "guide", "guide.json"),
    )
    for report in reports:
        print(json.dumps({"path": str(report.path), **report.evidence}, ensure_ascii=False))
        for notice in report.notices:
            print(f"NOTICE: {notice}")
    errors = [error for report in reports for error in report.errors]
    if errors:
        raise SystemExit("\n".join(errors))
    print("proof PDF verification passed; files are editorial proofs, not PDF/X")


if __name__ == "__main__":
    main()
