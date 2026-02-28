import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import type { GrammarCard, GrammarEntry } from "../types";

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
	}
	return copy;
}

export function generateGrammarCards(entry: GrammarEntry): GrammarCard[] {
	const recognition: GrammarCard = {
		id: `grammar:${entry.id}:recognition`,
		grammarId: entry.id,
		property: "recognition",
		question: entry.cards.recognition.question,
		correctAnswer: entry.cards.recognition.correctAnswer,
		choices: shuffle([
			entry.cards.recognition.correctAnswer,
			...entry.cards.recognition.distractors,
		]),
		srs: SrsSchedule.initial().toDTO(),
	};

	const correctSentence =
		entry.examples[entry.cards.application.correctExample]?.thai;
	const application: GrammarCard = {
		id: `grammar:${entry.id}:application`,
		grammarId: entry.id,
		property: "application",
		question: entry.cards.application.question,
		correctAnswer: correctSentence,
		choices: shuffle([
			correctSentence,
			...entry.cards.application.incorrectExamples,
		]),
		srs: SrsSchedule.initial().toDTO(),
	};

	return [recognition, application];
}
