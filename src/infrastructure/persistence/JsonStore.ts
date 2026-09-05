/**
 * A minimal validating JSON blob store, mirroring `Storage.ts`'s
 * `IStorage`/`LocalStorageAdapter`/`InMemoryStorage` split. Unlike
 * `IStorage` (which always returns *some* `LearnerState`, defaulting to
 * `INITIAL_LEARNER_STATE`), `JsonStore.load()` is three-state: a store that
 * has never been written to ("empty") must stay distinguishable from one
 * whose stored value is unreadable ("corrupt") — the caller decides what
 * each means, this layer only reports which happened.
 */
export type JsonStoreLoadResult<T> =
	| { readonly status: "empty" }
	| { readonly status: "ok"; readonly value: T }
	| { readonly status: "corrupt" };

export type JsonStoreSaveResult =
	| { readonly status: "ok" }
	| { readonly status: "failed" };

/** Narrows `unknown` to `T`, used to reject a parsed-but-wrong-shape value. */
export type JsonShapeGuard<T> = (value: unknown) => value is T;

export interface JsonStore<T> {
	load(): JsonStoreLoadResult<T>;
	save(value: T): JsonStoreSaveResult;
}

/**
 * Backed by `localStorage` under a caller-supplied `key`. Never throws:
 * invalid JSON, a value failing `isValidShape`, `localStorage` being
 * unavailable, or `setItem` throwing (e.g. `QuotaExceededError`) are all
 * surfaced as typed results.
 */
export class LocalStorageJsonStore<T> implements JsonStore<T> {
	constructor(
		private readonly key: string,
		private readonly isValidShape: JsonShapeGuard<T>,
	) {}

	load(): JsonStoreLoadResult<T> {
		if (typeof localStorage === "undefined") return { status: "empty" };
		const raw = localStorage.getItem(this.key);
		if (raw === null) return { status: "empty" };

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return { status: "corrupt" };
		}

		if (!this.isValidShape(parsed)) return { status: "corrupt" };
		return { status: "ok", value: parsed };
	}

	save(value: T): JsonStoreSaveResult {
		if (typeof localStorage === "undefined") return { status: "ok" };
		try {
			localStorage.setItem(this.key, JSON.stringify(value));
			return { status: "ok" };
		} catch {
			return { status: "failed" };
		}
	}
}

/** In-memory equivalent, for tests and non-browser callers. */
export class InMemoryJsonStore<T> implements JsonStore<T> {
	private value: T | undefined;

	load(): JsonStoreLoadResult<T> {
		return this.value === undefined
			? { status: "empty" }
			: { status: "ok", value: this.value };
	}

	save(value: T): JsonStoreSaveResult {
		this.value = value;
		return { status: "ok" };
	}
}
