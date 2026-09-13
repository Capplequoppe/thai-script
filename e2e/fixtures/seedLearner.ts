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
const GRAMMAR_JSON = path.resolve(
	process.cwd(),
	"src/domain/grammar/data/grammar.json",
);

interface VocabularyFileEntry {
	thai: string;
	rank?: number | null;
}

interface GrammarFileEntry {
	id: string;
	lessonNumber: number;
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

let grammarIdsCache: string[] | null = null;

/** Every real grammar id in `grammar.json`, in lesson order. */
function rankedGrammarIds(): string[] {
	if (grammarIdsCache) return grammarIdsCache;
	const entries = JSON.parse(
		readFileSync(GRAMMAR_JSON, "utf8"),
	) as GrammarFileEntry[];
	grammarIdsCache = [...entries]
		.sort((a, b) => a.lessonNumber - b.lessonNumber)
		.map((e) => e.id);
	return grammarIdsCache;
}

/**
 * The first `count` real grammar ids — used to seed a learner past
 * conversation practice's grammar-count threshold (`MIN_GRAMMAR_POINTS`),
 * without this fixture depending on the exact ids `grammar.json` happens
 * to define.
 */
export function firstGrammarIds(count: number): string[] {
	const ids = rankedGrammarIds();
	if (ids.length < count) {
		throw new Error(`grammar.json has fewer than ${count} grammar points`);
	}
	return ids.slice(0, count);
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
 * Give `page` a learner who has learned `learnedWordCount` words, and
 * (optionally) `learnedGrammarIds` grammar points — e.g. `firstGrammarIds(5)`
 * to also cross conversation practice's grammar-count threshold.
 *
 * Returns the exact words seeded, so a spec can assert against the same set
 * the app will send to the backend. Must be called before `page.goto`.
 */
export async function seedLearnedVocabulary(
	page: Page,
	learnedWordCount: number,
	gapEvery = 7,
	learnedGrammarIds: readonly string[] = [],
): Promise<string[]> {
	const words = gappyKnownWords(learnedWordCount, gapEvery);
	await page.addInitScript(
		({
			key,
			words,
			grammarIds,
		}: {
			key: string;
			words: string[];
			grammarIds: readonly string[];
		}) => {
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
			const grammarCards: Record<string, unknown> = {};
			for (const grammarId of grammarIds) {
				const id = `grammar:${grammarId}:recognition`;
				grammarCards[id] = {
					id,
					question: `question for ${grammarId}`,
					correctAnswer: "answer",
					choices: ["answer"],
					srs: {
						easeFactor: 2.0,
						interval: 10,
						repetitions: 1,
						learningStep: null,
						nextReviewDate: dueAt,
						lastReviewDate: null,
						lapseCount: 0,
					},
					grammarId,
					property: "recognition",
				};
			}
			localStorage.setItem(
				key,
				JSON.stringify({
					completedLessons: [],
					currentLesson: null,
					cards: {},
					vocabCards,
					grammarCards,
					sentenceCards: {},
					sessionHistory: [],
					achievements: [],
				}),
			);
		},
		{ key: STORAGE_KEY, words, grammarIds: learnedGrammarIds },
	);
	return words;
}
