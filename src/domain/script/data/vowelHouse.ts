import type { VowelPosition } from "./symbols";
import { ROOM_FOR_POSITION } from "./vowelParts";

// ============================================================================
// The vowels' house, as a place on the map
// ============================================================================
// Consonants are placed by class, because class decides tone. Vowels have no
// class at all — which is exactly why they never fitted the three districts,
// and why the answer is a building of their own standing where the roads from
// all three meet. A vowel attaches to any consonant regardless of class, so
// the house serves the temple, the market and the harbour alike and belongs to
// none of them. Where it stands is itself the fact that vowels carry no class.
//
// `vowelParts.ts` already had the floor plan in `ROOM_FOR_POSITION`, and
// lesson 1 already walks a learner up to the house and names three of its
// rooms. What was missing was the house on the map: a learner could be told
// about it in a lesson and then find, on the page that draws the world, that
// it was not in the world.
//
// The rooms are named here in one place and nowhere else, so the map's label,
// the lesson's prose and the floor plan cannot drift into two names for one
// room.

/** One room of the house, which is one place a vowel can be written. */
export interface HouseRoom {
	/** Stable id — the hotspot's target and the establishing shot's `for`. */
	readonly slug: string;
	/** What the house calls it, matching `ROOM_FOR_POSITION`. */
	readonly name: string;
	/** Where a vowel in this room is written, said the plain way. */
	readonly written: string;
	/** Why this room and not another — the hook, as a tone place has one. */
	readonly reason: string;
}

/**
 * Five rooms, and every vowel in the language lodges in at least one.
 *
 * Five rather than the seven keys of `ROOM_FOR_POSITION`, because two of those
 * keys name a vowel written in more than one place at once — `left-above` is
 * the front steps *and* the roof, not a sixth room. A compound vowel is
 * several lodgers in the house at the same time, so it belongs in each room it
 * reaches; `roomsForPosition` is what splits it.
 */
export const HOUSE_ROOMS: readonly HouseRoom[] = [
	{
		slug: "front-steps",
		name: "the front steps",
		written: "before the consonant",
		reason:
			"You meet them on the way in, and you read them before the consonant they belong to.",
	},
	{
		slug: "roof",
		name: "the roof",
		written: "above the consonant",
		reason: "Written over the letter, and the longer mark is the longer sound.",
	},
	{
		slug: "cellar",
		name: "the cellar",
		written: "below the consonant",
		reason:
			"Underneath, out of sight, and the longer tail is the longer sound.",
	},
	{
		slug: "back-yard",
		name: "the back yard",
		written: "after the consonant",
		reason: "Round the back, where the first vowel you ever met lodges.",
	},
	{
		slug: "veranda",
		name: "the veranda",
		written: "on both sides of the consonant",
		reason:
			"It wraps the house, which is what a vowel written on both sides does.",
	},
] as const;

const ROOM_BY_SLUG = new Map(HOUSE_ROOMS.map((room) => [room.slug, room]));

/** A room by its slug, or undefined where nothing is declared under that name. */
export function roomNamed(slug: string): HouseRoom | undefined {
	return ROOM_BY_SLUG.get(slug);
}

/**
 * Which rooms a vowel written at this position lodges in.
 *
 * More than one for the compounds, which is the whole point of the house
 * rather than a list: `เ-ือ` is on the veranda *and* the roof, and a learner
 * who finds it in both rooms has been told where all three of its marks go.
 */
export function roomsForPosition(
	position: VowelPosition,
): readonly HouseRoom[] {
	const slugs = SLUGS_FOR_POSITION[position];
	return slugs.flatMap((slug) => {
		const room = ROOM_BY_SLUG.get(slug);
		// Unreachable while the table below names only declared rooms, which
		// `EVERY_POSITION_REACHES_A_ROOM` asserts.
		return room ? [room] : [];
	});
}

/**
 * Position to rooms, following `ROOM_FOR_POSITION` exactly.
 *
 * Written out rather than parsed out of the prose in `vowelParts.ts`: that
 * table is a sentence for a learner to read ("the roof and the veranda — the
 * whole house") and splitting a sentence on punctuation to get structure is
 * the kind of thing that works until somebody improves the wording.
 */
const SLUGS_FOR_POSITION: Readonly<Record<VowelPosition, readonly string[]>> =
	Object.freeze({
		left: ["front-steps"],
		above: ["roof"],
		below: ["cellar"],
		right: ["back-yard"],
		around: ["veranda"],
		"left-above": ["front-steps", "roof"],
		"left-above-right": ["veranda", "roof"],
	});

/**
 * Every position a vowel can be written in reaches a room that exists.
 *
 * A value rather than a test so the data cannot be imported without it; the
 * failure it prevents is a vowel with a position nobody gave a room, which
 * shows up as a lodger who is in the house and in none of its rooms.
 */
export const EVERY_POSITION_REACHES_A_ROOM = Object.entries(
	SLUGS_FOR_POSITION,
).every(
	([position, slugs]) =>
		slugs.length > 0 &&
		slugs.every((slug) => ROOM_BY_SLUG.has(slug)) &&
		// The floor plan a learner reads and the floor plan the map uses have
		// to be the same one.
		ROOM_FOR_POSITION[position as VowelPosition] !== undefined,
);

/** No two rooms answer to one name, which a memory palace cannot survive. */
export const ROOM_NAMES_ARE_DISTINCT =
	new Set(HOUSE_ROOMS.map((room) => room.name)).size === HOUSE_ROOMS.length &&
	new Set(HOUSE_ROOMS.map((room) => room.slug)).size === HOUSE_ROOMS.length;
