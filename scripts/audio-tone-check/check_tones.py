#!/usr/bin/env python3
"""Flag vocabulary recordings that do not sound like what the app teaches.

The learner takes tone and vowel length from the recording, not from the
romanization — so a clip that says the wrong thing teaches the wrong thing,
whatever `vocabulary.json` claims.

Two checks, both plain statistics against a class the word already belongs
to. Neither classifies anything: they measure one number per clip and flag
the clips far from their own class's middle.

  * **Pitch movement.** Thai tones differ mostly in how far the pitch
    travels. Measured across the corpus, falling and rising move 10-14
    semitones while mid and high move 3-4 — well enough separated that a
    falling-tone clip which barely moves is worth a listen.
  * **Vowel duration.** Vowel length is phonemic in Thai and is what decides
    the dead-syllable tone rule the app teaches, so a long vowel recorded
    short is teaching the wrong word. Measured: a dead syllable with a short
    vowel runs ~180 ms of voicing against ~480 ms for a long one.

## An earlier version of this got it badly wrong, twice

It learned a mean contour per tone and flagged clips closer to another
tone's mean. Both times the fault was in normalizing the contour, and both
times the output looked plausible enough to believe:

  1. Unfiltered octave errors and consonant transients gave a "rising" mean
     opening 28 semitones above its own median — two and a half octaves.
  2. Fixing that with a "reject frames more than 7 semitones from the clip's
     median" rule threw away exactly the excursion that *defines* a falling
     tone. It measured falling at 1.0 semitones, flatter than mid, and the
     recordings very nearly took the blame.

Checked against Praat afterwards, the app's own pitch tracker had been right
all along — the two agree within ~1 semitone on every tone — and 73 of 83
falling clips do carry a proper fall. Hence this rewrite: no learned model,
no contour normalization, and every number it prints is one a person can
check against a clip by listening.

Praat (via `parselmouth`) does the pitch tracking here rather than the app's
`extractPitchContour`. They agree on range; Praat additionally tracks
through the creaky tail that leaves ~30 clips unjudgeable otherwise. Run
`extract-contours.mjs` to compare the two if that ever needs re-checking.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
VOCABULARY = REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"
ENRICHER = REPO_ROOT / "scripts" / "enrich-vocabulary.py"

PITCH_FLOOR_HZ = 60.0
PITCH_CEILING_HZ = 500.0
TIME_STEP = 0.01

# Trim the head and tail of the voiced region: consonant release and final
# devoicing belong to the consonant, not the tone. Small, because trimming
# hard is what hid the falling tone last time.
EDGE_TRIM = 0.10

MIN_VOICED_FRAMES = 10


def disk_path(url: str) -> Path:
    return REPO_ROOT / "public" / url.replace("/thai-script/", "", 1)


def load_enricher() -> Any:
    import importlib.util
    import sys

    spec = importlib.util.spec_from_file_location("enrich_vocabulary", ENRICHER)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def measure(path: Path) -> tuple[float, float] | None:
    """(semitone range, voiced seconds) for one clip."""
    import parselmouth

    sound = parselmouth.Sound(str(path))
    pitch = sound.to_pitch(
        time_step=TIME_STEP,
        pitch_floor=PITCH_FLOOR_HZ,
        pitch_ceiling=PITCH_CEILING_HZ,
    )
    voiced = [f for f in pitch.selected_array["frequency"] if f > 0]
    if len(voiced) < MIN_VOICED_FRAMES:
        return None

    trim = int(len(voiced) * EDGE_TRIM)
    core = voiced[trim : len(voiced) - trim] if trim else voiced
    if len(core) < MIN_VOICED_FRAMES:
        core = voiced
    return 12.0 * math.log2(max(core) / min(core)), len(voiced) * TIME_STEP


def vowel_class(enrich: Any, entry: dict) -> str | None:
    """`<live|dead>-<short|long>` for a single-syllable word, else None."""
    if len(entry["syllables"]) != 1:
        return None
    parsed = enrich.parse_syllable(entry["syllables"][0]["text"])
    if parsed is None:
        return None
    if parsed["hasLong"] and not parsed["hasShort"]:
        length = "long"
    elif parsed["hasShort"]:
        length = "short"
    else:
        return None
    return f"{entry['syllables'][0]['syllableType']}-{length}"


def flag_outliers(
    samples: list[tuple[str, float, dict]], factor: float, below: bool
) -> list[dict]:
    """Clips whose value is `factor` times off their own class's median."""
    grouped: dict[str, list[float]] = defaultdict(list)
    for key, value, _ in samples:
        grouped[key].append(value)
    medians = {
        key: statistics.median(values)
        for key, values in grouped.items()
        if len(values) >= 8
    }

    flagged = []
    for key, value, entry in samples:
        median = medians.get(key)
        if median is None or median <= 0:
            continue
        ratio = value / median
        if (below and ratio <= 1 / factor) or (not below and ratio >= factor):
            flagged.append(
                {
                    "thai": entry["thai"],
                    "rank": entry.get("rank"),
                    "file": entry["thai_audio_file"],
                    "class": key,
                    "value": round(value, 3),
                    "classMedian": round(median, 3),
                    "ratio": round(ratio, 2),
                }
            )
    return flagged


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--report", type=Path, default=None)
    parser.add_argument(
        "--factor",
        type=float,
        default=2.0,
        help="How far off its class median a clip must be to be flagged "
             "(default: %(default)s, i.e. half or double)",
    )
    args = parser.parse_args(argv)

    enrich = load_enricher()
    entries: list[dict] = json.loads(VOCABULARY.read_text(encoding="utf-8"))
    best: dict[str, dict] = {}
    for entry in sorted(entries, key=lambda e: e.get("rank") or 10**9):
        best.setdefault(entry["thai"], entry)

    pitch_samples: list[tuple[str, float, dict]] = []
    duration_samples: list[tuple[str, float, dict]] = []
    skipped = 0

    for entry in best.values():
        if not entry["thai_audio_file"] or entry["toneStatus"] != "verified":
            continue
        klass = vowel_class(enrich, entry)
        if klass is None:
            continue
        path = disk_path(entry["thai_audio_file"])
        if not path.exists():
            continue
        measured = measure(path)
        if measured is None:
            skipped += 1
            continue
        semitones, seconds = measured
        pitch_samples.append((entry["syllables"][0]["tone"], semitones, entry))
        duration_samples.append((klass, seconds, entry))

    print(f"single-syllable verified clips measured: {len(pitch_samples)}")
    print(f"  too little voiced audio to judge: {skipped}\n")

    print("pitch movement by tone (semitones, median):")
    grouped: dict[str, list[float]] = defaultdict(list)
    for tone, value, _ in pitch_samples:
        grouped[tone].append(value)
    for tone in ("mid", "low", "falling", "high", "rising"):
        if grouped.get(tone):
            print(f"  {tone:8} n={len(grouped[tone]):>3}  {statistics.median(grouped[tone]):>5.1f} st")

    print("\nvoiced duration by syllable class (ms, median):")
    grouped_d: dict[str, list[float]] = defaultdict(list)
    for klass, value, _ in duration_samples:
        grouped_d[klass].append(value)
    for klass in sorted(grouped_d):
        print(f"  {klass:12} n={len(grouped_d[klass]):>3}  {statistics.median(grouped_d[klass]) * 1000:>4.0f} ms")

    flat = flag_outliers(pitch_samples, args.factor, below=True)
    short = flag_outliers(duration_samples, args.factor, below=True)

    print(f"\npitch movement under 1/{args.factor:g} of its tone's median: {len(flat)}")
    for row in sorted(flat, key=lambda r: r["ratio"])[:12]:
        print(f"  {row['thai']:12} rank {str(row['rank']):>5}  {row['class']:8} "
              f"{row['value']:.1f} st vs {row['classMedian']:.1f} typical")

    print(f"\nvoiced duration under 1/{args.factor:g} of its class median: {len(short)}")
    for row in sorted(short, key=lambda r: r["ratio"])[:12]:
        print(f"  {row['thai']:12} rank {str(row['rank']):>5}  {row['class']:12} "
              f"{row['value'] * 1000:.0f} ms vs {row['classMedian'] * 1000:.0f} typical")

    both = {r["thai"] for r in flat} & {r["thai"] for r in short}
    print(f"\nflagged by BOTH checks (listen to these first): {len(both)}")
    print("  " + ", ".join(sorted(both)) if both else "  none")

    if args.report:
        args.report.write_text(
            json.dumps({"flatPitch": flat, "shortVowel": short, "both": sorted(both)},
                       ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"\nreport -> {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
