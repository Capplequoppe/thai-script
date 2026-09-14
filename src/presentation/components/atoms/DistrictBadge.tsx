import type { District } from "../../../domain/script/data/sceneGrammar";
import {
	classCueState,
	classDistrictForLevel,
	districtOpacityForLevel,
} from "../../utils/consonantClassColor";
import type { ScaffoldLevel } from "../../utils/srsFade";

// The non-colour channel for consonant class (see consonantClassColor.ts,
// the single source for the class→district mapping). Three glyphs whose
// silhouettes share nothing with each other, so the channel survives colour
// removal entirely: a torii roofline, a stall grid, an anchor hook. Do not
// add a fourth arbitrary mapping here — this table only names how a
// district *looks*; which class gets which district lives in sceneGrammar.ts.
const DISTRICT_GLYPH: Record<District, string> = {
	temple: "⛩",
	market: "▦",
	harbor: "⚓",
};

// A recognised-but-invalid classType value (never "not-applicable" — that
// case renders nothing at all) gets a glyph of its own, so "unresolved"
// never looks like "no class was checked".
const UNRESOLVED_GLYPH = "❓";

interface Props {
	classType: string | null | undefined;
	/** Scaffold level — this symbol's own, never a containing word's. Defaults to full support. */
	level?: ScaffoldLevel;
	className?: string;
}

export function DistrictBadge({ classType, level = "full", className }: Props) {
	const state = classCueState(classType);
	if (state === "not-applicable") return null;
	if (level === "none") return null;

	const opacity = districtOpacityForLevel(level);

	if (state === "unresolved") {
		return (
			<span
				role="img"
				aria-label="unresolved class district"
				data-district="unresolved"
				className={className}
				style={{ opacity }}
			>
				{UNRESOLVED_GLYPH}
			</span>
		);
	}

	const district = classDistrictForLevel(classType, level) as District;
	return (
		<span
			role="img"
			aria-label={`${district} district`}
			data-district={district}
			className={className}
			style={{ opacity }}
		>
			{DISTRICT_GLYPH[district]}
		</span>
	);
}
