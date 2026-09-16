/**
 * The derivation a learner is asked to perform from memory, checked against
 * the corpus they will meet it in.
 *
 * These assertions are about *agreement*: the explanation shown on a word card
 * has to be the rule that actually produces the tone stored beside it, or the
 * card is teaching a derivation that does not work.
 */
import { describe, expect, it } from "vitest";
import vocabularyData from "../data/vocabulary.json";
import type { VocabEntry } from "../types";
import { syllableShapeOf, toneExplanationFor } from "./toneExplanation";

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
		expect(agreed / compared).toBeGreaterThan(0.9);
	});
});
