import {
	createContext,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { ConductReviewUseCase } from "../../application/use-cases/ConductReviewUseCase";
import { ManageDataUseCase } from "../../application/use-cases/ManageDataUseCase";
import { ManageItemsUseCase } from "../../application/use-cases/ManageItemsUseCase";
import { PlayGameUseCase } from "../../application/use-cases/PlayGameUseCase";
import { QueryDashboardUseCase } from "../../application/use-cases/QueryDashboardUseCase";
import { StartLessonUseCase } from "../../application/use-cases/StartLessonUseCase";
import { GameItemSelectionService } from "../../domain/game/services/GameItemSelectionService";
import { SentenceGameItemSource } from "../../domain/game/services/SentenceGameItemSource";
import { SymbolGameItemSource } from "../../domain/game/services/SymbolGameItemSource";
import { ToneGameItemSource } from "../../domain/game/services/ToneGameItemSource";
import { WordGameItemSource } from "../../domain/game/services/WordGameItemSource";
import type { GameHistoryEntry } from "../../domain/game/types";
import grammarData from "../../domain/grammar/data/grammar.json";
import { GrammarService } from "../../domain/grammar/services/GrammarLessonService";
import type { GrammarEntry } from "../../domain/grammar/types";
import { LearningService } from "../../domain/script/services/ScriptLessonService";
import sentenceData from "../../domain/sentence/data/sentences.json";
import { SentenceService } from "../../domain/sentence/services/SentenceLessonService";
import type { SentenceEntry } from "../../domain/sentence/types";
import { ReviewService } from "../../domain/session/services/ReviewService";
import { AchievementService } from "../../domain/shared/services/AchievementService";
import { ApprenticeService } from "../../domain/shared/services/ApprenticeService";
import { LeechService } from "../../domain/shared/services/LeechService";
import type { LearnerState, SessionSummary } from "../../domain/shared/types";
import vocabularyData from "../../domain/vocabulary/data/vocabulary.json";
import { VocabularyService } from "../../domain/vocabulary/services/VocabularyLessonService";
import type { VocabEntry } from "../../domain/vocabulary/types";
import { NotificationScheduler } from "../../infrastructure/notifications/NotificationScheduler";
import { LocalStorageJsonStore } from "../../infrastructure/persistence/JsonStore";
import { LocalStorageAdapter } from "../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../infrastructure/persistence/StorageCardRepository";
import {
	GAME_HISTORY_STORAGE_KEY,
	isGameHistoryEntryArray,
	StorageGameHistoryRepository,
} from "../../infrastructure/persistence/StorageGameHistoryRepository";
import { StorageLearnerStateRepository } from "../../infrastructure/persistence/StorageLearnerStateRepository";

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
);
const grammarService = new GrammarService(
	cardRepo,
	grammarData as unknown as GrammarEntry[],
	apprenticeService,
	vocabularyData as VocabEntry[],
);
const sentenceService = new SentenceService(
	cardRepo,
	sentenceData as unknown as SentenceEntry[],
	vocabularyService,
	apprenticeService,
);
const notificationScheduler = new NotificationScheduler();
const achievementService = new AchievementService();

const lessonUseCase = new StartLessonUseCase(
	learningService,
	vocabularyService,
	grammarService,
	sentenceService,
);
const reviewUseCase = new ConductReviewUseCase(
	reviewService,
	notificationScheduler,
);
const dashboardUseCase = new QueryDashboardUseCase(
	cardRepo,
	apprenticeService,
	leechService,
);
const dataUseCase = new ManageDataUseCase(stateRepo);
const itemsUseCase = new ManageItemsUseCase(cardRepo);
// Game history lives under its own localStorage key, never inside
// `thai-srs-state` — a practice log must survive an SRS reset (CONTEXT.md).
const gameHistoryRepo = new StorageGameHistoryRepository(
	new LocalStorageJsonStore<GameHistoryEntry[]>(
		GAME_HISTORY_STORAGE_KEY,
		isGameHistoryEntryArray,
	),
);
const gameUseCase = new PlayGameUseCase(
	new GameItemSelectionService(
		[
			new SymbolGameItemSource(cardRepo),
			new WordGameItemSource(cardRepo, vocabularyData as VocabEntry[]),
			new SentenceGameItemSource(
				cardRepo,
				sentenceData as unknown as SentenceEntry[],
			),
		],
		cardRepo,
		new ToneGameItemSource(cardRepo, vocabularyData as VocabEntry[]),
	),
	gameHistoryRepo,
);

export interface AppContextValue {
	state: LearnerState;
	refresh: () => void;
	lesson: StartLessonUseCase;
	review: ConductReviewUseCase;
	dashboard: QueryDashboardUseCase;
	data: ManageDataUseCase;
	items: ManageItemsUseCase;
	vocab: VocabularyService;
	game: PlayGameUseCase;
	checkAchievements: (summary: SessionSummary) => string[];
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<LearnerState>(() => storage.load());

	const refresh = useCallback(() => {
		setState(storage.load());
	}, []);

	const checkAchievements = useCallback((summary: SessionSummary): string[] => {
		const freshState = storage.load();
		const newIds = achievementService.checkNewAchievements(freshState, summary);
		for (const id of newIds) {
			stateRepo.addAchievement(id);
		}
		return newIds;
	}, []);

	useEffect(() => {
		reviewUseCase.getForecast();

		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				refresh();
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
			lesson: lessonUseCase,
			review: reviewUseCase,
			dashboard: dashboardUseCase,
			data: dataUseCase,
			items: itemsUseCase,
			vocab: vocabularyService,
			game: gameUseCase,
			checkAchievements,
		}),
		[state, refresh, checkAchievements],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
