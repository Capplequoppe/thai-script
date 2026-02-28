import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Flashcard } from "../components/Flashcard";
import { MultipleChoice } from "../components/MultipleChoice";
import { WordCard } from "../components/WordCard";
import { useApp } from "../hooks/useApp";
import type { ActiveReviewSession } from "../review-service";
import type { RecallRating } from "../types";
import type { VocabEntry, VocabularyCard } from "../vocabulary-types";

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
			<div className="flex justify-between items-center text-sm text-gray-500">
				<span>
					{idx + 1} / {words.length}
				</span>
				<span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">
					vocabulary
				</span>
			</div>
			<div className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full">
				<div
					className="h-full bg-emerald-600 rounded-full transition-all"
					style={{ width: `${((idx + 1) / words.length) * 100}%` }}
				/>
			</div>
			<WordCard word={current} />
			<div className="flex gap-3">
				{idx > 0 && (
					<button
						onClick={goBack}
						className="py-3 px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold transition-colors"
					>
						Back
					</button>
				)}
				<button
					onClick={advance}
					className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
				>
					{isLast ? "Start Quiz" : "Next"}
				</button>
			</div>
		</div>
	);
}

export function VocabularyPage() {
	const app = useApp();
	const navigate = useNavigate();

	const [phase, setPhase] = useState<Phase>("overview");
	const [lessonWords, setLessonWords] = useState<VocabEntry[]>([]);
	const [cards, setCards] = useState<VocabularyCard[]>([]);
	const [cardIdx, setCardIdx] = useState(0);
	const [correct, setCorrect] = useState(0);
	const [incorrect, setIncorrect] = useState(0);

	const [session, setSession] = useState<ActiveReviewSession | null>(null);
	const sessionRef = useRef<ActiveReviewSession | null>(null);

	const nextLesson = app.getNextVocabLesson();
	const unlockedCount = app.getVocabUnlockedCount();
	const learnedCount = app.getVocabLearnedCount();
	const dueVocabCards = app.getNumDueVocabCards();

	const handleStartLesson = () => {
		if (!nextLesson) return;
		setLessonWords(nextLesson.words);
		setPhase("intro");
	};

	const handleIntroComplete = () => {
		const generated = app.startVocabLesson();
		setCards(generated);
		setCardIdx(0);
		setCorrect(0);
		setIncorrect(0);
		setPhase("quiz");
	};

	const handleAnswer = (_correct: boolean) => {
		if (_correct) setCorrect((c) => c + 1);
		else setIncorrect((c) => c + 1);

		if (cardIdx + 1 < cards.length) {
			setCardIdx((i) => i + 1);
		} else {
			setPhase("complete");
		}
	};

	const handleStartReview = () => {
		const s = app.startVocabReviewSession();
		if (s.cards.length === 0) return;
		sessionRef.current = s;
		setSession(s);
		setCardIdx(0);
		setPhase("review");
	};

	const handleReviewAdvance = useCallback(
		(rating: RecallRating) => {
			if (!session || !sessionRef.current) return;
			const current = session.cards[cardIdx];
			if (!current) return;

			app.recordVocabReview(current.card.id, rating);
			sessionRef.current.results.push({
				cardId: current.card.id,
				rating,
			});

			if (cardIdx + 1 < session.cards.length) {
				setCardIdx((i) => i + 1);
			} else {
				app.endVocabReviewSession(sessionRef.current);
				setPhase("overview");
				setSession(null);
			}
		},
		[app, session, cardIdx],
	);

	const handleMcAnswer = useCallback(
		(_correct: boolean) => {
			handleReviewAdvance(_correct ? 4 : 2);
		},
		[handleReviewAdvance],
	);

	// Overview
	if (phase === "overview") {
		return (
			<div className="space-y-8 py-4">
				<div className="text-center">
					<h1 className="text-3xl font-bold">Vocabulary</h1>
					<p className="text-gray-500 dark:text-gray-400 mt-1">
						Learn Thai words unlocked by your script mastery
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
							{dueVocabCards}
						</div>
						<div className="text-xs text-gray-500 mt-1">Due</div>
					</div>
				</div>

				<div className="space-y-3">
					{nextLesson && (
						<div>
							<button
								onClick={handleStartLesson}
								className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-lg font-semibold transition-colors"
							>
								Learn {nextLesson.words.length} New Words
							</button>
							<div className="mt-2 flex flex-wrap gap-2 justify-center">
								{nextLesson.words.map((w) => (
									<span
										key={w.thai}
										className="thai text-sm px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded"
									>
										{w.thai} — {w.english}
									</span>
								))}
							</div>
						</div>
					)}

					{!nextLesson && unlockedCount === 0 && (
						<p className="text-center text-gray-500">
							Complete more script lessons to unlock vocabulary words.
						</p>
					)}

					{!nextLesson &&
						unlockedCount > 0 &&
						learnedCount === unlockedCount && (
							<p className="text-center text-green-600 dark:text-green-400 font-semibold">
								All unlocked words learned! Complete more script lessons to
								unlock more.
							</p>
						)}

					{dueVocabCards > 0 && (
						<button
							onClick={handleStartReview}
							className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-lg font-semibold transition-colors"
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
				<h1 className="text-xl font-bold mb-1">New Vocabulary</h1>
				<p className="text-sm text-gray-500 mb-6">
					{lessonWords.length} words to learn
				</p>
				<VocabIntro words={lessonWords} onComplete={handleIntroComplete} />
			</div>
		);
	}

	// Quiz
	if (phase === "quiz" && cards[cardIdx]) {
		return (
			<div>
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-lg font-bold">Vocabulary Quiz</h1>
					<span className="text-sm text-gray-500">
						{cardIdx + 1} / {cards.length}
					</span>
				</div>
				<div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
					<div
						className="h-full bg-emerald-600 rounded-full transition-all"
						style={{ width: `${((cardIdx + 1) / cards.length) * 100}%` }}
					/>
				</div>
				<MultipleChoice card={cards[cardIdx]!} onAnswer={handleAnswer} />
			</div>
		);
	}

	// Complete
	if (phase === "complete") {
		const total = correct + incorrect;
		const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

		return (
			<div className="text-center space-y-6 py-8">
				<div className="text-6xl">
					{accuracy >= 80
						? "\uD83C\uDF89"
						: accuracy >= 50
							? "\uD83D\uDCAA"
							: "\uD83D\uDCDA"}
				</div>
				<h1 className="text-2xl font-bold">Words Learned!</h1>
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
						onClick={() => setPhase("overview")}
						className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
					>
						Back to Vocabulary
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

	// Review
	if (phase === "review" && session) {
		const current = session.cards[cardIdx];
		if (!current) return null;

		return (
			<div>
				<div className="flex justify-between items-center mb-4">
					<h1 className="text-lg font-bold">Vocabulary Review</h1>
					<span className="text-sm text-gray-500">
						{cardIdx + 1} / {session.cards.length}
					</span>
				</div>
				<div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mb-6">
					<div
						className="h-full bg-orange-500 rounded-full transition-all"
						style={{
							width: `${((cardIdx + 1) / session.cards.length) * 100}%`,
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
