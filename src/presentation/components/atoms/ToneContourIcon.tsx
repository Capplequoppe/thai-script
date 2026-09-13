// Pitch-contour shapes, not colors — color is already spoken for by
// consonant class (see consonantClassColor.ts), so a second arbitrary
// color-to-tone mapping would compete for the same visual channel. A
// contour is iconic instead: it looks like the pitch it represents, so
// there's nothing to memorize, and it scales to 5 categories better than
// color does (5 hues get hard to tell apart, especially for colorblind
// readers). Points are in a 0–24 x, 0–14 y box, y=0 is high pitch.
const TONE_CONTOUR_POINTS: Record<string, string> = {
	mid: "2,7 22,7",
	low: "2,11 22,11",
	high: "2,4 16,3 22,1",
	falling: "2,2 14,2 22,12",
	rising: "2,10 8,12 22,2",
};

interface Props {
	tone: string | null | undefined;
	className?: string;
	style?: React.CSSProperties;
}

export function ToneContourIcon({ tone, className, style }: Props) {
	const points = tone ? TONE_CONTOUR_POINTS[tone] : undefined;
	if (!points) return null;

	return (
		<svg
			viewBox="0 0 24 14"
			width="20"
			height="12"
			className={className}
			style={style}
			aria-hidden="true"
		>
			<polyline
				points={points}
				fill="none"
				stroke="currentColor"
				strokeWidth="2.2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
