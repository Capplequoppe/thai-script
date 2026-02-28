import { describe, expect, it } from "vitest";
import type { GrammarEntry } from "../types";
import { generateGrammarCards } from "./GrammarCardGenerator";

function makeGrammarEntry(overrides?: Partial<GrammarEntry>): GrammarEntry {
	return {
		id: "svo-basic",
		title: "Basic SVO",
		explanation: "Thai follows Subject-Verb-Object order",
		pattern: "[Subject] [Verb] [Object]",
		lessonNumber: 1,
		prerequisites: { minVocabByClass: { n: 2, v: 2 } },
		examples: [
			{
				thai: "เขากินข้าว",
				romanization: "khao gin khao",
				english: "He eats rice",
				breakdown: "[เขา=he] [กิน=eat] [ข้าว=rice]",
			},
			{
				thai: "ฉันดื่มน้ำ",
				romanization: "chan duem nam",
				english: "I drink water",
			},
		],
		cards: {
			recognition: {
				question: "What does the SVO pattern express?",
				correctAnswer: "Subject performing action on object",
				distractors: [
					"Object receiving action from subject",
					"A question about the subject",
					"A description of the subject",
				],
			},
			application: {
				question: "Which sentence correctly uses SVO order?",
				correctExample: 0,
				incorrectExamples: ["ข้าวกินเขา", "กินเขาข้าว", "เขาข้าวกิน"],
			},
		},
		...overrides,
	};
}

describe("generateGrammarCards", () => {
	it("generates exactly 2 cards per grammar entry", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		expect(cards).toHaveLength(2);
	});

	it("generates a recognition card with correct ID format", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const recognition = cards.find((c) => c.property === "recognition")!;
		expect(recognition.id).toBe("grammar:svo-basic:recognition");
		expect(recognition.grammarId).toBe("svo-basic");
		expect(recognition.question).toBe("What does the SVO pattern express?");
		expect(recognition.correctAnswer).toBe(
			"Subject performing action on object",
		);
	});

	it("generates an application card with correct example as answer", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const application = cards.find((c) => c.property === "application")!;
		expect(application.id).toBe("grammar:svo-basic:application");
		expect(application.grammarId).toBe("svo-basic");
		expect(application.correctAnswer).toBe("เขากินข้าว");
	});

	it("recognition card has 4 choices including correct answer", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const recognition = cards.find((c) => c.property === "recognition")!;
		expect(recognition.choices).toHaveLength(4);
		expect(recognition.choices).toContain(
			"Subject performing action on object",
		);
	});

	it("application card has 4 choices including correct example", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const application = cards.find((c) => c.property === "application")!;
		expect(application.choices).toHaveLength(4);
		expect(application.choices).toContain("เขากินข้าว");
	});

	it("cards have initialized SRS data", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		for (const card of cards) {
			expect(card.srs.easeFactor).toBe(2.0);
			expect(card.srs.learningStep).toBe(1);
			expect(card.srs.lapseCount).toBe(0);
		}
	});
});
