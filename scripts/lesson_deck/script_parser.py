"""Hand-authored lesson script in, a typed `LessonScript` out.

A lesson script is Markdown so it can be written and reviewed as prose. The
structure it has to carry is small: an ordered list of slides, each of one of
the four kinds the deck schema declares, plus the narration lines that become
audio.

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
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

SlideKind = Literal["exposition", "retrieval", "reveal", "rule"]
SLIDE_KINDS: tuple[SlideKind, ...] = ("exposition", "retrieval", "reveal", "rule")

Language = Literal["en", "th"]
LANGUAGES: tuple[Language, ...] = ("en", "th")

_HEADING = re.compile(r"^##\s+(?P<kind>[a-z]+)\s+(?P<id>[A-Za-z0-9_-]+)\s*$")
_FIELD = re.compile(r"^(?P<key>[a-z]+):\s*(?P<value>.*)$")
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

	_check_slides(slides, path)
	return LessonScript(lesson_id=lesson_id, title=title, slides=slides, source=path)


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
