import type { Room } from "../types";

// ============================================================================
// Pom and Chan — the recurring cast every vocabulary mnemonic draws on
// ============================================================================
// Two characters, named for the gendered first-person pronouns ผม and ฉัน.
// They teach that split by exposure rather than by a rule: a learner who meets
// them in scene after scene picks up which pronoun goes with which speaker
// without ever being told.
//
// They also give the mnemonics a fixed cast, so images compose instead of
// competing — the same two people in a hundred scenes are two people, while a
// hundred unnamed actors are a hundred things to hold.
//
// **They are not natives of a class district.** ผ and ฉ are both high class, so
// a character pinned to the high district (temple, see sceneGrammar.ts) would
// be unusable in the other two, and wherever they did appear the class signal
// would fight the room signal for the same image. The cast moves between rooms
// instead; `homeRoom` is null by construction and `characters.test.ts` holds
// them to appearing in more than one.

/**
 * The politeness registers a character may be fixed to.
 *
 * Thai first person is not one word but a register ladder, and a mnemonic that
 * reaches for whichever rung fits the sentence teaches the ladder by accident.
 * Each character sits on exactly one rung, declared here.
 */
export const REGISTERS = ["informal", "polite", "formal"] as const;

export type Register = (typeof REGISTERS)[number];

export const CHARACTER_IDS = ["pom", "chan"] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];

/** A pronoun form this character does NOT use, and the register it belongs to. */
export interface RegisterVariant {
	form: string;
	register: Register;
	note: string;
}

export interface Character {
	id: CharacterId;
	/** The name as it appears in mnemonic prose. */
	name: string;
	/** The Thai first-person pronoun the character is named for and speaks with. */
	pronoun: string;
	pronounRomanized: string;
	/** The rung on the register ladder this character is fixed to. */
	register: Register;
	/**
	 * Null by construction: the cast is not native to a class district. See the
	 * module comment — a character fixed to one district is unusable in the
	 * other two.
	 */
	homeRoom: Room | null;
	/**
	 * Pronoun forms of the same person in another register. A mnemonic using
	 * this character may not reach for one of these; that is what
	 * {@link registerViolations} checks.
	 */
	registerVariants: readonly RegisterVariant[];
}

export const CHARACTERS: readonly Character[] = [
	{
		id: "pom",
		name: "Pom",
		pronoun: "ผม",
		pronounRomanized: "phǒm",
		// ผม is the everyday polite male first person: neutral enough for a
		// stranger, unmarked enough not to sound stiff with a friend. Pom is
		// fixed there so no scene has to decide.
		register: "polite",
		homeRoom: null,
		registerVariants: [
			{
				form: "กู",
				register: "informal",
				note: "blunt and intimate; rude outside close friends",
			},
			{
				form: "ข้าพเจ้า",
				register: "formal",
				note: "written and ceremonial; wrong in any spoken scene",
			},
		],
	},
	{
		id: "chan",
		name: "Chan",
		pronoun: "ฉัน",
		pronounRomanized: "chǎn",
		// ฉัน is informal — friends, family, songs. ดิฉัน is its formal
		// counterpart, and the pair is exactly why this field exists: a learner
		// meeting Chan constantly adopts whichever of the two the scenes happen
		// to use, so the scenes do not get to happen to use either.
		register: "informal",
		homeRoom: null,
		registerVariants: [
			{
				form: "ดิฉัน",
				register: "formal",
				note: "the formal counterpart of ฉัน; used by women in business and public speech",
			},
			{
				form: "หนู",
				register: "informal",
				note: "a younger speaker to an older listener; carries an age relation ฉัน does not",
			},
		],
	},
];

const CHARACTERS_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

/** The character with this id. Throws rather than returning undefined: the id set is closed. */
export function characterFor(id: CharacterId): Character {
	const character = CHARACTERS_BY_ID.get(id);
	if (!character) {
		throw new Error(`unknown character id: ${id}`);
	}
	return character;
}

/**
 * Every way `text` is inconsistent with the declared register of the cast it
 * uses, as human-readable reasons. Empty means consistent.
 *
 * Two ways prose can go wrong, and both are checked:
 * - it reaches for an off-register form of a character's pronoun (ดิฉัน where
 *   Chan is declared informal);
 * - it puts a character's pronoun in a scene that never declared that
 *   character, so nothing holds the register at all.
 */
export function registerViolations(
	text: string,
	used: readonly CharacterId[],
): string[] {
	const violations: string[] = [];
	for (const character of CHARACTERS) {
		for (const variant of character.registerVariants) {
			if (text.includes(variant.form)) {
				violations.push(
					`uses ${variant.form} (${variant.register}) where ${character.name} is declared ${character.register}`,
				);
			}
		}
		if (text.includes(character.pronoun) && !used.includes(character.id)) {
			violations.push(
				`stages ${character.pronoun} without declaring ${character.name}, so no register governs it`,
			);
		}
	}
	return violations;
}
