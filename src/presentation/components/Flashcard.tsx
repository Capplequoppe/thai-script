import { useCallback, useEffect, useRef, useState } from "react";
import type { RecallRating } from "../../domain/shared/types";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import { RatingButtons } from "./RatingButtons";

interface SrsData {
	learningStep: number | null;
	interval: number;
}

interface QuizCardView {
	id: string;
	question: string;
	correctAnswer: string;
	choices: readonly string[];
	audioUrl?: string;
	srs?: SrsData;
}

interface Props {
	card: QuizCardView;
	onRate: (rating: RecallRating, responseTimeMs: number) => void;
}

const STAGE_DOT_COLORS: Record<string, string> = {
	Apprentice: "var(--color-apprentice)",
	Guru: "var(--color-guru)",
	Master: "var(--color-master)",
	Enlightened: "var(--color-enlightened)",
	Burned: "var(--color-burned)",
};

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

	const stage = card.srs
		? SrsStage.fromScheduleData(card.srs.learningStep, card.srs.interval)
		: null;

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
			<div
				className="relative rounded-xl p-4"
				style={{
					border: "1px solid var(--color-border)",
					background: "var(--color-surface)",
				}}
			>
				{stage && (
					<div
						className="absolute top-3 right-3 w-3 h-3 rounded-full"
						style={{ background: STAGE_DOT_COLORS[stage.name] }}
						title={stage.name}
					/>
				)}

				{symbolChar ? (
					<div className="text-center">
						<span className="thai text-8xl">{symbolChar}</span>
						{card.audioUrl && !hideAudioHint && (
							<button
								type="button"
								onClick={() => {
									if (card.audioUrl) new Audio(card.audioUrl).play();
								}}
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
								onClick={() => {
									if (card.audioUrl) new Audio(card.audioUrl).play();
								}}
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
			</div>

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
				<div
					style={{ animation: "slideUp 0.25s ease-out" }}
					className="space-y-6"
				>
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
