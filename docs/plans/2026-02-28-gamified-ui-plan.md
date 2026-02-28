# Gamified Thai Royal UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the Thai Script learning PWA into a gamified, Thai-royal-inspired interface — cream/gold/royal-blue palette, bottom tab navigation, persistent HUD strip, redesigned dashboard, achievement system, study heatmap, and SVG lesson path — without changing any SRS business logic.

**Architecture:** Presentation layer overhaul with minimal domain additions. Domain layer gains `achievements: string[]` on `LearnerState`, an `AchievementService` pure service, and `addAchievement`/`getAchievements` on the repository port. Existing use cases, SRS algorithm, and card repositories are untouched.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Vite, Vitest, @testing-library/react, pnpm, Biome

**Design reference:** `docs/plans/2026-02-28-gamified-ui-design.md`

---

## Phase 1: Domain Additions

### Task 1: Add `completedAt` to `SessionSummary` and `achievements` to `LearnerState`

**Files:**
- Modify: `src/domain/shared/types.ts`

**Step 1: Write the failing test**

Open `src/domain/shared/types.ts` — the test is structural (TypeScript compilation). No unit test file needed; TS errors serve as the test.

**Step 2: Make the changes**

In `src/domain/shared/types.ts`, add `completedAt: string` to `SessionSummary` and `achievements: string[]` to both `LearnerState` and `INITIAL_LEARNER_STATE`:

```typescript
export interface SessionSummary {
  sessionId: string;
  type:
    | "lesson"
    | "review"
    | "mixed"
    | "vocab-lesson"
    | "vocab-review"
    | "grammar-lesson"
    | "grammar-review";
  completedAt: string;   // ← ADD THIS
  durationMs: number;
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  newCardsGraduated: number;
}

export interface LearnerState {
  completedLessons: number[];
  currentLesson: number | null;
  cards: Record<string, PropertyCard>;
  vocabCards: Record<string, VocabularyCard>;
  grammarCards: Record<string, GrammarCard>;
  sessionHistory: SessionSummary[];
  achievements: string[];   // ← ADD THIS
}

export const INITIAL_LEARNER_STATE: LearnerState = {
  completedLessons: [],
  currentLesson: null,
  cards: {},
  vocabCards: {},
  grammarCards: {},
  sessionHistory: [],
  achievements: [],   // ← ADD THIS
};
```

**Step 3: Fix all places that create `SessionSummary` (must set `completedAt`)**

Search for every place `SessionSummary` objects are created and add `completedAt: new Date().toISOString()`. Run:

```bash
grep -rn "sessionId:" src/ --include="*.ts" --include="*.tsx"
```

Expected hits:
- `src/domain/session/services/ReviewService.ts` — `endReviewSession()`
- `src/domain/script/services/ScriptLessonService.ts` — lesson complete
- `src/domain/vocabulary/services/VocabularyLessonService.ts`
- `src/domain/grammar/services/GrammarLessonService.ts`

For each, add `completedAt: now ?? new Date().toISOString(),` in the object literal alongside `sessionId`.

**Step 4: Fix broken tests by updating mock `SessionSummary` objects**

Search for test files that create session summaries:

```bash
grep -rn "sessionId:" src/ --include="*.test.ts"
```

Add `completedAt: new Date().toISOString(),` to each mock object.

**Step 5: Verify**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: 0 type errors, all tests pass.

**Step 6: Commit**

```bash
git add src/domain/shared/types.ts src/domain/session/services/ReviewService.ts src/domain/script/services/ScriptLessonService.ts src/domain/vocabulary/services/VocabularyLessonService.ts src/domain/grammar/services/GrammarLessonService.ts
git commit -m "feat(domain): add completedAt to SessionSummary and achievements to LearnerState"
```

---

### Task 2: Update `LearnerStateRepository` port

**Files:**
- Modify: `src/domain/ports/LearnerStateRepository.ts`

**Step 1: Add two methods to the interface**

```typescript
import type { SessionSummary } from "../../domain/shared/types";

export interface LearnerStateRepository {
  getCompletedLessons(): number[];
  addCompletedLesson(n: number): void;
  removeCompletedLesson(n: number): void;
  getCurrentLesson(): number | null;
  setCurrentLesson(n: number | null): void;
  getSessionHistory(): SessionSummary[];
  addSession(summary: SessionSummary): void;
  getAchievements(): string[];       // ← ADD
  addAchievement(id: string): void;  // ← ADD
  reset(): void;
  exportData(): string;
  importData(json: string): void;
}
```

**Step 2: Verify TypeScript shows errors on implementations**

```bash
npx tsc --noEmit
```

Expected: errors at `StorageLearnerStateRepository` (missing methods). This confirms the interface change is propagating.

**Step 3: Commit interface change**

```bash
git add src/domain/ports/LearnerStateRepository.ts
git commit -m "feat(ports): add getAchievements and addAchievement to LearnerStateRepository"
```

---

### Task 3: Implement `getAchievements` and `addAchievement` in `StorageLearnerStateRepository`

**Files:**
- Modify: `src/infrastructure/persistence/StorageLearnerStateRepository.ts`
- Modify: `src/infrastructure/persistence/StorageLearnerStateRepository.test.ts`

**Step 1: Write failing tests**

Open `src/infrastructure/persistence/StorageLearnerStateRepository.test.ts` and add at the end of the describe block:

```typescript
describe("achievements", () => {
  it("returns empty array when no achievements unlocked", () => {
    expect(repo.getAchievements()).toEqual([]);
  });

  it("adds a new achievement", () => {
    repo.addAchievement("first_lesson");
    expect(repo.getAchievements()).toContain("first_lesson");
  });

  it("does not duplicate achievements", () => {
    repo.addAchievement("first_lesson");
    repo.addAchievement("first_lesson");
    expect(repo.getAchievements().filter((a) => a === "first_lesson")).toHaveLength(1);
  });

  it("persists multiple achievements independently", () => {
    repo.addAchievement("first_lesson");
    repo.addAchievement("first_review");
    const achievements = repo.getAchievements();
    expect(achievements).toContain("first_lesson");
    expect(achievements).toContain("first_review");
  });
});
```

**Step 2: Run test to confirm failure**

```bash
npx vitest run src/infrastructure/persistence/StorageLearnerStateRepository.test.ts
```

Expected: FAIL — method does not exist.

**Step 3: Implement in `StorageLearnerStateRepository`**

Add after the `addSession` method:

```typescript
getAchievements(): string[] {
  return this.storage.load().achievements ?? [];
}

addAchievement(id: string): void {
  const state = this.storage.load();
  const achievements = state.achievements ?? [];
  if (!achievements.includes(id)) {
    state.achievements = [...achievements, id];
    this.storage.save(state);
  }
}
```

Note: the `?? []` guards against old persisted state that predates the `achievements` field.

**Step 4: Run tests**

```bash
npx vitest run src/infrastructure/persistence/StorageLearnerStateRepository.test.ts
```

Expected: PASS.

**Step 5: Full test suite**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: all pass.

**Step 6: Commit**

```bash
git add src/infrastructure/persistence/StorageLearnerStateRepository.ts src/infrastructure/persistence/StorageLearnerStateRepository.test.ts
git commit -m "feat(infra): implement getAchievements and addAchievement in StorageLearnerStateRepository"
```

---

### Task 4: Create `AchievementService`

**Files:**
- Create: `src/domain/shared/services/AchievementService.ts`
- Create: `src/domain/shared/services/AchievementService.test.ts`

**Achievement IDs (12):**

| ID | Trigger |
|---|---|
| `first_lesson` | `completedLessons.length >= 1` |
| `five_lessons` | `completedLessons.length >= 5` |
| `all_lessons` | `completedLessons.length >= 25` |
| `first_review` | any review session in history |
| `century` | total cards reviewed across all sessions >= 100 |
| `warrior` | total cards reviewed >= 500 |
| `first_guru` | any script/vocab/grammar card at Guru+ stage |
| `first_master` | any card at Master+ stage |
| `first_burned` | any card at Burned stage |
| `vocab_start` | `vocabCards` count > 0 |
| `grammar_start` | any grammar session in history |
| `perfect_session` | last session accuracy === 100 && totalCards >= 10 |

Stage thresholds from `SrsStage.ts`:
- Guru: `interval >= 20_160` (14 days) — but that's `GURU_THRESHOLD` for Master stage. Actually the stage logic in `SrsStage.fromScheduleData` is:
  - `learningStep !== null` → Apprentice
  - `interval >= ENLIGHTENED_THRESHOLD (120_960)` → Burned
  - `interval >= MASTER_THRESHOLD (60_480)` → Enlightened
  - `interval >= GURU_THRESHOLD (20_160)` → Master
  - else → Guru

So to check "at Guru or above", a graduated card (learningStep === null) qualifies.

**Step 1: Write failing tests**

Create `src/domain/shared/services/AchievementService.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import type { LearnerState } from "../../shared/types";
import { INITIAL_LEARNER_STATE } from "../../shared/types";
import { AchievementService } from "./AchievementService";

const service = new AchievementService();

function makeSession(overrides: Partial<{
  type: string;
  totalCards: number;
  accuracy: number;
}> = {}) {
  return {
    sessionId: "s1",
    type: (overrides.type ?? "review") as "review",
    completedAt: new Date().toISOString(),
    durationMs: 60_000,
    totalCards: overrides.totalCards ?? 5,
    correctCount: overrides.totalCards ?? 5,
    incorrectCount: 0,
    accuracy: overrides.accuracy ?? 100,
    newCardsGraduated: 0,
  };
}

function makeCard(learningStep: number | null, interval: number) {
  return {
    id: crypto.randomUUID(),
    question: "test",
    correctAnswer: "test",
    choices: [],
    srs: {
      easeFactor: 2.0,
      interval,
      repetitions: 1,
      learningStep,
      nextReviewDate: new Date().toISOString(),
      lastReviewDate: null,
      lapseCount: 0,
    },
    symbolCharacter: "ก",
    property: "recognition" as const,
    lessonNumber: 1,
  };
}

describe("AchievementService", () => {
  it("returns no achievements for empty state", () => {
    const result = service.checkNewAchievements(INITIAL_LEARNER_STATE, makeSession());
    expect(result).toHaveLength(0);
  });

  it("skips already-unlocked achievements", () => {
    const state: LearnerState = {
      ...INITIAL_LEARNER_STATE,
      completedLessons: [1],
      achievements: ["first_lesson"],
    };
    const result = service.checkNewAchievements(state, makeSession());
    expect(result).not.toContain("first_lesson");
  });

  it("unlocks first_lesson after completing 1 lesson", () => {
    const state: LearnerState = {
      ...INITIAL_LEARNER_STATE,
      completedLessons: [1],
    };
    const result = service.checkNewAchievements(state, makeSession({ type: "lesson" }));
    expect(result).toContain("first_lesson");
  });

  it("unlocks five_lessons after completing 5 lessons", () => {
    const state: LearnerState = {
      ...INITIAL_LEARNER_STATE,
      completedLessons: [1, 2, 3, 4, 5],
      achievements: ["first_lesson"],
    };
    const result = service.checkNewAchievements(state, makeSession({ type: "lesson" }));
    expect(result).toContain("five_lessons");
    expect(result).not.toContain("first_lesson");
  });

  it("unlocks first_review on first review session", () => {
    const state: LearnerState = {
      ...INITIAL_LEARNER_STATE,
      sessionHistory: [makeSession({ type: "review" })],
    };
    const result = service.checkNewAchievements(state, makeSession({ type: "review" }));
    expect(result).toContain("first_review");
  });

  it("unlocks century when total reviewed >= 100", () => {
    const sessions = Array.from({ length: 10 }, () => makeSession({ totalCards: 10 }));
    const state: LearnerState = {
      ...INITIAL_LEARNER_STATE,
      sessionHistory: sessions,
    };
    const result = service.checkNewAchievements(state, makeSession());
    expect(result).toContain("century");
  });

  it("unlocks first_guru when a card has graduated (learningStep null)", () => {
    const card = makeCard(null, 5000); // graduated, Guru stage
    const state: LearnerState = {
      ...INITIAL_LEARNER_STATE,
      cards: { [card.id]: card },
    };
    const result = service.checkNewAchievements(state, makeSession());
    expect(result).toContain("first_guru");
  });

  it("unlocks first_burned when a card has interval >= ENLIGHTENED_THRESHOLD", () => {
    const card = makeCard(null, 120_960); // Burned
    const state: LearnerState = {
      ...INITIAL_LEARNER_STATE,
      cards: { [card.id]: card },
    };
    const result = service.checkNewAchievements(state, makeSession());
    expect(result).toContain("first_burned");
    expect(result).toContain("first_guru");
    expect(result).toContain("first_master");
  });

  it("unlocks perfect_session for 100% accuracy with >= 10 cards", () => {
    const state = { ...INITIAL_LEARNER_STATE };
    const result = service.checkNewAchievements(
      state,
      makeSession({ accuracy: 100, totalCards: 10 }),
    );
    expect(result).toContain("perfect_session");
  });

  it("does NOT unlock perfect_session for < 10 cards", () => {
    const state = { ...INITIAL_LEARNER_STATE };
    const result = service.checkNewAchievements(
      state,
      makeSession({ accuracy: 100, totalCards: 9 }),
    );
    expect(result).not.toContain("perfect_session");
  });
});
```

**Step 2: Run test to confirm failure**

```bash
npx vitest run src/domain/shared/services/AchievementService.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement `AchievementService`**

Create `src/domain/shared/services/AchievementService.ts`:

```typescript
import { SrsStage } from "../../srs/value-objects/SrsStage";
import type { LearnerState, SessionSummary } from "../types";

// Stage interval thresholds (minutes) — from SrsStage.ts
const GURU_INTERVAL = 0; // any graduated card (learningStep === null && interval > 0)
const MASTER_INTERVAL = SrsStage.GURU_THRESHOLD;       // 20_160
const BURNED_INTERVAL = SrsStage.ENLIGHTENED_THRESHOLD; // 120_960

type AchievementId =
  | "first_lesson"
  | "five_lessons"
  | "all_lessons"
  | "first_review"
  | "century"
  | "warrior"
  | "first_guru"
  | "first_master"
  | "first_burned"
  | "vocab_start"
  | "grammar_start"
  | "perfect_session";

export class AchievementService {
  /**
   * Returns IDs of achievements newly unlocked given the current state.
   * Does NOT modify state — caller is responsible for persisting.
   */
  checkNewAchievements(
    state: LearnerState,
    session: SessionSummary,
  ): string[] {
    const alreadyUnlocked = new Set(state.achievements ?? []);
    const earned: string[] = [];

    const check = (id: AchievementId, condition: boolean) => {
      if (condition && !alreadyUnlocked.has(id)) earned.push(id);
    };

    const { completedLessons, sessionHistory, cards, vocabCards, grammarCards } = state;

    // Lesson milestones
    check("first_lesson", completedLessons.length >= 1);
    check("five_lessons", completedLessons.length >= 5);
    check("all_lessons", completedLessons.length >= 25);

    // Review milestones
    const reviewSessions = sessionHistory.filter(
      (s) => s.type === "review" || s.type === "vocab-review" || s.type === "grammar-review",
    );
    check("first_review", reviewSessions.length >= 1);

    const totalReviewed = sessionHistory.reduce((sum, s) => sum + s.totalCards, 0);
    check("century", totalReviewed >= 100);
    check("warrior", totalReviewed >= 500);

    // Card stages — check all pools
    const allSrsData = [
      ...Object.values(cards).map((c) => c.srs),
      ...Object.values(vocabCards).map((c) => c.srs),
      ...Object.values(grammarCards).map((c) => c.srs),
    ];

    const hasGraduatedCard = allSrsData.some(
      (srs) => srs.learningStep === null && srs.interval > GURU_INTERVAL,
    );
    const hasMasterCard = allSrsData.some(
      (srs) => srs.learningStep === null && srs.interval >= MASTER_INTERVAL,
    );
    const hasBurnedCard = allSrsData.some(
      (srs) => srs.learningStep === null && srs.interval >= BURNED_INTERVAL,
    );

    check("first_guru", hasGraduatedCard);
    check("first_master", hasMasterCard);
    check("first_burned", hasBurnedCard);

    // Content starts
    check("vocab_start", Object.keys(vocabCards).length > 0);
    const hasGrammarSession = sessionHistory.some(
      (s) => s.type === "grammar-lesson" || s.type === "grammar-review",
    );
    check("grammar_start", hasGrammarSession);

    // Perfect session: current session only
    check(
      "perfect_session",
      session.accuracy === 100 && session.totalCards >= 10,
    );

    return earned;
  }
}
```

**Step 4: Run tests**

```bash
npx vitest run src/domain/shared/services/AchievementService.test.ts
```

Expected: PASS.

**Step 5: Full suite**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: all pass.

**Step 6: Commit**

```bash
git add src/domain/shared/services/AchievementService.ts src/domain/shared/services/AchievementService.test.ts
git commit -m "feat(domain): add AchievementService with 12 milestone achievements"
```

---

### Task 5: Wire achievements into `ConductReviewUseCase` and `AppContext`

**Files:**
- Modify: `src/application/use-cases/ConductReviewUseCase.ts`
- Modify: `src/presentation/context/AppContext.tsx`

**Step 1: Make `ConductReviewUseCase.endSession()` return `SessionSummary`**

Open `src/application/use-cases/ConductReviewUseCase.ts`. Find the `endSession` method and ensure it returns the `SessionSummary` it creates. Update the return type from `void` to `SessionSummary`.

Check current signature. If it calls `stateRepo.addSession(summary)` and returns `void`, change to:

```typescript
endSession(session: ActiveReviewSession, pool: CardPool = "script"): SessionSummary {
  // ... existing logic ...
  stateRepo.addSession(summary);
  return summary;
}
```

**Step 2: Add `checkAchievements` to `AppContext`**

In `src/presentation/context/AppContext.tsx`, import and instantiate `AchievementService`:

```typescript
import { AchievementService } from "../../domain/shared/services/AchievementService";
// near other service instantiations (outside the component):
const achievementService = new AchievementService();
```

Add `checkAchievements` to `AppContextValue`:

```typescript
export interface AppContextValue {
  state: LearnerState;
  refresh: () => void;
  lesson: StartLessonUseCase;
  review: ConductReviewUseCase;
  dashboard: QueryDashboardUseCase;
  data: ManageDataUseCase;
  checkAchievements: (summary: SessionSummary) => string[];  // ← ADD
}
```

Implement in the `AppProvider` component:

```typescript
const checkAchievements = useCallback(
  (summary: SessionSummary): string[] => {
    const freshState = storage.load();
    const newIds = achievementService.checkNewAchievements(freshState, summary);
    for (const id of newIds) {
      stateRepo.addAchievement(id);
    }
    return newIds;
  },
  [],
);
```

Add to the context value object:

```typescript
const value = useMemo(
  () => ({ state, refresh, lesson: lessonUseCase, review: reviewUseCase, dashboard: dashboardUseCase, data: dataUseCase, checkAchievements }),
  [state, refresh, checkAchievements],
);
```

**Step 3: Update `useApp` hook type (if it re-exports the type)**

Check `src/presentation/hooks/useApp.ts`:

```typescript
import { useContext } from "react";
import { AppContext } from "../context/AppContext";

export function useApp() {
  return useContext(AppContext)!;
}
```

No changes needed if it just re-exports the context.

**Step 4: Update callers of `endSession`**

In `src/presentation/hooks/useReviewSession.ts`, find where `endSession` is called. Update the `handleReviewAdvance` return value to include the session summary so pages can pass it to `checkAchievements`.

Currently `handleReviewAdvance` returns `{ status: "complete", results: [...] }`. Extend to:

```typescript
return { status: "complete" as const, results: [...], summary };
```

Where `summary` is the return value of the `endSession` callback.

**Step 5: Verify**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: all pass.

**Step 6: Commit**

```bash
git add src/application/use-cases/ConductReviewUseCase.ts src/presentation/context/AppContext.tsx src/presentation/hooks/useReviewSession.ts
git commit -m "feat(app): wire AchievementService into AppContext and ConductReviewUseCase"
```

---

## Phase 2: CSS Design System

### Task 6: Replace `src/index.css` with Thai royal token system

**Files:**
- Modify: `src/index.css`

**Step 1: Replace the file**

Tailwind CSS v4 uses `@theme` to register design tokens as utility classes (`bg-primary`, `text-accent`, etc.).

```css
@import "tailwindcss";

/* ===== Thai Royal Color Tokens ===== */
@theme {
  /* Light mode defaults */
  --color-bg:          #FAFAF5;
  --color-surface:     #FFFFFF;
  --color-surface-2:   #F0EDE4;
  --color-border:      #D6CEB8;
  --color-text:        #0D1B2A;
  --color-text-muted:  #6B6B7A;

  --color-primary:     #1A3A6B;
  --color-primary-h:   #142E56;
  --color-accent:      #C9A227;
  --color-accent-h:    #B8911F;
  --color-danger:      #C0392B;

  /* SRS Stage Colors */
  --color-apprentice:  #D4688A;
  --color-guru:        #E8951A;
  --color-master:      #257A5A;
  --color-enlightened: #1A3A6B;
  --color-burned:      #C9A227;
}

/* ===== Dark Mode Overrides ===== */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:          #0D1320;
    --color-surface:     #131E30;
    --color-surface-2:   #1A2740;
    --color-border:      #253550;
    --color-text:        #EDE8DC;
    --color-text-muted:  #8A94A6;
  }
}

/* ===== Typography ===== */
.thai {
  font-family: "Noto Serif Thai", "Noto Sans Thai Looped", sans-serif;
  font-size: 1.1em;
}

/* ===== Reusable Primitives ===== */
.card-royal {
  background: var(--color-surface);
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(13,27,42,0.08);
  border: 1px solid var(--color-border);
}

.section-header {
  border-left: 2px solid var(--color-accent);
  padding-left: 0.75rem;
  font-weight: 600;
  font-variant: small-caps;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-size: 0.75rem;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border-radius: 0.75rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  transition: background 0.15s;
}

.btn-primary:hover {
  background: var(--color-primary-h);
}

.btn-accent {
  background: var(--color-accent);
  color: var(--color-text);
  border-radius: 0.75rem;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  transition: background 0.15s;
}
```

**Step 2: Verify app still runs**

```bash
npx vite build
```

Expected: build succeeds (Tailwind will generate utilities from `@theme` tokens).

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(css): add Thai royal design token system with dark mode support"
```

---

## Phase 3: Layout Shell

### Task 7: Create `BottomTabBar` component

**Files:**
- Create: `src/presentation/components/BottomTabBar.tsx`

The bottom tab bar has 5 tabs with geometric Thai-inspired SVG icons.

**Step 1: Create the component**

```typescript
import { NavLink } from "react-router";

interface Tab {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

function LotusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M12 2C9.5 5 7 7.5 7 10c0 2.8 2.2 5 5 5s5-2.2 5-5c0-2.5-2.5-5-5-8z" opacity="0.6"/>
      <path d="M12 7C10 9.5 9 11 9 13c0 1.7 1.3 3 3 3s3-1.3 3-3c0-2-1-3.5-3-6z"/>
      <ellipse cx="12" cy="22" rx="4" ry="1" opacity="0.3"/>
    </svg>
  );
}

function DaggersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <rect x="11" y="2" width="2" height="14" rx="1"/>
      <path d="M11 16l-2 4h6l-2-4z"/>
      <rect x="8" y="8" width="8" height="1.5" rx="0.75" opacity="0.7"/>
      <rect x="2" y="11" width="2" height="14" rx="1" transform="rotate(-45 3 18)"/>
      <rect x="20" y="11" width="2" height="14" rx="1" transform="rotate(45 21 18)"/>
    </svg>
  );
}

function PalmLeafIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M4 4h16v2H4z" rx="1"/>
      <path d="M4 8h14v2H4z"/>
      <path d="M4 12h12v2H4z"/>
      <path d="M4 16h10v2H4z"/>
      <path d="M4 20h8v2H4z"/>
    </svg>
  );
}

function GemIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M12 2L7 8l5 14 5-14z"/>
      <path d="M7 8L2 10l5 12z" opacity="0.7"/>
      <path d="M17 8l5 2-5 12z" opacity="0.7"/>
      <path d="M2 10h20l-5-2H7z" opacity="0.5"/>
    </svg>
  );
}

function PagodaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M12 2l1 4H11z"/>
      <rect x="9" y="6" width="6" height="3" rx="0.5"/>
      <rect x="7" y="9" width="10" height="3" rx="0.5"/>
      <rect x="5" y="12" width="14" height="3" rx="0.5"/>
      <rect x="8" y="15" width="8" height="5" rx="0.5"/>
    </svg>
  );
}

interface BottomTabBarProps {
  vocabUnlocked: boolean;
  grammarUnlocked: boolean;
  dueCount: number;
}

export function BottomTabBar({ vocabUnlocked, grammarUnlocked, dueCount }: BottomTabBarProps) {
  const tabs: Tab[] = [
    { to: "/", label: "Home", icon: <LotusIcon />, badge: dueCount > 0 ? dueCount : undefined },
    { to: "/review", label: "Review", icon: <DaggersIcon /> },
    { to: "/lessons", label: "Lessons", icon: <PalmLeafIcon /> },
    { to: "/items", label: "Items", icon: <GemIcon /> },
    { to: "/progress", label: "Progress", icon: <PagodaIcon /> },
  ];

  const activeStyle = "text-[var(--color-accent)]";
  const inactiveStyle = "text-[var(--color-text-muted)]";

  return (
    <>
      {/* Mobile: fixed bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-[var(--color-surface)] border-t border-[var(--color-border)] z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          {tabs.map(({ to, label, icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[10px] font-medium relative px-2 py-1 ${isActive ? activeStyle : inactiveStyle}`
              }
            >
              {icon}
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[var(--color-apprentice)] text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-bold">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Desktop: top horizontal nav */}
      <nav className="hidden md:flex gap-6 items-center">
        {tabs.map(({ to, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `text-sm font-medium transition-colors relative ${isActive ? activeStyle : inactiveStyle}`
            }
          >
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="ml-1.5 bg-[var(--color-apprentice)] text-white text-[9px] rounded-full px-1.5 py-0.5 font-bold">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
        {vocabUnlocked && (
          <NavLink
            to="/vocabulary"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? activeStyle : inactiveStyle}`
            }
          >
            Vocab
          </NavLink>
        )}
        {grammarUnlocked && (
          <NavLink
            to="/grammar"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${isActive ? activeStyle : inactiveStyle}`
            }
          >
            Grammar
          </NavLink>
        )}
      </nav>
    </>
  );
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/presentation/components/BottomTabBar.tsx
git commit -m "feat(ui): add BottomTabBar with Thai-inspired SVG icons"
```

---

### Task 8: Create `HudStrip` component

**Files:**
- Create: `src/presentation/components/HudStrip.tsx`

The HUD strip shows: due count pill (left), app name (center), 7-day review dots (right).

**Step 1: Create the component**

```typescript
interface HudStripProps {
  dueCount: number;
  sessionHistory: Array<{ completedAt?: string }>;
}

export function HudStrip({ dueCount, sessionHistory }: HudStripProps) {
  // Build 7-day dot row: today = index 6, 6 days ago = index 0
  const dots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toDateString();
    const reviewed = sessionHistory.some((s) => {
      if (!s.completedAt) return false;
      return new Date(s.completedAt).toDateString() === dateStr;
    });
    const isToday = i === 6;
    return { reviewed, isToday };
  });

  return (
    <div className="flex items-center justify-between px-4 h-10 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      {/* Left: due count */}
      <div>
        {dueCount > 0 ? (
          <span className="bg-[var(--color-apprentice)] text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {dueCount} due
          </span>
        ) : (
          <span className="text-[var(--color-text-muted)] text-xs">All clear</span>
        )}
      </div>

      {/* Center: app name */}
      <div className="text-sm font-semibold tracking-tight text-[var(--color-text)]">
        <span className="thai mr-1">ไทย</span>Script
      </div>

      {/* Right: 7-dot week row */}
      <div className="flex gap-1">
        {dots.map(({ reviewed, isToday }, i) => (
          <div
            key={i}
            className={[
              "w-2.5 h-2.5 rounded-full transition-all",
              isToday && reviewed
                ? "bg-[var(--color-accent)] ring-2 ring-[var(--color-accent)] ring-offset-1"
                : isToday
                ? "bg-[var(--color-border)] ring-2 ring-[var(--color-border)] ring-offset-1"
                : reviewed
                ? "bg-[var(--color-accent)] opacity-70"
                : "bg-[var(--color-border)]",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/presentation/components/HudStrip.tsx
git commit -m "feat(ui): add HudStrip with due count pill and 7-day review dots"
```

---

### Task 9: Update `Layout.tsx`

**Files:**
- Modify: `src/presentation/components/Layout.tsx`

Replace the top `<header>` nav with `HudStrip` + `BottomTabBar`. Add mobile bottom padding.

**Step 1: Rewrite `Layout.tsx`**

```typescript
import { Outlet } from "react-router";
import { useApp } from "../hooks/useApp";
import { BottomTabBar } from "./BottomTabBar";
import { HudStrip } from "./HudStrip";

export function Layout() {
  const { state, lesson, review } = useApp();
  const dueCount = review.getDueCount();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <HudStrip dueCount={dueCount} sessionHistory={state.sessionHistory} />

      {/* Desktop top nav */}
      <header className="hidden md:flex border-b border-[var(--color-border)] px-6 py-3 bg-[var(--color-surface)] items-center gap-6">
        <BottomTabBar
          vocabUnlocked={lesson.getVocabUnlockedCount() > 0}
          grammarUnlocked={lesson.getGrammarUnlockedCount() > 0}
          dueCount={dueCount}
        />
      </header>

      <main className="flex-1 p-4 pb-24 md:pb-4 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar
        vocabUnlocked={lesson.getVocabUnlockedCount() > 0}
        grammarUnlocked={lesson.getGrammarUnlockedCount() > 0}
        dueCount={dueCount}
      />
    </div>
  );
}
```

Note: `BottomTabBar` renders the mobile `<nav>` as `fixed bottom-0` and the desktop nav as `hidden md:flex`. The `<header>` wrapper on desktop wraps the BottomTabBar's desktop nav. The mobile BottomTabBar below renders the fixed bar.

**Step 2: Verify**

```bash
npx tsc --noEmit && npx vitest run
```

**Step 3: Commit**

```bash
git add src/presentation/components/Layout.tsx
git commit -m "feat(ui): replace top nav with HudStrip + BottomTabBar shell"
```

---

## Phase 4: New Shared Components

### Task 10: Create `HeatmapWidget`

**Files:**
- Create: `src/presentation/components/HeatmapWidget.tsx`
- Create: `src/presentation/components/HeatmapWidget.test.ts`

**Step 1: Write failing tests for the data computation helper**

Create `src/presentation/components/HeatmapWidget.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildHeatmapGrid } from "./HeatmapWidget";

describe("buildHeatmapGrid", () => {
  it("returns 12 rows of 7 days", () => {
    const grid = buildHeatmapGrid([]);
    expect(grid).toHaveLength(12);
    expect(grid[0]).toHaveLength(7);
  });

  it("counts sessions on the correct date", () => {
    const today = new Date().toISOString();
    const sessions = [
      { completedAt: today, totalCards: 15 },
      { completedAt: today, totalCards: 8 },
    ];
    const grid = buildHeatmapGrid(sessions);
    const todayCell = grid[11][6]; // last row, last column = today
    expect(todayCell.count).toBe(23);
  });

  it("intensity is 0 for empty cells", () => {
    const grid = buildHeatmapGrid([]);
    expect(grid[0][0].intensity).toBe(0);
  });

  it("intensity is 3 for cells with >= 20 cards", () => {
    const today = new Date().toISOString();
    const sessions = [{ completedAt: today, totalCards: 25 }];
    const grid = buildHeatmapGrid(sessions);
    expect(grid[11][6].intensity).toBe(3);
  });
});
```

**Step 2: Run to confirm failure**

```bash
npx vitest run src/presentation/components/HeatmapWidget.test.ts
```

Expected: FAIL — module not found.

**Step 3: Create `HeatmapWidget.tsx`**

```typescript
import type { SessionSummary } from "../../domain/shared/types";

interface HeatmapCell {
  date: Date;
  count: number;
  intensity: 0 | 1 | 2 | 3;
  isToday: boolean;
}

export function buildHeatmapGrid(
  sessions: Pick<SessionSummary, "completedAt" | "totalCards">[],
): HeatmapCell[][] {
  // Build a map of dateString → total cards reviewed
  const countByDay = new Map<string, number>();
  for (const s of sessions) {
    if (!s.completedAt) continue;
    const key = new Date(s.completedAt).toDateString();
    countByDay.set(key, (countByDay.get(key) ?? 0) + s.totalCards);
  }

  // 12 weeks = 84 days. Start from 83 days ago (Monday-aligned is nice but not required)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toDateString();

  const rows: HeatmapCell[][] = [];
  for (let week = 0; week < 12; week++) {
    const row: HeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
      const d = new Date(today);
      d.setDate(today.getDate() - (11 - week) * 7 - (6 - day));
      const count = countByDay.get(d.toDateString()) ?? 0;
      const intensity: 0 | 1 | 2 | 3 =
        count === 0 ? 0 : count < 5 ? 1 : count < 20 ? 2 : 3;
      row.push({ date: d, count, intensity, isToday: d.toDateString() === todayStr });
    }
    rows.push(row);
  }
  return rows;
}

const INTENSITY_COLORS = [
  "#E8E0D0", // 0 - empty
  "#E8B887", // 1 - light
  "#C9A227", // 2 - medium
  "#8B6914", // 3 - heavy
];

interface HeatmapWidgetProps {
  sessions: Pick<SessionSummary, "completedAt" | "totalCards">[];
}

export function HeatmapWidget({ sessions }: HeatmapWidgetProps) {
  const grid = buildHeatmapGrid(sessions);
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div>
      <div className="section-header mb-3">Study History</div>
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1">
          {days.map((d, i) => (
            <div key={i} className="w-3 h-3 flex items-center justify-center text-[8px] text-[var(--color-text-muted)]">
              {i % 2 === 0 ? d : ""}
            </div>
          ))}
        </div>
        {/* Grid: columns = weeks, rows = days */}
        {grid.map((row, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-0.5">
            {row.map((cell, dayIdx) => (
              <div
                key={dayIdx}
                title={`${cell.date.toDateString()}: ${cell.count} cards`}
                className={`w-3 h-3 rounded-sm transition-colors ${cell.isToday ? "ring-1 ring-[var(--color-accent)]" : ""}`}
                style={{ background: INTENSITY_COLORS[cell.intensity] }}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[10px] text-[var(--color-text-muted)]">Less</span>
        {INTENSITY_COLORS.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
        ))}
        <span className="text-[10px] text-[var(--color-text-muted)]">More</span>
      </div>
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npx vitest run src/presentation/components/HeatmapWidget.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/presentation/components/HeatmapWidget.tsx src/presentation/components/HeatmapWidget.test.ts
git commit -m "feat(ui): add HeatmapWidget with 12-week gold intensity grid"
```

---

### Task 11: Create `AchievementBadge`

**Files:**
- Create: `src/presentation/components/AchievementBadge.tsx`

**Step 1: Create the component**

```typescript
interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or letter motif
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_lesson",    name: "First Steps",          description: "Complete your first lesson",              icon: "❀" },
  { id: "five_lessons",    name: "Scholar's Path",       description: "Complete 5 lessons",                      icon: "📜" },
  { id: "all_lessons",     name: "Royal Student",        description: "Complete all 25 lessons",                 icon: "🏛" },
  { id: "first_review",    name: "First Review",         description: "Complete your first review session",      icon: "⚔" },
  { id: "century",         name: "Century",              description: "Review 100 cards total",                  icon: "❂" },
  { id: "warrior",         name: "Warrior's Discipline", description: "Review 500 cards total",                  icon: "◈" },
  { id: "first_guru",      name: "Apprentice Graduate",  description: "Reach Guru stage on any card",            icon: "✦" },
  { id: "first_master",    name: "Guru Achieved",        description: "Reach Master stage on any card",          icon: "⬡" },
  { id: "first_burned",    name: "Burning Bright",       description: "Burn your first card",                    icon: "✸" },
  { id: "vocab_start",     name: "Word Weaver",          description: "Start vocabulary learning",               icon: "◉" },
  { id: "grammar_start",   name: "Grammar Master",       description: "Complete your first grammar lesson",      icon: "⛩" },
  { id: "perfect_session", name: "Golden Seal",          description: "100% accuracy on a session of 10+ cards", icon: "◎" },
];

interface AchievementBadgeProps {
  id: string;
  unlocked: boolean;
  size?: "sm" | "md";
}

export function AchievementBadge({ id, unlocked, size = "md" }: AchievementBadgeProps) {
  const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
  if (!def) return null;

  const sizeClass = size === "sm" ? "w-12 h-12 text-xl" : "w-16 h-16 text-2xl";

  return (
    <div className="flex flex-col items-center gap-1 text-center" title={def.description}>
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center transition-all border-2`}
        style={
          unlocked
            ? {
                background: "var(--color-accent)",
                borderColor: "var(--color-accent-h)",
                color: "white",
              }
            : {
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-border)",
                filter: "grayscale(1)",
              }
        }
      >
        {def.icon}
      </div>
      <span
        className="text-[10px] font-medium leading-tight max-w-[60px]"
        style={{ color: unlocked ? "var(--color-text)" : "var(--color-text-muted)" }}
      >
        {def.name}
      </span>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/presentation/components/AchievementBadge.tsx
git commit -m "feat(ui): add AchievementBadge component with 12 Thai-inspired achievement definitions"
```

---

### Task 12: Create `StagePromotionPanel`

**Files:**
- Create: `src/presentation/components/StagePromotionPanel.tsx`

Shown on the session complete screen when any cards advanced to a higher stage.

**Step 1: Create the component**

```typescript
interface Promotion {
  cardQuestion: string;
  newStage: string;
}

interface StagePromotionPanelProps {
  promotions: Promotion[];
}

const STAGE_COLORS: Record<string, string> = {
  Guru:        "var(--color-guru)",
  Master:      "var(--color-master)",
  Enlightened: "var(--color-enlightened)",
  Burned:      "var(--color-burned)",
};

const STAGE_LABELS: Record<string, string> = {
  Guru:        "Guru",
  Master:      "Master",
  Enlightened: "Enlightened",
  Burned:      "Burned ✸",
};

export function StagePromotionPanel({ promotions }: StagePromotionPanelProps) {
  if (promotions.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-4 border"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-accent)",
      }}
    >
      <div className="section-header mb-3">Stage Promotions</div>
      <div className="space-y-2">
        {promotions.map((p, i) => (
          <div key={i} className="flex items-center justify-between">
            <span
              className="thai text-lg font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              {p.cardQuestion}
            </span>
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full text-white"
              style={{
                background: STAGE_COLORS[p.newStage] ?? "var(--color-primary)",
              }}
            >
              {STAGE_LABELS[p.newStage] ?? p.newStage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/presentation/components/StagePromotionPanel.tsx
git commit -m "feat(ui): add StagePromotionPanel for post-session stage promotions"
```

---

### Task 13: Create `LessonPath` SVG component

**Files:**
- Create: `src/presentation/components/LessonPath.tsx`

Bottom-to-top ascending path. Completed = jade green + checkmark; Next available = royal blue + pulse; Locked = muted gray + lock.

**Step 1: Create the component**

```typescript
interface LessonPathProps {
  totalLessons: number;
  completedLessons: Set<number>;
  nextAvailable: number | null;
  onLessonClick: (n: number) => void;
}

export function LessonPath({
  totalLessons,
  completedLessons,
  nextAvailable,
  onLessonClick,
}: LessonPathProps) {
  // Layout: 3 nodes per row, alternating left-to-right and right-to-left
  // Bottom lesson = lesson 1 (rendered last in the array since we go bottom-to-top)
  const lessons = Array.from({ length: totalLessons }, (_, i) => i + 1);
  const COLS = 3;
  const SPACING_X = 80;
  const SPACING_Y = 70;
  const NODE_R = 22;

  // Build positions: lesson 1 at bottom-left, zigzagging up
  const positions = lessons.map((n) => {
    const idx = n - 1;
    const row = Math.floor(idx / COLS);
    const col = idx % COLS;
    // Alternate direction per row
    const x = row % 2 === 0 ? col * SPACING_X + NODE_R : (COLS - 1 - col) * SPACING_X + NODE_R;
    const y = row * SPACING_Y + NODE_R;
    return { n, x, y };
  });

  const svgWidth = COLS * SPACING_X + NODE_R * 2;
  const svgHeight = (Math.ceil(totalLessons / COLS)) * SPACING_Y + NODE_R * 2;

  // Flip Y so lesson 1 is at bottom
  const flipY = (y: number) => svgHeight - y;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full"
      style={{ maxHeight: "600px" }}
    >
      {/* Path lines between consecutive lessons */}
      {positions.slice(0, -1).map(({ x, y }, i) => {
        const next = positions[i + 1];
        return (
          <line
            key={i}
            x1={x}
            y1={flipY(y)}
            x2={next.x}
            y2={flipY(next.y)}
            stroke="var(--color-border)"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        );
      })}

      {/* Lesson nodes */}
      {positions.map(({ n, x, y }) => {
        const isCompleted = completedLessons.has(n);
        const isNext = n === nextAvailable;
        const isLocked = !isCompleted && !isNext;

        const fill = isCompleted
          ? "var(--color-master)"
          : isNext
          ? "var(--color-primary)"
          : "var(--color-surface-2)";
        const textColor = isLocked ? "var(--color-text-muted)" : "white";

        return (
          <g
            key={n}
            transform={`translate(${x}, ${flipY(y)})`}
            onClick={() => !isLocked && onLessonClick(n)}
            className={isLocked ? "cursor-default" : "cursor-pointer"}
          >
            {isNext && (
              <circle r={NODE_R + 6} fill="var(--color-primary)" opacity="0.15">
                <animate attributeName="r" values={`${NODE_R + 4};${NODE_R + 8};${NODE_R + 4}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r={NODE_R} fill={fill} />
            {isCompleted ? (
              <text textAnchor="middle" dominantBaseline="central" fontSize="14" fill={textColor}>
                ✓
              </text>
            ) : isLocked ? (
              <text textAnchor="middle" dominantBaseline="central" fontSize="12" fill={textColor}>
                🔒
              </text>
            ) : null}
            <text
              textAnchor="middle"
              dominantBaseline={isCompleted || isLocked ? "auto" : "central"}
              dy={isCompleted || isLocked ? 8 : 0}
              fontSize="11"
              fontWeight="600"
              fill={textColor}
            >
              {n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/LessonPath.tsx
git commit -m "feat(ui): add LessonPath SVG with zigzag ascending path and pulsing next-available node"
```

---

## Phase 5: Quiz Component Updates

### Task 14: Update `MultipleChoice.tsx`

**Changes per design doc:**
- Gold border on card (manuscript feel)
- Thai numeral badges (๑๒๓๔) as visual accent, keyboard shortcuts remain 1–4
- Transition delay 500ms (down from 800ms)
- Correct: gold background flash; Incorrect: crimson tint

**Files:**
- Modify: `src/presentation/components/MultipleChoice.tsx`

**Step 1: Read the current file**

```bash
cat src/presentation/components/MultipleChoice.tsx
```

**Step 2: Apply targeted changes**

In `MultipleChoice.tsx`:

1. Add Thai numeral array near the top:
```typescript
const THAI_NUMERALS = ["๑", "๒", "๓", "๔"];
```

2. Change the reveal delay from `800` to `500`:
```typescript
setTimeout(() => onAnswer(isCorrect, Date.now() - displayedAtRef.current), 500);
```

3. Update choice button classes — replace the existing correct/incorrect/default styling with:
```typescript
// Correct answer button style (after reveal):
"bg-[var(--color-accent)] text-white border-[var(--color-accent-h)]"
// Incorrect selection style:
"bg-red-100 border-red-400 text-red-800 dark:bg-red-900/30 dark:text-red-300"
// Highlighted correct (when user was wrong):
"bg-[var(--color-accent)] text-white border-[var(--color-accent-h)]"
// Default unselected:
"bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
```

4. Add Thai numeral to each choice button label (as a badge beside the number):
```tsx
<span className="inline-flex items-center gap-1.5">
  <span className="text-xs opacity-60 font-normal">{THAI_NUMERALS[idx]}</span>
  {choice}
</span>
```

5. Update the card container to use gold border:
```tsx
<div className="rounded-2xl border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-6 mb-6 text-center shadow-sm">
```

6. Update choice buttons to use `min-h-[5rem]`:
```tsx
className="... min-h-[5rem] w-full ..."
```

**Step 3: Verify**

```bash
npx tsc --noEmit && npx vitest run
```

**Step 4: Commit**

```bash
git add src/presentation/components/MultipleChoice.tsx
git commit -m "feat(ui): update MultipleChoice with gold border, Thai numeral badges, 500ms reveal"
```

---

### Task 15: Update `Flashcard.tsx`

**Changes:**
- Stage-colored dot in card corner (shows current SRS stage)
- Back reveal: slide-up animation
- Rating buttons: Again=red, Wrong=orange, Hard=amber, Good=jade, Easy=gold

**Files:**
- Modify: `src/presentation/components/Flashcard.tsx`
- Modify: `src/presentation/components/RatingButtons.tsx`

**Step 1: Read both files**

```bash
cat src/presentation/components/Flashcard.tsx
cat src/presentation/components/RatingButtons.tsx
```

**Step 2: Update `RatingButtons.tsx`**

Replace the button color classes with Thai palette:

```typescript
const RATING_STYLES = {
  1: { label: "Again",  bg: "var(--color-danger)",      text: "white" },
  2: { label: "Wrong",  bg: "#E8951A",                  text: "white" }, // saffron/orange
  3: { label: "Hard",   bg: "#D4A017",                  text: "white" }, // amber
  4: { label: "Good",   bg: "var(--color-master)",      text: "white" }, // jade
  5: { label: "Easy",   bg: "var(--color-accent)",      text: "var(--color-text)" }, // gold
} as const;
```

Apply these styles to each button using inline `style` props.

**Step 3: Update `Flashcard.tsx`**

The card prop has `srs` data. Compute stage and add a colored dot:

```typescript
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";

// In the component, before JSX:
const srsData = card.srs ?? (card as any).schedule?.toDTO?.();
const stage = srsData
  ? SrsStage.fromScheduleData(srsData.learningStep, srsData.interval)
  : null;

const STAGE_DOT_COLORS: Record<string, string> = {
  Apprentice:  "var(--color-apprentice)",
  Guru:        "var(--color-guru)",
  Master:      "var(--color-master)",
  Enlightened: "var(--color-enlightened)",
  Burned:      "var(--color-burned)",
};
```

Add stage dot in top-right of card:
```tsx
<div className="relative rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 mb-6 text-center shadow-sm">
  {stage && (
    <div
      className="absolute top-3 right-3 w-3 h-3 rounded-full"
      style={{ background: STAGE_DOT_COLORS[stage.name] }}
      title={stage.name}
    />
  )}
  {/* ... card content ... */}
</div>
```

Add slide-up animation for answer reveal. In `index.css` or inline style:
```css
@keyframes slideUp {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);  opacity: 1; }
}
```

Apply to the answer div:
```tsx
<div style={{ animation: "slideUp 0.25s ease-out" }}>
  {/* answer content */}
</div>
```

**Step 4: Verify**

```bash
npx tsc --noEmit && npx vitest run
```

**Step 5: Commit**

```bash
git add src/presentation/components/Flashcard.tsx src/presentation/components/RatingButtons.tsx
git commit -m "feat(ui): update Flashcard with stage dot, slide-up reveal, Thai palette rating buttons"
```

---

## Phase 6: Session Complete Screens

### Task 16: Update `ReviewPage.tsx` session header and complete screen

**Files:**
- Modify: `src/presentation/pages/ReviewPage.tsx`

**Step 1: Session header**

Replace the simple title + counter with the design doc's session header:

```tsx
{/* Session header HUD */}
<div className="mb-4">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm font-semibold text-[var(--color-text)]">
      Review Session
    </span>
    <span className="text-sm text-[var(--color-text-muted)]">
      {reviewSession.cardIdx + 1} / {reviewSession.session.cards.length}
    </span>
    <button
      type="button"
      onClick={() => navigate("/")}
      className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] text-lg leading-none"
      title="End session"
    >
      ✕
    </button>
  </div>
  {/* Gold progress bar */}
  <div className="w-full h-1.5 bg-[var(--color-border)] rounded-full">
    <div
      className="h-full rounded-full transition-all"
      style={{
        background: "var(--color-accent)",
        width: `${((reviewSession.cardIdx + 1) / reviewSession.session.cards.length) * 100}%`,
      }}
    />
  </div>
</div>
```

**Step 2: Complete screen**

After `if (done)`, update the complete screen to use the token palette and conditionally show `StagePromotionPanel` and achievement unlocks.

The `done` block receives `resultsRef.current`. We also need to call `checkAchievements` once. Use a ref to ensure we only call it once:

```tsx
const achievementsRef = useRef<string[] | null>(null);
const summaryRef = useRef<SessionSummary | null>(null);

// In handleReviewAdvance, when result.status === "complete":
if (result?.status === "complete") {
  resultsRef.current = result.results;
  summaryRef.current = result.summary ?? null;
  setDone(true);
}

// In the done screen:
if (done && achievementsRef.current === null && summaryRef.current) {
  achievementsRef.current = checkAchievements(summaryRef.current);
  refresh();
}
```

Updated complete screen JSX:

```tsx
<div className="space-y-6 py-8">
  <div className="text-center">
    <div className="text-5xl mb-3">{accuracy.percentage >= 80 ? "✦" : "◈"}</div>
    <h1 className="text-2xl font-semibold" style={{ color: "var(--color-text)" }}>
      Review Complete
    </h1>
  </div>

  {/* Stats grid */}
  <div className="grid grid-cols-3 gap-3">
    {[
      { label: "Reviewed", value: results.length, color: "var(--color-text)" },
      { label: "Correct",  value: correctCount,   color: "var(--color-master)" },
      { label: "Accuracy", value: `${accuracy.percentage}%`, color: accuracy.percentage >= 80 ? "var(--color-accent)" : "var(--color-danger)" },
    ].map(({ label, value, color }) => (
      <div key={label} className="card-royal p-4 text-center">
        <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{label}</div>
      </div>
    ))}
  </div>

  {/* Newly unlocked achievements */}
  {(achievementsRef.current ?? []).length > 0 && (
    <div className="card-royal p-4">
      <div className="section-header mb-3">Achievement Unlocked!</div>
      <div className="flex gap-4 flex-wrap justify-center">
        {(achievementsRef.current ?? []).map((id) => (
          <AchievementBadge key={id} id={id} unlocked size="sm" />
        ))}
      </div>
    </div>
  )}

  {/* Actions */}
  <div className="space-y-3">
    {review.getDueCount() > 0 && (
      <button
        type="button"
        onClick={() => { startedRef.current = false; achievementsRef.current = null; setDone(false); }}
        className="btn-primary w-full"
      >
        Review More ({review.getDueCount()} due)
      </button>
    )}
    <button
      type="button"
      onClick={() => navigate("/")}
      className="w-full py-3 rounded-xl font-semibold border border-[var(--color-border)]"
      style={{ background: "var(--color-surface)", color: "var(--color-text)" }}
    >
      Back to Home
    </button>
  </div>
</div>
```

**Step 3: Verify**

```bash
npx tsc --noEmit && npx vitest run
```

**Step 4: Commit**

```bash
git add src/presentation/pages/ReviewPage.tsx
git commit -m "feat(ui): update ReviewPage with gold session HUD and achievement display on complete screen"
```

---

### Task 17: Update `LessonPage.tsx`, `VocabularyPage.tsx`, `GrammarPage.tsx` complete screens

**Files:**
- Modify: `src/presentation/pages/LessonPage.tsx`
- Modify: `src/presentation/pages/VocabularyPage.tsx`
- Modify: `src/presentation/pages/GrammarPage.tsx`

**Step 1: Read all three files**

```bash
cat src/presentation/pages/LessonPage.tsx
cat src/presentation/pages/VocabularyPage.tsx
cat src/presentation/pages/GrammarPage.tsx
```

**Step 2: Apply consistent updates to all three**

For each file, apply these changes:

**Session header:** Same gold HUD strip as ReviewPage — progress counter, gold progress bar, ✕ end button.

**Complete screen:** Replace emoji-heavy screen with:

```tsx
<div className="space-y-6 py-8">
  <div className="text-center">
    <div className="text-5xl mb-3" style={{ color: "var(--color-accent)" }}>✦</div>
    <h1 className="text-2xl font-semibold" style={{ color: "var(--color-text)" }}>
      Session Complete
    </h1>
    <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
      {accuracy.emoji} {accuracy.percentage}% accuracy
    </p>
  </div>

  <div className="grid grid-cols-3 gap-3">
    {/* same stats grid as ReviewPage */}
  </div>

  {/* New achievements (if any) */}
  {newAchievements.length > 0 && (
    <div className="card-royal p-4">
      <div className="section-header mb-3">Achievement Unlocked!</div>
      <div className="flex gap-4 flex-wrap justify-center">
        {newAchievements.map((id) => (
          <AchievementBadge key={id} id={id} unlocked size="sm" />
        ))}
      </div>
    </div>
  )}

  <div className="space-y-3">
    <button type="button" onClick={() => navigate("/")} className="btn-primary w-full">
      Back to Home
    </button>
  </div>
</div>
```

Wire `checkAchievements` from `useApp()` and call it once when session completes (same pattern as ReviewPage using a ref).

**Step 3: Verify all three files**

```bash
npx tsc --noEmit && npx vitest run
```

**Step 4: Commit**

```bash
git add src/presentation/pages/LessonPage.tsx src/presentation/pages/VocabularyPage.tsx src/presentation/pages/GrammarPage.tsx
git commit -m "feat(ui): update Lesson/Vocab/Grammar complete screens with gold HUD and achievement display"
```

---

## Phase 7: Dashboard & Progress Redesign

### Task 18: Redesign `Dashboard.tsx`

**Files:**
- Modify: `src/presentation/pages/Dashboard.tsx`

**Step 1: Read current file**

Already read above (257 lines). Current sections: stats 3-col grid, apprentice count, leech warning, forecast 5-col grid, actions, recent sessions, vocab section, grammar section.

**Step 2: Rewrite per design doc Section 3**

Order: Primary Action Card → Secondary Actions (2-col) → Stage Progress Pills → Heatmap → Achievement Shelf → Forecast

```tsx
import { useNavigate } from "react-router";
import { NotificationBanner } from "../components/NotificationBanner";
import { AchievementBadge, ACHIEVEMENT_DEFS } from "../components/AchievementBadge";
import { HeatmapWidget } from "../components/HeatmapWidget";
import { useApp } from "../hooks/useApp";

const STAGE_PILL_CONFIG = [
  { key: "apprentice" as const, label: "Apprentice", color: "var(--color-apprentice)" },
  { key: "guru"       as const, label: "Guru",        color: "var(--color-guru)"       },
  { key: "master"     as const, label: "Master",      color: "var(--color-master)"     },
  { key: "enlightened"as const, label: "Enlightened", color: "var(--color-enlightened)"},
  { key: "burned"     as const, label: "Burned",      color: "var(--color-burned)"     },
];

export function Dashboard() {
  const { state, lesson, review, dashboard } = useApp();
  const navigate = useNavigate();

  const nextLesson = lesson.getNextScript();
  const dueCount = review.getDueCount();
  const nextReview = review.getNextReviewDate();
  const forecast = review.getForecast();
  const apprenticeStats = dashboard.getApprenticeStats();
  const leechCount = dashboard.getLeechCount();
  const stages = dashboard.getStageCounts("script");
  const achievements = state.achievements ?? [];

  const isOverdue = dueCount > 0; // simplified; real overdue check would compare nextReviewDate

  return (
    <div className="space-y-6 py-4">
      <NotificationBanner />

      {/* 1. Primary Action Card */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: dueCount > 0 ? "var(--color-primary)" : "var(--color-surface-2)",
          outline: isOverdue ? `2px solid var(--color-accent)` : "none",
          outlineOffset: "2px",
        }}
      >
        {dueCount > 0 ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ background: "var(--color-apprentice)", color: "white" }}
              >
                {dueCount} due
              </span>
              <span className="text-white/70 text-sm">Cards ready for review</span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/review")}
              className="w-full py-4 rounded-xl text-lg font-semibold transition-colors"
              style={{ background: "var(--color-accent)", color: "var(--color-text)" }}
            >
              Start Review
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>
              All reviews complete
            </p>
            {nextReview && (
              <p className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
                Next review{" "}
                {nextReview.toLocaleDateString([], { weekday: "short" })}{" "}
                at{" "}
                {nextReview.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </>
        )}
      </div>

      {/* 2. Secondary Actions (2-col) */}
      <div className="grid grid-cols-2 gap-3">
        {nextLesson ? (
          <button
            type="button"
            onClick={() => navigate(`/lesson/${nextLesson}`)}
            className="card-royal p-4 text-left"
          >
            <div className="text-xs section-header mb-1">Next Lesson</div>
            <div className="font-semibold" style={{ color: "var(--color-primary)" }}>
              Lesson {nextLesson}
            </div>
          </button>
        ) : (
          <div className="card-royal p-4 opacity-50">
            <div className="text-xs section-header mb-1">Script</div>
            <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>All done ✓</div>
          </div>
        )}
        {lesson.getVocabUnlockedCount() > 0 ? (
          <button
            type="button"
            onClick={() => navigate("/vocabulary")}
            className="card-royal p-4 text-left"
          >
            <div className="text-xs section-header mb-1">Vocabulary</div>
            <div className="font-semibold" style={{ color: "var(--color-primary)" }}>
              {review.getDueCount("vocab")} due
            </div>
          </button>
        ) : (
          <div className="card-royal p-4 opacity-50">
            <div className="text-xs section-header mb-1">Vocabulary</div>
            <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Locked</div>
          </div>
        )}
      </div>

      {/* 3. Stage Progress Pills */}
      {Object.values(stages).some((v) => v > 0) && (
        <div>
          <div className="section-header mb-3">SRS Progress</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STAGE_PILL_CONFIG.map(({ key, label, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => navigate("/items")}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium"
                style={{ borderColor: color, color }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                />
                {label}
                <span className="font-bold">{stages[key]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Study Heatmap */}
      {state.sessionHistory.length > 0 && (
        <div className="card-royal p-4">
          <HeatmapWidget sessions={state.sessionHistory} />
        </div>
      )}

      {/* 5. Achievement Shelf */}
      {achievements.length > 0 && (
        <div>
          <div className="section-header mb-3">Achievements</div>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {/* Show last 4 unlocked + up to 2 locked as silhouettes */}
            {achievements.slice(-4).map((id) => (
              <AchievementBadge key={id} id={id} unlocked size="sm" />
            ))}
            {ACHIEVEMENT_DEFS.filter((d) => !achievements.includes(d.id))
              .slice(0, 2)
              .map((d) => (
                <AchievementBadge key={d.id} id={d.id} unlocked={false} size="sm" />
              ))}
          </div>
        </div>
      )}

      {/* 6. Forecast */}
      {Object.keys(state.cards).length > 0 && (
        <div>
          <div className="section-header mb-3">Upcoming Reviews</div>
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: "Now",    value: forecast.dueNow },
              { label: "1 hr",   value: forecast.nextHour },
              { label: "24 hr",  value: forecast.next24Hours },
              { label: "3 days", value: forecast.next3Days },
              { label: "7 days", value: forecast.next7Days },
            ].map(({ label, value }) => (
              <div key={label} className="card-royal p-2">
                <div
                  className="text-lg font-bold"
                  style={{ color: value > 0 ? "var(--color-accent)" : "var(--color-text-muted)" }}
                >
                  {value}
                </div>
                <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leech warning */}
      {leechCount > 0 && (
        <div
          className="rounded-xl p-4 flex justify-between items-center"
          style={{ background: "rgba(192,57,43,0.08)", borderLeft: "3px solid var(--color-danger)" }}
        >
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--color-danger)" }}>
              Leeches Detected
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Cards that keep failing — consider extra study
            </div>
          </div>
          <div className="text-2xl font-bold" style={{ color: "var(--color-danger)" }}>
            {leechCount}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verify**

```bash
npx tsc --noEmit && npx vitest run
```

**Step 4: Commit**

```bash
git add src/presentation/pages/Dashboard.tsx
git commit -m "feat(ui): redesign Dashboard with primary action card, stage pills, heatmap, achievement shelf"
```

---

### Task 19: Redesign `ProgressPage.tsx`

**Files:**
- Modify: `src/presentation/pages/ProgressPage.tsx`

**Changes:** Replace `grid-cols-5` lesson button grid with `LessonPath` SVG; add `HeatmapWidget`; add achievement shelf (full); keep stage stats and session history.

**Step 1: Read rest of current file**

```bash
cat src/presentation/pages/ProgressPage.tsx
```

**Step 2: Update imports and content**

Add imports:
```typescript
import { AchievementBadge, ACHIEVEMENT_DEFS } from "../components/AchievementBadge";
import { HeatmapWidget } from "../components/HeatmapWidget";
import { LessonPath } from "../components/LessonPath";
```

Replace the lesson button grid with `LessonPath`:

```tsx
{/* Lesson Path */}
<div>
  <div className="section-header mb-4">Lesson Progress</div>
  <LessonPath
    totalLessons={25}
    completedLessons={completed}
    nextAvailable={nextLesson ?? null}
    onLessonClick={(n) => {
      if (completed.has(n) || n === nextLesson) navigate(`/lesson/${n}`);
    }}
  />
</div>
```

Where `const nextLesson = state.completedLessons.length + 1 <= 25 ? state.completedLessons.length + 1 : null;`

Add full achievement grid (all 12, locked/unlocked):

```tsx
{/* Achievements */}
<div>
  <div className="section-header mb-4">Achievements</div>
  <div className="flex flex-wrap gap-4">
    {ACHIEVEMENT_DEFS.map((def) => (
      <AchievementBadge
        key={def.id}
        id={def.id}
        unlocked={(state.achievements ?? []).includes(def.id)}
        size="md"
      />
    ))}
  </div>
</div>
```

Add heatmap (if sessions exist):

```tsx
{state.sessionHistory.length > 0 && (
  <div className="card-royal p-4">
    <HeatmapWidget sessions={state.sessionHistory} />
  </div>
)}
```

Update stage stats styling to use Thai palette CSS variables instead of hardcoded Tailwind colors:

```tsx
style={{ color: "var(--color-apprentice)" }}  // was text-pink-500
style={{ color: "var(--color-guru)" }}         // was text-purple-500
style={{ color: "var(--color-master)" }}       // was text-blue-500
style={{ color: "var(--color-enlightened)" }}  // was text-teal-500
style={{ color: "var(--color-burned)" }}       // was text-amber-500
```

**Step 3: Verify**

```bash
npx tsc --noEmit && npx vitest run
```

**Step 4: Commit**

```bash
git add src/presentation/pages/ProgressPage.tsx
git commit -m "feat(ui): redesign ProgressPage with LessonPath SVG, full achievement grid, heatmap"
```

---

## Phase 8: Final Verification

### Task 20: Full verification and cleanup

**Step 1: Run full test suite**

```bash
npx tsc --noEmit && npx vitest run && npx biome check src/
```

Expected: 0 type errors, all tests pass, lint clean.

**Step 2: Fix any lint issues**

```bash
npx biome check --write src/
```

**Step 3: Build check**

```bash
npx vite build
```

Expected: build succeeds.

**Step 4: Smoke-test in browser**

```bash
npx vite dev
```

Navigate through: Dashboard → Review (start session) → Complete → Progress (lesson path, heatmap, achievements) → Items.

Verify:
- [ ] Bottom tab bar visible on mobile viewport (<768px)
- [ ] HUD strip shows due count and week dots
- [ ] Dashboard primary action card shows review button when due > 0
- [ ] Stage pills show correct counts
- [ ] Heatmap renders after first session
- [ ] Achievement unlocks on session complete
- [ ] MultipleChoice has gold border and Thai numerals
- [ ] Flashcard has stage dot and slide-up reveal
- [ ] LessonPath SVG renders with correct states

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(ui): complete gamified Thai royal UI redesign

- Thai royal color token system (cream/gold/royal blue)
- Bottom tab bar with Thai-inspired SVG icons + HUD strip
- Dashboard: primary action card, stage pills, heatmap, achievement shelf
- ProgressPage: SVG lesson path, full achievement grid, heatmap
- MultipleChoice: gold border, Thai numeral badges, 500ms reveal
- Flashcard: stage dot, slide-up reveal, Thai palette rating buttons
- Session complete screens: stats grid + achievement unlocks
- 12-milestone AchievementService (pure domain computation)
- achievements[] on LearnerState with repository support
- completedAt timestamp on SessionSummary for heatmap data"
```

---

## Quick Reference

| Task | Files Changed | Test File |
|---|---|---|
| 1 | `types.ts`, 4 service files | Existing tests |
| 2 | `LearnerStateRepository.ts` | Type errors |
| 3 | `StorageLearnerStateRepository.ts` | `.test.ts` updated |
| 4 | `AchievementService.ts` | `AchievementService.test.ts` (new) |
| 5 | `ConductReviewUseCase.ts`, `AppContext.tsx`, `useReviewSession.ts` | Existing tests |
| 6 | `index.css` | Build check |
| 7 | `BottomTabBar.tsx` (new) | Type check |
| 8 | `HudStrip.tsx` (new) | Type check |
| 9 | `Layout.tsx` | Type check |
| 10 | `HeatmapWidget.tsx` (new) | `HeatmapWidget.test.ts` (new) |
| 11 | `AchievementBadge.tsx` (new) | Type check |
| 12 | `StagePromotionPanel.tsx` (new) | Type check |
| 13 | `LessonPath.tsx` (new) | Type check |
| 14 | `MultipleChoice.tsx` | Existing tests |
| 15 | `Flashcard.tsx`, `RatingButtons.tsx` | Existing tests |
| 16 | `ReviewPage.tsx` | Existing tests |
| 17 | `LessonPage.tsx`, `VocabularyPage.tsx`, `GrammarPage.tsx` | Existing tests |
| 18 | `Dashboard.tsx` | Type check |
| 19 | `ProgressPage.tsx` | Type check |
| 20 | All files | Full suite |

## Verification Commands (run after each phase)

```bash
# Type check
npx tsc --noEmit

# All tests
npx vitest run

# Lint
npx biome check src/

# Build
npx vite build
```
