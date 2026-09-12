import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: "http://localhost:5173",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		// The conversation-practice suite gets its own isolated project rather
		// than joining the shared `webServer` array above: that array starts
		// unconditionally for every project regardless of `--project`
		// filtering, so a second (GPU-backed) entry there would force the
		// `chromium` project's existing home/lesson-intro specs to also boot
		// the backend. Playwright's setup/teardown dependency mechanism scopes
		// process lifecycle to only the projects that declare it.
		{
			name: "conversation-backend-setup",
			testMatch: /conversation-backend\.setup\.ts/,
			teardown: "conversation-backend-teardown",
		},
		{
			name: "conversation-backend-teardown",
			testMatch: /conversation-backend\.teardown\.ts/,
		},
		{
			name: "conversation-practice",
			testMatch: /conversation-practice(-fail)?\.spec\.ts/,
			dependencies: ["conversation-backend-setup"],
			teardown: "conversation-backend-teardown",
			// Single-process, single-GPU, synchronous-per-request backend
			// (CONTEXT.md) — concurrent cases would serialize behind the GPU
			// and time out looking like flakes.
			fullyParallel: false,
			workers: 1,
			timeout: 5 * 60_000,
			use: {
				...devices["Desktop Chrome"],
				// The app's own PWA service worker (`src/main.tsx`) can finish
				// installing and `clients.claim()` an already-open tab mid-test,
				// which forces a full navigation of the page under test — a
				// multi-second reload that lands squarely inside this suite's
				// record → judge round trip (unlike the app's other, much
				// shorter-lived specs, which don't keep a page open long enough
				// to observe it). Blocked here, not by editing `main.tsx`: this
				// suite drives a fixed WAV through a UI still mid-recording when
				// that reload can land, and the resulting mid-flow reset was
				// observed resetting the recorder to "idle" — a test-timing
				// hazard, not a behavior this suite is scoped to change.
				serviceWorkers: "block",
				launchOptions: {
					args: [
						"--use-fake-device-for-media-stream",
						"--use-fake-ui-for-media-stream",
						"--use-file-for-fake-audio-capture=" +
							path.resolve(
								process.cwd(),
								"backend/tests/fixtures/reply-pass.wav",
							),
					],
				},
			},
		},
	],
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:5173",
		reuseExistingServer: !process.env.CI,
	},
});
