"""Assembling and serializing the shipped bank file.

Ids are a stable hash of the entry's own Thai text and nothing else — not its
position in a generation run, not its tier. A re-run that produces a different
set of candidates therefore cannot renumber an entry whose text is unchanged,
which is the property that lets the bank be regenerated without invalidating
anything already reviewed.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable
from dataclasses import dataclass

from .filtering import normalize, tokenize

#: Phase 3 runs three-turn sessions, so a tier needs headroom not to be
#: exhausted mid-session by a well-matched learner.
MIN_ENTRIES_PER_TIER = 8

ID_PREFIX = "cs-"
_ID_HEX_LENGTH = 12


@dataclass(frozen=True)
class Candidate:
    """One line destined for the bank, before it is given an id.

    Generation only ever builds these from lines that cleared both the
    compliance filter and the quality gate — but `__main__.load_existing`
    also rebuilds them from an already-shipped file, which a human may have
    edited since. So this type asserts nothing about what a line has passed;
    the tests over the shipped bank are what hold that line.
    """

    tier: int
    thai: str
    english: str


def entry_id(thai: str) -> str:
    """A content-addressed id: same Thai text, same id, forever."""
    digest = hashlib.sha256(normalize(thai).encode("utf-8")).hexdigest()
    return f"{ID_PREFIX}{digest[:_ID_HEX_LENGTH]}"


def make_entry(candidate: Candidate) -> dict:
    thai = normalize(candidate.thai)
    return {
        "id": entry_id(thai),
        "tier": candidate.tier,
        "thai": thai,
        "english": normalize(candidate.english),
        "words": list(tokenize(thai)),
    }


def build_bank(candidates: Iterable[Candidate]) -> list[dict]:
    """Entries in a fixed order, one per distinct Thai text.

    Sorting by `(tier, id)` before de-duplicating means a text that somehow
    survived in two tiers is kept at the lower (more accessible) one, and that
    the output order depends only on the candidate *set*, never on the order
    the generator happened to emit it in.
    """
    entries = sorted(
        (make_entry(candidate) for candidate in candidates),
        key=lambda entry: (entry["tier"], entry["id"]),
    )

    deduped: dict[str, dict] = {}
    for entry in entries:
        deduped.setdefault(entry["id"], entry)
    return list(deduped.values())


def serialize_bank(entries: list[dict]) -> str:
    return json.dumps(entries, ensure_ascii=False, indent=2) + "\n"


def tier_counts(entries: Iterable[dict]) -> dict[int, int]:
    counts: dict[int, int] = {}
    for entry in entries:
        counts[entry["tier"]] = counts.get(entry["tier"], 0) + 1
    return counts
