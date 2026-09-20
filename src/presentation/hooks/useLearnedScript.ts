import { useMemo } from "react";
import { markRuleId } from "../../domain/script/data/memoryPalace";
import { ThaiSymbolClass } from "../../domain/script/data/symbols";
import { useApp } from "./useApp";

/**
 * A rule id as the palace names it, from the prefixed form the lesson summary
 * reports.
 *
 * `tone-rule:low-live` is `low-live`, and `tone-mark-rule:mai ek-mid` is
 * `mid-mai-ek`. The second is rebuilt through `markRuleId` rather than
 * rearranged by hand, so the palace's scenes and this cannot drift apart
 * without the builder changing under both.
 */
function palaceRuleId(summaryId: string): string | undefined {
	if (summaryId.startsWith("tone-rule:")) {
		return summaryId.slice("tone-rule:".length);
	}
	if (!summaryId.startsWith("tone-mark-rule:")) return undefined;

	const rest = summaryId.slice("tone-mark-rule:".length);
	const split = rest.lastIndexOf("-");
	if (split < 0) return undefined;
	const name = rest.slice(0, split);
	const consonantClass = rest.slice(split + 1);
	if (
		!Object.values(ThaiSymbolClass).includes(consonantClass as ThaiSymbolClass)
	) {
		return undefined;
	}
	return markRuleId(consonantClass as ThaiSymbolClass, name);
}

/**
 * Everything the learner has actually been taught, as sets keyed the way the
 * palace asks about them.
 *
 * Built from `completedLessons` through the same `getScriptSummary` the
 * learned-items and stage pages use, rather than from a second source of
 * truth. A palace that disagreed with the rest of the app about what is known
 * would be worse than one that showed everything: the learner would find a
 * letter in one place and not the other, and have no way to tell which was
 * lying.
 *
 * Sets rather than arrays because every caller asks "is this one known", not
 * "what is the nth".
 */
export interface LearnedScript {
	readonly consonants: ReadonlySet<string>;
	readonly vowels: ReadonlySet<string>;
	readonly toneMarks: ReadonlySet<string>;
	/**
	 * Tone rules and tone-mark rules together, named the way the palace's
	 * scenes name them — `low-live`, `mid-mai-ek`. The lesson summary reports
	 * them prefixed by which table they came from; that prefix is stripped
	 * here so there is one dialect on this side of the app.
	 */
	readonly toneRules: ReadonlySet<string>;
	/** The completed positions, for anything keyed on the lesson itself. */
	readonly lessons: ReadonlySet<number>;
	/** True before any lesson is finished — the palace is empty, not broken. */
	readonly nothingYet: boolean;
}

export function useLearnedScript(): LearnedScript {
	const { state, lesson } = useApp();

	return useMemo(() => {
		const consonants = new Set<string>();
		const vowels = new Set<string>();
		const toneMarks = new Set<string>();
		const toneRules = new Set<string>();

		for (const number of state.completedLessons) {
			// A completed position the sequence no longer has. `getScriptSummary`
			// throws on one, and nothing above this catches it — a stored state
			// carrying a single stale position took the whole page to a white
			// screen, palace and all.
			//
			// That is not reachable by finishing lessons, and it is one
			// resequence away: dropping a lesson shortens the sequence under
			// every learner who had already passed it. The rest of their
			// progress is intact and should still be shown, so the stale entry
			// is skipped rather than allowed to lose all of it.
			let summary: ReturnType<typeof lesson.getScriptSummary>;
			try {
				summary = lesson.getScriptSummary(number);
			} catch {
				continue;
			}
			for (const item of summary.consonants) consonants.add(item.character);
			for (const item of summary.vowels) vowels.add(item.character);
			for (const item of summary.toneMarks) toneMarks.add(item.character);
			for (const rule of summary.toneRules) {
				const id = palaceRuleId(rule.id);
				if (id) toneRules.add(id);
			}
		}

		return {
			consonants,
			vowels,
			toneMarks,
			toneRules,
			lessons: new Set(state.completedLessons),
			nothingYet:
				consonants.size === 0 && vowels.size === 0 && toneRules.size === 0,
		};
	}, [state.completedLessons, lesson]);
}
