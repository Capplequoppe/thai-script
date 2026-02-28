import type { LearnerStateRepository } from "../../domain/ports/LearnerStateRepository";
import type { SessionSummary } from "../../domain/shared/types";
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
