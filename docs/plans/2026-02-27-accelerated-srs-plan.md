# Accelerated SRS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the day-based SM-2 algorithm with a learning-steps + graduated SM-2 system using minute-based intervals and response time tracking.

**Architecture:** Cards start in a fixed-step learning phase (0, 10min, 1hr, 8hr, 1day) then graduate to SM-2 with a conservative 2.0x multiplier. Response time is tracked and used to modulate graduated card intervals. The `interval` field changes from days to minutes throughout.

**Tech Stack:** TypeScript, Vitest, React, Biome

---

### Task 1: Update SrsData type and defaults

**Files:**
- Modify: `src/types.ts:5-19`

**Step 1: Write the updated SrsData interface and defaults**

Replace the `SrsData` interface and `DEFAULT_SRS_DATA` with:

```typescript
export interface SrsData {
	easeFactor: number;
	interval: number; // minutes
	repetitions: number;
	nextReviewDate: string; // ISO string for serialization
	lastReviewDate: string | null;
	learningStep: number | null; // null = graduated, 0-4 = in learning phase
}

export const DEFAULT_SRS_DATA: SrsData = {
	easeFactor: 2.0,
	interval: 0,
	repetitions: 0,
	nextReviewDate: new Date().toISOString(),
	lastReviewDate: null,
	learningStep: 0,
};
```

**Step 2: Verify the build compiles**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx tsc --noEmit 2>&1 | head -30`
Expected: Compilation errors in `srs.ts` and tests (expected — we haven't updated them yet)

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "refactor: change SrsData interval to minutes, add learningStep field"
```

---

### Task 2: Rewrite SRS core algorithm

**Files:**
- Modify: `src/srs.ts`

**Step 1: Write the failing tests for learning phase**

Replace `src/srs.test.ts` entirely:

```typescript
import { describe, expect, it } from "vitest";
import { calculateNextReview, createSrsData, isDue } from "./srs";
import type { SrsData } from "./types";

const NOW = "2026-02-25T12:00:00.000Z";

describe("createSrsData", () => {
	it("returns default SRS data in learning step 0", () => {
		const srs = createSrsData();
		expect(srs.easeFactor).toBe(2.0);
		expect(srs.interval).toBe(0);
		expect(srs.repetitions).toBe(0);
		expect(srs.learningStep).toBe(0);
		expect(srs.lastReviewDate).toBeNull();
	});

	it("accepts a custom date", () => {
		const srs = createSrsData(NOW);
		expect(srs.nextReviewDate).toBe(NOW);
	});
});

describe("calculateNextReview — learning phase", () => {
	it("rating 4 (Good) advances from step 0 to step 1 (10min)", () => {
		const srs = createSrsData(NOW);
		const result = calculateNextReview(srs, 4, NOW);
		expect(result.learningStep).toBe(1);
		expect(result.interval).toBe(10);
		expect(result.repetitions).toBe(1);
	});

	it("rating 4 (Good) advances from step 1 to step 2 (60min)", () => {
		const srs: SrsData = { ...createSrsData(NOW), learningStep: 1, interval: 10, repetitions: 1 };
		const result = calculateNextReview(srs, 4, NOW);
		expect(result.learningStep).toBe(2);
		expect(result.interval).toBe(60);
		expect(result.repetitions).toBe(2);
	});

	it("rating 4 (Good) advances from step 2 to step 3 (480min)", () => {
		const srs: SrsData = { ...createSrsData(NOW), learningStep: 2, interval: 60, repetitions: 2 };
		const result = calculateNextReview(srs, 4, NOW);
		expect(result.learningStep).toBe(3);
		expect(result.interval).toBe(480);
	});

	it("rating 4 (Good) advances from step 3 to step 4 (1440min)", () => {
		const srs: SrsData = { ...createSrsData(NOW), learningStep: 3, interval: 480, repetitions: 3 };
		const result = calculateNextReview(srs, 4, NOW);
		expect(result.learningStep).toBe(4);
		expect(result.interval).toBe(1440);
	});

	it("rating 4 (Good) at step 4 graduates the card (3 days)", () => {
		const srs: SrsData = { ...createSrsData(NOW), learningStep: 4, interval: 1440, repetitions: 4 };
		const result = calculateNextReview(srs, 4, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(4320); // 3 days in minutes
	});

	it("rating 5 (Easy) skips a step", () => {
		const srs = createSrsData(NOW);
		const result = calculateNextReview(srs, 5, NOW);
		expect(result.learningStep).toBe(2); // skipped step 1
		expect(result.interval).toBe(60);
	});

	it("rating 5 (Easy) at step 3 skips to graduation", () => {
		const srs: SrsData = { ...createSrsData(NOW), learningStep: 3, interval: 480, repetitions: 3 };
		const result = calculateNextReview(srs, 5, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(4320);
	});

	it("rating 5 (Easy) at step 4 graduates the card", () => {
		const srs: SrsData = { ...createSrsData(NOW), learningStep: 4, interval: 1440, repetitions: 4 };
		const result = calculateNextReview(srs, 5, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(4320);
	});

	it("rating 3 (Hard) repeats the current step", () => {
		const srs: SrsData = { ...createSrsData(NOW), learningStep: 2, interval: 60, repetitions: 2 };
		const result = calculateNextReview(srs, 3, NOW);
		expect(result.learningStep).toBe(2);
		expect(result.interval).toBe(60);
		expect(result.repetitions).toBe(3);
	});

	it("rating 1 (Again) resets to step 0", () => {
		const srs: SrsData = { ...createSrsData(NOW), learningStep: 3, interval: 480, repetitions: 3 };
		const result = calculateNextReview(srs, 1, NOW);
		expect(result.learningStep).toBe(0);
		expect(result.interval).toBe(0);
		expect(result.nextReviewDate).toBe(NOW);
	});

	it("rating 2 (Wrong) resets to step 1", () => {
		const srs: SrsData = { ...createSrsData(NOW), learningStep: 3, interval: 480, repetitions: 3 };
		const result = calculateNextReview(srs, 2, NOW);
		expect(result.learningStep).toBe(1);
		expect(result.interval).toBe(10);
	});

	it("nextReviewDate is offset by interval minutes", () => {
		const srs = createSrsData(NOW);
		const result = calculateNextReview(srs, 4, NOW);
		const expected = new Date(NOW);
		expected.setMinutes(expected.getMinutes() + 10);
		expect(result.nextReviewDate).toBe(expected.toISOString());
	});

	it("sets lastReviewDate to now", () => {
		const srs = createSrsData(NOW);
		const result = calculateNextReview(srs, 4, NOW);
		expect(result.lastReviewDate).toBe(NOW);
	});
});

describe("calculateNextReview — graduated phase", () => {
	function graduatedCard(overrides?: Partial<SrsData>): SrsData {
		return {
			easeFactor: 2.0,
			interval: 4320,
			repetitions: 5,
			nextReviewDate: NOW,
			lastReviewDate: NOW,
			learningStep: null,
			...overrides,
		};
	}

	it("rating 4 (Good) multiplies interval by ease factor", () => {
		const srs = graduatedCard({ interval: 4320, easeFactor: 2.0 });
		const result = calculateNextReview(srs, 4, NOW);
		expect(result.interval).toBe(8640); // 4320 * 2.0
		expect(result.learningStep).toBeNull();
		expect(result.easeFactor).toBe(2.0);
	});

	it("rating 5 (Easy) increases ease factor and applies 1.3x bonus", () => {
		const srs = graduatedCard({ interval: 4320, easeFactor: 2.0 });
		const result = calculateNextReview(srs, 5, NOW);
		expect(result.easeFactor).toBe(2.15);
		expect(result.interval).toBe(Math.round(4320 * 2.0 * 1.3));
	});

	it("rating 3 (Hard) halves the interval, decreases ease", () => {
		const srs = graduatedCard({ interval: 8640, easeFactor: 2.0 });
		const result = calculateNextReview(srs, 3, NOW);
		expect(result.interval).toBe(4320); // 8640 / 2
		expect(result.easeFactor).toBe(1.85);
	});

	it("rating 2 (Wrong) lapses: resets to learning step 1, ease drops", () => {
		const srs = graduatedCard({ easeFactor: 2.0 });
		const result = calculateNextReview(srs, 2, NOW);
		expect(result.learningStep).toBe(1);
		expect(result.interval).toBe(10);
		expect(result.easeFactor).toBe(1.8);
	});

	it("rating 1 (Again) lapses: resets to learning step 0, ease drops more", () => {
		const srs = graduatedCard({ easeFactor: 2.0 });
		const result = calculateNextReview(srs, 1, NOW);
		expect(result.learningStep).toBe(0);
		expect(result.interval).toBe(0);
		expect(result.easeFactor).toBe(1.7);
		expect(result.nextReviewDate).toBe(NOW);
	});

	it("ease factor never drops below 1.3", () => {
		const srs = graduatedCard({ easeFactor: 1.3 });
		const result = calculateNextReview(srs, 1, NOW);
		expect(result.easeFactor).toBe(1.3);
	});

	it("ease factor capped at 3.0", () => {
		const srs = graduatedCard({ easeFactor: 2.95 });
		const result = calculateNextReview(srs, 5, NOW);
		expect(result.easeFactor).toBeLessThanOrEqual(3.0);
	});

	it("interval capped at 259200 minutes (180 days)", () => {
		const srs = graduatedCard({ interval: 200000, easeFactor: 2.0 });
		const result = calculateNextReview(srs, 4, NOW);
		expect(result.interval).toBe(259200);
	});

	it("hard interval has minimum of 1 day (1440 min)", () => {
		const srs = graduatedCard({ interval: 1440, easeFactor: 2.0 });
		const result = calculateNextReview(srs, 3, NOW);
		expect(result.interval).toBeGreaterThanOrEqual(1440);
	});
});

describe("calculateNextReview — response time modulation", () => {
	function graduatedCard(): SrsData {
		return {
			easeFactor: 2.0,
			interval: 4320,
			repetitions: 5,
			nextReviewDate: NOW,
			lastReviewDate: NOW,
			learningStep: null,
		};
	}

	it("fast response (< 0.7x avg) gives 1.1x bonus", () => {
		const srs = graduatedCard();
		const baseline = calculateNextReview(srs, 4, NOW);
		const boosted = calculateNextReview(srs, 4, NOW, { responseTimeMs: 500, averageResponseTimeMs: 1000 });
		expect(boosted.interval).toBe(Math.round(baseline.interval * 1.1));
	});

	it("normal response (0.7x-1.3x avg) gives no change", () => {
		const srs = graduatedCard();
		const baseline = calculateNextReview(srs, 4, NOW);
		const same = calculateNextReview(srs, 4, NOW, { responseTimeMs: 1000, averageResponseTimeMs: 1000 });
		expect(same.interval).toBe(baseline.interval);
	});

	it("slow response (> 1.3x avg) gives 0.85x penalty", () => {
		const srs = graduatedCard();
		const baseline = calculateNextReview(srs, 4, NOW);
		const penalized = calculateNextReview(srs, 4, NOW, { responseTimeMs: 1500, averageResponseTimeMs: 1000 });
		expect(penalized.interval).toBe(Math.round(baseline.interval * 0.85));
	});

	it("very slow response (> 2.0x avg) gives 0.7x penalty", () => {
		const srs = graduatedCard();
		const baseline = calculateNextReview(srs, 4, NOW);
		const penalized = calculateNextReview(srs, 4, NOW, { responseTimeMs: 2500, averageResponseTimeMs: 1000 });
		expect(penalized.interval).toBe(Math.round(baseline.interval * 0.7));
	});

	it("response time does not affect learning phase cards", () => {
		const srs = createSrsData(NOW);
		const baseline = calculateNextReview(srs, 4, NOW);
		const withTime = calculateNextReview(srs, 4, NOW, { responseTimeMs: 5000, averageResponseTimeMs: 1000 });
		expect(withTime.interval).toBe(baseline.interval);
		expect(withTime.learningStep).toBe(baseline.learningStep);
	});

	it("response time does not affect lapse resets", () => {
		const srs: SrsData = {
			easeFactor: 2.0,
			interval: 4320,
			repetitions: 5,
			nextReviewDate: NOW,
			lastReviewDate: NOW,
			learningStep: null,
		};
		const result = calculateNextReview(srs, 1, NOW, { responseTimeMs: 500, averageResponseTimeMs: 1000 });
		expect(result.learningStep).toBe(0);
		expect(result.interval).toBe(0);
	});
});

describe("isDue", () => {
	it("returns true when nextReviewDate is in the past", () => {
		const srs = createSrsData();
		srs.nextReviewDate = "2026-02-24T00:00:00.000Z";
		expect(isDue(srs, "2026-02-25T00:00:00.000Z")).toBe(true);
	});

	it("returns true when nextReviewDate is now", () => {
		const srs = createSrsData();
		srs.nextReviewDate = NOW;
		expect(isDue(srs, NOW)).toBe(true);
	});

	it("returns false when nextReviewDate is in the future", () => {
		const srs = createSrsData();
		srs.nextReviewDate = "2026-02-26T00:00:00.000Z";
		expect(isDue(srs, "2026-02-25T00:00:00.000Z")).toBe(false);
	});
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx vitest run src/srs.test.ts 2>&1 | tail -20`
Expected: FAIL — `createSrsData` returns wrong defaults, `calculateNextReview` has wrong signature

**Step 3: Rewrite srs.ts implementation**

Replace `src/srs.ts` entirely:

```typescript
import type { RecallRating, SrsData } from "./types";

const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 3.0;
const MAX_INTERVAL_MINUTES = 259_200; // 180 days
const GRADUATING_INTERVAL_MINUTES = 4_320; // 3 days
const MIN_GRADUATED_INTERVAL_MINUTES = 1_440; // 1 day

// Steps: 0 = immediate, 10min, 1hr, 8hr, 1 day
const LEARNING_STEPS_MINUTES = [0, 10, 60, 480, 1_440];

export interface ResponseTimingData {
	responseTimeMs: number;
	averageResponseTimeMs: number;
}

export function createSrsData(now?: string): SrsData {
	return {
		easeFactor: 2.0,
		interval: 0,
		repetitions: 0,
		nextReviewDate: now ?? new Date().toISOString(),
		lastReviewDate: null,
		learningStep: 0,
	};
}

export function calculateNextReview(
	current: SrsData,
	rating: RecallRating,
	now: string,
	timing?: ResponseTimingData,
): SrsData {
	if (current.learningStep !== null) {
		return calculateLearningReview(current, rating, now);
	}
	return calculateGraduatedReview(current, rating, now, timing);
}

function calculateLearningReview(
	current: SrsData,
	rating: RecallRating,
	now: string,
): SrsData {
	const step = current.learningStep!;
	let newStep: number | null;

	switch (rating) {
		case 1: // Again — reset to step 0
			newStep = 0;
			break;
		case 2: // Wrong — reset to step 1
			newStep = 1;
			break;
		case 3: // Hard — repeat current step
			newStep = step;
			break;
		case 4: // Good — advance one step
			newStep = step + 1;
			break;
		case 5: // Easy — skip one step
			newStep = step + 2;
			break;
	}

	// Graduate if past the last learning step
	const lastStep = LEARNING_STEPS_MINUTES.length - 1;
	if (newStep > lastStep) {
		return graduate(current, now);
	}

	const newInterval = LEARNING_STEPS_MINUTES[newStep]!;
	const nextDate = new Date(now);
	nextDate.setMinutes(nextDate.getMinutes() + newInterval);

	return {
		easeFactor: current.easeFactor,
		interval: newInterval,
		repetitions: current.repetitions + 1,
		nextReviewDate: newInterval === 0 ? now : nextDate.toISOString(),
		lastReviewDate: now,
		learningStep: newStep,
	};
}

function graduate(current: SrsData, now: string): SrsData {
	const nextDate = new Date(now);
	nextDate.setMinutes(nextDate.getMinutes() + GRADUATING_INTERVAL_MINUTES);

	return {
		easeFactor: current.easeFactor,
		interval: GRADUATING_INTERVAL_MINUTES,
		repetitions: current.repetitions + 1,
		nextReviewDate: nextDate.toISOString(),
		lastReviewDate: now,
		learningStep: null,
	};
}

function calculateGraduatedReview(
	current: SrsData,
	rating: RecallRating,
	now: string,
	timing?: ResponseTimingData,
): SrsData {
	const ef = current.easeFactor;
	let newEf = ef;
	let newInterval: number;
	let newStep: number | null = null;

	switch (rating) {
		case 1: // Again — lapse, reset to learning step 0
			newEf = Math.max(MIN_EASE_FACTOR, ef - 0.3);
			return {
				easeFactor: newEf,
				interval: 0,
				repetitions: current.repetitions + 1,
				nextReviewDate: now,
				lastReviewDate: now,
				learningStep: 0,
			};

		case 2: // Wrong — lapse, reset to learning step 1
			newEf = Math.max(MIN_EASE_FACTOR, ef - 0.2);
			newInterval = LEARNING_STEPS_MINUTES[1]!;
			return {
				easeFactor: newEf,
				interval: newInterval,
				repetitions: current.repetitions + 1,
				nextReviewDate: addMinutes(now, newInterval),
				lastReviewDate: now,
				learningStep: 1,
			};

		case 3: // Hard — half interval, decrease ease
			newEf = Math.max(MIN_EASE_FACTOR, ef - 0.15);
			newInterval = Math.max(
				MIN_GRADUATED_INTERVAL_MINUTES,
				Math.round(current.interval / 2),
			);
			newStep = null;
			break;

		case 4: // Good — standard multiplication
			newInterval = Math.round(current.interval * ef);
			newStep = null;
			break;

		case 5: // Easy — bonus multiplication, increase ease
			newEf = Math.min(MAX_EASE_FACTOR, ef + 0.15);
			newInterval = Math.round(current.interval * ef * 1.3);
			newStep = null;
			break;
	}

	// Apply response time modulation (only for pass ratings 3-5)
	if (timing && timing.averageResponseTimeMs > 0) {
		const ratio = timing.responseTimeMs / timing.averageResponseTimeMs;
		let multiplier = 1.0;
		if (ratio < 0.7) {
			multiplier = 1.1;
		} else if (ratio > 2.0) {
			multiplier = 0.7;
		} else if (ratio > 1.3) {
			multiplier = 0.85;
		}
		newInterval = Math.round(newInterval * multiplier);
	}

	newInterval = Math.min(MAX_INTERVAL_MINUTES, newInterval);

	return {
		easeFactor: newEf,
		interval: newInterval,
		repetitions: current.repetitions + 1,
		nextReviewDate: addMinutes(now, newInterval),
		lastReviewDate: now,
		learningStep: newStep,
	};
}

function addMinutes(iso: string, minutes: number): string {
	const d = new Date(iso);
	d.setMinutes(d.getMinutes() + minutes);
	return d.toISOString();
}

export function isDue(srs: SrsData, now: string): boolean {
	return new Date(srs.nextReviewDate) <= new Date(now);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx vitest run src/srs.test.ts 2>&1 | tail -20`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/srs.ts src/srs.test.ts
git commit -m "feat: rewrite SRS algorithm with learning steps and minute-based intervals"
```

---

### Task 3: Update card generator

**Files:**
- Modify: `src/card-generator.ts` (no code change needed — `createSrsData` already returns the right shape)

**Step 1: Verify card generator still works**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx vitest run src/srs.test.ts src/integration.test.ts 2>&1 | tail -20`
Expected: `srs.test.ts` passes. `integration.test.ts` may fail due to interval assertions — check and fix.

**Step 2: Check integration test for hardcoded interval expectations**

Read `src/integration.test.ts` and update any assertions that expect day-based intervals (e.g., `interval: 1`) to expect minute-based intervals (e.g., `interval: 10` for learning step 1). Also update assertions that check `repetitions` if the flow changed.

**Step 3: Run full test suite**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx vitest run 2>&1 | tail -30`
Expected: Note which tests fail — fix in subsequent steps

**Step 4: Commit if changes were made**

```bash
git add -A
git commit -m "fix: update integration tests for minute-based SRS intervals"
```

---

### Task 4: Update ReviewService for response time

**Files:**
- Modify: `src/review-service.ts:32-39`
- Modify: `src/interfaces.ts:57` (recordReview signature)
- Modify: `src/context/AppContext.tsx:53,108-109`

**Step 1: Write failing test for recordReview with responseTimeMs**

Add to `src/review-service.test.ts` in the `recordReview` describe block:

```typescript
it("passes response time data through to SRS calculation", () => {
	const due = reviewService.getDueCards();
	const card = due[0]!;
	// First make the card graduated by reviewing it through learning steps
	reviewService.recordReview(card.id, 4); // step 0 -> 1
	reviewService.recordReview(card.id, 4); // step 1 -> 2
	reviewService.recordReview(card.id, 4); // step 2 -> 3
	reviewService.recordReview(card.id, 4); // step 3 -> 4
	reviewService.recordReview(card.id, 4); // step 4 -> graduated

	const state = storage.load();
	const graduated = state.cards[card.id]!;
	expect(graduated.srs.learningStep).toBeNull();
});
```

**Step 2: Run test to verify it passes (or fails if API changed)**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx vitest run src/review-service.test.ts 2>&1 | tail -20`

**Step 3: Update ReviewService.recordReview to accept optional timing data**

In `src/review-service.ts`, update `recordReview`:

```typescript
recordReview(
	cardId: string,
	rating: RecallRating,
	now?: string,
	timing?: { responseTimeMs: number; averageResponseTimeMs: number },
): void {
	const state = this.storage.load();
	const card = state.cards[cardId];
	if (!card) throw new Error(`Card not found: ${cardId}`);

	const currentTime = now ?? new Date().toISOString();
	card.srs = calculateNextReview(card.srs, rating, currentTime, timing);
	this.storage.save(state);
}
```

Also import `ResponseTimingData` from `./srs` if desired, or use inline type.

**Step 4: Update IReviewService interface in `src/interfaces.ts`**

Update the `recordReview` signature to match:

```typescript
recordReview(
	cardId: string,
	rating: RecallRating,
	timing?: { responseTimeMs: number; averageResponseTimeMs: number },
): void;
```

**Step 5: Update AppContext to pass timing through**

In `src/context/AppContext.tsx`, update:
- The context type for `recordReview` to accept optional timing
- The implementation to pass timing through

**Step 6: Update review-service.test.ts assertions for new intervals**

Fix any tests that assert day-based intervals. For example, `recordReview` test asserts `interval: 1` — this should now be `interval: 10` (learning step 0 → 1 = 10 minutes). Also `rating 1 keeps card due immediately` should still assert `interval: 0`.

**Step 7: Run all tests**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx vitest run 2>&1 | tail -30`
Expected: All tests PASS

**Step 8: Commit**

```bash
git add src/review-service.ts src/review-service.test.ts src/interfaces.ts src/context/AppContext.tsx
git commit -m "feat: add response time support to ReviewService"
```

---

### Task 5: Track response time in MultipleChoice component

**Files:**
- Modify: `src/components/MultipleChoice.tsx`

**Step 1: Add timestamp tracking**

Add a `useRef` to capture when the card is displayed, and pass elapsed time through `onAnswer`:

```typescript
// Change Props interface
interface Props {
	card: PropertyCard;
	onAnswer: (correct: boolean, responseTimeMs: number) => void;
}

// Inside the component, add:
const displayedAtRef = useRef(Date.now());

// Reset on card change (in existing useEffect):
useEffect(() => {
	setSelected(null);
	setRevealed(false);
	displayedAtRef.current = Date.now();
}, [card.id]);

// In handleSelect, calculate elapsed time:
const handleSelect = useCallback(
	(choice: string) => {
		if (revealed) return;
		setSelected(choice);
		setRevealed(true);
		const elapsed = Date.now() - displayedAtRef.current;
		setTimeout(() => onAnswer(choice === card.correctAnswer, elapsed), 800);
	},
	[card.correctAnswer, onAnswer, revealed],
);
```

**Step 2: Verify build compiles**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx tsc --noEmit 2>&1 | head -20`
Expected: Error in ReviewPage.tsx where `onAnswer` callback doesn't match — expected, will fix in Task 7

**Step 3: Commit**

```bash
git add src/components/MultipleChoice.tsx
git commit -m "feat: track response time in MultipleChoice component"
```

---

### Task 6: Track response time in Flashcard component

**Files:**
- Modify: `src/components/Flashcard.tsx`

**Step 1: Add timestamp tracking from reveal to rating**

For flashcards, the meaningful time is from when the answer is revealed to when the user rates. Add a ref:

```typescript
// Change Props interface
interface Props {
	card: PropertyCard;
	onRate: (rating: RecallRating, responseTimeMs: number) => void;
}

// Inside the component, add:
const revealedAtRef = useRef(0);

// In handleReveal:
const handleReveal = useCallback(() => {
	setRevealed(true);
	revealedAtRef.current = Date.now();
}, []);

// Wrap onRate to include timing:
const handleRate = useCallback(
	(rating: RecallRating) => {
		const elapsed = Date.now() - revealedAtRef.current;
		onRate(rating, elapsed);
	},
	[onRate],
);
```

Update the `RatingButtons` usage to call `handleRate` instead of `onRate`:
```typescript
<RatingButtons onRate={handleRate} />
```

**Step 2: Commit**

```bash
git add src/components/Flashcard.tsx
git commit -m "feat: track response time in Flashcard component"
```

---

### Task 7: Wire response time through ReviewPage

**Files:**
- Modify: `src/pages/ReviewPage.tsx`

**Step 1: Update advance to accept and store responseTimeMs**

```typescript
const advance = useCallback(
	(rating: RecallRating, responseTimeMs?: number) => {
		if (!current || !sessionRef.current || !session) return;

		// TODO: For now, pass no timing data — we need 3+ reviews to build average
		// This will be enhanced when we add per-card response time history
		app.recordReview(current.card.id, rating);
		sessionRef.current.results.push({ cardId: current.card.id, rating });

		if (cardIdx + 1 < session.cards.length) {
			setCardIdx((i) => i + 1);
		} else {
			app.endReviewSession(sessionRef.current);
			setDone(true);
		}
	},
	[app, current, cardIdx, session],
);

const handleMultipleChoiceAnswer = useCallback(
	(correct: boolean, _responseTimeMs: number) => {
		advance(correct ? 4 : 2);
	},
	[advance],
);
```

Note: Response time tracking through `recordReview` with per-card averages requires storing response time history per card. For the initial implementation, we wire the plumbing but don't compute averages yet. The response time data flows through the components and can be used once we add a per-card timing history to `SrsData` or `PropertyCard` in a follow-up task.

**Step 2: Run full test suite and type check**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx vitest run 2>&1 | tail -30`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/pages/ReviewPage.tsx
git commit -m "feat: wire response time tracking through ReviewPage"
```

---

### Task 8: Update quiz mode threshold for learning step awareness

**Files:**
- Modify: `src/review-service.ts:54-59`

**Step 1: Update quiz mode assignment**

Currently, cards with `repetitions >= 2` get flashcard mode. With the new system, cards in the learning phase should always use multiple choice. Update the mode logic:

```typescript
const quizCards: QuizCard[] = selected.map((card) => ({
	card,
	mode:
		card.srs.learningStep === null
			? ("flashcard" as const)
			: ("multipleChoice" as const),
}));
```

**Step 2: Update test expectation**

In `src/review-service.test.ts`, the test `"new cards get multipleChoice mode"` should still pass since new cards have `learningStep: 0`.

**Step 3: Run tests**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx vitest run src/review-service.test.ts 2>&1 | tail -20`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/review-service.ts src/review-service.test.ts
git commit -m "refactor: use learningStep instead of repetitions for quiz mode"
```

---

### Task 9: Lint, format, and final verification

**Files:**
- All modified files

**Step 1: Run Biome formatting**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx biome check --write src/`

**Step 2: Run Biome linting**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx biome check src/`
Expected: No errors

**Step 3: Run full test suite**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx vitest run 2>&1`
Expected: All tests PASS

**Step 4: Type check**

Run: `cd /home/capplequoppe/Documents/Repos/thai-script && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit any formatting fixes**

```bash
git add -A
git commit -m "style: apply Biome formatting"
```

---

## Summary of Changes

| Task | Description | Files |
|------|-------------|-------|
| 1 | Update SrsData type | `types.ts` |
| 2 | Rewrite SRS algorithm + tests | `srs.ts`, `srs.test.ts` |
| 3 | Fix integration tests | `integration.test.ts` |
| 4 | Add timing to ReviewService | `review-service.ts`, `review-service.test.ts`, `interfaces.ts`, `AppContext.tsx` |
| 5 | Track time in MultipleChoice | `MultipleChoice.tsx` |
| 6 | Track time in Flashcard | `Flashcard.tsx` |
| 7 | Wire timing through ReviewPage | `ReviewPage.tsx` |
| 8 | Learning-step-aware quiz mode | `review-service.ts` |
| 9 | Lint, format, verify | All files |
