// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SentenceGameItem } from "../../../domain/game/types";
import { createdAudioUrls } from "../../test-utils/renderWithApp";
import { SentenceListeningChallenge } from "./SentenceListeningChallenge";

const CANVAS_NAME = "Drawing area for writing Thai characters";

function makeItem(overrides: Partial<SentenceGameItem> = {}): SentenceGameItem {
	return {
		kind: "sentence",
		sentenceId: "basic-001",
		thaiText: "มา กิน กัน",
		englishMeaning: "Come eat together",
		audioUrl: "/audio/basic-001.mp3",
		challengeDirection: "listening",
		...overrides,
	};
}

function reveal() {
	fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
}

describe("SentenceListeningChallenge", () => {
	// AC2
	it("auto-plays the sentence audio on mount, offers no write-input, and reveals the Thai text and meaning", () => {
		render(<SentenceListeningChallenge item={makeItem()} onRate={vi.fn()} />);

		expect(createdAudioUrls()).toContain("/audio/basic-001.mp3");
		// No write-input of any kind: sentences are listening/speaking only.
		expect(screen.queryByRole("img", { name: CANVAS_NAME })).toBeNull();
		// The Thai text is the answer — hidden until reveal.
		expect(screen.queryByText("มา กิน กัน")).toBeNull();
		expect(screen.queryByText("Come eat together")).toBeNull();

		reveal();
		expect(screen.getByText("มา กิน กัน")).toBeTruthy();
		expect(screen.getByText("Come eat together")).toBeTruthy();
	});

	// AC2
	it("shows RatingButtons only after reveal", () => {
		render(<SentenceListeningChallenge item={makeItem()} onRate={vi.fn()} />);

		expect(screen.queryByRole("button", { name: /Good/ })).toBeNull();
		reveal();
		expect(screen.getByRole("button", { name: /Good/ })).toBeTruthy();
	});

	// AC2
	it("replays the same sentence audio from the replay button", () => {
		render(<SentenceListeningChallenge item={makeItem()} onRate={vi.fn()} />);

		fireEvent.click(screen.getByRole("button", { name: "Replay sentence" }));
		expect(
			createdAudioUrls().filter((url) => url === "/audio/basic-001.mp3"),
		).toHaveLength(2);
	});

	// AC9 — keyed on the item's identity, not `audioUrl`: two distinct items
	// deliberately share one audio file here.
	it("resets reveal and replays audio when the item changes, even with an identical audioUrl", () => {
		const shared = "/audio/shared.mp3";
		const first = makeItem({ sentenceId: "s-1", audioUrl: shared });
		const second = makeItem({
			sentenceId: "s-2",
			thaiText: "มี ดี",
			englishMeaning: "Have good (things)",
			audioUrl: shared,
		});
		const { rerender } = render(
			<SentenceListeningChallenge item={first} onRate={vi.fn()} />,
		);

		reveal();
		expect(screen.getByText("Come eat together")).toBeTruthy();
		expect(createdAudioUrls().filter((url) => url === shared)).toHaveLength(1);

		rerender(<SentenceListeningChallenge item={second} onRate={vi.fn()} />);

		expect(screen.queryByText("Come eat together")).toBeNull();
		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
		expect(createdAudioUrls().filter((url) => url === shared)).toHaveLength(2);
	});
});
