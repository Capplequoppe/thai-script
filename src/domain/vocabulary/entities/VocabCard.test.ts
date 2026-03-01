import { describe, expect, it } from "vitest";
import { RecallRating } from "../../srs/value-objects/RecallRating";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { VocabCard } from "./VocabCard";

const NOW = "2025-01-01T00:00:00.000Z";

function makeCard(overrides?: { schedule?: SrsSchedule; audioUrl?: string }) {
	return new VocabCard(
		"vocab-card-1",
		"What does สวัสดี mean?",
		"hello",
		["hello", "goodbye", "thanks"],
		overrides?.schedule ?? SrsSchedule.initial(NOW),
		"สวัสดี",
		"thaiToEnglish",
		overrides?.audioUrl,
	);
}

describe("VocabCard", () => {
	it("constructor sets all properties", () => {
		const schedule = SrsSchedule.initial(NOW);
		const card = new VocabCard(
			"id-1",
			"Q?",
			"A",
			["A", "B"],
			schedule,
			"คำ",
			"englishToThai",
			"https://example.com/audio.mp3",
		);

		expect(card.id).toBe("id-1");
		expect(card.question).toBe("Q?");
		expect(card.correctAnswer).toBe("A");
		expect(card.choices).toEqual(["A", "B"]);
		expect(card.schedule).toBe(schedule);
		expect(card.wordThai).toBe("คำ");
		expect(card.property).toBe("englishToThai");
		expect(card.audioUrl).toBe("https://example.com/audio.mp3");
	});

	it("pool returns 'vocab'", () => {
		expect(makeCard().pool).toBe("vocab");
	});

	it("inherits isDue from ReviewableCard", () => {
		const card = makeCard();
		expect(card.isDue(NOW)).toBe(false);
		expect(card.isDue("2025-01-01T00:11:00.000Z")).toBe(true);
	});

	it("inherits isLeech from ReviewableCard", () => {
		const dto = {
			easeFactor: 2.5,
			interval: 4320,
			repetitions: 5,
			learningStep: null,
			nextReviewDate: NOW,
			lastReviewDate: "2024-12-28T00:00:00.000Z",
			lapseCount: 4,
		};
		const card = makeCard({ schedule: SrsSchedule.fromDTO(dto) });
		expect(card.isLeech(4)).toBe(true);
		expect(card.isLeech(5)).toBe(false);
	});

	it("inherits recordReview from ReviewableCard", () => {
		const card = makeCard();
		const originalSchedule = card.schedule;
		card.recordReview(RecallRating.GOOD, "2025-01-01T00:10:00.000Z");
		expect(card.schedule).not.toBe(originalSchedule);
		expect(card.schedule.repetitions).toBe(originalSchedule.repetitions + 1);
	});

	it("toDTO produces correct shape", () => {
		const card = makeCard({ audioUrl: "https://example.com/a.mp3" });
		const dto = card.toDTO();

		expect(dto).toEqual({
			id: "vocab-card-1",
			question: "What does สวัสดี mean?",
			correctAnswer: "hello",
			choices: ["hello", "goodbye", "thanks"],
			srs: card.schedule.toDTO(),
			audioUrl: "https://example.com/a.mp3",
			wordThai: "สวัสดี",
			property: "thaiToEnglish",
		});
	});

	it("fromDTO roundtrips correctly", () => {
		const card = makeCard({ audioUrl: "https://example.com/a.mp3" });
		const dto = card.toDTO();
		const restored = VocabCard.fromDTO(dto);

		expect(restored.id).toBe(card.id);
		expect(restored.question).toBe(card.question);
		expect(restored.correctAnswer).toBe(card.correctAnswer);
		expect(restored.choices).toEqual(card.choices);
		expect(restored.wordThai).toBe(card.wordThai);
		expect(restored.property).toBe(card.property);
		expect(restored.audioUrl).toBe(card.audioUrl);
		expect(restored.schedule.toDTO()).toEqual(card.schedule.toDTO());
		expect(restored.pool).toBe("vocab");
	});

	it("toDTO includes mnemonic when provided", () => {
		const card = new VocabCard(
			"id-1", "Q?", "A", ["A", "B"],
			SrsSchedule.initial(NOW),
			"คำ", "thaiToEnglish",
			undefined,
			"sounds like 'come'",
		);
		expect(card.toDTO().mnemonic).toBe("sounds like 'come'");
	});

	it("toDTO includes syllables when provided", () => {
		const syllables = [{ text: "คำ", tone: "mid" }];
		const card = new VocabCard(
			"id-1", "Q?", "A", [],
			SrsSchedule.initial(NOW),
			"คำ", "toneIdentification",
			undefined, undefined, syllables,
		);
		expect(card.toDTO().syllables).toEqual(syllables);
	});

	it("fromDTO roundtrips mnemonic and syllables", () => {
		const syllables = [{ text: "คำ", tone: "mid" }];
		const card = new VocabCard(
			"id-2", "Q?", "A", [],
			SrsSchedule.initial(NOW),
			"คำ", "toneIdentification",
			undefined, "tip", syllables,
		);
		const restored = VocabCard.fromDTO(card.toDTO());
		expect(restored.mnemonic).toBe("tip");
		expect(restored.syllables).toEqual(syllables);
	});
});
