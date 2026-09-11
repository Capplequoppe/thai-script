import { describe, expect, it } from "vitest";
import { withDottedCircles } from "./thaiText";

describe("withDottedCircles", () => {
	it("inserts a dotted circle before a mark that follows the '-' placeholder", () => {
		expect(withDottedCircles("เ-ือะ")).toBe("เ-◌ือะ");
		expect(withDottedCircles("เ-ือ")).toBe("เ-◌ือ");
		expect(withDottedCircles("-ัว")).toBe("-◌ัว");
		expect(withDottedCircles("-ัวะ")).toBe("-◌ัวะ");
		expect(withDottedCircles("เ-ีย")).toBe("เ-◌ีย");
		expect(withDottedCircles("เ-ียะ")).toBe("เ-◌ียะ");
	});

	it("inserts a dotted circle before a mark that opens the string", () => {
		expect(withDottedCircles("ะ")).toBe("ะ");
		expect(withDottedCircles("ั")).toBe("◌ั");
	});

	it("leaves marks that already follow a consonant untouched", () => {
		expect(withDottedCircles("มือ")).toBe("มือ");
		expect(withDottedCircles("เ-อะ")).toBe("เ-อะ");
		expect(withDottedCircles("กัน")).toBe("กัน");
	});

	it("leaves plain text untouched", () => {
		expect(withDottedCircles("")).toBe("");
		expect(withDottedCircles("abc")).toBe("abc");
	});

	// Symbol data's standalone "above" vowels use a leading space as a filler
	// placeholder (สระ อี/อิ/อึ/อื), inconsistently with siblings like "ั" that
	// use none at all — see the component's own doc comment. The space must
	// not survive alongside the inserted circle, or the mark renders with a
	// stray gap in front of it.
	it("replaces a leading filler space with the dotted circle instead of keeping both", () => {
		expect(withDottedCircles(" ี")).toBe("◌ี");
		expect(withDottedCircles(" ิ")).toBe("◌ิ");
		expect(withDottedCircles(" ึ")).toBe("◌ึ");
		expect(withDottedCircles(" ื")).toBe("◌ื");
	});
});
