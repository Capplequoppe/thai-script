import { describe, expect, it } from "vitest";
import {
	buildWordClassTabs,
	filterByWordClassTab,
	OTHER_KEY,
} from "./wordClass";

const ENTRIES = [
	{ word_class: "n" },
	{ word_class: "n" },
	{ word_class: "v" },
	{ word_class: "" },
	{ word_class: "unknown-class" },
];

describe("buildWordClassTabs", () => {
	it("builds an All tab plus one per class present, ordered by CLASS_ORDER, with Other last", () => {
		const tabs = buildWordClassTabs(ENTRIES);

		expect(tabs.map((t) => t.key)).toEqual(["all", "n", "v", OTHER_KEY]);
		expect(tabs.map((t) => t.count)).toEqual([5, 2, 1, 2]);
	});

	it("folds an unrecognised, non-empty word_class into Other alongside an empty one", () => {
		const tabs = buildWordClassTabs([{ word_class: "unknown-class" }]);

		expect(tabs.map((t) => t.key)).toEqual(["all", OTHER_KEY]);
		expect(tabs.find((t) => t.key === OTHER_KEY)?.count).toBe(1);
	});

	it("returns just the All tab for an empty list", () => {
		expect(buildWordClassTabs([])).toEqual([
			{ key: "all", label: "All", count: 0 },
		]);
	});
});

describe("filterByWordClassTab", () => {
	it("returns everything for 'all'", () => {
		expect(filterByWordClassTab(ENTRIES, "all")).toEqual(ENTRIES);
	});

	it("filters to a known class", () => {
		expect(filterByWordClassTab(ENTRIES, "n")).toEqual([
			{ word_class: "n" },
			{ word_class: "n" },
		]);
	});

	it("groups empty and unrecognised classes under Other", () => {
		const otherEntries = filterByWordClassTab(ENTRIES, OTHER_KEY);
		expect(otherEntries).toEqual([
			{ word_class: "" },
			{ word_class: "unknown-class" },
		]);
	});
});
