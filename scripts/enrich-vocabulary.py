"""
Enrich vocabulary.json with syllable breakdowns, tone rules, and character lists.

Uses PyThaiNLP for syllable tokenization and applies Thai tone rule logic
matching the tone rule IDs defined in symbol.ts.
"""

import json
import re
import unicodedata
from pathlib import Path

from pythainlp.tokenize import syllable_tokenize

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VOCAB_PATH = Path(__file__).resolve().parent.parent / "src" / "vocabulary.json"

MID_CLASS = set("กจฎฏดตบปอ")
HIGH_CLASS = set("ขฃฉฐถผฝศษสห")
LOW_CLASS = set("คฅฆงชซฌญฑฒณทธนพฟภมยรฤลฬวฮ")

TONE_MARKS = {
    "\u0E48": "mayek",       # ่  mai ek
    "\u0E49": "maytho",      # ้  mai tho
    "\u0E4A": "maytri",      # ๊  mai tri
    "\u0E4B": "mayjattawa",  # ๋  mai chattawa
}

LONG_VOWELS = set("าีืูเแโใไ")
SHORT_VOWELS = set("ะิึุ")

# Vowel forms (above / below / leading / trailing / combined)
VOWEL_CHARS = set("ะัาิีึืุูเแโใไ็ำ")

STOP_CONSONANTS = set("กขฃคฅฆจชซฌฎฏฐฑฒดตถทธบปผฝพฟภศษส")
SONORANT_CONSONANTS = set("งญณนมยรลวฬ")

EXCLUDED_CHARS = set("์ฯๆ")

THAI_CONSONANT_RANGE = set(
    chr(c) for c in range(0x0E01, 0x0E2F)  # ก - ฮ
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_thai_characters(word: str) -> list[str]:
    """Extract unique Thai codepoints (consonants, vowels, tone marks) excluding specials."""
    seen: set[str] = set()
    result: list[str] = []
    for ch in word:
        if ch in EXCLUDED_CHARS or ch in seen:
            continue
        if ch in THAI_CONSONANT_RANGE or ch in VOWEL_CHARS or ch in TONE_MARKS:
            seen.add(ch)
            result.append(ch)
    return result


def _find_tone_mark(syllable_text: str) -> str | None:
    """Return the tone mark character found in a syllable, or None."""
    for ch in syllable_text:
        if ch in TONE_MARKS:
            return ch
    return None


def _classify_consonant(ch: str) -> str | None:
    if ch in MID_CLASS:
        return "mid"
    if ch in HIGH_CLASS:
        return "high"
    if ch in LOW_CLASS:
        return "low"
    return None


def _find_initial_consonant(syllable_text: str) -> str | None:
    """Return the first Thai consonant in the syllable."""
    for ch in syllable_text:
        if ch in THAI_CONSONANT_RANGE:
            return ch
    return None


def _find_final_consonant(syllable_text: str) -> str | None:
    """Return the last Thai consonant that is not the initial (simplistic heuristic)."""
    consonants = [ch for ch in syllable_text if ch in THAI_CONSONANT_RANGE]
    if len(consonants) >= 2:
        return consonants[-1]
    return None


def _find_vowel(syllable_text: str) -> str | None:
    """Return concatenated vowel characters found in the syllable."""
    vowels = [ch for ch in syllable_text if ch in VOWEL_CHARS]
    return "".join(vowels) if vowels else None


def _has_long_vowel(syllable_text: str) -> bool:
    return any(ch in LONG_VOWELS for ch in syllable_text)


def _has_short_vowel(syllable_text: str) -> bool:
    return any(ch in SHORT_VOWELS for ch in syllable_text)


def _determine_syllable_type(syllable_text: str) -> str:
    """
    Determine if a syllable is 'live' or 'dead'.
    - Live: ends with sonorant consonant, or has long vowel with no final stop
    - Dead: ends with stop consonant, or short vowel with no sonorant final
    """
    final = _find_final_consonant(syllable_text)

    if final:
        if final in SONORANT_CONSONANTS:
            return "live"
        if final in STOP_CONSONANTS:
            return "dead"

    # No final consonant: vowel length determines liveness
    if _has_long_vowel(syllable_text):
        return "live"
    if _has_short_vowel(syllable_text):
        return "dead"

    # Default (e.g. sara am ำ is live)
    if "ำ" in syllable_text:
        return "live"

    return "live"


def _determine_tone(consonant_class: str, syllable_type: str, tone_mark: str | None) -> str:
    """Determine tone value based on class, syllable type, and tone mark."""
    if tone_mark:
        mark_name = TONE_MARKS[tone_mark]
        tone_map = {
            ("mid", "mayek"): "low",
            ("mid", "maytho"): "falling",
            ("mid", "maytri"): "high",
            ("mid", "mayjattawa"): "rising",
            ("high", "mayek"): "low",
            ("high", "maytho"): "falling",
            ("low", "mayek"): "falling",
            ("low", "maytho"): "high",
        }
        return tone_map.get((consonant_class, mark_name), "mid")

    # No tone mark: use syllable-type rules
    rule_map = {
        ("low", "live"): "mid",
        ("mid", "live"): "mid",
        ("high", "live"): "rising",
        ("low", "dead-short"): "high",
        ("low", "dead-long"): "falling",
        ("mid", "dead-short"): "low",
        ("mid", "dead-long"): "low",
        ("high", "dead-short"): "low",
        ("high", "dead-long"): "low",
    }

    if syllable_type == "dead":
        is_long = True  # default
        # refine: check vowel length
        key = (consonant_class, "dead-long")
        # check short first
        short_key = (consonant_class, "dead-short")
        if short_key in rule_map:
            # We need actual vowel info to distinguish
            pass
        return rule_map.get(key, "mid")

    return rule_map.get((consonant_class, syllable_type), "mid")


def _determine_tone_rule_id(consonant_class: str, syllable_type: str, tone_mark: str | None, syllable_text: str) -> str:
    """Build tone rule ID matching the format in symbol.ts."""
    if tone_mark:
        mark_name = TONE_MARKS[tone_mark]
        return f"{consonant_class}-{mark_name}"

    # No tone mark: use syllable type with vowel length for dead syllables
    if syllable_type == "dead":
        if _has_short_vowel(syllable_text):
            return f"{consonant_class}-dead-short"
        return f"{consonant_class}-dead-long"

    return f"{consonant_class}-{syllable_type}"


def analyze_syllable(syllable_text: str) -> dict:
    """Analyze a single Thai syllable and return its breakdown."""
    initial = _find_initial_consonant(syllable_text)
    vowel = _find_vowel(syllable_text)
    final = _find_final_consonant(syllable_text)
    tone_mark_char = _find_tone_mark(syllable_text)
    tone_mark_name = TONE_MARKS.get(tone_mark_char) if tone_mark_char else None

    consonant_class = _classify_consonant(initial) if initial else None
    syllable_type = _determine_syllable_type(syllable_text)
    tone = _determine_tone(consonant_class, syllable_type, tone_mark_char) if consonant_class else None

    return {
        "text": syllable_text,
        "initialConsonant": initial,
        "vowel": vowel,
        "finalConsonant": final,
        "toneMark": tone_mark_name,
        "consonantClass": consonant_class,
        "syllableType": syllable_type,
        "tone": tone,
    }


def enrich_entry(entry: dict) -> dict:
    """Add characters, syllables, toneRules, and mnemonic to a vocabulary entry."""
    thai_word = entry.get("thai", "")

    # Characters
    entry["characters"] = get_thai_characters(thai_word)

    # Syllables
    raw_syllables = syllable_tokenize(thai_word)
    syllables = [analyze_syllable(s) for s in raw_syllables]
    entry["syllables"] = syllables

    # Tone rules (deduplicated, preserving order)
    seen_rules: set[str] = set()
    tone_rules: list[str] = []
    for syl in syllables:
        if syl["consonantClass"]:
            rule_id = _determine_tone_rule_id(
                syl["consonantClass"],
                syl["syllableType"],
                _find_tone_mark(syl["text"]),
                syl["text"],
            )
            if rule_id not in seen_rules:
                seen_rules.add(rule_id)
                tone_rules.append(rule_id)
    entry["toneRules"] = tone_rules

    # Mnemonic: preserve existing value or set to null
    if "mnemonic" not in entry:
        entry["mnemonic"] = None

    return entry


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print(f"Reading vocabulary from {VOCAB_PATH}")
    with open(VOCAB_PATH, "r", encoding="utf-8") as f:
        vocabulary: list[dict] = json.load(f)

    print(f"Enriching {len(vocabulary)} entries...")
    for entry in vocabulary:
        enrich_entry(entry)

    with open(VOCAB_PATH, "w", encoding="utf-8") as f:
        json.dump(vocabulary, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Done. Wrote enriched vocabulary back to {VOCAB_PATH}")

    # Print a sample entry for verification
    if vocabulary:
        sample = vocabulary[0]
        print(f"\nSample entry: {sample['thai']}")
        print(f"  characters: {sample.get('characters')}")
        print(f"  syllables:  {json.dumps(sample.get('syllables'), ensure_ascii=False)}")
        print(f"  toneRules:  {sample.get('toneRules')}")
        print(f"  mnemonic:   {sample.get('mnemonic')}")


if __name__ == "__main__":
    main()
