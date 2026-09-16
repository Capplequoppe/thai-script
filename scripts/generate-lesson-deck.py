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
	LocalTranscriber,
	MissingCredential,
	S2ProEnglishVoice,
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
	return parser


def main(argv: list[str] | None = None) -> int:
	args = build_parser().parse_args(argv)

	# The credential is checked before anything else runs, so a machine with no
	# key fails naming the key rather than naming whatever it reached next.
	try:
		api_key = load_api_key()
	except MissingCredential as error:
		print(f"error: {error}", file=sys.stderr)
		return EXIT_NO_CREDENTIAL

	redactor = Redactor((api_key,))
	try:
		script = parse_script(args.script)
		report = generate(
			script,
			args.assets_root,
			SplitVendor(
				thai=ElevenLabsVendor(api_key, redactor),
				english=S2ProEnglishVoice(),
				transcriber=LocalTranscriber(),
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
