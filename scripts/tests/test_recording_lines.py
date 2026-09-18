"""`recording:` — a narration line whose audio already exists in the repository.

It exists for Thai the local engine gets wrong in a way that matters. `วอ แหวน`
is the case that forced it: across all eight seeds the engine drops the ห of
แหวน, which changes the tone, and a wrong tone is a wrong word that the SRS
will then drill. The course already ships a correct native recording of that
letter name for the listening quiz, so the lesson uses it.

What these tests protect is mostly the quiet failure. A recording is a field
that nothing downstream disagrees with — point it at the wrong file and the
lesson simply teaches the wrong sound — so the checks are at the edges: that
the path is real, that it is inside the repository, and above all that the
field survives the parser, which it did not on the first attempt.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lesson_deck.pipeline import segment_input_hash  # noqa: E402
from lesson_deck.script_parser import (  # noqa: E402
    ScriptError,
    parse_script,
)
from lesson_deck.vendor import VoiceSpec  # noqa: E402

NATIVE = "public/audio/consonant-wo-weng.mp3"

SCRIPT = """# A test lesson

lesson: lesson-test

## exposition meet-waen
heading: The ring
narration: en This is the ring's letter.
recording: th วอ แหวน {native}
- The ring's letter.
"""


def write(tmp_path: Path, body: str) -> Path:
    path = tmp_path / "lesson.md"
    path.write_text(body, encoding="utf-8")
    return path


class TestTheFieldSurvivesTheParser:
    """The first attempt at this lost the field between parsing and the
    pipeline: packing re-derives segment keys, and it did so by constructing a
    fresh `Segment` from a hand-written list of fields. Anything not on that
    list was dropped, silently, and the lesson generated the clip it was meant
    to stop generating."""

    def test_a_recording_line_reaches_the_pipeline_with_its_file(self, tmp_path):
        script = parse_script(write(tmp_path, SCRIPT.format(native=NATIVE)))
        recorded = [s for s in script.segments if s.recording is not None]
        assert len(recorded) == 1
        assert recorded[0].recording.name == "consonant-wo-weng.mp3"

    def test_it_still_declares_what_it_says(self, tmp_path):
        """The deck transcript and the studio both show this text, and it is
        the only thing that would ever disagree with a mis-pointed file."""
        script = parse_script(write(tmp_path, SCRIPT.format(native=NATIVE)))
        recorded = next(s for s in script.segments if s.recording is not None)
        assert recorded.text == "วอ แหวน"
        assert recorded.language == "th"

    def test_ordinary_narration_is_untouched(self, tmp_path):
        script = parse_script(write(tmp_path, SCRIPT.format(native=NATIVE)))
        assert all(
            s.recording is None for s in script.segments if s.language == "en"
        )


class TestWhatIsRefused:
    def test_a_file_that_is_not_there(self, tmp_path):
        body = SCRIPT.format(native="public/audio/no-such-clip.mp3")
        with pytest.raises(ScriptError, match="no such recording"):
            parse_script(write(tmp_path, body))

    def test_a_file_outside_the_repository(self, tmp_path):
        body = SCRIPT.format(native="../../../etc/hostname")
        with pytest.raises(ScriptError, match="inside the repository"):
            parse_script(write(tmp_path, body))

    def test_a_line_with_no_file_at_all(self, tmp_path):
        body = SCRIPT.replace("recording: th วอ แหวน {native}", "recording: th วอ")
        with pytest.raises(ScriptError, match="needs both what is said"):
            parse_script(write(tmp_path, body))

    def test_a_line_with_no_language_tag(self, tmp_path):
        body = SCRIPT.replace(
            "recording: th วอ แหวน {native}", f"recording: วอ แหวน {NATIVE}"
        )
        with pytest.raises(ScriptError, match="language tag"):
            parse_script(write(tmp_path, body))


class TestHowARecordingIsKeyed:
    """Content-addressed like everything else, but by the recording's bytes —
    not by a voice, because no engine made it, and not by a path, because
    moving a file must not remake a clip while re-recording one must."""

    def test_the_key_does_not_mention_a_voice(self, tmp_path):
        script = parse_script(write(tmp_path, SCRIPT.format(native=NATIVE)))
        recorded = next(s for s in script.segments if s.recording is not None)
        loud = VoiceSpec(voice_id="somebody-else", model_id="another-model")
        assert segment_input_hash(recorded, VoiceSpec()) == segment_input_hash(
            recorded, loud
        )

    def test_a_generated_clip_of_the_same_words_keys_differently(self, tmp_path):
        """Otherwise pointing a line at a recording would quietly adopt
        whatever generated clip of those words already sat in the cache."""
        script = parse_script(write(tmp_path, SCRIPT.format(native=NATIVE)))
        recorded = next(s for s in script.segments if s.recording is not None)
        from dataclasses import replace

        generated = replace(recorded, recording=None)
        assert segment_input_hash(recorded, VoiceSpec()) != segment_input_hash(
            generated, VoiceSpec()
        )
