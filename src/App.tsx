import { HashRouter, Routes, Route, Navigate } from "react-router";
import { AppProvider } from "./context/AppContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { LessonPage } from "./pages/LessonPage";
import { ReviewPage } from "./pages/ReviewPage";
import { ProgressPage } from "./pages/ProgressPage";
import { LearnedItemsPage } from "./pages/LearnedItemsPage";

export function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lesson/:lessonNumber" element={<LessonPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/items" element={<LearnedItemsPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
