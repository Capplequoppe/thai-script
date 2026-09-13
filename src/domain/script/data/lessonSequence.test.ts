import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	lessonCount,
	lessonEntryByNumber,
	lessonSequence,
} from "./lessonSequence";
import { lessons } from "./symbols";

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

describe("the declared lesson sequence", () => {
	it("declares a stable id and a position for every lesson", () => {
		expect(lessonSequence.length).toBe(lessons.length);
		for (const lesson of lessons) {
			const entry = lessonEntryByNumber(lesson.number);
			expect(entry, `lesson ${lesson.number} has no declared id`).toBeDefined();
			expect(entry?.id).toMatch(/^[a-z0-9-]{1,64}$/);
		}
	});

	it("gives positions that are unique and total over 1..n", () => {
		const positions = lessonSequence.map((entry) => entry.position);
		expect(new Set(positions).size).toBe(positions.length);
		expect(positions).toEqual(lessonSequence.map((_entry, index) => index + 1));
	});

	it("gives ids that are unique", () => {
		const ids = lessonSequence.map((entry) => entry.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("is the only place course order is read from — order matches the lessons table", () => {
		expect(lessonSequence.map((entry) => entry.legacyNumber)).toEqual(
			lessons.map((lesson) => lesson.number),
		);
	});
});

describe("the derived lesson count", () => {
	it("equals the number of declared entries", () => {
		expect(lessonCount).toBe(lessonSequence.length);
	});

	it("is declared with no integer literal for the count", () => {
		const source = readFileSync(
			join(import.meta.dirname, "lessonSequence.ts"),
			"utf8",
		);
		const literalCount = /\b\w*(?:count|total)\w*\s*[:=]\s*\d+/i;
		expect(source).not.toMatch(literalCount);
		expect(source).toMatch(/lessonCount\s*=\s*lessonSequence\.length/);
	});
});

describe("no concept is declared twice (CONTEXT.md rule 2)", () => {
	it("declares the tone-contour vocabulary exactly once", () => {
		expect(
			countMatches(
				/(?:const|let|var|function|type|interface|enum)\s+TONE_CONTOUR_POINTS\b/g,
			),
		).toBe(1);
	});

	it("declares symbol priority exactly once", () => {
		expect(countMatches(/readonly priority\?: number/g)).toBe(1);
	});

	it("declares the class badge exactly once", () => {
		expect(countMatches(/function ClassBadge\b/g)).toBe(1);
	});
});
