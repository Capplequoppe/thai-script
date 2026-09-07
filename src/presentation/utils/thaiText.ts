// Thai combining marks (vowels above/below, tone marks) render relative to
// the preceding base character. Symbol data uses "-" as a stand-in for
// "consonant goes here" (e.g. the vowel เ-ือะ), but "-" isn't a valid Thai
// base, so a mark that directly follows it — or that opens a string with no
// base at all — has nothing to attach to. Browsers then draw it as tofu.
// Inserting a dotted circle (U+25CC), the standard placeholder base, gives
// the mark something to combine with everywhere text shapers can see.
const THAI_BASE = /[ก-ฮ]/;
const THAI_COMBINING_MARK = /[ัิ-ฺ็-๎]/;

export function withDottedCircles(text: string): string {
	let result = "";
	let prev = "";
	for (const ch of text) {
		if (THAI_COMBINING_MARK.test(ch) && !THAI_BASE.test(prev)) {
			result += "◌";
		}
		result += ch;
		prev = ch;
	}
	return result;
}
