// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StartLessonUseCase } from "../../application/use-cases/StartLessonUseCase";
import { GrammarService } from "../../domain/grammar/services/GrammarLessonService";
import type { GrammarEntry } from "../../domain/grammar/types";
import { LearningService } from "../../domain/script/services/ScriptLessonService";
import { SentenceService } from "../../domain/sentence/services/SentenceLessonService";
import type { SentenceEntry } from "../../domain/sentence/types";
import { VocabCard } from "../../domain/vocabulary/entities/VocabCard";
import { VocabularyService } from "../../domain/vocabulary/services/VocabularyLessonService";
import type { VocabEntry } from "../../domain/vocabulary/types";
import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../infrastructure/persistence/StorageLearnerStateRepository";
import type { AppContextValue } from "../context/AppContext";
import { renderWithApp } from "../test-utils/renderWithApp";
import { DictionaryPage } from "./DictionaryPage";

/**
 * A minimal, self-contained `VocabEntry` — `characters`/`toneRules: []` make
 * `VocabularyService.isWordMastered` trivially true regardless of script
 * progress, so these fixture words are "unlocked" without needing any real
 * `vocabulary.json` word or completed script lesson.
 */
function fixtureEntry(
	fields: Pick<
		VocabEntry,
		"thai" | "english" | "romanization" | "word_class" | "rank"
	> &
		Partial<Pick<VocabEntry, "characters" | "toneRules">>,
): VocabEntry {
	return {
		frequency: fields.rank ?? 0,
		mnemonic: null,
		description: null,
		characters: [],
		syllables: [],
		toneRules: [],
		thai_audio_file: null,
		english_audio_file: null,
		image_file: null,
		samples: [],
		source: "test",
		toneStatus: "verified",
		...fields,
	};
}

// Deliberately not declared in rank order — proves the page's own sort,
// rather than passing by coincidence of array order.
const ENTRIES: VocabEntry[] = [
	fixtureEntry({
		thai: "หนังสือ",
		romanization: "nangsue",
		word_class: "n",
		english: "book",
		rank: 5,
	}),
	fixtureEntry({
		thai: "แมว",
		romanization: "maeo",
		word_class: "n",
		english: "cat",
		rank: 1,
	}),
	fixtureEntry({
		thai: "เดิน",
		romanization: "dern",
		word_class: "v",
		english: "walk",
		rank: 4,
	}),
	fixtureEntry({
		thai: "กิน",
		romanization: "gin",
		word_class: "v",
		english: "eat",
		rank: 2,
	}),
	fixtureEntry({
		thai: "สวย",
		romanization: "suay",
		word_class: "adj",
		english: "beautiful",
		rank: 3,
	}),
	// Rank 500 is deliberately far outside the rank-1..5 window the other
	// fixtures sit in — mastered (empty characters/toneRules, like every
	// other fixture here) but not yet due.
	fixtureEntry({
		thai: "แอร์",
		romanization: "air",
		word_class: "n",
		english: "air conditioner",
		rank: 500,
	}),
	// A second sense of an existing headword ("กิน"/eat), ranked lower. The
	// real vocabulary has 139 of these; the grid must show one tile per
	// spelling, keeping the best-ranked row.
	fixtureEntry({
		thai: "กิน",
		romanization: "gin",
		word_class: "v",
		english: "consume",
		rank: 250,
	}),
	// Real (non-empty) characters/toneRules that this test file's setup()
	// never masters (it seeds no completedLessons) — the "locked" case.
	fixtureEntry({
		thai: "โดรน",
		// Deliberately distinct from `english` below ("drone"/"drone" would
		// collide: two DOM nodes with the identical exact text make
		// `getByText("drone")` throw on multiple matches).
		romanization: "dron",
		word_class: "n",
		english: "drone",
		rank: 600,
		characters: ["ด", "โ", "ร", "น"],
		toneRules: ["mid-live"],
	}),
];

/** A graduated (Guru-stage) card for `thai` — makes it a "learned" word. */
function learnedCardFor(thai: string): VocabCard {
	return VocabCard.fromDTO({
		id: `vocab:${thai}:thaiToEnglish`,
		question: "q",
		correctAnswer: "a",
		choices: ["a", "b"],
		srs: {
			easeFactor: 2,
			interval: 10,
			repetitions: 1,
			learningStep: null,
			nextReviewDate: new Date().toISOString(),
			lastReviewDate: new Date().toISOString(),
			lapseCount: 0,
		},
		promptWord: thai,
		property: "thaiToEnglish",
	});
}

const SENTENCES: SentenceEntry[] = [
	{
		id: "s1",
		thai: "กิน แมว",
		romanization: "gin maeo",
		english: "The cat eats", // fixture text, not meant to be natural Thai
		words: ["กิน", "แมว"],
		difficulty: 1,
		thai_audio_file: null,
		cards: { readingComprehension: { distractors: [] } },
	},
];

/**
 * A real `VocabularyService`/`SentenceService`/`StartLessonUseCase` trio
 * over the fixture words above, with "กิน"/eat learned. `renderWithApp`'s
 * own default harness wires `lesson` to a DIFFERENT, internally-built
 * `VocabularyService` over the real `vocabulary.json` — which has no idea
 * "แอร์" is a fixture word. Any test that both displays fixture data AND
 * exercises the pull-in button must override `lesson` too, built from these
 * same services, or the button will look right but silently do nothing.
 */
function setup() {
	const storage = new InMemoryStorage();
	const cardRepo = new StorageCardRepository(storage);
	const stateRepo = new StorageLearnerStateRepository(storage);
	cardRepo.saveAll([learnedCardFor("กิน")]);

	const vocab = new VocabularyService(cardRepo, stateRepo, ENTRIES);
	const sentence = new SentenceService(cardRepo, SENTENCES, vocab);
	const lesson = new StartLessonUseCase(
		new LearningService(cardRepo, stateRepo),
		vocab,
		new GrammarService(cardRepo, [] as GrammarEntry[], undefined, ENTRIES),
		sentence,
	);
	return { vocab, sentence, lesson, cardRepo, state: storage.load() };
}

function renderPage(overrides: Partial<AppContextValue> = {}) {
	const { vocab, sentence, lesson, cardRepo, state } = setup();
	const result = renderWithApp(<DictionaryPage />, {
		vocab,
		sentence,
		lesson,
		state,
		...overrides,
	});
	return { ...result, myCardRepo: cardRepo };
}

/** Switch the grid's scope. The fixture has a learned word ("กิน"/eat), so
 *  the page opens on "Learned" — most tests here are about the wider
 *  unlocked list and have to widen the scope first. */
function selectScope(label: "Learned" | "Unlocked" | "All") {
	fireEvent.click(screen.getByRole("button", { name: label }));
}

function gridLabels() {
	return screen
		.getAllByText(/^(cat|eat|beautiful|walk|book)$/)
		.map((el) => el.textContent);
}

describe("DictionaryPage", () => {
	it("opens on the learned words when the learner has some", () => {
		renderPage();

		expect(gridLabels()).toEqual(["eat"]);
	});

	it("lists unlocked words sorted by frequency", () => {
		renderPage();
		selectScope("Unlocked");

		expect(gridLabels()).toEqual(["cat", "eat", "beautiful", "walk", "book"]);
	});

	it("shows one tile per headword when a spelling has several senses", () => {
		renderPage();
		selectScope("All");

		// "กิน" is present twice in the fixture — as "eat" (rank 2) and
		// "consume" (rank 250). Only the better-ranked row gets a tile.
		expect(screen.getAllByText("กิน")).toHaveLength(1);
		expect(screen.getByText("eat")).toBeTruthy();
		expect(screen.queryByText("consume")).toBeNull();
	});

	it("widens to the whole vocabulary under the All scope", () => {
		renderPage();
		selectScope("All");

		// "drone" is script-incomplete, so it is neither learned nor unlocked —
		// only the All scope reaches it without a search.
		expect(screen.getByText("drone")).toBeTruthy();
	});

	it("switches to alphabetical sort", () => {
		renderPage();
		selectScope("Unlocked");

		fireEvent.click(screen.getByRole("button", { name: "A–Z" }));

		expect(gridLabels()).toEqual(["beautiful", "book", "cat", "eat", "walk"]);
	});

	it("searches by English meaning", () => {
		renderPage();

		fireEvent.change(screen.getByLabelText("Search dictionary"), {
			target: { value: "eat" },
		});

		expect(screen.getByText("eat")).toBeTruthy();
		expect(screen.queryByText("cat")).toBeNull();
	});

	it("searches by Thai word", () => {
		renderPage();

		fireEvent.change(screen.getByLabelText("Search dictionary"), {
			target: { value: "แมว" },
		});

		expect(screen.getByText("cat")).toBeTruthy();
		expect(screen.queryByText("eat")).toBeNull();
	});

	it("filters by word-class tab", () => {
		renderPage();
		selectScope("Unlocked");

		fireEvent.click(screen.getByRole("button", { name: "Verbs (2)" }));

		expect(screen.getByText("eat")).toBeTruthy();
		expect(screen.getByText("walk")).toBeTruthy();
		expect(screen.queryByText("cat")).toBeNull();
		expect(screen.queryByText("beautiful")).toBeNull();
	});

	// Narrowing the scope can remove the word class the grid is filtered to.
	it("falls back to the All tab when the active word class leaves the scope", () => {
		renderPage();
		selectScope("Unlocked");

		fireEvent.click(screen.getByRole("button", { name: "Adjectives (1)" }));
		expect(gridLabels()).toEqual(["beautiful"]);

		// The only learned word is a verb, so "Adjectives" disappears.
		selectScope("Learned");

		expect(screen.queryByRole("button", { name: /Adjectives/ })).toBeNull();
		expect(gridLabels()).toEqual(["eat"]);
	});

	it("shows a stage dot on the grid only for a word that already has cards", () => {
		renderPage();
		selectScope("Unlocked");

		// Five unlocked words in the grid, one of which ("eat") has cards.
		expect(screen.getByTitle("Guru")).toBeTruthy();
	});

	// Searching is deliberately not confined to the active scope: a word you
	// have not unlocked is still findable by name from the narrowest scope.
	it("search reaches past the active scope", () => {
		renderPage();

		expect(gridLabels()).toEqual(["eat"]);

		fireEvent.change(screen.getByLabelText("Search dictionary"), {
			target: { value: "cat" },
		});

		expect(screen.getByText("cat")).toBeTruthy();
	});

	it("opens a read-only detail view with no override controls for an unlearned word", () => {
		renderPage();
		selectScope("Unlocked");

		fireEvent.click(screen.getByText("cat"));

		expect(screen.getByText("แมว")).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Override Stage/ })).toBeNull();
		expect(screen.queryByText("Guru")).toBeNull();
	});

	it("shows the stage badge in the detail view for a learned word", () => {
		renderPage();

		fireEvent.click(screen.getByText("eat"));

		expect(screen.getByText("Guru")).toBeTruthy();
	});

	// Absorbed from the deleted VocabListPage: overriding a learned word's
	// stage was the one thing that page offered which this one did not.
	it("offers a stage override for a learned word", () => {
		renderPage();

		fireEvent.click(screen.getByText("eat"));
		fireEvent.click(screen.getByRole("button", { name: "Override Stage" }));

		const sheet = screen.getByRole("dialog");
		expect(sheet.textContent).toContain("กิน");
		// The sheet is wired to the word's real cards, so it opens showing the
		// stage those cards are actually at.
		expect(
			screen.getByRole("button", { name: "Set stage to Guru" }).ariaPressed,
		).toBe("true");
	});

	// Asserted through a spy rather than the repository, because this file's
	// `setup()` seeds its own card repo while `renderWithApp` wires `items`
	// to a different one — see the note on `setup()` above.
	it("applies a stage override to every card of the selected word", () => {
		const overrideCardStage = vi.fn();
		renderPage({
			items: { overrideCardStage } as unknown as AppContextValue["items"],
		});

		fireEvent.click(screen.getByText("eat"));
		fireEvent.click(screen.getByRole("button", { name: "Override Stage" }));
		fireEvent.click(
			screen.getByRole("button", { name: "Set stage to Burned" }),
		);

		expect(overrideCardStage).toHaveBeenCalledTimes(1);
		const [id, pool, stage] = overrideCardStage.mock.calls[0];
		expect(id).toBe("vocab:กิน:thaiToEnglish");
		expect(pool).toBe("vocab");
		expect(stage.name).toBe("Burned");
	});

	it("search surfaces a pullable word outside the rank window, tagged 'not yet due'", () => {
		renderPage();

		fireEvent.change(screen.getByLabelText("Search dictionary"), {
			target: { value: "air conditioner" },
		});

		expect(screen.getByText("air conditioner")).toBeTruthy();
		expect(screen.getByText("not yet due")).toBeTruthy();
	});

	it("search surfaces a script-incomplete word, tagged 'locked'", () => {
		renderPage();

		fireEvent.change(screen.getByLabelText("Search dictionary"), {
			target: { value: "drone" },
		});

		expect(screen.getByText("drone")).toBeTruthy();
		expect(screen.getByText("locked")).toBeTruthy();
	});

	it("shows a Pull into SRS button for a pullable, not-yet-learned word", () => {
		renderPage();

		fireEvent.change(screen.getByLabelText("Search dictionary"), {
			target: { value: "air conditioner" },
		});
		fireEvent.click(screen.getByText("air conditioner"));

		expect(screen.getByRole("button", { name: "Pull into SRS" })).toBeTruthy();
	});

	it("shows a locked reason instead of a button for a script-incomplete word", () => {
		renderPage();

		fireEvent.change(screen.getByLabelText("Search dictionary"), {
			target: { value: "drone" },
		});
		fireEvent.click(screen.getByText("drone"));

		expect(screen.queryByRole("button", { name: "Pull into SRS" })).toBeNull();
		expect(screen.getByText(/character ด/)).toBeTruthy();
		expect(screen.getByText(/tone rule mid-live/)).toBeTruthy();
	});

	it("pulling in a word persists its cards", () => {
		const { myCardRepo } = renderPage();

		fireEvent.change(screen.getByLabelText("Search dictionary"), {
			target: { value: "air conditioner" },
		});
		fireEvent.click(screen.getByText("air conditioner"));
		fireEvent.click(screen.getByRole("button", { name: "Pull into SRS" }));

		expect(myCardRepo.findAll("vocab").length).toBeGreaterThan(0);
	});

	it("shows unlock suggestions for a word's sentences", () => {
		renderPage();
		selectScope("Unlocked");

		fireEvent.click(screen.getByText("cat"));

		expect(screen.getByText("Appears in 1 sentence")).toBeTruthy();
		expect(screen.getByText("Unlocks immediately")).toBeTruthy();
	});
});
