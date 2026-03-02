import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { Progress } from "@/presentation/components/ui/progress";
import type { SentenceCard, SentenceEntry } from "../../domain/sentence/types";
import { ratingFromCorrectness } from "../../domain/shared/ratingFromCorrectness";
import type { RecallRating } from "../../domain/shared/types";
import { SectionHeader } from "../components/atoms/SectionHeader";
import { SessionStatGrid } from "../components/molecules/SessionStatGrid";
import { AchievementBadge } from "../components/organisms/AchievementBadge";
import { Flashcard } from "../components/organisms/Flashcard";
import { MultipleChoice } from "../components/organisms/MultipleChoice";
import { SentenceBuilder } from "../components/organisms/SentenceBuilder";
import { useApp } from "../hooks/useApp";
import { useReviewSession } from "../hooks/useReviewSession";
import { useSessionFlow } from "../hooks/useSessionFlow";

type Phase = "overview" | "intro" | "quiz" | "complete" | "review";

function SentenceIntro({
	sentences,
	onComplete,
}: {
	sentences: SentenceEntry[];
	onComplete: () => void;
}) {
	const [idx, setIdx] = useState(0);
	const current = sentences[idx];
	const isLast = idx === sentences.length - 1;

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
					{idx + 1} / {sentences.length}
				</span>
				<span
					className="px-2 py-0.5 rounded text-xs"
					style={{
						background: "var(--color-surface)",
						color: "var(--color-text-muted)",
					}}
				>
					sentence
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
						width: `${((idx + 1) / sentences.length) * 100}%`,
					}}
				/>
			</div>

			<Card className="p-5 text-center space-y-2">
				<div
					className="thai text-2xl font-bold"
					style={{ color: "var(--color-text)" }}
				>
					{current.thai}
				</div>
				<div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					{current.romanization}
				</div>
				<div className="text-base" style={{ color: "var(--color-text)" }}>
					{current.english}
				</div>
				{current.thai_audio_file && (
					<button
						type="button"
						onClick={() =>
							new Audio(current.thai_audio_file as string)
								.play()
								.catch(() => {})
						}
						className="text-2xl mt-2"
						aria-label="Play pronunciation"
					>
						🔊
					</button>
				)}
			</Card>

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

function SentenceQuizCard({
	card,
	onAnswer,
}: {
	card: SentenceCard;
	onAnswer: (correct: boolean, responseTimeMs: number) => void;
}) {
	switch (card.property) {
		case "readingComprehension":
		case "listeningComprehension":
			return <MultipleChoice card={card} onAnswer={onAnswer} />;
		case "sentenceBuilding":
			return <SentenceBuilder card={card} onAnswer={onAnswer} />;
		case "selfValidation":
			return (
				<Flashcard
					card={card}
					onRate={(rating, responseTimeMs) =>
						onAnswer(rating >= 3, responseTimeMs)
					}
				/>
			);
		default:
			return null;
	}
}

export function SentencePage() {
	const { lesson, review, refresh, checkAchievements } = useApp();
	const navigate = useNavigate();

	const [phase, setPhase] = useState<Phase>("overview");
	const [lessonSentences, setLessonSentences] = useState<SentenceEntry[]>([]);
	const [cards, setCards] = useState<SentenceCard[]>([]);
	const flow = useSessionFlow(cards.length);

	const achievementsCheckedRef = useRef(false);
	const [newAchievements, setNewAchievements] = useState<string[]>([]);

	const [reviewCorrect, setReviewCorrect] = useState(0);
	const [reviewTotal, setReviewTotal] = useState(0);

	const startSentenceSession = useCallback(
		(maxCards?: number) => review.startSession("sentence", maxCards),
		[review],
	);
	const recordSentenceReview = useCallback(
		(cardId: string, rating: RecallRating): string => {
			const newStage = review.recordReview(cardId, rating, "sentence");
			refresh();
			return newStage;
		},
		[review, refresh],
	);
	const endSentenceSession = useCallback(
		(session: Parameters<typeof review.endSession>[0]) => {
			const summary = review.endSession(session, "sentence");
			refresh();
			return summary;
		},
		[review, refresh],
	);

	const sentenceReview = useReviewSession(
		startSentenceSession,
		recordSentenceReview,
		endSentenceSession,
	);

	const nextLesson = lesson.getNextSentence();
	const unlockedCount = lesson.getSentenceUnlockedCount();
	const learnedCount = lesson.getSentenceLearnedCount();
	const dueSentenceCards = review.getDueCount("sentence");

	useEffect(() => {
		if (flow.isComplete) {
			setPhase("complete");
		}
	}, [flow.isComplete]);

	useEffect(() => {
		if (phase === "complete" && !achievementsCheckedRef.current) {
			achievementsCheckedRef.current = true;
			const sessionSummary = {
				sessionId: `sentence-lesson-${Date.now()}`,
				completedAt: new Date().toISOString(),
				type: "sentence-lesson" as const,
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
		setLessonSentences(nextLesson.sentences);
		achievementsCheckedRef.current = false;
		setNewAchievements([]);
		setPhase("intro");
	};

	const handleIntroComplete = () => {
		const generated = lesson.startSentence();
		if (!generated) return;
		setCards(generated);
		refresh();
		flow.reset();
		setPhase("quiz");
	};

	const handleStartReview = () => {
		const s = sentenceReview.startReview();
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
			const result = sentenceReview.handleReviewAdvance(rating);
			if (result?.status === "complete") {
				setPhase("overview");
			}
		},
		[sentenceReview],
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
						Sentences
					</h1>
					<p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
						Practice reading and understanding Thai sentences
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
							{dueSentenceCards}
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
							Learn {nextLesson.sentences.length} New Sentence
							{nextLesson.sentences.length !== 1 ? "s" : ""}
						</Button>
					)}

					{!nextLesson && unlockedCount === 0 && (
						<p
							className="text-center"
							style={{ color: "var(--color-text-muted)" }}
						>
							Learn more vocabulary words to unlock sentences.
						</p>
					)}

					{!nextLesson &&
						unlockedCount > 0 &&
						learnedCount === unlockedCount && (
							<p
								className="text-center font-semibold"
								style={{ color: "var(--color-master)" }}
							>
								All unlocked sentences learned! Learn more vocabulary to unlock
								more.
							</p>
						)}

					{dueSentenceCards > 0 && (
						<Button
							type="button"
							size="lg"
							className="w-full"
							onClick={handleStartReview}
						>
							Review {dueSentenceCards} Due Sentence Card
							{dueSentenceCards !== 1 ? "s" : ""}
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
					New Sentences
				</h1>
				<p
					className="text-sm mb-6"
					style={{ color: "var(--color-text-muted)" }}
				>
					{lessonSentences.length} sentence
					{lessonSentences.length !== 1 ? "s" : ""} to learn
				</p>
				<SentenceIntro
					sentences={lessonSentences}
					onComplete={handleIntroComplete}
				/>
			</div>
		);
	}

	// Quiz
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
							Sentence Session
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
				<SentenceQuizCard card={currentCard} onAnswer={flow.advance} />
			</div>
		);
	}

	// Complete
	if (phase === "complete") {
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
					total={flow.correct + flow.incorrect}
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
	if (phase === "review" && sentenceReview.session) {
		const current = sentenceReview.currentCard;
		if (!current) return null;

		const reviewLiveAccuracy =
			reviewTotal > 0
				? `${Math.round((reviewCorrect / reviewTotal) * 100)}%`
				: "—";

		return (
			<div>
				<div className="mb-4">
					<div className="flex items-center justify-between mb-2">
						<span
							className="text-sm font-semibold"
							style={{ color: "var(--color-text)" }}
						>
							Sentence Review
						</span>
						<span
							className="text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							{sentenceReview.cardIdx + 1} /{" "}
							{sentenceReview.session.cards.length}
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
							((sentenceReview.cardIdx + 1) /
								sentenceReview.session.cards.length) *
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
