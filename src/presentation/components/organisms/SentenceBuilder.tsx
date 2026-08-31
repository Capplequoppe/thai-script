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
	const [available, setAvailable] = useState<{ char: string; used: boolean }[]>(
		[],
	);
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
		setAvailable(card.choices.map((ch) => ({ char: ch, used: false })));
		setFeedback(null);
		displayedAtRef.current = Date.now();
	}, [card.id]);

	// Auto-play audio on mount / card change
	useEffect(() => {
		playAudio();
	}, [playAudio]);

	const handleTap = useCallback(
		(index: number) => {
			if (feedback) return;
			setAvailable((prev) =>
				prev.map((item, i) => (i === index ? { ...item, used: true } : item)),
			);
			const item = available[index];
			if (item) setBuilt((prev) => [...prev, item.char]);
		},
		[available, feedback],
	);

	const handleBackspace = useCallback(() => {
		if (feedback || built.length === 0) return;
		const lastChar = built[built.length - 1];
		setBuilt((prev) => prev.slice(0, -1));
		// Un-use the last matching used character
		setAvailable((prev) => {
			let idx = -1;
			for (let i = prev.length - 1; i >= 0; i--) {
				const entry = prev[i];
				if (entry?.used && entry.char === lastChar) {
					idx = i;
					break;
				}
			}
			if (idx === -1) return prev;
			return prev.map((item, i) =>
				i === idx ? { ...item, used: false } : item,
			);
		});
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
				{available.map((item, i) => (
					<button
						key={`${item.char}-${i}`}
						type="button"
						disabled={item.used || feedback !== null}
						onClick={() => handleTap(i)}
						className="thai text-lg font-semibold w-10 h-10 rounded-lg flex items-center justify-center transition-all"
						style={{
							background: item.used
								? "var(--color-border)"
								: "var(--color-surface)",
							color: item.used
								? "var(--color-text-muted)"
								: "var(--color-text)",
							opacity: item.used ? 0.4 : 1,
						}}
					>
						{item.char}
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
