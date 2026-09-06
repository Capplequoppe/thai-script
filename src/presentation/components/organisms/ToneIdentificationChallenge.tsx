import { useCallback, useEffect, useRef, useState } from "react";
import type { ToneGameItem } from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";
import { RatingButtons } from "./RatingButtons";

interface Props {
	item: ToneGameItem;
	onRate: (rating: RecallRating) => void;
}

/**
 * See it and hear it, then say its tones: the Thai word is shown and its
 * pronunciation played together on mount — there is no "hear it" vs. "see
 * it" split here, because the question is neither the spelling nor the
 * meaning but the word's tone pattern, and both halves of the prompt are
 * needed to answer it (`ToneChallengeDirection` has one value for exactly
 * this reason). The reveal shows every syllable beside its tone and the
 * learner self-rates whether they identified the whole pattern.
 *
 * There is deliberately no write-input — a tone is spoken, not written,
 * and nothing here is auto-graded, matching every other organism in this
 * feature.
 *
 * Audio plays only when the word has any: vocabulary entries carry
 * `thai_audio_file: null` for a large share of the shipped data, so the
 * audio-less prompt is a normal case, not an edge case.
 *
 * Reset and autoplay are keyed on the item's own identity (`thaiWord`),
 * never on `audioUrl` alone — two consecutive tone items reuse this
 * component instance without a remount, and two distinct items could share
 * an audio file (see CONTEXT.md).
 */
export function ToneIdentificationChallenge({ item, onRate }: Props) {
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
					Say this word's tones aloud
				</p>
				<p
					className="text-center text-4xl font-bold py-6"
					style={{ color: "var(--color-text)" }}
				>
					{item.thaiWord}
				</p>
				{item.audioUrl && (
					<div className="text-center">
						<button
							type="button"
							onClick={playAudio}
							className="inline-flex items-center justify-center w-12 h-12 rounded-full text-2xl transition-colors"
							style={{
								background: "var(--color-surface-2)",
								color: "var(--color-primary)",
							}}
							aria-label="Replay word"
						>
							🔊
						</button>
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
						className="py-4 px-3 rounded-xl space-y-2"
						style={{ background: "var(--color-surface-2)" }}
					>
						<p
							className="text-center text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							Tones, syllable by syllable
						</p>
						<ul className="space-y-2">
							{item.syllables.map((syllable, index) => (
								<li
									// Syllables repeat within a word (e.g. a reduplicated
									// word), so the text alone is not a stable key.
									key={`${index}-${syllable.text}`}
									className="flex items-center justify-between gap-3 px-3"
								>
									<span
										className="text-2xl font-bold"
										style={{ color: "var(--color-primary)" }}
									>
										{syllable.text}
									</span>
									<span
										className="text-lg"
										style={{ color: "var(--color-text-muted)" }}
									>
										{syllable.tone}
									</span>
								</li>
							))}
						</ul>
					</div>
					<RatingButtons onRate={onRate} />
				</div>
			)}
		</div>
	);
}
