import { describe, expect, it } from "vitest";
import { RecallRating } from "../value-objects/RecallRating";
import { SrsSchedule } from "../value-objects/SrsSchedule";
import { SrsStage } from "../value-objects/SrsStage";
import { ReviewableCard } from "./ReviewableCard";

class TestCard extends ReviewableCard {
	get pool(): string {
		return "test";
	}
}

function makeCard(overrides?: { schedule?: SrsSchedule; audioUrl?: string }) {
	const now = "2025-01-01T00:00:00.000Z";
	return new TestCard(
		"card-1",
		"What is ก?",
		"ko kai",
		["ko kai", "kho khai", "kho khuat", "kho khwai"],
		overrides?.schedule ?? SrsSchedule.initial(now),
		overrides?.audioUrl,
	);
}

describe("ReviewableCard", () => {
	it("constructor sets all properties correctly", () => {
		const schedule = SrsSchedule.initial("2025-01-01T00:00:00.000Z");
		const card = new TestCard(
			"card-1",
			"What is ก?",
			"ko kai",
			["ko kai", "kho khai"],
			schedule,
			"https://example.com/audio.mp3",
		);

		expect(card.id).toBe("card-1");
		expect(card.question).toBe("What is ก?");
		expect(card.correctAnswer).toBe("ko kai");
		expect(card.choices).toEqual(["ko kai", "kho khai"]);
		expect(card.schedule).toBe(schedule);
		expect(card.audioUrl).toBe("https://example.com/audio.mp3");
	});

	it("audioUrl is optional and defaults to undefined", () => {
		const card = makeCard();
		expect(card.audioUrl).toBeUndefined();
	});

	it("schedule getter returns the SrsSchedule", () => {
		const schedule = SrsSchedule.initial("2025-01-01T00:00:00.000Z");
		const card = makeCard({ schedule });
		expect(card.schedule).toBe(schedule);
	});

	it("stage delegates to schedule.stage", () => {
		const card = makeCard();
		expect(card.stage).toBe(SrsStage.APPRENTICE);
	});

	it("isDue delegates to schedule.isDue", () => {
		const card = makeCard();
		// initial schedule has nextReviewDate 10 min after now
		expect(card.isDue("2025-01-01T00:00:00.000Z")).toBe(false);
		expect(card.isDue("2025-01-01T00:11:00.000Z")).toBe(true);
	});

	it("isLeech returns true when lapseCount >= threshold", () => {
		const dto = {
			easeFactor: 2.5,
			interval: 4320,
			repetitions: 5,
			learningStep: null,
			nextReviewDate: "2025-01-01T00:00:00.000Z",
			lastReviewDate: "2024-12-28T00:00:00.000Z",
			lapseCount: 4,
		};
		const card = makeCard({ schedule: SrsSchedule.fromDTO(dto) });

		expect(card.isLeech(4)).toBe(true);
		expect(card.isLeech(5)).toBe(false);
		expect(card.isLeech(3)).toBe(true);
	});

	it("isLeech returns false when lapseCount is 0", () => {
		const card = makeCard();
		expect(card.isLeech(1)).toBe(false);
	});

	it("recordReview updates internal schedule via applyReview", () => {
		const card = makeCard();
		const originalSchedule = card.schedule;

		card.recordReview(RecallRating.GOOD, "2025-01-01T00:10:00.000Z");

		expect(card.schedule).not.toBe(originalSchedule);
		expect(card.schedule.repetitions).toBe(originalSchedule.repetitions + 1);
	});

	it("recordReview accepts optional timing data", () => {
		const dto = {
			easeFactor: 2.5,
			interval: 4320,
			repetitions: 5,
			learningStep: null,
			nextReviewDate: "2025-01-01T00:00:00.000Z",
			lastReviewDate: "2024-12-28T00:00:00.000Z",
			lapseCount: 0,
		};
		const card = makeCard({ schedule: SrsSchedule.fromDTO(dto) });

		card.recordReview(RecallRating.GOOD, "2025-01-04T00:00:00.000Z", {
			responseTimeMs: 500,
			averageResponseTimeMs: 1000,
		});

		expect(card.schedule.lastReviewDate).toBe("2025-01-04T00:00:00.000Z");
	});

	it("pool returns expected value from concrete subclass", () => {
		const card = makeCard();
		expect(card.pool).toBe("test");
	});
});
