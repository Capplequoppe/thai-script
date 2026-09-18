import type { LearnerStateRepository } from "../../domain/ports/LearnerStateRepository";
import {
	DEFAULT_REVIEW_BATCH_SIZE,
	isValidReviewBatchSize,
} from "../../domain/session/ReviewBatchSize";
import { DEFAULT_APPRENTICE_LIMITS } from "../../domain/shared/services/ApprenticeService";
import type {
	ApprenticeLimits,
	PendingCatchUp,
	SessionSummary,
} from "../../domain/shared/types";
import type { IStorage } from "./Storage";

export class StorageLearnerStateRepository implements LearnerStateRepository {
	constructor(private readonly storage: IStorage) {}

	getCompletedLessons(): number[] {
		return this.storage.load().completedLessons;
	}

	addCompletedLesson(n: number): void {
		const state = this.storage.load();
		if (!state.completedLessons.includes(n)) {
			state.completedLessons.push(n);
			this.storage.save(state);
		}
	}

	removeCompletedLesson(n: number): void {
		const state = this.storage.load();
		state.completedLessons = state.completedLessons.filter(
			(lesson) => lesson !== n,
		);
		this.storage.save(state);
	}

	getCurrentLesson(): number | null {
		return this.storage.load().currentLesson;
	}

	setCurrentLesson(n: number | null): void {
		const state = this.storage.load();
		state.currentLesson = n;
		this.storage.save(state);
	}

	getSessionHistory(): SessionSummary[] {
		return this.storage.load().sessionHistory;
	}

	addSession(summary: SessionSummary): void {
		const state = this.storage.load();
		state.sessionHistory.push(summary);
		this.storage.save(state);
	}

	getAchievements(): string[] {
		return this.storage.load().achievements ?? [];
	}

	addAchievement(id: string): void {
		const state = this.storage.load();
		const achievements = state.achievements ?? [];
		if (!achievements.includes(id)) {
			state.achievements = [...achievements, id];
			this.storage.save(state);
		}
	}

	getPendingCatchUps(): PendingCatchUp[] {
		return this.storage.load().pendingCatchUps ?? [];
	}

	addPendingCatchUp(lessonNumber: number, cardIds: string[]): void {
		const state = this.storage.load();
		const pendingCatchUps = state.pendingCatchUps ?? [];
		const existing = pendingCatchUps.find(
			(p) => p.lessonNumber === lessonNumber,
		);
		if (existing) {
			existing.cardIds = [...new Set([...existing.cardIds, ...cardIds])];
		} else {
			pendingCatchUps.push({ lessonNumber, cardIds: [...cardIds] });
		}
		state.pendingCatchUps = pendingCatchUps;
		this.storage.save(state);
	}

	clearPendingCatchUp(lessonNumber: number): void {
		const state = this.storage.load();
		state.pendingCatchUps = (state.pendingCatchUps ?? []).filter(
			(p) => p.lessonNumber !== lessonNumber,
		);
		this.storage.save(state);
	}

	getApprenticeLimits(): ApprenticeLimits {
		return this.storage.load().apprenticeLimits ?? DEFAULT_APPRENTICE_LIMITS;
	}

	setApprenticeLimits(limits: ApprenticeLimits): void {
		const state = this.storage.load();
		state.apprenticeLimits = limits;
		this.storage.save(state);
	}

	/**
	 * A size written by a build with different bounds — or hand-edited into an
	 * imported file — reads as the default rather than propagating: an
	 * out-of-range batch would either hand back a one-card session forever or
	 * restore the unbounded one the batch exists to replace.
	 */
	getReviewBatchSize(): number {
		const stored = this.storage.load().reviewBatchSize;
		return isValidReviewBatchSize(stored) ? stored : DEFAULT_REVIEW_BATCH_SIZE;
	}

	setReviewBatchSize(size: number): void {
		const state = this.storage.load();
		state.reviewBatchSize = size;
		this.storage.save(state);
	}

	reset(): void {
		this.storage.reset();
	}

	exportData(): string {
		return this.storage.exportData();
	}

	importData(json: string): void {
		this.storage.importData(json);
	}
}
