import { useCallback, useEffect, useRef, useState } from "react";
import { ThaiCharDisplay } from "./atoms/ThaiCharDisplay";
import { AnswerOptionButton } from "./molecules/AnswerOptionButton";

interface QuizCardView {
	id: string;
	question: string;
	correctAnswer: string;
	choices: readonly string[];
	audioUrl?: string;
}

interface Props {
	card: QuizCardView;
	onAnswer: (correct: boolean, responseTimeMs: number) => void;
}

export function MultipleChoice({ card, onAnswer }: Props) {
	const [selected, setSelected] = useState<string | null>(null);
	const [revealed, setRevealed] = useState(false);
	const displayedAtRef = useRef(Date.now());

	const cardProperty =
		"property" in card ? (card as Record<string, unknown>).property : null;
	const isAudioRecognition = cardProperty === "audioRecognition";
	const hideAudioHint =
		cardProperty === "recognition" || cardProperty === "initialSound";
	const symbolChar =
		"symbolCharacter" in card
			? ((card as Record<string, unknown>).symbolCharacter as string)
			: "";
	const wordThai =
		"wordThai" in card
			? ((card as Record<string, unknown>).wordThai as string)
			: "";

	// biome-ignore lint/correctness/useExhaustiveDependencies: card.id resets state when the card changes
	useEffect(() => {
		setSelected(null);
		setRevealed(false);
		displayedAtRef.current = Date.now();
	}, [card.id]);

	useEffect(() => {
		if (isAudioRecognition && card.audioUrl) {
			new Audio(card.audioUrl).play().catch(() => {});
		}
	}, [isAudioRecognition, card.audioUrl]);

	const handleSelect = useCallback(
		(choice: string) => {
			if (revealed) return;
			const elapsed = Date.now() - displayedAtRef.current;
			setSelected(choice);
			setRevealed(true);
			setTimeout(() => onAnswer(choice === card.correctAnswer, elapsed), 500);
		},
		[card.correctAnswer, onAnswer, revealed],
	);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (revealed) return;
			const idx = parseInt(e.key, 10) - 1;
			const choice = card.choices[idx];
			if (idx >= 0 && idx < card.choices.length && choice !== undefined) {
				handleSelect(choice);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [card.choices, handleSelect, revealed]);

	return (
		<div className="space-y-6">
			{isAudioRecognition && card.audioUrl ? (
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
				<div
					className="text-center rounded-2xl py-6"
					style={{
						border: "2px solid var(--color-accent)",
						background: "var(--color-surface)",
					}}
				>
					<ThaiCharDisplay
						character={symbolChar}
						className="text-[10rem]"
						audioUrl={card.audioUrl}
						hideAudio={hideAudioHint}
					/>
				</div>
			) : wordThai ? (
				<div
					className="text-center rounded-2xl py-6"
					style={{
						border: "2px solid var(--color-accent)",
						background: "var(--color-surface)",
					}}
				>
					<ThaiCharDisplay
						character={wordThai}
						className="text-[7rem]"
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

			<div className="grid grid-cols-2 gap-3">
				{card.choices.map((choice, idx) => (
					<AnswerOptionButton
						key={choice}
						choice={choice}
						index={idx}
						isRevealed={revealed}
						isSelected={selected === choice}
						isCorrect={choice === card.correctAnswer}
						onClick={() => handleSelect(choice)}
					/>
				))}
			</div>
		</div>
	);
}
