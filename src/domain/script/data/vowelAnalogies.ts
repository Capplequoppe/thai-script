/**
 * Vowels a learner already owns, in a language they already speak.
 *
 * `symbols.ts` carries an English gloss for every vowel — "like EE in 'green'",
 * "like OO in 'boot'" — and English runs out in two different ways.
 *
 * It runs out **completely** on `ื`, where the gloss reaches for German 'über'.
 * That is the wrong vowel: German ü is front and rounded, Thai `ื` is back and
 * unrounded, which is as far apart as two high vowels get.
 *
 * And it runs out **quietly** on `เ`, `แ` and `โ`, where the gloss names an
 * English word that is close enough to read past. English *grey*, *go* and
 * *cat* are a diphthong, a diphthong and a different vowel. A learner who
 * copies them glides where Thai holds steady, and nothing in the lesson tells
 * them so. Swedish has all three as pure vowels.
 *
 * So this table exists for the vowels where Swedish is **better**, not merely
 * equal. `า`, `ี` and `อ` are left with their English glosses on purpose:
 * *father*, *green* and *saw* are exact, and a second way to say the same
 * thing is one more thing to read.
 *
 * **Every entry is supplied by a native speaker, never inferred.** Guessing a
 * phonetic equivalence in a language nobody here speaks produces a confident
 * wrong answer that a learner then practises, which is worse than the English
 * approximation it replaced.
 *
 * Short twins inherit from their long form rather than being listed
 * separately: `เ-อะ` is `เ-อ` cut short, which is what the `ะ` on the end
 * means, so recording it twice would be recording the formula twice.
 */

/** A Swedish vowel offered in place of an English approximation. */
export interface SwedishAnalogy {
	/** The vowel as a Swede would name it. */
	readonly vowel: string;
	/** Words the learner already says with that vowel in them. */
	readonly words: readonly [string, string];
	/**
	 * What to change, for a match that is close rather than exact.
	 *
	 * Present on `ื` alone. Everything else here is the same vowel, and saying
	 * "adjust it" about a sound that needs no adjustment would teach a wobble
	 * into a vowel the learner already has right.
	 */
	readonly adjust?: string;
}

/** Long-form vowels Swedish says better than English does. */
export const SWEDISH_ANALOGY: Readonly<Record<string, SwedishAnalogy>> =
	Object.freeze({
		// English "EY in British 'grey'" is /eɪ/ — it glides. Swedish e holds.
		เ: { vowel: "e", words: ["hel", "ek"] },

		// English "A in 'cat'" is /æ/, a different vowel entirely. Swedish ä is
		// the one Thai is asking for.
		แ: { vowel: "ä", words: ["äta", "läsa"] },

		// English "O in 'go'" is /əʊ/ — another glide. Swedish å holds.
		โ: { vowel: "å", words: ["båt", "gå"] },

		// Exact, and it earns its place by explaining the spelling: Swedish
		// writes this sound with an o, which is why the cellar's lodger is Ove.
		"ู": { vowel: "o", words: ["bok", "sol"] },

		// The one place English has nothing at all. Swedish u is central and
		// rounded where Thai is back and unrounded — the closest a learner can
		// start from, and near enough that the correction is one instruction.
		"ื": {
			vowel: "u",
			words: ["hus", "ut"],
			adjust: "say it with your lips unrounded — pulled back, not pushed out",
		},

		// เออ is /ɤː/ and Swedish ö is /øː/ — as close as the two languages come,
		// and far closer than "ER in 'her' with relaxed throat".
		"เ-อ": { vowel: "ö", words: ["öra", "söt"] },
	});

import { SHORTENER, STROKE_LENGTH_PAIR, vowelKey } from "./vowelParts";

/** A Swedish analogy, told whether the Thai vowel it was found for is short. */
export interface SwedishSound extends SwedishAnalogy {
	/** True when the vowel is the short twin of the form that was listed. */
	readonly cutShort: boolean;
}

/**
 * The Swedish equivalent for a vowel, if a speaker has given one.
 *
 * A short vowel falls through to its long twin, because the twin's sound cut
 * short is exactly what the written form says it is. Thai marks that twinning
 * two different ways and both are followed here: `ะ` on the end for the front
 * steps and the back yard, and the stroke for the roof and the cellar.
 *
 * Following only the first would leave `ึ` with nothing — the one vowel whose
 * English gloss gives up entirely.
 */
export function swedishFor(character: string): SwedishSound | undefined {
	const key = vowelKey(character);
	const direct = SWEDISH_ANALOGY[key];
	if (direct) return { ...direct, cutShort: false };

	const long = key.endsWith(SHORTENER)
		? key.slice(0, -SHORTENER.length)
		: STROKE_LENGTH_PAIR[key];
	if (!long) return undefined;

	const twin = SWEDISH_ANALOGY[long];
	return twin ? { ...twin, cutShort: true } : undefined;
}

/**
 * The analogy as a line to put under a vowel.
 *
 * Kept next to the data rather than in a component, because the phrasing is
 * part of the claim: "as in" says these are the same sound, and the adjustment
 * is appended rather than folded in, so a learner starts from the word they
 * already say and changes one thing about it.
 */
export function describeSwedish(sound: SwedishSound): string {
	const head = `${sound.vowel} as in ${sound.words.join(", ")}`;
	const withAdjustment = sound.adjust ? `${head} — ${sound.adjust}` : head;
	return sound.cutShort ? `${withAdjustment}, cut short` : withAdjustment;
}
