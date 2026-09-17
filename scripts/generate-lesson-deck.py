#!/usr/bin/env python3
"""Turn a lesson script into deck JSON plus its committed audio and images.

    export ELEVENLABS_API_KEY=...          # see .env.example
    python3 scripts/generate-lesson-deck.py content/lessons/lesson-01.md

Narration is English prose with Thai embedded, and the script tags each
narration line `en` or `th`. **Both go to ElevenLabs**; the Thai lines
additionally have their clip transcribed back before it is accepted, because a
wrong tone teaches a mispronunciation and the tone lessons are the product.
`scripts/generate-sentence-audio.py` records the same discipline for the
sentence bank, including which knobs were measured and are *not* levers.

Re-running is cheap and safe. Every asset is cached on a hash of its own
inputs — the text, the language, the voice, the model, the voice settings — so
an unchanged script issues no API calls at all, and changing one line
regenerates that line's clip and leaves every other file byte-identical.

The run is all-or-nothing in the direction that matters: the manifest is always
written, so a failure is recorded; `deck.json` is written only when every
segment came back verified. A partial run exits non-zero and never leaves a
deck behind whose audio is quietly missing.

Exit codes: 0 success, 2 no credential, 3 the script, a path or the existing
manifest was refused, 4 at least one segment could not be produced.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lesson_deck.ids import RefusedPath  # noqa: E402
from lesson_deck.jsonio import write as write_json  # noqa: E402
from lesson_deck.manifest import ManifestUnreadable  # noqa: E402
from lesson_deck.pipeline import generate  # noqa: E402
from lesson_deck.script_parser import ScriptError, parse_script  # noqa: E402
from lesson_deck.vendor import (  # noqa: E402
	DEFAULT_MODEL_ID,
	DEFAULT_VOICE_ID,
	ElevenLabsVendor,
	LocalThaiVoice,
	LocalTranscriber,
	MissingCredential,
	S2ProVoice,
	Redactor,
	SplitVendor,
	VoiceSpec,
	load_api_key,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ASSETS_ROOT = REPO_ROOT / "public" / "lessons"

EXIT_NO_CREDENTIAL = 2
EXIT_REFUSED = 3
EXIT_INCOMPLETE = 4


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("script", type=Path, help="the lesson script Markdown")
	parser.add_argument(
		"--assets-root",
		type=Path,
		default=DEFAULT_ASSETS_ROOT,
		help="directory holding one folder per lesson (default: public/lessons)",
	)
	parser.add_argument("--voice-id", default=DEFAULT_VOICE_ID)
	parser.add_argument("--model-id", default=DEFAULT_MODEL_ID)
	parser.add_argument(
		"--report", type=Path, help="write the run's counts here as JSON"
	)
	parser.add_argument(
		"--metered-thai",
		action="store_true",
		help="voice Thai through ElevenLabs instead of this machine, which "
		"costs per character and needs ELEVENLABS_API_KEY. Local Thai clones "
		"the same voice from scripts/lesson_deck/reference/thai-voice.mp3 and "
		"passes the same transcribe-back check, so this is for rebuilding "
		"that reference or for comparing the two by ear — not for ordinary "
		"builds.",
	)
	return parser


def studio_is_holding_the_gpu() -> bool:
	"""Is the studio server resident on the card?

	There is one GPU and the narration engine wants 19.7 GB of it. The studio
	keeps that engine loaded for as long as a deck is open, deliberately — it
	is what makes regenerating a single line fast. A command-line build started
	alongside it asks for a second copy and CUDA refuses with "invalid device
	ordinal", which names neither the cause nor the cure.

	Asked over HTTP rather than by looking for a process, because the question
	is "is the studio holding the engine", not "is a python running". A studio
	that is up but has never built holds nothing and is no obstacle.
	"""
	import json as _json  # noqa: PLC0415
	import urllib.error  # noqa: PLC0415
	import urllib.request  # noqa: PLC0415

	try:
		with urllib.request.urlopen(
			"http://127.0.0.1:5174/__studio/api/gpu", timeout=1
		) as response:
			state = _json.loads(response.read())
	except (urllib.error.URLError, OSError, ValueError):
		# Not running, or too old to answer. Either way, not in the way.
		return False
	return bool(state.get("holding") or state.get("building"))


def main(argv: list[str] | None = None) -> int:
	args = build_parser().parse_args(argv)

	if studio_is_holding_the_gpu():
		print(
			"error: the studio server is holding the narration engine, and the "
			"card fits one copy of it. Stop the studio, or POST "
			"http://127.0.0.1:5174/__studio/api/release to make it stand down, "
			"then re-run. Nothing was written.",
			file=sys.stderr,
		)
		return EXIT_NO_CREDENTIAL

	# Only the metered path needs a credential, and it is checked before
	# anything else runs, so a machine without one fails naming the key rather
	# than naming whatever it reached next. An ordinary build reaches nothing
	# but this machine and asks for nothing.
	api_key = ""
	if args.metered_thai:
		try:
			api_key = load_api_key()
		except MissingCredential as error:
			print(f"error: {error}", file=sys.stderr)
			return EXIT_NO_CREDENTIAL

	redactor = Redactor((api_key,))
	# One engine for both languages: it is a voice cloner, and the language is
	# decided by which reference it is handed. A second instance would be a
	# second copy of a model that wants 19.7 GB of a 24.5 GB card.
	voice = S2ProVoice()
	# On the CPU, because with Thai voiced locally the trim runs while the
	# engine is resident. Same model and the same answers, about four seconds
	# slower per clip, and no contention for the card.
	transcriber = LocalTranscriber(device="cpu" if not args.metered_thai else "cuda")
	try:
		script = parse_script(args.script)
		report = generate(
			script,
			args.assets_root,
			SplitVendor(
				thai=(
					ElevenLabsVendor(api_key, redactor)
					if args.metered_thai
					else LocalThaiVoice(engine=voice, transcriber=transcriber)
				),
				english=voice,
				transcriber=transcriber,
			),
			VoiceSpec(voice_id=args.voice_id, model_id=args.model_id),
			redactor,
		)
	except (ScriptError, RefusedPath, ManifestUnreadable, OSError) as error:
		print(f"error: {redactor.redact(str(error))}", file=sys.stderr)
		return EXIT_REFUSED

	if args.report:
		write_json(args.report, report.to_json())

	for line in report.errors:
		print(f"error: {line}", file=sys.stderr)
	if not report.deck_written:
		print(
			f"error: {report.failed} segment(s) could not be produced; "
			"the manifest records each one and no deck was written",
			file=sys.stderr,
		)
		return EXIT_INCOMPLETE

	print(
		f"{script.lesson_id}: {report.generated} generated, {report.reused} reused, "
		f"{report.synth_calls} synthesis call(s)"
	)
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
