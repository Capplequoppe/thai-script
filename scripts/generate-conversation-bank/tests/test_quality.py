"""The two defects the compliance filter cannot see.

Fixed, hand-authored lines with verdicts decided in advance — every one of
these is a real line the first generation run produced, fully tier-compliant
and still not shippable.
"""

from generate_conversation_bank.quality import quality_issues


def test_rejects_a_line_mixing_male_and_female_politeness_particles() -> None:
    assert "mixed-politeness-particles" in quality_issues("สวัสดีครับ สบายดีมั้ยคะ")


def test_rejects_a_statement_that_invites_no_answer() -> None:
    assert "not-a-question" in quality_issues("สบายมากครับ")


def test_accepts_a_question_with_a_consistent_particle() -> None:
    assert quality_issues("คุณสบายดีไหมครับ") == ()


def test_accepts_a_question_marked_by_an_interrogative_word() -> None:
    assert quality_issues("ชอบกินอะไรคะ") == ()
