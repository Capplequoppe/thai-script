// @vitest-environment jsdom
/**
 * The game's analyzer, scheduled as a card.
 *
 * The thing worth pinning is that it stays *self-rated*: the pitch score is a
 * hint about how an attempt sounded, and wiring it to grade the card would
 * hand the SRS an opinion it cannot check. So the card must offer rating
 * buttons and must not auto-advance on a score.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VocabularyCard } from "../../../domain/vocabulary/types";
// Imported for its module-level hooks, not to render through it: they install
// `StubAudio` (jsdom's `play()` returns undefined, so the analyzer's
// `play().catch(...)` throws) and register the `cleanup` this harness has no
// `setupFiles` to provide.
import "../../test-utils/renderWithApp";
import { TonePronunciationCard } from "./TonePronunciationCard";

function speakingCardFor(thai: string): VocabularyCard {
	return {
		id: `vocab:${thai}:tonePronunciation`,
		promptWord: thai,
		property: "tonePronunciation",
		question: "Say this word, then check your tones",
		correctAnswer: "",
		choices: [],
		srs: {
			easeFactor: 2,
			interval: 10,
			repetitions: 0,
			learningStep: 1,
			nextReviewDate: "2026-01-01T00:00:00.000Z",
			lastReviewDate: null,
			lapseCount: 0,
		},
	} as unknown as VocabularyCard;
}

/**
 * In the corpus *with a recording* — the gate the generator applies, and not
 * a detail a fixture can hand-wave: ที่ is the obvious tone example but has no
 * clip, so no `tonePronunciation` card is ever made for it.
 */
const SPOKEN = "ได้";

describe("TonePronunciationCard", () => {
	it("shows the word and waits, rather than grading anything", () => {
		const onRate = vi.fn();
		render(
			<TonePronunciationCard card={speakingCardFor(SPOKEN)} onRate={onRate} />,
		);

		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
		expect(onRate).not.toHaveBeenCalled();
	});

	it("reveals the tones and asks the learner to rate themselves", () => {
		const onRate = vi.fn();
		render(
			<TonePronunciationCard card={speakingCardFor(SPOKEN)} onRate={onRate} />,
		);

		fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));

		expect(screen.getByText("falling")).toBeTruthy();
		// Self-rating is the whole design; a score never advances the card.
		expect(screen.getByText(/Tones, syllable by syllable/i)).toBeTruthy();
		expect(onRate).not.toHaveBeenCalled();
	});

	it("says so rather than rendering an empty analyzer when the recording is gone", () => {
		render(
			<TonePronunciationCard
				card={speakingCardFor("ไม่มีคำนี้")}
				onRate={() => {}}
			/>,
		);
		expect(screen.getByText(/recording is no longer available/i)).toBeTruthy();
	});
});
