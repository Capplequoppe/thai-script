import { describe, expect, it } from "vitest";
import {
	classColorForLevel,
	classCueState,
	classDistrict,
	classDistrictForLevel,
	districtOpacityForLevel,
} from "./consonantClassColor";

describe("classCueState", () => {
	it("reports not-applicable for no class at all", () => {
		expect(classCueState(null)).toBe("not-applicable");
		expect(classCueState(undefined)).toBe("not-applicable");
		expect(classCueState("")).toBe("not-applicable");
	});

	it("reports known for each real class", () => {
		expect(classCueState("low")).toBe("known");
		expect(classCueState("mid")).toBe("known");
		expect(classCueState("high")).toBe("known");
	});

	it("reports unresolved for a non-empty value that isn't a real class, distinctly from not-applicable", () => {
		expect(classCueState("unresolved")).toBe("unresolved");
		expect(classCueState("unresolved")).not.toBe(classCueState(null));
	});
});

describe("classDistrict", () => {
	it("derives from the same class->district mapping sceneGrammar.ts declares", () => {
		expect(classDistrict("low")).toBe("harbor");
		expect(classDistrict("mid")).toBe("market");
		expect(classDistrict("high")).toBe("temple");
	});

	it("is undefined for not-applicable and unresolved alike", () => {
		expect(classDistrict(null)).toBeUndefined();
		expect(classDistrict("unresolved")).toBeUndefined();
	});
});

// AC3: district and colour fade on one schedule.
describe("district and colour fade together", () => {
	it("both present at full and fading, both absent once burned", () => {
		for (const level of ["full", "fading"] as const) {
			expect(classColorForLevel("high", level)).toBeTruthy();
			expect(classDistrictForLevel("high", level)).toBeTruthy();
		}

		expect(classColorForLevel("high", "none")).toBeUndefined();
		expect(classDistrictForLevel("high", "none")).toBeUndefined();
	});

	it("opacity fades at the same 'fading' step colour blends at", () => {
		expect(districtOpacityForLevel("full")).toBe(1);
		expect(districtOpacityForLevel("fading")).toBe(0.5);
		expect(districtOpacityForLevel("none")).toBe(1);
		// "none" opacity is moot: classDistrictForLevel already returns
		// undefined at "none", so nothing renders to apply it to.
	});
});

// AC7: the class scaffold keys on the symbol's own SRS stage, not a
// containing word's. The function takes a level per call and carries no
// state across calls, so two consonants in the same word — one still weak,
// one long mastered — each fade independently when a caller (a future
// WordCard) passes each its own stage.
describe("classDistrictForLevel keys on the symbol's own stage", () => {
	it("returns independent results for two calls with different levels, as if for two consonants in one word", () => {
		const weakConsonant = classDistrictForLevel("high", "full");
		const masteredConsonant = classDistrictForLevel("low", "none");

		expect(weakConsonant).toBe("temple");
		expect(masteredConsonant).toBeUndefined();

		// Order doesn't matter and neither call leaks into the other.
		const masteredAgain = classDistrictForLevel("low", "none");
		const weakAgain = classDistrictForLevel("high", "full");
		expect(masteredAgain).toBe(masteredConsonant);
		expect(weakAgain).toBe(weakConsonant);
	});
});
