import { useNavigate } from "react-router";
import { useApp } from "../hooks/useApp";
import { NotificationBanner } from "../components/NotificationBanner";

export function Dashboard() {
  const { state, getNextLesson, getNumDueCards, getNextReviewDate } = useApp();
  const navigate = useNavigate();

  const nextLesson = getNextLesson();
  const dueCount = getNumDueCards();
  const nextReview = getNextReviewDate();
  const totalCards = Object.keys(state.cards).length;
  const completedCount = state.completedLessons.length;

  return (
    <div className="space-y-8 py-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Thai Script</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Learn the Thai alphabet with spaced repetition</p>
      </div>

      <NotificationBanner />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold">{completedCount}/25</div>
          <div className="text-xs text-gray-500 mt-1">Lessons</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold">{totalCards}</div>
          <div className="text-xs text-gray-500 mt-1">Cards</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-500">{dueCount}</div>
          <div className="text-xs text-gray-500 mt-1">Due</div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {nextLesson && (
          <button
            onClick={() => navigate(`/lesson/${nextLesson}`)}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-semibold transition-colors"
          >
            Start Lesson {nextLesson}
          </button>
        )}
        {!nextLesson && completedCount === 25 && (
          <div className="text-center py-4 text-green-600 dark:text-green-400 font-semibold">
            All 25 lessons completed!
          </div>
        )}
        {dueCount > 0 && (
          <button
            onClick={() => navigate("/review")}
            className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-lg font-semibold transition-colors"
          >
            Review {dueCount} Due Cards
          </button>
        )}
        {dueCount === 0 && totalCards > 0 && nextReview && (
          <p className="text-center text-sm text-gray-500">
            Next review: {nextReview.toLocaleDateString()} at{" "}
            {nextReview.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {/* Recent sessions */}
      {state.sessionHistory.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">Recent Sessions</h2>
          <div className="space-y-2">
            {state.sessionHistory
              .slice(-5)
              .reverse()
              .map((s) => (
                <div
                  key={s.sessionId}
                  className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-2 text-sm"
                >
                  <span className="capitalize">{s.type}</span>
                  <span>{s.totalCards} cards</span>
                  <span
                    className={
                      s.accuracy >= 80
                        ? "text-green-600"
                        : s.accuracy >= 50
                          ? "text-yellow-600"
                          : "text-red-600"
                    }
                  >
                    {s.accuracy}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
