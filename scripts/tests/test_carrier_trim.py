"""The carrier trim, which is how short Thai is generated on this machine.

A cloning engine asked for two syllables and nothing else has no context to
settle its prosody against, so it guesses. `วอ แหวน` came back as `วาเวน` on
every seed tried. The same engine asked for a sentence with those syllables
inside it says them correctly — so it is asked for a sentence, and the
sentence is cut away afterwards.

Measured on the five things lesson 2 needed and could not get:

    bare request, one seed      1 of 5
    bare request, eight seeds   3 of 5
    carrier, cut on silence     1 of 5   (and one clip cut to nothing)
    carrier, cut on timings     5 of 5

These tests cover the deciding half — where the cut lands — because that is
the half with a wrong answer available. Nothing here loads a model: the span
is chosen from a transcript, so a transcript is what the tests supply.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lesson_deck.vendor import (  # noqa: E402
    CARRIER_LIMIT,
    CARRIER_PREFIX,
    CARRIER_SUFFIX,
    LocalThaiVoice,
    SplitVendor,
    VendorError,
    VoiceSpec,
    normalise_thai,
)


@dataclass
class Word:
    """One word as faster-whisper reports it, with the seconds it occupies."""

    word: str
    start: float
    end: float


def carrier_words(target: str, target_start: float = 1.0) -> list[Word]:
    """A plausible transcript of a carrier: prefix, target, suffix."""
    return [
        Word("ขอโทษ", 0.10, 0.45),
        Word("ค่ะ", 0.45, 0.70),
        Word(target, target_start, target_start + 0.5),
        Word("ขอบคุณ", target_start + 1.1, target_start + 1.5),
        Word("ค่ะ", target_start + 1.5, target_start + 1.7),
    ]


class TestWhereTheCutLands:
    def test_finds_the_target_between_prefix_and_suffix(self):
        heard, start, end = LocalThaiVoice._span(carrier_words("งาม"), "งาม")
        assert (heard, start, end) == ("งาม", 1.0, 1.5)

    def test_ignores_the_carrier_even_when_it_is_most_of_the_clip(self):
        """The prefix and suffix are five times the target's length here, and
        the span must still be the target — an implementation that scored
        whole-clip similarity would take everything."""
        _heard, start, end = LocalThaiVoice._span(carrier_words("วง"), "วง")
        assert (start, end) == (1.0, 1.5)

    def test_spans_a_target_the_transcriber_split_into_two_words(self):
        """`งอ งู` is two words to a transcriber and one clip to the course.
        The span is a *contiguous run*, not a single word, for exactly this."""
        words = [
            Word("ขอโทษ", 0.10, 0.45),
            Word("ค่ะ", 0.45, 0.70),
            Word("งอ", 1.20, 1.45),
            Word("งู", 1.45, 1.90),
            Word("ขอบคุณ", 2.40, 2.80),
        ]
        heard, start, end = LocalThaiVoice._span(words, "งอ งู")
        assert (heard, start, end) == ("งองู", 1.20, 1.90)

    def test_tolerates_a_transcription_that_is_close_but_not_exact(self):
        """`วอ แหวน` verified at 0.91, heard as `ว้าวแหวน`. A cut that only
        accepted an exact match would have thrown away the take that passed."""
        heard, start, end = LocalThaiVoice._span(carrier_words("ว้าวแหวน"), "วอ แหวน")
        assert (start, end) == (1.0, 1.5)
        assert heard == "ว้าวแหวน", "the reading kept must be what was said"

    def test_a_mispronounced_target_is_still_cut_out_of_the_carrier(self):
        """When the engine says the wrong thing it says it *in the target's
        slot*, and the span finds that slot rather than giving up — `มาม่า`
        for `งาม` was a real failure of this course's Thai. So the clip that
        comes back is the bad word alone, which the pipeline's own check then
        rejects, and the next seed gets a turn. The trim does not invent a
        second way for a take to fail."""
        heard, start, end = LocalThaiVoice._span(carrier_words("มาม่า"), "งาม")
        assert (start, end) == (1.0, 1.5)
        assert heard == "มาม่า", (
            "the wrong word must be reported as the wrong word — this is what "
            "the pipeline then rejects the take on"
        )

    def test_a_target_absent_altogether_still_returns_a_usable_range(self):
        """Nothing in the carrier resembles the target here. The span is
        meaningless, and that is fine — it must simply be a real range that
        ffmpeg can cut, so the failure surfaces as a clip that does not
        verify rather than as a crash mid-build."""
        words = carrier_words("ขอบคุณ")
        _heard, start, end = LocalThaiVoice._span(words, "ยักษ์")
        assert start < end
        assert start >= words[0].start and end <= words[-1].end


class TestWhenACarrierIsUsedAtAll:
    """Long Thai is its own context and is left alone — it also gives the trim
    more places to cut wrongly, so the threshold is a safety rail in both
    directions."""

    @pytest.mark.parametrize("text", ["งาม", "วง", "วอ แหวน", "งอ งู", "ยอ ยักษ์"])
    def test_every_letter_name_and_short_word_is_under_the_limit(self, text):
        assert len(normalise_thai(text)) <= CARRIER_LIMIT

    def test_a_narration_sentence_is_over_it(self):
        sentence = "ฉัน พูด ภาษา อังกฤษ ได้ ค่ะ"
        assert len(normalise_thai(sentence)) > CARRIER_LIMIT

    def test_long_text_goes_straight_to_the_engine_untouched(self):
        sentence = "ฉัน พูด ภาษา อังกฤษ ได้ ค่ะ ขอ จอง ตั๋ว รถเมล์ ค่ะ"
        asked: list[str] = []

        class Engine:
            def synthesize(self, text, language, spec, seed):
                asked.append(text)
                return b"audio"

        voice = LocalThaiVoice(engine=Engine(), transcriber=None)
        assert voice.synthesize(sentence, "th", VoiceSpec(), 42) == b"audio"
        assert asked == [sentence], "a long line must not be wrapped in a carrier"

    def test_short_text_is_wrapped_and_the_target_is_inside_it(self):
        asked: list[str] = []

        class Engine:
            def synthesize(self, text, language, spec, seed):
                asked.append(text)
                return b"audio"

        class Transcriber:
            def words(self, audio):
                return carrier_words("งาม")

        voice = LocalThaiVoice(engine=Engine(), transcriber=Transcriber())
        with pytest.raises(VendorError):
            # No ffmpeg on b"audio"; the point is what was asked for.
            voice.synthesize("งาม", "th", VoiceSpec(), 42)
        assert asked == [f"{CARRIER_PREFIX} [pause] งาม [pause] {CARRIER_SUFFIX}"]

    def test_a_silent_take_is_rejected_rather_than_cut(self):
        class Engine:
            def synthesize(self, text, language, spec, seed):
                return b"audio"

        class Transcriber:
            def words(self, audio):
                return []

        voice = LocalThaiVoice(engine=Engine(), transcriber=Transcriber())
        with pytest.raises(VendorError, match="nothing was heard"):
            voice.synthesize("งาม", "th", VoiceSpec(), 42)


class TestTheThaiCacheKeyIsNotDisturbed:
    """Existing Thai is native, metered and already verified. The local engine
    exists to make Thai that does not exist yet — never to replace that."""

    def test_the_thai_key_still_names_the_voice_and_not_the_engine(self):
        key = VoiceSpec().for_language("th")
        assert sorted(key) == ["modelId", "settings", "voiceId"]

    def test_pointing_at_a_different_thai_reference_does_not_rekey_thai(self, tmp_path):
        audio, text = tmp_path / "other.mp3", tmp_path / "other.txt"
        audio.write_bytes(b"different"), text.write_text("อื่น", encoding="utf-8")
        swapped = VoiceSpec(thai_reference_audio=audio, thai_reference_text=text)
        assert swapped.for_language("th") == VoiceSpec().for_language("th")

    def test_but_the_two_references_are_still_told_apart(self, tmp_path):
        audio, text = tmp_path / "other.mp3", tmp_path / "other.txt"
        audio.write_bytes(b"different"), text.write_text("อื่น", encoding="utf-8")
        swapped = VoiceSpec(thai_reference_audio=audio, thai_reference_text=text)
        assert swapped.reference_digest("th") != VoiceSpec().reference_digest("th")
        assert swapped.reference_digest("en") == VoiceSpec().reference_digest("en")


class TestWhichReadingTheCheckSees:
    """The pipeline verifies a clip by transcribing it back, and for a
    one-second Thai letter name that does not work: the same check rejects all
    five of the course's own native recordings. So the reading taken inside
    the carrier is the one that has to reach it."""

    def test_the_reading_taken_in_context_is_the_one_reported(self):
        voice = LocalThaiVoice(engine=None, transcriber=None)
        voice._readings["x"] = "unused"
        clip = b"trimmed-bytes"
        voice._readings[__import__("hashlib").sha256(clip).hexdigest()] = "งอ งู"

        vendor = SplitVendor(thai=voice, english=None, transcriber=None)
        assert vendor.transcribe(clip) == "งอ งู"

    def test_a_clip_it_does_not_know_is_transcribed_normally(self):
        voice = LocalThaiVoice(engine=None, transcriber=None)

        class Transcriber:
            def transcribe(self, audio):
                return "read afresh"

        vendor = SplitVendor(thai=voice, english=None, transcriber=Transcriber())
        assert vendor.transcribe(b"never seen") == "read afresh"

    def test_an_engine_with_no_readings_at_all_still_works(self):
        """The metered Thai path has no `reading_of`, and must not need one."""

        class Metered:
            supports_markup = True

        class Transcriber:
            def transcribe(self, audio):
                return "read afresh"

        vendor = SplitVendor(
            thai=Metered(), english=None, transcriber=Transcriber()
        )
        assert vendor.transcribe(b"anything") == "read afresh"

    def test_a_wrong_word_is_reported_as_the_wrong_word(self):
        """Not an exemption. A take that said something else is heard saying
        something else, and the pipeline rejects it exactly as before — what
        moved is where whisper was standing, not what counts as a pass."""
        voice = LocalThaiVoice(engine=None, transcriber=None)
        clip = b"a-bad-take"
        voice._readings[__import__("hashlib").sha256(clip).hexdigest()] = "มาม่า"

        vendor = SplitVendor(thai=voice, english=None, transcriber=None)
        from lesson_deck.pipeline import transcript_matches

        assert not transcript_matches("งาม", vendor.transcribe(clip))


class TestTheCarrierCannotStandInForTheTarget:
    """The one failure this arrangement must not have is a wrong clip that
    passes. Searching the whole carrier for the target allows exactly that
    when the two resemble each other, so the carrier's own words are dropped
    before the search."""

    def test_a_target_hiding_inside_the_prefix_is_not_found_there(self):
        """`ขอ` is the first syllable of `ขอโทษ`. Searching the whole clip
        would find it in the prefix and ship audio of the carrier."""
        words = carrier_words("มาม่า")
        middle = LocalThaiVoice._between_the_carrier(words)
        assert all("ขอโทษ" not in w.word for w in middle)
        assert all("ขอบคุณ" not in w.word for w in middle)

    def test_the_target_itself_survives_the_drop(self):
        middle = LocalThaiVoice._between_the_carrier(carrier_words("งาม"))
        assert [w.word for w in middle] == ["งาม"]

    def test_a_carrier_the_transcriber_ran_together_is_still_recognised(self):
        """Whisper does not tokenise the same carrier the same way twice —
        `ขอโทษค่ะ` came back as one word in this build's own failures."""
        words = [
            Word("ขอโทษค่ะ", 0.10, 0.70),
            Word("งาม", 1.00, 1.50),
            Word("ขอบคุณค่ะ", 2.10, 2.70),
        ]
        assert [w.word for w in LocalThaiVoice._between_the_carrier(words)] == ["งาม"]

    def test_an_unrecognisable_carrier_leaves_the_words_alone(self):
        """When the engine did not say the carrier recognisably, guessing
        where it would have been is worse than searching the whole clip — the
        take then fails the check on its own merits."""
        words = [Word("สวัสดีครับ", 0.1, 0.6), Word("น้อง", 0.6, 1.0)]
        assert LocalThaiVoice._between_the_carrier(words) == words

    def test_nothing_between_the_ends_falls_back_rather_than_empties(self):
        words = [Word("ขอโทษ", 0.1, 0.4), Word("ค่ะ", 0.4, 0.7)]
        assert LocalThaiVoice._between_the_carrier(words)
