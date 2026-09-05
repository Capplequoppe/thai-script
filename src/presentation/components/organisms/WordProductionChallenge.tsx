import { useCallback, useEffect, useRef, useState } from "react";
import type { GameInputMode, WordGameItem } from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";
import {
	DrawingCanvas,
	type DrawingCanvasHandle,
} from "../atoms/DrawingCanvas";
import { RatingButtons } from "./RatingButtons";

interface Props {
	item: WordGameItem;
	inputMode: GameInputMode;
	onRate: (rating: RecallRating) => void;
}

/**
 * See it, say it: the English meaning is shown as the prompt (no audio
 * yet — hearing it first would answer the challenge), the learner writes
 * the Thai spelling (on the canvas or on paper) and says it aloud, then
 * reveals the Thai spelling and can play its audio.
 *
 * Reset is keyed on the item's own identity (`thaiWord`) — two consecutive
 * same-direction items reuse this component instance without a remount
 * (see CONTEXT.md).
 */
export function WordProductionChallenge({ item, inputMode, onRate }: Props) {
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

	// Reset state on item change; stop any reveal audio still playing. No
	// autoplay here — the prompt is visual, not audible.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the item's identity drives the reset
	useEffect(() => {
		setRevealed(false);
		canvasRef.current?.clear();
		return () => {
			audioRef.current?.pause();
			audioRef.current = null;
		};
	}, [item.thaiWord]);

	return (
		<div className="space-y-6">
			<div
				className="rounded-xl p-4"
				style={{
					border: "1px solid var(--color-border)",
					background: "var(--color-surface)",
				}}
			>
				<p
					className="text-center text-lg mb-4"
					style={{ color: "var(--color-text-muted)" }}
				>
					{inputMode === "draw"
						? "Write the Thai spelling and say it aloud"
						: "Write the Thai spelling on paper and say it aloud"}
				</p>
				<p
					className="text-center text-4xl font-bold py-6"
					style={{ color: "var(--color-text)" }}
				>
					{item.englishMeaning}
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
							{item.thaiWord}
						</p>
						{item.audioUrl && (
							<button
								type="button"
								onClick={playAudio}
								className="mt-3 inline-flex items-center justify-center w-12 h-12 rounded-full text-2xl transition-colors"
								style={{
									background: "var(--color-surface)",
									color: "var(--color-primary)",
								}}
								aria-label="Replay pronunciation"
							>
								🔊
							</button>
						)}
					</div>
					<RatingButtons onRate={onRate} />
				</div>
			)}
		</div>
	);
}
