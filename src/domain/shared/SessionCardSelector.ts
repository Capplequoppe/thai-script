import type { ReviewableCard } from "../srs/entities/ReviewableCard";

export interface SessionCardSelectionInput {
	/** The pool's due cards, as the repository reported them. */
	dueCards: readonly ReviewableCard[];
	/**
	 * Every card in the pool, due or not.
	 *
	 * A selector that spreads practice across *content* rather than across
	 * cards needs the not-due ones too: they are the record of what was
	 * recently covered, and a selector blind to them treats freshly
	 * practised material as untouched.
	 */
	allCards: readonly ReviewableCard[];
	/** The caller's hard cap on the returned card count, if it set one. */
	maxCards?: number;
	now: string;
}

/**
 * A pool-specific replacement for `ReviewService`'s default ordering
 * ("most overdue first, ties broken by lowest ease factor").
 *
 * That default is right for a pool whose cards *are* the thing being
 * remembered. It is wrong for a pool where each card is a vehicle for
 * something else — see `SentenceCoverageSelector`.
 *
 * Implementations must return a subset of `dueCards` — never a card the
 * repository did not report as due — and must honour `maxCards`.
 */
export interface SessionCardSelector {
	select(input: SessionCardSelectionInput): ReviewableCard[];
}
