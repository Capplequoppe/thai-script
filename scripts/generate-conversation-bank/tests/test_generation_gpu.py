"""AC5 — the real model + filter pipeline, run once, on real hardware.

Excluded from the default run by the `gpu` marker: it loads 7B of weights onto
a local GPU and takes minutes. It answers a different question from AC1 —
AC1 asks whether the filter is *correct*, this asks whether the pipeline
behind it produces *enough* usable content to be worth shipping.
"""

import pytest

from generate_conversation_bank.bank import MIN_ENTRIES_PER_TIER
from generate_conversation_bank.filtering import check_compliance
from generate_conversation_bank.generation import QwenChatModel, generate_tier
from generate_conversation_bank.tiers import build_tiers


@pytest.mark.gpu
def test_the_real_pipeline_fills_a_small_tier() -> None:
    # Tier 1 is the smallest, most constrained tier — the hardest case for
    # compliance, so it is the one worth measuring.
    tier = build_tiers()[0]

    candidates = generate_tier(QwenChatModel(), tier, min_entries=MIN_ENTRIES_PER_TIER)

    assert len(candidates) >= MIN_ENTRIES_PER_TIER
    for candidate in candidates:
        assert check_compliance(candidate.thai, tier.allowed).compliant
        assert candidate.english
