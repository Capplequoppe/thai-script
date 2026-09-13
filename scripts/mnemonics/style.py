"""The parts of every illustration prompt that never vary.

Kept here rather than repeated in `mnemonics.json` so that authoring a word
costs one scene description and nothing else, and so that restyling the whole
set is a one-line edit rather than a rewrite of every entry.

The style was derived from the existing hand-made illustrations under
`public/vocabulary/images/` (see `9 ต้อง.jpg`, `4 นี้.jpg`): anime/manga line
art on a visible paper tooth, warm golden key light, cool shadows, drifting
bokeh motes, 3:2 landscape.
"""

from __future__ import annotations

# 3:2 landscape, matching the existing illustrations' 1024x683. SDXL is
# trained at ~1 megapixel and degrades badly away from it, so generate at the
# nearest standard bucket and downscale to the shipped size.
GENERATION_SIZE = (1216, 832)
SHIPPED_SIZE = (1024, 683)

STYLE_SUFFIX = (
    "anime illustration, clean confident ink linework, soft watercolour wash, "
    "warm golden key light with cool blue shadows, floating dust motes and "
    "bokeh sparkles, visible paper grain, rich saturated palette, "
    "expressive faces, cinematic composition, detailed background, "
    "storybook illustration, masterpiece, best quality"
)

# Diffusion models cannot spell, and cannot render Thai script at all. Every
# caption is composited afterwards with a real font (see `compose.py`), so the
# generator is told in the strongest terms to leave the frame clean — a word
# baked into the image is unfixable, where a blank margin is free.
NEGATIVE_PROMPT = (
    "text, letters, words, writing, caption, subtitle, signage, watermark, "
    "signature, logo, speech bubble, letterforms, gibberish text, "
    "lowres, blurry, jpeg artifacts, deformed hands, extra fingers, "
    "extra limbs, mutated, disfigured, bad anatomy, ugly, "
    "photorealistic, 3d render, photograph"
)

GUIDANCE_SCALE = 6.5
INFERENCE_STEPS = 32


def build_prompt(scene: str) -> str:
    """The full positive prompt for one word: its scene, then the house style."""
    return f"{scene.strip().rstrip('.')}. {STYLE_SUFFIX}"
