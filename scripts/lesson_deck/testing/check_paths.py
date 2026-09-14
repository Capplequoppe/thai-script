#!/usr/bin/env python3
"""Ask the containment control about paths, and print what it said.

    echo '[{"lessonId":"lesson-02","assetPath":"../escape.mp3"}]' \
        | python3 scripts/lesson_deck/testing/check_paths.py --assets-root /tmp/x

The control itself is `LessonPaths` in `lesson_deck/ids.py`, and it is the one
place the generator turns a lesson id and an asset path into a file to write.
The lesson scripts cannot currently express a traversing path — the slide-id
and lesson-id charsets both forbid it — which is exactly why the control needs
reaching directly: a check that only ever sees inputs another check has already
made safe is not evidence that it works.

Stdin is a JSON array of `{lessonId, assetPath}`; stdout is a JSON array of
`{"ok": true, "path", "url"}` or `{"ok": false, "error"}`, in the same order.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lesson_deck.ids import LessonPaths, RefusedPath  # noqa: E402
from lesson_deck.jsonio import dumps  # noqa: E402


def main(argv: list[str] | None = None) -> int:
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("--assets-root", type=Path, required=True)
	args = parser.parse_args(argv)

	results = []
	for case in json.loads(sys.stdin.read()):
		try:
			paths = LessonPaths.under(args.assets_root, case.get("lessonId"))
			relative = case.get("assetPath")
			results.append(
				{
					"ok": True,
					"path": str(paths.resolve(relative)),
					"url": paths.url(relative),
				}
			)
		except RefusedPath as error:
			results.append({"ok": False, "error": str(error)})

	print(dumps(results), end="")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
