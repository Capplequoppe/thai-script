import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type LessonSequenceEntry,
	lessonSequence,
} from "../../domain/script/data/lessonSequence";
import type { LearnerState } from "../../domain/shared/types";
import { INITIAL_LEARNER_STATE } from "../../domain/shared/types";
import {
	InMemoryStorage,
	LessonIdentityMigrationError,
	LocalStorageAdapter,
	migrateLessonIdentity,
	migrateState,
} from "./Storage";

// --- minimal localStorage fake for the adapter under node ---

class FakeLocalStorage implements Storage {
	private store = new Map<string, string>();
	get length(): number {
		return this.store.size;
	}
	clear(): void {
		this.store.clear();
	}
	getItem(key: string): string | null {
		return this.store.has(key) ? (this.store.get(key) as string) : null;
	}
	key(index: number): string | null {
		return Array.from(this.store.keys())[index] ?? null;
	}
	removeItem(key: string): void {
		this.store.delete(key);
	}
	setItem(key: string, value: string): void {
		this.store.set(key, value);
	}
}

let fakeLocalStorage: FakeLocalStorage;

beforeEach(() => {
	fakeLocalStorage = new FakeLocalStorage();
	globalThis.localStorage = fakeLocalStorage;
});

afterEach(() => {
	Reflect.deleteProperty(globalThis, "localStorage");
});

// --- fixtures ---

const KEY = "thai-srs-state";

function cardJson(id: string, character: string, lessonNumber: number): string {
	return `"${id}":{"id":"${id}","question":"What sound does ${character} make?","correctAnswer":"m","choices":["m","n","ng","y"],"srs":{"easeFactor":2.5,"interval":10,"repetitions":0,"learningStep":1,"nextReviewDate":"2026-01-01T00:00:00.000Z","lastReviewDate":null,"lapseCount":0},"symbolCharacter":"${character}","property":"initialSound","lessonNumber":${lessonNumber}}`;
}

/**
 * A `thai-srs-state` blob exactly as the app wrote it before this migration:
 * every one of the persisted lesson-identity stores of CONTEXT.md Rule 1 is
 * present and keyed by integer — `completedLessons`, `currentLesson`, a
 * card's `lessonNumber`, and a pending catch-up's `lessonNumber`.
 */
const FIVE_STORE_FIXTURE = `{"completedLessons":[1,2,3],"currentLesson":4,"cards":{${cardJson(
	"ม:initialSound",
	"ม",
	1,
)},${cardJson(
	"น:initialSound",
	"น",
	2,
)}},"vocabCards":{},"grammarCards":{},"sentenceCards":{},"sessionHistory":[],"achievements":["first_lesson"],"pendingCatchUps":[{"lessonNumber":3,"cardIds":["ม:initialSound"]}]}`;

function loadFixture(raw: string): LearnerState {
	fakeLocalStorage.setItem(KEY, raw);
	return new LocalStorageAdapter().load();
}

/** A short sequence whose declared order differs from its legacy numbering. */
const RESEQUENCED: readonly LessonSequenceEntry[] = [
	{ id: "lesson-consonants", position: 1, legacyNumber: 7 },
	{ id: "lesson-vowels", position: 2, legacyNumber: 4 },
	{ id: "lesson-tones", position: 3, legacyNumber: 9 },
];

function legacyState(): LearnerState {
	return {
		...structuredClone(INITIAL_LEARNER_STATE),
		completedLessons: [7, 4],
		currentLesson: 9,
		cards: {
			"ม:initialSound": {
				id: "ม:initialSound",
				question: "q",
				correctAnswer: "m",
				choices: ["m", "n"],
				srs: {
					easeFactor: 2.5,
					interval: 10,
					repetitions: 0,
					learningStep: 1,
					nextReviewDate: "2026-01-01T00:00:00.000Z",
					lastReviewDate: null,
					lapseCount: 0,
				},
				symbolCharacter: "ม",
				property: "initialSound",
				lessonNumber: 7,
			},
		},
		pendingCatchUps: [{ lessonNumber: 4, cardIds: ["ม:initialSound"] }],
	};
}

describe("migrateLessonIdentity", () => {
	it("converts every persisted store together onto the declared sequence", () => {
		const state = legacyState();

		migrateLessonIdentity(state, RESEQUENCED);

		expect(state.completedLessons).toEqual([1, 2]);
		expect(state.currentLesson).toBe(3);
		expect(state.cards["ม:initialSound"].lessonNumber).toBe(1);
		expect(state.pendingCatchUps).toEqual([
			{ lessonNumber: 2, cardIds: ["ม:initialSound"] },
		]);
	});

	it("leaves lessonNumber 0 — the no-lesson sentinel — alone", () => {
		const state = legacyState();
		state.cards["ม:initialSound"].lessonNumber = 0;

		migrateLessonIdentity(state, RESEQUENCED);

		expect(state.cards["ม:initialSound"].lessonNumber).toBe(0);
	});

	it("refuses a state carrying an undeclared lesson, naming every failing site, and converts nothing", () => {
		const state = legacyState();
		state.completedLessons = [7, 99];
		state.cards["ม:initialSound"].lessonNumber = 42;

		let thrown: unknown;
		try {
			migrateLessonIdentity(state, RESEQUENCED);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(LessonIdentityMigrationError);
		const sites = (thrown as LessonIdentityMigrationError).sites;
		expect(sites).toEqual([
			"completedLessons[1]: no lesson is declared with number 99",
			'cards["ม:initialSound"].lessonNumber: no lesson is declared with number 42',
		]);
		// Reported, not half-converted: even the resolvable references stay
		// exactly as they were.
		expect(state.completedLessons).toEqual([7, 99]);
		expect(state.currentLesson).toBe(9);
		expect(state.cards["ม:initialSound"].lessonNumber).toBe(42);
		expect(state.pendingCatchUps).toEqual([
			{ lessonNumber: 4, cardIds: ["ม:initialSound"] },
		]);
	});

	it("resolves retired legacy numbers 15-25 against the real default sequence via RETIRED_LESSONS", () => {
		// A state written under the pre-phase-4 25-lesson course: legacy 15
		// (retired, absorbed by lesson-12) and legacy 19 (retired, absorbed by
		// lesson-14) are real values that existed before task 4.3 resequenced
		// the course. No sequence override is passed here — this runs against
		// the actual `lessonSequence` the app ships, not a synthetic fixture,
		// so a regression to RETIRED_LESSONS or to resolve()'s fallback would
		// fail this test.
		const state = legacyState();
		state.completedLessons = [15];
		state.currentLesson = 19;
		state.cards["ม:initialSound"].lessonNumber = 15;
		state.pendingCatchUps = [{ lessonNumber: 19, cardIds: ["ม:initialSound"] }];

		const lesson12Position = lessonSequence.find(
			(entry) => entry.id === "lesson-12",
		)?.position;
		const lesson14Position = lessonSequence.find(
			(entry) => entry.id === "lesson-14",
		)?.position;
		expect(lesson12Position).toBeDefined();
		expect(lesson14Position).toBeDefined();

		expect(() => migrateLessonIdentity(state)).not.toThrow();

		expect(state.completedLessons).toEqual([lesson12Position]);
		expect(state.currentLesson).toBe(lesson14Position);
		expect(state.cards["ม:initialSound"].lessonNumber).toBe(lesson12Position);
		expect(state.pendingCatchUps).toEqual([
			{ lessonNumber: lesson14Position, cardIds: ["ม:initialSound"] },
		]);
	});

	it("unions pending catch-ups whose lessons merge onto one position", () => {
		const merged: readonly LessonSequenceEntry[] = [
			{ id: "lesson-merged", position: 1, legacyNumber: 7 },
			{ id: "lesson-merged-too", position: 1, legacyNumber: 4 },
		];
		const state = legacyState();
		state.completedLessons = [7];
		state.currentLesson = null;
		state.pendingCatchUps = [
			{ lessonNumber: 7, cardIds: ["a", "b"] },
			{ lessonNumber: 4, cardIds: ["b", "c"] },
		];

		migrateLessonIdentity(state, merged);

		expect(state.pendingCatchUps).toEqual([
			{ lessonNumber: 1, cardIds: ["a", "b", "c"] },
		]);
	});
});

describe("migrateState — the one conversion boundary (AC1, AC2)", () => {
	it("converts a five-store pre-migration fixture in one load", () => {
		const state = loadFixture(FIVE_STORE_FIXTURE);

		// Under the sequence as declared today the mapping is the identity —
		// nothing a learner has moves. Every store came through the one pass.
		expect(state.completedLessons).toEqual([1, 2, 3]);
		expect(state.currentLesson).toBe(4);
		expect(state.cards["ม:initialSound"].lessonNumber).toBe(1);
		expect(state.cards["น:initialSound"].lessonNumber).toBe(2);
		expect(state.pendingCatchUps).toEqual([
			{ lessonNumber: 3, cardIds: ["ม:initialSound"] },
		]);
	});

	it("re-serialises the pre-migration fixture byte-identically, and re-saving is stable", () => {
		const adapter = new LocalStorageAdapter();
		fakeLocalStorage.setItem(KEY, FIVE_STORE_FIXTURE);

		const state = adapter.load();
		expect(JSON.stringify(state)).toBe(FIVE_STORE_FIXTURE);

		adapter.save(state);
		expect(fakeLocalStorage.getItem(KEY)).toBe(FIVE_STORE_FIXTURE);
		expect(JSON.stringify(new LocalStorageAdapter().load())).toBe(
			FIVE_STORE_FIXTURE,
		);
	});

	it("runs the lesson conversion inside migrateState, not per consumer", () => {
		// The same entry point the adapter's load() calls, with an injected
		// sequence: the conversion is observable here and nowhere else.
		const state = migrateState(
			legacyState(),
			"2026-01-01T00:00:00.000Z",
			RESEQUENCED,
		);

		expect(state.completedLessons).toEqual([1, 2]);
		expect(state.currentLesson).toBe(3);
		expect(state.cards["ม:initialSound"].lessonNumber).toBe(1);
	});

	it("load() routes every read through migrateState — a legacy SRS shape is normalised", () => {
		const legacySrs = FIVE_STORE_FIXTURE.replaceAll(
			'"learningStep":1,',
			"",
		).replaceAll(',"lapseCount":0', "");
		const state = loadFixture(legacySrs);

		// A card missing `learningStep` predates the ladder and reads as
		// graduated: migrateSrsCard normalises it to null, and backfills
		// lapseCount — proof the load went through migrateState.
		expect(state.cards["ม:initialSound"].srs.learningStep).toBeNull();
		expect(state.cards["ม:initialSound"].srs.lapseCount).toBe(0);
	});

	it("refuses a fixture where only some stores still carry numbers", () => {
		// A hand-edited blob that half-adopted another representation:
		// `completedLessons` holds strings while the cards keep numbers.
		const halfConverted = FIVE_STORE_FIXTURE.replace(
			'"completedLessons":[1,2,3]',
			'"completedLessons":["lesson-01","lesson-02"]',
		);
		fakeLocalStorage.setItem(KEY, halfConverted);

		expect(() => new LocalStorageAdapter().load()).toThrow(
			/unreadable: completedLessons\[0\]: expected a lesson number/,
		);
		// The refusal names the site but never echoes the value.
		expect(() => new LocalStorageAdapter().load()).not.toThrow(/lesson-01/);
	});
});

describe("persisted state report (AC5)", () => {
	it("distinguishes never-written from written-and-empty", () => {
		const adapter = new LocalStorageAdapter();
		expect(adapter.inspect()).toEqual({ kind: "never-written" });

		adapter.save(structuredClone(INITIAL_LEARNER_STATE));
		expect(new LocalStorageAdapter().inspect()).toEqual({ kind: "empty" });
	});

	it("reports progress once anything is learned", () => {
		fakeLocalStorage.setItem(KEY, FIVE_STORE_FIXTURE);
		expect(new LocalStorageAdapter().inspect()).toEqual({ kind: "progress" });
	});

	it("reports written-but-unreadable with its reason", () => {
		fakeLocalStorage.setItem(KEY, "{not json");
		expect(new LocalStorageAdapter().inspect()).toEqual({
			kind: "unreadable",
			reason: "stored learner state is unreadable: not valid JSON",
		});
	});

	it("never reads unreadable as empty: load() throws instead of returning a fresh state", () => {
		fakeLocalStorage.setItem(KEY, "{not json");
		expect(() => new LocalStorageAdapter().load()).toThrow(/unreadable/);

		fakeLocalStorage.setItem(KEY, "");
		expect(() => new LocalStorageAdapter().load()).toThrow(/unreadable/);

		fakeLocalStorage.setItem(KEY, '{"completedLessons":{}}');
		expect(() => new LocalStorageAdapter().load()).toThrow(
			/unreadable: completedLessons: expected an array/,
		);
	});

	it("InMemoryStorage reports the same three states", () => {
		const storage = new InMemoryStorage();
		expect(storage.inspect()).toEqual({ kind: "never-written" });

		storage.save(structuredClone(INITIAL_LEARNER_STATE));
		expect(storage.inspect()).toEqual({ kind: "empty" });

		const state = storage.load();
		state.completedLessons.push(1);
		storage.save(state);
		expect(storage.inspect()).toEqual({ kind: "progress" });

		storage.reset();
		expect(storage.inspect()).toEqual({ kind: "never-written" });
	});
});

describe("importData migrates before it merges", () => {
	it("normalises an imported legacy blob through migrateState, then unions it", () => {
		const adapter = new LocalStorageAdapter();
		const current = structuredClone(INITIAL_LEARNER_STATE);
		current.completedLessons = [1];
		adapter.save(current);

		const legacyExport = FIVE_STORE_FIXTURE.replaceAll(
			'"learningStep":1,',
			"",
		).replaceAll(',"lapseCount":0', "");
		adapter.importData(legacyExport);

		const merged = adapter.load();
		expect(merged.completedLessons.sort()).toEqual([1, 2, 3]);
		// The imported card exists and carries the migrated SRS shape — proof
		// the import passed through migrateState before mergeLearnerStates.
		expect(merged.cards["ม:initialSound"].srs.learningStep).toBeNull();
		expect(merged.cards["ม:initialSound"].srs.lapseCount).toBe(0);
	});

	it("refuses an import whose lesson stores are half-converted", () => {
		const adapter = new LocalStorageAdapter();
		adapter.save(structuredClone(INITIAL_LEARNER_STATE));

		const halfConverted = FIVE_STORE_FIXTURE.replace(
			'"completedLessons":[1,2,3]',
			'"completedLessons":["lesson-01"]',
		);

		expect(() => adapter.importData(halfConverted)).toThrow(
			/Invalid progress file format: completedLessons\[0\]/,
		);
	});
});
