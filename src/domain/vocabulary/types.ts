import type { SrsCard } from "../shared/types";

export type VocabProperty =
	| "thaiToEnglish"
	| "englishToThai"
	| "audioRecognition"
	| "toneIdentification"
	| "toneRule"
	| "tonePronunciation"
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
/**
 * How far a word's per-syllable tones can be trusted, decided offline by
 * `scripts/enrich-vocabulary.py` from two independent descriptions of the
 * word — the tone rules applied to the Thai spelling, and the tone accents
 * in the romanization.
 *
 * - `verified` — both agree on the syllable split *and* the taught rules
 *   reproduce the tone. The learner can derive the answer from what they
 *   were taught, so it is safe to ask.
 * - `exception` — the split is corroborated and the tone is known, but no
 *   taught rule predicts it: ก็, loanwords like เมตร, lexical อักษรนำ like
 *   สำเร็จ (governed) against สำนัก (not). Correct to *show*; asking for it
 *   without saying so teaches that a correctly-applied rule was wrong.
 * - `unsegmented` — the two disagree on how many syllables the word has
 *   (สวัสดี is stored as สวัส + ดี, but is sà-wàt-dii), so no per-syllable
 *   tone can be trusted at all.
 */
export type ToneStatus = "verified" | "exception" | "unsegmented";

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
	toneStatus: ToneStatus;
	/**
	 * Ids from `symbols.ts`'s `specialRules` that this word cannot be read
	 * without — ห นำ for หมี, การันต์ for จันทร์, the unwritten vowel for คน.
	 *
	 * Separate from `toneRules` because they gate a different thing.
	 * `toneRules` decides whether the word may be *learned* at all; these
	 * decide whether its **tone** may be asked for, which is a narrower
	 * question with a much larger blast radius — 43% of otherwise-verified
	 * words depend on at least one of these, and locking the words
	 * themselves would gut the vocabulary.
	 */
	specialRules: string[];
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
/**
 * One word inside a tone minimal-pair group, as
 * `data/tone-minimal-pairs.json` stores it.
 *
 * `tones` is `scripts/generate-tone-minimal-pairs.py`'s `thaig2p`
 * analysis, deliberately not `VocabEntry.syllables[].tone`: the stored
 * syllable decomposition is a *grapheme* split that mis-reads ห-นำ (หน้า
 * as ห + final น), consonant clusters (กลัว losing its /l/) and
 * multi-syllable words (ตลาด as one syllable), so its tones can disagree
 * with the analysis that decided two words are sound-alikes at all. The
 * game shows the tones it grouped on.
 */
export interface ToneMinimalPairMember {
	thai: string;
	tones: string[];
}

/**
 * A set of vocabulary words that are indistinguishable by sound except for
 * their tones — `ไม่`/`ไหม`/`ใหม่`, `สี`/`สี่`. Every group holds at least
 * two words and at least two distinct tone patterns; `key` is the shared
 * segmental transcription with the tones stripped off, and doubles as the
 * group's stable identity.
 */
export interface ToneMinimalPairGroup {
	key: string;
	members: ToneMinimalPairMember[];
}
