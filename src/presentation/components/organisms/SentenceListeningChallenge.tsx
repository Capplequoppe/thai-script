import { useCallback, useEffect, useRef, useState } from "react";
import type { SentenceGameItem } from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";
import { RatingButtons } from "./RatingButtons";

interface Props {
	item: SentenceGameItem;
	onRate: (rating: RecallRating) => void;
}

/**
 * Hear it, understand it: the sentence's audio plays up front, the learner
 * works out what was said, then reveals the Thai text and English meaning
 * and self-rates. There is deliberately no write-input — a whole sentence
 * is not something this feature asks anyone to write (see task 1.3's
 * architectural decision).
 *
 * Only reachable for an item with audio: `assignDirection` never assigns
 * `"listening"` to an audio-less sentence, and every sentence in the
 * shipped data is audio-less today (see CONTEXT.md).
 *
 * Reset and autoplay are keyed on the item's own identity (`sentenceId`),
 * never on `audioUrl` alone — two consecutive same-direction items reuse
 * this component instance without a remount, and two distinct items could
 * share an audio file (see CONTEXT.md).
 */
export function SentenceListeningChallenge({ item, onRate }: Props) {
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

	// Reset state and play the prompt audio on item change.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the item's identity drives reset and autoplay
	useEffect(() => {
		setRevealed(false);
		playAudio();
		return () => {
			audioRef.current?.pause();
			audioRef.current = null;
		};
	}, [item.sentenceId]);

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
						aria-label="Replay sentence"
					>
						🔊
					</button>
				</div>

				<p
					className="text-center text-lg"
					style={{ color: "var(--color-text-muted)" }}
				>
					Listen, then work out what the sentence says
				</p>
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
						className="text-center py-4 px-3 rounded-xl"
						style={{ background: "var(--color-surface-2)" }}
					>
						<p
							className="text-3xl font-bold leading-relaxed"
							style={{ color: "var(--color-primary)" }}
						>
							{item.thaiText}
						</p>
						<p
							className="text-lg mt-2"
							style={{ color: "var(--color-text-muted)" }}
						>
							{item.englishMeaning}
						</p>
					</div>
					<RatingButtons onRate={onRate} />
				</div>
			)}
		</div>
	);
}
