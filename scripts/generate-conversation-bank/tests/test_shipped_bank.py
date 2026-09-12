"""AC2 and AC6 — the shipped backend/data/conversationStarters.json.

These assert on the file that actually ships, not on a fixture, because the
file is the deliverable: the backend (task 2.3) reads it directly and does its
selection as a set operation over each entry's `words`, with no tokenizer of
its own.
"""

import json

import pytest

from generate_conversation_bank.bank import MIN_ENTRIES_PER_TIER, entry_id
from generate_conversation_bank.filtering import tokenize
from generate_conversation_bank.paths import BANK_JSON
from generate_conversation_bank.tiers import TIER_SIZES, build_tiers

REQUIRED_KEYS = {"id", "tier", "thai", "english", "words"}


@pytest.fixture(scope="module")
def bank() -> list[dict]:
    return json.loads(BANK_JSON.read_text(encoding="utf-8"))


def test_the_bank_is_a_json_list_of_entries(bank: list[dict]) -> None:
    assert isinstance(bank, list)
    assert bank


def test_every_entry_has_the_shape_the_backend_reads(bank: list[dict]) -> None:
    for entry in bank:
        assert set(entry) == REQUIRED_KEYS, entry
        assert isinstance(entry["id"], str) and entry["id"]
        assert isinstance(entry["thai"], str) and entry["thai"]
        assert isinstance(entry["english"], str) and entry["english"]
        assert isinstance(entry["tier"], int) and not isinstance(entry["tier"], bool)
        assert entry["tier"] > 0
        assert isinstance(entry["words"], list)
        assert all(isinstance(word, str) and word for word in entry["words"])


def test_every_entrys_words_are_the_tokenization_of_its_thai(bank: list[dict]) -> None:
    for entry in bank:
        assert tuple(entry["words"]) == tokenize(entry["thai"]), entry["id"]


def test_every_entrys_id_matches_the_hash_of_its_thai(bank: list[dict]) -> None:
    for entry in bank:
        assert entry["id"] == entry_id(entry["thai"])


def test_entry_ids_are_unique(bank: list[dict]) -> None:
    ids = [entry["id"] for entry in bank]

    assert len(set(ids)) == len(ids)


def test_every_tier_holds_at_least_the_minimum_number_of_entries(
    bank: list[dict],
) -> None:
    # AC6: phase 3 runs three-turn sessions, so a tier must not be exhaustible
    # mid-session.
    counts = {tier: 0 for tier in range(1, len(TIER_SIZES) + 1)}
    for entry in bank:
        counts[entry["tier"]] = counts.get(entry["tier"], 0) + 1

    assert all(count >= MIN_ENTRIES_PER_TIER for count in counts.values()), counts


def test_no_entry_uses_a_word_outside_its_own_tier(bank: list[dict]) -> None:
    # Not a test of the filter — AC1 covers that against known verdicts. This
    # guards the shipped file against a hand-edit made during the AC3 human
    # review that quietly reintroduces an out-of-tier word.
    allowed_by_tier = {tier.number: tier.allowed for tier in build_tiers()}

    for entry in bank:
        outside = [
            word for word in entry["words"] if word not in allowed_by_tier[entry["tier"]]
        ]
        assert not outside, f"{entry['id']} uses {outside} outside tier {entry['tier']}"
