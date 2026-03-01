import { describe, expect, it } from "vitest";
import type { VocabEntry } from "../types";
import { generateVocabCards } from "./VocabCardGenerator";

const testWord: VocabEntry = {
	thai: "ที่",
	romanization: "tʰîː",
	word_class: "",
	english: "at",
	rank: 1,
	frequency: 773568,
	mnemonic: null,
	characters: ["ท", "ี", "่"],
	syllables: [],
	toneRules: [],
	thai_audio_file: null,
	english_audio_file: null,
	image_file: null,
	samples: [],
	source: "frequency_csv",
};

const testWordWithAudio: VocabEntry = {
	...testWord,
	thai_audio_file: "/audio/thai/thi.mp3",
};

const allWords: VocabEntry[] = [
	testWord,
	{ ...testWord, thai: "ของ", english: "of", rank: 2, frequency: 500000 },
	{ ...testWord, thai: "เป็น", english: "to be", rank: 3, frequency: 400000 },
	{ ...testWord, thai: "ใน", english: "in", rank: 4, frequency: 300000 },
	{ ...testWord, thai: "มี", english: "to have", rank: 5, frequency: 200000 },
];

const testWordWithMnemonic: VocabEntry = {
	...testWord,
	mnemonic: "tea tree → falling tone",
};

const testWordWithDescription: VocabEntry = {
	...testWord,
	description:
		'A versatile preposition meaning "at", "in", "on", or "of". Also used as a relative clause marker and nominalizer.',
};

const testWordWithTones: VocabEntry = {
	...testWord,
	thai: "สวัสดี",
	english: "hello",
	syllables: [
		{
			text: "สวัส",
			initialConsonant: "ส",
			vowel: "วั",
			finalConsonant: "ส",
			toneMark: null,
			consonantClass: "high",
			syllableType: "dead",
			tone: "low",
		},
		{
			text: "ดี",
			initialConsonant: "ด",
			vowel: "ี",
			finalConsonant: null,
			toneMark: null,
			consonantClass: "mid",
			syllableType: "live",
			tone: "mid",
		},
	],
};

describe("generateVocabCards", () => {
	it("produces 2 cards for a word without audio", () => {
		const cards = generateVocabCards(testWord, allWords);
		expect(cards).toHaveLength(2);
	});

	it("produces 3 cards for a word with audio", () => {
		const cards = generateVocabCards(testWordWithAudio, allWords);
		expect(cards).toHaveLength(3);
	});

	it("thaiToEnglish card has correct id format, question, and correct answer", () => {
		const cards = generateVocabCards(testWord, allWords);
		const card = cards.find((c) => c.property === "thaiToEnglish");
		expect(card).toBeDefined();
		expect(card?.id).toBe("vocab:ที่:thaiToEnglish");
		expect(card?.wordThai).toBe("ที่");
		expect(card?.question).toBe("What does this word mean?");
		expect(card?.correctAnswer).toBe("at");
	});

	it("englishToThai card has correct id, question uses English meaning, correct answer is Thai", () => {
		const cards = generateVocabCards(testWord, allWords);
		const card = cards.find((c) => c.property === "englishToThai");
		expect(card).toBeDefined();
		expect(card?.id).toBe("vocab:ที่:englishToThai");
		expect(card?.wordThai).toBe("ที่");
		expect(card?.question).toBe('Which Thai word means "at"?');
		expect(card?.correctAnswer).toBe("ที่");
	});

	it("audioRecognition card has audioUrl set", () => {
		const cards = generateVocabCards(testWordWithAudio, allWords);
		const card = cards.find((c) => c.property === "audioRecognition");
		expect(card).toBeDefined();
		expect(card?.id).toBe("vocab:ที่:audioRecognition");
		expect(card?.audioUrl).toBe("/audio/thai/thi.mp3");
		expect(card?.question).toBe("Listen to the audio. Which word is this?");
		expect(card?.correctAnswer).toBe("ที่");
	});

	it("choices always include the correct answer", () => {
		const cards = generateVocabCards(testWordWithAudio, allWords);
		for (const card of cards) {
			expect(card.choices).toContain(card.correctAnswer);
		}
	});

	it("choices have 4 items when pool is large enough", () => {
		const cards = generateVocabCards(testWord, allWords);
		for (const card of cards) {
			expect(card.choices).toHaveLength(4);
		}
	});

	it("toneIdentification is a recognised VocabProperty at compile time", () => {
		// This line will not compile if 'toneIdentification' is removed from VocabProperty
		const _check: import("../types").VocabProperty = "toneIdentification";
		void _check;
	});

	it("all card types carry mnemonic from source word", () => {
		const cards = generateVocabCards(testWordWithMnemonic, allWords);
		for (const card of cards) {
			expect(card.mnemonic).toBe("tea tree → falling tone");
		}
	});

	it("produces a toneIdentification card when syllables have tones", () => {
		const cards = generateVocabCards(testWordWithTones, [testWordWithTones]);
		const toneCard = cards.find((c) => c.property === "toneIdentification");
		expect(toneCard).toBeDefined();
		expect(toneCard?.id).toBe("vocab:สวัสดี:toneIdentification");
		expect(toneCard?.correctAnswer).toBe("low|mid");
		expect(toneCard?.syllables).toEqual([
			{ text: "สวัส", tone: "low" },
			{ text: "ดี", tone: "mid" },
		]);
	});

	it("does not produce a toneIdentification card when no syllable tones", () => {
		const cards = generateVocabCards(testWord, allWords);
		const toneCard = cards.find((c) => c.property === "toneIdentification");
		expect(toneCard).toBeUndefined();
	});

	it("generates cards for word with description (description is ignored by generator)", () => {
		const cards = generateVocabCards(testWordWithDescription, allWords);
		expect(cards.length).toBeGreaterThan(0);
	});
});
