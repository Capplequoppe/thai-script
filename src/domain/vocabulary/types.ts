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
	english: string;
	rank: number | null;
	frequency: number;
	mnemonic: string | null;
	description?: string | null;
	characters: string[];
	syllables: SyllableInfo[];
	toneRules: string[];
	toneStatus: ToneStatus;
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
