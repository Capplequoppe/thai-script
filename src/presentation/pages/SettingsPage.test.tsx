// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	DEFAULT_CONVERSATION_BACKEND_URL,
	getConversationBackendToken,
	getConversationBackendUrl,
} from "../../infrastructure/conversation/ConversationBackendSettings";
import type { AppContextValue } from "../context/AppContext";
import { renderWithApp } from "../test-utils/renderWithApp";
import { SettingsPage } from "./SettingsPage";

function renderSettings(dataOverrides: Partial<AppContextValue["data"]> = {}) {
	const refresh = vi.fn();
	const data = {
		exportData: vi.fn(() => "{}"),
		importData: vi.fn(),
		reset: vi.fn(),
		getApprenticeLimits: vi.fn(() => ({
			general: 100,
			script: 35,
			sentence: 60,
		})),
		setApprenticeLimits: vi.fn(),
		getReviewBatchSize: vi.fn(() => 20),
		setReviewBatchSize: vi.fn(),
		...dataOverrides,
	} as unknown as AppContextValue["data"];

	const result = renderWithApp(<SettingsPage />, { data, refresh });
	return { ...result, data, refresh };
}

describe("SettingsPage — Learning Pace", () => {
	it("prefills the limit inputs from data.getApprenticeLimits()", () => {
		renderSettings();

		expect(
			(screen.getByLabelText("Vocabulary & Grammar") as HTMLInputElement).value,
		).toBe("100");
		expect((screen.getByLabelText("Script") as HTMLInputElement).value).toBe(
			"35",
		);
		expect((screen.getByLabelText("Sentences") as HTMLInputElement).value).toBe(
			"60",
		);
	});

	it("saves valid limits and refreshes", () => {
		const { data, refresh } = renderSettings();

		fireEvent.change(screen.getByLabelText("Vocabulary & Grammar"), {
			target: { value: "150" },
		});
		fireEvent.change(screen.getByLabelText("Script"), {
			target: { value: "40" },
		});
		fireEvent.change(screen.getByLabelText("Sentences"), {
			target: { value: "80" },
		});
		fireEvent.click(screen.getByText("Save Learning Pace"));

		expect(data.setApprenticeLimits).toHaveBeenCalledWith({
			general: 150,
			script: 40,
			sentence: 80,
		});
		expect(refresh).toHaveBeenCalled();
	});

	it("shows a success message after saving", () => {
		renderSettings();
		fireEvent.click(screen.getByText("Save Learning Pace"));
		expect(screen.getByText(/saved/i)).toBeTruthy();
	});

	it("rejects a value below 1 and does not save", () => {
		const { data } = renderSettings();

		fireEvent.change(screen.getByLabelText("Script"), {
			target: { value: "0" },
		});
		fireEvent.click(screen.getByText("Save Learning Pace"));

		expect(data.setApprenticeLimits).not.toHaveBeenCalled();
		expect(screen.getByText(/between 1 and 500/i)).toBeTruthy();
	});

	it("rejects a value above 500 and does not save", () => {
		const { data } = renderSettings();

		fireEvent.change(screen.getByLabelText("Sentences"), {
			target: { value: "501" },
		});
		fireEvent.click(screen.getByText("Save Learning Pace"));

		expect(data.setApprenticeLimits).not.toHaveBeenCalled();
		expect(screen.getByText(/between 1 and 500/i)).toBeTruthy();
	});

	it("rejects a non-integer value and does not save", () => {
		const { data } = renderSettings();

		fireEvent.change(screen.getByLabelText("Vocabulary & Grammar"), {
			target: { value: "12.5" },
		});
		fireEvent.click(screen.getByText("Save Learning Pace"));

		expect(data.setApprenticeLimits).not.toHaveBeenCalled();
	});
});

describe("SettingsPage — Review Sessions", () => {
	it("prefills the batch size from data.getReviewBatchSize()", () => {
		renderSettings({ getReviewBatchSize: vi.fn(() => 35) });

		expect(
			(screen.getByLabelText("Cards per round") as HTMLInputElement).value,
		).toBe("35");
	});

	it("saves a valid batch size and refreshes", () => {
		const { data, refresh } = renderSettings();

		fireEvent.change(screen.getByLabelText("Cards per round"), {
			target: { value: "15" },
		});
		fireEvent.click(screen.getByText("Save Review Sessions"));

		expect(data.setReviewBatchSize).toHaveBeenCalledWith(15);
		expect(refresh).toHaveBeenCalled();
		expect(
			screen.getByText("Review sessions will run 15 cards at a time."),
		).toBeTruthy();
	});

	it.each([
		"0",
		"201",
		"12.5",
		"",
		"lots",
	])("rejects %p and does not save", (value) => {
		const { data } = renderSettings();

		fireEvent.change(screen.getByLabelText("Cards per round"), {
			target: { value },
		});
		fireEvent.click(screen.getByText("Save Review Sessions"));

		expect(data.setReviewBatchSize).not.toHaveBeenCalled();
		expect(
			screen.getByText("Enter a whole number between 1 and 200."),
		).toBeTruthy();
	});
});

describe("SettingsPage — Conversation Backend", () => {
	it("starts blank (automatic) when no override has been saved", () => {
		renderSettings();

		expect(
			(screen.getByLabelText("Backend address") as HTMLInputElement).value,
		).toBe("");
	});

	it("saves a valid LAN address and persists it", () => {
		renderSettings();

		fireEvent.change(screen.getByLabelText("Backend address"), {
			target: { value: "http://192.168.1.23:8000" },
		});
		fireEvent.click(screen.getByText("Save Backend Settings"));

		expect(screen.getByText(/saved/i)).toBeTruthy();
		expect(getConversationBackendUrl()).toBe("http://192.168.1.23:8000");
	});

	it("rejects an address with no scheme and does not persist it", () => {
		renderSettings();

		fireEvent.change(screen.getByLabelText("Backend address"), {
			target: { value: "192.168.1.23:8000" },
		});
		fireEvent.click(screen.getByText("Save Backend Settings"));

		expect(screen.getByText(/enter a full address/i)).toBeTruthy();
		expect(getConversationBackendUrl()).toBe(DEFAULT_CONVERSATION_BACKEND_URL);
	});

	it("treats a blank address as choosing automatic, not as an error", () => {
		renderSettings();

		fireEvent.change(screen.getByLabelText("Backend address"), {
			target: { value: "http://192.168.1.23:8000" },
		});
		fireEvent.click(screen.getByText("Save Backend Settings"));

		fireEvent.change(screen.getByLabelText("Backend address"), {
			target: { value: "   " },
		});
		fireEvent.click(screen.getByText("Save Backend Settings"));

		expect(screen.getByText(/using the automatic address/i)).toBeTruthy();
		expect(getConversationBackendUrl()).toBe(DEFAULT_CONVERSATION_BACKEND_URL);
	});

	it("resets a saved override back to automatic via its own button", () => {
		renderSettings();

		fireEvent.change(screen.getByLabelText("Backend address"), {
			target: { value: "http://192.168.1.23:8000" },
		});
		fireEvent.click(screen.getByText("Save Backend Settings"));
		expect(getConversationBackendUrl()).toBe("http://192.168.1.23:8000");

		fireEvent.click(screen.getByText("Reset Address to Automatic"));

		expect(getConversationBackendUrl()).toBe(DEFAULT_CONVERSATION_BACKEND_URL);
		expect(
			(screen.getByLabelText("Backend address") as HTMLInputElement).value,
		).toBe("");
	});

	it("prefills the auth token as empty when none has been saved", () => {
		renderSettings();

		expect(
			(screen.getByLabelText(/Auth token/) as HTMLInputElement).value,
		).toBe("");
	});

	it("saves an auth token alongside the address", () => {
		renderSettings();

		fireEvent.change(screen.getByLabelText("Backend address"), {
			target: { value: "https://conversation.example.com" },
		});
		fireEvent.change(screen.getByLabelText(/Auth token/), {
			target: { value: "s3cret" },
		});
		fireEvent.click(screen.getByText("Save Backend Settings"));

		expect(getConversationBackendUrl()).toBe(
			"https://conversation.example.com",
		);
		expect(getConversationBackendToken()).toBe("s3cret");
	});

	it("saving a new address never clobbers an already-saved token", () => {
		renderSettings();

		fireEvent.change(screen.getByLabelText(/Auth token/), {
			target: { value: "s3cret" },
		});
		fireEvent.click(screen.getByText("Save Backend Settings"));

		fireEvent.change(screen.getByLabelText("Backend address"), {
			target: { value: "http://192.168.1.23:8000" },
		});
		fireEvent.click(screen.getByText("Save Backend Settings"));

		expect(getConversationBackendToken()).toBe("s3cret");
	});
});
