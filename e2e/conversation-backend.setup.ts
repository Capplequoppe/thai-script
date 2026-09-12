import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";

/**
 * Starts the real conversation backend, scoped to the `conversation-practice`
 * project via Playwright's setup/teardown dependency mechanism — NOT the
 * shared top-level `webServer` array, which starts unconditionally for every
 * project regardless of `--project` filtering (confirmed against this repo's
 * installed Playwright: `webServer` has no per-project scoping). A setup
 * project only runs when something depends on it, which is what actually
 * keeps the app's existing `home`/`lesson-intro` specs from ever booting a
 * GPU backend.
 *
 * This does NOT wait for the models to finish loading — that is the actual
 * spec's own `beforeAll` (AC1), which polls `/health`'s per-model shape and
 * names whichever model never became ready. This step only confirms the
 * process itself started (it would exit almost immediately on a missing venv
 * or a port already in use).
 */
const PID_FILE = path.join(process.cwd(), ".e2e-conversation-backend.pid");

test("start the conversation backend", async () => {
	const proc = spawn(
		"uv",
		["run", "--project", ".", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
		{
			cwd: path.join(process.cwd(), "backend"),
			detached: true,
			stdio: "ignore",
		},
	);
	proc.unref();
	writeFileSync(PID_FILE, String(proc.pid));

	// A few seconds is enough to catch an instant crash (missing venv, port
	// already bound) without waiting anywhere near as long as a cold model
	// load takes — that wait belongs to the spec's own readiness poll.
	await new Promise((resolve) => setTimeout(resolve, 2000));
});
