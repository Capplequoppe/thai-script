interface LessonPathProps {
	totalLessons: number;
	completedLessons: Set<number>;
	nextAvailable: number | null;
	onLessonClick: (n: number) => void;
}

const NODE_R = 22;
const SPACING_X = 90;
const SPACING_Y = 72;
const COLS = 3;

export function LessonPath({
	totalLessons,
	completedLessons,
	nextAvailable,
	onLessonClick,
}: LessonPathProps) {
	const lessons = Array.from({ length: totalLessons }, (_, i) => i + 1);
	const numRows = Math.ceil(totalLessons / COLS);

	// Compute positions: lesson 1 = bottom-left, ascending
	// Row 0 = bottom row, row (numRows-1) = top row
	// Within each row, direction alternates: even rows go left-to-right, odd rows right-to-left
	const positions = lessons.map((n) => {
		const idx = n - 1;
		const row = Math.floor(idx / COLS);
		const posInRow = idx % COLS;
		const x =
			row % 2 === 0
				? posInRow * SPACING_X + NODE_R
				: (COLS - 1 - posInRow) * SPACING_X + NODE_R;
		// SVG y=0 is top, so we flip: bottom row has highest y value
		const y = (numRows - 1 - row) * SPACING_Y + NODE_R;
		return { n, x, y };
	});

	const svgWidth = (COLS - 1) * SPACING_X + NODE_R * 2;
	const svgHeight = numRows * SPACING_Y + NODE_R * 0.5;

	return (
		<svg
			viewBox={`0 0 ${svgWidth} ${svgHeight}`}
			className="w-full"
			style={{ maxHeight: "640px" }}
			role="img"
			aria-label="Lesson progress path"
		>
			{/* Path lines between consecutive lessons */}
			{positions.slice(0, -1).map(({ n, x, y }, i) => {
				const next = positions[i + 1];
				return (
					<line
						key={`line-${n}`}
						x1={x}
						y1={y}
						x2={next.x}
						y2={next.y}
						strokeDasharray="4 4"
						strokeLinecap="round"
						style={{ stroke: "var(--color-border)", strokeWidth: 2 }}
					/>
				);
			})}

			{/* Lesson nodes */}
			{positions.map(({ n, x, y }) => {
				const isCompleted = completedLessons.has(n);
				const isNext = n === nextAvailable;
				const isLocked = !isCompleted && !isNext;
				const isClickable = isCompleted || isNext;

				const fillColor = isCompleted
					? "var(--color-master)"
					: isNext
						? "var(--color-primary)"
						: "var(--color-surface-2)";
				const textColor = isLocked ? "var(--color-text-muted)" : "white";
				const strokeColor = isLocked ? "var(--color-border)" : "transparent";

				return (
					// biome-ignore lint/a11y/noStaticElementInteractions: SVG <g> uses role="button" with onKeyDown — no <button> exists in SVG
					<g
						key={n}
						transform={`translate(${x}, ${y})`}
						onClick={() => isClickable && onLessonClick(n)}
						onKeyDown={(e) => {
							if (isClickable && (e.key === "Enter" || e.key === " "))
								onLessonClick(n);
						}}
						tabIndex={isClickable ? 0 : undefined}
						style={{ cursor: isClickable ? "pointer" : "default" }}
						role={isClickable ? "button" : undefined}
						aria-label={
							isCompleted
								? `Lesson ${n} — completed`
								: isNext
									? `Lesson ${n} — start`
									: `Lesson ${n} — locked`
						}
					>
						{/* Pulse ring for next available */}
						{isNext && (
							<circle
								r={NODE_R + 6}
								style={{ fill: "var(--color-primary)", opacity: 0.15 }}
							>
								<animate
									attributeName="r"
									values={`${NODE_R + 4};${NODE_R + 9};${NODE_R + 4}`}
									dur="2.5s"
									repeatCount="indefinite"
								/>
								<animate
									attributeName="opacity"
									values="0.2;0.04;0.2"
									dur="2.5s"
									repeatCount="indefinite"
								/>
							</circle>
						)}

						{/* Main circle */}
						<circle
							r={NODE_R}
							style={{ fill: fillColor, stroke: strokeColor, strokeWidth: 1.5 }}
						/>

						{/* Icon or number */}
						{isCompleted ? (
							<>
								<text
									textAnchor="middle"
									dominantBaseline="central"
									dy="-4"
									fontSize="13"
									fontWeight="700"
									style={{ fill: textColor }}
								>
									✓
								</text>
								<text
									textAnchor="middle"
									dominantBaseline="central"
									dy="9"
									fontSize="10"
									style={{ fill: textColor, opacity: 0.8 }}
								>
									{n}
								</text>
							</>
						) : isLocked ? (
							<>
								<text
									textAnchor="middle"
									dominantBaseline="central"
									dy="-4"
									fontSize="12"
									style={{ fill: textColor }}
								>
									🔒
								</text>
								<text
									textAnchor="middle"
									dominantBaseline="central"
									dy="9"
									fontSize="10"
									style={{ fill: textColor }}
								>
									{n}
								</text>
							</>
						) : (
							<text
								textAnchor="middle"
								dominantBaseline="central"
								fontSize="14"
								fontWeight="700"
								style={{ fill: textColor }}
							>
								{n}
							</text>
						)}
					</g>
				);
			})}
		</svg>
	);
}
