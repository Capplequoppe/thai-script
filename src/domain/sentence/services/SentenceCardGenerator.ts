import {
	SENTENCE_LEARNING_STEPS,
	type SrsDataDTO,
	SrsSchedule,
} from "../../srs/value-objects/SrsSchedule";
import type { SentenceCard, SentenceEntry } from "../types";

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
	}
	return copy;
}

/**
 * Sentences are compositional recombinations of already-learned vocab, not
 * new atomic facts — a fresh sentence card only needs to survive the
 * 2-rung SENTENCE_LEARNING_STEPS ladder (not the default 4-rung one) before
 * graduating into the normal SM-2 interval.
 */
function initialSentenceSchedule(): SrsDataDTO {
	return SrsSchedule.initial(
		undefined,
		SENTENCE_LEARNING_STEPS,
		SENTENCE_LEARNING_STEPS,
		0,
	).toDTO();
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
		srs: initialSentenceSchedule(),
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
			srs: initialSentenceSchedule(),
			audioUrl: entry.thai_audio_file,
		});
	}

	// 3. Sentence spelling — always available. Tiles are just the sentence's
	// own characters (no distractors: `cards.sentenceBuilding` distractor
	// data is never populated in shipped content, and this exercise works
	// fine without it — putting the exact tiles in order is already a real
	// spelling test). The prompt is the English translation rather than
	// audio, since most sentences have none; when audio does exist it's
	// offered as an optional replay, not a requirement to generate the card.
	{
		const sentenceChars = shuffle([...entry.thai].filter((ch) => ch !== " "));
		cards.push({
			id: `sentence:${entry.id}:sentenceBuilding`,
			sentenceId: entry.id,
			property: "sentenceBuilding",
			question: entry.english,
			correctAnswer: entry.thai,
			choices: sentenceChars,
			srs: initialSentenceSchedule(),
			audioUrl: entry.thai_audio_file ?? undefined,
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
			srs: initialSentenceSchedule(),
			audioUrl: entry.thai_audio_file,
		});
	}

	return cards;
}
