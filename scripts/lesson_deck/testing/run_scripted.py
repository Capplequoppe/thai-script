#!/usr/bin/env python3
"""Drive the real pipeline against a scripted vendor, and print what happened.

    python3 scripts/lesson_deck/testing/run_scripted.py \
        --scenario scripts/lesson_deck/fixtures/clean.json \
        --assets-root /tmp/out

This is how `src/domain/script/data/generatedDeck.test.ts` reaches the retry
state machine, the cache and the three manifest states: vitest spawns this,
reads the JSON on stdout, and asserts over it. The *evidence* lands in the
runner the repository already uses, and the pipeline keeps no test branch of
its own — everything below is the same `generate()` the CLI calls, with one
argument different.

Stdout is a single JSON object: the run report, plus the calls the vendor was
asked to make. Stdout carries nothing else, so the caller can parse it whole.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lesson_deck.ids import RefusedPath  # noqa: E402
from lesson_deck.jsonio import dumps  # noqa: E402
from lesson_deck.manifest import ManifestUnreadable  # noqa: E402
from lesson_deck.pipeline import generate  # noqa: E402
from lesson_deck.script_parser import ScriptError, parse_script  # noqa: E402
from lesson_deck.testing.scripted_vendor import from_scenario  # noqa: E402
from lesson_deck.vendor import Redactor, VoiceSpec, load_api_key  # noqa: E402


def main(argv: list[str] | None = None) -> int:
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("--scenario", type=Path, required=True)
	parser.add_argument("--assets-root", type=Path, required=True)
	parser.add_argument(
		"--script",
		type=Path,
		help="override the scenario's script, to exercise an edited lesson",
	)
	args = parser.parse_args(argv)

	scenario = json.loads(args.scenario.read_text(encoding="utf-8"))
	api_key = load_api_key()
	redactor = Redactor((api_key,))
	script_path = args.script or (args.scenario.parent / scenario["script"])

	try:
		report = generate(
			parse_script(script_path),
			args.assets_root,
			from_scenario(scenario, api_key),
			VoiceSpec(),
			redactor,
		)
	except (ScriptError, RefusedPath, ManifestUnreadable, OSError) as error:
		print(dumps({"refused": redactor.redact(str(error))}), end="")
		return 3

	print(dumps(report.to_json()), end="")
	return 0 if report.deck_written else 4


if __name__ == "__main__":
	raise SystemExit(main())
