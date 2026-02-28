import {
	createContext,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import grammarData from "../../domain/grammar/data/grammar.json";
import { GrammarService } from "../../domain/grammar/services/GrammarLessonService";
import type {
	GrammarCard,
	GrammarEntry,
	GrammarLessonSummary,
} from "../../domain/grammar/types";
import {
	LearningService,
	type LessonInfo,
	type LessonSummary,
} from "../../domain/script/services/ScriptLessonService";
import type { CardPool } from "../../domain/session/services/ReviewService";
import {
	type ActiveReviewSession,
	type CriticalItem,
	type ReviewForecast,
	ReviewService,
} from "../../domain/session/services/ReviewService";
import type { ApprenticeStats } from "../../domain/shared/services/ApprenticeService";
import { ApprenticeService } from "../../domain/shared/services/ApprenticeService";
import { LeechService } from "../../domain/shared/services/LeechService";
import type {
	LearnerState,
	RecallRating,
	SessionSummary,
	SrsCard,
	StageCounts,
} from "../../domain/shared/types";
import type { ReviewableCard } from "../../domain/srs/entities/ReviewableCard";
import vocabularyData from "../../domain/vocabulary/data/vocabulary.json";
import { VocabularyService } from "../../domain/vocabulary/services/VocabularyLessonService";
import type {
	VocabEntry,
	VocabLessonSummary,
	VocabularyCard,
} from "../../domain/vocabulary/types";
import { NotificationScheduler } from "../../infrastructure/notifications/NotificationScheduler";
import { LocalStorageAdapter } from "../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../infrastructure/persistence/StorageLearnerStateRepository";
import { getStageCounts } from "../../srs";

const storage = new LocalStorageAdapter();
const cardRepo = new StorageCardRepository(storage);
const apprenticeService = new ApprenticeService(cardRepo);
const leechService = new LeechService(cardRepo);
const stateRepo = new StorageLearnerStateRepository(storage);
const learningService = new LearningService(
	cardRepo,
	stateRepo,
	apprenticeService,
);
const reviewService = new ReviewService(cardRepo, stateRepo);
const vocabularyService = new VocabularyService(
	cardRepo,
	stateRepo,
	vocabularyData as VocabEntry[],
	apprenticeService,
);
const grammarService = new GrammarService(
	cardRepo,
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
	getDueCards: () => ReviewableCard[];
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
