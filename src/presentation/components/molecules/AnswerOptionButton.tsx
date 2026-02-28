import type { CSSProperties } from "react";

const THAI_NUMERALS = ["๑", "๒", "๓", "๔"] as const;

interface Props {
	choice: string;
	index: number;
	isRevealed: boolean;
	isSelected: boolean;
	isCorrect: boolean;
	onClick: () => void;
}

export function AnswerOptionButton({
	choice,
	index,
	isRevealed,
	isSelected,
	isCorrect,
	onClick,
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
				background: "rgba(192, 57, 43, 0.12)",
				borderColor: "var(--color-danger)",
			};
		}
	}

	const hasThaiChar = /[\u0E00-\u0E7F]/.test(choice);

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={isRevealed}
			className="w-full flex flex-col items-center justify-center px-3 py-4 rounded-xl border transition-colors min-h-[5rem]"
			style={style}
		>
			<span
				className="flex items-center gap-2 text-sm mb-1"
				style={{ color: "var(--color-text-muted)" }}
			>
				<span className="text-base opacity-50 font-normal">
					{THAI_NUMERALS[index]}
				</span>
				{index + 1}
			</span>
			<span
				className={`text-center leading-tight ${hasThaiChar ? "thai text-5xl" : "text-base"}`}
			>
				{choice}
			</span>
		</button>
	);
}
