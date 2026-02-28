import { useCallback, useEffect, useRef, useState } from "react";
import type { RecallRating } from "../../domain/shared/types";
import { RatingButtons } from "./RatingButtons";

interface QuizCardView {
	id: string;
	question: string;
	correctAnswer: string;
	choices: readonly string[];
	audioUrl?: string;
}

interface Props {
	card: QuizCardView;
	onRate: (rating: RecallRating, responseTimeMs: number) => void;
}

export function Flashcard({ card, onRate }: Props) {
	const [revealed, setRevealed] = useState(false);
	const revealedAtRef = useRef(0);
	const cardProperty =
		"property" in card ? (card as Record<string, unknown>).property : null;
	const hideAudioHint =
		cardProperty === "recognition" || cardProperty === "initialSound";
	const symbolChar =
		"symbolCharacter" in card
			? ((card as Record<string, unknown>).symbolCharacter as string)
			: "";
	const wordThai =
		"wordThai" in card
			? ((card as Record<string, unknown>).wordThai as string)
			: "";

	useEffect(() => {
		setRevealed(false);
	}, []);

	const handleReveal = useCallback(() => {
		setRevealed(true);
		revealedAtRef.current = Date.now();
	}, []);

	const handleRate = useCallback(
		(rating: RecallRating) => {
			const elapsed = Date.now() - revealedAtRef.current;
			onRate(rating, elapsed);
		},
		[onRate],
	);

	useEffect(() => {
		if (revealed) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === " ") {
				e.preventDefault();
				handleReveal();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [revealed, handleReveal]);

	return (
		<div className="space-y-6">
			{symbolChar ? (
				<div className="text-center">
					<span className="thai text-8xl">{symbolChar}</span>
					{card.audioUrl && !hideAudioHint && (
						<button
							type="button"
							onClick={() => new Audio(card.audioUrl!).play()}
							className="ml-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors align-middle"
							aria-label="Play pronunciation"
						>
							🔊
						</button>
					)}
				</div>
			) : wordThai ? (
				<div className="text-center">
					<span className="thai text-6xl">{wordThai}</span>
					{card.audioUrl && (
						<button
							type="button"
							onClick={() => new Audio(card.audioUrl!).play()}
							className="ml-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors align-middle"
							aria-label="Play pronunciation"
						>
							🔊
						</button>
					)}
				</div>
			) : null}

			<p className="text-center text-lg text-gray-600 dark:text-gray-300">
				{card.question}
			</p>

			{!revealed ? (
				<button
					type="button"
					onClick={handleReveal}
					className="w-full py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-lg font-semibold transition-colors"
				>
					Show Answer{" "}
					<span className="text-xs text-gray-400 ml-1">(Space)</span>
				</button>
			) : (
				<div className="space-y-6">
					<div className="text-center py-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
						<p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
							{card.correctAnswer}
						</p>
					</div>
					<RatingButtons onRate={handleRate} />
				</div>
			)}
		</div>
	);
}
