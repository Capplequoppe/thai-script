import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";

/** Stops the backend `conversation-backend.setup.ts` started, by PID. */
const PID_FILE = path.join(process.cwd(), ".e2e-conversation-backend.pid");

test("stop the conversation backend", async () => {
	if (!existsSync(PID_FILE)) return;
	const pid = Number(readFileSync(PID_FILE, "utf-8"));
	if (Number.isFinite(pid) && pid > 0) {
		try {
			// Negative pid signals the whole process group — uv spawns uvicorn
			// as a child, and killing only the uv wrapper would leave uvicorn
			// (and the GPU models it loaded) running.
			process.kill(-pid, "SIGTERM");
		} catch {
			// Already gone.
		}
	}
	rmSync(PID_FILE, { force: true });
});
