import { describe, expect, it } from "vitest";
import { DEFAULT_SRS_DATA } from "../../shared/types";
import type { VocabularyCard } from "../types";
import { repairToneAnswers } from "./repairToneAnswers";

function card(overrides: Partial<VocabularyCard> = {}): VocabularyCard {
	return {
		id: "vocab:ทุก:toneIdentification",
		promptWord: "ทุก",
		property: "toneIdentification",
		question: "What is the tone of each syllable?",
		correctAnswer: "falling",
		choices: [],
		syllables: [{ text: "ทุก", tone: "falling" }],
		srs: { ...DEFAULT_SRS_DATA },
		...overrides,
	} as VocabularyCard;
}

describe("repairToneAnswers", () => {
	it("rewrites a persisted tone answer the generator now disagrees with", () => {
		const persisted = [card({ correctAnswer: "falling" })];
		const generated = [
			card({
				correctAnswer: "high",
				syllables: [{ text: "ทุก", tone: "high" }],
			}),
		];

		const [repaired] = repairToneAnswers(persisted, generated);

		expect(repaired?.correctAnswer).toBe("high");
		expect(repaired?.syllables).toEqual([{ text: "ทุก", tone: "high" }]);
	});

	it("keeps the card's review history and choices", () => {
		const srs = { ...DEFAULT_SRS_DATA, repetitions: 9, interval: 4320 };
		const persisted = [card({ srs, choices: ["a", "b"] })];
		const generated = [card({ correctAnswer: "high", choices: ["b", "a"] })];

		const [repaired] = repairToneAnswers(persisted, generated);

		expect(repaired?.srs).toEqual(srs);
		expect(repaired?.choices).toEqual(["a", "b"]);
	});

	it("returns nothing when the answer already agrees", () => {
		expect(repairToneAnswers([card()], [card()])).toEqual([]);
	});

	it("ignores properties other than toneIdentification", () => {
		const persisted = [
			card({
				id: "vocab:ทุก:thaiToEnglish",
				property: "thaiToEnglish",
				correctAnswer: "every",
			}),
		];
		const generated = [
			card({
				id: "vocab:ทุก:thaiToEnglish",
				property: "thaiToEnglish",
				correctAnswer: "all",
			}),
		];

		expect(repairToneAnswers(persisted, generated)).toEqual([]);
	});

	it("leaves a persisted card alone when the generator no longer produces one", () => {
		// The word's syllable split is unreliable, so no tone card is generated
		// any more. Correcting an answer and deleting a learner's card are
		// different decisions; this only does the first.
		expect(repairToneAnswers([card()], [])).toEqual([]);
	});
});
