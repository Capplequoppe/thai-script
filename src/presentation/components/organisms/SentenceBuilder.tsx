import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/presentation/components/ui/button";

interface SentenceBuilderProps {
	card: {
		id: string;
		question: string;
		correctAnswer: string;
		choices: readonly string[];
		audioUrl?: string;
	};
	onAnswer: (correct: boolean, responseTimeMs: number) => void;
}

export function SentenceBuilder({ card, onAnswer }: SentenceBuilderProps) {
	const [built, setBuilt] = useState<string[]>([]);
	const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(
		null,
	);
	const displayedAtRef = useRef(Date.now());
	const audioRef = useRef<HTMLAudioElement | null>(null);

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

	// Reset state when card changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: card.id resets state when the card changes
	useEffect(() => {
		setBuilt([]);
		setFeedback(null);
		displayedAtRef.current = Date.now();
	}, [card.id]);

	// Auto-play audio on mount / card change
	useEffect(() => {
		playAudio();
	}, [playAudio]);

	// Tiles are never disabled after a tap: a word's tile pool holds only one
	// tile per distinct character (see generateSpellingChoices), so a letter
	// that occurs more than once in the word must be tappable more than once
	// to spell it — the grid works like a keyboard, not a one-time-use pool.
	const handleTap = useCallback(
		(char: string) => {
			if (feedback) return;
			setBuilt((prev) => [...prev, char]);
		},
		[feedback],
	);

	const handleBackspace = useCallback(() => {
		if (feedback || built.length === 0) return;
		setBuilt((prev) => prev.slice(0, -1));
	}, [built, feedback]);

	const handleSubmit = useCallback(() => {
		if (feedback) return;
		const builtString = built.join("");
		const correctChars = [...card.correctAnswer].filter((ch) => ch !== " ");
		const isCorrect = builtString === correctChars.join("");
		const elapsed = Date.now() - displayedAtRef.current;
		setFeedback(isCorrect ? "correct" : "incorrect");
		setTimeout(() => onAnswer(isCorrect, elapsed), isCorrect ? 500 : 3000);
	}, [built, card.correctAnswer, feedback, onAnswer]);

	return (
		<div className="space-y-6">
			{/* Question */}
			<div className="text-center">
				{card.audioUrl && (
					<div className="mb-3">
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
				<p
					className="text-sm font-semibold"
					style={{ color: "var(--color-text-muted)" }}
				>
					{card.question}
				</p>
			</div>

			{/* Building area */}
			<div
				className="min-h-[3rem] rounded-xl p-3 flex flex-wrap gap-1 items-center justify-center"
				style={{
					background: "var(--color-surface)",
					border: feedback
						? `2px solid var(--color-${feedback === "correct" ? "accent" : "danger"})`
						: "2px solid var(--color-border)",
				}}
			>
				{built.length > 0 ? (
					built.map((ch, i) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: character positions can have duplicates, index is the stable identity
							key={`${ch}-${i}`}
							className="thai text-xl font-semibold"
							style={{ color: "var(--color-text)" }}
						>
							{ch}
						</span>
					))
				) : (
					<span
						className="text-sm"
						style={{ color: "var(--color-text-muted)" }}
					>
						Tap characters below to build
					</span>
				)}
			</div>

			{/* Feedback */}
			{feedback === "incorrect" && (
				<div className="text-center">
					<p
						className="text-sm font-semibold"
						style={{ color: "var(--color-danger)" }}
					>
						Correct answer:
					</p>
					<p
						className="thai text-xl mt-1"
						style={{ color: "var(--color-text)" }}
					>
						{card.correctAnswer}
					</p>
				</div>
			)}

			{/* Character grid */}
			<div className="flex flex-wrap gap-2 justify-center">
				{card.choices.map((choice, i) => (
					<button
						// biome-ignore lint/suspicious/noArrayIndexKey: choices is a fixed tile pool for this card, index keeps each tile stable
						key={`${choice}-${i}`}
						type="button"
						disabled={feedback !== null}
						onClick={() => handleTap(choice)}
						className="thai text-lg font-semibold w-10 h-10 rounded-lg flex items-center justify-center transition-all"
						style={{
							background: "var(--color-surface)",
							color: "var(--color-text)",
						}}
					>
						{choice}
					</button>
				))}
			</div>

			{/* Action buttons */}
			{!feedback && (
				<div className="flex gap-3">
					<Button
						type="button"
						variant="outline"
						onClick={handleBackspace}
						disabled={built.length === 0}
					>
						⌫
					</Button>
					<Button
						type="button"
						className="flex-1"
						onClick={handleSubmit}
						disabled={built.length === 0}
					>
						Check
					</Button>
				</div>
			)}
		</div>
	);
}
