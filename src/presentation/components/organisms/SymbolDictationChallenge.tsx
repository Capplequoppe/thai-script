import { useCallback, useEffect, useRef, useState } from "react";
import type { GameInputMode, SymbolGameItem } from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";
import {
	DrawingCanvas,
	type DrawingCanvasHandle,
} from "../atoms/DrawingCanvas";
import { RatingButtons } from "./RatingButtons";

interface Props {
	item: SymbolGameItem;
	inputMode: GameInputMode;
	onRate: (rating: RecallRating) => void;
}

/**
 * Hear it, write it: audio plays up front, the learner writes (on the
 * canvas or on paper), then reveals the symbol and self-rates.
 *
 * Reset and autoplay are keyed on the item's own identity
 * (`symbolCharacter`), never on `audioUrl` alone — two consecutive
 * same-direction items reuse this component instance without a remount, and
 * two distinct items could share an audio file (see CONTEXT.md).
 */
export function SymbolDictationChallenge({ item, inputMode, onRate }: Props) {
	const [revealed, setRevealed] = useState(false);
	const canvasRef = useRef<DrawingCanvasHandle>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const playAudio = useCallback(() => {
		if (!item.audioUrl) return;
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		const audio = new Audio(item.audioUrl);
		audioRef.current = audio;
		audio.play().catch(() => {});
	}, [item.audioUrl]);

	// Reset state and play the prompt audio on item change.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the item's identity drives reset and autoplay
	useEffect(() => {
		setRevealed(false);
		canvasRef.current?.clear();
		playAudio();
		return () => {
			audioRef.current?.pause();
			audioRef.current = null;
		};
	}, [item.symbolCharacter]);

	return (
		<div className="space-y-6">
			<div
				className="rounded-xl p-4"
				style={{
					border: "1px solid var(--color-border)",
					background: "var(--color-surface)",
				}}
			>
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

				<p
					className="text-center text-lg mb-4"
					style={{ color: "var(--color-text-muted)" }}
				>
					{inputMode === "draw"
						? "Listen, then write the symbol below"
						: "Listen, then write the symbol on paper"}
				</p>

				{inputMode === "draw" && (
					<div className="flex justify-center">
						<DrawingCanvas ref={canvasRef} disabled={revealed} />
					</div>
				)}
			</div>

			{!revealed ? (
				<button
					type="button"
					onClick={() => setRevealed(true)}
					className="w-full py-4 rounded-xl text-lg font-semibold transition-colors"
					style={{
						background: "var(--color-surface-2)",
						color: "var(--color-text)",
					}}
				>
					Show Answer
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
							{item.promptText}
						</p>
						<p
							className="text-lg mt-2"
							style={{ color: "var(--color-text-muted)" }}
						>
							{item.correctAnswer}
						</p>
					</div>
					<RatingButtons onRate={onRate} />
				</div>
			)}
		</div>
	);
}
