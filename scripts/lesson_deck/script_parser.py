"""Hand-authored lesson script in, a typed `LessonScript` out.

A lesson script is Markdown so it can be written and reviewed as prose. The
structure it has to carry is small: an ordered list of slides, each of one of
the four kinds the deck schema declares, plus the narration lines that become
audio.

Delivery markup is written inline in square brackets — `[pause]`,
`[thoughtful]`, `[whispers]`. It is direction, never words: an engine that
understands it shapes the delivery, and an engine that does not has the tags
removed before it ever sees them (`vendor.strip_markup`). Which engines
understand it is measured in `reference/ENGINES.md`; Qwen3-TTS does not, and
reads `[pause one second]` aloud as those words.

The transcribe-back check always compares against the stripped text, because a
transcriber returns what was said and never the direction.

Narration is English prose with Thai embedded, and **the language is marked per
line**:

    narration: en These three letters all make the same sound.
    narration: th มา

Both go to ElevenLabs. The marking is what lets the Thai lines take the
transcribe-back check and the English lines skip it — a single untagged line of
mixed narration would put Thai tone accuracy beyond any check, and the tone
lessons are the product.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Literal

SlideKind = Literal["exposition", "retrieval", "reveal", "rule"]
SLIDE_KINDS: tuple[SlideKind, ...] = ("exposition", "retrieval", "reveal", "rule")

Language = Literal["en", "th"]
LANGUAGES: tuple[Language, ...] = ("en", "th")

_HEADING = re.compile(r"^##\s+(?P<kind>[a-z]+)\s+(?P<id>[A-Za-z0-9_-]+)\s*$")
#: Hyphens allowed so a field can be namespaced — `image-prompt` belongs to
#: the picture, and `prompt` on its own was already the retrieval question.
_FIELD = re.compile(r"^(?P<key>[a-z][a-z-]*):\s*(?P<value>.*)$")
_BULLET = re.compile(r"^-\s+(?P<text>.+)$")
_NARRATION = re.compile(r"^(?P<lang>en|th)\s+(?P<text>.+)$")
_THAI = re.compile(r"[\u0e00-\u0e7f]")


class ScriptError(ValueError):
	"""A lesson script that cannot be turned into a deck. Carries the line."""


@dataclass(frozen=True)
class Segment:
	"""One narration line: one API call, one clip, one manifest record."""

	key: str
	language: Language
	text: str
	#: Which authored `narration:` lines of the slide this clip came from, by
	#: their index within the slide. Packing merges consecutive English and
	#: re-splits it at sentence boundaries, so the relationship is neither
	#: one-to-one nor even order-preserving in count: two short lines become
	#: one clip, one long line becomes two. Anything that wants to show a
	#: learner's clip next to the sentence that produced it — the studio — has
	#: to be told, because it cannot be recovered from the text afterwards.
	sources: tuple[int, ...] = ()


@dataclass
class Slide:
	kind: SlideKind
	id: str
	fields: dict[str, str] = field(default_factory=dict)
	bullets: list[str] = field(default_factory=list)
	segments: list[Segment] = field(default_factory=list)


@dataclass
class LessonScript:
	lesson_id: str
	title: str
	slides: list[Slide]
	source: Path

	@property
	def segments(self) -> list[Segment]:
		return [segment for slide in self.slides for segment in slide.segments]


def parse_script(path: Path) -> LessonScript:
	lines = path.read_text(encoding="utf-8").splitlines()
	title: str | None = None
	lesson_id: str | None = None
	slides: list[Slide] = []
	current: Slide | None = None
	in_comment = False

	for number, raw in enumerate(lines, start=1):
		line = raw.rstrip()
		if in_comment:
			in_comment = "-->" not in line
			continue
		if line.startswith("<!--"):
			in_comment = "-->" not in line
			continue
		if not line:
			continue

		if line.startswith("# "):
			if title is not None:
				raise ScriptError(f"{path}:{number}: a second title heading")
			title = line[2:].strip()
			continue

		heading = _HEADING.match(line)
		if heading:
			kind = heading.group("kind")
			if kind not in SLIDE_KINDS:
				raise ScriptError(
					f"{path}:{number}: unknown slide kind {kind!r}; "
					f"expected one of {', '.join(SLIDE_KINDS)}"
				)
			current = Slide(kind=kind, id=heading.group("id"))
			slides.append(current)
			continue

		bullet = _BULLET.match(line)
		if bullet:
			if current is None:
				raise ScriptError(f"{path}:{number}: bullet before any slide")
			current.bullets.append(bullet.group("text").strip())
			continue

		matched = _FIELD.match(line)
		if not matched:
			raise ScriptError(f"{path}:{number}: not a slide heading, field or bullet")
		key, value = matched.group("key"), matched.group("value").strip()

		if current is None:
			if key != "lesson":
				raise ScriptError(f"{path}:{number}: only `lesson:` may precede a slide")
			lesson_id = value
			continue

		if key == "narration":
			current.segments.append(
				_parse_narration(current, value, path, number),
			)
			continue
		if key in current.fields:
			raise ScriptError(f"{path}:{number}: field {key!r} is already set")
		current.fields[key] = value

	if title is None:
		raise ScriptError(f"{path}: no `# Title` heading")
	if lesson_id is None:
		raise ScriptError(f"{path}: no `lesson:` id")
	if not slides:
		raise ScriptError(f"{path}: no slides")

	for slide in slides:
		slide.segments = _merge_runs(slide)

	_check_slides(slides, path)
	return LessonScript(lesson_id=lesson_id, title=title, slides=slides, source=path)


#: How much English one call may carry, in words.
#:
#: A cap exists because the model accelerates through a long utterance and does
#: not recover. Measured on the orientation deck when runs were uncapped,
#: fourteen of sixteen clips ended faster than they began — by 30 words a
#: minute on average, and an 80-second clip opened at 153 and closed at 207.
#:
#: 55 was the first value and came from Qwen, which is no longer the engine.
#: Measured on S2 Pro, a length ladder found no drift worth the name up to 190
#: words — twelve clips, accuracy 1.00 on every one, and the largest drift at
#: 68 words rather than at the top. What does break is further out: at 266
#: words, three of five seeds fabricated whole sentences that appear nowhere in
#: the script.
#:
#: So 75 sits well inside the measured-safe range with a wide margin to the
#: cliff, and it is enough to carry most authored paragraphs whole.
MAX_MERGED_WORDS = 75


def _sentences(text: str) -> list[str]:
	"""Split on sentence ends, keeping the terminator with its sentence.

	Deliberately simple. It only has to find places a clip may be cut, and a
	cut at a paragraph break or after a full stop is always defensible — the
	worst a missed boundary does is leave one clip slightly longer.
	"""
	parts = [
		part.strip()
		for chunk in text.split("\n\n")
		for part in re.split(r"(?<=[.!?])\s+", chunk)
	]
	return [part for part in parts if part]


def _merge_runs(slide: Slide) -> list[Segment]:
	"""Pack a slide's English into clips of at most `MAX_MERGED_WORDS`.

	Two faults pull in opposite directions and this sits between them.

	A synthesiser has no memory between calls, so a paragraph cut into four
	calls is four utterances played back to back: each opens at the speaker's
	baseline pitch and closes on a sentence-final fall, and the narrator
	audibly finishes a thought and starts again in the middle of one idea.
	That argues for joining everything.

	But the model also accelerates through a long utterance and never
	recovers. Measured over the orientation deck when runs were uncapped,
	fourteen of sixteen clips ended faster than they began — by 30 words a
	minute on average, and an 80-second clip opened at 153 and closed at 207.
	The only two that held their pace were the two short ones. That argues for
	cutting everything.

	So: pack sentences greedily up to the cap, and cut where the author already
	ended a sentence. Long enough to absorb most seams, short enough that the
	pace does not run away, and the seams that remain fall where a speaker
	would pause anyway.

	Thai never merges and is never split. Each Thai clip is transcribed back
	and accepted on its own, identical Thai text is shared across slides and
	lessons by content hash, and the pause before a Thai word is the one pause
	that belongs there.

	Keys are re-derived from the packed order, so a slide's clips stay
	`<slide>-0`, `<slide>-1`, ... with no gaps.
	"""
	packed: list[Segment] = []
	buffer: list[str] = []
	buffered_words = 0
	buffered_sources: list[int] = []

	def flush() -> None:
		nonlocal buffer, buffered_words, buffered_sources
		if buffer:
			# Joined with a blank line, not a space: each piece was its own
			# thought, and a paragraph break is the only pause control the
			# model offers. A literal "[pause]" is read out loud as the word.
			packed.append(Segment(
				key="", language="en", text="\n\n".join(buffer),
				sources=tuple(dict.fromkeys(buffered_sources)),
			))
			buffer = []
			buffered_words = 0
			buffered_sources = []

	for source, segment in enumerate(slide.segments):
		if segment.language != "en":
			flush()
			packed.append(replace(segment, sources=(source,)))
			continue
		for sentence in _sentences(segment.text):
			words = len(sentence.split())
			if buffer and buffered_words + words > MAX_MERGED_WORDS:
				flush()
			buffer.append(sentence)
			buffered_words += words
			buffered_sources.append(source)
		# One authored line never shares a clip with the next. Packing used to
		# run straight through the boundary, which produced a mapping nobody
		# could hold in their head: five lines became six clips, one line fed
		# three of them, and two lines shared a fourth. It also made a
		# per-clip regenerate button ambiguous — press it on a shared clip and
		# you remake a neighbour's words too.
		#
		# Flushing here does cost the merge across the boundary, which is a
		# real if small loss: a short line now stands alone rather than being
		# carried by its neighbour, and short clips run a little fast. But the
		# author already marked that spot as the end of a thought, so it is the
		# best available place for a seam, and a mapping you can reason about
		# is worth more than a few words a minute.
		flush()
	flush()

	return [
		Segment(
			key=f"{slide.id}-{index}", language=s.language, text=s.text,
			sources=s.sources,
		)
		for index, s in enumerate(packed)
	]


def _parse_narration(slide: Slide, value: str, path: Path, number: int) -> Segment:
	matched = _NARRATION.match(value)
	if not matched:
		raise ScriptError(
			f"{path}:{number}: a narration line must begin with a language tag "
			f"({' or '.join(LANGUAGES)}), because only the tagged Thai lines are "
			"checked by transcribing them back"
		)
	language: Language = matched.group("lang")  # type: ignore[assignment]
	text = matched.group("text").strip()
	if language == "en" and _THAI.search(text):
		raise ScriptError(
			f"{path}:{number}: an English narration line contains Thai. The "
			"English voice is not a Thai speaker, and hearing a Thai sound "
			"shaped by an English mouth teaches the learner the wrong target "
			"— in a tonal language, one they will then practise against. "
			"Describe the letter in English and let a `th` line say it."
		)
	return Segment(
		key=f"{slide.id}-{len(slide.segments)}",
		language=language,
		text=text,
	)




def _check_slides(slides: list[Slide], path: Path) -> None:
	"""Everything the deck schema will refuse, refused here where the line
	number is still known."""
	ids = [slide.id for slide in slides]
	duplicate = next((id for id in ids if ids.count(id) > 1), None)
	if duplicate is not None:
		raise ScriptError(f"{path}: slide id {duplicate!r} is used twice")

	by_id = {slide.id: slide for slide in slides}
	for slide in slides:
		if slide.kind == "exposition" and not slide.bullets:
			raise ScriptError(f"{path}: exposition slide {slide.id!r} has no body")
		if slide.kind == "rule" and "rule" not in slide.fields:
			raise ScriptError(f"{path}: rule slide {slide.id!r} names no rule")
		if slide.kind == "retrieval":
			_check_pair(slide, by_id, "reveal", "reveal", "retrieval", path)
		if slide.kind == "reveal":
			if not slide.bullets:
				raise ScriptError(f"{path}: reveal slide {slide.id!r} has no answer")
			_check_pair(slide, by_id, "retrieval", "retrieval", "reveal", path)


def _check_pair(
	slide: Slide,
	by_id: dict[str, Slide],
	key: str,
	partner_kind: str,
	back_key: str,
	path: Path,
) -> None:
	partner_id = slide.fields.get(key)
	if partner_id is None:
		raise ScriptError(f"{path}: {slide.kind} slide {slide.id!r} names no {key}")
	partner = by_id.get(partner_id)
	if partner is None or partner.kind != partner_kind:
		raise ScriptError(
			f"{path}: {slide.kind} slide {slide.id!r} names {partner_id!r}, "
			f"which is not a {partner_kind} slide"
		)
	if partner.fields.get(back_key) != slide.id:
		raise ScriptError(
			f"{path}: {slide.kind} slide {slide.id!r} and {partner_id!r} "
			"do not name each other"
		)
