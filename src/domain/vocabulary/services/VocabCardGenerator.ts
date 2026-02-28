import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import type { VocabEntry, VocabularyCard } from "../types";

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
// Public API
// ---------------------------------------------------------------------------

export function generateVocabCards(
	word: VocabEntry,
	allWords: VocabEntry[],
): VocabularyCard[] {
	const thaiPool = allWords.map((w) => w.thai);
	const englishPool = allWords.map((w) => w.english);

	const cards: VocabularyCard[] = [];

	// Thai -> English
	cards.push({
		id: `vocab:${word.thai}:thaiToEnglish`,
		wordThai: word.thai,
		property: "thaiToEnglish",
		question: "What does this word mean?",
		correctAnswer: word.english,
		choices: pickChoices(word.english, englishPool),
		srs: SrsSchedule.initial().toDTO(),
	});

	// English -> Thai
	cards.push({
		id: `vocab:${word.thai}:englishToThai`,
		wordThai: word.thai,
		property: "englishToThai",
		question: `Which Thai word means "${word.english}"?`,
		correctAnswer: word.thai,
		choices: pickChoices(word.thai, thaiPool),
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
			srs: SrsSchedule.initial().toDTO(),
			audioUrl: word.thai_audio_file,
		});
	}

	return cards;
}
