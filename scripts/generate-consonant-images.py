"""Illustrate the forty-four consonants, each in its class district.

Reads `src/domain/script/data/consonant-scenes.json` — the same file the app
resolves an image from — and writes one picture per consonant into
`public/palace/consonants/`.

The subject is always the consonant's own word: ม is a horse, น is a mouse, บ
is a leaf. That is what a Thai consonant is learned as and what a learner
recalls it by; the glyph's geometry is carried where it survives being drawn
and dropped where holding it would cost the animal.

Shaped like `generate-palace-images.py`, and for the same reason: forty-four
is a number a person looks at, so there is no CLIP gate deciding on their
behalf. The seed per consonant is recorded so any single one can be re-rolled
without disturbing the rest.

    uv run --project scripts/deck-env python scripts/generate-consonant-images.py
    uv run --project scripts/deck-env python scripts/generate-consonant-images.py \\
        --only mo-ma --seed 7 --force
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lesson_deck.images import render_one, styled_prompt  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
SCENES = REPO_ROOT / "src" / "domain" / "script" / "data" / "consonant-scenes.json"
DEFAULT_OUT = REPO_ROOT / "public" / "palace" / "consonants"
MANIFEST = DEFAULT_OUT / "manifest.json"

DEFAULT_SEED = 42


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--only",
        action="append",
        help="consonant slug to render; repeatable, default every one",
    )
    parser.add_argument("--district", help="render only one district's letters")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    scenes = json.loads(SCENES.read_text(encoding="utf-8"))

    if args.district:
        scenes = [s for s in scenes if s["district"] == args.district]
    if args.only:
        wanted = set(args.only)
        unknown = wanted - {s["id"] for s in scenes}
        if unknown:
            parser.error(f"no such consonant: {', '.join(sorted(unknown))}")
        scenes = [s for s in scenes if s["id"] in wanted]

    manifest = (
        json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.is_file() else {}
    )
    args.out_dir.mkdir(parents=True, exist_ok=True)

    rendered = skipped = 0
    for scene in scenes:
        out_path = args.out_dir / f"{scene['id']}.jpg"
        recorded = manifest.get(scene["id"], {})
        seed = args.seed if args.seed is not None else recorded.get("seed", DEFAULT_SEED)
        prompt = styled_prompt(scene["prompt"])

        if args.dry_run:
            print(f"\n=== {scene['char']} {scene['id']} ({scene['meaning']}) ===")
            print(prompt)
            continue

        if out_path.is_file() and not args.force:
            skipped += 1
            continue

        started = time.time()
        render_one(prompt, seed, out_path)
        manifest[scene["id"]] = {
            "seed": seed,
            "prompt": prompt,
            "char": scene["char"],
            "meaning": scene["meaning"],
            "district": scene["district"],
            "file": f"{scene['id']}.jpg",
        }
        rendered += 1
        print(
            f"  ok  {scene['char']} {scene['id']:16} "
            f"{scene['meaning']:24} {time.time() - started:.1f}s"
        )

    if not args.dry_run:
        MANIFEST.parent.mkdir(parents=True, exist_ok=True)
        MANIFEST.write_text(
            json.dumps(manifest, ensure_ascii=False, indent="\t", sort_keys=True)
            + "\n",
            encoding="utf-8",
        )
        print(f"\n{rendered} rendered, {skipped} skipped -> {args.out_dir}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
