"""Illustrate authored mnemonics with a local diffusion model.

Reads `mnemonics.json`, renders each entry's `scene` through the house style
in `style.py`, composites the caption with a real font (`compose.py`), writes
the result into `public/vocabulary/images/` and wires `image_file` into
`vocabulary.json`.

Shaped after `scripts/generate-sentence-audio.py`, and for the same reason:
generation without a check ships junk. Every candidate is scored against its
own scene description with CLIP before it is accepted, and a rejected render
is re-rolled on a different seed rather than shipped.

    uv run --project scripts/mnemonics scripts/mnemonics/generate_images.py \
        --ranks 9,25,87 --out-dir public/vocabulary/images
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from compose import compose, output_path  # noqa: E402
from style import (  # noqa: E402
    FLUX_GUIDANCE,
    FLUX_MAX_SEQUENCE_LENGTH,
    FLUX_MODEL_ID,
    FLUX_STEPS,
    GENERATION_SIZE,
    GUIDANCE_SCALE,
    INFERENCE_STEPS,
    MAX_PROMPT_TOKENS,
    NEGATIVE_PROMPT,
    PIXART_GUIDANCE,
    PIXART_MAX_SEQUENCE_LENGTH,
    PIXART_MODEL_ID,
    PIXART_STEPS,
    SHIPPED_SIZE,
    build_flux_prompt,
    build_prompt,
)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MNEMONICS = REPO_ROOT / "scripts" / "mnemonics" / "mnemonics.json"
VOCABULARY = REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"
DEFAULT_OUT = REPO_ROOT / "public" / "vocabulary" / "images"
PUBLIC_PREFIX = "/thai-script/vocabulary/images"

MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"
CLIP_MODEL_ID = "openai/clip-vit-large-patch14"

# Seeds tried in order for one word. A scene the model renders badly on its
# first seed is usually fine on another; this is the same retry-ladder idea as
# the sentence-audio script's reference clips.
SEEDS = (42, 7, 13, 101, 2024, 77)
# CLIP similarity below this means the picture is not depicting the scene it
# was asked for. Calibrate with --report before trusting it as a gate.
MIN_CLIP_SCORE = 0.22


@dataclass
class Result:
    rank: int
    thai: str
    status: str
    score: float
    seed: int | None
    path: Path | None
    detail: str = ""


def load_pipeline(backend: str):
    import torch

    if backend == "pixart":
        from diffusers import PixArtSigmaPipeline

        pipe = PixArtSigmaPipeline.from_pretrained(
            PIXART_MODEL_ID, torch_dtype=torch.float16
        ).to("cuda")
        pipe.set_progress_bar_config(disable=True)
        return pipe

    if backend == "flux":
        from diffusers import FluxPipeline

        pipe = FluxPipeline.from_pretrained(FLUX_MODEL_ID, torch_dtype=torch.bfloat16)
        # The transformer, T5, CLIP and VAE together exceed 24 GB, so components
        # are moved onto the GPU only while they are being used. Slower per
        # image than resident weights, and the difference between running and
        # not running on this card.
        pipe.enable_model_cpu_offload()
        pipe.set_progress_bar_config(disable=True)
        return pipe

    from diffusers import StableDiffusionXLPipeline

    pipe = StableDiffusionXLPipeline.from_pretrained(
        MODEL_ID, torch_dtype=torch.float16, variant="fp16", use_safetensors=True
    )
    pipe = pipe.to("cuda")
    pipe.set_progress_bar_config(disable=True)
    return pipe


def load_scorer():
    import torch
    from transformers import CLIPModel, CLIPProcessor

    model = CLIPModel.from_pretrained(CLIP_MODEL_ID).to("cuda").eval()
    processor = CLIPProcessor.from_pretrained(CLIP_MODEL_ID)

    def score(image, text: str) -> float:
        # CLIP truncates at 77 tokens, so score against the *scene* only —
        # the style suffix is identical for every word and carries no signal
        # about whether this picture shows this scene.
        inputs = processor(
            text=[text], images=image, return_tensors="pt", padding=True, truncation=True
        ).to("cuda")
        with torch.no_grad():
            out = model(**inputs)
            image_embeds = out.image_embeds / out.image_embeds.norm(dim=-1, keepdim=True)
            text_embeds = out.text_embeds / out.text_embeds.norm(dim=-1, keepdim=True)
            return float((image_embeds @ text_embeds.T).squeeze())

    return score


def generate_one(pipe, score, entry: dict, out_dir: Path, args) -> Result:
    import torch

    rank, thai = entry["rank"], entry["thai"]
    scene = entry["scene"]
    t5 = args.backend in {"flux", "pixart"}
    flux = args.backend == "flux"
    prompt = build_flux_prompt(scene) if t5 else build_prompt(scene)
    if not t5:
        # Truncation is silent, and silently losing the tail of a scene is how
        # the first spike shipped images with no style on them at all. Refuse
        # instead. FLUX's T5 encoder has room to spare, so this is SDXL-only.
        token_count = len(pipe.tokenizer(prompt)["input_ids"])
        if token_count > MAX_PROMPT_TOKENS:
            return Result(
                rank, thai, "error", 0.0, None, None,
                f"prompt is {token_count} tokens, over the {MAX_PROMPT_TOKENS} limit",
            )
    best = (0.0, None, None)

    for seed in SEEDS[: args.max_takes]:
        generator = torch.Generator(device="cpu").manual_seed(seed)
        if args.backend == "pixart":
            image = pipe(
                prompt=prompt,
                negative_prompt=NEGATIVE_PROMPT,
                width=GENERATION_SIZE[0],
                height=GENERATION_SIZE[1],
                guidance_scale=PIXART_GUIDANCE,
                num_inference_steps=PIXART_STEPS,
                max_sequence_length=PIXART_MAX_SEQUENCE_LENGTH,
                generator=generator,
            ).images[0]
        elif flux:
            # Schnell is guidance-distilled: no negative prompt, guidance 0,
            # four steps.
            image = pipe(
                prompt=prompt,
                width=GENERATION_SIZE[0],
                height=GENERATION_SIZE[1],
                guidance_scale=FLUX_GUIDANCE,
                num_inference_steps=FLUX_STEPS,
                max_sequence_length=FLUX_MAX_SEQUENCE_LENGTH,
                generator=generator,
            ).images[0]
        else:
            image = pipe(
                prompt=prompt,
                negative_prompt=NEGATIVE_PROMPT,
                width=GENERATION_SIZE[0],
                height=GENERATION_SIZE[1],
                guidance_scale=GUIDANCE_SCALE,
                num_inference_steps=INFERENCE_STEPS,
                generator=generator,
            ).images[0]

        value = score(image, scene)
        if value > best[0]:
            best = (value, image, seed)
        if value >= args.min_score:
            break

    value, image, seed = best
    if image is None:
        return Result(rank, thai, "error", 0.0, None, None, "no image produced")
    if value < args.min_score:
        return Result(
            rank, thai, "rejected", value, seed, None,
            f"best CLIP {value:.3f} < {args.min_score}",
        )

    image = image.resize(SHIPPED_SIZE, resample=1)  # LANCZOS
    if args.base_dir:
        # Keep the uncaptioned render. Compositing is cheap and diffusion is
        # not, so a caption change should cost seconds rather than another
        # pass over the whole corpus — which is exactly what the first
        # contrast fix cost, for want of this.
        base_path = output_path(args.base_dir, rank, thai)
        base_path.parent.mkdir(parents=True, exist_ok=True)
        image.save(base_path, quality=95)
    final = compose(
        image,
        anchor=entry.get("anchor") or entry["romanization"],
        thai=thai,
        english=entry["english"],
        headline=entry.get("headline"),
    )
    path = output_path(out_dir, rank, thai)
    path.parent.mkdir(parents=True, exist_ok=True)
    final.save(path, quality=92, optimize=True)
    return Result(rank, thai, "ok", value, seed, path)


def recompose(entries: list[dict], args) -> int:
    """Redraw captions onto already-generated bases. No GPU, no model."""
    from PIL import Image

    written = missing = 0
    for entry in entries:
        base = output_path(args.base_dir, entry["rank"], entry["thai"])
        if not base.exists():
            missing += 1
            continue
        with Image.open(base) as image:
            final = compose(
                image,
                anchor=entry.get("anchor") or entry["romanization"],
                thai=entry["thai"],
                english=entry["english"],
                headline=entry.get("headline"),
            )
        destination = output_path(args.out_dir, entry["rank"], entry["thai"])
        destination.parent.mkdir(parents=True, exist_ok=True)
        final.save(destination, quality=92, optimize=True)
        written += 1
    print(f"recomposed {written} captions; {missing} had no saved base")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ranks", help="comma-separated ranks; default every entry")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--max-takes", type=int, default=len(SEEDS))
    parser.add_argument("--min-score", type=float, default=MIN_CLIP_SCORE)
    parser.add_argument(
        "--report",
        action="store_true",
        help="accept every render regardless of score, to calibrate the gate",
    )
    parser.add_argument(
        "--write-json",
        action="store_true",
        help="wire image_file into vocabulary.json for everything that succeeded",
    )
    parser.add_argument("--force", action="store_true", help="re-render existing files")
    parser.add_argument(
        "--base-dir",
        type=Path,
        help="also keep the uncaptioned render here, so captions can be "
        "redrawn later without paying for diffusion again",
    )
    parser.add_argument(
        "--recompose",
        action="store_true",
        help="skip generation entirely and redraw captions onto the saved "
        "bases in --base-dir",
    )
    parser.add_argument(
        "--backend",
        choices=("sdxl", "pixart", "flux"),
        default="pixart",
        help="which local diffusion model to render with; pixart lands the "
        "action where sdxl does not, and unlike flux it takes a negative "
        "prompt, which is what keeps text out of the frame",
    )
    args = parser.parse_args()
    if args.report:
        args.min_score = -1.0
        args.max_takes = 1

    entries = json.loads(MNEMONICS.read_text(encoding="utf-8"))["entries"]
    entries = [e for e in entries if e.get("scene")]
    if args.ranks:
        wanted = {int(r) for r in args.ranks.split(",")}
        entries = [e for e in entries if e["rank"] in wanted]
    if not args.force and not args.recompose:
        entries = [
            e
            for e in entries
            if not output_path(args.out_dir, e["rank"], e["thai"]).exists()
        ]
    if args.limit:
        entries = entries[: args.limit]

    if args.recompose:
        if not args.base_dir:
            print("--recompose needs --base-dir", file=sys.stderr)
            return 1
        return recompose(entries, args)

    if not entries:
        print("nothing to render")
        return 0

    print(f"rendering {len(entries)} illustrations")
    model = {"flux": FLUX_MODEL_ID, "pixart": PIXART_MODEL_ID}.get(
        args.backend, MODEL_ID
    )
    print(f"loading {model} …")
    pipe = load_pipeline(args.backend)
    print(f"loading {CLIP_MODEL_ID} …")
    score = load_scorer()

    results: list[Result] = []
    started = time.time()
    for index, entry in enumerate(entries, start=1):
        began = time.time()
        result = generate_one(pipe, score, entry, args.out_dir, args)
        results.append(result)
        took = time.time() - began
        where = result.path.name if result.path else result.detail
        print(
            f"[{index}/{len(entries)}] {result.rank:>4} {result.thai:<10} "
            f"{result.status:<8} clip={result.score:.3f} seed={result.seed} "
            f"{took:.0f}s  {where}"
        )

    ok = [r for r in results if r.status == "ok"]
    print(
        f"\nsummary: ok={len(ok)}, rejected={sum(1 for r in results if r.status == 'rejected')}"
        f", errors={sum(1 for r in results if r.status == 'error')}"
        f" ({time.time() - started:.0f}s)"
    )

    if args.write_json and ok:
        vocabulary = json.loads(VOCABULARY.read_text(encoding="utf-8"))
        by_rank = {e["rank"]: e for e in vocabulary if e.get("rank") is not None}
        wired = 0
        for result in ok:
            target = by_rank.get(result.rank)
            if target is None or target["thai"] != result.thai:
                continue
            target["image_file"] = f"{PUBLIC_PREFIX}/{result.path.name}"
            wired += 1
        VOCABULARY.write_text(
            json.dumps(vocabulary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"wired {wired} image_file values into {VOCABULARY.name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
