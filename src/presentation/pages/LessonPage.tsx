import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { PropertyCard } from "../../domain/shared/types";
import { AchievementBadge } from "../components/AchievementBadge";
import { LessonIntro } from "../components/LessonIntro";
import { MultipleChoice } from "../components/MultipleChoice";
import { useApp } from "../hooks/useApp";
import { useSessionFlow } from "../hooks/useSessionFlow";

type Phase = "intro" | "quiz" | "complete";

export function LessonPage() {
	const { lessonNumber } = useParams<{ lessonNumber: string }>();
	const num = Number(lessonNumber);
	const navigate = useNavigate();
	const { lesson, refresh, checkAchievements } = useApp();

	const [phase, setPhase] = useState<Phase>("intro");
	const [cards, setCards] = useState<PropertyCard[]>([]);
	const flow = useSessionFlow(cards.length);

	const achievementsCheckedRef = useRef(false);
	const [newAchievements, setNewAchievements] = useState<string[]>([]);

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

	useEffect(() => {
		if (phase === "complete" && !achievementsCheckedRef.current) {
			achievementsCheckedRef.current = true;
			const sessionSummary = {
				sessionId: `lesson-${num}-${Date.now()}`,
				completedAt: new Date().toISOString(),
				type: "lesson" as const,
				durationMs: 0,
				totalCards: flow.correct + flow.incorrect,
				correctCount: flow.correct,
				incorrectCount: flow.incorrect,
				accuracy: flow.accuracy.percentage,
				newCardsGraduated: 0,
			};
			const ids = checkAchievements(sessionSummary);
			setNewAchievements(ids);
		}
	}, [phase, num, flow.correct, flow.incorrect, flow.accuracy.percentage, checkAchievements]);

	if (!summary) {
		return (
			<div className="text-center py-8">
				<p style={{ color: "var(--color-text-muted)" }}>Lesson not found</p>
				<button
					type="button"
					onClick={() => navigate("/")}
					className="mt-4"
					style={{ color: "var(--color-primary)" }}
				>
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
				<h1 className="text-xl font-bold mb-1" style={{ color: "var(--color-text)" }}>
					Lesson {num}
				</h1>
				<p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
					{summary.focus}
				</p>
				<LessonIntro summary={summary} onComplete={handleIntroComplete} />
			</div>
		);
	}

	if (phase === "quiz" && cards[flow.cardIdx]) {
		const liveTotal = flow.correct + flow.incorrect;
		const liveAccuracy =
			liveTotal > 0
				? `${Math.round((flow.correct / liveTotal) * 100)}%`
				: "—";

		return (
			<div>
				{/* Session header HUD */}
				<div className="mb-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
							Lesson Session
						</span>
						<span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
							{flow.cardIdx + 1} / {cards.length}
						</span>
						<span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
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
					<div className="w-full h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
						<div
							className="h-full rounded-full transition-all"
							style={{
								background: "var(--color-accent)",
								width: `${((flow.cardIdx + 1) / cards.length) * 100}%`,
							}}
						/>
					</div>
				</div>
				<MultipleChoice card={cards[flow.cardIdx]!} onAnswer={flow.advance} />
			</div>
		);
	}

	// Complete phase
	const totalCardsCount = flow.correct + flow.incorrect;
	const accuracy = flow.accuracy;

	return (
		<div className="space-y-6 py-8">
			<div className="text-center">
				<div className="text-5xl mb-3" style={{ color: "var(--color-accent)" }}>
					✦
				</div>
				<h1 className="text-2xl font-semibold" style={{ color: "var(--color-text)" }}>
					Session Complete
				</h1>
				<p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
					{accuracy.percentage}% accuracy
				</p>
			</div>

			<div className="grid grid-cols-3 gap-3">
				{[
					{ label: "Cards", value: totalCardsCount, color: "var(--color-text)" },
					{ label: "Correct", value: flow.correct, color: "var(--color-master)" },
					{
						label: "Accuracy",
						value: `${accuracy.percentage}%`,
						color: accuracy.percentage >= 80 ? "var(--color-accent)" : "var(--color-danger)",
					},
				].map(({ label, value, color }) => (
					<div key={label} className="card-royal p-4 text-center">
						<div className="text-2xl font-bold" style={{ color }}>
							{value}
						</div>
						<div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
							{label}
						</div>
					</div>
				))}
			</div>

			{newAchievements.length > 0 && (
				<div className="card-royal p-4">
					<div className="section-header mb-3">Achievement Unlocked!</div>
					<div className="flex gap-4 flex-wrap justify-center">
						{newAchievements.map((id) => (
							<AchievementBadge key={id} id={id} unlocked size="sm" />
						))}
					</div>
				</div>
			)}

			<div className="space-y-3">
				<button
					type="button"
					onClick={() => navigate("/")}
					className="btn-primary w-full"
				>
					Back to Home
				</button>
			</div>
		</div>
	);
}
