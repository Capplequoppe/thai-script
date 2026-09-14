"""JSON written the way this repository's formatter already writes JSON.

Every artifact this pipeline commits sits under a path `biome check` covers, so
the generator has to emit what biome would emit. Otherwise the two fight: the
generator writes a file, biome rewrites it, and the next generation run undoes
biome — an artifact that is never simultaneously reproducible and clean.

Biome's JSON printing is prettier's. Objects keep the line break the printer
found after `{`, and this writer always breaks, so objects stay expanded and
need no width rule. Arrays do not: an array of scalars is collapsed onto one
line when the whole line fits the print width. That single rule is reproduced
below, measured the way biome measures it — a tab counts as `indentWidth`
columns, and the key and the trailing comma are part of the line.

An array of *objects* narrow enough to collapse would still differ; biome would
inline it and this writer would not. No deck produces one today, and the gate
would catch it if one ever did, so the rule is kept to the case that occurs
rather than reimplementing a formatter.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

#: biome.json sets neither, so both are biome's defaults.
LINE_WIDTH = 80
INDENT_WIDTH = 2


def dumps(value: Any) -> str:
	return _render(value, 0, 0, trailing=0) + "\n"


def write(path: Path, value: Any) -> None:
	path.parent.mkdir(parents=True, exist_ok=True)
	path.write_text(dumps(value), encoding="utf-8")


def _scalar(value: Any) -> str:
	return json.dumps(value, ensure_ascii=False)


def _render(value: Any, depth: int, prefix: int, trailing: int) -> str:
	"""`prefix` is what already sits on this line before the value (the key and
	its colon); `trailing` is what follows it (a comma, or nothing at the end of
	a block)."""
	pad = "\t" * depth
	if isinstance(value, dict):
		if not value:
			return "{}"
		items = list(value.items())
		lines = [
			f"{pad}\t{_scalar(key)}: "
			+ _render(
				item,
				depth + 1,
				len(_scalar(key)) + 2,
				0 if index == len(items) - 1 else 1,
			)
			for index, (key, item) in enumerate(items)
		]
		return "{\n" + ",\n".join(lines) + "\n" + pad + "}"

	if isinstance(value, list):
		if not value:
			return "[]"
		if all(not isinstance(item, (dict, list)) for item in value):
			inline = "[" + ", ".join(_scalar(item) for item in value) + "]"
			if depth * INDENT_WIDTH + prefix + len(inline) + trailing <= LINE_WIDTH:
				return inline
		lines = [
			pad + "\t" + _render(item, depth + 1, 0, 0 if index == len(value) - 1 else 1)
			for index, item in enumerate(value)
		]
		return "[\n" + ",\n".join(lines) + "\n" + pad + "]"

	return _scalar(value)
