import { beforeEach, describe, expect, it } from "vitest";
import type { LearnerState } from "./domain/shared/types";
import { INITIAL_LEARNER_STATE } from "./domain/shared/types";
import { LAPSE_RECOVERY_INTERVAL_MINUTES } from "./domain/srs/value-objects/SrsSchedule";
import {
	InMemoryStorage,
	migrateState,
} from "./infrastructure/persistence/Storage";

describe("InMemoryStorage", () => {
	let storage: InMemoryStorage;

	beforeEach(() => {
		storage = new InMemoryStorage();
	});

	it("load returns initial state when empty", () => {
		const state = storage.load();
		expect(state.completedLessons).toEqual([]);
		expect(state.currentLesson).toBeNull();
		expect(Object.keys(state.cards)).toHaveLength(0);
	});

	it("save and load round-trips state", () => {
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			completedLessons: [1, 2],
			currentLesson: 3,
		};
		storage.save(state);
		const loaded = storage.load();
		expect(loaded.completedLessons).toEqual([1, 2]);
		expect(loaded.currentLesson).toBe(3);
	});

	it("reset clears all state", () => {
		storage.save({ ...INITIAL_LEARNER_STATE, completedLessons: [1] });
		storage.reset();
		const loaded = storage.load();
		expect(loaded.completedLessons).toEqual([]);
	});

	it("load returns a clone (mutations do not affect storage)", () => {
		const state = storage.load();
		state.completedLessons.push(99);
		const reloaded = storage.load();
		expect(reloaded.completedLessons).toEqual([]);
	});
});

describe("InMemoryStorage exportData/importData", () => {
	let storage: InMemoryStorage;

	beforeEach(() => {
		storage = new InMemoryStorage();
	});

	it("exportData returns JSON of current state", () => {
		const state: LearnerState = {
			...INITIAL_LEARNER_STATE,
			completedLessons: [1, 2],
		};
		storage.save(state);
		const json = storage.exportData();
		const parsed = JSON.parse(json);
		expect(parsed.completedLessons).toEqual([1, 2]);
	});

	it("importData merges with existing state", () => {
		storage.save({ ...INITIAL_LEARNER_STATE, completedLessons: [1] });
		const incoming: LearnerState = {
			...INITIAL_LEARNER_STATE,
			completedLessons: [2, 3],
		};
		storage.importData(JSON.stringify(incoming));
		const loaded = storage.load();
		expect(loaded.completedLessons.sort()).toEqual([1, 2, 3]);
	});

	it("importData throws on invalid JSON", () => {
		expect(() => storage.importData("not json")).toThrow();
	});

	it("importData throws on invalid state shape", () => {
		expect(() => storage.importData(JSON.stringify({ bad: true }))).toThrow();
	});
});

describe("migrateState", () => {
	it("migrates cards missing learningStep to learningStep: null", () => {
		const oldState = {
			completedLessons: [1],
			currentLesson: null,
			cards: {
				"test:recognition": {
					id: "test:recognition",
					symbolCharacter: "ก",
					property: "recognition",
					lessonNumber: 1,
					question: "What is this?",
					correctAnswer: "ko kai",
					choices: ["ko kai", "kho khai"],
					srs: {
						easeFactor: 2.5,
						interval: 0,
						repetitions: 0,
						nextReviewDate: new Date().toISOString(),
						lastReviewDate: null,
					},
				},
			},
			vocabCards: {},
			sessionHistory: [],
		} as unknown as LearnerState;

		const state = migrateState(oldState);
		const card = state.cards["test:recognition"]!;

		expect(card.srs.learningStep).toBe(null);
		expect(card.srs.lapseCount).toBe(0);
	});

	it("does not alter a brand-new card still climbing its first-ever learning ladder", () => {
		const oldState = {
			completedLessons: [1],
			currentLesson: null,
			cards: {
				"test:recognition": {
					id: "test:recognition",
					symbolCharacter: "ก",
					property: "recognition",
					lessonNumber: 1,
					question: "What is this?",
					correctAnswer: "ko kai",
					choices: ["ko kai", "kho khai"],
					srs: {
						easeFactor: 2.0,
						interval: 10,
						repetitions: 0,
						learningStep: 2,
						nextReviewDate: new Date().toISOString(),
						lastReviewDate: null,
						lapseCount: 0,
					},
				},
			},
			vocabCards: {},
			sessionHistory: [],
		} as unknown as LearnerState;

		const state = migrateState(oldState);
		const card = state.cards["test:recognition"]!;

		expect(card.srs.learningStep).toBe(2);
		expect(card.srs.lapseCount).toBe(0);
	});

	// This is the fast-forward fix: a lapse used to drop a graduated card into
	// a multi-step relearning ladder needing 2-3 more correct answers before
	// it graduated again. A card mid-that-ladder (lapseCount > 0) gets bumped
	// straight back to graduated, with a short recovery interval, instead of
	// being left to climb out the old way.
	it("fast-forwards a card stuck mid-relearning from a past lapse back to graduated", () => {
		const oldState = {
			completedLessons: [1],
			currentLesson: null,
			cards: {
				"test:recognition": {
					id: "test:recognition",
					symbolCharacter: "ก",
					property: "recognition",
					lessonNumber: 1,
					question: "What is this?",
					correctAnswer: "ko kai",
					choices: ["ko kai", "kho khai"],
					srs: {
						easeFactor: 1.8,
						interval: 10,
						repetitions: 6,
						learningStep: 1,
						nextReviewDate: new Date().toISOString(),
						lastReviewDate: null,
						lapseCount: 1,
					},
				},
			},
			vocabCards: {},
			sessionHistory: [],
		} as unknown as LearnerState;

		const now = "2026-03-01T00:00:00.000Z";
		const state = migrateState(oldState, now);
		const card = state.cards["test:recognition"]!;

		expect(card.srs.learningStep).toBeNull();
		expect(card.srs.lapseCount).toBe(1);
		expect(card.srs.easeFactor).toBe(1.8);
		expect(card.srs.interval).toBe(LAPSE_RECOVERY_INTERVAL_MINUTES);
		expect(card.srs.nextReviewDate).toBe(
			new Date(
				new Date(now).getTime() + LAPSE_RECOVERY_INTERVAL_MINUTES * 60_000,
			).toISOString(),
		);
	});

	it("migrates vocab cards missing learningStep", () => {
		const oldState = {
			completedLessons: [],
			currentLesson: null,
			cards: {},
			vocabCards: {
				"vocab:test": {
					id: "vocab:test",
					question: "What does this mean?",
					correctAnswer: "hello",
					choices: ["hello", "bye"],
					srs: {
						easeFactor: 2.0,
						interval: 5,
						repetitions: 1,
						nextReviewDate: new Date().toISOString(),
						lastReviewDate: null,
					},
				},
			},
			sessionHistory: [],
		} as unknown as LearnerState;

		const state = migrateState(oldState);
		const card = state.vocabCards["vocab:test"]!;

		expect(card.srs.learningStep).toBe(null);
		expect(card.srs.lapseCount).toBe(0);
	});
});
