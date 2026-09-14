"""The lesson-id charset, and the containment check at the write boundary.

Two of this plan's controls live here. `src/domain/script/data/lessonSequence.ts`
owns the charset for the application; this is the same closed charset enforced
at the one point in the *generator* where a filesystem path is derived from an
id, because a path derived from data is where a traversal lands.

Containment is checked on the resolved real path, not on the string: `..`
removed textually still leaves a symlink, and a path assembled from an
attacker-shaped filename that never escapes textually can still escape once
the filesystem resolves it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

# The same expression as `LESSON_ID_PATTERN` in lessonSequence.ts. A lesson id
# is simultaneously a URL segment, a directory name and a lookup key, so the
# charset is closed rather than merely conventional.
LESSON_ID_PATTERN = re.compile(r"^[a-z0-9-]{1,64}$")

# Public URL root the browser fetches lesson assets from. Includes the app's
# deploy base path (`vite.config.ts`'s `base: "/thai-script/"`) — every other
# asset URL in this codebase (`symbols.ts`'s `videoUrl`/`audioUrl` fields) is
# hardcoded the same way, and a root that omits it 404s once the app is
# actually served under that base, dev included. Mirrors `LESSON_ASSET_ROOT`
# in `src/domain/script/data/lessonContent.ts`.
LESSON_ASSET_URL_ROOT = "/thai-script/lessons"


class RefusedPath(ValueError):
	"""A lesson id or an asset path that will not be written.

	The message names the *key* and never echoes the rejected value: a refused
	id is by definition attacker-shaped, and this text reaches stderr, the run
	report and, through them, a reviewer's terminal.
	"""


def parse_lesson_id(value: object, key: str = "lessonId") -> str:
	if not isinstance(value, str):
		raise RefusedPath(f"{key}: expected a string lesson id")
	if LESSON_ID_PATTERN.match(value) is None:
		raise RefusedPath(
			f"{key}: not a lesson id (must match {LESSON_ID_PATTERN.pattern})"
		)
	return value


@dataclass(frozen=True)
class LessonPaths:
	"""Where one lesson's assets live, and the only way to name a file there.

	`root` is resolved once at construction. Every path the pipeline writes or
	records goes through `resolve`, so there is a single place to audit rather
	than one per call site.
	"""

	lesson_id: str
	root: Path

	@classmethod
	def under(cls, assets_root: Path, lesson_id: object) -> "LessonPaths":
		parsed = parse_lesson_id(lesson_id)
		return cls(parsed, (assets_root / parsed).resolve())

	def resolve(self, relative: str, key: str = "assetPath") -> Path:
		"""An absolute path for a lesson-relative asset path, or a refusal.

		Rejects absolute paths, drive-qualified paths and anything that leaves
		the lesson directory once the filesystem has resolved it.
		"""
		if not isinstance(relative, str) or not relative:
			raise RefusedPath(f"{key}: expected a non-empty relative asset path")
		candidate = Path(relative)
		if candidate.is_absolute() or candidate.drive or candidate.root:
			raise RefusedPath(f"{key}: must be relative to the lesson directory")
		# `resolve` follows symlinks and tolerates a missing leaf, which is what
		# an output path needs: the file does not exist yet, but every directory
		# above it that does must be followed before containment is judged.
		resolved = (self.root / candidate).resolve()
		if resolved != self.root and not _is_within(resolved, self.root):
			raise RefusedPath(
				f"{key}: resolves outside public/lessons/{self.lesson_id}/"
			)
		return resolved

	def url(self, relative: str, key: str = "assetPath") -> str:
		"""The site-absolute URL for an asset, checked for containment first."""
		self.resolve(relative, key)
		posix = Path(relative).as_posix()
		return f"{LESSON_ASSET_URL_ROOT}/{self.lesson_id}/{posix}"


def _is_within(candidate: Path, root: Path) -> bool:
	return root in candidate.parents
