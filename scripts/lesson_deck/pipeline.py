"""Script in, deck plus committed assets out.

Three things happen here and each is a property the tests read off the output.

**Caching is per segment, keyed on the segment's inputs.** Not on the script
file: a typo fix anywhere would then re-bill and re-voice the whole lesson, and
re-voicing is not idempotent — the same text comes back as different audio on a
later call, so a whole-file cache key silently rewrites every clip in a lesson
whenever one word changes. The key is the text, the language, the voice, the
model and the voice settings, and it is embedded in the filename so a changed
segment writes a new file and an unchanged one is not touched at all.

**Thai clips are transcribed back before they are accepted.** A wrong tone
teaches a mispronunciation, and the tone lessons are the product. A mismatch is
retried on a fresh seed — the same discipline `generate-sentence-audio.py`
records, where the defect is a property of the sampled trajectory rather than
of the text. A clip that still mismatches after every seed is recorded as
`failed`, and the deck is not written.

**A partial run never reads as a success.** The manifest records every segment
the run reached, so a failure is written down rather than inferred from a
missing file; the deck is written only when every segment reached `generated`;
and the exit code is non-zero unless both hold. A failing run leaves any
previous `deck.json` alone — it is the last deck whose every clip verified, and
its assets are still on disk because pruning only runs on success, so the
lesson keeps serving what it served before rather than nothing.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .ids import LessonPaths, RefusedPath
from .jsonio import write as write_json
from .manifest import (
	AssetRecord,
	Manifest,
	Verification,
	previous_assets,
	verification_from_json,
)
from .script_parser import LessonScript, Segment, Slide
from .vendor import Redactor, Vendor, VendorError, VoiceSpec

#: Bumped when a change to this file would make previously cached clips wrong.
#: Part of every cache key, so bumping it invalidates every asset at once.
PIPELINE_VERSION = 1

#: Seeds tried in order for a Thai clip that comes back saying the wrong thing.
#: Seed is the cheap axis and the only one that is a lever here: the sibling
#: sentence pipeline measured speed, and slowing delivery down made its defect
#: worse rather than better.
RETRY_SEEDS: tuple[int, ...] = (42, 1, 7)

#: Below this, two Thai strings are different utterances rather than one
#: utterance transcribed with a wobble.
TRANSCRIPT_MATCH_RATIO = 0.9

_NON_THAI = re.compile(r"[^฀-๿]+")


@dataclass
class RunReport:
	"""What the run did, for `--report` and for the tests that assert no API
	call was made on an unchanged script."""

	lesson_id: str
	synth_calls: int = 0
	transcribe_calls: int = 0
	reused: int = 0
	generated: int = 0
	failed: int = 0
	deck_written: bool = False
	errors: list[str] = field(default_factory=list)

	def to_json(self) -> dict[str, Any]:
		return {
			"lessonId": self.lesson_id,
			"synthCalls": self.synth_calls,
			"transcribeCalls": self.transcribe_calls,
			"reused": self.reused,
			"generated": self.generated,
			"failed": self.failed,
			"deckWritten": self.deck_written,
			"errors": list(self.errors),
		}


def content_hash(data: bytes) -> str:
	return hashlib.sha256(data).hexdigest()


def _input_hash(payload: dict[str, Any]) -> str:
	canonical = json.dumps(
		{"pipelineVersion": PIPELINE_VERSION, **payload},
		sort_keys=True,
		ensure_ascii=False,
		separators=(",", ":"),
	)
	return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def segment_input_hash(segment: Segment, spec: VoiceSpec) -> str:
	return _input_hash(
		{
			"kind": "audio",
			"text": segment.text,
			"language": segment.language,
			"voice": spec.to_json(),
		}
	)


def image_input_hash(source: bytes) -> str:
	return _input_hash({"kind": "image", "source": content_hash(source)})


def normalise_thai(text: str) -> str:
	"""Thai characters only. Whitespace, Latin text and punctuation are things
	a transcriber adds or drops freely and they carry no tone."""
	return _NON_THAI.sub("", text)


def transcript_matches(expected: str, heard: str) -> bool:
	import difflib  # noqa: PLC0415 — only needed on the Thai path

	left, right = normalise_thai(expected), normalise_thai(heard)
	if not left:
		return False
	if left == right:
		return True
	return difflib.SequenceMatcher(None, left, right).ratio() >= TRANSCRIPT_MATCH_RATIO


class DeckGenerator:
	def __init__(
		self,
		script: LessonScript,
		paths: LessonPaths,
		vendor: Vendor,
		spec: VoiceSpec,
		redactor: Redactor,
	) -> None:
		self.script = script
		self.paths = paths
		self.vendor = vendor
		self.spec = spec
		self.redactor = redactor
		self.report = RunReport(lesson_id=paths.lesson_id)
		self.manifest = Manifest(lesson_id=paths.lesson_id, voice=spec.to_json())
		self._cache = previous_assets(_read_json(self.manifest_path))

	# -- paths -------------------------------------------------------------

	@property
	def manifest_path(self) -> Path:
		return self.paths.resolve("manifest.json")

	@property
	def deck_path(self) -> Path:
		return self.paths.resolve("deck.json")

	# -- the run -----------------------------------------------------------

	def run(self) -> RunReport:
		"""Seed every declared asset as `absent`, move each one out of it
		exactly once, then write. The seeding is what makes "never generated"
		and "generation failed" different values rather than both being the
		absence of a record."""
		images = self._declare_images()
		for segment in self.script.segments:
			self.manifest.assets.append(
				AssetRecord(
					key=segment.key,
					kind="audio",
					language=segment.language,
					input_hash=segment_input_hash(segment, self.spec),
				)
			)
		self.manifest.assets.extend(record for record, _, _ in images.values())

		for slide in self.script.slides:
			for segment in slide.segments:
				self._produce_audio(segment)
		for record, relative, data in images.values():
			self._produce_image(record, relative, data)

		write_json(self.manifest_path, self.manifest.to_json())

		if self.report.failed == 0:
			write_json(self.deck_path, self._deck_json())
			self.report.deck_written = True
			self._prune_orphans()
		return self.report

	# -- audio -------------------------------------------------------------

	def _produce_audio(self, segment: Segment) -> None:
		record = self.manifest.by_key(segment.key)
		assert record is not None
		relative = f"audio/{segment.key}-{record.input_hash[:12]}.mp3"
		if self._reuse(record, relative):
			return

		heard: list[str] = []
		for attempt, seed in enumerate(RETRY_SEEDS, start=1):
			try:
				audio = self._synthesize(segment, seed)
			except VendorError as error:
				self._reject(record, attempt, segment, heard, str(error))
				continue
			if segment.language != "th":
				self._accept(
					record,
					relative,
					audio,
					Verification(outcome="not-required", attempts=attempt),
				)
				return
			spoken = self._transcribe(audio)
			if transcript_matches(segment.text, spoken):
				self._accept(
					record,
					relative,
					audio,
					Verification(
						outcome="verified",
						attempts=attempt,
						expected=segment.text,
						heard=[*heard, spoken],
					),
				)
				return
			heard.append(spoken)
			self._reject(
				record,
				attempt,
				segment,
				heard,
				f"transcribed back as something else on attempt {attempt}",
			)

		self.report.failed += 1

	def _synthesize(self, segment: Segment, seed: int) -> bytes:
		self.report.synth_calls += 1
		return self.vendor.synthesize(segment.text, segment.language, self.spec, seed)

	def _transcribe(self, audio: bytes) -> str:
		self.report.transcribe_calls += 1
		return self.vendor.transcribe(audio)

	def _reject(
		self,
		record: AssetRecord,
		attempt: int,
		segment: Segment,
		heard: list[str],
		reason: str,
	) -> None:
		"""Records the take that did not pass, and leaves the segment in
		`failed`: a later attempt overwrites it on success, so a run that dies
		mid-retry leaves the segment recorded as failed rather than as never
		attempted — which is the distinction the third state exists for.

		`verification` stays `None` when no transcript was ever obtained. A
		clip the vendor never returned did not fail its transcribe-back check;
		it never took one, and `failure` is where that is said.
		"""
		record.state = "failed"
		record.path = None
		record.file = None
		record.content_hash = None
		record.verification = (
			Verification(
				outcome="mismatch",
				attempts=attempt,
				expected=segment.text,
				heard=list(heard),
			)
			if heard
			else None
		)
		record.failure = self.redactor.redact(reason)
		self.report.errors.append(f"{record.key}: {record.failure}")

	def _accept(
		self,
		record: AssetRecord,
		relative: str,
		payload: bytes,
		verification: Verification,
	) -> None:
		self._write_asset(record, relative, payload)
		record.verification = verification
		record.failure = None
		self.report.generated += 1

	# -- images ------------------------------------------------------------

	def _declare_images(self) -> dict[str, tuple[AssetRecord, str, bytes]]:
		"""Illustrations are authored beside the script rather than generated
		by an API, so their cache key is the source bytes and re-running copies
		nothing. They still go through the same record, the same containment
		check and the same manifest as the clips."""
		declared: dict[str, tuple[AssetRecord, str, bytes]] = {}
		for slide in self.script.slides:
			source = slide.fields.get("image")
			if source is None:
				continue
			data = self._read_image(slide, source)
			digest = image_input_hash(data)
			suffix = Path(source).suffix or ".png"
			declared[slide.id] = (
				AssetRecord(
					key=f"{slide.id}-image", kind="image", input_hash=digest
				),
				f"images/{slide.id}-{digest[:12]}{suffix}",
				data,
			)
		return declared

	def _read_image(self, slide: Slide, source: str) -> bytes:
		path = (self.script.source.parent / source).resolve()
		if not path.is_file():
			raise RefusedPath(
				f"slide {slide.id!r}: image {source!r} is not a file next to the script"
			)
		return path.read_bytes()

	def _produce_image(
		self, record: AssetRecord, relative: str, data: bytes
	) -> None:
		if self._reuse(record, relative):
			return
		self._write_asset(record, relative, data)
		self.report.generated += 1

	# -- the write boundary ------------------------------------------------

	def _reuse(self, record: AssetRecord, relative: str) -> bool:
		"""A cache hit needs the recorded inputs *and* the bytes on disk to
		agree: a manifest entry for a file since truncated or hand-edited is
		not a hit, it is a corruption to redo."""
		cached = self._cache.get(record.key)
		if cached is None or cached["inputHash"] != record.input_hash:
			return False
		path = self.paths.resolve(relative)
		if not path.is_file() or content_hash(path.read_bytes()) != cached["contentHash"]:
			return False
		record.state = "generated"
		record.content_hash = cached["contentHash"]
		record.file = relative
		record.path = self.paths.url(relative)
		record.verification = verification_from_json(cached.get("verification"))
		self.report.reused += 1
		return True

	def _write_asset(self, record: AssetRecord, relative: str, payload: bytes) -> None:
		"""The one place bytes reach the filesystem. Containment is checked
		here rather than at the call sites, so there is a single point to
		audit — a path that escapes `public/lessons/<lessonId>/` is refused
		before the write, not after."""
		path = self.paths.resolve(relative)
		path.parent.mkdir(parents=True, exist_ok=True)
		path.write_bytes(payload)
		record.state = "generated"
		record.content_hash = content_hash(payload)
		record.file = relative
		record.path = self.paths.url(relative)
		record.failure = None

	def _prune_orphans(self) -> None:
		"""Drop files the manifest no longer references. Without this, editing
		one segment leaves its previous clip behind for ever — the filename
		carries the input hash, so a changed segment writes a *new* file."""
		kept = {
			self.paths.resolve(asset.file)
			for asset in self.manifest.assets
			if asset.file
		}
		for directory in ("audio", "images"):
			folder = self.paths.resolve(directory)
			if not folder.is_dir():
				continue
			for existing in folder.iterdir():
				if existing.is_file() and existing not in kept:
					existing.unlink()

	# -- the deck ----------------------------------------------------------

	def _deck_json(self) -> dict[str, Any]:
		return {
			"lessonId": self.paths.lesson_id,
			"title": self.script.title,
			"slides": [self._slide_json(slide) for slide in self.script.slides],
		}

	def _slide_json(self, slide: Slide) -> dict[str, Any]:
		body: dict[str, Any] = {"kind": slide.kind, "id": slide.id}
		if slide.kind == "exposition":
			body["heading"] = slide.fields.get("heading", "")
			body["body"] = list(slide.bullets)
		elif slide.kind == "retrieval":
			# Deliberately not `reveal`: the schema refuses a retrieval slide
			# carrying an answer-shaped key, because a prompt sitting beside
			# its answer is not a retrieval step.
			body["prompt"] = slide.fields.get("prompt", "")
			body["revealSlideId"] = slide.fields["reveal"]
		elif slide.kind == "reveal":
			body["retrievalSlideId"] = slide.fields["retrieval"]
			body["answers"] = list(slide.bullets)
		else:
			body["ruleId"] = slide.fields["rule"]

		audio = [
			asset.path
			for segment in slide.segments
			if (asset := self.manifest.by_key(segment.key)) and asset.path
		]
		if audio:
			body["audio"] = audio
		image = self.manifest.by_key(f"{slide.id}-image")
		if image and image.path:
			body["image"] = image.path
		return body


def _read_json(path: Path) -> object:
	if not path.is_file():
		return None
	try:
		return json.loads(path.read_text(encoding="utf-8"))
	except json.JSONDecodeError:
		return None


def generate(
	script: LessonScript,
	assets_root: Path,
	vendor: Vendor,
	spec: VoiceSpec,
	redactor: Redactor,
) -> RunReport:
	paths = LessonPaths.under(assets_root, script.lesson_id)
	return DeckGenerator(script, paths, vendor, spec, redactor).run()
