"""Edit a lesson script without rewriting the parts nobody asked to change.

`script_parser` answers "what does this deck say", which is what the pipeline
needs. Editing needs a different thing: change one narration line and leave the
file otherwise byte-identical.

Parsing to objects and serialising back would not do that. These scripts open
with a long comment block carrying the rules the deck is written to — why it is
not a lesson, what the narrator sounds like, why `นานา` is doubled — and a
serialiser would quietly delete all of it the first time anything was saved.
Blank lines, comment placement and field order would go the same way.

So a document is the raw text, split into a header and one block per slide, and
an edit rewrites only the lines it targets. Everything it does not touch stays
exactly as the author left it — which also keeps the diff of a studio edit
readable, instead of showing the whole file as changed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

#: A slide heading: `## exposition welcome`.
HEADING = re.compile(r"^##\s+(?P<kind>[a-z-]+)\s+(?P<id>[A-Za-z0-9-]+)\s*$")
#: A field line: `narration: en Welcome...` or `heading: Why this works`.
FIELD = re.compile(r"^(?P<name>[a-z-]+):\s*(?P<value>.*)$")


@dataclass
class SlideBlock:
	"""One slide, as the lines that spell it out."""

	kind: str
	id: str
	lines: list[str] = field(default_factory=list)

	@property
	def heading(self) -> str:
		return f"## {self.kind} {self.id}"

	def text(self) -> str:
		return "\n".join([self.heading, *self.lines])

	def narration(self) -> list[tuple[int, str, str]]:
		"""Every narration line as `(index, language, text)`.

		The index is into `lines`, so a caller can replace one in place without
		having to find it again by matching on its content — which would pick
		the wrong line whenever a deck repeats a sentence.
		"""
		found = []
		for index, line in enumerate(self.lines):
			matched = FIELD.match(line)
			if matched and matched.group("name") == "narration":
				value = matched.group("value")
				language, _, body = value.partition(" ")
				found.append((index, language, body.strip()))
		return found

	def field_value(self, name: str) -> str | None:
		for line in self.lines:
			matched = FIELD.match(line)
			if matched and matched.group("name") == name:
				return matched.group("value").strip()
		return None

	def set_field(self, name: str, value: str | None) -> None:
		"""Set, replace or (with `None`) remove a single-valued field.

		A new field is appended after the last field rather than at the end of
		the block, so it lands among its siblings instead of below the bullet
		list where a reader would not look for it.
		"""
		for index, line in enumerate(self.lines):
			matched = FIELD.match(line)
			if matched and matched.group("name") == name:
				if value is None:
					del self.lines[index]
				else:
					self.lines[index] = f"{name}: {value}"
				return
		if value is None:
			return
		last_field = -1
		for index, line in enumerate(self.lines):
			if FIELD.match(line):
				last_field = index
		self.lines.insert(last_field + 1, f"{name}: {value}")

	def set_narration(self, values: list[tuple[str, str]]) -> None:
		"""Replace every narration line with `(language, text)` pairs.

		Rewritten as a group because the count can change — the studio's whole
		point is splitting a long line into two — and because they must stay
		contiguous and in order. The first narration line's position is kept so
		the block's shape survives.
		"""
		positions = [index for index, _, _ in self.narration()]
		anchor = positions[0] if positions else len(self.lines)
		for index in reversed(positions):
			del self.lines[index]
		for offset, (language, text) in enumerate(values):
			self.lines.insert(anchor + offset, f"narration: {language} {text}")

	def bullets(self) -> list[str]:
		return [line[2:].strip() for line in self.lines if line.startswith("- ")]

	def set_bullets(self, values: list[str]) -> None:
		positions = [i for i, line in enumerate(self.lines) if line.startswith("- ")]
		anchor = positions[0] if positions else len(self.lines)
		for index in reversed(positions):
			del self.lines[index]
		for offset, text in enumerate(values):
			self.lines.insert(anchor + offset, f"- {text}")


@dataclass
class ScriptDocument:
	"""A lesson script as header plus slides, editable and round-trippable."""

	header: list[str]
	slides: list[SlideBlock]
	source: Path
	trailing_newline: bool = True

	@classmethod
	def load(cls, path: Path) -> ScriptDocument:
		raw = path.read_text(encoding="utf-8")
		lines = raw.split("\n")
		trailing = raw.endswith("\n")
		if trailing:
			lines = lines[:-1]

		header: list[str] = []
		slides: list[SlideBlock] = []
		current: SlideBlock | None = None
		# The header runs to the first slide heading, comment block and all.
		# Nothing in here interprets it, which is the point: whatever it holds
		# survives a save untouched.
		for line in lines:
			matched = HEADING.match(line)
			if matched:
				current = SlideBlock(
					kind=matched.group("kind"), id=matched.group("id")
				)
				slides.append(current)
				continue
			if current is None:
				header.append(line)
			else:
				current.lines.append(line)
		return cls(header=header, slides=slides, source=path, trailing_newline=trailing)

	def text(self) -> str:
		parts = ["\n".join(self.header).rstrip("\n")]
		parts.extend(block.text().rstrip("\n") for block in self.slides)
		body = "\n\n".join(part for part in parts if part)
		return body + ("\n" if self.trailing_newline else "")

	def save(self, path: Path | None = None) -> None:
		(path or self.source).write_text(self.text(), encoding="utf-8")

	def by_id(self, slide_id: str) -> SlideBlock | None:
		for block in self.slides:
			if block.id == slide_id:
				return block
		return None

	def index_of(self, slide_id: str) -> int:
		for index, block in enumerate(self.slides):
			if block.id == slide_id:
				return index
		raise KeyError(slide_id)

	def insert_after(self, slide_id: str | None, block: SlideBlock) -> None:
		"""Place a new slide after `slide_id`, or first when that is `None`."""
		if any(existing.id == block.id for existing in self.slides):
			raise ValueError(f"a slide with id {block.id!r} already exists")
		if slide_id is None:
			self.slides.insert(0, block)
			return
		self.slides.insert(self.index_of(slide_id) + 1, block)

	def remove(self, slide_id: str) -> SlideBlock:
		"""Drop a slide, refusing when something still points at it.

		A `retrieval` slide names the `reveal` that answers it and vice versa;
		removing one half leaves the other referring to a slide that is not
		there, which the parser accepts and the renderer then trips over.
		"""
		block = self.by_id(slide_id)
		if block is None:
			raise KeyError(slide_id)
		referrers = [
			other.id
			for other in self.slides
			if other.id != slide_id
			and slide_id in {other.field_value("reveal"), other.field_value("retrieval")}
		]
		if referrers:
			raise ValueError(
				f"slide {slide_id!r} is still referenced by "
				f"{', '.join(sorted(referrers))}; remove or repoint those first"
			)
		self.slides.remove(block)
		return block
