import { DISTRICTS } from "../../script/data/sceneGrammar";
import type { VocabProperty } from "../types";
import { ROOMS, type Room, type RoomAssignment } from "../types";

// ============================================================================
// Rooms — the part-of-speech partition vocabulary mnemonics stage in
// ============================================================================
// Symbols get scene-grammar districts (task 2.1). Words get rooms: a
// consistent place each word's mnemonic is staged, so cast, setting and
// props compose across words instead of competing. A room is never a
// pre-reveal cue — it is an on-demand hint and part of the post-reveal
// answer (see `roomExposureFor` below). See phase-5 README for the
// rejection of literal memory palaces: rooms serve staging and confirmation,
// not searched recall.
//
// Six rooms, shaped for Thai rather than borrowed from English grammar.
// Verbs and adjectives share a room deliberately — Thai adjectives are
// stative verbs, and treating them as one part of speech is what brings the
// corpus's 12 word-class values down to six places a learner can hold.

export { ROOMS };
export type { Room };

// AC2: rooms and scene-grammar districts (temple/market/harbor, class
// encoding) are disjoint vocabularies — a learner never holds one word
// meaning both a class district and a part-of-speech room.
const ROOM_SET: ReadonlySet<string> = new Set(ROOMS);
export const ROOMS_AND_DISTRICTS_ARE_DISJOINT = DISTRICTS.every(
	(district) => !ROOM_SET.has(district),
);

// ----------------------------------------------------------------------------
// Word class -> room — total in both directions
// ----------------------------------------------------------------------------
// The corpus's word_class field carries exactly these 12 non-empty values
// (measured over vocabulary.json); "" means not yet classified, and is
// handled by `assignRoom`, never by this table.

export const KNOWN_WORD_CLASSES = [
	"pron",
	"n",
	"v",
	"adj",
	"adv",
	"conj",
	"det",
	"aux",
	"mod",
	"prep",
	"part",
	"clf",
] as const;

export type WordClass = (typeof KNOWN_WORD_CLASSES)[number];

const KNOWN_WORD_CLASS_SET: ReadonlySet<string> = new Set(KNOWN_WORD_CLASSES);

/** Whether `value` is one of the corpus's 12 declared word-class values. */
export function isKnownWordClass(value: string): value is WordClass {
	return KNOWN_WORD_CLASS_SET.has(value);
}

/**
 * Every one of the corpus's 12 word-class values maps to exactly one room.
 * Verbs, adjectives and adverbs — the predicate and its modifiers — share
 * "actions-and-states". Prepositions, determiners, auxiliaries, modals and
 * conjunctions — the corpus's function words other than particles — share
 * "connectors".
 */
const ROOM_FOR_WORD_CLASS: Readonly<Record<WordClass, Room>> = {
	pron: "people-and-pronouns",
	n: "things",
	v: "actions-and-states",
	adj: "actions-and-states",
	adv: "actions-and-states",
	prep: "connectors",
	det: "connectors",
	aux: "connectors",
	mod: "connectors",
	conj: "connectors",
	part: "particles",
	clf: "counting-and-classifiers",
};

/** The room a known word class stages its mnemonics in. */
export function roomForWordClass(wordClass: WordClass): Room {
	return ROOM_FOR_WORD_CLASS[wordClass];
}

/**
 * A word's relationship to the room partition (AC5): exactly one of
 * assigned, unassignable-with-reason, or not-yet-classified. An empty
 * `word_class` (3,200 entries, pending task 5.2's backfill) is
 * "unclassified" — never conflated with "unassignable", which is reserved
 * for a non-empty value outside the corpus's declared set.
 */
export function assignRoom(wordClass: string): RoomAssignment {
	if (wordClass === "") {
		return { state: "unclassified" };
	}
	if (isKnownWordClass(wordClass)) {
		return { state: "assigned", room: ROOM_FOR_WORD_CLASS[wordClass] };
	}
	return {
		state: "unassignable",
		reason: `"${wordClass}" is not one of the corpus's declared word classes`,
	};
}

// ----------------------------------------------------------------------------
// Noun sub-districts — the "things" room does not scale as one place
// ----------------------------------------------------------------------------
// 1,523 nouns is not a place a learner can hold as a single room. Each
// sub-district declares a capacity so an over-full field is reported rather
// than silently becoming one undifferentiated room again (AC3). Capacities
// are sized with headroom over the current 1,523-noun corpus; a sub-district
// pushed past its declared capacity is a defect to report, not to absorb
// silently.

export interface NounSubdistrict {
	name: string;
	capacity: number;
}

export const NOUN_SUBDISTRICTS: readonly NounSubdistrict[] = [
	{ name: "people-and-roles", capacity: 250 },
	{ name: "body-and-health", capacity: 150 },
	{ name: "home-and-objects", capacity: 300 },
	{ name: "food-and-nature", capacity: 300 },
	{ name: "places-and-time", capacity: 250 },
	{ name: "work-and-abstract", capacity: 350 },
];

export interface NounSubdistrictOverflow {
	subdistrict: string;
	capacity: number;
	count: number;
}

/**
 * Reports every declared noun sub-district whose count exceeds its declared
 * capacity. A sub-district absent from `counts` is treated as empty, not
 * skipped — the check is total over `NOUN_SUBDISTRICTS`, not over whatever
 * keys the caller happened to populate.
 */
export function reportNounSubdistrictOverflows(
	counts: Readonly<Partial<Record<string, number>>>,
): NounSubdistrictOverflow[] {
	const overflows: NounSubdistrictOverflow[] = [];
	for (const { name, capacity } of NOUN_SUBDISTRICTS) {
		const count = counts[name] ?? 0;
		if (count > capacity) {
			overflows.push({ subdistrict: name, capacity, count });
		}
	}
	return overflows;
}

// ----------------------------------------------------------------------------
// Room exposure — never a pre-reveal cue, always an on-demand hint
// ----------------------------------------------------------------------------
// AC4: the rule is declared per `VocabProperty`, not derived from a
// two-way "production vs recognition" model — that model does not cover
// `audioRecognition` and `spellingFromAudio`. Every property currently
// carry the same rule (hidden until asked for or revealed); the table keeps
// them declared individually so a future property is forced to make its own
// choice rather than silently inheriting one.

export interface RoomReviewState {
	/** Has the learner answered (or been shown the answer) this card? */
	revealed: boolean;
	/** Did the learner ask for the room as a hint before revealing? */
	hintRequested: boolean;
}

export type RoomExposure =
	| { visible: false; hintUsed: false }
	| { visible: true; via: "hint" | "reveal"; hintUsed: boolean };

/**
 * Hidden before the learner has acted; obtainable on request as a hint
 * (recorded as such, so a learner who asked is distinguishable from one who
 * recalled unaided); always present after reveal, as part of the answer.
 */
function stageOnRequestThenOnReveal(state: RoomReviewState): RoomExposure {
	if (state.revealed) {
		return { visible: true, via: "reveal", hintUsed: state.hintRequested };
	}
	if (state.hintRequested) {
		return { visible: true, via: "hint", hintUsed: true };
	}
	return { visible: false, hintUsed: false };
}

const ROOM_EXPOSURE_RULES: Readonly<
	Record<VocabProperty, (state: RoomReviewState) => RoomExposure>
> = {
	thaiToEnglish: stageOnRequestThenOnReveal,
	englishToThai: stageOnRequestThenOnReveal,
	audioRecognition: stageOnRequestThenOnReveal,
	toneIdentification: stageOnRequestThenOnReveal,
	toneRule: stageOnRequestThenOnReveal,
	tonePronunciation: stageOnRequestThenOnReveal,
	spelling: stageOnRequestThenOnReveal,
	spellingFromAudio: stageOnRequestThenOnReveal,
};

/** Whether the room is visible for `property` given the review state, per the rule declared above. */
export function roomExposureFor(
	property: VocabProperty,
	state: RoomReviewState,
): RoomExposure {
	return ROOM_EXPOSURE_RULES[property](state);
}
