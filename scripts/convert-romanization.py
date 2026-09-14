#!/usr/bin/env python3
"""Classify and convert `vocabulary.json` romanizations from IPA to Paiboon.

    python3 scripts/convert-romanization.py

The corpus is not uniformly IPA — measured: roughly 3,447 entries are IPA,
819 already Paiboon, 795 mixed, and 393 neither. This script classifies every
entry first and converts *only* the entries it classifies as IPA. Entries
already in Paiboon, mixed, or unclassifiable are never touched.

IPA stays canonical. On a successful conversion the original IPA value moves
to a new `ipa` field and `romanization` becomes the Paiboon spelling — the
field the rest of the app already reads for display. An entry the converter
cannot parse is left exactly as it was and reported by rank and Thai form; it
never reads as an absent or emptied romanization.

Re-running is idempotent: an entry that already carries an `ipa` field, or
whose `romanization` no longer classifies as IPA, is left alone.
"""

from __future__ import annotations

import json
import sys
import unicodedata
from pathlib import Path
from typing import Literal

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CORPUS = REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"

NotationClass = Literal["ipa", "paiboon", "mixed", "neither"]

TONE_MARKS = {
	"̀": "low",  # grave
	"́": "high",  # acute
	"̂": "falling",  # circumflex
	"̌": "rising",  # caron
}
TONE_TO_MARK = {v: k for k, v in TONE_MARKS.items()}
COMBINING_MARKS = frozenset(TONE_MARKS)

IPA_MARKER_CHARS = frozenset("ʰʔɕŋɯɛɔɤəʉː")
ALLOWED_CHARS = frozenset(
	"abcdefghijklmnopqrstuvwxyz ʰʔɕŋɯɛɔɤəʉː'-"
) | COMBINING_MARKS | frozenset("àáâǎèéêěìíîǐòóôǒùúûǔ")

# Onset-position map: bare unaspirated obstruents get the Paiboon digraph
# that cues non-aspiration; aspirated and voiced/sonorant consonants keep an
# (almost) identical spelling in both notations.
ONSET_MAP = {
	"p": "bp",
	"t": "dt",
	"k": "g",
	"tɕ": "j",
	"pʰ": "ph",
	"tʰ": "th",
	"kʰ": "kh",
	"tɕʰ": "ch",
	"b": "b",
	"d": "d",
	"m": "m",
	"n": "n",
	"ŋ": "ng",
	"ɕ": "ch",
	"s": "s",
	"f": "f",
	"h": "h",
	"r": "r",
	"l": "l",
	"w": "w",
	"j": "y",
	# Already-Paiboon ASCII digraphs pass through unchanged. Bare "h" is
	# never a real second onset consonant in Thai, so a marker-less string
	# spelling one of these is read as the digraph, not as two phonemes.
	"th": "th",
	"ph": "ph",
	"kh": "kh",
	"ch": "ch",
	"bp": "bp",
	"dt": "dt",
}

# Coda-position map. Thai finals are never aspirated, so the stops stay bare;
# the two glides merge into the preceding vowel as an off-glide, which is how
# Paiboon spells a diphthong.
CODA_MAP = {
	"p": "p",
	"t": "t",
	"k": "k",
	"m": "m",
	"n": "n",
	"ŋ": "ng",
	"ng": "ng",
	"j": "i",
	"w": "o",
}

VOWEL_MAP = {
	"a": "a",
	"e": "e",
	"i": "i",
	"o": "o",
	"u": "u",
	"ɛ": "ae",
	"ɔ": "aw",
	"ɤ": "oe",
	"ɯ": "ue",
	"ə": "er",
	"ʉ": "ue",
}
# Long-vowel spelling: doubled letter for the five plain vowels, doubled
# first letter for a digraph (e.g. "ae" -> "aae"), so tone always lands on a
# character that can carry a diacritic.
LONG_VOWEL_MAP = {k: v[0] + v for k, v in VOWEL_MAP.items()}
VOWEL_TOKENS = frozenset(VOWEL_MAP)

# The three centring diphthongs: a glide vowel token followed by "a".
DIPHTHONG_MAP = {
	"u": "ua",
	"i": "ia",
	"ɯ": "uea",
}

# Longest-match-first token list for the bare (tone-stripped) phoneme stream.
# The three-codepoint IPA digraphs and the ASCII Paiboon digraphs (which only
# ever show up in marker-less, already-Paiboon strings) must be tried before
# any single-character fallback, or "th" tokenizes as "t" + "h".
_TOKEN_ORDER = [
	"tɕʰ", "tɕ", "pʰ", "tʰ", "kʰ",
	"th", "ph", "kh", "ch", "bp", "dt", "ng",
	"ɕ", "ŋ", "ɯ", "ɛ", "ɔ", "ɤ", "ə", "ʉ",
]


class ConversionError(ValueError):
	pass


def classify_notation(romanization: str) -> NotationClass:
	"""Classify one romanization string as ipa / paiboon / mixed / neither."""
	s = romanization
	if s == "" or any(ch not in ALLOWED_CHARS for ch in s):
		return "neither"

	has_ipa = any(ch in IPA_MARKER_CHARS for ch in s)
	has_paiboon = (
		"bp" in s
		or "dt" in s
		or _has_standalone_g(s)
		or _has_doubled_vowel(s)
	)

	if has_ipa and has_paiboon:
		return "mixed"
	if has_ipa:
		return "ipa"
	if has_paiboon:
		return "paiboon"

	# No explicit marker either way (e.g. "kàp", "tham", "maa", "hâi", "wáj").
	# Two things differ between the two notations without one of the markers
	# above: a bare, syllable-initial unaspirated p/t/k/tɕ (needs bp/dt/g/j),
	# and a bare, syllable-final j/w diphthong off-glide (Paiboon spells it
	# i/o). Every other bare consonant and vowel spelling coincides.
	if _has_unconverted_onset_stop(s) or _has_unconverted_coda_glide(s):
		return "ipa"
	return "paiboon"


def _has_unconverted_onset_stop(s: str) -> bool:
	"""Is a bare, syllable-initial p/t/k/tɕ present (needs bp/dt/g/j)?

	A syllable boundary is the start of the string or right after a space or
	hyphen. "th"/"ph"/"kh"/"ch" at that position are the aspirated digraph,
	already identical in both notations, and are excluded.
	"""
	boundaries = [0]
	for i, ch in enumerate(s):
		if ch in " -":
			boundaries.append(i + 1)
	for start in boundaries:
		if start >= len(s):
			continue
		ch = s[start]
		if ch in ("p", "t", "k") and s[start : start + 2] not in ("th", "ph", "kh"):
			return True
	return False


def _has_unconverted_coda_glide(s: str) -> bool:
	"""Is a bare, syllable-final j/w diphthong off-glide present (needs i/o)?"""
	boundaries = [len(s)]
	for i, ch in enumerate(s):
		if ch in " -":
			boundaries.append(i)
	for end in boundaries:
		if end <= 0:
			continue
		if s[end - 1] in ("j", "w"):
			return True
	return False


def _has_standalone_g(s: str) -> bool:
	for i, ch in enumerate(s):
		if ch == "g" and (i == 0 or s[i - 1] != "n"):
			return True
	return False


def _has_doubled_vowel(s: str) -> bool:
	for i in range(len(s) - 1):
		if s[i] == s[i + 1] and s[i] in "aeiou":
			return True
	return False


def _tokenize_bare(bare: str) -> list[str]:
	tokens: list[str] = []
	i = 0
	while i < len(bare):
		matched = None
		for candidate in _TOKEN_ORDER:
			if bare.startswith(candidate, i):
				matched = candidate
				break
		if matched is None:
			matched = bare[i]
		tokens.append(matched)
		i += len(matched)
	return tokens


def _strip_tone(token: str) -> tuple[str, str]:
	"""NFD-decompose, pull out the tone diacritic (if any), return (bare, tone)."""
	nfd = unicodedata.normalize("NFD", token)
	tone = "mid"
	bare_chars = []
	for ch in nfd:
		if ch in TONE_MARKS:
			tone = TONE_MARKS[ch]
		else:
			bare_chars.append(ch)
	return "".join(bare_chars), tone


def _apply_tone(spelling: str, tone: str) -> str:
	if tone == "mid" or spelling == "":
		return spelling
	mark = TONE_TO_MARK[tone]
	return unicodedata.normalize("NFC", spelling[0] + mark + spelling[1:])


def _convert_syllable(syllable: str) -> str:
	bare, tone = _strip_tone(syllable)
	tokens = _tokenize_bare(bare)

	onset: list[str] = []
	i = 0
	# A leading glottal stop is the silent onset of a vowel-initial syllable
	# (the role อ plays in the script) — drop it, it is never a real onset
	# consonant.
	if i < len(tokens) and tokens[i] == "ʔ":
		i += 1
	while i < len(tokens) and tokens[i] not in VOWEL_TOKENS:
		if tokens[i] in ("ʰ", "ː", "ʔ"):
			raise ConversionError(f"unexpected {tokens[i]!r} before a vowel")
		if tokens[i] not in ONSET_MAP:
			raise ConversionError(f"unmapped onset token {tokens[i]!r}")
		onset.append(tokens[i])
		i += 1

	if i >= len(tokens):
		raise ConversionError("no vowel nucleus found")

	vowel_token = tokens[i]
	i += 1

	# The three centring diphthongs (อัว, เอีย, เอือ) are a glide vowel
	# followed (possibly after a length marker) by "a" — a two-token
	# nucleus, not a plain long vowel.
	lookahead = i
	while lookahead < len(tokens) and tokens[lookahead] in ("ː", "ʔ"):
		lookahead += 1
	if vowel_token in ("u", "i", "ɯ") and lookahead < len(tokens) and tokens[lookahead] == "a":
		vowel_spelling = DIPHTHONG_MAP[vowel_token]
		i = lookahead + 1
		while i < len(tokens) and tokens[i] in ("ː", "ʔ"):
			i += 1
	else:
		long_vowel = False
		while i < len(tokens) and tokens[i] in ("ː", "ʔ"):
			if tokens[i] == "ː":
				long_vowel = True
			i += 1
		vowel_spelling = LONG_VOWEL_MAP[vowel_token] if long_vowel else VOWEL_MAP[vowel_token]

	coda: list[str] = []
	while i < len(tokens):
		if tokens[i] not in CODA_MAP:
			raise ConversionError(f"unmapped coda token {tokens[i]!r}")
		coda.append(tokens[i])
		i += 1

	onset_spelling = "".join(ONSET_MAP[t] for t in onset)
	nucleus_spelling = _apply_tone(vowel_spelling, tone)
	coda_spelling = "".join(CODA_MAP[t] for t in coda)

	return onset_spelling + nucleus_spelling + coda_spelling


def convert_romanization(romanization: str) -> str:
	"""Convert a full (possibly multi-syllable) IPA romanization to Paiboon.

	Raises ConversionError if any syllable cannot be parsed.
	"""
	out = []
	token = ""
	for ch in romanization:
		if ch in (" ", "-"):
			if token:
				out.append(_convert_syllable(token))
				token = ""
			out.append(ch)
		else:
			token += ch
	if token:
		out.append(_convert_syllable(token))
	return "".join(out)


def convert_corpus(entries: list[dict], *, report_limit: int = 25) -> dict:
	counts: dict[str, int] = {"ipa": 0, "paiboon": 0, "mixed": 0, "neither": 0}
	converted = 0
	skipped_already_done = 0
	failures: list[dict] = []

	for entry in entries:
		if "ipa" in entry:
			# Already converted in a previous run.
			skipped_already_done += 1
			continue

		romanization = entry.get("romanization", "")
		notation = classify_notation(romanization)
		counts[notation] += 1

		if notation != "ipa":
			continue

		try:
			paiboon = convert_romanization(romanization)
		except ConversionError as exc:
			failures.append(
				{
					"rank": entry.get("rank"),
					"thai": entry.get("thai"),
					"romanization": romanization,
					"reason": str(exc),
				}
			)
			continue

		entry["ipa"] = romanization
		entry["romanization"] = paiboon
		converted += 1

	return {
		"counts": counts,
		"converted": converted,
		"skipped_already_done": skipped_already_done,
		"failures": failures,
		"failures_reported": failures[:report_limit],
	}


def main(argv: list[str]) -> int:
	dry_run = "--dry-run" in argv
	path = DEFAULT_CORPUS
	for arg in argv:
		if not arg.startswith("--"):
			path = Path(arg)

	with path.open("r", encoding="utf-8") as f:
		entries = json.load(f)

	report = convert_corpus(entries)

	print(f"Classified {len(entries)} entries:")
	for cls in ("ipa", "paiboon", "mixed", "neither"):
		print(f"  {cls}: {report['counts'][cls]}")
	print(f"Converted: {report['converted']}")
	print(f"Already converted (skipped): {report['skipped_already_done']}")
	print(f"Failed to convert: {len(report['failures'])}")
	for failure in report["failures_reported"]:
		print(f"  rank={failure['rank']} thai={failure['thai']!r} reason={failure['reason']}")
	if len(report["failures"]) > len(report["failures_reported"]):
		print(f"  ... and {len(report['failures']) - len(report['failures_reported'])} more")

	if not dry_run:
		with path.open("w", encoding="utf-8") as f:
			json.dump(entries, f, ensure_ascii=False, indent=2)
			f.write("\n")

	return 0


if __name__ == "__main__":
	sys.exit(main(sys.argv[1:]))
