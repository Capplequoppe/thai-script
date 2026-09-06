import type { CardRepository } from "../../ports/CardRepository";
import { VocabCard } from "../../vocabulary/entities/VocabCard";
import { toneSyllablesOf } from "../../vocabulary/services/toneSyllables";
import type { VocabEntry, VocabProperty } from "../../vocabulary/types";
import type { ToneItemContent } from "../types";

/**
 * Anchored to the typed `VocabProperty` union, unlike `VocabCard.property`
 * itself which is untyped `string` — see `WordGameItemSource`'s
 * id-parse-and-validate approach for the same reason.
 */
const TONE_PROPERTY: VocabProperty = "toneIdentification";

/**
 * Parses a tone-identification card id of the shape
 * `vocab:{thai}:toneIdentification`, returning the Thai word only when the
 * shape matches. Mirrors `WordGameItemSource`'s `thaiWordFromCardId` — the
 * only thing ever read off the card is its id, never `promptWord` or
 * `syllables`, both of which are unsafe to read generically (see
 * CONTEXT.md).
 */
function thaiWordFromToneCardId(id: string): string | null {
	const parts = id.split(":");
	if (parts.length !== 3) return null;
	const [prefix, thai, property] = parts;
	if (prefix !== "vocab" || !thai || property !== TONE_PROPERTY) return null;
	return thai;
}

/**
 * Not a `GameItemSource`: tone practice is independent of pool selection
 * by design (CONTEXT.md), so it has no honest `pool` value and is never
 * added to `GameItemSelectionService`'s `sources` array. Instead it is
 * consulted through that service's own separate constructor parameter,
 * whenever `GameRoundConfig.includeTonePractice` is set, regardless of
 * `pools`.
 *
 * Eligibility comes from the `toneIdentification` `VocabCard`'s mere
 * existence — that a word has at least one syllable with a determinable
 * tone. Content — `thaiWord`, `syllables`, `audioUrl` — comes entirely
 * from the matching `VocabEntry`, never from the card: a card's own
 * `syllables` field can be `undefined` on cards persisted before that
 * field existed, and `promptWord` is already flagged elsewhere as unsafe
 * to read generically.
 */
export class ToneGameItemSource {
	private readonly wordsByThai: ReadonlyMap<string, VocabEntry>;

	constructor(
		private readonly cards: CardRepository,
		words: readonly VocabEntry[],
	) {
		this.wordsByThai = new Map(words.map((word) => [word.thai, word]));
	}

	eligibleContent(): ToneItemContent[] {
		const content: ToneItemContent[] = [];
		const seen = new Set<string>();

		for (const card of this.cards.findAll("vocab")) {
			if (!(card instanceof VocabCard)) continue;

			const thai = thaiWordFromToneCardId(card.id);
			if (!thai || seen.has(thai)) continue;

			const entry = this.wordsByThai.get(thai);
			if (!entry) continue;
			seen.add(thai);

			content.push({
				kind: "tone",
				thaiWord: entry.thai,
				syllables: toneSyllablesOf(entry),
				audioUrl: entry.thai_audio_file ?? undefined,
			});
		}

		return content;
	}
}
