"""AC1 — the compliance filter, against fixed inputs with known verdicts.

The candidates and the tier here are hand-authored, not generated: the point is
to check the filter against verdicts decided by a human in advance, never to
re-run the filter's own predicate over the filter's own output.
"""

from generate_conversation_bank.filtering import check_compliance, tokenize

# A hand-authored stand-in for a vocabulary tier. Deliberately not a slice of
# the real vocabulary.json, so this test cannot start passing or failing
# because the app's word list was re-ranked.
FIXTURE_TIER = frozenset({"คุณ", "ชอบ", "กิน", "อะไร", "ไหม", "กับ", "เพื่อน", "วันนี้"})

# Every token is in FIXTURE_TIER. Known verdict: keep.
CLEAN_CANDIDATE = "วันนี้คุณกินอะไร"

# Tokenizes to คุณ / ชอบ / คุย / กับ / เพื่อน / ไหม. Only คุย is outside the
# tier, so the expected rejection is attributable to exactly one word.
OUT_OF_TIER_CANDIDATE = "คุณชอบคุยกับเพื่อนไหม"


def test_rejects_a_candidate_containing_a_word_outside_the_tier() -> None:
    result = check_compliance(OUT_OF_TIER_CANDIDATE, FIXTURE_TIER)

    assert result.compliant is False
    assert result.violations == ("คุย",)


def test_keeps_a_candidate_built_entirely_from_tier_words() -> None:
    result = check_compliance(CLEAN_CANDIDATE, FIXTURE_TIER)

    assert result.compliant is True
    assert result.violations == ()
    assert result.words == ("วันนี้", "คุณ", "กิน", "อะไร")


def test_records_the_tokens_of_a_kept_candidate_for_the_bank_entry() -> None:
    # The `words` a kept candidate carries forward must be the same
    # tokenization the filter judged it on, not a second, looser one.
    result = check_compliance(CLEAN_CANDIDATE, FIXTURE_TIER)

    assert result.words == tokenize(CLEAN_CANDIDATE)


def test_an_empty_candidate_is_not_compliant() -> None:
    # Nothing to check is not the same as everything checking out; an empty
    # line must never reach the bank as a "clean" entry.
    assert check_compliance("", FIXTURE_TIER).compliant is False
