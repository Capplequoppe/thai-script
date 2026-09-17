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
from .vendor import Redactor, Vendor, VendorError, VoiceSpec, strip_markup

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

_NON_THAI = re.compile(r"[^฀-๿]+")


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
			"voice": spec.for_language(segment.language),
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
		for slide in self.script.slides:
			for segment in slide.segments:
				self._produce_audio(segment)
				done += 1
				self._report(segment.key, done, total)
		self._adopt_late_twins()
		for record, relative, data in images.values():
			self._produce_image(record, relative, data)
			done += 1
			self._report(record.key, done, total)

		write_json(self.manifest_path, self.manifest.to_json())

		if self.report.failed == 0:
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
		if played:
			body["audio"] = [asset.path for _, asset in played]
			# Which clip is which language, so the player can tell a language
			# change from a sentence break. A pause belongs at the first and
			# not at the second: crossing from the English voice to the Thai
			# one is a teacher pausing before saying the word, while a pause
			# between two English clips lands in the middle of one person's
			# continuous prose and is heard as the end of a thought.
			body["audioLanguages"] = [segment.language for segment, _ in played]
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
