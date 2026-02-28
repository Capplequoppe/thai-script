import { describe, expect, it } from "vitest";
import {
	generateCardsForLesson,
	generateToneRuleCards,
} from "./ScriptCardGenerator";

describe("generateCardsForLesson", () => {
	it("generates 6 property cards per consonant with audio for lesson 1 (ม, น)", () => {
		const cards = generateCardsForLesson(1);
		const consonantCards = cards.filter(
			(c) => c.id.startsWith("ม:") || c.id.startsWith("น:"),
		);
		expect(consonantCards).toHaveLength(12);
	});

	it("generates 4 property cards per vowel with audio for lesson 1 (า)", () => {
		const cards = generateCardsForLesson(1);
		const vowelCards = cards.filter((c) => c.id.startsWith("า:"));
		expect(vowelCards).toHaveLength(4);
	});

	it("each card has question, correctAnswer, and choices containing the answer", () => {
		const cards = generateCardsForLesson(1);
		for (const card of cards) {
			expect(card.question).toBeTruthy();
			expect(card.correctAnswer).toBeTruthy();
			expect(card.choices.length).toBeGreaterThanOrEqual(2);
			expect(card.choices).toContain(card.correctAnswer);
		}
	});

	it("generates unique card IDs", () => {
		const cards = generateCardsForLesson(1);
		const ids = cards.map((c) => c.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("populates audioUrl on consonant and vowel cards", () => {
		const cards = generateCardsForLesson(1);
		const consonantCards = cards.filter((c) => c.id.startsWith("ม:"));
		for (const card of consonantCards) {
			expect(card.audioUrl).toBe("/thai-script/audio/consonant-mo-ma.mp3");
		}
		const vowelCards = cards.filter((c) => c.id.startsWith("า:"));
		for (const card of vowelCards) {
			expect(card.audioUrl).toBe("/thai-script/audio/sara-a-long.mp3");
		}
	});

	it("includes tone rule cards when lesson has them", () => {
		const cards = generateCardsForLesson(2); // lesson 2 has tone rule "low-live"
		const toneCards = cards.filter((c) => c.id.startsWith("tone-rule:"));
		expect(toneCards.length).toBeGreaterThanOrEqual(1);
	});

	it("audioRecognition card has empty symbolCharacter and valid audioUrl", () => {
		const cards = generateCardsForLesson(1);
		const audioCards = cards.filter((c) => c.property === "audioRecognition");
		expect(audioCards.length).toBeGreaterThanOrEqual(1);
		for (const card of audioCards) {
			expect(card.symbolCharacter).toBe("");
			expect(card.audioUrl).toBeTruthy();
			expect(card.question).toBe("Listen to the audio. Which symbol is this?");
			expect(card.choices).toContain(card.correctAnswer);
		}
	});

	it("consonants without audioUrl still produce 5 cards", () => {
		const cards = generateCardsForLesson(22);
		// ฃ, ฅ, ฌ have no audioUrl
		for (const char of ["ฃ", "ฅ", "ฌ"]) {
			const charCards = cards.filter((c) => c.id.startsWith(`${char}:`));
			expect(charCards).toHaveLength(5);
			expect(
				charCards.find((c) => c.property === "audioRecognition"),
			).toBeUndefined();
		}
	});
});

describe("generateToneRuleCards", () => {
	it("generates cards for tone rules introduced in lesson 2", () => {
		const cards = generateToneRuleCards(2);
		expect(cards.length).toBeGreaterThanOrEqual(1);
		expect(cards[0]!.id).toContain("tone-rule:");
	});

	it("returns empty for lessons with no tone rules", () => {
		const cards = generateToneRuleCards(1);
		expect(cards).toHaveLength(0);
	});

	it("generates tone mark rule cards for lesson 17", () => {
		const cards = generateToneRuleCards(17);
		const markRuleCards = cards.filter((c) =>
			c.id.startsWith("tone-mark-rule:"),
		);
		expect(markRuleCards.length).toBeGreaterThanOrEqual(1);
	});
});
