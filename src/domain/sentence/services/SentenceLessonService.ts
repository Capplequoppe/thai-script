import type { CardRepository } from "../../ports/CardRepository";
import type { ApprenticeService } from "../../shared/services/ApprenticeService";
import type { VocabularyService } from "../../vocabulary/services/VocabularyLessonService";
import { SentenceReviewCard } from "../entities/SentenceReviewCard";
import type {
	SentenceCard,
	SentenceEntry,
	SentenceLessonSummary,
} from "../types";
import { generateSentenceCards } from "./SentenceCardGenerator";

const BATCH_SIZE = 3;

export class SentenceService {
	constructor(
		private readonly cardRepo: CardRepository,
		private readonly sentenceData: SentenceEntry[],
		private readonly vocabService: VocabularyService,
		private readonly apprenticeService?: ApprenticeService,
	) {}

	private getLearnedWordSet(): Set<string> {
		const entries = this.vocabService.getLearnedEntries();
		return new Set(entries.map((e) => e.thai));
	}

	getUnlockedSentences(): SentenceEntry[] {
		const learnedWords = this.getLearnedWordSet();
		return [...this.sentenceData]
			.filter((entry) => entry.words.every((word) => learnedWords.has(word)))
			.sort((a, b) => a.difficulty - b.difficulty);
	}

	getUnlearnedSentences(): SentenceEntry[] {
		const sentenceCards = this.cardRepo.findAll("sentence");
		const learnedSentenceIds = new Set(
			sentenceCards.map((c) => (c as SentenceReviewCard).sentenceId),
		);
		return this.getUnlockedSentences().filter(
			(entry) => !learnedSentenceIds.has(entry.id),
		);
	}

	getNextLesson(): SentenceLessonSummary | null {
		if (this.apprenticeService && !this.apprenticeService.canStartLesson()) {
			return null;
		}
		const unlearned = this.getUnlearnedSentences();
		if (unlearned.length === 0) return null;
		return { sentences: unlearned.slice(0, BATCH_SIZE) };
	}

	startLesson(): SentenceCard[] | null {
		const lesson = this.getNextLesson();
		if (!lesson) return null;

		const cardDTOs = lesson.sentences.flatMap((entry) =>
			generateSentenceCards(entry),
		);

		const entities = cardDTOs.map((dto) => SentenceReviewCard.fromDTO(dto));
		this.cardRepo.saveAll(entities);

		return cardDTOs;
	}

	getUnlockedCount(): number {
		return this.getUnlockedSentences().length;
	}

	getLearnedCount(): number {
		const sentenceCards = this.cardRepo.findAll("sentence");
		return new Set(
			sentenceCards.map((c) => (c as SentenceReviewCard).sentenceId),
		).size;
	}
}
