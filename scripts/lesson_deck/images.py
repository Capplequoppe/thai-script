"""Render one slide picture from an explicit prompt and seed.

`generate-slide-images.py` renders a whole deck unattended: it styles the
`scene:` field into a prompt, tries a ladder of seeds, scores each against the
scene with CLIP, and keeps the best one that clears a threshold. That is the
right shape for a batch nobody is watching.

It is the wrong shape for someone sitting in front of the studio typing a
prompt. There the person *is* the scorer, the prompt is theirs rather than one
derived from a scene, and a gate that silently refuses their wording — or a
ladder that quietly returns a different seed than the one they asked for —
makes the box feel broken. So this renders exactly what it is asked for, once,
and hands it back.

The model is kept loaded between calls for the same reason the narration engine
is: PixArt takes a while to load, and a studio that reloads it per click is a
studio nobody uses. `release()` hands the card back, which matters because the
narration engine wants most of it.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from mnemonics.style import (  # noqa: E402
	PIXART_MODEL_ID,
	SHIPPED_SIZE,
	build_flux_prompt,
)

#: Held across calls. The studio's whole premise is that the second edit is
#: fast, and reloading a diffusion model per request would undo that.
_PIPELINE: Any | None = None


def styled_prompt(scene: str) -> str:
	"""What the batch generator would send for this scene.

	Exposed so the studio can prefill the prompt box with the real prompt —
	including the style suffix — rather than the bare `scene:` text. A person
	editing a prompt should see what was actually sent, or their edit is
	against something that never existed.
	"""
	return build_flux_prompt(scene)


def pipeline() -> Any:
	global _PIPELINE
	if _PIPELINE is None:
		import torch
		from diffusers import PixArtSigmaPipeline

		_PIPELINE = PixArtSigmaPipeline.from_pretrained(
			PIXART_MODEL_ID, torch_dtype=torch.float16
		).to("cuda")
		_PIPELINE.set_progress_bar_config(disable=True)
	return _PIPELINE


def release() -> None:
	"""Drop the model and free the card."""
	global _PIPELINE
	if _PIPELINE is None:
		return
	import torch

	del _PIPELINE
	_PIPELINE = None
	if torch.cuda.is_available():
		torch.cuda.empty_cache()


def render_one(
	prompt: str,
	seed: int,
	out_path: Path,
	caption: dict[str, str] | None = None,
) -> dict[str, Any]:
	"""Render `prompt` at `seed` and write it where the slide expects it.

	No CLIP gate and no seed ladder — see the module docstring. The caption, if
	given, is composited after the downscale so a glyph a learner has to read
	is rasterised once at final size rather than resampled.
	"""
	import torch
	from PIL import Image

	pipe = pipeline()
	generator = torch.Generator(device="cuda").manual_seed(seed)
	image = pipe(prompt=prompt, generator=generator).images[0]

	shipped = image.resize(SHIPPED_SIZE, Image.LANCZOS)
	if caption and caption.get("glyph"):
		from mnemonics.compose import compose

		shipped = compose(
			shipped,
			anchor=caption.get("anchor", ""),
			thai=caption.get("glyph", ""),
			english=caption.get("gloss", ""),
			headline=caption.get("cue"),
		)

	out_path.parent.mkdir(parents=True, exist_ok=True)
	shipped.save(out_path, "JPEG", quality=88, optimize=True)
	return {"path": str(out_path), "seed": seed, "prompt": prompt}
