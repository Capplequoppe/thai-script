import type { GrammarService } from "../../domain/grammar/services/GrammarLessonService";
import type {
	GrammarCard,
	GrammarEntry,
	GrammarLessonSummary,
} from "../../domain/grammar/types";
import type {
	LearningService,
	LessonInfo,
	LessonSummary,
} from "../../domain/script/services/ScriptLessonService";
import type { SentenceService } from "../../domain/sentence/services/SentenceLessonService";
import type {
	SentenceCard,
	SentenceEntry,
	SentenceLessonSummary,
} from "../../domain/sentence/types";
import type { PropertyCard } from "../../domain/shared/types";
import type { VocabularyService } from "../../domain/vocabulary/services/VocabularyLessonService";
import type {
	VocabEntry,
	VocabLessonSummary,
	VocabularyCard,
} from "../../domain/vocabulary/types";

export class StartLessonUseCase {
	constructor(
		private readonly scriptService: LearningService,
		private readonly vocabService: VocabularyService,
		private readonly grammarService: GrammarService,
		private readonly sentenceService: SentenceService,
	) {}

	// --- Script lessons ---

	startScript(lessonNumber: number): LessonInfo | null {
		return this.scriptService.startLesson(lessonNumber);
	}

	completeScript(lessonNumber: number): void {
		this.scriptService.completeLesson(lessonNumber);
	}

	unlearnScript(lessonNumber: number): void {
		this.scriptService.unlearnLesson(lessonNumber);
	}

	getNextScript(): number | null {
		return this.scriptService.getNextLesson();
	}

	getScriptSummary(lessonNumber: number): LessonSummary {
		return this.scriptService.getLessonSummary(lessonNumber);
	}

	getCompletedScriptLessons(): number[] {
		return this.scriptService.getCompletedLessons();
	}

	isNextScriptAvailable(): boolean {
		return this.scriptService.isNextLessonAvailable();
	}

	getScriptMasteryProgress(lessonNumber: number): {
		total: number;
		graduated: number;
		percentage: number;
	} {
		return this.scriptService.getLessonMasteryProgress(lessonNumber);
	}

	getPendingCatchUps(): Array<{
		lessonNumber: number;
		summary: LessonSummary;
	}> {
		return this.scriptService.getPendingCatchUps();
	}

	getPendingCatchUpCards(lessonNumber: number): PropertyCard[] {
		return this.scriptService.getPendingCatchUpCards(lessonNumber);
	}

	dismissPendingCatchUp(lessonNumber: number): void {
		this.scriptService.dismissPendingCatchUp(lessonNumber);
	}

	// --- Vocabulary lessons ---

	prepareVocabLesson(): VocabularyCard[] | null {
		return this.vocabService.generateLessonCards();
	}

	commitVocabLesson(cards: VocabularyCard[]): void {
		this.vocabService.commitLessonCards(cards);
	}

	getNextVocab(): VocabLessonSummary | null {
		return this.vocabService.getNextLesson();
	}

	getUnlockedWords(): VocabEntry[] {
		return this.vocabService.getUnlockedWords();
	}

	getUnlearnedWords(): VocabEntry[] {
		return this.vocabService.getUnlearnedWords();
	}

	getVocabUnlockedCount(): number {
		return this.vocabService.getUnlockedCount();
	}

	getVocabUnlearnedCount(): number {
		return this.vocabService.getUnlearnedCount();
	}

	getVocabLearnedCount(): number {
		return this.vocabService.getLearnedCount();
	}

	// --- Grammar lessons ---

	startGrammar(): GrammarCard[] | null {
		return this.grammarService.startLesson();
	}

	getNextGrammar(): GrammarLessonSummary | null {
		return this.grammarService.getNextLesson();
	}

	getGrammarUnlockedCount(): number {
		return this.grammarService.getUnlockedCount();
	}

	getGrammarLearnedCount(): number {
		return this.grammarService.getLearnedCount();
	}

	getGrammarEntry(id: string): GrammarEntry | null {
		return this.grammarService.getEntry(id);
	}

	// --- Sentence lessons ---

	startSentence(): SentenceCard[] | null {
		return this.sentenceService.startLesson();
	}

	getNextSentence(): SentenceLessonSummary | null {
		return this.sentenceService.getNextLesson();
	}

	getSentenceUnlockedCount(): number {
		return this.sentenceService.getUnlockedCount();
	}

	getSentenceEntry(id: string): SentenceEntry | null {
		return this.sentenceService.getEntry(id);
	}

	getSentenceLearnedCount(): number {
		return this.sentenceService.getLearnedCount();
	}

	/**
	 * Backfills every already-learned item across all four domains with any
	 * card the current generators would now produce for it that isn't
	 * persisted yet, or an `audioUrl` a persisted card previously lacked. See
	 * each service's `reconcileCards()` for the exact rules.
	 */
	reconcileAllContent(): void {
		this.scriptService.reconcileCards();
		this.vocabService.reconcileCards();
		this.grammarService.reconcileCards();
		this.sentenceService.reconcileCards();
	}
}
