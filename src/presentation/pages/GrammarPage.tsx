import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Progress } from "@/presentation/components/ui/progress";
import type { GrammarCard, GrammarEntry } from "../../domain/grammar/types";
import { ratingFromCorrectness } from "../../domain/shared/ratingFromCorrectness";
import type { RecallRating } from "../../domain/shared/types";
import { AchievementBadge } from "../components/AchievementBadge";
import { Flashcard } from "../components/Flashcard";
import { MultipleChoice } from "../components/MultipleChoice";
import { useApp } from "../hooks/useApp";
import { useReviewSession } from "../hooks/useReviewSession";
import { useSessionFlow } from "../hooks/useSessionFlow";

type Phase = "overview" | "intro" | "quiz" | "complete" | "review";

function GrammarIntro({
	grammarPoints,
	onComplete,
}: {
	grammarPoints: GrammarEntry[];
	onComplete: () => void;
}) {
	const [idx, setIdx] = useState(0);
	const current = grammarPoints[idx];
	const isLast = idx === grammarPoints.length - 1;

	const advance = useCallback(() => {
		if (isLast) onComplete();
		else setIdx((i) => i + 1);
	}, [isLast, onComplete]);

	const goBack = useCallback(() => {
		if (idx > 0) setIdx((i) => i - 1);
	}, [idx]);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				advance();
			} else if (e.key === "ArrowLeft" || e.key === "Backspace") {
				e.preventDefault();
				goBack();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [advance, goBack]);

	if (!current) return null;

	return (
		<div className="space-y-6">
			<div
				className="flex justify-between items-center text-sm"
				style={{ color: "var(--color-text-muted)" }}
			>
				<span>
					{idx + 1} / {grammarPoints.length}
				</span>
				<span
					className="px-2 py-0.5 rounded text-xs"
					style={{
						background: "var(--color-surface)",
						color: "var(--color-text-muted)",
					}}
				>
					grammar
				</span>
			</div>
			<div
				className="w-full h-1 rounded-full"
				style={{ background: "var(--color-border)" }}
			>
				<div
					className="h-full rounded-full transition-all"
					style={{
						background: "var(--color-accent)",
						width: `${((idx + 1) / grammarPoints.length) * 100}%`,
					}}
				/>
			</div>

			<h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
				{current.title}
			</h2>
			<Card className="p-4 font-mono text-center text-lg">
				{current.pattern}
			</Card>
			<p style={{ color: "var(--color-text-muted)" }}>{current.explanation}</p>

			<div className="space-y-3">
				<h3
					className="text-sm font-semibold"
					style={{ color: "var(--color-text-muted)" }}
				>
					Examples
				</h3>
				{current.examples.map((ex) => (
					<Card key={ex.thai} className="p-3">
						<div
							className="thai text-lg font-semibold"
							style={{ color: "var(--color-text)" }}
						>
							{ex.thai}
						</div>
						<div
							className="text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							{ex.romanization}
						</div>
						<div className="text-sm" style={{ color: "var(--color-text)" }}>
							{ex.english}
						</div>
						{ex.breakdown && (
							<div
								className="text-xs mt-1 font-mono"
								style={{ color: "var(--color-text-muted)" }}
							>
								{ex.breakdown}
							</div>
						)}
					</Card>
				))}
			</div>

			<div className="flex gap-3">
				{idx > 0 && (
					<Button type="button" variant="outline" onClick={goBack}>
						Back
					</Button>
				)}
				<Button type="button" className="flex-1" onClick={advance}>
					{isLast ? "Start Quiz" : "Next"}
				</Button>
			</div>
		</div>
	);
}

export function GrammarPage() {
	const { lesson, review, refresh, checkAchievements } = useApp();
	const navigate = useNavigate();

	const [phase, setPhase] = useState<Phase>("overview");
	const [lessonGrammar, setLessonGrammar] = useState<GrammarEntry[]>([]);
	const [cards, setCards] = useState<GrammarCard[]>([]);
	const flow = useSessionFlow(cards.length);

	const achievementsCheckedRef = useRef(false);
	const [newAchievements, setNewAchievements] = useState<string[]>([]);

	// Live accuracy tracking for the grammar review phase
	const [reviewCorrect, setReviewCorrect] = useState(0);
	const [reviewTotal, setReviewTotal] = useState(0);

	const startGrammarSession = useCallback(
		(maxCards?: number) => review.startSession("grammar", maxCards),
		[review],
	);
	const recordGrammarReview = useCallback(
		(cardId: string, rating: RecallRating) => {
			review.recordReview(cardId, rating, "grammar");
			refresh();
		},
		[review, refresh],
	);
	const endGrammarSession = useCallback(
		(session: Parameters<typeof review.endSession>[0]) => {
			const summary = review.endSession(session, "grammar");
			refresh();
			return summary;
		},
		[review, refresh],
	);

	const grammarReview = useReviewSession(
		startGrammarSession,
		recordGrammarReview,
		endGrammarSession,
	);

	const nextLesson = lesson.getNextGrammar();
	const unlockedCount = lesson.getGrammarUnlockedCount();
	const learnedCount = lesson.getGrammarLearnedCount();
	const dueGrammarCards = review.getDueCount("grammar");

	useEffect(() => {
		if (flow.isComplete) {
			setPhase("complete");
		}
	}, [flow.isComplete]);

	useEffect(() => {
		if (phase === "complete" && !achievementsCheckedRef.current) {
			achievementsCheckedRef.current = true;
			const sessionSummary = {
				sessionId: `grammar-lesson-${Date.now()}`,
				completedAt: new Date().toISOString(),
				type: "grammar-lesson" as const,
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
	}, [
		phase,
		flow.correct,
		flow.incorrect,
		flow.accuracy.percentage,
		checkAchievements,
	]);

	const handleStartLesson = () => {
		if (!nextLesson) return;
		setLessonGrammar(nextLesson.grammarPoints);
		achievementsCheckedRef.current = false;
		setNewAchievements([]);
		setPhase("intro");
	};

	const handleIntroComplete = () => {
		const generated = lesson.startGrammar();
		if (!generated) return;
		setCards(generated);
		refresh();
		flow.reset();
		setPhase("quiz");
	};

	const handleStartReview = () => {
		const s = grammarReview.startReview();
		if (s.cards.length === 0) return;
		setReviewCorrect(0);
		setReviewTotal(0);
		setPhase("review");
	};

	const handleReviewAdvance = useCallback(
		(rating: RecallRating) => {
			setReviewTotal((t) => t + 1);
			if (rating >= 3) {
				setReviewCorrect((c) => c + 1);
			}
			const result = grammarReview.handleReviewAdvance(rating);
			if (result?.status === "complete") {
				setPhase("overview");
			}
		},
		[grammarReview],
	);

	const handleMcAnswer = useCallback(
		(correct: boolean) => {
			handleReviewAdvance(ratingFromCorrectness(correct));
		},
		[handleReviewAdvance],
	);

	// Overview
	if (phase === "overview") {
		return (
			<div className="space-y-8 py-4">
				<div className="text-center">
					<h1
						className="text-3xl font-bold"
						style={{ color: "var(--color-text)" }}
					>
						Grammar
					</h1>
					<p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
						Learn Thai grammar patterns unlocked by your vocabulary mastery
					</p>
				</div>

				<div className="grid grid-cols-3 gap-4 text-center">
					<Card className="p-4">
						<div
							className="text-2xl font-bold"
							style={{ color: "var(--color-text)" }}
						>
							{unlockedCount}
						</div>
						<div
							className="text-xs mt-1"
							style={{ color: "var(--color-text-muted)" }}
						>
							Unlocked
						</div>
					</Card>
					<Card className="p-4">
						<div
							className="text-2xl font-bold"
							style={{ color: "var(--color-text)" }}
						>
							{learnedCount}
						</div>
						<div
							className="text-xs mt-1"
							style={{ color: "var(--color-text-muted)" }}
						>
							Learned
						</div>
					</Card>
					<Card className="p-4">
						<div
							className="text-2xl font-bold"
							style={{ color: "var(--color-accent)" }}
						>
							{dueGrammarCards}
						</div>
						<div
							className="text-xs mt-1"
							style={{ color: "var(--color-text-muted)" }}
						>
							Due
						</div>
					</Card>
				</div>

				<div className="space-y-3">
					{nextLesson && (
						<Button
							type="button"
							size="lg"
							className="w-full"
							onClick={handleStartLesson}
						>
							Learn {nextLesson.grammarPoints.length} New Grammar Point
							{nextLesson.grammarPoints.length !== 1 ? "s" : ""}
						</Button>
					)}

					{!nextLesson && unlockedCount === 0 && (
						<p
							className="text-center"
							style={{ color: "var(--color-text-muted)" }}
						>
							Master more vocabulary words to unlock grammar points.
						</p>
					)}

					{!nextLesson &&
						unlockedCount > 0 &&
						learnedCount === unlockedCount && (
							<p
								className="text-center font-semibold"
								style={{ color: "var(--color-master)" }}
							>
								All unlocked grammar learned! Master more vocabulary to unlock
								more.
							</p>
						)}

					{dueGrammarCards > 0 && (
						<Button
							type="button"
							size="lg"
							className="w-full"
							onClick={handleStartReview}
						>
							Review {dueGrammarCards} Due Grammar Card
							{dueGrammarCards !== 1 ? "s" : ""}
						</Button>
					)}
				</div>
			</div>
		);
	}

	// Intro
	if (phase === "intro") {
		return (
			<div>
				<h1
					className="text-xl font-bold mb-1"
					style={{ color: "var(--color-text)" }}
				>
					New Grammar
				</h1>
				<p
					className="text-sm mb-6"
					style={{ color: "var(--color-text-muted)" }}
				>
					{lessonGrammar.length} grammar point
					{lessonGrammar.length !== 1 ? "s" : ""} to learn
				</p>
				<GrammarIntro
					grammarPoints={lessonGrammar}
					onComplete={handleIntroComplete}
				/>
			</div>
		);
	}

	// Quiz
	const currentGrammarCard = cards[flow.cardIdx];
	if (phase === "quiz" && currentGrammarCard) {
		const liveTotal = flow.correct + flow.incorrect;
		const liveAccuracy =
			liveTotal > 0 ? `${Math.round((flow.correct / liveTotal) * 100)}%` : "—";

		return (
			<div>
				{/* Session header HUD */}
				<div className="mb-4">
					<div className="flex items-center justify-between mb-2">
						<span
							className="text-sm font-semibold"
							style={{ color: "var(--color-text)" }}
						>
							Grammar Session
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
				<MultipleChoice card={currentGrammarCard} onAnswer={flow.advance} />
			</div>
		);
	}

	// Complete
	if (phase === "complete") {
		const totalCardsCount = flow.correct + flow.incorrect;
		const accuracy = flow.accuracy;

		return (
			<div className="space-y-6 py-8">
				<div className="text-center">
					<div
						className="text-5xl mb-3"
						style={{ color: "var(--color-accent)" }}
					>
						✦
					</div>
					<h1
						className="text-2xl font-semibold"
						style={{ color: "var(--color-text)" }}
					>
						Session Complete
					</h1>
					<p
						className="text-sm mt-1"
						style={{ color: "var(--color-text-muted)" }}
					>
						{accuracy.percentage}% accuracy
					</p>
				</div>

				<div className="grid grid-cols-3 gap-3">
					{[
						{
							label: "Cards",
							value: totalCardsCount,
							color: "var(--color-text)",
						},
						{
							label: "Correct",
							value: flow.correct,
							color: "var(--color-master)",
						},
						{
							label: "Accuracy",
							value: `${accuracy.percentage}%`,
							color:
								accuracy.percentage >= 80
									? "var(--color-accent)"
									: "var(--color-danger)",
						},
					].map(({ label, value, color }) => (
						<Card key={label} className="p-4 text-center">
							<div className="text-2xl font-bold" style={{ color }}>
								{value}
							</div>
							<div
								className="text-xs mt-1"
								style={{ color: "var(--color-text-muted)" }}
							>
								{label}
							</div>
						</Card>
					))}
				</div>

				{newAchievements.length > 0 && (
					<Card className="p-4">
						<div className="section-header mb-3">Achievement Unlocked!</div>
						<div className="flex gap-4 flex-wrap justify-center">
							{newAchievements.map((id) => (
								<AchievementBadge key={id} id={id} unlocked size="sm" />
							))}
						</div>
					</Card>
				)}

				<div className="space-y-3">
					<Button
						type="button"
						className="w-full"
						onClick={() => navigate("/")}
					>
						Back to Home
					</Button>
				</div>
			</div>
		);
	}

	// Review
	if (phase === "review" && grammarReview.session) {
		const current = grammarReview.currentCard;
		if (!current) return null;

		const reviewLiveAccuracy =
			reviewTotal > 0
				? `${Math.round((reviewCorrect / reviewTotal) * 100)}%`
				: "—";

		return (
			<div>
				{/* Session header HUD */}
				<div className="mb-4">
					<div className="flex items-center justify-between mb-2">
						<span
							className="text-sm font-semibold"
							style={{ color: "var(--color-text)" }}
						>
							Grammar Review
						</span>
						<span
							className="text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							{grammarReview.cardIdx + 1} / {grammarReview.session.cards.length}
						</span>
						<span
							className="text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							Acc: {reviewLiveAccuracy}
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
						value={
							((grammarReview.cardIdx + 1) /
								grammarReview.session.cards.length) *
							100
						}
						className="h-1.5"
					/>
				</div>
				{current.mode === "multipleChoice" ? (
					<MultipleChoice card={current.card} onAnswer={handleMcAnswer} />
				) : (
					<Flashcard card={current.card} onRate={handleReviewAdvance} />
				)}
			</div>
		);
	}

	return null;
}
