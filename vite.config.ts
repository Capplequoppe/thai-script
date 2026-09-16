import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		exclude: ["e2e/**", "node_modules/**", ".plan-runner-worktrees/**"],
	},
	base: "/thai-script/",
	build: {
		rollupOptions: {
			output: {
				// The content data (vocabulary above all — ~6.7 MB raw, and
				// Vite already emits it as a fast `JSON.parse("...")` rather
				// than an object literal) dwarfs the application code. Kept in
				// the same chunk, every app-code deploy changes the one hashed
				// bundle and forces each returning learner to re-download all
				// of it. Split out, the data chunk keeps its hash across any
				// deploy that does not touch the content, so the service worker
				// (cache-first on `/assets/*`) keeps serving it from disk and
				// only the small app chunk is re-fetched.
				manualChunks: {
					"content-data": [
						"./src/domain/vocabulary/data/vocabulary.json",
						"./src/domain/sentence/data/sentences.json",
						"./src/domain/grammar/data/grammar.json",
					],
				},
			},
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		// The deck studio's backend (`scripts/studio_server.py`), proxied so the
		// page can call it same-origin. Dev only, and deliberately not started
		// by Vite: it holds several gigabytes of GPU models resident, which
		// nobody running the app to *use* it should be made to pay for. Start it
		// alongside when authoring — `npm run studio`.
		proxy: {
			"/__studio": {
				target: "http://127.0.0.1:5174",
				changeOrigin: false,
			},
		},
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
			// `scripts/*-env/` are Python virtual environments and a vendored
			// fish-speech checkout — build inputs for the lesson-deck audio
			// pipeline, and not a small number of files: each venv carries a
			// full torch and CUDA stack, tens of thousands of files apiece.
			// Watching them does not merely waste effort, it exhausts the
			// kernel's inotify limit and the dev server dies on startup with
			// `ENOSPC: System limit for number of file watchers reached`.
			// Being gitignored does not help — chokidar watches the
			// filesystem, not the index.
			ignored: [
				"**/plans/**",
				"**/backend/**",
				"**/test-results/**",
				"**/playwright-report/**",
				"**/.e2e-conversation-backend.pid",
				"**/scripts/*-env/**",
				// The deck studio writes here constantly — a rebuild lands sixty
				// mp3s, a deck.json and a manifest, and saving one slide rewrites
				// its Markdown. Each write broadcasts a full reload, so the page
				// flashes and loses its place in the middle of the very operation
				// it started. Nothing here is in the client module graph: the app
				// fetches these over HTTP at runtime and the studio re-fetches
				// through its own API, so a reload buys nothing and costs the
				// author their scroll position, their selection and their
				// unsaved edits.
				"**/public/lessons/**",
				"**/content/lessons/**",
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
