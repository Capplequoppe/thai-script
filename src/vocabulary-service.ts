import type { ApprenticeService } from "./apprentice-service";
import { generateVocabCards } from "./vocabulary-card-generator";
import {
	consonants,
	toneMarkRules,
	toneMarks,
	toneRules,
	vowels,
} from "./symbol";
import type { IStorage } from "./storage";
import type {
	VocabEntry,
	VocabLessonSummary,
	VocabularyCard,
} from "./vocabulary-types";

const BATCH_SIZE = 5;
const RANK_WINDOW_SIZE = 50;

export class VocabularyService {
	constructor(
		private readonly storage: IStorage,
		private readonly vocabulary: VocabEntry[],
		private readonly apprenticeService?: ApprenticeService,
	) {}

	/** Get set of all Thai characters mastered from completed script lessons. */
	private getMasteredCharacters(): Set<string> {
		const state = this.storage.load();
		const chars = new Set<string>();

		for (const sym of consonants) {
			if (
				sym.lesson != null &&
				state.completedLessons.includes(sym.lesson)
			) {
				chars.add(sym.character);
			}
		}
		for (const sym of vowels) {
			if (
				sym.lesson != null &&
				state.completedLessons.includes(sym.lesson)
			) {
				for (const ch of sym.character) {
					if ("\u0e00" <= ch && ch <= "\u0e7f") {
						chars.add(ch);
					}
				}
			}
		}
		for (const sym of toneMarks) {
			if (
				sym.lesson != null &&
				state.completedLessons.includes(sym.lesson)
			) {
				chars.add(sym.character);
			}
		}

		return chars;
	}

	/** Get set of all tone rule IDs mastered from completed script lessons. */
	private getMasteredToneRules(): Set<string> {
		const state = this.storage.load();
		const rules = new Set<string>();

		for (const rule of toneRules) {
			if (state.completedLessons.includes(rule.lesson)) {
				rules.add(rule.id);
			}
		}

		const markNameMap: Record<string, string> = {
			"mai ek": "mayek",
			"mai tho": "maytho",
			"mai tri": "maytri",
			"mai chattawa": "mayjattawa",
		};

		for (const rule of toneMarkRules) {
			if (state.completedLessons.includes(rule.lesson)) {
				const markId = markNameMap[rule.toneMarkName];
				if (markId) {
					rules.add(`${rule.consonantClass}-${markId}`);
				}
			}
		}

		return rules;
	}

	/** All words whose characters and tone rules are fully mastered, limited by rank window. */
	getUnlockedWords(): VocabEntry[] {
		const chars = this.getMasteredCharacters();
		const rules = this.getMasteredToneRules();

		const masteryFiltered = this.vocabulary.filter((entry) => {
			const allCharsMastered = entry.characters.every((ch) =>
				chars.has(ch),
			);
			const allRulesMastered = entry.toneRules.every((r) =>
				rules.has(r),
			);
			return allCharsMastered && allRulesMastered;
		});

		const state = this.storage.load();
		const learnedThaiWords = new Set(
			Object.values(state.vocabCards).map((c) => c.wordThai),
		);

		const sorted = [...masteryFiltered].sort(
			(a, b) =>
				(a.rank ?? Number.POSITIVE_INFINITY) -
				(b.rank ?? Number.POSITIVE_INFINITY),
		);

		const firstUnlearned = sorted.find(
			(e) => e.rank != null && !learnedThaiWords.has(e.thai),
		);
		const maxRank =
			firstUnlearned?.rank != null
				? firstUnlearned.rank + RANK_WINDOW_SIZE - 1
				: null;

		return masteryFiltered.filter((entry) => {
			if (learnedThaiWords.has(entry.thai)) return true;
			if (entry.rank == null) return false;
			if (maxRank == null) return false;
			return entry.rank <= maxRank;
		});
	}

	/** Unlocked words that don't yet have cards generated. Sorted by rank. */
	getUnlearnedWords(): VocabEntry[] {
		const state = this.storage.load();
		const learnedThaiWords = new Set(
			Object.values(state.vocabCards).map((c) => c.wordThai),
		);

		return this.getUnlockedWords()
			.filter((e) => !learnedThaiWords.has(e.thai))
			.sort((a, b) => (a.rank ?? Number.POSITIVE_INFINITY) - (b.rank ?? Number.POSITIVE_INFINITY));
	}

	/** Next batch of words to learn (up to BATCH_SIZE). */
	getNextLesson(): VocabLessonSummary | null {
		if (this.apprenticeService && !this.apprenticeService.canStartLesson()) {
			return null;
		}

		const words = this.getUnlearnedWords();
		if (words.length === 0) return null;
		return { words: words.slice(0, BATCH_SIZE) };
	}

	/** Generate cards for the next lesson batch and save to storage. */
	startLesson(): VocabularyCard[] | null {
		if (this.apprenticeService && !this.apprenticeService.canStartLesson()) {
			return null;
		}

		const lesson = this.getNextLesson();
		if (!lesson) throw new Error("No vocabulary words available to learn");

		const allUnlocked = this.getUnlockedWords();
		const cards = lesson.words.flatMap((entry) =>
			generateVocabCards(entry, allUnlocked),
		);

		const state = this.storage.load();
		for (const card of cards) {
			state.vocabCards[card.id] = card;
		}
		this.storage.save(state);

		return cards;
	}

	/** Count of unlocked (including learned) words. */
	getUnlockedCount(): number {
		return this.getUnlockedWords().length;
	}

	/** Count of words that have cards generated. */
	getLearnedCount(): number {
		const state = this.storage.load();
		return new Set(Object.values(state.vocabCards).map((c) => c.wordThai))
			.size;
	}
}
