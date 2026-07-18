from __future__ import annotations

import argparse
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw


PAGE_NUMBER_RE = re.compile(r"(\d+)(?=\.[^.]+$)")


def natural_key(path: Path) -> tuple:
    return tuple(
        int(part) if part.isdigit() else part.lower()
        for part in re.split(r"(\d+)", path.name)
    )


def page_number(path: Path) -> int:
    match = PAGE_NUMBER_RE.search(path.name)
    if match is None:
        raise ValueError(f"PNG filename has no terminal page number: {path.name}")
    return int(match.group(1))


def validate_page_sequence(files: list[Path]) -> None:
    actual = [page_number(path) for path in files]
    expected = list(range(1, len(files) + 1))
    if actual != expected:
        raise ValueError(
            f"PNG files must form one continuous page sequence 1..{len(files)}; "
            f"found {actual}"
        )


def output_for_range(output: Path, first: int, last: int) -> Path:
    return output.with_name(f"{output.stem}-{first:03d}-{last:03d}{output.suffix}")


def build_one(
    files: list[Path],
    output: Path,
    *,
    columns: int,
    thumb_size: tuple[int, int],
    gap: int,
    label_height: int,
) -> None:
    thumb_w, thumb_h = thumb_size
    rows = math.ceil(len(files) / columns)
    sheet = Image.new(
        "RGB",
        (
            gap + columns * (thumb_w + gap),
            gap + rows * (thumb_h + label_height + gap),
        ),
        "#d9c9b5",
    )
    draw = ImageDraw.Draw(sheet)
    for local_index, file in enumerate(files):
        with Image.open(file) as source:
            page = source.convert("RGB")
            page.thumbnail((thumb_w, thumb_h))
        x = gap + (local_index % columns) * (thumb_w + gap)
        y = gap + (local_index // columns) * (thumb_h + label_height + gap)
        sheet.paste(page, (x + (thumb_w - page.width) // 2, y))
        number = page_number(file)
        draw.text(
            (x, y + thumb_h + 3),
            f"{number:03d} · {file.name}",
            fill="#211a16",
        )
    output.parent.mkdir(parents=True, exist_ok=True)
    save_options = {"quality": 92, "optimize": False, "progressive": False}
    if output.suffix.lower() == ".png":
        save_options = {"optimize": False}
    sheet.save(output, **save_options)


def build(
    folder: Path,
    output: Path,
    *,
    columns: int = 6,
    chunk_size: int | None = None,
    thumb_size: tuple[int, int] = (180, 230),
    gap: int = 12,
    label_height: int = 20,
) -> list[Path]:
    files = sorted(folder.glob("*.png"), key=natural_key)
    if not files:
        raise ValueError(f"no PNG pages in {folder}")
    validate_page_sequence(files)
    if columns < 1:
        raise ValueError("columns must be positive")
    if chunk_size is not None and chunk_size < 1:
        raise ValueError("chunk_size must be positive")
    if chunk_size is None:
        build_one(
            files,
            output,
            columns=columns,
            thumb_size=thumb_size,
            gap=gap,
            label_height=label_height,
        )
        return [output]
    outputs: list[Path] = []
    for start in range(0, len(files), chunk_size):
        chunk = files[start : start + chunk_size]
        destination = output_for_range(
            output, page_number(chunk[0]), page_number(chunk[-1])
        )
        build_one(
            chunk,
            destination,
            columns=columns,
            thumb_size=thumb_size,
            gap=gap,
            label_height=label_height,
        )
        outputs.append(destination)
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser(description="Build natural-order proof contact sheets.")
    parser.add_argument("png_folder", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--columns", type=int, default=6)
    parser.add_argument("--chunk-size", type=int)
    args = parser.parse_args()
    outputs = build(
        args.png_folder,
        args.output,
        columns=args.columns,
        chunk_size=args.chunk_size,
    )
    for output in outputs:
        print(output)


if __name__ == "__main__":
    main()
