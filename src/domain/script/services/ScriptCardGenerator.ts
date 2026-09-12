import type {
	ConsonantProperty,
	NumeralProperty,
	PropertyCard,
	RareVowelProperty,
	ToneMarkProperty,
	VowelProperty,
} from "../../shared/types";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import {
	consonants,
	type RareVowel,
	rareVowels,
	type ThaiConsonant,
	type ThaiNumeral,
	ThaiSymbolClass,
	type ThaiToneMark,
	type ThaiVowel,
	type ToneMarkRule,
	type ToneRule,
	type ToneValue,
	thaiNumerals,
	toneMarkRules,
	toneMarks,
	toneRules,
	vowels,
} from "../data/symbols";

// ---------------------------------------------------------------------------
// Distractor Pools (built once from full data arrays)
// ---------------------------------------------------------------------------

const consonantCharPool = consonants.map((c) => c.character);
const consonantClassPool: string[] = Object.values(ThaiSymbolClass);
const deadLivePool = ["dead ending", "live ending"];
const consonantRomanizedPool = consonants.map((c) => c.nameRomanized);

// ---------------------------------------------------------------------------
// Sound Normalization
// ---------------------------------------------------------------------------
// symbol.ts stores verbose descriptions (e.g. "T-stop (tongue touches near
// teeth, no air released)"). For quizzing we normalize to short, unique labels
// so multiple-choice options are distinct and unambiguous.

function normalizeInitialSound(raw: string): string {
	// Extract the core sound before any parenthetical description
	const match = raw.match(/^([a-z]+)/i);
	if (!match) return raw;
	const core = match[1].toLowerCase();

	// Map to standardized labels
	const map: Record<string, string> = {
		g: "g",
		kh: "kh",
		ng: "ng",
		j: "j",
		ch: "ch",
		d: "d",
		dt: "dt",
		t: "t",
		th: "th",
		n: "n",
		b: "b",
		bp: "bp",
		p: "p",
		ph: "ph",
		f: "f",
		m: "m",
		y: "y",
		r: "r",
		l: "l",
		w: "w",
		s: "s",
		h: "h",
		silent: "silent",
	};

	return map[core] ?? raw;
}

export function normalizeFinalSound(raw: string): string {
	const lower = raw.toLowerCase();
	// Check multi-word patterns first (before single-letter prefix matches)
	if (lower.includes("not used")) return "Not used as final";
	if (lower.includes("vowel")) return "Acts as vowel";
	if (lower.includes("like y") || lower.startsWith("i (")) return "Y-glide";
	if (lower.includes("adds slight") || lower.startsWith("o ("))
		return "W-glide";
	// Stop consonants
	if (lower.startsWith("k-stop")) return "K-stop";
	if (lower.startsWith("t-stop")) return "T-stop";
	if (lower.startsWith("p-stop")) return "P-stop";
	// Nasals/sonorants — ng before n to avoid false match
	if (lower.startsWith("ng")) return "NG";
	if (lower.startsWith("n")) return "N";
	if (lower.startsWith("m")) return "M";
	return raw;
}

const normalizedInitialSoundPool = [
	...new Set(consonants.map((c) => normalizeInitialSound(c.initialSound))),
];
const normalizedFinalSoundPool = [
	...new Set(consonants.map((c) => normalizeFinalSound(c.finalSound))),
];

const vowelCharPool = vowels.map((v) => v.character);
const vowelLengthPool = ["short", "long"];
const vowelPositionPool = [...new Set(vowels.map((v) => v.position))];

const toneMarkCharPool = toneMarks.map((t) => t.character);
const toneValuePool: ToneValue[] = ["mid", "low", "falling", "high", "rising"];

const rareVowelNamePool = rareVowels.map((v) => v.name);
const rareVowelPronunciationPool = rareVowels.map((v) => v.pronunciation);

const numeralValuePool = thaiNumerals.map((n) => String(n.arabic));
const numeralWordPool = thaiNumerals.map((n) => n.word);
const numeralRomanizationPool = thaiNumerals.map((n) => n.romanization);

// ---------------------------------------------------------------------------
// Utility: Pick multiple-choice options
// ---------------------------------------------------------------------------

function pickChoices(correct: string, pool: string[], count = 4): string[] {
	const distractors = pool.filter((item) => item !== correct);
	const needed = Math.min(count - 1, distractors.length);

	// Fisher-Yates partial shuffle to pick `needed` items
	const copy = [...distractors];
	for (let i = copy.length - 1; i > copy.length - 1 - needed && i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j] as string, copy[i] as string];
	}
	const picked = copy.slice(copy.length - needed);

	// Combine with correct answer and shuffle
	const choices = [...picked, correct];
	for (let i = choices.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[choices[i], choices[j]] = [choices[j] as string, choices[i] as string];
	}

	return choices;
}

// ---------------------------------------------------------------------------
// Consonant Cards (5 per consonant)
// ---------------------------------------------------------------------------

function generateConsonantCards(c: ThaiConsonant): PropertyCard[] {
	const lesson = c.lesson ?? 0;
	const srs = SrsSchedule.initial().toDTO();

	const recognition: PropertyCard = {
		id: `${c.character}:recognition`,
		symbolCharacter: c.character,
		audioUrl: c.audioUrl,
		property: "recognition" as ConsonantProperty,
		question: `What is the name of this Thai consonant?`,
		correctAnswer: c.nameRomanized,
		choices: pickChoices(c.nameRomanized, consonantRomanizedPool),
		srs,
		lessonNumber: lesson,
		consonantClass: c.classType,
	};

	// No `consonantClass` here: this card's question IS "what class is this
	// consonant", so the glyph must render with no color hint.
	const classCard: PropertyCard = {
		id: `${c.character}:class`,
		symbolCharacter: c.character,
		audioUrl: c.audioUrl,
		property: "class" as ConsonantProperty,
		question: "What class is this consonant?",
		correctAnswer: c.classType,
		choices: pickChoices(c.classType, consonantClassPool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	const normalizedInitial = normalizeInitialSound(c.initialSound);
	const initialSound: PropertyCard = {
		id: `${c.character}:initialSound`,
		symbolCharacter: c.character,
		audioUrl: c.audioUrl,
		property: "initialSound" as ConsonantProperty,
		question: "What is the initial sound of this consonant?",
		correctAnswer: normalizedInitial,
		choices: pickChoices(normalizedInitial, normalizedInitialSoundPool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
		consonantClass: c.classType,
	};

	const normalizedFinal = normalizeFinalSound(c.finalSound);
	const finalSound: PropertyCard = {
		id: `${c.character}:finalSound`,
		symbolCharacter: c.character,
		audioUrl: c.audioUrl,
		property: "finalSound" as ConsonantProperty,
		question: "What is the final sound of this consonant?",
		correctAnswer: normalizedFinal,
		choices: pickChoices(normalizedFinal, normalizedFinalSoundPool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
		consonantClass: c.classType,
	};

	const deadLiveAnswer = c.hasDeadEnding ? "dead ending" : "live ending";
	const deadLive: PropertyCard = {
		id: `${c.character}:deadLive`,
		symbolCharacter: c.character,
		audioUrl: c.audioUrl,
		property: "deadLive" as ConsonantProperty,
		question: "Does this consonant have a dead or live ending?",
		correctAnswer: deadLiveAnswer,
		choices: pickChoices(deadLiveAnswer, deadLivePool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
		consonantClass: c.classType,
	};

	const cards = [recognition, classCard, initialSound, finalSound, deadLive];

	if (c.audioUrl) {
		cards.push({
			id: `${c.character}:audioRecognition`,
			symbolCharacter: "",
			audioUrl: c.audioUrl,
			property: "audioRecognition" as ConsonantProperty,
			question: "Listen and draw the symbol",
			correctAnswer: c.character,
			choices: pickChoices(c.character, consonantCharPool),
			srs: SrsSchedule.initial().toDTO(),
			lessonNumber: lesson,
			consonantClass: c.classType,
		});
	}

	return cards;
}

// ---------------------------------------------------------------------------
// Vowel Cards (3 per vowel)
// ---------------------------------------------------------------------------

function generateVowelCards(v: ThaiVowel): PropertyCard[] {
	const lesson = v.lesson ?? 0;

	const recognition: PropertyCard = {
		id: `${v.character}:recognition`,
		symbolCharacter: v.character,
		audioUrl: v.audioUrl,
		property: "recognition" as VowelProperty,
		question: `What is the name of this Thai vowel?`,
		correctAnswer: v.name,
		choices: pickChoices(
			v.name,
			vowels.map((x) => x.name),
		),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	const lengthCard: PropertyCard = {
		id: `${v.character}:length`,
		symbolCharacter: v.character,
		audioUrl: v.audioUrl,
		property: "length" as VowelProperty,
		question: "Is this vowel short or long?",
		correctAnswer: v.length,
		choices: pickChoices(v.length, vowelLengthPool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	const positionCard: PropertyCard = {
		id: `${v.character}:position`,
		symbolCharacter: v.character,
		audioUrl: v.audioUrl,
		property: "position" as VowelProperty,
		question: "Where is this vowel positioned relative to the consonant?",
		correctAnswer: v.position,
		choices: pickChoices(v.position, vowelPositionPool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	const cards = [recognition, lengthCard, positionCard];

	if (v.audioUrl) {
		cards.push({
			id: `${v.character}:audioRecognition`,
			symbolCharacter: "",
			audioUrl: v.audioUrl,
			property: "audioRecognition" as VowelProperty,
			question: "Listen and draw the symbol",
			correctAnswer: v.character,
			choices: pickChoices(v.character, vowelCharPool),
			srs: SrsSchedule.initial().toDTO(),
			lessonNumber: lesson,
		});
	}

	return cards;
}

// ---------------------------------------------------------------------------
// Tone Mark Cards (2 per mark)
// ---------------------------------------------------------------------------

function generateToneMarkCards(t: ThaiToneMark): PropertyCard[] {
	const lesson = t.lesson ?? 0;

	const recognition: PropertyCard = {
		id: `${t.character}:recognition`,
		symbolCharacter: t.character,
		audioUrl: t.audioUrl,
		property: "recognition" as ToneMarkProperty,
		question: `What is the name of this tone mark?`,
		correctAnswer: t.name,
		choices: pickChoices(
			t.name,
			toneMarks.map((x) => x.name),
		),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	const effects = [
		`Mid: ${t.midClassTone}`,
		t.highClassTone ? `High: ${t.highClassTone}` : null,
		t.lowClassTone ? `Low: ${t.lowClassTone}` : null,
	]
		.filter(Boolean)
		.join(", ");

	const effectPerClass: PropertyCard = {
		id: `${t.character}:effectPerClass`,
		symbolCharacter: t.character,
		audioUrl: t.audioUrl,
		property: "effectPerClass" as ToneMarkProperty,
		question: "What tones does this tone mark produce per consonant class?",
		correctAnswer: effects,
		choices: pickChoices(
			effects,
			toneMarks.map((m) => {
				const parts = [
					`Mid: ${m.midClassTone}`,
					m.highClassTone ? `High: ${m.highClassTone}` : null,
					m.lowClassTone ? `Low: ${m.lowClassTone}` : null,
				]
					.filter(Boolean)
					.join(", ");
				return parts;
			}),
		),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	const cards = [recognition, effectPerClass];

	if (t.audioUrl) {
		cards.push({
			id: `${t.character}:audioRecognition`,
			symbolCharacter: "",
			audioUrl: t.audioUrl,
			property: "audioRecognition" as ToneMarkProperty,
			question: "Listen and draw the symbol",
			correctAnswer: t.character,
			choices: pickChoices(t.character, toneMarkCharPool),
			srs: SrsSchedule.initial().toDTO(),
			lessonNumber: lesson,
		});
	}

	return cards;
}

// ---------------------------------------------------------------------------
// Rare Vowel Cards (3 per vowel — no audio, no consonant-relative position)
// ---------------------------------------------------------------------------

function generateRareVowelCards(v: RareVowel): PropertyCard[] {
	const lesson = v.lesson;

	const recognition: PropertyCard = {
		id: `${v.character}:recognition`,
		symbolCharacter: v.character,
		property: "recognition" as RareVowelProperty,
		question: "What is the name of this rare vowel?",
		correctAnswer: v.name,
		choices: pickChoices(v.name, rareVowelNamePool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	const pronunciation: PropertyCard = {
		id: `${v.character}:pronunciation`,
		symbolCharacter: v.character,
		property: "pronunciation" as RareVowelProperty,
		question: "How is this rare vowel pronounced?",
		correctAnswer: v.pronunciation,
		choices: pickChoices(v.pronunciation, rareVowelPronunciationPool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	const lengthCard: PropertyCard = {
		id: `${v.character}:length`,
		symbolCharacter: v.character,
		property: "length" as RareVowelProperty,
		question: "Is this vowel short or long?",
		correctAnswer: v.length,
		choices: pickChoices(v.length, vowelLengthPool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	return [recognition, pronunciation, lengthCard];
}

// ---------------------------------------------------------------------------
// Numeral Cards (3 per digit)
// ---------------------------------------------------------------------------

function generateNumeralCards(n: ThaiNumeral): PropertyCard[] {
	const lesson = n.lesson;

	const value: PropertyCard = {
		id: `${n.thai}:value`,
		symbolCharacter: n.thai,
		property: "value" as NumeralProperty,
		question: "What Arabic numeral is this Thai digit?",
		correctAnswer: String(n.arabic),
		choices: pickChoices(String(n.arabic), numeralValuePool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	const word: PropertyCard = {
		id: `${n.thai}:word`,
		symbolCharacter: n.thai,
		property: "word" as NumeralProperty,
		question: "What is the Thai word for this number?",
		correctAnswer: n.word,
		choices: pickChoices(n.word, numeralWordPool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	const romanization: PropertyCard = {
		id: `${n.thai}:romanization`,
		symbolCharacter: n.thai,
		property: "romanization" as NumeralProperty,
		question: "How is the Thai word for this number pronounced?",
		correctAnswer: n.romanization,
		choices: pickChoices(n.romanization, numeralRomanizationPool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: lesson,
	};

	return [value, word, romanization];
}

// ---------------------------------------------------------------------------
// Tone Rule Cards
// ---------------------------------------------------------------------------

function generateToneRuleCard(rule: ToneRule): PropertyCard {
	const question = `${rule.consonantClass} class consonant + ${rule.syllableType} syllable = what tone?`;

	return {
		id: `tone-rule:${rule.id}`,
		symbolCharacter: "",
		property: "toneRule",
		question,
		correctAnswer: rule.resultingTone,
		choices: pickChoices(rule.resultingTone, toneValuePool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: rule.lesson,
	};
}

function generateToneMarkRuleCard(rule: ToneMarkRule): PropertyCard {
	const question = `What tone does ${rule.toneMarkName} produce with a ${rule.consonantClass} class consonant?`;

	return {
		id: `tone-mark-rule:${rule.toneMarkName}-${rule.consonantClass}`,
		symbolCharacter: "",
		property: "toneRule",
		question,
		correctAnswer: rule.resultingTone,
		choices: pickChoices(rule.resultingTone, toneValuePool),
		srs: SrsSchedule.initial().toDTO(),
		lessonNumber: rule.lesson,
	};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateToneRuleCards(lesson: number): PropertyCard[] {
	const ruleCards = toneRules
		.filter((r) => r.lesson === lesson)
		.map(generateToneRuleCard);

	const markRuleCards = toneMarkRules
		.filter((r) => r.lesson === lesson)
		.map(generateToneMarkRuleCard);

	return [...ruleCards, ...markRuleCards];
}

export function generateCardsForLesson(lesson: number): PropertyCard[] {
	const consonantCards = consonants
		.filter((c) => c.lesson === lesson)
		.flatMap(generateConsonantCards);

	const vowelCards = vowels
		.filter((v) => v.lesson === lesson)
		.flatMap(generateVowelCards);

	const toneMarkCards = toneMarks
		.filter((t) => t.lesson === lesson)
		.flatMap(generateToneMarkCards);

	const rareVowelCards = rareVowels
		.filter((v) => v.lesson === lesson)
		.flatMap(generateRareVowelCards);

	const numeralCards = thaiNumerals
		.filter((n) => n.lesson === lesson)
		.flatMap(generateNumeralCards);

	const toneCards = generateToneRuleCards(lesson);

	return [
		...consonantCards,
		...vowelCards,
		...toneMarkCards,
		...rareVowelCards,
		...numeralCards,
		...toneCards,
	];
}
