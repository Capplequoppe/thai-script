import type { ReactNode } from "react";

interface Props {
	children: ReactNode;
	className?: string;
}

export function SectionHeader({ children, className }: Props) {
	return <div className={`section-header ${className ?? ""}`}>{children}</div>;
}
