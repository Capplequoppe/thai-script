import { describe, expect, it } from "vitest";
import type { SentenceEntry } from "../types";
import { generateSentenceCards } from "./SentenceCardGenerator";

function makeSentenceEntry(overrides?: Partial<SentenceEntry>): SentenceEntry {
	return {
		id: "greet-001",
		thai: "มา กิน กัน",
		romanization: "maa kin kan",
		english: "Come eat together",
		words: ["มา", "กิน", "กัน"],
		difficulty: 1,
		thai_audio_file: null,
		cards: {
			readingComprehension: {
				distractors: [
					"Come sleep together",
					"Go eat alone",
					"Come drink together",
				],
			},
		},
		...overrides,
	};
}

function makeSentenceEntryWithAudio(
	overrides?: Partial<SentenceEntry>,
): SentenceEntry {
	return makeSentenceEntry({
		thai_audio_file: "/audio/greet-001.mp3",
		cards: {
			readingComprehension: {
				distractors: [
					"Come sleep together",
					"Go eat alone",
					"Come drink together",
				],
			},
			listeningComprehension: {
				distractors: [
					"Come sleep together",
					"Go eat alone",
					"Come drink together",
				],
			},
			sentenceBuilding: {
				characterDistractors: ["ไ", "ป", "ห", "ร", "อ"],
			},
		},
		...overrides,
	});
}

describe("generateSentenceCards", () => {
	it("generates exactly 1 card for entry without audio", () => {
		const cards = generateSentenceCards(makeSentenceEntry());
		expect(cards).toHaveLength(1);
	});

	it("generates 4 cards for entry with audio and all card types", () => {
		const cards = generateSentenceCards(makeSentenceEntryWithAudio());
		expect(cards).toHaveLength(4);
	});

	it("generates reading comprehension card with correct ID format", () => {
		const cards = generateSentenceCards(makeSentenceEntry());
		const rc = cards.find((c) => c.property === "readingComprehension");
		expect(rc).toBeDefined();
		expect(rc!.id).toBe("sentence:greet-001:readingComprehension");
		expect(rc!.sentenceId).toBe("greet-001");
		expect(rc!.question).toBe("มา กิน กัน");
		expect(rc!.correctAnswer).toBe("Come eat together");
	});

	it("reading comprehension card has 4 choices including correct answer", () => {
		const cards = generateSentenceCards(makeSentenceEntry());
		const rc = cards.find((c) => c.property === "readingComprehension")!;
		expect(rc.choices).toHaveLength(4);
		expect(rc.choices).toContain("Come eat together");
	});

	it("listening comprehension card has audio URL", () => {
		const cards = generateSentenceCards(makeSentenceEntryWithAudio());
		const lc = cards.find((c) => c.property === "listeningComprehension");
		expect(lc).toBeDefined();
		expect(lc!.audioUrl).toBe("/audio/greet-001.mp3");
		expect(lc!.choices).toHaveLength(4);
		expect(lc!.choices).toContain("Come eat together");
	});

	it("sentence building card contains sentence chars and distractors", () => {
		const cards = generateSentenceCards(makeSentenceEntryWithAudio());
		const sb = cards.find((c) => c.property === "sentenceBuilding");
		expect(sb).toBeDefined();
		expect(sb!.correctAnswer).toBe("มา กิน กัน");
		expect(sb!.audioUrl).toBe("/audio/greet-001.mp3");
		// Should contain the sentence characters plus distractor characters
		const sentenceChars = [..."มากินกัน"];
		for (const ch of sentenceChars) {
			expect(sb!.choices).toContain(ch);
		}
	});

	it("self-validation card is flashcard style with no choices", () => {
		const cards = generateSentenceCards(makeSentenceEntryWithAudio());
		const sv = cards.find((c) => c.property === "selfValidation");
		expect(sv).toBeDefined();
		expect(sv!.question).toBe("Come eat together");
		expect(sv!.correctAnswer).toBe("มา กิน กัน");
		expect(sv!.choices).toHaveLength(0);
		expect(sv!.audioUrl).toBe("/audio/greet-001.mp3");
	});

	it("cards have initialized SRS data", () => {
		const cards = generateSentenceCards(makeSentenceEntry());
		for (const card of cards) {
			expect(card.srs.easeFactor).toBe(2.5);
			expect(card.srs.learningStep).toBe(1);
			expect(card.srs.lapseCount).toBe(0);
		}
	});

	it("does not generate audio-dependent cards when no audio", () => {
		const cards = generateSentenceCards(makeSentenceEntry());
		expect(
			cards.find((c) => c.property === "listeningComprehension"),
		).toBeUndefined();
		expect(
			cards.find((c) => c.property === "sentenceBuilding"),
		).toBeUndefined();
		expect(cards.find((c) => c.property === "selfValidation")).toBeUndefined();
	});
});
