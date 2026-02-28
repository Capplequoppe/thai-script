import { describe, expect, it } from "vitest";
import { RecallRating } from "../../srs/value-objects/RecallRating";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { ScriptPropertyCard } from "./ScriptPropertyCard";

const NOW = "2025-01-01T00:00:00.000Z";

function makeCard(overrides?: { schedule?: SrsSchedule; audioUrl?: string }) {
	return new ScriptPropertyCard(
		"script-card-1",
		"What class is ก?",
		"Mid",
		["Mid", "High", "Low"],
		overrides?.schedule ?? SrsSchedule.initial(NOW),
		"ก",
		"class",
		1,
		overrides?.audioUrl,
	);
}

describe("ScriptPropertyCard", () => {
	it("constructor sets all properties", () => {
		const schedule = SrsSchedule.initial(NOW);
		const card = new ScriptPropertyCard(
			"id-1",
			"Q?",
			"A",
			["A", "B"],
			schedule,
			"ก",
			"recognition",
			2,
			"https://example.com/audio.mp3",
		);

		expect(card.id).toBe("id-1");
		expect(card.question).toBe("Q?");
		expect(card.correctAnswer).toBe("A");
		expect(card.choices).toEqual(["A", "B"]);
		expect(card.schedule).toBe(schedule);
		expect(card.symbolCharacter).toBe("ก");
		expect(card.property).toBe("recognition");
		expect(card.lessonNumber).toBe(2);
		expect(card.audioUrl).toBe("https://example.com/audio.mp3");
	});

	it("pool returns 'script'", () => {
		expect(makeCard().pool).toBe("script");
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
			id: "script-card-1",
			question: "What class is ก?",
			correctAnswer: "Mid",
			choices: ["Mid", "High", "Low"],
			srs: card.schedule.toDTO(),
			audioUrl: "https://example.com/a.mp3",
			symbolCharacter: "ก",
			property: "class",
			lessonNumber: 1,
		});
	});

	it("fromDTO roundtrips correctly", () => {
		const card = makeCard({ audioUrl: "https://example.com/a.mp3" });
		const dto = card.toDTO();
		const restored = ScriptPropertyCard.fromDTO(dto);

		expect(restored.id).toBe(card.id);
		expect(restored.question).toBe(card.question);
		expect(restored.correctAnswer).toBe(card.correctAnswer);
		expect(restored.choices).toEqual(card.choices);
		expect(restored.symbolCharacter).toBe(card.symbolCharacter);
		expect(restored.property).toBe(card.property);
		expect(restored.lessonNumber).toBe(card.lessonNumber);
		expect(restored.audioUrl).toBe(card.audioUrl);
		expect(restored.schedule.toDTO()).toEqual(card.schedule.toDTO());
		expect(restored.pool).toBe("script");
	});
});
