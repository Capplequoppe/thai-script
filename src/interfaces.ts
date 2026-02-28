import type {
	GrammarCard,
	GrammarEntry,
	GrammarLessonSummary,
} from "./grammar-types";
import type { LessonInfo } from "./learning-service";
import type {
	CardPool,
	CriticalItem,
	ReviewForecast,
} from "./review-service";
import type {
	LearnerState,
	PropertyCard,
	RecallRating,
	SessionSummary,
	SrsCard,
} from "./types";

export interface ILearningService {
	startLesson(lessonNumber: number): LessonInfo | null;
	completeLesson(lessonNumber: number): void;
	unlearnLesson(lessonNumber: number): void;
	getNextLesson(): number | null;
	getCompletedLessons(): number[];
	isLessonMastered(lessonNumber: number): boolean;
	getLessonMasteryProgress(lessonNumber: number): {
		total: number;
		graduated: number;
		percentage: number;
	};
	isNextLessonAvailable(): boolean;
	getLessonSummary(lessonNumber: number): {
		lessonNumber: number;
		title: string;
		focus: string;
		consonants: Array<{
			character: string;
			name: string;
			nameRomanized: string;
			nameMeaning: string;
			classType: string;
			initialSound: string;
			finalSound: string;
			hasDeadEnding: boolean;
			isAspirated: boolean;
			mnemonic?: string;
		}>;
		vowels: Array<{
			character: string;
			name: string;
			sound: string;
			length: string;
			position: string;
			mnemonic?: string;
		}>;
		toneMarks: Array<{
			character: string;
			name: string;
			midClassTone: string;
			highClassTone: string | null;
			lowClassTone: string | null;
		}>;
		toneRules: Array<{ description: string }>;
	};
}

export interface IReviewService {
	getDueCards(): SrsCard[];
	getNumDueCards(): number;
	recordReview(cardId: string, rating: RecallRating, now?: string, timing?: { responseTimeMs: number; averageResponseTimeMs: number }): void;
	startReviewSession(maxCards?: number): {
		id: string;
		cards: Array<{ card: SrsCard; mode: "multipleChoice" | "flashcard" }>;
		startedAt: string;
		results: Array<{ cardId: string; rating: RecallRating }>;
	};
	endReviewSession(session: {
		id: string;
		startedAt: string;
		results: Array<{ cardId: string; rating: RecallRating }>;
	}): SessionSummary;
	getNextReviewDate(): Date | null;
	getSessionHistory(): SessionSummary[];
	getReviewForecast(now?: string, pool?: CardPool): ReviewForecast;
	getCriticalItems(pool?: CardPool, limit?: number): CriticalItem[];
}

export interface IGrammarService {
	getUnlockedGrammarPoints(): GrammarEntry[];
	getUnlearnedGrammarPoints(): GrammarEntry[];
	getNextLesson(): GrammarLessonSummary | null;
	startLesson(): GrammarCard[] | null;
	getUnlockedCount(): number;
	getLearnedCount(): number;
}

export interface IStorage {
	load(): LearnerState;
	save(state: LearnerState): void;
	reset(): void;
	exportData(): string;
	importData(json: string): void;
}
