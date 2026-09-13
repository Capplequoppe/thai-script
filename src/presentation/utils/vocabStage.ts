import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import type { VocabularyCard } from "../../domain/vocabulary/types";

const STAGE_ORDER = ["Apprentice", "Guru", "Master", "Enlightened", "Burned"];

/**
 * The most-advanced SRS stage across a word's vocab cards (a word has one
 * card per quizzed property — thaiToEnglish, spelling, tone, etc. — this is
 * the single stage a list view shows for the word as a whole). "Apprentice"
 * for a word with no cards yet.
 */
export function bestVocabStage(
	thai: string,
	vocabCards: Record<string, VocabularyCard>,
): string {
	const cards = Object.values(vocabCards).filter(
		(c) => c.id.split(":")[1] === thai,
	);
	if (cards.length === 0) return "Apprentice";

	const stages = cards.map((c) =>
		SrsStage.fromScheduleData(c.srs.learningStep, c.srs.interval),
	);
	const best = stages.reduce((a, b) =>
		STAGE_ORDER.indexOf(b.name) > STAGE_ORDER.indexOf(a.name) ? b : a,
	);
	return best.name;
}
