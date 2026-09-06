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
	it("produces 3 cards for a word without audio", () => {
		const cards = generateVocabCards(testWord, allWords);
		expect(cards).toHaveLength(3);
	});

	it("produces 5 cards for a word with audio", () => {
		const cards = generateVocabCards(testWordWithAudio, allWords);
		expect(cards).toHaveLength(5);
	});

	it("thaiToEnglish card has correct id format, question, and correct answer", () => {
		const cards = generateVocabCards(testWord, allWords);
		const card = cards.find((c) => c.property === "thaiToEnglish");
		expect(card).toBeDefined();
		expect(card?.id).toBe("vocab:ที่:thaiToEnglish");
		expect(card?.promptWord).toBe("ที่");
		expect(card?.question).toBe("What does this word mean?");
		expect(card?.correctAnswer).toBe("at");
	});

	it("englishToThai card has correct id, question uses English meaning, correct answer is Thai", () => {
		const cards = generateVocabCards(testWord, allWords);
		const card = cards.find((c) => c.property === "englishToThai");
		expect(card).toBeDefined();
		expect(card?.id).toBe("vocab:ที่:englishToThai");
		expect(card?.promptWord).toBe("at");
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
		const nonSpellingCards = cards.filter(
			(c) => c.property !== "spelling" && c.property !== "spellingFromAudio",
		);
		for (const card of nonSpellingCards) {
			expect(card.choices).toContain(card.correctAnswer);
		}
	});

	it("choices have 4 items when pool is large enough", () => {
		const cards = generateVocabCards(testWord, allWords);
		const nonSpellingCards = cards.filter(
			(c) => c.property !== "spelling" && c.property !== "spellingFromAudio",
		);
		for (const card of nonSpellingCards) {
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

	it("produces a spelling card for every word", () => {
		const cards = generateVocabCards(testWord, allWords);
		const card = cards.find((c) => c.property === "spelling");
		expect(card).toBeDefined();
		expect(card?.id).toBe("vocab:ที่:spelling");
		expect(card?.question).toBe('Spell the Thai word for "at"');
		expect(card?.correctAnswer).toBe("ที่");
		expect(card?.promptWord).toBe("ที่");
	});

	it("spelling card choices contain all characters of the word", () => {
		const cards = generateVocabCards(testWord, allWords);
		const card = cards.find((c) => c.property === "spelling");
		for (const ch of ["ท", "ี", "่"]) {
			expect(card?.choices).toContain(ch);
		}
	});

	it("spelling card choices contain more characters than the word itself", () => {
		const cards = generateVocabCards(testWord, allWords);
		const card = cards.find((c) => c.property === "spelling");
		expect(card?.choices.length).toBeGreaterThan(3);
	});

	it("spelling card choices include a separate tile for each occurrence of a repeated letter", () => {
		const wordWithRepeatedLetter: VocabEntry = {
			...testWord,
			thai: "ยาย",
			english: "grandmother",
		};
		const cards = generateVocabCards(wordWithRepeatedLetter, allWords);
		const card = cards.find((c) => c.property === "spelling");
		const occurrences = card?.choices.filter((ch) => ch === "ย").length;
		expect(occurrences).toBe(2);
	});

	it("does not produce spellingFromAudio card without audio", () => {
		const cards = generateVocabCards(testWord, allWords);
		const card = cards.find((c) => c.property === "spellingFromAudio");
		expect(card).toBeUndefined();
	});

	it("produces spellingFromAudio card when audio exists", () => {
		const cards = generateVocabCards(testWordWithAudio, allWords);
		const card = cards.find((c) => c.property === "spellingFromAudio");
		expect(card).toBeDefined();
		expect(card?.id).toBe("vocab:ที่:spellingFromAudio");
		expect(card?.question).toBe("Listen and spell the word");
		expect(card?.correctAnswer).toBe("ที่");
		expect(card?.audioUrl).toBe("/audio/thai/thi.mp3");
		expect(card?.promptWord).toBe("ที่");
	});

	it("spelling cards carry mnemonic from source word", () => {
		const cards = generateVocabCards(testWordWithMnemonic, allWords);
		const spellingCard = cards.find((c) => c.property === "spelling");
		expect(spellingCard?.mnemonic).toBe("tea tree → falling tone");
	});

	it("spelling distractors include a consonant sharing the word's final sound (ท → ต, both T-stop)", () => {
		// testWord "ที่" contains ท, whose finalSound is "T-stop" — same as ต.
		const cards = generateVocabCards(testWord, allWords);
		const card = cards.find((c) => c.property === "spelling");
		expect(card?.choices).toContain("ต");
	});

	it("spelling distractors include a vowel sharing the word's vowel sound (ะ → ั, both short 'a')", () => {
		const wordWithShortA: VocabEntry = {
			...testWord,
			thai: "กะ",
			characters: ["ก", "ะ"],
		};
		const cards = generateVocabCards(wordWithShortA, [wordWithShortA]);
		const card = cards.find((c) => c.property === "spelling");
		expect(card?.choices).toContain("ั");
	});

	it("restricts distractors to introduced characters when a set is supplied", () => {
		// The word's own characters plus a handful of ท's initial/final-sound
		// confusables — enough to fill the minimum without needing the
		// full-alphabet padding fallback. No other character should ever
		// appear as a distractor tile.
		const introducedChars = new Set([
			"ท",
			"ี",
			"่",
			"ต",
			"ถ",
			"ธ",
			"ฐ",
			"ช",
			"ซ",
		]);
		for (let i = 0; i < 20; i++) {
			const cards = generateVocabCards(testWord, allWords, introducedChars);
			const card = cards.find((c) => c.property === "spelling");
			for (const ch of card?.choices ?? []) {
				expect(introducedChars.has(ch)).toBe(true);
			}
		}
	});

	it("falls back to the full alphabet for padding when introduced characters are too few", () => {
		// Only the word's own characters are "introduced" — too few to reach the
		// minimum distractor count, so padding must fall back to the full pool.
		const introducedChars = new Set(["ท", "ี", "่"]);
		const cards = generateVocabCards(testWord, allWords, introducedChars);
		const card = cards.find((c) => c.property === "spelling");
		expect(card?.choices.length).toBeGreaterThan(3);
	});
});
