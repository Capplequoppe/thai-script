import { useCallback, useEffect, useRef, useState } from "react";
import type { RecallRating } from "../../../domain/shared/types";
import { SrsStage } from "../../../domain/srs/value-objects/SrsStage";
import { StageDot } from "../atoms/StageDot";
import { ThaiCharDisplay } from "../atoms/ThaiCharDisplay";
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

export function Flashcard({ card, onRate }: Props) {
	const [revealed, setRevealed] = useState(false);
	const revealedAtRef = useRef(0);

	const cardProperty =
		"property" in card ? (card as Record<string, unknown>).property : null;
	const isAudioRecognition = cardProperty === "audioRecognition";
	const hideAudioHint =
		cardProperty === "recognition" || cardProperty === "initialSound";
	const symbolChar =
		"symbolCharacter" in card
			? ((card as Record<string, unknown>).symbolCharacter as string)
			: "";
	const promptWord =
		"promptWord" in card
			? ((card as Record<string, unknown>).promptWord as string)
			: "";

	const stage = card.srs
		? SrsStage.fromScheduleData(card.srs.learningStep, card.srs.interval)
		: null;

	// biome-ignore lint/correctness/useExhaustiveDependencies: card.id resets state when the card changes
	useEffect(() => {
		setRevealed(false);
	}, [card.id]);

	useEffect(() => {
		if (isAudioRecognition && card.audioUrl) {
			new Audio(card.audioUrl).play().catch(() => {});
		}
	}, [isAudioRecognition, card.audioUrl]);

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
					<div className="absolute top-3 right-3">
						<StageDot stageName={stage.name} />
					</div>
				)}

				{isAudioRecognition && card.audioUrl ? (
					<div className="text-center">
						<button
							type="button"
							onClick={() => {
								if (card.audioUrl) {
									new Audio(card.audioUrl).play().catch(() => {});
								}
							}}
							className="inline-flex items-center justify-center w-24 h-24 rounded-full transition-colors text-5xl"
							style={{
								background: "var(--color-surface-2)",
								color: "var(--color-primary)",
							}}
							aria-label="Replay pronunciation"
						>
							🔊
						</button>
					</div>
				) : symbolChar ? (
					<div className="text-center">
						<ThaiCharDisplay
							character={symbolChar}
							className="text-8xl"
							audioUrl={card.audioUrl}
							hideAudio={hideAudioHint}
						/>
					</div>
				) : promptWord ? (
					<div className="text-center">
						<ThaiCharDisplay
							character={promptWord}
							className="text-6xl"
							audioUrl={card.audioUrl}
						/>
					</div>
				) : null}

				<p
					className="text-center text-lg"
					style={{ color: "var(--color-text-muted)" }}
				>
					{card.question}
				</p>
			</div>

			{!revealed ? (
				<button
					type="button"
					onClick={handleReveal}
					className="w-full py-4 rounded-xl text-lg font-semibold transition-colors"
					style={{
						background: "var(--color-surface-2)",
						color: "var(--color-text)",
					}}
				>
					Show Answer <span className="text-xs opacity-50 ml-1">(Space)</span>
				</button>
			) : (
				<div
					style={{ animation: "slideUp 0.25s ease-out" }}
					className="space-y-6"
				>
					<div
						className="text-center py-4 rounded-xl"
						style={{ background: "var(--color-surface-2)" }}
					>
						<p
							className="text-2xl font-bold"
							style={{ color: "var(--color-primary)" }}
						>
							{card.correctAnswer}
						</p>
					</div>
					<RatingButtons onRate={handleRate} />
				</div>
			)}
		</div>
	);
}
