import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	assertOriginal,
	checkOriginality,
	isCorpusLoaded,
	loadOriginalityCorpus,
	MINIMUM_CORPUS_TOKENS,
	NGRAM_WIDTH,
	shippedCorpus,
	tokenize,
} from "./originality";
import corpusArtifact from "./originality-corpus.json";

const DATA_DIR = import.meta.dirname;
const REPO_ROOT = join(DATA_DIR, "..", "..", "..", "..");

/**
 * Phrases that are verbatim in the licensed sources — one per required set.
 *
 * These are the **canary**, and they are the reason this suite can claim the
 * corpus is loaded rather than merely that the matcher runs. A planted-overlap
 * test builds a fake corpus, puts a string in it and finds it again; it passes
 * identically when the real artifact is empty, which is the exact failure that
 * would let every paraphrase through unnoticed.
 *
 * They are running heads — the page furniture stamped on every page of each
 * PDF — chosen on two grounds. They are purely functional: a title and a
 * document-type label carry no creative expression, so quoting five tokens of
 * them here reproduces nothing the originality rule is protecting. And they
 * are *discriminating*: "lesson notes" appears only in the notes set and
 * "lesson transcript" only in the recording scripts, so each canary proves its
 * own set was extracted rather than that some Thai-language PDF was.
 *
 * A hash-only canary was the alternative and is circular — the build script
 * would compute it from the same corpus it is meant to vouch for, so it would
 * be present whenever the file parsed at all.
 */
const CANARIES: readonly { phrase: string; source: string }[] = [
	{ phrase: "Lesson Notes: Thai Alphabet Made Easy", source: "lesson-notes" },
	{
		phrase: "Lesson Transcript, Thai Alphabet Made Easy",
		source: "recording-script",
	},
];

/**
 * Prose that is certainly not in the source: the vocabulary is wrong for the
 * subject and the sentence is nonsense, so a hit here would mean the matcher
 * is returning overlaps it cannot have found.
 */
const ORIGINAL_PROSE =
	"A purple hippopotamus juggles nine kettles beside the quiet railway.";

/**
 * The detection rate measured over the 82 shipped mnemonics, recorded so that
 * it is a number in the repository rather than a claim in a commit message.
 *
 * CONTEXT.md establishes those strings were close paraphrases of the licensed
 * material, which made them the only labelled positives that existed. This
 * figure is not a threshold and nothing is required to clear it — the plan
 * asks that it be produced and written down. It is asserted exactly so that it
 * cannot drift silently: whenever a content task rewrites a paraphrased
 * mnemonic (task 1.4 did, for ม and น; task 2.4 then rewrote all 82 under
 * scene grammar) the number must fall, and this test failing is the prompt to
 * re-record it deliberately. It has now fallen to zero: none of the 82
 * shipped mnemonics overlaps the licensed corpus at the shipped window width.
 */
// 83 since ไม้ไต่คู้ joined the vowel inventory and was given a scene.
const MEASURED_DETECTION = { detected: 0, total: 83 } as const;

/**
 * Every `sceneMnemonic` shipped in `symbols.ts`, composed to the same prose
 * string `composeMnemonic` renders at runtime (shape cue, then sound cue).
 */
function shippedMnemonics(): string[] {
	const source = readFileSync(join(DATA_DIR, "symbols.ts"), "utf8");
	const stringLiteral = '("(?:[^"\\\\]|\\\\.)*")';
	return [...source.matchAll(/sceneMnemonic:\s*\{([\s\S]*?)\n\t\t\},/g)].map(
		(match) => {
			const block = match[1];
			const shapeCue = block.match(new RegExp(`shapeCue:\\s*${stringLiteral}`));
			const soundCue = block.match(new RegExp(`soundCue:\\s*${stringLiteral}`));
			if (!shapeCue || !soundCue) {
				throw new Error(
					`sceneMnemonic block missing shapeCue/soundCue: ${block}`,
				);
			}
			return `${JSON.parse(shapeCue[1])} ${JSON.parse(soundCue[1])}`;
		},
	);
}

function loadedCorpus() {
	if (!isCorpusLoaded(shippedCorpus)) {
		throw new Error(`corpus did not load: ${shippedCorpus.reason}`);
	}
	return shippedCorpus;
}

/** The shipped artifact with one field overridden, to drive the failure paths. */
function corpusWith(overrides: Record<string, unknown>) {
	return loadOriginalityCorpus({ ...corpusArtifact, ...overrides });
}

describe("the originality corpus", () => {
	// AC1 — asserted over the committed artifact rather than the validated
	// load, so that a corpus built from one set fails *here*, saying which set
	// is missing, rather than upstream as an opaque "did not load".
	it("carries n-grams from both licensed PDF sets, tagged by set", () => {
		const { ngrams, sourceFlags } = corpusArtifact;
		const tagged = new Set<string>();
		for (const flags of Object.values(ngrams)) {
			for (const [name, bit] of Object.entries(sourceFlags)) {
				if ((flags & bit) !== 0) tagged.add(name);
			}
		}

		expect(tagged).toContain("lesson-notes");
		expect(tagged).toContain("recording-script");
	});

	// AC1 — the tagging is real, not every entry flagged with everything.
	it("distinguishes the two sets rather than tagging every entry with both", async () => {
		for (const canary of CANARIES) {
			const result = await checkOriginality(canary.phrase);

			expect(result.status).toBe("overlapping");
			if (result.status !== "overlapping") return;
			expect(result.overlap.sources).toEqual([canary.source]);
		}
	});

	// AC2
	it("commits only salted hashes and counts", () => {
		const corpus = loadedCorpus();

		for (const [hash, flags] of Object.entries(corpus.ngrams)) {
			expect(hash).toMatch(/^[0-9a-f]{16}$/);
			expect(Number.isInteger(flags)).toBe(true);
			expect(flags).toBeGreaterThan(0);
			expect(flags).toBeLessThanOrEqual(7);
		}
		expect(corpus.salt).toMatch(/^[0-9a-f]+$/);
	});

	// AC2
	it("has no field that reads as a Thai or English phrase", () => {
		const raw = readFileSync(join(DATA_DIR, "originality-corpus.json"), "utf8");

		// Matched substrings rather than `expect(raw).not.toMatch(...)`: the
		// artifact is 600 kB of hex, and asserting on the whole string prints
		// all of it on failure, burying the one field that actually leaked.

		// Thai is what the source material is mostly written in; a single Thai
		// codepoint anywhere in the artifact means text leaked into it.
		expect(raw.match(/[\u0e00-\u0e7f]+/)?.[0]).toBeUndefined();
		// Two adjacent words separated by whitespace is the smallest thing that
		// reads as a phrase. Field names like "sourceFlags" and tags like
		// "lesson-notes" carry no space and survive this.
		expect(raw.match(/[A-Za-z]{3,}\s+[A-Za-z]{3,}/)?.[0]).toBeUndefined();
		// And specifically: the phrases the canary proves ARE in the corpus are
		// not recoverable from the file that proves it.
		for (const { phrase } of CANARIES) {
			expect(raw).not.toContain(phrase);
			expect(raw).not.toContain(tokenize(phrase).join(" "));
		}
	});

	// AC3
	it("is queried at n = 5, configured at one site", () => {
		expect(NGRAM_WIDTH).toBe(5);

		const module = readFileSync(join(DATA_DIR, "originality.ts"), "utf8");
		expect(module.match(/NGRAM_WIDTH\s*=/g)).toHaveLength(1);

		// The Python builder's own default is the same number, and the artifact
		// records the width it was actually built at.
		const builder = readFileSync(
			join(REPO_ROOT, "scripts", "build-originality-corpus.py"),
			"utf8",
		);
		expect(builder).toContain(`DEFAULT_NGRAM_WIDTH = ${NGRAM_WIDTH}`);
		expect(builder.match(/^DEFAULT_NGRAM_WIDTH = /gm)).toHaveLength(1);
		expect(loadedCorpus().ngramWidth).toBe(NGRAM_WIDTH);
	});

	// AC3 — the constant cannot drift from the data it queries.
	it("refuses a corpus built at any other width", async () => {
		const load = corpusWith({ ngramWidth: 8 });

		expect(isCorpusLoaded(load)).toBe(false);
		expect(await checkOriginality(ORIGINAL_PROSE, load)).toMatchObject({
			status: "not-checked",
		});
	});
});

describe("the canary", () => {
	// AC4
	it("detects a phrase that is verbatim in each licensed set", async () => {
		for (const canary of CANARIES) {
			const result = await checkOriginality(canary.phrase);

			expect(result.status).toBe("overlapping");
			if (result.status !== "overlapping") return;
			expect(result.overlap.ngram).toBe(
				tokenize(canary.phrase).slice(0, NGRAM_WIDTH).join(" "),
			);
		}
	});

	// AC4 — the converse, so the canary is not just "everything overlaps".
	it("clears prose that is not in the source", async () => {
		await expect(assertOriginal(ORIGINAL_PROSE)).resolves.toBeUndefined();
	});
});

describe("the corpus size floor", () => {
	// AC5
	it("fails a corpus holding fewer tokens than the floor", async () => {
		const load = corpusWith({ tokenCount: MINIMUM_CORPUS_TOKENS - 1 });

		expect(isCorpusLoaded(load)).toBe(false);
		const result = await checkOriginality(ORIGINAL_PROSE, load);
		expect(result.status).toBe("not-checked");
		await expect(assertOriginal(ORIGINAL_PROSE, load)).rejects.toThrow(
			/not checked/,
		);
	});

	// AC5
	it("fails an empty corpus rather than clearing everything put to it", async () => {
		const load = corpusWith({ ngrams: {} });

		expect(isCorpusLoaded(load)).toBe(false);
		// The phrase the real corpus flags: an empty corpus must not clear it.
		const result = await checkOriginality(CANARIES[0].phrase, load);
		expect(result.status).toBe("not-checked");
		await expect(assertOriginal(CANARIES[0].phrase, load)).rejects.toThrow();
	});

	// AC5
	it("fails an unreadable corpus", async () => {
		for (const raw of [null, "truncated", {}, { salt: "abc" }]) {
			expect(isCorpusLoaded(loadOriginalityCorpus(raw))).toBe(false);
		}
	});

	// AC5 — a corpus missing a whole PDF set is not a small corpus, it is broken.
	it("fails a corpus missing one of the two required sets", () => {
		const corpus = loadedCorpus();
		const notesOnly = Object.fromEntries(
			Object.entries(corpus.ngrams).map(([hash]) => [hash, 1]),
		);

		const load = corpusWith({ ngrams: notesOnly });

		expect(isCorpusLoaded(load)).toBe(false);
		expect(load).toMatchObject({ reason: /recording-script/ });
	});
});

describe("detection over the 82 shipped mnemonics", () => {
	// AC6
	it("measures and records the rate", async () => {
		const mnemonics = shippedMnemonics();
		expect(mnemonics).toHaveLength(MEASURED_DETECTION.total);

		let detected = 0;
		for (const mnemonic of mnemonics) {
			const result = await checkOriginality(mnemonic);
			expect(result.status).not.toBe("not-checked");
			if (result.status === "overlapping") detected += 1;
		}

		expect(detected).toBe(MEASURED_DETECTION.detected);
	});
});

describe("the three states a candidate can be in", () => {
	// AC7
	it("clears a candidate with no overlap", async () => {
		const result = await checkOriginality(ORIGINAL_PROSE);

		expect(result.status).toBe("cleared");
	});

	// AC7
	it("reports which n-gram overlapped", async () => {
		const result = await checkOriginality(
			`Nobody expects ${CANARIES[0].phrase} to be original.`,
		);

		expect(result.status).toBe("overlapping");
		if (result.status !== "overlapping") return;
		expect(result.overlap.ngram).toBe("lesson notes thai alphabet made");
		expect(result.overlap.sources).toEqual(["lesson-notes"]);
	});

	// AC7
	it("reports a failed corpus as not-checked, never as cleared", async () => {
		const result = await checkOriginality(
			ORIGINAL_PROSE,
			loadOriginalityCorpus(null),
		);

		expect(result.status).toBe("not-checked");
		expect(result.status).not.toBe("cleared");
		if (result.status !== "not-checked") return;
		expect(result.reason).toBeTruthy();
	});

	// AC7 — the three are three, not two with an alias.
	it("uses three distinct status values", async () => {
		const statuses = [
			(await checkOriginality(ORIGINAL_PROSE)).status,
			(await checkOriginality(CANARIES[0].phrase)).status,
			(await checkOriginality(ORIGINAL_PROSE, loadOriginalityCorpus(null)))
				.status,
		];

		expect(new Set(statuses).size).toBe(3);
		expect(statuses).toEqual(["cleared", "overlapping", "not-checked"]);
	});
});
