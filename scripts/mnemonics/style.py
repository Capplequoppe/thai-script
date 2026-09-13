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

# Deliberately short. Both text encoders truncate at 77 tokens and the scene
# needs most of that budget: an earlier 58-token version left no room, and
# moving it to `prompt_2` instead — SDXL's dominant encoder — swamped the
# scene completely and produced three generic anime portraits with no cat, no
# keyring and no SWAT team in them. Style is a seasoning here, not the dish.
STYLE_SUFFIX = "anime illustration, watercolour, warm golden light, paper grain"

# Diffusion models cannot spell, and cannot render Thai script at all. Every
# caption is composited afterwards with a real font (see `compose.py`), so the
# generator is told in the strongest terms to leave the frame clean — a word
# baked into the image is unfixable, where a blank margin is free.
NEGATIVE_PROMPT = (
    "text, letters, words, writing, caption, subtitle, signage, watermark, "
    "signature, logo, speech bubble, letterforms, gibberish text, "
    "numbers, digits, numerals, clock face numbers, price tag, "
    "lowres, blurry, jpeg artifacts, deformed hands, extra fingers, "
    "extra limbs, mutated, disfigured, bad anatomy, ugly, "
    "photorealistic, 3d render, photograph"
)

GUIDANCE_SCALE = 6.5
INFERENCE_STEPS = 32

# Both CLIP text encoders hard-truncate at 77 tokens, silently. Concatenating
# scene and style gave 112-140 tokens, so the style was cut off entirely and
# the first spike came back near-monochrome and semi-photographic — none of
# "soft watercolour wash", "warm golden key light" or "rich saturated palette"
# ever reached the model.
#
# SDXL has two text encoders and `prompt_2` feeds the second, so the scene and
# the style each get a budget of their own instead of competing for one.
# Both encoders get the same text: SDXL expects them aligned, and splitting
# scene from style across them makes whichever encoder holds the style win.
MAX_PROMPT_TOKENS = 77


def build_prompt(scene: str) -> str:
    """Scene first, style appended — the scene must survive any truncation."""
    return f"{scene.strip().rstrip('.')}. {STYLE_SUFFIX}"
