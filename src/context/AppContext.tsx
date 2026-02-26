import {
	createContext,
	type ReactNode,
	useCallback,
	useMemo,
	useState,
} from "react";
import {
	LearningService,
	type LessonInfo,
	type LessonSummary,
} from "../learning-service";
import { type ActiveReviewSession, ReviewService } from "../review-service";
import { LocalStorageAdapter } from "../storage";
import type {
	LearnerState,
	PropertyCard,
	RecallRating,
	SessionSummary,
} from "../types";

const storage = new LocalStorageAdapter();
const learningService = new LearningService(storage);
const reviewService = new ReviewService(storage);

export interface AppContextValue {
	state: LearnerState;
	refresh: () => void;
	startLesson: (n: number) => LessonInfo;
	completeLesson: (n: number) => void;
	unlearnLesson: (n: number) => void;
	getNextLesson: () => number | null;
	getLessonSummary: (n: number) => LessonSummary;
	getCompletedLessons: () => number[];
	getDueCards: () => PropertyCard[];
	getNumDueCards: () => number;
	recordReview: (cardId: string, rating: RecallRating) => void;
	startReviewSession: (maxCards?: number) => ActiveReviewSession;
	endReviewSession: (session: ActiveReviewSession) => SessionSummary;
	getNextReviewDate: () => Date | null;
	getSessionHistory: () => SessionSummary[];
	resetAll: () => void;
	exportData: () => string;
	importData: (json: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<LearnerState>(() => storage.load());

	const refresh = useCallback(() => {
		setState(storage.load());
	}, []);

	const wrap = useCallback(
		<T,>(fn: () => T): T => {
			const result = fn();
			refresh();
			return result;
		},
		[refresh],
	);

	const value = useMemo<AppContextValue>(
		() => ({
			state,
			refresh,
			startLesson: (n) => wrap(() => learningService.startLesson(n)),
			completeLesson: (n) => wrap(() => learningService.completeLesson(n)),
			unlearnLesson: (n) => wrap(() => learningService.unlearnLesson(n)),
			getNextLesson: () => learningService.getNextLesson(),
			getLessonSummary: (n) => learningService.getLessonSummary(n),
			getCompletedLessons: () => learningService.getCompletedLessons(),
			getDueCards: () => reviewService.getDueCards(),
			getNumDueCards: () => reviewService.getNumDueCards(),
			recordReview: (cardId, rating) =>
				wrap(() => reviewService.recordReview(cardId, rating)),
			startReviewSession: (maxCards) =>
				reviewService.startReviewSession(maxCards),
			endReviewSession: (session) =>
				wrap(() => reviewService.endReviewSession(session)),
			getNextReviewDate: () => reviewService.getNextReviewDate(),
			getSessionHistory: () => reviewService.getSessionHistory(),
			resetAll: () => wrap(() => storage.reset()),
			exportData: () => storage.exportData(),
			importData: (json) => wrap(() => storage.importData(json)),
		}),
		[state, refresh, wrap],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
