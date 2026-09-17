import { useCallback, useMemo, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import { toneRuleComponentsForCard } from "../../../domain/vocabulary/services/toneCardExplanations";
import {
	CLASS_OPTIONS,
	MARK_OPTIONS,
	SHAPE_OPTIONS,
	type ToneRuleComponents,
} from "../../../domain/vocabulary/services/toneRuleComponents";
import type { VocabularyCard } from "../../../domain/vocabulary/types";
import { useResetOnCardChange } from "../../hooks/useResetOnCardChange";

/**
 * Assemble the rule, and let the tone fall out of it.
 *
 * `ToneQuiz` asks which tone a syllable takes. This asks the question behind
 * that one — which class, which ending — and then fires the rule in front of
 * the learner rather than asking them for its answer. The direction is the
 * point: picking the tone first and justifying it afterwards lets a guess be
 * back-filled with a plausible reason, and nothing in the app could tell that
 * apart from a derivation. Picking the inputs cannot be back-filled, and each
 * wrong input says *which half* has gone: the class lookup, or live-vs-dead.
 *
 * Guessing is also worse odds than it looks — three classes times three or
 * four endings, against five tones.
 */

const SHAPE_LABELS: Record<string, string> = {
	live: "live",
	"dead-short": "dead, short vowel",
	"dead-long": "dead, long vowel",
};

interface ToneRuleQuizProps {
	card: VocabularyCard;
	onAnswer: (correct: boolean) => void;
}

type Pick2 = { consonantClass: string | null; axisValue: string | null };

export function ToneRuleQuiz({ card, onAnswer }: ToneRuleQuizProps) {
	const components = useMemo(
		() => toneRuleComponentsForCard(card.id) ?? [],
		[card.id],
	);
	const [picks, setPicks] = useState<Pick2[]>(() =>
		components.map(() => ({ consonantClass: null, axisValue: null })),
	);
	const [revealed, setRevealed] = useState(false);

	// Reset during render on a new card, so a previous word's picks are never
	// painted against this one. See `useResetOnCardChange`.
	useResetOnCardChange(card.id, () => {
		setPicks(components.map(() => ({ consonantClass: null, axisValue: null })));
		setRevealed(false);
	});

	const allPicked =
		components.length > 0 &&
		picks.every((p) => p.consonantClass !== null && p.axisValue !== null);

	const handlePick = useCallback(
		(index: number, field: keyof Pick2, value: string) => {
			if (revealed) return;
			setPicks((prev) =>
				prev.map((pick, i) =>
					i === index ? { ...pick, [field]: value } : pick,
				),
			);
		},
		[revealed],
	);

	const handleCheck = useCallback(() => {
		if (!allPicked || revealed) return;
		setRevealed(true);
		const allCorrect = components.every(
			(component, i) =>
				picks[i]?.consonantClass === component.consonantClass &&
				picks[i]?.axisValue === component.axisValue,
		);
		// The same dwell the tone quiz uses: long enough on a miss to read the
		// rule that was supposed to produce the answer.
		setTimeout(() => onAnswer(allCorrect), allCorrect ? 600 : 5000);
	}, [allPicked, revealed, components, picks, onAnswer]);

	// The generator only emits this card for a derivable word, so an empty
	// list means the corpus moved under a persisted card. Say so rather than
	// showing an unanswerable screen.
	if (components.length === 0) {
		return (
			<p
				className="text-center py-8"
				style={{ color: "var(--color-text-muted)" }}
			>
				This word's tone rules have changed since the card was made.
			</p>
		);
	}

	return (
		<div className="space-y-6">
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

			<div className="space-y-4">
				{components.map((component, i) => (
					<SyllableRow
						key={`${component.text}-${i}`}
						component={component}
						pick={picks[i] ?? { consonantClass: null, axisValue: null }}
						revealed={revealed}
						onPick={(field, value) => handlePick(i, field, value)}
					/>
				))}
			</div>

			<Button
				type="button"
				className="w-full"
				disabled={!allPicked || revealed}
				onClick={handleCheck}
			>
				Check
			</Button>
		</div>
	);
}

function SyllableRow({
	component,
	pick,
	revealed,
	onPick,
}: {
	component: ToneRuleComponents;
	pick: Pick2;
	revealed: boolean;
	onPick: (field: keyof Pick2, value: string) => void;
}) {
	const axisOptions = component.axis === "mark" ? MARK_OPTIONS : SHAPE_OPTIONS;
	const bothRight =
		pick.consonantClass === component.consonantClass &&
		pick.axisValue === component.axisValue;

	return (
		<div
			className="rounded-xl p-4 space-y-3"
			style={{ background: "var(--color-surface-2)" }}
		>
			<div className="flex items-center justify-between">
				<span className="thai text-xl">{component.text}</span>
				{revealed && (
					<span
						className="text-sm font-semibold"
						style={{
							color: bothRight ? "var(--color-master)" : "var(--color-danger)",
						}}
					>
						{bothRight ? "✓" : "✗"}
					</span>
				)}
			</div>

			<OptionGroup
				legend="Initial consonant class"
				options={CLASS_OPTIONS}
				selected={pick.consonantClass}
				expected={component.consonantClass}
				revealed={revealed}
				onSelect={(value) => onPick("consonantClass", value)}
			/>

			<OptionGroup
				legend={component.axis === "mark" ? "Tone mark" : "Syllable ending"}
				options={axisOptions}
				labelFor={component.axis === "shape" ? SHAPE_LABELS : undefined}
				selected={pick.axisValue}
				expected={component.axisValue}
				revealed={revealed}
				onSelect={(value) => onPick("axisValue", value)}
			/>

			{revealed && (
				<p
					className="text-xs leading-relaxed pt-1"
					style={{ color: "var(--color-text-muted)" }}
				>
					{component.description}{" "}
					<span className="opacity-60">(lesson {component.lesson})</span>
				</p>
			)}
			{revealed && (
				<p
					className="text-sm font-semibold"
					style={{ color: "var(--color-text)" }}
				>
					→ {component.tone} tone
				</p>
			)}
		</div>
	);
}

function OptionGroup({
	legend,
	options,
	labelFor,
	selected,
	expected,
	revealed,
	onSelect,
}: {
	legend: string;
	options: readonly string[];
	labelFor?: Record<string, string>;
	selected: string | null;
	expected: string;
	revealed: boolean;
	onSelect: (value: string) => void;
}) {
	return (
		<fieldset className="space-y-1.5">
			<legend
				className="text-xs uppercase tracking-wide"
				style={{ color: "var(--color-text-muted)" }}
			>
				{legend}
			</legend>
			<div className="flex flex-wrap gap-2">
				{options.map((option) => {
					const isSelected = selected === option;
					const isRight = revealed && option === expected;
					const isWrong = revealed && isSelected && option !== expected;

					return (
						<button
							key={option}
							type="button"
							onClick={() => onSelect(option)}
							disabled={revealed}
							className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
							style={{
								background: isRight
									? "color-mix(in srgb, var(--color-master) 20%, var(--color-surface))"
									: isWrong
										? "color-mix(in srgb, var(--color-danger) 20%, var(--color-surface))"
										: isSelected
											? "var(--color-accent)"
											: "var(--color-surface)",
								color: isRight
									? "var(--color-master)"
									: isWrong
										? "var(--color-danger)"
										: isSelected
											? "var(--color-surface)"
											: "var(--color-text-muted)",
								border: isSelected
									? "2px solid transparent"
									: "2px solid var(--color-border)",
							}}
						>
							{labelFor?.[option] ?? option}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
