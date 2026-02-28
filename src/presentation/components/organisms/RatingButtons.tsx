import { useEffect } from "react";
import type { RecallRating } from "../../../domain/shared/types";

interface Props {
	onRate: (rating: RecallRating) => void;
}

const RATING_STYLES: Record<number, { background: string; color: string }> = {
	1: { background: "var(--color-danger)", color: "white" },
	2: { background: "#E8951A", color: "white" },
	3: { background: "#D4A017", color: "white" },
	4: { background: "var(--color-master)", color: "white" },
	5: { background: "var(--color-accent)", color: "var(--color-text)" },
};

const ratings: { value: RecallRating; label: string }[] = [
	{ value: 1, label: "Again" },
	{ value: 2, label: "Wrong" },
	{ value: 3, label: "Hard" },
	{ value: 4, label: "Good" },
	{ value: 5, label: "Easy" },
];

export function RatingButtons({ onRate }: Props) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const n = parseInt(e.key, 10);
			if (n >= 1 && n <= 5) onRate(n as RecallRating);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onRate]);

	return (
		<div className="grid grid-cols-5 gap-2">
			{ratings.map(({ value, label }) => (
				<button
					type="button"
					key={value}
					onClick={() => onRate(value)}
					className="rounded-xl py-3 text-sm font-semibold transition-colors"
					style={RATING_STYLES[value]}
				>
					<div className="text-lg">{value}</div>
					<div className="text-xs opacity-80">{label}</div>
				</button>
			))}
		</div>
	);
}
