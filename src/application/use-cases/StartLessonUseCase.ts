import type { GrammarService } from "../../domain/grammar/services/GrammarLessonService";
import type {
	GrammarCard,
	GrammarLessonSummary,
} from "../../domain/grammar/types";
import type {
	LearningService,
	LessonInfo,
	LessonSummary,
} from "../../domain/script/services/ScriptLessonService";
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

	// --- Vocabulary lessons ---

	startVocab(): VocabularyCard[] | null {
		return this.vocabService.startLesson();
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
}
