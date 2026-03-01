import { describe, expect, it } from "vitest";
import { RecallRating } from "./RecallRating";
import type { ResponseTimingData, SrsDataDTO } from "./SrsSchedule";
import { SrsSchedule } from "./SrsSchedule";
import { SrsStage } from "./SrsStage";

const NOW = "2026-02-25T12:00:00.000Z";

function addMinutes(iso: string, minutes: number): string {
	const d = new Date(iso);
	d.setMinutes(d.getMinutes() + minutes);
	return d.toISOString();
}

function makeLearningSchedule(
	step: number,
	overrides?: Partial<SrsDataDTO>,
): SrsSchedule {
	return SrsSchedule.fromDTO({
		easeFactor: 2.0,
		interval: [0, 10, 60, 480][step],
		repetitions: 0,
		learningStep: step,
		nextReviewDate: NOW,
		lastReviewDate: null,
		lapseCount: 0,
		...overrides,
	});
}

function makeGraduatedSchedule(overrides?: Partial<SrsDataDTO>): SrsSchedule {
	return SrsSchedule.fromDTO({
		easeFactor: 2.0,
		interval: 4320,
		repetitions: 1,
		learningStep: null,
		nextReviewDate: NOW,
		lastReviewDate: null,
		lapseCount: 0,
		...overrides,
	});
}

describe("SrsSchedule.initial", () => {
	it("creates correct initial state at learning step 1 with interval 10", () => {
		const schedule = SrsSchedule.initial(NOW);
		expect(schedule.easeFactor.value).toBe(2.5);
		expect(schedule.interval).toBe(10);
		expect(schedule.repetitions).toBe(0);
		expect(schedule.learningStep).toBe(1);
		expect(schedule.lastReviewDate).toBeNull();
		expect(schedule.lapseCount).toBe(0);
	});

	it("sets nextReviewDate 10 min after provided time", () => {
		const schedule = SrsSchedule.initial(NOW);
		expect(schedule.nextReviewDate).toBe(addMinutes(NOW, 10));
	});

	it("is in learning phase", () => {
		const schedule = SrsSchedule.initial(NOW);
		expect(schedule.isInLearning).toBe(true);
	});
});

describe("SrsSchedule.applyReview - Learning Phase", () => {
	it("Good advances steps 0->1->2->3->graduated with correct intervals", () => {
		let card = makeLearningSchedule(0);

		card = card.applyReview(RecallRating.GOOD, NOW);
		expect(card.learningStep).toBe(1);
		expect(card.interval).toBe(10);

		card = card.applyReview(RecallRating.GOOD, NOW);
		expect(card.learningStep).toBe(2);
		expect(card.interval).toBe(60);

		card = card.applyReview(RecallRating.GOOD, NOW);
		expect(card.learningStep).toBe(3);
		expect(card.interval).toBe(480);

		card = card.applyReview(RecallRating.GOOD, NOW);
		expect(card.learningStep).toBeNull();
		expect(card.interval).toBe(2880);
	});

	it("Easy skips steps: 0->2", () => {
		const card = makeLearningSchedule(0);
		const result = card.applyReview(RecallRating.EASY, NOW);
		expect(result.learningStep).toBe(2);
		expect(result.interval).toBe(60);
	});

	it("Easy skips steps: 3->graduated", () => {
		const card = makeLearningSchedule(3);
		const result = card.applyReview(RecallRating.EASY, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(2880);
	});

	it("Easy skips steps: 2->graduated", () => {
		const card = makeLearningSchedule(2);
		const result = card.applyReview(RecallRating.EASY, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(2880);
	});

	it("Hard repeats current step with same interval", () => {
		const card = makeLearningSchedule(2);
		const result = card.applyReview(RecallRating.HARD, NOW);
		expect(result.learningStep).toBe(2);
		expect(result.interval).toBe(60);
	});

	it("Again resets to step 0 with interval 0", () => {
		const card = makeLearningSchedule(3);
		const result = card.applyReview(RecallRating.AGAIN, NOW);
		expect(result.learningStep).toBe(0);
		expect(result.interval).toBe(0);
	});

	it("Wrong drops back one step: 3->2", () => {
		const card = makeLearningSchedule(3);
		const result = card.applyReview(RecallRating.WRONG, NOW);
		expect(result.learningStep).toBe(2);
		expect(result.interval).toBe(60);
	});

	it("Wrong drops back one step: 1->0", () => {
		const card = makeLearningSchedule(1);
		const result = card.applyReview(RecallRating.WRONG, NOW);
		expect(result.learningStep).toBe(0);
		expect(result.interval).toBe(0);
	});

	it("nextReviewDate is offset by interval minutes", () => {
		const card = makeLearningSchedule(1);
		const result = card.applyReview(RecallRating.GOOD, NOW);
		expect(result.nextReviewDate).toBe(addMinutes(NOW, 60));
	});

	it("nextReviewDate equals now when interval is 0", () => {
		const card = makeLearningSchedule(3);
		const result = card.applyReview(RecallRating.AGAIN, NOW);
		expect(result.nextReviewDate).toBe(NOW);
	});

	it("lastReviewDate is set to now", () => {
		const card = makeLearningSchedule(0);
		const result = card.applyReview(RecallRating.GOOD, NOW);
		expect(result.lastReviewDate).toBe(NOW);
	});

	it("easeFactor stays unchanged during learning", () => {
		const card = makeLearningSchedule(0);
		const result = card.applyReview(RecallRating.GOOD, NOW);
		expect(result.easeFactor.value).toBe(2.0);
	});
});

describe("SrsSchedule.applyReview - Graduated Phase", () => {
	it("Good multiplies interval by ease factor and boosts ease by 0.05", () => {
		const card = makeGraduatedSchedule({ interval: 4320, easeFactor: 2.0 });
		const result = card.applyReview(RecallRating.GOOD, NOW);
		expect(result.interval).toBe(Math.round(4320 * 2.0));
		expect(result.easeFactor.value).toBe(2.05);
		expect(result.learningStep).toBeNull();
	});

	it("Easy increases ease factor and applies 1.3x bonus", () => {
		const card = makeGraduatedSchedule({ interval: 4320, easeFactor: 2.0 });
		const result = card.applyReview(RecallRating.EASY, NOW);
		expect(result.interval).toBe(Math.round(4320 * 2.0 * 1.3));
		expect(result.easeFactor.value).toBe(2.15);
		expect(result.learningStep).toBeNull();
	});

	it("Hard halves interval (min 1440) and decreases ease", () => {
		const card = makeGraduatedSchedule({ interval: 4320, easeFactor: 2.0 });
		const result = card.applyReview(RecallRating.HARD, NOW);
		expect(result.interval).toBe(Math.max(1440, Math.round(4320 / 2)));
		expect(result.easeFactor.value).toBe(1.85);
		expect(result.learningStep).toBeNull();
	});

	it("Hard interval floors at 1440 minutes", () => {
		const card = makeGraduatedSchedule({ interval: 2000, easeFactor: 2.0 });
		const result = card.applyReview(RecallRating.HARD, NOW);
		expect(result.interval).toBe(1440);
	});

	it("Wrong lapses to learning step 1, ease drops by 0.2", () => {
		const card = makeGraduatedSchedule({ easeFactor: 2.0 });
		const result = card.applyReview(RecallRating.WRONG, NOW);
		expect(result.learningStep).toBe(1);
		expect(result.interval).toBe(10);
		expect(result.easeFactor.value).toBe(1.8);
	});

	it("Again lapses to learning step 0, ease drops by 0.3", () => {
		const card = makeGraduatedSchedule({ easeFactor: 2.0 });
		const result = card.applyReview(RecallRating.AGAIN, NOW);
		expect(result.learningStep).toBe(0);
		expect(result.interval).toBe(0);
		expect(result.easeFactor.value).toBe(1.7);
		expect(result.nextReviewDate).toBe(NOW);
	});

	it("ease factor never drops below 1.3", () => {
		const card = makeGraduatedSchedule({ easeFactor: 1.35 });
		const result = card.applyReview(RecallRating.AGAIN, NOW);
		expect(result.easeFactor.value).toBe(1.3);
	});

	it("ease factor never exceeds 3.0", () => {
		const card = makeGraduatedSchedule({ easeFactor: 2.95, interval: 4320 });
		const result = card.applyReview(RecallRating.EASY, NOW);
		expect(result.easeFactor.value).toBe(3.0);
	});

	it("interval capped at 259200 minutes (180 days)", () => {
		const card = makeGraduatedSchedule({ interval: 200000, easeFactor: 2.0 });
		const result = card.applyReview(RecallRating.GOOD, NOW);
		expect(result.interval).toBe(259200);
	});

	it("nextReviewDate offset by interval minutes", () => {
		const card = makeGraduatedSchedule({ interval: 4320, easeFactor: 2.0 });
		const result = card.applyReview(RecallRating.GOOD, NOW);
		const expectedInterval = Math.round(4320 * 2.0);
		expect(result.nextReviewDate).toBe(addMinutes(NOW, expectedInterval));
	});

	it("lastReviewDate set to now", () => {
		const card = makeGraduatedSchedule();
		const result = card.applyReview(RecallRating.GOOD, NOW);
		expect(result.lastReviewDate).toBe(NOW);
	});
});

describe("SrsSchedule.applyReview - Response Time Modulation", () => {
	it("fast response (<0.7x average) gives 1.1x interval bonus", () => {
		const card = makeGraduatedSchedule({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 500,
			averageResponseTimeMs: 1000,
		};
		const result = card.applyReview(RecallRating.GOOD, NOW, timing);
		const baseInterval = Math.round(4320 * 2.0);
		expect(result.interval).toBe(Math.round(baseInterval * 1.1));
	});

	it("normal response (0.7-1.3x average) has no change", () => {
		const card = makeGraduatedSchedule({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 1000,
			averageResponseTimeMs: 1000,
		};
		const result = card.applyReview(RecallRating.GOOD, NOW, timing);
		const baseInterval = Math.round(4320 * 2.0);
		expect(result.interval).toBe(baseInterval);
	});

	it("slow response (>1.3x, <=2.0x average) gives 0.85x penalty", () => {
		const card = makeGraduatedSchedule({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 1500,
			averageResponseTimeMs: 1000,
		};
		const result = card.applyReview(RecallRating.GOOD, NOW, timing);
		const baseInterval = Math.round(4320 * 2.0);
		expect(result.interval).toBe(Math.round(baseInterval * 0.85));
	});

	it("very slow response (>2.0x average) gives 0.7x penalty", () => {
		const card = makeGraduatedSchedule({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 2500,
			averageResponseTimeMs: 1000,
		};
		const result = card.applyReview(RecallRating.GOOD, NOW, timing);
		const baseInterval = Math.round(4320 * 2.0);
		expect(result.interval).toBe(Math.round(baseInterval * 0.7));
	});

	it("no effect on learning phase cards", () => {
		const card = makeLearningSchedule(1);
		const timing: ResponseTimingData = {
			responseTimeMs: 500,
			averageResponseTimeMs: 1000,
		};
		const withTiming = card.applyReview(RecallRating.GOOD, NOW, timing);
		const withoutTiming = card.applyReview(RecallRating.GOOD, NOW);
		expect(withTiming.interval).toBe(withoutTiming.interval);
	});

	it("no effect on lapse resets (rating 1)", () => {
		const card = makeGraduatedSchedule({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 500,
			averageResponseTimeMs: 1000,
		};
		const withTiming = card.applyReview(RecallRating.AGAIN, NOW, timing);
		const withoutTiming = card.applyReview(RecallRating.AGAIN, NOW);
		expect(withTiming.interval).toBe(withoutTiming.interval);
	});

	it("no effect on lapse resets (rating 2)", () => {
		const card = makeGraduatedSchedule({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 500,
			averageResponseTimeMs: 1000,
		};
		const withTiming = card.applyReview(RecallRating.WRONG, NOW, timing);
		const withoutTiming = card.applyReview(RecallRating.WRONG, NOW);
		expect(withTiming.interval).toBe(withoutTiming.interval);
	});

	it("applies to rating 3 (Hard) on graduated cards", () => {
		const card = makeGraduatedSchedule({ interval: 10000, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 500,
			averageResponseTimeMs: 1000,
		};
		const withTiming = card.applyReview(RecallRating.HARD, NOW, timing);
		const withoutTiming = card.applyReview(RecallRating.HARD, NOW);
		expect(withTiming.interval).toBe(Math.round(withoutTiming.interval * 1.1));
	});

	it("applies to rating 5 (Easy) on graduated cards", () => {
		const card = makeGraduatedSchedule({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 2500,
			averageResponseTimeMs: 1000,
		};
		const result = card.applyReview(RecallRating.EASY, NOW, timing);
		const baseInterval = Math.round(4320 * 2.0 * 1.3);
		expect(result.interval).toBe(Math.round(baseInterval * 0.7));
	});
});

describe("SrsSchedule.isDue", () => {
	it("returns true when nextReviewDate is in the past", () => {
		const schedule = makeLearningSchedule(0, {
			nextReviewDate: "2026-02-24T00:00:00.000Z",
		});
		expect(schedule.isDue("2026-02-25T00:00:00.000Z")).toBe(true);
	});

	it("returns true when nextReviewDate equals now", () => {
		const schedule = makeLearningSchedule(0, { nextReviewDate: NOW });
		expect(schedule.isDue(NOW)).toBe(true);
	});

	it("returns false when nextReviewDate is in the future", () => {
		const schedule = makeLearningSchedule(0, {
			nextReviewDate: "2026-02-26T00:00:00.000Z",
		});
		expect(schedule.isDue("2026-02-25T00:00:00.000Z")).toBe(false);
	});

	it("returns false for burned cards even when due", () => {
		const schedule = makeGraduatedSchedule({
			interval: 120_960,
			nextReviewDate: "2026-02-24T00:00:00.000Z",
		});
		expect(schedule.isDue("2026-02-25T00:00:00.000Z")).toBe(false);
	});
});

describe("SrsSchedule.isBurned", () => {
	it("returns true at enlightened threshold", () => {
		const schedule = makeGraduatedSchedule({ interval: 120_960 });
		expect(schedule.isBurned).toBe(true);
	});

	it("returns false below threshold", () => {
		const schedule = makeGraduatedSchedule({ interval: 120_959 });
		expect(schedule.isBurned).toBe(false);
	});

	it("returns false for learning cards even with high interval", () => {
		const schedule = makeLearningSchedule(0, { interval: 120_960 });
		expect(schedule.isBurned).toBe(false);
	});
});

describe("SrsSchedule.stage", () => {
	it("returns Apprentice for cards in learning phase", () => {
		expect(makeLearningSchedule(0).stage).toBe(SrsStage.APPRENTICE);
		expect(makeLearningSchedule(3).stage).toBe(SrsStage.APPRENTICE);
	});

	it("returns Guru for graduated cards with interval < 14 days", () => {
		expect(makeGraduatedSchedule({ interval: 4320 }).stage).toBe(SrsStage.GURU);
		expect(makeGraduatedSchedule({ interval: 20_159 }).stage).toBe(
			SrsStage.GURU,
		);
	});

	it("returns Master for graduated cards with interval >= 14 days and < 42 days", () => {
		expect(makeGraduatedSchedule({ interval: 20_160 }).stage).toBe(
			SrsStage.MASTER,
		);
		expect(makeGraduatedSchedule({ interval: 60_479 }).stage).toBe(
			SrsStage.MASTER,
		);
	});

	it("returns Enlightened for graduated cards with interval >= 42 days and < 84 days", () => {
		expect(makeGraduatedSchedule({ interval: 60_480 }).stage).toBe(
			SrsStage.ENLIGHTENED,
		);
		expect(makeGraduatedSchedule({ interval: 120_959 }).stage).toBe(
			SrsStage.ENLIGHTENED,
		);
	});

	it("returns Burned for graduated cards with interval >= 84 days", () => {
		expect(makeGraduatedSchedule({ interval: 120_960 }).stage).toBe(
			SrsStage.BURNED,
		);
		expect(makeGraduatedSchedule({ interval: 200_000 }).stage).toBe(
			SrsStage.BURNED,
		);
	});
});

describe("SrsSchedule.resurrect", () => {
	it("resets interval to graduating interval", () => {
		const burned = makeGraduatedSchedule({
			interval: 120_960,
			easeFactor: 2.5,
		});
		const resurrected = burned.resurrect(NOW);
		expect(resurrected.interval).toBe(2880);
		expect(resurrected.learningStep).toBeNull();
	});

	it("preserves ease factor", () => {
		const burned = makeGraduatedSchedule({
			interval: 120_960,
			easeFactor: 1.8,
		});
		const resurrected = burned.resurrect(NOW);
		expect(resurrected.easeFactor.value).toBe(1.8);
	});

	it("preserves lapseCount", () => {
		const burned = makeGraduatedSchedule({ interval: 120_960, lapseCount: 3 });
		const resurrected = burned.resurrect(NOW);
		expect(resurrected.lapseCount).toBe(3);
	});

	it("sets nextReviewDate offset by graduating interval", () => {
		const burned = makeGraduatedSchedule({ interval: 120_960 });
		const resurrected = burned.resurrect(NOW);
		expect(resurrected.nextReviewDate).toBe(addMinutes(NOW, 2880));
	});

	it("sets lastReviewDate to now", () => {
		const burned = makeGraduatedSchedule({ interval: 120_960 });
		const resurrected = burned.resurrect(NOW);
		expect(resurrected.lastReviewDate).toBe(NOW);
	});
});

describe("SrsSchedule.toDTO / fromDTO", () => {
	it("roundtrips correctly for learning card", () => {
		const original = makeLearningSchedule(2, { lapseCount: 1 });
		const dto = original.toDTO();
		const restored = SrsSchedule.fromDTO(dto);
		expect(restored.toDTO()).toEqual(dto);
	});

	it("roundtrips correctly for graduated card", () => {
		const original = makeGraduatedSchedule({
			interval: 8640,
			easeFactor: 2.15,
			lapseCount: 2,
		});
		const dto = original.toDTO();
		const restored = SrsSchedule.fromDTO(dto);
		expect(restored.toDTO()).toEqual(dto);
	});

	it("defaults lapseCount to 0 when undefined in DTO", () => {
		const dto: SrsDataDTO = {
			easeFactor: 2.0,
			interval: 4320,
			repetitions: 1,
			learningStep: null,
			nextReviewDate: NOW,
			lastReviewDate: null,
		};
		const schedule = SrsSchedule.fromDTO(dto);
		expect(schedule.lapseCount).toBe(0);
	});

	it("toDTO returns correct structure", () => {
		const schedule = SrsSchedule.initial(NOW);
		const dto = schedule.toDTO();
		expect(dto).toEqual({
			easeFactor: 2.5,
			interval: 10,
			repetitions: 0,
			learningStep: 1,
			nextReviewDate: addMinutes(NOW, 10),
			lastReviewDate: null,
			lapseCount: 0,
		});
	});
});

describe("lapseCount tracking", () => {
	it("increments on graduated lapse with rating 1", () => {
		const card = makeGraduatedSchedule({ lapseCount: 2 });
		const result = card.applyReview(RecallRating.AGAIN, NOW);
		expect(result.lapseCount).toBe(3);
	});

	it("increments on graduated lapse with rating 2", () => {
		const card = makeGraduatedSchedule({ lapseCount: 5 });
		const result = card.applyReview(RecallRating.WRONG, NOW);
		expect(result.lapseCount).toBe(6);
	});

	it("does not increment on graduated good/easy/hard", () => {
		const card = makeGraduatedSchedule({ lapseCount: 2 });
		expect(card.applyReview(RecallRating.HARD, NOW).lapseCount).toBe(2);
		expect(card.applyReview(RecallRating.GOOD, NOW).lapseCount).toBe(2);
		expect(card.applyReview(RecallRating.EASY, NOW).lapseCount).toBe(2);
	});

	it("does not increment during learning phase failures", () => {
		const card = makeLearningSchedule(2, { lapseCount: 1 });
		expect(card.applyReview(RecallRating.AGAIN, NOW).lapseCount).toBe(1);
		expect(card.applyReview(RecallRating.WRONG, NOW).lapseCount).toBe(1);
	});

	it("propagates through learning phase", () => {
		const card = makeLearningSchedule(1, { lapseCount: 3 });
		const result = card.applyReview(RecallRating.GOOD, NOW);
		expect(result.lapseCount).toBe(3);
	});

	it("propagates through graduation", () => {
		const card = makeLearningSchedule(3, { lapseCount: 2 });
		const result = card.applyReview(RecallRating.GOOD, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.lapseCount).toBe(2);
	});
});

describe("overrideStage", () => {
	const OVERRIDE_NOW = "2026-03-01T10:00:00.000Z";

	// A graduated card with non-default easeFactor and lapseCount to verify preservation
	const schedule = SrsSchedule.fromDTO({
		easeFactor: 2.3,
		interval: 4320,
		repetitions: 5,
		learningStep: null,
		nextReviewDate: OVERRIDE_NOW,
		lastReviewDate: null,
		lapseCount: 2,
	});

	it("overrides to Apprentice: learningStep=1, interval=10, immediately due", () => {
		const result = schedule.overrideStage(SrsStage.APPRENTICE, OVERRIDE_NOW);
		expect(result.learningStep).toBe(1);
		expect(result.interval).toBe(10);
		expect(result.nextReviewDate).toBe(OVERRIDE_NOW);
	});

	it("overrides to Guru: learningStep=null, interval=2880, immediately due", () => {
		const result = schedule.overrideStage(SrsStage.GURU, OVERRIDE_NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(2880);
		expect(result.stage).toStrictEqual(SrsStage.GURU);
		expect(result.nextReviewDate).toBe(OVERRIDE_NOW);
	});

	it("overrides to Master: learningStep=null, interval=20160, due in future", () => {
		const result = schedule.overrideStage(SrsStage.MASTER, OVERRIDE_NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(20_160);
		expect(result.stage).toStrictEqual(SrsStage.MASTER);
		expect(new Date(result.nextReviewDate) > new Date(OVERRIDE_NOW)).toBe(true);
	});

	it("overrides to Enlightened: interval=60480", () => {
		const result = schedule.overrideStage(SrsStage.ENLIGHTENED, OVERRIDE_NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(60_480);
		expect(result.stage).toStrictEqual(SrsStage.ENLIGHTENED);
	});

	it("overrides to Burned: interval=120960, isBurned=true", () => {
		const result = schedule.overrideStage(SrsStage.BURNED, OVERRIDE_NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(120_960);
		expect(result.isBurned).toBe(true);
	});

	it("preserves easeFactor, repetitions, lastReviewDate, and lapseCount from original schedule", () => {
		const result = schedule.overrideStage(SrsStage.MASTER, OVERRIDE_NOW);
		const dto = result.toDTO();
		expect(dto.easeFactor).toBe(2.3);
		expect(dto.lapseCount).toBe(2);
		expect(dto.repetitions).toBe(5);
		expect(dto.lastReviewDate).toBeNull();
	});

	it("uses current time when now not provided", () => {
		const before = new Date().toISOString();
		const result = schedule.overrideStage(SrsStage.APPRENTICE);
		const after = new Date().toISOString();
		expect(result.learningStep).toBe(1);
		expect(new Date(result.nextReviewDate) >= new Date(before)).toBe(true);
		expect(new Date(result.nextReviewDate) <= new Date(after)).toBe(true);
	});
});

describe("Relearning steps (lapsed cards)", () => {
	it("lapsed card uses shorter relearning steps [0, 10, 60]", () => {
		const card = makeGraduatedSchedule({ easeFactor: 2.0 });
		let lapsed = card.applyReview(RecallRating.AGAIN, NOW);
		expect(lapsed.learningStep).toBe(0);
		expect(lapsed.lapseCount).toBe(1);

		lapsed = lapsed.applyReview(RecallRating.GOOD, NOW);
		expect(lapsed.learningStep).toBe(1);
		expect(lapsed.interval).toBe(10);

		lapsed = lapsed.applyReview(RecallRating.GOOD, NOW);
		expect(lapsed.learningStep).toBe(2);
		expect(lapsed.interval).toBe(60);

		lapsed = lapsed.applyReview(RecallRating.GOOD, NOW);
		expect(lapsed.learningStep).toBeNull();
		expect(lapsed.interval).toBe(2880);
	});

	it("WRONG lapse relearns from step 1 and graduates after step 2", () => {
		const card = makeGraduatedSchedule({ easeFactor: 2.0 });
		let lapsed = card.applyReview(RecallRating.WRONG, NOW);
		expect(lapsed.learningStep).toBe(1);
		expect(lapsed.lapseCount).toBe(1);

		lapsed = lapsed.applyReview(RecallRating.GOOD, NOW);
		expect(lapsed.learningStep).toBe(2);
		expect(lapsed.interval).toBe(60);

		lapsed = lapsed.applyReview(RecallRating.GOOD, NOW);
		expect(lapsed.learningStep).toBeNull();
		expect(lapsed.interval).toBe(2880);
	});

	it("new card (lapseCount 0) uses full learning steps [0, 10, 60, 480]", () => {
		let card = makeLearningSchedule(2, { lapseCount: 0 });
		card = card.applyReview(RecallRating.GOOD, NOW);
		expect(card.learningStep).toBe(3);
		expect(card.interval).toBe(480);
	});
});
