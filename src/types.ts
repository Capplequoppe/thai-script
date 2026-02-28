import type { ThaiSymbolClass, ToneValue, VowelPosition } from "./symbol";
import type { VocabularyCard } from "./vocabulary-types";

// --- SRS Stages ---

export type SrsStage = "Apprentice" | "Guru" | "Master" | "Enlightened" | "Burned";

export interface StageCounts {
	apprentice: number;
	guru: number;
	master: number;
	enlightened: number;
	burned: number;
}

// --- SRS Data ---

export interface SrsData {
	easeFactor: number;
	interval: number; // minutes
	repetitions: number;
	learningStep: number | null;
	nextReviewDate: string; // ISO string for serialization
	lastReviewDate: string | null;
	lapseCount?: number;
}

export const DEFAULT_SRS_DATA: SrsData = {
	easeFactor: 2.0,
	interval: 10,
	repetitions: 0,
	learningStep: 1,
	nextReviewDate: new Date().toISOString(),
	lastReviewDate: null,
	lapseCount: 0,
};

export type RecallRating = 1 | 2 | 3 | 4 | 5;

// --- Reviewable Properties ---

export type ConsonantProperty =
	| "recognition"
	| "class"
	| "initialSound"
	| "finalSound"
	| "deadLive"
	| "audioRecognition";
export type VowelProperty = "recognition" | "length" | "position" | "audioRecognition";
export type ToneMarkProperty = "recognition" | "effectPerClass" | "audioRecognition";
export type PropertyType = ConsonantProperty | VowelProperty | ToneMarkProperty;

export interface SrsCard {
	id: string;
	question: string;
	correctAnswer: string;
	choices: string[];
	srs: SrsData;
	audioUrl?: string;
}

export interface PropertyCard extends SrsCard {
	symbolCharacter: string;
	property: PropertyType | "toneRule";
	lessonNumber: number;
}

// --- Quiz Types ---

export type QuizMode = "multipleChoice" | "flashcard";

export interface QuizCard {
	card: SrsCard;
	mode: QuizMode;
}

export interface QuizResult {
	cardId: string;
	rating: RecallRating;
	responseTimeMs: number;
	timestamp: string;
}

// --- Session Types ---

export interface LessonProgress {
	lessonNumber: number;
	startedAt: string;
	completedAt: string | null;
	graduatedCardIds: string[];
	pendingCardIds: string[];
}

export interface ReviewSession {
	id: string;
	startedAt: string;
	completedAt: string | null;
	results: QuizResult[];
}

export interface SessionSummary {
	sessionId: string;
	type: "lesson" | "review" | "mixed" | "vocab-lesson" | "vocab-review";
	durationMs: number;
	totalCards: number;
	correctCount: number;
	incorrectCount: number;
	accuracy: number;
	newCardsGraduated: number;
}

// --- Storage State ---

export interface LearnerState {
	completedLessons: number[];
	currentLesson: number | null;
	cards: Record<string, PropertyCard>;
	vocabCards: Record<string, VocabularyCard>;
	sessionHistory: SessionSummary[];
}

export const INITIAL_LEARNER_STATE: LearnerState = {
	completedLessons: [],
	currentLesson: null,
	cards: {},
	vocabCards: {},
	sessionHistory: [],
};
