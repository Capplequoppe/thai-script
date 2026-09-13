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
