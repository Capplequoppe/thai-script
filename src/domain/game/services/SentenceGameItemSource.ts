import type { CardRepository } from "../../ports/CardRepository";
import { SentenceReviewCard } from "../../sentence/entities/SentenceReviewCard";
import type { SentenceEntry } from "../../sentence/types";
import type { GameCardPool, GameItemContent, GameItemSource } from "../types";

/**
 * Cards decide eligibility; the injected `SentenceEntry[]` decides content —
 * a sentence's cards disagree with each other by design (a
 * `listeningComprehension` card and a `readingComprehension` card for the
 * same sentence ask and answer different things), so no individual card's
 * `question`/`correctAnswer` is safe to read as "the" Thai text or English
 * meaning. Matches `SymbolGameItemSource`/`WordGameItemSource`'s split
 * between card-derived eligibility and data-derived content.
 *
 * Every sentence in the shipped `sentences.json` has `thai_audio_file:
 * null` today, so every item this source produces is currently assigned
 * the `"reading"` direction by `assignDirection`. That is the permanent
 * audio-gated rule, not a workaround: adding sentence audio makes
 * `"listening"` reachable with no change here.
 */
export class SentenceGameItemSource implements GameItemSource {
	readonly pool: GameCardPool = "sentence";

	private readonly sentencesById: ReadonlyMap<string, SentenceEntry>;

	constructor(
		private readonly cards: CardRepository,
		sentences: readonly SentenceEntry[],
	) {
		this.sentencesById = new Map(
			sentences.map((sentence) => [sentence.id, sentence]),
		);
	}

	eligibleContent(): GameItemContent[] {
		const content: GameItemContent[] = [];
		const seen = new Set<string>();

		for (const card of this.cards.findAll("sentence")) {
			if (!(card instanceof SentenceReviewCard)) continue;
			if (seen.has(card.sentenceId)) continue;

			// A card whose sentence is no longer in the data is not eligible —
			// producing an item with empty content would be worse than
			// producing no item at all.
			const entry = this.sentencesById.get(card.sentenceId);
			if (!entry) continue;
			seen.add(card.sentenceId);

			content.push({
				kind: "sentence",
				sentenceId: entry.id,
				thaiText: entry.thai,
				englishMeaning: entry.english,
				audioUrl: entry.thai_audio_file ?? undefined,
			});
		}

		return content;
	}
}
