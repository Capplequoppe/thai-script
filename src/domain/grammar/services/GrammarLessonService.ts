import type { CardRepository } from "../../ports/CardRepository";
import type { ApprenticeService } from "../../shared/services/ApprenticeService";
import type { VocabCard } from "../../vocabulary/entities/VocabCard";
import type { VocabEntry } from "../../vocabulary/types";
import { GrammarReviewCard } from "../entities/GrammarReviewCard";
import type { GrammarCard, GrammarEntry, GrammarLessonSummary } from "../types";
import { generateGrammarCards } from "./GrammarCardGenerator";

const BATCH_SIZE = 3;

export class GrammarService {
	constructor(
		private readonly cardRepo: CardRepository,
		private readonly grammarData: GrammarEntry[],
		private readonly apprenticeService?: ApprenticeService,
		private readonly vocabularyData?: VocabEntry[],
	) {}

	private getMasteredVocabCounts(): {
		byClass: Record<string, number>;
		total: number;
	} {
		const vocabCards = this.cardRepo.findAll("vocab");
		const graduatedWords = new Set<string>();

		for (const card of vocabCards) {
			const vocabCard = card as VocabCard;
			if (vocabCard.schedule.learningStep === null) {
				graduatedWords.add(vocabCard.wordThai);
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
		const grammarCards = this.cardRepo.findAll("grammar");
		const learnedGrammarIds = new Set(
			grammarCards.map((c) => (c as GrammarReviewCard).grammarId),
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
		const grammarCards = this.cardRepo.findAll("grammar");
		const learnedGrammarIds = new Set(
			grammarCards.map((c) => (c as GrammarReviewCard).grammarId),
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

		const cardDTOs = lesson.grammarPoints.flatMap((entry) =>
			generateGrammarCards(entry),
		);

		const entities = cardDTOs.map((dto) => GrammarReviewCard.fromDTO(dto));
		this.cardRepo.saveAll(entities);

		return cardDTOs;
	}

	getUnlockedCount(): number {
		return this.getUnlockedGrammarPoints().length;
	}

	getLearnedCount(): number {
		const grammarCards = this.cardRepo.findAll("grammar");
		return new Set(grammarCards.map((c) => (c as GrammarReviewCard).grammarId))
			.size;
	}
}
