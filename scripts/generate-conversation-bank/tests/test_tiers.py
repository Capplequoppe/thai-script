"""Tier construction, and the one way it could hand back a confident wrong answer.

`build_tiers` slices a rank-ordered word list. Slicing is forgiving: a list of
30 words sliced to 600 yields 30 and raises nothing, so a vocabulary that
failed to load most of its entries would produce a Tier claiming `size=600`
while holding 30 words. Every caller in this tool would then trust it.
"""

import pytest

from generate_conversation_bank.tiers import build_tiers

TEN_WORDS = [f"w{index}" for index in range(10)]


def test_refuses_a_vocabulary_too_short_to_fill_the_largest_tier() -> None:
    with pytest.raises(ValueError, match="fewer than the largest tier size"):
        build_tiers(ranked_words=TEN_WORDS, sizes=(4, 25))


def test_each_tier_holds_exactly_as_many_words_as_it_claims() -> None:
    tiers = build_tiers(ranked_words=TEN_WORDS, sizes=(4, 10))

    assert [(tier.number, tier.size, len(tier.words)) for tier in tiers] == [
        (1, 4, 4),
        (2, 10, 10),
    ]


def test_a_tier_is_a_prefix_of_the_ranked_words() -> None:
    smaller, larger = build_tiers(ranked_words=TEN_WORDS, sizes=(4, 10))

    # Every word a smaller tier allows, a larger one allows too. `generate_tier`
    # relies on this: it is why a larger tier re-proposes the smaller one's lines.
    assert smaller.allowed < larger.allowed
