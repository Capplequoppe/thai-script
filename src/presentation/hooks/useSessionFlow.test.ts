// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSessionFlow } from "./useSessionFlow";

describe("useSessionFlow", () => {
	it("has correct initial state", () => {
		const { result } = renderHook(() => useSessionFlow(5));

		expect(result.current.cardIdx).toBe(0);
		expect(result.current.correct).toBe(0);
		expect(result.current.incorrect).toBe(0);
		expect(result.current.isComplete).toBe(false);
		expect(result.current.accuracy.percentage).toBe(0);
	});

	it("increments correct and cardIdx on advance(true)", () => {
		const { result } = renderHook(() => useSessionFlow(5));

		act(() => result.current.advance(true));

		expect(result.current.cardIdx).toBe(1);
		expect(result.current.correct).toBe(1);
		expect(result.current.incorrect).toBe(0);
	});

	it("increments incorrect and cardIdx on advance(false)", () => {
		const { result } = renderHook(() => useSessionFlow(5));

		act(() => result.current.advance(false));

		expect(result.current.cardIdx).toBe(1);
		expect(result.current.correct).toBe(0);
		expect(result.current.incorrect).toBe(1);
	});

	it("becomes complete when cardIdx >= totalCards", () => {
		const { result } = renderHook(() => useSessionFlow(2));

		act(() => result.current.advance(true));
		act(() => result.current.advance(false));

		expect(result.current.isComplete).toBe(true);
		expect(result.current.cardIdx).toBe(2);
	});

	it("computes accuracy via Accuracy value object", () => {
		const { result } = renderHook(() => useSessionFlow(4));

		act(() => result.current.advance(true));
		act(() => result.current.advance(true));
		act(() => result.current.advance(false));

		expect(result.current.accuracy.percentage).toBe(67);
	});

	it("resets all state", () => {
		const { result } = renderHook(() => useSessionFlow(3));

		act(() => result.current.advance(true));
		act(() => result.current.advance(false));
		act(() => result.current.reset());

		expect(result.current.cardIdx).toBe(0);
		expect(result.current.correct).toBe(0);
		expect(result.current.incorrect).toBe(0);
		expect(result.current.isComplete).toBe(false);
	});

	it("handles totalCards=0 edge case", () => {
		const { result } = renderHook(() => useSessionFlow(0));

		expect(result.current.isComplete).toBe(false);
		expect(result.current.accuracy.percentage).toBe(0);
	});
});
