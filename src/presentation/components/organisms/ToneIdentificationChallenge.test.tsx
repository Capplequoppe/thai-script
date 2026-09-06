// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ToneGameItem } from "../../../domain/game/types";
import { createdAudioUrls } from "../../test-utils/renderWithApp";
import { ToneIdentificationChallenge } from "./ToneIdentificationChallenge";

function makeItem(overrides: Partial<ToneGameItem> = {}): ToneGameItem {
	return {
		kind: "tone",
		thaiWord: "สวัสดี",
		syllables: [
			{ text: "สะ", tone: "low" },
			{ text: "หวัด", tone: "low" },
			{ text: "ดี", tone: "mid" },
		],
		audioUrl: "/audio/สวัสดี.mp3",
		challengeDirection: "identification",
		...overrides,
	};
}

function reveal() {
	fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
}

describe("ToneIdentificationChallenge", () => {
	// AC1
	it("shows the Thai word and plays its audio together on mount, then reveals every syllable's tone", () => {
		render(<ToneIdentificationChallenge item={makeItem()} onRate={vi.fn()} />);

		// Text and audio are one prompt, not two directions.
		expect(screen.getByText("สวัสดี")).toBeTruthy();
		expect(
			createdAudioUrls().filter((url) => url === "/audio/สวัสดี.mp3"),
		).toHaveLength(1);
		expect(screen.getByRole("button", { name: "Replay word" })).toBeTruthy();

		// Nothing of the answer before the reveal.
		expect(screen.queryByText("สะ")).toBeNull();
		expect(screen.queryByRole("button", { name: /Good/ })).toBeNull();

		reveal();

		for (const syllable of ["สะ", "หวัด", "ดี"]) {
			expect(screen.getByText(syllable)).toBeTruthy();
		}
		expect(screen.getAllByText("low")).toHaveLength(2);
		expect(screen.getByText("mid")).toBeTruthy();
		expect(screen.getByRole("button", { name: /Good/ })).toBeTruthy();
	});

	// AC1 — a tone is spoken, never written: no write-input at any point.
	it("presents no write-input before or after the reveal", () => {
		render(<ToneIdentificationChallenge item={makeItem()} onRate={vi.fn()} />);

		expect(screen.queryByRole("textbox")).toBeNull();
		expect(document.querySelector("canvas")).toBeNull();
		reveal();
		expect(screen.queryByRole("textbox")).toBeNull();
		expect(document.querySelector("canvas")).toBeNull();
	});

	// AC2 — a large share of the shipped vocabulary carries no audio file.
	it("constructs no Audio at all for a word with no audioUrl", () => {
		render(
			<ToneIdentificationChallenge
				item={makeItem({ audioUrl: undefined })}
				onRate={vi.fn()}
			/>,
		);

		expect(createdAudioUrls()).toHaveLength(0);
		expect(screen.queryByRole("button", { name: "Replay word" })).toBeNull();

		reveal();
		expect(createdAudioUrls()).toHaveLength(0);
		expect(screen.getByText("mid")).toBeTruthy();
	});

	// AC9 — keyed on the item's identity, not `audioUrl`: two distinct items
	// deliberately share one audio file here.
	it("resets reveal and replays audio when the item changes with an identical audioUrl", () => {
		const shared = "/audio/shared-word.mp3";
		const first = makeItem({ audioUrl: shared });
		const second = makeItem({
			thaiWord: "นี้",
			syllables: [{ text: "นี้", tone: "high" }],
			audioUrl: shared,
		});
		const { rerender } = render(
			<ToneIdentificationChallenge item={first} onRate={vi.fn()} />,
		);

		reveal();
		expect(screen.getByText("mid")).toBeTruthy();
		expect(createdAudioUrls().filter((url) => url === shared)).toHaveLength(1);

		rerender(<ToneIdentificationChallenge item={second} onRate={vi.fn()} />);

		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
		expect(screen.queryByText("mid")).toBeNull();
		expect(createdAudioUrls().filter((url) => url === shared)).toHaveLength(2);

		reveal();
		expect(screen.getByText("high")).toBeTruthy();
	});
});
