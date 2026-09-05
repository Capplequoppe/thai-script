import type { CardRepository } from "../../ports/CardRepository";
import { VocabCard } from "../../vocabulary/entities/VocabCard";
import type { VocabEntry, VocabProperty } from "../../vocabulary/types";
import type { GameCardPool, GameItemContent, GameItemSource } from "../types";

const VOCAB_PROPERTIES: ReadonlySet<VocabProperty> = new Set([
	"thaiToEnglish",
	"englishToThai",
	"audioRecognition",
	"toneIdentification",
	"spelling",
	"spellingFromAudio",
]);

/**
 * Parses a vocab card id of the shape `vocab:{thai}:{property}`, returning
 * the Thai word only when the shape and the trailing property are both
 * recognised. This is the only thing ever read off a card's own id — never
 * `promptWord`, which holds the Thai word for five `VocabProperty` values
 * but the *English* word for `englishToThai` (`VocabCardGenerator.ts`).
 */
function thaiWordFromCardId(id: string): string | null {
	const parts = id.split(":");
	if (parts.length !== 3) return null;
	const [prefix, thai, property] = parts;
	if (
		prefix !== "vocab" ||
		!thai ||
		!VOCAB_PROPERTIES.has(property as VocabProperty)
	) {
		return null;
	}
	return thai;
}

/**
 * Cards decide eligibility; the injected `VocabEntry[]` decides content — a
 * word's cards disagree with each other by design (`promptWord` means
 * different things under different `VocabProperty` values), so no
 * individual card's fields are safe to read as "the" Thai spelling or
 * English meaning. Matches `SymbolGameItemSource`'s split between
 * card-derived eligibility and data-derived content.
 */
export class WordGameItemSource implements GameItemSource {
	readonly pool: GameCardPool = "vocab";

	private readonly wordsByThai: ReadonlyMap<string, VocabEntry>;

	constructor(
		private readonly cards: CardRepository,
		words: readonly VocabEntry[],
	) {
		this.wordsByThai = new Map(words.map((word) => [word.thai, word]));
	}

	eligibleContent(): GameItemContent[] {
		const content: GameItemContent[] = [];
		const seen = new Set<string>();

		for (const card of this.cards.findAll("vocab")) {
			if (!(card instanceof VocabCard)) continue;

			const thai = thaiWordFromCardId(card.id);
			if (!thai || seen.has(thai)) continue;

			const entry = this.wordsByThai.get(thai);
			if (!entry) continue;
			seen.add(thai);

			content.push({
				kind: "word",
				thaiWord: entry.thai,
				englishMeaning: entry.english,
				audioUrl: entry.thai_audio_file ?? undefined,
			});
		}

		return content;
	}
}
