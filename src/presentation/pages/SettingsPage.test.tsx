// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
