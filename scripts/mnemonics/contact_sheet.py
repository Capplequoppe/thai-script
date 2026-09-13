"""Tile rendered illustrations into contact sheets for review.

Nothing automatic can tell whether an image depicts the action it was asked
for. CLIP scored a render that missed its action entirely higher than one that
got it right, so the score gates malformed output and nothing more — a person
has to look at every picture.

Looking at 430 images one at a time is the reason that would not happen. A
contact sheet puts a batch on one screen with each tile labelled by rank and
word, so a reviewer can scan for the ones that are wrong and name them, and
only those get re-rolled.

    python scripts/mnemonics/contact_sheet.py public/vocabulary/images \
        --out /tmp/sheets --per-sheet 24
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw

from compose import _draw_mixed, _fit  # noqa: F401 — shared font handling

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MNEMONICS = REPO_ROOT / "scripts" / "mnemonics" / "mnemonics.json"

TILE_WIDTH = 384
LABEL_HEIGHT = 26
BACKGROUND = (250, 248, 244)
LABEL_TEXT = (30, 24, 16)


def rank_of(path: Path) -> int:
    """Files are named `<rank> <thai>.jpg`; sort by the number, not the string."""
    match = re.match(r"(\d+)\s", path.name)
    return int(match.group(1)) if match else 1 << 30


def build(paths: list[Path], labels: dict[int, str], columns: int) -> Image.Image:
    tile_height = round(TILE_WIDTH * 683 / 1024)
    rows = (len(paths) + columns - 1) // columns
    sheet = Image.new(
        "RGB",
        (columns * TILE_WIDTH, rows * (tile_height + LABEL_HEIGHT)),
        BACKGROUND,
    )
    draw = ImageDraw.Draw(sheet)

    for index, path in enumerate(paths):
        x = (index % columns) * TILE_WIDTH
        y = (index // columns) * (tile_height + LABEL_HEIGHT)
        with Image.open(path) as image:
            sheet.paste(image.convert("RGB").resize((TILE_WIDTH, tile_height)), (x, y))
        rank = rank_of(path)
        label = f"{rank}  {labels.get(rank, path.stem)}"
        size = _fit(draw, label, TILE_WIDTH - 12, LABEL_HEIGHT - 8)
        _draw_mixed(draw, (x + 6, y + tile_height + 3), label, size, LABEL_TEXT)
    return sheet


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", type=Path, help="directory of rendered .jpg files")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--per-sheet", type=int, default=24)
    parser.add_argument("--columns", type=int, default=4)
    parser.add_argument(
        "--ranks", help="comma-separated ranks to include; default every image found"
    )
    args = parser.parse_args()

    entries = json.loads(MNEMONICS.read_text(encoding="utf-8"))["entries"]
    labels = {e["rank"]: f"{e['thai']} {e['english']}"[:34] for e in entries}

    paths = sorted(args.images.glob("*.jpg"), key=rank_of)
    if args.ranks:
        wanted = {int(r) for r in args.ranks.split(",")}
        paths = [p for p in paths if rank_of(p) in wanted]
    if not paths:
        print(f"no images in {args.images}")
        return 1

    args.out.mkdir(parents=True, exist_ok=True)
    written = []
    for start in range(0, len(paths), args.per_sheet):
        batch = paths[start : start + args.per_sheet]
        sheet = build(batch, labels, args.columns)
        first, last = rank_of(batch[0]), rank_of(batch[-1])
        destination = args.out / f"sheet-{first:04d}-{last:04d}.jpg"
        sheet.save(destination, quality=86, optimize=True)
        written.append((destination, len(batch)))

    for destination, count in written:
        print(f"{destination}  ({count} images)")
    print(f"\n{len(paths)} images across {len(written)} sheets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
