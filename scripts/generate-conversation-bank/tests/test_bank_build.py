"""AC4 — id assignment and serialization.

AC4a: fixed candidates in, byte-identical output, twice.
AC4b: an id is a function of the entry's own Thai text, so a re-run whose other
candidates changed cannot renumber an entry that did not.
"""

from generate_conversation_bank.bank import (
    Candidate,
    build_bank,
    entry_id,
    serialize_bank,
)

FIXED_CANDIDATES = [
    Candidate(tier=1, thai="วันนี้คุณกินอะไร", english="What did you eat today?"),
    Candidate(tier=1, thai="คุณชอบกินอะไร", english="What do you like to eat?"),
    Candidate(
        tier=2, thai="คุณไปบ้านเพื่อนไหม", english="Are you going to a friend's house?"
    ),
]


def test_fixed_candidates_serialize_byte_identically_across_two_runs() -> None:
    first = serialize_bank(build_bank(FIXED_CANDIDATES))
    second = serialize_bank(build_bank(FIXED_CANDIDATES))

    assert first == second


def test_candidate_order_does_not_change_the_serialized_output() -> None:
    # The generator emits candidates in whatever order the model produced them;
    # the shipped file must not record that accident.
    forwards = serialize_bank(build_bank(FIXED_CANDIDATES))
    backwards = serialize_bank(build_bank(list(reversed(FIXED_CANDIDATES))))

    assert forwards == backwards


def test_an_entrys_id_is_derived_from_its_own_thai_text() -> None:
    unchanged = FIXED_CANDIDATES[0]

    from_full_run = {entry["thai"]: entry["id"] for entry in build_bank(FIXED_CANDIDATES)}
    # A later run that produced completely different neighbours, plus one extra
    # entry sorting ahead of the unchanged one.
    rerun = [
        unchanged,
        Candidate(tier=1, thai="คุณทำอะไรอยู่", english="What are you doing?"),
        Candidate(tier=1, thai="คุณพูดไทยได้ไหม", english="Can you speak Thai?"),
    ]
    from_rerun = {entry["thai"]: entry["id"] for entry in build_bank(rerun)}

    assert from_rerun[unchanged.thai] == from_full_run[unchanged.thai]
    assert from_rerun[unchanged.thai] == entry_id(unchanged.thai)


def test_id_ignores_generation_order_and_tier() -> None:
    # Same text, different tier and different position: same id.
    assert entry_id("วันนี้คุณกินอะไร") == entry_id(" วันนี้คุณกินอะไร ")


def test_the_same_thai_text_yields_one_entry() -> None:
    duplicated = [*FIXED_CANDIDATES, FIXED_CANDIDATES[0]]

    assert len(build_bank(duplicated)) == len(FIXED_CANDIDATES)
