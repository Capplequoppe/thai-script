import { describe, expect, it } from "vitest";
import type { VocabularyCard } from "../../domain/vocabulary/types";
import { bestVocabStage } from "./vocabStage";

function card(
	thai: string,
	property: string,
	learningStep: number | null,
	interval: number,
): VocabularyCard {
	return {
		id: `vocab:${thai}:${property}`,
		question: "q",
		correctAnswer: "a",
		choices: ["a", "b"],
		promptWord: thai,
		property: property as VocabularyCard["property"],
		srs: {
			easeFactor: 2,
			interval,
			repetitions: 1,
			learningStep,
			nextReviewDate: "2026-01-01T00:00:00.000Z",
			lastReviewDate: null,
		},
	};
}

function byId(cards: VocabularyCard[]): Record<string, VocabularyCard> {
	return Object.fromEntries(cards.map((c) => [c.id, c]));
}

describe("bestVocabStage", () => {
	it("returns Apprentice for a word with no cards yet", () => {
		expect(bestVocabStage("มา", {})).toBe("Apprentice");
	});

	it("returns the single card's stage when there is only one", () => {
		const cards = byId([card("มา", "thaiToEnglish", null, 10)]);
		expect(bestVocabStage("มา", cards)).toBe("Guru");
	});

	it("returns the most-advanced stage across a word's several cards", () => {
		const cards = byId([
			card("มา", "thaiToEnglish", null, 60_480), // Enlightened
			card("มา", "englishToThai", 1, 0), // Apprentice
			card("มา", "spelling", null, 10), // Guru
		]);
		expect(bestVocabStage("มา", cards)).toBe("Enlightened");
	});

	it("only counts cards for the requested word", () => {
		const cards = byId([
			card("มา", "thaiToEnglish", 1, 0), // Apprentice
			card("กิน", "thaiToEnglish", null, 60_480), // Enlightened, different word
		]);
		expect(bestVocabStage("มา", cards)).toBe("Apprentice");
	});
});
