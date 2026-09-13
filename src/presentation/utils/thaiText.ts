// Thai combining marks (vowels above/below, tone marks) render relative to
// the preceding base character. Symbol data uses "-" as a stand-in for
// "consonant goes here" (e.g. the vowel เ-ือะ), but "-" isn't a valid Thai
// base, so a mark that directly follows it — or that opens a string with no
// base at all — has nothing to attach to. Browsers then draw it as tofu.
// Inserting a dotted circle (U+25CC), the standard placeholder base, gives
// the mark something to combine with everywhere text shapers can see.
//
// A plain space is a second, inconsistently-used placeholder convention in
// the symbol data (e.g. the standalone vowel " ี" vs "ั", which needs none):
// unlike "-", it isn't meant to stay visible, so it gets replaced by the
// dotted circle rather than kept alongside it — otherwise the mark renders
// on its own circle with a stray gap floating in front of it.
const THAI_BASE = /[ก-ฮ]/;
const THAI_COMBINING_MARK = /[ัิ-ฺ็-๎]/;

export function withDottedCircles(text: string): string {
	let result = "";
	let prev = "";
	for (const ch of text) {
		if (THAI_COMBINING_MARK.test(ch) && !THAI_BASE.test(prev)) {
			if (prev === " ") result = result.slice(0, -1);
			result += "◌";
		}
		result += ch;
		prev = ch;
	}
	return result;
}

/**
 * Sentence data stores words space-joined (e.g. "มา กิน กัน") so generators
 * can split on words, but real Thai text has no spaces between words —
 * showing the spaced form as a reading prompt scaffolds away the one skill
 * (finding word boundaries by eye) fluent reading actually requires. Strips
 * that scaffolding for display; the underlying data keeps its spaces.
 */
export function stripWordSpacing(text: string): string {
	return text.replace(/\s+/g, "");
}
