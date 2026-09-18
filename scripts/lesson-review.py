"""A lesson script as one readable document, and back again.

A lesson file is written for the deck pipeline: fields, slide headings, `scene:`
prompts the learner never sees, and narration broken into the clips it will be
cut into. That is the right shape for building and the wrong shape for reading
one through and deciding whether it is any good.

    export   lesson script  ->  a document to read and edit
    apply    the edited document  ->  back into the lesson script

Only the learner-facing text makes the trip: heading, narration, bullets, the
retrieval prompt, and the picture direction. Everything else — slide kinds and
ids, image paths, glyph anchors, the `recording:` a line is pinned to, the
comment block at the top — stays in the lesson file and is never rewritten, so
an edit cannot quietly detach a clip from its file or renumber a slide.

`apply` is deliberately narrow. It matches slides by id, refuses anything it
does not recognise, and re-parses the result before writing, so a malformed
edit fails loudly here rather than three steps later in a build.

    uv run --project scripts/deck-env python scripts/lesson-review.py \\
        export content/lessons/lesson-01.md
    uv run --project scripts/deck-env python scripts/lesson-review.py \\
        apply review/lesson-01.md
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lesson_deck.script_parser import ScriptError, parse_script  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
REVIEW_DIR = REPO_ROOT / "review"


def shown(path: Path) -> str:
    """A path as a reader would write it, relative to the repository if it can
    be — `relative_to` raises on a path that merely looks relative already."""
    resolved = path.resolve()
    try:
        return str(resolved.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)

#: Fields that travel. Order is the order they are written back in, which is
#: also the order they read best in the document.
SPOKEN = ("narration", "recording")

_SLIDE = re.compile(r"^## \d+\.\s+`(?P<id>[A-Za-z0-9-]+)`")
_FIELD = re.compile(r"^\*\*(?P<name>Heading|Picture|Prompt):\*\*\s*(?P<value>.*)$")
_LINE = re.compile(r"^\[(?P<lang>en|th)(?:\s*→\s*(?P<file>[^\]]+))?\]\s*(?P<text>.*)$")
_BULLET = re.compile(r"^-\s+(?P<text>.*)$")


# --- reading the lesson file ------------------------------------------------


def slides_of(source: str) -> list[dict]:
    """Every slide, as the raw field lines that make it up.

    Deliberately not `parse_script`: that packs narration into clips, merging
    consecutive English lines and re-splitting them at sentence boundaries. A
    document built from packed segments could not be written back to the lines
    the author actually wrote.
    """
    slides: list[dict] = []
    current: dict | None = None
    for number, line in enumerate(source.splitlines(), start=1):
        heading = re.match(r"^## (?P<kind>\w+) (?P<id>[A-Za-z0-9-]+)\s*$", line)
        if heading:
            current = {
                "kind": heading.group("kind"),
                "id": heading.group("id"),
                "lines": [],
                "at": number,
            }
            slides.append(current)
            continue
        if current is not None:
            current["lines"].append(line)
    return slides


def field(slide: dict, name: str) -> str | None:
    for line in slide["lines"]:
        if line.startswith(f"{name}: "):
            return line[len(name) + 2 :]
    return None


def spoken_lines(slide: dict) -> list[tuple[str, str, str | None]]:
    """(language, text, recording path or None), in the order authored."""
    found = []
    for line in slide["lines"]:
        if line.startswith("narration: "):
            lang, _, text = line[len("narration: ") :].partition(" ")
            found.append((lang, text, None))
        elif line.startswith("recording: "):
            rest = line[len("recording: ") :]
            lang, _, remainder = rest.partition(" ")
            text, _, where = remainder.rpartition(" ")
            found.append((lang, text, where))
    return found


def bullets_of(slide: dict) -> list[str]:
    return [
        line[2:] for line in slide["lines"] if line.startswith("- ")
    ]


# --- export -----------------------------------------------------------------


def export(script_path: Path, out_path: Path) -> Path:
    source = script_path.read_text(encoding="utf-8")
    title = next(
        (line[2:] for line in source.splitlines() if line.startswith("# ")),
        script_path.stem,
    )
    slides = slides_of(source)

    out: list[str] = [
        f"# {title}",
        "",
        f"*{shown(script_path)} — {len(slides)} slides*",
        "",
        "Edit anything in this file and it will be written back into the lesson.",
        "",
        "- `[en]` and `[th]` lines are what is spoken. One line is one audio clip.",
        "- `[th → some/file.mp3]` is a line pinned to a recording already in the",
        "  repository; change the words if you like, but leave the arrow and path.",
        "- **Picture:** is direction for the illustrator, never read aloud.",
        "- **Heading:** and the bullets are printed on the slide.",
        "- Slide ids and the `## 1.` numbering are how edits are matched back.",
        "  Everything else is yours. Do not rename or reorder them.",
        "",
        "An `[en]` line must contain no Thai and no romanisation — an English",
        "voice making a Thai sound teaches the wrong target. Describe it, and let",
        "a `[th]` line say it.",
        "",
        "---",
        "",
    ]

    for index, slide in enumerate(slides, start=1):
        out.append(f"## {index}. `{slide['id']}` — {slide['kind']}")
        out.append("")
        for name, key in (("Picture", "scene"), ("Heading", "heading"), ("Prompt", "prompt")):
            value = field(slide, key)
            if value:
                out.append(f"**{name}:** {value}")
                out.append("")
        for lang, text, where in spoken_lines(slide):
            tag = f"[{lang} → {where}]" if where else f"[{lang}]"
            out.append(f"{tag} {text}")
            out.append("")
        bullets = bullets_of(slide)
        if bullets:
            out.append("**On screen:**")
            out.extend(f"- {bullet}" for bullet in bullets)
            out.append("")
        out.append("---")
        out.append("")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(out), encoding="utf-8")
    return out_path


# --- apply ------------------------------------------------------------------


def read_review(path: Path) -> dict[str, dict]:
    """The edited document, as {slide id: the fields it now carries}."""
    edits: dict[str, dict] = {}
    current: dict | None = None
    pending: list[str] | None = None
    pending_tag: tuple[str, str | None] | None = None

    def flush() -> None:
        nonlocal pending, pending_tag
        if current is not None and pending is not None and pending_tag is not None:
            lang, where = pending_tag
            text = " ".join(part.strip() for part in pending if part.strip())
            if text:
                current["spoken"].append((lang, text, where))
        pending, pending_tag = None, None

    for line in path.read_text(encoding="utf-8").splitlines():
        slide = _SLIDE.match(line)
        if slide:
            flush()
            current = {"spoken": [], "bullets": [], "fields": {}}
            edits[slide.group("id")] = current
            continue
        if current is None:
            continue

        named = _FIELD.match(line)
        if named:
            flush()
            current["fields"][named.group("name").lower()] = named.group("value").strip()
            continue

        spoken = _LINE.match(line)
        if spoken:
            flush()
            where = spoken.group("file")
            pending_tag = (spoken.group("lang"), where.strip() if where else None)
            pending = [spoken.group("text")]
            continue

        bullet = _BULLET.match(line)
        if bullet and pending is None:
            current["bullets"].append(bullet.group("text").strip())
            continue

        if line.strip() in ("", "---") or line.startswith("**On screen:**"):
            flush()
            continue
        if pending is not None:
            pending.append(line)
    flush()
    return edits


def rewrite(source: str, edits: dict[str, dict]) -> str:
    """The lesson file with the edited text substituted in, and nothing else."""
    lines = source.splitlines()
    slides = slides_of(source)
    known = {slide["id"] for slide in slides}
    unknown = sorted(set(edits) - known)
    if unknown:
        raise ScriptError(
            "the review names slides the lesson does not have: "
            + ", ".join(unknown)
            + ". Slide ids are how edits are matched back, so a renamed one "
            "cannot be applied."
        )

    # Rebuilt back to front, so earlier slices keep their line numbers.
    for slide in reversed(slides):
        edit = edits.get(slide["id"])
        if edit is None:
            continue
        start = slide["at"]  # first line after the `## kind id` heading
        end = start + len(slide["lines"])

        rebuilt: list[str] = []
        for key, name in (
            ("image", None),
            ("scene", "picture"),
            ("glyph", None),
            ("anchor", None),
            ("gloss", None),
            ("cue", None),
            ("thai", None),
            ("rule", None),
            ("reveal", None),
            ("retrieval", None),
            ("heading", "heading"),
            ("prompt", "prompt"),
        ):
            value = edit["fields"].get(name) if name else None
            if value is None:
                value = field(slide, key)
            if value:
                rebuilt.append(f"{key}: {value}")

        for lang, text, where in edit["spoken"]:
            if where:
                rebuilt.append(f"recording: {lang} {text} {where}")
            else:
                rebuilt.append(f"narration: {lang} {text}")

        rebuilt.extend(f"- {bullet}" for bullet in edit["bullets"])
        rebuilt.append("")
        lines[start:end] = rebuilt

    # Each slide is written with one blank line after it, which on the last
    # slide would add a trailing blank the file did not have. An unedited
    # round trip has to be exactly identity, or applying real edits would
    # smuggle in a change of its own every time.
    return "\n".join(lines).rstrip("\n") + "\n"


def apply(review_path: Path, script_path: Path) -> int:
    source = script_path.read_text(encoding="utf-8")
    edits = read_review(review_path)
    if not edits:
        print(f"error: no slides found in {review_path}", file=sys.stderr)
        return 3

    updated = rewrite(source, edits)
    if updated == source:
        print("no change — the review matches the lesson already")
        return 0

    # Parsed before it is written. A malformed edit should fail here, naming
    # the line, rather than in a build an hour later.
    scratch = script_path.with_suffix(".applying")
    scratch.write_text(updated, encoding="utf-8")
    try:
        parsed = parse_script(scratch)
    except ScriptError as error:
        print(f"error: the edited lesson does not parse: {error}", file=sys.stderr)
        print(f"the attempt is at {scratch} — the lesson is untouched", file=sys.stderr)
        return 4
    scratch.unlink()

    script_path.write_text(updated, encoding="utf-8")
    english = sum(1 for s in parsed.segments if s.language == "en")
    thai = sum(1 for s in parsed.segments if s.language == "th")
    print(f"applied to {shown(script_path)}")
    print(f"  {len(parsed.slides)} slides, {english} English clips, {thai} Thai")
    print("  clips whose words did not change are already rendered and reused")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    out = sub.add_parser("export", help="lesson script -> document to read")
    out.add_argument("script", type=Path)
    out.add_argument("-o", "--out", type=Path)

    back = sub.add_parser("apply", help="edited document -> lesson script")
    back.add_argument("review", type=Path)
    back.add_argument("script", type=Path, nargs="?")

    args = parser.parse_args(argv)

    if args.command == "export":
        out_path = args.out or REVIEW_DIR / args.script.name
        written = export(args.script, out_path)
        print(f"wrote {shown(written)}")
        return 0

    script = args.script or REPO_ROOT / "content" / "lessons" / args.review.name
    if not script.is_file():
        print(f"error: no lesson script at {script}", file=sys.stderr)
        return 2
    return apply(args.review, script)


if __name__ == "__main__":
    raise SystemExit(main())
