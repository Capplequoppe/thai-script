import { classBadgeStyle } from "../../utils/consonantClassColor";
import type { ScaffoldLevel } from "../../utils/srsFade";
import { DistrictBadge } from "./DistrictBadge";

interface Props {
	classType: string;
	/** This symbol's own scaffold level — never a containing word's. Defaults to full support. */
	level?: ScaffoldLevel;
}

export function ClassBadge({ classType, level = "full" }: Props) {
	return (
		<span
			className="px-2 py-0.5 rounded text-xs font-semibold capitalize inline-flex items-center gap-1"
			style={classBadgeStyle(classType)}
		>
			<DistrictBadge classType={classType} level={level} />
			{classType} class
		</span>
	);
}
