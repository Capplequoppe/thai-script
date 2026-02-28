import type { ApprenticeService } from "./apprentice-service";
import { generateGrammarCards } from "./grammar-card-generator";
import type {
	GrammarCard,
	GrammarEntry,
	GrammarLessonSummary,
} from "./grammar-types";
import type { IStorage } from "./storage";
import type { VocabEntry } from "./vocabulary-types";

const BATCH_SIZE = 3;

export class GrammarService {
	constructor(
		private readonly storage: IStorage,
		private readonly grammarData: GrammarEntry[],
		private readonly apprenticeService?: ApprenticeService,
		private readonly vocabularyData?: VocabEntry[],
	) {}

	private getMasteredVocabCounts(): {
		byClass: Record<string, number>;
		total: number;
	} {
		const state = this.storage.load();
		const graduatedWords = new Set<string>();

		for (const card of Object.values(state.vocabCards)) {
			if (card.srs.learningStep === null) {
				graduatedWords.add(card.wordThai);
			}
		}

		const byClass: Record<string, number> = {};
		let total = 0;

		if (this.vocabularyData) {
			for (const entry of this.vocabularyData) {
				if (graduatedWords.has(entry.thai)) {
					const cls = entry.word_class || "";
					byClass[cls] = (byClass[cls] ?? 0) + 1;
					total++;
				}
			}
		} else {
			total = graduatedWords.size;
		}

		return { byClass, total };
	}

	private meetsPrerequisites(
		entry: GrammarEntry,
		vocabCounts: { byClass: Record<string, number>; total: number },
	): boolean {
		for (const [cls, min] of Object.entries(
			entry.prerequisites.minVocabByClass,
		)) {
			if ((vocabCounts.byClass[cls] ?? 0) < min) return false;
		}
		if (
			entry.prerequisites.minTotalVocab != null &&
			vocabCounts.total < entry.prerequisites.minTotalVocab
		) {
			return false;
		}
		return true;
	}

	getUnlockedGrammarPoints(): GrammarEntry[] {
		const vocabCounts = this.getMasteredVocabCounts();
		const state = this.storage.load();
		const learnedGrammarIds = new Set(
			Object.values(state.grammarCards).map((c) => c.grammarId),
		);

		const sorted = [...this.grammarData].sort(
			(a, b) => a.lessonNumber - b.lessonNumber,
		);

		const unlocked: GrammarEntry[] = [];
		for (const entry of sorted) {
			if (!this.meetsPrerequisites(entry, vocabCounts)) continue;

			const previousMissing = sorted.some(
				(prev) =>
					prev.lessonNumber < entry.lessonNumber &&
					!learnedGrammarIds.has(prev.id) &&
					this.meetsPrerequisites(prev, vocabCounts),
			);
			if (previousMissing) continue;

			unlocked.push(entry);
		}

		return unlocked;
	}

	getUnlearnedGrammarPoints(): GrammarEntry[] {
		const state = this.storage.load();
		const learnedGrammarIds = new Set(
			Object.values(state.grammarCards).map((c) => c.grammarId),
		);
		return this.getUnlockedGrammarPoints().filter(
			(entry) => !learnedGrammarIds.has(entry.id),
		);
	}

	getNextLesson(): GrammarLessonSummary | null {
		if (this.apprenticeService && !this.apprenticeService.canStartLesson()) {
			return null;
		}
		const unlearned = this.getUnlearnedGrammarPoints();
		if (unlearned.length === 0) return null;
		return { grammarPoints: unlearned.slice(0, BATCH_SIZE) };
	}

	startLesson(): GrammarCard[] | null {
		const lesson = this.getNextLesson();
		if (!lesson) return null;

		const cards = lesson.grammarPoints.flatMap((entry) =>
			generateGrammarCards(entry),
		);

		const state = this.storage.load();
		for (const card of cards) {
			state.grammarCards[card.id] = card;
		}
		this.storage.save(state);

		return cards;
	}

	getUnlockedCount(): number {
		return this.getUnlockedGrammarPoints().length;
	}

	getLearnedCount(): number {
		const state = this.storage.load();
		return new Set(
			Object.values(state.grammarCards).map((c) => c.grammarId),
		).size;
	}
}
