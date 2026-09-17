/**
 * The delivery tags S2 Pro actually understands.
 *
 * Taken from the engine's own README, not invented and not inferred. That
 * distinction cost real time: a survey of ten plausible-sounding tags found
 * eight of them — `[warm]`, `[calm]`, `[slowly]`, `[gently]`, `[encouraging]`,
 * `[thoughtful]` among them — moved pace, pitch and pause length by less than
 * the engine's own variation between seeds. They did nothing.
 *
 * The trap is that an unrecognised tag is **silently ignored**, never spoken
 * aloud. So a made-up tag looks exactly like a working one: the clip renders,
 * the words are right, and the only evidence of failure is that nothing
 * changed. `[whispers]` is the canonical example — the real tag is
 * `[whisper]`, singular, and the plural is simply dropped.
 *
 * The engine also accepts free-form descriptions, which the README puts at
 * "15,000+ unique tags" with `[whisper in small voice]` and
 * `[professional broadcast tone]` as examples. Those are worth trying, but a
 * listed tag is the one with a known effect, so the palette offers these.
 */

export type Annotation = {
	tag: string;
	/** What it does, in the narrator's terms rather than the model's. */
	hint: string;
};

export type AnnotationGroup = {
	title: string;
	items: Annotation[];
};

/**
 * Grouped by what an author is reaching for, not alphabetically. The first
 * group is the one a teaching narration actually needs; the rest are there so
 * nobody has to go looking in the engine's README.
 */
export const ANNOTATIONS: AnnotationGroup[] = [
	{
		title: "Pacing",
		items: [
			{ tag: "[pause]", hint: "a beat between sentences" },
			{ tag: "[short pause]", hint: "a shorter beat" },
			{ tag: "[emphasis]", hint: "stress what follows" },
			{ tag: "[inhale]", hint: "an audible breath in" },
			{ tag: "[exhale]", hint: "a breath out" },
		],
	},
	{
		title: "Warmth",
		items: [
			{ tag: "[delight]", hint: "pleased" },
			{ tag: "[excited]", hint: "measured: raises pitch" },
			{ tag: "[excited tone]", hint: "the same, held across the line" },
			{ tag: "[chuckle]", hint: "a short laugh" },
			{ tag: "[laughing tone]", hint: "smiling while speaking" },
			{ tag: "[sigh]", hint: "a sigh" },
		],
	},
	{
		title: "Volume",
		items: [
			{ tag: "[whisper]", hint: "whispered — note the singular" },
			{ tag: "[low voice]", hint: "quieter, confiding" },
			{ tag: "[low volume]", hint: "quieter overall" },
			{ tag: "[volume down]", hint: "drop from here" },
			{ tag: "[volume up]", hint: "lift from here" },
			{ tag: "[loud]", hint: "loud" },
		],
	},
	{
		title: "Feeling",
		items: [
			{ tag: "[surprised]", hint: "surprised" },
			{ tag: "[shocked]", hint: "stronger than surprised" },
			{ tag: "[sad]", hint: "sad" },
			{ tag: "[angry]", hint: "angry" },
			{ tag: "[tsk]", hint: "a disapproving click" },
			{ tag: "[clearing throat]", hint: "clears the throat" },
		],
	},
];

/** Every tag the palette offers, for validating what an author typed. */
const KNOWN = new Set(
	ANNOTATIONS.flatMap((group) => group.items.map((item) => item.tag)),
);

/**
 * Tags in `text` that are not on the official list.
 *
 * Advisory, never blocking: free-form descriptions are supported and are
 * indistinguishable from typos by shape alone. The point is to catch
 * `[whispers]` before it ships as silence, not to stop anyone experimenting.
 */
export function unknownTags(text: string): string[] {
	const found = text.match(/\[[^[\]]{1,48}\]/g) ?? [];
	return [...new Set(found.filter((tag) => !KNOWN.has(tag.toLowerCase())))];
}

/**
 * `text` with `tag` inserted at `[start, end)`, and where the caret lands.
 *
 * Pulled out of the component because it was worth testing and could not be:
 * the first version read `document.activeElement` to find the caret, which is
 * the palette button by the time a click handler runs, so every tag went to
 * the end of the box. A pure function takes the caret as an argument and
 * cannot make that mistake.
 *
 * Spacing is normalised around the insertion rather than assumed, since a tag
 * may land mid-word, against existing spaces, or at either end.
 */
export function insertAt(
	text: string,
	tag: string,
	start: number,
	end: number,
): { text: string; caret: number } {
	const before = text.slice(0, start);
	const after = text.slice(end);
	const head = `${before} ${tag} `.replace(/\s{2,}/g, " ").trimStart();
	const whole = `${head}${after}`.replace(/\s{2,}/g, " ");
	return { text: whole.trimEnd(), caret: head.length };
}
