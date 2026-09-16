"""Tone of each syllable, for validating authored mnemonics.

`vocabulary.json`'s `syllables[].tone` used to be unusable here — it applied
the long-vowel branch of the dead-syllable rule unconditionally, so ทุก, รับ
and และ all came out wrong, and it agreed with the romanization on barely
half the corpus. `scripts/enrich-vocabulary.py` has since been fixed and the
data regenerated: agreement is now **99.7%**, and the stored field is itself
the reconciled answer of the tone rules and these same romanization accents.

Two reasons this module still reads the romanization rather than simply
trusting that field:

  * **Segmentation.** The stored breakdown still under-splits 711 compounds
    — สบาย is one syllable there ("rising") rather than sà-baai (low, mid).
    Until that is fixed, the romanization is the only source that knows how
    many syllables a word has.
  * **Per-syllable choice.** A mnemonic may legitimately note the tone of
    any syllable, so `resolved_tones` returns the set a word carries rather
    than one answer.

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
TONE_GLYPHS = {"mid": "—", "low": "_", "falling": "↓", "high": "▲", "rising": "↑"}
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
    if mark == "mayjattawa":
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
