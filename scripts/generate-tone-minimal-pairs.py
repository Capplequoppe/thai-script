#!/usr/bin/env python3
"""Generate `src/domain/vocabulary/data/tone-minimal-pairs.json`.

A *tone minimal pair* is what the tone-pairs game mode drills: two or more
vocabulary words a learner cannot tell apart from the sound alone except by
tone — ไม่/ไหม/ใหม่, ข้าว/ขาว, สี/สี่. Finding them needs a phonemic
transcription of every word, and no single field in `vocabulary.json` is
one. This script builds one, then refuses to trust it alone.

## Why the obvious sources do not work by themselves

**`VocabEntry.romanization` is two incompatible schemes.** The entries with
a `source` (mostly `frequency_csv`) are IPA — `tʰîː`, `kʰɔ̌ːŋ`, `mɯ̂ːa`.
The entries with no `source` — which are, almost exactly, the entries that
have audio — are Paiboon+ as thai-language.com writes it: `khǎao`, `bpai`,
`dtà-làat`, `gòoet`. Grouped on the raw string, no cross-scheme pair is
ever found. `analyze()` below normalizes both onto one ASCII phoneme
alphabet, which is what makes the field usable at all.

**`VocabEntry.syllables` is a grapheme decomposition, not a phonemic one.**
It reads หน้า as initial ห + final น (the word is /nâː/, no final at all),
กลัว as ก with the /l/ of the cluster dropped, and ตลาด as one syllable
rather than two. Its *segmental* fields cannot decide whether two words
sound alike. Its `tone` field is a different matter — see below.

**pythainlp's `thaig2p` handles the script correctly but is not reliable.**
It resolves ห-นำ, clusters and implicit vowels — but it is a sequence
model, and it silently truncates words it does not know (ถาวร → `tʰ aː`,
dropping a whole syllable; กร → `k ɔː`, dropping the final) and sometimes
degenerates into repetition (ครอบครัว comes back with eight copies of one
syllable). Grouped on its output alone, ถ้า pairs with ถาวร, กร with ก็,
and บ้าง (long /aː/) with บัง (short /a/) — none of which are pairs.

## What this script does instead

The normalized romanization is the primary key, and a word joins a group
only if **two independent corroborations** agree:

  1. **Syllable structure.** The romanization must split into the same
     number of syllables as `VocabEntry.syllables`; a mismatch means the
     two are describing different segmentations and neither can be trusted
     to line up with the other.

     The *tones* themselves are taken from `VocabEntry.syllables[].tone`
     and not re-derived here. That field is already the agreed value of two
     independent derivations — `scripts/enrich-vocabulary.py` reconciles the
     tone rules against these same romanization accents — so re-checking it
     would only re-flag the handful of words where that reconciliation
     correctly overruled the romanization (ข้าว is transcribed `khàao`,
     low, where high class + mai tho gives falling).

  2. **Segments.** `thaig2p` must place the word in the same segmental
     class as the group's best-ranked member, and its syllable count must
     match the romanization's — which is exactly the check that catches its
     truncation and repetition failures. This is the veto that keeps บ้าง
     out of บัง's group.

The corroborations cost recall, and that is the trade being made
deliberately: in a mode whose entire premise is "these two sound the
same", a pair that does not is worse than a pair that is missing.

Run (pythainlp lives in the conversation backend's venv):

    backend/.venv/bin/python scripts/generate-tone-minimal-pairs.py

The output is committed. Regenerate it whenever `vocabulary.json` gains,
loses or re-ranks words — and after `scripts/generate-vocab-audio.py`, to
see the audio coverage move.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
VOCABULARY = REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"
OUTPUT = REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "tone-minimal-pairs.json"

UNRANKED = 10**9

# Combining accents, in both romanization schemes alike. An unmarked
# syllable is mid.
TONE_MARKS = {0x300: "low", 0x301: "high", 0x302: "falling", 0x30c: "rising"}

# IPA → the shared ASCII phoneme alphabet. Longest match first; capitals
# stand for the vowels with no ASCII letter of their own.
IPA_PHONEMES = [
    ("t͡ɕʰ", "ch"), ("tɕʰ", "ch"), ("t͡ɕ", "c"), ("tɕ", "c"),
    ("kʰ", "kh"), ("pʰ", "ph"), ("tʰ", "th"),
    ("ŋ", "ng"), ("ɲ", "y"), ("ʔ", "q"), ("j", "y"),
    ("ɛ", "E"), ("ɔ", "O"), ("ɤ", "X"), ("ə", "X"), ("ɯ", "U"),
    ("a̯", ""), ("̚", ""),
]

# Paiboon+ → the same alphabet. `bp`/`dt`/`g` are the *unaspirated* stops
# and the h-digraphs the aspirated ones, so the plain letters map straight
# through. `aaw` is /ɔː/ while `aao` is /aːw/ — hence the longest-first
# ordering here too.
PAIBOON_PHONEMES = [
    ("bp", "p"), ("dt", "t"), ("ch", "ch"), ("kh", "kh"), ("ph", "ph"),
    ("th", "th"), ("ng", "ng"), ("g", "k"), ("j", "c"),
    ("aaw", "OO"), ("aw", "O"), ("aae", "EE"), ("ae", "E"),
    ("ooe", "XX"), ("oe", "X"), ("uue", "UU"), ("ue", "U"),
]

# `thaig2p` writes tones as Chao pitch letters.
G2P_TONES = {"˧": "mid", "˨˩": "low", "˥˩": "falling", "˦˥": "high", "˩˩˦": "rising"}


def rank_of(entry: dict[str, Any]) -> int:
    rank = entry.get("rank")
    return rank if isinstance(rank, int) else UNRANKED


def scheme_of(entry: dict[str, Any]) -> str:
    """Which romanization scheme this entry's `romanization` is written in.

    Keyed on `source` rather than on which characters appear: plenty of
    short IPA romanizations (`pen`, `mâj`, `tham`) contain no character
    the two schemes spell differently, and guessing from the string puts
    those in the wrong table.
    """
    return "ipa" if entry.get("source") else "paiboon"


def _apply(text: str, table: list[tuple[str, str]]) -> str:
    out, index = "", 0
    while index < len(text):
        for source, replacement in table:
            if text.startswith(source, index):
                out += replacement
                index += len(source)
                break
        else:
            out += text[index]
            index += 1
    return out


def romanized_syllables(romanization: str) -> list[str]:
    """Split a romanization into syllables.

    Both schemes separate syllables with a space or a hyphen (`dtà-làat`,
    `tʰǎː wɔːn`, `sǎa-mâat`) and never run two together inside one chunk,
    so splitting on those is enough — and it is what makes the tone read
    below trivially correct, since each chunk then carries at most one
    accent.
    """
    return [chunk for chunk in re.split(r"[\s\-]+", romanization.strip()) if chunk]


def _syllable(chunk: str, scheme: str) -> tuple[str, str]:
    decomposed = unicodedata.normalize("NFD", chunk).lower()
    tone = next(
        (TONE_MARKS[ord(c)] for c in decomposed if ord(c) in TONE_MARKS), "mid"
    )
    bare = "".join(c for c in decomposed if ord(c) not in TONE_MARKS)
    phonemes = _apply(bare, IPA_PHONEMES if scheme == "ipa" else PAIBOON_PHONEMES)
    # IPA writes length with `ː`, Paiboon by doubling the vowel; doubling
    # is what puts the two schemes on one spelling.
    phonemes = re.sub(r"([a-zEOXU])ː", r"\1\1", phonemes)
    return re.sub(r"[^a-zEOXU]", "", phonemes), tone


def analyze(romanization: str, scheme: str) -> tuple[str, tuple[str, ...]]:
    """Segmental key and tone pattern for one romanization."""
    parts = [_syllable(chunk, scheme) for chunk in romanized_syllables(romanization)]
    return " ".join(p[0] for p in parts), tuple(p[1] for p in parts)


def g2p_analysis(transcription: str) -> tuple[str, int]:
    """`thaig2p`'s segmental key and syllable count."""
    tokens = transcription.split()
    segments = [t for t in tokens if t not in G2P_TONES and t != "."]
    return " ".join(segments), sum(1 for t in tokens if t in G2P_TONES)


def build_groups(
    entries: list[dict[str, Any]], transcribe: Any
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Every corroborated tone minimal-pair group, best-ranked first."""
    counts = {"no_romanization": 0, "syllable_mismatch": 0, "g2p_unusable": 0, "g2p_vetoed": 0}

    # Best-ranked entry per spelling. `vocabulary.json` carries duplicates
    # (บ้าน "house" and บ้าน "home"), and two entries for one spelling are
    # never a pair of each other — same sound *and* same tone, which is a
    # question with two right answers.
    best: dict[str, dict[str, Any]] = {}
    for entry in sorted(entries, key=rank_of):
        best.setdefault(entry["thai"], entry)

    candidates: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for thai, entry in best.items():
        key, romanized_tones = analyze(entry["romanization"], scheme_of(entry))
        if not key or not romanized_tones:
            counts["no_romanization"] += 1
            continue

        # Corroboration 1 — the two descriptions of the word must at least
        # agree on how many syllables it has, or the key and the tones below
        # are describing different things. The tones come from the entry,
        # which already reconciles rules against romanization; see the
        # module docstring.
        tones = tuple(s["tone"] for s in entry["syllables"])
        if len(tones) != len(romanized_tones) or any(t is None for t in tones):
            counts["syllable_mismatch"] += 1
            continue

        try:
            transcription = transcribe(thai, engine="thaig2p")
        except Exception:  # noqa: BLE001 — an unreadable word is excluded, never fatal
            counts["g2p_unusable"] += 1
            continue

        g2p_key, g2p_syllables = g2p_analysis(transcription)
        # A syllable count that disagrees with the romanization's is
        # exactly `thaig2p` truncating or repeating — the failures that
        # produce false pairs. Such a word gets no vote and no group.
        if not g2p_key or g2p_syllables != len(tones):
            counts["g2p_unusable"] += 1
            continue

        candidates[key].append(
            {"thai": thai, "tones": list(tones), "_g2p": g2p_key, "_rank": rank_of(entry)}
        )

    groups: list[dict[str, Any]] = []
    for key, members in candidates.items():
        members.sort(key=lambda m: m["_rank"])
        # Corroboration 2 — everyone must be in the best-ranked member's
        # segmental class by `thaig2p` too, not merely by the romanization.
        anchor = members[0]["_g2p"]
        kept = [m for m in members if m["_g2p"] == anchor]
        counts["g2p_vetoed"] += len(members) - len(kept)

        if len(kept) < 2 or len({tuple(m["tones"]) for m in kept}) < 2:
            continue

        groups.append(
            {
                "key": key,
                "members": [{"thai": m["thai"], "tones": m["tones"]} for m in kept],
                "_rank": kept[0]["_rank"],
            }
        )

    groups.sort(key=lambda g: g.pop("_rank"))
    return groups, counts


def render(groups: list[dict[str, Any]]) -> str:
    """Serialize the groups the way Biome formats JSON.

    `json.dumps(indent=...)` explodes every `tones` array over three lines;
    Biome keeps a short array on one. Written out by hand rather than
    piped through Biome so a regenerated file is clean without a second
    tool having to be run over it.
    """
    lines = ["["]
    for group_index, group in enumerate(groups):
        members = group["members"]
        lines.append("\t{")
        lines.append(f'\t\t"key": {json.dumps(group["key"], ensure_ascii=False)},')
        lines.append('\t\t"members": [')
        for member_index, member in enumerate(members):
            tones = ", ".join(json.dumps(t) for t in member["tones"])
            lines.append("\t\t\t{")
            lines.append(f'\t\t\t\t"thai": {json.dumps(member["thai"], ensure_ascii=False)},')
            lines.append(f'\t\t\t\t"tones": [{tones}]')
            lines.append("\t\t\t}" + ("," if member_index < len(members) - 1 else ""))
        lines.append("\t\t]")
        lines.append("\t}" + ("," if group_index < len(groups) - 1 else ""))
    lines.append("]")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--vocabulary", type=Path, default=VOCABULARY)
    parser.add_argument("--out", type=Path, default=OUTPUT)
    args = parser.parse_args(argv)

    try:
        from pythainlp.transliterate import transliterate
    except ImportError:  # pragma: no cover — an operator-facing message
        print(
            "pythainlp is not importable. It ships in the conversation backend's venv:\n"
            "  backend/.venv/bin/python scripts/generate-tone-minimal-pairs.py",
            file=sys.stderr,
        )
        return 2

    entries: list[dict[str, Any]] = json.loads(args.vocabulary.read_text(encoding="utf-8"))
    groups, counts = build_groups(entries, transliterate)

    args.out.write_text(render(groups), encoding="utf-8")

    words = sum(len(g["members"]) for g in groups)
    with_audio = {e["thai"] for e in entries if e.get("thai_audio_file")}
    playable = sum(
        1 for g in groups for m in g["members"] if m["thai"] in with_audio
    )
    print(f"{len(groups)} groups, {words} words → {args.out.relative_to(REPO_ROOT)}")
    print(
        "excluded: "
        + ", ".join(f"{name}={count}" for name, count in counts.items())
    )
    print(
        f"{playable} of the grouped words have audio today — the rest need "
        "scripts/generate-vocab-audio.py"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
