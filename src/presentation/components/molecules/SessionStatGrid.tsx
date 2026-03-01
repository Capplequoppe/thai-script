import { Card } from "@/presentation/components/ui/card";

interface Props {
	/** Label for the first column, e.g. "Reviewed" or "Cards" */
	totalLabel: string;
	total: number;
	correct: number;
	accuracy: number;
}

export function SessionStatGrid({ totalLabel, total, correct, accuracy }: Props) {
	return (
		<div className="grid grid-cols-3 gap-3">
			{[
				{ label: totalLabel, value: total, color: "var(--color-text)" },
				{ label: "Correct", value: correct, color: "var(--color-master)" },
				{
					label: "Accuracy",
					value: `${accuracy}%`,
					color:
						accuracy >= 80 ? "var(--color-accent)" : "var(--color-danger)",
				},
			].map(({ label, value, color }) => (
				<Card key={label} className="p-4 text-center">
					<div className="text-2xl font-bold" style={{ color }}>
						{value}
					</div>
					<div
						className="text-xs mt-1"
						style={{ color: "var(--color-text-muted)" }}
					>
						{label}
					</div>
				</Card>
			))}
		</div>
	);
}
