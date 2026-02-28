import { describe, expect, it } from "vitest";
import { EaseFactor } from "./EaseFactor";

describe("EaseFactor", () => {
	describe("create", () => {
		it("defaults to 2.0", () => {
			expect(EaseFactor.create().value).toBe(2.0);
		});

		it("accepts a valid value", () => {
			expect(EaseFactor.create(2.5).value).toBe(2.5);
		});

		it("clamps below MIN to 1.3", () => {
			expect(EaseFactor.create(0.5).value).toBe(1.3);
		});

		it("clamps above MAX to 3.0", () => {
			expect(EaseFactor.create(5.0).value).toBe(3.0);
		});

		it("accepts exact MIN boundary", () => {
			expect(EaseFactor.create(1.3).value).toBe(1.3);
		});

		it("accepts exact MAX boundary", () => {
			expect(EaseFactor.create(3.0).value).toBe(3.0);
		});
	});

	describe("default", () => {
		it("returns 2.0", () => {
			expect(EaseFactor.default().value).toBe(2.0);
		});
	});

	describe("adjust", () => {
		it("increases by positive delta", () => {
			const ef = EaseFactor.create(2.0);
			expect(ef.adjust(0.15).value).toBeCloseTo(2.15);
		});

		it("clamps at MIN when decreasing beyond limit", () => {
			const ef = EaseFactor.create(1.5);
			expect(ef.adjust(-0.3).value).toBe(1.3);
		});
	});
});
