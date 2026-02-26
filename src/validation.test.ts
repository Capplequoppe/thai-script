import { describe, expect, it } from "vitest";
import { INITIAL_LEARNER_STATE } from "./types";
import { validateLearnerState } from "./validation";

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
