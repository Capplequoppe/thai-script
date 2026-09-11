export const WORD_CLASS_LABELS: Record<string, string> = {
	n: "Nouns",
	v: "Verbs",
	adj: "Adjectives",
	adv: "Adverbs",
	part: "Particles",
	conj: "Conjunctions",
	pron: "Pronouns",
	clf: "Classifiers",
	int: "Interjections",
	prep: "Prepositions",
};

// Preferred tab ordering for known classes.
export const CLASS_ORDER = [
	"n",
	"v",
	"adj",
	"adv",
	"part",
	"conj",
	"pron",
	"clf",
	"int",
	"prep",
];

// Sentinel for words with empty or unrecognised word_class.
export const OTHER_KEY = "__other__";

export function toTabKey(word_class: string): string {
	if (!word_class || !(word_class in WORD_CLASS_LABELS)) return OTHER_KEY;
	return word_class;
}

export interface WordClassTab {
	key: string;
	label: string;
	count: number;
}

/**
 * Builds the "All" + known classes (in `CLASS_ORDER`) + any unrecognised
 * classes + "Other" tab list, with per-tab counts over `entries`.
 */
export function buildWordClassTabs(
	entries: readonly { word_class: string }[],
): WordClassTab[] {
	const counts = new Map<string, number>();
	for (const entry of entries) {
		const key = toTabKey(entry.word_class);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	const present = new Set(counts.keys());
	const result: WordClassTab[] = [
		{ key: "all", label: "All", count: entries.length },
	];

	for (const cls of CLASS_ORDER) {
		if (present.has(cls)) {
			result.push({
				key: cls,
				label: WORD_CLASS_LABELS[cls] ?? cls,
				count: counts.get(cls) ?? 0,
			});
		}
	}
	for (const key of present) {
		if (key !== OTHER_KEY && !CLASS_ORDER.includes(key)) {
			result.push({
				key,
				label: WORD_CLASS_LABELS[key] ?? key,
				count: counts.get(key) ?? 0,
			});
		}
	}
	if (present.has(OTHER_KEY)) {
		result.push({
			key: OTHER_KEY,
			label: "Other",
			count: counts.get(OTHER_KEY) ?? 0,
		});
	}

	return result;
}

/** Filters `entries` down to the tab selected from `buildWordClassTabs`. */
export function filterByWordClassTab<T extends { word_class: string }>(
	entries: readonly T[],
	tabKey: string,
): T[] {
	if (tabKey === "all") return [...entries];
	if (tabKey === OTHER_KEY) {
		return entries.filter(
			(e) => !e.word_class || !(e.word_class in WORD_CLASS_LABELS),
		);
	}
	return entries.filter((e) => e.word_class === tabKey);
}
