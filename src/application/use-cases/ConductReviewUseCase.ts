import type { NotificationPort } from "../../domain/ports/NotificationPort";
import type {
	ActiveReviewSession,
	CriticalItem,
	ReviewForecast,
	ReviewService,
} from "../../domain/session/services/ReviewService";
import type { CardPool } from "../../domain/shared/CardPool";
import type { RecallRating, SessionSummary } from "../../domain/shared/types";
import type { ReviewableCard } from "../../domain/srs/entities/ReviewableCard";
import type { ResponseTimingData } from "../../domain/srs/value-objects/SrsSchedule";

export class ConductReviewUseCase {
	constructor(
		private readonly reviewService: ReviewService,
		private readonly notificationScheduler: NotificationPort,
	) {}

	getDueCards(pool?: CardPool): ReviewableCard[] {
		return this.reviewService.getDueCards(undefined, pool);
	}

	getDueCount(pool?: CardPool): number {
		return this.reviewService.getNumDueCards(undefined, pool);
	}

	recordReview(
		cardId: string,
		rating: RecallRating,
		pool?: CardPool,
		timing?: ResponseTimingData,
	): string {
		const newStage = this.reviewService.recordReview(
			cardId,
			rating,
			undefined,
			timing,
			pool,
		);
		this.scheduleNotification();
		return newStage;
	}

	startSession(pool?: CardPool, maxCards?: number): ActiveReviewSession {
		return this.reviewService.startReviewSession(maxCards, undefined, pool);
	}

	endSession(session: ActiveReviewSession, pool?: CardPool): SessionSummary {
		const summary = this.reviewService.endReviewSession(
			session,
			undefined,
			pool,
		);
		this.scheduleNotification();
		return summary;
	}

	getNextReviewDate(pool?: CardPool): Date | null {
		return this.reviewService.getNextReviewDate(pool);
	}

	getTimeUntilNextReview(pool?: CardPool): string | null {
		const date = this.reviewService.getNextReviewDate(pool);
		if (!date) return null;
		const diffMs = date.getTime() - Date.now();
		if (diffMs < 60_000) return "less than 1 minute";
		const minutes = Math.floor(diffMs / 60_000);
		if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
		const days = Math.floor(hours / 24);
		return `${days} day${days === 1 ? "" : "s"}`;
	}

	getSessionHistory(): SessionSummary[] {
		return this.reviewService.getSessionHistory();
	}

	getForecast(pool?: CardPool): ReviewForecast {
		return this.reviewService.getReviewForecast(undefined, pool);
	}

	getCriticalItems(pool?: CardPool, limit?: number): CriticalItem[] {
		return this.reviewService.getCriticalItems(pool, limit);
	}

	resurrectCard(cardId: string, pool?: CardPool): void {
		this.reviewService.resurrectCard(cardId, pool);
		this.scheduleNotification();
	}

	private scheduleNotification(): void {
		if (this.notificationScheduler.permission !== "granted") return;

		const nextDate = this.reviewService.getNextReviewDate();
		const dueCount = this.reviewService.getNumDueCards();

		if (dueCount > 0 && nextDate) {
			this.notificationScheduler.scheduleNext(nextDate, dueCount);
		} else if (nextDate) {
			this.notificationScheduler.scheduleNext(nextDate, 1);
		} else {
			this.notificationScheduler.cancel();
		}
	}
}
