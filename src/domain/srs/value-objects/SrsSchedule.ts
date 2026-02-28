import { EaseFactor } from "./EaseFactor";
import type { RecallRating } from "./RecallRating";
import { SrsStage } from "./SrsStage";

export interface ResponseTimingData {
	responseTimeMs: number;
	averageResponseTimeMs: number;
}

export interface SrsDataDTO {
	easeFactor: number;
	interval: number;
	repetitions: number;
	learningStep: number | null;
	nextReviewDate: string;
	lastReviewDate: string | null;
	lapseCount?: number;
}

const LEARNING_STEPS_MINUTES = [0, 10, 60, 480, 1440] as const;
const GRADUATING_INTERVAL_MINUTES = 4320;
const MAX_INTERVAL_MINUTES = 259200;
const MIN_GRADUATED_INTERVAL_MINUTES = 1440;
const LAST_LEARNING_STEP = LEARNING_STEPS_MINUTES.length - 1;

function addMinutesToIso(iso: string, minutes: number): string {
	const d = new Date(iso);
	return new Date(d.getTime() + minutes * 60_000).toISOString();
}

function applyTimingModulation(
	interval: number,
	timing: ResponseTimingData,
): number {
	const ratio = timing.responseTimeMs / timing.averageResponseTimeMs;
	if (ratio < 0.7) return Math.round(interval * 1.1);
	if (ratio > 2.0) return Math.round(interval * 0.7);
	if (ratio > 1.3) return Math.round(interval * 0.85);
	return interval;
}

export class SrsSchedule {
	private constructor(
		readonly easeFactor: EaseFactor,
		readonly interval: number,
		readonly repetitions: number,
		readonly learningStep: number | null,
		readonly nextReviewDate: string,
		readonly lastReviewDate: string | null,
		readonly lapseCount: number,
	) {}

	get stage(): SrsStage {
		return SrsStage.fromScheduleData(this.learningStep, this.interval);
	}

	get isBurned(): boolean {
		return this.stage.isBurned;
	}

	get isInLearning(): boolean {
		return this.learningStep !== null;
	}

	isDue(now: string): boolean {
		if (this.isBurned) return false;
		return new Date(this.nextReviewDate) <= new Date(now);
	}

	applyReview(
		rating: RecallRating,
		now: string,
		timing?: ResponseTimingData,
	): SrsSchedule {
		if (this.isInLearning) return this.handleLearningPhase(rating, now);
		return this.handleGraduatedPhase(rating, now, timing);
	}

	resurrect(now?: string): SrsSchedule {
		const currentTime = now ?? new Date().toISOString();
		return new SrsSchedule(
			this.easeFactor,
			GRADUATING_INTERVAL_MINUTES,
			this.repetitions,
			null,
			addMinutesToIso(currentTime, GRADUATING_INTERVAL_MINUTES),
			currentTime,
			this.lapseCount,
		);
	}

	static initial(now?: string): SrsSchedule {
		const currentTime = now ?? new Date().toISOString();
		return new SrsSchedule(
			EaseFactor.default(),
			LEARNING_STEPS_MINUTES[1],
			0,
			1,
			addMinutesToIso(currentTime, LEARNING_STEPS_MINUTES[1]),
			null,
			0,
		);
	}

	toDTO(): SrsDataDTO {
		return {
			easeFactor: this.easeFactor.value,
			interval: this.interval,
			repetitions: this.repetitions,
			learningStep: this.learningStep,
			nextReviewDate: this.nextReviewDate,
			lastReviewDate: this.lastReviewDate,
			lapseCount: this.lapseCount,
		};
	}

	static fromDTO(dto: SrsDataDTO): SrsSchedule {
		return new SrsSchedule(
			EaseFactor.create(dto.easeFactor),
			dto.interval,
			dto.repetitions,
			dto.learningStep,
			dto.nextReviewDate,
			dto.lastReviewDate,
			dto.lapseCount ?? 0,
		);
	}

	private handleLearningPhase(rating: RecallRating, now: string): SrsSchedule {
		const step = this.learningStep as number;
		let newStep: number;

		switch (rating.value) {
			case 1:
				newStep = 0;
				break;
			case 2:
				newStep = 1;
				break;
			case 3:
				newStep = step;
				break;
			case 4:
				newStep = step + 1;
				break;
			case 5:
				newStep = step + 2;
				break;
		}

		if (newStep > LAST_LEARNING_STEP) {
			return this.graduate(now);
		}

		const interval = LEARNING_STEPS_MINUTES[newStep];
		return new SrsSchedule(
			this.easeFactor,
			interval,
			this.repetitions + 1,
			newStep,
			interval === 0 ? now : addMinutesToIso(now, interval),
			now,
			this.lapseCount,
		);
	}

	private graduate(now: string): SrsSchedule {
		return new SrsSchedule(
			this.easeFactor,
			GRADUATING_INTERVAL_MINUTES,
			this.repetitions + 1,
			null,
			addMinutesToIso(now, GRADUATING_INTERVAL_MINUTES),
			now,
			this.lapseCount,
		);
	}

	private handleGraduatedPhase(
		rating: RecallRating,
		now: string,
		timing?: ResponseTimingData,
	): SrsSchedule {
		let newEf = this.easeFactor;
		let newInterval: number;

		switch (rating.value) {
			case 1: {
				newEf = this.easeFactor.adjust(-0.3);
				return new SrsSchedule(
					newEf,
					0,
					this.repetitions + 1,
					0,
					now,
					now,
					this.lapseCount + 1,
				);
			}
			case 2: {
				newEf = this.easeFactor.adjust(-0.2);
				return new SrsSchedule(
					newEf,
					10,
					this.repetitions + 1,
					1,
					addMinutesToIso(now, 10),
					now,
					this.lapseCount + 1,
				);
			}
			case 3: {
				newEf = this.easeFactor.adjust(-0.15);
				newInterval = Math.max(
					MIN_GRADUATED_INTERVAL_MINUTES,
					Math.round(this.interval / 2),
				);
				break;
			}
			case 4: {
				newInterval = Math.round(this.interval * this.easeFactor.value);
				break;
			}
			case 5: {
				newEf = this.easeFactor.adjust(0.15);
				newInterval = Math.round(this.interval * this.easeFactor.value * 1.3);
				break;
			}
		}

		if (timing) {
			newInterval = applyTimingModulation(newInterval, timing);
		}

		newInterval = Math.min(newInterval, MAX_INTERVAL_MINUTES);

		return new SrsSchedule(
			newEf,
			newInterval,
			this.repetitions + 1,
			null,
			addMinutesToIso(now, newInterval),
			now,
			this.lapseCount,
		);
	}
}
