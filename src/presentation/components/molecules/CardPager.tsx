import type { ReactNode } from "react";
import { useCallback } from "react";
import { useSwipeNavigation } from "../../hooks/useSwipeNavigation";

interface Props {
	/** 0-based position of the open item within its list. */
	index: number;
	total: number;
	/** Called with the new index. Never called out of range. */
	onNavigate: (index: number) => void;
	children: ReactNode;
}

/**
 * Wraps a detail card with prev/next paging over the list it came from —
 * swipe or ←/→ on the card, plus arrow buttons, because a swipe affordance
 * is invisible and the page is also used with a mouse.
 *
 * Paging clamps at both ends of the list it is given. Callers that group
 * their items (the Learned Items tabs) pass one group at a time, so paging
 * stays inside the category the learner is reviewing.
 */
export function CardPager({ index, total, onNavigate, children }: Props) {
	const atStart = index <= 0;
	const atEnd = index >= total - 1;

	const goPrev = useCallback(() => {
		if (index > 0) onNavigate(index - 1);
	}, [index, onNavigate]);

	const goNext = useCallback(() => {
		if (index < total - 1) onNavigate(index + 1);
	}, [index, total, onNavigate]);

	const swipe = useSwipeNavigation({
		onPrev: goPrev,
		onNext: goNext,
		enabled: total > 1,
	});

	return (
		<div className="space-y-3">
			{total > 1 && (
				<div className="flex items-center justify-between gap-3">
					<button
						type="button"
						onClick={goPrev}
						disabled={atStart}
						aria-label="Previous item"
						className="py-1.5 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
						style={{
							background: "var(--color-surface-2)",
							color: "var(--color-text)",
						}}
					>
						&larr;
					</button>
					<span
						className="text-sm tabular-nums"
						style={{ color: "var(--color-text-muted)" }}
					>
						{index + 1} / {total}
					</span>
					<button
						type="button"
						onClick={goNext}
						disabled={atEnd}
						aria-label="Next item"
						className="py-1.5 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-30"
						style={{
							background: "var(--color-surface-2)",
							color: "var(--color-text)",
						}}
					>
						&rarr;
					</button>
				</div>
			)}
			{/* Swipe target. The arrow buttons above are the keyboard/mouse path,
			    so this div carries no role of its own. */}
			<div {...swipe}>{children}</div>
		</div>
	);
}
