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
		// นอก is stored with `vowel: null` and the อ dropped, so the rules read
		// it as closed-with-nothing-written and give high where the word is
		// falling. Better to ask nothing than to ask this.
		expect(toneRuleComponentsOf(wordFor("นอก"))).toBeNull();
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
