import type { CardRepository } from "../../ports/CardRepository";
import type { LearnerStateRepository } from "../../ports/LearnerStateRepository";
import type { ApprenticeService } from "../../shared/services/ApprenticeService";
import type { PropertyCard } from "../../shared/types";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import {
	getSymbolsByLesson,
	lessons,
	ThaiConsonant,
	ThaiToneMark,
	ThaiVowel,
	toneMarkRules,
	toneRules,
} from "../data/symbols";
import { ScriptPropertyCard } from "../entities/ScriptPropertyCard";
import { generateCardsForLesson } from "./ScriptCardGenerator";

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
	audioUrl?: string;
}

export interface VowelSummary {
	character: string;
	name: string;
	sound: string;
	length: string;
	position: string;
	mnemonic?: string;
	audioUrl?: string;
}

export interface ToneMarkSummary {
	character: string;
	name: string;
	midClassTone: string;
	highClassTone: string | null;
	lowClassTone: string | null;
	audioUrl?: string;
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

function toEntity(dto: PropertyCard): ScriptPropertyCard {
	return new ScriptPropertyCard(
		dto.id,
		dto.question,
		dto.correctAnswer,
		dto.choices,
		SrsSchedule.fromDTO(dto.srs),
		dto.symbolCharacter,
		dto.property,
		dto.lessonNumber,
		dto.audioUrl,
	);
}

export class LearningService {
	constructor(
		private readonly cardRepo: CardRepository,
		private readonly stateRepo: LearnerStateRepository,
		private readonly apprenticeService?: ApprenticeService,
	) {}

	startLesson(lessonNumber: number): LessonInfo | null {
		if (
			this.apprenticeService &&
			!this.apprenticeService.canStartLesson("script")
		) {
			return null;
		}

		const completedLessons = this.stateRepo.getCompletedLessons();

		if (completedLessons.includes(lessonNumber)) {
			throw new Error(`Lesson ${lessonNumber} is already completed`);
		}

		for (let i = 1; i < lessonNumber; i++) {
			if (!completedLessons.includes(i)) {
				throw new Error(
					`Must complete lesson ${i} before starting lesson ${lessonNumber}`,
				);
			}
		}

		const lessonMeta = lessons.find((l) => l.number === lessonNumber);
		if (!lessonMeta) throw new Error(`Lesson ${lessonNumber} not found`);

		const cards = generateCardsForLesson(lessonNumber);
		const entities = cards.map(toEntity);

		this.cardRepo.saveAll(entities);
		this.stateRepo.setCurrentLesson(lessonNumber);

		return {
			lessonNumber,
			title: lessonMeta.title,
			focus: lessonMeta.focus,
			cards,
		};
	}

	completeLesson(lessonNumber: number): void {
		this.stateRepo.addCompletedLesson(lessonNumber);

		if (this.stateRepo.getCurrentLesson() === lessonNumber) {
			this.stateRepo.setCurrentLesson(null);
		}
	}

	unlearnLesson(lessonNumber: number): void {
		this.stateRepo.removeCompletedLesson(lessonNumber);

		const allCards = this.cardRepo.findAll("script") as ScriptPropertyCard[];
		for (const card of allCards) {
			if (card.lessonNumber === lessonNumber) {
				this.cardRepo.remove(card.id, "script");
			}
		}

		if (this.stateRepo.getCurrentLesson() === lessonNumber) {
			this.stateRepo.setCurrentLesson(null);
		}
	}

	getNextLesson(): number | null {
		const completedLessons = this.stateRepo.getCompletedLessons();
		for (let i = 1; i <= TOTAL_LESSONS; i++) {
			if (!completedLessons.includes(i)) return i;
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
					audioUrl: c.audioUrl,
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
					audioUrl: v.audioUrl,
				})),
			toneMarks: symbols
				.filter((s): s is ThaiToneMark => s instanceof ThaiToneMark)
				.map((t) => ({
					character: t.character,
					name: t.name,
					midClassTone: t.midClassTone,
					highClassTone: t.highClassTone,
					lowClassTone: t.lowClassTone,
					audioUrl: t.audioUrl,
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
		return this.stateRepo.getCompletedLessons();
	}

	getLessonMasteryProgress(lessonNumber: number): {
		total: number;
		graduated: number;
		percentage: number;
	} {
		const allCards = this.cardRepo.findAll("script") as ScriptPropertyCard[];
		const lessonCards = allCards.filter((c) => c.lessonNumber === lessonNumber);
		const total = lessonCards.length;
		const graduated = lessonCards.filter(
			(c) => !c.schedule.isInLearning,
		).length;
		return {
			total,
			graduated,
			percentage: total === 0 ? 0 : graduated / total,
		};
	}

	isNextLessonAvailable(): boolean {
		return this.getNextLesson() !== null;
	}
}
