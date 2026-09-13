#!/usr/bin/env python3
"""Build the salted n-gram hash corpus the originality gate checks against.

The transcripts under `src/Thai Alphabet/` are copyrighted. Facts about the
Thai writing system are free to reuse; the source's *phrasing*, its mnemonic
images and its curated examples are not. Every content task in this plan has
to show that what it wrote is not a paraphrase of that material, and the only
way to show it mechanically is to compare against the source.

**So the committed artifact is salted hashes, never text.** A gate built on an
extracted-text corpus would make the gate itself the largest reproduction of
the licensed material in the repository — it would store the very thing it
exists to keep out. This script therefore emits, for each overlapping window
of `--ngram-width` tokens found in the sources, one truncated salted SHA-256
digest and a bitmask saying which PDF set it came from. Nothing else. The
artifact is a membership oracle: you can ask it "have I written this exact
five-word run?" and it answers, and you cannot read anything out of it.

The consumer is `src/domain/script/data/originality.ts`, which reproduces the
normalisation and hashing below **exactly**. The two implementations are held
in agreement by the canary: `originality.test.ts` feeds a phrase known to be
verbatim in each PDF set through the TypeScript side and requires this script's
output to contain it. If tokenisation, Unicode normalisation, the salt or the
digest were to drift apart between the two languages, that test goes red — it
is not merely a check that the corpus is non-empty.

## The two PDF sets, and why both

`--source-dir` holds two families, and the gate needs both:

  * `TAME_L<n>_tpod101_recordingscript.pdf` — what the narrator says.
  * `TAME_L<n>_tpod101.pdf` — the written lesson notes.

The lesson notes are not optional. The mnemonic shipped for ฌ paraphrases a
lesson-notes paragraph and appears nowhere in the recording scripts, so a
corpus built from transcripts alone would clear it. Anything else in the
directory (the practice worksheet) is tagged `worksheet` and included, but the
two named sets are the ones the gate requires to be present.

## n = 5, and why not 8

Measured against the 82 mnemonic strings shipped in `symbols.ts`, which
CONTEXT.md establishes are close paraphrases of this source and are therefore
the only labelled positives available: an 8-token window detects 17 of them, a
5-token window detects 48. A gate that misses four fifths of its known
positives is decoration. The width is a flag here and a single exported
constant on the TypeScript side, so it is changed in one place and measured
again rather than argued about.

## The salt

The salt is committed alongside the hashes, because the check has to be able
to reproduce them. It is not a secret and does not pretend to be: its job is
to keep these digests from being probed with a precomputed table built from
some other corpus. It is also **stable across rebuilds** — a fresh salt would
rewrite every one of the ~27,000 entries on every run and turn each rebuild
into an unreviewable diff. Re-running this script against an existing artifact
reuses that artifact's salt unless `--rotate-salt` is passed.

## Text extraction

`pdftotext` (poppler) rather than a Python PDF package: the repository pins no
PDF dependency, the binary is already present on the machines that build this,
and shelling out keeps `scripts/requirements.txt` — which this task does not
own — untouched. The script fails loudly if the binary is missing.

Usage:

    python3 scripts/build-originality-corpus.py
    python3 scripts/build-originality-corpus.py --source-dir path/to/pdfs
    python3 scripts/build-originality-corpus.py --rotate-salt

The PDFs are gitignored (`*/Thai Alphabet/**`), so they are present in a full
checkout and absent from a bare worktree; `--source-dir` exists for that case.
"""

from __future__ import annotations

import argparse
import json
import re
import secrets
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE_DIR = REPO_ROOT / "src" / "Thai Alphabet"
DEFAULT_OUTPUT = REPO_ROOT / "src" / "domain" / "script" / "data" / "originality-corpus.json"

ARTIFACT_VERSION = 1

# The width, in tokens, of one comparison window. See the module docstring for
# the measurement behind 5. The TypeScript side asserts the artifact's declared
# width equals its own single `NGRAM_WIDTH` constant, so the two cannot drift.
DEFAULT_NGRAM_WIDTH = 5

# Truncation of the SHA-256 hex digest. 16 hex characters is 64 bits: across
# ~27,000 n-grams the chance of any collision is on the order of 1e-11, while
# a full digest would triple the artifact for no reachable benefit.
DIGEST_HEX_CHARS = 16

# Bit flags, OR-ed together when the same window occurs in more than one set.
# Deliberately not an enum in the JSON: an integer keeps the artifact small,
# and `originality.ts` decodes it back into source names.
SOURCE_FLAGS = {"lesson-notes": 1, "recording-script": 2, "worksheet": 4}

# The two sets the gate is not allowed to be missing. A build that produced no
# tokens for either of these is a broken build, not a small corpus.
REQUIRED_SOURCES = ("lesson-notes", "recording-script")

# Characters that may appear inside a token: ASCII alphanumerics, the Latin-1
# and Latin-Extended ranges plus combining diacritics (the romanisation writes
# "mǎa", "thâo-rài"), and the whole Thai block including its vowel signs and
# tone marks, which are combining characters that `\w` would drop.
#
# The ranges are spelled out rather than written as `\w` on purpose. `\w` and
# `\p{L}` do not classify combining marks identically across Python and
# JavaScript, and this expression has to produce byte-identical tokens in both
# or every hash disagrees. `originality.ts` carries the same literal.
TOKEN_PATTERN = re.compile(
	r"[0-9a-z\u00c0-\u024f\u0300-\u036f\u0e00-\u0e7f]+"
)


def source_tag(pdf: Path) -> str:
	"""Which of the two licensed sets — or neither — this file belongs to."""
	name = pdf.name
	if name.endswith("_recordingscript.pdf"):
		return "recording-script"
	if name.startswith("TAME_L"):
		return "lesson-notes"
	return "worksheet"


def extract_text(pdf: Path) -> str:
	"""Plain text of one PDF, via poppler's `pdftotext`."""
	result = subprocess.run(
		["pdftotext", "-layout", "-enc", "UTF-8", str(pdf), "-"],
		capture_output=True,
		text=True,
		check=False,
	)
	if result.returncode != 0:
		raise SystemExit(
			f"pdftotext failed on {pdf.name} (exit {result.returncode}): "
			f"{result.stderr.strip()}"
		)
	return result.stdout


def tokenize(text: str) -> list[str]:
	"""Text to comparison tokens. Mirrored character-for-character in TypeScript.

	NFC first, so that a precomposed "á" and a decomposed "a" + U+0301 hash to
	the same thing — the PDFs are not consistent about which they use, and the
	prose being checked against them is typed by hand.
	"""
	return TOKEN_PATTERN.findall(unicodedata.normalize("NFC", text).lower())


def ngrams(tokens: list[str], width: int) -> list[str]:
	"""Every overlapping window of `width` tokens, space-joined."""
	return [
		" ".join(tokens[i : i + width]) for i in range(len(tokens) - width + 1)
	]


def hash_ngram(salt: str, ngram: str) -> str:
	"""Salted, truncated digest of one window. Mirrored in TypeScript.

	U+001F (unit separator) between salt and payload because it cannot occur in
	a token, so no salt/ngram pair can be confused with another.
	"""
	import hashlib

	digest = hashlib.sha256(f"{salt}\x1f{ngram}".encode("utf-8")).hexdigest()
	return digest[:DIGEST_HEX_CHARS]


def existing_salt(output: Path) -> str | None:
	"""The salt of a previously built artifact, so rebuilds stay reviewable."""
	if not output.exists():
		return None
	try:
		return json.loads(output.read_text(encoding="utf-8")).get("salt")
	except (json.JSONDecodeError, OSError):
		return None


def build(source_dir: Path, width: int, salt: str) -> dict:
	pdfs = sorted(source_dir.glob("*.pdf"))
	if not pdfs:
		raise SystemExit(
			f"no PDFs under {source_dir}. The licensed sources are gitignored "
			f"(`*/Thai Alphabet/**`), so a bare worktree does not have them; "
			f"pass --source-dir pointing at a full checkout."
		)

	# hash -> OR-ed source flags. Insertion order is the sorted-filename order
	# above, which makes the emitted JSON deterministic for a fixed input set.
	entries: dict[str, int] = {}
	token_counts: dict[str, int] = {}
	document_counts: dict[str, int] = {}

	for pdf in pdfs:
		tag = source_tag(pdf)
		flag = SOURCE_FLAGS[tag]
		tokens = tokenize(extract_text(pdf))
		token_counts[tag] = token_counts.get(tag, 0) + len(tokens)
		document_counts[tag] = document_counts.get(tag, 0) + 1
		for ngram in ngrams(tokens, width):
			key = hash_ngram(salt, ngram)
			entries[key] = entries.get(key, 0) | flag

	missing = [
		tag for tag in REQUIRED_SOURCES if token_counts.get(tag, 0) == 0
	]
	if missing:
		raise SystemExit(
			f"no text extracted for required source set(s): {', '.join(missing)}. "
			f"Both the recording scripts and the lesson notes must be present — "
			f"the shipped ฌ mnemonic paraphrases the notes and nothing else."
		)

	return {
		"version": ARTIFACT_VERSION,
		"ngramWidth": width,
		"hashAlgorithm": "sha256-hex-truncated",
		"digestHexChars": DIGEST_HEX_CHARS,
		"salt": salt,
		"sourceFlags": SOURCE_FLAGS,
		"sources": {
			tag: {
				"documents": document_counts[tag],
				"tokens": token_counts[tag],
			}
			for tag in sorted(document_counts)
		},
		"tokenCount": sum(token_counts.values()),
		"ngramCount": len(entries),
		"ngrams": entries,
	}


def main(argv: list[str] | None = None) -> int:
	parser = argparse.ArgumentParser(
		description="Build the salted n-gram originality corpus.",
	)
	parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
	parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
	parser.add_argument("--ngram-width", type=int, default=DEFAULT_NGRAM_WIDTH)
	parser.add_argument(
		"--rotate-salt",
		action="store_true",
		help="Discard the existing artifact's salt and generate a fresh one. "
		"Rewrites every entry.",
	)
	args = parser.parse_args(argv)

	if shutil.which("pdftotext") is None:
		raise SystemExit(
			"pdftotext not found. Install poppler-utils; this script shells out "
			"to it rather than pinning a Python PDF dependency."
		)

	salt = None if args.rotate_salt else existing_salt(args.output)
	if salt is None:
		salt = secrets.token_hex(16)

	artifact = build(args.source_dir, args.ngram_width, salt)
	args.output.parent.mkdir(parents=True, exist_ok=True)
	args.output.write_text(
		json.dumps(artifact, ensure_ascii=True, sort_keys=False) + "\n",
		encoding="utf-8",
	)

	print(
		f"wrote {args.output.relative_to(REPO_ROOT)}: "
		f"{artifact['ngramCount']} n-grams of width {artifact['ngramWidth']} "
		f"from {artifact['tokenCount']} tokens",
		file=sys.stderr,
	)
	for tag, stats in artifact["sources"].items():
		print(
			f"  {tag}: {stats['documents']} documents, {stats['tokens']} tokens",
			file=sys.stderr,
		)
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
