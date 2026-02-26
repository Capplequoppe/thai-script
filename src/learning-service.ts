import { generateCardsForLesson } from "./card-generator";
import type { IStorage } from "./storage";
import {
	getSymbolsByLesson,
	lessons,
	ThaiConsonant,
	ThaiToneMark,
	ThaiVowel,
	toneMarkRules,
	toneRules,
} from "./symbol";
import type { PropertyCard } from "./types";

const TOTAL_LESSONS = 25;

export interface LessonInfo {
	lessonNumber: number;
	title: string;
	focus: string;
	cards: PropertyCard[];
}

export interface ConsonantSummary {
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
}

export interface VowelSummary {
	character: string;
	name: string;
	sound: string;
	length: string;
	position: string;
	mnemonic?: string;
}

export interface ToneMarkSummary {
	character: string;
	name: string;
	midClassTone: string;
	highClassTone: string | null;
	lowClassTone: string | null;
}

export interface LessonSummary {
	lessonNumber: number;
	title: string;
	focus: string;
	videoUrl?: string;
	consonants: ConsonantSummary[];
	vowels: VowelSummary[];
	toneMarks: ToneMarkSummary[];
	toneRules: Array<{ description: string }>;
}

export class LearningService {
	constructor(private readonly storage: IStorage) {}

	startLesson(lessonNumber: number): LessonInfo {
		const state = this.storage.load();

		if (state.completedLessons.includes(lessonNumber)) {
			throw new Error(`Lesson ${lessonNumber} is already completed`);
		}

		for (let i = 1; i < lessonNumber; i++) {
			if (!state.completedLessons.includes(i)) {
				throw new Error(
					`Must complete lesson ${i} before starting lesson ${lessonNumber}`,
				);
			}
		}

		const lessonMeta = lessons.find((l) => l.number === lessonNumber);
		if (!lessonMeta) throw new Error(`Lesson ${lessonNumber} not found`);

		const cards = generateCardsForLesson(lessonNumber);

		for (const card of cards) {
			state.cards[card.id] = card;
		}
		state.currentLesson = lessonNumber;

		this.storage.save(state);

		return {
			lessonNumber,
			title: lessonMeta.title,
			focus: lessonMeta.focus,
			cards,
		};
	}

	completeLesson(lessonNumber: number): void {
		const state = this.storage.load();

		if (!state.completedLessons.includes(lessonNumber)) {
			state.completedLessons.push(lessonNumber);
		}
		if (state.currentLesson === lessonNumber) {
			state.currentLesson = null;
		}

		this.storage.save(state);
	}

	unlearnLesson(lessonNumber: number): void {
		const state = this.storage.load();

		state.completedLessons = state.completedLessons.filter(
			(l) => l !== lessonNumber,
		);

		for (const [id, card] of Object.entries(state.cards)) {
			if (card.lessonNumber === lessonNumber) {
				delete state.cards[id];
			}
		}

		if (state.currentLesson === lessonNumber) {
			state.currentLesson = null;
		}

		this.storage.save(state);
	}

	getNextLesson(): number | null {
		const state = this.storage.load();
		for (let i = 1; i <= TOTAL_LESSONS; i++) {
			if (!state.completedLessons.includes(i)) return i;
		}
		return null;
	}

	getLessonSummary(lessonNumber: number): LessonSummary {
		const lessonMeta = lessons.find((l) => l.number === lessonNumber);
		if (!lessonMeta) throw new Error(`Lesson ${lessonNumber} not found`);

		const symbols = getSymbolsByLesson(lessonNumber);

		return {
			lessonNumber,
			title: lessonMeta.title,
			focus: lessonMeta.focus,
			videoUrl: lessonMeta.videoUrl,
			consonants: symbols
				.filter((s): s is ThaiConsonant => s instanceof ThaiConsonant)
				.map((c) => ({
					character: c.character,
					name: c.name,
					nameRomanized: c.nameRomanized,
					nameMeaning: c.nameMeaning,
					classType: c.classType,
					initialSound: c.initialSound,
					finalSound: c.finalSound,
					hasDeadEnding: c.hasDeadEnding,
					isAspirated: c.isAspirated,
					mnemonic: c.mnemonic,
				})),
			vowels: symbols
				.filter((s): s is ThaiVowel => s instanceof ThaiVowel)
				.map((v) => ({
					character: v.character,
					name: v.name,
					sound: v.sound,
					length: v.length,
					position: v.position,
					mnemonic: v.mnemonic,
				})),
			toneMarks: symbols
				.filter((s): s is ThaiToneMark => s instanceof ThaiToneMark)
				.map((t) => ({
					character: t.character,
					name: t.name,
					midClassTone: t.midClassTone,
					highClassTone: t.highClassTone,
					lowClassTone: t.lowClassTone,
				})),
			toneRules: [
				...toneRules
					.filter((r) => r.lesson === lessonNumber)
					.map((r) => ({ description: r.description })),
				...toneMarkRules
					.filter((r) => r.lesson === lessonNumber)
					.map((r) => ({
						description: `${r.toneMarkName} on ${r.consonantClass} class = ${r.resultingTone} tone`,
					})),
			],
		};
	}

	getCompletedLessons(): number[] {
		return this.storage.load().completedLessons;
	}
}
