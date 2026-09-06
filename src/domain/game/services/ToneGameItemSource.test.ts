import { describe, expect, it } from "vitest";
import type { CardRepository } from "../../ports/CardRepository";
import type { CardPool } from "../../shared/CardPool";
import type { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import { VocabCard } from "../../vocabulary/entities/VocabCard";
import type { SyllableInfo, VocabEntry } from "../../vocabulary/types";
import { ToneGameItemSource } from "./ToneGameItemSource";

function syllable(text: string, tone: string | null): SyllableInfo {
	return {
		text,
		initialConsonant: null,
		vowel: null,
		finalConsonant: null,
		toneMark: null,
		consonantClass: null,
		syllableType: null,
		tone,
	};
}

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
		syllables: [syllable("แมว", "rising")],
		toneRules: [],
		thai_audio_file: "/audio/maeo.mp3",
		english_audio_file: null,
		image_file: null,
		samples: [],
		source: "test",
		...overrides,
	};
}

/** A vocab card whose id encodes a Thai word and property, with an optional explicit `syllables` field. */
function vocabCard(
	id: string,
	promptWord: string,
	property: string,
	syllables?: { text: string; tone: string }[],
): VocabCard {
	return new VocabCard(
		id,
		"question",
		"answer",
		["answer"],
		SrsSchedule.initial(),
		promptWord,
		property,
		undefined,
		null,
		syllables,
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

describe("ToneGameItemSource", () => {
	it("AC1: content matches toneSyllablesOf(entry)/entry.thai, even when the card's own syllables field is absent", () => {
		const entry = vocabEntry({
			thai: "แมว",
			syllables: [syllable("แมว", "rising")],
		});
		// No `syllables` argument at all — the card's own field is `undefined`,
		// mirroring a card persisted before that field existed.
		const card = vocabCard(
			"vocab:แมว:toneIdentification",
			"แมว",
			"toneIdentification",
		);
		const source = new ToneGameItemSource(repositoryOf([card]), [entry]);

		const content = source.eligibleContent();

		expect(content).toEqual([
			{
				kind: "tone",
				thaiWord: "แมว",
				syllables: [{ text: "แมว", tone: "rising" }],
				audioUrl: "/audio/maeo.mp3",
			},
		]);
	});

	it("AC1: content ignores a mismatched syllables field on the card itself", () => {
		const entry = vocabEntry({
			thai: "แมว",
			syllables: [syllable("แมว", "rising")],
		});
		const card = vocabCard(
			"vocab:แมว:toneIdentification",
			"แมว",
			"toneIdentification",
			[{ text: "wrong", tone: "low" }],
		);
		const source = new ToneGameItemSource(repositoryOf([card]), [entry]);

		const content = source.eligibleContent();

		expect(content).toEqual([
			{
				kind: "tone",
				thaiWord: "แมว",
				syllables: [{ text: "แมว", tone: "rising" }],
				audioUrl: "/audio/maeo.mp3",
			},
		]);
	});

	it("AC2: a word with no toneIdentification card is excluded from tone eligibility", () => {
		const entry = vocabEntry({ thai: "แมว" });
		const card = vocabCard("vocab:แมว:thaiToEnglish", "แมว", "thaiToEnglish");
		const source = new ToneGameItemSource(repositoryOf([card]), [entry]);

		expect(source.eligibleContent()).toEqual([]);
	});

	it("AC3: a tone item's audioUrl comes from the matching VocabEntry's thai_audio_file", () => {
		const entry = vocabEntry({
			thai: "แมว",
			thai_audio_file: "/audio/maeo.mp3",
		});
		const card = vocabCard(
			"vocab:แมว:toneIdentification",
			"แมว",
			"toneIdentification",
		);
		const source = new ToneGameItemSource(repositoryOf([card]), [entry]);

		expect(source.eligibleContent()[0]?.audioUrl).toBe("/audio/maeo.mp3");
	});

	it("a word with no audio produces a tone item with audioUrl undefined", () => {
		const entry = vocabEntry({ thai: "หมา", thai_audio_file: null });
		const card = vocabCard(
			"vocab:หมา:toneIdentification",
			"หมา",
			"toneIdentification",
		);
		const source = new ToneGameItemSource(repositoryOf([card]), [entry]);

		expect(source.eligibleContent()[0]?.audioUrl).toBeUndefined();
	});

	it("treats several toneIdentification-property cards for the same word as one item (defensive dedupe)", () => {
		const entry = vocabEntry({ thai: "แมว" });
		const cards = [
			vocabCard("vocab:แมว:toneIdentification", "แมว", "toneIdentification"),
			vocabCard("vocab:แมว:toneIdentification", "แมว", "toneIdentification"),
		];
		const source = new ToneGameItemSource(repositoryOf(cards), [entry]);

		expect(source.eligibleContent()).toHaveLength(1);
	});

	it("a toneIdentification card with no matching VocabEntry produces no item", () => {
		const card = vocabCard(
			"vocab:ไม่มี:toneIdentification",
			"ไม่มี",
			"toneIdentification",
		);
		const source = new ToneGameItemSource(repositoryOf([card]), []);

		expect(source.eligibleContent()).toEqual([]);
	});
});
