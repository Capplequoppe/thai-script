import { useCallback, useEffect, useState } from "react";
import type { PropertyCard } from "../types";

interface Props {
	card: PropertyCard;
	onAnswer: (correct: boolean) => void;
}

export function MultipleChoice({ card, onAnswer }: Props) {
	const [selected, setSelected] = useState<string | null>(null);
	const [revealed, setRevealed] = useState(false);

	useEffect(() => {
		setSelected(null);
		setRevealed(false);
	}, [card.id]);

	const handleSelect = useCallback(
		(choice: string) => {
			if (revealed) return;
			setSelected(choice);
			setRevealed(true);
			setTimeout(() => onAnswer(choice === card.correctAnswer), 800);
		},
		[card.correctAnswer, onAnswer, revealed],
	);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (revealed) return;
			const idx = parseInt(e.key) - 1;
			if (idx >= 0 && idx < card.choices.length) {
				handleSelect(card.choices[idx]!);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [card.choices, handleSelect, revealed]);

	return (
		<div className="space-y-6">
			{card.symbolCharacter && (
				<div className="text-center">
					<span className="thai text-8xl font-normal">
						{card.symbolCharacter}
					</span>
					{card.audioUrl && (
						<button
							onClick={() => new Audio(card.audioUrl!).play()}
							className="ml-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors align-middle"
							aria-label="Play pronunciation"
						>
							🔊
						</button>
					)}
				</div>
			)}

			<p className="text-center text-lg text-gray-600 dark:text-gray-300">
				{card.question}
			</p>

			<div className="grid grid-cols-1 gap-3">
				{card.choices.map((choice, idx) => {
					let bg =
						"bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800";
					if (revealed) {
						if (choice === card.correctAnswer) {
							bg = "bg-green-100 dark:bg-green-900/40 border-green-500";
						} else if (choice === selected) {
							bg = "bg-red-100 dark:bg-red-900/40 border-red-500";
						}
					}

					return (
						<button
							key={choice}
							onClick={() => handleSelect(choice)}
							disabled={revealed}
							className={`w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors ${bg}`}
						>
							<span className="text-xs text-gray-400 mr-2">{idx + 1}</span>
							{choice}
						</button>
					);
				})}
			</div>
		</div>
	);
}
