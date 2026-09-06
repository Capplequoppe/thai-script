import type { GrammarEntry } from "../../grammar/types";
import type { CompositionGameItem, RandomSource } from "../types";
import { sampleWithoutReplacement } from "./sampling";

type ExampleWithWords = GrammarEntry["examples"][number] & {
	words: NonNullable<GrammarEntry["examples"][number]["words"]>;
};

/**
 * The example a composition round builds from: the entry's own
 * `cards.application.correctExample`-indexed example if it carries a
 * `words` breakdown, falling back to the first example in `examples` that
 * does. `GrammarCardGenerator.ts` itself accesses `correctExample` with
 * `?.` for the same reason — the index can be out of range.
 */
function exampleWithWordsOf(entry: GrammarEntry): ExampleWithWords | null {
	const canonical = entry.examples[entry.cards.application.correctExample];
	if (canonical?.words) return canonical as ExampleWithWords;

	return (
		(entry.examples.find((example) => example.words) as
			| ExampleWithWords
			| undefined) ?? null
	);
}

/**
 * Builds a round of sentence-composition items from an already-filtered
 * set of unlocked `GrammarEntry` values (task 3.2 resolves "currently
 * unlocked" via `GrammarLessonService.getUnlockedGrammarPoints()` and
 * passes the result in) — this function is deliberately a plain function
 * over that array, not a `GameItemSource`: the interface promises
 * per-item card eligibility, and "unlocked" is a set-level computation
 * over prerequisites and a learned prefix, not that. See CONTEXT.md.
 *
 * An entry with no example carrying a `words` breakdown is excluded
 * rather than producing a broken item.
 */
export function selectCompositionRound(
	unlockedGrammarPoints: readonly GrammarEntry[],
	count: number,
	rng: RandomSource = Math.random,
): CompositionGameItem[] {
	const eligible: CompositionGameItem[] = [];

	for (const entry of unlockedGrammarPoints) {
		const example = exampleWithWordsOf(entry);
		if (!example) continue;

		const correctOrder = example.words.map((word) => word.thai);
		const tiles = sampleWithoutReplacement(correctOrder, correctOrder.length, {
			rng,
		});

		eligible.push({
			kind: "composition",
			grammarId: entry.id,
			englishMeaning: example.english,
			tiles,
			correctOrder,
			challengeDirection: "build",
		});
	}

	return sampleWithoutReplacement(eligible, count, { rng });
}
