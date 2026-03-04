import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import type { VocabularyCard } from "../../../domain/vocabulary/types";

const TONES = ["mid", "low", "high", "falling", "rising"] as const;
type Tone = (typeof TONES)[number];

interface ToneQuizProps {
	card: VocabularyCard;
	onAnswer: (correct: boolean, responseTimeMs: number) => void;
}

export function ToneQuiz({ card, onAnswer }: ToneQuizProps) {
	const syllables = card.syllables ?? [];
	const [selections, setSelections] = useState<(Tone | null)[]>(() =>
		syllables.map(() => null),
	);
	const [revealed, setRevealed] = useState(false);
	const displayedAtRef = useRef(Date.now());

	// Reset on new card
	// biome-ignore lint/correctness/useExhaustiveDependencies: card.id resets state when card changes
	useEffect(() => {
		setSelections(syllables.map(() => null));
		setRevealed(false);
		displayedAtRef.current = Date.now();
	}, [card.id]);

	const allSelected = selections.every((s) => s !== null);
	const correctTones = useMemo(
		() => card.correctAnswer.split("|"),
		[card.correctAnswer],
	);

	const handleSelect = useCallback(
		(syllableIdx: number, tone: Tone) => {
			if (revealed) return;
			setSelections((prev) => {
				const next = [...prev];
				next[syllableIdx] = tone;
				return next;
			});
		},
		[revealed],
	);

	const handleCheck = useCallback(() => {
		if (!allSelected || revealed) return;
		setRevealed(true);
		const elapsed = Date.now() - displayedAtRef.current;
		const allCorrect = selections.every((sel, i) => sel === correctTones[i]);
		setTimeout(() => onAnswer(allCorrect, elapsed), allCorrect ? 600 : 5000);
	}, [allSelected, revealed, selections, correctTones, onAnswer]);

	return (
		<div className="space-y-6">
			{/* Word display */}
			<div
				className="text-center rounded-2xl py-6"
				style={{
					border: "2px solid var(--color-accent)",
					background: "var(--color-surface)",
				}}
			>
				<span
					className="thai font-normal"
					style={{ fontSize: "7rem", lineHeight: 1.15 }}
				>
					{card.promptWord}
				</span>
			</div>

			<p
				className="text-center text-lg"
				style={{ color: "var(--color-text-muted)" }}
			>
				{card.question}
			</p>

			{/* Syllable rows */}
			<div className="space-y-4">
				{syllables.map((syl, i) => {
					const selected = selections[i];
					const isCorrect = revealed && selected === correctTones[i];

					return (
						<div
							key={`${syl.text}-${i}`}
							className="rounded-xl p-4 space-y-2"
							style={{ background: "var(--color-surface-2)" }}
						>
							<div className="flex items-center justify-between">
								<span className="thai text-xl">{syl.text}</span>
								{revealed && (
									<span
										className="text-sm font-semibold"
										style={{
											color: isCorrect
												? "var(--color-master)"
												: "var(--color-danger)",
										}}
									>
										{isCorrect ? "✓" : `✗ → ${correctTones[i]}`}
									</span>
								)}
							</div>
							<div className="flex flex-wrap gap-2">
								{TONES.map((tone) => {
									const isSelected = selected === tone;
									const isToneCorrect = revealed && tone === correctTones[i];
									const isToneWrong =
										revealed && isSelected && tone !== correctTones[i];

									return (
										<button
											key={tone}
											type="button"
											onClick={() => handleSelect(i, tone)}
											disabled={revealed}
											className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
											style={{
												background: isToneCorrect
													? "color-mix(in srgb, var(--color-master) 20%, var(--color-surface))"
													: isToneWrong
														? "color-mix(in srgb, var(--color-danger) 20%, var(--color-surface))"
														: isSelected
															? "var(--color-accent)"
															: "var(--color-surface)",
												color: isToneCorrect
													? "var(--color-master)"
													: isToneWrong
														? "var(--color-danger)"
														: isSelected
															? "var(--color-surface)"
															: "var(--color-text-muted)",
												border: isSelected
													? "2px solid transparent"
													: "2px solid var(--color-border)",
											}}
										>
											{tone}
										</button>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>

			{/* Check button */}
			<Button
				type="button"
				className="w-full"
				disabled={!allSelected || revealed}
				onClick={handleCheck}
			>
				Check
			</Button>
		</div>
	);
}
