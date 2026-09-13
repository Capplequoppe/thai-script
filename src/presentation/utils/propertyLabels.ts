import type { VocabProperty } from "../../domain/vocabulary/types";

/** Human-readable name for each vocabulary card property, as shown in the
 *  stage-override sheet and the per-stage item list. */
export const VOCAB_PROPERTY_LABELS: Record<VocabProperty, string> = {
	thaiToEnglish: "Thai → English",
	englishToThai: "English → Thai",
	audioRecognition: "Listening",
	toneIdentification: "Tone",
	spelling: "Spelling",
	spellingFromAudio: "Spelling (Audio)",
};
