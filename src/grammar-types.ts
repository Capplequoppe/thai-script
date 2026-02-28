import type { SrsCard } from "./types";

export interface GrammarEntry {
	id: string;
	title: string;
	explanation: string;
	pattern: string;
	lessonNumber: number;
	prerequisites: {
		minVocabByClass: Record<string, number>;
		minTotalVocab?: number;
	};
	examples: Array<{
		thai: string;
		romanization: string;
		english: string;
		breakdown?: string;
	}>;
	cards: {
		recognition: {
			question: string;
			correctAnswer: string;
			distractors: string[];
		};
		application: {
			question: string;
			correctExample: number;
			incorrectExamples: string[];
		};
	};
}

export interface GrammarCard extends SrsCard {
	grammarId: string;
	property: "recognition" | "application";
}

export interface GrammarLessonSummary {
	grammarPoints: GrammarEntry[];
}
