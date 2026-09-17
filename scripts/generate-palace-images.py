"""Illustrate the eleven tone-rule scenes of the memory palace.

Reads `src/domain/script/data/palace-scenes.json` — the same file the app
renders the scenes from, so the picture and the prose can never describe
different things — and writes one image per scene into
`public/palace/scenes/`.

Deliberately closer to `lesson_deck/images.py` than to
`mnemonics/generate_images.py`. The vocabulary generator runs unattended over
hundreds of words, so it earns its CLIP gate and its seed ladder: nobody is
going to look at each one. Eleven scenes is a number a person looks at, and
these eleven are load-bearing — a learner will hold them for years — so the
judgement is the author's, not a score's. What this gives instead is a
recorded seed per scene, so any single image can be re-rolled by hand without
disturbing the other ten.

    uv run --project scripts/deck-env python scripts/generate-palace-images.py
    uv run --project scripts/deck-env python scripts/generate-palace-images.py \\
        --scene well-vendor-and-monk-fall --seed 7 --force
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
DATA = REPO_ROOT / "src" / "domain" / "script" / "data"
SCENES = DATA / "palace-scenes.json"
PLACES = DATA / "palace-places.json"
DEFAULT_OUT = REPO_ROOT / "public" / "palace" / "scenes"
MANIFEST = DEFAULT_OUT / "manifest.json"

#: One seed for every scene, so a re-run reproduces what shipped rather than
#: rolling new pictures for scenes nobody asked to change. Overridden per
#: scene with --seed; recorded in the manifest either way.
DEFAULT_SEED = 42


def load_scenes() -> list[dict]:
    """Scenes and places together — both are one prompt and one image.

    A scene shows something happening somewhere; a place shows the somewhere
    with nothing in it. They differ in what the prompt says and in nothing
    this script does, so they share the ladder, the manifest and the seeds
    rather than getting a second near-identical generator.
    """
    scenes = json.loads(SCENES.read_text(encoding="utf-8"))
    places = json.loads(PLACES.read_text(encoding="utf-8"))
    for place in places:
        # `scene` is what the manifest records as the prose behind an
        # image; a place's equivalent is its caption.
        place.setdefault("scene", place.get("caption", ""))
    return scenes + places


def read_manifest() -> dict[str, dict]:
    if not MANIFEST.is_file():
        return {}
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def write_manifest(entries: dict[str, dict]) -> None:
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(
        json.dumps(entries, ensure_ascii=False, indent="\t", sort_keys=True) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--scene",
        action="append",
        help="scene id to render; repeatable, default every scene",
    )
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--seed",
        type=int,
        help="seed for this run's scenes; default is each scene's recorded "
        "seed, else 42",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="re-render even where the image already exists",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print the prompts that would be sent and render nothing",
    )
    args = parser.parse_args()

    scenes = load_scenes()
    wanted = set(args.scene or [])
    if wanted:
        known = {scene["id"] for scene in scenes}
        unknown = wanted - known
        if unknown:
            # Naming a scene that does not exist is a typo, and rendering the
            # other ten silently would hide it.
            parser.error(f"no such scene: {', '.join(sorted(unknown))}")
        scenes = [scene for scene in scenes if scene["id"] in wanted]

    manifest = read_manifest()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    rendered = 0
    skipped = 0
    for scene in scenes:
        scene_id = scene["id"]
        out_path = args.out_dir / f"{scene_id}.jpg"
        recorded = manifest.get(scene_id, {})
        seed = args.seed if args.seed is not None else recorded.get("seed", DEFAULT_SEED)
        # `prompt`, never `scene`: the prose is written for a learner and
        # narrates ("do not come back up"), which a diffusion model cannot
        # draw. The first batch proved that by rendering every setting and
        # no action at all.
        prompt = styled_prompt(scene["prompt"])

        if args.dry_run:
            print(f"\n=== {scene_id}  (seed {seed}) ===")
            print(prompt)
            continue

        if out_path.is_file() and not args.force:
            print(f"  skip   {scene_id} (exists; --force to re-render)")
            skipped += 1
            continue

        started = time.time()
        render_one(prompt, seed, out_path)
        manifest[scene_id] = {
            "seed": seed,
            "prompt": prompt,
            # Stored so a later edit to the prose is visible as a mismatch
            # rather than silently leaving an image that illustrates the old
            # wording.
            "scene": scene["scene"],
            "file": f"{scene_id}.jpg",
        }
        rendered += 1
        print(f"  ok     {scene_id} seed={seed} {time.time() - started:.1f}s")

    if not args.dry_run:
        write_manifest(manifest)
        print(f"\n{rendered} rendered, {skipped} skipped -> {args.out_dir}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
