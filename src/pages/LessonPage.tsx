import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useApp } from "../hooks/useApp";
import { LessonIntro } from "../components/LessonIntro";
import { MultipleChoice } from "../components/MultipleChoice";
import { PropertyCard } from "../types";

type Phase = "intro" | "quiz" | "complete";

export function LessonPage() {
  const { lessonNumber } = useParams<{ lessonNumber: string }>();
  const num = Number(lessonNumber);
  const navigate = useNavigate();
  const app = useApp();

  const [phase, setPhase] = useState<Phase>("intro");
  const [cards, setCards] = useState<PropertyCard[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);

  const summary = useMemo(() => {
    try {
      return app.getLessonSummary(num);
    } catch {
      return null;
    }
  }, [app, num]);

  if (!summary) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Lesson not found</p>
        <button onClick={() => navigate("/")} className="mt-4 text-indigo-600">
          Go Home
        </button>
      </div>
    );
  }

  const handleIntroComplete = () => {
    try {
      const lesson = app.startLesson(num);
      setCards(lesson.cards);
      setPhase("quiz");
    } catch (e) {
      alert((e as Error).message);
      navigate("/");
    }
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) setCorrect((c) => c + 1);
    else setIncorrect((c) => c + 1);

    if (cardIdx + 1 < cards.length) {
      setCardIdx((i) => i + 1);
    } else {
      app.completeLesson(num);
      setPhase("complete");
    }
  };

  if (phase === "intro") {
    return (
      <div>
        <h1 className="text-xl font-bold mb-1">Lesson {num}</h1>
        <p className="text-sm text-gray-500 mb-6">{summary.focus}</p>
        <LessonIntro summary={summary} onComplete={handleIntroComplete} />
      </div>
    );
  }

  if (phase === "quiz" && cards[cardIdx]) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg font-bold">Lesson {num} Quiz</h1>
          <span className="text-sm text-gray-500">
            {cardIdx + 1} / {cards.length}
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all"
            style={{ width: `${((cardIdx + 1) / cards.length) * 100}%` }}
          />
        </div>
        <MultipleChoice card={cards[cardIdx]!} onAnswer={handleAnswer} />
      </div>
    );
  }

  // Complete phase
  const total = correct + incorrect;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="text-center space-y-6 py-8">
      <div className="text-6xl">
        {accuracy >= 80 ? "\uD83C\uDF89" : accuracy >= 50 ? "\uD83D\uDCAA" : "\uD83D\uDCDA"}
      </div>
      <h1 className="text-2xl font-bold">Lesson {num} Complete!</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-gray-500">Cards</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">{correct}</div>
          <div className="text-xs text-gray-500">Correct</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold">{accuracy}%</div>
          <div className="text-xs text-gray-500">Accuracy</div>
        </div>
      </div>
      <div className="space-y-3">
        <button
          onClick={() => navigate("/review")}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold"
        >
          Review Now
        </button>
        <button
          onClick={() => navigate("/")}
          className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
