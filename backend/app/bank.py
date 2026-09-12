"""The conversation-starter bank, and selection over it by what a learner knows.

The AI's own turns are never generated live (the plan's CONTEXT.md records
the spike that measured live constrained generation at 0/5 clean samples).
They come from `backend/data/conversationStarters.json`, written offline by
`scripts/generate-conversation-bank` and read once at startup by
`app.main`'s lifespan.

Selection is **per entry**, not per tier. A learner's known words are
rank-ordered but *gappy* — `VocabularyLessonService.getUnlockedWords()`
additionally gates each word on character/tone-rule mastery — so "the
largest tier whose every word is known" would fall through to nothing for
almost every real learner. Instead the whole bank is filtered to entries
whose own `words` are a subset of the known set (the same shape as
`sentences.json`'s `getUnlockedSentences`), and `tier` is only a
difficulty tie-break among the entries that already qualify.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path

BANK_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "conversationStarters.json"
)


@dataclass(frozen=True)
class BankEntry:
    """One pre-generated opening question.

    `words` is the `newmm` tokenization the generator's own compliance
    filter already computed — compounds included, so `กินข้าว` is one
    token and a learner who knows `กิน` and `ข้าว` separately does not
    match it. That is what lets selection here be a set operation with no
    tokenizer dependency of its own.
    """

    id: str
    tier: int
    thai: str
    english: str
    words: tuple[str, ...]


def load_bank(path: Path | None = None) -> tuple[BankEntry, ...]:
    """Read and validate the bank file. Called once, at startup."""
    source = path or BANK_PATH
    raw = json.loads(source.read_text(encoding="utf-8"))
    entries = tuple(
        BankEntry(
            id=item["id"],
            tier=int(item["tier"]),
            thai=item["thai"],
            english=item["english"],
            words=tuple(item["words"]),
        )
        for item in raw
    )
    if not entries:
        # An empty bank has no question to ask, so every opening request
        # would fail one at a time. Fail at startup instead, where it is
        # one loud error rather than a puzzling 500 per learner.
        raise ValueError(f"conversation-starter bank at {source} is empty")
    return entries


def select_entry(known_words: Iterable[str], bank: Sequence[BankEntry]) -> BankEntry:
    """Pick the opening question for a learner with `known_words`.

    Qualifying entries are those built entirely from words this learner
    knows; among them the highest `tier` wins (difficulty tie-break). A
    learner who qualifies for nothing — including a brand-new one with no
    known words at all — gets a smallest-tier entry, which is a minimal
    but real exchange, never an error or an empty response.

    The final pick is a hash of the known-word set, not `random.choice`:
    reloading `/conversation` before phase 3's session concept exists asks
    the same question again rather than a different one every refresh.
    """
    known = set(known_words)
    qualifying = [entry for entry in bank if known.issuperset(entry.words)]
    if qualifying:
        hardest = max(entry.tier for entry in qualifying)
        candidates = [entry for entry in qualifying if entry.tier == hardest]
    else:
        simplest = min(entry.tier for entry in bank)
        candidates = [entry for entry in bank if entry.tier == simplest]
    candidates.sort(key=lambda entry: entry.id)
    return candidates[_stable_index(known, len(candidates))]


def _stable_index(known: set[str], modulus: int) -> int:
    """An index into `modulus` candidates, stable across processes.

    `hash()` is deliberately not used: PYTHONHASHSEED randomizes it per
    process, so the same learner would get a different question every time
    the backend restarts.
    """
    digest = hashlib.sha256("\n".join(sorted(known)).encode("utf-8")).digest()
    return int.from_bytes(digest, "big") % modulus
