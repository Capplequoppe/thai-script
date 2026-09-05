import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const GAME_DIR = fileURLToPath(new URL(".", import.meta.url));

const OUTWARD_LAYER = /(presentation|application|infrastructure)/;

const IMPORT_SPECIFIER =
	/\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm;

function typeScriptFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return typeScriptFiles(path);
		return entry.isFile() && path.endsWith(".ts") ? [path] : [];
	});
}

function importSpecifiers(source: string): string[] {
	const specifiers: string[] = [];
	for (const match of source.matchAll(IMPORT_SPECIFIER)) {
		const specifier = match[1] ?? match[2] ?? match[3];
		if (specifier) specifiers.push(specifier);
	}
	return specifiers;
}

describe("src/domain/game architecture", () => {
	const files = typeScriptFiles(GAME_DIR);

	it("finds the game module's source files", () => {
		expect(files.length).toBeGreaterThan(0);
	});

	it("never imports presentation, application, or infrastructure", () => {
		const violations = files.flatMap((path) =>
			importSpecifiers(readFileSync(path, "utf8"))
				.filter((specifier) => OUTWARD_LAYER.test(specifier))
				.map((specifier) => `${path.slice(GAME_DIR.length)} -> ${specifier}`),
		);

		expect(violations).toEqual([]);
	});

	it("exports the game round vocabulary the rest of the plan builds on", () => {
		const source = files.map((path) => readFileSync(path, "utf8")).join("\n");
		const required = [
			"GameItem",
			"GameRoundConfig",
			"GameRatingRecord",
			"GameRoundSummary",
			"GameHistoryEntry",
			"GameHistoryRepository",
		];

		const missing = required.filter(
			(name) =>
				!new RegExp(
					`export\\s+(?:type|interface|class|abstract\\s+class)\\s+${name}\\b`,
				).test(source),
		);

		expect(missing).toEqual([]);
	});
});
