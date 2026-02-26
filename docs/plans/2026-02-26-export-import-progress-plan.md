# Export/Import Progress Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to export learning progress as a JSON file and import it back, merging with existing progress via a new Settings page.

**Architecture:** A pure `mergeLearnerStates` function handles merge logic. The `IStorage` interface gains `exportData`/`importData` methods. A new Settings page provides the UI. TDD throughout.

**Tech Stack:** TypeScript, React, Vitest, Tailwind CSS, React Router

---

### Task 1: Merge Service — Tests

**Files:**
- Create: `src/merge-service.test.ts`

**Step 1: Write the merge service tests**

```typescript
import { describe, it, expect } from "vitest";
import { mergeLearnerStates } from "./merge-service";
import type { LearnerState, PropertyCard, SrsData, SessionSummary } from "./types";
import { INITIAL_LEARNER_STATE, DEFAULT_SRS_DATA } from "./types";

function makeCard(id: string, repetitions: number, lessonNumber = 1): PropertyCard {
  return {
    id,
    symbolCharacter: "ก",
    property: "recognition",
    question: `What is ${id}?`,
    correctAnswer: "answer",
    choices: ["a", "b", "c", "answer"],
    srs: { ...DEFAULT_SRS_DATA, repetitions, nextReviewDate: new Date().toISOString() },
    lessonNumber,
  };
}

function makeSession(id: string): SessionSummary {
  return {
    sessionId: id,
    type: "lesson",
    durationMs: 1000,
    totalCards: 5,
    correctCount: 4,
    incorrectCount: 1,
    accuracy: 80,
    newCardsGraduated: 3,
  };
}

describe("mergeLearnerStates", () => {
  it("merges two empty states", () => {
    const result = mergeLearnerStates(INITIAL_LEARNER_STATE, INITIAL_LEARNER_STATE);
    expect(result).toEqual(INITIAL_LEARNER_STATE);
  });

  it("unions completedLessons without duplicates", () => {
    const current: LearnerState = { ...INITIAL_LEARNER_STATE, completedLessons: [1, 2, 3] };
    const incoming: LearnerState = { ...INITIAL_LEARNER_STATE, completedLessons: [2, 3, 4, 5] };
    const result = mergeLearnerStates(current, incoming);
    expect(result.completedLessons.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("preserves current.currentLesson", () => {
    const current: LearnerState = { ...INITIAL_LEARNER_STATE, currentLesson: 3 };
    const incoming: LearnerState = { ...INITIAL_LEARNER_STATE, currentLesson: 7 };
    const result = mergeLearnerStates(current, incoming);
    expect(result.currentLesson).toBe(3);
  });

  it("includes cards only in current", () => {
    const current: LearnerState = { ...INITIAL_LEARNER_STATE, cards: { a: makeCard("a", 2) } };
    const incoming: LearnerState = { ...INITIAL_LEARNER_STATE, cards: {} };
    const result = mergeLearnerStates(current, incoming);
    expect(result.cards.a.srs.repetitions).toBe(2);
  });

  it("includes cards only in incoming", () => {
    const current: LearnerState = { ...INITIAL_LEARNER_STATE, cards: {} };
    const incoming: LearnerState = { ...INITIAL_LEARNER_STATE, cards: { b: makeCard("b", 5) } };
    const result = mergeLearnerStates(current, incoming);
    expect(result.cards.b.srs.repetitions).toBe(5);
  });

  it("keeps the card with higher repetitions on conflict", () => {
    const current: LearnerState = { ...INITIAL_LEARNER_STATE, cards: { x: makeCard("x", 3) } };
    const incoming: LearnerState = { ...INITIAL_LEARNER_STATE, cards: { x: makeCard("x", 7) } };
    const result = mergeLearnerStates(current, incoming);
    expect(result.cards.x.srs.repetitions).toBe(7);
  });

  it("keeps current card when repetitions are equal", () => {
    const currentCard = makeCard("x", 3);
    currentCard.correctAnswer = "current";
    const incomingCard = makeCard("x", 3);
    incomingCard.correctAnswer = "incoming";
    const current: LearnerState = { ...INITIAL_LEARNER_STATE, cards: { x: currentCard } };
    const incoming: LearnerState = { ...INITIAL_LEARNER_STATE, cards: { x: incomingCard } };
    const result = mergeLearnerStates(current, incoming);
    expect(result.cards.x.correctAnswer).toBe("current");
  });

  it("deduplicates sessionHistory by sessionId", () => {
    const s1 = makeSession("s1");
    const s2 = makeSession("s2");
    const s3 = makeSession("s3");
    const current: LearnerState = { ...INITIAL_LEARNER_STATE, sessionHistory: [s1, s2] };
    const incoming: LearnerState = { ...INITIAL_LEARNER_STATE, sessionHistory: [s2, s3] };
    const result = mergeLearnerStates(current, incoming);
    expect(result.sessionHistory).toHaveLength(3);
    const ids = result.sessionHistory.map((s) => s.sessionId);
    expect(ids).toContain("s1");
    expect(ids).toContain("s2");
    expect(ids).toContain("s3");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/merge-service.test.ts`
Expected: FAIL — cannot find `./merge-service`

**Step 3: Commit**

```bash
git add src/merge-service.test.ts
git commit -m "test: add merge service tests"
```

---

### Task 2: Merge Service — Implementation

**Files:**
- Create: `src/merge-service.ts`

**Step 1: Implement the merge function**

```typescript
import type { LearnerState } from "./types";

export function mergeLearnerStates(current: LearnerState, incoming: LearnerState): LearnerState {
  const completedLessons = [...new Set([...current.completedLessons, ...incoming.completedLessons])];

  const cards = { ...incoming.cards };
  for (const [id, currentCard] of Object.entries(current.cards)) {
    const incomingCard = cards[id];
    if (!incomingCard || currentCard.srs.repetitions >= incomingCard.srs.repetitions) {
      cards[id] = currentCard;
    }
  }

  const sessionMap = new Map(current.sessionHistory.map((s) => [s.sessionId, s]));
  for (const s of incoming.sessionHistory) {
    if (!sessionMap.has(s.sessionId)) {
      sessionMap.set(s.sessionId, s);
    }
  }

  return {
    completedLessons,
    currentLesson: current.currentLesson,
    cards,
    sessionHistory: [...sessionMap.values()],
  };
}
```

**Step 2: Run tests to verify they pass**

Run: `pnpm vitest run src/merge-service.test.ts`
Expected: All 8 tests PASS

**Step 3: Commit**

```bash
git add src/merge-service.ts
git commit -m "feat: add merge service for learner state"
```

---

### Task 3: Validation — Tests

**Files:**
- Create: `src/validation.test.ts`

**Step 1: Write validation tests**

```typescript
import { describe, it, expect } from "vitest";
import { validateLearnerState } from "./validation";
import { INITIAL_LEARNER_STATE } from "./types";

describe("validateLearnerState", () => {
  it("accepts a valid LearnerState", () => {
    expect(validateLearnerState(INITIAL_LEARNER_STATE)).toBe(true);
  });

  it("rejects null", () => {
    expect(validateLearnerState(null)).toBe(false);
  });

  it("rejects non-object", () => {
    expect(validateLearnerState("string")).toBe(false);
  });

  it("rejects missing completedLessons", () => {
    const { completedLessons, ...rest } = INITIAL_LEARNER_STATE;
    expect(validateLearnerState(rest)).toBe(false);
  });

  it("rejects non-array completedLessons", () => {
    expect(validateLearnerState({ ...INITIAL_LEARNER_STATE, completedLessons: "bad" })).toBe(false);
  });

  it("rejects missing cards", () => {
    const { cards, ...rest } = INITIAL_LEARNER_STATE;
    expect(validateLearnerState(rest)).toBe(false);
  });

  it("rejects non-object cards", () => {
    expect(validateLearnerState({ ...INITIAL_LEARNER_STATE, cards: [] })).toBe(false);
  });

  it("rejects missing sessionHistory", () => {
    const { sessionHistory, ...rest } = INITIAL_LEARNER_STATE;
    expect(validateLearnerState(rest)).toBe(false);
  });

  it("rejects non-array sessionHistory", () => {
    expect(validateLearnerState({ ...INITIAL_LEARNER_STATE, sessionHistory: {} })).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/validation.test.ts`
Expected: FAIL — cannot find `./validation`

**Step 3: Commit**

```bash
git add src/validation.test.ts
git commit -m "test: add learner state validation tests"
```

---

### Task 4: Validation — Implementation

**Files:**
- Create: `src/validation.ts`

**Step 1: Implement validation**

```typescript
export function validateLearnerState(data: unknown): boolean {
  if (data === null || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.completedLessons)) return false;
  if (typeof obj.cards !== "object" || obj.cards === null || Array.isArray(obj.cards)) return false;
  if (!Array.isArray(obj.sessionHistory)) return false;

  return true;
}
```

**Step 2: Run tests to verify they pass**

Run: `pnpm vitest run src/validation.test.ts`
Expected: All 9 tests PASS

**Step 3: Commit**

```bash
git add src/validation.ts
git commit -m "feat: add learner state validation"
```

---

### Task 5: Storage — Add exportData and importData

**Files:**
- Modify: `src/interfaces.ts:44-48`
- Modify: `src/storage.ts`
- Modify: `src/storage.test.ts`

**Step 1: Add tests to `src/storage.test.ts`**

Append the following tests to the existing file:

```typescript
// Add these imports at the top:
// import { mergeLearnerStates } from "./merge-service";

describe("InMemoryStorage exportData/importData", () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  it("exportData returns JSON of current state", () => {
    const state: LearnerState = { ...INITIAL_LEARNER_STATE, completedLessons: [1, 2] };
    storage.save(state);
    const json = storage.exportData();
    const parsed = JSON.parse(json);
    expect(parsed.completedLessons).toEqual([1, 2]);
  });

  it("importData merges with existing state", () => {
    storage.save({ ...INITIAL_LEARNER_STATE, completedLessons: [1] });
    const incoming: LearnerState = { ...INITIAL_LEARNER_STATE, completedLessons: [2, 3] };
    storage.importData(JSON.stringify(incoming));
    const loaded = storage.load();
    expect(loaded.completedLessons.sort()).toEqual([1, 2, 3]);
  });

  it("importData throws on invalid JSON", () => {
    expect(() => storage.importData("not json")).toThrow();
  });

  it("importData throws on invalid state shape", () => {
    expect(() => storage.importData(JSON.stringify({ bad: true }))).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/storage.test.ts`
Expected: FAIL — `exportData` is not a function

**Step 3: Update `src/interfaces.ts` — add methods to IStorage**

Add to the `IStorage` interface:

```typescript
export interface IStorage {
  load(): LearnerState;
  save(state: LearnerState): void;
  reset(): void;
  exportData(): string;
  importData(json: string): void;
}
```

**Step 4: Implement in `src/storage.ts`**

Add to `InMemoryStorage`:

```typescript
import { mergeLearnerStates } from "./merge-service";
import { validateLearnerState } from "./validation";

// In InMemoryStorage class:
exportData(): string {
  return JSON.stringify(this.state);
}

importData(json: string): void {
  const parsed: unknown = JSON.parse(json);
  if (!validateLearnerState(parsed)) {
    throw new Error("Invalid progress file format");
  }
  this.state = mergeLearnerStates(this.state, parsed as LearnerState);
}
```

Add to `LocalStorageAdapter`:

```typescript
exportData(): string {
  return JSON.stringify(this.load());
}

importData(json: string): void {
  const parsed: unknown = JSON.parse(json);
  if (!validateLearnerState(parsed)) {
    throw new Error("Invalid progress file format");
  }
  const merged = mergeLearnerStates(this.load(), parsed as LearnerState);
  this.save(merged);
}
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/storage.test.ts`
Expected: All tests PASS

**Step 6: Run all tests to check nothing broke**

Run: `pnpm vitest run`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/interfaces.ts src/storage.ts src/storage.test.ts
git commit -m "feat: add exportData and importData to storage"
```

---

### Task 6: AppContext — Expose export/import

**Files:**
- Modify: `src/context/AppContext.tsx`

**Step 1: Add methods to AppContextValue interface**

Add to the `AppContextValue` interface:

```typescript
exportData: () => string;
importData: (json: string) => void;
```

**Step 2: Add implementations to the provider value**

In the `useMemo` value object, add:

```typescript
exportData: () => storage.exportData(),
importData: (json) => wrap(() => storage.importData(json)),
```

**Step 3: Run all tests**

Run: `pnpm vitest run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/context/AppContext.tsx
git commit -m "feat: expose exportData and importData in AppContext"
```

---

### Task 7: Settings Page

**Files:**
- Create: `src/pages/SettingsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

**Step 1: Create the Settings page**

Create `src/pages/SettingsPage.tsx`:

```typescript
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useApp } from "../hooks/useApp";

export function SettingsPage() {
  const { exportData, importData, resetAll } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleExport() {
    const json = exportData();
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thai-script-progress-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        importData(json);
        setImportStatus({ type: "success", message: "Progress imported and merged successfully." });
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch {
        setImportStatus({ type: "error", message: "Invalid file. Please select a valid progress file." });
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-8 py-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Export */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500">Export Progress</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Download your learning progress as a JSON file.
        </p>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Download Progress
        </button>
      </section>

      {/* Import */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500">Import Progress</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Import a progress file. Your existing progress will be merged with the imported data.
        </p>
        <div className="flex gap-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="text-sm text-gray-500 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300 dark:hover:file:bg-gray-700"
          />
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Import
          </button>
        </div>
        {importStatus && (
          <p className={`text-sm ${importStatus.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {importStatus.message}
          </p>
        )}
      </section>

      {/* Danger Zone */}
      <section className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-red-500">Danger Zone</h2>
        <button
          onClick={() => {
            if (confirm("This will erase all progress. Are you sure?")) {
              resetAll();
              navigate("/");
            }
          }}
          className="text-sm text-red-500 hover:text-red-600"
        >
          Reset All Progress
        </button>
      </section>
    </div>
  );
}
```

**Step 2: Add route to `src/App.tsx`**

Add import:
```typescript
import { SettingsPage } from "./pages/SettingsPage";
```

Add route inside the `<Route element={<Layout />}>` block, before the catch-all:
```typescript
<Route path="/settings" element={<SettingsPage />} />
```

**Step 3: Add nav link to `src/components/Layout.tsx`**

Add to the `navItems` array:
```typescript
{ to: "/settings", label: "Settings" },
```

**Step 4: Build and verify no errors**

Run: `pnpm build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/pages/SettingsPage.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat: add Settings page with export/import progress"
```

---

### Task 8: Final Verification

**Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: All tests PASS

**Step 2: Run lint and format**

Run: `pnpm biome check --write src/`
Expected: No errors

**Step 3: Build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Final commit if any formatting changes**

```bash
git add -A
git commit -m "chore: lint and format"
```
