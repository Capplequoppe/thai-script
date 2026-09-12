import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

/**
 * Seeds a learner's SRS progress into `localStorage` before the app boots.
 *
 * Every e2e spec before this one just navigated against whatever the browser
 * profile happened to hold, which is fine while nothing about the app depends
 * on progress. Personalized content does depend on it — and phase 3's gating
 * will too — so this writes the real `LearnerState` shape
 * `LocalStorageAdapter` reads (`thai-srs-state`), with one real vocabulary
 * card per learned word.
 *
 * The seeded word list is deliberately **gappy**: rank-ordered with holes,
 * because `VocabularyLessonService.getUnlockedWords()` gates each word on
 * character and tone-rule mastery on top of frequency rank, so a real
 * learner's known set is never a clean prefix of `vocabulary.json`.
 */

const STORAGE_KEY = "thai-srs-state";
const VOCABULARY_JSON = path.resolve(
	process.cwd(),
	"src/domain/vocabulary/data/vocabulary.json",
);

interface VocabularyFileEntry {
	thai: string;
	rank?: number | null;
}

let rankedCache: string[] | null = null;

/** Every ranked vocabulary word, most common first — the app's own order. */
function rankedVocabulary(): string[] {
	if (rankedCache) return rankedCache;
	const entries = JSON.parse(
		readFileSync(VOCABULARY_JSON, "utf8"),
	) as VocabularyFileEntry[];
	const seen = new Set<string>();
	const words: string[] = [];
	for (const entry of entries
		.filter((e) => e.rank != null)
		.sort((a, b) => (a.rank as number) - (b.rank as number))) {
		const word = entry.thai.trim();
		if (word && !seen.has(word)) {
			seen.add(word);
			words.push(word);
		}
	}
	rankedCache = words;
	return words;
}

/** `count` known words, rank-ordered, with every `gapEvery`-th one missing. */
export function gappyKnownWords(count: number, gapEvery = 7): string[] {
	const ranked = rankedVocabulary();
	const known: string[] = [];
	for (let index = 0; known.length < count; index++) {
		if (index >= ranked.length) {
			throw new Error(`vocabulary has fewer than ${count} ranked words`);
		}
		if (index % gapEvery !== gapEvery - 1) known.push(ranked[index]);
	}
	return known;
}

/**
 * Give `page` a learner who has learned `learnedWordCount` words.
 *
 * Returns the exact words seeded, so a spec can assert against the same set
 * the app will send to the backend. Must be called before `page.goto`.
 */
export async function seedLearnedVocabulary(
	page: Page,
	learnedWordCount: number,
	gapEvery = 7,
): Promise<string[]> {
	const words = gappyKnownWords(learnedWordCount, gapEvery);
	await page.addInitScript(
		({ key, words }: { key: string; words: string[] }) => {
			// Due a minute ago, so the seeded progress is visible as review
			// work rather than only as a stored count.
			const dueAt = new Date(Date.now() - 60_000).toISOString();
			const vocabCards: Record<string, unknown> = {};
			for (const thai of words) {
				const id = `vocab:${thai}:thaiToEnglish`;
				vocabCards[id] = {
					id,
					question: thai,
					correctAnswer: thai,
					choices: [thai],
					srs: {
						easeFactor: 2.0,
						interval: 10,
						repetitions: 1,
						learningStep: null,
						nextReviewDate: dueAt,
						lastReviewDate: null,
						lapseCount: 0,
					},
					promptWord: thai,
					property: "thaiToEnglish",
				};
			}
			localStorage.setItem(
				key,
				JSON.stringify({
					completedLessons: [],
					currentLesson: null,
					cards: {},
					vocabCards,
					grammarCards: {},
					sentenceCards: {},
					sessionHistory: [],
					achievements: [],
				}),
			);
		},
		{ key: STORAGE_KEY, words },
	);
	return words;
}
