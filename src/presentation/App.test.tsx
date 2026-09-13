// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { useContext } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpConversationPracticeClient } from "../infrastructure/conversation/HttpConversationPracticeClient";
import { App } from "./App";
// Imported for its environment repairs (localStorage, Audio, cleanup) — this
// file deliberately does *not* use `renderWithApp` itself, because the two
// things under test here are the real route table and the real provider
// value, and the harness substitutes both.
import "./test-utils/renderWithApp";
import {
	AppContext,
	type AppContextValue,
	AppProvider,
} from "./context/AppContext";

beforeEach(() => {
	// The real `HttpConversationPracticeClient` is wired in production, so the
	// real page really does try to reach the backend. Nothing is listening in
	// a test run; make that immediate rather than a hanging socket.
	globalThis.fetch = vi.fn(async () => {
		throw new TypeError("Failed to fetch");
	}) as unknown as typeof fetch;
});

describe("App route table", () => {
	it("reaches the conversation practice page at its real hash URL", async () => {
		// The app mounts a `HashRouter`, so the production URL is
		// `#/conversation` — this is the form task 1.4's Playwright navigation
		// uses too.
		window.location.hash = "#/conversation";

		render(<App />);

		expect(
			await screen.findByRole("heading", { name: "Conversation practice" }),
		).toBeTruthy();
	});
});

describe("AppContext composition root", () => {
	it("carries a real HttpConversationPracticeClient in its provider value", () => {
		let captured: AppContextValue | null = null;

		function Probe() {
			captured = useContext(AppContext);
			return null;
		}

		render(
			<AppProvider>
				<Probe />
			</AppProvider>,
		);

		expect(captured).not.toBeNull();
		expect(
			(captured as unknown as AppContextValue).conversationPractice,
		).toBeInstanceOf(HttpConversationPracticeClient);
	});
});
