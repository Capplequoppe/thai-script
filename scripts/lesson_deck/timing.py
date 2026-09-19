"""How long a lesson actually takes, so the learner is told before starting.

A lesson's length was previously knowable only by sitting through it. That is
the wrong way round: somebody deciding whether to start now needs the number
first, and a course that hides it trains people to abandon lessons halfway.

The spoken half is **measured, not estimated** — every clip the deck plays is
probed with `ffprobe` and summed. The practice half cannot be measured, because
it is time the learner spends with the audio stopped, so it is modelled from
things the deck can actually count and the model is stated here rather than
buried in a constant.

Nothing here guesses at a missing file. A deck whose audio cannot be probed
reports no timing at all, because a confident wrong number is worse for this
than an absent one: a learner who is told "twelve minutes" and spends forty
stops believing any of the numbers afterwards.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

#: A retrieval slide asks the learner to produce an answer out loud before it
#: reveals one, and the audio is stopped for all of it. Twenty-five seconds is
#: the pause the course is designed around: long enough that recall is real
#: work, short enough that nobody walks away. Slides are counted, not timed, so
#: this is the one number here that is a judgement.
SECONDS_PER_RETRIEVAL = 25

#: Every slide costs a few seconds that no clip covers — reading the bullets,
#: looking at the picture, pressing on. Deliberately small: it multiplies by
#: fifty on a long lesson, so an over-generous value here is what would turn a
#: half-hour lesson into a claimed hour.
SECONDS_PER_SLIDE = 6

#: Writing practice is real time and the deck cannot count it: "write it again
#: and again" is a bullet, not a countable event, and how long anybody spends
#: on it is their own business. It is excluded on purpose, and the presented
#: figure says "plus your own writing practice" rather than inventing minutes
#: for it.
EXCLUDES_HANDWRITING = True


class TimingUnavailable(RuntimeError):
	"""Durations could not be measured, so no timing is reported at all."""


@dataclass(frozen=True)
class Timing:
	"""What a deck reports about its own length."""

	spoken_seconds: int
	practice_seconds: int

	@property
	def total_seconds(self) -> int:
		return self.spoken_seconds + self.practice_seconds

	@property
	def estimated_minutes(self) -> int:
		"""Rounded to the nearest minute, never below one."""
		return max(1, round(self.total_seconds / 60))

	def as_json(self) -> dict[str, int]:
		return {
			"spokenSeconds": self.spoken_seconds,
			"practiceSeconds": self.practice_seconds,
			"estimatedMinutes": self.estimated_minutes,
		}


def probe_seconds(path: Path) -> float:
	"""One file's duration, from `ffprobe`. Raises rather than guessing."""
	if shutil.which("ffprobe") is None:
		raise TimingUnavailable("ffprobe is not on PATH")
	result = subprocess.run(
		[
			"ffprobe",
			"-v",
			"error",
			"-show_entries",
			"format=duration",
			"-of",
			"json",
			str(path),
		],
		capture_output=True,
		text=True,
	)
	if result.returncode != 0:
		raise TimingUnavailable(f"ffprobe refused {path.name}")
	try:
		return float(json.loads(result.stdout)["format"]["duration"])
	except (ValueError, KeyError, json.JSONDecodeError) as error:
		raise TimingUnavailable(f"no duration in {path.name}") from error


def measure(clips: list[Path], slide_count: int, retrieval_count: int) -> Timing:
	"""Sum the clips and add the modelled practice time.

	`clips` is every audio file the deck plays, including the ones held back
	behind a reveal button — the learner hears all of them, so all of them
	count towards the length.
	"""
	spoken = sum(probe_seconds(clip) for clip in clips)
	practice = (
		retrieval_count * SECONDS_PER_RETRIEVAL + slide_count * SECONDS_PER_SLIDE
	)
	return Timing(spoken_seconds=round(spoken), practice_seconds=practice)
