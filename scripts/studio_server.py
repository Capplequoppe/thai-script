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
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from lesson_deck.document import ScriptDocument, SlideBlock  # noqa: E402
from lesson_deck.script_parser import ScriptError, parse_script  # noqa: E402
from lesson_deck.vendor import strip_markup  # noqa: E402

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

	Built once and kept. `S2ProVoice` starts its worker lazily, so nothing is
	loaded until the first build actually needs it — a session spent only
	reading and editing text costs no GPU memory at all.

	One engine voices both languages, pointed at a different reference for
	each, because two would be two copies of a model that wants most of the
	card. The studio therefore holds no credential and makes no metered call:
	a build started from here reaches nothing but this machine.
	"""

	def __init__(self) -> None:
		self._voice: Any | None = None
		self._transcriber: Any | None = None

	def vendor(self) -> Any:
		from lesson_deck.vendor import (
			LocalThaiVoice,
			LocalTranscriber,
			S2ProVoice,
			SplitVendor,
		)

		if self._voice is None:
			self._voice = S2ProVoice()
		if self._transcriber is None:
			# On the CPU: the Thai trim runs *while* the engine is resident,
			# and 19.7 GB of engine and 4.1 GB of verifier do not share a
			# 24.5 GB card. Same model, same answers, four seconds slower.
			self._transcriber = LocalTranscriber(device="cpu")
		return SplitVendor(
			thai=LocalThaiVoice(engine=self._voice, transcriber=self._transcriber),
			english=self._voice,
			transcriber=self._transcriber,
		)

	def release_english(self) -> None:
		"""Hand the card back — image rendering needs most of it."""
		if self._voice is not None:
			self._voice.close()

	def holding_gpu(self) -> bool:
		"""Whether anything of ours is resident on the card right now.

		The engine is asked, not merely counted: it is kept between builds and
		stood down by `/__studio/api/release`, so whether the instance exists
		and whether it holds memory are different questions. The transcriber
		is not part of the answer at all — it runs on the CPU, which is what
		lets it verify Thai while the engine is still loaded.
		"""
		return self._voice is not None and self._voice.resident


ENGINES = Engines()


class Job:
	"""The build currently running, if any, as something a page can poll.

	A deck build takes minutes and a single clip a few seconds, and a request
	that simply blocks for either is indistinguishable from a hang: the fans
	spin up, the page waits, and nothing says which clip is being made or how
	many are left. So a build runs on its own thread and the page asks.

	Polling rather than a stream. This is a `http.server`, where an open
	streaming response ties up a worker thread and has to be kept alive by
	hand; a poll every few hundred milliseconds is coarser and cannot break in
	a way that leaves the page waiting forever on a socket nobody is writing
	to.
	"""

	def __init__(self) -> None:
		self._lock = threading.Lock()
		self._state: dict[str, Any] = {"running": False}
		self._watching: set[str] | None = None

	def snapshot(self) -> dict[str, Any]:
		with self._lock:
			return dict(self._state)

	def start(
		self, deck: str, scope: str, total_hint: int, watching: set[str] | None
	) -> None:
		with self._lock:
			#: The keys this build was asked to remake. When set, progress counts
			#: only these — the rest of the deck is walked but every asset is a
			#: cache hit, and counting those makes a one-clip job report `0/61`.
			self._watching = watching
			self._state = {
				"running": True,
				"deck": deck,
				"scope": scope,
				"done": 0,
				"total": total_hint,
				"current": None,
				"generated": 0,
				"reused": 0,
				"errors": [],
				"startedAt": time.time(),
			}

	def advance(self, progress: dict[str, Any]) -> None:
		"""Take the run's own counters rather than counting alongside it.

		Counting here would mean re-deriving a distinction the run already
		makes, and getting it wrong: a reused asset is recorded as "generated",
		so a watcher tallying states reports every clip as freshly made.
		"""
		with self._lock:
			if self._watching is not None:
				if progress["key"] not in self._watching:
					# A cache hit on something nobody asked about. Reporting it
					# would move a bar that is measuring different work.
					return
				self._state["done"] = int(self._state.get("done", 0)) + 1
				self._state["current"] = progress["key"]
			else:
				self._state["done"] = progress["done"]
				self._state["total"] = progress["total"]
				self._state["current"] = progress["key"]
			self._state["generated"] = progress["generated"]
			self._state["reused"] = progress["reused"]

	def finish(self, report: dict[str, Any] | None, error: str | None) -> None:
		with self._lock:
			self._state.update({
				"running": False,
				"current": None,
				"finishedAt": time.time(),
				"report": report,
				"error": error,
			})


JOB = Job()


def deck_ids() -> list[str]:
	return sorted(path.stem for path in CONTENT_DIR.glob("*.md"))


def slide_payload(block: SlideBlock, deck: str) -> dict[str, Any]:
	"""One slide, as the studio needs to show and edit it."""
	from lesson_deck.images import styled_prompt  # noqa: PLC0415

	image = block.field_value("image")
	scene = block.field_value("scene")
	return {
		"id": block.id,
		"kind": block.kind,
		"heading": block.field_value("heading"),
		"image": image,
		"imageUrl": f"/__studio/media/{deck}/{image}" if image else None,
		"scene": scene,
		# `image-prompt`, not `prompt`: the latter is a retrieval slide's
		# question, and writing an image prompt there destroys it.
		"prompt": block.field_value("image-prompt"),
		# What the batch generator would send for this scene, style suffix
		# included. The studio prefills with this so the box holds the prompt
		# that actually produces the deck's house look, rather than a bare
		# scene that renders as something else entirely.
		"styledPrompt": styled_prompt(scene) if scene else None,
		"seed": block.field_value("image-seed"),
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

	# The manifest knows about clips the deck does not.
	#
	# A build that loses even one segment writes no deck at all — correct for
	# the app, which must not ship a lesson with a hole, and exactly wrong for
	# the studio, where a failed build is when you most want to hear what did
	# come out. One bad Thai clip would otherwise hide twenty-five good English
	# ones and leave the page looking like nothing ran.
	#
	# Keyed by segment rather than by slide, so it fills the individual gaps a
	# partial build leaves rather than replacing a slide wholesale.
	by_key: dict[str, str] = {}
	manifest_path = ASSETS_ROOT / deck / "manifest.json"
	if manifest_path.exists():
		manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
		for asset in manifest.get("assets", []):
			if asset.get("kind") == "audio" and asset.get("file"):
				# Served by this server, not by the app's dev server — see the
				# `/__studio/audio/` route for why the latter cannot see a clip
				# that was written after it started.
				by_key[asset["key"]] = f"/__studio/audio/{deck}/{asset['file']}"

	out: dict[str, list[dict[str, Any]]] = {}
	for slide in parse_script(CONTENT_DIR / f"{deck}.md").slides:
		found = urls.get(slide.id, [])
		out[slide.id] = [
			{
				"key": segment.key,
				"language": segment.language,
				"text": segment.text,
				"sources": list(segment.sources),
				# Counted on the spoken text. A tag is direction, not words, so
				# counting `[pause]` would inflate the studio's duration
				# estimate and make a clip look closer to the cap than it is.
				"words": len(strip_markup(segment.text).split()),
				# The manifest first, because it is keyed by segment. The
				# deck's `audio` is a positional array, so a build that
				# produced nothing for one line shortens it and slides every
				# later clip onto the wrong row — which is exactly how a
				# scoped rebuild once had Thai lines playing English audio
				# here. Falling back to it only when the manifest is silent
				# keeps older decks working without inheriting that.
				"url": (
					by_key.get(segment.key)
					or (found[index] if index < len(found) else None)
				),
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
	for name in ("heading", "image", "scene", "image-prompt", "image-seed"):
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
			on_progress=JOB.advance,
		)
	return {
		"generated": report.generated,
		"reused": report.reused,
		"failed": report.failed,
		"synthCalls": report.synth_calls,
		"deckWritten": report.deck_written,
		"errors": report.errors,
	}


def start_build(deck: str, force: list[str] | None, scope: str) -> dict[str, Any]:
	"""Kick a build off and return at once, so the page can watch it."""
	if JOB.snapshot().get("running"):
		raise ValueError("a build is already running")

	watching = set(force) if force else None
	total = (
		len(watching)
		if watching is not None
		else sum(
			len(slide.segments)
			for slide in parse_script(CONTENT_DIR / f"{deck}.md").slides
		)
	)
	JOB.start(deck, scope, total, watching)

	def work() -> None:
		try:
			JOB.finish(build_deck(deck, force), None)
		except Exception as error:  # noqa: BLE001 — reported, never raised into a thread
			traceback.print_exc()
			JOB.finish(None, str(error))

	threading.Thread(target=work, daemon=True).start()
	return {"started": True, "total": total, "scope": scope}


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
	block.set_field("image-prompt", prompt)
	block.set_field("image-seed", str(seed))
	document.save()
	return {"image": declared, "prompt": prompt, "seed": seed}


def install_image(deck: str, slide_id: str, data: bytes, suffix: str) -> dict[str, Any]:
	"""Put a supplied picture on a slide, in place of a generated one.

	Normalised to the same dimensions the generator produces, by cover-fitting
	and centre-cropping rather than squashing: every other picture in the deck
	is that shape, and one slide at a different aspect ratio reads as a mistake
	rather than as a choice.

	**Clears `prompt:` and `seed:`.** They describe how a picture was made, and
	once it was not made that way they are worse than absent — the studio
	prefills them, so a stale pair invites someone to press Render and quietly
	destroy the image they just chose.
	"""
	import io

	from PIL import Image

	from mnemonics.style import SHIPPED_SIZE

	document = ScriptDocument.load(CONTENT_DIR / f"{deck}.md")
	block = document.by_id(slide_id)
	if block is None:
		raise KeyError(f"no slide {slide_id!r} in {deck}")

	declared = block.field_value("image") or f"images/{deck}/{slide_id}{suffix}"
	out_path = (CONTENT_DIR / declared).resolve()
	if CONTENT_DIR.resolve() not in out_path.parents:
		raise ValueError(f"slide {slide_id!r}: its image resolves outside content/")

	try:
		source = Image.open(io.BytesIO(data))
		source.load()
	except Exception as error:  # noqa: BLE001 — any decode failure is the same answer
		raise ValueError(f"that file is not an image this can read: {error}") from error

	target_w, target_h = SHIPPED_SIZE
	scale = max(target_w / source.width, target_h / source.height)
	resized = source.convert("RGB").resize(
		(round(source.width * scale), round(source.height * scale)), Image.LANCZOS
	)
	left = (resized.width - target_w) // 2
	top = (resized.height - target_h) // 2
	resized.crop((left, top, left + target_w, top + target_h)).save(
		out_path, "JPEG", quality=88, optimize=True
	)

	block.set_field("image", declared)
	block.set_field("image-prompt", None)
	block.set_field("image-seed", None)
	document.save()
	return {"image": declared, "replaced": True}


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
			if path == "/__studio/api/job":
				return self._send(200, JOB.snapshot())
			if path == "/__studio/api/gpu":
				# So a command-line build can ask before it starts, and say
				# what is in its way rather than letting CUDA say "invalid
				# device ordinal". The studio holds the narration engine
				# resident on purpose — that is what makes regenerating one
				# line fast — and there is only one card.
				return self._send(
					200,
					{
						"holding": ENGINES.holding_gpu(),
						"building": JOB.snapshot().get("running", False),
					},
				)
			if path == "/__studio/api/release":
				# Stand down without shutting down: the next build reloads the
				# engine, which is the same thing that happens after an image
				# render.
				ENGINES.release_english()
				return self._send(200, {"released": True})
			matched = re.match(r"^/__studio/api/deck/([A-Za-z0-9-]+)$", path)
			if matched:
				return self._send(200, deck_payload(matched.group(1)))
			matched = re.match(r"^/__studio/audio/([A-Za-z0-9-]+)/(.+)$", path)
			if matched:
				# The studio serves its own clips rather than letting the app's
				# dev server do it.
				#
				# `vite.config.ts` excludes `public/lessons/**` from the
				# watcher, so a reload is not broadcast every time a build lands
				# sixty mp3s — which is right, and has a consequence the comment
				# there does not mention: Vite never learns the new files exist
				# and answers a request for one with the SPA's index.html. The
				# browser then reports "the element has no supported sources",
				# which names neither the file nor the reason.
				#
				# Reading from disk per request has no such staleness, and this
				# server is already the one the studio talks to.
				deck, name = matched.group(1), matched.group(2)
				target = (ASSETS_ROOT / deck / name).resolve()
				lesson_dir = (ASSETS_ROOT / deck).resolve()
				if lesson_dir not in target.parents or not target.is_file():
					return self._send(404, {"error": "not found"})
				return self._send(200, target.read_bytes(), "audio/mpeg")
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
				return self._send(200, start_build(
					matched.group(1), body.get("force"), body.get("scope", "deck"),
				))

			matched = re.match(
				r"^/__studio/api/deck/([A-Za-z0-9-]+)/slide/([A-Za-z0-9-]+)/image$", path
			)
			if matched:
				body = self._body()
				return self._send(200, render_image(
					matched.group(1), matched.group(2),
					body.get("prompt", ""), int(body.get("seed", 42)),
				))

			matched = re.match(
				r"^/__studio/api/deck/([A-Za-z0-9-]+)/slide/([A-Za-z0-9-]+)/upload$",
				path,
			)
			if matched:
				length = int(self.headers.get("Content-Length") or 0)
				if not length:
					return self._send(400, {"error": "no file in the request"})
				kind = (self.headers.get("Content-Type") or "").lower()
				suffix = ".png" if "png" in kind else ".jpg"
				return self._send(200, install_image(
					matched.group(1), matched.group(2), self.rfile.read(length), suffix,
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
