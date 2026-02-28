import type { SessionSummary } from "../../domain/shared/types";

export interface LearnerStateRepository {
	getCompletedLessons(): number[];
	addCompletedLesson(n: number): void;
	removeCompletedLesson(n: number): void;
	getCurrentLesson(): number | null;
	setCurrentLesson(n: number | null): void;
	getSessionHistory(): SessionSummary[];
	addSession(summary: SessionSummary): void;
	reset(): void;
	exportData(): string;
	importData(json: string): void;
}
