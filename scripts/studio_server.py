#!/usr/bin/env python3
"""A local authoring server for lesson decks. Development only, never deployed.

    uv run --project scripts/deck-env python scripts/studio_server.py

Exists because the round trip was too slow to think in. Changing one sentence
meant editing Markdown by hand, running the whole deck build, and waiting —
and the wait was dominated by loading an eleven-gigabyte model and compiling
it, 139 seconds before a word was synthesised. This holds the engine **resident
between requests**, so the first edit pays that and every edit afterwards costs
only its own clip: a few seconds.

Markdown stays the source of truth. The studio edits the script and reruns the
ordinary pipeline, which is already content-addressed — so editing one line
regenerates one clip and leaves the rest byte-identical. There is no second
code path that could drift from the real one.

**Not for deployment.** It writes to the repository, runs local GPU jobs and
has no authentication whatsoever. It binds to localhost and should stay there.
"""

from __future__ import annotations

import json
import os
import re
import sys
import threading
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from lesson_deck.document import ScriptDocument, SlideBlock  # noqa: E402
from lesson_deck.script_parser import ScriptError, parse_script  # noqa: E402

CONTENT_DIR = REPO_ROOT / "content" / "lessons"
ASSETS_ROOT = REPO_ROOT / "public" / "lessons"
DEFAULT_PORT = 5174

#: Every GPU job runs under this. The card holds one large model comfortably
#: and not two, so a build and an image render must not overlap — and two
#: builds of the same deck would race on the same manifest.
GPU_LOCK = threading.Lock()


def env_file() -> Path | None:
	"""Where `.env` actually is, which is not always beside this checkout.

	A git worktree has its own root, and the credential lives in the main
	checkout — so looking only next to `REPO_ROOT` finds nothing and the studio
	reports a missing key while the file is plainly there. Walks up instead,
	which covers both layouts without either having to know about the other.
	"""
	for directory in [REPO_ROOT, *REPO_ROOT.parents]:
		candidate = directory / ".env"
		if candidate.is_file():
			return candidate
	return None


def load_env() -> None:
	"""The ElevenLabs key, for Thai clips. English needs no credential."""
	found = env_file()
	if found is None:
		return
	for line in found.read_text(encoding="utf-8").splitlines():
		matched = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)$", line.strip())
		if matched and matched.group(2).strip():
			os.environ.setdefault(
				matched.group(1), matched.group(2).strip().strip("'\"")
			)


class Engines:
	"""The resident models, and the reason this server exists.

	Built once and kept. `S2ProEnglishVoice` starts its worker lazily, so
	nothing is loaded until the first build actually needs it — a session spent
	only reading and editing text costs no GPU memory at all.
	"""

	def __init__(self) -> None:
		self._english: Any | None = None
		self._transcriber: Any | None = None

	def vendor(self) -> Any:
		from lesson_deck.vendor import (
			ElevenLabsVendor,
			LocalTranscriber,
			Redactor,
			S2ProEnglishVoice,
			SplitVendor,
			load_api_key,
		)

		if self._english is None:
			self._english = S2ProEnglishVoice()
		if self._transcriber is None:
			self._transcriber = LocalTranscriber()
		api_key = load_api_key()
		return SplitVendor(
			thai=ElevenLabsVendor(api_key, Redactor((api_key,))),
			english=self._english,
			transcriber=self._transcriber,
		)

	def release_english(self) -> None:
		"""Hand the card back — image rendering needs most of it."""
		if self._english is not None:
			self._english.close()


ENGINES = Engines()


def deck_ids() -> list[str]:
	return sorted(path.stem for path in CONTENT_DIR.glob("*.md"))


def slide_payload(block: SlideBlock, deck: str) -> dict[str, Any]:
	"""One slide, as the studio needs to show and edit it."""
	image = block.field_value("image")
	return {
		"id": block.id,
		"kind": block.kind,
		"heading": block.field_value("heading"),
		"image": image,
		"imageUrl": f"/__studio/media/{deck}/{image}" if image else None,
		"scene": block.field_value("scene"),
		"prompt": block.field_value("prompt"),
		"seed": block.field_value("seed"),
		"reveal": block.field_value("reveal"),
		"retrieval": block.field_value("retrieval"),
		"promptText": block.field_value("prompt-text"),
		"narration": [
			{"language": language, "text": text}
			for _, language, text in block.narration()
		],
		"bullets": block.bullets(),
		"raw": block.text(),
	}


def clips_for(deck: str) -> dict[str, list[dict[str, Any]]]:
	"""Per slide, the clips the pipeline will actually make.

	Not the same thing as the narration lines. Packing merges consecutive
	English and re-splits it at fifty-five words, so a slide of five authored
	lines becomes six clips and one line can feed three of them. The studio has
	to show the real unit — you cannot regenerate half a clip — so each clip
	carries the indices of the lines it came from and the UI groups by that.
	"""
	built = ASSETS_ROOT / deck / "deck.json"
	urls: dict[str, list[str]] = {}
	if built.exists():
		data = json.loads(built.read_text(encoding="utf-8"))
		for slide in data.get("slides", []):
			audio = slide.get("audio")
			if isinstance(audio, str):
				audio = [audio]
			urls[slide.get("id", "")] = audio or []

	out: dict[str, list[dict[str, Any]]] = {}
	for slide in parse_script(CONTENT_DIR / f"{deck}.md").slides:
		found = urls.get(slide.id, [])
		out[slide.id] = [
			{
				"key": segment.key,
				"language": segment.language,
				"text": segment.text,
				"sources": list(segment.sources),
				"words": len(segment.text.split()),
				"url": found[index] if index < len(found) else None,
			}
			for index, segment in enumerate(slide.segments)
		]
	return out


def deck_payload(deck: str) -> dict[str, Any]:
	path = CONTENT_DIR / f"{deck}.md"
	document = ScriptDocument.load(path)
	built = ASSETS_ROOT / deck / "deck.json"
	audio: dict[str, list[str]] = {}
	if built.exists():
		data = json.loads(built.read_text(encoding="utf-8"))
		for slide in data.get("slides", []):
			clips = slide.get("audio")
			if isinstance(clips, str):
				clips = [clips]
			if clips:
				audio[slide.get("id", "")] = clips
	return {
		"id": deck,
		"slides": [slide_payload(block, deck) for block in document.slides],
		"audio": audio,
		"clips": clips_for(deck),
	}


def apply_slide_edit(deck: str, slide_id: str, body: dict[str, Any]) -> dict[str, Any]:
	path = CONTENT_DIR / f"{deck}.md"
	document = ScriptDocument.load(path)
	block = document.by_id(slide_id)
	if block is None:
		raise KeyError(f"no slide {slide_id!r} in {deck}")

	if "narration" in body:
		block.set_narration([
			(entry.get("language", "en"), entry.get("text", "").strip())
			for entry in body["narration"]
			if entry.get("text", "").strip()
		])
	if "bullets" in body:
		block.set_bullets([text for text in body["bullets"] if text.strip()])
	for name in ("heading", "image", "scene", "prompt", "seed"):
		if name in body:
			value = body[name]
			block.set_field(name, str(value).strip() if value else None)

	# Parsed before it is written, so a studio edit cannot leave a script the
	# pipeline will refuse. The document is in memory; the file is untouched
	# until this passes.
	staged = path.with_suffix(".md.staged")
	try:
		staged.write_text(document.text(), encoding="utf-8")
		parse_script(staged)
	except ScriptError as error:
		raise ValueError(f"the edit would not parse: {error}") from error
	finally:
		staged.unlink(missing_ok=True)

	document.save()
	return slide_payload(block, deck)


def build_deck(deck: str, force: list[str] | None = None) -> dict[str, Any]:
	"""Rebuild through the ordinary pipeline, reusing the resident engine.

	`force` names clip keys to remake whatever the cache says. Every scope the
	studio offers — one clip, one slide, the whole deck — is this same call
	with a different list, because the pipeline is content-addressed and
	already skips everything untouched. A separate "regenerate one clip" path
	would be a second implementation of the thing that works.
	"""
	from lesson_deck.pipeline import generate
	from lesson_deck.vendor import (
		DEFAULT_MODEL_ID,
		DEFAULT_VOICE_ID,
		Redactor,
		VoiceSpec,
		load_api_key,
	)

	load_env()
	api_key = load_api_key()
	with GPU_LOCK:
		report = generate(
			parse_script(CONTENT_DIR / f"{deck}.md"),
			ASSETS_ROOT,
			ENGINES.vendor(),
			VoiceSpec(voice_id=DEFAULT_VOICE_ID, model_id=DEFAULT_MODEL_ID),
			Redactor((api_key,)),
			force_keys=force,
		)
	return {
		"generated": report.generated,
		"reused": report.reused,
		"failed": report.failed,
		"synthCalls": report.synth_calls,
		"deckWritten": report.deck_written,
		"errors": report.errors,
	}


def render_image(deck: str, slide_id: str, prompt: str, seed: int) -> dict[str, Any]:
	"""One slide's picture, from an explicit prompt and seed.

	Deliberately bypasses the CLIP gate and the seed ladder that the batch
	generator uses. Those exist to pick a usable image unattended; here a
	person is looking at the result and will judge it, and being overruled by a
	scorer would make the prompt box useless.
	"""
	import torch

	from lesson_deck.document import ScriptDocument

	document = ScriptDocument.load(CONTENT_DIR / f"{deck}.md")
	block = document.by_id(slide_id)
	if block is None:
		raise KeyError(f"no slide {slide_id!r} in {deck}")
	declared = block.field_value("image")
	if not declared:
		raise ValueError(f"slide {slide_id!r} has no `image:` field to write to")
	out_path = (CONTENT_DIR / declared).resolve()
	if CONTENT_DIR.resolve() not in out_path.parents:
		raise ValueError(f"slide {slide_id!r}: its image resolves outside content/")

	from lesson_deck.images import render_one  # noqa: PLC0415

	# A slide that teaches a symbol carries its plaque; one that only sets a
	# mood does not, and a letter drawn on a harbour scene would be noise.
	glyph = block.field_value("glyph")
	caption = {
		"glyph": glyph,
		"anchor": block.field_value("anchor") or "",
		"gloss": block.field_value("gloss") or "",
		"cue": block.field_value("cue"),
	} if glyph else None

	with GPU_LOCK:
		# The narration engine and the image model do not fit on this card
		# together, so the resident worker stands down for the render.
		ENGINES.release_english()
		try:
			render_one(prompt=prompt, seed=seed, out_path=out_path, caption=caption)
		finally:
			if torch.cuda.is_available():
				torch.cuda.empty_cache()

	# Recorded on the slide so the studio can prefill them next time, and so
	# the picture stops being an artefact whose origin nobody remembers.
	block.set_field("prompt", prompt)
	block.set_field("seed", str(seed))
	document.save()
	return {"image": declared, "prompt": prompt, "seed": seed}


class Handler(BaseHTTPRequestHandler):
	protocol_version = "HTTP/1.1"

	def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
		sys.stderr.write(f"studio: {format % args}\n")

	def _send(self, status: int, payload: Any, content_type: str = "application/json") -> None:
		body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
		self.send_response(status)
		self.send_header("Content-Type", content_type)
		self.send_header("Content-Length", str(len(body)))
		self.send_header("Access-Control-Allow-Origin", "*")
		self.send_header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS")
		self.send_header("Access-Control-Allow-Headers", "Content-Type")
		self.end_headers()
		self.wfile.write(body)

	def _body(self) -> dict[str, Any]:
		length = int(self.headers.get("Content-Length") or 0)
		if not length:
			return {}
		return json.loads(self.rfile.read(length))

	def do_OPTIONS(self) -> None:  # noqa: N802
		self._send(204, b"")

	def do_GET(self) -> None:  # noqa: N802
		path = self.path.split("?")[0]
		try:
			if path == "/__studio/api/decks":
				return self._send(200, {"decks": deck_ids()})
			matched = re.match(r"^/__studio/api/deck/([A-Za-z0-9-]+)$", path)
			if matched:
				return self._send(200, deck_payload(matched.group(1)))
			matched = re.match(r"^/__studio/media/([A-Za-z0-9-]+)/(.+)$", path)
			if matched:
				target = (CONTENT_DIR / matched.group(2)).resolve()
				if CONTENT_DIR.resolve() not in target.parents or not target.is_file():
					return self._send(404, {"error": "not found"})
				kind = "image/jpeg" if target.suffix in {".jpg", ".jpeg"} else "image/png"
				return self._send(200, target.read_bytes(), kind)
			self._send(404, {"error": f"no route for {path}"})
		except Exception as error:  # noqa: BLE001
			traceback.print_exc()
			self._send(500, {"error": str(error)})

	def do_PUT(self) -> None:  # noqa: N802
		matched = re.match(
			r"^/__studio/api/deck/([A-Za-z0-9-]+)/slide/([A-Za-z0-9-]+)$",
			self.path.split("?")[0],
		)
		if not matched:
			return self._send(404, {"error": "no route"})
		try:
			payload = apply_slide_edit(matched.group(1), matched.group(2), self._body())
			self._send(200, payload)
		except (KeyError, ValueError) as error:
			self._send(400, {"error": str(error)})
		except Exception as error:  # noqa: BLE001
			traceback.print_exc()
			self._send(500, {"error": str(error)})

	def do_POST(self) -> None:  # noqa: N802
		path = self.path.split("?")[0]
		try:
			matched = re.match(r"^/__studio/api/deck/([A-Za-z0-9-]+)/build$", path)
			if matched:
				body = self._body()
				return self._send(200, build_deck(matched.group(1), body.get("force")))

			matched = re.match(
				r"^/__studio/api/deck/([A-Za-z0-9-]+)/slide/([A-Za-z0-9-]+)/image$", path
			)
			if matched:
				body = self._body()
				return self._send(200, render_image(
					matched.group(1), matched.group(2),
					body.get("prompt", ""), int(body.get("seed", 42)),
				))

			matched = re.match(r"^/__studio/api/deck/([A-Za-z0-9-]+)/slide$", path)
			if matched:
				body = self._body()
				deck = matched.group(1)
				document = ScriptDocument.load(CONTENT_DIR / f"{deck}.md")
				block = SlideBlock(
					kind=body.get("kind", "exposition"),
					id=body["id"],
					lines=[
						f"heading: {body.get('heading', 'New slide')}",
						"narration: en Say something here.",
					],
				)
				document.insert_after(body.get("after"), block)
				document.save()
				return self._send(200, slide_payload(block, deck))

			self._send(404, {"error": f"no route for {path}"})
		except (KeyError, ValueError) as error:
			self._send(400, {"error": str(error)})
		except Exception as error:  # noqa: BLE001
			traceback.print_exc()
			self._send(500, {"error": str(error)})

	def do_DELETE(self) -> None:  # noqa: N802
		matched = re.match(
			r"^/__studio/api/deck/([A-Za-z0-9-]+)/slide/([A-Za-z0-9-]+)$",
			self.path.split("?")[0],
		)
		if not matched:
			return self._send(404, {"error": "no route"})
		try:
			document = ScriptDocument.load(CONTENT_DIR / f"{matched.group(1)}.md")
			document.remove(matched.group(2))
			document.save()
			self._send(200, {"removed": matched.group(2)})
		except KeyError as error:
			self._send(404, {"error": str(error)})
		except ValueError as error:
			self._send(400, {"error": str(error)})


def main() -> int:
	import argparse

	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("--port", type=int, default=DEFAULT_PORT)
	args = parser.parse_args()

	load_env()
	server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
	print(f"deck studio on http://127.0.0.1:{args.port}/__studio/api/decks")
	print(f"decks: {', '.join(deck_ids())}")
	print("the narration engine loads on the first build, not now")
	try:
		server.serve_forever()
	except KeyboardInterrupt:
		print("\nstopping")
		ENGINES.release_english()
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
