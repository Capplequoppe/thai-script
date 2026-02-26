import { describe, it, expect } from "vitest";
import { DEFAULT_SRS_DATA, INITIAL_LEARNER_STATE } from "./types";

describe("types", () => {
  it("DEFAULT_SRS_DATA has correct defaults", () => {
    expect(DEFAULT_SRS_DATA.easeFactor).toBe(2.5);
    expect(DEFAULT_SRS_DATA.interval).toBe(0);
    expect(DEFAULT_SRS_DATA.repetitions).toBe(0);
    expect(DEFAULT_SRS_DATA.lastReviewDate).toBeNull();
  });

  it("INITIAL_LEARNER_STATE is empty", () => {
    expect(INITIAL_LEARNER_STATE.completedLessons).toEqual([]);
    expect(INITIAL_LEARNER_STATE.currentLesson).toBeNull();
    expect(Object.keys(INITIAL_LEARNER_STATE.cards)).toHaveLength(0);
    expect(INITIAL_LEARNER_STATE.sessionHistory).toEqual([]);
  });
});
