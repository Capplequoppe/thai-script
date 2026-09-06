// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
// Side-effect import: registers `afterEach(cleanup)` plus the localStorage/
// Audio/canvas stubs this repo's jsdom setup needs (see CONTEXT.md) — there
// is no `globals: true` / `setupFiles`, so nothing else does this.
import "../../test-utils/renderWithApp";
import { SentenceBuilder } from "./SentenceBuilder";

function makeCard(
	overrides: Partial<Parameters<typeof SentenceBuilder>[0]["card"]> = {},
) {
	return {
		id: "vocab:สวัสดี:spelling",
		question: 'Spell the Thai word for "hello"',
		correctAnswer: "สวัสดี",
		choices: ["ส", "ว", "ั", "ด", "ี", "ต", "ถ"],
		...overrides,
	};
}

function tap(char: string) {
	fireEvent.click(screen.getByRole("button", { name: char }));
}

describe("SentenceBuilder", () => {
	it("lets a repeated letter's single tile be tapped again for its second occurrence", async () => {
		const onAnswer = vi.fn();
		render(<SentenceBuilder card={makeCard()} onAnswer={onAnswer} />);

		// สวัสดี = ส, ว, ั, ส, ด, ี — "ส" occurs twice but only has one tile.
		tap("ส");
		tap("ว");
		tap("ั");
		tap("ส");
		tap("ด");
		tap("ี");

		fireEvent.click(screen.getByRole("button", { name: "Check" }));

		await waitFor(() =>
			expect(onAnswer).toHaveBeenCalledWith(true, expect.any(Number)),
		);
	});

	it("never disables a tile after tapping it, only once the answer is checked", () => {
		const onAnswer = vi.fn();
		render(<SentenceBuilder card={makeCard()} onAnswer={onAnswer} />);

		const sButton = screen.getByRole("button", { name: "ส" });
		fireEvent.click(sButton);
		expect(sButton.hasAttribute("disabled")).toBe(false);

		fireEvent.click(screen.getByRole("button", { name: "Check" }));
		expect(sButton.hasAttribute("disabled")).toBe(true);
	});
});
