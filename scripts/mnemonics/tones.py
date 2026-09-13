"""Tone of each syllable, read from the romanization's diacritics.

NOT from `vocabulary.json`'s `syllables[].tone`. That field disagrees with the
romanization for 2600 of 5454 entries — only 52% agreement — and every case
checked by hand has the romanization right:

    ทุก  tʰúk   syllables say "falling", romanization says high
    รับ  ráp    syllables say "falling", romanization says high
    และ  lɛ́ʔ    syllables say "mid",     romanization says high
    ก็   kɔ̂ː    syllables say "mid",     romanization says falling

A low-class initial in a dead syllable gives **high** tone on a short vowel and
**falling** on a long one; the analyser behind that field appears to apply the
long-vowel branch unconditionally. It also fails to split compounds — สบาย is
one syllable there ("rising") rather than sà-baai (low, mid).

The romanization uses combining diacritics, which are unambiguous.
"""

from __future__ import annotations

import re
import unicodedata

DIACRITIC_TONES = {
    "̀": "low",       # à
    "́": "high",      # á
    "̂": "falling",   # â
    "̌": "rising",    # ǎ
}
TONE_GLYPHS = {"mid": "—", "low": "▁", "falling": "↓", "high": "▲", "rising": "↑"}
GLYPH_TONES = {glyph: tone for tone, glyph in TONE_GLYPHS.items()}


# Syllables are separated by a space OR a hyphen, and the corpus uses both —
# "sà wàt diː" alongside "khàawp-khun". Splitting on whitespace alone collapses
# a hyphenated word to one syllable and loses every tone after the first, which
# made the validator reject correct entries: khǎaw-thôot read as rising only,
# so a mnemonic correctly marking the falling second syllable was refused.
_SEPARATORS = re.compile(r"[\s\-‐-―]+")


def syllable_tones(romanization: str) -> list[str]:
    """One tone per syllable; an unmarked syllable is mid."""
    tones: list[str] = []
    for syllable in _SEPARATORS.split(romanization.strip()):
        if not syllable:
            continue
        decomposed = unicodedata.normalize("NFD", syllable)
        marked = [DIACRITIC_TONES[c] for c in decomposed if c in DIACRITIC_TONES]
        tones.append(marked[0] if marked else "mid")
    return tones


# --- Deriving the tone from the spelling, rather than trusting either field ---
#
# Neither stored field is reliable on its own. `syllables[].tone` applies the
# long-vowel branch of the dead-syllable rule unconditionally (วัด, รถ, ชุด all
# come out "falling" when they are high). The romanization is right far more
# often, but not always: ข้าว is stored `khàao` when ข is a high-class initial
# under mai tho, which is falling. So compute it.

SHORT_VOWELS = {
    "ะ", "ั", "ิ", "ึ", "ุ", "เะ", "แะ", "โะ", "เาะ", "เอะ", "ัวะ", "เียะ",
    "เือะ", "ำ", "ใ", "ไ", "เา",
}


def _is_short(vowel: str | None) -> bool:
    return vowel is not None and vowel in SHORT_VOWELS


def tone_from_spelling(syllable: dict) -> str | None:
    """Standard Thai tone rules, or None when the data is too thin to decide."""
    cls = syllable.get("consonantClass")
    mark = syllable.get("toneMark")
    kind = syllable.get("syllableType")
    if cls not in {"high", "mid", "low"} or kind not in {"live", "dead"}:
        return None

    if mark == "mayek":
        return "falling" if cls == "low" else "low"
    if mark == "maytho":
        return "high" if cls == "low" else "falling"
    if mark in {"maytri", "maychattawa"}:
        return "high" if mark == "maytri" else "rising"

    if kind == "live":
        return "rising" if cls == "high" else "mid"
    # Dead syllable, unmarked: the branch the stored field gets wrong.
    if cls in {"high", "mid"}:
        return "low"
    return "high" if _is_short(syllable.get("vowel")) else "falling"


def tone_from_mark(syllable: dict) -> str | None:
    """Tone implied by an explicit tone mark, or None if the syllable has none.

    A written mai ek or mai tho plus the initial's class settles the tone
    outright — no dependence on the live/dead classification, which the stored
    data gets wrong often enough to be unusable (และ is recorded `live` when
    its short vowel makes it dead). This is the one second opinion worth
    admitting against the romanization, and it is what rescues ข้าว: high-class
    initial under mai tho is falling, however the romanization spells it.
    """
    cls = syllable.get("consonantClass")
    mark = syllable.get("toneMark")
    if cls not in {"high", "mid", "low"}:
        return None
    if mark == "mayek":
        return "falling" if cls == "low" else "low"
    if mark == "maytho":
        return "high" if cls == "low" else "falling"
    if mark == "maytri":
        return "high"
    if mark == "maychattawa":
        return "rising"
    return None


def resolved_tones(entry: dict) -> set[str]:
    """Every tone this word legitimately carries, best source per syllable.

    A written tone mark settles its own syllable; otherwise the romanization
    decides. Resolving per syllable matters for compounds: แต่ละ carries mai ek
    on แต่ (low) while ละ is high, so a mnemonic that notes either one is right
    and a check demanding agreement with the marked syllable alone would reject
    half of them.

    When the two sources disagree about how many syllables there are — which
    they do for 1923 entries, the stored analysis failing to split compounds —
    no alignment is possible, so the union of both is allowed rather than
    guessing.
    """
    from_rom = syllable_tones(entry["romanization"])
    syllables = entry.get("syllables") or []
    marks = [tone_from_mark(s) for s in syllables]

    if len(syllables) != len(from_rom):
        return set(from_rom) | {m for m in marks if m is not None}
    return {mark if mark is not None else rom for mark, rom in zip(marks, from_rom)}
