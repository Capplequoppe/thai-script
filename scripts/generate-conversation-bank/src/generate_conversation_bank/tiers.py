"""Vocabulary tiers: rank-ordered slices of the app's own vocabulary.json.

Tier sizes are the sizes the pre-plan spike actually measured compliance
against (80/150/250/400/600), so the bank inherits that evidence rather than
inventing fresh, unverified cut-offs.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .paths import VOCABULARY_JSON

TIER_SIZES: tuple[int, ...] = (80, 150, 250, 400, 600)


@dataclass(frozen=True)
class Tier:
    """One vocabulary tier: its 1-based number and the words it allows."""

    number: int
    size: int
    words: tuple[str, ...]

    @property
    def allowed(self) -> frozenset[str]:
        return frozenset(self.words)


def load_ranked_words(path: Path | None = None) -> list[str]:
    """Every vocabulary word, ordered by the `rank` field, most common first."""
    entries = json.loads((path or VOCABULARY_JSON).read_text(encoding="utf-8"))
    # Some vocabulary entries carry no frequency rank at all. A tier is defined
    # as "the first N words by rank", so an unranked word belongs to no tier.
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


def build_tiers(
    ranked_words: list[str] | None = None,
    sizes: tuple[int, ...] = TIER_SIZES,
) -> list[Tier]:
    """Tier N allows the first `sizes[N - 1]` ranked words."""
    words = ranked_words if ranked_words is not None else load_ranked_words()
    return [
        Tier(number=index + 1, size=size, words=tuple(words[:size]))
        for index, size in enumerate(sizes)
    ]
