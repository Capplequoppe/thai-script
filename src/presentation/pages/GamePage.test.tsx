// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import type { GameHistoryEntry } from "../../domain/game/types";
import { InMemoryJsonStore } from "../../infrastructure/persistence/JsonStore";
import { AppProvider } from "../context/AppContext";
import {
	CorruptJsonStore,
	canvas2d,
	createdAudioUrls,
	getFakeLocalStorage,
	makeFixedRoundGame,
	makeGame,
	makeHistoryEntry,
	makeSymbolItem,
	renderWithApp,
} from "../test-utils/renderWithApp";
import { Dashboard } from "./Dashboard";
import { GamePage } from "./GamePage";

const CANVAS_NAME = "Drawing area for writing Thai characters";

function reveal() {
	fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
}

function rate(label: RegExp) {
	fireEvent.click(screen.getByRole("button", { name: label }));
}

function setCount(value: string) {
	fireEvent.change(screen.getByLabelText("Items per round"), {
		target: { value },
	});
}

function startRound() {
	fireEvent.click(screen.getByRole("button", { name: "Start Round" }));
}

/** A raw `PropertyCard` DTO as it sits inside the persisted SRS blob. */
function scriptCardDTO(character: string) {
	return {
		id: `${character}-recognition`,
		question: `What sound does ${character} make?`,
		correctAnswer: "answer",
		choices: ["answer", "other"],
		srs: {
			easeFactor: 2,
			interval: 10,
			repetitions: 0,
			learningStep: 1,
			nextReviewDate: "2026-01-01T00:00:00.000Z",
			lastReviewDate: null,
			lapseCount: 0,
		},
		symbolCharacter: character,
		property: "recognition",
		lessonNumber: 1,
	};
}

describe("GamePage", () => {
	// AC1
	it("presents exactly the configured number of item screens before the summary", () => {
		renderWithApp(<GamePage />, {}, { symbols: ["ม", "น", "ง", "ย", "ว"] });
		setCount("3");
		startRound();

		let screensTraversed = 0;
		while (
			screen.queryByText("Round Complete") === null &&
			screensTraversed < 10
		) {
			expect(screen.getByText(`${screensTraversed + 1} / 3`)).toBeTruthy();
			reveal();
			rate(/Good/);
			screensTraversed += 1;
		}

		expect(screensTraversed).toBe(3);
		expect(screen.getByText("Round Complete")).toBeTruthy();
	});

	// AC2
	it("renders dictation with audio before reveal and reading with audio only after reveal", () => {
		const dictation = makeSymbolItem("ม", "dictation", {
			audioUrl: "/audio/mo-ma.mp3",
			correctAnswer: "maaw maa",
		});
		const reading = makeSymbolItem("น", "reading", {
			audioUrl: "/audio/no-nu.mp3",
			correctAnswer: "naaw nuu",
		});
		const { game } = makeFixedRoundGame([dictation, reading]);
		renderWithApp(<GamePage />, { game });
		startRound();

		// Dictation: prompt audio is constructed up front, canvas is offered.
		expect(createdAudioUrls()).toContain("/audio/mo-ma.mp3");
		expect(screen.getByRole("img", { name: CANVAS_NAME })).toBeTruthy();
		reveal();
		expect(screen.getByText("maaw maa")).toBeTruthy();
		rate(/Good/);

		// Reading: no audio constructed before its reveal...
		expect(screen.getByText("น")).toBeTruthy();
		expect(createdAudioUrls()).not.toContain("/audio/no-nu.mp3");
		reveal();
		// ...exactly one constructed by the reveal.
		expect(
			createdAudioUrls().filter((url) => url === "/audio/no-nu.mp3"),
		).toHaveLength(1);
		expect(screen.getByText("naaw nuu")).toBeTruthy();
	});

	// AC2 (input-mode half)
	it("dictation in paper mode renders no canvas and taps through to the reveal", () => {
		const { game } = makeFixedRoundGame([makeSymbolItem("ม", "dictation")]);
		renderWithApp(<GamePage />, { game });
		fireEvent.click(screen.getByLabelText("Write on paper"));
		startRound();

		expect(screen.queryByRole("img", { name: CANVAS_NAME })).toBeNull();
		reveal();
		expect(screen.getByRole("button", { name: /Good/ })).toBeTruthy();
	});

	// AC3
	it("shows rating buttons only after reveal and advances on rating", () => {
		const { game } = makeFixedRoundGame([
			makeSymbolItem("ม", "dictation"),
			makeSymbolItem("น", "dictation"),
		]);
		renderWithApp(<GamePage />, { game });
		startRound();

		expect(screen.getByText("1 / 2")).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Again/ })).toBeNull();
		reveal();
		expect(screen.getByRole("button", { name: /Again/ })).toBeTruthy();
		rate(/Good/);

		expect(screen.getByText("2 / 2")).toBeTruthy();
		reveal();
		rate(/Easy/);
		expect(screen.getByText("Round Complete")).toBeTruthy();
	});

	// AC4 — the plan's end-to-end SRS-isolation proof, deliberately NOT using
	// renderWithApp: the real AppProvider (module-level singletons and all)
	// is the wiring a hand-built context double would bypass.
	it("leaves the whole thai-srs-state blob byte-identical after a full round through the real AppProvider", () => {
		const seeded = JSON.stringify({
			completedLessons: [1],
			currentLesson: 2,
			cards: {
				"ม-recognition": scriptCardDTO("ม"),
				"น-recognition": scriptCardDTO("น"),
				"ง-recognition": scriptCardDTO("ง"),
			},
			vocabCards: {},
			grammarCards: {},
			sentenceCards: {},
			// Streak/achievement material lives in these fields — the whole
			// blob must survive, not just card schedules.
			sessionHistory: [
				{
					sessionId: "s-1",
					completedAt: "2026-09-01T10:00:00.000Z",
					type: "review",
					durationMs: 60000,
					totalCards: 5,
					correctCount: 4,
					incorrectCount: 1,
					accuracy: 80,
					newCardsGraduated: 1,
				},
			],
			achievements: ["first-lesson"],
		});
		getFakeLocalStorage().setItem("thai-srs-state", seeded);

		render(
			<AppProvider>
				<MemoryRouter initialEntries={["/game"]}>
					<Routes>
						<Route path="/game" element={<GamePage />} />
					</Routes>
				</MemoryRouter>
			</AppProvider>,
		);

		setCount("3");
		startRound();
		for (const rating of [/Again/, /Good/, /Easy/]) {
			reveal();
			rate(rating);
		}
		expect(screen.getByText("Round Complete")).toBeTruthy();

		// The round itself persisted — to its own key...
		expect(
			getFakeLocalStorage().getItem("thai-srs-game-history"),
		).not.toBeNull();
		// ...while the whole SRS blob is byte-identical.
		expect(getFakeLocalStorage().getItem("thai-srs-state")).toBe(seeded);
	});

	// AC5
	it("renders never-played history as its own message", () => {
		renderWithApp(<GamePage />, {}, { symbols: ["ม"] });
		expect(screen.getByText("No games played yet.")).toBeTruthy();
		expect(screen.queryByText(/history is unavailable/i)).toBeNull();
	});

	// AC5
	it("renders stored history entries as a populated list", () => {
		const historyStore = new InMemoryJsonStore<GameHistoryEntry[]>();
		historyStore.save([makeHistoryEntry({ id: "e1", itemCount: 4 })]);
		const game = makeGame({ symbols: ["ม"], historyStore });
		renderWithApp(<GamePage />, { game });

		expect(screen.getByText("Symbols · 4 items")).toBeTruthy();
		expect(screen.getByText("75%")).toBeTruthy();
		expect(screen.queryByText("No games played yet.")).toBeNull();
		expect(screen.queryByText(/history is unavailable/i)).toBeNull();
	});

	// AC5
	it("renders a corrupt history read as unavailable, never as never-played", () => {
		const game = makeGame({
			symbols: ["ม"],
			historyStore: new CorruptJsonStore<GameHistoryEntry[]>(),
		});
		renderWithApp(<GamePage />, { game });

		expect(screen.getByText(/history is unavailable/i)).toBeTruthy();
		expect(screen.queryByText("No games played yet.")).toBeNull();
	});

	// AC6
	it("keeps start unavailable and explains when no symbols are eligible", () => {
		renderWithApp(<GamePage />);
		expect(screen.getByText(/No symbols to practice yet/)).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Start Round" })).toBeNull();
	});

	// AC7 — two consecutive same-direction items keep the same component
	// instance (same element type, same position, no key), so React's default
	// reconciliation does not remount: the organism's own id-keyed effect
	// must do the resetting.
	it("resets reveal and canvas across two consecutive dictation items", () => {
		const first = makeSymbolItem("ม", "dictation", {
			audioUrl: "/audio/first.mp3",
		});
		const second = makeSymbolItem("น", "dictation", {
			audioUrl: "/audio/second.mp3",
		});
		const { game } = makeFixedRoundGame([first, second]);
		renderWithApp(<GamePage />, { game });
		startRound();

		reveal();
		expect(screen.getByRole("button", { name: /Again/ })).toBeTruthy();
		canvas2d.clearRect.mockClear();
		rate(/Good/);

		// Second dictation item: unrevealed again, canvas cleared, and the
		// id-keyed effect re-ran (its prompt audio was constructed).
		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Again/ })).toBeNull();
		expect(canvas2d.clearRect).toHaveBeenCalled();
		expect(createdAudioUrls()).toContain("/audio/second.mp3");
	});

	// AC7
	it("resets reveal across two consecutive reading items", () => {
		const { game } = makeFixedRoundGame([
			makeSymbolItem("ม", "reading"),
			makeSymbolItem("น", "reading"),
		]);
		renderWithApp(<GamePage />, { game });
		startRound();

		reveal();
		expect(screen.getByRole("button", { name: /Again/ })).toBeTruthy();
		rate(/Good/);

		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Again/ })).toBeNull();
	});

	// AC8
	it("keeps start unavailable for zero, negative, and non-integer item counts", () => {
		renderWithApp(<GamePage />, {}, { symbols: ["ม", "น", "ง"] });
		const start = screen.getByRole("button", {
			name: "Start Round",
		}) as HTMLButtonElement;

		for (const bad of ["0", "-2", "2.5", "", "99"]) {
			setCount(bad);
			expect(start.disabled).toBe(true);
		}

		setCount("2");
		expect(start.disabled).toBe(false);
	});

	// AC9 — jsdom's default (no md: desktop viewport) is exactly the mobile
	// case: the Dashboard card must be reachable without the desktop nav.
	it("dashboard shows a game quick-action card that navigates to /game", () => {
		renderWithApp(
			<Routes>
				<Route path="/" element={<Dashboard />} />
				<Route path="/game" element={<GamePage />} />
			</Routes>,
		);

		expect(screen.getByText("Game")).toBeTruthy();
		fireEvent.click(screen.getByText("Practice round"));
		expect(screen.getByText("Practice Game")).toBeTruthy();
	});

	// AC10
	it("abandoning a round persists nothing and the next round starts clean", () => {
		const { game, historyStore } = makeFixedRoundGame([
			makeSymbolItem("ม", "reading"),
			makeSymbolItem("น", "reading"),
		]);
		renderWithApp(
			<Routes>
				<Route
					path="/"
					element={
						<div>
							Dashboard home
							<Link to="/game">back to game</Link>
						</div>
					}
				/>
				<Route path="/game" element={<GamePage />} />
			</Routes>,
			{ game },
			{ route: "/game" },
		);

		// Start (default count 2), rate one item, abandon mid-round.
		startRound();
		reveal();
		rate(/Again/);
		fireEvent.click(screen.getByRole("button", { name: "End round" }));
		expect(screen.getByText("Dashboard home")).toBeTruthy();
		expect(historyStore.load()).toEqual({ status: "empty" });

		// Returning shows setup, with no history entry from the abandoned round.
		fireEvent.click(screen.getByText("back to game"));
		expect(screen.getByText("Practice Game")).toBeTruthy();
		expect(screen.getByText("No games played yet.")).toBeTruthy();

		// A fresh round tallies only its own ratings.
		startRound();
		reveal();
		rate(/Good/);
		reveal();
		rate(/Good/);
		expect(screen.getByText("2 of 2 items rated")).toBeTruthy();
		expect(screen.getByText("100%")).toBeTruthy();
		expect(screen.getByText("Again").parentElement?.textContent).toBe("0Again");

		const persisted = historyStore.load();
		expect(persisted.status).toBe("ok");
		if (persisted.status === "ok") {
			expect(persisted.value).toHaveLength(1);
		}
	});

	// AC11
	it("labels the count input and input-mode toggle and keeps them keyboard-operable", () => {
		renderWithApp(<GamePage />, {}, { symbols: ["ม", "น"] });

		const count = screen.getByLabelText("Items per round") as HTMLInputElement;
		count.focus();
		expect(document.activeElement).toBe(count);
		fireEvent.change(count, { target: { value: "1" } });
		expect(count.value).toBe("1");

		const draw = screen.getByLabelText("Draw on canvas") as HTMLInputElement;
		const paper = screen.getByLabelText("Write on paper") as HTMLInputElement;
		expect(draw.checked).toBe(true);
		paper.focus();
		expect(document.activeElement).toBe(paper);
		// jsdom cannot synthesize the browser's Space-key default action on a
		// focused radio; activating the focused element is its stand-in.
		fireEvent.click(paper);
		expect(paper.checked).toBe(true);
		expect(draw.checked).toBe(false);
	});
});
