import { EaseFactor } from "../../srs/value-objects/EaseFactor";

/**
 * The subset of `SrsSchedule` stats weighting reads — the same three fields
 * `ReviewService.getCriticalItems` reads, via `CardRepository` directly
 * (see CONTEXT.md's "Reusing SRS stats for weak-item weighting").
 * `GameItemSelectionService` and `ReviewService` are siblings over that
 * port, not a chain — this module never imports `ReviewService`.
 */
export interface ScheduleStats {
	readonly easeFactor: number;
	readonly lapseCount: number;
	readonly repetitions: number;
}

/**
 * The stats a never-reviewed item (`repetitions === 0`) is scored as: the
 * default ease factor, no lapses — the weight a mid-range known item would
 * get, never the maximum a genuinely lapsed item can reach.
 * `DEFAULT_SRS_DATA.easeFactor` (2.0) sits *below* `EaseFactor.DEFAULT`
 * (2.5), so scoring a fresh card by its own raw fields would rank it as one
 * of the weakest items in the pool by construction — wrong, since it has
 * simply never been tested. This is not a hypothetical edge case: it is the
 * default state of every freshly-introduced item.
 */
const NEUTRAL_STATS: Pick<ScheduleStats, "easeFactor" | "lapseCount"> = {
	easeFactor: EaseFactor.DEFAULT,
	lapseCount: 0,
};

/**
 * Higher for a weaker item: lower ease factor, higher lapse count. Always
 * finite and `> 0`, so a pool of otherwise-identical items never collapses
 * `sampleWithoutReplacement`'s weighted draw to zero total weight.
 */
export function itemWeight(stats: ScheduleStats): number {
	const { easeFactor, lapseCount } =
		stats.repetitions === 0 ? NEUTRAL_STATS : stats;
	return 1 + (EaseFactor.MAX - easeFactor) + lapseCount;
}

/**
 * The representative stats for an item backed by more than one card: the
 * worst-performing card's (lowest ease factor). The game drills the
 * symbol/word as a whole, and averaging several cards together would dilute
 * a single badly-lapsed property with several well-known ones. `undefined`
 * for an empty list — callers only call this for items already known to
 * have at least one card.
 */
export function worstStats(
	stats: readonly ScheduleStats[],
): ScheduleStats | undefined {
	return stats.reduce<ScheduleStats | undefined>(
		(worst, current) =>
			!worst || current.easeFactor < worst.easeFactor ? current : worst,
		undefined,
	);
}
