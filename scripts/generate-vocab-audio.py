#!/usr/bin/env python3
"""Generate the missing `thai_audio_file` clips for `vocabulary.json`.

The tone-pairs game mode is a *listening* exercise, so a vocabulary word
with no recording cannot be asked at all. `tone-minimal-pairs.json` holds
263 sound-alike groups covering 605 words, and only 143 of those words have
a clip today — which is why, by default, this script generates audio for
exactly the 462 the groups are still missing, best-ranked first.

Everything about *how* a clip is made and judged is
`generate-sentence-audio.py`'s, imported rather than restated: the same
vendored ThonburianTTS voice-cloning pipeline, the same reference clips,
the same trim/pad/encode, and — the part that matters — the same
`generate_one` retry loop with the same three verification gates
(transcript match, head gap, delivery pace) and the same seed-then-
reference retry axes. Read that script's module docstring for why each of
those gates exists; none of the reasoning is different for a word.

Three things *are* different for a word, and they are all this file:

  1. **What gets spoken** is the word itself, not a sentence with its word
     spacing stripped.

  2. **Where it lands.** The 49 clips already generated this way follow
     `word-<slug>.mp3` under `public/audio/`, from the same lossy
     `audio_slug` rule the sentence script uses (`kʰɔ̌ːŋ` → `word-kh`).
     Lossy is survivable for 49 clips and not for 400: across the whole
     vocabulary that rule collides constantly, and two words sharing a
     filename means one of them is silently given the other's voice — in
     a mode built entirely on words that sound almost alike, which is the
     worst possible place for that bug. `assign_filenames` below therefore
     keeps the rule and appends `-2`, `-3` … on collision, seeded from
     every filename already referenced by `vocabulary.json` so an existing
     clip is never shadowed.

  3. **The pacing gate is weaker evidence here.** `--min-ms-per-char` was
     calibrated on sentences; an isolated two-character word is spoken far
     slower per character than the same characters inside a sentence, so
     the gate almost never fires and the transcript and head-gap checks
     carry the verification on their own. It is left in place (a rushed
     take is still a rushed take) but do not read a clean run as the
     pacing gate having agreed with anything.

Run:

    backend/.venv/bin/python scripts/generate-vocab-audio.py \\
        --write-json --report /tmp/vocab-audio.json

Nothing is wired into `vocabulary.json` without `--write-json`, so a first
pass can be listened to before it becomes the app's audio.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
import time
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
VOCABULARY_JSON = REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"
PAIRS_JSON = REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "tone-minimal-pairs.json"
AUDIO_DIR = REPO_ROOT / "public" / "audio"
AUDIO_URL_PREFIX = "/thai-script/audio/"

UNRANKED = 10**9


def load_sentence_script() -> Any:
    """Import `generate-sentence-audio.py` as a module.

    By path, because the filename is not an identifier. It guards its own
    `main()` behind `if __name__ == "__main__"`, so importing it runs no
    generation and loads no model.
    """
    path = Path(__file__).resolve().parent / "generate-sentence-audio.py"
    spec = importlib.util.spec_from_file_location("generate_sentence_audio", path)
    if spec is None or spec.loader is None:  # pragma: no cover
        raise SystemExit(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    # Registered before execution: the module defines `@dataclass` types,
    # and `dataclasses` resolves a class's own module out of `sys.modules`
    # while the decorator runs. Skip this and the import dies on
    # `Reference` with an opaque `'NoneType' object has no attribute
    # '__dict__'`.
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def rank_of(entry: dict[str, Any]) -> int:
    rank = entry.get("rank")
    return rank if isinstance(rank, int) else UNRANKED


def pair_words(pairs_path: Path) -> set[str]:
    """Every Thai word named by a tone minimal-pair group."""
    groups: list[dict[str, Any]] = json.loads(pairs_path.read_text(encoding="utf-8"))
    return {member["thai"] for group in groups for member in group["members"]}


def assign_filenames(
    entries: list[dict[str, Any]], targets: list[dict[str, Any]], audio_slug: Any
) -> dict[str, str]:
    """One `word-<slug>.mp3` per target word, collisions disambiguated.

    Seeded with every basename `vocabulary.json` already references —
    including the imported `vocabulary/audio/NNNN_xx_th.mp3` set, which
    lives in a different directory but costs nothing to reserve — so a
    generated clip can never take a name something already points at.
    """
    used: set[str] = {
        entry["thai_audio_file"].rsplit("/", 1)[-1]
        for entry in entries
        if entry.get("thai_audio_file")
    }

    filenames: dict[str, str] = {}
    for entry in targets:
        base = audio_slug(entry["romanization"]) or "word"
        candidate = f"word-{base}.mp3"
        suffix = 2
        while candidate in used:
            candidate = f"word-{base}-{suffix}.mp3"
            suffix += 1
        used.add(candidate)
        filenames[entry["thai"]] = candidate
    return filenames


def parse_args(argv: list[str] | None, sentence_script: Any) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--backend-dir", type=Path, default=REPO_ROOT / "backend")
    parser.add_argument("--vocabulary", type=Path, default=VOCABULARY_JSON)
    parser.add_argument("--pairs", type=Path, default=PAIRS_JSON)
    parser.add_argument("--audio-dir", type=Path, default=AUDIO_DIR)
    parser.add_argument(
        "--words",
        default="",
        help="Comma-separated Thai words; overrides the pair-group default and --limit",
    )
    parser.add_argument(
        "--all-vocabulary",
        action="store_true",
        help="Target every word missing audio, not only the ones the tone-pairs "
             "mode needs. ~3350 clips; the default (~460) is what unlocks the mode.",
    )
    parser.add_argument("--limit", type=int, default=0, help="Generate at most N clips (0 = all)")
    parser.add_argument("--pad-ms", type=int, default=300)
    parser.add_argument(
        "--references", type=Path, default=sentence_script.EXTRA_REFERENCES_MANIFEST
    )
    # The verification knobs `generate_one` reads. Same names, same
    # defaults, same meanings as the sentence script — it is literally the
    # same function doing the judging; see its `parse_args` for the
    # reasoning behind each number.
    parser.add_argument(
        "--max-attempts", type=int, default=3 * len(sentence_script.RETRY_SEEDS)
    )
    parser.add_argument("--min-coverage", type=float, default=0.9)
    parser.add_argument("--min-ms-per-char", type=float, default=88.0)
    parser.add_argument("--max-extra-chars", type=int, default=1)
    parser.add_argument("--max-internal-extra-chars", type=int, default=2)
    parser.add_argument("--force", action="store_true", help="Regenerate even if the mp3 exists")
    parser.add_argument(
        "--no-verify",
        action="store_true",
        help="Skip the STT round-trip. Off the happy path: every clip is kept sight-unseen.",
    )
    parser.add_argument(
        "--write-json",
        action="store_true",
        help="Wire verified clips into vocabulary.json (otherwise files are written "
             "but nothing references them)",
    )
    parser.add_argument("--report", type=Path, default=None)
    return parser.parse_args(argv)


def choose_targets(
    entries: list[dict[str, Any]], args: argparse.Namespace
) -> list[dict[str, Any]]:
    """The words to generate for, best-ranked first.

    Deduped by Thai spelling: `vocabulary.json` holds several entries for
    one word (บ้าน "house" and บ้าน "home"), and they are one recording.
    The wiring pass below puts the clip on every entry sharing the
    spelling, so the duplicates are not left behind.
    """
    by_thai: dict[str, dict[str, Any]] = {}
    for entry in sorted(entries, key=rank_of):
        by_thai.setdefault(entry["thai"], entry)

    if args.words:
        wanted = [w.strip() for w in args.words.split(",") if w.strip()]
        unknown = [w for w in wanted if w not in by_thai]
        if unknown:
            raise SystemExit(f"unknown words: {', '.join(unknown)}")
        return [by_thai[w] for w in wanted]

    missing = [e for e in by_thai.values() if not e.get("thai_audio_file")]
    if not args.all_vocabulary:
        needed = pair_words(args.pairs)
        missing = [e for e in missing if e["thai"] in needed]

    missing.sort(key=rank_of)
    return missing[: args.limit] if args.limit else missing


def main(argv: list[str] | None = None) -> int:
    sentence_script = load_sentence_script()
    args = parse_args(argv, sentence_script)

    entries: list[dict[str, Any]] = json.loads(args.vocabulary.read_text(encoding="utf-8"))
    targets = choose_targets(entries, args)
    if not targets:
        print("nothing to generate — every targeted word already has audio")
        return 0

    filenames = assign_filenames(entries, targets, sentence_script.audio_slug)

    models, pipeline = sentence_script.import_backend(args.backend_dir)
    references = sentence_script.load_references(pipeline, args.references)
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
    for index, entry in enumerate(targets, start=1):
        thai = entry["thai"]
        filename = filenames[thai]
        destination = args.audio_dir / filename
        record: dict[str, Any] = {
            "thai": thai,
            "romanization": entry["romanization"],
            "english": entry["english"],
            "rank": entry.get("rank"),
            "file": filename,
        }
        prefix = f"[{index}/{len(targets)}] {thai}"

        if destination.exists() and not args.force:
            results.append(record | {"status": "skipped", "reason": "file already exists"})
            print(f"{prefix} skip (exists)", flush=True)
            continue

        started = time.perf_counter()
        try:
            mp3_bytes, detail = sentence_script.generate_one(
                tts=tts, references=references, whisper=whisper, text=thai, args=args
            )
        except Exception as exc:  # noqa: BLE001 — one bad word must not abandon
            # a several-hundred-clip batch; it is recorded and the run continues.
            results.append(record | {"status": "error", "reason": f"{type(exc).__name__}: {exc}"})
            print(f"{prefix} ERROR {type(exc).__name__}: {exc}", flush=True)
            continue

        record |= detail
        record["elapsed_seconds"] = round(time.perf_counter() - started, 2)

        if mp3_bytes is None:
            miss = record["best_attempt"]
            results.append(record | {"status": "rejected", "reason": miss["reason"]})
            print(f"{prefix} REJECT after {len(record['attempts'])} takes — closest miss: "
                  f"{miss['reason']} (want {thai!r}, got {miss['transcript']!r})", flush=True)
            continue

        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(mp3_bytes)
        results.append(record | {"status": "ok", "bytes": len(mp3_bytes)})
        print(f"{prefix} ok take {len(record['attempts'])} ref={record['reference']} "
              f"({record['elapsed_seconds']:.1f}s) → {filename}", flush=True)

    if args.write_json:
        # "skipped" counts as much as "ok" — its clip is on disk and passed
        # this same check on the run that made it, so a batch resumed after
        # an interruption must not leave the first pass's clips unreferenced.
        wired = {r["thai"] for r in results if r["status"] in ("ok", "skipped")}
        touched = 0
        for entry in entries:
            # Every entry sharing the spelling, not just the one that was
            # generated for: the duplicates are the same word and the same
            # recording, and leaving them null would leave the tone-pairs
            # mode unable to use a word it has a clip for.
            if entry["thai"] in wired and not entry.get("thai_audio_file"):
                entry["thai_audio_file"] = AUDIO_URL_PREFIX + filenames[entry["thai"]]
                touched += 1
        args.vocabulary.write_text(
            json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"wired {len(wired)} clips onto {touched} entries in {args.vocabulary}")

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
    if by_status.get("ok") or by_status.get("skipped"):
        print(
            "regenerate the pair groups' audio coverage view with:\n"
            "  backend/.venv/bin/python scripts/generate-tone-minimal-pairs.py",
            file=sys.stderr,
        )
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
