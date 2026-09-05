import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	InMemoryJsonStore,
	type JsonShapeGuard,
	LocalStorageJsonStore,
} from "./JsonStore";

interface Widget {
	readonly name: string;
}

const isWidget: JsonShapeGuard<Widget[]> = (value): value is Widget[] =>
	Array.isArray(value) &&
	value.every(
		(v) =>
			v !== null &&
			typeof v === "object" &&
			typeof (v as Record<string, unknown>).name === "string",
	);

const KEY = "json-store-test-key";

/**
 * jsdom (and Node's own experimental global) both leave `localStorage`
 * unreliable in a vitest `node`/`jsdom` environment without extra
 * configuration, so tests here run against a small hand-built stand-in
 * rather than relying on either.
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

describe("LocalStorageJsonStore", () => {
	it("reports an unwritten key as empty", () => {
		const store = new LocalStorageJsonStore<Widget[]>(KEY, isWidget);
		expect(store.load()).toEqual({ status: "empty" });
	});

	it("round-trips a saved value through a fresh instance over the same key", () => {
		const writer = new LocalStorageJsonStore<Widget[]>(KEY, isWidget);
		writer.save([{ name: "gear" }]);

		const reader = new LocalStorageJsonStore<Widget[]>(KEY, isWidget);
		expect(reader.load()).toEqual({
			status: "ok",
			value: [{ name: "gear" }],
		});
	});

	it("reports invalid JSON as corrupt, never as empty or a throw", () => {
		fakeLocalStorage.setItem(KEY, "{ not json");
		const store = new LocalStorageJsonStore<Widget[]>(KEY, isWidget);
		expect(() => store.load()).not.toThrow();
		expect(store.load()).toEqual({ status: "corrupt" });
	});

	it("reports JSON that fails the shape guard as corrupt", () => {
		fakeLocalStorage.setItem(
			KEY,
			JSON.stringify({ totally: "not a widget list" }),
		);
		const store = new LocalStorageJsonStore<Widget[]>(KEY, isWidget);
		expect(store.load()).toEqual({ status: "corrupt" });
	});

	it("distinguishes corrupt from empty", () => {
		const store = new LocalStorageJsonStore<Widget[]>(KEY, isWidget);
		fakeLocalStorage.setItem(KEY, "not json");
		const corrupt = store.load();
		fakeLocalStorage.removeItem(KEY);
		const empty = store.load();
		expect(corrupt.status).toBe("corrupt");
		expect(empty.status).toBe("empty");
		expect(corrupt.status).not.toBe(empty.status);
	});

	it("surfaces a throwing setItem as a failed save, not an uncaught throw", () => {
		const store = new LocalStorageJsonStore<Widget[]>(KEY, isWidget);
		fakeLocalStorage.setItemImpl = () => {
			throw new Error("QuotaExceededError");
		};

		let result: ReturnType<typeof store.save> | undefined;
		expect(() => {
			result = store.save([{ name: "gear" }]);
		}).not.toThrow();
		expect(result).toEqual({ status: "failed" });
	});

	it("does not throw and reports empty/ok when localStorage is unavailable", () => {
		// biome-ignore lint/suspicious/noExplicitAny: test-only global stub
		delete (globalThis as any).localStorage;

		const store = new LocalStorageJsonStore<Widget[]>(KEY, isWidget);
		expect(store.load()).toEqual({ status: "empty" });
		expect(() => store.save([{ name: "gear" }])).not.toThrow();
		expect(store.save([{ name: "gear" }])).toEqual({ status: "ok" });
	});
});

describe("InMemoryJsonStore", () => {
	it("starts empty and reflects saved values", () => {
		const store = new InMemoryJsonStore<Widget[]>();
		expect(store.load()).toEqual({ status: "empty" });

		store.save([{ name: "gear" }]);
		expect(store.load()).toEqual({ status: "ok", value: [{ name: "gear" }] });
	});
});
