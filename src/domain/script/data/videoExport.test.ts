import { execFileSync, spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * Evidence for `export-deck-video.py`, read off its own JSON output and the
 * `video-manifest.json` it writes — the same discipline `generatedDeck.test.ts`
 * uses for the deck pipeline, and for the same reason: the exporter is Python
 * and this repository asserts over what a pipeline script emits rather than
 * adding a second test runner (CONTEXT.md, Conventions).
 *
 * Every case here needs `ffmpeg`/`ffprobe` on PATH: `buildFixtureLesson`
 * synthesizes each fixture's image and audio with them (task 6.1's `covers`
 * names only the script and this file, so nothing here is committed), and
 * the exporter itself shells out to them to render. `ffmpegAvailable` is
 * computed at module load, not inside `beforeAll` — `describe.skipIf` reads
 * its condition while the file is still being collected, before any
 * `beforeAll` has run, so a flag set there would always be seen at its
 * initial value.
 */

const REPO_ROOT = resolve(import.meta.dirname, "..", "..", "..", "..");
const SCRIPT = join(REPO_ROOT, "scripts", "export-deck-video.py");
const ffmpegAvailable = spawnSync("ffmpeg", ["-version"]).status === 0;

const temporaries: string[] = [];
function temporaryDir(): string {
	const created = mkdtempSync(join(tmpdir(), "deck-video-"));
	temporaries.push(created);
	return created;
}
afterAll(() => {
	for (const path of temporaries)
		rmSync(path, { recursive: true, force: true });
});

interface RunResult {
	status: number | null;
	stdout: string;
	stderr: string;
}

function run(args: string[]): RunResult {
	const result = spawnSync("python3", [SCRIPT, ...args], { encoding: "utf-8" });
	return {
		status: result.status,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

interface ExportResult {
	lessonId: string;
	state: "not-exported" | "current" | "stale";
	deckHash: string;
	rendered?: boolean;
	output?: { file: string; path: string };
}

/** A two-slide deck (each slide carrying one image and one audio segment)
 * plus its committed assets, under `<root>/<lessonId>/`. */
function buildFixtureLesson(root: string, lessonId: string): string {
	const lessonDir = join(root, lessonId);
	mkdirSync(join(lessonDir, "audio"), { recursive: true });

	for (const [name, color] of [
		["img1.png", "blue"],
		["img2.png", "red"],
	] as const) {
		execFileSync("ffmpeg", [
			"-y",
			"-loglevel",
			"error",
			"-f",
			"lavfi",
			"-i",
			`color=c=${color}:s=320x180`,
			"-frames:v",
			"1",
			join(lessonDir, name),
		]);
	}
	for (const name of ["a1.mp3", "a2.mp3"]) {
		execFileSync("ffmpeg", [
			"-y",
			"-loglevel",
			"error",
			"-f",
			"lavfi",
			"-i",
			"anullsrc=r=44100:cl=mono",
			"-t",
			"1",
			"-c:a",
			"mp3",
			join(lessonDir, "audio", name),
		]);
	}

	const deck = {
		lessonId,
		title: "Fixture lesson",
		slides: [
			{
				kind: "exposition",
				id: "s1",
				heading: "First",
				body: ["one"],
				image: "img1.png",
				audio: ["audio/a1.mp3"],
			},
			{
				kind: "exposition",
				id: "s2",
				heading: "Second",
				body: ["two"],
				image: "img2.png",
				audio: ["audio/a2.mp3"],
			},
		],
	};
	writeFileSync(join(lessonDir, "deck.json"), JSON.stringify(deck));
	writeFileSync(
		join(lessonDir, "manifest.json"),
		JSON.stringify({ lessonId, assets: [] }),
	);
	return lessonDir;
}

describe.skipIf(!ffmpegAvailable)("exporting a deck to video", () => {
	it("names one output covering every slide in order (AC1)", () => {
		const root = temporaryDir();
		buildFixtureLesson(root, "lesson-fixture");

		const result = run(["lesson-fixture", "--assets-root", root]);
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
		const parsed = JSON.parse(result.stdout) as ExportResult;
		expect(parsed.rendered).toBe(true);
		expect(parsed.output?.file).toBe("video/lesson.mp4");
		expect(
			existsSync(join(root, "lesson-fixture", "video", "lesson.mp4")),
		).toBe(true);

		const manifest = JSON.parse(
			execFileSync("cat", [
				join(root, "lesson-fixture", "video-manifest.json"),
			]).toString(),
		) as { segments: { slideId: string }[]; output: { file: string } };
		// One output, naming both slides, in the deck's own order.
		expect(manifest.output.file).toBe("video/lesson.mp4");
		expect(manifest.segments.map((segment) => segment.slideId)).toEqual([
			"s1",
			"s2",
		]);
	});

	it("detects a deck edited after export as stale, never as absent (AC2)", () => {
		const root = temporaryDir();
		const lessonDir = buildFixtureLesson(root, "lesson-fixture");

		const first = JSON.parse(
			run(["lesson-fixture", "--assets-root", root]).stdout,
		) as ExportResult;
		expect(first.state).toBe("current");

		const current = JSON.parse(
			run(["lesson-fixture", "--assets-root", root, "--state"]).stdout,
		) as ExportResult;
		expect(current.state).toBe("current");
		expect(current.deckHash).toBe(first.deckHash);

		const deck = JSON.parse(
			execFileSync("cat", [join(lessonDir, "deck.json")]).toString(),
		);
		deck.title = "Edited after export";
		writeFileSync(join(lessonDir, "deck.json"), JSON.stringify(deck));

		const stale = JSON.parse(
			run(["lesson-fixture", "--assets-root", root, "--state"]).stdout,
		) as ExportResult;
		expect(stale.state).toBe("stale");
		expect(stale.deckHash).not.toBe(first.deckHash);
	});

	it("reports re-exporting an unchanged deck as a no-op (AC3's no-op half)", () => {
		const root = temporaryDir();
		buildFixtureLesson(root, "lesson-fixture");

		const first = JSON.parse(
			run(["lesson-fixture", "--assets-root", root]).stdout,
		) as ExportResult;
		expect(first.rendered).toBe(true);

		const second = JSON.parse(
			run(["lesson-fixture", "--assets-root", root]).stdout,
		) as ExportResult;
		expect(second.rendered).toBe(false);
		expect(second.state).toBe("current");
		expect(second.output).toEqual(first.output);
	});
});

describe.skipIf(!ffmpegAvailable)("asset containment (AC4)", () => {
	it("refuses a deck whose slide asset path escapes the lesson directory", () => {
		const root = temporaryDir();
		const lessonDir = buildFixtureLesson(root, "lesson-fixture");
		const deck = JSON.parse(
			execFileSync("cat", [join(lessonDir, "deck.json")]).toString(),
		);
		deck.slides[0].image = "../escape.png";
		writeFileSync(join(lessonDir, "deck.json"), JSON.stringify(deck));

		const result = run(["lesson-fixture", "--assets-root", root]);
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain("resolves outside");
		expect(existsSync(join(root, "lesson-fixture", "video"))).toBe(false);
		// The refusal names the field, not the escaping value.
		expect(result.stderr).not.toContain("escape.png");
	});

	it("refuses a lesson id outside the closed charset before reading anything", () => {
		const root = temporaryDir();
		const result = run([
			"../not-a-lesson-id",
			"--assets-root",
			root,
			"--state",
		]);
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain("lessonId");
	});
});

describe.skipIf(!ffmpegAvailable)("the three export states (AC5)", () => {
	it("are three distinct values, declared on the export manifest itself", () => {
		const root = temporaryDir();
		buildFixtureLesson(root, "lesson-fixture");
		run(["lesson-fixture", "--assets-root", root]);
		const manifest = JSON.parse(
			execFileSync("cat", [
				join(root, "lesson-fixture", "video-manifest.json"),
			]).toString(),
		) as { schema: { states: string[] } };
		expect(manifest.schema.states).toEqual([
			"not-exported",
			"current",
			"stale",
		]);
		expect(new Set(manifest.schema.states).size).toBe(3);
	});

	it("reports a lesson with no export yet as not-exported", () => {
		const root = temporaryDir();
		buildFixtureLesson(root, "lesson-fixture");
		const result = JSON.parse(
			run(["lesson-fixture", "--assets-root", root, "--state"]).stdout,
		) as ExportResult;
		expect(result.state).toBe("not-exported");
	});

	it("reports an exported, unedited deck as current", () => {
		const root = temporaryDir();
		buildFixtureLesson(root, "lesson-fixture");
		run(["lesson-fixture", "--assets-root", root]);
		const result = JSON.parse(
			run(["lesson-fixture", "--assets-root", root, "--state"]).stdout,
		) as ExportResult;
		expect(result.state).toBe("current");
	});

	it("reports an exported, then edited deck as stale rather than absent", () => {
		const root = temporaryDir();
		const lessonDir = buildFixtureLesson(root, "lesson-fixture");
		run(["lesson-fixture", "--assets-root", root]);

		const deck = JSON.parse(
			execFileSync("cat", [join(lessonDir, "deck.json")]).toString(),
		);
		deck.title = "Changed";
		writeFileSync(join(lessonDir, "deck.json"), JSON.stringify(deck));

		const result = JSON.parse(
			run(["lesson-fixture", "--assets-root", root, "--state"]).stdout,
		) as ExportResult;
		expect(result.state).toBe("stale");
		// A stale export still has a recorded output on disk from the earlier
		// run — never reading as though it were never exported.
		expect(
			existsSync(join(root, "lesson-fixture", "video-manifest.json")),
		).toBe(true);
	});
});
