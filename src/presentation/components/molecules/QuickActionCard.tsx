import type { ReactNode } from "react";
import { Card } from "@/presentation/components/ui/card";
import { SectionHeader } from "../atoms/SectionHeader";

interface Props {
	label: string;
	value: ReactNode;
	onClick?: () => void;
	disabled?: boolean;
}

export function QuickActionCard({ label, value, onClick, disabled }: Props) {
	return (
		<Card
			className={`p-4 text-left${onClick && !disabled ? " cursor-pointer" : ""}${disabled ? " opacity-50" : ""}`}
			onClick={!disabled ? onClick : undefined}
		>
			<SectionHeader className="mb-1 text-xs">{label}</SectionHeader>
			<div
				className="font-semibold mt-2"
				style={{
					color:
						onClick && !disabled
							? "var(--color-primary)"
							: "var(--color-text-muted)",
				}}
			>
				{value}
			</div>
		</Card>
	);
}
