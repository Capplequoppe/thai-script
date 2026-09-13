"""Validate agent-authored mnemonic batches and merge them into mnemonics.json.

Five agents writing to one style guide will drift, and nobody is going to read
500 entries by hand. Everything the guide states as a rule is checked here
instead, and a batch that fails is rejected rather than quietly merged.

The tone check is the one that earns its keep: a glyph is only accepted if it
matches a tone the word's syllables actually carry, per `vocabulary.json`.
Inventing a plausible-sounding tone is the single most likely way for an agent
to produce something that reads beautifully and teaches the learner wrong.

    python scripts/mnemonics/merge_authored.py scripts/mnemonics/work/*.json
    python scripts/mnemonics/merge_authored.py --write scripts/mnemonics/work/*.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MNEMONICS = REPO_ROOT / "scripts" / "mnemonics" / "mnemonics.json"
VOCABULARY = REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tones import GLYPH_TONES, resolved_tones  # noqa: E402

MAX_ANCHOR = 18
MIN_MNEMONIC_WORDS = 20
MAX_MNEMONIC_WORDS = 140
MIN_SCENE_WORDS = 15
MAX_SCENE_WORDS = 90

# The generator is told not to draw text; a scene that asks for it anyway
# produces an unfixable image, so it is refused at the door.
FORBIDDEN_IN_SCENE = re.compile(
    r"\b(text|letter|letters|word|words|writing|written|write|caption|sign|signs|"
    r"signage|label|labelled|labeled|banner|poster|billboard|inscription|"
    r"headline|subtitle|logo|slogan|spelled|spelling|numeral|handwriting)\b",
    re.IGNORECASE,
)

VALID_VERDICTS = {"written", "kept", "replaced", "skipped"}

# The tone note is the final parenthetical. Scanning the whole mnemonic for
# glyphs does not work: `—` is ordinary punctuation in this prose, so an em
# dash anywhere in the story registered as a claimed mid tone and could mask a
# genuinely wrong one by making the claimed set intersect by accident.
TONE_NOTE = re.compile(r"\(([^()]*)\)\s*$")


def words(text: str) -> int:
    return len(text.split())


def validate(entry: dict, vocab: dict, seen: set[int]) -> list[str]:
    """Every rule the style guide states, as a list of failures."""
    problems: list[str] = []
    rank = entry.get("rank")

    if not isinstance(rank, int):
        return [f"rank is not an integer: {rank!r}"]
    if rank in seen:
        problems.append("duplicate rank")
    target = vocab.get(rank)
    if target is None:
        return [f"rank {rank} is not in vocabulary.json"]
    if entry.get("thai") != target["thai"]:
        return [f"thai {entry.get('thai')!r} != vocabulary {target['thai']!r}"]

    verdict = entry.get("verdict")
    if verdict not in VALID_VERDICTS:
        problems.append(f"verdict {verdict!r} not one of {sorted(VALID_VERDICTS)}")

    if verdict in {"skipped", "kept"}:
        if verdict == "skipped" and not (entry.get("skip_reason") or "").strip():
            problems.append("skipped without a skip_reason")
        return problems

    mnemonic = entry.get("mnemonic")
    if not isinstance(mnemonic, str) or not mnemonic.strip():
        return problems + [f"verdict {verdict!r} but no mnemonic"]
    count = words(mnemonic)
    if not MIN_MNEMONIC_WORDS <= count <= MAX_MNEMONIC_WORDS:
        problems.append(f"mnemonic is {count} words (want {MIN_MNEMONIC_WORDS}-{MAX_MNEMONIC_WORDS})")

    anchor = entry.get("anchor") or ""
    if not anchor.strip():
        problems.append("missing anchor")
    elif len(anchor) > MAX_ANCHOR:
        problems.append(f"anchor is {len(anchor)} chars (max {MAX_ANCHOR}): {anchor!r}")

    scene = entry.get("scene") or ""
    if not scene.strip():
        problems.append("missing scene")
    else:
        count = words(scene)
        if not MIN_SCENE_WORDS <= count <= MAX_SCENE_WORDS:
            problems.append(f"scene is {count} words (want {MIN_SCENE_WORDS}-{MAX_SCENE_WORDS})")
        banned = {m.group(0).lower() for m in FORBIDDEN_IN_SCENE.finditer(scene)}
        if banned:
            problems.append(f"scene asks for text the model cannot draw: {sorted(banned)}")

    # Tone: the glyph must name a tone this word actually carries, read from
    # the romanization — see `tones.py` for why not `syllables[].tone`.
    note = TONE_NOTE.search(mnemonic.strip())
    if note is None:
        problems.append("no tone note in parentheses at the end of the mnemonic")
        return problems
    glyphs = {ch for ch in note.group(1) if ch in GLYPH_TONES}
    actual = resolved_tones(target)
    if not glyphs:
        problems.append("no tone glyph in the mnemonic")
        return problems

    claimed = {GLYPH_TONES[g] for g in glyphs}
    if actual and not (claimed & actual):
        problems.append(
            f"tone glyph claims {sorted(claimed)} but the word carries {sorted(actual)}"
        )
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("batches", nargs="+", type=Path)
    parser.add_argument("--write", action="store_true")
    parser.add_argument(
        "--allow-failures",
        action="store_true",
        help="merge the entries that passed even if some failed",
    )
    args = parser.parse_args()

    vocabulary = json.loads(VOCABULARY.read_text(encoding="utf-8"))
    vocab = {e["rank"]: e for e in vocabulary if e.get("rank") is not None}

    existing = json.loads(MNEMONICS.read_text(encoding="utf-8"))
    by_rank = {e["rank"]: e for e in existing["entries"]}

    seen: set[int] = set()
    accepted: list[dict] = []
    failures: list[tuple[Path, int, list[str]]] = []
    verdicts: Counter[str] = Counter()
    ratings: Counter[int] = Counter()

    for path in args.batches:
        if not path.exists():
            print(f"MISSING: {path}", file=sys.stderr)
            return 1
        try:
            batch = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"MALFORMED JSON: {path}: {exc}", file=sys.stderr)
            return 1
        for entry in batch:
            problems = validate(entry, vocab, seen)
            seen.add(entry.get("rank"))
            verdicts[entry.get("verdict", "?")] += 1
            if isinstance(entry.get("rating"), int):
                ratings[entry["rating"]] += 1
            if problems:
                failures.append((path, entry.get("rank"), problems))
                continue
            if entry.get("verdict") in {"written", "replaced"}:
                accepted.append(entry)

    print(f"entries seen : {sum(verdicts.values())}")
    print(f"verdicts     : {dict(verdicts)}")
    if ratings:
        print(f"ratings      : {dict(sorted(ratings.items()))}")
    print(f"mergeable    : {len(accepted)}")
    print(f"failed checks: {len(failures)}")
    for path, rank, problems in failures[:40]:
        print(f"  {path.name} rank {rank}: {'; '.join(problems)}")
    if len(failures) > 40:
        print(f"  … and {len(failures) - 40} more")

    if failures and not args.allow_failures:
        print("\nrefusing to merge — fix the batches or pass --allow-failures")
        return 1

    if not args.write:
        print("\n(dry run — pass --write to merge)")
        return 0

    for entry in accepted:
        by_rank[entry["rank"]] = {
            "rank": entry["rank"],
            "thai": entry["thai"],
            "romanization": vocab[entry["rank"]]["romanization"],
            "english": vocab[entry["rank"]]["english"],
            "anchor": entry["anchor"],
            "mnemonic": entry["mnemonic"],
            "headline": entry.get("headline"),
            "scene": entry["scene"],
        }
    existing["entries"] = [by_rank[r] for r in sorted(by_rank)]
    MNEMONICS.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\nmerged {len(accepted)} into {MNEMONICS.name} ({len(existing['entries'])} total)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
