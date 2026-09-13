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

/**
 * Staleness assigned to material the learner has never been shown, so that
 * it outranks anything they have seen while keeping every score finite.
 */
const NEVER_SEEN_STALENESS_MS = 365 * 24 * 60 * 60_000;

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
 *  - **Ubiquitous function words stop driving selection.** A word exercised
 *    by any recent sentence is fresh and contributes nothing, so sentences
 *    carrying neglected material outrank sentences built from
 *    `ครับ`/`ไม่`/`ดี`.
 *
 * Staleness is read from `lastReviewDate` on cards already on disk, so this
 * adds no persisted state and needs no migration.
 *
 * **Recency ranks; the scheduler still gates.** This decides the order of
 * what is already due — `ReviewService` hands it the due set, and a card the
 * SRS is not asking for cannot be chosen however stale its words. That split
 * is deliberate: "when is this at risk of being forgotten" and "how long
 * since the learner exercised this pattern" are different questions on
 * different clocks, and an earlier version of this class answered both from
 * `nextReviewDate`. The result was perverse — sentences ride the two-rung
 * `SENTENCE_LEARNING_STEPS` ladder, so one answered correctly came back ten
 * minutes later and outranked material untouched for a week, and a session
 * repeated 10 of its 12 sentences from the one before it.
 *
 * A sentence is a pattern to exercise, not a string to memorise; re-showing
 * one soon after the last time trains recitation of that sentence rather
 * than the grammar it demonstrates. Failing a sentence is therefore not a
 * reason to rank it up here — the SRS already brings a failed card back
 * sooner, and when it does, its words are exactly as stale as the schedule
 * says they are.
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
		const lastSeen = this.lastSeenByToken(input.allCards);

		const chosen = this.pickSentences(dueBySentence, lastSeen, nowMs);

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
	 * For every token, when the learner last actually saw it in a sentence.
	 *
	 * `lastReviewDate`, not `nextReviewDate`: the question is "how long since
	 * this was exercised", which is a fact about the past. Reading it off the
	 * schedule instead conflates it with "when is this at risk of being
	 * forgotten" — a different question, answered on a different clock, and
	 * the source of the defect this replaced.
	 */
	private lastSeenByToken(
		allCards: readonly ReviewableCard[],
	): Map<string, number> {
		const lastSeen = new Map<string, number>();

		for (const card of allCards) {
			const entry = this.entryFor(card);
			if (!entry) continue;
			if (!card.schedule.lastReviewDate) continue;
			const seenAt = Date.parse(card.schedule.lastReviewDate);
			if (Number.isNaN(seenAt)) continue;

			for (const token of tokensOf(entry)) {
				const current = lastSeen.get(token);
				if (current === undefined || seenAt > current) {
					lastSeen.set(token, seenAt);
				}
			}
		}

		return lastSeen;
	}

	/**
	 * Greedy set cover: repeatedly take the sentence whose material has gone
	 * longest unseen, then mark that material seen so the next pick can't
	 * lean on it again.
	 */
	private pickSentences(
		dueBySentence: ReadonlyMap<string, SentenceReviewCard[]>,
		lastSeen: Map<string, number>,
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

				const score = stalenessOf(entry, lastSeen, nowMs);
				// Equal staleness leaves nothing to distinguish candidates, so
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
			// Mark this pick's material seen, exactly as answering it will, so
			// a near-duplicate later in the same session is ranked against it
			// on the same scale as a sentence practised in an earlier one.
			for (const token of tokensOf(entry)) {
				const current = lastSeen.get(token);
				if (current === undefined || current < nowMs) {
					lastSeen.set(token, nowMs);
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
 * How long this sentence's material has gone unseen, in milliseconds.
 *
 * The **mean** across its tokens, not the sum. A sum ranks by sentence
 * length once the per-token terms share a sign, which is exactly what went
 * wrong before: with a small known vocabulary every token carries a similar
 * term, so summing made a four-word sentence score four times whatever a
 * two-word one scored and the selector simply sorted by length. The mean
 * asks the question that was intended — "how stale is this sentence's
 * material, on average" — independently of how much material it holds.
 */
function stalenessOf(
	entry: SentenceEntry,
	lastSeen: ReadonlyMap<string, number>,
	nowMs: number,
): number {
	const tokens = tokensOf(entry);
	let total = 0;
	for (const token of tokens) {
		const seenAt = lastSeen.get(token);
		total +=
			seenAt === undefined
				? NEVER_SEEN_STALENESS_MS
				: Math.max(0, nowMs - seenAt);
	}
	return total / tokens.size;
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
