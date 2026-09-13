import type { NormalizedContour } from "../../../domain/pronunciation/services/contourNormalize";

interface Props {
	referenceContour: NormalizedContour;
	attemptContour: NormalizedContour;
}

const WIDTH = 300;
const HEIGHT = 100;
const PADDING = 8;

function toPoints(
	contour: NormalizedContour,
	min: number,
	max: number,
): string {
	const span = max - min || 1;
	return contour
		.map((value, i) => {
			const x = (i / (contour.length - 1)) * (WIDTH - 2 * PADDING) + PADDING;
			const y =
				HEIGHT - PADDING - ((value - min) / span) * (HEIGHT - 2 * PADDING);
			return `${x},${y}`;
		})
		.join(" ");
}

/**
 * Two pitch contours (semitones relative to each recording's own median, see
 * `normalizeContour`) plotted on a shared vertical scale so their shapes —
 * not their absolute pitch — are what's visually compared.
 */
export function PitchContourOverlay({
	referenceContour,
	attemptContour,
}: Props) {
	const allValues = [...referenceContour, ...attemptContour];
	const min = Math.min(...allValues);
	const max = Math.max(...allValues);

	return (
		<div className="space-y-2">
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				className="w-full"
				role="img"
				aria-label="Pitch contour comparison"
			>
				<polyline
					points={toPoints(referenceContour, min, max)}
					fill="none"
					stroke="var(--color-text-muted)"
					strokeWidth={2}
					strokeDasharray="4 3"
				/>
				<polyline
					points={toPoints(attemptContour, min, max)}
					fill="none"
					stroke="var(--color-primary)"
					strokeWidth={2.5}
				/>
			</svg>
			<div
				className="flex items-center justify-center gap-4 text-xs"
				style={{ color: "var(--color-text-muted)" }}
			>
				<span className="flex items-center gap-1">
					<span
						className="inline-block w-3 h-0.5"
						style={{ background: "var(--color-text-muted)" }}
					/>
					Reference
				</span>
				<span className="flex items-center gap-1">
					<span
						className="inline-block w-3 h-0.5"
						style={{ background: "var(--color-primary)" }}
					/>
					You
				</span>
			</div>
		</div>
	);
}
