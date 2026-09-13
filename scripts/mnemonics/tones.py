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

import unicodedata

DIACRITIC_TONES = {
    "̀": "low",       # à
    "́": "high",      # á
    "̂": "falling",   # â
    "̌": "rising",    # ǎ
}
TONE_GLYPHS = {"mid": "—", "low": "▁", "falling": "↓", "high": "▲", "rising": "↑"}
GLYPH_TONES = {glyph: tone for tone, glyph in TONE_GLYPHS.items()}


def syllable_tones(romanization: str) -> list[str]:
    """One tone per whitespace-separated syllable; unmarked means mid."""
    tones: list[str] = []
    for syllable in romanization.split():
        decomposed = unicodedata.normalize("NFD", syllable)
        marked = [DIACRITIC_TONES[c] for c in decomposed if c in DIACRITIC_TONES]
        tones.append(marked[0] if marked else "mid")
    return tones
