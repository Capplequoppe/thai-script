import type { NotificationPort } from "../../domain/ports/NotificationPort";
import type {
	ActiveReviewSession,
	CriticalItem,
	ReviewForecast,
	ReviewService,
} from "../../domain/session/services/ReviewService";
import { type CardPool, CardPools } from "../../domain/shared/CardPool";
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
		if (pool) return this.reviewService.getNumDueCards(undefined, pool);
		return CardPools.all().reduce(
			(sum, p) => sum + this.reviewService.getNumDueCards(undefined, p),
			0,
		);
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
		const pools = pool ? [pool] : CardPools.all();
		const dates = pools
			.map((p) => this.reviewService.getNextReviewDate(p))
			.filter((d): d is Date => d !== null);
		if (dates.length === 0) return null;
		const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
		const diffMs = earliest.getTime() - Date.now();
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
		if (pool) return this.reviewService.getReviewForecast(undefined, pool);
		const zero: ReviewForecast = {
			dueNow: 0,
			nextHour: 0,
			next24Hours: 0,
			next3Days: 0,
			next7Days: 0,
		};
		return CardPools.all().reduce((acc, p) => {
			const f = this.reviewService.getReviewForecast(undefined, p);
			return {
				dueNow: acc.dueNow + f.dueNow,
				nextHour: acc.nextHour + f.nextHour,
				next24Hours: acc.next24Hours + f.next24Hours,
				next3Days: acc.next3Days + f.next3Days,
				next7Days: acc.next7Days + f.next7Days,
			};
		}, zero);
	}

	getCriticalItems(pool?: CardPool, limit?: number): CriticalItem[] {
		return this.reviewService.getCriticalItems(pool, limit);
	}

	resurrectCard(cardId: string, pool?: CardPool): void {
		this.reviewService.resurrectCard(cardId, pool);
		this.scheduleNotification();
	}

	/**
	 * Re-arms the "cards are due" reminder for the next moment in the *future*
	 * when that becomes true.
	 *
	 * Deliberately never schedules for a date that has already passed. Cards
	 * still due right now are not worth a notification: this runs after every
	 * answered card, so a past date meant the service worker fired an immediate
	 * reminder on each rating — a sound and a banner over the very session the
	 * learner was in the middle of. The learner is looking at the app; the due
	 * count is on screen. The reminder belongs at the next date they have not
	 * reached yet, carrying the count that will be due once it arrives.
	 *
	 * Spans every pool, like `getDueCount` and `getTimeUntilNextReview` — the
	 * reminder has to agree with the badge the learner sees in the app, and a
	 * `ReviewService` call left to its own default would silently mean
	 * `"script"` alone.
	 */
	private scheduleNotification(): void {
		if (this.notificationScheduler.permission !== "granted") return;

		const now = new Date();
		const dates = CardPools.all()
			.map((p) => this.reviewService.getNextReviewDate(p, now))
			.filter((d): d is Date => d !== null);

		if (dates.length === 0) {
			this.notificationScheduler.cancel();
			return;
		}

		const nextDate = new Date(Math.min(...dates.map((d) => d.getTime())));
		const at = nextDate.toISOString();
		const dueCount = CardPools.all().reduce(
			(sum, p) => sum + this.reviewService.getNumDueCards(at, p),
			0,
		);

		this.notificationScheduler.scheduleNext(nextDate, Math.max(dueCount, 1));
	}
}
