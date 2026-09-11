import type { CardPool } from "../../shared/CardPool";
import type { RecallRating } from "../value-objects/RecallRating";
import type {
	ResponseTimingData,
	SrsSchedule,
} from "../value-objects/SrsSchedule";
import type { SrsStage } from "../value-objects/SrsStage";

export abstract class ReviewableCard {
	protected _schedule: SrsSchedule;

	constructor(
		readonly id: string,
		readonly question: string,
		readonly correctAnswer: string,
		readonly choices: readonly string[],
		schedule: SrsSchedule,
		readonly audioUrl?: string,
	) {
		this._schedule = schedule;
	}

	get schedule(): SrsSchedule {
		return this._schedule;
	}

	get stage(): SrsStage {
		return this._schedule.stage;
	}

	isDue(now: string): boolean {
		return this._schedule.isDue(now);
	}

	isLeech(threshold: number): boolean {
		return this._schedule.lapseCount >= threshold;
	}

	recordReview(
		rating: RecallRating,
		now: string,
		timing?: ResponseTimingData,
	): void {
		this._schedule = this._schedule.applyReview(rating, now, timing);
	}

	resurrect(now?: string): void {
		this._schedule = this._schedule.resurrect(now);
	}

	overrideStage(targetStage: SrsStage, now?: string): void {
		this._schedule = this._schedule.overrideStage(targetStage, now);
	}

	abstract get pool(): CardPool;

	/**
	 * Identity used to group related cards together (e.g. Apprentice-cap
	 * counting). Defaults to the card's own id; a subclass whose cards fan
	 * out from a single learning item (e.g. one sentence's several property
	 * cards) overrides this to that shared item's id.
	 */
	get groupKey(): string {
		return this.id;
	}
}
