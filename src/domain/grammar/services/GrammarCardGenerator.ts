import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import type { VocabEntry } from "../../vocabulary/types";
import type {
	ApplicationTemplate,
	GlossedWord,
	GrammarCard,
	GrammarEntry,
} from "../types";

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

function pickWord(
	wordClass: string,
	fallbackWordClasses: string[] | undefined,
	vocab: VocabEntry[],
	exclude: Set<string>,
): VocabEntry | null {
	const candidates = vocab.filter(
		(v) => v.word_class === wordClass && !exclude.has(v.thai),
	);
	if (candidates.length > 0) {
		return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
	}
	if (fallbackWordClasses) {
		for (const cls of fallbackWordClasses) {
			const fallback = vocab.filter(
				(v) => v.word_class === cls && !exclude.has(v.thai),
			);
			if (fallback.length > 0) {
				return fallback[Math.floor(Math.random() * fallback.length)] ?? null;
			}
		}
	}
	return null;
}

function fillSlots(
	template: ApplicationTemplate,
	vocab: VocabEntry[],
): Map<string, GlossedWord> | null {
	const used = new Set<string>();
	const slotWords = new Map<string, GlossedWord>();

	for (const slot of template.slots) {
		const word = pickWord(
			slot.wordClass,
			slot.fallbackWordClasses,
			vocab,
			used,
		);
		if (!word) return null;
		used.add(word.thai);
		slotWords.set(slot.role, { thai: word.thai, gloss: word.english });
	}

	return slotWords;
}

function assemblePhrase(
	slotOrder: string[],
	slotWords: Map<string, GlossedWord>,
	functionWords: ApplicationTemplate["functionWords"],
): GlossedWord[] {
	const words: GlossedWord[] = [];

	// Separate function words by placement type
	const insertAfterFws = functionWords.filter((fw) => fw.insertAfter);
	const positionFws = functionWords.filter((fw) => !fw.insertAfter);

	// Add "start" position function words
	for (const fw of positionFws) {
		if (fw.position === "start") {
			words.push({ thai: fw.thai, gloss: fw.gloss });
		}
	}

	for (const role of slotOrder) {
		// Add "before-verb" function words before verb slots
		if (role === "verb") {
			for (const fw of positionFws) {
				if (fw.position === "before-verb") {
					words.push({ thai: fw.thai, gloss: fw.gloss });
				}
			}
		}

		const w = slotWords.get(role);
		if (w) words.push(w);

		// Add insertAfter function words after the named role
		for (const fw of insertAfterFws) {
			if (fw.insertAfter === role) {
				words.push({ thai: fw.thai, gloss: fw.gloss });
			}
		}

		// Add "after-verb" function words after verb slots
		if (role === "verb") {
			for (const fw of positionFws) {
				if (fw.position === "after-verb") {
					words.push({ thai: fw.thai, gloss: fw.gloss });
				}
			}
		}

		// Add "after-adj" function words after adjective slots
		if (role === "adjective") {
			for (const fw of positionFws) {
				if (fw.position === "after-adj") {
					words.push({ thai: fw.thai, gloss: fw.gloss });
				}
			}
		}
	}

	// Add "end" position function words (only those without insertAfter)
	for (const fw of positionFws) {
		if (fw.position === "end") {
			words.push({ thai: fw.thai, gloss: fw.gloss });
		}
	}

	return words;
}

function generateDynamicApplication(
	template: ApplicationTemplate,
	vocab: VocabEntry[],
): { correctAnswer: string; choices: string[] } | null {
	const slotWords = fillSlots(template, vocab);
	if (!slotWords) return null;

	const correctOrder = template.slots.map((s) => s.role);
	const correctPhrase = assemblePhrase(
		correctOrder,
		slotWords,
		template.functionWords,
	);
	const correctAnswer = formatGlossed(correctPhrase);

	const distractors: string[] = [];
	for (const pattern of template.distractorPatterns) {
		const distractorPhrase = assemblePhrase(
			pattern,
			slotWords,
			template.functionWords,
		);
		const formatted = formatGlossed(distractorPhrase);
		if (formatted !== correctAnswer && !distractors.includes(formatted)) {
			distractors.push(formatted);
		}
	}

	// Try to reach 3 distractors with random shuffles, with a safety limit
	let attempts = 0;
	const maxAttempts = 100;
	while (distractors.length < 3 && attempts < maxAttempts) {
		attempts++;
		const shuffledRoles = shuffle(correctOrder);
		const phrase = assemblePhrase(
			shuffledRoles,
			slotWords,
			template.functionWords,
		);
		const formatted = formatGlossed(phrase);
		if (formatted !== correctAnswer && !distractors.includes(formatted)) {
			distractors.push(formatted);
		}
	}

	// Need exactly 3 distractors for a 4-choice card; fall back to static if not enough
	if (distractors.length < 3) return null;

	return {
		correctAnswer,
		choices: shuffle([correctAnswer, ...distractors.slice(0, 3)]),
	};
}

export function generateGrammarCards(
	entry: GrammarEntry,
	masteredVocab?: VocabEntry[],
): GrammarCard[] {
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

	let applicationData: {
		correctAnswer: string;
		choices: string[];
	} | null = null;

	if (entry.applicationTemplate && masteredVocab && masteredVocab.length > 0) {
		applicationData = generateDynamicApplication(
			entry.applicationTemplate,
			masteredVocab,
		);
	}

	if (!applicationData) {
		// Static fallback
		const correctExample =
			entry.examples[entry.cards.application.correctExample];
		const correctAnswer = correctExample?.words
			? formatGlossed(correctExample.words)
			: (correctExample?.thai ?? "");

		const incorrectChoices = entry.cards.application.incorrectExamples.map(
			(ex) => formatGlossed(ex.words),
		);

		applicationData = {
			correctAnswer,
			choices: shuffle([correctAnswer, ...incorrectChoices]),
		};
	}

	const application: GrammarCard = {
		id: `grammar:${entry.id}:application`,
		grammarId: entry.id,
		property: "application",
		question: entry.cards.application.question,
		correctAnswer: applicationData.correctAnswer,
		choices: applicationData.choices,
		srs: SrsSchedule.initial().toDTO(),
	};

	return [recognition, application];
}
