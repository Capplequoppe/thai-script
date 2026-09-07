// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { AppContextValue } from "../context/AppContext";
import {
	type MakeAppValueOptions,
	renderWithApp,
} from "../test-utils/renderWithApp";
import { StageItemsPage } from "./StageItemsPage";

function renderStagePage(
	stage: string,
	overrides: Partial<AppContextValue> = {},
	seed: MakeAppValueOptions = {},
) {
	return renderWithApp(
		<Routes>
			<Route path="/progress/:stage" element={<StageItemsPage />} />
		</Routes>,
		overrides,
		{ route: `/progress/${stage}`, ...seed },
	);
}

describe("StageItemsPage", () => {
	it("lists learned items whose combined stage matches the URL param", () => {
		renderStagePage("Apprentice", {}, { symbols: ["ม"] });

		expect(screen.getByText("Script (1)")).toBeTruthy();
		expect(screen.getByText("ม")).toBeTruthy();
	});

	it("shows an empty state when nothing is in the requested stage", () => {
		renderStagePage("Guru", {}, { symbols: ["ม"] });

		expect(
			screen.getByText("No items are currently in this stage."),
		).toBeTruthy();
		expect(screen.queryByText("ม")).toBeNull();
	});

	it("shows a fallback for an unrecognized stage", () => {
		renderStagePage("NotAStage", {}, { symbols: ["ม"] });

		expect(screen.getByText("Unknown stage")).toBeTruthy();
	});

	it("overrides every card of the selected item via the override sheet", () => {
		const overrideCardStage = vi.fn();
		const refresh = vi.fn();
		renderStagePage(
			"Apprentice",
			{
				items: { overrideCardStage } as unknown as AppContextValue["items"],
				refresh,
			},
			{ symbols: ["ม"] },
		);

		fireEvent.click(screen.getByText("ม"));
		fireEvent.click(screen.getByText("Override Stage"));
		fireEvent.click(screen.getByLabelText("Set stage to Burned"));

		expect(overrideCardStage).toHaveBeenCalledTimes(1);
		const [id, pool, stage] = overrideCardStage.mock.calls[0];
		expect(id).toBe("ม-recognition");
		expect(pool).toBe("script");
		expect(stage.name).toBe("Burned");
		expect(refresh).toHaveBeenCalled();
	});
});
