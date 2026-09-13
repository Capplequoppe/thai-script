import type {
	SessionCardSelectionInput,
	SessionCardSelector,
} from "../../shared/SessionCardSelector";
import type { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SentenceReviewCard } from "../entities/SentenceReviewCard";
import type { SentenceEntry, SentenceProperty } from "../types";

/**
 * How many distinct sentences one practice session may draw from.
 *
 * The cap is on *sentences*, not cards, because a sentence's two-to-four
 * cards are different exercises on the same material and belong together.
 * It exists at all because the sentence pool grows without bound — every
 * word the learner masters unlocks more sentences — so "review everything
 * due" makes session length a function of total vocabulary.
 */
export const DEFAULT_SENTENCE_BUDGET = 12;

/** Stable within-sentence card order; the session shuffles afterwards. */
const PROPERTY_ORDER: readonly SentenceProperty[] = [
	"readingComprehension",
	"listeningComprehension",
	"sentenceBuilding",
	"selfValidation",
];

/**
 * Chooses a sentence session by *coverage of the material* rather than by
 * per-card overdueness.
 *
 * A sentence is not the thing being learned — its words are, and those are
 * already scheduled by the vocabulary pool (being known is what unlocks the
 * sentence in the first place). What a sentence practises is the words in
 * combination, so the useful question is "which material has gone longest
 * without being seen in context", not "which card is most overdue".
 *
 * Two consequences fall out of asking it that way:
 *
 *  - **Near-duplicates stop clustering.** Similar sentences are similar
 *    because they share words; picking one credits those words, which
 *    collapses the score of everything sharing them. No similarity metric
 *    or threshold is involved.
 *  - **Ubiquitous function words stop driving selection.** A word carried
 *    by some sentence scheduled far ahead is already covered and adds
 *    nothing, so sentences carrying rare material outrank sentences built
 *    from `ครับ`/`ไม่`/`ดี`.
 *
 * Coverage is derived entirely from schedules already on disk — a card's
 * `nextReviewDate` is how long its material is spoken for — so this adds no
 * persisted state and needs no migration. Crediting is proportional to
 * success for free: a passed card pushes its date out by the new interval,
 * while a failed one is demoted to "due now" and therefore buys its words
 * no coverage at all. Material the learner got wrong stays stale and
 * returns in a *different* sentence.
 */
export class SentenceCoverageSelector implements SessionCardSelector {
	private readonly sentencesById: ReadonlyMap<string, SentenceEntry>;

	constructor(
		sentences: readonly SentenceEntry[],
		private readonly sentenceBudget: number = DEFAULT_SENTENCE_BUDGET,
	) {
		this.sentencesById = new Map(
			sentences.map((sentence) => [sentence.id, sentence]),
		);
	}

	select(input: SessionCardSelectionInput): ReviewableCard[] {
		const nowMs = Date.parse(input.now);
		if (Number.isNaN(nowMs)) {
			throw new Error(
				`SentenceCoverageSelector: unparseable now: ${input.now}`,
			);
		}

		const { dueBySentence, unattributed } = this.groupDueCards(input.dueCards);
		const coveredUntil = this.coverageHorizons(input.allCards);

		const chosen = this.pickSentences(dueBySentence, coveredUntil, nowMs);

		const selected: ReviewableCard[] = [];
		for (const sentenceId of chosen) {
			const cards = dueBySentence.get(sentenceId) ?? [];
			selected.push(...[...cards].sort(byProperty));
		}
		// Cards whose sentence is no longer in the shipped data can't be
		// scored, but they are genuinely due — appending beats dropping them
		// silently, and the budget slice below still bounds the session.
		selected.push(...unattributed);

		return input.maxCards === undefined
			? selected
			: selected.slice(0, input.maxCards);
	}

	private groupDueCards(dueCards: readonly ReviewableCard[]): {
		dueBySentence: Map<string, SentenceReviewCard[]>;
		unattributed: ReviewableCard[];
	} {
		const dueBySentence = new Map<string, SentenceReviewCard[]>();
		const unattributed: ReviewableCard[] = [];

		for (const card of dueCards) {
			const entry = this.entryFor(card);
			if (!entry || !(card instanceof SentenceReviewCard)) {
				unattributed.push(card);
				continue;
			}
			const group = dueBySentence.get(card.sentenceId);
			if (group) group.push(card);
			else dueBySentence.set(card.sentenceId, [card]);
		}

		return { dueBySentence, unattributed };
	}

	/**
	 * For every token, the furthest-out date any sentence carrying it is
	 * scheduled for — i.e. how long that material is already spoken for.
	 */
	private coverageHorizons(
		allCards: readonly ReviewableCard[],
	): Map<string, number> {
		const coveredUntil = new Map<string, number>();

		for (const card of allCards) {
			const entry = this.entryFor(card);
			if (!entry) continue;
			const until = Date.parse(card.schedule.nextReviewDate);
			if (Number.isNaN(until)) continue;

			for (const token of tokensOf(entry)) {
				const current = coveredUntil.get(token);
				if (current === undefined || until > current) {
					coveredUntil.set(token, until);
				}
			}
		}

		return coveredUntil;
	}

	/**
	 * Greedy weighted set cover: repeatedly take the sentence carrying the
	 * most uncovered material, then credit that material so the next pick
	 * can't lean on it again.
	 */
	private pickSentences(
		dueBySentence: ReadonlyMap<string, SentenceReviewCard[]>,
		coveredUntil: Map<string, number>,
		nowMs: number,
	): string[] {
		const candidates = [...dueBySentence.keys()].sort();
		const chosen: string[] = [];
		const taken = new Set<string>();
		const budget = Math.min(this.sentenceBudget, candidates.length);

		while (chosen.length < budget) {
			let best: string | null = null;
			let bestScore = Number.NEGATIVE_INFINITY;
			let bestDueAt = Number.POSITIVE_INFINITY;

			for (const sentenceId of candidates) {
				if (taken.has(sentenceId)) continue;
				const entry = this.sentencesById.get(sentenceId);
				if (!entry) continue;

				const score = coverageDeficitOf(entry, coveredUntil, nowMs);
				// Equal deficits leave nothing to distinguish candidates, so
				// fall back to the plain SRS question: which has been waiting
				// longest? (Ties beyond that go to the lowest id, so a session
				// is a function of state alone and tests can assert on it.)
				const dueAt = earliestDueAt(dueBySentence.get(sentenceId) ?? []);
				if (score > bestScore || (score === bestScore && dueAt < bestDueAt)) {
					best = sentenceId;
					bestScore = score;
					bestDueAt = dueAt;
				}
			}

			if (best === null) break;
			taken.add(best);
			chosen.push(best);

			const entry = this.sentencesById.get(best);
			if (!entry) continue;
			for (const token of tokensOf(entry)) {
				// Never pull a horizon backwards: material already spoken for
				// past `now` must not become *more* attractive because a
				// sentence carrying it was just picked.
				const current = coveredUntil.get(token);
				if (current === undefined || current < nowMs) {
					coveredUntil.set(token, nowMs);
				}
			}
		}

		return chosen;
	}

	private entryFor(card: ReviewableCard): SentenceEntry | undefined {
		if (!(card instanceof SentenceReviewCard)) return undefined;
		return this.sentencesById.get(card.sentenceId);
	}
}

/**
 * What a sentence teaches: its words, plus its grammar point when it has
 * one. The grammar point is a token in its own right so that three
 * sentences drilling one pattern with different vocabulary still compete
 * with each other, not just with sentences sharing their words.
 */
function tokensOf(entry: SentenceEntry): Set<string> {
	const tokens = new Set<string>(entry.words.map((word) => `word:${word}`));
	if (entry.grammarId) tokens.add(`grammar:${entry.grammarId}`);
	return tokens;
}

/**
 * How badly this sentence's material wants exposure, in summed milliseconds.
 *
 * Deliberately signed. A token scheduled into the future scores *negative* —
 * it is already spoken for, and a sentence built from such tokens teaches
 * nothing that isn't covered. That sign is what makes crediting proportional
 * to success without any extra bookkeeping:
 *
 *   passed (pushed out an interval)  →  strongly negative
 *   failed (demoted to "due now")    →  zero
 *   long uncovered                   →  strongly positive
 *
 * so material the learner got wrong outranks material they just got right,
 * and both lose to material nothing has covered in weeks. Clamping the
 * per-token term at zero would collapse the first two cases into a tie.
 *
 * The sum is bounded in practice: `SrsSchedule` caps an interval at 180
 * days, so no single token can swamp the rest.
 */
function coverageDeficitOf(
	entry: SentenceEntry,
	coveredUntil: ReadonlyMap<string, number>,
	nowMs: number,
): number {
	let total = 0;
	for (const token of tokensOf(entry)) {
		// A token absent from the map belongs to no scheduled card at all.
		// `nowMs` scores it neutral rather than infinite, which keeps the sum
		// finite and comparable.
		total += nowMs - (coveredUntil.get(token) ?? nowMs);
	}
	return total;
}

function earliestDueAt(cards: readonly ReviewableCard[]): number {
	let earliest = Number.POSITIVE_INFINITY;
	for (const card of cards) {
		const at = Date.parse(card.schedule.nextReviewDate);
		if (!Number.isNaN(at) && at < earliest) earliest = at;
	}
	return earliest;
}

function byProperty(a: SentenceReviewCard, b: SentenceReviewCard): number {
	const rank = (card: SentenceReviewCard) => {
		const index = PROPERTY_ORDER.indexOf(card.property as SentenceProperty);
		return index === -1 ? PROPERTY_ORDER.length : index;
	};
	const diff = rank(a) - rank(b);
	return diff !== 0 ? diff : a.id.localeCompare(b.id);
}
