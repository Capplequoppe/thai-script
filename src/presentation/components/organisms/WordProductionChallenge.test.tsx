// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WordGameItem } from "../../../domain/game/types";
import { createdAudioUrls } from "../../test-utils/renderWithApp";
import { WordProductionChallenge } from "./WordProductionChallenge";

const CANVAS_NAME = "Drawing area for writing Thai characters";

function makeItem(overrides: Partial<WordGameItem> = {}): WordGameItem {
	return {
		kind: "word",
		thaiWord: "แมว",
		englishMeaning: "cat",
		audioUrl: "/audio/maew.mp3",
		challengeDirection: "production",
		...overrides,
	};
}

function reveal() {
	fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
}

describe("WordProductionChallenge", () => {
	// AC2
	it("shows the English word first with no audio autoplay, offers a write-input, and reveals the spelling", () => {
		const item = makeItem();
		render(
			<WordProductionChallenge item={item} inputMode="draw" onRate={vi.fn()} />,
		);

		expect(screen.getByText("cat")).toBeTruthy();
		expect(createdAudioUrls()).not.toContain("/audio/maew.mp3");
		expect(screen.getByRole("img", { name: CANVAS_NAME })).toBeTruthy();

		reveal();
		expect(screen.getByText("แมว")).toBeTruthy();
	});

	// AC3
	it("renders no canvas in paper mode", () => {
		const item = makeItem();
		render(
			<WordProductionChallenge
				item={item}
				inputMode="paper"
				onRate={vi.fn()}
			/>,
		);

		expect(screen.queryByRole("img", { name: CANVAS_NAME })).toBeNull();
		reveal();
		expect(screen.getByText("แมว")).toBeTruthy();
	});

	// AC4
	it("does not construct an Audio for an item with no audioUrl", () => {
		const item = makeItem({ audioUrl: undefined });
		render(
			<WordProductionChallenge item={item} inputMode="draw" onRate={vi.fn()} />,
		);

		reveal();
		expect(createdAudioUrls()).toHaveLength(0);
		expect(
			screen.queryByRole("button", { name: "Replay pronunciation" }),
		).toBeNull();
	});

	// AC5
	it("shows RatingButtons only after reveal", () => {
		const item = makeItem();
		render(
			<WordProductionChallenge item={item} inputMode="draw" onRate={vi.fn()} />,
		);

		expect(screen.queryByRole("button", { name: /Good/ })).toBeNull();
		reveal();
		expect(screen.getByRole("button", { name: /Good/ })).toBeTruthy();
	});

	// AC6
	it("resets revealed/canvas state when the current item changes", () => {
		const first = makeItem({ thaiWord: "แมว", englishMeaning: "cat" });
		const second = makeItem({ thaiWord: "หมา", englishMeaning: "dog" });
		const { rerender } = render(
			<WordProductionChallenge
				item={first}
				inputMode="draw"
				onRate={vi.fn()}
			/>,
		);

		reveal();
		expect(screen.getByText("แมว")).toBeTruthy();

		rerender(
			<WordProductionChallenge
				item={second}
				inputMode="draw"
				onRate={vi.fn()}
			/>,
		);

		expect(screen.queryByText("แมว")).toBeNull();
		expect(screen.getByText("dog")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
	});
});
