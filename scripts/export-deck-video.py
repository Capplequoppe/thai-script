#!/usr/bin/env python3
"""Render a lesson's own deck to a single video file.

    python3 scripts/export-deck-video.py lesson-01

A deck already holds everything a video needs: ordered slides, an image per
slide and narration audio per segment. This script assembles them with
`ffmpeg`; it authors nothing. The deck stays the editable master — a typo is
fixed in the deck and re-exported here, never patched in the rendered file.

**Staleness is a recorded state, not a timestamp comparison.** Every export
writes `video-manifest.json` recording a hash of the deck plus the content
hashes of the assets it drew on (`manifest.json`'s own cache keys, so an
edited clip is caught even when the deck text is unchanged). A later run
recomputes that hash and compares — a checkout or a copy changes
modification times for reasons that have nothing to do with content, and a
video re-rendered on every one of those would be needless. A lesson is always
in exactly one of three states, `not-exported` / `current` / `stale`: there
is no timestamp path that lets `stale` collapse into looking `absent`.

**Every path this script reads or writes is resolved through `LessonPaths`**
(`lesson_deck/ids.py`), the same charset and containment check the generator
uses at its own write boundary — a deck's `image`/`audio` fields are
hand-editable, so a traversal segment in one is refused before anything is
read or written, not merely before the final output is placed.

Exit codes: 0 success (rendered or a no-op on an already-current export),
3 a lesson id or asset path was refused, 4 the export could not be produced
(missing input, or `ffmpeg` failed).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lesson_deck.ids import LessonPaths, RefusedPath  # noqa: E402
from lesson_deck.jsonio import write as write_json  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ASSETS_ROOT = REPO_ROOT / "public" / "lessons"

EXPORT_MANIFEST_NAME = "video-manifest.json"
EXPORT_MANIFEST_VERSION = 1
OUTPUT_DIR = "video"
OUTPUT_FILE = "lesson.mp4"

#: A lesson is in exactly one of these. Order matches the progression a lesson
#: walks through, never the alphabet, so a reader scanning the tuple reads the
#: lifecycle.
EXPORT_STATES: tuple[str, ...] = ("not-exported", "current", "stale")

#: How long a slide with no narration is held. Only reached by a lesson script
#: with zero `narration:` lines for a given slide — the deck pipeline still
#: produces those (see `lesson_deck` fixtures), so the exporter has to cope.
MIN_SLIDE_SECONDS = 2.0

EXIT_REFUSED = 3
EXIT_FAILED = 4


class ExportFailed(RuntimeError):
	"""An input was missing, unreadable, or `ffmpeg` refused to produce it."""


def _read_json(path: Path) -> dict[str, Any]:
	try:
		raw = path.read_text(encoding="utf-8")
	except OSError as error:
		raise ExportFailed(f"{path.name}: could not be read ({error.strerror})") from error
	try:
		parsed = json.loads(raw)
	except json.JSONDecodeError as error:
		raise ExportFailed(f"{path.name}: not valid JSON ({error.msg})") from error
	if not isinstance(parsed, dict):
		raise ExportFailed(f"{path.name}: expected a JSON object")
	return parsed


def _read_json_if_present(path: Path, default: Any) -> Any:
	if not path.exists():
		return default
	return _read_json(path)


def _canonical(value: Any) -> str:
	return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def compute_deck_hash(deck: dict[str, Any], asset_manifest: dict[str, Any]) -> str:
	"""A hash over the deck's own content plus every generated asset's content
	hash, keyed by the manifest's asset key.

	Keying on `manifest.json`'s recorded `contentHash` — not on file bytes read
	fresh here — means an asset the *generator* regenerated is caught through
	the same cache key it was produced under, and a deck whose slide text
	changed is caught even when no asset moved at all.
	"""
	assets = asset_manifest.get("assets")
	asset_hashes = {
		asset["key"]: asset.get("contentHash")
		for asset in (assets if isinstance(assets, list) else [])
		if isinstance(asset, dict)
		and asset.get("state") == "generated"
		and isinstance(asset.get("key"), str)
	}
	payload = {"deck": deck, "assetHashes": asset_hashes}
	return hashlib.sha256(_canonical(payload).encode("utf-8")).hexdigest()


def export_state(deck_hash: str, export_manifest: dict[str, Any] | None) -> str:
	"""One of `EXPORT_STATES`, and always one of them — never inferred from a
	missing file read as `stale`, and never a `stale` export read as absent."""
	if export_manifest is None:
		return "not-exported"
	if export_manifest.get("deckHash") == deck_hash:
		return "current"
	return "stale"


def _slide_id(slide: dict[str, Any], index: int) -> str:
	slide_id = slide.get("id")
	if not isinstance(slide_id, str) or not slide_id:
		raise ExportFailed(f"deck.json: slide at index {index} has no id")
	return slide_id


def resolve_slide_assets(
	deck: dict[str, Any], paths: LessonPaths
) -> list[dict[str, Any]]:
	"""One entry per slide, in declared order, with every `image`/`audio` path
	already resolved (and refused, if it escapes the lesson directory) —
	before anything is rendered or written."""
	slides = deck.get("slides")
	if not isinstance(slides, list) or not slides:
		raise ExportFailed("deck.json: no slides")
	resolved: list[dict[str, Any]] = []
	for index, slide in enumerate(slides):
		if not isinstance(slide, dict):
			raise ExportFailed(f"deck.json: slide at index {index} is not an object")
		slide_id = _slide_id(slide, index)
		image_rel = slide.get("image")
		image_path = (
			paths.resolve(image_rel, key=f"slides[{slide_id}].image")
			if isinstance(image_rel, str)
			else None
		)
		audio_rel = slide.get("audio")
		audio_paths = [
			paths.resolve(item, key=f"slides[{slide_id}].audio[{i}]")
			for i, item in enumerate(audio_rel if isinstance(audio_rel, list) else [])
			if isinstance(item, str)
		]
		resolved.append(
			{"slideId": slide_id, "image": image_path, "audio": audio_paths}
		)
	return resolved


def _run_ffmpeg(args: list[str]) -> None:
	result = subprocess.run(
		["ffmpeg", "-y", "-loglevel", "error", *args],
		capture_output=True,
		text=True,
	)
	if result.returncode != 0:
		raise ExportFailed(f"ffmpeg failed: {result.stderr.strip()[-2000:]}")


def _probe_duration(path: Path) -> float:
	result = subprocess.run(
		[
			"ffprobe",
			"-v",
			"error",
			"-show_entries",
			"format=duration",
			"-of",
			"json",
			str(path),
		],
		capture_output=True,
		text=True,
	)
	if result.returncode != 0:
		raise ExportFailed(f"ffprobe failed: {result.stderr.strip()[-2000:]}")
	try:
		return float(json.loads(result.stdout)["format"]["duration"])
	except (KeyError, ValueError, json.JSONDecodeError) as error:
		raise ExportFailed(f"ffprobe: could not read a duration ({error})") from error


def _slide_audio_track(audio_paths: list[Path], dest: Path) -> None:
	"""Every clip a slide names, concatenated into one track at `dest`. A
	slide with no narration gets a fixed span of silence instead, so a script
	with zero `narration:` lines still exports (task 3.2's lesson — a script
	is authored before it is voiced)."""
	if not audio_paths:
		_run_ffmpeg(
			[
				"-f",
				"lavfi",
				"-i",
				"anullsrc=channel_layout=mono:sample_rate=44100",
				"-t",
				str(MIN_SLIDE_SECONDS),
				"-c:a",
				"aac",
				str(dest),
			]
		)
		return
	inputs: list[str] = []
	filter_taps: list[str] = []
	for index, clip in enumerate(audio_paths):
		inputs += ["-i", str(clip)]
		filter_taps.append(f"[{index}:a]")
	filter_complex = "".join(filter_taps) + f"concat=n={len(audio_paths)}:v=0:a=1[out]"
	_run_ffmpeg(
		[*inputs, "-filter_complex", filter_complex, "-map", "[out]", "-c:a", "aac", str(dest)]
	)


def _render_slide_clip(image: Path, audio: Path, dest: Path) -> None:
	_run_ffmpeg(
		[
			"-loop",
			"1",
			"-i",
			str(image),
			"-i",
			str(audio),
			"-c:v",
			"libx264",
			"-tune",
			"stillimage",
			"-pix_fmt",
			"yuv420p",
			"-r",
			"25",
			"-c:a",
			"aac",
			"-shortest",
			str(dest),
		]
	)


def _concat_clips(clips: list[Path], dest: Path, workdir: Path) -> None:
	listfile = workdir / "concat.txt"
	listfile.write_text(
		"".join(f"file '{clip.as_posix()}'\n" for clip in clips), encoding="utf-8"
	)
	_run_ffmpeg(["-f", "concat", "-safe", "0", "-i", str(listfile), "-c", "copy", str(dest)])


def _render(
	slide_assets: list[dict[str, Any]], output_path: Path, workdir: Path
) -> list[dict[str, Any]]:
	"""Renders one clip per slide, then concatenates them in declared order.
	Returns the per-slide segment records the export manifest names."""
	segments: list[dict[str, Any]] = []
	slide_clips: list[Path] = []
	for index, slide in enumerate(slide_assets):
		image = slide["image"] or _blank_frame(workdir)
		track = workdir / f"slide-{index:03d}-audio.m4a"
		_slide_audio_track(slide["audio"], track)
		clip = workdir / f"slide-{index:03d}.mp4"
		_render_slide_clip(image, track, clip)
		slide_clips.append(clip)
		segments.append(
			{
				"slideId": slide["slideId"],
				"durationSeconds": round(_probe_duration(clip), 3),
			}
		)
	output_path.parent.mkdir(parents=True, exist_ok=True)
	_concat_clips(slide_clips, output_path, workdir)
	return segments


def _blank_frame(workdir: Path) -> Path:
	"""A slide with no `image` still holds the screen for its own duration —
	a plain frame rather than skipping the slide, which would desync the
	segment list from the deck's own slide order (AC1)."""
	frame = workdir / "blank.png"
	if not frame.exists():
		_run_ffmpeg(
			[
				"-f",
				"lavfi",
				"-i",
				"color=c=black:s=640x360",
				"-frames:v",
				"1",
				str(frame),
			]
		)
	return frame


def build_export_manifest(
	lesson_id: str,
	deck_hash: str,
	segments: list[dict[str, Any]],
	output_file: str,
	output_url: str,
) -> dict[str, Any]:
	return {
		"lessonId": lesson_id,
		"schema": {"version": EXPORT_MANIFEST_VERSION, "states": list(EXPORT_STATES)},
		"deckHash": deck_hash,
		"segments": segments,
		"output": {"file": output_file, "path": output_url},
	}


def export(
	lesson_id: str, assets_root: Path, *, state_only: bool = False
) -> dict[str, Any]:
	paths = LessonPaths.under(assets_root, lesson_id)
	deck = _read_json(paths.resolve("deck.json"))
	asset_manifest = _read_json_if_present(paths.resolve("manifest.json"), {"assets": []})

	# Always resolved, in both modes: a traversal segment is refused before a
	# state is even reported, not only when a render is about to happen.
	slide_assets = resolve_slide_assets(deck, paths)

	deck_hash = compute_deck_hash(deck, asset_manifest)
	export_manifest_path = paths.resolve(EXPORT_MANIFEST_NAME)
	existing = _read_json_if_present(export_manifest_path, None)
	state = export_state(deck_hash, existing)

	if state_only:
		return {"lessonId": lesson_id, "state": state, "deckHash": deck_hash}

	if state == "current":
		return {
			"lessonId": lesson_id,
			"state": state,
			"deckHash": deck_hash,
			"rendered": False,
			"output": existing["output"],
		}

	output_rel = f"{OUTPUT_DIR}/{OUTPUT_FILE}"
	output_path = paths.resolve(output_rel)

	with tempfile.TemporaryDirectory(prefix="deck-video-") as raw_workdir:
		segments = _render(slide_assets, output_path, Path(raw_workdir))

	manifest = build_export_manifest(
		lesson_id, deck_hash, segments, output_rel, paths.url(output_rel)
	)
	write_json(export_manifest_path, manifest)
	return {
		"lessonId": lesson_id,
		"state": "current",
		"deckHash": deck_hash,
		"rendered": True,
		"output": manifest["output"],
	}


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("lesson_id", help="the lesson id, e.g. lesson-01")
	parser.add_argument(
		"--assets-root",
		type=Path,
		default=DEFAULT_ASSETS_ROOT,
		help="directory holding one folder per lesson (default: public/lessons)",
	)
	parser.add_argument(
		"--state",
		action="store_true",
		help="report the export state only; renders nothing",
	)
	parser.add_argument("--report", type=Path, help="write the result here as JSON")
	return parser


def main(argv: list[str] | None = None) -> int:
	args = build_parser().parse_args(argv)
	try:
		result = export(args.lesson_id, args.assets_root, state_only=args.state)
	except RefusedPath as error:
		print(f"error: {error}", file=sys.stderr)
		return EXIT_REFUSED
	except ExportFailed as error:
		print(f"error: {error}", file=sys.stderr)
		return EXIT_FAILED

	print(json.dumps(result))
	if args.report:
		write_json(args.report, result)
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
