import type { VowelPosition } from "./symbols";

/**
 * Thai vowels are not thirty shapes. They are nineteen parts placed around the
 * consonant, and everything else follows from which parts a vowel has.
 *
 *     [ front ]   CONSONANT   [ above / below ]   [ back ]
 *
 * Ten of the thirty begin with `เ`, doing the same job every time. Nine end
 * with `ะ`, and that ending always means short. `แ` is `เ` written twice, and
 * its sound is the wider one — the shape is the mnemonic.
 *
 * The payoff is that **position stops being a fact to memorise**. A vowel is
 * written before the consonant because it contains `เ`; above because it
 * contains `ิ`. `symbols.ts` stores the position, and `vowelParts.test.ts`
 * asserts the stored value always equals the derived one — so the two cannot
 * drift, and a new vowel with an inconsistent position fails the suite rather
 * than teaching a learner to write a mark in the wrong place.
 *
 * That check has already earned itself. It found three short compounds —
 * `เ-ียะ`, `เ-ือะ` and `-ัวะ` — recorded as `around` while their long twins
 * carried precise positions. Adding `ะ` puts one more mark *behind* the
 * consonant and cannot move anything to the front; `-ัวะ` has nothing before
 * the consonant at all, and the symbol card was telling learners otherwise.
 */

/** Where a part sits relative to the consonant it attaches to. */
export type VowelSlot = "front" | "above" | "below" | "back";

/**
 * Every part, and where it goes.
 *
 * Exhaustive over the thirty vowels in `symbols.ts` — the test asserts that no
 * vowel contains a character missing from this table, so an unlisted part is a
 * failure rather than a silent mis-placement.
 */
export const PART_SLOT: Readonly<Record<string, VowelSlot>> = Object.freeze({
	// Before the consonant. You read them first and say them second, which is
	// the single most disorienting thing about the script.
	เ: "front",
	แ: "front",
	โ: "front",
	ใ: "front",
	ไ: "front",

	// On the roof.
	"ั": "above",
	"ิ": "above",
	"ี": "above",
	"ึ": "above",
	"ื": "above",
	"็": "above",
	"ํ": "above",
	ำ: "above",

	// In the cellar.
	"ุ": "below",
	"ู": "below",

	// Behind.
	ะ: "back",
	า: "back",
	อ: "back",
	ว: "back",
	ย: "back",
});

/** The mark that shortens whatever it is added to. */
export const SHORTENER = "ะ";

/**
 * The three pairs whose length is told by the stroke, not by `ะ`.
 *
 * `ะ` is a one-way rule and it does not reach the roof or the cellar: `ึ` is
 * short and carries no mark at all. What separates these pairs is the glyph —
 * the long one is the short one reaching further, a flag standing up on the
 * roof and a longer tail in the cellar.
 *
 * Recorded here because anything that walks from a short vowel to its long
 * form has to know it. Stripping `ะ` finds the front-steps family and
 * silently returns nothing for these three, which is how `ึ` — the one vowel
 * English cannot gloss at all — ends up with the least help of any of the
 * thirty.
 */
export const STROKE_LENGTH_PAIR: Readonly<Record<string, string>> =
	Object.freeze({
		"ิ": "ี",
		"ุ": "ู",
		"ึ": "ื",
	});

/**
 * Where each position lives in the vowels' house.
 *
 * Consonants are placed by class, because class decides tone. Vowels have no
 * class, so what places them is where they are written — and the page layout
 * becomes the floor plan, which means the learner never has to hold position
 * as a separate fact.
 *
 * They are lodgers, not residents: a vowel never stands alone, it attaches to
 * a consonant. That is the other thing beginners get wrong, and the metaphor
 * carries it without a rule.
 */
export const ROOM_FOR_POSITION: Readonly<Record<VowelPosition, string>> =
	Object.freeze({
		left: "the front steps",
		above: "the roof",
		below: "the cellar",
		right: "the back yard",
		around: "the veranda that wraps the house",
		"left-above": "the front steps and the roof",
		"left-above-right": "the roof and the veranda — the whole house",
	});

/**
 * The parts a written vowel is made of, in writing order.
 *
 * `-` is the consonant's place in the stored notation (`เ-ือะ`), and
 * `อ (as vowel)` carries an English gloss that is not part of the spelling.
 */
export function partsOf(character: string): string[] {
	return [...character.replace(" (as vowel)", "")].filter(
		(part) => part !== "-" && part.trim() !== "",
	);
}

/**
 * A vowel's character with the notation stripped off, for use as a key.
 *
 * Stored characters carry two pieces of presentation. `อ (as vowel)` has an
 * English gloss glued to it, and four of the roof vowels are written with a
 * leading space — the placeholder convention `thaiText.ts` documents, which
 * gives a combining mark something to sit on. `" ี"` and `"ี"` are the same
 * vowel, and a lookup that does not know it returns nothing at all rather
 * than reporting a miss.
 */
export function vowelKey(character: string): string {
	return character.replace(" (as vowel)", "").trim();
}

/** Where a vowel is written, derived from its parts alone. */
export function positionFromParts(parts: readonly string[]): VowelPosition {
	const slots = new Set(parts.map((part) => PART_SLOT[part]));
	const front = slots.has("front");
	const above = slots.has("above");
	const below = slots.has("below");
	const back = slots.has("back");

	// Ordered most specific first: a vowel with parts in three places is not
	// merely "around", and saying so is what tells a learner where to put the
	// pen.
	if (front && above && back) return "left-above-right";
	if (front && above) return "left-above";
	if (front && back) return "around";
	if (front) return "left";
	if (above) return "above";
	if (below) return "below";
	return "right";
}

/**
 * Whether the written form itself says the vowel is short.
 *
 * One-way, and the direction matters. A `ะ` on the end always means short —
 * nine of nine, no counterexamples. Its absence means nothing: nine short
 * vowels do not carry it (`ั ิ ุ ึ ็ ำ ไ ใ เ-า`), and those are the set a
 * learner simply has to know.
 */
export function isMarkedShort(character: string): boolean {
	return character.includes(SHORTENER);
}
