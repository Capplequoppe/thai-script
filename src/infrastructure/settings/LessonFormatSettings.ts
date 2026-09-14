import type { LessonFormat } from "../../domain/script/data/lessonContent";
import { LocalStorageJsonStore } from "../persistence/JsonStore";

/**
 * Which lesson presentation this browser should use.
 *
 * `video` is the original ThaiPod101 `.webm` per lesson — the path every
 * learner who started before the rebuild has been on. `deck` is the in-house
 * slide deck: illustrations, ElevenLabs narration, scene-grammar mnemonics and
 * a retrieval step before each reveal.
 */
export type { LessonFormat };

/**
 * Deliberately its own key, never a field on `thai-srs-state`: this is a
 * device-local *presentation* preference, not learner progress. It must
 * survive "Reset All Progress" and must never travel inside an exported
 * progress file — importing someone else's export should not silently switch
 * which lesson material you see. Mirrors `CONVERSATION_BACKEND_URL_STORAGE_KEY`
 * and `GAME_HISTORY_STORAGE_KEY`, for the same reason.
 */
export const LESSON_FORMAT_STORAGE_KEY = "thai-lesson-format";

/**
 * Video, because the decks are the new thing and opting in should be a choice.
 * A learner who has never touched this setting keeps exactly the lessons they
 * had yesterday.
 */
export const DEFAULT_LESSON_FORMAT: LessonFormat = "video";

function isLessonFormat(value: unknown): value is LessonFormat {
	return value === "video" || value === "deck";
}

const store = new LocalStorageJsonStore<LessonFormat>(
	LESSON_FORMAT_STORAGE_KEY,
	isLessonFormat,
);

/**
 * The format this browser is set to.
 *
 * Anything unreadable — absent, corrupt, a value written by a newer build —
 * reads as the default rather than throwing. A presentation preference is not
 * worth failing a lesson over, and the default is the pre-rebuild behaviour, so
 * the worst case is a learner seeing the material they already had.
 */
export function getLessonFormat(): LessonFormat {
	const loaded = store.load();
	return loaded.status === "ok" && isLessonFormat(loaded.value)
		? loaded.value
		: DEFAULT_LESSON_FORMAT;
}

export function setLessonFormat(format: LessonFormat): void {
	store.save(format);
}
