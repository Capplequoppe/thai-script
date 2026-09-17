import { ROOMS } from "../../vocabulary/types";
import { DISTRICTS, type District, districtForClass } from "./sceneGrammar";
import {
	ThaiSymbolClass,
	type ToneValue,
	toneMarkRules,
	toneRules,
} from "./symbols";

// ============================================================================
// The memory palace, as a place a learner can walk
// ============================================================================
// Two of the three vocabularies below already shipped, and neither was ever
// drawn. `sceneGrammar.ts` has staged consonants in a temple, a market and a
// harbor since task 2.4; `rooms.ts` has staged words in six rooms. Both
// surface only as a badge on one card at a time, so the world they describe
// has never been visible as a world — which is most of what a memory palace
// is for. You cannot navigate somewhere you have never seen a map of.
//
// This module adds the third vocabulary, the tone places, and declares all
// three together so the one rule that governs them is checkable rather than
// remembered: they must stay disjoint. A learner who hears "market" has to
// know instantly whether that means a consonant class, a tone, or a part of
// speech, and the moment one word means two of those the whole scheme is
// worth less than no scheme.
//
// Why tone rules get a literal palace when vocabulary deliberately does not
// (see `rooms.ts`, which records that rejection): there are seventeen tone
// rules and they never change. That is exactly the size and stability a
// palace is good at. The corpus is five and a half thousand words that grow,
// which is exactly what it is bad at.

// ----------------------------------------------------------------------------
// Tone places — the fifth vocabulary channel, arranged by pitch
// ----------------------------------------------------------------------------
// `sceneGrammar.ts` reserved the vertical axis for tone and made the class
// districts deliberately height-free so class would not spend it. These
// places collect on that: each sits at the height its tone is spoken at, and
// the two that move are drawn as the movement. That is the same shape
// `TONE_CONTOUR_POINTS` already draws on every word card, so the map and the
// icon teach one metaphor instead of two.

export interface TonePlace {
	readonly tone: ToneValue;
	/** The place itself, and the map's label for it. */
	readonly name: string;
	/**
	 * Where it sits on the map's vertical axis, 0 at the bottom and 1 at the
	 * top. A level tone is a point; a contour tone spans, and `to` is where it
	 * ends up — falling starts high and lands low, rising the reverse.
	 */
	readonly from: number;
	readonly to: number;
	/** Why this place and not another — the hook the scene hangs on. */
	readonly reason: string;
}

export const TONE_PLACES: readonly TonePlace[] = [
	{
		tone: "mid",
		name: "rice paddy",
		from: 0.5,
		to: 0.5,
		reason: "Flat to the horizon, and level is the whole of a mid tone.",
	},
	{
		tone: "low",
		name: "well",
		from: 0.2,
		to: 0.2,
		reason: "You look down into it, and it holds whatever fell.",
	},
	{
		tone: "high",
		name: "rooftop",
		from: 0.85,
		to: 0.85,
		reason: "Up, and flat once you are there — high is held, not climbed.",
	},
	{
		tone: "falling",
		name: "waterfall",
		from: 0.85,
		to: 0.2,
		reason: "Starts at the top and drops. Nothing that goes over comes back.",
	},
	{
		tone: "rising",
		name: "hill path",
		from: 0.2,
		to: 0.85,
		reason: "Dips as you set off, then climbs — the shape of the tone itself.",
	},
];

export const TONE_PLACE_NAMES = TONE_PLACES.map((place) => place.name);

const PLACE_FOR_TONE = new Map(TONE_PLACES.map((place) => [place.tone, place]));

/** The place a tone resolves at. Total over `ToneValue`. */
export function placeForTone(tone: ToneValue): TonePlace {
	const place = PLACE_FOR_TONE.get(tone);
	// Unreachable while TONE_PLACES covers ToneValue, which
	// `EVERY_TONE_HAS_A_PLACE` asserts — but a lookup that can return
	// undefined should say what it would mean.
	if (!place) throw new Error(`no tone place declared for "${tone}"`);
	return place;
}

// ----------------------------------------------------------------------------
// Cast — who carries a consonant class
// ----------------------------------------------------------------------------
// Derived from the districts rather than invented beside them. The fisherman
// is *from* the harbor, so a learner who already knows harbor means low class
// gets the cast for free, and one who learns the cast first has been taught
// the district. Inventing three unrelated figures would have made two
// associations where one will do.

export interface ClassCharacter {
	readonly classType: ThaiSymbolClass;
	readonly district: District;
	/** The figure, as the map and the scene prompts name them. */
	readonly character: string;
}

export const CLASS_CAST: readonly ClassCharacter[] = [
	{
		classType: ThaiSymbolClass.High,
		district: districtForClass(ThaiSymbolClass.High),
		character: "monk",
	},
	{
		classType: ThaiSymbolClass.Mid,
		district: districtForClass(ThaiSymbolClass.Mid),
		character: "market vendor",
	},
	{
		classType: ThaiSymbolClass.Low,
		district: districtForClass(ThaiSymbolClass.Low),
		character: "fisherman",
	},
];

const CHARACTER_FOR_CLASS = new Map(
	CLASS_CAST.map((entry) => [entry.classType, entry.character]),
);

/** The figure who carries a class through the tone scenes. */
export function characterForClass(classType: ThaiSymbolClass): string {
	const character = CHARACTER_FOR_CLASS.get(classType);
	if (!character) throw new Error(`no character declared for "${classType}"`);
	return character;
}

// ----------------------------------------------------------------------------
// Scenes — one per distinct outcome, not one per rule
// ----------------------------------------------------------------------------
// Seventeen rules, eleven scenes, and the gap is the point. Where two rules
// agree, their characters share a scene, so the merge carries the fact: the
// vendor and the monk fall down the same well *because* mid and high class
// behave alike on a dead syllable. Eleven images that each teach something
// beat seventeen where six are near-duplicates teaching nothing.
//
// `covers` lists the rule ids a scene accounts for, and
// `EVERY_RULE_HAS_A_SCENE` holds the set to exactly the seventeen. That is
// the invariant worth having: a rule quietly added to `symbols.ts` with no
// scene would otherwise be a hole nobody notices, which is how a memory
// system starts lying about being complete.

/** What happens to the cast, which is how a syllable's shape is written. */
export type SceneFate =
	| "alive"
	| "dies-fast"
	| "dies-slowly"
	/** A mark is written, and it overrides fate entirely — nobody's living or dying decides anything. */
	| "marked";

export interface ToneScene {
	readonly id: string;
	/** Rule ids from `toneRules`, and `{class}-{mark}` for `toneMarkRules`. */
	readonly covers: readonly string[];
	readonly tone: ToneValue;
	readonly cast: readonly ThaiSymbolClass[];
	readonly fate: SceneFate;
	/**
	 * The counted prop that names the tone mark, or undefined on an unmarked
	 * scene. Counting is the peg: one spear, two hooks, three flags, four
	 * crossed poles, in the marks' own order.
	 */
	readonly prop?: string;
	/** The scene in a sentence — the thing to actually picture. */
	readonly scene: string;
	/** What the picture is *for*, said plainly, for the caption under it. */
	readonly teaches: string;
}

export const TONE_SCENES: readonly ToneScene[] = [
	// --- Unmarked syllables -------------------------------------------------
	{
		id: "paddy-alive",
		covers: ["low-live", "mid-live"],
		tone: "mid",
		cast: [ThaiSymbolClass.Low, ThaiSymbolClass.Mid],
		fate: "alive",
		scene:
			"A fisherman and a market vendor stand talking in a flat rice paddy, both alive and unhurried, the horizon dead level behind them.",
		teaches:
			"A live syllable is a mid tone for low and mid class alike — the two agree here, which is why they share the scene.",
	},
	{
		id: "hill-monk-climbs",
		covers: ["high-live"],
		tone: "rising",
		cast: [ThaiSymbolClass.High],
		fate: "alive",
		scene:
			"A monk walks down into a dip and then climbs a long hill path, alive and steady, robes bright against the slope.",
		teaches:
			"High class is the one exception on a live syllable: it rises where the others stay level.",
	},
	{
		id: "rooftop-fisherman-struck",
		covers: ["low-dead-short"],
		tone: "high",
		cast: [ThaiSymbolClass.Low],
		fate: "dies-fast",
		scene:
			"A fisherman on a rooftop is killed instantly by a single lightning strike — one flash, already over.",
		teaches:
			"Low class, dead syllable, short vowel: high tone. Length only ever matters here.",
	},
	{
		id: "waterfall-fisherman-drowns",
		covers: ["low-dead-long"],
		tone: "falling",
		cast: [ThaiSymbolClass.Low],
		fate: "dies-slowly",
		scene:
			"The same fisherman goes over a waterfall and drowns slowly in the pool below, the fall drawn out and unhurried.",
		teaches:
			"Low class, dead syllable, long vowel: falling. The slow death is the long vowel.",
	},
	{
		id: "well-vendor-and-monk-fall",
		covers: [
			"mid-dead-short",
			"mid-dead-long",
			"high-dead-short",
			"high-dead-long",
		],
		tone: "low",
		cast: [ThaiSymbolClass.Mid, ThaiSymbolClass.High],
		fate: "dies-fast",
		scene:
			"A market vendor and a monk both fall down the same well and do not come back up.",
		teaches:
			"Dead syllable, mid or high class: low tone, and the vowel's length changes nothing. Four rules, one well.",
	},

	// --- Marked syllables ---------------------------------------------------
	{
		id: "well-speared-once",
		covers: ["mid-mai-ek", "high-mai-ek"],
		tone: "low",
		cast: [ThaiSymbolClass.Mid, ThaiSymbolClass.High],
		fate: "marked",
		prop: "one spear",
		scene:
			"A market vendor and a monk stand at the well, each run through by a single spear, and sink into it together.",
		teaches:
			"Mai ek over mid or high class: low tone. The spear decides it — whether the syllable was live or dead no longer matters.",
	},
	{
		id: "waterfall-hooked-twice",
		covers: ["mid-mai-tho", "high-mai-tho"],
		tone: "falling",
		cast: [ThaiSymbolClass.Mid, ThaiSymbolClass.High],
		fate: "marked",
		prop: "two hooks",
		scene:
			"Two hooks drag the market vendor and the monk over the lip of the waterfall.",
		teaches: "Mai tho over mid or high class: falling.",
	},
	{
		id: "waterfall-fisherman-speared",
		covers: ["low-mai-ek"],
		tone: "falling",
		cast: [ThaiSymbolClass.Low],
		fate: "marked",
		prop: "one spear",
		scene:
			"A single spear pitches the fisherman over the waterfall instead — the same one spear, a different end.",
		teaches:
			"Mai ek over low class: falling, not low. Low class takes the marks differently from the other two.",
	},
	{
		id: "rooftop-fisherman-hooked",
		covers: ["low-mai-tho"],
		tone: "high",
		cast: [ThaiSymbolClass.Low],
		fate: "marked",
		prop: "two hooks",
		scene:
			"Two hooks haul the fisherman up onto the rooftop and leave him there.",
		teaches:
			"Mai tho over low class: high. Again low class goes its own way — hauled up where the others were dragged down.",
	},
	{
		id: "rooftop-vendor-three-flags",
		covers: ["mid-mai-tri"],
		tone: "high",
		cast: [ThaiSymbolClass.Mid],
		fate: "marked",
		prop: "three flags",
		scene:
			"The market vendor plants three flags on the rooftop, alone up there.",
		teaches:
			"Mai tri only ever sits on mid class, and gives high. Nobody else is on this roof.",
	},
	{
		id: "hill-vendor-four-poles",
		covers: ["mid-mai-chattawa"],
		tone: "rising",
		cast: [ThaiSymbolClass.Mid],
		fate: "marked",
		prop: "four crossed poles",
		scene:
			"The market vendor carries four crossed poles up the hill path, climbing alone.",
		teaches: "Mai chattawa only ever sits on mid class, and gives rising.",
	},
];

/** The id a `toneMarkRules` entry is referred to by, matching `toneExplanationFor`. */
export function markRuleId(
	consonantClass: ThaiSymbolClass,
	toneMarkName: string,
): string {
	return `${consonantClass}-${toneMarkName.replace(/\s+/g, "-")}`;
}

/** Every rule id the palace is expected to cover, spelling rules then marks. */
export const ALL_RULE_IDS: readonly string[] = [
	...toneRules.map((rule) => rule.id),
	...toneMarkRules.map((rule) =>
		markRuleId(rule.consonantClass, rule.toneMarkName),
	),
];

// ----------------------------------------------------------------------------
// Invariants — the three vocabularies, held apart and held complete
// ----------------------------------------------------------------------------
// Values rather than tests so the data cannot be imported without them
// existing; `memoryPalace.test.ts` asserts each is true. `sceneGrammar.ts`
// and `rooms.ts` already pair a `ROOMS_AND_DISTRICTS_ARE_DISJOINT` constant
// with the same intent — this widens it from two vocabularies to three.

const ALL_PLACE_WORDS = [...DISTRICTS, ...ROOMS, ...TONE_PLACE_NAMES];

/**
 * No word names two different things. The failure this prevents is not a
 * crash but a slow one: a learner who has to ask "market as in the class, or
 * market as in the tone?" has lost the instant recognition the whole scheme
 * is built to buy.
 */
export const PLACE_VOCABULARIES_ARE_DISJOINT =
	new Set(ALL_PLACE_WORDS).size === ALL_PLACE_WORDS.length;

/** Every tone a syllable can take has somewhere to happen. */
export const EVERY_TONE_HAS_A_PLACE = (
	["mid", "low", "falling", "high", "rising"] as const
).every((tone) => PLACE_FOR_TONE.has(tone));

const COVERED_RULE_IDS = TONE_SCENES.flatMap((scene) => scene.covers);

/** Every rule is pictured somewhere, and no rule is pictured twice. */
export const EVERY_RULE_HAS_ONE_SCENE =
	new Set(COVERED_RULE_IDS).size === COVERED_RULE_IDS.length &&
	COVERED_RULE_IDS.length === ALL_RULE_IDS.length &&
	ALL_RULE_IDS.every((id) => COVERED_RULE_IDS.includes(id));
