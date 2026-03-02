import type { CardRepository } from "../../ports/CardRepository";
import type { LearnerStateRepository } from "../../ports/LearnerStateRepository";
import {
	consonants,
	toneMarkRules,
	toneMarks,
	toneRules,
	vowels,
} from "../../script/data/symbols";
import { VocabCard } from "../entities/VocabCard";
import type { VocabEntry, VocabLessonSummary, VocabularyCard } from "../types";
import { generateVocabCards } from "./VocabCardGenerator";

const BATCH_SIZE = 5;
const RANK_WINDOW_SIZE = 50;
const MAX_VOCAB_APPRENTICE_WORDS = 20;

export class VocabularyService {
	constructor(
		private readonly cardRepo: CardRepository,
		private readonly stateRepo: LearnerStateRepository,
		private readonly vocabulary: VocabEntry[],
	) {}

	/** Get set of Thai words for which vocab cards have already been generated. */
	private getLearnedThaiWords(): Set<string> {
		const vocabCards = this.cardRepo.findAll("vocab");
		return new Set(vocabCards.map((c) => (c as VocabCard).wordThai));
	}

	/** Count of distinct Thai words currently at apprentice stage (isInLearning). */
	private getApprenticeVocabWordCount(): number {
		const vocabCards = this.cardRepo.findAll("vocab");
		const apprenticeWords = new Set<string>();
		for (const card of vocabCards) {
			if (card.schedule.isInLearning) {
				apprenticeWords.add((card as VocabCard).wordThai);
			}
		}
		return apprenticeWords.size;
	}

	/** Get set of all Thai characters mastered from completed script lessons. */
	private getMasteredCharacters(): Set<string> {
		const completedLessons = this.stateRepo.getCompletedLessons();
		const chars = new Set<string>();

		for (const sym of consonants) {
			if (sym.lesson != null && completedLessons.includes(sym.lesson)) {
				chars.add(sym.character);
			}
		}
		for (const sym of vowels) {
			if (sym.lesson != null && completedLessons.includes(sym.lesson)) {
				for (const ch of sym.character) {
					if ("\u0e00" <= ch && ch <= "\u0e7f") {
						chars.add(ch);
					}
				}
			}
		}
		for (const sym of toneMarks) {
			if (sym.lesson != null && completedLessons.includes(sym.lesson)) {
				chars.add(sym.character);
			}
		}

		return chars;
	}

	/** Get set of all tone rule IDs mastered from completed script lessons. */
	private getMasteredToneRules(): Set<string> {
		const completedLessons = this.stateRepo.getCompletedLessons();
		const rules = new Set<string>();

		for (const rule of toneRules) {
			if (completedLessons.includes(rule.lesson)) {
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
			if (completedLessons.includes(rule.lesson)) {
				const markId = markNameMap[rule.toneMarkName];
				if (markId) {
					rules.add(`${rule.consonantClass}-${markId}`);
				}
			}
		}

		return rules;
	}

	/** Check whether a word's characters and tone rules are fully mastered. */
	private isWordMastered(
		entry: VocabEntry,
		chars: Set<string>,
		rules: Set<string>,
	): boolean {
		return (
			entry.characters.every((ch) => chars.has(ch)) &&
			entry.toneRules.every((r) => rules.has(r))
		);
	}

	/** All words whose characters and tone rules are fully mastered, limited by rank window.
	 *
	 *  The rank window is computed against ALL vocabulary (not just mastered words):
	 *  1. Find the first unlearned word by rank (regardless of mastery).
	 *  2. Allow only words within RANK_WINDOW_SIZE of that rank.
	 *  3. Filter that slice to words whose characters and tone rules are mastered.
	 */
	getUnlockedWords(): VocabEntry[] {
		const learnedThaiWords = this.getLearnedThaiWords();

		// 1. Find the first unlearned word by rank across ALL vocabulary
		const sortedAll = [...this.vocabulary]
			.filter((e) => e.rank != null)
			.sort((a, b) => a.rank! - b.rank!);

		const firstUnlearned = sortedAll.find((e) => !learnedThaiWords.has(e.thai));
		const maxRank =
			firstUnlearned?.rank != null
				? firstUnlearned.rank + RANK_WINDOW_SIZE - 1
				: null;

		// 2. Apply rank window, then filter by mastery
		const chars = this.getMasteredCharacters();
		const rules = this.getMasteredToneRules();

		return this.vocabulary.filter((entry) => {
			if (learnedThaiWords.has(entry.thai)) {
				return this.isWordMastered(entry, chars, rules);
			}
			if (entry.rank == null) return false;
			if (maxRank == null) return false;
			return entry.rank <= maxRank && this.isWordMastered(entry, chars, rules);
		});
	}

	/** Unlocked words that don't yet have cards generated. Sorted by rank. */
	getUnlearnedWords(): VocabEntry[] {
		const learnedThaiWords = this.getLearnedThaiWords();

		return this.getUnlockedWords()
			.filter((e) => !learnedThaiWords.has(e.thai))
			.sort(
				(a, b) =>
					(a.rank ?? Number.POSITIVE_INFINITY) -
					(b.rank ?? Number.POSITIVE_INFINITY),
			);
	}

	/** Next batch of words to learn (up to BATCH_SIZE). */
	getNextLesson(): VocabLessonSummary | null {
		if (this.getApprenticeVocabWordCount() >= MAX_VOCAB_APPRENTICE_WORDS) {
			return null;
		}

		const words = this.getUnlearnedWords();
		if (words.length === 0) return null;
		return { words: words.slice(0, BATCH_SIZE) };
	}

	/** Generate cards for the next lesson batch WITHOUT persisting them. */
	generateLessonCards(): VocabularyCard[] | null {
		if (this.getApprenticeVocabWordCount() >= MAX_VOCAB_APPRENTICE_WORDS) {
			return null;
		}

		const lesson = this.getNextLesson();
		if (!lesson) throw new Error("No vocabulary words available to learn");

		return lesson.words.flatMap((entry) =>
			generateVocabCards(entry, this.vocabulary),
		);
	}

	/** Persist previously generated lesson cards to the repository. */
	commitLessonCards(cards: VocabularyCard[]): void {
		const domainCards = cards.map((card) => VocabCard.fromDTO(card));
		this.cardRepo.saveAll(domainCards);
	}

	/** Count of unlocked (including learned) words. */
	getUnlockedCount(): number {
		return this.getUnlockedWords().length;
	}

	/** Count of words that are eligible but not yet learned. */
	getUnlearnedCount(): number {
		return this.getUnlearnedWords().length;
	}

	/** Count of words that have cards generated. */
	getLearnedCount(): number {
		return this.getLearnedThaiWords().size;
	}

	/** Full VocabEntry for every word the learner has cards for, sorted by rank. */
	getLearnedEntries(): VocabEntry[] {
		const learnedThaiWords = this.getLearnedThaiWords();
		return this.vocabulary
			.filter((entry) => learnedThaiWords.has(entry.thai))
			.sort(
				(a, b) =>
					(a.rank ?? Number.POSITIVE_INFINITY) -
					(b.rank ?? Number.POSITIVE_INFINITY),
			);
	}
}
