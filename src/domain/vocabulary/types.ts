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
