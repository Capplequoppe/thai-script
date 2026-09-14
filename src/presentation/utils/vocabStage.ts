import type { PropertyCard } from "../../domain/shared/types";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import type { VocabularyCard } from "../../domain/vocabulary/types";

const STAGE_ORDER = ["Apprentice", "Guru", "Master", "Enlightened", "Burned"];

/** The most-advanced of a set of SRS stages, "Apprentice" for an empty set. */
function bestStageName(
	stages: { learningStep: number | null; interval: number }[],
): string {
	if (stages.length === 0) return "Apprentice";
	const named = stages.map((s) =>
		SrsStage.fromScheduleData(s.learningStep, s.interval),
	);
	const best = named.reduce((a, b) =>
		STAGE_ORDER.indexOf(b.name) > STAGE_ORDER.indexOf(a.name) ? b : a,
	);
	return best.name;
}

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
	return bestStageName(cards.map((c) => c.srs));
}

/**
 * The most-advanced SRS stage across a single symbol's own script cards
 * (sound, class, initial-sound, …) — a symbol has one card per quizzed
 * property, same shape as `bestVocabStage`. This is the character's OWN
 * mastery, independent of any word it appears inside: a syllable's
 * initial-consonant scaffolding fades on this, never on the containing
 * word's stage (see `WordCard`). "Apprentice" for a symbol with no cards yet.
 */
export function bestScriptStage(
	character: string,
	scriptCards: Record<string, PropertyCard>,
): string {
	const cards = Object.values(scriptCards).filter(
		(c) => c.symbolCharacter === character,
	);
	return bestStageName(cards.map((c) => c.srs));
}
