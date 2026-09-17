import consonantSceneData from "./consonant-scenes.json";
import type { District } from "./sceneGrammar";

/**
 * The illustration for each consonant, and the word it is an illustration of.
 *
 * A Thai consonant is learned as its name — ม ม้า, mo *maa*, horse — so the
 * picture's subject is that word and not the glyph. The shape cue in
 * `symbols.ts` still carries the geometry for anyone who wants it; this is the
 * hook the geometry hangs on, and the hook has to be the animal.
 *
 * Keyed by the slug already used for the consonant's audio file, so a letter's
 * recording and its picture are named the same thing rather than by two
 * schemes that can drift.
 */
export interface ConsonantScene {
	/** Matches the audio basename: `consonant-<id>.mp3`. */
	readonly id: string;
	readonly char: string;
	/** `ม ม้า`, as the alphabet says it. */
	readonly name: string;
	/** `horse` — the subject of the picture. */
	readonly meaning: string;
	readonly district: District;
	/** Written for the renderer; see `scripts/generate-consonant-images.py`. */
	readonly prompt: string;
}

export const CONSONANT_SCENES: readonly ConsonantScene[] =
	consonantSceneData as unknown as readonly ConsonantScene[];

const BY_CHARACTER = new Map(
	CONSONANT_SCENES.map((scene) => [scene.char, scene]),
);

/** The scene for a consonant character, or undefined if it has none. */
export function consonantSceneFor(
	character: string,
): ConsonantScene | undefined {
	return BY_CHARACTER.get(character);
}

/**
 * Where a consonant's picture lives, or undefined when the letter has no
 * scene.
 *
 * Returns a path rather than checking the file exists — the app cannot know
 * that, and the components that render it fall back on an `onError`, which is
 * also what covers a letter whose picture has not been generated yet.
 */
export function consonantImageFor(character: string): string | undefined {
	const scene = BY_CHARACTER.get(character);
	return scene ? `palace/consonants/${scene.id}.jpg` : undefined;
}

/** Every consonant staged in one district, in the order they are declared. */
export function consonantScenesIn(
	district: District,
): readonly ConsonantScene[] {
	return CONSONANT_SCENES.filter((scene) => scene.district === district);
}
