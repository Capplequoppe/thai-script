"""The compliance filter.

This is the spike's own compliance *measurement* — newmm tokenization plus an
allowed-word-set check — reused verbatim as this tool's *selection* step. There
is deliberately no second implementation: a candidate is kept only when every
token of its Thai text is a word the tier allows.

`tokenize` is also the single definition of an entry's `words` list, which is
what lets the live backend's selection be a pure set operation with no
tokenizer dependency of its own. Note that `bank.make_entry` calls `tokenize`
again rather than reusing the tokens from a `FilterResult`: deriving `words`
from `thai` at serialization time is what keeps `words == tokenize(thai)` true
for an entry a human hand-edited after the review step, not only for one this
tool generated.
"""

from __future__ import annotations

import unicodedata
from collections.abc import Iterable
from dataclasses import dataclass

from pythainlp.tokenize import word_tokenize

# Punctuation and spacing are not vocabulary, so they are neither checked
# against the tier nor recorded as words. Anything else a tokenizer emits is a
# token the tier has to allow.
_IGNORABLE_CHARS = frozenset(" \t\r\n ​?!.,;:\"'()[]{}-–—…")


def normalize(text: str) -> str:
    """Collapse a candidate to the canonical form everything else keys on."""
    return " ".join(unicodedata.normalize("NFC", text).split())


def _is_ignorable(token: str) -> bool:
    return all(char in _IGNORABLE_CHARS for char in token)


def tokenize(text: str) -> tuple[str, ...]:
    """The canonical tokenization: newmm, minus spacing and punctuation."""
    tokens = word_tokenize(normalize(text), engine="newmm")
    return tuple(token for token in tokens if not _is_ignorable(token))


@dataclass(frozen=True)
class FilterResult:
    """Why a candidate was kept or rejected, and its tokens either way."""

    compliant: bool
    words: tuple[str, ...]
    violations: tuple[str, ...]


def check_compliance(text: str, allowed: Iterable[str]) -> FilterResult:
    """Tokenize `text` and report every token the tier does not allow."""
    allowed_set = frozenset(allowed)
    words = tokenize(text)
    violations = tuple(dict.fromkeys(word for word in words if word not in allowed_set))
    return FilterResult(
        compliant=bool(words) and not violations,
        words=words,
        violations=violations,
    )
