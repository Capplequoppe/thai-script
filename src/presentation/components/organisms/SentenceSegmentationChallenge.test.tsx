// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SentenceGameItem } from "../../../domain/game/types";
// Imported for its side effects: registers `afterEach(cleanup)` and the
// jsdom environment repairs every render test here relies on.
import "../../test-utils/renderWithApp";
import { SentenceSegmentationChallenge } from "./SentenceSegmentationChallenge";

function makeItem(overrides: Partial<SentenceGameItem> = {}): SentenceGameItem {
	return {
		kind: "sentence",
		sentenceId: "basic-001",
		thaiText: "มา กิน กัน",
		englishMeaning: "Come eat together",
		challengeDirection: "segmentation",
		...overrides,
	};
}

// The concatenated puzzle ("มากินกัน") splits into 8 codepoints — see the
// component's own doc comment on why plain `[...text]` iteration is used.
// Gaps are 1-indexed in their accessible name (the gap after the Nth
// character), matching the component's own `index + 1` labeling.
function gap(afterCharacterNumber: number): HTMLButtonElement {
	return screen.getByRole("button", {
		name: new RegExp(`word break after character ${afterCharacterNumber}$`),
	}) as HTMLButtonElement;
}

function reveal() {
	fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
}

describe("SentenceSegmentationChallenge", () => {
	it("shows the sentence with no visible word gaps, lets the learner toggle boundaries, and reveals the correct split only after", () => {
		render(
			<SentenceSegmentationChallenge item={makeItem()} onRate={vi.fn()} />,
		);

		// Nothing of the answer, and no rating, before the reveal.
		expect(screen.queryByText("Come eat together")).toBeNull();
		expect(screen.queryByRole("button", { name: /Good/ })).toBeNull();

		// The real word boundaries are after the 2nd and 5th characters
		// ("มา" | "กิน" | "กัน") — untapped gaps start unmarked.
		expect(gap(2).getAttribute("aria-pressed")).toBe("false");
		expect(gap(5).getAttribute("aria-pressed")).toBe("false");

		// Tapping a gap toggles it; tapping again undoes it.
		fireEvent.click(gap(2));
		expect(gap(2).getAttribute("aria-pressed")).toBe("true");
		fireEvent.click(gap(2));
		expect(gap(2).getAttribute("aria-pressed")).toBe("false");

		fireEvent.click(gap(2));
		fireEvent.click(gap(5));

		reveal();

		// The correctly split words and the gloss are both on screen, and
		// only now do the rating buttons appear.
		expect(screen.getByText("มา")).toBeTruthy();
		expect(screen.getByText("กิน")).toBeTruthy();
		expect(screen.getByText("กัน")).toBeTruthy();
		expect(screen.getByText("Come eat together")).toBeTruthy();
		expect(screen.getByRole("button", { name: /Good/ })).toBeTruthy();

		// No incorrect/wrong verdict anywhere, whether or not the learner's
		// own taps matched the real split — matching every other organism in
		// this feature (see the component's own doc comment).
		expect(screen.queryByText(/incorrect/i)).toBeNull();
		expect(screen.queryByText(/wrong answer/i)).toBeNull();
	});

	it("auto-grades nothing: the learner's own rating is what is passed through, regardless of their taps", () => {
		const onRate = vi.fn();
		render(<SentenceSegmentationChallenge item={makeItem()} onRate={onRate} />);

		// Tap a gap that is NOT a real word boundary.
		fireEvent.click(gap(3));
		reveal();

		expect(onRate).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: /Again/ }));
		expect(onRate).toHaveBeenCalledWith(1);
	});

	// Two consecutive items reuse this component instance without a remount;
	// the second must start clean.
	it("resets tapped boundaries and reveal when the item changes", () => {
		const second = makeItem({
			sentenceId: "basic-003",
			thaiText: "มา กัน",
			englishMeaning: "Come together",
		});
		const { rerender } = render(
			<SentenceSegmentationChallenge item={makeItem()} onRate={vi.fn()} />,
		);

		fireEvent.click(gap(2));
		reveal();
		expect(screen.getByRole("button", { name: /Good/ })).toBeTruthy();

		rerender(<SentenceSegmentationChallenge item={second} onRate={vi.fn()} />);

		// Unrevealed and untapped again.
		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Good/ })).toBeNull();
		expect(gap(2).getAttribute("aria-pressed")).toBe("false");
	});
});
