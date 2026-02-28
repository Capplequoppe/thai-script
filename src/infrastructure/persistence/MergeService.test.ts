import { describe, expect, it } from "vitest";
import type {
	LearnerState,
	PropertyCard,
	SessionSummary,
} from "../../domain/shared/types";
import {
	DEFAULT_SRS_DATA,
	INITIAL_LEARNER_STATE,
} from "../../domain/shared/types";
import { mergeLearnerStates } from "./MergeService";

function makeCard(
	id: string,
	repetitions: number,
	lessonNumber = 1,
): PropertyCard {
	return {
		id,
		symbolCharacter: "ก",
		property: "recognition",
		question: `What is ${id}?`,
		correctAnswer: "answer",
		choices: ["a", "b", "c", "answer"],
		srs: {
			...DEFAULT_SRS_DATA,
			repetitions,
			nextReviewDate: new Date().toISOString(),
		},
		lessonNumber,
	};
}

function makeSession(id: string): SessionSummary {
	return {
		sessionId: id,
		completedAt: new Date().toISOString(),
		type: "lesson",
		durationMs: 1000,
		totalCards: 5,
		correctCount: 4,
		incorrectCount: 1,
		accuracy: 80,
		newCardsGraduated: 3,
	};
}

describe("mergeLearnerStates", () => {
	it("merges two empty states", () => {
		const result = mergeLearnerStates(
			INITIAL_LEARNER_STATE,
			INITIAL_LEARNER_STATE,
		);
		expect(result).toEqual(INITIAL_LEARNER_STATE);
	});

	it("unions completedLessons without duplicates", () => {
		const current: LearnerState = {
			...INITIAL_LEARNER_STATE,
			completedLessons: [1, 2, 3],
		};
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			completedLessons: [2, 3, 4, 5],
		};
		const result = mergeLearnerStates(current, incoming);
		expect(result.completedLessons.sort()).toEqual([1, 2, 3, 4, 5]);
	});

	it("preserves current.currentLesson", () => {
		const current: LearnerState = {
			...INITIAL_LEARNER_STATE,
			currentLesson: 3,
		};
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			currentLesson: 7,
		};
		const result = mergeLearnerStates(current, incoming);
		expect(result.currentLesson).toBe(3);
	});

	it("includes cards only in current", () => {
		const current: LearnerState = {
			...INITIAL_LEARNER_STATE,
			cards: { a: makeCard("a", 2) },
		};
		const incoming: LearnerState = { ...INITIAL_LEARNER_STATE, cards: {} };
		const result = mergeLearnerStates(current, incoming);
		expect(result.cards.a.srs.repetitions).toBe(2);
	});

	it("includes cards only in incoming", () => {
		const current: LearnerState = { ...INITIAL_LEARNER_STATE, cards: {} };
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			cards: { b: makeCard("b", 5) },
		};
		const result = mergeLearnerStates(current, incoming);
		expect(result.cards.b.srs.repetitions).toBe(5);
	});

	it("keeps the card with higher repetitions on conflict", () => {
		const current: LearnerState = {
			...INITIAL_LEARNER_STATE,
			cards: { x: makeCard("x", 3) },
		};
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			cards: { x: makeCard("x", 7) },
		};
		const result = mergeLearnerStates(current, incoming);
		expect(result.cards.x.srs.repetitions).toBe(7);
	});

	it("keeps current card when repetitions are equal", () => {
		const currentCard = makeCard("x", 3);
		currentCard.correctAnswer = "current";
		const incomingCard = makeCard("x", 3);
		incomingCard.correctAnswer = "incoming";
		const current: LearnerState = {
			...INITIAL_LEARNER_STATE,
			cards: { x: currentCard },
		};
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			cards: { x: incomingCard },
		};
		const result = mergeLearnerStates(current, incoming);
		expect(result.cards.x.correctAnswer).toBe("current");
	});

	it("unions achievements without duplicates", () => {
		const current: LearnerState = {
			...INITIAL_LEARNER_STATE,
			achievements: ["first_review", "century"],
		};
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			achievements: ["century", "warrior"],
		};
		const result = mergeLearnerStates(current, incoming);
		expect(result.achievements.sort()).toEqual(["century", "first_review", "warrior"]);
	});

	it("merges empty achievements correctly", () => {
		const result = mergeLearnerStates(INITIAL_LEARNER_STATE, INITIAL_LEARNER_STATE);
		expect(result.achievements).toEqual([]);
	});

	it("deduplicates sessionHistory by sessionId", () => {
		const s1 = makeSession("s1");
		const s2 = makeSession("s2");
		const s3 = makeSession("s3");
		const current: LearnerState = {
			...INITIAL_LEARNER_STATE,
			sessionHistory: [s1, s2],
		};
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			sessionHistory: [s2, s3],
		};
		const result = mergeLearnerStates(current, incoming);
		expect(result.sessionHistory).toHaveLength(3);
		const ids = result.sessionHistory.map((s) => s.sessionId);
		expect(ids).toContain("s1");
		expect(ids).toContain("s2");
		expect(ids).toContain("s3");
	});
});
