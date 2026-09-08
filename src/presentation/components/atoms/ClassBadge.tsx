import { classBadgeStyle } from "../../utils/consonantClassColor";

interface Props {
	classType: string;
}

export function ClassBadge({ classType }: Props) {
	return (
		<span
			className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
			style={classBadgeStyle(classType)}
		>
			{classType} class
		</span>
	);
}
