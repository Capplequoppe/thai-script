import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		exclude: ["e2e/**", "node_modules/**"],
	},
	base: "/thai-script/",
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		watch: {
			// The dev server's default watcher covers the whole repo root (only
			// node_modules/.git are excluded by chokidar's own defaults), which
			// includes directories nothing in the client module graph reads:
			// plan-runner transcripts/logs written live under `plans/`, the
			// conversation e2e project's own backend-process artifacts, and
			// Playwright's own output. A write there still triggers Vite's
			// full-reload broadcast to every connected page — observed
			// resetting the conversation-practice e2e suite's recorder to
			// "idle" mid-take (task 1.4's AC2/AC3 flake), independent of and in
			// addition to the service-worker cause already fixed for that
			// project. None of these paths can ever affect what the app
			// serves, so they are excluded from the watch outright rather than
			// only from the client module graph.
			ignored: [
				"**/plans/**",
				"**/backend/**",
				"**/test-results/**",
				"**/playwright-report/**",
				"**/.e2e-conversation-backend.pid",
			],
		},
	},
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			strategies: "injectManifest",
			srcDir: "src",
			filename: "sw.ts",
			injectRegister: false,
			manifest: false,
			injectManifest: {
				injectionPoint: undefined,
			},
			devOptions: {
				enabled: true,
				type: "module",
			},
		}),
	],
});
