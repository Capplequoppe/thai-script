import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { validateDeck } from "./lessonContent";

/**
 * Evidence for the deck generation pipeline, read off its *output*.
 *
 * The generator is Python and this repository has no Python test framework;
 * adding one to gate content would put half this plan's evidence in a runner
 * nothing else uses. The generator's contract is what it emits, so that is
 * what is asserted over, from the runner already in use. `py_compile` gates
 * the scripts' syntax; everything below gates their behaviour.
 *
 * Three of these cases spawn the pipeline. They reach it through the scripted
 * vendor in `scripts/lesson_deck/testing/`, so no API call is made and no
 * credential is needed — the key below is a fake, and one case depends on it
 * being a fake it can search the output for.
 */

const REPO_ROOT = resolve(import.meta.dirname, "..", "..", "..", "..");
const SCRIPTS = join(REPO_ROOT, "scripts");
const FIXTURES = join(SCRIPTS, "lesson_deck", "fixtures");
const FIXTURE_ROOT = join(FIXTURES, "generated");
const FIXTURE_LESSON = join(FIXTURE_ROOT, "lesson-02");

/**
 * Not a credential. It is shaped like one so that the scan for key-shaped
 * strings would find it if the pipeline ever wrote it down, and the
 * scripted vendor echoes it back in its error text the way a real API echoes
 * a rejected request.
 */
const FAKE_KEY = "sk_fixturekey000000000000000000000";

const readJson = (path: string): unknown =>
	JSON.parse(readFileSync(path, "utf-8"));

const fixtureDeck = readJson(join(FIXTURE_LESSON, "deck.json")) as Record<
	string,
	unknown
>;
const fixtureManifest = readJson(join(FIXTURE_LESSON, "manifest.json")) as {
	schema: { segmentStates: string[]; verificationOutcomes: string[] };
	assets: {
		key: string;
		kind: string;
		state: string;
		language: string | null;
		inputHash: string;
		contentHash: string | null;
		path: string | null;
		file: string | null;
		verification: { outcome: string; attempts: number } | null;
		failure: string | null;
	}[];
};

const temporaries: string[] = [];
function temporaryRoot(): string {
	const created = mkdtempSync(join(tmpdir(), "lesson-deck-"));
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

function runScripted(
	scenario: string,
	assetsRoot: string,
	scriptOverride?: string,
): RunResult {
	const args = [
		join(SCRIPTS, "lesson_deck", "testing", "run_scripted.py"),
		"--scenario",
		join(FIXTURES, scenario),
		"--assets-root",
		assetsRoot,
	];
	if (scriptOverride) args.push("--script", scriptOverride);
	const result = spawnSync("python3", args, {
		encoding: "utf-8",
		env: { ...process.env, ELEVENLABS_API_KEY: FAKE_KEY },
	});
	return {
		status: result.status,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
	};
}

interface RunReport {
	synthCalls: number;
	transcribeCalls: number;
	reused: number;
	generated: number;
	failed: number;
	deckWritten: boolean;
	errors: string[];
}

function report(result: RunResult): RunReport {
	expect(result.stderr).toBe("");
	return JSON.parse(result.stdout) as RunReport;
}

function checkPaths(
	cases: { lessonId: unknown; assetPath: unknown }[],
	assetsRoot: string,
): ({ ok: true; path: string; url: string } | { ok: false; error: string })[] {
	const stdout = execFileSync(
		"python3",
		[
			join(SCRIPTS, "lesson_deck", "testing", "check_paths.py"),
			"--assets-root",
			assetsRoot,
		],
		{ encoding: "utf-8", input: JSON.stringify(cases) },
	);
	return JSON.parse(stdout);
}

describe("the deck a generation run emits", () => {
	it("validates against the deck schema", () => {
		const result = validateDeck(fixtureDeck);
		if (!result.ok) {
			throw new Error(
				`fixture deck rejected: ${result.errors.map((e) => e.message).join("; ")}`,
			);
		}
		expect(result.deck.lessonId).toBe("lesson-02");
		expect(result.deck.slides.map((slide) => slide.kind)).toEqual([
			"exposition",
			"retrieval",
			"reveal",
			"rule",
		]);
	});

	it("carries one slide per slide the script declares, in script order", () => {
		const declared = readFileSync(join(FIXTURES, "lesson-02.md"), "utf-8")
			.split("\n")
			.flatMap((line) => {
				const match = /^##\s+[a-z]+\s+(\S+)\s*$/.exec(line);
				return match ? [match[1]] : [];
			});
		expect(declared.length).toBeGreaterThan(0);
		const slides = fixtureDeck.slides as { id: string }[];
		expect(slides.map((slide) => slide.id)).toEqual(declared);
	});

	it("references every clip and image the manifest generated", () => {
		const referenced = new Set(
			(fixtureDeck.slides as { audio?: string[]; image?: string }[]).flatMap(
				(slide) => [
					...(slide.audio ?? []),
					...(slide.image ? [slide.image] : []),
				],
			),
		);
		const generated = fixtureManifest.assets.filter(
			(asset) => asset.state === "generated",
		);
		expect(generated.length).toBeGreaterThan(0);
		for (const asset of generated) {
			expect([...referenced]).toContain(asset.path);
		}
		expect(referenced.size).toBe(generated.length);
	});
});

describe("asset paths", () => {
	it("all resolve inside the lesson's own directory", () => {
		const paths = [
			...(fixtureDeck.slides as { audio?: string[]; image?: string }[]).flatMap(
				(slide) => [
					...(slide.audio ?? []),
					...(slide.image ? [slide.image] : []),
				],
			),
			...fixtureManifest.assets.flatMap((asset) =>
				asset.path ? [asset.path] : [],
			),
		];
		expect(paths.length).toBeGreaterThan(0);
		for (const path of paths) {
			expect(path.startsWith("/thai-script/lessons/lesson-02/")).toBe(true);
			const onDisk = resolve(
				FIXTURE_LESSON,
				path.slice("/thai-script/lessons/lesson-02/".length),
			);
			expect(relative(FIXTURE_LESSON, onDisk).startsWith(`..${sep}`)).toBe(
				false,
			);
			expect(existsSync(onDisk)).toBe(true);
		}
	});

	it("refuses a path that escapes the lesson directory, and a refused lesson id", () => {
		const root = temporaryRoot();
		const results = checkPaths(
			[
				{ lessonId: "lesson-02", assetPath: "audio/clip.mp3" },
				{ lessonId: "lesson-02", assetPath: "../escape.mp3" },
				{ lessonId: "lesson-02", assetPath: "audio/../../escape.mp3" },
				{ lessonId: "lesson-02", assetPath: "/etc/passwd" },
				{ lessonId: "Lesson-02", assetPath: "audio/clip.mp3" },
				{ lessonId: "lessons/../../etc", assetPath: "audio/clip.mp3" },
				{ lessonId: "l".repeat(65), assetPath: "audio/clip.mp3" },
				{ lessonId: 2, assetPath: "audio/clip.mp3" },
			],
			root,
		);

		expect(results[0]).toEqual({
			ok: true,
			path: join(root, "lesson-02", "audio", "clip.mp3"),
			url: "/thai-script/lessons/lesson-02/audio/clip.mp3",
		});
		for (const refused of results.slice(1)) {
			expect(refused.ok).toBe(false);
		}
		// The refusal names the key and never echoes the rejected value: a
		// refused id is attacker-shaped and this text reaches logs.
		for (const refused of results.slice(4)) {
			if (refused.ok) throw new Error("expected a refusal");
			expect(refused.error).not.toContain("etc");
			expect(refused.error).not.toContain("Lesson-02");
		}
	});

	it("refuses a script whose image reaches outside the script's directory", () => {
		// The read side of the same boundary. A lesson script is hand- and
		// agent-authored and its image bytes are committed under
		// `public/lessons/` and served, so an unconstrained `image:` publishes
		// whatever the generator can read.
		const home = temporaryRoot();
		const secret = join(temporaryRoot(), "credentials");
		writeFileSync(secret, "API_KEY=not-supposed-to-be-published");
		const script = join(home, "escaping.md");
		writeFileSync(
			script,
			readFileSync(join(FIXTURES, "lesson-02.md"), "utf-8").replace(
				"image: images/district.svg",
				`image: ${relative(home, secret)}`,
			),
		);

		const out = temporaryRoot();
		const result = runScripted("clean.json", out, script);
		expect(result.status).not.toBe(0);
		expect(JSON.parse(result.stdout).refused).toContain(
			"outside the directory holding the lesson script",
		);
		expect(existsSync(join(out, "lesson-02"))).toBe(false);
	});
});

describe("caching", () => {
	it("records a hash for each asset that matches the committed bytes", () => {
		expect(fixtureManifest.assets.length).toBeGreaterThan(0);
		for (const asset of fixtureManifest.assets) {
			expect(asset.state).toBe("generated");
			if (!asset.file || !asset.contentHash) {
				throw new Error(`${asset.key}: generated but records no file or hash`);
			}
			const bytes = readFileSync(join(FIXTURE_LESSON, asset.file));
			expect(createHash("sha256").update(bytes).digest("hex")).toBe(
				asset.contentHash,
			);
			// The cache key is in the filename, so a stale file cannot be
			// served under the name of fresh inputs.
			expect(asset.file).toContain(asset.inputHash.slice(0, 12));
		}
	});

	it("issues no API call when nothing in the script changed", () => {
		const root = temporaryRoot();
		const first = report(runScripted("clean.json", root));
		expect(first.synthCalls).toBeGreaterThan(0);
		expect(first.deckWritten).toBe(true);

		const second = report(runScripted("clean.json", root));
		expect(second.synthCalls).toBe(0);
		expect(second.transcribeCalls).toBe(0);
		expect(second.reused).toBe(first.generated);
	});

	it("regenerates only the edited segment and leaves the rest byte-identical", () => {
		const root = temporaryRoot();
		report(runScripted("clean.json", root));
		const before = hashTree(join(root, "lesson-02"));

		// A copy of the script with one narration line reworded. The image it
		// names is resolved relative to the script, so that moves with it.
		const editDir = temporaryRoot();
		execFileSync("cp", ["-r", join(FIXTURES, "images"), editDir]);
		const edited = join(editDir, "edited.md");
		const source = readFileSync(join(FIXTURES, "lesson-02.md"), "utf-8");
		const reworded = source.replace(
			"narration: en Answer out loud first, then turn the slide over.",
			"narration: en Say your answer aloud, and only then turn the slide over.",
		);
		expect(reworded).not.toBe(source);
		writeFileSync(edited, reworded);

		const second = report(runScripted("clean.json", root, edited));
		expect(second.synthCalls).toBe(1);
		expect(second.generated).toBe(1);

		const after = hashTree(join(root, "lesson-02"));
		const unchanged = [...before].filter(([file]) => after.has(file));
		// deck.json and manifest.json change; every other kept file is untouched.
		expect(unchanged.length).toBe(before.size - 1);
		for (const [file, hash] of unchanged) {
			if (file.endsWith(".json")) continue;
			expect(after.get(file)).toBe(hash);
		}
	});
});

function hashTree(root: string): Map<string, string> {
	const listing = execFileSync("find", [root, "-type", "f"], {
		encoding: "utf-8",
	})
		.split("\n")
		.filter(Boolean);
	return new Map(
		listing.map((path) => [
			relative(root, path),
			createHash("sha256").update(readFileSync(path)).digest("hex"),
		]),
	);
}

describe("the credential", () => {
	it("is required, and its absence stops the run naming it", () => {
		const root = temporaryRoot();
		const { ELEVENLABS_API_KEY: _dropped, ...env } = process.env;
		const result = spawnSync(
			"python3",
			[
				join(SCRIPTS, "generate-lesson-deck.py"),
				join(FIXTURES, "lesson-02.md"),
				"--assets-root",
				root,
			],
			{ encoding: "utf-8", env },
		);
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain("ELEVENLABS_API_KEY");
		// Not a partial run that reads as a success: nothing was written.
		expect(existsSync(join(root, "lesson-02"))).toBe(false);
	});

	it("never reaches a committed artifact, even when the vendor echoes it back", () => {
		for (const path of ["deck.json", "manifest.json"]) {
			expect(
				keyShapedIn(readFileSync(join(FIXTURE_LESSON, path), "utf-8")),
			).toEqual([]);
		}

		const root = temporaryRoot();
		const result = runScripted("vendor-echoes-key.json", root);
		expect(result.status).not.toBe(0);
		const manifest = readFileSync(
			join(root, "lesson-02", "manifest.json"),
			"utf-8",
		);
		for (const text of [manifest, result.stdout, result.stderr]) {
			expect(text).not.toContain(FAKE_KEY);
			expect(keyShapedIn(text)).toEqual([]);
		}
		// The diagnostic survives — echoing the vendor's body back is the whole
		// value of the error — and the credential inside it does not.
		expect(manifest).toContain("401 from the vendor");
		expect(manifest).toContain("[redacted]");
	});
});

/**
 * Anything in a committed artifact that could be a credential: an `sk_`-
 * prefixed token, or a credential-named field holding something other than the
 * redaction marker. Content hashes are hex and much longer, so a blind
 * long-token scan would drown in them.
 */
function keyShapedIn(text: string): string[] {
	const prefixed = text.match(/sk_[A-Za-z0-9]{16,}/g) ?? [];
	const named = [
		...text.matchAll(/(?:xi-)?api[-_]?key[^A-Za-z0-9[]{1,8}(\S{8,})/gi),
	]
		.map((match) => match[1])
		.filter((value) => !value.startsWith("[redacted]"));
	return [...prefixed, ...named];
}

describe("transcribing a Thai clip back", () => {
	it("retries a mismatched take and records the outcome that finally passed", () => {
		const root = temporaryRoot();
		const run = report(runScripted("retry-then-pass.json", root));
		expect(run.deckWritten).toBe(true);
		// One extra synthesis and one extra transcription over the clean run:
		// the Thai line was voiced twice.
		expect(run.transcribeCalls).toBe(2);

		const manifest = readJson(
			join(root, "lesson-02", "manifest.json"),
		) as typeof fixtureManifest;
		const thai = manifest.assets.filter((asset) => asset.language === "th");
		expect(thai.length).toBeGreaterThan(0);
		for (const asset of thai) {
			expect(asset.state).toBe("generated");
			expect(asset.verification?.outcome).toBe("verified");
			expect(asset.verification?.attempts).toBe(2);
		}
		// English lines are not transcribed back, and say so rather than
		// claiming a verification they never took.
		for (const asset of manifest.assets.filter((a) => a.language === "en")) {
			expect(asset.verification?.outcome).toBe("not-required");
		}
	});

	it("ships no clip that never verified, and no deck either", () => {
		const root = temporaryRoot();
		const result = runScripted("never-verifies.json", root);
		expect(result.status).not.toBe(0);
		const run = JSON.parse(result.stdout) as RunReport;
		expect(run.failed).toBe(1);
		expect(run.deckWritten).toBe(false);
		expect(existsSync(join(root, "lesson-02", "deck.json"))).toBe(false);

		const manifest = readJson(
			join(root, "lesson-02", "manifest.json"),
		) as typeof fixtureManifest;
		const failed = manifest.assets.filter((asset) => asset.state === "failed");
		expect(failed).toHaveLength(1);
		expect(failed[0].language).toBe("th");
		expect(failed[0].verification?.outcome).toBe("mismatch");
		expect(failed[0].path).toBeNull();
	});
});

describe("the three segment states", () => {
	it("are three distinct values, declared on the manifest itself", () => {
		const states = fixtureManifest.schema.segmentStates;
		expect(states).toEqual(["absent", "generated", "failed"]);
		expect(new Set(states).size).toBe(3);
	});

	it("record a failed segment as failed, never as one that is simply absent", () => {
		const root = temporaryRoot();
		runScripted("never-verifies.json", root);
		const manifest = readJson(
			join(root, "lesson-02", "manifest.json"),
		) as typeof fixtureManifest;
		expect(new Set(manifest.schema.segmentStates).size).toBe(3);

		// Every declared segment is present with a state; the failed one is
		// neither omitted from the manifest nor recorded as never generated.
		const states = new Map(
			manifest.assets.map((asset) => [asset.key, asset.state]),
		);
		expect(states.size).toBe(fixtureManifest.assets.length);
		expect(states.get("district-1")).toBe("failed");
		expect([...states.values()]).not.toContain("absent");
		for (const state of states.values()) {
			expect(manifest.schema.segmentStates).toContain(state);
		}
		// The manifest declares two vocabularies; both are checked against the
		// assets that use them, or the unchecked one drifts.
		for (const asset of manifest.assets) {
			if (!asset.verification) continue;
			expect(manifest.schema.verificationOutcomes).toContain(
				asset.verification.outcome,
			);
		}
	});
});
