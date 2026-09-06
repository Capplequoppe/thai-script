import { consonants } from "../../script/data/symbols";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import type { VocabEntry, VocabularyCard } from "../types";

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

/** Normalise an initialSound string to its base phoneme for grouping. */
function normaliseSound(sound: string): string {
	return sound
		.replace(/\s*\(.*\)/, "")
		.trim()
		.toLowerCase();
}

/** Build a map from base sound → set of consonant characters. */
function buildConfusableMap(): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const c of consonants) {
		const key = normaliseSound(c.initialSound);
		const list = map.get(key) ?? [];
		list.push(c.character);
		map.set(key, list);
	}
	return map;
}

const confusableMap = buildConfusableMap();

/** Fast character → consonant lookup. */
const charToConsonant = new Map(consonants.map((c) => [c.character, c]));

/**
 * Generate a shuffled character grid for a spelling quiz.
 *
 * Includes one tile per occurrence of each character in the word (so a
 * word with a repeated letter gets a tile for each occurrence — tapping a
 * tile only ever uses up that one tile, never blocks a later occurrence of
 * the same letter) plus phonetically confusable consonant distractors and
 * random padding characters, all kept distinct from the word's own
 * characters.
 */
function generateSpellingChoices(word: VocabEntry): string[] {
	const wordChars = [...word.thai].filter((ch) => ch !== " ");
	const wordCharSet = new Set(wordChars);
	const distractors = new Set<string>();

	// Add confusable consonants for each consonant in the word
	for (const ch of wordChars) {
		const consonant = charToConsonant.get(ch);
		if (!consonant) continue;
		const key = normaliseSound(consonant.initialSound);
		const group = confusableMap.get(key) ?? [];
		for (const confusable of group) {
			if (!wordCharSet.has(confusable)) distractors.add(confusable);
		}
	}

	// Pad with random characters if the distractor pool is too small
	const allChars = consonants.map((c) => c.character);
	const MIN_DISTRACTORS = 3;
	while (distractors.size < MIN_DISTRACTORS) {
		const random = allChars[
			Math.floor(Math.random() * allChars.length)
		] as string;
		if (!wordCharSet.has(random)) distractors.add(random);
	}

	// Shuffle
	const choices = [...wordChars, ...distractors];
	for (let i = choices.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[choices[i], choices[j]] = [choices[j] as string, choices[i] as string];
	}
	return choices;
}

export function generateVocabCards(
	word: VocabEntry,
	allWords: VocabEntry[],
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

	// Tone identification (only if at least one syllable has a tone)
	const toneSyllables = word.syllables
		.filter(
			(s): s is typeof s & { tone: string } => s.tone !== null && s.tone !== "",
		)
		.map((s) => ({ text: s.text, tone: s.tone }));

	if (toneSyllables.length > 0) {
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
	}

	// Spelling (always)
	cards.push({
		id: `vocab:${word.thai}:spelling`,
		promptWord: word.thai,
		property: "spelling",
		question: `Spell the Thai word for "${word.english}"`,
		correctAnswer: word.thai.replaceAll(" ", ""),
		choices: generateSpellingChoices(word),
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
			choices: generateSpellingChoices(word),
			mnemonic,
			srs: SrsSchedule.initial().toDTO(),
			audioUrl: word.thai_audio_file,
		});
	}

	return cards;
}
