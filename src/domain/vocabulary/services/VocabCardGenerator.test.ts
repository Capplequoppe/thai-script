import { describe, expect, it } from "vitest";
import type { VocabEntry } from "../types";
import { generateVocabCards } from "./VocabCardGenerator";
import { mnemonicTextFor } from "./VocabMnemonic";

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
	toneStatus: "verified",
	specialRules: [],
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

	it("gives every card type the same mnemonic", () => {
		// The fixture is ที่ at rank 1, which has a staged record, so the text
		// is the staged one — see the case below. What this asserts is that
		// whatever the mnemonic turns out to be, no card type disagrees.
		const cards = generateVocabCards(testWordWithMnemonic, allWords);
		const texts = new Set(cards.map((card) => card.mnemonic));
		expect(cards.length).toBeGreaterThan(1);
		expect(texts.size).toBe(1);
	});

	it("drills the staged mnemonic rather than the corpus's own prose", () => {
		// The fix this pins: review cards took `word.mnemonic` straight from
		// the JSON while the dictionary page resolved the staged record, so
		// the sixty mnemonics written in the course's own world reached the
		// browse surface and every repetition to mastery drilled the corpus's
		// ALL-CAPS romanisation instead.
		const cards = generateVocabCards(testWordWithMnemonic, allWords);
		const mnemonic = cards[0]?.mnemonic;
		expect(mnemonic).toBe(mnemonicTextFor(testWordWithMnemonic));
		expect(mnemonic).not.toBe(testWordWithMnemonic.mnemonic);
	});

	it("falls back to the corpus prose for a word with no staged record", () => {
		// Most of the corpus is in this state — sixty staged records against
		// five and a half thousand entries — so the fallback is the common
		// path, not the exceptional one.
		const unstaged: VocabEntry = {
			...testWordWithMnemonic,
			thai: "ไม่มีอยู่จริง",
			rank: 999_999,
		};
		const cards = generateVocabCards(unstaged, allWords);
		expect(cards[0]?.mnemonic).toBe("tea tree → falling tone");
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

	it("spelling card choices contain a repeated letter's tile only once", () => {
		const wordWithRepeatedLetter: VocabEntry = {
			...testWord,
			thai: "ยาย",
			english: "grandmother",
		};
		const cards = generateVocabCards(wordWithRepeatedLetter, allWords);
		const card = cards.find((c) => c.property === "spelling");
		const occurrences = card?.choices.filter((ch) => ch === "ย").length;
		expect(occurrences).toBe(1);
	});

	// The second gate: หมี cannot be read without ห นำ, so asking for its
	// tone before lesson 15 asks for an answer the learner has no way to
	// reach. 43% of otherwise-verified words depend on a rule like this.
	it("withholds the tone card until the rules the word needs are taught", () => {
		const word: VocabEntry = {
			...testWordWithTones,
			thai: "หมี",
			specialRules: ["hor-nam"],
		};

		const withoutTheLesson = generateVocabCards(
			word,
			allWords,
			undefined,
			new Set<string>(),
		);
		expect(
			withoutTheLesson.find((c) => c.property === "toneIdentification"),
		).toBeUndefined();

		const withTheLesson = generateVocabCards(
			word,
			allWords,
			undefined,
			new Set(["hor-nam"]),
		);
		expect(
			withTheLesson.find((c) => c.property === "toneIdentification"),
		).toBeDefined();
	});

	it("needs every rule the word depends on, not just one", () => {
		const word: VocabEntry = {
			...testWordWithTones,
			thai: "ขนาด",
			specialRules: ["akson-nam", "unwritten-vowels"],
		};

		const partial = generateVocabCards(
			word,
			allWords,
			undefined,
			new Set(["unwritten-vowels"]),
		);

		expect(
			partial.find((c) => c.property === "toneIdentification"),
		).toBeUndefined();
	});

	it("gates nothing when no mastered set is supplied", () => {
		const word: VocabEntry = {
			...testWordWithTones,
			thai: "หมี",
			specialRules: ["hor-nam"],
		};

		const cards = generateVocabCards(word, allWords);

		expect(
			cards.find((c) => c.property === "toneIdentification"),
		).toBeDefined();
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

	it("gives the spelling card the same mnemonic as the rest", () => {
		// Spelling cards were added later than the others and had their own
		// assertion, so they are worth keeping separately named: a mnemonic
		// that reached every card type except this one would still be wrong.
		const cards = generateVocabCards(testWordWithMnemonic, allWords);
		const spellingCard = cards.find((c) => c.property === "spelling");
		expect(spellingCard?.mnemonic).toBe(mnemonicTextFor(testWordWithMnemonic));
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

describe("the two derivation cards", () => {
	it("produces a toneRule card alongside the tone card when the rules reach the word", () => {
		const cards = generateVocabCards(testWordWithTones, [testWordWithTones]);
		const ruleCard = cards.find((c) => c.property === "toneRule");

		expect(ruleCard?.id).toBe("vocab:สวัสดี:toneRule");
		// The expected inputs, not the tones: high class + a dead short
		// syllable, then mid class + a live one.
		expect(ruleCard?.correctAnswer).toBe("high+dead-short|mid+live");
	});

	it("withholds the toneRule card where a taught rule would be marked wrong", () => {
		// The tone is *known* — so the tone card still stands — but no taught
		// rule produces it. Asking a learner to assemble a formula here would
		// mean marking a correct derivation wrong.
		const lexicalException: VocabEntry = {
			...testWordWithTones,
			syllables: [
				{
					...testWordWithTones.syllables[0]!,
					consonantClass: "low",
					vowel: null,
					finalConsonant: "ก",
					toneMark: null,
					// The rules give high for low class + dead short; stored as
					// rising makes this an exception by construction.
					tone: "rising",
				},
			],
		};
		const cards = generateVocabCards(lexicalException, [lexicalException]);

		expect(
			cards.find((c) => c.property === "toneIdentification"),
		).toBeDefined();
		expect(cards.find((c) => c.property === "toneRule")).toBeUndefined();
	});

	it("produces a tonePronunciation card only when there is a recording to compare against", () => {
		const withoutAudio = generateVocabCards(testWordWithTones, [
			testWordWithTones,
		]);
		expect(
			withoutAudio.find((c) => c.property === "tonePronunciation"),
		).toBeUndefined();

		const spoken: VocabEntry = {
			...testWordWithTones,
			thai_audio_file: "/audio/thai/sawatdi.mp3",
		};
		const card = generateVocabCards(spoken, [spoken]).find(
			(c) => c.property === "tonePronunciation",
		);
		expect(card?.audioUrl).toBe("/audio/thai/sawatdi.mp3");
	});

	it("makes no tone card of any kind for a word whose tones are unverified", () => {
		const unverified: VocabEntry = {
			...testWordWithTones,
			toneStatus: "unsegmented",
			thai_audio_file: "/audio/thai/sawatdi.mp3",
		};
		const properties = generateVocabCards(unverified, [unverified]).map(
			(c) => c.property,
		);

		expect(properties).not.toContain("toneIdentification");
		expect(properties).not.toContain("toneRule");
		expect(properties).not.toContain("tonePronunciation");
	});
});
