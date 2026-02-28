import {
	createContext,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { ApprenticeStats } from "../../apprentice-service";
import { ApprenticeService } from "../../apprentice-service";
import type { ReviewableCard } from "../../domain/srs/entities/ReviewableCard";
import grammarData from "../../grammar.json";
import { GrammarService } from "../../grammar-service";
import type {
	GrammarCard,
	GrammarEntry,
	GrammarLessonSummary,
} from "../../grammar-types";
import { StorageCardRepository } from "../../infrastructure/persistence/StorageCardRepository";
import {
	LearningService,
	type LessonInfo,
	type LessonSummary,
} from "../../learning-service";
import { LeechService } from "../../leech-service";
import { NotificationScheduler } from "../../notification-scheduler";
import type { CardPool } from "../../review-service";
import {
	type ActiveReviewSession,
	type CriticalItem,
	type ReviewForecast,
	ReviewService,
} from "../../review-service";
import { getStageCounts } from "../../srs";
import { LocalStorageAdapter } from "../../storage";
import type {
	LearnerState,
	RecallRating,
	SessionSummary,
	SrsCard,
	StageCounts,
} from "../../types";
import vocabularyData from "../../vocabulary.json";
import { VocabularyService } from "../../vocabulary-service";
import type {
	VocabEntry,
	VocabLessonSummary,
	VocabularyCard,
} from "../../vocabulary-types";

const storage = new LocalStorageAdapter();
const cardRepo = new StorageCardRepository(storage);
const apprenticeService = new ApprenticeService(cardRepo);
const leechService = new LeechService(cardRepo);
const learningService = new LearningService(storage, apprenticeService);
const reviewService = new ReviewService(storage);
const vocabularyService = new VocabularyService(
	storage,
	vocabularyData as VocabEntry[],
	apprenticeService,
);
const grammarService = new GrammarService(
	storage,
	grammarData as unknown as GrammarEntry[],
	apprenticeService,
	vocabularyData as VocabEntry[],
);
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
	startLesson: (n: number) => LessonInfo | null;
	completeLesson: (n: number) => void;
	unlearnLesson: (n: number) => void;
	getNextLesson: () => number | null;
	getLessonSummary: (n: number) => LessonSummary;
	getCompletedLessons: () => number[];
	getDueCards: () => SrsCard[];
	getNumDueCards: () => number;
	recordReview: (
		cardId: string,
		rating: RecallRating,
		timing?: { responseTimeMs: number; averageResponseTimeMs: number },
	) => void;
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
	startVocabLesson: () => VocabularyCard[] | null;
	getVocabUnlockedCount: () => number;
	getVocabLearnedCount: () => number;
	getNumDueVocabCards: () => number;
	recordVocabReview: (
		cardId: string,
		rating: RecallRating,
		timing?: { responseTimeMs: number; averageResponseTimeMs: number },
	) => void;
	startVocabReviewSession: (maxCards?: number) => ActiveReviewSession;
	endVocabReviewSession: (session: ActiveReviewSession) => SessionSummary;
	// Grammar operations
	getNextGrammarLesson: () => GrammarLessonSummary | null;
	startGrammarLesson: () => GrammarCard[] | null;
	getGrammarUnlockedCount: () => number;
	getGrammarLearnedCount: () => number;
	getNumDueGrammarCards: () => number;
	recordGrammarReview: (
		cardId: string,
		rating: RecallRating,
		timing?: { responseTimeMs: number; averageResponseTimeMs: number },
	) => void;
	startGrammarReviewSession: (maxCards?: number) => ActiveReviewSession;
	endGrammarReviewSession: (session: ActiveReviewSession) => SessionSummary;
	// WaniKani-inspired features
	getStageCounts: (pool?: CardPool) => StageCounts;
	getLeechCards: (pool?: CardPool) => ReviewableCard[];
	getLeechCount: (pool?: CardPool) => number;
	getApprenticeStats: () => ApprenticeStats;
	canStartLesson: () => boolean;
	getReviewForecast: () => ReviewForecast;
	getCriticalItems: (pool?: CardPool, limit?: number) => CriticalItem[];
	isNextLessonAvailable: () => boolean;
	getLessonMasteryProgress: (lessonNumber: number) => {
		total: number;
		graduated: number;
		percentage: number;
	};
	resurrectCard: (cardId: string, pool?: CardPool) => void;
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
				wrap(() =>
					reviewService.recordReview(cardId, rating, undefined, timing),
				),
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
			getNumDueVocabCards: () =>
				reviewService.getNumDueCards(undefined, "vocab"),
			recordVocabReview: (cardId, rating, timing) =>
				wrap(() =>
					reviewService.recordReview(
						cardId,
						rating,
						undefined,
						timing,
						"vocab",
					),
				),
			startVocabReviewSession: (maxCards) =>
				reviewService.startReviewSession(maxCards, undefined, "vocab"),
			endVocabReviewSession: (session) =>
				wrap(() => reviewService.endReviewSession(session, undefined, "vocab")),
			// Grammar operations
			getNextGrammarLesson: () => grammarService.getNextLesson(),
			startGrammarLesson: () => wrap(() => grammarService.startLesson()),
			getGrammarUnlockedCount: () => grammarService.getUnlockedCount(),
			getGrammarLearnedCount: () => grammarService.getLearnedCount(),
			getNumDueGrammarCards: () =>
				reviewService.getNumDueCards(undefined, "grammar"),
			recordGrammarReview: (cardId, rating, timing) =>
				wrap(() =>
					reviewService.recordReview(
						cardId,
						rating,
						undefined,
						timing,
						"grammar",
					),
				),
			startGrammarReviewSession: (maxCards) =>
				reviewService.startReviewSession(maxCards, undefined, "grammar"),
			endGrammarReviewSession: (session) =>
				wrap(() =>
					reviewService.endReviewSession(session, undefined, "grammar"),
				),
			// WaniKani-inspired features
			getStageCounts: (pool) => {
				let cards: SrsCard[];
				switch (pool) {
					case "script":
						cards = Object.values(state.cards);
						break;
					case "vocab":
						cards = Object.values(state.vocabCards);
						break;
					case "grammar":
						cards = Object.values(state.grammarCards);
						break;
					default:
						cards = [
							...Object.values(state.cards),
							...Object.values(state.vocabCards),
							...Object.values(state.grammarCards),
						];
				}
				return getStageCounts(cards.map((c) => c.srs));
			},
			getLeechCards: (pool) => leechService.getLeechCards(pool),
			getLeechCount: (pool) => leechService.getLeechCount(pool),
			getApprenticeStats: () => apprenticeService.getApprenticeStats(),
			canStartLesson: () => apprenticeService.canStartLesson(),
			getReviewForecast: () => reviewService.getReviewForecast(),
			getCriticalItems: (pool, limit) =>
				reviewService.getCriticalItems(pool, limit),
			isNextLessonAvailable: () => learningService.isNextLessonAvailable(),
			getLessonMasteryProgress: (n) =>
				learningService.getLessonMasteryProgress(n),
			resurrectCard: (cardId, pool) =>
				wrap(() => reviewService.resurrectCard(cardId, pool)),
		}),
		[state, refresh, wrap],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
