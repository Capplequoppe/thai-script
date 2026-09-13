import type { CardRepository } from "../../ports/CardRepository";
import { VocabCard } from "../../vocabulary/entities/VocabCard";
import type { ToneMinimalPairGroup, VocabEntry } from "../../vocabulary/types";
import type { AudibleMinimalPairOption, MinimalPairOption } from "../types";

/**
 * One sound-alike group, narrowed to the words the learner has actually
 * been introduced to. Handed to `selectMinimalPairRound`, which turns each
 * into questions.
 *
 * `audibleMembers` is not a convenience — it is the difference between the
 * two halves of the exercise grid. A question that answers with a *clip*
 * can only offer words that have one; a question that answers with a tone
 * name or an English meaning only needs the target to be audible. Both
 * counts are therefore part of a group's eligibility, not one derived
 * number.
 */
export interface EligibleMinimalPairGroup {
	readonly groupKey: string;
	readonly members: readonly MinimalPairOption[];
	readonly audibleMembers: readonly AudibleMinimalPairOption[];
}

/**
 * Parses a vocab card id of the shape `vocab:{thai}:{property}`, returning
 * the Thai word only when the shape matches. Mirrors
 * `ToneGameItemSource`'s `thaiWordFromToneCardId` and
 * `WordGameItemSource`'s `thaiWordFromCardId`: the only thing ever read off
 * a card here is its id — never `promptWord`, which holds the *English*
 * word for the `englishToThai` property (`VocabCardGenerator.ts`).
 *
 * Any property counts. "Has the learner met this word" is a question about
 * the word, not about which of its six cards exist, and gating on a
 * particular property would make the mode's supply depend on an unrelated
 * card-generation detail.
 */
function thaiWordFromVocabCardId(id: string): string | null {
	const [prefix, thai] = id.split(":");
	if (prefix !== "vocab" || !thai) return null;
	return thai;
}

/**
 * Supplies the sound-alike groups a tone-pairs round can draw from.
 *
 * Not a `GameItemSource`, for the same reason `ToneGameItemSource` is not:
 * the interface promises the eligible content of one `GameCardPool`, and
 * "words the learner knows that sound like each other" is a set-level
 * computation across the vocab pool, not a partition of it. It is reached
 * through `PlayGameUseCase.startMinimalPairRound`, the way composition is
 * reached through `startCompositionRound`.
 *
 * Three independent facts have to line up before a group is eligible, and
 * each comes from the one place that owns it:
 *
 *  - **which words sound alike** — `tone-minimal-pairs.json`, generated
 *    offline from a phonemic transcription of the Thai script (see
 *    `scripts/generate-tone-minimal-pairs.py`; neither
 *    `VocabEntry.romanization`, which is two incompatible schemes in the
 *    shipped data, nor `VocabEntry.syllables`, which is a grapheme split,
 *    can decide this);
 *  - **which words the learner has met** — the existence of a `VocabCard`,
 *    exactly the eligibility rule every other vocab-backed source uses;
 *  - **what to show and play** — the `VocabEntry`, never a card.
 *
 * A group survives only if at least two of its learned members disagree
 * about tone. One learned member, or several that share a tone pattern, is
 * not a question anyone could get wrong for the right reason.
 */
export class MinimalPairGameItemSource {
	private readonly entriesByThai: ReadonlyMap<string, VocabEntry>;

	constructor(
		private readonly cards: CardRepository,
		words: readonly VocabEntry[],
		private readonly groups: readonly ToneMinimalPairGroup[],
	) {
		// First entry wins: `vocabulary.json` carries duplicate spellings
		// (บ้าน "house" and บ้าน "home"), and the file is rank-ordered, so
		// the first is the best-ranked reading of the word. The pairs file
		// deduped the same way when it was generated.
		const byThai = new Map<string, VocabEntry>();
		for (const word of words) {
			if (!byThai.has(word.thai)) byThai.set(word.thai, word);
		}
		this.entriesByThai = byThai;
	}

	eligibleGroups(): EligibleMinimalPairGroup[] {
		const learned = this.learnedThaiWords();
		const eligible: EligibleMinimalPairGroup[] = [];

		for (const group of this.groups) {
			const members: MinimalPairOption[] = [];

			for (const member of group.members) {
				if (!learned.has(member.thai)) continue;
				const entry = this.entriesByThai.get(member.thai);
				if (!entry) continue;

				members.push({
					thaiWord: entry.thai,
					englishMeaning: entry.english,
					tones: member.tones,
					audioUrl: entry.thai_audio_file ?? undefined,
				});
			}

			if (!hasContrastingTones(members)) continue;

			eligible.push({
				groupKey: group.key,
				members,
				audibleMembers: members.filter(isAudible),
			});
		}

		return eligible;
	}

	private learnedThaiWords(): Set<string> {
		const learned = new Set<string>();
		for (const card of this.cards.findAll("vocab")) {
			if (!(card instanceof VocabCard)) continue;
			const thai = thaiWordFromVocabCardId(card.id);
			if (thai) learned.add(thai);
		}
		return learned;
	}
}

/**
 * A type predicate rather than a bare `member.audioUrl` filter, so
 * `audibleMembers` carries the "has a clip" fact in its *type*. Everything
 * downstream — `selectMinimalPairRound`, and through it the two exercises
 * whose options are clips — then gets it from the compiler instead of a
 * cast that a later edit could quietly make false.
 */
function isAudible(
	option: MinimalPairOption,
): option is AudibleMinimalPairOption {
	return option.audioUrl !== undefined;
}

/** At least two members, disagreeing about tone. */
function hasContrastingTones(members: readonly MinimalPairOption[]): boolean {
	if (members.length < 2) return false;
	const patterns = new Set(members.map((member) => member.tones.join("-")));
	return patterns.size > 1;
}
