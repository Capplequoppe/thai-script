"""Every clip a lesson script asks for exists in the deck that shipped.

A lesson has two halves that can drift apart silently. The script in
`content/lessons/` is what a person edits; the deck in `public/lessons/` is
what a learner hears. Change a narration line and forget to rebuild, and the
app goes on playing the old clip — correct-sounding, confidently wrong, and
invisible until somebody listens to that one slide.

`lesson01Deck.test.ts` guards a weaker version of this: it compares the
script's slide ids against the deck's. That catches an added or removed
slide and misses every edit inside one, which is the common case. It also
covers lesson 1 alone.

The check here is the real one, and it belongs in Python because Python owns
the hashing. `segment_input_hash` is what the pipeline keys a clip by — the
text, the language, the voice — so the question "was this rebuilt?" is
exactly "is this segment's hash in the manifest?". No audio is loaded and no
model runs; it is a set comparison over files already on disk.

A lesson with no deck yet is skipped rather than failed. Scripts are written
before they are rendered, deliberately, so that a person can read one through
and change their mind while changing it is still free.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from lesson_deck.pipeline import segment_input_hash  # noqa: E402
from lesson_deck.script_parser import parse_script  # noqa: E402
from lesson_deck.vendor import VoiceSpec  # noqa: E402

# Every script, not just the ones named "lesson-*": `orientation.md` does not
# carry that prefix, so for as long as this globbed for it the first deck a
# learner ever sees was the one deck whose freshness nothing checked.
SCRIPTS = sorted((REPO_ROOT / "content" / "lessons").glob("*.md"))
DECKS = REPO_ROOT / "public" / "lessons"


def _manifest_hashes(lesson_id: str) -> set[str] | None:
	path = DECKS / lesson_id / "manifest.json"
	if not path.is_file():
		return None
	manifest = json.loads(path.read_text(encoding="utf-8"))
	# `state` matters as much as presence. A failed clip is still recorded —
	# that is how the manifest reports what went wrong — so a check that asks
	# only "is this hash here?" passes a build that produced no deck at all.
	# This one was written that way and said all twenty lessons were fresh
	# while lesson 4 had two clips it could not synthesise.
	return {
		asset["inputHash"]
		for asset in manifest["assets"]
		if asset["kind"] == "audio" and asset.get("state") != "failed"
	}


@pytest.mark.parametrize("script_path", SCRIPTS, ids=lambda p: p.stem)
def test_every_clip_the_script_asks_for_was_rendered(script_path: Path) -> None:
	script = parse_script(script_path)
	shipped = _manifest_hashes(script.lesson_id)
	if shipped is None:
		pytest.skip(f"{script.lesson_id} has no deck yet")

	spec = VoiceSpec()
	missing = [
		segment
		for segment in script.segments
		if segment_input_hash(segment, spec) not in shipped
	]
	if not (DECKS / script.lesson_id / "deck.json").is_file():
		pytest.fail(
			f"{script.lesson_id}: a manifest exists but no deck was written, "
			"which is what the pipeline does when a clip could not be produced"
		)

	# The text is quoted because the hash alone says nothing a person can act
	# on, and the thing that has gone stale is always a line someone edited.
	assert not missing, "\n".join(
		[
			f"{script.lesson_id}: {len(missing)} clip(s) in the script are not in "
			"the deck — rebuild it with generate-lesson-deck.py",
			*(f"  [{s.language}] {s.text[:70]}" for s in missing[:5]),
		]
	)
