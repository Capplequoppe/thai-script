"""The conversation pipeline: TTS opening synthesis and reply judging.

Two pure-ish, synchronous functions that take *loaded* model objects
plus request data and return response data — no FastAPI, no HTTP, no
imports from `app.models` — so tests call them directly with per-model
fakes (`backend/tests/conftest.py`) and never need a GPU for logic that
has nothing to do with one.

Serialization: the HTTP layer (`app.main`) runs each call through
`run_serialized`, which holds task 1.1's module-level `MODEL_LOCK` and
moves the blocking work off the event loop — that is where the
"two in-flight requests never hit the GPU concurrently" guarantee
lives, proven by `backend/tests/test_health.py`'s concurrency test.
"""

from __future__ import annotations

import io
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from app.judge_prompt import build_judge_messages, parse_judge_response

# The one fixed exchange of phase 1. Phase 2 replaces the *caller* with
# bank-selected content, not this function's shape.
OPENING_QUESTION_TEXT = "สบายดีไหม"
OPENING_AUDIO_MIME_TYPE = "audio/wav"

REFERENCE_CLIP_PATH = Path(__file__).resolve().parent.parent / "assets" / "reference_clip.wav"
# Whisper large-v3's own offline transcription of that clip, produced
# once (same procedure as the spike); F5-TTS voice cloning wants the
# transcript exactly as the ASR heard it, so it is kept verbatim.
REFERENCE_CLIP_TRANSCRIPT = "ตื่นแต่เช้าแล้วออกไปเดินเล่นที่ส่วนสาธารณะมีต้นไม้เขียวขจี"

# Four distinct system-side causes, four distinct learner-facing
# messages (AC4/AC5) — all surfaced as verdict "unscored", never "fail":
# "fail" is reserved for a reply the judge actually evaluated and found
# wanting, so a backend hiccup is never counted as a learner's mistake.
FEEDBACK_EMPTY_TRANSCRIPT = (
    "No speech was detected in your recording, so it wasn't scored — "
    "try answering again, a little louder."
)
FEEDBACK_TRANSCRIPTION_ERROR = (
    "Transcribing your recording failed on our side, so it wasn't scored — "
    "please try the same answer again."
)
FEEDBACK_JUDGE_ERROR = (
    "The judge model hit an error while scoring your reply, so it wasn't "
    "scored — please try again."
)
FEEDBACK_JUDGE_UNPARSEABLE = (
    "The judge couldn't produce a readable verdict for your reply, so it "
    "wasn't scored — please try again."
)

# A stripped transcript shorter than this is "nothing heard".
_MIN_TRANSCRIPT_CHARS = 2


class UndecodableAudioError(ValueError):
    """The reply audio bytes are not a decodable audio container.

    A *client*-side problem (the caller sent bytes no audio demuxer
    recognizes), distinct from every "unscored" outcome — `app.main`
    maps it to HTTP 422, never a 500 and never a verdict.
    """


@dataclass(frozen=True)
class JudgeOutcome:
    transcript: str
    verdict: Literal["pass", "fail", "unscored"]
    feedback_en: str


def synthesize_opening(tts_pipeline: Any) -> tuple[str, bytes, str]:
    """Speak the fixed opening question in the cloned voice.

    Returns (question_text, audio_bytes, mime_type). The reference clip
    and its transcript are the checked-in pair under `backend/assets/`.
    """
    with tempfile.TemporaryDirectory(prefix="conversation-tts-") as tmp_dir:
        output_path = Path(tmp_dir) / "opening.wav"
        tts_pipeline(
            text=OPENING_QUESTION_TEXT,
            ref_voice=str(REFERENCE_CLIP_PATH),
            ref_text=REFERENCE_CLIP_TRANSCRIPT,
            output_file=str(output_path),
        )
        audio_bytes = output_path.read_bytes()
    if not audio_bytes:
        # Synthesis that "succeeded" but produced nothing must fail
        # loudly (a 5xx, like any other synthesis exception) — never
        # ship as a confident 200 whose audio is zero bytes.
        raise RuntimeError("TTS synthesis produced an empty audio file for the opening question")
    return OPENING_QUESTION_TEXT, audio_bytes, OPENING_AUDIO_MIME_TYPE


def _decode_reply_audio(reply_audio_bytes: bytes, reply_audio_mime_type: str) -> Any:
    """Decode inbound reply audio through faster-whisper's own decoder.

    The bytes are whatever the browser's MediaRecorder emitted —
    `reply_audio_mime_type` declares it, and the decoder (PyAV, via
    `faster_whisper.audio.decode_audio`) sniffs the actual container, so
    webm/opus, ogg, wav, … all decode without this code ever assuming
    WAV. The stdlib `wave` module is never used on this field.
    """
    # Imported lazily: pulls in ctranslate2, which non-GPU tests that
    # never touch audio decoding shouldn't pay for at import time.
    from faster_whisper.audio import decode_audio

    try:
        decoded = decode_audio(io.BytesIO(reply_audio_bytes))
    except Exception as exc:
        raise UndecodableAudioError(
            f"reply audio is not decodable as audio (declared MIME type "
            f"{reply_audio_mime_type!r})"
        ) from exc
    if len(decoded) == 0:
        raise UndecodableAudioError(
            f"reply audio decoded to zero samples (declared MIME type "
            f"{reply_audio_mime_type!r})"
        )
    return decoded


def judge_reply(
    whisper: Any,
    llm: Any,
    tokenizer: Any,
    question_text: str,
    reply_audio_bytes: bytes,
    reply_audio_mime_type: str,
) -> JudgeOutcome:
    """Transcribe a spoken reply and judge it against the question.

    Every system-side failure comes back as a distinct-message
    `"unscored"` outcome; only `UndecodableAudioError` (the caller's
    payload, not our pipeline) escapes as an exception.
    """
    decoded_audio = _decode_reply_audio(reply_audio_bytes, reply_audio_mime_type)

    try:
        # vad_filter drops non-speech before decoding, which is what
        # keeps Whisper from hallucinating plausible speech out of
        # silence (asserted against the real model in AC6's gpu test).
        segments, _info = whisper.transcribe(decoded_audio, language="th", vad_filter=True)
        transcript = "".join(segment.text for segment in segments).strip()
    except Exception:  # noqa: BLE001 — deliberately broad: ANY failure of
        # this model layer must become its distinct "unscored" outcome
        # (AC5), never escape as a raw 500 to the learner.
        return JudgeOutcome("", "unscored", FEEDBACK_TRANSCRIPTION_ERROR)

    if len(transcript) < _MIN_TRANSCRIPT_CHARS:
        return JudgeOutcome(transcript, "unscored", FEEDBACK_EMPTY_TRANSCRIPT)

    messages = build_judge_messages(question_text, transcript)
    try:
        completion = _generate_judge_completion(llm, tokenizer, messages)
    except Exception:  # noqa: BLE001 — same deliberate breadth as above,
        # for the judge layer's own distinct message.
        return JudgeOutcome(transcript, "unscored", FEEDBACK_JUDGE_ERROR)

    parsed = parse_judge_response(completion)
    if parsed is None:
        return JudgeOutcome(transcript, "unscored", FEEDBACK_JUDGE_UNPARSEABLE)
    verdict, reason = parsed
    return JudgeOutcome(transcript, verdict, reason)


def _generate_judge_completion(llm: Any, tokenizer: Any, messages: list[dict[str, str]]) -> str:
    """Greedy-decode one judge completion.

    transformers 5.x: `apply_chat_template(..., return_tensors="pt",
    return_dict=True)` returns a `BatchEncoding` dict, not a bare tensor
    — hence `generate(**inputs)` (plan CONTEXT.md; re-check if the pin
    changes).
    """
    inputs = tokenizer.apply_chat_template(
        messages, add_generation_prompt=True, return_tensors="pt", return_dict=True
    )
    inputs = inputs.to(llm.device)
    prompt_length = inputs["input_ids"].shape[-1]
    output = llm.generate(**inputs, max_new_tokens=120, do_sample=False)
    return tokenizer.decode(output[0][prompt_length:], skip_special_tokens=True)
