import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import type { GlossedWord, GrammarCard, GrammarEntry } from "../types";

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
	}
	return copy;
}

function formatGlossed(words: GlossedWord[]): string {
	return words.map((w) => `${w.thai}(${w.gloss})`).join(" ");
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

	const correctExample = entry.examples[entry.cards.application.correctExample];
	const correctAnswer = correctExample?.words
		? formatGlossed(correctExample.words)
		: correctExample?.thai;

	const incorrectChoices = entry.cards.application.incorrectExamples.map((ex) =>
		formatGlossed(ex.words),
	);

	const application: GrammarCard = {
		id: `grammar:${entry.id}:application`,
		grammarId: entry.id,
		property: "application",
		question: entry.cards.application.question,
		correctAnswer: correctAnswer,
		choices: shuffle([correctAnswer, ...incorrectChoices]),
		srs: SrsSchedule.initial().toDTO(),
	};

	return [recognition, application];
}
