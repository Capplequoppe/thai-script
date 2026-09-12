"""Tests for the conversation-starter bank and its per-learner selection.

Nothing here needs a GPU: which question a learner is asked is a property
of this code and of the committed bank file, not of any model. Every case
runs against the **real** `backend/data/conversationStarters.json` — a
hand-written miniature bank would prove the selection rule against content
that does not exist, and the thing most likely to go wrong (a real
learner's gappy vocabulary matching nothing) only shows up against real
entries.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import NamedTuple

import pytest

from app.bank import BANK_PATH, load_bank, select_entry

REPO_ROOT = Path(__file__).resolve().parents[2]
VOCABULARY_JSON = (
    REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"
)


# Every vocabulary word that has a frequency rank, most common first —
# the same ordering `scripts/generate-conversation-bank` tiers on, so a
# prefix of this list is the vocabulary a bank tier was generated from.
def _ranked_vocabulary() -> list[str]:
    entries = json.loads(VOCABULARY_JSON.read_text(encoding="utf-8"))
    ranked = sorted(
        (entry for entry in entries if entry.get("rank") is not None),
        key=lambda entry: entry["rank"],
    )
    words: list[str] = []
    seen: set[str] = set()
    for entry in ranked:
        word = entry["thai"].strip()
        if word and word not in seen:
            seen.add(word)
            words.append(word)
    return words


RANKED_VOCABULARY = _ranked_vocabulary()


class GappyVocabulary(NamedTuple):
    """What a learner knows, and the holes inside that range."""

    known: set[str]
    gaps: set[str]


def gappy_known_words(count: int, gap_every: int = 7) -> GappyVocabulary:
    """`count` known words, rank-ordered but with holes — a real learner.

    `VocabularyLessonService.getUnlockedWords()` gates each word on
    character and tone-rule mastery on top of rank, so a learner's known
    set is never the clean rank-ordered prefix a tier is. Dropping every
    `gap_every`-th ranked word reproduces that shape; `gaps` are the
    dropped words, which is what makes a case able to check that the
    holes actually matter.
    """
    known: list[str] = []
    gaps: list[str] = []
    index = 0
    while len(known) < count:
        if index >= len(RANKED_VOCABULARY):
            raise ValueError(f"vocabulary has fewer than {count} rankable words")
        target = known if index % gap_every != gap_every - 1 else gaps
        target.append(RANKED_VOCABULARY[index])
        index += 1
    return GappyVocabulary(set(known), set(gaps))


@pytest.fixture(scope="module")
def bank():
    return load_bank()


def test_the_shipped_bank_loads(bank):
    assert len(bank) > 0
    assert all(entry.words for entry in bank)
    assert BANK_PATH.exists()


def test_an_empty_bank_file_fails_at_load_not_per_request(tmp_path):
    empty = tmp_path / "conversationStarters.json"
    empty.write_text("[]", encoding="utf-8")

    with pytest.raises(ValueError, match="is empty"):
        load_bank(empty)


# ---------------------------------------------------------------------------
# AC1 — a realistic, gappy known-word set still selects a matching entry
# ---------------------------------------------------------------------------


def test_gappy_known_words_select_an_entry_built_only_from_them(bank):
    known, gaps = gappy_known_words(150)

    # The premise: the holes really do matter here — at least one bank
    # entry is ruled out by a word this learner skipped, not merely by one
    # ranked beyond them. Without this, the case below would pass for a
    # selection rule that never filtered on the known set at all.
    disqualified = [entry for entry in bank if not known.issuperset(entry.words)]
    assert any(word in gaps for entry in disqualified for word in entry.words), (
        "no entry is excluded by a *gap*; the holes are not exercising selection"
    )

    entry = select_entry(known, bank)

    # The whole point: gaps do not push a real learner off the end of the
    # bank. They get an entry, and every word in it is one they know.
    assert known.issuperset(entry.words)
    qualifying = [candidate for candidate in bank if known.issuperset(candidate.words)]
    assert entry.tier == max(candidate.tier for candidate in qualifying)


def test_selection_is_stable_for_the_same_learner(bank):
    known = gappy_known_words(150).known

    # Reloading /conversation asks the same question again, not a new one
    # every refresh — variety across a session is phase 3's job.
    assert select_entry(known, bank) == select_entry(set(known), bank)


# ---------------------------------------------------------------------------
# AC2 — tier is a difficulty tie-break among qualifying entries, not a gate
# ---------------------------------------------------------------------------


def test_the_highest_qualifying_tier_wins(bank):
    by_tier = {tier: [e for e in bank if e.tier == tier] for tier in (1, 2, 3)}
    chosen = [min(entries, key=lambda e: e.id) for entries in by_tier.values()]
    known = {word for entry in chosen for word in entry.words}

    # A learner who knows exactly enough for one entry in each of tiers
    # 1, 2 and 3 — all three qualify, so this is a real choice.
    qualifying = [entry for entry in bank if known.issuperset(entry.words)]
    assert {entry.tier for entry in qualifying} >= {1, 2, 3}

    entry = select_entry(known, bank)

    assert entry.tier == max(candidate.tier for candidate in qualifying)
    assert entry.tier > 1


# ---------------------------------------------------------------------------
# AC3 — nothing known yet resolves to the simplest exchange, never an error
# ---------------------------------------------------------------------------


def test_an_empty_known_word_set_returns_a_smallest_tier_entry(bank):
    entry = select_entry(set(), bank)

    assert entry.tier == min(candidate.tier for candidate in bank)
    assert entry.thai
    # Deliberately *not* an exception, a None, or a new "not enough
    # vocabulary yet" state: a brand-new learner gets the simplest real
    # exchange the bank holds.
    assert select_entry(set(), bank) == entry
