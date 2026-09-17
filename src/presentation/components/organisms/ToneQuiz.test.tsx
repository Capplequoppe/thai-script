// @vitest-environment jsdom
/**
 * A wrong tone answer holds the screen for five seconds before advancing.
 * These assert that the window now has the derivation in it — the rule, and
 * the lesson that teaches it — rather than only the right answer, which is
 * the one thing that cannot teach you how to reach it next time.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import vocabularyData from "../../../domain/vocabulary/data/vocabulary.json";
import { toneSyllablesOf } from "../../../domain/vocabulary/services/toneSyllables";
import type {
	VocabEntry,
	VocabularyCard,
} from "../../../domain/vocabulary/types";
import { ToneQuiz } from "./ToneQuiz";

// No `globals: true` and no `setupFiles`, so Testing-Library's auto-cleanup
// never registers — without this every render in this file stacks up in one
// DOM and `getByRole` starts finding the previous test's buttons.
afterEach(cleanup);

const corpus = vocabularyData as unknown as VocabEntry[];

/** A card shaped exactly as `VocabCardGenerator` writes one. */
function toneCardFor(thai: string): VocabularyCard {
	const entry = corpus.find((candidate) => candidate.thai === thai);
	if (!entry) throw new Error(`${thai} is not in the corpus`);
	const syllables = toneSyllablesOf(entry);
	if (syllables.length === 0) throw new Error(`${thai} has no askable tones`);
	return {
		id: `vocab:${thai}:toneIdentification`,
		promptWord: thai,
		property: "toneIdentification",
		question: "What is the tone of each syllable?",
		correctAnswer: syllables.map((s) => s.tone).join("|"),
		choices: [],
		syllables,
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

/** Low class under mai ek — one syllable, falling, and a rule worth naming. */
const MARKED = "ที่";

describe("ToneQuiz rule hints", () => {
	it("says nothing about the rule before the answer is checked", () => {
		render(<ToneQuiz card={toneCardFor(MARKED)} onAnswer={() => {}} />);
		expect(screen.queryByText(/lesson \d+/)).toBeNull();
	});

	it("names the rule and its lesson once the answer is revealed", () => {
		render(<ToneQuiz card={toneCardFor(MARKED)} onAnswer={() => {}} />);

		// Answer wrongly on purpose: this is the path that holds the screen.
		fireEvent.click(screen.getByRole("button", { name: "mid" }));
		fireEvent.click(screen.getByRole("button", { name: "Check" }));

		expect(screen.getByText(/mai ek/i)).toBeTruthy();
		expect(screen.getByText(/lesson \d+/)).toBeTruthy();
	});

	it("explains the rule that produces the tone actually stored on the card", () => {
		const card = toneCardFor(MARKED);
		render(<ToneQuiz card={card} onAnswer={() => {}} />);
		fireEvent.click(screen.getByRole("button", { name: "mid" }));
		fireEvent.click(screen.getByRole("button", { name: "Check" }));

		// Not an exception: the rule reproduces the stored tone, so the hint
		// asserts the derivation rather than disowning it.
		expect(screen.queryByText(/Exception\./)).toBeNull();
		expect(card.correctAnswer).toBe("falling");
	});
});
