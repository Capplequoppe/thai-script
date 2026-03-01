import { Card } from "@/presentation/components/ui/card";

interface Props {
	value: number;
	label: string;
}

export function ForecastCell({ value, label }: Props) {
	return (
		<Card className="p-2">
			<div
				className="text-lg font-bold"
				style={{
					color: value > 0 ? "var(--color-accent)" : "var(--color-text-muted)",
				}}
			>
				{value}
			</div>
			<div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
				{label}
			</div>
		</Card>
	);
}
