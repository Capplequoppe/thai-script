"""Two deterministic defects the compliance filter cannot see.

The compliance filter answers one question — is every word in the tier? — and
AC1 pins it to that. A first generation run was fully compliant and still not
shippable, in two ways a machine can decide:

1. Lines mixing ครับ with ค่ะ/คะ. A speaker uses one gender's particle
   throughout; "สวัสดีครับ สบายดีมั้ยคะ" is not something a person says.
2. Lines that are not questions. "สบายมากครับ" is a compliant statement, and
   a conversation *starter* that invites no reply gives the learner nothing to
   answer.

Everything subtler than these — stilted phrasing, an odd thing to open with —
is still the human reviewer's job, not this module's.
"""

from __future__ import annotations

MALE_PARTICLES: tuple[str, ...] = ("ครับ", "คับ")
FEMALE_PARTICLES: tuple[str, ...] = ("ค่ะ", "คะ", "จ้ะ", "จ๊ะ")

#: A question is marked either by a final particle or by an interrogative word.
QUESTION_MARKERS: tuple[str, ...] = (
    "ไหม",
    "มั้ย",
    "หรือเปล่า",
    "รึเปล่า",
    "เหรอ",
    "หรือ",
    "อะไร",
    "ใคร",
    "ไหน",
    "ทำไม",
    "เท่าไหร่",
    "เท่าไร",
    "เมื่อไหร่",
    "เมื่อไร",
    "อย่างไร",
    "ยังไง",
    "กี่",
)


def quality_issues(thai: str) -> tuple[str, ...]:
    """Name every machine-detectable defect in a line. Empty means shippable."""
    issues: list[str] = []

    has_male = any(particle in thai for particle in MALE_PARTICLES)
    has_female = any(particle in thai for particle in FEMALE_PARTICLES)
    if has_male and has_female:
        issues.append("mixed-politeness-particles")

    if not any(marker in thai for marker in QUESTION_MARKERS):
        issues.append("not-a-question")

    return tuple(issues)
