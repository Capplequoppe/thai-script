/**
 * The tag list and the insertion arithmetic.
 *
 * Both of these shipped broken once. The palette offered tags the engine does
 * not recognise, which are dropped in silence rather than flagged — so the
 * clip renders, the words are right, and nothing tells the author their
 * direction did nothing. And insertion read the caret from
 * `document.activeElement`, which is the palette button by the time its click
 * handler runs, so every tag went to the end of the box regardless of where
 * the author had put the cursor.
 */
import { describe, expect, it } from "vitest";
import { ANNOTATIONS, insertAt, unknownTags } from "./annotations";

describe("the offered tags", () => {
	it("are all on the engine's published list", () => {
		// Verbatim from fish-speech's README. Anything the palette offers that
		// is not here is decoration: an unrecognised tag is dropped silently,
		// so the author has no way to notice.
		const published = new Set([
			"[pause]",
			"[emphasis]",
			"[laughing]",
			"[inhale]",
			"[chuckle]",
			"[tsk]",
			"[singing]",
			"[excited]",
			"[laughing tone]",
			"[interrupting]",
			"[chuckling]",
			"[excited tone]",
			"[volume up]",
			"[echo]",
			"[angry]",
			"[low volume]",
			"[sigh]",
			"[low voice]",
			"[whisper]",
			"[screaming]",
			"[shouting]",
			"[loud]",
			"[surprised]",
			"[short pause]",
			"[exhale]",
			"[delight]",
			"[panting]",
			"[audience laughter]",
			"[with strong accent]",
			"[volume down]",
			"[clearing throat]",
			"[sad]",
			"[moaning]",
			"[shocked]",
		]);
		const offered = ANNOTATIONS.flatMap((group) =>
			group.items.map((item) => item.tag),
		);
		expect(offered.filter((tag) => !published.has(tag))).toEqual([]);
	});

	it("offers no tag twice", () => {
		const offered = ANNOTATIONS.flatMap((group) =>
			group.items.map((item) => item.tag),
		);
		expect(offered.length).toBe(new Set(offered).size);
	});
});

describe("unknownTags", () => {
	it("says nothing about a tag that is on the list", () => {
		expect(unknownTags("Listen. [pause] Now say it.")).toEqual([]);
	});

	it("catches the plural of whisper, which does nothing", () => {
		// The exact mistake that made an earlier measurement wrong.
		expect(unknownTags("[whispers] quietly")).toEqual(["[whispers]"]);
		expect(unknownTags("[whisper] quietly")).toEqual([]);
	});

	it("reports each unknown tag once however often it appears", () => {
		expect(unknownTags("[warm] a [warm] b [calm]")).toEqual([
			"[warm]",
			"[calm]",
		]);
	});
});

describe("insertAt", () => {
	it("inserts where the caret is, not at the end", () => {
		const { text } = insertAt(
			"Listen carefully. Now say it.",
			"[pause]",
			18,
			18,
		);
		expect(text).toBe("Listen carefully. [pause] Now say it.");
	});

	it("inserts at the very start", () => {
		expect(insertAt("Say it aloud.", "[excited]", 0, 0).text).toBe(
			"[excited] Say it aloud.",
		);
	});

	it("inserts at the very end without a trailing space", () => {
		const text = "Say it aloud.";
		expect(insertAt(text, "[pause]", text.length, text.length).text).toBe(
			"Say it aloud. [pause]",
		);
	});

	it("replaces a selection rather than keeping both", () => {
		// Selecting a word and pressing a tag should swap it, the way typing
		// over a selection does.
		const { text } = insertAt("Say it loudly aloud.", "[loud]", 7, 13);
		expect(text).toBe("Say it [loud] aloud.");
	});

	it("never leaves a double space, wherever it lands", () => {
		for (const caret of [0, 3, 7, 18, 29]) {
			const { text } = insertAt(
				"Listen carefully. Now say it.",
				"[pause]",
				caret,
				caret,
			);
			expect(text).not.toMatch(/ {2}/);
			expect(text).toContain("[pause]");
		}
	});

	it("puts the caret after the inserted tag, so a second one does not nest", () => {
		const first = insertAt("Listen. Now say it.", "[pause]", 8, 8);
		expect(first.text).toBe("Listen. [pause] Now say it.");
		const second = insertAt(first.text, "[excited]", first.caret, first.caret);
		expect(second.text).toBe("Listen. [pause] [excited] Now say it.");
		expect(unknownTags(second.text)).toEqual([]);
	});
});
