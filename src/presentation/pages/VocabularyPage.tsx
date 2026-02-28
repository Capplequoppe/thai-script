import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ratingFromCorrectness } from "../../domain/shared/ratingFromCorrectness";
import type { RecallRating } from "../../domain/shared/types";
import type { VocabEntry, VocabularyCard } from "../../domain/vocabulary/types";
import { AchievementBadge } from "../components/AchievementBadge";
import { Flashcard } from "../components/Flashcard";
import { MultipleChoice } from "../components/MultipleChoice";
import { WordCard } from "../components/WordCard";
import { useApp } from "../hooks/useApp";
import { useReviewSession } from "../hooks/useReviewSession";
import { useSessionFlow } from "../hooks/useSessionFlow";

type Phase = "overview" | "intro" | "quiz" | "complete" | "review";

function VocabIntro({
	words,
	onComplete,
}: {
	words: VocabEntry[];
	onComplete: () => void;
}) {
	const [idx, setIdx] = useState(0);
	const current = words[idx];
	const isLast = idx === words.length - 1;

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
			<div className="flex justify-between items-center text-sm" style={{ color: "var(--color-text-muted)" }}>
				<span>
					{idx + 1} / {words.length}
				</span>
				<span className="px-2 py-0.5 rounded text-xs" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
					vocabulary
				</span>
			</div>
			<div className="w-full h-1 rounded-full" style={{ background: "var(--color-border)" }}>
				<div
					className="h-full rounded-full transition-all"
					style={{ background: "var(--color-accent)", width: `${((idx + 1) / words.length) * 100}%` }}
				/>
			</div>
			<WordCard word={current} />
			<div className="flex gap-3">
				{idx > 0 && (
					<button
						type="button"
						onClick={goBack}
						className="py-3 px-6 rounded-xl font-semibold transition-colors"
						style={{ background: "var(--color-surface)", color: "var(--color-text)" }}
					>
						Back
					</button>
				)}
				<button
					type="button"
					onClick={advance}
					className="btn-primary flex-1"
				>
					{isLast ? "Start Quiz" : "Next"}
				</button>
			</div>
		</div>
	);
}

export function VocabularyPage() {
	const { lesson, review, refresh, checkAchievements } = useApp();
	const navigate = useNavigate();

	const [phase, setPhase] = useState<Phase>("overview");
	const [lessonWords, setLessonWords] = useState<VocabEntry[]>([]);
	const [cards, setCards] = useState<VocabularyCard[]>([]);
	const flow = useSessionFlow(cards.length);

	const achievementsCheckedRef = useRef(false);
	const [newAchievements, setNewAchievements] = useState<string[]>([]);

	const startVocabSession = useCallback(
		(maxCards?: number) => review.startSession("vocab", maxCards),
		[review],
	);
	const recordVocabReview = useCallback(
		(cardId: string, rating: RecallRating) => {
			review.recordReview(cardId, rating, "vocab");
			refresh();
		},
		[review, refresh],
	);
	const endVocabSession = useCallback(
		(session: Parameters<typeof review.endSession>[0]) => {
			const summary = review.endSession(session, "vocab");
			refresh();
			return summary;
		},
		[review, refresh],
	);

	const vocabReview = useReviewSession(
		startVocabSession,
		recordVocabReview,
		endVocabSession,
	);

	const nextLesson = lesson.getNextVocab();
	const unlockedCount = lesson.getVocabUnlockedCount();
	const learnedCount = lesson.getVocabLearnedCount();
	const dueVocabCards = review.getDueCount("vocab");

	useEffect(() => {
		if (flow.isComplete) {
			setPhase("complete");
		}
	}, [flow.isComplete]);

	useEffect(() => {
		if (phase === "complete" && !achievementsCheckedRef.current) {
			achievementsCheckedRef.current = true;
			const sessionSummary = {
				sessionId: `vocab-lesson-${Date.now()}`,
				completedAt: new Date().toISOString(),
				type: "vocab-lesson" as const,
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
	}, [phase, flow.correct, flow.incorrect, flow.accuracy.percentage, checkAchievements]);

	const handleStartLesson = () => {
		if (!nextLesson) return;
		setLessonWords(nextLesson.words);
		achievementsCheckedRef.current = false;
		setNewAchievements([]);
		setPhase("intro");
	};

	const handleIntroComplete = () => {
		const generated = lesson.startVocab();
		if (!generated) return;
		setCards(generated);
		refresh();
		flow.reset();
		setPhase("quiz");
	};

	const handleStartReview = () => {
		const s = vocabReview.startReview();
		if (s.cards.length === 0) return;
		setPhase("review");
	};

	const handleReviewAdvance = useCallback(
		(rating: RecallRating) => {
			const result = vocabReview.handleReviewAdvance(rating);
			if (result?.status === "complete") {
				setPhase("overview");
			}
		},
		[vocabReview],
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
					<h1 className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>Vocabulary</h1>
					<p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
						Learn Thai words unlocked by your script mastery
					</p>
				</div>

				<div className="grid grid-cols-3 gap-4 text-center">
					<div className="card-royal p-4">
						<div className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{unlockedCount}</div>
						<div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Unlocked</div>
					</div>
					<div className="card-royal p-4">
						<div className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{learnedCount}</div>
						<div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Learned</div>
					</div>
					<div className="card-royal p-4">
						<div className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>
							{dueVocabCards}
						</div>
						<div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Due</div>
					</div>
				</div>

				<div className="space-y-3">
					{nextLesson && (
						<div>
							<button
								type="button"
								onClick={handleStartLesson}
								className="btn-primary w-full text-lg py-4"
							>
								Learn {nextLesson.words.length} New Words
							</button>
							<div className="mt-2 flex flex-wrap gap-2 justify-center">
								{nextLesson.words.map((w) => (
									<span
										key={w.thai}
										className="thai text-sm px-2 py-1 rounded"
										style={{ background: "var(--color-surface)", color: "var(--color-text)" }}
									>
										{w.thai} — {w.english}
									</span>
								))}
							</div>
						</div>
					)}

					{!nextLesson && unlockedCount === 0 && (
						<p className="text-center" style={{ color: "var(--color-text-muted)" }}>
							Complete more script lessons to unlock vocabulary words.
						</p>
					)}

					{!nextLesson &&
						unlockedCount > 0 &&
						learnedCount === unlockedCount && (
							<p className="text-center font-semibold" style={{ color: "var(--color-master)" }}>
								All unlocked words learned! Complete more script lessons to
								unlock more.
							</p>
						)}

					{dueVocabCards > 0 && (
						<button
							type="button"
							onClick={handleStartReview}
							className="btn-primary w-full text-lg py-4"
						>
							Review {dueVocabCards} Due Words
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
				<h1 className="text-xl font-bold mb-1" style={{ color: "var(--color-text)" }}>New Vocabulary</h1>
				<p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
					{lessonWords.length} words to learn
				</p>
				<VocabIntro words={lessonWords} onComplete={handleIntroComplete} />
			</div>
		);
	}

	// Quiz
	if (phase === "quiz" && cards[flow.cardIdx]) {
		return (
			<div>
				{/* Session header HUD */}
				<div className="mb-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
							Vocabulary Session
						</span>
						<span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
							{flow.cardIdx + 1} / {cards.length}
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

	// Complete
	if (phase === "complete") {
		const totalCardsCount = flow.correct + flow.incorrect;
		const accuracy = flow.accuracy;

		return (
			<div className="space-y-6 py-8">
				<div className="text-center">
					<div className="text-5xl mb-3" style={{ color: "var(--color-accent)" }}>✦</div>
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
							<div className="text-2xl font-bold" style={{ color }}>{value}</div>
							<div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{label}</div>
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

	// Review
	if (phase === "review" && vocabReview.session) {
		const current = vocabReview.currentCard;
		if (!current) return null;

		return (
			<div>
				{/* Session header HUD */}
				<div className="mb-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
							Vocabulary Review
						</span>
						<span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
							{vocabReview.cardIdx + 1} / {vocabReview.session.cards.length}
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
								width: `${((vocabReview.cardIdx + 1) / vocabReview.session.cards.length) * 100}%`,
							}}
						/>
					</div>
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
