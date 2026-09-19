import { consonantSceneFor } from "./consonantScenes";
import { deckPathForLesson } from "./lessonContent";
import { lessonEntryByNumber } from "./lessonSequence";
import { markRuleId } from "./memoryPalace";
import {
	consonants,
	type ThaiSymbolClass,
	toneMarkRules,
	toneRules,
	vowels,
} from "./symbols";

// ============================================================================
// Finding a thing's story
// ============================================================================
// A learner who opens ก in the market has met the chicken once, in a lesson
// they finished weeks ago. The decks carry no per-slide symbol reference, so
// the only offer the palace could make was the whole lesson from its first
// slide — which is a twenty-minute answer to a ten-second question.
//
// `docs/slide-tags.md` is the authoring convention. This is the reading end:
// given a letter, a vowel or a tone rule, where its story lives and what to
// ask the deck for.
//
// Slugs rather than glyphs, for the reasons that document records — `อ` is
// both a consonant and a vowel, four roof vowels carry a placeholder space,
// and `อ (as vowel)` carries an English gloss.

/** Where a story lives: which deck, and which tag selects its slides. */
export interface Story {
	readonly lessonId: string;
	readonly deckPath: string;
	readonly tag: string;
}

/** A vowel's name as a slug, matching what `teaches:` is authored with. */
export function vowelTag(name: string): string {
	return name.trim().replace(/\s+/g, "-");
}

/**
 * The deck a lesson number's story is in.
 *
 * Two integer spaces meet here and stopped being the same number at position
 * 15: `symbols.ts` files a symbol under a **legacy** lesson number, while
 * routes and progress speak **positions**. This takes the legacy number,
 * which is what the symbol tables hold.
 */
function deckFor(
	legacyNumber: number | undefined,
): { lessonId: string; deckPath: string } | undefined {
	if (legacyNumber === undefined) return undefined;
	const entry = lessonEntryByNumber(legacyNumber);
	if (!entry) return undefined;
	const path = deckPathForLesson(entry.id);
	return path.ok ? { lessonId: entry.id, deckPath: path.path } : undefined;
}

/** Where a consonant's story is, or nothing for a letter no lesson introduces. */
export function storyForConsonant(character: string): Story | undefined {
	const scene = consonantSceneFor(character);
	if (!scene) return undefined;
	const consonant = consonants.find((item) => item.character === character);
	const deck = deckFor(consonant?.lesson);
	return deck ? { ...deck, tag: scene.id } : undefined;
}

/** Where a vowel's story is, keyed on the character as `symbols.ts` stores it. */
export function storyForVowel(character: string): Story | undefined {
	const vowel = vowels.find((item) => item.character === character);
	if (!vowel) return undefined;
	const deck = deckFor(vowel.lesson);
	return deck ? { ...deck, tag: vowelTag(vowel.name) } : undefined;
}

/**
 * Where a tone rule's story is, for either kind of rule.
 *
 * `ruleId` is the palace's dialect — `low-live` for a spelling rule and
 * `mid-mai-ek` for a mark rule, which is what `ALL_RULE_IDS` holds and what
 * the scenes' `covers` lists name.
 */
export function storyForToneRule(ruleId: string): Story | undefined {
	const spelling = toneRules.find((rule) => rule.id === ruleId);
	if (spelling) {
		const deck = deckFor(spelling.lesson);
		return deck ? { ...deck, tag: ruleId } : undefined;
	}

	const mark = toneMarkRules.find(
		(rule) =>
			markRuleId(rule.consonantClass as ThaiSymbolClass, rule.toneMarkName) ===
			ruleId,
	);
	if (!mark) return undefined;
	const deck = deckFor(mark.lesson);
	return deck ? { ...deck, tag: ruleId } : undefined;
}
