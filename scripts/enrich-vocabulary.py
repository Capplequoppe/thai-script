"""
Enrich vocabulary.json with syllable breakdowns, tone rules, and character lists.

Applies Thai tone-rule logic matching the rule IDs in
`src/domain/script/data/symbols.ts`, and cross-checks the result against the
tone accents in each entry's own `romanization`.

## Two modes

By default the script **re-analyzes the syllable splits already stored** in
`vocabulary.json` and rewrites only what it derives from them (`tone`,
`syllableType`, `initialConsonant`, `finalConsonant`, `vowel`, `toneRules`).
Re-segmenting is a separate, bigger change — `--retokenize` asks for it, and
needs `python-crfsuite` for PyThaiNLP's syllable tokenizer.

## Why the tone is cross-checked rather than simply derived

Two independent things say what a syllable's tone is: the rules applied to
the spelling, and the accent the transcriber wrote in `romanization`. They
disagree on roughly 3% of syllables, and *which one is right depends on
whether the syllable carries a tone mark*:

  * **With a tone mark** (่ ้ ๊ ๋) the rule is exceptionless — mark plus
    consonant class fixes the tone with no room for a loanword to deviate.
    Measured against the romanizations, the rules agree 99.6% of the time,
    and every disagreement examined was the *romanization* being wrong
    (ข้าว transcribed `khàao`, low, where the spelling gives falling) or a
    romanization with no accents at all. So the rules win here.

  * **Without a tone mark** the tone follows from live/dead and vowel
    length, and that is exactly where borrowings and lexicalized forms
    stop obeying the rules: เมตร, เทคนิค, กอล์ฟ, บล็อก, คอมพิวเตอร์,
    สำเร็จ, ประวัติ, จันทร์. The romanization has these right and the rules
    cannot. So the romanization wins here, on 1.8% of all syllables.

`toneRules` stays rule-derived in both cases: it answers "which tone rules
must the learner know to read this word", which is still the rule's
question even where the word's actual tone is irregular.

## The bug this replaced

`_determine_tone` used to ignore vowel length entirely for dead syllables —
it had an abandoned "we need actual vowel info to distinguish" branch that
always fell through to `dead-long`. Combined with a short-vowel set missing
mai han akat (ั) and mai taikhu (็), that mis-toned every low-class dead
short syllable as falling instead of high: รับ, ทุก, เล็ก, และ. Tone
agreement with the romanizations was 77.4%; it is now 99%+.
"""


import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

VOCAB_PATH = (
    Path(__file__).resolve().parent.parent
    / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"
)

MID_CLASS = set("กจฎฏดตบปอ")
HIGH_CLASS = set("ขฃฉฐถผฝศษสห")
LOW_CLASS = set("คฅฆงชซฌญฑฒณทธนพฟภมยรฤลฬวฮ")

TONE_MARKS = {
    "\u0E48": "mayek",       # ่  mai ek
    "\u0E49": "maytho",      # ้  mai tho
    "\u0E4A": "maytri",      # ๊  mai tri
    "\u0E4B": "mayjattawa",  # ๋  mai chattawa
}

# `ั` (mai han akat) and `็` (mai taikhu) both mark a SHORT vowel and were
# missing here — the single biggest cause of the mis-toning this script's
# docstring describes (รับ, วัด, เล็ก).
LONG_VOWELS = set("าีืูเแโใไ")
SHORT_VOWELS = set("ะัิึุ็")

VOWEL_CHARS = set("ะัาิีึืุูเแโใไ็ำ")

STOP_CONSONANTS = set("กขฃคฅฆจชซฌฎฏฐฑฒดตถทธบปผฝพฟภศษส")
SONORANT_CONSONANTS = set("งญณนมยรลวฬ")

EXCLUDED_CHARS = set("์ฯๆ")

THAI_CONSONANT_RANGE = set(
    chr(c) for c in range(0x0E01, 0x0E2F)  # ก - ฮ
)

# `์` (thanthakhat / karan) silences the consonant it sits on.
KARAN = "\u0E4C"

# True onset clusters. `ร`/`ล` follow the stops freely; `ว` only follows
# ก ข ค, and only when a written vowel comes after it — `ควาย` is /kʰwaːj/
# with a คว onset, but `ควบ` is /kʰûap/ where the ว *is* the vowel.
CLUSTER_RL_FIRST = set("กขคฅฆจตทปผพบฟสศ")
CLUSTER_W_FIRST = set("กขค")

# ห นำ: a silent leading ห makes the following sonorant high class.
LEADING_H_SECOND = set("งญณนมยรลวฬ")

# `อ` is never a final consonant; `ว` is one only when it ends the syllable.
VOWEL_LIKE_CONSONANTS = set("อว")

# The app's own tables (`toneRules` / `toneMarkRules` in symbols.ts). Tone is
# derived from the rule id so the two can never disagree — the previous
# version computed them in two separate functions and they did.
TONE_BY_RULE = {
    "low-live": "mid",
    "mid-live": "mid",
    "high-live": "rising",
    "low-dead-short": "high",
    "low-dead-long": "falling",
    "mid-dead-short": "low",
    "mid-dead-long": "low",
    "high-dead-short": "low",
    "high-dead-long": "low",
}
TONE_BY_MARK = {
    ("mid", "mayek"): "low",
    ("mid", "maytho"): "falling",
    ("mid", "maytri"): "high",
    ("mid", "mayjattawa"): "rising",
    ("high", "mayek"): "low",
    ("high", "maytho"): "falling",
    ("low", "mayek"): "falling",
    ("low", "maytho"): "high",
}

# Romanization tone accents, identical in both schemes the corpus uses
# (IPA for entries with a `source`, Paiboon+ for the rest). An unmarked
# romanized syllable is mid.
ROMAN_TONE_ACCENTS = {0x300: "low", 0x301: "high", 0x302: "falling", 0x30C: "rising"}


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


def strip_karan(text: str) -> str:
    """Remove each karan and the consonant it silences.

    The mark sits on its consonant, but a vowel can be written between the
    two in the codepoint order (พันธุ์ is พ ั น ธ ุ ์), so this walks back
    to the first consonant rather than assuming the previous character.
    Without this, สัตว์ reads its silent ว as a sonorant final and comes out
    live/rising instead of dead/low.
    """
    out = list(text)
    for index, ch in enumerate(out):
        if ch != KARAN:
            continue
        out[index] = ""
        back = index - 1
        while back >= 0:
            previous = out[back]
            out[back] = ""
            if previous in THAI_CONSONANT_RANGE:
                break
            back -= 1
    return "".join(out)


def parse_syllable(syllable_text: str) -> dict[str, Any] | None:
    """Split one syllable into onset, vowel and final.

    The rule this gets right and a "last consonant is the final" heuristic
    gets wrong: a consonant belonging to the *onset* is not a final.
    ประ is ป + ร cluster + ะ (dead, no final), not ป + final ร (live);
    แหละ is ห นำ + ล (high class, dead), not a live syllable ending in ล.
    Both used to come out live, and therefore with the wrong tone.
    """
    source = strip_karan(syllable_text)
    positions = [i for i, ch in enumerate(source) if ch in THAI_CONSONANT_RANGE]
    if not positions:
        return None

    first = positions[0]
    onset = [first]
    if len(positions) > 1 and positions[1] == first + 1:
        lead, second = source[first], source[positions[1]]
        after = source[positions[1] + 1] if positions[1] + 1 < len(source) else ""
        if (
            (lead == "ห" and second in LEADING_H_SECOND)
            or (lead == "อ" and second == "ย")
            or (second in "รล" and lead in CLUSTER_RL_FIRST)
            or (
                second == "ว"
                and lead in CLUSTER_W_FIRST
                and (after in LONG_VOWELS or after in SHORT_VOWELS)
            )
        ):
            onset.append(positions[1])

    rest = [i for i in positions if i > onset[-1]]
    # `อ` is always the vowel /ɔː/ here; `ว` is the vowel /ua/ unless it
    # ends the syllable, where it is the final offglide of ตัว, หัว, เร็ว.
    vowel_like = [
        i for i in rest if source[i] == "อ" or (source[i] == "ว" and i != rest[-1])
    ]
    rest = [i for i in rest if i not in vowel_like]

    # A final ตร / ทร cluster is pronounced /t/ — the ร is silent (บุตร, สูตร).
    if len(rest) >= 2 and source[rest[-1]] == "ร" and source[rest[-2]] in "ตท":
        rest = rest[:-1]

    final_index = rest[-1] if rest else None
    # Vowel marks written *after* the final consonant are silent: ชาติ is
    # /tɕʰâːt/, not a short syllable because of its trailing ิ.
    window = source[:final_index] if final_index is not None else source

    # เ‑ิ‑ is the long vowel /ɤː/ even though ิ is a short-vowel mark on its
    # own (เลิก /lɤ̂ːk/, เกิด /kɤ̀ːt/).
    has_short = any(ch in SHORT_VOWELS for ch in window) and not (
        "เ" in window and "ิ" in window
    )
    has_long = any(ch in LONG_VOWELS for ch in window) or bool(vowel_like)

    return {
        "initial": source[first],
        "final": source[final_index] if final_index is not None else None,
        "vowel": "".join(ch for ch in window if ch in VOWEL_CHARS) or None,
        "toneMark": _find_tone_mark(source),
        "hasShort": has_short,
        "hasLong": has_long,
    }


def _determine_syllable_type(parsed: dict[str, Any]) -> str:
    """'live' or 'dead' — a final sonorant or long vowel is live."""
    final = parsed["final"]
    if final in SONORANT_CONSONANTS:
        return "live"
    if final in STOP_CONSONANTS:
        return "dead"
    if parsed["hasShort"]:
        return "dead"
    return "live"


def _tone_rule_id(consonant_class: str, parsed: dict[str, Any]) -> str:
    """The `symbols.ts` tone-rule id this syllable is read by."""
    mark = parsed["toneMark"]
    if mark:
        return f"{consonant_class}-{TONE_MARKS[mark]}"

    if _determine_syllable_type(parsed) == "dead":
        # A dead syllable with no written vowel carries the implicit short
        # vowel (/o/ closed, /a/ open) — never a long one. ลด, พบ, ยก, รถ
        # are all low-class dead *short*, and so high tone, not falling.
        short = parsed["hasShort"] or not parsed["hasLong"]
        return f"{consonant_class}-dead-{'short' if short else 'long'}"

    return f"{consonant_class}-live"


def _tone_from_rule(consonant_class: str, parsed: dict[str, Any]) -> str:
    """The tone the rules give, derived from the rule id itself."""
    rule_id = _tone_rule_id(consonant_class, parsed)
    if parsed["toneMark"]:
        return TONE_BY_MARK.get(
            (consonant_class, TONE_MARKS[parsed["toneMark"]]), "mid"
        )
    return TONE_BY_RULE[rule_id]


def romanized_tones(romanization: str) -> tuple[str, ...] | None:
    """One tone per romanized syllable, or None if the string is untrustworthy.

    Both schemes separate syllables with a space or a hyphen and write the
    tone as a combining accent over the vowel, so this needs no phoneme
    table. A romanization containing capitals is a name-style transcription
    with no accents at all ("Rhong Hai") and is refused rather than read as
    all-mid.
    """
    if not romanization or any(ch.isupper() for ch in romanization):
        return None
    chunks = [c for c in re.split(r"[\s\-]+", romanization.strip()) if c]
    if not chunks:
        return None
    tones = []
    for chunk in chunks:
        decomposed = unicodedata.normalize("NFD", chunk)
        tones.append(
            next(
                (ROMAN_TONE_ACCENTS[ord(c)] for c in decomposed
                 if ord(c) in ROMAN_TONE_ACCENTS),
                "mid",
            )
        )
    return tuple(tones)


def analyze_syllable(syllable_text: str) -> dict:
    """Analyze a single Thai syllable and return its breakdown."""
    parsed = parse_syllable(syllable_text)
    if parsed is None:
        return {
            "text": syllable_text,
            "initialConsonant": None,
            "vowel": None,
            "finalConsonant": None,
            "toneMark": None,
            "consonantClass": None,
            "syllableType": "live",
            "tone": None,
        }

    consonant_class = _classify_consonant(parsed["initial"])
    return {
        "text": syllable_text,
        "initialConsonant": parsed["initial"],
        "vowel": parsed["vowel"],
        "finalConsonant": parsed["final"],
        "toneMark": TONE_MARKS.get(parsed["toneMark"]) if parsed["toneMark"] else None,
        "consonantClass": consonant_class,
        "syllableType": _determine_syllable_type(parsed),
        "tone": _tone_from_rule(consonant_class, parsed) if consonant_class else None,
    }


def apply_romanized_tones(entry: dict) -> int:
    """Override unmarked syllables' tones with the romanization's accents.

    See the module docstring for why this split is where it is: a syllable
    carrying a tone mark follows an exceptionless rule and keeps the
    rule-derived tone; an unmarked one is where loanwords and lexicalized
    forms deviate, and there the transcriber's accent is the better source.

    Returns how many syllables were overridden. Does nothing at all unless
    the romanization is trustworthy *and* splits into the same number of
    syllables as the stored breakdown — a count mismatch means the two are
    describing different segmentations, and pairing them up by index would
    put one syllable's tone on another.
    """
    syllables = entry.get("syllables") or []
    tones = romanized_tones(entry.get("romanization", ""))
    if not tones or len(tones) != len(syllables):
        return 0

    overridden = 0
    for syllable, romanized in zip(syllables, tones):
        if syllable["toneMark"] or not syllable["tone"]:
            continue
        if syllable["tone"] != romanized:
            syllable["tone"] = romanized
            overridden += 1
    return overridden


def enrich_entry(entry: dict, *, retokenize: bool) -> int:
    """Add characters, syllables, toneRules and mnemonic. Returns overrides."""
    thai_word = entry.get("thai", "")

    entry["characters"] = get_thai_characters(thai_word)

    if retokenize:
        from pythainlp.tokenize import syllable_tokenize

        texts = syllable_tokenize(thai_word)
    else:
        # The stored split is kept as-is; only what is derived from each
        # syllable's text is recomputed. Re-segmenting is a separate change.
        texts = [s["text"] for s in entry.get("syllables") or []]

    entry["syllables"] = [analyze_syllable(text) for text in texts]
    overridden = apply_romanized_tones(entry)

    # Tone rules stay rule-derived even where the tone above did not: they
    # answer "which rules must you know to read this", not "what does this
    # word happen to sound like".
    seen_rules: set[str] = set()
    tone_rules: list[str] = []
    for syllable in entry["syllables"]:
        if not syllable["consonantClass"]:
            continue
        parsed = parse_syllable(syllable["text"])
        if parsed is None:
            continue
        rule_id = _tone_rule_id(syllable["consonantClass"], parsed)
        if rule_id not in seen_rules:
            seen_rules.add(rule_id)
            tone_rules.append(rule_id)
    entry["toneRules"] = tone_rules

    if "mnemonic" not in entry:
        entry["mnemonic"] = None

    return overridden


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--vocabulary", type=Path, default=VOCAB_PATH)
    parser.add_argument(
        "--retokenize",
        action="store_true",
        help="Re-split every word into syllables with PyThaiNLP instead of "
             "re-analyzing the stored split. Needs python-crfsuite, and "
             "changes the segmentation, not just the tones.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would change without writing the file",
    )
    args = parser.parse_args(argv)

    vocabulary: list[dict] = json.loads(args.vocabulary.read_text(encoding="utf-8"))
    before = [
        [s.get("tone") for s in (e.get("syllables") or [])] for e in vocabulary
    ]

    overrides = 0
    for entry in vocabulary:
        overrides += enrich_entry(entry, retokenize=args.retokenize)

    changed_syllables = sum(
        1
        for old, entry in zip(before, vocabulary)
        for previous, syllable in zip(old, entry["syllables"])
        if previous != syllable["tone"]
    )
    total = sum(len(e["syllables"]) for e in vocabulary)
    print(f"{len(vocabulary)} entries, {total} syllables")
    print(f"  tones changed:            {changed_syllables}")
    print(f"  of which romanization-led: {overrides}")

    if args.dry_run:
        print("dry run — nothing written")
        return 0

    args.vocabulary.write_text(
        json.dumps(vocabulary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote {args.vocabulary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
