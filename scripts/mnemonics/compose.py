"""Composite the caption onto a generated illustration.

Diffusion models cannot spell, and cannot render Thai script at any quality —
so the generator is asked for a clean frame (see `style.NEGATIVE_PROMPT`) and
the words are drawn here, with a real font, where they come out correct every
time. This mirrors what the existing hand-made illustrations do: a headline
in the upper area and a wooden plaque along the bottom carrying
`sound-alike -> thai -> english`.

Every caption mixes scripts — a Latin sound-alike, the Thai word, an English
gloss, an arrow between them, and IPA vowels in the headlines — and no single
installed font covers all of it: `NotoSansThai-Regular.ttf` has no Latin,
`NotoSans-Regular.ttf` has no U+2192. Pillow does no font fallback of its
own, so one font per caption silently renders the rest as tofu boxes.

Fonts are therefore chosen per *character*, by actually reading each face's
cmap, and the text is drawn as runs of consecutive characters that resolved
to the same face. Guessing by Unicode block would get Thai and Latin right
and then quietly lose the arrow, which is exactly the bug this replaced.
"""

from __future__ import annotations

import subprocess
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PLAQUE_FILL = (232, 205, 152)
PLAQUE_EDGE = (150, 106, 54)
PLAQUE_TEXT = (54, 36, 18)
HEADLINE_FILL = (255, 244, 214)
HEADLINE_SHADOW = (60, 34, 10)
HEADLINE_FILL_ON_LIGHT = (48, 28, 8)
HEADLINE_SHADOW_ON_LIGHT = (255, 250, 236)
# Measured over the rendered corpus: 27% of images put a bright watercolour
# wash behind the headline, where cream-on-light is barely legible whatever
# shadow it carries. Above this mean luminance the pairing inverts.
LIGHT_BACKGROUND_LUMA = 170


# Tried in order; the first face covering a character wins, so the house look
# stays consistent and only genuinely missing glyphs fall through.
PREFERRED_FAMILIES = ("Noto Sans", "Noto Sans Thai", "Noto Sans Symbols 2", "DejaVu Sans")
_FALLBACK_METRIC = "Noto Sans"


@lru_cache(maxsize=16)
def _family_path(family: str) -> str:
    result = subprocess.run(
        ["fc-match", "-f", "%{file}", family], capture_output=True, text=True, check=True
    )
    return result.stdout.strip()


@lru_cache(maxsize=1)
def _candidate_paths() -> tuple[str, ...]:
    """Preferred faces first, then everything else fontconfig knows about."""
    preferred = [_family_path(f) for f in PREFERRED_FAMILIES]
    listed = subprocess.run(
        ["fc-list", "--format", "%{file}\n"], capture_output=True, text=True, check=True
    ).stdout.split("\n")
    rest = sorted(
        {p for p in listed if p.endswith((".ttf", ".otf")) and p not in preferred}
    )
    return tuple([p for p in preferred if p] + rest)


@lru_cache(maxsize=512)
def _cmap(path: str) -> frozenset[int]:
    from fontTools.ttLib import TTFont

    try:
        font = TTFont(path, fontNumber=0, lazy=True)
        try:
            return frozenset(font.getBestCmap())
        finally:
            font.close()
    except Exception:
        return frozenset()


@lru_cache(maxsize=4096)
def _path_for(char: str) -> str:
    """The first candidate face whose cmap actually contains `char`."""
    code = ord(char)
    for path in _candidate_paths():
        if code in _cmap(path):
            return path
    return _family_path(_FALLBACK_METRIC)


@lru_cache(maxsize=256)
def _font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def _runs(text: str) -> list[tuple[str, str]]:
    """Split into maximal runs sharing one font file: (substring, font path)."""
    out: list[tuple[str, str]] = []
    for char in text:
        # Whitespace has no glyph worth switching fonts for, and switching on
        # it would fragment runs and break kerning across the gap.
        path = out[-1][1] if (out and char.isspace()) else _path_for(char)
        if out and out[-1][1] == path:
            out[-1] = (out[-1][0] + char, path)
        else:
            out.append((char, path))
    return out


def _measure(draw: ImageDraw.ImageDraw, text: str, size: int) -> float:
    return sum(
        draw.textlength(run, font=_font(path, size)) for run, path in _runs(text)
    )


def _draw_mixed(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    size: int,
    fill: tuple[int, int, int],
) -> None:
    """Draw `text` run by run, advancing x, so every script renders."""
    x, y = xy
    for run, path in _runs(text):
        font = _font(path, size)
        draw.text((x, y), run, font=font, fill=fill)
        x += draw.textlength(run, font=font)


def _fit(
    draw: ImageDraw.ImageDraw,
    text: str,
    max_width: int,
    start: int,
    floor: int = 12,
) -> int:
    """Largest point size at or below `start` whose rendering fits."""
    size = start
    while size > floor:
        if _measure(draw, text, size) <= max_width:
            return size
        size -= 2
    return floor


def compose(
    image: Image.Image,
    *,
    anchor: str,
    thai: str,
    english: str,
    headline: str | None,
) -> Image.Image:
    """Draw the headline and the bottom plaque onto a copy of `image`."""
    canvas = image.convert("RGB").copy()
    draw = ImageDraw.Draw(canvas)
    width, height = canvas.size
    margin = int(width * 0.04)

    if headline:
        size = _fit(draw, headline, width - 2 * margin, int(height * 0.085))
        x, y = margin, margin
        # Pick the pairing from what is actually behind the text, rather than
        # assuming a dark background the illustrations frequently do not have.
        patch = canvas.crop(
            (x, y, min(width, x + int(width * 0.55)), min(height, y + int(size * 1.4)))
        ).convert("L")
        histogram = patch.histogram()
        total = sum(histogram) or 1
        luma = sum(i * n for i, n in enumerate(histogram)) / total
        on_light = luma > LIGHT_BACKGROUND_LUMA
        fill = HEADLINE_FILL_ON_LIGHT if on_light else HEADLINE_FILL
        shadow = HEADLINE_SHADOW_ON_LIGHT if on_light else HEADLINE_SHADOW
        # A plain drop shadow, because the underlying art is unpredictable and
        # light text on a light sky would otherwise vanish.
        for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2), (3, 3)):
            _draw_mixed(draw, (x + dx, y + dy), headline, size, shadow)
        _draw_mixed(draw, (x, y), headline, size, fill)

    caption = f"{anchor}  →  {thai}  →  {english}"
    plaque_h = int(height * 0.135)
    plaque_w = int(width * 0.78)
    left = (width - plaque_w) // 2
    top = height - plaque_h - margin
    box = (left, top, left + plaque_w, top + plaque_h)

    draw.rectangle(box, fill=PLAQUE_FILL, outline=PLAQUE_EDGE, width=max(2, width // 340))
    inset = max(4, width // 200)
    draw.rectangle(
        (box[0] + inset, box[1] + inset, box[2] - inset, box[3] - inset),
        outline=PLAQUE_EDGE,
        width=max(1, width // 700),
    )

    # Shrinking to fit has a floor: a gloss like "polite particle (female,
    # statement)" on one line ends up too small to read at all, which defeats
    # the point of compositing the caption rather than letting the model draw
    # it. Below that floor, break the caption across two lines instead.
    available = plaque_w - 4 * inset
    single = int(plaque_h * 0.46)
    size = _fit(draw, caption, available, single)
    lines = [caption]
    # Measured across the corpus: single-line fits land between 28 and 42px,
    # so a threshold below ~0.85 never fires. 0.85 catches the 17 longest
    # captions — the verbose particle glosses — and leaves the other 419
    # on one line.
    if size < single * 0.85:
        head = f"{anchor}  →  {thai}"
        lines = [head, english]
        size = min(
            _fit(draw, head, available, int(plaque_h * 0.38)),
            _fit(draw, english, available, int(plaque_h * 0.38)),
        )

    ascent, descent = _font(_family_path(_FALLBACK_METRIC), size).getmetrics()
    line_height = ascent + descent
    block = line_height * len(lines)
    y = top + (plaque_h - block) / 2
    for line in lines:
        _draw_mixed(
            draw,
            (left + (plaque_w - _measure(draw, line, size)) / 2, y),
            line,
            size,
            PLAQUE_TEXT,
        )
        y += line_height
    return canvas


def output_path(images_dir: Path, rank: int, thai: str) -> Path:
    """`public/vocabulary/images/` naming, matching the existing files."""
    return images_dir / f"{rank} {thai}.jpg"
