import { describe, expect, it } from "vitest";
import { type CardPool, CardPools } from "./CardPool";

describe("CardPools", () => {
	it("SCRIPT has value 'script'", () => {
		expect(CardPools.SCRIPT).toBe("script");
	});

	it("VOCAB has value 'vocab'", () => {
		expect(CardPools.VOCAB).toBe("vocab");
	});

	it("GRAMMAR has value 'grammar'", () => {
		expect(CardPools.GRAMMAR).toBe("grammar");
	});

	describe("all", () => {
		it("returns all three card pools", () => {
			const all = CardPools.all();
			expect(all).toHaveLength(3);
			expect(all).toContain("script");
			expect(all).toContain("vocab");
			expect(all).toContain("grammar");
		});
	});

	describe("isValid", () => {
		it("returns true for valid card pools", () => {
			expect(CardPools.isValid("script")).toBe(true);
			expect(CardPools.isValid("vocab")).toBe(true);
			expect(CardPools.isValid("grammar")).toBe(true);
		});

		it("returns false for invalid strings", () => {
			expect(CardPools.isValid("invalid")).toBe(false);
			expect(CardPools.isValid("")).toBe(false);
			expect(CardPools.isValid("Script")).toBe(false);
		});

		it("narrows the type via type guard", () => {
			const value: string = "script";
			if (CardPools.isValid(value)) {
				const pool: CardPool = value;
				expect(pool).toBe("script");
			}
		});
	});
});
