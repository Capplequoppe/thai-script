import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import type { SentenceCard, SentenceEntry } from "../types";

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
	}
	return copy;
}

export function generateSentenceCards(entry: SentenceEntry): SentenceCard[] {
	const cards: SentenceCard[] = [];

	// 1. Reading comprehension (always)
	cards.push({
		id: `sentence:${entry.id}:readingComprehension`,
		sentenceId: entry.id,
		property: "readingComprehension",
		question: entry.thai,
		correctAnswer: entry.english,
		choices: shuffle([
			entry.english,
			...entry.cards.readingComprehension.distractors,
		]),
		srs: SrsSchedule.initial().toDTO(),
	});

	// 2. Listening comprehension (if audio exists)
	if (entry.thai_audio_file && entry.cards.listeningComprehension) {
		cards.push({
			id: `sentence:${entry.id}:listeningComprehension`,
			sentenceId: entry.id,
			property: "listeningComprehension",
			question: "Listen to the sentence. What does it mean?",
			correctAnswer: entry.english,
			choices: shuffle([
				entry.english,
				...entry.cards.listeningComprehension.distractors,
			]),
			srs: SrsSchedule.initial().toDTO(),
			audioUrl: entry.thai_audio_file,
		});
	}

	// 3. Sentence building (if audio exists)
	if (entry.thai_audio_file && entry.cards.sentenceBuilding) {
		const sentenceChars = [...entry.thai].filter((ch) => ch !== " ");
		const allChars = shuffle([
			...sentenceChars,
			...entry.cards.sentenceBuilding.characterDistractors,
		]);
		cards.push({
			id: `sentence:${entry.id}:sentenceBuilding`,
			sentenceId: entry.id,
			property: "sentenceBuilding",
			question: "Listen and build the sentence",
			correctAnswer: entry.thai,
			choices: allChars,
			srs: SrsSchedule.initial().toDTO(),
			audioUrl: entry.thai_audio_file,
		});
	}

	// 4. Self-validation (if audio exists)
	if (entry.thai_audio_file) {
		cards.push({
			id: `sentence:${entry.id}:selfValidation`,
			sentenceId: entry.id,
			property: "selfValidation",
			question: entry.english,
			correctAnswer: entry.thai,
			choices: [],
			srs: SrsSchedule.initial().toDTO(),
			audioUrl: entry.thai_audio_file,
		});
	}

	return cards;
}
