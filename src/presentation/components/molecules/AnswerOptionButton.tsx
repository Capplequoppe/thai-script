import type { CSSProperties } from "react";

const THAI_NUMERALS = ["๑", "๒", "๓", "๔"] as const;

interface Props {
	choice: string;
	index: number;
	isRevealed: boolean;
	isSelected: boolean;
	isCorrect: boolean;
	onClick: () => void;
	compact?: boolean;
}

export function AnswerOptionButton({
	choice,
	index,
	isRevealed,
	isSelected,
	isCorrect,
	onClick,
	compact = false,
}: Props) {
	let style: CSSProperties = {
		background: "var(--color-surface)",
		borderColor: "var(--color-border)",
	};

	if (isRevealed) {
		if (isCorrect) {
			style = {
				background: "var(--color-accent)",
				color: "var(--color-text)",
				borderColor: "var(--color-accent)",
			};
		} else if (isSelected) {
			style = {
				background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
				borderColor: "var(--color-danger)",
			};
		}
	}

	const hasThaiChar = /[\u0E00-\u0E7F]/.test(choice);

	const thaiSizeClass = compact ? "thai text-xl" : "thai text-5xl";

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={isRevealed}
			className={`w-full flex ${compact ? "flex-row items-center gap-3 px-4 py-3" : "flex-col items-center justify-center px-3 py-4"} rounded-xl border transition-colors min-h-[3rem] overflow-hidden`}
			style={style}
		>
			<span
				className={`flex items-center gap-2 text-sm ${compact ? "" : "mb-1"}`}
				style={{ color: "var(--color-text-muted)" }}
			>
				<span className="text-base opacity-50 font-normal">
					{THAI_NUMERALS[index] ?? String(index + 1)}
				</span>
				{index + 1}
			</span>
			<span
				className={`text-center leading-tight break-words overflow-hidden ${hasThaiChar ? thaiSizeClass : "text-base"}`}
			>
				{choice}
			</span>
		</button>
	);
}
