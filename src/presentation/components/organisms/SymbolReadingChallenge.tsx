import { useCallback, useEffect, useRef, useState } from "react";
import type { SymbolGameItem } from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";
import { RatingButtons } from "./RatingButtons";

interface Props {
	item: SymbolGameItem;
	onRate: (rating: RecallRating) => void;
}

/**
 * See it, say it: the symbol is shown, the learner says it aloud, and the
 * reveal plays the pronunciation and shows the name. No audio is
 * constructed before the reveal — hearing it first would answer the
 * challenge.
 *
 * Reset is keyed on the item's own identity (`symbolCharacter`) — two
 * consecutive same-direction items reuse this component instance without a
 * remount (see CONTEXT.md).
 */
export function SymbolReadingChallenge({ item, onRate }: Props) {
	const [revealed, setRevealed] = useState(false);
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

	// Reset state on item change; stop any reveal audio still playing.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the item's identity drives the reset
	useEffect(() => {
		setRevealed(false);
		return () => {
			audioRef.current?.pause();
			audioRef.current = null;
		};
	}, [item.symbolCharacter]);

	const handleReveal = useCallback(() => {
		setRevealed(true);
		playAudio();
	}, [playAudio]);

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
					Say this symbol aloud
				</p>
				<p
					className="text-center text-7xl font-bold py-6"
					style={{ color: "var(--color-text)" }}
				>
					{item.promptText}
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
							className="text-2xl font-bold"
							style={{ color: "var(--color-primary)" }}
						>
							{item.correctAnswer}
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
