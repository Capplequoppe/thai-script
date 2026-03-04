import { useCallback, useEffect, useRef, useState } from "react";
import type { RecallRating } from "../../../domain/shared/types";
import { SrsStage } from "../../../domain/srs/value-objects/SrsStage";
import {
	DrawingCanvas,
	type DrawingCanvasHandle,
} from "../atoms/DrawingCanvas";
import { StageDot } from "../atoms/StageDot";
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

export function DrawingQuiz({ card, onRate }: Props) {
	const [revealed, setRevealed] = useState(false);
	const revealedAtRef = useRef(0);
	const canvasRef = useRef<DrawingCanvasHandle>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const stage = card.srs
		? SrsStage.fromScheduleData(card.srs.learningStep, card.srs.interval)
		: null;

	const playAudio = useCallback(() => {
		if (!card.audioUrl) return;
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		const audio = new Audio(card.audioUrl);
		audioRef.current = audio;
		audio.play().catch(() => {});
	}, [card.audioUrl]);

	// Reset state on card change
	// biome-ignore lint/correctness/useExhaustiveDependencies: card.id resets state when the card changes
	useEffect(() => {
		setRevealed(false);
		canvasRef.current?.clear();
	}, [card.id]);

	// Auto-play audio on mount / card change
	useEffect(() => {
		playAudio();
		return () => {
			audioRef.current?.pause();
			audioRef.current = null;
		};
	}, [playAudio]);

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

	// Space key reveals answer (skip if a button is focused)
	useEffect(() => {
		if (revealed) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === " " && !(e.target instanceof HTMLButtonElement)) {
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

				{/* Speaker button */}
				{card.audioUrl && (
					<div className="text-center mb-3">
						<button
							type="button"
							onClick={playAudio}
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
				)}

				{/* Question text */}
				<p
					className="text-center text-lg mb-4"
					style={{ color: "var(--color-text-muted)" }}
				>
					{card.question}
				</p>

				{/* Drawing canvas */}
				<div className="flex justify-center">
					<DrawingCanvas ref={canvasRef} disabled={revealed} />
				</div>
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
							className="text-6xl font-bold"
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
