"""Measure a lesson's prose against lesson 1, which is the reference.

    uv run --project scripts/deck-env python scripts/check-lesson-voice.py
    uv run --project scripts/deck-env python scripts/check-lesson-voice.py lesson-09

Four numbers and a list of suspect lines. None of it decides anything on its
own — see `docs/lesson-voice.md`, whose first section describes a fault no
regular expression can see. What this does is make the cheap half cheap, so
the reading time goes on the half that needs a person.

The suspect list is deliberately over-inclusive. A flagged line is a line to
look at, and roughly half of them turn out to be fine.

The lessons are not the only prose a learner hears. The consonant mnemonics
and the tone-rule stories are narrated in the same voice by the same engine
and live in JSON rather than in `content/lessons/`, so until they were added
here nothing measured them at all — and they are the writing a learner comes
back to for years. They are listed under their file's stem alongside the
lessons.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
LESSONS = REPO_ROOT / "content" / "lessons"
DATA = REPO_ROOT / "src" / "domain" / "script" / "data"
REFERENCE = "lesson-01"

#: Narration that ships as data rather than as a lesson. Each is a list of
#: objects with a `narration` field, which is the whole of what a learner
#: hears there — these carry no bullets, so the rejected-phrase check has
#: nothing to read and correctly reports none.
SCENE_FILES = (
	DATA / "consonant-scenes.json",
	DATA / "palace-scenes.json",
)

#: Each has cost a rebuild. The originality check reads the built deck, so a
#: fix only clears after regenerating — which makes catching them here worth
#: more than the check itself.
REJECTED_PHRASES = (
	"at the top of the",
	"at the end of the",
	"at the end of a",
	"the only difference between the",
	"is written before the consonant",
	"in front of the consonant",
)

#: "X is not Y" used for emphasis where the positive would be shorter. Some
#: negations are simply true, so this flags candidates rather than errors.
NEGATION = re.compile(r"\bis not\b|\bare not\b|\bNot \b|\bnot a\b")

#: The emphasis tag and the progress note — the two species of the tell that
#: have a surface form worth matching. The aphorism has none, and is why a
#: person still has to read the thing.
EMPHASIS_TAG = re.compile(
	r"(?:^|\. )(?:Always|Every time|No exceptions|That is the point|"
	r"Both of them|Same again|And that is it)\.?\s*$",
	re.I,
)
PROGRESS_NOTE = re.compile(
	r"\byou can (?:now|already|derive|do that now)\b"
	r"|\bnot bad for\b"
	r"|\bwhich is worth noticing\b"
	r"|\bstill the thing that\b"
	r"|\bby now you (?:should|will|can)\b",
	re.I,
)


def sentences(text: str) -> list[str]:
	return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def read_lesson(path: Path) -> tuple[list[str], list[str]]:
	"""A lesson's spoken English and its bullets."""
	source = path.read_text(encoding="utf-8")
	return (
		[m.group(1) for m in re.finditer(r"^narration: en (.+)$", source, re.M)],
		[m.group(1).strip() for m in re.finditer(r"^- (.+)$", source, re.M)],
	)


def read_scenes(path: Path) -> tuple[list[str], list[str]]:
	"""A scene file's narration, with the engine's breath marks taken out.

	`[pause]` is an instruction to the voice and not a word anyone hears, so
	leaving it in would put a five-letter "sentence" into the fragment count
	every time one lands after a full stop.
	"""
	scenes = json.loads(path.read_text(encoding="utf-8"))
	return (
		[
			scene["narration"].replace("[pause]", " ")
			for scene in scenes
			if scene.get("narration")
		],
		[],
	)


def measure(path: Path) -> dict | None:
	narration, bullets = (
		read_scenes(path) if path.suffix == ".json" else read_lesson(path)
	)
	if not narration:
		return None

	spoken = sentences(" ".join(narration))
	words = [len(s.split()) for s in spoken]
	return {
		"sentences": len(spoken),
		"negation": 100 * sum(bool(NEGATION.search(s)) for s in spoken) / len(spoken),
		"questions": 100 * sum(s.endswith("?") for s in spoken) / len(spoken),
		"fragments": 100 * sum(w <= 5 for w in words) / len(spoken),
		"mean_words": sum(words) / len(words),
		"suspect": [
			line
			for line in bullets + spoken
			if EMPHASIS_TAG.search(line) or PROGRESS_NOTE.search(line)
		],
		# Bullets only. The originality check reads the built deck's headings,
		# prompts, bullets and answers — narration reaches it through nothing,
		# so a rejected phrase spoken aloud costs nothing and flagging it here
		# would bury the ones that do.
		"rejected": [
			(phrase, line)
			for line in bullets
			for phrase in REJECTED_PHRASES
			if phrase in line.lower()
		],
	}


def main(argv: list[str]) -> int:
	wanted = argv[1:] or None
	paths = [*sorted(LESSONS.glob("*.md")), *SCENE_FILES]
	if wanted:
		paths = [p for p in paths if p.stem in wanted]

	rows = [(p.stem, measure(p)) for p in paths]
	written = [(name, m) for name, m in rows if m]
	if not written:
		print("no lesson with narration matched")
		return 1

	print(
		f"{'lesson':<26}{'sents':>6}{'negation':>10}{'questions':>11}"
		f"{'fragments':>11}{'words/sent':>12}{'suspect':>9}"
	)
	for name, m in written:
		mark = "  <- reference" if name == REFERENCE else ""
		print(
			f"{name:<26}{m['sentences']:>6}{m['negation']:>9.1f}%"
			f"{m['questions']:>10.1f}%{m['fragments']:>10.0f}%"
			f"{m['mean_words']:>12.1f}{len(m['suspect']):>9}{mark}"
		)

	for name, m in written:
		if not (m["suspect"] or m["rejected"]):
			continue
		print(f"\n--- {name}")
		for phrase, line in m["rejected"]:
			print(f"  REJECTED PHRASE {phrase!r}: {line[:90]}")
		for line in m["suspect"]:
			print(f"  suspect: {line[:90]}")

	print(
		"\nNumbers are a floor, not the standard. The fault that matters —\n"
		"a clause whose only job is to comment on the clause before it —\n"
		"has no surface form. Read docs/lesson-voice.md and then read the lesson."
	)
	return 0


if __name__ == "__main__":
	raise SystemExit(main(sys.argv))
