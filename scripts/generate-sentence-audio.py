#!/usr/bin/env python3
"""Generate the missing `thai_audio_file` clips for `sentences.json`.

Piggybacks on the AI-conversation-practice backend (`plans/ai-conversation-
practice/`): the same vendored ThonburianTTS voice-cloning pipeline that
speaks the AI partner's turns, the same reference clip and transcript, and
the same faster-whisper large-v3 that transcribes the learner's replies.
Nothing about the models is re-decided here — `--backend-dir` points at
that project and `app.models`/`app.pipeline` supply it all.

Per sentence:

  1. **Concatenate.** `sentences.json` stores words space-joined
     ("มา กิน กัน") so generators can split on them, but real Thai has no
     word spaces and a TTS engine fed the spaced form reads it as
     separate utterances with pauses between. The synthesized text is the
     whitespace-stripped form — the same transform `stripWordSpacing` in
     `src/presentation/utils/thaiText.ts` applies for display.
  2. **Synthesize** through the cloned voice.
  3. **Trim then pad.** Whatever silence the vocoder happened to emit on
     each end is trimmed off and replaced with exactly `--pad-ms` of
     digital silence, so every clip has the same lead-in and no player
     clips the first phoneme.
  4. **Encode** to mono 44.1kHz ~64kbps mp3 — matching the 177 clips
     already shipped in `public/audio/`.
  5. **Verify by transcribing the encoded mp3 back** through Whisper.
     **This is not a formality — takes fail it constantly, for reasons
     that are audible.** F5-TTS voice cloning echoes the tail of the
     *reference clip* into the head of the generated audio: a clip for
     "สภาพอากาศวันนี้…" comes back as "เขียวคจีสภาพอากาศวันนี้…",
     "เขียวขจี" being the reference recording's last word. Because the
     generated window is a fixed length derived from character count,
     an echo at the front also squeezes the sentence itself into less
     time, so a bled take is a *rushed* take.

     Three checks, because no one of them sees all of it:

     - **The transcript must match.** Catches an echo Whisper heard as
       words, and a garbled utterance.
     - **The first word must start when the padding ends.** Catches the
       rest: `vad_filter` drops non-speech before transcription, so an
       echo Whisper classed as noise leaves a *perfect* transcript.
       Measured on shipped clips — a 0.94s head gap behind a
       character-exact transcript. Without this check they pass.
     - **The delivery must not be rushed.** The reference voice runs at
       ~106ms/char; a clean take lands at 96-108. Anything much faster
       is a take that spent its opening on an echo.

     A take failing any of them is retried, along two axes. **Seed**
     is the cheap one — the echo is a property of the sampled
     trajectory, so a fresh seed often just doesn't have it. **The
     reference clip** is the second, and it is not redundant with the
     first: sentences exist that fail all twelve seeds on one clip and
     pass on another, in both directions. `speed`, `cfg_strength` and
     `nfe_step` were all measured and are *not* levers — slowing speed
     down enlarges the window the echo grows into, making it worse.

Filenames follow the existing convention, `sentence-<romanization-slug>.mp3`
— `audio_slug` below reproduces all 177 committed filenames exactly from
their romanization, which is what pins the rule.

Usage (the backend's uv environment supplies torch/whisper/flowtts):

    uv run --project ../backend python scripts/generate-sentence-audio.py \
        --backend-dir ../backend --limit 6 --report /tmp/spike.json
"""

from __future__ import annotations

import argparse
import difflib
import io
import json
import math
import re
import subprocess
import sys
import tempfile
import time
import unicodedata
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
SENTENCES_JSON = REPO_ROOT / "src" / "domain" / "sentence" / "data" / "sentences.json"
AUDIO_DIR = REPO_ROOT / "public" / "audio"
# `thai_audio_file` values are site-absolute under the Vite base path.
AUDIO_URL_PREFIX = "/thai-script/audio/"

# Match the 177 already-shipped sentence clips: mono, 44.1kHz, ~64kbps.
MP3_SAMPLE_RATE = "44100"
MP3_BITRATE = "64k"

# Silence trimming: anything under this, in a 10ms window, is not speech.
TRIM_THRESHOLD_DBFS = -45.0
TRIM_WINDOW_MS = 10

# The reference echo is a property of the sampled trajectory, so a fresh
# seed usually just doesn't have it — measured at roughly a 1-in-3 hit
# rate per take, which is what sets this list's length. Speed is
# deliberately NOT a lever: 1.0, 0.85, 0.75 and 0.65 were measured, and
# every reduction made the echo *longer* ("เขียวขจี" grew to
# "มีต้นไม้เขียวขจี" at 0.65), because a slower speed buys a longer
# window and the echo expands to fill it.
RETRY_SEEDS = (42, 1, 2, 3, 7, 11, 13, 17, 19, 23, 29, 31)
SYNTHESIS_SPEED = 1.0

# Extra reference clips, tried in order once every seed on the previous
# one has failed. All are cuts of the same personal recording as the
# conversation backend's own clip, so the voice never changes — only
# which few seconds of it the model is conditioned on, which measurably
# decides whether a given sentence comes out clean. Their transcripts
# are Whisper's, produced once by this script's own --backend-dir model.
EXTRA_REFERENCES_MANIFEST = Path(__file__).resolve().parent / "assets" / "reference-clips.json"

# The reference recording speaks at 6.15s / 58 characters = 106 ms/char.
# Clean takes land at 96-108; takes that open with an echo are squeezed
# to 64-91, which is the "far too fast" a listener notices immediately.
REFERENCE_MS_PER_CHAR = 106.0

# How late the first transcribed word may start, relative to the end of
# the padding, before the gap is treated as audible content Whisper's
# VAD threw away rather than ordinary timestamp slop.
HEAD_GAP_TOLERANCE_SECONDS = 0.12

# F5-TTS paces the utterance to fill its whole window, so the final
# syllable habitually runs into the last sample at near-full level — the
# raw output was measured going from 0 dBFS to digital silence inside one
# 20ms window, which is heard as the last syllable being chopped off.
# Nothing is actually missing (the transcript is exact); what is missing
# is the decay. A short fade supplies it. Rejecting these instead was
# measured to reject nearly every take, since almost all of them end this
# way — this is how the model behaves, not a defect in a given take.
FADE_IN_MS = 10
FADE_OUT_MS = 35

# Characters that carry no pronunciation difference and so must not count
# against the STT round-trip: ASCII/Thai punctuation and all whitespace.
_IGNORED_IN_COMPARISON = re.compile(r"[\s.,!?;:\"'`()\[\]{}…ๆฯ๏๚๛-]+")


# --------------------------------------------------------------------------
# Pure helpers
# --------------------------------------------------------------------------


def audio_slug(romanization: str) -> str:
    """Reproduce the shipped `sentence-<slug>.mp3` naming rule.

    Verified to regenerate all 177 existing `thai_audio_file` values with
    zero mismatches, which is the only reason to trust it for new ones:
    lowercase, drop combining tone diacritics (â → a), *delete* letters
    outside a-z0-9 rather than replacing them (ɔ vanishes: "chɔ̂ɔp" →
    "chp"), and collapse spaces and hyphens into single hyphens.
    """
    decomposed = unicodedata.normalize("NFD", romanization.lower())
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    kept = re.sub(r"[^a-z0-9 \-]+", "", stripped)
    return re.sub(r"[ \-]+", "-", kept).strip("-")


def spoken_text(sentence: dict[str, Any]) -> str:
    """The text actually handed to the TTS engine: no word spacing."""
    return re.sub(r"\s+", "", sentence["thai"])


def comparable(text: str) -> str:
    """Normalize for the STT round-trip comparison."""
    return _IGNORED_IN_COMPARISON.sub("", unicodedata.normalize("NFC", text))


def compare_transcript(expected: str, actual: str) -> tuple[float, int]:
    """Score an STT round-trip as (coverage, extra_characters).

    Two separate questions, because a plain similarity ratio answers
    neither well. *Coverage* — how much of the intended sentence the
    transcript actually contains — catches a garbled or truncated
    utterance. *Extra* — transcript characters belonging to no match —
    catches the reference-clip bleed, which leaves the intended sentence
    fully intact and merely glues a foreign fragment to its front. A
    ratio scores that around 0.88, indistinguishable from ordinary ASR
    noise; `extra` scores it 8 characters, which is unambiguous.
    """
    exp, act = comparable(expected), comparable(actual)
    if not exp:
        return 0.0, len(act)
    matcher = difflib.SequenceMatcher(None, exp, act, autojunk=False)
    matched = sum(block.size for block in matcher.get_matching_blocks())
    return matched / len(exp), len(act) - matched




def assign_filenames(sentences: list[dict[str, Any]]) -> dict[str, str]:
    """Map sentence id → target mp3 filename, disambiguating collisions.

    Two romanizations in the 950-entry library slugify identically
    (e.g. "ร่วม กัน" and "รวม กัน" are both `ruuam-gan`). Rather than let
    one clip silently overwrite the other, the first by document order
    keeps the bare slug and later ones get a `-2`, `-3`, … suffix. Slugs
    already claimed by a shipped clip count as taken, so regenerating
    never renames an existing file.
    """
    taken: set[str] = set()
    for sentence in sentences:
        existing = sentence.get("thai_audio_file")
        if existing:
            taken.add(Path(existing).stem)
    names: dict[str, str] = {}
    for sentence in sentences:
        existing = sentence.get("thai_audio_file")
        if existing:
            names[sentence["id"]] = Path(existing).name
            continue
        base = f"sentence-{audio_slug(sentence['romanization'])}"
        candidate, suffix = base, 1
        while candidate in taken:
            suffix += 1
            candidate = f"{base}-{suffix}"
        taken.add(candidate)
        names[sentence["id"]] = f"{candidate}.mp3"
    return names


@dataclass(frozen=True)
class Reference:
    """One voice-cloning reference: a clip and its exact transcript."""

    name: str
    audio_path: Path
    transcript: str


def load_references(pipeline: Any, manifest_path: Path) -> list[Reference]:
    """The conversation backend's own clip first, then the extras.

    The backend's clip leads because it is the voice the conversation
    feature ships, and most sentences never need anything else.
    """
    references = [
        Reference("backend", pipeline.REFERENCE_CLIP_PATH, pipeline.REFERENCE_CLIP_TRANSCRIPT)
    ]
    if manifest_path.is_file():
        for entry in json.loads(manifest_path.read_text(encoding="utf-8")):
            references.append(
                Reference(
                    entry["name"], manifest_path.parent / entry["audio"], entry["transcript"]
                )
            )
    return references


def retry_plan(references: Sequence[Reference], max_attempts: int) -> list[tuple[Reference, int]]:
    """Every (reference, seed) pair to try, cheapest-first.

    Seeds are exhausted on one reference before moving to the next,
    rather than interleaved: the leading reference clears most sentences
    within a couple of takes, so interleaving would only spread the
    common case across more clips for no gain.
    """
    plan = [(reference, seed) for reference in references for seed in RETRY_SEEDS]
    return plan[:max_attempts]


# --------------------------------------------------------------------------
# Audio post-processing
# --------------------------------------------------------------------------


def load_mono(wav_bytes: bytes) -> tuple[Any, int]:
    import soundfile as sf

    audio, sample_rate = sf.read(io.BytesIO(wav_bytes), dtype="float32", always_2d=True)
    return audio.mean(axis=1), sample_rate


def to_wav(samples: Any, sample_rate: int) -> bytes:
    import soundfile as sf

    buffer = io.BytesIO()
    sf.write(buffer, samples, sample_rate, format="WAV", subtype="PCM_16")
    return buffer.getvalue()


def trim_and_pad(mono: Any, sample_rate: int, pad_ms: int) -> tuple[Any, float]:
    """Trim silence off both ends, then pad both ends with `pad_ms`.

    Returns (samples, speech_duration_seconds). Padding is added after
    trimming rather than on top of whatever the vocoder emitted, so the
    lead-in is identical for every clip instead of varying by utterance
    — including for a clip whose head was just cut off by a repair.
    """
    import numpy as np

    window = max(1, int(sample_rate * TRIM_WINDOW_MS / 1000))
    threshold = 10.0 ** (TRIM_THRESHOLD_DBFS / 20.0)
    usable = len(mono) - len(mono) % window
    if usable:
        frames = mono[:usable].reshape(-1, window)
        loud = np.flatnonzero(np.abs(frames).max(axis=1) >= threshold)
    else:
        loud = np.array([], dtype=int)

    if loud.size:
        start = int(loud[0]) * window
        end = min(len(mono), (int(loud[-1]) + 1) * window)
    else:
        # Entirely below threshold — keep the samples rather than emit an
        # empty file, and let the STT check be the thing that fails it.
        start, end = 0, len(mono)

    speech = mono[start:end].copy()
    _apply_fades(speech, sample_rate)
    pad = np.zeros(int(sample_rate * pad_ms / 1000), dtype="float32")
    return np.concatenate([pad, speech, pad]), len(speech) / sample_rate


def _apply_fades(speech: Any, sample_rate: int) -> None:
    """Ease the clip in and out, in place.

    The fade-out is the one that matters: it turns the model's habit of
    ending at full level into a decay, which is the difference between a
    last syllable that sounds finished and one that sounds chopped off.
    The fade-in is just click insurance at the trim point. Both are
    raised-cosine rather than linear, so neither is audible as a shape of
    its own.
    """
    import numpy as np

    for length_ms, at_start in ((FADE_IN_MS, True), (FADE_OUT_MS, False)):
        n = min(int(sample_rate * length_ms / 1000), len(speech))
        if n <= 1:
            continue
        ramp = (1 - np.cos(np.linspace(0, np.pi, n, dtype="float32"))) / 2
        if at_start:
            speech[:n] *= ramp
        else:
            speech[-n:] *= ramp[::-1]


def encode_mp3(wav_bytes: bytes) -> bytes:
    """Encode to the shipped clips' format, in memory.

    In memory because the STT check has to run on the *encoded* artifact
    — the thing the app will actually play — and a take that fails it is
    thrown away rather than written, so nothing should touch the audio
    directory until a take has passed.
    """
    completed = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-f", "wav", "-i", "pipe:0",
            "-ac", "1", "-ar", MP3_SAMPLE_RATE, "-b:a", MP3_BITRATE,
            "-codec:a", "libmp3lame", "-f", "mp3", "pipe:1",
        ],
        input=wav_bytes,
        capture_output=True,
        check=True,
    )
    return completed.stdout


# --------------------------------------------------------------------------
# Model wiring — imported from the conversation-practice backend
# --------------------------------------------------------------------------


def import_backend(backend_dir: Path) -> tuple[Any, Any]:
    """Put the conversation backend on `sys.path` and hand back its modules.

    Deliberately not vendored or re-implemented here: the reference clip,
    its transcript, the vendored flowtts tree and every model id live
    there, and a second copy of those decisions would drift from the one
    the conversation feature actually ships.
    """
    backend_dir = backend_dir.resolve()
    if not (backend_dir / "app" / "pipeline.py").is_file():
        raise SystemExit(
            f"--backend-dir {backend_dir} does not look like the conversation backend "
            f"(no app/pipeline.py). Point it at a checkout that carries "
            f"plans/ai-conversation-practice's backend/."
        )
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    from app import models, pipeline

    return models, pipeline


def synthesize(tts: Any, reference: Reference, text: str, seed: int) -> bytes:
    """One take, at a given seed and speed.

    `app.pipeline.synthesize_question` would do all of this, but it pins
    both the seed and the reference clip — deliberately, since the
    conversation feature wants one question to sound the same every
    time. Batch generation needs the opposite: a rejected take must be
    retried differently, or it just fails identically forever.
    """
    tts.model_config.seed = seed
    with tempfile.TemporaryDirectory(prefix="sentence-tts-") as tmp_dir:
        output_path = Path(tmp_dir) / "take.wav"
        tts(
            text=text,
            ref_voice=str(reference.audio_path),
            ref_text=reference.transcript,
            output_file=str(output_path),
            speed=SYNTHESIS_SPEED,
        )
        wav_bytes = output_path.read_bytes()
    if not wav_bytes:
        raise RuntimeError("TTS synthesis produced an empty audio file")
    return wav_bytes


def transcribe(whisper: Any, mp3_bytes: bytes) -> tuple[str, list[tuple[str, float]]]:
    """Transcribe the encoded clip, returning the text and a char timeline.

    Word timestamps come back on every call because a failed round-trip
    is more often repairable than not, and the timeline is what tells
    the repair where the bleed stops. The timeline is per *comparable*
    character — punctuation and spacing dropped — so it lines up index
    for index with what `compare_transcript` matched on.
    """
    from faster_whisper.audio import decode_audio

    decoded = decode_audio(io.BytesIO(mp3_bytes))
    segments, _info = whisper.transcribe(
        decoded, language="th", vad_filter=True, word_timestamps=True
    )
    text_parts: list[str] = []
    timeline: list[tuple[str, float]] = []
    for segment in segments:
        text_parts.append(segment.text)
        for word in segment.words or ():
            timeline.extend((char, word.start) for char in comparable(word.word))
    return "".join(text_parts).strip(), timeline


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------


def generate_one(
    *,
    tts: Any,
    references: Sequence[Reference],
    whisper: Any | None,
    text: str,
    args: argparse.Namespace,
) -> tuple[bytes | None, dict[str, Any]]:
    """Take after take until one clears every gate.

    Returns (mp3_bytes_or_None, record_fields). A `None` first element
    means every take was rejected; the record then carries the best
    one's numbers and the reason it lost, so a human can see how close
    it got and to what.
    """
    attempts: list[dict[str, Any]] = []
    best: tuple[tuple[float, int], dict[str, Any]] | None = None
    chars = len(comparable(text))

    for index, (reference, seed) in enumerate(retry_plan(references, args.max_attempts), start=1):
        raw_wav = synthesize(tts, reference, text, seed)
        mono, sample_rate = load_mono(raw_wav)
        padded, speech_seconds = trim_and_pad(mono, sample_rate, args.pad_ms)
        mp3_bytes = encode_mp3(to_wav(padded, sample_rate))
        attempt: dict[str, Any] = {
            "attempt": index,
            "seed": seed,
            "reference": reference.name,
            "speech_seconds": round(speech_seconds, 3),
            "ms_per_char": round(1000 * speech_seconds / chars, 1) if chars else 0.0,
        }

        if whisper is None:
            attempts.append(attempt | {"verified": False})
            return mp3_bytes, {"attempts": attempts, **attempt}

        transcript, timeline = transcribe(whisper, mp3_bytes)
        coverage, extra = compare_transcript(text, transcript)
        # Whisper times the clip it was given, padding included, so the
        # first word of a clean take starts exactly where the padding
        # ends. Anything appreciably later is audio that is in the file
        # but not in the transcript.
        head_gap = (timeline[0][1] - args.pad_ms / 1000) if timeline else float("inf")
        attempt |= {
            "transcript": transcript,
            "coverage": round(coverage, 4),
            "extra_chars": extra,
            "head_gap": round(head_gap, 3) if timeline else None,
        }

        reason = None
        if coverage < args.min_coverage:
            reason = f"transcript covers only {coverage:.0%} of the text"
        elif extra > args.max_extra_chars:
            reason = f"{extra} transcribed characters that are not in the text"
        elif head_gap > HEAD_GAP_TOLERANCE_SECONDS:
            reason = f"{head_gap:.2f}s of untranscribed audio before the first word"
        elif attempt["ms_per_char"] < args.min_ms_per_char:
            reason = f"rushed: {attempt['ms_per_char']:.0f} ms/char"
        attempt["reason"] = reason
        attempts.append(attempt)

        if reason is None:
            return mp3_bytes, {"attempts": attempts, **attempt}
        # Rank losers by coverage, then by how little junk they carry,
        # so the report's "closest miss" is the most informative one.
        score = (coverage, -extra)
        if best is None or score > best[0]:
            best = (score, attempt)

    assert best is not None
    return None, {"attempts": attempts, "best_attempt": best[1]}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--backend-dir", type=Path, default=REPO_ROOT / "backend",
                        help="Checkout of the conversation-practice backend/ (default: %(default)s)")
    parser.add_argument("--sentences", type=Path, default=SENTENCES_JSON)
    parser.add_argument("--audio-dir", type=Path, default=AUDIO_DIR)
    parser.add_argument("--ids", default="", help="Comma-separated sentence ids; overrides --limit")
    parser.add_argument("--limit", type=int, default=0, help="Generate at most N missing clips (0 = all)")
    parser.add_argument("--pad-ms", type=int, default=300,
                        help="Silence padded onto each end (default: %(default)s)")
    parser.add_argument("--references", type=Path, default=EXTRA_REFERENCES_MANIFEST,
                        help="JSON manifest of extra reference clips to fall back to "
                             "(default: %(default)s)")
    parser.add_argument("--max-attempts", type=int, default=3 * len(RETRY_SEEDS),
                        help="Takes per sentence, across all reference clips, before giving up "
                             "and leaving it without audio (default: %(default)s). Most sentences "
                             "pass in one or two; the budget exists for the minority that echo on "
                             "every seed of the first clip. Very short sentences — two syllables, "
                             "no context for the model to lean on — are the ones that exhaust it, "
                             "and a cutoff is cheaper than a length rule guessed in advance: "
                             "which short sentences the voice handles badly is decided per "
                             "sentence by the round-trip, not by character count")
    parser.add_argument("--min-coverage", type=float, default=0.9,
                        help="Fraction of the intended text the transcript must contain")
    parser.add_argument("--min-ms-per-char", type=float, default=88.0,
                        help=f"Slowest-acceptable delivery, in milliseconds of speech per "
                             f"character. The reference voice runs at {REFERENCE_MS_PER_CHAR:.0f}; "
                             f"a take opening with a reference echo is squeezed well below this "
                             f"(default: %(default)s)")
    parser.add_argument("--max-extra-chars", type=int, default=1,
                        help="Transcript characters matching nothing in the intended text that a "
                             "clip may still pass with. Deliberately near-zero and NOT scaled to "
                             "sentence length: the failure being caught is a foreign fragment "
                             "spliced onto an otherwise perfect sentence, which a long sentence "
                             "hides just as badly as a short one")
    parser.add_argument("--force", action="store_true", help="Regenerate even if the mp3 already exists")
    parser.add_argument("--no-verify", action="store_true",
                        help="Skip the STT round-trip. Off the happy path: retries have nothing to "
                             "judge, so every clip is kept sight-unseen, bleed and all.")
    parser.add_argument("--write-json", action="store_true",
                        help="Wire verified clips into sentences.json (otherwise files are written "
                             "but nothing references them)")
    parser.add_argument("--report", type=Path, default=None, help="Write a per-sentence JSON report here")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    sentences: list[dict[str, Any]] = json.loads(args.sentences.read_text(encoding="utf-8"))
    filenames = assign_filenames(sentences)

    if args.ids:
        wanted = [s.strip() for s in args.ids.split(",") if s.strip()]
        by_id = {s["id"]: s for s in sentences}
        unknown = [i for i in wanted if i not in by_id]
        if unknown:
            raise SystemExit(f"unknown sentence ids: {', '.join(unknown)}")
        targets = [by_id[i] for i in wanted]
    else:
        targets = [s for s in sentences if not s.get("thai_audio_file")]
        if args.limit:
            targets = targets[: args.limit]

    if not targets:
        print("nothing to generate — every sentence already has audio")
        return 0

    models, pipeline = import_backend(args.backend_dir)
    references = load_references(pipeline, args.references)
    print(f"references: {', '.join(r.name for r in references)}", flush=True)

    print(f"loading TTS ({models.TTS_CHECKPOINT}) …", flush=True)
    tts = models.load_tts()
    whisper = None
    if args.no_verify:
        print("!! --no-verify: clips are kept without an STT round-trip", flush=True)
    else:
        print(f"loading Whisper ({models.WHISPER_MODEL_ID}) …", flush=True)
        whisper = models.load_whisper()

    results: list[dict[str, Any]] = []
    started_run = time.perf_counter()
    for index, sentence in enumerate(targets, start=1):
        filename = filenames[sentence["id"]]
        destination = args.audio_dir / filename
        text = spoken_text(sentence)
        record: dict[str, Any] = {
            "id": sentence["id"],
            "thai": sentence["thai"],
            "spoken_text": text,
            "romanization": sentence["romanization"],
            "english": sentence["english"],
            "file": filename,
        }
        prefix = f"[{index}/{len(targets)}] {sentence['id']}"

        if destination.exists() and not args.force:
            results.append(record | {"status": "skipped", "reason": "file already exists"})
            print(f"{prefix} skip (exists)", flush=True)
            continue

        started = time.perf_counter()
        try:
            mp3_bytes, detail = generate_one(
                tts=tts, references=references, whisper=whisper, text=text, args=args
            )
        except Exception as exc:  # noqa: BLE001 — one bad sentence must not
            # abandon a 773-clip batch; it is recorded and the run continues.
            results.append(record | {"status": "error", "reason": f"{type(exc).__name__}: {exc}"})
            print(f"{prefix} ERROR {type(exc).__name__}: {exc}", flush=True)
            continue

        record |= detail
        record["elapsed_seconds"] = round(time.perf_counter() - started, 2)

        if mp3_bytes is None:
            miss = record["best_attempt"]
            results.append(record | {"status": "rejected", "reason": miss["reason"]})
            print(f"{prefix} REJECT after {len(record['attempts'])} takes — closest miss: "
                  f"{miss['reason']} (want {text!r}, got {miss['transcript']!r})", flush=True)
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(mp3_bytes)
        results.append(record | {"status": "ok", "bytes": len(mp3_bytes)})
        takes = len(record["attempts"])
        print(f"{prefix} ok {record['speech_seconds']:.2f}s {record['ms_per_char']:.0f}ms/ch "
              f"take {takes} ref={record['reference']} ({record['elapsed_seconds']:.1f}s) "
              f"→ {filename}", flush=True)

    if args.write_json:
        # "skipped" counts as much as "ok": its clip is on disk and passed
        # this same check on the run that made it. Wiring only "ok" would
        # mean a batch resumed after an interruption leaves every clip the
        # first pass produced sitting in public/audio/ unreferenced.
        wired = {r["id"] for r in results if r["status"] in ("ok", "skipped")}
        for sentence in sentences:
            if sentence["id"] in wired:
                sentence["thai_audio_file"] = AUDIO_URL_PREFIX + filenames[sentence["id"]]
        args.sentences.write_text(
            json.dumps(sentences, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"wired {len(wired)} clips into {args.sentences}")

    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(
            json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"report → {args.report}")

    by_status: dict[str, int] = {}
    for record in results:
        by_status[record["status"]] = by_status.get(record["status"], 0) + 1
    total_takes = sum(len(r.get("attempts", ())) for r in results)
    elapsed = time.perf_counter() - started_run
    print(f"summary: {', '.join(f'{k}={v}' for k, v in sorted(by_status.items()))} "
          f"({total_takes} takes, {math.floor(elapsed / 60)}m{elapsed % 60:02.0f}s)")
    return 0 if by_status.get("ok") or by_status.get("skipped") else 1


if __name__ == "__main__":
    raise SystemExit(main())
