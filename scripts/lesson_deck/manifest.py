"""What the pipeline records about every asset it was asked to produce.

The manifest is the artifact the evidence is read from, so two properties are
structural rather than conventional:

**Three segment states, and they are distinct values.** A segment is `absent`
(never generated), `generated`, or `failed`. The manifest is seeded with every
declared segment in `absent` *before* any API call, and a segment moves out of
it exactly once. A run that dies halfway therefore leaves the segments it never
reached recorded as absent and the ones that failed recorded as failed — the
distinction a two-state manifest (present / missing) destroys, and the one that
decides whether a missing clip is a crash or a bad take.

**Verification is its own outcome, not a boolean.** `not-required` is what an
English segment gets; `verified` and `mismatch` are what a Thai segment gets
once it has been transcribed back. A boolean would make an unverified clip and
a clip nobody was ever going to verify the same value.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

SegmentState = Literal["absent", "generated", "failed"]

#: Declared in the manifest itself so a consumer in another language reads the
#: vocabulary off the artifact rather than restating it.
SEGMENT_STATES: tuple[SegmentState, ...] = ("absent", "generated", "failed")

VerificationOutcome = Literal["not-required", "verified", "mismatch"]

VERIFICATION_OUTCOMES: tuple[VerificationOutcome, ...] = (
	"not-required",
	"verified",
	"mismatch",
)

MANIFEST_VERSION = 1


class ManifestUnreadable(RuntimeError):
	"""A manifest that is present and cannot be read.

	A distinct outcome from there being no manifest yet, and deliberately so:
	collapsing the two makes a corrupt file read as an empty cache, and an
	empty cache is a confident instruction to re-voice the entire lesson.
	"""


@dataclass
class Verification:
	outcome: VerificationOutcome
	attempts: int = 0
	#: What the Thai segment was asked to say, and what each take came back as.
	#: Both are Thai text the pipeline itself supplied or heard, never vendor
	#: error text, so neither can carry a credential.
	expected: str | None = None
	heard: list[str] = field(default_factory=list)

	def to_json(self) -> dict[str, Any]:
		return {
			"outcome": self.outcome,
			"attempts": self.attempts,
			"expected": self.expected,
			"heard": list(self.heard),
		}


@dataclass
class AssetRecord:
	"""One clip or one image, and everything needed to decide whether it has to
	be produced again."""

	key: str
	kind: Literal["audio", "image"]
	state: SegmentState = "absent"
	language: Literal["en", "th"] | None = None
	#: Hash of the *inputs* — this is the cache key.
	input_hash: str = ""
	#: Hash of the bytes on disk. Guards against a cache hit on a file that has
	#: since been truncated or hand-edited.
	content_hash: str | None = None
	path: str | None = None
	file: str | None = None
	verification: Verification | None = None
	#: Why it failed, redacted. `None` unless `state` is `failed`.
	failure: str | None = None

	def to_json(self) -> dict[str, Any]:
		return {
			"key": self.key,
			"kind": self.kind,
			"state": self.state,
			"language": self.language,
			"inputHash": self.input_hash,
			"contentHash": self.content_hash,
			"path": self.path,
			"file": self.file,
			"verification": (
				self.verification.to_json() if self.verification else None
			),
			"failure": self.failure,
		}


@dataclass
class Manifest:
	lesson_id: str
	voice: dict[str, Any]
	assets: list[AssetRecord] = field(default_factory=list)

	def by_key(self, key: str) -> AssetRecord | None:
		return next((asset for asset in self.assets if asset.key == key), None)

	def to_json(self) -> dict[str, Any]:
		return {
			"lessonId": self.lesson_id,
			"schema": {
				"version": MANIFEST_VERSION,
				"segmentStates": list(SEGMENT_STATES),
				"verificationOutcomes": list(VERIFICATION_OUTCOMES),
			},
			"voice": self.voice,
			"assets": [asset.to_json() for asset in self.assets],
		}


def previous_assets(raw: object) -> dict[str, dict[str, Any]]:
	"""Every asset a prior run recorded as `generated`, by key.

	Only `generated` assets contribute: a failed take must be retried on the
	next run, not treated as a cache hit, which is the other half of why the
	failed state has to be distinguishable from the absent one.
	"""
	if not isinstance(raw, dict):
		return {}
	assets = raw.get("assets")
	if not isinstance(assets, list):
		return {}
	return {
		asset["key"]: asset
		for asset in assets
		if isinstance(asset, dict)
		and asset.get("state") == "generated"
		and isinstance(asset.get("key"), str)
		and isinstance(asset.get("inputHash"), str)
		and isinstance(asset.get("contentHash"), str)
	}


def verification_from_json(raw: object) -> Verification | None:
	"""Rehydrate a cached clip's verification outcome. A reused Thai clip keeps
	the `verified` it earned — recording it as `not-required` because this run
	did not transcribe it would make the cache quietly erase the evidence."""
	if not isinstance(raw, dict) or raw.get("outcome") not in VERIFICATION_OUTCOMES:
		return None
	heard = raw.get("heard")
	return Verification(
		outcome=raw["outcome"],
		attempts=raw.get("attempts", 0) if isinstance(raw.get("attempts"), int) else 0,
		expected=raw["expected"] if isinstance(raw.get("expected"), str) else None,
		heard=[item for item in heard if isinstance(item, str)]
		if isinstance(heard, list)
		else [],
	)
