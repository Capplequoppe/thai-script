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

export interface VocabEntry {
	thai: string;
	romanization: string;
	word_class: string;
	english: string;
	rank: number | null;
	frequency: number;
	mnemonic: string | null;
	description?: string | null;
	characters: string[];
	syllables: SyllableInfo[];
	toneRules: string[];
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
