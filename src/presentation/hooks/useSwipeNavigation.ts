import { useEffect, useMemo, useRef } from "react";

/** How far a finger must travel horizontally before it counts as a swipe
 *  rather than a tap or a slightly-off vertical scroll. */
const MIN_DISTANCE_PX = 50;

/** A swipe must be this many times more horizontal than vertical. Without
 *  the ratio guard, scrolling a long detail card with a slightly diagonal
 *  flick would page to the next item under the learner's thumb. */
const HORIZONTAL_RATIO = 1.5;

interface Options {
	/** Called on a right-swipe (finger moves →), i.e. "go back". */
	onPrev: () => void;
	/** Called on a left-swipe (finger moves ←), i.e. "go forward". */
	onNext: () => void;
	/** When false, no handler fires — for a detail view with nowhere to page. */
	enabled?: boolean;
}

/** Touch handlers to spread onto the element that should respond to swipes. */
export interface SwipeHandlers {
	onTouchStart: (e: React.TouchEvent) => void;
	onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Horizontal swipe (and ←/→ key) navigation between sibling items.
 *
 * Touch handlers are returned rather than bound to a ref so the caller
 * decides which subtree is swipeable; the keyboard half is a window listener
 * because there is nothing sensible to focus on a read-only detail card.
 *
 * Keystrokes are ignored while a text field has focus, so a page that shows
 * a search box alongside the detail view does not eat the caret keys.
 */
export function useSwipeNavigation({
	onPrev,
	onNext,
	enabled = true,
}: Options): SwipeHandlers {
	const start = useRef<{ x: number; y: number } | null>(null);

	// Read through a ref inside the key listener so the effect does not
	// re-subscribe on every render of the (usually inline) callbacks.
	const latest = useRef({ onPrev, onNext, enabled });
	latest.current = { onPrev, onNext, enabled };

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (!latest.current.enabled) return;
			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
			const target = e.target as HTMLElement | null;
			const tag = target?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
				return;
			}
			e.preventDefault();
			if (e.key === "ArrowLeft") latest.current.onPrev();
			else latest.current.onNext();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	return useMemo(
		() => ({
			onTouchStart: (e: React.TouchEvent) => {
				// A second finger means a pinch-zoom, not a swipe.
				if (e.touches.length !== 1) {
					start.current = null;
					return;
				}
				start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
			},
			onTouchEnd: (e: React.TouchEvent) => {
				const from = start.current;
				start.current = null;
				if (!from || !enabled) return;
				const touch = e.changedTouches[0];
				if (!touch) return;
				const dx = touch.clientX - from.x;
				const dy = touch.clientY - from.y;
				if (Math.abs(dx) < MIN_DISTANCE_PX) return;
				if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return;
				if (dx < 0) onNext();
				else onPrev();
			},
		}),
		[onPrev, onNext, enabled],
	);
}
