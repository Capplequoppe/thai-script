import { describe, expect, it } from "vitest";
import { INITIAL_LEARNER_STATE } from "../../domain/shared/types";
import {
	validateLearnerState,
	validateLearnerStateDetailed,
} from "./Validation";

describe("validateLearnerState", () => {
	it("accepts a valid LearnerState", () => {
		expect(validateLearnerState(INITIAL_LEARNER_STATE)).toBe(true);
	});

	it("rejects null", () => {
		expect(validateLearnerState(null)).toBe(false);
	});

	it("rejects non-object", () => {
		expect(validateLearnerState("string")).toBe(false);
	});

	it("rejects missing completedLessons", () => {
		const { completedLessons, ...rest } = INITIAL_LEARNER_STATE;
		expect(validateLearnerState(rest)).toBe(false);
	});

	it("rejects non-array completedLessons", () => {
		expect(
			validateLearnerState({
				...INITIAL_LEARNER_STATE,
				completedLessons: "bad",
			}),
		).toBe(false);
	});

	it("rejects missing cards", () => {
		const { cards, ...rest } = INITIAL_LEARNER_STATE;
		expect(validateLearnerState(rest)).toBe(false);
	});

	it("rejects non-object cards", () => {
		expect(validateLearnerState({ ...INITIAL_LEARNER_STATE, cards: [] })).toBe(
			false,
		);
	});

	it("rejects missing sessionHistory", () => {
		const { sessionHistory, ...rest } = INITIAL_LEARNER_STATE;
		expect(validateLearnerState(rest)).toBe(false);
	});

	it("rejects non-array sessionHistory", () => {
		expect(
			validateLearnerState({ ...INITIAL_LEARNER_STATE, sessionHistory: {} }),
		).toBe(false);
	});
});

describe("validateLearnerStateDetailed", () => {
	function reasonFor(data: unknown): string {
		const result = validateLearnerStateDetailed(data);
		if (result.ok) throw new Error("expected a refusal");
		return result.reason;
	}

	it("accepts the initial state", () => {
		expect(validateLearnerStateDetailed(INITIAL_LEARNER_STATE)).toEqual({
			ok: true,
		});
	});

	it("names the site when completedLessons carries a non-number, without echoing it", () => {
		const reason = reasonFor({
			...INITIAL_LEARNER_STATE,
			completedLessons: [1, "../../etc/passwd"],
		});
		expect(reason).toBe(
			"completedLessons[1]: expected a lesson number, got a string",
		);
		expect(reason).not.toContain("passwd");
	});

	it("names the site when currentLesson is a string", () => {
		expect(
			reasonFor({ ...INITIAL_LEARNER_STATE, currentLesson: "lesson-01" }),
		).toBe("currentLesson: expected a lesson number or null, got a string");
	});

	it("tolerates a state written before currentLesson existed", () => {
		const { currentLesson, ...ancient } = INITIAL_LEARNER_STATE;
		expect(validateLearnerStateDetailed(ancient)).toEqual({ ok: true });
	});

	it("names the card whose lessonNumber is missing or non-numeric", () => {
		expect(
			reasonFor({
				...INITIAL_LEARNER_STATE,
				cards: { "ม:recognition": { id: "ม:recognition" } },
			}),
		).toBe(
			'cards["ม:recognition"].lessonNumber: expected a lesson number, got undefined',
		);
	});

	it("names the pending catch-up whose lessonNumber is not a number", () => {
		expect(
			reasonFor({
				...INITIAL_LEARNER_STATE,
				pendingCatchUps: [{ lessonNumber: "lesson-03", cardIds: [] }],
			}),
		).toBe(
			"pendingCatchUps[0].lessonNumber: expected a lesson number, got a string",
		);
	});
});
