import { describe, expect, it } from "vitest";
import { ThaiSymbolClass } from "./symbols";
import {
	buildToneMarkTable,
	getToneMarkCell,
	resolveSyllableTone,
	TONE_MARK_NAMES,
	TONE_MARK_TABLE_CLASSES,
	type ToneMarkCell,
} from "./toneMarkTable";

const UNREACHABLE_CELLS: ReadonlyArray<
	Pick<ToneMarkCell, "toneMarkName" | "consonantClass">
> = [
	{ toneMarkName: "mai tri", consonantClass: ThaiSymbolClass.High },
	{ toneMarkName: "mai chattawa", consonantClass: ThaiSymbolClass.High },
	{ toneMarkName: "mai tri", consonantClass: ThaiSymbolClass.Low },
	{ toneMarkName: "mai chattawa", consonantClass: ThaiSymbolClass.Low },
];

describe("AC1 — every class-by-mark combination resolves", () => {
	it("enumerates all twelve combinations with none missing", () => {
		const table = buildToneMarkTable();
		expect(table).toHaveLength(
			TONE_MARK_TABLE_CLASSES.length * TONE_MARK_NAMES.length,
		);
		expect(table).toHaveLength(12);
		for (const consonantClass of TONE_MARK_TABLE_CLASSES) {
			for (const toneMarkName of TONE_MARK_NAMES) {
				const cell = table.find(
					(candidate) =>
						candidate.consonantClass === consonantClass &&
						candidate.toneMarkName === toneMarkName,
				);
				expect(
					cell,
					`no cell for ${toneMarkName} + ${consonantClass}`,
				).toBeDefined();
				expect(cell?.state).not.toBe("undeclared");
			}
		}
	});

	it("mid class maps its four marks onto four distinct tones", () => {
		const tones = TONE_MARK_NAMES.map(
			(mark) => getToneMarkCell(mark, ThaiSymbolClass.Mid).resultingTone,
		);
		expect(tones).toEqual(["low", "falling", "high", "rising"]);
		expect(new Set(tones).size).toBe(4);
	});

	it("high and low class each resolve only mai ek and mai tho, and disagree", () => {
		const high = {
			ek: getToneMarkCell("mai ek", ThaiSymbolClass.High).resultingTone,
			tho: getToneMarkCell("mai tho", ThaiSymbolClass.High).resultingTone,
		};
		const low = {
			ek: getToneMarkCell("mai ek", ThaiSymbolClass.Low).resultingTone,
			tho: getToneMarkCell("mai tho", ThaiSymbolClass.Low).resultingTone,
		};
		expect(high).toEqual({ ek: "low", tho: "falling" });
		expect(low).toEqual({ ek: "falling", tho: "high" });
	});
});

describe("AC2 — the four absent combinations are declared unreachable, not missing", () => {
	it("declares exactly the four stated combinations unreachable", () => {
		const table = buildToneMarkTable();
		const unreachable = table.filter((cell) => cell.state === "unreachable");
		expect(unreachable).toHaveLength(4);
		for (const expected of UNREACHABLE_CELLS) {
			const cell = getToneMarkCell(
				expected.toneMarkName,
				expected.consonantClass,
			);
			expect(cell.state).toBe("unreachable");
		}
	});

	it("returns a declaration, not undefined, for an unreachable combination", () => {
		const cell = getToneMarkCell("mai tri", ThaiSymbolClass.Low);
		expect(cell).toBeDefined();
		expect(cell.state).toBe("unreachable");
		expect(cell.resultingTone).toBeUndefined();
		expect(cell.note).toBeTruthy();
		expect(cell.note?.toLowerCase()).not.toContain("impossible");
	});
});

describe("AC3 — a tone mark overrides the spelling rule", () => {
	it("resolves to the mark's tone even when the spelling rule disagrees", () => {
		// Low class + dead-short syllable: the spelling rule alone gives "high"
		// (toneRules: low-dead-short). Mai tho on low class gives "high" too, so
		// use mai ek instead, whose mark tone ("falling") differs from the
		// spelling-rule tone for this syllable type.
		const spellingOnly = resolveSyllableTone({
			governingClass: ThaiSymbolClass.Low,
			syllableType: "dead-short",
		});
		expect(spellingOnly).toBe("high");

		const withMark = resolveSyllableTone({
			governingClass: ThaiSymbolClass.Low,
			syllableType: "dead-short",
			toneMark: "mai ek",
		});
		expect(withMark).toBe("falling");
		expect(withMark).not.toBe(spellingOnly);
	});

	it("resolves against the governing class, not a class carried on the mark itself", () => {
		// Same mark, different governing classes: the mark plus governing class
		// alone determine the tone.
		const mid = resolveSyllableTone({
			governingClass: ThaiSymbolClass.Mid,
			syllableType: "live",
			toneMark: "mai ek",
		});
		const high = resolveSyllableTone({
			governingClass: ThaiSymbolClass.High,
			syllableType: "live",
			toneMark: "mai ek",
		});
		expect(mid).toBe("low");
		expect(high).toBe("low");
		expect(mid).toBe(high);
	});
});

describe("AC7 — resolved, unreachable and undeclared are three distinct states", () => {
	it("gives three distinct values for the three query states", () => {
		const resolved = getToneMarkCell("mai ek", ThaiSymbolClass.Mid).state;
		const unreachable = getToneMarkCell("mai tri", ThaiSymbolClass.High).state;
		// The 3x4 table is closed, so no real class/mark pair is undeclared —
		// probe the third state with a value outside the declared domain, the
		// only way a caller reaches "we were never asked about this" instead of
		// "we were asked and it's unreachable".
		const undeclared = getToneMarkCell(
			// biome-ignore lint/suspicious/noExplicitAny: deliberately outside the declared ToneMarkName domain
			"mai unknown" as any,
			ThaiSymbolClass.Mid,
		).state;
		expect(resolved).toBe("resolved");
		expect(unreachable).toBe("unreachable");
		expect(undeclared).toBe("undeclared");
		expect(new Set([resolved, unreachable, undeclared]).size).toBe(3);
	});

	it("distinguishes unreachable from undeclared even though both carry no tone", () => {
		const unreachableCell = getToneMarkCell(
			"mai chattawa",
			ThaiSymbolClass.Low,
		);
		expect(unreachableCell.resultingTone).toBeUndefined();
		expect(unreachableCell.state).not.toBe("undeclared");
		expect(unreachableCell.state).toBe("unreachable");
	});
});
