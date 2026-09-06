// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CompositionGameItem } from "../../../domain/game/types";
// Imported for its side effects: registers `afterEach(cleanup)` and the
// jsdom environment repairs every render test here relies on.
import "../../test-utils/renderWithApp";
import { SentenceCompositionChallenge } from "./SentenceCompositionChallenge";

function makeItem(
	overrides: Partial<CompositionGameItem> = {},
): CompositionGameItem {
	return {
		kind: "composition",
		grammarId: "svo-basic",
		englishMeaning: "He eats rice.",
		tiles: ["ข้าว", "เขา", "กิน"],
		correctOrder: ["เขา", "กิน", "ข้าว"],
		challengeDirection: "build",
		...overrides,
	};
}

function tile(word: string): HTMLButtonElement {
	return screen.getByRole("button", { name: word }) as HTMLButtonElement;
}

function reveal() {
	fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
}

describe("SentenceCompositionChallenge", () => {
	// AC1
	it("builds by tapping tiles with backspace and reveals the correct order with rating buttons only after", () => {
		render(<SentenceCompositionChallenge item={makeItem()} onRate={vi.fn()} />);

		// The English gloss is the prompt; every tile is a button.
		expect(screen.getByText("He eats rice.")).toBeTruthy();
		for (const word of ["ข้าว", "เขา", "กิน"]) {
			expect(tile(word)).toBeTruthy();
		}
		// Nothing of the answer, and no rating, before the reveal.
		expect(screen.queryByText("เขา กิน ข้าว")).toBeNull();
		expect(screen.queryByRole("button", { name: /Good/ })).toBeNull();

		// Tap two tiles: the built sentence grows in tap order and a used
		// tile can't be tapped twice.
		fireEvent.click(tile("เขา"));
		fireEvent.click(tile("กิน"));
		expect(screen.getByText("เขา กิน")).toBeTruthy();
		expect(tile("กิน").disabled).toBe(true);

		// Backspace frees exactly the last-tapped tile.
		fireEvent.click(screen.getByRole("button", { name: "Remove last word" }));
		expect(screen.queryByText("เขา กิน")).toBeNull();
		expect(tile("กิน").disabled).toBe(false);
		expect(tile("เขา").disabled).toBe(true);

		reveal();

		// The correct order and the gloss are both on screen, and only now
		// do the rating buttons appear.
		expect(screen.getByText("เขา กิน ข้าว")).toBeTruthy();
		expect(screen.getByText("He eats rice.")).toBeTruthy();
		expect(screen.getByRole("button", { name: /Good/ })).toBeTruthy();
	});

	// AC1 — self-rated, never auto-graded: a wrong arrangement reveals the
	// same answer with no verdict, and the learner's own rating is what is
	// passed through.
	it("auto-grades nothing: a wrong arrangement reveals without a verdict and the chosen rating passes through", () => {
		const onRate = vi.fn();
		render(<SentenceCompositionChallenge item={makeItem()} onRate={onRate} />);

		// Build a deliberately wrong order.
		fireEvent.click(tile("ข้าว"));
		fireEvent.click(tile("เขา"));
		fireEvent.click(tile("กิน"));
		reveal();

		// No incorrect/wrong verdict anywhere — just the correct order to
		// compare against, with the learner's attempt still visible.
		expect(screen.queryByText(/incorrect/i)).toBeNull();
		expect(screen.queryByText(/wrong answer/i)).toBeNull();
		expect(screen.getByText("ข้าว เขา กิน")).toBeTruthy();
		expect(screen.getByText("เขา กิน ข้าว")).toBeTruthy();

		expect(onRate).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: /Again/ }));
		expect(onRate).toHaveBeenCalledWith(1);
	});

	// AC8 — two consecutive items reuse this component instance without a
	// remount; the second must start clean.
	it("resets built tiles and reveal when the item changes", () => {
		const second = makeItem({
			grammarId: "question-mai",
			englishMeaning: "Do you eat rice?",
			tiles: ["ไหม", "คุณ", "กิน", "ข้าว"],
			correctOrder: ["คุณ", "กิน", "ข้าว", "ไหม"],
		});
		const { rerender } = render(
			<SentenceCompositionChallenge item={makeItem()} onRate={vi.fn()} />,
		);

		fireEvent.click(tile("เขา"));
		fireEvent.click(tile("กิน"));
		reveal();
		expect(screen.getByText("เขา กิน ข้าว")).toBeTruthy();

		rerender(<SentenceCompositionChallenge item={second} onRate={vi.fn()} />);

		// Unrevealed and unbuilt again — including the tiles the two items
		// share, which a leaked used-index would leave disabled.
		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Good/ })).toBeNull();
		expect(
			screen.getByText("Tap the word tiles below to build it"),
		).toBeTruthy();
		expect(screen.queryByText("เขา กิน")).toBeNull();
		expect(tile("กิน").disabled).toBe(false);
		expect(tile("ข้าว").disabled).toBe(false);
	});
});
