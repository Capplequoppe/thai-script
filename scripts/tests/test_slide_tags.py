"""Every `teaches:` slug in a lesson names something that exists.

A slug is the one part of a lesson nothing else checks. A misspelt heading is
read by a person, a bad `recording:` path is refused by the parser, a rejected
phrase is caught by the originality check — but `teaches: ko-kia` parses
cleanly, builds cleanly, ships, and shows up as a story viewer that opens on
nothing. The learner sees an empty panel where their letter's story should be
and has no way to know whether the slide is missing or the tag is.

So the slugs are checked against the four tables they are drawn from, and the
lessons are checked for tagging the letters they say they teach.

    uv run --project scripts/tests pytest scripts/tests/test_slide_tags.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from lesson_deck.script_parser import parse_script  # noqa: E402

LESSONS = REPO_ROOT / "content" / "lessons"
DATA = REPO_ROOT / "src" / "domain" / "script" / "data"
SYMBOLS_TS = DATA / "symbols.ts"


def kebab(name: str) -> str:
    return re.sub(r"\s+", "-", name.strip())


def consonant_slugs() -> set[str]:
    scenes = json.loads((DATA / "consonant-scenes.json").read_text(encoding="utf-8"))
    return {scene["id"] for scene in scenes}


def scene_slugs() -> set[str]:
    scenes = json.loads((DATA / "palace-scenes.json").read_text(encoding="utf-8"))
    return {scene["id"] for scene in scenes}


def vowel_slugs() -> set[str]:
    """Vowel names, kebab-cased, read out of the `vowels` table.

    Scoped to that table rather than matched over the whole file: `name:` is
    a field on consonants and tone marks too, and a slug pool that quietly
    included every consonant's Thai name would stop catching the typos this
    exists for.
    """
    source = SYMBOLS_TS.read_text(encoding="utf-8")
    start = source.index("const vowels: ThaiVowel[] = [")
    end = source.index("\n];", start)
    block = source[start:end]
    return {kebab(m.group(1)) for m in re.finditer(r'name: "([^"]+)"', block)}


def rule_slugs() -> set[str]:
    """Spelling-rule ids as declared, plus `{class}-{mark}` for the marks.

    The mark ids are built the same way `markRuleId` builds them in
    `memoryPalace.ts` — assembled rather than listed, so a mark renamed in
    `symbols.ts` moves this pool with it.
    """
    source = SYMBOLS_TS.read_text(encoding="utf-8")

    start = source.index("export const toneRules: ToneRule[] = [")
    end = source.index("\n];", start)
    slugs = set(re.findall(r'id: "([^"]+)"', source[start:end]))

    start = source.index("export const toneMarkRules: ToneMarkRule[] = [")
    end = source.index("\n];", start)
    block = source[start:end]
    for entry in re.finditer(
        r'toneMarkName: "([^"]+)",\s*consonantClass: ThaiSymbolClass\.(\w+)',
        block,
    ):
        mark, class_name = entry.group(1), entry.group(2).lower()
        slugs.add(f"{class_name}-{kebab(mark)}")
    return slugs


@pytest.fixture(scope="module")
def known() -> dict[str, set[str]]:
    return {
        "consonant": consonant_slugs(),
        "vowel": vowel_slugs(),
        "rule": rule_slugs(),
        "scene": scene_slugs(),
    }


def tagged_slides(path: Path) -> list[tuple[str, list[str]]]:
    """Each tagged slide's id and its slugs, as the deck builder splits them."""
    script = parse_script(path)
    out = []
    for slide in script.slides:
        raw = slide.fields.get("teaches")
        if not raw:
            continue
        slugs = [part.strip() for part in raw.split(",")]
        out.append((slide.id, [slug for slug in slugs if slug]))
    return out


LESSON_PATHS = sorted(LESSONS.glob("*.md"))


@pytest.mark.parametrize("path", LESSON_PATHS, ids=lambda p: p.stem)
def test_every_slug_names_something_that_exists(path: Path, known) -> None:
    every = set().union(*known.values())
    unknown = [
        (slide_id, slug)
        for slide_id, slugs in tagged_slides(path)
        for slug in slugs
        if slug not in every
    ]
    assert not unknown, (
        f"{path.name}: slugs naming nothing — "
        + ", ".join(f"{slide}:{slug!r}" for slide, slug in unknown)
    )


@pytest.mark.parametrize("path", LESSON_PATHS, ids=lambda p: p.stem)
def test_no_slide_is_tagged_with_the_same_thing_twice(path: Path) -> None:
    repeated = [
        (slide_id, slugs)
        for slide_id, slugs in tagged_slides(path)
        if len(set(slugs)) != len(slugs)
    ]
    assert not repeated, f"{path.name}: duplicate slugs on {repeated}"


def test_the_course_tags_most_of_its_consonants(known) -> None:
    """A letter with no tagged slide has no story to open, anywhere.

    Not all forty-four: `ฃ` and `ฅ` are obsolete and may be met without being
    taught, and the threshold is deliberately below the total so this reports
    a collapse rather than bickering over two letters. What it catches is a
    tagging pass that silently covered half the alphabet.
    """
    tagged: set[str] = set()
    for path in LESSON_PATHS:
        for _, slugs in tagged_slides(path):
            tagged.update(slugs)

    consonants = known["consonant"]
    covered = consonants & tagged
    missing = sorted(consonants - tagged)
    assert len(covered) >= len(consonants) - 4, (
        f"only {len(covered)} of {len(consonants)} consonants have a tagged "
        f"slide; missing {missing}"
    )
