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
		wordThai: word.thai,
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
		wordThai: word.english,
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
			wordThai: word.thai,
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
		.filter((s): s is typeof s & { tone: string } => s.tone !== null && s.tone !== "")
		.map((s) => ({ text: s.text, tone: s.tone }));

	if (toneSyllables.length > 0) {
		cards.push({
			id: `vocab:${word.thai}:toneIdentification`,
			wordThai: word.thai,
			property: "toneIdentification",
			question: "What is the tone of each syllable?",
			correctAnswer: toneSyllables.map((s) => s.tone).join("|"),
			choices: [],
			mnemonic,
			syllables: toneSyllables,
			srs: SrsSchedule.initial().toDTO(),
		});
	}

	return cards;
}
