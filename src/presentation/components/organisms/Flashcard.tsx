import { useCallback, useEffect, useRef, useState } from "react";
import type { RecallRating } from "../../../domain/shared/types";
import { SrsStage } from "../../../domain/srs/value-objects/SrsStage";
import { classColor } from "../../utils/consonantClassColor";
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
	// Both are "hear it, then recall the meaning" cards — vocab/symbol's own
	// audioRecognition property and a sentence's listeningComprehension
	// property (which has no symbolCharacter/promptWord of its own for the
	// boxes below to key off, so without this it would fall through to no
	// audio at all) — mirrors MultipleChoice's playsAudioUpfront.
	const playsAudioUpfront =
		cardProperty === "audioRecognition" ||
		cardProperty === "listeningComprehension";
	const hideAudioHint =
		cardProperty === "recognition" || cardProperty === "initialSound";
	const symbolChar =
		"symbolCharacter" in card
			? ((card as Record<string, unknown>).symbolCharacter as string)
			: "";
	const symbolClass =
		"consonantClass" in card
			? ((card as Record<string, unknown>).consonantClass as string | undefined)
			: undefined;
	const promptWord =
		"promptWord" in card
			? ((card as Record<string, unknown>).promptWord as string)
			: "";
	// Every other card shape with audio (symbol, vocab) already gets a player
	// via the boxes below — this is only true for a shape with none of them,
	// which today means a sentence's `selfValidation` card: its `audioUrl` is
	// the *answer's* pronunciation, so it belongs in the reveal, not before
	// it (hearing it first would answer the challenge — see
	// `SentenceReadingChallenge`'s own doc comment for the same rule).
	const hasTopAudio =
		playsAudioUpfront || Boolean(symbolChar) || Boolean(promptWord);

	const stage = card.srs
		? SrsStage.fromScheduleData(card.srs.learningStep, card.srs.interval)
		: null;

	// biome-ignore lint/correctness/useExhaustiveDependencies: card.id resets state when the card changes
	useEffect(() => {
		setRevealed(false);
	}, [card.id]);

	useEffect(() => {
		if (playsAudioUpfront && card.audioUrl) {
			new Audio(card.audioUrl).play().catch(() => {});
		}
	}, [playsAudioUpfront, card.audioUrl]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: fires once per reveal, not on every audioUrl/hasTopAudio identity change
	useEffect(() => {
		if (revealed && !hasTopAudio && card.audioUrl) {
			new Audio(card.audioUrl).play().catch(() => {});
		}
	}, [revealed]);

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

				{playsAudioUpfront && card.audioUrl ? (
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
							color={classColor(symbolClass)}
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
							className={`text-2xl font-bold${!hasTopAudio && card.audioUrl ? " thai" : ""}`}
							style={{ color: "var(--color-primary)" }}
						>
							{card.correctAnswer}
						</p>
						{!hasTopAudio && card.audioUrl && (
							<button
								type="button"
								onClick={() => {
									if (card.audioUrl) {
										new Audio(card.audioUrl).play().catch(() => {});
									}
								}}
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
					<RatingButtons onRate={handleRate} />
				</div>
			)}
		</div>
	);
}
