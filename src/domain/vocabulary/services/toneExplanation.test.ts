/**
 * The derivation a learner is asked to perform from memory, checked against
 * the corpus they will meet it in.
 *
 * These assertions are about *agreement*: the explanation shown on a word card
 * has to be the rule that actually produces the tone stored beside it, or the
 * card is teaching a derivation that does not work.
 */
import { describe, expect, it } from "vitest";
import { toneMarkRules } from "../../script/data/symbols";
import vocabularyData from "../data/vocabulary.json";
import type { VocabEntry } from "../types";
import {
	CORPUS_MARK_ID,
	MARK_LABEL,
	syllableShapeOf,
	toneExplanationFor,
} from "./toneExplanation";

const corpus = vocabularyData as unknown as VocabEntry[];

function wordFor(thai: string): VocabEntry {
	const entry = corpus.find((candidate) => candidate.thai === thai);
	if (!entry) throw new Error(`${thai} is not in the corpus`);
	return entry;
}

describe("syllableShapeOf", () => {
	it("reads a closed syllable with no written vowel as dead-short", () => {
		// The implicit vowel of a closed syllable is short /o/ — พบ is /pʰóp/,
		// high, not falling. Getting this wrong is the defect that shipped on
		// both sides of the comparison at once and so looked like agreement.
		expect(syllableShapeOf({ vowel: null, finalConsonant: "บ" })).toBe(
			"dead-short",
		);
	});

	it("reads a written long vowel with a stop as dead-long", () => {
		expect(syllableShapeOf({ vowel: "า", finalConsonant: "ด" })).toBe(
			"dead-long",
		);
	});

	it("reads a sonorant final as live whatever the vowel", () => {
		expect(syllableShapeOf({ vowel: "ั", finalConsonant: "น" })).toBe("live");
	});

	it("treats อ as the vowel's prop rather than a final", () => {
		// มือ, คือ, เสือ — the อ props the vowel up, it does not close it.
		expect(syllableShapeOf({ vowel: "ื", finalConsonant: "อ" })).toBe("live");
	});
});

describe("toneExplanationFor", () => {
	it("names the spelling rule and the lesson that teaches it", () => {
		const explanation = toneExplanationFor({
			consonantClass: "low",
			vowel: null,
			finalConsonant: "บ",
			toneMark: null,
			tone: "high",
		});
		expect(explanation?.ruleId).toBe("low-dead-short");
		expect(explanation?.tone).toBe("high");
		expect(explanation?.description).toMatch(/high tone/i);
		expect(explanation?.disagreesWithStored).toBe(false);
	});

	it("prefers the tone mark over the spelling rule, because the mark wins", () => {
		const explanation = toneExplanationFor({
			consonantClass: "mid",
			vowel: "ั",
			finalConsonant: "น",
			toneMark: "mayek",
			tone: "low",
		});
		expect(explanation?.description).toContain("mai ek");
		expect(explanation?.tone).toBe("low");
	});

	it("says so when the rule does not produce the stored tone", () => {
		const explanation = toneExplanationFor({
			consonantClass: "low",
			vowel: null,
			finalConsonant: "บ",
			toneMark: null,
			// The rule gives high; a word stored as falling is an exception and
			// the card should admit it rather than assert the rule.
			tone: "falling",
		});
		expect(explanation?.disagreesWithStored).toBe(true);
	});

	it("returns nothing for a syllable with no classified initial", () => {
		expect(
			toneExplanationFor({
				consonantClass: null,
				vowel: "า",
				finalConsonant: null,
				toneMark: null,
				tone: null,
			}),
		).toBeUndefined();
	});
});

describe("against the corpus", () => {
	it("explains พบ as low class, dead, short — and so high", () => {
		const [syllable] = wordFor("พบ").syllables;
		const explanation = toneExplanationFor(syllable);
		expect(syllable.tone).toBe("high");
		expect(explanation?.ruleId).toBe("low-dead-short");
		expect(explanation?.disagreesWithStored).toBe(false);
	});

	/**
	 * Recorded, not asserted to be perfect. A verified word is one whose tones
	 * the taught rules reproduce, so the explanation should agree with the
	 * stored tone on essentially all of them — but อักษรนำ is resolved in the
	 * corpus and not here, so a governed syllable disagrees by design. The
	 * number is what catches a change that quietly breaks the derivation.
	 */
	it("agrees with the stored tone on almost every verified syllable", () => {
		let compared = 0;
		let agreed = 0;
		for (const entry of corpus) {
			if (entry.toneStatus !== "verified") continue;
			for (const syllable of entry.syllables) {
				if (!syllable.tone) continue;
				const explanation = toneExplanationFor(syllable);
				if (!explanation) continue;
				compared += 1;
				if (!explanation.disagreesWithStored) agreed += 1;
			}
		}
		expect(compared).toBeGreaterThan(5000);
		// 98.5% as measured. The remainder is one identifiable corpus gap, not
		// noise: อ standing as the vowel (นอก, ขอ, พอ) is recorded with
		// `vowel: null` and the อ dropped, so the syllable reads as closed with
		// nothing written and comes out short. Raising this floor is what turns
		// the number into a guard — at 0.9 it had four points of slack, which is
		// room for a regression the size of the one this file exists to catch.
		expect(agreed / compared).toBeGreaterThan(0.98);
	});
});

describe("the two tone-mark dialects", () => {
	// The corpus and the lessons spell the four tone marks differently, and
	// both spellings are minted independently — `scripts/enrich-vocabulary.py`
	// writes the corpus id straight from the Unicode codepoint, `markRuleId`
	// in `memoryPalace.ts` builds the palace id from `toneMarkRules`.
	//
	// Nothing forces them to agree. What makes that dangerous rather than
	// merely untidy is the shape of the failure: `isWordMastered` asks whether
	// every id in an entry's `toneRules` is in the learner's mastered set, so a
	// single spelling drifting apart means affected words are **never
	// unlocked** — no exception, no warning, nothing in a log. The learner
	// reports "my vocabulary stopped growing", weeks later.

	it("maps every mark the lessons teach to a corpus id", () => {
		for (const rule of toneMarkRules) {
			expect(
				CORPUS_MARK_ID[rule.toneMarkName],
				`no corpus id for "${rule.toneMarkName}"`,
			).toBeDefined();
		}
	});

	it("round-trips both ways, so neither table can drift alone", () => {
		for (const [corpus, palace] of Object.entries(MARK_LABEL)) {
			expect(CORPUS_MARK_ID[palace]).toBe(corpus);
		}
		for (const [palace, corpus] of Object.entries(CORPUS_MARK_ID)) {
			expect(MARK_LABEL[corpus]).toBe(palace);
		}
	});

	it("produces rule ids the shipped corpus actually uses", () => {
		// The end-to-end check the two above cannot make: the ids this builds
		// have to be the ids sitting in `vocabulary.json`, or the join fails
		// however self-consistent the tables are.
		const inCorpus = new Set(
			(vocabularyData as unknown as VocabEntry[]).flatMap(
				(entry) => entry.toneRules ?? [],
			),
		);
		// A marked rule is one whose suffix is one of the four mark ids. The
		// spelling rules — `mid-dead-short`, `low-dead-long` — carry no mark
		// and are minted on the palace side alone, so they are not this
		// test's business.
		const markIds = new Set(Object.values(CORPUS_MARK_ID));
		const marked = [...inCorpus].filter((id) =>
			[...markIds].some((mark) => id.endsWith(`-${mark}`)),
		);
		expect(marked.length).toBeGreaterThan(0);

		const buildable = new Set(
			toneMarkRules.map(
				(rule) => `${rule.consonantClass}-${CORPUS_MARK_ID[rule.toneMarkName]}`,
			),
		);
		for (const id of marked) {
			expect(buildable, `corpus uses "${id}" and nothing mints it`).toContain(
				id,
			);
		}
	});
});
