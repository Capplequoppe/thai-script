import type { CardRepository } from "../../ports/CardRepository";
import type { ApprenticeService } from "../../shared/services/ApprenticeService";
import { reconcileGeneratedCards } from "../../shared/services/reconcileCards";
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

	private getLearnedSentenceEntries(): SentenceEntry[] {
		const sentenceCards = this.cardRepo.findAll("sentence");
		const learnedSentenceIds = new Set(
			sentenceCards.map((c) => (c as SentenceReviewCard).sentenceId),
		);
		return this.sentenceData.filter((entry) =>
			learnedSentenceIds.has(entry.id),
		);
	}

	/**
	 * Backfills already-learned sentences with any card the current generator
	 * would now produce for them that isn't persisted yet (e.g. audio landing
	 * for a sentence learned before it had any), or an `audioUrl` on a
	 * persisted card that previously had none. See `reconcileGeneratedCards`
	 * for the exact, deliberately narrow rules.
	 */
	reconcileCards(): void {
		const persisted = (
			this.cardRepo.findAll("sentence") as SentenceReviewCard[]
		).map((card) => card.toDTO() as SentenceCard);
		const generated = this.getLearnedSentenceEntries().flatMap((entry) =>
			generateSentenceCards(entry),
		);

		const toSave = reconcileGeneratedCards(persisted, generated);
		if (toSave.length === 0) return;

		this.cardRepo.saveAll(toSave.map((dto) => SentenceReviewCard.fromDTO(dto)));
	}

	getEntry(id: string): SentenceEntry | null {
		return this.sentenceData.find((entry) => entry.id === id) ?? null;
	}
}
