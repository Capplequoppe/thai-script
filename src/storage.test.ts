import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStorage } from "./storage";
import { INITIAL_LEARNER_STATE } from "./types";
import type { LearnerState } from "./types";

describe("InMemoryStorage", () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  it("load returns initial state when empty", () => {
    const state = storage.load();
    expect(state.completedLessons).toEqual([]);
    expect(state.currentLesson).toBeNull();
    expect(Object.keys(state.cards)).toHaveLength(0);
  });

  it("save and load round-trips state", () => {
    const state: LearnerState = {
      ...INITIAL_LEARNER_STATE,
      completedLessons: [1, 2],
      currentLesson: 3,
    };
    storage.save(state);
    const loaded = storage.load();
    expect(loaded.completedLessons).toEqual([1, 2]);
    expect(loaded.currentLesson).toBe(3);
  });

  it("reset clears all state", () => {
    storage.save({ ...INITIAL_LEARNER_STATE, completedLessons: [1] });
    storage.reset();
    const loaded = storage.load();
    expect(loaded.completedLessons).toEqual([]);
  });

  it("load returns a clone (mutations do not affect storage)", () => {
    const state = storage.load();
    state.completedLessons.push(99);
    const reloaded = storage.load();
    expect(reloaded.completedLessons).toEqual([]);
  });
});
