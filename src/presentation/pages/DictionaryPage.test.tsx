// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VocabCard } from "../../domain/vocabulary/entities/VocabCard";
import { VocabularyService } from "../../domain/vocabulary/services/VocabularyLessonService";
import type { VocabEntry } from "../../domain/vocabulary/types";
import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../infrastructure/persistence/StorageCardRepository";
import { StorageLearnerStateRepository } from "../../infrastructure/persistence/StorageLearnerStateRepository";
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
	>,
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

/** A real `VocabularyService` over the fixture words, with "กิน"/eat learned. */
function setup() {
	const storage = new InMemoryStorage();
	const cardRepo = new StorageCardRepository(storage);
	const stateRepo = new StorageLearnerStateRepository(storage);
	cardRepo.saveAll([learnedCardFor("กิน")]);

	const vocab = new VocabularyService(cardRepo, stateRepo, ENTRIES);
	return { vocab, state: storage.load() };
}

function renderPage() {
	const { vocab, state } = setup();
	return renderWithApp(<DictionaryPage />, { vocab, state });
}

describe("DictionaryPage", () => {
	it("lists unlocked words sorted by frequency by default", () => {
		renderPage();

		const labels = screen
			.getAllByText(/^(cat|eat|beautiful|walk|book)$/)
			.map((el) => el.textContent);
		expect(labels).toEqual(["cat", "eat", "beautiful", "walk", "book"]);
	});

	it("switches to alphabetical sort", () => {
		renderPage();

		fireEvent.click(screen.getByRole("button", { name: "A–Z" }));

		const labels = screen
			.getAllByText(/^(cat|eat|beautiful|walk|book)$/)
			.map((el) => el.textContent);
		expect(labels).toEqual(["beautiful", "book", "cat", "eat", "walk"]);
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

		fireEvent.click(screen.getByRole("button", { name: "Verbs (2)" }));

		expect(screen.getByText("eat")).toBeTruthy();
		expect(screen.getByText("walk")).toBeTruthy();
		expect(screen.queryByText("cat")).toBeNull();
		expect(screen.queryByText("beautiful")).toBeNull();
	});

	it("shows a stage dot on the grid only for a word that already has cards", () => {
		renderPage();

		expect(screen.getByTitle("Guru")).toBeTruthy();
	});

	it("opens a read-only detail view with no override controls for an unlearned word", () => {
		renderPage();

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
});
