// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToneGameItem } from "../../../domain/game/types";
import { useMicRecorder } from "../../hooks/useMicRecorder";
import { useToneAttempt } from "../../hooks/useToneAttempt";
import { createdAudioUrls } from "../../test-utils/renderWithApp";
import { ToneIdentificationChallenge } from "./ToneIdentificationChallenge";

vi.mock("../../hooks/useMicRecorder");
vi.mock("../../hooks/useToneAttempt");

const mockUseMicRecorder = vi.mocked(useMicRecorder);
const mockUseToneAttempt = vi.mocked(useToneAttempt);

function mockMic(overrides: Partial<ReturnType<typeof useMicRecorder>> = {}) {
	mockUseMicRecorder.mockReturnValue({
		state: "idle",
		audioBlob: null,
		start: vi.fn(),
		stop: vi.fn(),
		reset: vi.fn(),
		...overrides,
	});
}

function mockAttempt(
	overrides: Partial<ReturnType<typeof useToneAttempt>> = {},
) {
	mockUseToneAttempt.mockReturnValue({
		status: "idle",
		result: null,
		analyze: vi.fn(),
		reset: vi.fn(),
		...overrides,
	});
}

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

beforeEach(() => {
	mockMic();
	mockAttempt();
});

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

	describe("recording practice", () => {
		it("offers a record button once revealed, only when the item has audio", () => {
			render(<ToneIdentificationChallenge item={makeItem()} onRate={vi.fn()} />);
			reveal();

			expect(screen.getByRole("button", { name: /Record/ })).toBeTruthy();
		});

		it("offers no recording section for an audio-less word", () => {
			render(
				<ToneIdentificationChallenge
					item={makeItem({ audioUrl: undefined })}
					onRate={vi.fn()}
				/>,
			);
			reveal();

			expect(screen.queryByText("Record yourself saying it")).toBeNull();
		});

		it("shows an analyzing state while the attempt is being scored", () => {
			mockAttempt({ status: "analyzing" });
			render(<ToneIdentificationChallenge item={makeItem()} onRate={vi.fn()} />);
			reveal();

			expect(screen.getByText("Analyzing…")).toBeTruthy();
		});

		it("shows the score, contour, and a way to record again once scored", () => {
			mockAttempt({
				status: "done",
				result: {
					referenceContour: [0, 1, 2],
					attemptContour: [0, 1, 1.5],
					score: 92,
					label: "excellent",
				},
			});
			render(<ToneIdentificationChallenge item={makeItem()} onRate={vi.fn()} />);
			reveal();

			expect(screen.getByText("Excellent match")).toBeTruthy();
			expect(screen.getByRole("button", { name: "Record again" })).toBeTruthy();
		});

		// Mic permission is out of the learner's control moment-to-moment —
		// rating the word they already saw and heard must stay reachable.
		it("keeps RatingButtons reachable when microphone access is denied", () => {
			mockMic({ state: "denied" });
			render(<ToneIdentificationChallenge item={makeItem()} onRate={vi.fn()} />);
			reveal();

			expect(
				screen.getByText("Microphone access is needed to try this."),
			).toBeTruthy();
			expect(screen.getByRole("button", { name: /Good/ })).toBeTruthy();
		});
	});
});
