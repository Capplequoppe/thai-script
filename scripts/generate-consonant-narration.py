"""Narrate each consonant's mnemonic, in the course's English voice.

The palace dialog could only point at the lesson that introduces a letter,
because the decks carry no per-slide symbol reference. This says the teaching
where the learner already is instead: forty-four short clips, each naming the
letter, its word, its district, and then its own mnemonic prose.

Uses the same S2 Pro voice as the lesson decks — Zara, cloned once — so a
letter explained here sounds like the same course that teaches it. The engine
is reached through `lesson_deck.vendor`, which keeps one resident worker and
pays `torch.compile` once rather than per clip; see that module for why the
difference is forty minutes rather than a few seconds.

Clips are content-addressed on the narration text, so re-running after editing
one mnemonic regenerates that clip and leaves the other forty-three alone.

    uv run --project scripts/deck-env python scripts/generate-consonant-narration.py
    uv run --project scripts/deck-env python scripts/generate-consonant-narration.py \\
        --only mo-ma --force
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lesson_deck.vendor import S2ProVoice, VoiceSpec  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
SCENES = REPO_ROOT / "src" / "domain" / "script" / "data" / "consonant-scenes.json"
DEFAULT_OUT = REPO_ROOT / "public" / "palace" / "consonants" / "audio"
MANIFEST = DEFAULT_OUT / "manifest.json"

#: Fixed, so a re-run reproduces the clip rather than rolling a new reading.
SEED = 7


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", action="append", help="consonant slug; repeatable")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--force",
        action="store_true",
        help="regenerate even where the narration text has not changed",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print what would be spoken and synthesize nothing",
    )
    parser.add_argument(
        "--no-compile",
        action="store_true",
        help="skip torch.compile — worth it for one or two clips, not for all",
    )
    args = parser.parse_args()

    scenes = json.loads(SCENES.read_text(encoding="utf-8"))
    if args.only:
        wanted = set(args.only)
        unknown = wanted - {scene["id"] for scene in scenes}
        if unknown:
            parser.error(f"no such consonant: {', '.join(sorted(unknown))}")
        scenes = [scene for scene in scenes if scene["id"] in wanted]

    missing = [scene["id"] for scene in scenes if not scene.get("narration")]
    if missing:
        parser.error(f"no narration written for: {', '.join(missing)}")

    manifest = (
        json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.is_file() else {}
    )

    if args.dry_run:
        for scene in scenes:
            print(f"\n=== {scene['char']} {scene['id']} ===")
            print(scene["narration"])
        return 0

    args.out_dir.mkdir(parents=True, exist_ok=True)

    # Only pay for the engine if something actually needs saying.
    todo = [
        scene
        for scene in scenes
        if args.force
        or manifest.get(scene["id"], {}).get("digest") != digest(scene["narration"])
        or not (args.out_dir / f"{scene['id']}.mp3").is_file()
    ]
    if not todo:
        print(f"nothing to do — all {len(scenes)} clips match their text")
        return 0

    print(f"{len(todo)} of {len(scenes)} clips to generate")
    voice = S2ProVoice(compile_model=not args.no_compile)
    spec = VoiceSpec()

    try:
        for scene in todo:
            started = time.time()
            audio = voice.synthesize(scene["narration"], "en", spec, SEED)
            out_path = args.out_dir / f"{scene['id']}.mp3"
            out_path.write_bytes(audio)
            manifest[scene["id"]] = {
                "digest": digest(scene["narration"]),
                "char": scene["char"],
                "bytes": len(audio),
                "file": f"{scene['id']}.mp3",
            }
            print(
                f"  ok  {scene['char']} {scene['id']:16} "
                f"{len(audio) / 1024:6.0f} KB  {time.time() - started:.1f}s"
            )
    finally:
        # The worker holds eleven gigabytes of weights; leaving it resident
        # after a batch would keep the card occupied for nothing.
        voice.close()
        MANIFEST.write_text(
            json.dumps(manifest, ensure_ascii=False, indent="\t", sort_keys=True)
            + "\n",
            encoding="utf-8",
        )

    print(f"\n{len(todo)} generated -> {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
