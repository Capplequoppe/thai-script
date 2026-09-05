// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WordGameItem } from "../../../domain/game/types";
import { createdAudioUrls } from "../../test-utils/renderWithApp";
import { WordDictationChallenge } from "./WordDictationChallenge";

const CANVAS_NAME = "Drawing area for writing Thai characters";

function makeItem(overrides: Partial<WordGameItem> = {}): WordGameItem {
	return {
		kind: "word",
		thaiWord: "แมว",
		englishMeaning: "cat",
		audioUrl: "/audio/maew.mp3",
		challengeDirection: "dictationTranslate",
		...overrides,
	};
}

function reveal() {
	fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
}

describe("WordDictationChallenge", () => {
	// AC1
	it("auto-plays the item's own audio on mount, offers a write-input, and reveals the spelling and meaning", () => {
		const item = makeItem();
		render(
			<WordDictationChallenge item={item} inputMode="draw" onRate={vi.fn()} />,
		);

		expect(createdAudioUrls()).toContain("/audio/maew.mp3");
		expect(screen.getByRole("img", { name: CANVAS_NAME })).toBeTruthy();

		reveal();
		expect(screen.getByText("แมว")).toBeTruthy();
		expect(screen.getByText("cat")).toBeTruthy();
	});

	// AC3
	it("renders no canvas in paper mode", () => {
		const item = makeItem();
		render(
			<WordDictationChallenge item={item} inputMode="paper" onRate={vi.fn()} />,
		);

		expect(screen.queryByRole("img", { name: CANVAS_NAME })).toBeNull();
		reveal();
		expect(screen.getByText("แมว")).toBeTruthy();
	});

	// AC4
	it("does not construct an Audio for an item with no audioUrl", () => {
		const item = makeItem({ audioUrl: undefined });
		render(
			<WordDictationChallenge item={item} inputMode="draw" onRate={vi.fn()} />,
		);

		expect(createdAudioUrls()).toHaveLength(0);
		expect(() => reveal()).not.toThrow();
	});

	// AC5
	it("shows RatingButtons only after reveal", () => {
		const item = makeItem();
		render(
			<WordDictationChallenge item={item} inputMode="draw" onRate={vi.fn()} />,
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
			<WordDictationChallenge item={first} inputMode="draw" onRate={vi.fn()} />,
		);

		reveal();
		expect(screen.getByText("cat")).toBeTruthy();

		rerender(
			<WordDictationChallenge
				item={second}
				inputMode="draw"
				onRate={vi.fn()}
			/>,
		);

		expect(screen.queryByText("cat")).toBeNull();
		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
		expect(createdAudioUrls()).toContain(second.audioUrl);
	});
});
