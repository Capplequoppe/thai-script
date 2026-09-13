import { HashRouter, Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/layout/Layout";
import { AppProvider } from "./context/AppContext";
import { CatchUpPage } from "./pages/CatchUpPage";
import { ConversationPracticePage } from "./pages/ConversationPracticePage";
import { Dashboard } from "./pages/Dashboard";
import { DictionaryPage } from "./pages/DictionaryPage";
import { GamePage } from "./pages/GamePage";
import { GrammarPage } from "./pages/GrammarPage";
import { LearnedItemsPage } from "./pages/LearnedItemsPage";
import { LessonPage } from "./pages/LessonPage";
import { ProgressPage } from "./pages/ProgressPage";
import { ReviewPage } from "./pages/ReviewPage";
import { SentencePage } from "./pages/SentencePage";
import { SettingsPage } from "./pages/SettingsPage";
import { StageItemsPage } from "./pages/StageItemsPage";
import { VocabularyPage } from "./pages/VocabularyPage";

export function App() {
	return (
		<AppProvider>
			<HashRouter>
				<Routes>
					<Route element={<Layout />}>
						<Route path="/" element={<Dashboard />} />
						<Route path="/lesson/:lessonNumber" element={<LessonPage />} />
						<Route path="/catch-up/:lessonNumber" element={<CatchUpPage />} />
						<Route path="/review" element={<ReviewPage />} />
						<Route path="/game" element={<GamePage />} />
						<Route path="/items" element={<LearnedItemsPage />} />
						<Route path="/progress" element={<ProgressPage />} />
						<Route path="/progress/:stage" element={<StageItemsPage />} />
						<Route path="/settings" element={<SettingsPage />} />
						<Route path="/vocabulary" element={<VocabularyPage />} />
						<Route path="/grammar" element={<GrammarPage />} />
						<Route path="/sentences" element={<SentencePage />} />
						{/* Reached as `#/conversation` in production — every route
						    here lives under the `HashRouter` above. */}
						<Route
							path="/conversation"
							element={<ConversationPracticePage />}
						/>
						{/* Vocabulary browsing merged into the Dictionary page — it
						    shows learned words under its "Learned" scope. */}
						<Route
							path="/vocab"
							element={<Navigate to="/dictionary" replace />}
						/>
						<Route path="/dictionary" element={<DictionaryPage />} />
						<Route path="*" element={<Navigate to="/" replace />} />
					</Route>
				</Routes>
			</HashRouter>
		</AppProvider>
	);
}
