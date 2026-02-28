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

	abstract get pool(): CardPool;
}
