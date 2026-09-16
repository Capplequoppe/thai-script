// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSwipeNavigation } from "./useSwipeNavigation";

// There is no `globals: true` / `setupFiles`, so Testing-Library's
// auto-cleanup never registers itself.
afterEach(cleanup);

function Swipeable({
	onPrev,
	onNext,
	enabled,
}: {
	onPrev: () => void;
	onNext: () => void;
	enabled?: boolean;
}) {
	const swipe = useSwipeNavigation({ onPrev, onNext, enabled });
	return (
		<div>
			{/* The surface under test: exactly the handlers the hook returns. */}
			<div data-testid="surface" {...swipe}>
				card
			</div>
			<input aria-label="search" />
		</div>
	);
}

/** A finger going from (`fromX`, `fromY`) to (`toX`, `toY`) and lifting. */
function swipe(
	el: HTMLElement,
	{
		fromX,
		fromY = 0,
		toX,
		toY = 0,
	}: { fromX: number; fromY?: number; toX: number; toY?: number },
) {
	fireEvent.touchStart(el, { touches: [{ clientX: fromX, clientY: fromY }] });
	fireEvent.touchEnd(el, {
		changedTouches: [{ clientX: toX, clientY: toY }],
	});
}

function setup(enabled?: boolean) {
	const onPrev = vi.fn();
	const onNext = vi.fn();
	render(<Swipeable onPrev={onPrev} onNext={onNext} enabled={enabled} />);
	return { onPrev, onNext, surface: screen.getByTestId("surface") };
}

describe("useSwipeNavigation", () => {
	it("treats a leftward swipe as next", () => {
		const { onNext, onPrev, surface } = setup();

		swipe(surface, { fromX: 200, toX: 60 });

		expect(onNext).toHaveBeenCalledTimes(1);
		expect(onPrev).not.toHaveBeenCalled();
	});

	it("treats a rightward swipe as previous", () => {
		const { onNext, onPrev, surface } = setup();

		swipe(surface, { fromX: 60, toX: 200 });

		expect(onPrev).toHaveBeenCalledTimes(1);
		expect(onNext).not.toHaveBeenCalled();
	});

	it("ignores a drag too short to be a deliberate swipe", () => {
		const { onNext, onPrev, surface } = setup();

		swipe(surface, { fromX: 200, toX: 170 });

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrev).not.toHaveBeenCalled();
	});

	// The detail cards scroll vertically; a slightly diagonal scroll flick
	// must not page the learner onto the next item.
	it("ignores a mostly-vertical drag", () => {
		const { onNext, onPrev, surface } = setup();

		swipe(surface, { fromX: 200, fromY: 400, toX: 130, toY: 40 });

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrev).not.toHaveBeenCalled();
	});

	it("ignores a two-finger gesture", () => {
		const { onNext, onPrev, surface } = setup();

		fireEvent.touchStart(surface, {
			touches: [
				{ clientX: 200, clientY: 0 },
				{ clientX: 220, clientY: 0 },
			],
		});
		fireEvent.touchEnd(surface, {
			changedTouches: [{ clientX: 60, clientY: 0 }],
		});

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrev).not.toHaveBeenCalled();
	});

	it("does nothing when disabled", () => {
		const { onNext, onPrev, surface } = setup(false);

		swipe(surface, { fromX: 200, toX: 60 });
		fireEvent.keyDown(window, { key: "ArrowRight" });

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrev).not.toHaveBeenCalled();
	});

	it("navigates with the arrow keys", () => {
		const { onNext, onPrev } = setup();

		fireEvent.keyDown(window, { key: "ArrowRight" });
		fireEvent.keyDown(window, { key: "ArrowLeft" });

		expect(onNext).toHaveBeenCalledTimes(1);
		expect(onPrev).toHaveBeenCalledTimes(1);
	});

	// The Dictionary's search box shares the page with the detail view.
	it("leaves the arrow keys alone while a text field has focus", () => {
		const { onNext, onPrev } = setup();

		const input = screen.getByLabelText("search");
		input.focus();
		fireEvent.keyDown(input, { key: "ArrowRight" });

		expect(onNext).not.toHaveBeenCalled();
		expect(onPrev).not.toHaveBeenCalled();
	});
});
