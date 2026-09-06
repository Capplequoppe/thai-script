import { useCallback, useEffect, useRef, useState } from "react";
import type { SentenceGameItem } from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";
import { RatingButtons } from "./RatingButtons";

interface Props {
	item: SentenceGameItem;
	onRate: (rating: RecallRating) => void;
}

/**
 * See it, say it: the Thai sentence is shown, the learner reads it aloud,
 * and the reveal shows the English meaning — playing the pronunciation
 * only when the sentence has audio at all. No audio is constructed before
 * the reveal (hearing it first would answer the challenge), and none is
 * ever constructed for an audio-less item — which is every sentence in the
 * shipped data today, so the audio-less reveal is the normal case, not an
 * edge case (see CONTEXT.md). There is deliberately no write-input — a
 * whole sentence is not something this feature asks anyone to write.
 *
 * Reset is keyed on the item's own identity (`sentenceId`), never on
 * `audioUrl` alone — two consecutive same-direction items reuse this
 * component instance without a remount, and two distinct items could share
 * an audio file (see CONTEXT.md).
 */
export function SentenceReadingChallenge({ item, onRate }: Props) {
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
	}, [item.sentenceId]);

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
					Read this sentence aloud
				</p>
				<p
					className="text-center text-4xl font-bold py-6 leading-relaxed"
					style={{ color: "var(--color-text)" }}
				>
					{item.thaiText}
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
						className="text-center py-4 px-3 rounded-xl"
						style={{ background: "var(--color-surface-2)" }}
					>
						<p className="text-lg" style={{ color: "var(--color-text-muted)" }}>
							{item.englishMeaning}
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
								aria-label="Replay sentence"
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
