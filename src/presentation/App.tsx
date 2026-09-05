import { HashRouter, Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/layout/Layout";
import { AppProvider } from "./context/AppContext";
import { Dashboard } from "./pages/Dashboard";
import { GamePage } from "./pages/GamePage";
import { GrammarPage } from "./pages/GrammarPage";
import { LearnedItemsPage } from "./pages/LearnedItemsPage";
import { LessonPage } from "./pages/LessonPage";
import { ProgressPage } from "./pages/ProgressPage";
import { ReviewPage } from "./pages/ReviewPage";
import { SentencePage } from "./pages/SentencePage";
import { SettingsPage } from "./pages/SettingsPage";
import { VocabListPage } from "./pages/VocabListPage";
import { VocabularyPage } from "./pages/VocabularyPage";

export function App() {
	return (
		<AppProvider>
			<HashRouter>
				<Routes>
					<Route element={<Layout />}>
						<Route path="/" element={<Dashboard />} />
						<Route path="/lesson/:lessonNumber" element={<LessonPage />} />
						<Route path="/review" element={<ReviewPage />} />
						<Route path="/game" element={<GamePage />} />
						<Route path="/items" element={<LearnedItemsPage />} />
						<Route path="/progress" element={<ProgressPage />} />
						<Route path="/settings" element={<SettingsPage />} />
						<Route path="/vocabulary" element={<VocabularyPage />} />
						<Route path="/grammar" element={<GrammarPage />} />
						<Route path="/sentences" element={<SentencePage />} />
						<Route path="/vocab" element={<VocabListPage />} />
						<Route path="*" element={<Navigate to="/" replace />} />
					</Route>
				</Routes>
			</HashRouter>
		</AppProvider>
	);
}
