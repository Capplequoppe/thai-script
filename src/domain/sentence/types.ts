import type { SrsCard } from "../shared/types";

export type SentenceProperty =
	| "listeningComprehension"
	| "readingComprehension"
	| "sentenceBuilding"
	| "selfValidation";

export interface SentenceEntry {
	id: string;
	thai: string;
	romanization: string;
	english: string;
	words: string[];
	grammarId?: string;
	difficulty: number;
	thai_audio_file: string | null;
	cards: {
		readingComprehension: {
			distractors: string[];
		};
		listeningComprehension?: {
			distractors: string[];
		};
		sentenceBuilding?: {
			characterDistractors: string[];
		};
	};
}

export interface SentenceCard extends SrsCard {
	sentenceId: string;
	property: SentenceProperty;
}

export interface SentenceLessonSummary {
	sentences: SentenceEntry[];
}
