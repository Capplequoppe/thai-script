import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	CONVERSATION_BACKEND_URL_STORAGE_KEY,
	DEFAULT_CONVERSATION_BACKEND_URL,
	getConversationBackendToken,
	getConversationBackendUrl,
	setConversationBackendToken,
	setConversationBackendUrl,
} from "./ConversationBackendSettings";

/**
 * jsdom (and Node's own experimental global) both leave `localStorage`
 * unreliable in a vitest `node`/`jsdom` environment without extra
 * configuration (see `JsonStore.test.ts`), so tests here run against a
 * small hand-built stand-in rather than relying on either.
 */
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
	// biome-ignore lint/suspicious/noExplicitAny: test-only global stub
	(globalThis as any).localStorage = fakeLocalStorage;
});

afterEach(() => {
	// biome-ignore lint/suspicious/noExplicitAny: test-only global stub
	delete (globalThis as any).localStorage;
});

describe("getConversationBackendUrl", () => {
	it("defaults to the same-machine URL when nothing has been saved", () => {
		expect(getConversationBackendUrl()).toBe(DEFAULT_CONVERSATION_BACKEND_URL);
	});

	it("returns whatever setConversationBackendUrl last saved", () => {
		setConversationBackendUrl("http://192.168.1.23:8000");
		expect(getConversationBackendUrl()).toBe("http://192.168.1.23:8000");
	});

	it("falls back to the default when the stored value is corrupt", () => {
		fakeLocalStorage.setItem(
			CONVERSATION_BACKEND_URL_STORAGE_KEY,
			"{ not json",
		);
		expect(getConversationBackendUrl()).toBe(DEFAULT_CONVERSATION_BACKEND_URL);
	});

	it("falls back to the default when the stored value fails the shape guard", () => {
		fakeLocalStorage.setItem(
			CONVERSATION_BACKEND_URL_STORAGE_KEY,
			JSON.stringify({ baseUrl: "" }),
		);
		expect(getConversationBackendUrl()).toBe(DEFAULT_CONVERSATION_BACKEND_URL);
	});
});

describe("setConversationBackendUrl", () => {
	it("trims surrounding whitespace before saving", () => {
		setConversationBackendUrl("  http://192.168.1.23:8000  ");
		expect(getConversationBackendUrl()).toBe("http://192.168.1.23:8000");
	});

	it("resets to the default when saved a blank value, rather than persisting one", () => {
		setConversationBackendUrl("http://192.168.1.23:8000");
		setConversationBackendUrl("   ");
		expect(getConversationBackendUrl()).toBe(DEFAULT_CONVERSATION_BACKEND_URL);
	});

	it("leaves an already-saved auth token untouched", () => {
		setConversationBackendToken("s3cret");
		setConversationBackendUrl("http://192.168.1.23:8000");
		expect(getConversationBackendToken()).toBe("s3cret");
	});
});

describe("getConversationBackendToken", () => {
	it("defaults to empty when nothing has been saved", () => {
		expect(getConversationBackendToken()).toBe("");
	});

	it("returns whatever setConversationBackendToken last saved", () => {
		setConversationBackendToken("s3cret");
		expect(getConversationBackendToken()).toBe("s3cret");
	});

	it("reads as empty against a blob saved before this field existed", () => {
		fakeLocalStorage.setItem(
			CONVERSATION_BACKEND_URL_STORAGE_KEY,
			JSON.stringify({ baseUrl: "http://192.168.1.23:8000" }),
		);
		expect(getConversationBackendToken()).toBe("");
		expect(getConversationBackendUrl()).toBe("http://192.168.1.23:8000");
	});
});

describe("setConversationBackendToken", () => {
	it("trims surrounding whitespace before saving", () => {
		setConversationBackendToken("  s3cret  ");
		expect(getConversationBackendToken()).toBe("s3cret");
	});

	it("accepts an empty value as a real state, not rejected back to anything", () => {
		setConversationBackendToken("s3cret");
		setConversationBackendToken("");
		expect(getConversationBackendToken()).toBe("");
	});

	it("leaves the already-saved backend URL untouched", () => {
		setConversationBackendUrl("http://192.168.1.23:8000");
		setConversationBackendToken("s3cret");
		expect(getConversationBackendUrl()).toBe("http://192.168.1.23:8000");
	});
});
