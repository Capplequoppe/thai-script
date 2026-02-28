import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { PropertyCard } from "../../domain/shared/types";
import { LessonIntro } from "../components/LessonIntro";
import { MultipleChoice } from "../components/MultipleChoice";
import { useApp } from "../hooks/useApp";
import { useSessionFlow } from "../hooks/useSessionFlow";
import { accuracyEmoji } from "../utils/accuracyEmoji";

type Phase = "intro" | "quiz" | "complete";

export function LessonPage() {
	const { lessonNumber } = useParams<{ lessonNumber: string }>();
	const num = Number(lessonNumber);
	const navigate = useNavigate();
	const { lesson, refresh } = useApp();

	const [phase, setPhase] = useState<Phase>("intro");
	const [cards, setCards] = useState<PropertyCard[]>([]);
	const flow = useSessionFlow(cards.length);

	const summary = useMemo(() => {
		try {
			return lesson.getScriptSummary(num);
		} catch {
			return null;
		}
	}, [lesson, num]);

	useEffect(() => {
		if (flow.isComplete) {
			lesson.completeScript(num);
			refresh();
			setPhase("complete");
		}
	}, [flow.isComplete, lesson, num, refresh]);

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
			const result = lesson.startScript(num);
			if (!result) {
				alert("Too many apprentice items. Review before starting new lessons.");
				navigate("/");
				return;
			}
			setCards(result.cards);
			refresh();
			setPhase("quiz");
		} catch (e) {
			alert((e as Error).message);
			navigate("/");
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

	if (phase === "quiz" && cards[flow.cardIdx]) {
		return (
			<div>
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-lg font-bold">Lesson {num} Quiz</h1>
					<span className="text-sm text-gray-500">
						{flow.cardIdx + 1} / {cards.length}
					</span>
				</div>
				<div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
					<div
						className="h-full bg-indigo-600 rounded-full transition-all"
						style={{
							width: `${((flow.cardIdx + 1) / cards.length) * 100}%`,
						}}
					/>
				</div>
				<MultipleChoice card={cards[flow.cardIdx]!} onAnswer={flow.advance} />
			</div>
		);
	}

	// Complete phase
	return (
		<div className="text-center space-y-6 py-8">
			<div className="text-6xl">{accuracyEmoji(flow.accuracy)}</div>
			<h1 className="text-2xl font-bold">Lesson {num} Complete!</h1>
			<div className="grid grid-cols-3 gap-4">
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
					<div className="text-2xl font-bold">
						{flow.correct + flow.incorrect}
					</div>
					<div className="text-xs text-gray-500">Cards</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
					<div className="text-2xl font-bold text-green-600">
						{flow.correct}
					</div>
					<div className="text-xs text-gray-500">Correct</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
					<div className="text-2xl font-bold">{flow.accuracy.percentage}%</div>
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
