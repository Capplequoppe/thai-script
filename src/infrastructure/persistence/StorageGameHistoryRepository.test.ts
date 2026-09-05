import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GameHistoryEntry } from "../../domain/game/types";
import { InMemoryJsonStore, LocalStorageJsonStore } from "./JsonStore";
import { LocalStorageAdapter } from "./Storage";
import {
	GAME_HISTORY_STORAGE_KEY,
	isGameHistoryEntryArray,
	StorageGameHistoryRepository,
} from "./StorageGameHistoryRepository";

function makeEntry(
	id: string,
	playedAt: string,
	overrides: Partial<GameHistoryEntry> = {},
): GameHistoryEntry {
	return {
		id,
		playedAt,
		pools: ["script"],
		itemCount: 5,
		summary: {
			ratingCounts: { 1: 0, 2: 0, 3: 1, 4: 3, 5: 1 },
			ratedCount: 5,
			accuracy: 100,
		},
		...overrides,
	};
}

/**
 * jsdom (and Node's own experimental global) both leave `localStorage`
 * unreliable in a vitest environment without extra configuration, so
 * tests here run against a small hand-built stand-in rather than relying
 * on either. See `JsonStore.test.ts` for the same shim.
 */
class FakeLocalStorage implements Storage {
	private store = new Map<string, string>();
	setItemImpl: (key: string, value: string) => void = (key, value) => {
		this.store.set(key, value);
	};

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
		this.setItemImpl(key, value);
	}
}

let fakeLocalStorage: FakeLocalStorage;

beforeEach(() => {
	fakeLocalStorage = new FakeLocalStorage();
	// biome-ignore lint/suspicious/noExplicitAny: test-only global stub
	(globalThis as any).localStorage = fakeLocalStorage;
});

afterEach(() => {
	// biome-ignore lint/suspicious/noExplicitAny: test-only global stub
	delete (globalThis as any).localStorage;
});

function newLocalStorageRepository(): StorageGameHistoryRepository {
	return new StorageGameHistoryRepository(
		new LocalStorageJsonStore(
			GAME_HISTORY_STORAGE_KEY,
			isGameHistoryEntryArray,
		),
	);
}

describe("StorageGameHistoryRepository", () => {
	it("AC1: returns a saved entry from a fresh repository instance over the same store", () => {
		newLocalStorageRepository().save(
			makeEntry("a", "2026-01-01T00:00:00.000Z"),
		);

		const result = newLocalStorageRepository().list();
		expect(result).toEqual({
			status: "ok",
			entries: [makeEntry("a", "2026-01-01T00:00:00.000Z")],
		});
	});

	it("AC2: an unwritten history returns {status: 'ok', entries: []}", () => {
		expect(newLocalStorageRepository().list()).toEqual({
			status: "ok",
			entries: [],
		});
	});

	it("AC3: saving a game-history entry leaves the SRS LearnerState blob untouched", () => {
		const srsAdapter = new LocalStorageAdapter();
		const before = srsAdapter.load();
		const beforeRaw = fakeLocalStorage.getItem("thai-srs-state");

		newLocalStorageRepository().save(
			makeEntry("a", "2026-01-01T00:00:00.000Z"),
		);

		expect(fakeLocalStorage.getItem("thai-srs-state")).toBe(beforeRaw);
		expect(srsAdapter.load()).toEqual(before);
	});

	it("AC4: with localStorage unavailable, list() is empty and save() does not throw", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test-only global stub
		delete (globalThis as any).localStorage;

		const repo = newLocalStorageRepository();
		expect(repo.list()).toEqual({ status: "ok", entries: [] });
		expect(() =>
			repo.save(makeEntry("a", "2026-01-01T00:00:00.000Z")),
		).not.toThrow();
	});

	it("AC5: lists history most-recent-first after multiple saves", () => {
		const repo = newLocalStorageRepository();
		repo.save(makeEntry("first", "2026-01-01T00:00:00.000Z"));
		repo.save(makeEntry("second", "2026-01-03T00:00:00.000Z"));
		repo.save(makeEntry("third", "2026-01-02T00:00:00.000Z"));

		const result = repo.list();
		expect(result.status).toBe("ok");
		if (result.status !== "ok") throw new Error("unreachable");
		expect(result.entries.map((e) => e.id)).toEqual([
			"second",
			"third",
			"first",
		]);
	});

	it("AC6: a corrupt stored value never yields the same result as an empty store", () => {
		fakeLocalStorage.setItem(GAME_HISTORY_STORAGE_KEY, "{ not valid json");
		const corrupt = newLocalStorageRepository().list();
		expect(corrupt).toEqual({ status: "unavailable" });

		fakeLocalStorage.removeItem(GAME_HISTORY_STORAGE_KEY);
		const empty = newLocalStorageRepository().list();
		expect(empty).toEqual({ status: "ok", entries: [] });
		expect(corrupt).not.toEqual(empty);
	});

	it("AC6b: a value that parses but fails the shape check is also reported as corrupt", () => {
		fakeLocalStorage.setItem(
			GAME_HISTORY_STORAGE_KEY,
			JSON.stringify({ not: "an array of entries" }),
		);
		expect(newLocalStorageRepository().list()).toEqual({
			status: "unavailable",
		});
	});

	it("AC7: a setItem that throws surfaces as a typed failure, not an uncaught throw", () => {
		const repo = newLocalStorageRepository();
		fakeLocalStorage.setItemImpl = () => {
			throw new Error("QuotaExceededError");
		};

		expect(() =>
			repo.save(makeEntry("a", "2026-01-01T00:00:00.000Z")),
		).not.toThrow();
	});

	it("AC8: an SRS reset does not affect saved game history", () => {
		const repo = newLocalStorageRepository();
		repo.save(makeEntry("a", "2026-01-01T00:00:00.000Z"));

		new LocalStorageAdapter().reset();

		expect(repo.list()).toEqual({
			status: "ok",
			entries: [makeEntry("a", "2026-01-01T00:00:00.000Z")],
		});
	});

	it("round-trips through an InMemoryJsonStore too", () => {
		const store = new InMemoryJsonStore<GameHistoryEntry[]>();
		const repo = new StorageGameHistoryRepository(store);

		expect(repo.list()).toEqual({ status: "ok", entries: [] });
		repo.save(makeEntry("a", "2026-01-01T00:00:00.000Z"));
		expect(repo.list()).toEqual({
			status: "ok",
			entries: [makeEntry("a", "2026-01-01T00:00:00.000Z")],
		});
	});
});
