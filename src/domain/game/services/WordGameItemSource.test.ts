import { describe, expect, it } from "vitest";
import type { CardRepository } from "../../ports/CardRepository";
import type { CardPool } from "../../shared/CardPool";
import type { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { VocabCard } from "../../vocabulary/entities/VocabCard";
import type { VocabEntry } from "../../vocabulary/types";
import { WordGameItemSource } from "./WordGameItemSource";

function vocabEntry(overrides: Partial<VocabEntry> = {}): VocabEntry {
	return {
		thai: "แมว",
		romanization: "maeo",
		word_class: "noun",
		english: "cat",
		rank: 1,
		frequency: 100,
		mnemonic: null,
		characters: ["แ", "ม", "ว"],
		syllables: [],
		toneRules: [],
		thai_audio_file: "/audio/maeo.mp3",
		english_audio_file: null,
		image_file: null,
		samples: [],
		source: "test",
		...overrides,
	};
}

function vocabCard(
	id: string,
	promptWord: string,
	property: string,
	correctAnswer: string,
): VocabCard {
	return new VocabCard(
		id,
		"question",
		correctAnswer,
		[correctAnswer],
		SrsSchedule.initial(),
		promptWord,
		property,
	);
}

function repositoryOf(cards: readonly ReviewableCard[]): CardRepository {
	return {
		findById: () => null,
		findDue: () => [],
		findAll: (pool: CardPool) => (pool === "vocab" ? [...cards] : []),
		save: () => {},
		saveAll: () => {},
		remove: () => {},
	};
}

describe("WordGameItemSource", () => {
	it("takes content from the injected VocabEntry, never from either card's own promptWord/correctAnswer", () => {
		const entry = vocabEntry();
		const cards = [
			vocabCard("vocab:แมว:thaiToEnglish", "แมว", "thaiToEnglish", "cat"),
			// englishToThai's promptWord holds the *English* word, and its
			// correctAnswer is the Thai spelling — neither should leak through.
			vocabCard("vocab:แมว:englishToThai", "cat", "englishToThai", "แมว"),
		];
		const source = new WordGameItemSource(repositoryOf(cards), [entry]);

		const content = source.eligibleContent();

		expect(content).toEqual([
			{
				kind: "word",
				thaiWord: entry.thai,
				englishMeaning: entry.english,
				audioUrl: entry.thai_audio_file,
			},
		]);
	});

	it("reports the vocab pool", () => {
		expect(new WordGameItemSource(repositoryOf([]), []).pool).toBe("vocab");
	});

	it("is empty when no vocab cards exist", () => {
		expect(
			new WordGameItemSource(repositoryOf([]), []).eligibleContent(),
		).toEqual([]);
	});

	it("treats a word with cards under several properties as one eligible item", () => {
		const entry = vocabEntry();
		const cards = [
			vocabCard("vocab:แมว:thaiToEnglish", "แมว", "thaiToEnglish", "cat"),
			vocabCard("vocab:แมว:spelling", "แมว", "spelling", "แมว"),
			vocabCard(
				"vocab:แมว:spellingFromAudio",
				"แมว",
				"spellingFromAudio",
				"แมว",
			),
		];
		const source = new WordGameItemSource(repositoryOf(cards), [entry]);

		expect(source.eligibleContent()).toHaveLength(1);
	});

	it("skips a card whose id does not match vocab:{thai}:{property}, rather than producing an undefined word", () => {
		const entry = vocabEntry();
		const cards = [
			vocabCard("not-a-vocab-id", "แมว", "thaiToEnglish", "cat"),
			vocabCard("vocab:แมว:not-a-real-property", "แมว", "bogus", "cat"),
			vocabCard("vocab:only-two-parts", "แมว", "thaiToEnglish", "cat"),
		];
		const source = new WordGameItemSource(repositoryOf(cards), [entry]);

		expect(source.eligibleContent()).toEqual([]);
	});

	it("ignores a card whose parsed word has no matching VocabEntry", () => {
		const cards = [
			vocabCard("vocab:ไม่มี:thaiToEnglish", "ไม่มี", "thaiToEnglish", "none"),
		];
		const source = new WordGameItemSource(repositoryOf(cards), []);

		expect(source.eligibleContent()).toEqual([]);
	});
});
