"""The lesson-length model: what is measured, what is modelled, what is refused.

The spoken half is measured and needs no test beyond "ffprobe was asked". What
is worth pinning is the part that is a judgement — the practice model — and the
refusal, because the whole point of `TimingUnavailable` is that a deck reports
nothing rather than a number nobody measured.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lesson_deck.timing import (  # noqa: E402
	SECONDS_PER_RETRIEVAL,
	SECONDS_PER_SLIDE,
	Timing,
	TimingUnavailable,
	measure,
	probe_seconds,
)


def test_total_is_spoken_plus_practice():
	timing = Timing(spoken_seconds=600, practice_seconds=300)
	assert timing.total_seconds == 900
	assert timing.estimated_minutes == 15


def test_a_lesson_is_never_reported_as_zero_minutes():
	"""Rounding a very short deck to "0 minutes" would read as broken."""
	assert Timing(spoken_seconds=4, practice_seconds=0).estimated_minutes == 1


def test_practice_time_counts_retrievals_and_slides():
	timing = measure(clips=[], slide_count=0, retrieval_count=0)
	assert timing == Timing(spoken_seconds=0, practice_seconds=0)

	timing = measure(clips=[], slide_count=10, retrieval_count=4)
	assert timing.practice_seconds == 4 * SECONDS_PER_RETRIEVAL + 10 * SECONDS_PER_SLIDE
	# Retrieval is the dominant term at realistic ratios, which is the model's
	# claim: the exercises are the exercise time, not the page-turning.
	assert 4 * SECONDS_PER_RETRIEVAL > 10 * SECONDS_PER_SLIDE


def test_a_deck_of_pure_exposition_still_gets_practice_time():
	"""Even with no retrieval slide, reading the bullets costs something."""
	timing = measure(clips=[], slide_count=12, retrieval_count=0)
	assert timing.practice_seconds == 12 * SECONDS_PER_SLIDE
	assert timing.practice_seconds > 0


def test_an_unreadable_file_refuses_rather_than_guessing(tmp_path: Path):
	not_audio = tmp_path / "not-audio.mp3"
	not_audio.write_text("this is not an mp3", encoding="utf-8")
	with pytest.raises(TimingUnavailable):
		probe_seconds(not_audio)


def test_a_missing_file_refuses_too(tmp_path: Path):
	with pytest.raises(TimingUnavailable):
		probe_seconds(tmp_path / "absent.mp3")


def test_measure_propagates_the_refusal(tmp_path: Path):
	"""One unprobeable clip sinks the whole deck's timing, deliberately.

	A sum that silently skipped a file it could not read would under-report the
	lesson, which is the failure mode this module exists to avoid.
	"""
	with pytest.raises(TimingUnavailable):
		measure([tmp_path / "absent.mp3"], slide_count=1, retrieval_count=0)


def test_the_json_shape_is_what_the_deck_carries():
	timing = Timing(spoken_seconds=2057, practice_seconds=400)
	assert timing.as_json() == {
		"spokenSeconds": 2057,
		"practiceSeconds": 400,
		"estimatedMinutes": 41,
	}
