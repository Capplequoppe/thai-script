// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useEffect, useLayoutEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useResetOnCardChange } from "./useResetOnCardChange";

// Every committed render, recorded from a layout effect — which React runs
// after the DOM is updated and before the browser paints. So this array is
// exactly the sequence of frames a viewer could see. A stale entry between the
// card change and the reset *is* the answer flashing on screen.
let committed: string[] = [];

beforeEach(() => {
	committed = [];
});

afterEach(cleanup);

function useCommitLog(revealed: boolean) {
	useLayoutEffect(() => {
		committed.push(revealed ? "answer" : "prompt");
	});
}

function RevealButton({ onReveal }: { onReveal: () => void }) {
	return (
		<button type="button" onClick={onReveal}>
			reveal
		</button>
	);
}

/** Resets during render — the fixed behaviour. */
function RenderReset({ cardId }: { cardId: string }) {
	const [revealed, setRevealed] = useState(false);
	useResetOnCardChange(cardId, () => setRevealed(false));
	useCommitLog(revealed);
	return <RevealButton onReveal={() => setRevealed(true)} />;
}

/** Resets in an effect — the behaviour that flashed the answer on iOS. */
function EffectReset({ cardId }: { cardId: string }) {
	const [revealed, setRevealed] = useState(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: mirrors the pre-fix code this test contrasts against
	useEffect(() => {
		setRevealed(false);
	}, [cardId]);
	useCommitLog(revealed);
	return <RevealButton onReveal={() => setRevealed(true)} />;
}

function reveal(view: ReturnType<typeof render>) {
	fireEvent.click(view.getByRole("button", { name: "reveal" }));
}

describe("useResetOnCardChange", () => {
	it("commits no frame carrying the previous card's revealed state", () => {
		const view = render(<RenderReset cardId="card-1" />);
		reveal(view);
		committed = [];

		view.rerender(<RenderReset cardId="card-2" />);

		expect(committed).toEqual(["prompt"]);
	});

	it("is not what an effect-based reset does", () => {
		// Guards the test itself: without this, the assertion above would pass
		// against the buggy implementation too and prove nothing. The leading
		// "answer" here is the frame iOS Safari was painting.
		const view = render(<EffectReset cardId="card-1" />);
		reveal(view);
		committed = [];

		view.rerender(<EffectReset cardId="card-2" />);

		expect(committed).toEqual(["answer", "prompt"]);
	});

	it("leaves state alone while the card id is unchanged", () => {
		const view = render(<RenderReset cardId="card-1" />);
		reveal(view);
		committed = [];

		view.rerender(<RenderReset cardId="card-1" />);

		expect(committed).toEqual(["answer"]);
	});
});
