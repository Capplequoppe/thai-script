// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DistrictBadge } from "./DistrictBadge";

describe("DistrictBadge", () => {
	// AC1: each class yields a distinct district cue, derived from the same
	// single source as the colour.
	it("renders a distinct non-colour cue per class", () => {
		const { container: low } = render(<DistrictBadge classType="low" />);
		const { container: mid } = render(<DistrictBadge classType="mid" />);
		const { container: high } = render(<DistrictBadge classType="high" />);

		const lowBadge = low.querySelector("[data-district]");
		const midBadge = mid.querySelector("[data-district]");
		const highBadge = high.querySelector("[data-district]");

		expect(lowBadge?.getAttribute("data-district")).toBeTruthy();
		expect(midBadge?.getAttribute("data-district")).toBeTruthy();
		expect(highBadge?.getAttribute("data-district")).toBeTruthy();

		const districts = new Set([
			lowBadge?.getAttribute("data-district"),
			midBadge?.getAttribute("data-district"),
			highBadge?.getAttribute("data-district"),
		]);
		expect(districts.size).toBe(3);

		const glyphs = new Set([
			lowBadge?.textContent,
			midBadge?.textContent,
			highBadge?.textContent,
		]);
		expect(glyphs.size).toBe(3);
	});

	// AC2: stripping colour leaves the three classes distinguishable. The
	// badge never sets a `color` style at all — only `opacity` — so its
	// distinguishing signal (the glyph/data-district) survives colour removal
	// by construction; this asserts that contract rather than a hue.
	it("stays distinguishable with colour removed", () => {
		for (const classType of ["low", "mid", "high"]) {
			const { container } = render(<DistrictBadge classType={classType} />);
			const badge = container.querySelector(
				"[data-district]",
			) as HTMLElement | null;
			expect(badge).not.toBeNull();
			expect(badge?.style.color).toBe("");
		}

		const districts = ["low", "mid", "high"].map((classType) => {
			const { container } = render(<DistrictBadge classType={classType} />);
			return container
				.querySelector("[data-district]")
				?.getAttribute("data-district");
		});
		expect(new Set(districts).size).toBe(3);
	});

	it("renders nothing for a class that does not apply (a vowel, a numeral)", () => {
		const { container } = render(<DistrictBadge classType={null} />);
		expect(container.querySelector("[data-district]")).toBeNull();
		expect(container.textContent).toBe("");
	});

	it("renders an unresolved cue distinguishable from not-applicable, not as absent", () => {
		const { container } = render(<DistrictBadge classType="unresolved" />);
		const badge = container.querySelector("[data-district]");
		expect(badge).not.toBeNull();
		expect(badge?.getAttribute("data-district")).toBe("unresolved");
		expect(container.textContent).not.toBe("");
	});

	it("fades opacity when the scaffold level is fading, and renders nothing when burned", () => {
		const { container: full } = render(
			<DistrictBadge classType="high" level="full" />,
		);
		const { container: fading } = render(
			<DistrictBadge classType="high" level="fading" />,
		);
		const { container: burned } = render(
			<DistrictBadge classType="high" level="none" />,
		);

		const fullBadge = full.querySelector("[data-district]") as HTMLElement;
		const fadingBadge = fading.querySelector("[data-district]") as HTMLElement;

		expect(fullBadge.style.opacity).toBe("1");
		expect(fadingBadge.style.opacity).toBe("0.5");
		expect(burned.querySelector("[data-district]")).toBeNull();
	});
});
