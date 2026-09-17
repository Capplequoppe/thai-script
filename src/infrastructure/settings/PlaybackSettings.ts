import { LocalStorageJsonStore } from "../persistence/JsonStore";

/**
 * How fast narration plays, remembered across slides and lessons.
 *
 * Its own key rather than a field on `thai-srs-state`, and — like
 * `LESSON_FORMAT_STORAGE_KEY` and unlike `ORIENTATION_SEEN_STORAGE_KEY` — it
 * is **not** cleared by "Reset All Progress" and never travels in an exported
 * progress file. A learner who finds the default too quick has that opinion
 * about their own ears, not about their place in the course; starting the
 * course again does not make the narration easier to follow, and carrying the
 * preference to another device along with progress would impose one person's
 * hearing on whoever opens it there.
 */
export const PLAYBACK_RATE_STORAGE_KEY = "thai-playback-rate";

/**
 * The offered rates.
 *
 * Below 0.75 the vocoder's artefacts become the loudest thing in the clip,
 * which teaches a learner to expect a sound no Thai speaker makes. Above 2.0
 * the narration stops being listenable at all. In between, the quarter steps
 * are large enough to be worth a press — an eighth is not audible on speech
 * this short.
 */
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export const DEFAULT_PLAYBACK_RATE: PlaybackRate = 1;

function isRate(value: unknown): value is PlaybackRate {
	return (
		typeof value === "number" &&
		(PLAYBACK_RATES as readonly number[]).includes(value)
	);
}

const store = new LocalStorageJsonStore<PlaybackRate>(
	PLAYBACK_RATE_STORAGE_KEY,
	isRate,
);

/**
 * The stored rate, or 1.0.
 *
 * A value that is not one of the offered rates is treated as absent rather
 * than clamped: it can only come from a hand-edited key or a version that
 * offered a rate this one does not, and silently playing at the nearest
 * neighbour would be a change the learner never asked for and cannot see.
 */
export function getPlaybackRate(): PlaybackRate {
	const loaded = store.load();
	return loaded.status === "ok" ? loaded.value : DEFAULT_PLAYBACK_RATE;
}

export function setPlaybackRate(rate: PlaybackRate): void {
	store.save(rate);
}
