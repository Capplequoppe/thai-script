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
import { QueryDashboardUseCase } from "../../application/use-cases/QueryDashboardUseCase";
import { StartLessonUseCase } from "../../application/use-cases/StartLessonUseCase";
import grammarData from "../../domain/grammar/data/grammar.json";
import { GrammarService } from "../../domain/grammar/services/GrammarLessonService";
import type { GrammarEntry } from "../../domain/grammar/types";
import { LearningService } from "../../domain/script/services/ScriptLessonService";
import { ReviewService } from "../../domain/session/services/ReviewService";
import { ApprenticeService } from "../../domain/shared/services/ApprenticeService";
import { AchievementService } from "../../domain/shared/services/AchievementService";
import { LeechService } from "../../domain/shared/services/LeechService";
import type { LearnerState, SessionSummary } from "../../domain/shared/types";
import vocabularyData from "../../domain/vocabulary/data/vocabulary.json";
import { VocabularyService } from "../../domain/vocabulary/services/VocabularyLessonService";
import type { VocabEntry } from "../../domain/vocabulary/types";
import { NotificationScheduler } from "../../infrastructure/notifications/NotificationScheduler";
import { LocalStorageAdapter } from "../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../infrastructure/persistence/StorageCardRepository";
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
	apprenticeService,
);
const grammarService = new GrammarService(
	cardRepo,
	grammarData as unknown as GrammarEntry[],
	apprenticeService,
	vocabularyData as VocabEntry[],
);
const notificationScheduler = new NotificationScheduler();
const achievementService = new AchievementService();

const lessonUseCase = new StartLessonUseCase(
	learningService,
	vocabularyService,
	grammarService,
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

export interface AppContextValue {
	state: LearnerState;
	refresh: () => void;
	lesson: StartLessonUseCase;
	review: ConductReviewUseCase;
	dashboard: QueryDashboardUseCase;
	data: ManageDataUseCase;
	checkAchievements: (summary: SessionSummary) => string[];
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<LearnerState>(() => storage.load());

	const refresh = useCallback(() => {
		setState(storage.load());
	}, []);

	const checkAchievements = useCallback(
		(summary: SessionSummary): string[] => {
			const freshState = storage.load();
			const newIds = achievementService.checkNewAchievements(freshState, summary);
			for (const id of newIds) {
				stateRepo.addAchievement(id);
			}
			return newIds;
		},
		[],
	);

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
			checkAchievements,
		}),
		[state, refresh, checkAchievements],
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
