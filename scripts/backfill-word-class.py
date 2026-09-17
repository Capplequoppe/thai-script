#!/usr/bin/env python3
"""Backfill `word_class` across the entries of `vocabulary.json` that carry none.

	python3 scripts/backfill-word-class.py --dry-run     # measure, write nothing
	python3 scripts/backfill-word-class.py               # backfill + record baseline

3,200 of 5,454 entries carry an empty `word_class`, and the room partition of
phase 5 cannot be built until they do. Every value this script writes is a
*derived guess*, and what makes that safe is that it stays labelled as one:
every entry ends up carrying `word_class_provenance`, which is `"source"` for
a value that came with the corpus and `"backfill"` for one this script
derived. A later pass can then revisit only the guesses, and a reviewer can
tell what was measured from what was inferred.

Fields this script owns on each entry:

	word_class					unchanged when source-provided; filled in
								when it was empty and classifiable
	word_class_provenance		"source" | "backfill" — on every entry
	word_class_unclassifiable	the reason, present only on a "backfill" entry
								whose class is still "" (the residue).
								Distinct from "unclassified": an entry with no
								provenance at all is not a state this script
								leaves behind.
	word_class_rule				which rule decided, on backfilled entries
	word_class_predicted		the backfill's own reading of a *source*-labelled
								entry, so a disagreement is visible in the
								corpus rather than resolved silently
	word_class_heldout			true on the held-out evaluation sample

A source-provided value is never overwritten. The write loop only assigns
`word_class` where `_source_class` returns None, so there is no path that
could.

## The held-out sample, and why it is held out from the *inputs*

The method has two kinds of input: hand-written rules, and a gloss-token
lexicon fitted to the corpus's existing labels. A sample held out only from
the *outputs* would still have shaped the lexicon, so measuring on it would
measure memorisation. Instead, membership is decided by `_bucket`: FNV-1a over
the UTF-8 of the entry's Thai form, salted, mod 10. That is a pure function of
the Thai spelling — it cannot see the gloss, the class, or anything the
classifier produces — and it is cheap enough to recompute independently on the
TypeScript side, which `WordClassBackfill.test.ts` does.

	bucket 0	held out. Never in any fit whose predictions are scored.
	bucket 1	dev. Used to choose between rule orderings and priors.
	2-9			train.

Two fits therefore exist. The *evaluation* fit sees buckets 2-9 only, and its
predictions on bucket 0 are the reported accuracy figure. The *production*
fit sees every source label (bucket 0 included) and is what actually fills in
the 3,200 blanks — so the reported figure is a slightly pessimistic proxy for
the accuracy of the values shipped, which is the standard direction to err in.

## The baseline

`--record` (the default) rewrites the generated block at the bottom of
`src/domain/vocabulary/services/WordClassBackfill.ts`. That block is the
committed baseline: every figure in it is recomputed from the committed corpus
by `WordClassBackfill.test.ts` and asserted equal. So a later run that changes
any prediction moves a recomputed figure, the test goes red, and re-recording
the block puts the movement in the diff where a human sees it. The numbers are
machine-written, never typed in by hand.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from math import log
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CORPUS = REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"
DEFAULT_BASELINE_TS = (
	REPO_ROOT / "src" / "domain" / "vocabulary" / "services" / "WordClassBackfill.ts"
)

# The corpus's twelve declared word-class values. `rooms.ts` asserts the set of
# non-empty values in the corpus is exactly this, so the backfill may never
# invent a thirteenth.
KNOWN_WORD_CLASSES = (
	"pron",
	"n",
	"v",
	"adj",
	"adv",
	"conj",
	"det",
	"aux",
	"mod",
	"prep",
	"part",
	"clf",
)

# ---------------------------------------------------------------------------
# Held-out / dev / train split — a pure function of the Thai spelling
# ---------------------------------------------------------------------------

HOLDOUT_SALT = "thai-script/word-class-holdout/v1"
HELD_OUT_BUCKET = 0
DEV_BUCKET = 1
BUCKETS = 10


def _fnv1a32(data: bytes) -> int:
	h = 0x811C9DC5
	for byte in data:
		h ^= byte
		h = (h * 0x01000193) & 0xFFFFFFFF
	return h


def bucket_of(thai: str) -> int:
	"""Which of ten buckets `thai` falls in. Salted FNV-1a, mod 10.

	Deliberately not a cryptographic hash: the TypeScript side recomputes this
	in eight lines with no crypto import, which is what lets the test prove the
	split is independent of the classifier rather than take the corpus's word
	for it.
	"""
	return _fnv1a32((HOLDOUT_SALT + thai).encode("utf-8")) % BUCKETS


# ---------------------------------------------------------------------------
# Reading the corpus's existing state
# ---------------------------------------------------------------------------


def _source_class(entry: dict) -> str | None:
	"""The entry's source-provided class, or None if it has none.

	A value this script wrote on an earlier run is not a source value — that is
	what makes re-running idempotent rather than self-reinforcing. Fitting on
	our own guesses would let one run's error become the next run's evidence.
	"""
	if entry.get("word_class_provenance") == "backfill":
		return None
	return entry.get("word_class") or None


# ---------------------------------------------------------------------------
# Closed lexicons and morphology — the rules, in the order they are tried
# ---------------------------------------------------------------------------

THAI_PRONOUNS = {
	"ฉัน", "ดิฉัน", "ผม", "กระผม", "ข้าพเจ้า", "หนู", "คุณ", "ท่าน", "เธอ",
	"แก", "เขา", "เค้า", "มัน", "เรา", "พวกเรา", "พวกเขา", "พวกเธอ", "กู",
	"มึง", "ตัวเอง", "ใคร", "ข้า", "เอ็ง", "หล่อน", "ตน", "ตัว",
}

THAI_PARTICLES = {
	"ครับ", "ค่ะ", "คะ", "ค่า", "ขะ", "จ้ะ", "จ๊ะ", "จ้า", "นะ", "น่ะ", "นา",
	"สิ", "ซิ", "เถอะ", "เถิด", "ล่ะ", "หรอก", "ฮะ", "วะ", "เว้ย", "โว้ย",
	"ไหม", "มั้ย", "หนอ", "เอย", "เอ๋ย", "ยะ", "ย่ะ",
}

THAI_CONJUNCTIONS = {
	"และ", "หรือ", "แต่", "เพราะ", "เพราะว่า", "ถ้า", "หาก", "ถ้าหาก", "ว่า",
	"จึง", "ดังนั้น", "เพื่อ", "แม้", "แม้ว่า", "ทั้ง", "กับ", "ส่วน", "ขณะ",
	"เมื่อ", "จนกว่า", "ทว่า", "อีกทั้ง", "ฉะนั้น",
}

# Nominalising and agentive prefixes. Each needs a minimum remaining length,
# or ผู้ matches ผู้ itself and การ matches การ ("work", a noun anyway).
THAI_NOUN_PREFIXES = (
	("การ", 2),
	("ความ", 2),
	("นัก", 2),
	("ผู้", 2),
	("ช่าง", 2),
	("เครื่อง", 2),
	("ชาว", 2),
	("โรง", 2),
	("ร้าน", 2),
	("คนที่", 1),
)

ENGLISH_CONJUNCTIONS = {
	"and", "or", "but", "because", "if", "although", "though", "while",
	"whereas", "unless", "so", "therefore", "thus", "hence", "however",
	"moreover", "besides", "whether",
}

ENGLISH_PREPOSITIONS = {
	"at", "in", "on", "from", "with", "without", "for", "of", "to", "by",
	"into", "onto", "about", "above", "below", "under", "over", "between",
	"among", "through", "during", "until", "till", "since", "toward",
	"towards", "against", "beside", "behind", "near", "upon", "within",
	"outside", "inside", "across", "along", "beyond",
}

ENGLISH_DETERMINERS = {
	"this", "that", "these", "those", "each", "every", "some", "any", "all",
	"both", "either", "neither", "another", "such", "which", "whose",
}

ENGLISH_PRONOUNS = {
	"i", "me", "my", "mine", "myself", "you", "your", "yours", "yourself",
	"he", "him", "his", "she", "her", "hers", "it", "its", "we", "us", "our",
	"ours", "ourselves", "they", "them", "their", "theirs", "who", "whom",
	"someone", "somebody", "anyone", "anybody", "everyone", "everybody",
	"something", "anything", "everything", "nothing", "oneself", "themselves",
}

ENGLISH_MODALS = {"can", "could", "may", "might", "must", "shall", "should", "will", "would"}

# English derivational suffixes, longest first so -ation wins over -ion.
#
# This list is *selected*, not enumerated. Each candidate was compared against
# what the fitted lexicon says about the same entries, under 5-fold
# cross-validation over buckets 1-9 (the held-out bucket never enters, so the
# reported figure stays clean). Every suffix that measured worse than the
# lexicon is gone, and they were gone for one reason: they were not matching
# suffixes at all but stem-final letters. "-ic" scored 0.06 because it fires on
# music, topic and traffic; "-ish" scored 0.00 on fish and finish; "-al" 0.35 on
# hospital, capital and animal; "-ary" 0.10 on dictionary and library. What
# survives is the morphology that is genuinely derivational and rarely collides
# with a stem: the verb-formers, the adverb-formers longer than a bare "-ly",
# and the unambiguous nominalisers.
ENGLISH_SUFFIX_CLASS = (
	("ation", "n"),
	("ness", "n"),
	("ment", "n"),
	("ance", "n"),
	("ence", "n"),
	("tion", "n"),
	("sion", "n"),
	("ism", "n"),
	("ically", "adv"),
	("ously", "adv"),
	("ingly", "adv"),
	("ise", "v"),
	("ize", "v"),
	("ify", "v"),
	("ate", "v"),
	("ous", "adj"),
	("ful", "adj"),
	("less", "adj"),
)

_GLOSS_SPLIT = re.compile(r"[;,/()\[\]|]+")
_WORD = re.compile(r"[a-z']+")


def gloss_senses(english: str) -> list[list[str]]:
	"""The gloss split into senses, each tokenised to lowercase words."""
	senses = []
	for chunk in _GLOSS_SPLIT.split(english.lower()):
		tokens = _WORD.findall(chunk)
		if tokens:
			senses.append(tokens)
	return senses


def gloss_tokens(english: str) -> list[str]:
	return [token for sense in gloss_senses(english) for token in sense]


def _head_token(sense: list[str]) -> str:
	"""The token a sense's part of speech hangs off.

	"to relate" and "a camera" both carry their class on the second token; a
	bare "recommend" carries it on the first.
	"""
	if len(sense) > 1 and sense[0] in {"to", "a", "an", "the", "be", "being"}:
		return sense[1]
	return sense[0]


def rule_class(entry: dict) -> tuple[str, str] | None:
	"""The class a hand-written rule assigns, with the rule's name, or None.

	Ordered most to least specific. Only the entry's Thai spelling and English
	gloss are consulted — the same two fields available on the 3,200 blanks,
	which carry no description and no mnemonic. Feeding the rules a field the
	blanks do not have would measure well and classify nothing.
	"""
	thai = entry.get("thai") or ""
	english = entry.get("english") or ""
	senses = gloss_senses(english)
	lowered = english.lower()

	if "classifier" in lowered:
		return "clf", "gloss-says-classifier"
	if thai in THAI_PARTICLES:
		return "part", "thai-particle-lexicon"
	if thai in THAI_PRONOUNS:
		return "pron", "thai-pronoun-lexicon"
	if thai in THAI_CONJUNCTIONS:
		return "conj", "thai-conjunction-lexicon"

	if senses:
		first = senses[0]
		single = len(senses) == 1 and len(first) == 1
		if single:
			token = first[0]
			if token in ENGLISH_CONJUNCTIONS:
				return "conj", "gloss-is-english-conjunction"
			if token in ENGLISH_PRONOUNS:
				return "pron", "gloss-is-english-pronoun"
			if token in ENGLISH_MODALS:
				# The corpus calls these `aux`; `mod` has one member in 5,454
				# entries. Measured 5 of 6 on the labelled pool.
				return "aux", "gloss-is-english-modal"
			if token in ENGLISH_DETERMINERS:
				return "det", "gloss-is-english-determiner"
			if token in ENGLISH_PREPOSITIONS:
				return "prep", "gloss-is-english-preposition"

	for prefix, min_rest in THAI_NOUN_PREFIXES:
		if thai.startswith(prefix) and len(thai) - len(prefix) >= min_rest:
			return "n", f"thai-noun-prefix-{prefix}"
	if thai.startswith("อย่าง") and len(thai) > 5:
		return "adv", "thai-adverb-prefix"

	if senses:
		first = senses[0]
		if first[0] == "to" and len(first) > 1:
			return "v", "gloss-infinitive-marker"
		head = _head_token(first)
		for suffix, cls in ENGLISH_SUFFIX_CLASS:
			if head.endswith(suffix) and len(head) - len(suffix) >= 3:
				return cls, f"gloss-suffix-{suffix}"

	return None


# ---------------------------------------------------------------------------
# The fitted part — a gloss-token lexicon
# ---------------------------------------------------------------------------

FEATURE_ALPHA = 0.4


def lexical_features(entry: dict) -> list[str]:
	"""The features that count as *evidence* about this entry.

	Only these decide whether the entry is classifiable at all. They are all
	lexical: gloss tokens, the head of each sense, the sense's first word, and
	the entry's Thai two-character affixes. An entry sharing none of them with
	the labelled corpus is in the residue — it is not guessed at from its
	length, which is the kind of feature that would silently empty the residue
	while classifying nothing.
	"""
	thai = entry.get("thai") or ""
	senses = gloss_senses(entry.get("english") or "")
	features = []
	for sense in senses:
		for token in sense:
			features.append(f"tok:{token}")
		features.append(f"head:{_head_token(sense)}")
	if senses:
		features.append(f"first:{senses[0][0]}")
	if thai:
		features.append(f"thpre:{thai[:2]}")
		features.append(f"thsuf:{thai[-2:]}")
	return features


def context_features(entry: dict) -> list[str]:
	"""Features that refine a score but never establish evidence on their own.

	Thai three-character affixes and a bucketed word length. Long Thai forms
	are overwhelmingly noun compounds and short ones verbal, which is real
	signal — but it is signal every entry carries, so it must not be what makes
	an entry classifiable.
	"""
	thai = entry.get("thai") or ""
	features = [f"thlen:{min(len(thai), 9)}"]
	if len(thai) >= 3:
		features.append(f"thpre3:{thai[:3]}")
		features.append(f"thsuf3:{thai[-3:]}")
	return features


class Lexicon:
	"""Naive Bayes over gloss tokens and Thai affixes, fitted to the labelled corpus.

	Plain multinomial naive Bayes with add-alpha smoothing and the empirical
	class prior — no temperature or margin knob. Both were tried on the dev
	bucket and neither earned its place: a uniform prior sends anything
	uncertain to whichever class has the fewest training tokens (the smoothing
	denominator is smallest there), and an evidence-margin floor traded
	accuracy for residue in the wrong direction.
	"""

	def __init__(self, training: list[dict]) -> None:
		self.classes = list(KNOWN_WORD_CLASSES)
		counts: dict[str, Counter] = {cls: Counter() for cls in self.classes}
		totals: Counter = Counter()
		class_counts: Counter = Counter()
		observed: set[str] = set()
		for entry in training:
			cls = _source_class(entry)
			if cls is None or cls not in counts:
				continue
			class_counts[cls] += 1
			for feature in lexical_features(entry) + context_features(entry):
				counts[cls][feature] += 1
				totals[cls] += 1
				observed.add(feature)
		self._counts = counts
		self._observed = observed
		self._class_counts = class_counts
		self._labelled = sum(class_counts.values())
		self._denominator = {
			cls: totals[cls] + FEATURE_ALPHA * (len(observed) + 1) for cls in self.classes
		}

	def evidence(self, entry: dict) -> list[str]:
		"""The lexical features of `entry` this fit has actually seen."""
		return [f for f in lexical_features(entry) if f in self._observed]

	def predict(self, entry: dict) -> tuple[str, str] | tuple[None, str]:
		"""The fitted prediction and the rule name, or (None, reason)."""
		evidence = self.evidence(entry)
		if not evidence:
			return None, (
				"no gloss token, gloss head or Thai affix of this entry appears "
				"anywhere in the labelled corpus"
			)
		scored = evidence + [f for f in context_features(entry) if f in self._observed]
		ranked = sorted(
			(
				(
					cls,
					log((self._class_counts[cls] + 0.5) / self._labelled)
					+ sum(
						log((self._counts[cls][f] + FEATURE_ALPHA) / self._denominator[cls])
						for f in scored
					),
				)
				for cls in self.classes
			),
			key=lambda pair: (-pair[1], pair[0]),
		)
		return ranked[0][0], "fitted-gloss-lexicon"


def classify(entry: dict, lexicon: Lexicon) -> tuple[str | None, str]:
	"""The backfill's reading of one entry: (class, rule) or (None, reason)."""
	ruled = rule_class(entry)
	if ruled is not None:
		return ruled
	return lexicon.predict(entry)


# ---------------------------------------------------------------------------
# The run
# ---------------------------------------------------------------------------


def backfill(entries: list[dict]) -> dict:
	source_entries = [e for e in entries if _source_class(e) is not None]
	for entry in source_entries:
		entry["_bucket"] = bucket_of(entry.get("thai") or "")

	held_out = [e for e in source_entries if e["_bucket"] == HELD_OUT_BUCKET]
	dev = [e for e in source_entries if e["_bucket"] == DEV_BUCKET]
	train = [
		e for e in source_entries if e["_bucket"] not in (HELD_OUT_BUCKET, DEV_BUCKET)
	]

	evaluation_fit = Lexicon(train)
	production_fit = Lexicon(source_entries)

	# Structural proof that the evaluation fit never saw a held-out label. The
	# split is by Thai form, so a duplicated spelling would leak one; assert
	# rather than assume.
	held_out_forms = {e.get("thai") for e in held_out}
	leaked = [e for e in train if e.get("thai") in held_out_forms]
	if leaked:
		raise AssertionError(
			f"{len(leaked)} held-out Thai forms also appear in the training split"
		)

	def measure(sample: list[dict], fit: Lexicon) -> dict:
		correct = 0
		residue = 0
		confusion: Counter = Counter()
		truths: Counter = Counter()
		per_class_correct: Counter = Counter()
		for entry in sample:
			predicted, _ = classify(entry, fit)
			truth = _source_class(entry)
			truths[truth] += 1
			if predicted is None:
				residue += 1
			elif predicted == truth:
				correct += 1
				per_class_correct[truth] += 1
			else:
				confusion[f"{truth}->{predicted}"] += 1
		total = len(sample)
		# The majority-class score is what "always answer noun" would get. The
		# labelled corpus is 68% nouns, so an accuracy figure without this
		# number beside it says nothing about whether the method works.
		majority_class, majority_correct = (
			truths.most_common(1)[0] if truths else ("", 0)
		)
		# Macro-averaged recall — every class weighted equally. On a corpus this
		# lopsided it is the figure that moves when the rare classes break.
		balanced = (
			sum(per_class_correct[cls] / n for cls, n in truths.items()) / len(truths)
			if truths
			else 0.0
		)
		return {
			"total": total,
			"correct": correct,
			"residue": residue,
			"accuracy": round(correct / total, 4) if total else 0.0,
			"majority_class": majority_class,
			"majority_correct": majority_correct,
			"majority_accuracy": round(majority_correct / total, 4) if total else 0.0,
			"balanced_accuracy": round(balanced, 4),
			"confusion": confusion.most_common(10),
		}

	held_out_measure = measure(held_out, evaluation_fit)
	dev_measure = measure(dev, evaluation_fit)
	# The 3,200 blanks are all frequency-ranked entries, while two thirds of the
	# labelled corpus is curated thematic noun lists. The held-out figure over
	# the frequency stratum alone is the one that speaks to the population
	# actually being backfilled, so it is reported separately rather than
	# averaged away.
	held_out_frequency_measure = measure(
		[e for e in held_out if e.get("source") == "frequency_csv"], evaluation_fit
	)

	# Write. A source-provided value is never assigned to, only read.
	backfilled = 0
	unclassifiable: list[dict] = []
	disagreements: list[dict] = []
	rule_counts: Counter = Counter()
	assigned_counts: Counter = Counter()

	for entry in entries:
		entry.pop("_bucket", None)
		thai = entry.get("thai") or ""
		source = _source_class(entry)
		if source is not None:
			bucket = bucket_of(thai)
			entry["word_class"] = source
			entry["word_class_provenance"] = "source"
			entry.pop("word_class_unclassifiable", None)
			entry.pop("word_class_rule", None)
			fit = evaluation_fit if bucket == HELD_OUT_BUCKET else production_fit
			predicted, _ = classify(entry, fit)
			entry["word_class_predicted"] = predicted
			if bucket == HELD_OUT_BUCKET:
				entry["word_class_heldout"] = True
			else:
				entry.pop("word_class_heldout", None)
			if predicted is not None and predicted != source:
				disagreements.append(
					{
						"thai": thai,
						"english": entry.get("english"),
						"source": source,
						"predicted": predicted,
					}
				)
			continue

		predicted, rule_or_reason = classify(entry, production_fit)
		entry["word_class_provenance"] = "backfill"
		entry.pop("word_class_predicted", None)
		entry.pop("word_class_heldout", None)
		if predicted is None:
			entry["word_class"] = ""
			entry["word_class_unclassifiable"] = rule_or_reason
			entry.pop("word_class_rule", None)
			unclassifiable.append({"thai": thai, "english": entry.get("english"), "reason": rule_or_reason})
			continue
		entry["word_class"] = predicted
		entry["word_class_rule"] = rule_or_reason
		entry.pop("word_class_unclassifiable", None)
		rule_counts[rule_or_reason] += 1
		assigned_counts[predicted] += 1
		backfilled += 1

	return {
		"entries": len(entries),
		"from_source": len(source_entries),
		"backfilled": backfilled,
		"unclassifiable": len(unclassifiable),
		"held_out": held_out_measure,
		"held_out_frequency_stratum": held_out_frequency_measure,
		"dev": dev_measure,
		"disagreements": len(disagreements),
		"disagreements_reported": disagreements[:20],
		"unclassifiable_reported": unclassifiable[:20],
		"rule_counts": rule_counts.most_common(),
		"assigned_counts": assigned_counts.most_common(),
	}


# ---------------------------------------------------------------------------
# The committed baseline block
# ---------------------------------------------------------------------------

BASELINE_BEGIN = "// <generated-baseline>"
BASELINE_END = "// </generated-baseline>"


def render_baseline(report: dict) -> str:
	held = report["held_out"]
	stratum = report["held_out_frequency_stratum"]
	dev = report["dev"]
	fields = [
		("corpusEntries", report["entries"]),
		("fromSource", report["from_source"]),
		("backfilled", report["backfilled"]),
		("unclassifiable", report["unclassifiable"]),
		("heldOutTotal", held["total"]),
		("heldOutCorrect", held["correct"]),
		("heldOutResidue", held["residue"]),
		("heldOutAccuracy", held["accuracy"]),
		("heldOutMajorityClass", held["majority_class"]),
		("heldOutMajorityAccuracy", held["majority_accuracy"]),
		("heldOutBalancedAccuracy", held["balanced_accuracy"]),
		("heldOutFrequencyStratumTotal", stratum["total"]),
		("heldOutFrequencyStratumCorrect", stratum["correct"]),
		("heldOutFrequencyStratumAccuracy", stratum["accuracy"]),
		("heldOutFrequencyStratumMajorityAccuracy", stratum["majority_accuracy"]),
		("devTotal", dev["total"]),
		("devCorrect", dev["correct"]),
		("devAccuracy", dev["accuracy"]),
		("sourceDisagreements", report["disagreements"]),
	]
	lines = [
		BASELINE_BEGIN,
		"// Written by scripts/backfill-word-class.py. Every figure here is",
		"// recomputed from the committed corpus by WordClassBackfill.test.ts and",
		"// asserted equal, so a run that changes any prediction turns the test red",
		"// until the block is re-recorded — which puts the movement in the diff.",
		"export const WORD_CLASS_BACKFILL_BASELINE = {",
	]
	for name, value in fields:
		lines.append(f"\t{name}: {json.dumps(value)},")
	lines.append("} as const;")
	lines.append(BASELINE_END)
	return "\n".join(lines)


def write_baseline(path: Path, report: dict) -> None:
	text = path.read_text(encoding="utf-8")
	start = text.find(BASELINE_BEGIN)
	end = text.find(BASELINE_END)
	if start == -1 or end == -1:
		raise SystemExit(
			f"{path} carries no {BASELINE_BEGIN} ... {BASELINE_END} block to record into"
		)
	updated = text[:start] + render_baseline(report) + text[end + len(BASELINE_END) :]
	path.write_text(updated, encoding="utf-8")


# ---------------------------------------------------------------------------


def main(argv: list[str]) -> int:
	parser = argparse.ArgumentParser(description=__doc__)
	parser.add_argument("corpus", nargs="?", type=Path, default=DEFAULT_CORPUS)
	parser.add_argument("--dry-run", action="store_true", help="measure and report, write nothing")
	parser.add_argument(
		"--baseline-ts",
		type=Path,
		default=DEFAULT_BASELINE_TS,
		help="the TypeScript module carrying the generated baseline block",
	)
	parser.add_argument("--report-json", type=Path, help="also write the full report here")
	args = parser.parse_args(argv)

	entries = json.loads(args.corpus.read_text(encoding="utf-8"))
	report = backfill(entries)

	print(f"Corpus: {report['entries']} entries")
	print(f"  source-provided: {report['from_source']}")
	print(f"  backfilled:      {report['backfilled']}")
	print(f"  unclassifiable:  {report['unclassifiable']}")
	held = report["held_out"]
	dev = report["dev"]
	print(
		f"  held-out accuracy: {held['correct']}/{held['total']} = {held['accuracy']}"
		f" (residue {held['residue']})"
	)
	print(
		f"    vs always-\"{held['majority_class']}\": {held['majority_accuracy']}"
		f", balanced: {held['balanced_accuracy']}"
	)
	stratum = report["held_out_frequency_stratum"]
	print(
		f"  held-out, frequency stratum only: {stratum['correct']}/{stratum['total']}"
		f" = {stratum['accuracy']} (vs always-\"{stratum['majority_class']}\":"
		f" {stratum['majority_accuracy']})"
	)
	print(f"  dev accuracy:      {dev['correct']}/{dev['total']} = {dev['accuracy']}")
	print(f"  source disagreements: {report['disagreements']}")
	for row in report["disagreements_reported"][:10]:
		print(f"    {row['thai']} {row['english']!r}: source={row['source']} predicted={row['predicted']}")
	for row in report["unclassifiable_reported"][:10]:
		print(f"    residue {row['thai']} {row['english']!r}: {row['reason']}")
	print(f"  held-out confusion: {held['confusion']}")
	print(f"  rules: {report['rule_counts']}")
	print(f"  assigned: {report['assigned_counts']}")

	if args.report_json:
		args.report_json.write_text(
			json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
		)

	if args.dry_run:
		return 0

	args.corpus.write_text(
		json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
	)
	write_baseline(args.baseline_ts, report)
	return 0


if __name__ == "__main__":
	sys.exit(main(sys.argv[1:]))
