import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	computeAnyPositionFrequency,
	consonantCount,
	deriveConsonantPriority,
	getSchedulingPriority,
} from "./symbolPriority";
import { consonants } from "./symbols";

const SRC_ROOT = join(import.meta.dirname, "..", "..", "..");

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		if (!/\.tsx?$/.test(entry.name)) return [];
		if (/\.test\.tsx?$/.test(entry.name)) return [];
		return [path];
	});
}

function countMatches(pattern: RegExp): number {
	return sourceFiles(SRC_ROOT).reduce((total, path) => {
		const matches = readFileSync(path, "utf8").match(pattern);
		return total + (matches ? matches.length : 0);
	}, 0);
}

describe("AC4 — one priority declaration site repo-wide", () => {
	it("declares the priority field exactly once, in symbols.ts", () => {
		expect(countMatches(/readonly priority\?: number/g)).toBe(1);
	});

	it("declares no second priority array in symbolPriority.ts itself", () => {
		const source = readFileSync(
			join(import.meta.dirname, "symbolPriority.ts"),
			"utf8",
		);
		expect(source).not.toMatch(/priority:\s*\d+/);
	});

	it("reads ThaiConsonant.priority directly rather than a parallel map", () => {
		for (const consonant of consonants) {
			expect(getSchedulingPriority(consonant.character)).toBe(
				consonant.priority,
			);
		}
	});
});

describe("AC5 — priority is computed from any-position corpus frequency", () => {
	it("counts a consonant wherever it appears in a word, not only initially", () => {
		const entries = [
			{ characters: ["ก", "า"] }, // ก initial only
			{ characters: ["ม", "า", "ก"] }, // ก final here
		];
		const frequency = computeAnyPositionFrequency(entries);
		expect(frequency.get("ก")).toBe(2);
	});

	it("matches the declared symbols.ts priority for every consonant", () => {
		const derived = deriveConsonantPriority();
		for (const consonant of consonants) {
			expect(
				derived.get(consonant.character),
				`priority for ${consonant.character}`,
			).toBe(consonant.priority);
		}
	});

	it("gives the most frequent consonant the highest priority (rank 1)", () => {
		const frequency = computeAnyPositionFrequency();
		const derived = deriveConsonantPriority(frequency);
		const topByFrequency = [...frequency.entries()].sort(
			(a, b) => b[1] - a[1],
		)[0][0];
		expect(derived.get(topByFrequency)).toBe(1);
	});
});

describe("AC6 — demotion never shrinks the symbol set", () => {
	it("keeps all 44 consonants in the SRS", () => {
		expect(consonantCount()).toBe(44);
		expect(consonants).toHaveLength(44);
	});

	it("gives every consonant a priority", () => {
		for (const consonant of consonants) {
			expect(consonant.priority).toBeTypeOf("number");
		}
	});

	it("assigns every rank 1..44 exactly once — demotion reorders, never removes", () => {
		const derived = deriveConsonantPriority();
		const values = [...derived.values()].sort((a, b) => a - b);
		expect(values).toEqual(Array.from({ length: 44 }, (_, index) => index + 1));
	});
});
