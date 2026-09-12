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
  5. **Verify by transcribing the encoded mp3 back** through Whisper and
     comparing it to the intended text. **This check is not a formality
     — it fails often, and for a real reason.** F5-TTS voice cloning
     regularly bleeds a fragment of the *reference clip's* tail into the
     head of the generated audio (a clip for "สภาพอากาศวันนี้…" comes
     back transcribing as "เขียวคจีสภาพอากาศวันนี้…" — "เขียวขจี" being
     the reference recording's last word), and very short texts get a
     duration estimate so tight the utterance is unintelligible. Both
     are per-seed, so a failed take whose intended sentence *is* intact
     is first repaired — Whisper's word timestamps say where the bleed
     ends, and the head is cut there — and the repair is then put
     through the same round-trip, which is what catches the cut that
     ate a real first syllable. A take that neither passes nor repairs
     is retried at a different seed and, for texts short enough that
     time is the problem, a slower speed. Only audio that survives its
     own round-trip is written and wired in; anything that never does is
     reported for a human.

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

# Retry ladder. Seeds first, at natural speed: the reference-tail bleed is
# a property of the sampled trajectory, so a different seed usually just
# doesn't have it. Slower speeds come later and exist for short texts,
# where F5-TTS derives the generated duration from character count and
# leaves a two-syllable utterance ~0.4s to happen in — too rushed to be
# recognisable at any seed.
RETRY_SEEDS = (42, 1, 2, 3, 7, 11)
RETRY_SPEEDS = (1.0, 0.85, 0.7)

# Cut this much *before* the intended sentence's first transcribed
# character when repairing a bleed, so ASR's idea of the word boundary
# being a few milliseconds late doesn't shave the opening consonant.
HEAD_TRIM_MARGIN_SECONDS = 0.06

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


def retry_plan(max_attempts: int) -> list[tuple[int, float]]:
    """The (seed, speed) ladder, longest-odds last."""
    plan = [(seed, speed) for speed in RETRY_SPEEDS for seed in RETRY_SEEDS]
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

    speech = mono[start:end]
    pad = np.zeros(int(sample_rate * pad_ms / 1000), dtype="float32")
    return np.concatenate([pad, speech, pad]), len(speech) / sample_rate


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


def synthesize(tts: Any, pipeline: Any, text: str, seed: int, speed: float) -> bytes:
    """One take, at a given seed and speed.

    `app.pipeline.synthesize_question` would do all of this, but it fixes
    both knobs — deliberately, since the conversation feature wants one
    question to sound the same every time. Batch generation needs the
    opposite: a rejected take must be retried differently, or it just
    fails identically forever. The reference clip and its transcript
    still come from that module, so the voice is the same voice.
    """
    tts.model_config.seed = seed
    with tempfile.TemporaryDirectory(prefix="sentence-tts-") as tmp_dir:
        output_path = Path(tmp_dir) / "take.wav"
        tts(
            text=text,
            ref_voice=str(pipeline.REFERENCE_CLIP_PATH),
            ref_text=pipeline.REFERENCE_CLIP_TRANSCRIPT,
            output_file=str(output_path),
            speed=speed,
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


def head_trim_point(expected: str, timeline: list[tuple[str, float]]) -> float | None:
    """Where the intended sentence starts, if something precedes it.

    `None` when there is nothing to cut — the sentence already starts at
    the top, or the transcript matched too poorly to locate it at all.
    """
    actual = "".join(char for char, _ in timeline)
    matcher = difflib.SequenceMatcher(None, comparable(expected), actual, autojunk=False)
    blocks = [block for block in matcher.get_matching_blocks() if block.size]
    if not blocks or blocks[0].b == 0:
        return None
    return max(0.0, timeline[blocks[0].b][1] - HEAD_TRIM_MARGIN_SECONDS)


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------


def generate_one(
    *,
    tts: Any,
    pipeline: Any,
    whisper: Any | None,
    text: str,
    args: argparse.Namespace,
) -> tuple[bytes | None, dict[str, Any]]:
    """Take after take until one passes its own STT round-trip.

    Returns (mp3_bytes_or_None, record_fields). A `None` first element
    means every take was rejected; the record then carries the best
    one's numbers so a human can see how close it got.
    """
    attempts: list[dict[str, Any]] = []
    best: tuple[tuple[float, int], dict[str, Any]] | None = None

    def passes(coverage: float, extra: int) -> bool:
        return coverage >= args.min_coverage and extra <= args.max_extra_chars

    for index, (seed, speed) in enumerate(retry_plan(args.max_attempts), start=1):
        raw_wav = synthesize(tts, pipeline, text, seed, speed)
        mono, sample_rate = load_mono(raw_wav)
        padded, speech_seconds = trim_and_pad(mono, sample_rate, args.pad_ms)
        mp3_bytes = encode_mp3(to_wav(padded, sample_rate))
        attempt: dict[str, Any] = {
            "attempt": index,
            "seed": seed,
            "speed": speed,
            "speech_seconds": round(speech_seconds, 3),
        }

        if whisper is None:
            attempts.append(attempt | {"verified": False})
            return mp3_bytes, {"attempts": attempts, "speech_seconds": attempt["speech_seconds"]}

        transcript, timeline = transcribe(whisper, mp3_bytes)
        coverage, extra = compare_transcript(text, transcript)
        attempt |= {"transcript": transcript, "coverage": round(coverage, 4), "extra_chars": extra}

        if not passes(coverage, extra) and index > args.repair_after:
            # The intended sentence is usually still in there, intact,
            # with a fragment of the reference clip glued to its front.
            # Cut that off and re-run the identical check on the result:
            # a cut that took a real syllable with it fails here rather
            # than shipping, which is the only reason trusting it is safe.
            cut = head_trim_point(text, timeline)
            if cut:
                repaired, speech_seconds = trim_and_pad(
                    padded[int(cut * sample_rate) :], sample_rate, args.pad_ms
                )
                repaired_mp3 = encode_mp3(to_wav(repaired, sample_rate))
                repaired_transcript, _ = transcribe(whisper, repaired_mp3)
                coverage, extra = compare_transcript(text, repaired_transcript)
                attempt |= {
                    "head_trim_seconds": round(cut, 3),
                    "transcript": repaired_transcript,
                    "coverage": round(coverage, 4),
                    "extra_chars": extra,
                    "speech_seconds": round(speech_seconds, 3),
                }
                mp3_bytes = repaired_mp3

        attempts.append(attempt)
        if passes(coverage, extra):
            return mp3_bytes, {
                "attempts": attempts,
                "transcript": attempt["transcript"],
                "coverage": attempt["coverage"],
                "extra_chars": attempt["extra_chars"],
                "head_trim_seconds": attempt.get("head_trim_seconds"),
                "speech_seconds": attempt["speech_seconds"],
            }
        # Rank rejected takes by coverage first, then by how little junk
        # they carry — the report's "closest miss" for a human reviewer.
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
    parser.add_argument("--max-attempts", type=int, default=2 * len(RETRY_SEEDS),
                        help="Takes per sentence before giving up and leaving it without audio "
                             "(default: %(default)s). Very short sentences — two syllables, no "
                             "context for the model to lean on — are the ones that exhaust this, "
                             "and a cutoff is cheaper than a length rule guessed in advance: "
                             "which short sentences the voice handles badly is decided per "
                             "sentence by the round-trip, not by character count")
    parser.add_argument("--repair-after", type=int, default=4,
                        help="Takes to spend looking for a naturally clean one before allowing the "
                             "head-trim repair. F5-TTS fits the utterance into a duration derived "
                             "from character count, so a take that spends its opening on a bleed "
                             "speaks the actual sentence ~20%% faster to fit — cutting the bleed "
                             "off leaves correct but rushed audio. Worth a few cheap takes to "
                             "avoid; the repair is still there for sentences that never come out "
                             "clean (default: %(default)s)")
    parser.add_argument("--min-coverage", type=float, default=0.9,
                        help="Fraction of the intended text the transcript must contain")
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
                tts=tts, pipeline=pipeline, whisper=whisper, text=text, args=args
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
            results.append(record | {"status": "rejected", "reason": "no take passed the STT round-trip"})
            print(f"{prefix} REJECT after {len(record['attempts'])} takes — "
                  f"best coverage {miss['coverage']:.2f}, extra {miss['extra_chars']} "
                  f"(want {text!r}, got {miss['transcript']!r})", flush=True)
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(mp3_bytes)
        results.append(record | {"status": "ok", "bytes": len(mp3_bytes)})
        takes = len(record["attempts"])
        print(f"{prefix} ok {record['speech_seconds']:.2f}s "
              f"take {takes} ({record['elapsed_seconds']:.1f}s) → {filename}", flush=True)

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
