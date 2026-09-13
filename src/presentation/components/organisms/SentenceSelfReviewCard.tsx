import { useCallback, useEffect, useRef, useState } from "react";
import type { RecallRating } from "../../../domain/shared/types";
import { stripWordSpacing } from "../../utils/thaiText";
import { RatingButtons } from "./RatingButtons";

interface SentenceSelfReviewCardData {
	id: string;
	property: string;
	question: string;
	correctAnswer: string;
	audioUrl?: string;
}

interface Props {
	card: SentenceSelfReviewCardData;
	onRate: (rating: RecallRating, responseTimeMs: number) => void;
}

/**
 * Self-rated translation review for `readingComprehension` and
 * `listeningComprehension` sentence cards — a multiple-choice distractor
 * list marks a technically-correct-but-differently-worded translation
 * wrong, so instead this shows the sentence, lets the learner recall the
 * meaning themselves, reveals `card.correctAnswer`, and has them self-rate
 * with the same 1-5 buttons used everywhere else (see `Flashcard`,
 * `SentenceReadingChallenge`).
 *
 * `readingComprehension`'s `question` is the sentence itself, shown with
 * its word spaces stripped — real Thai text has none, so reading it spaced
 * out scaffolds away the one skill this is meant to build.
 * `listeningComprehension`'s `question` is a fixed instruction string, not
 * the sentence text (the persisted card carries no thai text for it, only
 * `audioUrl`) — audio plays upfront instead, matching `MultipleChoice`'s
 * existing `playsAudioUpfront` handling of the same property.
 */
export function SentenceSelfReviewCard({ card, onRate }: Props) {
	const [revealed, setRevealed] = useState(false);
	const revealedAtRef = useRef(0);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const isListening = card.property === "listeningComprehension";

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

	// Reset on card change; listening comprehension plays its audio upfront.
	// biome-ignore lint/correctness/useExhaustiveDependencies: card.id drives reset/autoplay
	useEffect(() => {
		setRevealed(false);
		if (isListening) playAudio();
		return () => {
			audioRef.current?.pause();
			audioRef.current = null;
		};
	}, [card.id]);

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
				className="rounded-xl p-4"
				style={{
					border: "1px solid var(--color-border)",
					background: "var(--color-surface)",
				}}
			>
				{isListening ? (
					<div className="text-center">
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
						<p
							className="text-lg mt-4"
							style={{ color: "var(--color-text-muted)" }}
						>
							Listen, then work out what the sentence says
						</p>
					</div>
				) : (
					<>
						<p
							className="text-center text-lg mb-4"
							style={{ color: "var(--color-text-muted)" }}
						>
							Read this sentence
						</p>
						<p
							className="thai text-center text-4xl font-bold py-6 leading-relaxed"
							style={{ color: "var(--color-text)" }}
						>
							{stripWordSpacing(card.question)}
						</p>
					</>
				)}
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
						className="text-center py-4 px-3 rounded-xl"
						style={{ background: "var(--color-surface-2)" }}
					>
						<p className="text-lg" style={{ color: "var(--color-text-muted)" }}>
							{card.correctAnswer}
						</p>
					</div>
					<RatingButtons onRate={handleRate} />
				</div>
			)}
		</div>
	);
}
