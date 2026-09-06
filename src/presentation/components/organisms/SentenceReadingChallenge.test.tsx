// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SentenceGameItem } from "../../../domain/game/types";
import { createdAudioUrls } from "../../test-utils/renderWithApp";
import { SentenceReadingChallenge } from "./SentenceReadingChallenge";

function makeItem(overrides: Partial<SentenceGameItem> = {}): SentenceGameItem {
	return {
		kind: "sentence",
		sentenceId: "basic-001",
		thaiText: "มา กิน กัน",
		englishMeaning: "Come eat together",
		audioUrl: "/audio/basic-001.mp3",
		challengeDirection: "reading",
		...overrides,
	};
}

function reveal() {
	fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
}

describe("SentenceReadingChallenge", () => {
	// AC3
	it("shows the Thai text with no premature audio, then reveals via audio and meaning", () => {
		render(<SentenceReadingChallenge item={makeItem()} onRate={vi.fn()} />);

		expect(screen.getByText("มา กิน กัน")).toBeTruthy();
		// Hearing the sentence first would answer the challenge.
		expect(createdAudioUrls()).toHaveLength(0);
		expect(screen.queryByText("Come eat together")).toBeNull();

		reveal();
		expect(
			createdAudioUrls().filter((url) => url === "/audio/basic-001.mp3"),
		).toHaveLength(1);
		expect(screen.getByText("Come eat together")).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Replay sentence" }),
		).toBeTruthy();
	});

	// AC3 — the audio-less case is what every sentence in the shipped data
	// renders today, not a rare edge case (see CONTEXT.md).
	it("reveals meaning only for an audio-less item, constructing no Audio at all", () => {
		render(
			<SentenceReadingChallenge
				item={makeItem({ audioUrl: undefined })}
				onRate={vi.fn()}
			/>,
		);

		expect(screen.getByText("มา กิน กัน")).toBeTruthy();
		reveal();

		expect(screen.getByText("Come eat together")).toBeTruthy();
		expect(createdAudioUrls()).toHaveLength(0);
		expect(
			screen.queryByRole("button", { name: "Replay sentence" }),
		).toBeNull();
	});

	// AC3
	it("shows RatingButtons only after reveal", () => {
		render(<SentenceReadingChallenge item={makeItem()} onRate={vi.fn()} />);

		expect(screen.queryByRole("button", { name: /Good/ })).toBeNull();
		reveal();
		expect(screen.getByRole("button", { name: /Good/ })).toBeTruthy();
	});

	// AC9 — keyed on the item's identity, not `audioUrl`: two distinct items
	// deliberately share one audio file here.
	it("resets reveal when the item changes, even with an identical audioUrl", () => {
		const shared = "/audio/shared.mp3";
		const first = makeItem({ sentenceId: "s-1", audioUrl: shared });
		const second = makeItem({
			sentenceId: "s-2",
			thaiText: "มี ดี",
			englishMeaning: "Have good (things)",
			audioUrl: shared,
		});
		const { rerender } = render(
			<SentenceReadingChallenge item={first} onRate={vi.fn()} />,
		);

		reveal();
		expect(screen.getByText("Come eat together")).toBeTruthy();

		rerender(<SentenceReadingChallenge item={second} onRate={vi.fn()} />);

		expect(screen.getByText("มี ดี")).toBeTruthy();
		expect(screen.queryByText("Have good (things)")).toBeNull();
		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
	});
});
