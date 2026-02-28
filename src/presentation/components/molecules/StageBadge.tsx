import { Badge } from "@/presentation/components/ui/badge";

const STAGE_COLORS: Record<string, string> = {
	Apprentice: "var(--color-apprentice)",
	Guru: "var(--color-guru)",
	Master: "var(--color-master)",
	Enlightened: "var(--color-enlightened)",
	Burned: "var(--color-burned)",
};

const STAGE_LABELS: Record<string, string> = {
	Apprentice: "Apprentice",
	Guru: "Guru",
	Master: "Master",
	Enlightened: "Enlightened",
	Burned: "Burned ✸",
};

interface Props {
	stage: string;
	className?: string;
}

export function StageBadge({ stage, className }: Props) {
	return (
		<Badge
			className={className}
			style={{
				background: STAGE_COLORS[stage] ?? "var(--color-primary)",
				color: "white",
			}}
		>
			{STAGE_LABELS[stage] ?? stage}
		</Badge>
	);
}
