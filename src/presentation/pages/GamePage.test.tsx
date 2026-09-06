// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { PlayGameUseCase } from "../../application/use-cases/PlayGameUseCase";
import { GameItemSelectionService } from "../../domain/game/services/GameItemSelectionService";
import { SentenceGameItemSource } from "../../domain/game/services/SentenceGameItemSource";
import { SymbolGameItemSource } from "../../domain/game/services/SymbolGameItemSource";
import { WordGameItemSource } from "../../domain/game/services/WordGameItemSource";
import {
	WEAK_STRONG_FRESH_CARDS,
	WEAK_SYMBOL,
} from "../../domain/game/test-fixtures/weakStrongFixture";
import type {
	GameHistoryEntry,
	GameItem,
	SentenceChallengeDirection,
	SentenceItemContent,
	ToneItemContent,
	WordChallengeDirection,
	WordItemContent,
} from "../../domain/game/types";
import sentenceData from "../../domain/sentence/data/sentences.json";
import type { SentenceEntry } from "../../domain/sentence/types";
import { SrsSchedule } from "../../domain/srs/value-objects/SrsSchedule";
import vocabularyData from "../../domain/vocabulary/data/vocabulary.json";
import { VocabCard } from "../../domain/vocabulary/entities/VocabCard";
import type { VocabEntry } from "../../domain/vocabulary/types";
import { InMemoryJsonStore } from "../../infrastructure/persistence/JsonStore";
import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../infrastructure/persistence/StorageCardRepository";
import { StorageGameHistoryRepository } from "../../infrastructure/persistence/StorageGameHistoryRepository";
import { AppProvider } from "../context/AppContext";
import {
	CorruptJsonStore,
	canvas2d,
	createdAudioUrls,
	getFakeLocalStorage,
	makeFixedRoundGame,
	makeGame,
	makeHistoryEntry,
	makeScriptCard,
	makeSentenceCard,
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

/** A raw `VocabCard` DTO as it sits inside the persisted SRS blob. */
function vocabCardDTO(thai: string, property = "thaiToEnglish") {
	return {
		id: `vocab:${thai}:${property}`,
		question: `What does ${thai} mean?`,
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
		promptWord: thai,
		property,
	};
}

/** A raw `SentenceReviewCard` DTO as it sits inside the persisted SRS blob. */
function sentenceCardDTO(sentenceId: string) {
	return {
		id: `sentence:${sentenceId}:readingComprehension`,
		question: `question for ${sentenceId}`,
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
		sentenceId,
		property: "readingComprehension",
	};
}

/** A `SentenceGameItem` with a pre-assigned direction, for fixed-round tests. */
function makeSentenceItem(
	sentenceId: string,
	challengeDirection: SentenceChallengeDirection,
	overrides: Partial<Omit<SentenceItemContent, "kind">> = {},
): GameItem {
	return {
		kind: "sentence",
		sentenceId,
		thaiText: `thai ${sentenceId}`,
		englishMeaning: `${sentenceId} meaning`,
		audioUrl: `/audio/${sentenceId}.mp3`,
		...overrides,
		challengeDirection,
	};
}

/** A `WordGameItem` with a pre-assigned direction, for fixed-round tests. */
function makeWordItem(
	thaiWord: string,
	challengeDirection: WordChallengeDirection,
	overrides: Partial<Omit<WordItemContent, "kind">> = {},
): GameItem {
	return {
		kind: "word",
		thaiWord,
		englishMeaning: `${thaiWord} meaning`,
		audioUrl: `/audio/${thaiWord}.mp3`,
		...overrides,
		challengeDirection,
	};
}

/**
 * A `ToneGameItem`, for fixed-round tests. Tone items have one direction
 * by design, so there is nothing to pass for it.
 */
function makeToneItem(
	thaiWord: string,
	overrides: Partial<Omit<ToneItemContent, "kind">> = {},
): GameItem {
	return {
		kind: "tone",
		thaiWord,
		syllables: [{ text: thaiWord, tone: "falling" }],
		audioUrl: `/audio/${thaiWord}.mp3`,
		...overrides,
		challengeDirection: "identification",
	};
}

/** An in-memory `VocabCard`, for a `WordGameItemSource`'s eligibility. */
function vocabCard(thai: string, property = "thaiToEnglish"): VocabCard {
	return new VocabCard(
		`vocab:${thai}:${property}`,
		"question",
		"answer",
		["answer"],
		SrsSchedule.initial(),
		thai,
		property,
	);
}

/**
 * A real `PlayGameUseCase` wired over all three pools — `makeAppValue` in
 * `renderWithApp.tsx` registers every production source too, but only seeds
 * script/sentence cards, so a round needing eligible vocab words builds its
 * own card repository here.
 */
function makeMixGame(
	symbolChars: readonly string[],
	vocabThaiWords: readonly string[],
	sentenceIds: readonly string[] = [],
): { game: PlayGameUseCase } {
	const cardRepo = new StorageCardRepository(new InMemoryStorage());
	cardRepo.saveAll(symbolChars.map(makeScriptCard));
	cardRepo.saveAll(vocabThaiWords.map((thai) => vocabCard(thai)));
	cardRepo.saveAll(sentenceIds.map(makeSentenceCard));
	const game = new PlayGameUseCase(
		new GameItemSelectionService([
			new SymbolGameItemSource(cardRepo),
			new WordGameItemSource(cardRepo, vocabularyData as VocabEntry[]),
			new SentenceGameItemSource(
				cardRepo,
				sentenceData as unknown as SentenceEntry[],
			),
		]),
		new StorageGameHistoryRepository(
			new InMemoryJsonStore<GameHistoryEntry[]>(),
		),
	);
	return { game };
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
	it("keeps start unavailable and explains when the default-checked pool has nothing eligible", () => {
		renderWithApp(<GamePage />);
		expect(
			screen.getByText(/Nothing to practice yet in the selected pools/),
		).toBeTruthy();
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

	// Task 2.3 AC1
	it("Words: renders every item through a word organism", () => {
		const dictation = makeWordItem("แมว", "dictationTranslate", {
			englishMeaning: "cat",
		});
		const production = makeWordItem("หมา", "production", {
			englishMeaning: "dog",
		});
		const { game } = makeFixedRoundGame([dictation, production]);
		renderWithApp(<GamePage />, { game });
		fireEvent.click(screen.getByLabelText("Symbols"));
		fireEvent.click(screen.getByLabelText("Words"));
		startRound();

		// dictationTranslate: prompt audio plays, meaning stays hidden until reveal.
		expect(createdAudioUrls()).toContain("/audio/แมว.mp3");
		expect(screen.queryByText("cat")).toBeNull();
		reveal();
		expect(screen.getByText("แมว")).toBeTruthy();
		expect(screen.getByText("cat")).toBeTruthy();
		rate(/Good/);

		// production: the English meaning is the prompt, shown up front.
		expect(screen.getByText("dog")).toBeTruthy();
		reveal();
		expect(screen.getByText("หมา")).toBeTruthy();
		rate(/Good/);

		expect(screen.getByText("Round Complete")).toBeTruthy();
	});

	// Task 2.3 AC2 — "mix" is no longer its own option: checking Words while
	// Symbols stays checked is the mix.
	it("Mix: dispatches each item to its correct organism by kind and direction", () => {
		const symbolItem = makeSymbolItem("ม", "reading");
		const wordItem = makeWordItem("แมว", "production", {
			englishMeaning: "cat",
		});
		const { game } = makeFixedRoundGame([symbolItem, wordItem]);
		renderWithApp(<GamePage />, { game });
		fireEvent.click(screen.getByLabelText("Words"));
		startRound();

		// First item: a symbol reading challenge.
		expect(screen.getByText("Say this symbol aloud")).toBeTruthy();
		expect(screen.getByText("ม")).toBeTruthy();
		reveal();
		expect(screen.getByText("ม name")).toBeTruthy();
		rate(/Good/);

		// Second item: a word production challenge.
		expect(screen.getByText("cat")).toBeTruthy();
		reveal();
		expect(screen.getByText("แมว")).toBeTruthy();
		rate(/Good/);

		expect(screen.getByText("Round Complete")).toBeTruthy();
	});

	// Task 2.3 AC3
	it("keeps start unavailable and explains it for any checked set with nothing eligible", () => {
		renderWithApp(<GamePage />);

		// Words alone.
		fireEvent.click(screen.getByLabelText("Symbols"));
		fireEvent.click(screen.getByLabelText("Words"));
		expect(
			screen.getByText(/Nothing to practice yet in the selected pools/),
		).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Start Round" })).toBeNull();

		// Symbols + Words together, still nothing eligible anywhere.
		fireEvent.click(screen.getByLabelText("Symbols"));
		expect(
			screen.getByText(/Nothing to practice yet in the selected pools/),
		).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Start Round" })).toBeNull();
	});

	// Task 2.3 AC4 — extends task 1.4's AC4 proof (script cards only) to the
	// vocab cards this phase introduces, through the real AppProvider.
	it("leaves the whole thai-srs-state blob byte-identical after a full Words round through the real AppProvider", () => {
		const seeded = JSON.stringify({
			completedLessons: [1],
			currentLesson: 2,
			cards: {},
			vocabCards: {
				"vocab:ที่:thaiToEnglish": vocabCardDTO("ที่"),
				"vocab:ได้:thaiToEnglish": vocabCardDTO("ได้"),
			},
			grammarCards: {},
			sentenceCards: {},
			sessionHistory: [],
			achievements: [],
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

		fireEvent.click(screen.getByLabelText("Symbols"));
		fireEvent.click(screen.getByLabelText("Words"));
		setCount("2");
		startRound();
		for (const rating of [/Again/, /Good/]) {
			reveal();
			rate(rating);
		}
		expect(screen.getByText("Round Complete")).toBeTruthy();

		expect(
			getFakeLocalStorage().getItem("thai-srs-game-history"),
		).not.toBeNull();
		expect(getFakeLocalStorage().getItem("thai-srs-state")).toBe(seeded);
	});

	// Task 2.3 AC4 — the Mix half of the same proof.
	it("leaves the whole thai-srs-state blob byte-identical after a full Mix round through the real AppProvider", () => {
		const seeded = JSON.stringify({
			completedLessons: [1],
			currentLesson: 2,
			cards: {
				"ม-recognition": scriptCardDTO("ม"),
				"น-recognition": scriptCardDTO("น"),
			},
			vocabCards: {
				"vocab:ที่:thaiToEnglish": vocabCardDTO("ที่"),
			},
			grammarCards: {},
			sentenceCards: {},
			sessionHistory: [],
			achievements: [],
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

		fireEvent.click(screen.getByLabelText("Words"));
		setCount("3");
		startRound();

		let screensTraversed = 0;
		while (
			screen.queryByText("Round Complete") === null &&
			screensTraversed < 10
		) {
			reveal();
			rate(/Good/);
			screensTraversed += 1;
		}
		expect(screensTraversed).toBe(3);
		expect(screen.getByText("Round Complete")).toBeTruthy();

		expect(
			getFakeLocalStorage().getItem("thai-srs-game-history"),
		).not.toBeNull();
		expect(getFakeLocalStorage().getItem("thai-srs-state")).toBe(seeded);
	});

	// Task 2.3 AC5
	it("records which pools a finished round used, distinguishably in history", () => {
		const { game } = makeFixedRoundGame([makeWordItem("แมว", "production")]);
		renderWithApp(<GamePage />, { game });

		// Words alone.
		fireEvent.click(screen.getByLabelText("Symbols"));
		fireEvent.click(screen.getByLabelText("Words"));
		startRound();
		reveal();
		rate(/Good/);
		expect(screen.getByText("Round Complete")).toBeTruthy();

		// Symbols back on: a Symbols + Words round.
		fireEvent.click(screen.getByRole("button", { name: "Play Again" }));
		fireEvent.click(screen.getByLabelText("Symbols"));
		startRound();
		reveal();
		rate(/Good/);
		expect(screen.getByText("Round Complete")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Play Again" }));
		expect(screen.getByText("Words · 1 items")).toBeTruthy();
		expect(screen.getByText("Symbols + Words · 1 items")).toBeTruthy();
	});

	// Task 2.3 AC6
	it("renders a legacy history entry with no pools field using a fallback label, never 'undefined'", () => {
		const historyStore = new InMemoryJsonStore<GameHistoryEntry[]>();
		const legacyEntry = {
			id: "legacy-1",
			playedAt: "2026-08-01T10:00:00.000Z",
			itemCount: 5,
			summary: {
				ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 3, 5: 2 },
				ratedCount: 5,
				accuracy: 100,
			},
			// `pools` is absent — this shape predates task 1.1's field.
		} as unknown as GameHistoryEntry;
		historyStore.save([legacyEntry]);
		const game = makeGame({ symbols: ["ม"], historyStore });
		renderWithApp(<GamePage />, { game });

		expect(screen.getByText("Symbols · 5 items")).toBeTruthy();
		expect(screen.queryByText(/undefined/i)).toBeNull();
	});

	// Task 2.3 AC7 / task 1.3 AC6 — only Symbols is checked by default.
	it("defaults the pool selection to Symbols alone", () => {
		renderWithApp(<GamePage />, {}, { symbols: ["ม"] });

		expect((screen.getByLabelText("Symbols") as HTMLInputElement).checked).toBe(
			true,
		);
		expect((screen.getByLabelText("Words") as HTMLInputElement).checked).toBe(
			false,
		);
		expect(
			(screen.getByLabelText("Sentence Reading") as HTMLInputElement).checked,
		).toBe(false);
	});

	// Task 2.3 AC8
	it("fills a Mix round from both pools when one pool alone can't supply the requested count", () => {
		// 4 symbols, 4 words, requesting 6: neither pool alone can supply 6, so
		// the round is mathematically guaranteed to include at least 2 of each
		// kind — a deterministic guarantee, not a statistical near-miss (see
		// task 2.1's own "deterministic mixed-pool draw" test for the same
		// reasoning). A fixture sized so one pool alone already meets the
		// requested count (e.g. 10 symbols for a 10-item round) would let this
		// test pass even if Mix silently ignored the other pool entirely.
		const symbolChars = ["ม", "น", "ง", "ย"];
		const vocabWords = ["ที่", "ได้", "จะ", "นี้"];
		const { game } = makeMixGame(symbolChars, vocabWords);
		renderWithApp(<GamePage />, { game });
		fireEvent.click(screen.getByLabelText("Words"));
		setCount("6");
		startRound();

		let screensTraversed = 0;
		let sawSymbol = false;
		let sawWord = false;
		while (
			screen.queryByText("Round Complete") === null &&
			screensTraversed < 15
		) {
			reveal();
			if (symbolChars.some((c) => screen.queryByText(c) !== null)) {
				sawSymbol = true;
			}
			if (vocabWords.some((w) => screen.queryByText(w) !== null)) {
				sawWord = true;
			}
			rate(/Good/);
			screensTraversed += 1;
		}
		expect(screensTraversed).toBe(6);
		expect(screen.getByText("Round Complete")).toBeTruthy();
		expect(sawSymbol).toBe(true);
		expect(sawWord).toBe(true);
	});

	// Task 2.3 AC9 / task 1.3 AC8 — the radio group's mutual exclusion is
	// gone by design: pool checkboxes are independent, and checking one must
	// never uncheck another.
	it("labels each pool checkbox accessibly and keeps them independently keyboard-operable", () => {
		renderWithApp(<GamePage />, {}, { symbols: ["ม"] });

		const symbolsBox = screen.getByLabelText("Symbols") as HTMLInputElement;
		const wordsBox = screen.getByLabelText("Words") as HTMLInputElement;
		const sentencesBox = screen.getByLabelText(
			"Sentence Reading",
		) as HTMLInputElement;
		expect(symbolsBox.type).toBe("checkbox");
		expect(wordsBox.type).toBe("checkbox");
		expect(sentencesBox.type).toBe("checkbox");

		wordsBox.focus();
		expect(document.activeElement).toBe(wordsBox);
		// jsdom cannot synthesize the browser's Space-key default action on a
		// focused checkbox; activating the focused element is its stand-in.
		fireEvent.click(wordsBox);
		expect(wordsBox.checked).toBe(true);
		expect(symbolsBox.checked).toBe(true);

		sentencesBox.focus();
		expect(document.activeElement).toBe(sentencesBox);
		fireEvent.click(sentencesBox);
		expect(sentencesBox.checked).toBe(true);
		expect(wordsBox.checked).toBe(true);
		expect(symbolsBox.checked).toBe(true);

		fireEvent.click(symbolsBox);
		expect(symbolsBox.checked).toBe(false);
		expect(wordsBox.checked).toBe(true);
		expect(sentencesBox.checked).toBe(true);
	});

	// Task 3.2 AC1
	it("checkbox is unchecked by default, and the resulting round matches the plain unweighted draw for the same seed", () => {
		const cardRepo = new StorageCardRepository(new InMemoryStorage());
		cardRepo.saveAll([...WEAK_STRONG_FRESH_CARDS]);
		const game = new PlayGameUseCase(
			new GameItemSelectionService(
				[new SymbolGameItemSource(cardRepo)],
				cardRepo,
			),
			new StorageGameHistoryRepository(
				new InMemoryJsonStore<GameHistoryEntry[]>(),
			),
		);
		// task 1.1/2.1's own unweighted algorithm, called directly with no
		// `cardRepository` at all (so it *cannot* weight) — the expected
		// output for this seed, not a value hand-picked to make this test
		// pass.
		const [expectedItem] = new GameItemSelectionService([
			new SymbolGameItemSource(cardRepo),
		]).selectRound({ pools: ["script"], itemCount: 1 }, () => 0.75);
		if (!expectedItem || expectedItem.kind !== "symbol") {
			throw new Error("expected a single symbol item from the fixture");
		}

		renderWithApp(<GamePage />, { game });

		const toggle = screen.getByLabelText(
			"Prioritize weak items",
		) as HTMLInputElement;
		expect(toggle.checked).toBe(false);

		// The page's own selection service *does* have a `cardRepository`
		// (production wiring passes one unconditionally) — proving that an
		// unchecked toggle still disables weighting end to end, not merely
		// that the service behaves when no repository was ever supplied.
		const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.75);
		try {
			setCount("1");
			startRound();

			expect(screen.getByText(expectedItem.symbolCharacter)).toBeTruthy();
		} finally {
			randomSpy.mockRestore();
		}
	});

	// Task 3.2 AC2
	it("with toggle checked, a round uses weighted item selection matching task 3.1's expectation", () => {
		const cardRepo = new StorageCardRepository(new InMemoryStorage());
		cardRepo.saveAll([...WEAK_STRONG_FRESH_CARDS]);
		const game = new PlayGameUseCase(
			new GameItemSelectionService(
				[new SymbolGameItemSource(cardRepo)],
				cardRepo,
			),
			new StorageGameHistoryRepository(
				new InMemoryJsonStore<GameHistoryEntry[]>(),
			),
		);
		renderWithApp(<GamePage />, { game });

		// Check the toggle
		const toggle = screen.getByLabelText(
			"Prioritize weak items",
		) as HTMLInputElement;
		fireEvent.click(toggle);
		expect(toggle.checked).toBe(true);

		// With weighting on and the weighted seed (roll 0.5), the draw always
		// lands on the weak item first, regardless of draw order.
		// This is the exact same fixture and seed as task 3.1's AC4.
		const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
		try {
			setCount("1");
			startRound();

			// The weak symbol should appear — with the seeded fixture and 0.5 roll,
			// weighted selection always picks the weak item (see itemWeight.test.ts).
			const weakItem = screen.getByText(WEAK_SYMBOL);
			expect(weakItem).toBeTruthy();
		} finally {
			randomSpy.mockRestore();
		}
	});

	// Task 3.2 AC3
	it("toggle and zero-eligible-pool interaction: start stays blocked regardless of toggle state", () => {
		// Symbols has one eligible item (so the toggle actually exists to
		// flip); Words has none — the interaction this AC names is that
		// having switched the toggle on does not rescue a pool with nothing
		// eligible in it.
		renderWithApp(<GamePage />, {}, { symbols: ["ม"] });

		fireEvent.click(screen.getByLabelText("Prioritize weak items"));
		expect(
			(screen.getByLabelText("Prioritize weak items") as HTMLInputElement)
				.checked,
		).toBe(true);

		fireEvent.click(screen.getByLabelText("Words"));
		fireEvent.click(screen.getByLabelText("Symbols"));

		expect(
			screen.getByText(/Nothing to practice yet in the selected pools/),
		).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Start Round" })).toBeNull();
		// The whole setup form (toggle included) is hidden once nothing is
		// eligible — there is no rendered toggle left to have "rescued" start.
		expect(screen.queryByLabelText("Prioritize weak items")).toBeNull();

		// And re-checking Symbols confirms the earlier toggle wasn't lost,
		// silently undone, or somehow left in a state that unblocks start on
		// its own.
		fireEvent.click(screen.getByLabelText("Symbols"));
		expect(
			(screen.getByLabelText("Prioritize weak items") as HTMLInputElement)
				.checked,
		).toBe(true);
		expect(screen.getByRole("button", { name: "Start Round" })).toBeTruthy();
	});

	// Task 3.2 AC4
	it("prioritize-weak-items checkbox is accessibly labeled and keyboard-operable", () => {
		renderWithApp(<GamePage />, {}, { symbols: ["ม"] });

		const toggle = screen.getByLabelText(
			"Prioritize weak items",
		) as HTMLInputElement;
		expect(toggle.type).toBe("checkbox");
		expect(toggle.checked).toBe(false);

		toggle.focus();
		expect(document.activeElement).toBe(toggle);

		fireEvent.click(toggle);
		expect(toggle.checked).toBe(true);

		fireEvent.click(toggle);
		expect(toggle.checked).toBe(false);
	});

	// Task 1.3 AC1 — Words has four eligible items in the repository, so a
	// broken pool filter would both inflate the eligible count and let word
	// items into the draw; requesting everything eligible from the two
	// checked pools makes both halves deterministic, not statistical.
	it("draws only from Symbols and Sentence Reading when Words is left unchecked", () => {
		const symbolChars = ["ม", "น"];
		const vocabWords = ["ที่", "ได้", "จะ", "นี้"];
		const { game } = makeMixGame(symbolChars, vocabWords, [
			"basic-001",
			"basic-002",
		]);
		renderWithApp(<GamePage />, { game });
		fireEvent.click(screen.getByLabelText("Sentence Reading"));

		// 2 symbols + 2 sentences — Words' four items are not counted.
		expect(
			(screen.getByLabelText("Items per round") as HTMLInputElement).max,
		).toBe("4");

		setCount("4");
		startRound();

		let screensTraversed = 0;
		let sawSymbol = false;
		let sawSentence = false;
		while (
			screen.queryByText("Round Complete") === null &&
			screensTraversed < 10
		) {
			reveal();
			if (symbolChars.some((c) => screen.queryByText(c) !== null)) {
				sawSymbol = true;
			}
			if (screen.queryByText("Read this sentence aloud") !== null) {
				sawSentence = true;
			}
			for (const word of vocabWords) {
				expect(screen.queryByText(word)).toBeNull();
			}
			rate(/Good/);
			screensTraversed += 1;
		}
		expect(screensTraversed).toBe(4);
		expect(sawSymbol).toBe(true);
		expect(sawSentence).toBe(true);
	});

	// Task 1.3 AC4
	it("dispatches sentence items to the listening or reading organism by challengeDirection", () => {
		const listening = makeSentenceItem("s-1", "listening", {
			thaiText: "มา กัน",
			englishMeaning: "Come together",
		});
		const reading = makeSentenceItem("s-2", "reading", {
			thaiText: "มี ดี",
			englishMeaning: "Have good (things)",
		});
		const { game } = makeFixedRoundGame([listening, reading]);
		renderWithApp(<GamePage />, { game });
		startRound();

		// Listening: audio up front, the Thai text hidden until reveal.
		expect(createdAudioUrls()).toContain("/audio/s-1.mp3");
		expect(
			screen.getByText("Listen, then work out what the sentence says"),
		).toBeTruthy();
		expect(screen.queryByText("มา กัน")).toBeNull();
		reveal();
		expect(screen.getByText("มา กัน")).toBeTruthy();
		expect(screen.getByText("Come together")).toBeTruthy();
		rate(/Good/);

		// Reading: the Thai text up front, no audio before its reveal.
		expect(screen.getByText("Read this sentence aloud")).toBeTruthy();
		expect(screen.getByText("มี ดี")).toBeTruthy();
		expect(createdAudioUrls()).not.toContain("/audio/s-2.mp3");
		reveal();
		expect(createdAudioUrls()).toContain("/audio/s-2.mp3");
		expect(screen.getByText("Have good (things)")).toBeTruthy();
		rate(/Good/);

		expect(screen.getByText("Round Complete")).toBeTruthy();
	});

	// Task 1.3 AC5 — extends the script/vocab byte-identity proofs to the
	// sentence cards this phase introduces, through the real AppProvider.
	it("leaves the whole thai-srs-state blob byte-identical after a full Sentence Reading round through the real AppProvider", () => {
		const seeded = JSON.stringify({
			completedLessons: [1],
			currentLesson: 2,
			cards: {},
			vocabCards: {},
			grammarCards: {},
			sentenceCards: {
				"sentence:basic-001:readingComprehension": sentenceCardDTO("basic-001"),
				"sentence:basic-002:readingComprehension": sentenceCardDTO("basic-002"),
			},
			sessionHistory: [],
			achievements: [],
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

		fireEvent.click(screen.getByLabelText("Symbols"));
		fireEvent.click(screen.getByLabelText("Sentence Reading"));
		setCount("2");
		startRound();
		for (const rating of [/Again/, /Good/]) {
			reveal();
			rate(rating);
		}
		expect(screen.getByText("Round Complete")).toBeTruthy();

		expect(
			getFakeLocalStorage().getItem("thai-srs-game-history"),
		).not.toBeNull();
		expect(getFakeLocalStorage().getItem("thai-srs-state")).toBe(seeded);
	});

	// Task 1.3 AC5 — the mixed Symbols + Sentence Reading half of the proof.
	it("leaves the whole thai-srs-state blob byte-identical after a full mixed Symbols and Sentence Reading round through the real AppProvider", () => {
		const seeded = JSON.stringify({
			completedLessons: [1],
			currentLesson: 2,
			cards: {
				"ม-recognition": scriptCardDTO("ม"),
				"น-recognition": scriptCardDTO("น"),
			},
			vocabCards: {},
			grammarCards: {},
			sentenceCards: {
				"sentence:basic-001:readingComprehension": sentenceCardDTO("basic-001"),
			},
			sessionHistory: [],
			achievements: [],
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

		fireEvent.click(screen.getByLabelText("Sentence Reading"));
		setCount("3");
		startRound();

		let screensTraversed = 0;
		while (
			screen.queryByText("Round Complete") === null &&
			screensTraversed < 10
		) {
			reveal();
			rate(/Good/);
			screensTraversed += 1;
		}
		expect(screensTraversed).toBe(3);
		expect(screen.getByText("Round Complete")).toBeTruthy();

		expect(
			getFakeLocalStorage().getItem("thai-srs-game-history"),
		).not.toBeNull();
		expect(getFakeLocalStorage().getItem("thai-srs-state")).toBe(seeded);
	});

	// Task 1.3 AC6 — the two empty states are different situations and must
	// never collapse into one text; a checked-but-empty pool beside a
	// non-empty one is not an empty state at all.
	it("distinguishes zero pools checked from a checked-but-empty pool, and still starts from the non-empty one", () => {
		renderWithApp(<GamePage />, {}, { symbols: ["ม", "น"] });

		// Zero pools checked — its own message.
		fireEvent.click(screen.getByLabelText("Symbols"));
		expect(
			// A substring match: this copy also names the tone toggle since
			// task 2.3 made an all-unchecked state rescuable by it.
			screen.getByText(/Select at least one pool to practice/),
		).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Start Round" })).toBeNull();

		// Sentence Reading alone with nothing eligible — a different message.
		fireEvent.click(screen.getByLabelText("Sentence Reading"));
		expect(
			screen.getByText(/Nothing to practice yet in the selected pools/),
		).toBeTruthy();
		expect(
			screen.queryByText(/Select at least one pool to practice/),
		).toBeNull();
		expect(screen.queryByRole("button", { name: "Start Round" })).toBeNull();

		// Symbols back on beside the empty Sentence Reading pool: the round
		// starts, drawing only from Symbols.
		fireEvent.click(screen.getByLabelText("Symbols"));
		setCount("2");
		startRound();
		let screensTraversed = 0;
		while (
			screen.queryByText("Round Complete") === null &&
			screensTraversed < 10
		) {
			expect(screen.queryByText("Read this sentence aloud")).toBeNull();
			expect(
				screen.queryByText("Listen, then work out what the sentence says"),
			).toBeNull();
			reveal();
			rate(/Good/);
			screensTraversed += 1;
		}
		expect(screensTraversed).toBe(2);
	});

	// Task 1.3 AC7 — fixture-level label check; AC11 below is the real
	// storage round-trip.
	it("labels a sentence-inclusive history entry sensibly, never 'undefined'", () => {
		const historyStore = new InMemoryJsonStore<GameHistoryEntry[]>();
		historyStore.save([
			makeHistoryEntry({ id: "e1", pools: ["sentence"], itemCount: 3 }),
			makeHistoryEntry({
				id: "e2",
				playedAt: "2026-09-02T10:00:00.000Z",
				pools: ["script", "sentence"],
				itemCount: 5,
			}),
		]);
		const game = makeGame({ symbols: ["ม"], historyStore });
		renderWithApp(<GamePage />, { game });

		expect(screen.getByText("Sentence Reading · 3 items")).toBeTruthy();
		expect(
			screen.getByText("Symbols + Sentence Reading · 5 items"),
		).toBeTruthy();
		expect(screen.queryByText(/undefined/i)).toBeNull();
	});

	// Task 1.3 AC9 — two consecutive same-direction sentence items reuse the
	// component instance without a remount, and here deliberately share one
	// audioUrl: only an identity-keyed reset/replay passes.
	it("resets reveal and replays audio across two consecutive sentence reading items sharing one audioUrl", () => {
		const shared = "/audio/shared-sentence.mp3";
		const first = makeSentenceItem("s-1", "reading", {
			thaiText: "มา กัน",
			englishMeaning: "Come together",
			audioUrl: shared,
		});
		const second = makeSentenceItem("s-2", "reading", {
			thaiText: "มี ดี",
			englishMeaning: "Have good (things)",
			audioUrl: shared,
		});
		const { game } = makeFixedRoundGame([first, second]);
		renderWithApp(<GamePage />, { game });
		startRound();

		reveal();
		expect(createdAudioUrls().filter((url) => url === shared)).toHaveLength(1);
		rate(/Good/);

		// Second item: unrevealed again despite the identical audioUrl...
		expect(screen.getByText("มี ดี")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Again/ })).toBeNull();
		reveal();
		// ...and its own reveal plays the audio again.
		expect(createdAudioUrls().filter((url) => url === shared)).toHaveLength(2);
		expect(screen.getByText("Have good (things)")).toBeTruthy();
	});

	// Task 1.3 AC10 — the derived `pools` value must stay reference-stable
	// across unrelated re-renders: the count-reset effect is keyed on it.
	it("keeps a typed item count across unrelated toggles but resets it when the checked pools change", () => {
		renderWithApp(<GamePage />, {}, { symbols: ["ม", "น", "ง"] });
		const countValue = () =>
			(screen.getByLabelText("Items per round") as HTMLInputElement).value;

		setCount("2");
		expect(countValue()).toBe("2");

		fireEvent.click(screen.getByLabelText("Write on paper"));
		expect(countValue()).toBe("2");
		fireEvent.click(screen.getByLabelText("Prioritize weak items"));
		expect(countValue()).toBe("2");

		// A genuine pool change is exactly what does reset it.
		fireEvent.click(screen.getByLabelText("Words"));
		expect(countValue()).toBe("3");
	});

	// Task 1.3 AC11 — the one case that plays a real round and re-reads it
	// through the real AppProvider's LocalStorageJsonStore and shape guard:
	// task 1.1's pool-allowlist fix must hold end to end, or this round would
	// come back "unavailable" (and the next save would erase the history).
	it("round-trips a Sentence Reading round through the real AppProvider's history storage", () => {
		const seeded = JSON.stringify({
			completedLessons: [1],
			currentLesson: 2,
			cards: {},
			vocabCards: {},
			grammarCards: {},
			sentenceCards: {
				"sentence:basic-001:readingComprehension": sentenceCardDTO("basic-001"),
				"sentence:basic-002:readingComprehension": sentenceCardDTO("basic-002"),
			},
			sessionHistory: [],
			achievements: [],
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

		fireEvent.click(screen.getByLabelText("Symbols"));
		fireEvent.click(screen.getByLabelText("Sentence Reading"));
		setCount("2");
		startRound();
		for (const rating of [/Good/, /Easy/]) {
			reveal();
			rate(rating);
		}
		expect(screen.getByText("Round Complete")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Play Again" }));
		expect(screen.getByText("Sentence Reading · 2 items")).toBeTruthy();
		expect(screen.queryByText(/history is unavailable/i)).toBeNull();
		expect(screen.queryByText("No games played yet.")).toBeNull();
	});

	// Task 1.3 AC12 — with only Sentence Reading checked, Input Mode would
	// control nothing (sentences have no write-input), so it is hidden.
	it("hides Input Mode when only Sentence Reading is checked and restores it with a write-input pool", () => {
		renderWithApp(
			<GamePage />,
			{},
			{ symbols: ["ม"], sentences: ["basic-001"] },
		);

		expect(screen.getByLabelText("Draw on canvas")).toBeTruthy();

		fireEvent.click(screen.getByLabelText("Symbols"));
		fireEvent.click(screen.getByLabelText("Sentence Reading"));

		expect(screen.queryByLabelText("Draw on canvas")).toBeNull();
		expect(screen.queryByText("Input mode")).toBeNull();
		// The rest of the setup form is still there and usable.
		expect(screen.getByRole("button", { name: "Start Round" })).toBeTruthy();

		fireEvent.click(screen.getByLabelText("Symbols"));
		expect(screen.getByLabelText("Draw on canvas")).toBeTruthy();
	});
	// --- Task 2.3: Tone Identification ---

	// Four real vocabulary entries, each with a determinable tone, so a
	// seeded `toneIdentification` card makes exactly four words eligible.
	const TONE_WORDS = ["ที่", "ได้", "จะ", "นี้"] as const;
	const TONE_PROMPT = "Say this word's tones aloud";

	// Tone AC3, AC7
	it("leaves the Tone Identification toggle unchecked by default and keeps it accessibly labeled and keyboard-operable", () => {
		renderWithApp(
			<GamePage />,
			{},
			{ symbols: ["ม"], toneWords: [...TONE_WORDS] },
		);

		const toggle = screen.getByLabelText(
			"Tone Identification",
		) as HTMLInputElement;
		expect(toggle.type).toBe("checkbox");
		expect(toggle.checked).toBe(false);

		toggle.focus();
		expect(document.activeElement).toBe(toggle);
		// jsdom cannot synthesize the browser's Space-key default action on a
		// focused checkbox; activating the focused element is its stand-in.
		fireEvent.click(toggle);
		expect(toggle.checked).toBe(true);
		fireEvent.click(toggle);
		expect(toggle.checked).toBe(false);
	});

	// Tone AC3 — the toggle is combinable with any pool selection, and an
	// unchecked toggle must never let a tone item into the round.
	it("includes tone items only when the toggle is checked, alongside the checked pools", () => {
		renderWithApp(
			<GamePage />,
			{},
			{ symbols: ["ม", "น", "ง"], toneWords: [...TONE_WORDS] },
		);

		// Unchecked: Symbols' three items and nothing else.
		setCount("3");
		startRound();
		for (let i = 0; i < 3; i += 1) {
			expect(screen.queryByText(TONE_PROMPT)).toBeNull();
			reveal();
			rate(/Good/);
		}
		expect(screen.getByText("Round Complete")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Play Again" }));

		// Checked, with Symbols still checked: tone items now appear.
		fireEvent.click(screen.getByLabelText("Tone Identification"));
		setCount("7");
		startRound();
		let sawTone = false;
		let sawSymbol = false;
		let screensTraversed = 0;
		while (
			screen.queryByText("Round Complete") === null &&
			screensTraversed < 10
		) {
			if (screen.queryByText(TONE_PROMPT) !== null) sawTone = true;
			if (screen.queryByText("Say this symbol aloud") !== null)
				sawSymbol = true;
			reveal();
			rate(/Good/);
			screensTraversed += 1;
		}
		expect(sawTone).toBe(true);
		expect(sawSymbol).toBe(true);
		// Seven screens: three symbols plus four tone-eligible words.
		expect(screensTraversed).toBe(7);
	});

	// Tone AC4
	it("dispatches a tone item to the Tone Identification organism", () => {
		const { game } = makeFixedRoundGame([
			makeToneItem("นี้", { syllables: [{ text: "นี้", tone: "high" }] }),
		]);
		renderWithApp(<GamePage />, { game });
		startRound();

		// Text and audio together on mount — the tone organism's prompt.
		expect(screen.getByText(TONE_PROMPT)).toBeTruthy();
		expect(screen.getByText("นี้")).toBeTruthy();
		expect(createdAudioUrls()).toContain("/audio/นี้.mp3");
		expect(screen.queryByText("high")).toBeNull();

		reveal();
		expect(screen.getByText("high")).toBeTruthy();
		rate(/Good/);
		expect(screen.getByText("Round Complete")).toBeTruthy();
	});

	// Tone AC5 — the critical case: extends the script/vocab/sentence
	// byte-identity proofs to the tone-practice path, through the real
	// AppProvider (which is what wires the real `ToneGameItemSource`).
	it("leaves the whole thai-srs-state blob byte-identical after a full tone round through the real AppProvider", () => {
		const seeded = JSON.stringify({
			completedLessons: [1],
			currentLesson: 2,
			cards: {},
			vocabCards: {
				"vocab:ที่:thaiToEnglish": vocabCardDTO("ที่"),
				"vocab:ที่:toneIdentification": vocabCardDTO("ที่", "toneIdentification"),
				"vocab:ได้:toneIdentification": vocabCardDTO("ได้", "toneIdentification"),
			},
			grammarCards: {},
			sentenceCards: {},
			sessionHistory: [],
			achievements: [],
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

		fireEvent.click(screen.getByLabelText("Symbols"));
		fireEvent.click(screen.getByLabelText("Tone Identification"));
		setCount("2");
		startRound();
		for (const rating of [/Again/, /Easy/]) {
			expect(screen.getByText(TONE_PROMPT)).toBeTruthy();
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

	// Tone AC6 — the state task 2.1's pool-independent design exists to
	// allow: no pool checked at all, tone practice alone.
	it("starts a tone-only round with no pool checked and the toggle checked", () => {
		renderWithApp(
			<GamePage />,
			{},
			{ symbols: ["ม"], toneWords: [...TONE_WORDS] },
		);

		fireEvent.click(screen.getByLabelText("Symbols"));
		fireEvent.click(screen.getByLabelText("Tone Identification"));

		// Zero pools is no longer an empty state once tone practice is on.
		expect(
			screen.queryByText(/Select at least one pool to practice/),
		).toBeNull();
		expect(
			(screen.getByLabelText("Items per round") as HTMLInputElement).max,
		).toBe("4");

		setCount("4");
		startRound();
		for (let i = 0; i < 4; i += 1) {
			expect(screen.getByText(TONE_PROMPT)).toBeTruthy();
			expect(screen.queryByText("Say this symbol aloud")).toBeNull();
			reveal();
			rate(/Good/);
		}
		expect(screen.getByText("Round Complete")).toBeTruthy();
	});

	// Tone AC6 — the other end: the toggle on with nothing tone-eligible
	// must say so about tone, not about pools the learner never checked.
	it("explains an empty tone selection in its own words, never the pool-empty message", () => {
		renderWithApp(<GamePage />, {}, { symbols: ["ม"] });

		fireEvent.click(screen.getByLabelText("Symbols"));
		fireEvent.click(screen.getByLabelText("Tone Identification"));

		expect(
			screen.getByText(/No words with identifiable tones yet/),
		).toBeTruthy();
		expect(
			screen.queryByText(/Nothing to practice yet in the selected pools/),
		).toBeNull();
		expect(
			screen.queryByText(/Select at least one pool to practice/),
		).toBeNull();
		expect(screen.queryByRole("button", { name: "Start Round" })).toBeNull();
	});

	// Tone AC8 — the count is what proves `includeTonePractice` reaches
	// `countEligibleItems` and not merely `startRound`: 3 symbols + 4
	// tone-eligible words is a cap of 7, and an unthreaded toggle leaves it 3.
	it("counts tone items in the eligible cap when the toggle is checked", () => {
		renderWithApp(
			<GamePage />,
			{},
			{ symbols: ["ม", "น", "ง"], toneWords: [...TONE_WORDS] },
		);
		const countInput = () =>
			screen.getByLabelText("Items per round") as HTMLInputElement;

		expect(countInput().max).toBe("3");

		fireEvent.click(screen.getByLabelText("Tone Identification"));
		expect(countInput().max).toBe("7");
		expect(screen.getByText("Whole number from 1 to 7")).toBeTruthy();

		// And unchecking it puts the cap back — the count is derived, not a
		// one-way widening.
		fireEvent.click(screen.getByLabelText("Tone Identification"));
		expect(countInput().max).toBe("3");
	});

	// Tone AC9 — two consecutive tone items reuse the component instance
	// without a remount, and here deliberately share one audioUrl: only an
	// identity-keyed reset/replay passes.
	it("resets reveal and replays audio across two consecutive tone items sharing one audioUrl", () => {
		const shared = "/audio/shared-word.mp3";
		const first = makeToneItem("ที่", {
			syllables: [{ text: "ที่", tone: "falling" }],
			audioUrl: shared,
		});
		const second = makeToneItem("นี้", {
			syllables: [{ text: "นี้", tone: "high" }],
			audioUrl: shared,
		});
		const { game } = makeFixedRoundGame([first, second]);
		renderWithApp(<GamePage />, { game });
		startRound();

		expect(createdAudioUrls().filter((url) => url === shared)).toHaveLength(1);
		reveal();
		expect(screen.getByText("falling")).toBeTruthy();
		rate(/Good/);

		// Second item: unrevealed again despite the identical audioUrl...
		expect(screen.getByText("นี้")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Show Answer" })).toBeTruthy();
		expect(screen.queryByText("falling")).toBeNull();
		expect(screen.queryByRole("button", { name: /Again/ })).toBeNull();
		// ...and its own mount played the audio again.
		expect(createdAudioUrls().filter((url) => url === shared)).toHaveLength(2);
		reveal();
		expect(screen.getByText("high")).toBeTruthy();
	});
});
