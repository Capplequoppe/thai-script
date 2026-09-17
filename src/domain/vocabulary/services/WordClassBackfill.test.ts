import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KNOWN_WORD_CLASSES } from "../data/rooms";
import {
	countBackfillStates,
	heldOutSample,
	isHeldOut,
	measureAccuracy,
	reportSourceDisagreements,
	WORD_CLASS_BACKFILL_BASELINE,
	WORD_CLASS_PROVENANCES,
	type WordClassFields,
	wordClassProvenanceOf,
	wordClassStateFor,
} from "./WordClassBackfill";

const VOCAB_PATH = join(import.meta.dirname, "..", "data", "vocabulary.json");

// The corpus is 5,454 entries and nearly 8MB of JSON. Parsed once for the whole
// file: every case below reads the same array, and re-parsing per case is the
// kind of cost that turns a gate into something nobody runs.
const CORPUS: WordClassFields[] = JSON.parse(
	readFileSync(VOCAB_PATH, "utf8"),
) as WordClassFields[];

function describeEntry(entry: WordClassFields): string {
	return `${entry.thai} (word_class=${JSON.stringify(entry.word_class)}, provenance=${JSON.stringify(entry.word_class_provenance)})`;
}

// AC1 -----------------------------------------------------------------------

describe("AC1: every entry carries a class, or is reported residue", () => {
	it("leaves no entry both unclassified and unexplained", () => {
		const silent = CORPUS.filter(
			(entry) => wordClassStateFor(entry).state === "unrecorded",
		);
		expect(
			silent.map(describeEntry),
			"an entry in no state at all: the backfill neither classified it nor said why",
		).toEqual([]);
	});

	it("gives every entry either a known class or a stated reason", () => {
		const known = new Set<string>(KNOWN_WORD_CLASSES);
		for (const entry of CORPUS) {
			const state = wordClassStateFor(entry);
			if (state.state === "unclassifiable") {
				expect(state.reason.length, describeEntry(entry)).toBeGreaterThan(0);
			} else if (
				state.state === "from-source" ||
				state.state === "backfilled"
			) {
				expect(known.has(state.wordClass), describeEntry(entry)).toBe(true);
			} else {
				throw new Error(`${describeEntry(entry)} is in no reportable state`);
			}
		}
	});

	it("reports a residue small enough to read, and names why for each of it", () => {
		const residue = CORPUS.filter(
			(entry) => wordClassStateFor(entry).state === "unclassifiable",
		);
		expect(residue.length).toBe(WORD_CLASS_BACKFILL_BASELINE.unclassifiable);
		for (const entry of residue) {
			expect(entry.word_class_unclassifiable, describeEntry(entry)).toMatch(
				/\S/,
			);
		}
	});
});

// AC2 -----------------------------------------------------------------------

describe("AC2: provenance is recorded per entry", () => {
	it("records one of exactly two provenance values on every entry, never absent", () => {
		const missing = CORPUS.filter(
			(entry) =>
				entry.word_class_provenance === undefined ||
				!WORD_CLASS_PROVENANCES.includes(entry.word_class_provenance),
		);
		expect(missing.map(describeEntry)).toEqual([]);
	});

	it("makes a backfilled class distinguishable from corpus data on every classified entry", () => {
		let backfilled = 0;
		let fromSource = 0;
		for (const entry of CORPUS) {
			const state = wordClassStateFor(entry);
			const provenance = wordClassProvenanceOf(entry);
			if (state.state === "unclassifiable") {
				// Nothing to attribute: there is no class.
				expect(provenance, describeEntry(entry)).toBeNull();
				continue;
			}
			expect(provenance, describeEntry(entry)).not.toBeNull();
			if (provenance === "backfill") backfilled += 1;
			if (provenance === "source") fromSource += 1;
		}
		expect(backfilled).toBe(WORD_CLASS_BACKFILL_BASELINE.backfilled);
		expect(fromSource).toBe(WORD_CLASS_BACKFILL_BASELINE.fromSource);
	});

	it("records which rule decided every backfilled class, so the guesses can be revisited by kind", () => {
		for (const entry of CORPUS) {
			const state = wordClassStateFor(entry);
			if (state.state !== "backfilled") continue;
			expect(state.rule, describeEntry(entry)).toMatch(/\S/);
		}
	});
});

// AC3 -----------------------------------------------------------------------

describe("AC3: a source-provided value is never overwritten", () => {
	it("attributes no source-provided class to a backfill rule", () => {
		// The write loop in backfill-word-class.py only assigns `word_class`
		// where the entry has no source value, so an overwrite cannot happen by
		// construction. What is checkable here is the trace it would leave: an
		// overwritten entry would come back carrying a backfill rule, or with
		// its provenance flipped to "backfill". The second is what the
		// `fromSource` baseline below pins — if a later run overwrote source
		// values, that count would drop and the baseline case goes red.
		const suspect = CORPUS.filter(
			(entry) =>
				entry.word_class_provenance === "source" &&
				entry.word_class_rule !== undefined,
		);
		expect(suspect.map(describeEntry)).toEqual([]);
	});

	it("reports every disagreement instead of resolving it, keeping the source value", () => {
		const disagreements = reportSourceDisagreements(CORPUS);
		expect(disagreements.length).toBe(
			WORD_CLASS_BACKFILL_BASELINE.sourceDisagreements,
		);
		// A disagreement exists at all — otherwise this case would pass on a
		// corpus where the backfill had simply never read a labelled entry.
		expect(disagreements.length).toBeGreaterThan(0);
		for (const disagreement of disagreements) {
			// Identified by index, not by spelling: 139 Thai forms appear more
			// than once and nine of those disagree with themselves about class
			// (ผม is the pronoun "I" and the noun "hair"), so a lookup by
			// spelling would check the wrong entry and pass anyway.
			const entry = CORPUS[disagreement.index];
			expect(entry).toBeDefined();
			expect(entry.thai).toBe(disagreement.thai);
			// The value the entry carries is the source one, not the prediction.
			expect(entry.word_class).toBe(disagreement.sourceClass);
			expect(entry.word_class).not.toBe(disagreement.predictedClass);
			expect(wordClassStateFor(entry).state).toBe("from-source");
		}
	});
});

// AC4 -----------------------------------------------------------------------

describe("AC4: accuracy measured against a sample held out from the method's inputs", () => {
	it("decides held-out membership from the Thai spelling alone, recomputed here", () => {
		// The point of the criterion: the sample must be held out from the
		// *inputs*, not just the outputs. Membership is a salted hash of the
		// Thai form, so it cannot depend on the gloss, the class, or anything
		// the classifier produced. This case recomputes it and checks the
		// pipeline's own flags agree — it does not take the flags on trust.
		const flagged = CORPUS.filter(
			(entry) => entry.word_class_heldout === true,
		).map((entry) => entry.thai);
		const recomputed = heldOutSample(CORPUS).map((entry) => entry.thai);
		expect(new Set(flagged)).toEqual(new Set(recomputed));
		expect(recomputed.length).toBe(WORD_CLASS_BACKFILL_BASELINE.heldOutTotal);

		// The split is a function of the spelling and of nothing else: the same
		// spelling always lands in the same place, and a different spelling is
		// free to land anywhere.
		for (const thai of ["กา", "ที่", "ผู้ชาย"]) {
			expect(isHeldOut(thai)).toBe(isHeldOut(thai));
		}
		// And it is not degenerate in either direction.
		const rate = recomputed.length / WORD_CLASS_BACKFILL_BASELINE.fromSource;
		expect(rate).toBeGreaterThan(0.05);
		expect(rate).toBeLessThan(0.2);
	});

	it("carries a prediction for every held-out entry, so the figure is computable", () => {
		for (const entry of heldOutSample(CORPUS)) {
			expect(
				"word_class_predicted" in entry,
				`${entry.thai} is held out but carries no prediction to score`,
			).toBe(true);
		}
	});

	it("computes the accuracy figure, with the baseline any reader needs beside it", () => {
		const measured = measureAccuracy(heldOutSample(CORPUS));
		expect(measured.total).toBe(WORD_CLASS_BACKFILL_BASELINE.heldOutTotal);
		expect(measured.correct).toBe(WORD_CLASS_BACKFILL_BASELINE.heldOutCorrect);
		expect(measured.accuracy).toBe(
			WORD_CLASS_BACKFILL_BASELINE.heldOutAccuracy,
		);
		// Recorded, not gated on: the task asks for a figure a reviewer can
		// judge, not a threshold invented before anyone saw the method run. The
		// two numbers that make it judgeable are what "always answer noun"
		// scores, and the macro-average over classes.
		expect(measured.majorityClass).toBe(
			WORD_CLASS_BACKFILL_BASELINE.heldOutMajorityClass,
		);
		expect(measured.majorityAccuracy).toBe(
			WORD_CLASS_BACKFILL_BASELINE.heldOutMajorityAccuracy,
		);
		expect(measured.balancedAccuracy).toBe(
			WORD_CLASS_BACKFILL_BASELINE.heldOutBalancedAccuracy,
		);
	});
});

// AC5 -----------------------------------------------------------------------

describe("AC5: the recorded figures are a baseline a later run is compared against", () => {
	it("recomputes every count in the committed baseline from the corpus and finds it unchanged", () => {
		// The baseline block is written by scripts/backfill-word-class.py, not
		// typed in here. Every figure in it is recomputed from the committed
		// corpus and asserted equal, so a later run that changes any prediction
		// moves a recomputed figure and turns this red until the block is
		// re-recorded — which is what puts the movement in a diff a human reads.
		const counts = countBackfillStates(CORPUS);
		expect({
			corpusEntries: counts.corpusEntries,
			fromSource: counts.fromSource,
			backfilled: counts.backfilled,
			unclassifiable: counts.unclassifiable,
		}).toEqual({
			corpusEntries: WORD_CLASS_BACKFILL_BASELINE.corpusEntries,
			fromSource: WORD_CLASS_BACKFILL_BASELINE.fromSource,
			backfilled: WORD_CLASS_BACKFILL_BASELINE.backfilled,
			unclassifiable: WORD_CLASS_BACKFILL_BASELINE.unclassifiable,
		});
		expect(counts.unrecorded).toBe(0);
		// Every entry is in one of the four states and none is double-counted.
		expect(
			counts.fromSource +
				counts.backfilled +
				counts.unclassifiable +
				counts.unrecorded,
		).toBe(counts.corpusEntries);
	});

	it("records the frequency-stratum figure separately, because that is the population being filled in", () => {
		// Two thirds of the labelled corpus is curated thematic noun lists,
		// while every blank is a frequency-ranked entry. Averaging the two
		// hides the figure that speaks to the words actually backfilled.
		const stratum = heldOutSample(CORPUS).filter(
			(entry) => (entry as { source?: string }).source === "frequency_csv",
		);
		const measured = measureAccuracy(stratum);
		expect(measured.total).toBe(
			WORD_CLASS_BACKFILL_BASELINE.heldOutFrequencyStratumTotal,
		);
		expect(measured.correct).toBe(
			WORD_CLASS_BACKFILL_BASELINE.heldOutFrequencyStratumCorrect,
		);
		expect(measured.accuracy).toBe(
			WORD_CLASS_BACKFILL_BASELINE.heldOutFrequencyStratumAccuracy,
		);
		expect(measured.majorityAccuracy).toBe(
			WORD_CLASS_BACKFILL_BASELINE.heldOutFrequencyStratumMajorityAccuracy,
		);
	});

	it("introduces no word class the room partition does not know", () => {
		// rooms.ts asserts the corpus's non-empty classes are exactly its
		// twelve. A backfill inventing a thirteenth would break the partition
		// this phase is built on, so it is checked here too, next to the values
		// that could introduce one.
		const known = new Set<string>(KNOWN_WORD_CLASSES);
		const introduced = new Set<string>();
		for (const entry of CORPUS) {
			const state = wordClassStateFor(entry);
			if (state.state === "backfilled" && !known.has(state.wordClass)) {
				introduced.add(state.wordClass);
			}
		}
		expect([...introduced]).toEqual([]);
	});
});

// AC6 -----------------------------------------------------------------------

describe("AC6: an entry is in exactly one of three states", () => {
	const sourceEntry: WordClassFields = {
		thai: "ที่",
		word_class: "prep",
		word_class_provenance: "source",
		word_class_predicted: "conj",
	};
	const backfilledEntry: WordClassFields = {
		thai: "ลืม",
		word_class: "v",
		word_class_provenance: "backfill",
		word_class_rule: "fitted-gloss-lexicon",
	};
	const unclassifiableEntry: WordClassFields = {
		thai: "ผี",
		word_class: "",
		word_class_provenance: "backfill",
		word_class_unclassifiable: "no gloss token appears in the labelled corpus",
	};

	it("reads a source-provided class as from-source, with the class", () => {
		expect(wordClassStateFor(sourceEntry)).toEqual({
			state: "from-source",
			wordClass: "prep",
		});
		expect(wordClassProvenanceOf(sourceEntry)).toBe("source");
	});

	it("reads a derived class as backfilled, with the class and the rule", () => {
		expect(wordClassStateFor(backfilledEntry)).toEqual({
			state: "backfilled",
			wordClass: "v",
			rule: "fitted-gloss-lexicon",
		});
		expect(wordClassProvenanceOf(backfilledEntry)).toBe("backfill");
	});

	it("reads a refused class as unclassifiable with a reason, never as unclassified", () => {
		const state = wordClassStateFor(unclassifiableEntry);
		expect(state.state).toBe("unclassifiable");
		expect(state.state).not.toBe("unrecorded");
		if (state.state === "unclassifiable") {
			expect(state.reason).toMatch(/\S/);
		}
		// The distinction the criterion turns on: an entry nothing has run over
		// is a different state, and the two do not collapse into each other.
		expect(wordClassStateFor({ thai: "x", word_class: "" })).toEqual({
			state: "unrecorded",
		});
	});

	it("keeps the three states three distinct values", () => {
		const states = [sourceEntry, backfilledEntry, unclassifiableEntry].map(
			(entry) => wordClassStateFor(entry).state,
		);
		expect(new Set(states).size).toBe(3);
		expect(states).not.toContain("unrecorded");
	});

	it("refuses to read a backfill that left neither a class nor a reason as any of the three", () => {
		// A backfill that ran, decided nothing and said nothing is a failure. It
		// must not render identically to a legitimate outcome.
		expect(
			wordClassStateFor({
				thai: "x",
				word_class: "",
				word_class_provenance: "backfill",
			}),
		).toEqual({ state: "unrecorded" });
	});
});

// Idempotency ---------------------------------------------------------------

describe("re-running the backfill changes nothing", () => {
	it("leaves no entry in a shape a second run would read differently", () => {
		// The script's idempotency rests on two properties of what it wrote, and
		// both are checkable here. First, `_source_class` treats a
		// provenance="backfill" value as *not* a source value, so a second run
		// refits on source labels only and cannot feed on its own guesses.
		// Second, the classifier is deterministic, so the same inputs give the
		// same output. What would break the first is an entry whose provenance
		// and fields disagree about which it is.
		for (const entry of CORPUS) {
			const state = wordClassStateFor(entry);
			if (state.state === "from-source") {
				expect(entry.word_class_unclassifiable, describeEntry(entry)).toBe(
					undefined,
				);
				expect(entry.word_class_rule, describeEntry(entry)).toBe(undefined);
			}
			if (state.state === "backfilled") {
				expect(entry.word_class_predicted, describeEntry(entry)).toBe(
					undefined,
				);
				expect(entry.word_class_unclassifiable, describeEntry(entry)).toBe(
					undefined,
				);
			}
			if (state.state === "unclassifiable") {
				expect(entry.word_class_rule, describeEntry(entry)).toBe(undefined);
				expect(entry.word_class, describeEntry(entry)).toBe("");
			}
		}
	});

	it("flags exactly the held-out entries and no others", () => {
		for (const entry of CORPUS) {
			const flagged = entry.word_class_heldout === true;
			const shouldBeFlagged =
				wordClassStateFor(entry).state === "from-source" &&
				isHeldOut(entry.thai);
			expect(flagged, describeEntry(entry)).toBe(shouldBeFlagged);
		}
	});
});
