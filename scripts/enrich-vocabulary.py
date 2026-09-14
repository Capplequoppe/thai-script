"""
Enrich vocabulary.json with syllable breakdowns, tone rules, and character lists.

Applies Thai tone-rule logic matching the rule IDs in
`src/domain/script/data/symbols.ts`, and cross-checks the result against the
tone accents in each entry's own `romanization`.

## Two modes, and which interpreter to use

`--retokenize` re-splits every word into syllables and is what you want after
changing the splitter; without it the script re-analyzes the syllable splits
already stored and rewrites only what it derives from them. Either way it
needs `python-crfsuite` for PyThaiNLP's tokenizer:

    scripts/.venv/bin/python scripts/enrich-vocabulary.py --retokenize

(`scripts/generate-tone-minimal-pairs.py` is the other way round — its
`thaig2p` corroboration needs torch, which only `backend/.venv` carries.)

## Syllable splitting

PyThaiNLP's tokenizers return สบาย, ขนาด and ตลาด whole, because
orthographically they *are* one block. Phonetically each is two syllables
with two tones — sà-baai, kʰà-nàːt, tà-làat — and a learner asked "what tone
is สบาย" has to be asked about the right one. `split_prefix_syllable` takes
the split the tokenizer will not, and only where the opening consonant can be
nothing else: not half of an onset cluster, not ห นำ or อ นำ, not ร หัน, not
`อ`/`ว` acting as vowels.

## `toneStatus` — what may be asked

Every entry gets one of three verdicts, from comparing two independent
descriptions of the word: the taught tone rules applied to the Thai spelling,
and the tone accents in the romanization.

  * ``verified`` (87.8%) — both agree on the split and the rules reproduce the
    tone. Safe to quiz: the answer follows from what the learner was taught.
  * ``exception`` (3.7%) — the tone is known but no taught rule predicts it:
    ก็, loanwords like เมตร, and lexical อักษรนำ (สำเร็จ is governed, สำนัก
    is not).
  * ``unsegmented`` (8.5%) — the two disagree on how many syllables the word
    has, so no per-syllable tone can be trusted.

`toneSyllablesOf` in the app gates every tone question on `verified`, which
is the point of the field: applying a rule you were taught, correctly, and
being marked wrong is the failure this prevents.

## อักษรนำ

A bare high/mid consonant governs the class of a following single-class
sonorant: ขนาด is kʰà-nàːt, not kʰà-nâːt. Worth +66 words of agreement, and
it is *not* fully regular — ขนาด is governed, สมาชิก (sà-maa-chík) is not —
which is exactly why its output is corroborated rather than trusted.

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

# True onset clusters, listed as pairs rather than a cross product. The
# cross product this replaced treated ตล as a cluster, which made ตลาด one
# syllable when it is tà-làat — the ต is its own syllable carrying an
# unwritten vowel.
#
# The จร/ซร/ศร/สร entries are a different thing wearing the same shape: the
# ร is *silent* there (จริง is /tɕiŋ/), which the app teaches as its own
# special rule. They belong here because the pair is still one onset, not
# because anything is pronounced as a cluster.
ONSET_CLUSTERS = {
    "กร", "กล",
    "ขร", "ขล",
    "คร", "คล",
    "ตร",
    "ปร", "ปล",
    "ผล",
    "พร", "พล",
    "บร", "บล", "ดร", "ฟร", "ฟล",   # loanword onsets
    "ทร",                            # ทร is /s/ — one onset, one sound
    "จร", "ซร", "ศร", "สร",          # silent ร
}

# `ว` clusters (กว ขว คว) are deliberately NOT in the set above: they hold
# only before a written vowel. `ควาย` is /kʰwaːj/ with a คว onset, but `ควบ`
# is /kʰûap/ where the ว *is* the vowel, so they get their own branch below.
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
            or (lead + second) in ONSET_CLUSTERS
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
        # A syllable that is nothing but one consonant carries the unwritten
        # short /a/ of an open syllable — ส in ส+บาย is sà. That is DEAD and
        # SHORT, not the "live" that "no written vowel" otherwise defaults to,
        # and getting it wrong mis-toned every prefix syllable in the corpus.
        "barePrefix": len([c for c in source if c not in TONE_MARKS]) == 1,
        "initial": source[first],
        "final": source[final_index] if final_index is not None else None,
        "vowel": "".join(ch for ch in window if ch in VOWEL_CHARS) or None,
        "toneMark": _find_tone_mark(source),
        "hasShort": has_short,
        "hasLong": has_long,
    }


def _determine_syllable_type(parsed: dict[str, Any]) -> str:
    """'live' or 'dead' — a final sonorant or long vowel is live."""
    if parsed["barePrefix"]:
        return "dead"
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
        short = parsed["barePrefix"] or parsed["hasShort"] or not parsed["hasLong"]
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


# Vowels written before their consonant. In แสดง the แ belongs to the second
# syllable (sà-dɛːŋ), so it travels with the remainder rather than blocking
# the split.
LEADING_VOWELS = set("เแโใไ")

# The single-class low consonants a leading high/mid consonant can govern.
SINGLE_CLASS_SONORANTS = set("งญณนมยรลวฬ")


def split_prefix_syllable(token: str) -> list[str]:
    """Split a leading bare consonant off a token: สบาย -> ['ส', 'บาย'].

    PyThaiNLP's syllable tokenizers do not do this — every engine returns
    สบาย, ขนาด and ตลาด whole — because orthographically they *are* one
    block. Phonetically they are two syllables with two tones (sà-baai), and
    a learner asked "what tone is สบาย" has to be asked about the right one,
    so the split has to happen somewhere.

    A split is only taken when the opening consonant cannot be anything else:
    not half of an onset cluster, not ห นำ or อ นำ, not the ร of ร หัน, and
    not `อ`/`ว` (vowels in that position). The remainder must be able to
    stand as a syllable on its own once karan has silenced what it silences —
    องค์ is /ʔoŋ/, อ plus a silent ค, not อ + งค์.
    """
    if len(token) < 3:
        return [token]

    lead, body = "", token
    if (
        token[0] in LEADING_VOWELS
        and len(token) > 3
        and token[1] in THAI_CONSONANT_RANGE
        and token[2] in THAI_CONSONANT_RANGE
    ):
        lead, body = token[0], token[1:]

    if len(body) < 2:
        return [token]
    first, second = body[0], body[1]
    if first not in THAI_CONSONANT_RANGE or second not in THAI_CONSONANT_RANGE:
        return [token]
    if second in "อวฤฦ":
        return [token]
    if body[1:3] == "รร":
        return [token]
    if (
        (first == "ห" and second in LEADING_H_SECOND)
        or (first == "อ" and second == "ย")
        or (first + second) in ONSET_CLUSTERS
        or (second == "ว" and first in CLUSTER_W_FIRST)
    ):
        return [token]

    remainder = lead + body[1:]
    live = strip_karan(body[1:])
    if not any(ch in VOWEL_CHARS for ch in live) and (
        sum(ch in THAI_CONSONANT_RANGE for ch in live) < 2
    ):
        return [token]
    return [first, remainder]


def segment_word(word: str) -> list[str]:
    """Syllable texts for a word: PyThaiNLP, then the prefix split it misses."""
    from pythainlp.tokenize import syllable_tokenize

    segments: list[str] = []
    for token in syllable_tokenize(word):
        segments.extend(split_prefix_syllable(token))
    return segments


def apply_leading_consonant_rule(syllables: list[dict]) -> bool:
    """อักษรนำ: a bare high/mid consonant governs the next syllable's class.

    ขนาด is kʰà-nàːt, not kʰà-nâːt — the ข makes น read as high class, so the
    dead-long rule gives low rather than falling. It applies to a marked
    syllable too, changing which mark row is used: อร่อย is à-ràwy because
    the อ makes ร mid class under mai ek.

    Only the single-class low sonorants can be governed; only a *bare*
    prefix governs. The rule is not fully regular even then — ขนาด is
    governed but สมาชิก (sà-maa-chík) is not — which is why the tone it
    produces is corroborated against the romanization rather than trusted,
    and a word it gets wrong is recorded as an exception, not shipped as a
    question.
    """
    governed = False
    for index in range(1, len(syllables)):
        previous, current = syllables[index - 1], syllables[index]
        if len(previous["text"]) != 1 or not previous["consonantClass"]:
            continue
        if previous["consonantClass"] not in ("high", "mid"):
            continue
        parsed = parse_syllable(current["text"])
        if parsed is None or parsed["initial"] not in SINGLE_CLASS_SONORANTS:
            continue
        current["consonantClass"] = previous["consonantClass"]
        current["tone"] = _tone_from_rule(previous["consonantClass"], parsed)
        governed = True
    return governed


# Reading rules from `symbols.ts`'s `specialRules` that this analyser relies
# on. A word listing one of these cannot be read correctly without it, so the
# app must not ask for its tone until the lesson that introduces it is done —
# see `VocabEntry.specialRules`.
SILENT_RO_ONSETS = {"จร", "ซร", "ศร", "สร"}


def special_rules_for(texts: list[str], governed: bool) -> list[str]:
    """Which taught reading rules a word's syllables depend on."""
    needed: set[str] = set()
    if governed:
        needed.add("akson-nam")

    for text in texts:
        if KARAN in text:
            needed.add("gaaran")
        if "รร" in text:
            needed.add("ror-han")

        source = strip_karan(text)
        if not any(ch in VOWEL_CHARS for ch in source):
            needed.add("unwritten-vowels")

        positions = [
            i for i, ch in enumerate(source) if ch in THAI_CONSONANT_RANGE
        ]
        if len(positions) > 1 and positions[1] == positions[0] + 1:
            pair = source[positions[0]] + source[positions[1]]
            if pair[0] == "ห" and pair[1] in LEADING_H_SECOND:
                needed.add("hor-nam")
            elif pair == "ทร":
                needed.add("tho-ro-s-sound")
            elif pair in SILENT_RO_ONSETS:
                needed.add("silent-ro-clusters")

    return sorted(needed)


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


def enrich_entry(entry: dict, *, retokenize: bool) -> str:
    """Add characters, syllables, toneRules and toneStatus. Returns the status."""
    thai_word = entry.get("thai", "")

    entry["characters"] = get_thai_characters(thai_word)

    if retokenize:
        texts = segment_word(thai_word)
    else:
        # The stored split is kept as-is; only what is derived from each
        # syllable's text is recomputed.
        texts = [s["text"] for s in entry.get("syllables") or []]

    entry["syllables"] = [analyze_syllable(text) for text in texts]
    governed = apply_leading_consonant_rule(entry["syllables"])
    entry["specialRules"] = special_rules_for(texts, governed)

    # What the taught rules alone predict, before the romanization is allowed
    # a word. This is the half that decides `toneStatus`: a learner can only
    # be *expected* to answer what the rules they were taught produce.
    predicted = tuple(s["tone"] for s in entry["syllables"])

    apply_romanized_tones(entry)
    actual = tuple(s["tone"] for s in entry["syllables"])

    entry["toneStatus"] = tone_status(entry, predicted, actual)

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

    return entry["toneStatus"]


def tone_status(
    entry: dict, predicted: tuple, actual: tuple
) -> str:
    """How much this word's tones can be trusted, and therefore asked about.

    Three states, and the distinction between them is the whole point:

      * ``verified`` — the syllable split is corroborated by the romanization
        and the taught rules reproduce the tone. Safe to quiz: the answer is
        derivable from what the learner was taught.
      * ``exception`` — the split is corroborated and the tone is known, but
        no taught rule predicts it (ก็, loanwords like เมตร, lexical อักษรนำ
        like สำเร็จ). Safe to *show*, but asking for it without saying so
        teaches the learner that a rule they applied correctly is wrong.
      * ``unsegmented`` — the two sources disagree on how many syllables the
        word has, so nothing about its per-syllable tones can be trusted.
        Never quiz it.
    """
    romanized = romanized_tones(entry.get("romanization", ""))
    if not romanized or len(romanized) != len(actual) or not actual:
        return "unsegmented"
    if any(tone is None for tone in actual):
        return "unsegmented"
    return "verified" if predicted == actual else "exception"


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

    statuses: dict[str, int] = {}
    for entry in vocabulary:
        status = enrich_entry(entry, retokenize=args.retokenize)
        statuses[status] = statuses.get(status, 0) + 1

    changed_syllables = sum(
        1
        for old, entry in zip(before, vocabulary)
        for previous, syllable in zip(old, entry["syllables"])
        if previous != syllable["tone"]
    )
    total = sum(len(e["syllables"]) for e in vocabulary)
    print(f"{len(vocabulary)} entries, {total} syllables")
    print(f"  tones changed: {changed_syllables}")
    for name in ("verified", "exception", "unsegmented"):
        count = statuses.get(name, 0)
        print(f"  {name:12}: {count:5}  {count * 100 / len(vocabulary):5.1f}%")

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
