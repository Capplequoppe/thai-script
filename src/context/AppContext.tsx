import {
	createContext,
	type ReactNode,
	useCallback,
	useEffect,
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
	RecallRating,
	SessionSummary,
	SrsCard,
} from "../types";
import { NotificationScheduler } from "../notification-scheduler";
import vocabularyData from "../vocabulary.json";
import { VocabularyService } from "../vocabulary-service";
import type {
	VocabEntry,
	VocabLessonSummary,
	VocabularyCard,
} from "../vocabulary-types";

const storage = new LocalStorageAdapter();
const learningService = new LearningService(storage);
const reviewService = new ReviewService(storage);
const vocabularyService = new VocabularyService(storage, vocabularyData as VocabEntry[]);
const notificationScheduler = new NotificationScheduler();

function scheduleNextNotification() {
	if (notificationScheduler.permission !== "granted") return;
	const nextDate = reviewService.getNextReviewDate();
	const dueCount = reviewService.getNumDueCards();
	if (dueCount > 0 && nextDate) {
		notificationScheduler.scheduleNext(nextDate, dueCount);
	} else if (nextDate) {
		notificationScheduler.scheduleNext(nextDate, 1);
	} else {
		notificationScheduler.cancel();
	}
}

export interface AppContextValue {
	state: LearnerState;
	refresh: () => void;
	startLesson: (n: number) => LessonInfo;
	completeLesson: (n: number) => void;
	unlearnLesson: (n: number) => void;
	getNextLesson: () => number | null;
	getLessonSummary: (n: number) => LessonSummary;
	getCompletedLessons: () => number[];
	getDueCards: () => SrsCard[];
	getNumDueCards: () => number;
	recordReview: (cardId: string, rating: RecallRating, timing?: { responseTimeMs: number; averageResponseTimeMs: number }) => void;
	startReviewSession: (maxCards?: number) => ActiveReviewSession;
	endReviewSession: (session: ActiveReviewSession) => SessionSummary;
	getNextReviewDate: () => Date | null;
	getSessionHistory: () => SessionSummary[];
	resetAll: () => void;
	exportData: () => string;
	importData: (json: string) => void;
	// Vocabulary operations
	getUnlockedWords: () => VocabEntry[];
	getUnlearnedWords: () => VocabEntry[];
	getNextVocabLesson: () => VocabLessonSummary | null;
	startVocabLesson: () => VocabularyCard[];
	getVocabUnlockedCount: () => number;
	getVocabLearnedCount: () => number;
	getNumDueVocabCards: () => number;
	recordVocabReview: (cardId: string, rating: RecallRating, timing?: { responseTimeMs: number; averageResponseTimeMs: number }) => void;
	startVocabReviewSession: (maxCards?: number) => ActiveReviewSession;
	endVocabReviewSession: (session: ActiveReviewSession) => SessionSummary;
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
			scheduleNextNotification();
			return result;
		},
		[refresh],
	);

	useEffect(() => {
		scheduleNextNotification();

		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				refresh();
				scheduleNextNotification();
			}
		};
		document.addEventListener("visibilitychange", handleVisibility);
		return () =>
			document.removeEventListener("visibilitychange", handleVisibility);
	}, [refresh]);

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
			recordReview: (cardId, rating, timing) =>
				wrap(() => reviewService.recordReview(cardId, rating, undefined, timing)),
			startReviewSession: (maxCards) =>
				reviewService.startReviewSession(maxCards),
			endReviewSession: (session) =>
				wrap(() => reviewService.endReviewSession(session)),
			getNextReviewDate: () => reviewService.getNextReviewDate(),
			getSessionHistory: () => reviewService.getSessionHistory(),
			resetAll: () => wrap(() => storage.reset()),
			exportData: () => storage.exportData(),
			importData: (json) => wrap(() => storage.importData(json)),
			getUnlockedWords: () => vocabularyService.getUnlockedWords(),
			getUnlearnedWords: () => vocabularyService.getUnlearnedWords(),
			getNextVocabLesson: () => vocabularyService.getNextLesson(),
			startVocabLesson: () => wrap(() => vocabularyService.startLesson()),
			getVocabUnlockedCount: () => vocabularyService.getUnlockedCount(),
			getVocabLearnedCount: () => vocabularyService.getLearnedCount(),
			getNumDueVocabCards: () => reviewService.getNumDueCards(undefined, "vocab"),
			recordVocabReview: (cardId, rating, timing) =>
				wrap(() => reviewService.recordReview(cardId, rating, undefined, timing, "vocab")),
			startVocabReviewSession: (maxCards) =>
				reviewService.startReviewSession(maxCards, undefined, "vocab"),
			endVocabReviewSession: (session) =>
				wrap(() => reviewService.endReviewSession(session, undefined, "vocab")),
		}),
		[state, refresh, wrap],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
