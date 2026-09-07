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
});
