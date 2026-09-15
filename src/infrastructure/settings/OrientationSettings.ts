import { LocalStorageJsonStore } from "../persistence/JsonStore";

/**
 * Whether this learner has been shown the orientation deck.
 *
 * Its own key rather than a field on `thai-srs-state`, because the orientation
 * is not a lesson: it teaches no symbol, schedules no card and holds no
 * position in the sequence, so there is nothing about it for the progress blob
 * to carry.
 *
 * Unlike `LESSON_FORMAT_STORAGE_KEY`, this one *is* cleared by "Reset All
 * Progress". That setting is a device preference and must survive a reset;
 * this is a fact about a learner's journey, and somebody starting the journey
 * again should be met by the orientation again rather than silently skipped
 * past the part that explains how any of it works.
 */
export const ORIENTATION_SEEN_STORAGE_KEY = "thai-orientation-seen";

/** The deck's id, and so its folder under `public/lessons/`. */
export const ORIENTATION_LESSON_ID = "orientation";

function isSeen(value: unknown): value is true {
	return value === true;
}

const store = new LocalStorageJsonStore<true>(
	ORIENTATION_SEEN_STORAGE_KEY,
	isSeen,
);

/**
 * Anything unreadable — absent, corrupt, written by a newer build — reads as
 * "not seen". The cost of being wrong in that direction is one extra look at a
 * page the learner can leave in a tap; the cost of the other direction is a
 * first-time learner never being told how the course works.
 */
export function hasSeenOrientation(): boolean {
	const loaded = store.load();
	return loaded.status === "ok" && isSeen(loaded.value);
}

export function markOrientationSeen(): void {
	store.save(true);
}

/**
 * Called by "Reset All Progress", which clears `thai-srs-state` through the
 * state repository and would otherwise leave this key behind — a learner who
 * had wiped everything would still be treated as having been oriented.
 *
 * Written against `localStorage` directly because `JsonStore` has no removal
 * operation, and guarded because the accessor itself throws in a browser set
 * to block site data. Failing to clear a flag is not worth failing a reset
 * over.
 */
export function clearOrientationSeen(): void {
	try {
		localStorage.removeItem(ORIENTATION_SEEN_STORAGE_KEY);
	} catch {
		// Storage unavailable. The flag defaults to "not seen" when unreadable,
		// so the learner still gets the orientation.
	}
}
