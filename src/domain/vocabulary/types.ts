import type { SrsCard } from "../shared/types";

export type VocabProperty =
	| "thaiToEnglish"
	| "englishToThai"
	| "audioRecognition"
	| "toneIdentification"
	| "spelling"
	| "spellingFromAudio";

export interface VocabularyCard extends SrsCard {
	promptWord: string;
	property: VocabProperty;
	mnemonic?: string | null;
	syllables?: { text: string; tone: string }[];
}

export interface SyllableInfo {
	text: string;
	initialConsonant: string | null;
	vowel: string | null;
	finalConsonant: string | null;
	toneMark: string | null;
	consonantClass: string | null;
	syllableType: string | null;
	tone: string | null;
}

/**
 * Where an entry's `word_class` came from. `"source"` shipped with the corpus;
 * `"backfill"` was derived by `scripts/backfill-word-class.py`. 59% of the
 * corpus is the latter, and a wrong class stages a word's mnemonic in the wrong
 * room — so a guess must never read as corpus data. Logic lives in
 * `services/WordClassBackfill.ts`; only the shape is here.
 */
export type WordClassProvenance = "source" | "backfill";

export interface VocabEntry {
	thai: string;
	romanization: string;
	word_class: string;
	/** `"source"` or `"backfill"` — present on every entry after the backfill. */
	word_class_provenance?: WordClassProvenance;
	/**
	 * Why the backfill could not classify this entry. Present only on a
	 * `"backfill"` entry whose `word_class` is still empty — the residue. An
	 * entry with no provenance at all is a different thing, and never this.
	 */
	word_class_unclassifiable?: string;
	/** Which backfill rule decided the class. Present only on backfilled entries. */
	word_class_rule?: string;
	/**
	 * The backfill's own reading of a *source*-labelled entry, recorded so a
	 * disagreement is visible in the corpus rather than resolved silently. Never
	 * applied: the source value wins. `null` where the backfill declined.
	 */
	word_class_predicted?: string | null;
	/** True on the sample held out from the backfill's inputs for measurement. */
	word_class_heldout?: boolean;
	english: string;
	rank: number | null;
	frequency: number;
	mnemonic: string | null;
	description?: string | null;
	characters: string[];
	syllables: SyllableInfo[];
	toneRules: string[];
	/** The original IPA, moved aside when `romanization` became Paiboon (task 2.2). */
	ipa?: string;
	thai_audio_file: string | null;
	english_audio_file: string | null;
	image_file: string | null;
	samples: Array<{
		thai: string;
		romanization: string;
		english: string;
		thai_audio_file: string | null;
		english_audio_file: string | null;
	}>;
	source: string;
}

export interface VocabLessonSummary {
	words: VocabEntry[];
}

// ============================================================================
// Rooms — the part-of-speech partition vocabulary mnemonics stage in
// (data/rooms.ts owns the taxonomy tables and the exposure/assignment logic;
// the shapes live here so other vocabulary modules can refer to a `Room`
// without importing the taxonomy data itself.)
// ============================================================================

export const ROOMS = [
	"people-and-pronouns",
	"things",
	"actions-and-states",
	"connectors",
	"particles",
	"counting-and-classifiers",
] as const;

export type Room = (typeof ROOMS)[number];

/**
 * A word's relationship to the room partition is exactly one of three
 * states — never "unassignable" read as "unclassified" or vice versa.
 */
export type RoomAssignment =
	| { state: "assigned"; room: Room }
	| { state: "unassignable"; reason: string }
	| { state: "unclassified" };
