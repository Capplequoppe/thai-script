// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import {
	MIN_GRAMMAR_POINTS,
	MIN_VOCAB_COUNT,
} from "../../domain/conversation/services/ConversationUnlockService";
import type { AppContextValue } from "../context/AppContext";
import {
	type MakeAppValueOptions,
	makeAppValue,
	renderWithApp,
} from "../test-utils/renderWithApp";
import { LearnPage } from "./LearnPage";

/**
 * Renders the hub with a `/*` catch-all alongside it, so a lane's navigation
 * lands somewhere observable — asserting on the destination is the whole
 * point of these tests, and `LearnPage` itself renders nothing about where
 * it sent you.
 */
function renderLearn(
	overrides: Partial<AppContextValue> = {},
	seed: MakeAppValueOptions = {},
) {
	return renderWithApp(
		<Routes>
			<Route path="/learn" element={<LearnPage />} />
			<Route path="/grammar" element={<div>grammar page</div>} />
			<Route path="/sentences" element={<div>sentences page</div>} />
			<Route path="/vocabulary" element={<div>vocabulary page</div>} />
			<Route path="/game" element={<div>game page</div>} />
			<Route path="/conversation" element={<div>conversation page</div>} />
			<Route path="/review" element={<div>review page</div>} />
		</Routes>,
		overrides,
		{ route: "/learn", ...seed },
	);
}

/**
 * A real `lesson` use-case with a few reads overridden. `Object.create`
 * rather than a spread because `StartLessonUseCase` is a class instance —
 * a spread would drop every method that isn't overridden. It has no hard
 * (`#`) private fields, so delegation through the prototype chain resolves
 * its services correctly.
 */
function lessonReporting(
	patch: Partial<AppContextValue["lesson"]>,
): AppContextValue["lesson"] {
	const real = makeAppValue().value.lesson;
	return Object.assign(Object.create(real) as AppContextValue["lesson"], patch);
}

/** The lane row for `label`, found via its heading text. */
function lane(label: string): HTMLButtonElement {
	const el = screen.getByText(label).closest("button");
	if (!el) throw new Error(`no lane row for ${label}`);
	return el as HTMLButtonElement;
}

describe("LearnPage", () => {
	it("lists every practice entry point, locked or not", () => {
		renderLearn();

		for (const label of [
			"Script",
			"Vocabulary",
			"Grammar",
			"Sentences",
			"Conversation Practice",
			"Game",
		]) {
			expect(screen.getByText(label)).toBeTruthy();
		}
	});

	// The reachability guarantee that used to live on the tab bar. Before the
	// hub, an unlocked Grammar/Sentences pool with no NEW content was
	// mobile-unreachable: the tab bar carried it, but the Dashboard's "Ready
	// to Learn" only renders a pool when a next lesson exists. Now the hub
	// always carries it, so `getNext*` returning null must not gate the lane.
	it("reaches Grammar when it is unlocked but has no new content", () => {
		renderLearn({
			lesson: lessonReporting({
				getGrammarUnlockedCount: () => 12,
				getGrammarLearnedCount: () => 12,
				getNextGrammar: () => null,
			}),
		});

		fireEvent.click(lane("Grammar"));
		expect(screen.getByText("grammar page")).toBeTruthy();
	});

	it("reaches Sentences when it is unlocked but has no new content", () => {
		renderLearn({
			lesson: lessonReporting({
				getSentenceUnlockedCount: () => 8,
				getSentenceLearnedCount: () => 8,
				getNextSentence: () => null,
			}),
		});

		fireEvent.click(lane("Sentences"));
		expect(screen.getByText("sentences page")).toBeTruthy();
	});

	// Game was reachable only from the desktop-only nav link and a Dashboard
	// tile; the hub is what puts it on a phone.
	it("reaches the Game", () => {
		renderLearn();

		fireEvent.click(lane("Game"));
		expect(screen.getByText("game page")).toBeTruthy();
	});

	it("names the gap instead of saying a bare 'locked' for conversation", () => {
		renderLearn();

		expect(screen.getByText(`0/${MIN_VOCAB_COUNT} words learned`)).toBeTruthy();
		expect(lane("Conversation Practice").disabled).toBe(true);
	});

	it("names the grammar gap once the vocabulary threshold is met", () => {
		renderLearn({
			vocab: {
				...makeAppValue().value.vocab,
				getLearnedCount: () => MIN_VOCAB_COUNT,
			} as AppContextValue["vocab"],
			lesson: lessonReporting({ getGrammarLearnedCount: () => 0 }),
		});

		expect(
			screen.getByText(`0/${MIN_GRAMMAR_POINTS} grammar points learned`),
		).toBeTruthy();
	});

	it("disables a locked lane rather than navigating from it", () => {
		renderLearn();

		const conversation = lane("Conversation Practice");
		fireEvent.click(conversation);

		expect(screen.queryByText("conversation page")).toBeNull();
	});

	it("offers no review button when nothing is due", () => {
		renderLearn();

		expect(screen.queryByText(/Review \d+ Due Card/)).toBeNull();
	});

	it("leads with a review button counting every pool's due cards", () => {
		renderLearn({}, { symbols: ["ม", "น"] });

		const button = screen.getByText(/Review \d+ Due Card/);
		fireEvent.click(button);
		expect(screen.getByText("review page")).toBeTruthy();
	});

	it("tells a fresh learner why vocabulary is locked", () => {
		renderLearn();

		expect(
			screen.getByText("Complete script lessons to unlock words"),
		).toBeTruthy();
	});
});
