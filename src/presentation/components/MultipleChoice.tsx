import { useCallback, useEffect, useRef, useState } from "react";

const THAI_NUMERALS = ["๑", "๒", "๓", "๔"] as const;

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

function playAudio(url: string) {
	new Audio(url).play();
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

	useEffect(() => {
		setSelected(null);
		setRevealed(false);
		displayedAtRef.current = Date.now();
	}, []);

	useEffect(() => {
		if (isAudioRecognition && card.audioUrl) {
			playAudio(card.audioUrl);
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
			if (idx >= 0 && idx < card.choices.length) {
				handleSelect(card.choices[idx]!);
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
						onClick={() => playAudio(card.audioUrl!)}
						className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 text-indigo-600 dark:text-indigo-400 transition-colors text-5xl"
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
					<span className="thai text-8xl font-normal">{symbolChar}</span>
					{card.audioUrl && !hideAudioHint && (
						<button
							type="button"
							onClick={() => playAudio(card.audioUrl!)}
							className="ml-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors align-middle"
							aria-label="Play pronunciation"
						>
							🔊
						</button>
					)}
				</div>
			) : wordThai ? (
				<div
					className="text-center rounded-2xl py-6"
					style={{
						border: "2px solid var(--color-accent)",
						background: "var(--color-surface)",
					}}
				>
					<span className="thai text-6xl font-normal">{wordThai}</span>
					{card.audioUrl && (
						<button
							type="button"
							onClick={() => playAudio(card.audioUrl!)}
							className="ml-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors align-middle"
							aria-label="Play pronunciation"
						>
							🔊
						</button>
					)}
				</div>
			) : null}

			<p className="text-center text-lg text-gray-600 dark:text-gray-300">
				{card.question}
			</p>

			<div className="grid grid-cols-2 gap-3">
				{card.choices.map((choice, idx) => {
					let extraStyle: React.CSSProperties = {
						background: "var(--color-surface)",
						borderColor: "var(--color-border)",
					};

					if (revealed) {
						if (choice === card.correctAnswer) {
							extraStyle = {
								background: "var(--color-accent)",
								color: "var(--color-text)",
								borderColor: "var(--color-accent)",
							};
						} else if (choice === selected) {
							extraStyle = {
								background: "rgba(192, 57, 43, 0.12)",
								borderColor: "var(--color-danger)",
							};
						}
					}

					const hasThaiChar = /[\u0E00-\u0E7F]/.test(choice);

					return (
						<button
							type="button"
							key={choice}
							onClick={() => handleSelect(choice)}
							disabled={revealed}
							className="w-full flex flex-col items-center justify-center px-3 py-4 rounded-xl border transition-colors min-h-[5rem]"
							style={extraStyle}
						>
							<span className="flex items-center gap-2 text-[10px] text-gray-400 mb-1">
								<span className="text-xs opacity-50 font-normal">
									{THAI_NUMERALS[idx]}
								</span>
								{idx + 1}
							</span>
							<span
								className={`text-center leading-tight ${hasThaiChar ? "thai text-3xl" : "text-sm"}`}
							>
								{choice}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
