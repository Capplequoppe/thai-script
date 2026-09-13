import { describe, expect, it } from "vitest";
import { RecallRating } from "../../srs/value-objects/RecallRating";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { SentenceReviewCard } from "./SentenceReviewCard";

const NOW = "2025-01-01T00:00:00.000Z";

function makeCard(overrides?: { schedule?: SrsSchedule; audioUrl?: string }) {
	return new SentenceReviewCard(
		"sentence-card-1",
		"What does this sentence mean?",
		"I will go",
		["I will go", "I went", "I am going"],
		overrides?.schedule ?? SrsSchedule.initial(NOW),
		"sentence-1",
		"readingComprehension",
		overrides?.audioUrl,
	);
}

describe("SentenceReviewCard", () => {
	it("constructor sets all properties", () => {
		const schedule = SrsSchedule.initial(NOW);
		const card = new SentenceReviewCard(
			"id-1",
			"Q?",
			"A",
			["A", "B"],
			schedule,
			"sentence-1",
			"selfValidation",
			"https://example.com/audio.mp3",
		);

		expect(card.id).toBe("id-1");
		expect(card.question).toBe("Q?");
		expect(card.correctAnswer).toBe("A");
		expect(card.choices).toEqual(["A", "B"]);
		expect(card.schedule).toBe(schedule);
		expect(card.sentenceId).toBe("sentence-1");
		expect(card.property).toBe("selfValidation");
		expect(card.audioUrl).toBe("https://example.com/audio.mp3");
	});

	it("pool returns 'sentence'", () => {
		expect(makeCard().pool).toBe("sentence");
	});

	it("groupKey returns the sentenceId, not the card id", () => {
		const card = makeCard();
		expect(card.groupKey).toBe("sentence-1");
		expect(card.groupKey).not.toBe(card.id);
	});

	it("toDTO produces correct shape", () => {
		const card = makeCard({ audioUrl: "https://example.com/a.mp3" });
		const dto = card.toDTO();

		expect(dto).toEqual({
			id: "sentence-card-1",
			question: "What does this sentence mean?",
			correctAnswer: "I will go",
			choices: ["I will go", "I went", "I am going"],
			srs: card.schedule.toDTO(),
			audioUrl: "https://example.com/a.mp3",
			sentenceId: "sentence-1",
			property: "readingComprehension",
		});
	});

	it("fromDTO roundtrips correctly", () => {
		const card = makeCard({ audioUrl: "https://example.com/a.mp3" });
		const dto = card.toDTO();
		const restored = SentenceReviewCard.fromDTO(dto);

		expect(restored.id).toBe(card.id);
		expect(restored.sentenceId).toBe(card.sentenceId);
		expect(restored.property).toBe(card.property);
		expect(restored.audioUrl).toBe(card.audioUrl);
		expect(restored.schedule.toDTO()).toEqual(card.schedule.toDTO());
		expect(restored.pool).toBe("sentence");
		expect(restored.groupKey).toBe(card.sentenceId);
	});

	it("fromDTO wires up the sentence learning ladder: 2 corrects graduate a freshly-learning card", () => {
		const dto = {
			id: "sentence-card-1",
			question: "Q",
			correctAnswer: "A",
			choices: ["A"],
			srs: {
				easeFactor: 2.5,
				interval: 0,
				repetitions: 0,
				learningStep: 0,
				nextReviewDate: NOW,
				lastReviewDate: null,
				lapseCount: 0,
			},
			sentenceId: "sentence-1",
			property: "readingComprehension",
		};

		let restored = SentenceReviewCard.fromDTO(dto);
		restored.recordReview(RecallRating.GOOD, NOW);
		expect(restored.schedule.learningStep).toBe(1);

		restored.recordReview(RecallRating.GOOD, NOW);
		expect(restored.schedule.learningStep).toBeNull();
		expect(restored.schedule.interval).toBe(2880);
	});
});
