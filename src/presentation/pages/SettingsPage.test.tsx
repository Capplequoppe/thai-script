// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	DEFAULT_CONVERSATION_BACKEND_URL,
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

describe("SettingsPage — Conversation Backend", () => {
	it("prefills the backend address with the same-machine default", () => {
		renderSettings();

		expect(
			(screen.getByLabelText("Backend address") as HTMLInputElement).value,
		).toBe(DEFAULT_CONVERSATION_BACKEND_URL);
	});

	it("saves a valid LAN address and persists it", () => {
		renderSettings();

		fireEvent.change(screen.getByLabelText("Backend address"), {
			target: { value: "http://192.168.1.23:8000" },
		});
		fireEvent.click(screen.getByText("Save Backend Address"));

		expect(screen.getByText(/saved/i)).toBeTruthy();
		expect(getConversationBackendUrl()).toBe("http://192.168.1.23:8000");
	});

	it("rejects an address with no scheme and does not persist it", () => {
		renderSettings();

		fireEvent.change(screen.getByLabelText("Backend address"), {
			target: { value: "192.168.1.23:8000" },
		});
		fireEvent.click(screen.getByText("Save Backend Address"));

		expect(screen.getByText(/enter a full address/i)).toBeTruthy();
		expect(getConversationBackendUrl()).toBe(DEFAULT_CONVERSATION_BACKEND_URL);
	});

	it("rejects a blank address and does not persist it", () => {
		renderSettings();

		fireEvent.change(screen.getByLabelText("Backend address"), {
			target: { value: "   " },
		});
		fireEvent.click(screen.getByText("Save Backend Address"));

		expect(screen.getByText(/enter a full address/i)).toBeTruthy();
		expect(getConversationBackendUrl()).toBe(DEFAULT_CONVERSATION_BACKEND_URL);
	});
});
