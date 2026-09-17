import { consonants, vowels } from "../../script/data/symbols";
import { normalizeFinalSound } from "../../script/services/ScriptCardGenerator";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import type { VocabEntry, VocabularyCard } from "../types";
import { toneRuleComponentsOf } from "./toneRuleComponents";
import { toneSyllablesOf } from "./toneSyllables";

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

/** Normalise a sound description string to its base phoneme for grouping. */
function normaliseSound(sound: string): string {
	return sound
		.replace(/\s*\(.*\)/, "")
		.trim()
		.toLowerCase();
}

/** Build a map from a consonant's normalised sound → sharing consonant characters. */
function buildConsonantConfusableMap(
	soundOf: (c: (typeof consonants)[number]) => string,
	normalise: (raw: string) => string,
	excludedKeys: ReadonlySet<string> = new Set(),
): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const c of consonants) {
		const key = normalise(soundOf(c));
		if (excludedKeys.has(key)) continue;
		const list = map.get(key) ?? [];
		list.push(c.character);
		map.set(key, list);
	}
	return map;
}

// Consonants sharing an initial sound (ข/ฃ/ค/ฅ/ฆ all "kh", etc.) are genuinely
// confusable when spelling from sound. So are consonants sharing a final
// sound (ด/ต/ฎ/ฏ/ถ/ฐ/ท/ธ/ศ/ษ/ส all "T-stop" as finals) — excluding the two
// catch-all labels that just mean "no shared final-sound behaviour", which
// would otherwise lump together unrelated consonants as false confusables.
const initialSoundConfusableMap = buildConsonantConfusableMap(
	(c) => c.initialSound,
	normaliseSound,
);
const finalSoundConfusableMap = buildConsonantConfusableMap(
	(c) => c.finalSound,
	normalizeFinalSound,
	new Set(["Not used as final", "Acts as vowel"]),
);

/** Fast character → consonant lookup. */
const charToConsonant = new Map(consonants.map((c) => [c.character, c]));

/**
 * A vowel's `character` sometimes models a compound form with a `-` (or a
 * leading space) standing in for the consonant slot, e.g. "เ-ะ". Only the
 * single-glyph entries (ะ, า, ิ, เ, …) are atomic characters that actually
 * appear on their own inside a word's text, so only those are usable as
 * spelling-grid tiles or distractors.
 */
function atomicVowelChar(character: string): string | null {
	const stripped = [...character.replaceAll("-", "").trim()];
	return stripped.length === 1 ? stripped[0] : null;
}

/** Build a map from a vowel's normalised sound → sharing atomic vowel characters. */
function buildVowelConfusableMap(): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const v of vowels) {
		const atomic = atomicVowelChar(v.character);
		if (!atomic) continue;
		const key = normaliseSound(v.sound);
		const list = map.get(key) ?? [];
		if (!list.includes(atomic)) list.push(atomic);
		map.set(key, list);
	}
	return map;
}

const vowelConfusableMap = buildVowelConfusableMap();

/** Fast character → vowel sound-group key lookup, atomic vowel characters only. */
const charToVowelSoundKey = new Map<string, string>();
for (const [key, chars] of vowelConfusableMap) {
	for (const ch of chars) charToVowelSoundKey.set(ch, key);
}

/** Every character (consonant or atomic vowel) that can appear as a spelling-grid tile. */
const allSpellingChars = [
	...new Set([
		...consonants.map((c) => c.character),
		...charToVowelSoundKey.keys(),
	]),
];

/**
 * Generate a shuffled character grid for a spelling quiz.
 *
 * Includes one tile per distinct character in the word — a repeated letter
 * (e.g. the two ส in "สวัสดี") gets a single tile, and the spelling-grid UI
 * lets that tile be tapped again for its later occurrence rather than
 * disabling it after one use — plus distractors, all kept distinct from the
 * word's own characters.
 *
 * Distractors are deliberately phonetically confusable — consonants sharing
 * the word's consonants' initial or final sound, and vowels sharing the
 * word's vowels' sound — rather than arbitrary noise, so the exercise drills
 * the exact sound-alike pairs a learner needs to tell apart. Any padding
 * needed to reach the minimum distractor count is drawn from characters
 * `introducedChars` says the learner has already seen (falling back to the
 * full alphabet only if that pool is too small to fill the minimum).
 */
function generateSpellingChoices(
	word: VocabEntry,
	introducedChars?: ReadonlySet<string>,
): string[] {
	const wordChars = [...word.thai].filter((ch) => ch !== " ");
	const wordCharSet = new Set(wordChars);
	const distractors = new Set<string>();
	const isUsable = (ch: string) =>
		!wordCharSet.has(ch) && (!introducedChars || introducedChars.has(ch));

	// Add confusable consonants (shared initial or final sound) for each
	// consonant in the word.
	for (const ch of wordChars) {
		const consonant = charToConsonant.get(ch);
		if (!consonant) continue;
		const groups = [
			initialSoundConfusableMap.get(normaliseSound(consonant.initialSound)),
			finalSoundConfusableMap.get(normalizeFinalSound(consonant.finalSound)),
		];
		for (const group of groups) {
			for (const confusable of group ?? []) {
				if (isUsable(confusable)) distractors.add(confusable);
			}
		}
	}

	// Add confusable vowels (shared sound) for each vowel character in the word.
	for (const ch of wordChars) {
		const key = charToVowelSoundKey.get(ch);
		if (!key) continue;
		for (const confusable of vowelConfusableMap.get(key) ?? []) {
			if (isUsable(confusable)) distractors.add(confusable);
		}
	}

	// Pad with characters the learner has already been introduced to if the
	// distractor pool is still too small, falling back to the full alphabet
	// when there aren't enough introduced characters to draw from yet.
	const MIN_DISTRACTORS = 3;
	const pools = introducedChars
		? [allSpellingChars.filter((c) => introducedChars.has(c)), allSpellingChars]
		: [allSpellingChars];
	for (const pool of pools) {
		if (pool.length === 0) continue;
		let attempts = 0;
		while (distractors.size < MIN_DISTRACTORS && attempts < pool.length * 5) {
			attempts++;
			const random = pool[Math.floor(Math.random() * pool.length)] as string;
			if (!wordCharSet.has(random)) distractors.add(random);
		}
		if (distractors.size >= MIN_DISTRACTORS) break;
	}

	// Shuffle
	const choices = [...wordCharSet, ...distractors];
	for (let i = choices.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[choices[i], choices[j]] = [choices[j] as string, choices[i] as string];
	}
	return choices;
}

export function generateVocabCards(
	word: VocabEntry,
	allWords: VocabEntry[],
	introducedChars?: ReadonlySet<string>,
	masteredSpecialRules?: ReadonlySet<string>,
): VocabularyCard[] {
	const thaiPool = allWords.map((w) => w.thai);
	const englishPool = allWords.map((w) => w.english);
	const mnemonic = word.mnemonic;

	const cards: VocabularyCard[] = [];

	// Thai -> English
	cards.push({
		id: `vocab:${word.thai}:thaiToEnglish`,
		promptWord: word.thai,
		property: "thaiToEnglish",
		question: "What does this word mean?",
		correctAnswer: word.english,
		choices: pickChoices(word.english, englishPool),
		mnemonic,
		srs: SrsSchedule.initial().toDTO(),
	});

	// English -> Thai
	cards.push({
		id: `vocab:${word.thai}:englishToThai`,
		promptWord: word.english,
		property: "englishToThai",
		question: `Which Thai word means "${word.english}"?`,
		correctAnswer: word.thai,
		choices: pickChoices(word.thai, thaiPool),
		mnemonic,
		srs: SrsSchedule.initial().toDTO(),
	});

	// Audio recognition (only if audio exists)
	if (word.thai_audio_file) {
		cards.push({
			id: `vocab:${word.thai}:audioRecognition`,
			promptWord: word.thai,
			property: "audioRecognition",
			question: "Listen to the audio. Which word is this?",
			correctAnswer: word.thai,
			choices: pickChoices(word.thai, thaiPool),
			mnemonic,
			srs: SrsSchedule.initial().toDTO(),
			audioUrl: word.thai_audio_file,
		});
	}

	// Tone identification. Two gates, and they answer different questions.
	//
	// `toneSyllablesOf` answers "are this word's tones known at all" — it
	// returns nothing unless the tone rules and the romanization agreed (see
	// `ToneStatus`).
	//
	// `masteredSpecialRules` answers "has the learner been shown the rules
	// this word needs" — หมี cannot be read without ห นำ, จันทร์ without
	// การันต์, คน without the unwritten vowel. Asking before those lessons
	// is asking for an answer the learner has been given no way to reach,
	// which is the whole failure this exists to prevent. Omitting the
	// argument gates nothing, so callers that predate this keep working; the
	// card is backfilled by `reconcileCards` once the lesson is done.
	const toneSyllables = toneSyllablesOf(word);
	const taughtEverythingNeeded =
		masteredSpecialRules === undefined ||
		// `?? []` rather than a bare access: the field is required on
		// `VocabEntry`, but `src/**/*.test.ts` is excluded from tsconfig, so a
		// fixture can omit it and only fail at runtime. Treating a missing
		// value as "no dependencies" keeps card generation working; the type
		// is what holds real data to the contract.
		(word.specialRules ?? []).every((rule) => masteredSpecialRules.has(rule));

	if (toneSyllables.length > 0 && taughtEverythingNeeded) {
		cards.push({
			id: `vocab:${word.thai}:toneIdentification`,
			promptWord: word.thai,
			property: "toneIdentification",
			question: "What is the tone of each syllable?",
			correctAnswer: toneSyllables.map((s) => s.tone).join("|"),
			choices: [],
			mnemonic,
			syllables: toneSyllables,
			srs: SrsSchedule.initial().toDTO(),
		});

		// Deriving the tone, as opposed to recalling it. A third gate on top
		// of the two above: `toneRuleComponentsOf` returns null unless the
		// taught rules actually reproduce every syllable's tone, so a learner
		// is never asked to assemble a formula whose correct answer the app
		// would then mark wrong. See that function for why the gate has to be
		// stricter than `toneSyllablesOf`'s.
		const ruleComponents = toneRuleComponentsOf(word);
		if (ruleComponents) {
			cards.push({
				id: `vocab:${word.thai}:toneRule`,
				promptWord: word.thai,
				property: "toneRule",
				question: "Which rule gives each syllable its tone?",
				correctAnswer: ruleComponents
					.map((c) => `${c.consonantClass}+${c.axisValue}`)
					.join("|"),
				choices: [],
				mnemonic,
				syllables: toneSyllables,
				srs: SrsSchedule.initial().toDTO(),
			});
		}

		// Saying the tone, scored against the reference recording. Gated on
		// that recording existing: roughly a third of the corpus has one, and
		// without it there is nothing to compare a learner's attempt to.
		if (word.thai_audio_file) {
			cards.push({
				id: `vocab:${word.thai}:tonePronunciation`,
				promptWord: word.thai,
				property: "tonePronunciation",
				question: "Say this word, then check your tones",
				correctAnswer: toneSyllables.map((s) => s.tone).join("|"),
				choices: [],
				mnemonic,
				syllables: toneSyllables,
				audioUrl: word.thai_audio_file,
				srs: SrsSchedule.initial().toDTO(),
			});
		}
	}

	// Spelling (always)
	cards.push({
		id: `vocab:${word.thai}:spelling`,
		promptWord: word.thai,
		property: "spelling",
		question: `Spell the Thai word for "${word.english}"`,
		correctAnswer: word.thai.replaceAll(" ", ""),
		choices: generateSpellingChoices(word, introducedChars),
		mnemonic,
		srs: SrsSchedule.initial().toDTO(),
		...(word.thai_audio_file && { audioUrl: word.thai_audio_file }),
	});

	// Spelling from audio (only if audio exists)
	if (word.thai_audio_file) {
		cards.push({
			id: `vocab:${word.thai}:spellingFromAudio`,
			promptWord: word.thai,
			property: "spellingFromAudio",
			question: "Listen and spell the word",
			correctAnswer: word.thai.replaceAll(" ", ""),
			choices: generateSpellingChoices(word, introducedChars),
			mnemonic,
			srs: SrsSchedule.initial().toDTO(),
			audioUrl: word.thai_audio_file,
		});
	}

	return cards;
}
