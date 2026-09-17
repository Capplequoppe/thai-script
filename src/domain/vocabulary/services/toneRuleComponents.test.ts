/**
 * The gate on the derivation question.
 *
 * `toneSyllablesOf` asks "is this word's tone known?", which is enough to ask
 * a learner to *name* it. Assembling the rule needs a stronger promise: that
 * applying the taught rules to this spelling actually lands on the tone the
 * word is said with. These assert the gate holds that line, because the
 * failure it prevents is the demoralising one — picking the right class, the
 * right ending, and being told the result is wrong.
 */
import { describe, expect, it } from "vitest";
import vocabularyData from "../data/vocabulary.json";
import type { VocabEntry } from "../types";
import { toneExplanationFor } from "./toneExplanation";
import { toneRuleComponentsOf } from "./toneRuleComponents";
import { toneSyllableInfosOf, toneSyllablesOf } from "./toneSyllables";

const corpus = vocabularyData as unknown as VocabEntry[];

function wordFor(thai: string): VocabEntry {
	const entry = corpus.find((candidate) => candidate.thai === thai);
	if (!entry) throw new Error(`${thai} is not in the corpus`);
	return entry;
}

describe("toneRuleComponentsOf", () => {
	it("asks for the mark, not the ending, where a mark is written", () => {
		const [syllable] = toneRuleComponentsOf(wordFor("ที่")) ?? [];
		expect(syllable?.axis).toBe("mark");
		expect(syllable?.consonantClass).toBe("low");
		expect(syllable?.axisValue).toBe("mai ek");
		expect(syllable?.tone).toBe("falling");
	});

	it("asks for the ending where no mark is written", () => {
		const [syllable] = toneRuleComponentsOf(wordFor("จะ")) ?? [];
		expect(syllable?.axis).toBe("shape");
		expect(syllable?.consonantClass).toBe("mid");
		expect(syllable?.axisValue).toBe("dead-short");
		expect(syllable?.tone).toBe("low");
	});

	it("reads a bare consonant syllable as dead-short, so ข is low not rising", () => {
		// ขนาด: the ข stands alone with no vowel written and nothing closing
		// it, carrying the implicit short /a/. Reading that as a long open
		// syllable made it live, and high class + live is rising — which is
		// not how the word is said, so the whole word failed the gate.
		const components = toneRuleComponentsOf(wordFor("ขนาด"));
		expect(components).not.toBeNull();
		expect(components?.[0]?.axisValue).toBe("dead-short");
		expect(components?.[0]?.tone).toBe("low");
	});

	it("refuses a word the taught rules do not actually reach", () => {
		// Built rather than borrowed from the corpus, and deliberately so. This
		// assertion is about the gate, not about which words currently fail it,
		// and every real word that used to serve here has since been fixed into
		// deriving correctly — นอก was the third. A fixture that keeps needing
		// replacement as the data improves is testing the data, not the gate.
		const storedAgainstTheRule: VocabEntry = {
			...wordFor("จะ"),
			syllables: [
				{
					...wordFor("จะ").syllables[0],
					// mid class + dead short gives low. Stored as rising, so no
					// taught rule reaches it.
					tone: "rising",
				},
			],
		} as VocabEntry;

		expect(toneRuleComponentsOf(storedAgainstTheRule)).toBeNull();
	});

	it("still asks the plain tone question about a word it refuses to ask the rule for", () => {
		// The two gates are different questions and must not collapse into one:
		// a tone that is known but underivable is fine to *name*, and only
		// unfair to derive.
		const storedAgainstTheRule: VocabEntry = {
			...wordFor("จะ"),
			syllables: [{ ...wordFor("จะ").syllables[0], tone: "rising" }],
		} as VocabEntry;

		expect(toneRuleComponentsOf(storedAgainstTheRule)).toBeNull();
		expect(toneSyllablesOf(storedAgainstTheRule)).toHaveLength(1);
	});

	it("refuses a word whose tones are not verified at all", () => {
		const unverified = corpus.find((e) => e.toneStatus !== "verified");
		expect(unverified).toBeDefined();
		if (unverified) expect(toneRuleComponentsOf(unverified)).toBeNull();
	});

	/**
	 * The promise the card rests on, checked against every word that would be
	 * asked rather than a chosen few.
	 */
	it("never returns components whose rule disagrees with the stored tone", () => {
		let asked = 0;
		for (const entry of corpus) {
			const components = toneRuleComponentsOf(entry);
			if (!components) continue;
			asked += 1;

			const syllables = toneSyllableInfosOf(entry);
			expect(components).toHaveLength(syllables.length);

			components.forEach((component, index) => {
				const syllable = syllables[index];
				expect(component.text).toBe(syllable?.text);
				expect(component.tone).toBe(syllable?.tone);
				expect(toneExplanationFor(syllable!)?.disagreesWithStored).toBe(false);
			});
		}
		expect(asked).toBeGreaterThan(4000);
	});

	it("only ever asks about words the tone quiz would also ask about", () => {
		for (const entry of corpus.slice(0, 500)) {
			if (toneRuleComponentsOf(entry) === null) continue;
			expect(toneSyllablesOf(entry).length).toBeGreaterThan(0);
		}
	});
});
