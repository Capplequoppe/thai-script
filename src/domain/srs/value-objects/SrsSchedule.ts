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

const LEARNING_STEPS_MINUTES = [0, 10, 60, 480] as const;
const RELEARNING_STEPS_MINUTES = [0, 10, 60] as const;
export const SENTENCE_LEARNING_STEPS = [0, 10] as const;
const GRADUATING_INTERVAL_MINUTES = 2880;
const MAX_INTERVAL_MINUTES = 259200;
const MIN_GRADUATED_INTERVAL_MINUTES = 1440;
/**
 * A lapse (Again/Wrong) on an already-graduated card no longer drops it back
 * into the multi-step relearning ladder — that required 2-3 more correct
 * answers in a row (and a slow-but-correct "Hard" answer didn't even advance
 * the ladder), turning one mistake into many repeated reviews of the same
 * item. Instead it stays graduated with a short-but-real interval: one
 * correct answer next time is enough, and normal ease-based growth resumes
 * from there.
 */
export const LAPSE_RECOVERY_INTERVAL_MINUTES = 240; // 4 hours

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
		private readonly learningSteps: readonly number[] = LEARNING_STEPS_MINUTES,
		private readonly relearningSteps: readonly number[] = RELEARNING_STEPS_MINUTES,
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

	private get activeSteps(): readonly number[] {
		return this.lapseCount > 0 ? this.relearningSteps : this.learningSteps;
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
			this.learningSteps,
			this.relearningSteps,
		);
	}

	overrideStage(targetStage: SrsStage, now?: string): SrsSchedule {
		const currentTime = now ?? new Date().toISOString();

		// Demotions (Apprentice, Guru) set nextReviewDate to now so the card is immediately due.
		// Promotions (Master, Enlightened, Burned) set nextReviewDate in the future.
		if (targetStage === SrsStage.APPRENTICE) {
			return new SrsSchedule(
				this.easeFactor,
				this.activeSteps[1],
				this.repetitions,
				1,
				currentTime,
				this.lastReviewDate,
				this.lapseCount,
				this.learningSteps,
				this.relearningSteps,
			);
		}

		if (targetStage === SrsStage.GURU) {
			return new SrsSchedule(
				this.easeFactor,
				GRADUATING_INTERVAL_MINUTES,
				this.repetitions,
				null,
				currentTime,
				this.lastReviewDate,
				this.lapseCount,
				this.learningSteps,
				this.relearningSteps,
			);
		}

		if (targetStage === SrsStage.MASTER) {
			const interval = SrsStage.GURU_THRESHOLD;
			return new SrsSchedule(
				this.easeFactor,
				interval,
				this.repetitions,
				null,
				addMinutesToIso(currentTime, interval),
				this.lastReviewDate,
				this.lapseCount,
				this.learningSteps,
				this.relearningSteps,
			);
		}

		if (targetStage === SrsStage.ENLIGHTENED) {
			const interval = SrsStage.MASTER_THRESHOLD;
			return new SrsSchedule(
				this.easeFactor,
				interval,
				this.repetitions,
				null,
				addMinutesToIso(currentTime, interval),
				this.lastReviewDate,
				this.lapseCount,
				this.learningSteps,
				this.relearningSteps,
			);
		}

		if (targetStage === SrsStage.BURNED) {
			const interval = SrsStage.ENLIGHTENED_THRESHOLD;
			return new SrsSchedule(
				this.easeFactor,
				interval,
				this.repetitions,
				null,
				addMinutesToIso(currentTime, interval),
				this.lastReviewDate,
				this.lapseCount,
				this.learningSteps,
				this.relearningSteps,
			);
		}

		throw new Error(`Unhandled stage: ${targetStage.name}`);
	}

	static initial(
		now?: string,
		learningSteps: readonly number[] = LEARNING_STEPS_MINUTES,
		relearningSteps: readonly number[] = RELEARNING_STEPS_MINUTES,
		startStep = 1,
	): SrsSchedule {
		const currentTime = now ?? new Date().toISOString();
		return new SrsSchedule(
			EaseFactor.default(),
			learningSteps[startStep] ?? 0,
			0,
			startStep,
			addMinutesToIso(currentTime, learningSteps[startStep] ?? 0),
			null,
			0,
			learningSteps,
			relearningSteps,
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

	static fromDTO(
		dto: SrsDataDTO,
		learningSteps: readonly number[] = LEARNING_STEPS_MINUTES,
		relearningSteps: readonly number[] = RELEARNING_STEPS_MINUTES,
	): SrsSchedule {
		return new SrsSchedule(
			EaseFactor.create(dto.easeFactor),
			dto.interval,
			dto.repetitions,
			dto.learningStep,
			dto.nextReviewDate,
			dto.lastReviewDate,
			dto.lapseCount ?? 0,
			learningSteps,
			relearningSteps,
		);
	}

	private handleLearningPhase(rating: RecallRating, now: string): SrsSchedule {
		const step = this.learningStep as number;
		const steps = this.activeSteps;
		const lastStep = steps.length - 1;
		let newStep: number;

		switch (rating.value) {
			case 1:
				newStep = 0;
				break;
			case 2:
				newStep = Math.max(0, step - 1);
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

		if (newStep > lastStep) {
			return this.graduate(now);
		}

		const interval = steps[newStep];
		return new SrsSchedule(
			this.easeFactor,
			interval,
			this.repetitions + 1,
			newStep,
			interval === 0 ? now : addMinutesToIso(now, interval),
			now,
			this.lapseCount,
			this.learningSteps,
			this.relearningSteps,
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
			this.learningSteps,
			this.relearningSteps,
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
				newInterval = LAPSE_RECOVERY_INTERVAL_MINUTES;
				break;
			}
			case 2: {
				newEf = this.easeFactor.adjust(-0.2);
				newInterval = LAPSE_RECOVERY_INTERVAL_MINUTES;
				break;
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
				newEf = this.easeFactor.adjust(0.05);
				newInterval = Math.round(this.interval * this.easeFactor.value);
				break;
			}
			case 5: {
				newEf = this.easeFactor.adjust(0.15);
				newInterval = Math.round(this.interval * this.easeFactor.value * 1.3);
				break;
			}
		}

		// A lapse's recovery interval is a fixed, deliberately short window —
		// timing modulation (which stretches/shrinks based on response speed)
		// only makes sense for the normal growth path.
		if (timing && !rating.isLapse) {
			newInterval = applyTimingModulation(newInterval, timing);
		}

		newInterval = Math.min(newInterval, MAX_INTERVAL_MINUTES);
		const newLapseCount = rating.isLapse
			? this.lapseCount + 1
			: this.lapseCount;

		return new SrsSchedule(
			newEf,
			newInterval,
			this.repetitions + 1,
			null,
			addMinutesToIso(now, newInterval),
			now,
			newLapseCount,
			this.learningSteps,
			this.relearningSteps,
		);
	}
}
