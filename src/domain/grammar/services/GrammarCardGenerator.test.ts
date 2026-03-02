import { describe, expect, it } from "vitest";
import type { VocabEntry } from "../../vocabulary/types";
import type { GrammarEntry } from "../types";
import { generateGrammarCards } from "./GrammarCardGenerator";

function makeVocabEntry(
	thai: string,
	english: string,
	wordClass: string,
): VocabEntry {
	return {
		thai,
		english,
		romanization: "test",
		word_class: wordClass,
		rank: null,
		frequency: 0,
		mnemonic: null,
		characters: [],
		syllables: [],
		toneRules: [],
		thai_audio_file: null,
		english_audio_file: null,
		image_file: null,
		samples: [],
		source: "test",
	};
}

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
				breakdown: "เขา (he) + กิน (eat) + ข้าว (rice)",
				words: [
					{ thai: "เขา", gloss: "he" },
					{ thai: "กิน", gloss: "eat" },
					{ thai: "ข้าว", gloss: "rice" },
				],
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
				incorrectExamples: [
					{
						words: [
							{ thai: "ข้าว", gloss: "rice" },
							{ thai: "กิน", gloss: "eat" },
							{ thai: "เขา", gloss: "he" },
						],
					},
					{
						words: [
							{ thai: "กิน", gloss: "eat" },
							{ thai: "เขา", gloss: "he" },
							{ thai: "ข้าว", gloss: "rice" },
						],
					},
					{
						words: [
							{ thai: "เขา", gloss: "he" },
							{ thai: "ข้าว", gloss: "rice" },
							{ thai: "กิน", gloss: "eat" },
						],
					},
				],
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
		const recognition = cards.find(
			(c) => c.property === "recognition",
		) as NonNullable<(typeof cards)[number]>;
		expect(recognition.id).toBe("grammar:svo-basic:recognition");
		expect(recognition.grammarId).toBe("svo-basic");
		expect(recognition.question).toBe("What does the SVO pattern express?");
		expect(recognition.correctAnswer).toBe(
			"Subject performing action on object",
		);
	});

	it("generates an application card with glossed correct answer", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const application = cards.find(
			(c) => c.property === "application",
		) as NonNullable<(typeof cards)[number]>;
		expect(application.id).toBe("grammar:svo-basic:application");
		expect(application.grammarId).toBe("svo-basic");
		expect(application.correctAnswer).toBe("เขา(he) กิน(eat) ข้าว(rice)");
	});

	it("recognition card has 4 choices including correct answer", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const recognition = cards.find(
			(c) => c.property === "recognition",
		) as NonNullable<(typeof cards)[number]>;
		expect(recognition.choices).toHaveLength(4);
		expect(recognition.choices).toContain(
			"Subject performing action on object",
		);
	});

	it("application card has 4 glossed choices including correct example", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const application = cards.find(
			(c) => c.property === "application",
		) as NonNullable<(typeof cards)[number]>;
		expect(application.choices).toHaveLength(4);
		expect(application.choices).toContain("เขา(he) กิน(eat) ข้าว(rice)");
		expect(application.choices).toContain("ข้าว(rice) กิน(eat) เขา(he)");
		expect(application.choices).toContain("กิน(eat) เขา(he) ข้าว(rice)");
		expect(application.choices).toContain("เขา(he) ข้าว(rice) กิน(eat)");
	});

	it("cards have initialized SRS data", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		for (const card of cards) {
			expect(card.srs.easeFactor).toBe(2.5);
			expect(card.srs.learningStep).toBe(1);
			expect(card.srs.lapseCount).toBe(0);
		}
	});
});

describe("generateGrammarCards with applicationTemplate", () => {
	const masteredVocab: VocabEntry[] = [
		makeVocabEntry("คน", "person", "n"),
		makeVocabEntry("น้ำ", "water", "n"),
		makeVocabEntry("บ้าน", "house", "n"),
		makeVocabEntry("กิน", "eat", "v"),
		makeVocabEntry("ไป", "go", "v"),
		makeVocabEntry("เขา", "he", "pron"),
		makeVocabEntry("ฉัน", "I", "pron"),
	];

	it("generates application card with dynamic words from mastered vocab", () => {
		const entry = makeGrammarEntry({
			applicationTemplate: {
				slots: [
					{ role: "subject", wordClass: "pron", fallbackWordClasses: ["n"] },
					{ role: "verb", wordClass: "v" },
					{ role: "object", wordClass: "n" },
				],
				functionWords: [],
				distractorPatterns: [
					["object", "verb", "subject"],
					["verb", "subject", "object"],
					["object", "subject", "verb"],
				],
			},
		});

		const cards = generateGrammarCards(entry, masteredVocab);
		const app = cards.find((c) => c.property === "application")!;

		// Correct answer should be glossed format with 3 words
		const parts = app.correctAnswer.split(" ");
		expect(parts).toHaveLength(3);
		for (const part of parts) {
			expect(part).toMatch(/^.+\(.+\)$/);
		}
		expect(app.choices).toHaveLength(4);
	});

	it("places function words at 'end' position correctly", () => {
		const entry = makeGrammarEntry({
			applicationTemplate: {
				slots: [
					{ role: "subject", wordClass: "pron", fallbackWordClasses: ["n"] },
					{ role: "verb", wordClass: "v" },
					{ role: "object", wordClass: "n" },
				],
				functionWords: [{ thai: "ไหม", gloss: "?", position: "end" }],
				distractorPatterns: [
					["object", "verb", "subject"],
					["verb", "subject", "object"],
					["object", "subject", "verb"],
				],
			},
		});

		const cards = generateGrammarCards(entry, masteredVocab);
		const app = cards.find((c) => c.property === "application")!;

		expect(app.correctAnswer).toMatch(/ไหม\(\?\)$/);
	});

	it("distractors reorder slot words per distractorPatterns", () => {
		const entry = makeGrammarEntry({
			applicationTemplate: {
				slots: [
					{ role: "subject", wordClass: "pron", fallbackWordClasses: ["n"] },
					{ role: "verb", wordClass: "v" },
					{ role: "object", wordClass: "n" },
				],
				functionWords: [],
				distractorPatterns: [
					["object", "verb", "subject"],
					["verb", "subject", "object"],
					["object", "subject", "verb"],
				],
			},
		});

		const cards = generateGrammarCards(entry, masteredVocab);
		const app = cards.find((c) => c.property === "application")!;

		const unique = new Set(app.choices);
		expect(unique.size).toBe(4);
	});

	it("uses fallback word classes when primary has no entries", () => {
		const limitedVocab: VocabEntry[] = [
			makeVocabEntry("คน", "person", "n"),
			makeVocabEntry("น้ำ", "water", "n"),
			makeVocabEntry("กิน", "eat", "v"),
		];

		const entry = makeGrammarEntry({
			applicationTemplate: {
				slots: [
					{ role: "subject", wordClass: "pron", fallbackWordClasses: ["n"] },
					{ role: "verb", wordClass: "v" },
					{ role: "object", wordClass: "n" },
				],
				functionWords: [],
				distractorPatterns: [
					["object", "verb", "subject"],
					["verb", "subject", "object"],
					["object", "subject", "verb"],
				],
			},
		});

		const cards = generateGrammarCards(entry, limitedVocab);
		const app = cards.find((c) => c.property === "application")!;
		expect(app.correctAnswer).toBeDefined();
		expect(app.choices).toHaveLength(4);
	});

	it("falls back to static examples when no applicationTemplate is present", () => {
		const cards = generateGrammarCards(makeGrammarEntry());
		const app = cards.find((c) => c.property === "application")!;
		expect(app.correctAnswer).toBe("เขา(he) กิน(eat) ข้าว(rice)");
	});

	it("falls back to static examples when masteredVocab is not provided", () => {
		const entry = makeGrammarEntry({
			applicationTemplate: {
				slots: [
					{ role: "subject", wordClass: "pron" },
					{ role: "verb", wordClass: "v" },
				],
				functionWords: [],
				distractorPatterns: [["verb", "subject"]],
			},
		});

		const cards = generateGrammarCards(entry);
		const app = cards.find((c) => c.property === "application")!;
		expect(app.correctAnswer).toBe("เขา(he) กิน(eat) ข้าว(rice)");
	});

	it("function word at 'before-verb' position is placed correctly", () => {
		const entry = makeGrammarEntry({
			applicationTemplate: {
				slots: [
					{ role: "subject", wordClass: "pron", fallbackWordClasses: ["n"] },
					{ role: "verb", wordClass: "v" },
					{ role: "object", wordClass: "n" },
				],
				functionWords: [{ thai: "ไม่", gloss: "not", position: "before-verb" }],
				distractorPatterns: [
					["object", "verb", "subject"],
					["verb", "subject", "object"],
					["object", "subject", "verb"],
				],
			},
		});

		const cards = generateGrammarCards(entry, masteredVocab);
		const app = cards.find((c) => c.property === "application")!;

		const parts = app.correctAnswer.split(" ");
		const maiIdx = parts.findIndex((p) => p.startsWith("ไม่"));
		expect(maiIdx).toBeGreaterThan(0);
		expect(maiIdx).toBeLessThan(parts.length - 1);
	});

	it("falls back to static when 2-slot template cannot produce enough distractors", () => {
		const entry = makeGrammarEntry({
			applicationTemplate: {
				slots: [
					{ role: "subject", wordClass: "pron", fallbackWordClasses: ["n"] },
					{ role: "adjective", wordClass: "adj" },
				],
				functionWords: [],
				distractorPatterns: [["adjective", "subject"]],
			},
		});

		const cards = generateGrammarCards(entry, masteredVocab);
		const app = cards.find((c) => c.property === "application")!;
		// Falls back to static since 2-slot template can't produce 3 unique distractors
		expect(app.correctAnswer).toBe("เขา(he) กิน(eat) ข้าว(rice)");
		expect(app.choices).toHaveLength(4);
	});

	it("function word with insertAfter is placed after the specified role", () => {
		const entry = makeGrammarEntry({
			applicationTemplate: {
				slots: [
					{ role: "subject", wordClass: "pron", fallbackWordClasses: ["n"] },
					{ role: "thing", wordClass: "n" },
					{ role: "owner", wordClass: "n" },
				],
				functionWords: [
					{ thai: "ของ", gloss: "of", position: "end", insertAfter: "thing" },
				],
				distractorPatterns: [
					["owner", "thing", "subject"],
					["thing", "subject", "owner"],
					["subject", "owner", "thing"],
				],
			},
		});

		const cards = generateGrammarCards(entry, masteredVocab);
		const app = cards.find((c) => c.property === "application")!;

		// ของ(of) should appear after the thing word
		const parts = app.correctAnswer.split(" ");
		const khongIdx = parts.findIndex((p) => p.startsWith("ของ"));
		expect(khongIdx).toBe(2); // subject, thing, ของ, owner
		expect(parts).toHaveLength(4);
	});
});
