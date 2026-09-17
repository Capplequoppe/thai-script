import { useCallback, useMemo, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import { toneExplanationsForCard } from "../../../domain/vocabulary/services/toneCardExplanations";
import type { ToneExplanation } from "../../../domain/vocabulary/services/toneExplanation";
import type { VocabularyCard } from "../../../domain/vocabulary/types";
import { useResetOnCardChange } from "../../hooks/useResetOnCardChange";

const TONES = ["mid", "low", "high", "falling", "rising"] as const;
type Tone = (typeof TONES)[number];

interface ToneQuizProps {
	card: VocabularyCard;
	onAnswer: (correct: boolean) => void;
}

/**
 * The rule behind one syllable's tone, shown once the answer is revealed.
 *
 * This fills a window that was already being held open and left blank: a
 * wrong answer pauses for five seconds before advancing (see `handleCheck`),
 * on the theory that a learner should sit with the mistake. Until now there
 * was nothing to sit with but the right answer, which is the one thing that
 * cannot teach the derivation — knowing ที่ is falling does not tell you that
 * a low-class initial under mai ek *has* to be.
 *
 * Renders nothing where the tables do not reach the syllable, rather than an
 * empty box: silence is honest, an empty explanation is not.
 */
function RuleHint({ explanation }: { explanation?: ToneExplanation }) {
	if (!explanation) return null;

	const exception = explanation.disagreesWithStored;
	return (
		<p
			className="text-xs leading-relaxed pt-1"
			style={{
				color: exception
					? "var(--color-warning, #a16207)"
					: "var(--color-text-muted)",
			}}
		>
			{exception ? (
				<>
					<span className="font-semibold">Exception. </span>
					The rules give {explanation.tone} here ({explanation.description}),
					but this word is said otherwise — so this one is worth memorising
					rather than deriving.
				</>
			) : (
				<>
					{explanation.description}{" "}
					<span className="opacity-60">(lesson {explanation.lesson})</span>
				</>
			)}
		</p>
	);
}

export function ToneQuiz({ card, onAnswer }: ToneQuizProps) {
	const syllables = card.syllables ?? [];
	const [selections, setSelections] = useState<(Tone | null)[]>(() =>
		syllables.map(() => null),
	);
	const [revealed, setRevealed] = useState(false);

	// Reset on new card during render, so the graded selections are never
	// painted against the new card. See `useResetOnCardChange`.
	useResetOnCardChange(card.id, () => {
		setSelections(syllables.map(() => null));
		setRevealed(false);
	});

	const allSelected = selections.every((s) => s !== null);
	const correctTones = useMemo(
		() => card.correctAnswer.split("|"),
		[card.correctAnswer],
	);
	// Index-aligned with `correctTones` by construction — both descend from
	// `toneSyllableInfosOf`. See `toneExplanationsForCard`.
	const explanations = useMemo(
		() => toneExplanationsForCard(card.id),
		[card.id],
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
		const allCorrect = selections.every((sel, i) => sel === correctTones[i]);
		setTimeout(() => onAnswer(allCorrect), allCorrect ? 600 : 5000);
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
							{revealed && <RuleHint explanation={explanations[i]} />}
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
