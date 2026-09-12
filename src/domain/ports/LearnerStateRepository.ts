import type { PendingCatchUp, SessionSummary } from "../../domain/shared/types";

export interface LearnerStateRepository {
	getCompletedLessons(): number[];
	addCompletedLesson(n: number): void;
	removeCompletedLesson(n: number): void;
	getCurrentLesson(): number | null;
	setCurrentLesson(n: number | null): void;
	getSessionHistory(): SessionSummary[];
	addSession(summary: SessionSummary): void;
	getAchievements(): string[];
	addAchievement(id: string): void;
	getPendingCatchUps(): PendingCatchUp[];
	addPendingCatchUp(lessonNumber: number, cardIds: string[]): void;
	clearPendingCatchUp(lessonNumber: number): void;
	reset(): void;
	exportData(): string;
	importData(json: string): void;
}
