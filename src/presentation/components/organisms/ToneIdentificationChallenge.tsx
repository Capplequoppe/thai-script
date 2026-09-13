import { useCallback, useEffect, useRef, useState } from "react";
import type { ToneGameItem } from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";
import { useMicRecorder } from "../../hooks/useMicRecorder";
import { useToneAttempt } from "../../hooks/useToneAttempt";
import { PitchContourOverlay } from "../molecules/PitchContourOverlay";
import { RatingButtons } from "./RatingButtons";

interface Props {
	item: ToneGameItem;
	onRate: (rating: RecallRating) => void;
}

/**
 * Records the learner's attempt, scores it against `audioUrl` by pitch
 * contour (see `useToneAttempt`), and shows the result — but never touches
 * `onRate` itself. The score is a hint the learner reads before pressing a
 * rating button themselves, not an auto-grade: matches this whole feature's
 * "nothing here is auto-graded" design (see the module doc comment below).
 */
function ToneRecordingPractice({ audioUrl }: { audioUrl: string }) {
	const mic = useMicRecorder();
	const attempt = useToneAttempt(audioUrl);
	const [attemptPlaybackUrl, setAttemptPlaybackUrl] = useState<string | null>(
		null,
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: analyze is stable for a given audioUrl; re-running on mic.audioBlob identity is the point
	useEffect(() => {
		if (mic.audioBlob) attempt.analyze(mic.audioBlob);
	}, [mic.audioBlob]);

	useEffect(() => {
		if (!mic.audioBlob) {
			setAttemptPlaybackUrl(null);
			return;
		}
		const url = URL.createObjectURL(mic.audioBlob);
		setAttemptPlaybackUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [mic.audioBlob]);

	const tryAgain = useCallback(() => {
		mic.reset();
		attempt.reset();
	}, [mic, attempt]);

	return (
		<div
			className="rounded-xl p-4 space-y-3"
			style={{ background: "var(--color-surface-2)" }}
		>
			<p
				className="text-center text-sm"
				style={{ color: "var(--color-text-muted)" }}
			>
				Record yourself saying it
			</p>

			{mic.state === "idle" && (
				<button
					type="button"
					onClick={mic.start}
					className="w-full py-3 rounded-lg text-sm font-semibold transition-colors"
					style={{ background: "var(--color-primary)", color: "white" }}
				>
					🎤 Record
				</button>
			)}

			{mic.state === "recording" && (
				<button
					type="button"
					onClick={mic.stop}
					className="w-full py-3 rounded-lg text-sm font-semibold transition-colors"
					style={{ background: "var(--color-danger)", color: "white" }}
				>
					⏹ Stop
				</button>
			)}

			{mic.state === "denied" && (
				<p
					className="text-center text-sm"
					style={{ color: "var(--color-danger)" }}
				>
					Microphone access is needed to try this.
				</p>
			)}

			{mic.state === "error" && (
				<p
					className="text-center text-sm"
					style={{ color: "var(--color-danger)" }}
				>
					Something went wrong recording audio.
				</p>
			)}

			{attempt.status === "analyzing" && (
				<p
					className="text-center text-sm"
					style={{ color: "var(--color-text-muted)" }}
				>
					Analyzing…
				</p>
			)}

			{attempt.status === "error" && (
				<div className="space-y-2 text-center">
					<p className="text-sm" style={{ color: "var(--color-danger)" }}>
						Couldn't hear you clearly — try again.
					</p>
					<button
						type="button"
						onClick={tryAgain}
						className="text-sm underline"
						style={{ color: "var(--color-primary)" }}
					>
						Record again
					</button>
				</div>
			)}

			{attempt.status === "done" && attempt.result && (
				<div className="space-y-3">
					<PitchContourOverlay
						referenceContour={attempt.result.referenceContour}
						attemptContour={attempt.result.attemptContour}
					/>
					<div className="flex items-center justify-center gap-3">
						<span
							className="px-3 py-1 rounded-full text-xs font-semibold"
							style={{
								background:
									attempt.result.label === "excellent"
										? "color-mix(in srgb, var(--color-master) 20%, var(--color-surface))"
										: attempt.result.label === "good"
											? "color-mix(in srgb, var(--color-accent) 20%, var(--color-surface))"
											: "color-mix(in srgb, var(--color-danger) 20%, var(--color-surface))",
								color:
									attempt.result.label === "excellent"
										? "var(--color-master)"
										: attempt.result.label === "good"
											? "var(--color-accent-h)"
											: "var(--color-danger)",
							}}
						>
							{attempt.result.label === "excellent"
								? "Excellent match"
								: attempt.result.label === "good"
									? "Good match"
									: "Needs work"}
						</span>
						{attemptPlaybackUrl && (
							<button
								type="button"
								onClick={() =>
									new Audio(attemptPlaybackUrl).play().catch(() => {})
								}
								className="text-sm underline"
								style={{ color: "var(--color-primary)" }}
								aria-label="Play your recording"
							>
								▶ Play yours
							</button>
						)}
					</div>
					<div className="text-center">
						<button
							type="button"
							onClick={tryAgain}
							className="text-sm underline"
							style={{ color: "var(--color-text-muted)" }}
						>
							Record again
						</button>
					</div>
				</div>
			)}
		</div>
	);
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
					{item.audioUrl && <ToneRecordingPractice audioUrl={item.audioUrl} />}
					<RatingButtons onRate={onRate} />
				</div>
			)}
		</div>
	);
}
