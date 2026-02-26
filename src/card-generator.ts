import type { PropertyCard, ConsonantProperty, VowelProperty, ToneMarkProperty } from "./types";
import { createSrsData } from "./srs";
import {
  consonants,
  vowels,
  toneMarks,
  toneRules,
  toneMarkRules,
  ThaiSymbolClass,
  type ThaiConsonant,
  type ThaiVowel,
  type ThaiToneMark,
  type ToneRule,
  type ToneMarkRule,
  type ToneValue,
} from "./symbol";

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
    g: "g", kh: "kh", ng: "ng", j: "j", ch: "ch",
    d: "d", dt: "dt", t: "t", th: "th", n: "n",
    b: "b", bp: "bp", p: "p", ph: "ph", f: "f",
    m: "m", y: "y", r: "r", l: "l", w: "w",
    s: "s", h: "h", silent: "silent",
  };

  return map[core] ?? raw;
}

function normalizeFinalSound(raw: string): string {
  const lower = raw.toLowerCase();
  // Check multi-word patterns first (before single-letter prefix matches)
  if (lower.includes("not used")) return "Not used as final";
  if (lower.includes("vowel")) return "Acts as vowel";
  if (lower.includes("like y") || lower.startsWith("i (")) return "Y-glide";
  if (lower.includes("adds slight") || lower.startsWith("o (")) return "W-glide";
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

const normalizedInitialSoundPool = [...new Set(consonants.map((c) => normalizeInitialSound(c.initialSound)))];
const normalizedFinalSoundPool = [...new Set(consonants.map((c) => normalizeFinalSound(c.finalSound)))];

const vowelCharPool = vowels.map((v) => v.character);
const vowelLengthPool = ["short", "long"];
const vowelPositionPool = [...new Set(vowels.map((v) => v.position))];

const toneMarkCharPool = toneMarks.map((t) => t.character);
const toneValuePool: ToneValue[] = ["mid", "low", "falling", "high", "rising"];

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
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  const picked = copy.slice(copy.length - needed);

  // Combine with correct answer and shuffle
  const choices = [...picked, correct];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j]!, choices[i]!];
  }

  return choices;
}

// ---------------------------------------------------------------------------
// Consonant Cards (5 per consonant)
// ---------------------------------------------------------------------------

function generateConsonantCards(c: ThaiConsonant): PropertyCard[] {
  const lesson = c.lesson ?? 0;
  const srs = createSrsData();

  const recognition: PropertyCard = {
    id: `${c.character}:recognition`,
    symbolCharacter: c.character,
    property: "recognition" as ConsonantProperty,
    question: `What is the name of this Thai consonant?`,
    correctAnswer: c.nameRomanized,
    choices: pickChoices(c.nameRomanized, consonantRomanizedPool),
    srs,
    lessonNumber: lesson,
  };

  const classCard: PropertyCard = {
    id: `${c.character}:class`,
    symbolCharacter: c.character,
    property: "class" as ConsonantProperty,
    question: `What class is this consonant (${c.nameRomanized})?`,
    correctAnswer: c.classType,
    choices: pickChoices(c.classType, consonantClassPool),
    srs: createSrsData(),
    lessonNumber: lesson,
  };

  const normalizedInitial = normalizeInitialSound(c.initialSound);
  const initialSound: PropertyCard = {
    id: `${c.character}:initialSound`,
    symbolCharacter: c.character,
    property: "initialSound" as ConsonantProperty,
    question: `What is the initial sound of ${c.nameRomanized}?`,
    correctAnswer: normalizedInitial,
    choices: pickChoices(normalizedInitial, normalizedInitialSoundPool),
    srs: createSrsData(),
    lessonNumber: lesson,
  };

  const normalizedFinal = normalizeFinalSound(c.finalSound);
  const finalSound: PropertyCard = {
    id: `${c.character}:finalSound`,
    symbolCharacter: c.character,
    property: "finalSound" as ConsonantProperty,
    question: `What is the final sound of ${c.nameRomanized}?`,
    correctAnswer: normalizedFinal,
    choices: pickChoices(normalizedFinal, normalizedFinalSoundPool),
    srs: createSrsData(),
    lessonNumber: lesson,
  };

  const deadLiveAnswer = c.hasDeadEnding ? "dead ending" : "live ending";
  const deadLive: PropertyCard = {
    id: `${c.character}:deadLive`,
    symbolCharacter: c.character,
    property: "deadLive" as ConsonantProperty,
    question: `Does ${c.nameRomanized} have a dead or live ending?`,
    correctAnswer: deadLiveAnswer,
    choices: pickChoices(deadLiveAnswer, deadLivePool),
    srs: createSrsData(),
    lessonNumber: lesson,
  };

  return [recognition, classCard, initialSound, finalSound, deadLive];
}

// ---------------------------------------------------------------------------
// Vowel Cards (3 per vowel)
// ---------------------------------------------------------------------------

function generateVowelCards(v: ThaiVowel): PropertyCard[] {
  const lesson = v.lesson ?? 0;

  const recognition: PropertyCard = {
    id: `${v.character}:recognition`,
    symbolCharacter: v.character,
    property: "recognition" as VowelProperty,
    question: `What is the name of this Thai vowel?`,
    correctAnswer: v.name,
    choices: pickChoices(
      v.name,
      vowels.map((x) => x.name),
    ),
    srs: createSrsData(),
    lessonNumber: lesson,
  };

  const lengthCard: PropertyCard = {
    id: `${v.character}:length`,
    symbolCharacter: v.character,
    property: "length" as VowelProperty,
    question: `Is this vowel (${v.name}) short or long?`,
    correctAnswer: v.length,
    choices: pickChoices(v.length, vowelLengthPool),
    srs: createSrsData(),
    lessonNumber: lesson,
  };

  const positionCard: PropertyCard = {
    id: `${v.character}:position`,
    symbolCharacter: v.character,
    property: "position" as VowelProperty,
    question: `Where is ${v.name} positioned relative to the consonant?`,
    correctAnswer: v.position,
    choices: pickChoices(v.position, vowelPositionPool),
    srs: createSrsData(),
    lessonNumber: lesson,
  };

  return [recognition, lengthCard, positionCard];
}

// ---------------------------------------------------------------------------
// Tone Mark Cards (2 per mark)
// ---------------------------------------------------------------------------

function generateToneMarkCards(t: ThaiToneMark): PropertyCard[] {
  const lesson = t.lesson ?? 0;

  const recognition: PropertyCard = {
    id: `${t.character}:recognition`,
    symbolCharacter: t.character,
    property: "recognition" as ToneMarkProperty,
    question: `What is the name of this tone mark?`,
    correctAnswer: t.name,
    choices: pickChoices(
      t.name,
      toneMarks.map((x) => x.name),
    ),
    srs: createSrsData(),
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
    property: "effectPerClass" as ToneMarkProperty,
    question: `What tones does ${t.character} (${t.name}) produce per consonant class?`,
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
    srs: createSrsData(),
    lessonNumber: lesson,
  };

  return [recognition, effectPerClass];
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
    srs: createSrsData(),
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
    srs: createSrsData(),
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

  const toneCards = generateToneRuleCards(lesson);

  return [...consonantCards, ...vowelCards, ...toneMarkCards, ...toneCards];
}
