import { isKnownWordClass, type WordClass } from "../data/rooms";
import type { VocabEntry, WordClassProvenance } from "../types";

// ============================================================================
// Word-class backfill — reading and verifying what the pipeline derived
// ============================================================================
// `scripts/backfill-word-class.py` fills in the 3,200 entries that carried no
// `word_class`. Every value it writes is a derived guess, and what makes that
// safe is that it stays labelled as one: this module is the reader that keeps
// the label legible, and the baseline at the bottom is what makes a later run's
// regression visible instead of silent.
//
// Nothing here classifies. The classifier is the script's; duplicating it in
// TypeScript would mean the check and the thing checked could drift apart while
// both stayed green.

export type { WordClassProvenance };

export const WORD_CLASS_PROVENANCES: readonly WordClassProvenance[] = [
	"source",
	"backfill",
];

/**
 * The subset of a corpus entry this module reads, projected off `VocabEntry`
 * rather than restated — so a field renamed there cannot leave this module
 * reading one that no longer exists.
 */
export type WordClassFields = Pick<
	VocabEntry,
	| "thai"
	| "word_class"
	| "word_class_provenance"
	| "word_class_unclassifiable"
	| "word_class_rule"
	| "word_class_predicted"
	| "word_class_heldout"
>;

/**
 * An entry's word-class state. Three of these are the states the backfill
 * leaves behind (AC6); `unrecorded` is the fourth and is precisely the absence
 * the other three must never be confused with.
 *
 * `unclassifiable` means the backfill ran, could not decide, and said why.
 * `unrecorded` means nothing has run — the pre-backfill condition. Reading the
 * first as the second is what would let a reported failure disappear into a
 * pile of not-yet-done work, so they are different discriminants and the
 * corpus is asserted to contain none of the latter.
 */
export type WordClassState =
	| { state: "from-source"; wordClass: WordClass }
	| { state: "backfilled"; wordClass: WordClass; rule: string }
	| { state: "unclassifiable"; reason: string }
	| { state: "unrecorded" };

/** Which of the four states `entry` is in. Total: every entry has exactly one. */
export function wordClassStateFor(entry: WordClassFields): WordClassState {
	const provenance = entry.word_class_provenance;
	const wordClass = entry.word_class;

	if (provenance === "source") {
		if (!isKnownWordClass(wordClass)) {
			return { state: "unrecorded" };
		}
		return { state: "from-source", wordClass };
	}

	if (provenance === "backfill") {
		if (isKnownWordClass(wordClass)) {
			return {
				state: "backfilled",
				wordClass,
				rule: entry.word_class_rule ?? "",
			};
		}
		const reason = entry.word_class_unclassifiable;
		if (reason !== undefined && reason !== "") {
			return { state: "unclassifiable", reason };
		}
		// The backfill claims to have run and left neither a class nor a
		// reason. That is a failure, and it must not render as one of the three
		// legitimate outcomes.
		return { state: "unrecorded" };
	}

	return { state: "unrecorded" };
}

/**
 * The provenance of `entry`'s class, or null when it has no class at all.
 *
 * A backfilled value is never indistinguishable from corpus data: this is the
 * one call that answers "was this measured or inferred?", and it answers null
 * only for the residue, which has nothing to attribute.
 */
export function wordClassProvenanceOf(
	entry: WordClassFields,
): WordClassProvenance | null {
	const state = wordClassStateFor(entry);
	if (state.state === "from-source") {
		return "source";
	}
	if (state.state === "backfilled") {
		return "backfill";
	}
	return null;
}

// ----------------------------------------------------------------------------
// The held-out sample — recomputed here, not trusted from the corpus
// ----------------------------------------------------------------------------
// Accuracy measured on a sample the method trained on measures memorisation.
// So membership is decided by a salted hash of the Thai spelling alone: it
// cannot see the gloss, the class, or anything the classifier produces, which
// is what makes the sample held out from the method's *inputs* and not merely
// from its outputs.
//
// The hash is FNV-1a rather than anything cryptographic for exactly one
// reason: it is eight lines on both sides, so this module recomputes
// membership independently of the pipeline instead of reading the pipeline's
// own flag back and calling it verified.

const HOLDOUT_SALT = "thai-script/word-class-holdout/v1";
const HOLDOUT_BUCKETS = 10;
const HELD_OUT_BUCKET = 0;

/** FNV-1a (32-bit) over the UTF-8 bytes of `text`. */
function fnv1a32(text: string): number {
	const bytes = new TextEncoder().encode(text);
	let hash = 0x811c9dc5;
	for (const byte of bytes) {
		hash ^= byte;
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash >>> 0;
}

/** Which of the ten evaluation buckets a Thai form falls in. */
function bucketOf(thai: string): number {
	return fnv1a32(HOLDOUT_SALT + thai) % HOLDOUT_BUCKETS;
}

/** Whether a Thai form is in the held-out evaluation sample. */
export function isHeldOut(thai: string): boolean {
	return bucketOf(thai) === HELD_OUT_BUCKET;
}

// ----------------------------------------------------------------------------
// Measurements recomputed from the corpus
// ----------------------------------------------------------------------------

export interface BackfillCounts {
	corpusEntries: number;
	fromSource: number;
	backfilled: number;
	unclassifiable: number;
	unrecorded: number;
}

export function countBackfillStates(
	entries: readonly WordClassFields[],
): BackfillCounts {
	const counts: BackfillCounts = {
		corpusEntries: entries.length,
		fromSource: 0,
		backfilled: 0,
		unclassifiable: 0,
		unrecorded: 0,
	};
	for (const entry of entries) {
		const { state } = wordClassStateFor(entry);
		if (state === "from-source") counts.fromSource += 1;
		else if (state === "backfilled") counts.backfilled += 1;
		else if (state === "unclassifiable") counts.unclassifiable += 1;
		else counts.unrecorded += 1;
	}
	return counts;
}

export interface SourceDisagreement {
	/**
	 * Position in the corpus array. The Thai form is *not* a key — 139 spellings
	 * appear more than once and nine of those carry conflicting source classes
	 * (ผม is both the pronoun "I" and the noun "hair"). Identifying a
	 * disagreement by spelling alone would silently pick whichever homograph
	 * came last.
	 */
	index: number;
	thai: string;
	/** The value the corpus provided. This is the value the entry still carries. */
	sourceClass: string;
	/** What the backfill would have said. Recorded, never applied. */
	predictedClass: string;
}

/**
 * Every entry where the backfill's own reading differs from the source-provided
 * class. A disagreement is reported rather than resolved silently — and the
 * class the entry carries is the source one in every case, which
 * `wordClassStateFor` returning `from-source` is the assertion of.
 */
export function reportSourceDisagreements(
	entries: readonly WordClassFields[],
): SourceDisagreement[] {
	const disagreements: SourceDisagreement[] = [];
	for (const [index, entry] of entries.entries()) {
		if (wordClassStateFor(entry).state !== "from-source") continue;
		const predicted = entry.word_class_predicted;
		if (
			predicted !== null &&
			predicted !== undefined &&
			predicted !== entry.word_class
		) {
			disagreements.push({
				index,
				thai: entry.thai,
				sourceClass: entry.word_class,
				predictedClass: predicted,
			});
		}
	}
	return disagreements;
}

export interface AccuracyMeasurement {
	total: number;
	correct: number;
	/** Held-out entries the method declined to classify at all. */
	residue: number;
	accuracy: number;
	/** The commonest true class in the sample — what "always answer this" would be. */
	majorityClass: string;
	majorityCorrect: number;
	majorityAccuracy: number;
	/** Macro-averaged recall: every class weighted equally. */
	balancedAccuracy: number;
}

/**
 * Accuracy of the backfill's predictions over a sample of source-labelled
 * entries.
 *
 * The majority-class score is returned beside the accuracy deliberately. The
 * labelled corpus is roughly two-thirds nouns, so "0.76 accurate" on its own
 * is unreadable — it needs the number that answering "noun" to everything
 * would have scored.
 */
export function measureAccuracy(
	entries: readonly WordClassFields[],
): AccuracyMeasurement {
	let correct = 0;
	let residue = 0;
	const truths = new Map<string, number>();
	const perClassCorrect = new Map<string, number>();

	for (const entry of entries) {
		const truth = entry.word_class;
		truths.set(truth, (truths.get(truth) ?? 0) + 1);
		const predicted = entry.word_class_predicted;
		if (predicted === null || predicted === undefined) {
			residue += 1;
		} else if (predicted === truth) {
			correct += 1;
			perClassCorrect.set(truth, (perClassCorrect.get(truth) ?? 0) + 1);
		}
	}

	const total = entries.length;
	const [majorityClass = "", majorityCorrect = 0] =
		[...truths].sort((a, b) =>
			b[1] === a[1] ? a[0].localeCompare(b[0]) : b[1] - a[1],
		)[0] ?? [];
	let balanced = 0;
	for (const [cls, n] of truths) {
		balanced += (perClassCorrect.get(cls) ?? 0) / n;
	}

	return {
		total,
		correct,
		residue,
		accuracy: total === 0 ? 0 : round4(correct / total),
		majorityClass,
		majorityCorrect,
		majorityAccuracy: total === 0 ? 0 : round4(majorityCorrect / total),
		balancedAccuracy: truths.size === 0 ? 0 : round4(balanced / truths.size),
	};
}

function round4(value: number): number {
	return Math.round(value * 10000) / 10000;
}

/** The held-out entries of `entries`, by independent recomputation of the split. */
export function heldOutSample(
	entries: readonly WordClassFields[],
): WordClassFields[] {
	return entries.filter(
		(entry) =>
			wordClassStateFor(entry).state === "from-source" && isHeldOut(entry.thai),
	);
}

// <generated-baseline>
// Written by scripts/backfill-word-class.py. Every figure here is
// recomputed from the committed corpus by WordClassBackfill.test.ts and
// asserted equal, so a run that changes any prediction turns the test red
// until the block is re-recorded — which puts the movement in the diff.
export const WORD_CLASS_BACKFILL_BASELINE = {
	corpusEntries: 5454,
	fromSource: 2254,
	backfilled: 3161,
	unclassifiable: 39,
	heldOutTotal: 229,
	heldOutCorrect: 175,
	heldOutResidue: 2,
	heldOutAccuracy: 0.7642,
	heldOutMajorityClass: "n",
	heldOutMajorityAccuracy: 0.6332,
	heldOutBalancedAccuracy: 0.5582,
	heldOutFrequencyStratumTotal: 50,
	heldOutFrequencyStratumCorrect: 32,
	heldOutFrequencyStratumAccuracy: 0.64,
	heldOutFrequencyStratumMajorityAccuracy: 0.36,
	devTotal: 222,
	devCorrect: 167,
	devAccuracy: 0.7523,
	sourceDisagreements: 94,
} as const;
// </generated-baseline>
