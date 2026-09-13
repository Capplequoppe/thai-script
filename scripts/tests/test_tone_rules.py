"""Thai tone derivation in `scripts/enrich-vocabulary.py`, and the tones it
put into the shipped `vocabulary.json`.

Every case in `test_regressions` is one the previous implementation got
wrong. They are grouped by the defect that caused them, because the fixes
are independent and a future edit is far more likely to break one group
than all of them:

  * `_determine_tone` never looked at vowel length — it had an abandoned
    "we need actual vowel info to distinguish" branch and always fell
    through to `dead-long`;
  * the short-vowel set was missing mai han akat (ั) and mai taikhu (็);
  * a dead syllable with no written vowel was treated as long;
  * karan (์) was ignored, so a silenced consonant still counted as the
    final;
  * the last consonant was taken as the final even when it belonged to the
    onset — an initial cluster (ประ) or a ห นำ (แหละ);
  * `อ`/`ว` acting as vowels were read as finals, and vowel marks written
    after the final (ชาติ) were read as the syllable's vowel.

The shipped-data test asserts on `vocabulary.json` itself rather than on a
fixture, matching `generate-conversation-bank`'s `test_shipped_bank.py`:
the file is the deliverable, and the app reads these tones straight out of
it.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCRIPT = REPO_ROOT / "scripts" / "enrich-vocabulary.py"
VOCABULARY = (
    REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"
)


def _load_script():
    spec = importlib.util.spec_from_file_location("enrich_vocabulary", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


enrich = _load_script()


def tone_of(syllable: str) -> str | None:
    """The rule-derived tone, before any romanization cross-check."""
    return enrich.analyze_syllable(syllable)["tone"]


def rule_of(syllable: str) -> str:
    parsed = enrich.parse_syllable(syllable)
    assert parsed is not None
    return enrich._tone_rule_id(
        enrich._classify_consonant(parsed["initial"]), parsed
    )


# --- the rules, by the defect that used to break them ---------------------


@pytest.mark.parametrize(
    ("syllable", "tone"),
    [
        # mai han akat marks a short vowel: low class + dead + short = high
        ("รับ", "high"),
        ("วัด", "high"),
        ("นัก", "high"),
        # mai taikhu likewise
        ("เล็ก", "high"),
        # sara a
        ("และ", "high"),
        # no written vowel at all — the implicit vowel is short
        ("ลด", "high"),
        ("พบ", "high"),
        ("รถ", "high"),
        ("ยก", "high"),
        # genuinely long, and still falling
        ("ลูก", "falling"),
        ("มาก", "falling"),
    ],
)
def test_dead_syllable_vowel_length(syllable: str, tone: str) -> None:
    assert tone_of(syllable) == tone


@pytest.mark.parametrize(
    ("syllable", "tone"),
    [
        ("สัตว์", "low"),      # ว silenced -> dead, not a sonorant final
        ("ศิลป์", "rising"),   # ป silenced -> ล is the final, live
        ("สิงห์", "rising"),   # ห silenced -> ง is the final, live
        ("พิมพ์", "mid"),      # พ silenced -> ม is the final, live
        ("องค์", "mid"),
        ("สงฆ์", "rising"),
    ],
)
def test_karan_silences_its_consonant(syllable: str, tone: str) -> None:
    assert tone_of(syllable) == tone


@pytest.mark.parametrize(
    ("syllable", "tone"),
    [
        ("ประ", "low"),      # ปร is an onset cluster, so there is no final
        ("เพราะ", "high"),   # พร likewise
        ("ตรง", "mid"),      # ตร cluster, ง is the final -> live
        ("แหละ", "low"),     # ห นำ: high class, dead, short
        ("หน้า", "falling"),
        ("หนา", "rising"),
        ("อยาก", "low"),     # อ นำ: mid class
        ("กลัว", "mid"),     # onset cluster plus a real final
        ("ควาย", "mid"),     # คว is a cluster before a written vowel
        ("ควบ", "falling"),  # ...but here ว is the vowel /ua/
    ],
)
def test_onset_clusters_and_leading_consonants(syllable: str, tone: str) -> None:
    assert tone_of(syllable) == tone


@pytest.mark.parametrize(
    ("syllable", "tone"),
    [
        ("ชอบ", "falling"),  # medial อ is the long vowel, not a final
        ("ของ", "rising"),
        ("ตัว", "mid"),      # trailing ว IS the final, and live
        ("หัว", "rising"),
        ("เร็ว", "mid"),
        ("ชาติ", "falling"),  # the trailing ิ is silent, so the vowel is long
        ("บุตร", "low"),     # final ตร cluster is /t/, the ร is silent
        ("สูตร", "low"),
        ("เลิก", "falling"),  # เ-ิ- is the long vowel /ɤː/
        ("เกิด", "low"),
    ],
)
def test_vowel_like_consonants_and_silent_finals(syllable: str, tone: str) -> None:
    assert tone_of(syllable) == tone


@pytest.mark.parametrize(
    ("syllable", "tone"),
    [
        ("ข้าว", "falling"),
        ("ข่าว", "low"),
        ("ไม่", "falling"),
        ("ไหม้", "falling"),
        ("นี้", "high"),
        ("ค่ะ", "falling"),
    ],
)
def test_tone_marks_are_exceptionless(syllable: str, tone: str) -> None:
    assert tone_of(syllable) == tone


def test_tone_and_tone_rule_cannot_disagree() -> None:
    """The tone is derived from the rule id, so every unmarked syllable's
    tone is exactly what its rule says. The old code computed the two in
    separate functions and they diverged."""
    for syllable in ["รับ", "ลด", "ประ", "แหละ", "ลูก", "คน", "ตัว", "ชอบ"]:
        assert tone_of(syllable) == enrich.TONE_BY_RULE[rule_of(syllable)]


@pytest.mark.parametrize(
    ("syllable", "rule_id"),
    [
        ("รับ", "low-dead-short"),
        ("ลูก", "low-dead-long"),
        ("ประ", "mid-dead-short"),
        ("คน", "low-live"),
        ("หนา", "high-live"),
        ("ข้าว", "high-maytho"),
    ],
)
def test_tone_rule_ids(syllable: str, rule_id: str) -> None:
    assert rule_of(syllable) == rule_id


# --- the romanization cross-check ------------------------------------------


def test_romanization_overrides_only_unmarked_syllables() -> None:
    # เมตร is a loanword: the rules say falling, the transcriber says high,
    # and the transcriber is right because no tone mark constrains it.
    entry = {
        "thai": "เมตร",
        "romanization": "méet",
        "syllables": [{"text": "เมตร"}],
    }
    enrich.enrich_entry(entry, retokenize=False)
    assert entry["syllables"][0]["tone"] == "high"
    # ...but the rule it is read by is still the rule it is read by.
    assert entry["toneRules"] == ["low-dead-long"]


def test_romanization_never_overrides_a_marked_syllable() -> None:
    # ข้าว is transcribed `khàao` (low) in the shipped data, which is wrong:
    # high class + mai tho is falling, with no exceptions.
    entry = {
        "thai": "ข้าว",
        "romanization": "khàao",
        "syllables": [{"text": "ข้าว"}],
    }
    enrich.enrich_entry(entry, retokenize=False)
    assert entry["syllables"][0]["tone"] == "falling"


def test_untrustworthy_romanizations_are_refused() -> None:
    # A name-style transcription carries no accents; reading it would make
    # every syllable mid.
    assert enrich.romanized_tones("Rhong Hai") is None
    assert enrich.romanized_tones("") is None
    assert enrich.romanized_tones("khàao") == ("low",)
    assert enrich.romanized_tones("sǎa-mâat") == ("rising", "falling")


def test_a_syllable_count_mismatch_blocks_the_override() -> None:
    entry = {
        "thai": "เมตร",
        "romanization": "kì-loo-méet",   # three romanized syllables, one stored
        "syllables": [{"text": "เมตร"}],
    }
    enrich.enrich_entry(entry, retokenize=False)
    assert entry["syllables"][0]["tone"] == "falling"  # the rule's answer


# --- the shipped file -------------------------------------------------------


@pytest.fixture(scope="module")
def vocabulary() -> list[dict]:
    return json.loads(VOCABULARY.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def by_thai(vocabulary: list[dict]) -> dict[str, dict]:
    best: dict[str, dict] = {}
    for entry in sorted(vocabulary, key=lambda e: e.get("rank") or 10**9):
        best.setdefault(entry["thai"], entry)
    return best


@pytest.mark.parametrize(
    ("word", "tones"),
    [
        ("รับ", ["high"]),
        ("ทุก", ["high"]),
        ("และ", ["high"]),
        ("วัด", ["high"]),
        ("หน้า", ["falling"]),
        ("หนา", ["rising"]),
        ("ข้าว", ["falling"]),
        ("ขาว", ["rising"]),
        ("ข่าว", ["low"]),
        ("ไม่", ["falling"]),
        ("ไหม", ["rising"]),
        ("ใหม่", ["low"]),
        ("ตัว", ["mid"]),
        ("ก็", ["falling"]),
        ("สำเร็จ", ["rising", "low"]),
        ("จันทร์", ["mid"]),
    ],
)
def test_shipped_vocabulary_has_the_right_tones(
    by_thai: dict[str, dict], word: str, tones: list[str]
) -> None:
    assert [s["tone"] for s in by_thai[word]["syllables"]] == tones


def test_shipped_vocabulary_emits_only_known_tone_rule_ids(
    vocabulary: list[dict],
) -> None:
    """Every id must exist in `symbols.ts`, or the word can never unlock —
    `isWordMastered` looks each one up in the learner's mastered set."""
    known = set(enrich.TONE_BY_RULE) | {
        f"{cls}-{mark}" for cls, mark in enrich.TONE_BY_MARK
    }
    seen = {rule for entry in vocabulary for rule in entry["toneRules"]}
    assert seen <= known, seen - known


def test_shipped_vocabulary_agrees_with_its_own_romanizations(
    by_thai: dict[str, dict],
) -> None:
    """The two derivations agree on all but a small tail of words whose
    romanization is itself wrong or whose stored syllable split is. This
    guards the *rate*: it was 77.4% before the fix and is 99.76% after, and
    a regression that reintroduced any of the defects above would drop it
    well below the bound here."""
    compared = agreed = 0
    for entry in by_thai.values():
        romanized = enrich.romanized_tones(entry.get("romanization", ""))
        stored = [s["tone"] for s in entry["syllables"]]
        if not romanized or len(romanized) != len(stored):
            continue
        compared += 1
        agreed += list(romanized) == stored
    assert compared > 4000
    assert agreed / compared > 0.99, f"{agreed}/{compared}"
