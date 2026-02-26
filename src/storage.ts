import { INITIAL_LEARNER_STATE } from "./types";
import type { LearnerState } from "./types";

export interface IStorage {
  load(): LearnerState;
  save(state: LearnerState): void;
  reset(): void;
}

export class InMemoryStorage implements IStorage {
  private state: LearnerState = structuredClone(INITIAL_LEARNER_STATE);

  load(): LearnerState {
    return structuredClone(this.state);
  }

  save(state: LearnerState): void {
    this.state = structuredClone(state);
  }

  reset(): void {
    this.state = structuredClone(INITIAL_LEARNER_STATE);
  }
}

export class LocalStorageAdapter implements IStorage {
  private readonly key: string;

  constructor(key = "thai-srs-state") {
    this.key = key;
  }

  load(): LearnerState {
    if (typeof localStorage === "undefined") {
      return structuredClone(INITIAL_LEARNER_STATE);
    }
    const raw = localStorage.getItem(this.key);
    if (!raw) return structuredClone(INITIAL_LEARNER_STATE);
    return JSON.parse(raw) as LearnerState;
  }

  save(state: LearnerState): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(this.key, JSON.stringify(state));
  }

  reset(): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(this.key);
  }
}
