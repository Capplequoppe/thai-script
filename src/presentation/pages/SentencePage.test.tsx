// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createdAudioUrls, renderWithApp } from "../test-utils/renderWithApp";
import { SentencePage } from "./SentencePage";

describe("SentencePage — lesson intro audio", () => {
	// basic-001's words (["มา","กิน","กัน"]) are the exact set that unlocks it —
	// see SentenceLessonService.getUnlockedSentences, which requires every
	// word in a sentence to already be learned. Graduating just these three
	// also unlocks basic-003 (a subset, "มา"/"กัน"), so the lesson batch here
	// is real, unlocked data — not a hand-built fixture.
	it("shows a working play-pronunciation button for a real sentence with wired audio", () => {
		renderWithApp(
			<SentencePage />,
			{},
			{
				graduatedVocab: ["มา", "กิน", "กัน"],
			},
		);

		fireEvent.click(
			screen.getByRole("button", { name: /Learn \d+ New Sentences?/ }),
		);

		// basic-001 ("มา กิน กัน") is first by difficulty/id order.
		expect(screen.getByText("มา กิน กัน")).toBeTruthy();
		const playButton = screen.getByRole("button", {
			name: "Play pronunciation",
		});

		fireEvent.click(playButton);

		expect(createdAudioUrls()).toContain(
			"/thai-script/audio/sentence-maa-gin-gan.mp3",
		);
	});
});
