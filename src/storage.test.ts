import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "./storage";
import type { LearnerState } from "./types";
import { INITIAL_LEARNER_STATE } from "./types";

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
