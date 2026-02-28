import { describe, expect, it } from "vitest";
import { SrsStage } from "./SrsStage";

describe("SrsStage", () => {
	describe("static instances", () => {
		it("APPRENTICE has name Apprentice", () => {
			expect(SrsStage.APPRENTICE.name).toBe("Apprentice");
		});

		it("GURU has name Guru", () => {
			expect(SrsStage.GURU.name).toBe("Guru");
		});

		it("MASTER has name Master", () => {
			expect(SrsStage.MASTER.name).toBe("Master");
		});

		it("ENLIGHTENED has name Enlightened", () => {
			expect(SrsStage.ENLIGHTENED.name).toBe("Enlightened");
		});

		it("BURNED has name Burned", () => {
			expect(SrsStage.BURNED.name).toBe("Burned");
		});
	});

	describe("fromScheduleData", () => {
		it("returns APPRENTICE when learningStep is not null", () => {
			expect(SrsStage.fromScheduleData(0, 0)).toBe(SrsStage.APPRENTICE);
			expect(SrsStage.fromScheduleData(3, 200_000)).toBe(SrsStage.APPRENTICE);
		});

		it("returns GURU when interval is below GURU_THRESHOLD", () => {
			expect(SrsStage.fromScheduleData(null, 0)).toBe(SrsStage.GURU);
			expect(SrsStage.fromScheduleData(null, 20_159)).toBe(SrsStage.GURU);
		});

		it("returns MASTER at exact GURU_THRESHOLD", () => {
			expect(SrsStage.fromScheduleData(null, 20_160)).toBe(SrsStage.MASTER);
		});

		it("returns MASTER when interval is between GURU and MASTER thresholds", () => {
			expect(SrsStage.fromScheduleData(null, 40_000)).toBe(SrsStage.MASTER);
		});

		it("returns ENLIGHTENED at exact MASTER_THRESHOLD", () => {
			expect(SrsStage.fromScheduleData(null, 60_480)).toBe(
				SrsStage.ENLIGHTENED,
			);
		});

		it("returns ENLIGHTENED when interval is between MASTER and ENLIGHTENED thresholds", () => {
			expect(SrsStage.fromScheduleData(null, 100_000)).toBe(
				SrsStage.ENLIGHTENED,
			);
		});

		it("returns BURNED at exact ENLIGHTENED_THRESHOLD", () => {
			expect(SrsStage.fromScheduleData(null, 120_960)).toBe(SrsStage.BURNED);
		});

		it("returns BURNED when interval exceeds ENLIGHTENED_THRESHOLD", () => {
			expect(SrsStage.fromScheduleData(null, 200_000)).toBe(SrsStage.BURNED);
		});
	});

	describe("isBurned", () => {
		it("returns true for BURNED", () => {
			expect(SrsStage.BURNED.isBurned).toBe(true);
		});

		it("returns false for other stages", () => {
			expect(SrsStage.APPRENTICE.isBurned).toBe(false);
			expect(SrsStage.GURU.isBurned).toBe(false);
			expect(SrsStage.MASTER.isBurned).toBe(false);
			expect(SrsStage.ENLIGHTENED.isBurned).toBe(false);
		});
	});

	describe("isApprentice", () => {
		it("returns true for APPRENTICE", () => {
			expect(SrsStage.APPRENTICE.isApprentice).toBe(true);
		});

		it("returns false for other stages", () => {
			expect(SrsStage.GURU.isApprentice).toBe(false);
			expect(SrsStage.MASTER.isApprentice).toBe(false);
			expect(SrsStage.ENLIGHTENED.isApprentice).toBe(false);
			expect(SrsStage.BURNED.isApprentice).toBe(false);
		});
	});

	describe("toString", () => {
		it("returns the stage name", () => {
			expect(SrsStage.APPRENTICE.toString()).toBe("Apprentice");
			expect(SrsStage.GURU.toString()).toBe("Guru");
			expect(SrsStage.MASTER.toString()).toBe("Master");
			expect(SrsStage.ENLIGHTENED.toString()).toBe("Enlightened");
			expect(SrsStage.BURNED.toString()).toBe("Burned");
		});
	});
});
