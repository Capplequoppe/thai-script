// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createdAudioUrls } from "../../test-utils/renderWithApp";
import { SentenceSelfReviewCard } from "./SentenceSelfReviewCard";

function reveal() {
	fireEvent.click(screen.getByRole("button", { name: /Show Answer/ }));
}

describe("SentenceSelfReviewCard", () => {
	it("shows a readingComprehension sentence with word spaces stripped, then reveals the translation and self-rating", () => {
		const onRate = vi.fn();
		render(
			<SentenceSelfReviewCard
				card={{
					id: "sentence:basic-001:readingComprehension",
					property: "readingComprehension",
					question: "มา กิน กัน",
					correctAnswer: "Come eat together",
				}}
				onRate={onRate}
			/>,
		);

		expect(screen.getByText("มากินกัน")).toBeTruthy();
		expect(screen.queryByText("มา กิน กัน")).toBeNull();
		expect(screen.queryByText("Come eat together")).toBeNull();
		expect(screen.queryByRole("button", { name: /Good/ })).toBeNull();

		reveal();
		expect(screen.getByText("Come eat together")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: /Good/ }));
		expect(onRate).toHaveBeenCalledWith(4, expect.any(Number));
	});

	it("plays audio upfront for listeningComprehension and never shows the fixed instruction question as Thai text", () => {
		const onRate = vi.fn();
		render(
			<SentenceSelfReviewCard
				card={{
					id: "sentence:basic-001:listeningComprehension",
					property: "listeningComprehension",
					question: "Listen to the sentence. What does it mean?",
					correctAnswer: "Come eat together",
					audioUrl: "/audio/basic-001.mp3",
				}}
				onRate={onRate}
			/>,
		);

		expect(createdAudioUrls()).toContain("/audio/basic-001.mp3");
		expect(screen.queryByText("Come eat together")).toBeNull();

		reveal();
		expect(screen.getByText("Come eat together")).toBeTruthy();
	});

	it("collapses rating 2 (Wrong) and 4 (Good) correctly is left to the caller — this component only forwards the raw rating", () => {
		const onRate = vi.fn();
		render(
			<SentenceSelfReviewCard
				card={{
					id: "sentence:basic-001:readingComprehension",
					property: "readingComprehension",
					question: "มา กิน กัน",
					correctAnswer: "Come eat together",
				}}
				onRate={onRate}
			/>,
		);

		reveal();
		fireEvent.click(screen.getByRole("button", { name: /Wrong/ }));
		expect(onRate).toHaveBeenCalledWith(2, expect.any(Number));
	});
});
