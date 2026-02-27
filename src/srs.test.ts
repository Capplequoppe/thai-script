import { describe, expect, it } from "vitest";
import {
	GRADUATING_INTERVAL_MINUTES,
	LEARNING_STEPS_MINUTES,
	MAX_INTERVAL_MINUTES,
	MIN_GRADUATED_INTERVAL_MINUTES,
	calculateNextReview,
	createSrsData,
	isDue,
} from "./srs";
import type { ResponseTimingData } from "./srs";
import type { SrsData } from "./types";

const NOW = "2026-02-25T12:00:00.000Z";

function addMinutes(iso: string, minutes: number): string {
	const d = new Date(iso);
	d.setMinutes(d.getMinutes() + minutes);
	return d.toISOString();
}

function makeLearningCard(
	step: number,
	overrides?: Partial<SrsData>,
): SrsData {
	return {
		easeFactor: 2.0,
		interval: LEARNING_STEPS_MINUTES[step],
		repetitions: 0,
		learningStep: step,
		nextReviewDate: NOW,
		lastReviewDate: null,
		...overrides,
	};
}

function makeGraduatedCard(overrides?: Partial<SrsData>): SrsData {
	return {
		easeFactor: 2.0,
		interval: GRADUATING_INTERVAL_MINUTES,
		repetitions: 1,
		learningStep: null,
		nextReviewDate: NOW,
		lastReviewDate: null,
		...overrides,
	};
}

describe("createSrsData", () => {
	it("returns default SRS data at learning step 1 (interval 10 min)", () => {
		const srs = createSrsData();
		expect(srs.easeFactor).toBe(2.0);
		expect(srs.interval).toBe(10);
		expect(srs.repetitions).toBe(0);
		expect(srs.learningStep).toBe(1);
		expect(srs.lastReviewDate).toBeNull();
	});

	it("accepts a custom date and sets nextReviewDate 10 min after it", () => {
		const srs = createSrsData(NOW);
		expect(srs.nextReviewDate).toBe(addMinutes(NOW, 10));
	});
});

describe("calculateNextReview — Learning Phase", () => {
	it("Good advances steps 0→1→2→3→4→graduated with correct intervals", () => {
		let card = makeLearningCard(0);

		// Step 0 → 1 (interval 10)
		card = calculateNextReview(card, 4, NOW);
		expect(card.learningStep).toBe(1);
		expect(card.interval).toBe(10);

		// Step 1 → 2 (interval 60)
		card = calculateNextReview(card, 4, NOW);
		expect(card.learningStep).toBe(2);
		expect(card.interval).toBe(60);

		// Step 2 → 3 (interval 480)
		card = calculateNextReview(card, 4, NOW);
		expect(card.learningStep).toBe(3);
		expect(card.interval).toBe(480);

		// Step 3 → 4 (interval 1440)
		card = calculateNextReview(card, 4, NOW);
		expect(card.learningStep).toBe(4);
		expect(card.interval).toBe(1440);

		// Step 4 → graduated (interval 4320)
		card = calculateNextReview(card, 4, NOW);
		expect(card.learningStep).toBeNull();
		expect(card.interval).toBe(GRADUATING_INTERVAL_MINUTES);
	});

	it("Easy skips steps: 0→2", () => {
		const card = makeLearningCard(0);
		const result = calculateNextReview(card, 5, NOW);
		expect(result.learningStep).toBe(2);
		expect(result.interval).toBe(60);
	});

	it("Easy skips steps: 3→graduated", () => {
		const card = makeLearningCard(3);
		const result = calculateNextReview(card, 5, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(GRADUATING_INTERVAL_MINUTES);
	});

	it("Easy skips steps: 4→graduated", () => {
		const card = makeLearningCard(4);
		const result = calculateNextReview(card, 5, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(GRADUATING_INTERVAL_MINUTES);
	});

	it("Hard repeats current step with same interval", () => {
		const card = makeLearningCard(2);
		const result = calculateNextReview(card, 3, NOW);
		expect(result.learningStep).toBe(2);
		expect(result.interval).toBe(60);
	});

	it("Again resets to step 0 with interval 0", () => {
		const card = makeLearningCard(3);
		const result = calculateNextReview(card, 1, NOW);
		expect(result.learningStep).toBe(0);
		expect(result.interval).toBe(0);
	});

	it("Wrong resets to step 1 with interval 10", () => {
		const card = makeLearningCard(3);
		const result = calculateNextReview(card, 2, NOW);
		expect(result.learningStep).toBe(1);
		expect(result.interval).toBe(10);
	});

	it("nextReviewDate is offset by interval minutes", () => {
		const card = makeLearningCard(1);
		const result = calculateNextReview(card, 4, NOW);
		// Advanced to step 2, interval 60
		expect(result.nextReviewDate).toBe(addMinutes(NOW, 60));
	});

	it("nextReviewDate equals now when interval is 0", () => {
		const card = makeLearningCard(3);
		const result = calculateNextReview(card, 1, NOW);
		expect(result.nextReviewDate).toBe(NOW);
	});

	it("lastReviewDate is set to now", () => {
		const card = makeLearningCard(0);
		const result = calculateNextReview(card, 4, NOW);
		expect(result.lastReviewDate).toBe(NOW);
	});

	it("easeFactor stays unchanged during learning", () => {
		const card = makeLearningCard(0);
		const result = calculateNextReview(card, 4, NOW);
		expect(result.easeFactor).toBe(2.0);
	});
});

describe("calculateNextReview — Graduated Phase", () => {
	it("Good multiplies interval by ease factor", () => {
		const card = makeGraduatedCard({ interval: 4320, easeFactor: 2.0 });
		const result = calculateNextReview(card, 4, NOW);
		expect(result.interval).toBe(Math.round(4320 * 2.0));
		expect(result.easeFactor).toBe(2.0);
		expect(result.learningStep).toBeNull();
	});

	it("Easy increases ease factor and applies 1.3x bonus", () => {
		const card = makeGraduatedCard({ interval: 4320, easeFactor: 2.0 });
		const result = calculateNextReview(card, 5, NOW);
		expect(result.interval).toBe(Math.round(4320 * 2.0 * 1.3));
		expect(result.easeFactor).toBe(2.15);
		expect(result.learningStep).toBeNull();
	});

	it("Hard halves interval (min 1440) and decreases ease", () => {
		const card = makeGraduatedCard({ interval: 4320, easeFactor: 2.0 });
		const result = calculateNextReview(card, 3, NOW);
		expect(result.interval).toBe(Math.max(1440, Math.round(4320 / 2)));
		expect(result.easeFactor).toBe(1.85);
		expect(result.learningStep).toBeNull();
	});

	it("Hard interval floors at 1440 minutes", () => {
		const card = makeGraduatedCard({ interval: 2000, easeFactor: 2.0 });
		const result = calculateNextReview(card, 3, NOW);
		expect(result.interval).toBe(MIN_GRADUATED_INTERVAL_MINUTES);
	});

	it("Wrong lapses to learning step 1, ease drops by 0.2", () => {
		const card = makeGraduatedCard({ easeFactor: 2.0 });
		const result = calculateNextReview(card, 2, NOW);
		expect(result.learningStep).toBe(1);
		expect(result.interval).toBe(10);
		expect(result.easeFactor).toBe(1.8);
	});

	it("Again lapses to learning step 0, ease drops by 0.3", () => {
		const card = makeGraduatedCard({ easeFactor: 2.0 });
		const result = calculateNextReview(card, 1, NOW);
		expect(result.learningStep).toBe(0);
		expect(result.interval).toBe(0);
		expect(result.easeFactor).toBe(1.7);
		expect(result.nextReviewDate).toBe(NOW);
	});

	it("ease factor never drops below 1.3", () => {
		const card = makeGraduatedCard({ easeFactor: 1.35 });
		const result = calculateNextReview(card, 1, NOW);
		expect(result.easeFactor).toBe(1.3);
	});

	it("ease factor never exceeds 3.0", () => {
		const card = makeGraduatedCard({ easeFactor: 2.95, interval: 4320 });
		const result = calculateNextReview(card, 5, NOW);
		expect(result.easeFactor).toBe(3.0);
	});

	it("interval capped at 259200 minutes (180 days)", () => {
		const card = makeGraduatedCard({ interval: 200000, easeFactor: 2.0 });
		const result = calculateNextReview(card, 4, NOW);
		expect(result.interval).toBe(MAX_INTERVAL_MINUTES);
	});

	it("nextReviewDate offset by interval minutes", () => {
		const card = makeGraduatedCard({ interval: 4320, easeFactor: 2.0 });
		const result = calculateNextReview(card, 4, NOW);
		const expectedInterval = Math.round(4320 * 2.0);
		expect(result.nextReviewDate).toBe(addMinutes(NOW, expectedInterval));
	});

	it("lastReviewDate set to now", () => {
		const card = makeGraduatedCard();
		const result = calculateNextReview(card, 4, NOW);
		expect(result.lastReviewDate).toBe(NOW);
	});
});

describe("calculateNextReview — Response Time Modulation", () => {
	it("fast response (<0.7x average) gives 1.1x interval bonus", () => {
		const card = makeGraduatedCard({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 500,
			averageResponseTimeMs: 1000,
		};
		const result = calculateNextReview(card, 4, NOW, timing);
		const baseInterval = Math.round(4320 * 2.0);
		expect(result.interval).toBe(Math.round(baseInterval * 1.1));
	});

	it("normal response (0.7-1.3x average) has no change", () => {
		const card = makeGraduatedCard({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 1000,
			averageResponseTimeMs: 1000,
		};
		const result = calculateNextReview(card, 4, NOW, timing);
		const baseInterval = Math.round(4320 * 2.0);
		expect(result.interval).toBe(baseInterval);
	});

	it("slow response (>1.3x, <=2.0x average) gives 0.85x penalty", () => {
		const card = makeGraduatedCard({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 1500,
			averageResponseTimeMs: 1000,
		};
		const result = calculateNextReview(card, 4, NOW, timing);
		const baseInterval = Math.round(4320 * 2.0);
		expect(result.interval).toBe(Math.round(baseInterval * 0.85));
	});

	it("very slow response (>2.0x average) gives 0.7x penalty", () => {
		const card = makeGraduatedCard({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 2500,
			averageResponseTimeMs: 1000,
		};
		const result = calculateNextReview(card, 4, NOW, timing);
		const baseInterval = Math.round(4320 * 2.0);
		expect(result.interval).toBe(Math.round(baseInterval * 0.7));
	});

	it("no effect on learning phase cards", () => {
		const card = makeLearningCard(1);
		const timing: ResponseTimingData = {
			responseTimeMs: 500,
			averageResponseTimeMs: 1000,
		};
		const withTiming = calculateNextReview(card, 4, NOW, timing);
		const withoutTiming = calculateNextReview(card, 4, NOW);
		expect(withTiming.interval).toBe(withoutTiming.interval);
	});

	it("no effect on lapse resets (rating 1)", () => {
		const card = makeGraduatedCard({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 500,
			averageResponseTimeMs: 1000,
		};
		const withTiming = calculateNextReview(card, 1, NOW, timing);
		const withoutTiming = calculateNextReview(card, 1, NOW);
		expect(withTiming.interval).toBe(withoutTiming.interval);
	});

	it("no effect on lapse resets (rating 2)", () => {
		const card = makeGraduatedCard({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 500,
			averageResponseTimeMs: 1000,
		};
		const withTiming = calculateNextReview(card, 2, NOW, timing);
		const withoutTiming = calculateNextReview(card, 2, NOW);
		expect(withTiming.interval).toBe(withoutTiming.interval);
	});

	it("applies to rating 3 (Hard) on graduated cards", () => {
		const card = makeGraduatedCard({ interval: 10000, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 500,
			averageResponseTimeMs: 1000,
		};
		const withTiming = calculateNextReview(card, 3, NOW, timing);
		const withoutTiming = calculateNextReview(card, 3, NOW);
		expect(withTiming.interval).toBe(
			Math.round(withoutTiming.interval * 1.1),
		);
	});

	it("applies to rating 5 (Easy) on graduated cards", () => {
		const card = makeGraduatedCard({ interval: 4320, easeFactor: 2.0 });
		const timing: ResponseTimingData = {
			responseTimeMs: 2500,
			averageResponseTimeMs: 1000,
		};
		const result = calculateNextReview(card, 5, NOW, timing);
		const baseInterval = Math.round(4320 * 2.0 * 1.3);
		expect(result.interval).toBe(Math.round(baseInterval * 0.7));
	});
});

describe("isDue", () => {
	it("returns true when nextReviewDate is in the past", () => {
		const srs = makeLearningCard(0, {
			nextReviewDate: "2026-02-24T00:00:00.000Z",
		});
		expect(isDue(srs, "2026-02-25T00:00:00.000Z")).toBe(true);
	});

	it("returns true when nextReviewDate equals now", () => {
		const srs = makeLearningCard(0, { nextReviewDate: NOW });
		expect(isDue(srs, NOW)).toBe(true);
	});

	it("returns false when nextReviewDate is in the future", () => {
		const srs = makeLearningCard(0, {
			nextReviewDate: "2026-02-26T00:00:00.000Z",
		});
		expect(isDue(srs, "2026-02-25T00:00:00.000Z")).toBe(false);
	});
});
