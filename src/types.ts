import type { ThaiSymbolClass, ToneValue, VowelPosition } from "./symbol";

// --- SRS Data ---

export interface SrsData {
	easeFactor: number;
	interval: number; // minutes
	repetitions: number;
	learningStep: number | null;
	nextReviewDate: string; // ISO string for serialization
	lastReviewDate: string | null;
}

export const DEFAULT_SRS_DATA: SrsData = {
	easeFactor: 2.0,
	interval: 0,
	repetitions: 0,
	learningStep: 0,
	nextReviewDate: new Date().toISOString(),
	lastReviewDate: null,
};

export type RecallRating = 1 | 2 | 3 | 4 | 5;

// --- Reviewable Properties ---

export type ConsonantProperty =
	| "recognition"
	| "class"
	| "initialSound"
	| "finalSound"
	| "deadLive";
export type VowelProperty = "recognition" | "length" | "position";
export type ToneMarkProperty = "recognition" | "effectPerClass";
export type PropertyType = ConsonantProperty | VowelProperty | ToneMarkProperty;

export interface PropertyCard {
	id: string;
	symbolCharacter: string;
	property: PropertyType | "toneRule";
	question: string;
	correctAnswer: string;
	choices: string[];
	srs: SrsData;
	lessonNumber: number;
	audioUrl?: string;
}

// --- Quiz Types ---

export type QuizMode = "multipleChoice" | "flashcard";

export interface QuizCard {
	card: PropertyCard;
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
	type: "lesson" | "review" | "mixed";
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
	sessionHistory: SessionSummary[];
}

export const INITIAL_LEARNER_STATE: LearnerState = {
	completedLessons: [],
	currentLesson: null,
	cards: {},
	sessionHistory: [],
};
