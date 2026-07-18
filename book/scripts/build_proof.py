from __future__ import annotations

import argparse
import html
import json
import os
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph


BOOK = Path(__file__).resolve().parents[1]
REPO = BOOK.parent
MM = 72 / 25.4
PAGE_RE = re.compile(r"<!--\s*page:([AG]-P\d{3})\s*-->")
CLAIM_RE = re.compile(r"<!--\s*claim:[a-z0-9-]+\s*-->")
COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
HAN_RE = re.compile(r"([\u3400-\u9fff]+)")
LINK_RE = re.compile(r"\[([^]]+)]\([^)]*\)")

PAPER = HexColor("#E9DECA")
FOREST = HexColor("#253C32")
CLAY = HexColor("#91432D")
COPPER = HexColor("#B88A58")
INK = HexColor("#211A16")
PROOF_SUBJECT = "Editorial proof for review only - not print-ready and not PDF/X."
PROOF_METADATA = {
    "/Title": "Пуэр. Живая гора — editorial proof",
    "/Author": "Пуэр. Живая гора editorial project",
    "/Subject": PROOF_SUBJECT,
    "/Creator": "puer-book-tools deterministic editorial proof builder",
    "/Producer": "ReportLab + pypdf — editorial proof",
    "/PuerProofStatus": "editorial-proof",
    "/PuerPrintReadiness": "not-print-ready",
    "/PuerPdfStandard": "not-pdf-x",
}
ALLOWED_PROOF_PREVIEW_IDS = {
    "illustration-cover-living-mountain",
    "illustration-shennong-gate",
    "illustration-zhuge-liang-legend",
}


def load_json(relative: str) -> Any:
    return json.loads((BOOK / relative).read_text(encoding="utf-8"))


def register_fonts() -> None:
    font_dir = BOOK / "assets/fonts/files"
    fonts = {
        "Cormorant": "Cormorant-Regular.ttf",
        "Literata": "Literata-Regular.ttf",
        "Manrope": "Manrope-Regular.ttf",
        "NotoSerifSC": "NotoSerifSC-Regular.ttf",
    }
    missing: list[Path] = []
    for name, filename in fonts.items():
        path = font_dir / filename
        if not path.is_file():
            missing.append(path)
            continue
        pdfmetrics.registerFont(TTFont(name, str(path)))
    if missing:
        paths = "\n".join(f"- {path}" for path in missing)
        raise FileNotFoundError(
            "editorial proof fonts are local licensed inputs and are missing:\n"
            f"{paths}\nSee book/assets/fonts/LICENSES.md."
        )


def manuscript_pages(folder: str) -> dict[str, str]:
    pages: dict[str, str] = {}
    manuscript_dir = BOOK / "manuscript" / folder
    for path in sorted(manuscript_dir.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        matches = list(PAGE_RE.finditer(text))
        for index, match in enumerate(matches):
            page_id = match.group(1)
            if page_id in pages:
                raise ValueError(f"duplicate manuscript page: {page_id}")
            end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            pages[page_id] = text[match.end() : end].strip()
    return pages


def paragraph_markup(markdown: str) -> str:
    text = CLAIM_RE.sub("", markdown)
    text = COMMENT_RE.sub("", text)
    text = LINK_RE.sub(r"\1", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.M)
    text = re.sub(r"^[-*]\s+", "• ", text, flags=re.M)
    text = re.sub(r"^\d+[.)]\s+", "• ", text, flags=re.M)
    text = text.replace("**", "").replace("__", "")
    text = re.sub(r"(?<!\w)[*_](?=\S)|(?<=\S)[*_](?!\w)", "", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    escaped = html.escape(text.strip())
    escaped = HAN_RE.sub(r'<font name="NotoSerifSC">\1</font>', escaped)
    return re.sub(r"\n{2,}", "<br/><br/>", escaped).replace("\n", "<br/>")


def preview_path(asset: dict[str, Any]) -> Path | None:
    if (
        asset.get("id") not in ALLOWED_PROOF_PREVIEW_IDS
        or asset.get("kind") != "illustration"
        or asset.get("status") != "preview"
        or asset.get("rights") != "owned"
    ):
        return None
    rights_record = asset.get("licenseFile")
    if not isinstance(rights_record, str) or not (REPO / rights_record).is_file():
        return None
    prefix = f"{asset['id']}--preview-v"
    preview_dir = BOOK / "assets/previews"
    candidates = sorted(
        path
        for path in preview_dir.iterdir()
        if path.is_file()
        and path.name.startswith(prefix)
        and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    )
    return candidates[-1] if candidates else None


def crop_marks(canvas: Canvas, width: float, height: float, bleed: float) -> None:
    canvas.saveState()
    canvas.setStrokeColor(INK)
    canvas.setLineWidth(0.25)
    trim_x = trim_y = bleed
    trim_w, trim_h = width - 2 * bleed, height - 2 * bleed
    mark, gap = 5 * MM, 1.5 * MM
    for x in (trim_x, trim_x + trim_w):
        canvas.line(x, trim_y - gap, x, max(0, trim_y - mark))
        canvas.line(x, trim_y + trim_h + gap, x, min(height, trim_y + trim_h + mark))
    for y in (trim_y, trim_y + trim_h):
        canvas.line(trim_x - gap, y, max(0, trim_x - mark), y)
        canvas.line(trim_x + trim_w + gap, y, min(width, trim_x + trim_w + mark), y)
    canvas.restoreState()


def draw_preview_image(
    canvas: Canvas,
    path: Path,
    x: float,
    y: float,
    width: float,
    height: float,
) -> None:
    image = ImageReader(str(path))
    source_w, source_h = image.getSize()
    scale = min(width / source_w, height / source_h)
    draw_w, draw_h = source_w * scale, source_h * scale
    draw_x = x + (width - draw_w) / 2
    draw_y = y + (height - draw_h) / 2
    canvas.drawImage(
        image,
        draw_x,
        draw_y,
        draw_w,
        draw_h,
        preserveAspectRatio=True,
        mask="auto",
    )


def draw_placeholder_card(
    canvas: Canvas,
    x: float,
    y: float,
    width: float,
    height: float,
    *,
    title: str,
    detail: str,
    dark: bool,
) -> None:
    canvas.saveState()
    canvas.setFillColor(INK if dark else PAPER)
    canvas.setStrokeColor(COPPER)
    canvas.setLineWidth(1.1)
    canvas.roundRect(x, y, width, height, 5 * MM, fill=1, stroke=1)
    canvas.setFillColor(COPPER)
    canvas.rect(x, y + height - 9 * MM, width, 9 * MM, fill=1, stroke=0)
    canvas.setFillColor(INK)
    canvas.setFont("Manrope", 7.2)
    canvas.drawString(x + 4 * MM, y + height - 6 * MM, "UNRESOLVED VISUAL · EDITORIAL PLACEHOLDER")
    title_style = ParagraphStyle(
        "placeholder-title",
        fontName="Cormorant",
        fontSize=15,
        leading=17,
        textColor=white if dark else INK,
    )
    detail_style = ParagraphStyle(
        "placeholder-detail",
        fontName="Manrope",
        fontSize=7.2,
        leading=9.2,
        textColor=PAPER if dark else CLAY,
    )
    title_p = Paragraph(paragraph_markup(title), title_style)
    detail_p = Paragraph(paragraph_markup(detail), detail_style)
    title_h = title_p.wrap(width - 8 * MM, height - 18 * MM)[1]
    title_p.drawOn(canvas, x + 4 * MM, y + height - 15 * MM - title_h)
    detail_h = detail_p.wrap(width - 8 * MM, max(8 * MM, height - 25 * MM - title_h))[1]
    detail_p.drawOn(canvas, x + 4 * MM, y + 4 * MM)
    canvas.restoreState()


def draw_visual(
    canvas: Canvas,
    page: dict[str, Any],
    assets: dict[str, dict[str, Any]],
    x: float,
    y: float,
    width: float,
    height: float,
    *,
    dark: bool,
) -> str:
    asset_ids = page.get("assetIds", [])
    if asset_ids:
        asset = assets[asset_ids[0]]
        preview = preview_path(asset)
        if preview is not None:
            canvas.saveState()
            canvas.setFillColor(PAPER)
            canvas.setStrokeColor(COPPER)
            canvas.roundRect(x, y, width, height, 4 * MM, fill=1, stroke=1)
            draw_preview_image(canvas, preview, x + 2 * MM, y + 2 * MM, width - 4 * MM, height - 4 * MM)
            canvas.setFillColor(INK)
            canvas.setFillAlpha(0.84)
            canvas.rect(x, y, width, 10 * MM, fill=1, stroke=0)
            canvas.setFillAlpha(1)
            canvas.setFillColor(white)
            canvas.setFont("Manrope", 7.2)
            canvas.drawString(
                x + 4 * MM,
                y + 3.5 * MM,
                f"PREVIEW · NOT PRINT-READY · {asset['id']}",
            )
            canvas.restoreState()
            return "preview"
        draw_placeholder_card(
            canvas,
            x,
            y,
            width,
            height,
            title=asset.get("title") or asset["id"],
            detail=(
                f"{asset['id']} · status: {asset.get('status', 'unknown')} · "
                f"rights: {asset.get('rights', 'unknown')}. "
                "В редакционной пробе показано место материала; исходник не используется."
            ),
            dark=dark,
        )
        return "placeholder"
    placeholder = page.get("visualPlaceholder")
    if placeholder:
        draw_placeholder_card(
            canvas,
            x,
            y,
            width,
            height,
            title=f"{placeholder.get('kind', 'visual')} · commission brief",
            detail=placeholder.get("brief", "Нужен визуальный материал."),
            dark=dark,
        )
        return "placeholder"
    return "none"


def body_fragments(
    markup: str,
    width: float,
    height: float,
    columns: int,
    font_size: float,
    color,
) -> list[tuple[Paragraph, float, float]] | None:
    gap = 7 * MM if columns > 1 else 0
    column_w = (width - gap * (columns - 1)) / columns
    style = ParagraphStyle(
        "body",
        fontName="Literata",
        fontSize=font_size,
        leading=font_size * 1.38,
        textColor=color,
        alignment=TA_LEFT,
        allowWidows=1,
        allowOrphans=1,
    )
    remaining: Paragraph | None = Paragraph(markup or " ", style)
    result: list[tuple[Paragraph, float, float]] = []
    for column in range(columns):
        if remaining is None:
            break
        _, needed = remaining.wrap(column_w, height)
        if needed <= height:
            result.append((remaining, column * (column_w + gap), needed))
            remaining = None
            break
        parts = remaining.split(column_w, height)
        if len(parts) < 2:
            return None
        first = parts[0]
        first_h = first.wrap(column_w, height)[1]
        result.append((first, column * (column_w + gap), first_h))
        remaining = parts[1]
    return result if remaining is None else None


def draw_body(
    canvas: Canvas,
    page_id: str,
    body: str,
    x: float,
    y: float,
    width: float,
    height: float,
    *,
    columns: int,
    color,
) -> float:
    markup = paragraph_markup(body)
    chosen: tuple[float, list[tuple[Paragraph, float, float]]] | None = None
    for font_size in (9.5, 9.0, 8.5, 8.0, 7.5, 7.0, 6.5):
        fragments = body_fragments(markup, width, height, columns, font_size, color)
        if fragments is not None:
            chosen = (font_size, fragments)
            break
    if chosen is None:
        raise ValueError(f"text overflow on {page_id} at the documented 6.5 pt proof minimum")
    font_size, fragments = chosen
    for paragraph, offset_x, needed_h in fragments:
        paragraph.drawOn(canvas, x + offset_x, y + height - needed_h)
    return font_size


def draw_page(
    canvas: Canvas,
    page: dict[str, Any],
    body: str,
    assets: dict[str, dict[str, Any]],
    size: tuple[float, float],
    bleed: float,
    *,
    kind: str,
    reviewer_marks: bool,
) -> None:
    width, height = size
    chapter_gate = page["template"] == "chapter-gate"
    canvas.setFillColor(FOREST if chapter_gate else PAPER)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)

    inset = bleed + (13 if kind == "album" else 10) * MM
    safe_width = width - 2 * inset
    safe_height = height - 2 * inset
    title_color = white if chapter_gate else CLAY
    body_color = white if chapter_gate else INK

    canvas.setStrokeColor(COPPER)
    canvas.setLineWidth(0.7)
    canvas.line(inset, height - inset + 3 * MM, width - inset, height - inset + 3 * MM)

    title_style = ParagraphStyle(
        "page-title",
        fontName="Cormorant",
        fontSize=24 if kind == "album" else 18,
        leading=26 if kind == "album" else 20,
        textColor=title_color,
    )
    title = Paragraph(paragraph_markup(page.get("spreadTitle") or page["id"]), title_style)
    title_limit = 24 * MM if kind == "album" else 20 * MM
    title_h = title.wrap(safe_width, title_limit)[1]
    if title_h > title_limit:
        raise ValueError(f"title overflow on {page['id']}")
    title_y = height - inset - title_h
    title.drawOn(canvas, inset, title_y)

    role_style = ParagraphStyle(
        "page-role",
        fontName="Manrope",
        fontSize=7.2,
        leading=9,
        textColor=COPPER if chapter_gate else CLAY,
    )
    role = Paragraph(paragraph_markup(page.get("role", "")), role_style)
    role_h = role.wrap(safe_width, 14 * MM)[1]
    role_y = title_y - 2 * MM - role_h
    role.drawOn(canvas, inset, role_y)

    footer_y = bleed + 5 * MM
    content_bottom = footer_y + 8 * MM
    content_top = role_y - 5 * MM
    content_height = content_top - content_bottom
    has_visual = bool(page.get("assetIds") or page.get("visualPlaceholder"))

    if has_visual:
        visual_h = min(content_height * (0.43 if kind == "album" else 0.35), 92 * MM)
        visual_y = content_top - visual_h
        draw_visual(
            canvas,
            page,
            assets,
            inset,
            visual_y,
            safe_width,
            visual_h,
            dark=chapter_gate,
        )
        body_top = visual_y - 5 * MM
        body_h = body_top - content_bottom
    else:
        body_top = content_top
        body_h = content_height

    columns = 2 if kind == "album" and not chapter_gate else 1
    draw_body(
        canvas,
        page["id"],
        body,
        inset,
        content_bottom,
        safe_width,
        body_h,
        columns=columns,
        color=body_color,
    )

    canvas.setFillColor(COPPER if chapter_gate else CLAY)
    canvas.setFont("Manrope", 6.8)
    canvas.drawString(inset, footer_y, "EDITORIAL PROOF · NOT PRINT-READY · NOT PDF/X")
    canvas.drawRightString(width - inset, footer_y, f"{page['id']} · {page['number']}")
    canvas.bookmarkPage(page["id"])
    if reviewer_marks:
        crop_marks(canvas, width, height, bleed)
    canvas.showPage()


def set_page_boxes(source: Path, target: Path, trim_width_mm: int, trim_height_mm: int, bleed_mm: int) -> None:
    reader = PdfReader(source)
    writer = PdfWriter()
    bleed = bleed_mm * MM
    trim = RectangleObject(
        [bleed, bleed, bleed + trim_width_mm * MM, bleed + trim_height_mm * MM]
    )
    for page in reader.pages:
        page.trimbox = trim
        page.bleedbox = page.mediabox
        writer.add_page(page)
    writer.add_metadata(PROOF_METADATA)
    staged = target.with_name(f".{target.name}.staged")
    with staged.open("wb") as stream:
        writer.write(stream)
    os.replace(staged, target)


def publish_pair(*pairs: tuple[Path, Path]) -> None:
    """Publish staged PDFs together and restore both previous files on failure."""
    backups: list[tuple[Path, Path, bool]] = []
    published: list[Path] = []
    try:
        for _, final in pairs:
            backup = final.with_name(f".{final.name}.pair-backup")
            backup.unlink(missing_ok=True)
            existed = final.is_file()
            if existed:
                os.replace(final, backup)
            backups.append((backup, final, existed))
        for staged, final in pairs:
            os.replace(staged, final)
            published.append(final)
    except Exception:
        for final in published:
            final.unlink(missing_ok=True)
        for backup, final, existed in reversed(backups):
            if existed and backup.is_file():
                os.replace(backup, final)
            elif not existed:
                final.unlink(missing_ok=True)
        raise
    else:
        for backup, _, _ in backups:
            backup.unlink(missing_ok=True)


def build(
    kind: str,
    flatplan_name: str,
    manuscript_folder: str,
    output_name: str,
    *,
    reviewer_marks: bool,
) -> Path:
    publication = load_json("config/publication.json")[kind]
    flatplan = load_json(f"flatplan/{flatplan_name}")
    pages = manuscript_pages(manuscript_folder)
    assets = {asset["id"]: asset for asset in load_json("data/assets.json")}
    expected_count = publication["pages"]
    if len(flatplan["pages"]) != expected_count:
        raise ValueError(
            f"{kind} flatplan has {len(flatplan['pages'])} pages, expected {expected_count}"
        )
    expected_ids = {page["id"] for page in flatplan["pages"]}
    missing = sorted(expected_ids - pages.keys())
    if missing:
        raise ValueError(f"missing manuscript pages: {', '.join(missing)}")

    bleed_mm = publication["bleedMm"]
    size = (
        (publication["widthMm"] + bleed_mm * 2) * MM,
        (publication["heightMm"] + bleed_mm * 2) * MM,
    )
    output_dir = BOOK / "output/pdf"
    output_dir.mkdir(parents=True, exist_ok=True)
    temporary = output_dir / f".{output_name}.canvas.pdf"
    staged_output = output_dir / f".{output_name}.pair-stage"
    canvas = Canvas(
        str(temporary),
        pagesize=size,
        pageCompression=1,
        invariant=1,
        initialFontName="Manrope",
        initialFontSize=7.2,
        initialLeading=10,
    )
    canvas.setTitle(PROOF_METADATA["/Title"])
    canvas.setAuthor(PROOF_METADATA["/Author"])
    canvas.setSubject(PROOF_SUBJECT)
    canvas.setCreator(PROOF_METADATA["/Creator"])
    for page in flatplan["pages"]:
        draw_page(
            canvas,
            page,
            pages[page["id"]],
            assets,
            size,
            bleed_mm * MM,
            kind=kind,
            reviewer_marks=reviewer_marks,
        )
    canvas.save()
    set_page_boxes(
        temporary,
        staged_output,
        publication["widthMm"],
        publication["heightMm"],
        bleed_mm,
    )
    temporary.unlink()
    return staged_output


def build_all(*, reviewer_marks: bool = False) -> tuple[Path, Path]:
    register_fonts()
    output_dir = BOOK / "output/pdf"
    album_final = output_dir / "puer-album-proof.pdf"
    guide_final = output_dir / "puer-guide-proof.pdf"
    staged: list[Path] = []
    try:
        staged_album = build(
            "album",
            "album.json",
            "album",
            album_final.name,
            reviewer_marks=reviewer_marks,
        )
        staged.append(staged_album)
        staged_guide = build(
            "guide",
            "guide.json",
            "guide",
            guide_final.name,
            reviewer_marks=reviewer_marks,
        )
        staged.append(staged_guide)
        publish_pair((staged_album, album_final), (staged_guide, guide_final))
    except Exception:
        for path in staged:
            path.unlink(missing_ok=True)
        raise
    return album_final, guide_final


def main() -> None:
    parser = argparse.ArgumentParser(description="Build deterministic editorial proof PDFs.")
    parser.add_argument("--reviewer-marks", action="store_true")
    args = parser.parse_args()
    outputs = build_all(reviewer_marks=args.reviewer_marks)
    for output in outputs:
        print(f"editorial proof written: {output}")


if __name__ == "__main__":
    main()
