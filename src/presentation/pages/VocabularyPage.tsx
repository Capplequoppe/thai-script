import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Progress } from "@/presentation/components/ui/progress";
import { ratingFromCorrectness } from "../../domain/shared/ratingFromCorrectness";
import type { RecallRating } from "../../domain/shared/types";
import type { VocabEntry, VocabularyCard } from "../../domain/vocabulary/types";
import { SectionHeader } from "../components/atoms/SectionHeader";
import { SessionStatGrid } from "../components/molecules/SessionStatGrid";
import { AchievementBadge } from "../components/organisms/AchievementBadge";
import { Flashcard } from "../components/organisms/Flashcard";
import { MultipleChoice } from "../components/organisms/MultipleChoice";
import { ToneQuiz } from "../components/organisms/ToneQuiz";
import { WordCard } from "../components/organisms/WordCard";
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
			<div
				className="flex justify-between items-center text-sm"
				style={{ color: "var(--color-text-muted)" }}
			>
				<span>
					{idx + 1} / {words.length}
				</span>
				<span
					className="px-2 py-0.5 rounded text-xs"
					style={{
						background: "var(--color-surface)",
						color: "var(--color-text-muted)",
					}}
				>
					vocabulary
				</span>
			</div>
			<Progress value={((idx + 1) / words.length) * 100} className="h-1.5" />
			<WordCard word={current} />
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

export function VocabularyPage() {
	const { lesson, review, refresh, checkAchievements } = useApp();
	const navigate = useNavigate();

	const [phase, setPhase] = useState<Phase>("overview");
	const [lessonWords, setLessonWords] = useState<VocabEntry[]>([]);
	const [cards, setCards] = useState<VocabularyCard[]>([]);
	const flow = useSessionFlow(cards.length);

	const achievementsCheckedRef = useRef(false);
	const [newAchievements, setNewAchievements] = useState<string[]>([]);

	// Live accuracy tracking for the vocab review phase
	const [reviewCorrect, setReviewCorrect] = useState(0);
	const [reviewTotal, setReviewTotal] = useState(0);

	const startVocabSession = useCallback(
		(maxCards?: number) => review.startSession("vocab", maxCards),
		[review],
	);
	const recordVocabReview = useCallback(
		(cardId: string, rating: RecallRating): string => {
			const newStage = review.recordReview(cardId, rating, "vocab");
			refresh();
			return newStage;
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
	const availableCount = lesson.getVocabUnlearnedCount();
	const learnedCount = lesson.getVocabLearnedCount();
	const dueVocabCards = review.getDueCount("vocab");

	useEffect(() => {
		if (flow.isComplete && cards.length > 0) {
			lesson.commitVocabLesson(cards);
			refresh();
			setPhase("complete");
		}
	}, [flow.isComplete, cards, lesson, refresh]);

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
	}, [
		phase,
		flow.correct,
		flow.incorrect,
		flow.accuracy.percentage,
		checkAchievements,
	]);

	const handleStartLesson = () => {
		if (!nextLesson) return;
		setLessonWords(nextLesson.words);
		achievementsCheckedRef.current = false;
		setNewAchievements([]);
		setPhase("intro");
	};

	const handleIntroComplete = () => {
		const generated = lesson.prepareVocabLesson();
		if (!generated) return;
		setCards(generated);
		flow.reset();
		setPhase("quiz");
	};

	const handleStartReview = () => {
		const s = vocabReview.startReview();
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
			const result = vocabReview.handleReviewAdvance(rating);
			if (result?.status === "complete") {
				setPhase("overview");
			}
		},
		[vocabReview],
	);

	const handleMcAnswer = useCallback(
		(correct: boolean, responseTimeMs?: number) => {
			handleReviewAdvance(ratingFromCorrectness(correct, responseTimeMs));
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
						Vocabulary
					</h1>
					<p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
						Learn Thai words unlocked by your script mastery
					</p>
				</div>

				<div className="grid grid-cols-3 gap-4 text-center">
					<Card className="p-4">
						<div
							className="text-2xl font-bold"
							style={{ color: "var(--color-text)" }}
						>
							{availableCount}
						</div>
						<div
							className="text-xs mt-1"
							style={{ color: "var(--color-text-muted)" }}
						>
							Available
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
							{dueVocabCards}
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
						<div>
							<Button
								type="button"
								size="lg"
								className="w-full"
								onClick={handleStartLesson}
							>
								Learn {nextLesson.words.length} New Words
							</Button>
							<div className="mt-2 flex flex-wrap gap-2 justify-center">
								{nextLesson.words.map((w) => (
									<span
										key={w.thai}
										className="thai text-sm px-2 py-1 rounded"
										style={{
											background: "var(--color-surface)",
											color: "var(--color-text)",
										}}
									>
										{w.thai} — {w.english}
									</span>
								))}
							</div>
						</div>
					)}

					{!nextLesson && availableCount === 0 && learnedCount === 0 && (
						<p
							className="text-center"
							style={{ color: "var(--color-text-muted)" }}
						>
							Complete more script lessons to unlock vocabulary words.
						</p>
					)}

					{!nextLesson && availableCount === 0 && learnedCount > 0 && (
						<p
							className="text-center font-semibold"
							style={{ color: "var(--color-master)" }}
						>
							All unlocked words learned! Complete more script lessons to unlock
							more.
						</p>
					)}

					{dueVocabCards > 0 && (
						<Button
							type="button"
							size="lg"
							className="w-full"
							onClick={handleStartReview}
						>
							Review {dueVocabCards} Due Words
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
					New Vocabulary
				</h1>
				<p
					className="text-sm mb-6"
					style={{ color: "var(--color-text-muted)" }}
				>
					{lessonWords.length} words to learn
				</p>
				<VocabIntro words={lessonWords} onComplete={handleIntroComplete} />
			</div>
		);
	}

	// Quiz
	const currentVocabCard = cards[flow.cardIdx];
	if (phase === "quiz" && currentVocabCard) {
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
							Vocabulary Session
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
				{currentVocabCard.property === "toneIdentification" ? (
					<ToneQuiz card={currentVocabCard} onAnswer={flow.advance} />
				) : (
					<MultipleChoice
						card={currentVocabCard}
						onAnswer={flow.advance}
						mnemonicExpanded
					/>
				)}
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

				<SessionStatGrid
					totalLabel="Cards"
					total={totalCardsCount}
					correct={flow.correct}
					accuracy={accuracy.percentage}
				/>

				{newAchievements.length > 0 && (
					<Card className="p-4">
						<SectionHeader className="mb-3">
							Achievement Unlocked!
						</SectionHeader>
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
	if (phase === "review" && vocabReview.session) {
		const current = vocabReview.currentCard;
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
							Vocabulary Review
						</span>
						<span
							className="text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							{vocabReview.cardIdx + 1} / {vocabReview.session.cards.length}
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
							((vocabReview.cardIdx + 1) / vocabReview.session.cards.length) *
							100
						}
						className="h-1.5"
					/>
				</div>
				{"property" in current.card && current.card.property === "toneIdentification" ? (
					<ToneQuiz card={current.card} onAnswer={handleMcAnswer} />
				) : current.mode === "multipleChoice" ? (
					<MultipleChoice card={current.card} onAnswer={handleMcAnswer} />
				) : (
					<Flashcard card={current.card} onRate={handleReviewAdvance} />
				)}
			</div>
		);
	}

	return null;
}
