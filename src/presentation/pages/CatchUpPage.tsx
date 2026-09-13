import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/presentation/components/ui/button";
import { Progress } from "@/presentation/components/ui/progress";
import { SessionStatGrid } from "../components/molecules/SessionStatGrid";
import { LessonIntro } from "../components/organisms/LessonIntro";
import { MultipleChoice } from "../components/organisms/MultipleChoice";
import { useApp } from "../hooks/useApp";
import { useSessionFlow } from "../hooks/useSessionFlow";

type Phase = "intro" | "quiz" | "complete";

/**
 * Walks the learner through script content that landed in an
 * already-completed lesson after the fact (see `reconcileCards` /
 * `getPendingCatchUps`), so it's introduced once instead of showing up cold
 * in review. The cards themselves already exist with live SRS state — this
 * page only teaches and quizzes, it never (re)creates or completes a lesson.
 */
export function CatchUpPage() {
	const { lessonNumber } = useParams<{ lessonNumber: string }>();
	const num = Number(lessonNumber);
	const navigate = useNavigate();
	const { lesson, refresh } = useApp();

	const [phase, setPhase] = useState<Phase>("intro");

	const pending = useMemo(
		() =>
			lesson.getPendingCatchUps().find((p) => p.lessonNumber === num) ?? null,
		[lesson, num],
	);
	const cards = useMemo(
		() => lesson.getPendingCatchUpCards(num),
		[lesson, num],
	);
	const flow = useSessionFlow(cards.length);

	useEffect(() => {
		if (flow.isComplete) {
			lesson.dismissPendingCatchUp(num);
			refresh();
			setPhase("complete");
		}
	}, [flow.isComplete, lesson, num, refresh]);

	if (!pending) {
		return (
			<div className="text-center py-8">
				<p style={{ color: "var(--color-text-muted)" }}>
					Nothing to catch up on.
				</p>
				<Button variant="link" className="mt-4" onClick={() => navigate("/")}>
					Go Home
				</Button>
			</div>
		);
	}

	const handleIntroComplete = () => {
		if (cards.length === 0) {
			lesson.dismissPendingCatchUp(num);
			refresh();
			setPhase("complete");
			return;
		}
		setPhase("quiz");
	};

	if (phase === "intro") {
		return (
			<div>
				<h1
					className="text-xl font-bold mb-1"
					style={{ color: "var(--color-text)" }}
				>
					New in Lesson {num}
				</h1>
				<p
					className="text-sm mb-6"
					style={{ color: "var(--color-text-muted)" }}
				>
					A few items were added to this lesson after you completed it.
				</p>
				<LessonIntro
					summary={pending.summary}
					onComplete={handleIntroComplete}
				/>
			</div>
		);
	}

	const currentCard = cards[flow.cardIdx];
	if (phase === "quiz" && currentCard) {
		const liveTotal = flow.correct + flow.incorrect;
		const liveAccuracy =
			liveTotal > 0 ? `${Math.round((flow.correct / liveTotal) * 100)}%` : "—";

		return (
			<div>
				<div className="mb-4">
					<div className="flex items-center justify-between mb-2">
						<span
							className="text-sm font-semibold"
							style={{ color: "var(--color-text)" }}
						>
							Catch-up Quiz
						</span>
						<span
							className="text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							{flow.cardIdx + 1} / {cards.length}
						</span>
						<span
							className="text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							Acc: {liveAccuracy}
						</span>
						<button
							type="button"
							onClick={() => navigate("/")}
							className="text-lg leading-none"
							style={{ color: "var(--color-text-muted)" }}
							title="End session"
						>
							✕
						</button>
					</div>
					<Progress
						value={((flow.cardIdx + 1) / cards.length) * 100}
						className="h-1.5"
					/>
				</div>
				<MultipleChoice card={currentCard} onAnswer={flow.advance} />
			</div>
		);
	}

	// Complete phase
	const totalCardsCount = flow.correct + flow.incorrect;

	return (
		<div className="space-y-6 py-8">
			<div className="text-center">
				<div className="text-5xl mb-3" style={{ color: "var(--color-accent)" }}>
					✦
				</div>
				<h1
					className="text-2xl font-semibold"
					style={{ color: "var(--color-text)" }}
				>
					All caught up
				</h1>
			</div>

			{totalCardsCount > 0 && (
				<SessionStatGrid
					totalLabel="Cards"
					total={totalCardsCount}
					correct={flow.correct}
					accuracy={flow.accuracy.percentage}
				/>
			)}

			<Button className="w-full" onClick={() => navigate("/")}>
				Back to Home
			</Button>
		</div>
	);
}
