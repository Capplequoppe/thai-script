import { ScriptPropertyCard } from "../../script/entities/ScriptPropertyCard";
import type { RandomSource } from "../types";

const NOW = "2026-01-01T00:00:00.000Z";

/**
 * Three consonants that already exist in `symbols.ts` (`SymbolGameItemSource`
 * reads content from there, never from the card — see CONTEXT.md), each
 * given a distinct SRS history:
 *
 * - `WEAK_SYMBOL` — heavily lapsed, low ease factor.
 * - `STRONG_SYMBOL` — well-known, high ease factor, no lapses.
 * - `FRESH_SYMBOL` — never reviewed (`repetitions === 0`).
 *
 * Exported (with `weightedSeed` below) so task 3.1's own tests and task
 * 3.2's page-level test exercise the exact same weighted-sampling
 * expectation, rather than each deriving a fixture that might not actually
 * exhibit the bias it claims to.
 */
export const WEAK_SYMBOL = "ม";
export const STRONG_SYMBOL = "น";
export const FRESH_SYMBOL = "ง";

/** One `recognition` card for `symbolCharacter`, with a chosen SRS history. */
function scriptCard(
	symbolCharacter: string,
	srs: { easeFactor: number; lapseCount: number; repetitions: number },
): ScriptPropertyCard {
	return ScriptPropertyCard.fromDTO({
		id: `${symbolCharacter}-recognition`,
		question: `question for ${symbolCharacter}`,
		correctAnswer: "answer",
		choices: ["answer"],
		// `learningStep: null` (graduated) so `itemWeight` reads the ease
		// factor/lapse count fixed here, not a fresh card's in-learning ones.
		srs: {
			easeFactor: srs.easeFactor,
			interval: 10,
			repetitions: srs.repetitions,
			learningStep: null,
			nextReviewDate: NOW,
			lastReviewDate: NOW,
			lapseCount: srs.lapseCount,
		},
		symbolCharacter,
		property: "recognition",
		lessonNumber: 1,
	});
}

/**
 * One card per symbol above. `WEAK_SYMBOL`'s weight is far larger than the
 * other two combined (see `itemWeight.test.ts`), which is what makes
 * `weightedSeed` below a reliable "always draws the weak item first"
 * witness rather than a coin flip.
 */
export const WEAK_STRONG_FRESH_CARDS: readonly ScriptPropertyCard[] = [
	scriptCard(WEAK_SYMBOL, { easeFactor: 1.3, lapseCount: 4, repetitions: 5 }),
	scriptCard(STRONG_SYMBOL, { easeFactor: 2.8, lapseCount: 0, repetitions: 8 }),
	scriptCard(FRESH_SYMBOL, { easeFactor: 2.5, lapseCount: 0, repetitions: 0 }),
];

/**
 * A constant mid-range roll (`0.5`). `WEAK_SYMBOL`'s own weight is more
 * than double `STRONG_SYMBOL`'s and `FRESH_SYMBOL`'s combined, so the
 * cumulative sum `weightedIndex` (`sampling.ts`) walks through — the other
 * two items' weights, in *any* order — can never reach `0.5 * totalWeight`
 * before `WEAK_SYMBOL`'s own share does. A weighted draw against this
 * fixture therefore always lands on `WEAK_SYMBOL`, regardless of the
 * eligible items' draw order — unlike a roll near `0`, which would land on
 * whichever item happens to be *first*, proving nothing about weighting at
 * all.
 */
export function weightedSeed(): RandomSource {
	return () => 0.5;
}
