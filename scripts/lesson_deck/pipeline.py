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
from collections.abc import Callable, Iterable
from typing import Any

from .ids import LessonPaths, RefusedPath
from .jsonio import write as write_json
from .manifest import (
	AssetRecord,
	Manifest,
	ManifestUnreadable,
	Verification,
	previous_assets,
	verification_from_json,
)
from .script_parser import LessonScript, Segment, Slide
from .vendor import (
	Redactor,
	Vendor,
	VendorError,
	VoiceSpec,
	normalise_thai,
	strip_markup,
)

#: Bumped when a change to this file would make previously cached clips wrong.
#: Part of every cache key, so bumping it invalidates every asset at once.
# 3: consecutive English narration lines on a slide are merged into one call
# before synthesis (`script_parser._merge_runs`), so a paragraph is one
# continuous utterance rather than several with the prosody reset between them.
# (2 was a silence trim, reverted: measured before and after, it removed
# nothing.) The input hash covers text, language and voice, so a merged run
# rehashes on its own — but the bump also clears the version-2 clips.
# 4: English narration is slowed to `vendor.ENGLISH_TEMPO` after synthesis, and
# a merged run now keeps its authored line breaks instead of being flattened to
# one line. Both change the bytes without changing text, language or voice — the
# three things the input hash covers — so without this bump nothing would
# regenerate.
# 5: the English reference is now short and slow (see
# `make-english-reference.py`), and `vendor.ENGLISH_TEMPO` joined the English
# cache key so a tempo change regenerates rather than silently doing nothing.
# The reference digest covers the clip itself, so this bump is really only
# clearing version 4's clips.
# 6: English is packed into clips of at most `MAX_MERGED_WORDS` instead of
# being merged without limit. Version 5's clips ran to 80 and 90 seconds and
# accelerated through them; see the constant for the measurements.
# 7: the English engine is Fish Audio S2 Pro instead of Qwen3-TTS, the English
# narrator is her own speaker instead of a clone of the Thai voice, and the
# `atempo` stretch is gone. The first two are in the English cache key already,
# so this bump is mostly belt and braces — but the third is not: dropping the
# stretch changes the bytes without changing text, language or voice, which is
# exactly the case the version exists to catch. English markup also reaches the
# engine now rather than being stripped, which changes delivery without
# changing the stored text.
PIPELINE_VERSION = 7

#: Seeds tried in order for a Thai clip that comes back saying the wrong thing.
#: Seed is the cheap axis and the only one that is a lever here: the sibling
#: sentence pipeline measured speed, and slowing delivery down made its defect
#: worse rather than better.
# Eight, not three. Short Thai has high variance against the transcriber: a
# letter name such as `มอ ม้า` comes back as `หมอ ม้า` — `มอ` is not a word on
# its own, so the transcriber substitutes the one that is — and that scores
# 0.909 against a 0.9 threshold. The clip is right and the check is only just
# convinced, so the run needs enough attempts to find one it accepts.
#
# Cheap now in a way it was not before: clips are content-addressed, so a text
# is attempted until it verifies *once* and every later use of it reuses that
# file rather than rolling again.
RETRY_SEEDS: tuple[int, ...] = (42, 1, 7, 13, 99, 2024, 5, 77)

#: Below this, two Thai strings are different utterances rather than one
#: utterance transcribed with a wobble.
TRANSCRIPT_MATCH_RATIO = 0.9


#: Called with a snapshot after each asset: `key`, `done`, `total`, and the
#: run's `generated` / `reused` / `failed` counts so far.
#:
#: A dict rather than positional arguments because the interesting fields were
#: not obvious in advance — the first version passed the asset's *state*, which
#: cannot answer the question a watcher actually asks. A reused asset is
#: recorded as "generated", correctly, since that is what it is from the deck's
#: point of view; only the run's own counters know it came from cache.
ProgressCallback = Callable[[dict[str, Any]], None]


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
	#: Left untouched because the build was scoped to other clips. Not a
	#: failure — nothing was attempted — but not a finished lesson either,
	#: which is why the deck is withheld when this is non-zero.
	skipped: int = 0
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
			"skipped": self.skipped,
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
	if segment.recording is not None:
		# Keyed by the file's bytes rather than by its path or by a voice: a
		# recording is not made by any engine, so naming one in its key would
		# claim something untrue, and re-recording the source must replace the
		# clip while merely moving the file must not.
		return _input_hash(
			{
				"kind": "audio",
				"text": segment.text,
				"language": segment.language,
				"recording": content_hash(segment.recording.read_bytes()),
			}
		)
	return _input_hash(
		{
			"kind": "audio",
			"text": segment.text,
			"language": segment.language,
			"voice": spec.for_language(segment.language),
		}
	)


def image_input_hash(source: bytes) -> str:
	return _input_hash({"kind": "image", "source": content_hash(source)})


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
		force_keys: Iterable[str] | None = None,
		on_progress: ProgressCallback | None = None,
	) -> None:
		self.script = script
		self.paths = paths
		self.vendor = vendor
		self.spec = spec
		self.redactor = redactor
		self.report = RunReport(lesson_id=paths.lesson_id)
		self.manifest = Manifest(lesson_id=paths.lesson_id, voice=spec.to_json())
		self._cache = previous_assets(_read_prior_manifest(self.manifest_path))
		#: Keys to rebuild whatever the cache says. Empty for an ordinary run.
		self.force_keys: frozenset[str] = frozenset(force_keys or ())
		#: Told about each asset as it is finished. Optional, and deliberately
		#: not a logger: a build is minutes long and a caller that wants to show
		#: progress needs the events, not a stream of text to parse back.
		self._on_progress = on_progress
		#: Clips already produced *this run*, by input hash. Two segments with
		#: the same text are the same clip; see `_produce_audio`.
		self._produced: dict[str, AssetRecord] = {}

	# -- paths -------------------------------------------------------------

	@property
	def manifest_path(self) -> Path:
		return self.paths.resolve("manifest.json")

	@property
	def deck_path(self) -> Path:
		return self.paths.resolve("deck.json")

	# -- the run -----------------------------------------------------------

	def _report(self, key: str, done: int, total: int) -> None:
		"""Tell a watching caller that `key` is finished, whatever happened.

		Never allowed to break the build: a caller whose UI has gone away, or
		whose queue is full, must not take a half-finished deck down with it.
		"""
		if self._on_progress is None:
			return
		try:
			self._on_progress({
				"key": key,
				"done": done,
				"total": total,
				"generated": self.report.generated,
				"reused": self.report.reused,
				"failed": self.report.failed,
			})
		except Exception:  # noqa: BLE001 — progress is never worth a failed run
			pass

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

		total = len(self.script.segments) + len(images)
		done = 0

		# Thai first, then English, rather than in slide order.
		#
		# This began as a memory fix. Thai used to come from a metered vendor
		# and be verified by whisper on the GPU (~5 GB) while English was
		# generated by a local engine measured at 19.7 GB of a 24 GB card. In
		# slide order the first English line loaded the big engine and a later
		# Thai line then asked whisper for memory that was no longer there,
		# failing a build that either phase alone would have finished.
		#
		# That particular collision is gone: one engine now voices both
		# languages and the verifier runs on the CPU, so nothing competes for
		# the card and no ordering could break it. The order is kept because
		# it is still the right one to fail in. Thai is the half that can fail
		# — it is checked, and English is accepted as `not-required` — so
		# putting it first means a lesson whose Thai cannot be voiced says so
		# in its first minute rather than after every English clip has been
		# generated for a deck that will not be written.
		ordered = [
			segment
			for slide in self.script.slides
			for segment in slide.segments
			if segment.language == "th"
		] + [
			segment
			for slide in self.script.slides
			for segment in slide.segments
			if segment.language != "th"
		]

		released = False
		for segment in ordered:
			if not released and segment.language != "th":
				# Last Thai clip is behind us; hand the card back before the
				# English engine asks for most of it.
				self._release_transcriber()
				released = True
			self._produce_audio(segment)
			done += 1
			self._report(segment.key, done, total)
		self._adopt_late_twins()

		if images:
			# The narration engine and the image model do not fit on this card
			# together — 19.7 GB against roughly six on a 24 GB board. The
			# studio already stands the engine down before a render for exactly
			# this reason; a command-line build needs the same courtesy, and
			# without it a lesson with pictures dies at the first one.
			self._release_english()

		for record, relative, data in images.values():
			self._produce_image(record, relative, data)
			done += 1
			self._report(record.key, done, total)

		write_json(self.manifest_path, self.manifest.to_json())

		# A skipped clip is as disqualifying as a failed one, and for a reason
		# that is not obvious: a slide's `audio` is a positional array, so a
		# segment that produced nothing does not leave a gap — it shortens the
		# array and slides every later clip onto the wrong line. A scoped
		# rebuild that wrote a deck therefore shipped a lesson whose narration
		# was silently misaligned, which is worse than one that plainly has no
		# audio. Withholding the deck keeps the previous good one in place.
		if self.report.failed == 0 and self.report.skipped == 0:
			write_json(self.deck_path, self._deck_json())
			self.report.deck_written = True
			self._prune_orphans()
		return self.report

	def _adopt_late_twins(self) -> None:
		"""A segment that failed adopts a clip another segment later produced
		for the very same text.

		`_produce_audio` consults `_produced` before synthesising, so a repeated
		text reuses the first accepted clip — but only if that first one was
		accepted. When it fails, the next segment with the same text starts
		over from seed one, and it can succeed where the first did not: the
		vendor's seed is not reliably deterministic, so the same request twice
		is genuinely two rolls.

		Observed, not theorised. `มอ ม้า` failed all eight seeds on one slide
		and was accepted on the first attempt on the next, and the run then
		refused to write a deck over a segment whose audio was sitting on disk,
		verified, under a content-addressed name.

		Content-addressing is the whole argument for this: a clip *is* its text,
		language and voice. If one verified clip exists for that input, every
		segment with that input is entitled to it, whatever order the failures
		happened in.
		"""
		for record in self.manifest.assets:
			if record.kind != "audio" or record.state != "failed":
				continue
			twin = self._produced.get(record.input_hash)
			if twin is None:
				continue
			record.state = twin.state
			record.content_hash = twin.content_hash
			record.file = twin.file
			record.path = twin.path
			record.verification = twin.verification
			record.failure = None
			self.report.failed -= 1
			self.report.reused += 1
			self.report.errors = [
				line for line in self.report.errors
				if not line.startswith(f"{record.key}: ")
			]

	# -- audio -------------------------------------------------------------

	def _produce_audio(self, segment: Segment) -> None:
		record = self.manifest.by_key(segment.key)
		assert record is not None
		# Content-addressed, not keyed on the slide the line happens to sit on.
		# A clip *is* its text, language and voice — that is exactly what the
		# input hash covers — so the same words asked for twice are one file.
		relative = f"audio/{record.input_hash[:16]}.mp3"
		if self._reuse(record, relative):
			return
		if self._out_of_scope(record):
			return

		# The same text, synthesised twice, is not merely wasteful: it is two
		# independent rolls of the dice, and short Thai does not always come
		# back right. A word that has already been generated *and verified* in
		# this run must not get a second chance to fail — the learner would
		# then hear the same word pronounced two different ways depending on
		# which slide they were on, which is worse than either take alone.
		already = self._produced.get(record.input_hash)
		if already is not None:
			record.state = already.state
			record.content_hash = already.content_hash
			record.file = already.file
			record.path = already.path
			record.verification = already.verification
			record.failure = already.failure
			self.report.reused += 1
			return

		if segment.recording is not None:
			# No transcribe-back check, and that is the point of the route
			# rather than a gap in it. These exist for clips the check cannot
			# judge: measured against the course's own native recordings it
			# rejects five of five, because an isolated Thai letter name is a
			# syllable the language does not otherwise use and a transcriber
			# hands back the nearest real word. What vouches for a recording is
			# that it already ships and is already heard by learners in the
			# listening quiz.
			self._accept(
				record,
				relative,
				segment.recording.read_bytes(),
				Verification(outcome="recorded", attempts=1),
			)
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
			# Transcription is a second network call and it fails for its own
			# reasons — a key without the speech-to-text permission, a
			# transcriber outage. That is a rejected attempt like any other, not
			# a crash: the manifest has to record every segment the run reached,
			# and a traceback here would leave it holding the previous run's
			# state while clips for this one sit on disk.
			try:
				spoken = self._transcribe(audio)
			except VendorError as error:
				self._reject(record, attempt, segment, heard, str(error))
				continue
			# Against the stripped text: the tags were direction, not words,
			# so a transcriber will never return them and comparing with them
			# in place would fail every tagged Thai clip.
			if transcript_matches(strip_markup(segment.text), spoken):
				self._accept(
					record,
					relative,
					audio,
					Verification(
						outcome="verified",
						attempts=attempt,
						expected=strip_markup(segment.text),
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

	def _release_english(self) -> None:
		"""Stand the narration engine down before the image model loads.

		Optional on the vendor, for the same reason `_release_transcriber` is: a
		test double has no weights to hand back.
		"""
		release = getattr(self.vendor, "release_english", None)
		if callable(release):
			release()

	def _release_transcriber(self) -> None:
		"""Give the verifier's GPU memory back before the English engine runs.

		Optional on the vendor: the protocol is `synthesize` and `transcribe`,
		and a stand-in used in tests has no weights to release. A vendor that
		offers `release_transcriber` gets asked; one that does not is left
		alone, which keeps this ordering from becoming a second thing every
		test double has to implement.
		"""
		release = getattr(self.vendor, "release_transcriber", None)
		if callable(release):
			release()

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
		# Every later segment with this same input reuses these bytes rather
		# than asking for them again.
		self._produced[record.input_hash] = record
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
		"""An illustration named by the script, read from beside the script.

		Contained, because the bytes end up committed under `public/lessons/`
		and served: the script is hand- and agent-authored, so an unconstrained
		`image:` publishes any file the generator can read. The output name is
		derived rather than taken from the script, so this is the read side of
		the boundary and `_write_asset` is the write side; both are checked.
		"""
		root = self.script.source.parent.resolve()
		path = (root / source).resolve()
		if root not in path.parents:
			raise RefusedPath(
				f"slide {slide.id!r}: its image resolves outside the directory "
				"holding the lesson script"
			)
		if not path.is_file():
			raise RefusedPath(f"slide {slide.id!r}: its image is not a file")
		return path.read_bytes()

	def _produce_image(
		self, record: AssetRecord, relative: str, data: bytes
	) -> None:
		if self._reuse(record, relative):
			return
		self._write_asset(record, relative, data)
		self.report.generated += 1

	# -- the write boundary ------------------------------------------------

	def _out_of_scope(self, record: AssetRecord) -> bool:
		"""Leave a clip alone that this run was not asked to make.

		Reuse alone is not enough to scope a targeted build. A clip that has
		*never* succeeded has nothing cached, so `_reuse` says no and the
		segment is produced — which meant clicking regenerate on one English
		line in the studio also retried two Thai letter names that had failed
		earlier, eight seeds each, and spent sixteen vendor calls nobody asked
		for. The scope has to cover "never worked" as well as "already fine".

		Only when `force_keys` is set: a full build has no target and must
		still attempt everything, including what failed last time.

		The previous verdict is carried forward rather than cleared, so the
		deck still refuses to be written over a hole — a targeted rebuild must
		not be able to turn a broken lesson into a shipped one by looking away
		from the broken part.
		"""
		if not self.force_keys or record.key in self.force_keys:
			return False
		previous = self._cache.get(record.key)
		if previous and previous.get("state") == "failed":
			record.state = "failed"
			record.failure = previous.get("failure")
			record.verification = previous.get("verification")
			self.report.failed += 1
			self.report.errors.append(
				f"{record.key}: still failing from an earlier run, not retried "
				"because this build was scoped to other clips"
			)
		else:
			record.state = "skipped"
			self.report.skipped += 1
		return True

	def _reuse(self, record: AssetRecord, relative: str) -> bool:
		"""A cache hit needs the recorded inputs *and* the bytes on disk to
		agree: a manifest entry for a file since truncated or hand-edited is
		not a hit, it is a corruption to redo."""
		if record.key in self.force_keys:
			# Asked for explicitly, so the cache is not consulted. Editing text
			# already invalidates a clip by changing its hash; this is for the
			# other case — the text is right and the take is not, and the only
			# lever left is another roll of the seed.
			return False
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

		played = [
			(segment, asset)
			for segment in slide.segments
			if (asset := self.manifest.by_key(segment.key)) and asset.path
		]
		# A reveal slide holds its audio back until the learner presses the
		# button, which is right for the answer and wrong for everything the
		# teacher wants to say first. `narration-before:` lines are split out
		# here so the player can speak them on arrival and keep the rest for
		# the reveal.
		before = [(s, a) for s, a in played if s.before_reveal]
		after = [(s, a) for s, a in played if not s.before_reveal]

		if before:
			body["audioBefore"] = [asset.path for _, asset in before]
			body["audioBeforeLanguages"] = [s.language for s, _ in before]
		if after:
			body["audio"] = [asset.path for _, asset in after]
			# Which clip is which language, so the player can tell a language
			# change from a sentence break. A pause belongs at the first and
			# not at the second: crossing from the English voice to the Thai
			# one is a teacher pausing before saying the word, while a pause
			# between two English clips lands in the middle of one person's
			# continuous prose and is heard as the end of a thought.
			body["audioLanguages"] = [segment.language for segment, _ in after]
		# Thai to be *read*, set large in the app's own font.
		#
		# Distinct from `glyph:`, which the image compositor burns into a
		# picture. A learner practising reading needs the script at a size they
		# can actually decode, in a real font, selectable and sharp — not
		# rasterised into a watercolour at whatever size the composition left
		# for it. A slide carrying this shows it instead of an illustration,
		# because the thing to look at is the writing.
		reading = slide.fields.get("thai")
		if reading:
			body["thai"] = reading
		# What this slide is the story of — a consonant's glyph, a vowel's
		# written form, a tone rule's id — whitespace-separated, and usually
		# one thing.
		#
		# The palace reads it. A learner who opens ก in the market has met the
		# chicken once, in a lesson they finished weeks ago, and until this
		# existed there was no way back to it: the decks carried no per-slide
		# reference to what they taught, so the only offer the palace could
		# make was the whole lesson from its first slide.
		#
		# Authored rather than derived from the prose. A slide that mentions ก
		# while teaching ข is common and would be indistinguishable to any
		# scan, and a story viewer that opens on the wrong letter's story is
		# worse than one that opens on nothing.
		#
		# Slugs, not glyphs: a consonant's scene id (`ko-kai`), a vowel's name
		# kebab-cased (`sara-aa`), a tone rule's id (`low-live`). Glyphs were
		# the obvious choice and are the wrong one — `อ` is both a consonant
		# and a vowel and the two would be one tag, four of the roof vowels
		# are stored with a leading placeholder space, and `อ (as vowel)`
		# carries an English gloss. Slugs have none of that and read better in
		# the markdown besides.
		#
		# Comma-separated, so a tag that ever does carry a space survives.
		teaches = slide.fields.get("teaches")
		if teaches:
			subjects = [part.strip() for part in teaches.split(",")]
			body["teaches"] = [subject for subject in subjects if subject]
		image = self.manifest.by_key(f"{slide.id}-image")
		if image and image.path:
			body["image"] = image.path
		return body


def _read_prior_manifest(path: Path) -> object:
	"""Three outcomes, not two: no manifest yet, a manifest, or a manifest that
	is there and cannot be read.

	The third must not read as the first. Both would otherwise mean "nothing is
	cached", and nothing cached re-synthesises every clip in the lesson — which
	is not a free retry, because re-voicing is not idempotent: every clip comes
	back different, and every line is billed again. A corrupt manifest is a
	question for whoever is running this, so it is asked out loud.
	"""
	if not path.is_file():
		return None
	try:
		parsed = json.loads(path.read_text(encoding="utf-8"))
	except (json.JSONDecodeError, OSError) as error:
		raise ManifestUnreadable(
			f"{path.name} exists but could not be read "
			f"({error.__class__.__name__}). Refusing rather than treating it as "
			"an empty cache, which would re-voice and re-bill every line in the "
			"lesson. Delete it to regenerate from scratch."
		) from None
	if not isinstance(parsed, dict):
		raise ManifestUnreadable(
			f"{path.name} is valid JSON but not a manifest object. See above: "
			"an unreadable manifest is refused, not silently ignored."
		)
	return parsed


def generate(
	script: LessonScript,
	assets_root: Path,
	vendor: Vendor,
	spec: VoiceSpec,
	redactor: Redactor,
	force_keys: Iterable[str] | None = None,
	on_progress: ProgressCallback | None = None,
) -> RunReport:
	"""Build a deck. `force_keys` rebuilds those assets whatever the cache says.

	Forcing is for re-rolling a clip whose text has not changed — an edit
	changes the input hash and regenerates on its own. It exists for the
	studio, where a person has listened to a take and wants another.
	"""
	paths = LessonPaths.under(assets_root, script.lesson_id)
	return DeckGenerator(
		script, paths, vendor, spec, redactor, force_keys, on_progress
	).run()
