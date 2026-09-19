import { describe, expect, it } from "vitest";
import { lessonEntryByNumber } from "../../domain/script/data/lessonSequence";
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
import { LESSON_IDENTITY_EPOCH, migrateState } from "./Storage";

/** The position of the lesson `symbols.ts` files under this number. */
const at = (legacyNumber: number): number =>
	lessonEntryByNumber(legacyNumber)?.position ?? legacyNumber;

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

	it("keeps the incoming device's lesson-in-progress when this device has none", () => {
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			currentLesson: 7,
		};
		const result = mergeLearnerStates(INITIAL_LEARNER_STATE, incoming);
		expect(result.currentLesson).toBe(7);
	});

	it("unions pendingCatchUps from both devices, merging card ids per lesson", () => {
		const current: LearnerState = {
			...INITIAL_LEARNER_STATE,
			pendingCatchUps: [
				{ lessonNumber: 3, cardIds: ["a", "b"] },
				{ lessonNumber: 5, cardIds: ["c"] },
			],
		};
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			pendingCatchUps: [{ lessonNumber: 3, cardIds: ["b", "d"] }],
		};
		const result = mergeLearnerStates(current, incoming);
		expect(result.pendingCatchUps).toEqual([
			{ lessonNumber: 3, cardIds: ["a", "b", "d"] },
			{ lessonNumber: 5, cardIds: ["c"] },
		]);
	});

	// The task's AC4: two devices, one already on the migrated representation
	// and one still holding a pre-migration export. The storage boundary
	// converts the unmigrated input through migrateState — the same single
	// conversion pass a load uses — and only then merges, so nothing from
	// either side is lost across any of the five lesson-identity stores.
	it("unions a migrated and an unmigrated state across all five stores, losing nothing", () => {
		// Already converted, and stamped as such: these are positions.
		const current: LearnerState = {
			...INITIAL_LEARNER_STATE,
			completedLessons: [1, 4],
			currentLesson: null,
			cards: { "ก:recognition": makeCard("ก:recognition", 2, 1) },
			pendingCatchUps: [{ lessonNumber: 4, cardIds: ["x"] }],
			lessonEpoch: LESSON_IDENTITY_EPOCH,
		};

		// Written by an older install: same shape, but its cards still carry
		// the pre-migration SRS fields (no learningStep, no lapseCount).
		const legacyCard = makeCard("ม:recognition", 5, 2);
		delete (legacyCard.srs as { learningStep?: number | null }).learningStep;
		delete (legacyCard.srs as { lapseCount?: number }).lapseCount;
		const unmigrated: LearnerState = {
			...INITIAL_LEARNER_STATE,
			lessonEpoch: undefined,
			completedLessons: [2, 4],
			currentLesson: 3,
			cards: { "ม:recognition": legacyCard },
			pendingCatchUps: [{ lessonNumber: 2, cardIds: ["y"] }],
		};

		const result = mergeLearnerStates(current, migrateState(unmigrated));

		// The legacy side's lessons 2 and 4 land on the positions those lessons
		// now occupy, and position 1 is credited to a learner with progress;
		// the already-converted side's 1 and 4 are left where they are.
		expect([...result.completedLessons].sort((a, b) => a - b)).toEqual([
			1,
			at(2),
			4,
			at(4),
		]);
		expect(result.currentLesson).toBe(at(3));
		expect(result.cards["ก:recognition"].srs.repetitions).toBe(2);
		expect(result.cards["ม:recognition"].srs.repetitions).toBe(5);
		expect(result.cards["ม:recognition"].lessonNumber).toBe(at(2));
		// The unmigrated card came through the migration, not around it.
		expect(result.cards["ม:recognition"].srs.learningStep).toBeNull();
		expect(result.cards["ม:recognition"].srs.lapseCount).toBe(0);
		expect(result.pendingCatchUps).toEqual([
			{ lessonNumber: 4, cardIds: ["x"] },
			{ lessonNumber: at(2), cardIds: ["y"] },
		]);
	});

	it("preserves current.apprenticeLimits, not incoming's", () => {
		const current: LearnerState = {
			...INITIAL_LEARNER_STATE,
			apprenticeLimits: { general: 42, script: 10, sentence: 20 },
		};
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			apprenticeLimits: { general: 999, script: 999, sentence: 999 },
		};
		const result = mergeLearnerStates(current, incoming);
		expect(result.apprenticeLimits).toEqual({
			general: 42,
			script: 10,
			sentence: 20,
		});
	});

	it("leaves apprenticeLimits undefined when current never set it", () => {
		const current: LearnerState = { ...INITIAL_LEARNER_STATE };
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			apprenticeLimits: { general: 999, script: 999, sentence: 999 },
		};
		const result = mergeLearnerStates(current, incoming);
		expect(result.apprenticeLimits).toBeUndefined();
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
		expect(result.achievements.sort()).toEqual([
			"century",
			"first_review",
			"warrior",
		]);
	});

	it("merges empty achievements correctly", () => {
		const result = mergeLearnerStates(
			INITIAL_LEARNER_STATE,
			INITIAL_LEARNER_STATE,
		);
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
