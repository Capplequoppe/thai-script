#!/usr/bin/env python3
"""Illustrate a lesson's slides with a local diffusion model.

Usage:

    uv run --project scripts/deck-env python scripts/generate-slide-images.py \
        content/lessons/lesson-01.md

Reads the `scene:` field off each slide in a lesson script, renders it through
the house style in `scripts/mnemonics/style.py`, and writes the picture beside
the script where the deck generator's `image:` field can name it. Nothing is
committed to `public/` from here — `generate-lesson-deck.py` copies, hashes and
manifests the image like any other asset, so illustrations go through the same
containment check and the same record as the audio.

**Every render is scored before it is accepted.** This is the same discipline
`generate-sentence-audio.py` applies to clips and `generate-lesson-deck.py`
applies to Thai narration, and for the same reason: a generator without a check
ships junk confidently. A candidate whose CLIP similarity to its own scene
description falls below the threshold is re-rolled on another seed, and a scene
that never clears it is reported as a refusal rather than written. A slide with
no picture is a slide with no picture; a slide with the wrong picture teaches
the wrong thing.

The backend is PixArt-Sigma rather than SDXL. Its T5 encoder takes 300 tokens
against CLIP's 77, and these scenes turn on relationships a short prompt loses.

**The scene carries the meaning; the caption carries the shape and the sound.**
A picture of a horse teaches only that the word means horse, which is the one
third of the job the learner would have got anyway. The letterform and the
sound are the parts that actually have to be stored, and they are exactly the
parts a diffusion model cannot be trusted with — it will not draw a specific
glyph, and it cannot spell. So a slide that teaches a symbol declares `glyph`,
`anchor` and `gloss`, and those are drawn afterwards with a real font, in the
same face the app renders Thai in. A slide that only sets a mood declares none
of them and keeps a clean frame.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(REPO_ROOT / "scripts" / "mnemonics"))

from compose import compose  # noqa: E402
from lesson_deck.script_parser import parse_script  # noqa: E402
from style import (  # noqa: E402
    GENERATION_SIZE,
    PIXART_GUIDANCE,
    PIXART_MAX_SEQUENCE_LENGTH,
    PIXART_MODEL_ID,
    PIXART_STEPS,
    SHIPPED_SIZE,
    build_flux_prompt,
)

CLIP_MODEL_ID = "openai/clip-vit-large-patch14"

#: Tried in order. A scene the model renders badly on one seed is usually fine
#: on another — the same retry ladder the audio pipeline uses, for the same
#: reason: the defect is a property of the sampled trajectory, not of the text.
SEEDS = (42, 7, 13, 101, 2024, 77)

#: CLIP similarity below this means the picture is not depicting the scene it
#: was asked for. Carried over from the vocabulary illustrations, where it was
#: calibrated against 433 accepted renders. Check it with --report before
#: trusting it on a new kind of subject.
MIN_CLIP_SCORE = 0.22

EXIT_OK = 0
EXIT_REFUSED = 3
EXIT_INCOMPLETE = 4


@dataclass
class Caption:
    """What gets drawn onto a render with a real font, after generation.

    A picture of a horse teaches that the word means horse, and nothing else.
    The two things a learner actually has to store — what the letter *looks*
    like and what it *sounds* like — are exactly the two a diffusion model
    cannot be trusted to put in the frame: it will not draw a specific
    letterform, and it cannot spell a sound-alike. Both are drawn here
    instead, where they come out right every time and in the same face the app
    itself renders Thai in.

    So the illustration ends up carrying all three at once: the scene gives
    the meaning, the plaque gives sound, shape and gloss on one line, and the
    headline names the noise the thing in the picture is making.
    """

    glyph: str
    anchor: str
    gloss: str
    cue: str | None = None


@dataclass
class Result:
    slide_id: str
    status: str
    score: float = 0.0
    seed: int = 0
    path: Path | None = None
    detail: str = ""


def load_pipeline() -> object:
    import torch
    from diffusers import PixArtSigmaPipeline

    pipe = PixArtSigmaPipeline.from_pretrained(
        PIXART_MODEL_ID, torch_dtype=torch.float16
    )
    pipe = pipe.to("cuda")
    pipe.set_progress_bar_config(disable=True)
    return pipe


def load_scorer() -> tuple[object, object]:
    from transformers import CLIPModel, CLIPProcessor

    model = CLIPModel.from_pretrained(CLIP_MODEL_ID).to("cuda").eval()
    processor = CLIPProcessor.from_pretrained(CLIP_MODEL_ID)
    return model, processor


def score(model: object, processor: object, image: object, scene: str) -> float:
    """Cosine similarity between the render and the scene it was asked for.

    Deliberately scored against the *scene*, not the styled prompt: the
    question is whether the picture shows what was asked for, and the style
    suffix is identical for every slide so it contributes nothing but noise to
    the comparison.
    """
    import torch

    inputs = processor(
        text=[scene], images=image, return_tensors="pt", padding=True, truncation=True
    ).to("cuda")
    with torch.no_grad():
        out = model(**inputs)
        image_embed = out.image_embeds / out.image_embeds.norm(dim=-1, keepdim=True)
        text_embed = out.text_embeds / out.text_embeds.norm(dim=-1, keepdim=True)
        return float((image_embed @ text_embed.T).item())


def render_one(
    pipe: object,
    scorer: tuple[object, object],
    slide_id: str,
    scene: str,
    out_path: Path,
    min_score: float,
    report_only: bool,
    caption: Caption | None,
) -> Result:
    import torch

    model, processor = scorer
    prompt = build_flux_prompt(scene)
    best_image = None
    best_score = -1.0
    best_seed = 0

    for seed in SEEDS:
        generator = torch.Generator(device="cuda").manual_seed(seed)
        image = pipe(
            prompt=prompt,
            num_inference_steps=PIXART_STEPS,
            guidance_scale=PIXART_GUIDANCE,
            max_sequence_length=PIXART_MAX_SEQUENCE_LENGTH,
            width=GENERATION_SIZE[0],
            height=GENERATION_SIZE[1],
            generator=generator,
        ).images[0]
        value = score(model, processor, image, scene)
        if value > best_score:
            best_image, best_score, best_seed = image, value, seed
        if value >= min_score and not report_only:
            break

    if best_image is None:
        return Result(slide_id, "failed", detail="no candidate was produced")
    if best_score < min_score:
        return Result(
            slide_id,
            "refused",
            score=best_score,
            seed=best_seed,
            detail=f"best of {len(SEEDS)} seeds scored {best_score:.3f}",
        )
    if report_only:
        return Result(slide_id, "scored", score=best_score, seed=best_seed)

    from PIL import Image

    shipped = best_image.resize(SHIPPED_SIZE, Image.LANCZOS)
    if caption is not None:
        # Drawn after the render and after the downscale, so the glyph is
        # rasterised once at its final size rather than resampled — a letter a
        # learner is being asked to recognise must not be the softest thing in
        # the frame.
        shipped = compose(
            shipped,
            anchor=caption.anchor,
            thai=caption.glyph,
            english=caption.gloss,
            headline=caption.cue,
        )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    shipped.save(out_path, "JPEG", quality=88, optimize=True)
    return Result(slide_id, "written", score=best_score, seed=best_seed, path=out_path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("script", type=Path, help="the lesson script Markdown")
    parser.add_argument(
        "--slides", help="comma-separated slide ids; default is every scene"
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=MIN_CLIP_SCORE,
        help=f"CLIP gate (default {MIN_CLIP_SCORE})",
    )
    parser.add_argument(
        "--report",
        action="store_true",
        help="score every seed and write nothing — for calibrating --min-score",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="re-render slides whose picture already exists",
    )
    args = parser.parse_args(argv)

    script = parse_script(args.script)
    wanted = set(args.slides.split(",")) if args.slides else None

    todo: list[tuple[str, str, Path, Caption | None]] = []
    for slide in script.slides:
        scene = slide.fields.get("scene")
        if not scene:
            continue
        if wanted is not None and slide.id not in wanted:
            continue
        declared = slide.fields.get("image")
        if not declared:
            print(
                f"warning: slide {slide.id!r} has a scene but no `image:` field, "
                "so the deck would never show it — skipping",
                file=sys.stderr,
            )
            continue
        out_path = (args.script.parent / declared).resolve()
        if out_path.exists() and not args.force and not args.report:
            print(f"  {slide.id:<22} exists, skipping")
            continue

        # A slide that teaches a symbol declares what to draw on the picture.
        # A slide that only sets a mood (the harbour, a flat horizon) declares
        # nothing and gets a clean frame — a plaque naming a letter under a
        # picture that is not about a letter is noise.
        glyph = slide.fields.get("glyph")
        caption = (
            Caption(
                glyph=glyph,
                anchor=slide.fields.get("anchor", ""),
                gloss=slide.fields.get("gloss", ""),
                cue=slide.fields.get("cue"),
            )
            if glyph
            else None
        )
        todo.append((slide.id, scene, out_path, caption))

    if not todo:
        print("nothing to render")
        return EXIT_OK

    print(f"loading {PIXART_MODEL_ID} ...")
    pipe = load_pipeline()
    print(f"loading {CLIP_MODEL_ID} ...")
    scorer = load_scorer()

    results = [
        render_one(
            pipe,
            scorer,
            slide_id,
            scene,
            out_path,
            args.min_score,
            args.report,
            caption,
        )
        for slide_id, scene, out_path, caption in todo
    ]

    print()
    for result in results:
        mark = {"written": "ok ", "scored": "  ?", "refused": "REF", "failed": "ERR"}[
            result.status
        ]
        detail = f"  {result.detail}" if result.detail else ""
        print(
            f"{mark} {result.slide_id:<22} score={result.score:.3f} "
            f"seed={result.seed}{detail}"
        )

    refused = [r for r in results if r.status in ("refused", "failed")]
    if refused:
        print(
            f"\n{len(refused)} scene(s) did not clear the gate. A slide with no "
            "picture is better than one showing the wrong thing — rewrite the "
            "scene and re-run, or leave the slide without an illustration.",
            file=sys.stderr,
        )
        return EXIT_INCOMPLETE
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
