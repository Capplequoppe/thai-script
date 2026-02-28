import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { GrammarCard, GrammarEntry } from "../../domain/grammar/types";
import { ratingFromCorrectness } from "../../domain/shared/ratingFromCorrectness";
import type { RecallRating } from "../../domain/shared/types";
import { Flashcard } from "../components/Flashcard";
import { MultipleChoice } from "../components/MultipleChoice";
import { useApp } from "../hooks/useApp";
import { useReviewSession } from "../hooks/useReviewSession";
import { useSessionFlow } from "../hooks/useSessionFlow";
import { accuracyEmoji } from "../utils/accuracyEmoji";

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
			<div className="flex justify-between items-center text-sm text-gray-500">
				<span>
					{idx + 1} / {grammarPoints.length}
				</span>
				<span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">
					grammar
				</span>
			</div>
			<div className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full">
				<div
					className="h-full bg-cyan-600 rounded-full transition-all"
					style={{
						width: `${((idx + 1) / grammarPoints.length) * 100}%`,
					}}
				/>
			</div>

			<h2 className="text-xl font-bold">{current.title}</h2>
			<div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-4 font-mono text-center text-lg">
				{current.pattern}
			</div>
			<p className="text-gray-600 dark:text-gray-300">{current.explanation}</p>

			<div className="space-y-3">
				<h3 className="text-sm font-semibold text-gray-500">Examples</h3>
				{current.examples.map((ex) => (
					<div
						key={ex.thai}
						className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3"
					>
						<div className="thai text-lg font-semibold">{ex.thai}</div>
						<div className="text-sm text-gray-500">{ex.romanization}</div>
						<div className="text-sm">{ex.english}</div>
						{ex.breakdown && (
							<div className="text-xs text-gray-400 mt-1 font-mono">
								{ex.breakdown}
							</div>
						)}
					</div>
				))}
			</div>

			<div className="flex gap-3">
				{idx > 0 && (
					<button
						type="button"
						onClick={goBack}
						className="py-3 px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold transition-colors"
					>
						Back
					</button>
				)}
				<button
					type="button"
					onClick={advance}
					className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold transition-colors"
				>
					{isLast ? "Start Quiz" : "Next"}
				</button>
			</div>
		</div>
	);
}

export function GrammarPage() {
	const { lesson, review, refresh } = useApp();
	const navigate = useNavigate();

	const [phase, setPhase] = useState<Phase>("overview");
	const [lessonGrammar, setLessonGrammar] = useState<GrammarEntry[]>([]);
	const [cards, setCards] = useState<GrammarCard[]>([]);
	const flow = useSessionFlow(cards.length);

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

	const handleStartLesson = () => {
		if (!nextLesson) return;
		setLessonGrammar(nextLesson.grammarPoints);
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
		setPhase("review");
	};

	const handleReviewAdvance = useCallback(
		(rating: RecallRating) => {
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
					<h1 className="text-3xl font-bold">Grammar</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-1">
						Learn Thai grammar patterns unlocked by your vocabulary mastery
					</p>
				</div>

				<div className="grid grid-cols-3 gap-4 text-center">
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold">{unlockedCount}</div>
						<div className="text-xs text-gray-500 mt-1">Unlocked</div>
					</div>
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold">{learnedCount}</div>
						<div className="text-xs text-gray-500 mt-1">Learned</div>
					</div>
					<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
						<div className="text-2xl font-bold text-orange-500">
							{dueGrammarCards}
						</div>
						<div className="text-xs text-gray-500 mt-1">Due</div>
					</div>
				</div>

				<div className="space-y-3">
					{nextLesson && (
						<button
							type="button"
							onClick={handleStartLesson}
							className="w-full py-4 px-6 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-lg font-semibold transition-colors"
						>
							Learn {nextLesson.grammarPoints.length} New Grammar Point
							{nextLesson.grammarPoints.length !== 1 ? "s" : ""}
						</button>
					)}

					{!nextLesson && unlockedCount === 0 && (
						<p className="text-center text-gray-500">
							Master more vocabulary words to unlock grammar points.
						</p>
					)}

					{!nextLesson &&
						unlockedCount > 0 &&
						learnedCount === unlockedCount && (
							<p className="text-center text-cyan-600 dark:text-cyan-400 font-semibold">
								All unlocked grammar learned! Master more vocabulary to unlock
								more.
							</p>
						)}

					{dueGrammarCards > 0 && (
						<button
							type="button"
							onClick={handleStartReview}
							className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-lg font-semibold transition-colors"
						>
							Review {dueGrammarCards} Due Grammar Card
							{dueGrammarCards !== 1 ? "s" : ""}
						</button>
					)}
				</div>
			</div>
		);
	}

	// Intro
	if (phase === "intro") {
		return (
			<div>
				<h1 className="text-xl font-bold mb-1">New Grammar</h1>
				<p className="text-sm text-gray-500 mb-6">
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
	if (phase === "quiz" && cards[flow.cardIdx]) {
		return (
			<div>
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-lg font-bold">Grammar Quiz</h1>
					<span className="text-sm text-gray-500">
						{flow.cardIdx + 1} / {cards.length}
					</span>
				</div>
				<div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
					<div
						className="h-full bg-cyan-600 rounded-full transition-all"
						style={{ width: `${((flow.cardIdx + 1) / cards.length) * 100}%` }}
					/>
				</div>
				<MultipleChoice card={cards[flow.cardIdx]!} onAnswer={flow.advance} />
			</div>
		);
	}

	// Complete
	if (phase === "complete") {
		return (
			<div className="text-center space-y-6 py-8">
				<div className="text-6xl">{accuracyEmoji(flow.accuracy)}</div>
				<h1 className="text-2xl font-bold">Grammar Learned!</h1>
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
						<div className="text-2xl font-bold">
							{flow.accuracy.percentage}%
						</div>
						<div className="text-xs text-gray-500">Accuracy</div>
					</div>
				</div>
				<div className="space-y-3">
					<button
						type="button"
						onClick={() => setPhase("overview")}
						className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold"
					>
						Back to Grammar
					</button>
					<button
						type="button"
						onClick={() => navigate("/")}
						className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold"
					>
						Back to Home
					</button>
				</div>
			</div>
		);
	}

	// Review
	if (phase === "review" && grammarReview.session) {
		const current = grammarReview.currentCard;
		if (!current) return null;

		return (
			<div>
				<div className="flex justify-between items-center mb-4">
					<h1 className="text-lg font-bold">Grammar Review</h1>
					<span className="text-sm text-gray-500">
						{grammarReview.cardIdx + 1} / {grammarReview.session.cards.length}
					</span>
				</div>
				<div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
					<div
						className="h-full bg-orange-500 rounded-full transition-all"
						style={{
							width: `${((grammarReview.cardIdx + 1) / grammarReview.session.cards.length) * 100}%`,
						}}
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
