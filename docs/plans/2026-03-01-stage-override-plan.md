# Stage Override Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to manually promote or demote any learned SRS item (script symbol or vocab word) to any stage via a bottom sheet, accessible from the Learned Items and Vocab List pages.

**Architecture:** `SrsSchedule.overrideStage()` constructs a correctly-pinned schedule for any target stage. `ReviewableCard.overrideStage()` delegates to it. A new `ManageItemsUseCase` handles load→override→save. A shared `StageOverrideSheet` shows stage chip rows (all-cards and per-card) and is wired into two existing pages.

**Tech Stack:** TypeScript, React, Vitest, shadcn Dialog (`@/presentation/components/ui/dialog`)

---

### Task 1: SrsSchedule.overrideStage()

**Files:**
- Modify: `src/domain/srs/value-objects/SrsSchedule.ts`
- Test: `src/domain/srs/value-objects/SrsSchedule.test.ts`

**Context:**
`SrsSchedule` is immutable — every mutating method returns a new instance. `SrsStage` is already imported (not just as a type) in this file. Private constants available: `GRADUATING_INTERVAL_MINUTES = 2880`, `addMinutesToIso(iso, minutes)`. `SrsStage` thresholds: `GURU_THRESHOLD = 20_160`, `MASTER_THRESHOLD = 60_480`, `ENLIGHTENED_THRESHOLD = 120_960`. Stage is determined by `learningStep` (null = graduated) and `interval` vs thresholds.

**Step 1: Write the failing tests**

Add a new `describe("overrideStage", ...)` block at the bottom of `src/domain/srs/value-objects/SrsSchedule.test.ts`. The `SrsStage` import is already present in that file.

```ts
describe("overrideStage", () => {
	const NOW = "2026-03-01T10:00:00.000Z";

	// A graduated card with non-default easeFactor and lapseCount to verify preservation
	const schedule = SrsSchedule.fromDTO({
		easeFactor: 2.3,
		interval: 4320,
		repetitions: 5,
		learningStep: null,
		nextReviewDate: NOW,
		lastReviewDate: null,
		lapseCount: 2,
	});

	it("overrides to Apprentice: learningStep=1, interval=10, immediately due", () => {
		const result = schedule.overrideStage(SrsStage.APPRENTICE, NOW);
		expect(result.learningStep).toBe(1);
		expect(result.interval).toBe(10);
		expect(new Date(result.nextReviewDate) <= new Date(NOW)).toBe(true);
	});

	it("overrides to Guru: learningStep=null, interval=2880, immediately due", () => {
		const result = schedule.overrideStage(SrsStage.GURU, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(2880);
		expect(result.stage).toStrictEqual(SrsStage.GURU);
		expect(new Date(result.nextReviewDate) <= new Date(NOW)).toBe(true);
	});

	it("overrides to Master: learningStep=null, interval=20160, due in future", () => {
		const result = schedule.overrideStage(SrsStage.MASTER, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(20_160);
		expect(result.stage).toStrictEqual(SrsStage.MASTER);
		expect(new Date(result.nextReviewDate) > new Date(NOW)).toBe(true);
	});

	it("overrides to Enlightened: interval=60480", () => {
		const result = schedule.overrideStage(SrsStage.ENLIGHTENED, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(60_480);
		expect(result.stage).toStrictEqual(SrsStage.ENLIGHTENED);
	});

	it("overrides to Burned: interval=120960, isBurned=true", () => {
		const result = schedule.overrideStage(SrsStage.BURNED, NOW);
		expect(result.learningStep).toBeNull();
		expect(result.interval).toBe(120_960);
		expect(result.isBurned).toBe(true);
	});

	it("preserves easeFactor and lapseCount from original schedule", () => {
		const result = schedule.overrideStage(SrsStage.MASTER, NOW);
		expect(result.toDTO().easeFactor).toBe(2.3);
		expect(result.toDTO().lapseCount).toBe(2);
	});

	it("uses current time when now not provided", () => {
		const result = schedule.overrideStage(SrsStage.APPRENTICE);
		expect(result.learningStep).toBe(1);
	});
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/domain/srs/value-objects/SrsSchedule.test.ts
```
Expected: FAIL — "schedule.overrideStage is not a function"

**Step 3: Implement `overrideStage` in `SrsSchedule.ts`**

Add after the `resurrect` method (around line 96):

```ts
overrideStage(targetStage: SrsStage, now?: string): SrsSchedule {
	const currentTime = now ?? new Date().toISOString();

	if (targetStage === SrsStage.APPRENTICE) {
		return new SrsSchedule(
			this.easeFactor,
			10,
			this.repetitions,
			1,
			currentTime,
			this.lastReviewDate,
			this.lapseCount,
		);
	}

	if (targetStage === SrsStage.GURU) {
		return new SrsSchedule(
			this.easeFactor,
			GRADUATING_INTERVAL_MINUTES,
			this.repetitions,
			null,
			currentTime,
			this.lastReviewDate,
			this.lapseCount,
		);
	}

	const intervalByStage: Partial<Record<string, number>> = {
		Master: SrsStage.GURU_THRESHOLD,
		Enlightened: SrsStage.MASTER_THRESHOLD,
		Burned: SrsStage.ENLIGHTENED_THRESHOLD,
	};
	const interval = intervalByStage[targetStage.name] ?? SrsStage.GURU_THRESHOLD;

	return new SrsSchedule(
		this.easeFactor,
		interval,
		this.repetitions,
		null,
		addMinutesToIso(currentTime, interval),
		this.lastReviewDate,
		this.lapseCount,
	);
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/domain/srs/value-objects/SrsSchedule.test.ts
```
Expected: all tests in the file pass

**Step 5: Commit**

```bash
git add src/domain/srs/value-objects/SrsSchedule.ts src/domain/srs/value-objects/SrsSchedule.test.ts
git commit -m "feat(srs): add SrsSchedule.overrideStage() for manual stage pinning"
```

---

### Task 2: ReviewableCard.overrideStage()

**Files:**
- Modify: `src/domain/srs/entities/ReviewableCard.ts`

**Context:** `ReviewableCard` already imports `SrsStage` as a type (for the `stage` getter). It has `recordReview()` and `resurrect()` which mutate `_schedule` — add an identical pattern for `overrideStage`. No separate test needed; the use case test in Task 3 covers the full flow.

**Step 1: Add the method**

In `src/domain/srs/entities/ReviewableCard.ts`, add after the `resurrect` method:

```ts
overrideStage(targetStage: SrsStage, now?: string): void {
	this._schedule = this._schedule.overrideStage(targetStage, now);
}
```

The `SrsStage` import (`import type { SrsStage } from "../value-objects/SrsStage"`) is already present. The type import is sufficient since we only use it as a parameter type annotation.

**Step 2: Run all tests to confirm no regressions**

```bash
pnpm vitest run
```
Expected: all tests pass

**Step 3: Commit**

```bash
git add src/domain/srs/entities/ReviewableCard.ts
git commit -m "feat(srs): add ReviewableCard.overrideStage() delegating to SrsSchedule"
```

---

### Task 3: ManageItemsUseCase

**Files:**
- Create: `src/application/use-cases/ManageItemsUseCase.ts`
- Create: `src/application/use-cases/ManageItemsUseCase.test.ts`

**Context:** Pattern matches `ManageDataUseCase`. `cardRepo.findById(id, pool)` returns `ReviewableCard | null`. After calling `card.overrideStage(stage)`, save with `cardRepo.save(card)`. `ScriptPropertyCard` constructor signature (from test files): `new ScriptPropertyCard(id, question, correctAnswer, choices, schedule, symbolCharacter, property, lessonNumber)`.

**Step 1: Write the failing test**

Create `src/application/use-cases/ManageItemsUseCase.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../infrastructure/persistence/StorageCardRepository";
import { ScriptPropertyCard } from "../../domain/script/entities/ScriptPropertyCard";
import type { CardRepository } from "../../domain/ports/CardRepository";
import { SrsSchedule } from "../../domain/srs/value-objects/SrsSchedule";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import { ManageItemsUseCase } from "./ManageItemsUseCase";

function makeScriptCard(id: string): ScriptPropertyCard {
	return new ScriptPropertyCard(
		id,
		"test question",
		"test answer",
		["test answer"],
		SrsSchedule.initial(),
		"ก",
		"recognition",
		1,
	);
}

describe("ManageItemsUseCase", () => {
	let cardRepo: CardRepository;
	let useCase: ManageItemsUseCase;

	beforeEach(() => {
		const storage = new InMemoryStorage();
		cardRepo = new StorageCardRepository(storage);
		useCase = new ManageItemsUseCase(cardRepo);
	});

	it("overrides the stage of an existing card and persists it", () => {
		cardRepo.save(makeScriptCard("ก:recognition"));

		useCase.overrideCardStage("ก:recognition", "script", SrsStage.MASTER);

		const updated = cardRepo.findById("ก:recognition", "script");
		expect(updated?.stage).toStrictEqual(SrsStage.MASTER);
	});

	it("overrides to Burned correctly", () => {
		cardRepo.save(makeScriptCard("ก:recognition"));

		useCase.overrideCardStage("ก:recognition", "script", SrsStage.BURNED);

		const updated = cardRepo.findById("ก:recognition", "script");
		expect(updated?.stage.isBurned).toBe(true);
	});

	it("overrides to Apprentice from a burned card (un-burn)", () => {
		const card = makeScriptCard("ก:recognition");
		// Manually burn it first by saving a burned schedule
		cardRepo.save(makeScriptCard("ก:recognition"));
		useCase.overrideCardStage("ก:recognition", "script", SrsStage.BURNED);

		useCase.overrideCardStage("ก:recognition", "script", SrsStage.APPRENTICE);

		const updated = cardRepo.findById("ก:recognition", "script");
		expect(updated?.stage).toStrictEqual(SrsStage.APPRENTICE);
		expect(updated?.stage.isBurned).toBe(false);
	});

	it("throws when card not found", () => {
		expect(() =>
			useCase.overrideCardStage("nonexistent", "script", SrsStage.GURU),
		).toThrow("Card nonexistent not found in pool script");
	});
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/application/use-cases/ManageItemsUseCase.test.ts
```
Expected: FAIL — "Cannot find module './ManageItemsUseCase'"

**Step 3: Implement `ManageItemsUseCase`**

Create `src/application/use-cases/ManageItemsUseCase.ts`:

```ts
import type { CardRepository } from "../../domain/ports/CardRepository";
import type { CardPool } from "../../domain/shared/CardPool";
import type { SrsStage } from "../../domain/srs/value-objects/SrsStage";

export class ManageItemsUseCase {
	constructor(private readonly cardRepo: CardRepository) {}

	overrideCardStage(id: string, pool: CardPool, targetStage: SrsStage): void {
		const card = this.cardRepo.findById(id, pool);
		if (!card) throw new Error(`Card ${id} not found in pool ${pool}`);
		card.overrideStage(targetStage);
		this.cardRepo.save(card);
	}
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/application/use-cases/ManageItemsUseCase.test.ts
```
Expected: 4 tests pass

**Step 5: Run all tests**

```bash
pnpm vitest run
```
Expected: all tests pass

**Step 6: Commit**

```bash
git add src/application/use-cases/ManageItemsUseCase.ts src/application/use-cases/ManageItemsUseCase.test.ts
git commit -m "feat(use-case): add ManageItemsUseCase.overrideCardStage()"
```

---

### Task 4: Wire ManageItemsUseCase into AppContext

**Files:**
- Modify: `src/presentation/context/AppContext.tsx`

**Context:** The context value is built in `AppProvider` at lines 113–125. New use cases are instantiated at module scope (outside the component). `manageItemsUseCase` only needs `cardRepo` which is already available. The `value` useMemo deps array at line 124 does NOT need updating since `manageItemsUseCase` is a stable module-scope constant.

**Step 1: Add import**

At the top of `AppContext.tsx`, add:

```ts
import { ManageItemsUseCase } from "../../application/use-cases/ManageItemsUseCase";
```

**Step 2: Instantiate at module scope**

After `const dataUseCase = new ManageDataUseCase(stateRepo);`, add:

```ts
const manageItemsUseCase = new ManageItemsUseCase(cardRepo);
```

**Step 3: Add to AppContextValue interface**

```ts
export interface AppContextValue {
	state: LearnerState;
	refresh: () => void;
	lesson: StartLessonUseCase;
	review: ConductReviewUseCase;
	dashboard: QueryDashboardUseCase;
	data: ManageDataUseCase;
	items: ManageItemsUseCase;   // add this line
	vocab: VocabularyService;
	checkAchievements: (summary: SessionSummary) => string[];
}
```

**Step 4: Add to context value object**

In the `useMemo` at line 113, add `items: manageItemsUseCase` to the returned object:

```ts
const value = useMemo<AppContextValue>(
	() => ({
		state,
		refresh,
		lesson: lessonUseCase,
		review: reviewUseCase,
		dashboard: dashboardUseCase,
		data: dataUseCase,
		items: manageItemsUseCase,   // add this
		vocab: vocabularyService,
		checkAchievements,
	}),
	[state, refresh, checkAchievements],
);
```

**Step 5: Run all tests**

```bash
pnpm vitest run
```
Expected: all tests pass

**Step 6: Run lint**

```bash
pnpm biome check src/presentation/context/AppContext.tsx
```
Expected: no errors

**Step 7: Commit**

```bash
git add src/presentation/context/AppContext.tsx
git commit -m "feat(context): expose ManageItemsUseCase as items in AppContext"
```

---

### Task 5: StageOverrideSheet component

**Files:**
- Create: `src/presentation/components/organisms/StageOverrideSheet.tsx`

**Context:** Uses shadcn `Dialog` (at `@/presentation/components/ui/dialog`). CSS vars for stage colors: `--color-apprentice`, `--color-guru`, `--color-master`, `--color-enlightened`, `--color-burned`. `SrsStage` instances are singletons — reference equality works (`stage === SrsStage.MASTER`). `CardPool` is `"script" | "vocab" | "grammar"`.

**Step 1: Create the component**

Create `src/presentation/components/organisms/StageOverrideSheet.tsx`:

```tsx
import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/presentation/components/ui/dialog";
import type { CardPool } from "../../../domain/shared/CardPool";
import { SrsStage } from "../../../domain/srs/value-objects/SrsStage";

export interface ItemCard {
	id: string;
	pool: CardPool;
	label: string;
	currentStage: SrsStage;
}

interface Props {
	open: boolean;
	onClose: () => void;
	itemLabel: string;
	cards: ItemCard[];
	onOverride: (id: string, pool: CardPool, stage: SrsStage) => void;
}

const ALL_STAGES: SrsStage[] = [
	SrsStage.APPRENTICE,
	SrsStage.GURU,
	SrsStage.MASTER,
	SrsStage.ENLIGHTENED,
	SrsStage.BURNED,
];

const STAGE_COLORS: Record<string, string> = {
	Apprentice: "var(--color-apprentice)",
	Guru: "var(--color-guru)",
	Master: "var(--color-master)",
	Enlightened: "var(--color-enlightened)",
	Burned: "var(--color-burned)",
};

const STAGE_ORDER = ["Apprentice", "Guru", "Master", "Enlightened", "Burned"];

function getCombinedStage(cards: ItemCard[]): SrsStage {
	if (cards.length === 0) return SrsStage.APPRENTICE;
	return cards.reduce((best, card) => {
		const a = STAGE_ORDER.indexOf(best.name);
		const b = STAGE_ORDER.indexOf(card.currentStage.name);
		return b > a ? card.currentStage : best;
	}, cards[0].currentStage);
}

interface StageChipRowProps {
	currentStage: SrsStage;
	onSelect: (stage: SrsStage) => void;
}

function StageChipRow({ currentStage, onSelect }: StageChipRowProps) {
	return (
		<div className="flex flex-wrap gap-2">
			{ALL_STAGES.map((stage) => {
				const isActive = stage === currentStage;
				const color = STAGE_COLORS[stage.name] ?? "var(--color-primary)";
				return (
					<button
						key={stage.name}
						type="button"
						onClick={() => onSelect(stage)}
						className="px-3 py-1.5 rounded-full text-sm font-medium transition-opacity"
						style={{
							background: isActive
								? color
								: `color-mix(in srgb, ${color} 20%, var(--color-surface-2))`,
							color: isActive ? "white" : color,
							border: `1.5px solid ${color}`,
						}}
					>
						{stage.name}
					</button>
				);
			})}
		</div>
	);
}

export function StageOverrideSheet({
	open,
	onClose,
	itemLabel,
	cards,
	onOverride,
}: Props) {
	const [expanded, setExpanded] = useState(false);
	const combined = getCombinedStage(cards);

	function handleAllStage(stage: SrsStage) {
		for (const card of cards) {
			onOverride(card.id, card.pool, stage);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Override Stage — {itemLabel}</DialogTitle>
				</DialogHeader>
				<div className="space-y-5 mt-2">
					{/* All-cards row */}
					<div className="space-y-2">
						<p
							className="text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							Move all cards to
						</p>
						<StageChipRow currentStage={combined} onSelect={handleAllStage} />
					</div>

					{/* Per-card section (collapsible) */}
					{cards.length > 1 && (
						<div>
							<button
								type="button"
								onClick={() => setExpanded((e) => !e)}
								className="flex items-center gap-2 text-sm font-medium"
								style={{ color: "var(--color-text-muted)" }}
							>
								<span>{expanded ? "▼" : "▶"}</span>
								Individual cards
							</button>
							{expanded && (
								<div className="mt-3 space-y-4">
									{cards.map((card) => (
										<div key={card.id} className="space-y-2">
											<p
												className="text-sm font-medium"
												style={{ color: "var(--color-text)" }}
											>
												{card.label}
											</p>
											<StageChipRow
												currentStage={card.currentStage}
												onSelect={(stage) => onOverride(card.id, card.pool, stage)}
											/>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
```

**Step 2: Run lint**

```bash
pnpm biome check src/presentation/components/organisms/StageOverrideSheet.tsx
```
Expected: no errors (fix any formatting issues reported)

**Step 3: Run all tests**

```bash
pnpm vitest run
```
Expected: all tests pass

**Step 4: Commit**

```bash
git add src/presentation/components/organisms/StageOverrideSheet.tsx
git commit -m "feat(ui): add StageOverrideSheet with all-cards and per-card chip rows"
```

---

### Task 6: Wire into VocabListPage

**Files:**
- Modify: `src/presentation/pages/VocabListPage.tsx`

**Context:** `state.vocabCards` is `Record<string, VocabularyCard>`. Each `VocabularyCard` has: `id: string`, `wordThai: string`, `property: string`, `srs: SrsDataDTO` (with `learningStep: number | null` and `interval: number`). The word detail view renders when `selectedThai !== null` — it already shows `<StageBadge>` and `<WordCard>`. `items` and `refresh` are available from `useApp()`.

**Step 1: Add imports**

At the top of `VocabListPage.tsx`:

```ts
import {
	StageOverrideSheet,
	type ItemCard,
} from "../components/organisms/StageOverrideSheet";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import { Button } from "@/presentation/components/ui/button";
```

**Step 2: Update useApp() destructure**

Change:
```ts
const { vocab, state } = useApp();
```
To:
```ts
const { vocab, state, items, refresh } = useApp();
```

**Step 3: Add sheet open state**

After the existing `useState` calls, add:
```ts
const [sheetOpen, setSheetOpen] = useState(false);
```

**Step 4: Add property labels and derived item cards**

Before the `return`, add:

```ts
const VOCAB_PROPERTY_LABELS: Record<string, string> = {
	thaiToEnglish: "Thai → English",
	englishToThai: "English → Thai",
	audioRecognition: "Audio",
};

const vocabItemCards: ItemCard[] = selectedThai
	? Object.values(state.vocabCards)
			.filter((c) => c.wordThai === selectedThai)
			.map((c) => ({
				id: c.id,
				pool: "vocab" as const,
				label: VOCAB_PROPERTY_LABELS[c.property] ?? c.property,
				currentStage: SrsStage.fromScheduleData(
					c.srs.learningStep,
					c.srs.interval,
				),
			}))
	: [];
```

**Step 5: Add button and sheet to the word detail view**

Find the block starting `{selectedThai && selectedEntry && (` and update it to:

```tsx
{selectedThai && selectedEntry && (
	<div className="space-y-4">
		<div className="flex justify-center">
			<StageBadge stage={getWordStage(selectedEntry.thai)} />
		</div>
		<WordCard word={selectedEntry} />
		<Button
			type="button"
			variant="outline"
			className="w-full"
			onClick={() => setSheetOpen(true)}
		>
			Override Stage
		</Button>
		<StageOverrideSheet
			open={sheetOpen}
			onClose={() => setSheetOpen(false)}
			itemLabel={selectedEntry.thai}
			cards={vocabItemCards}
			onOverride={(id, pool, stage) => {
				items.overrideCardStage(id, pool, stage);
				refresh();
			}}
		/>
	</div>
)}
```

**Step 6: Run lint**

```bash
pnpm biome check src/presentation/pages/VocabListPage.tsx
```
Expected: no errors

**Step 7: Run all tests**

```bash
pnpm vitest run
```
Expected: all tests pass

**Step 8: Commit**

```bash
git add src/presentation/pages/VocabListPage.tsx
git commit -m "feat(vocab): add Override Stage sheet to vocab word detail view"
```

---

### Task 7: Wire into LearnedItemsPage

**Files:**
- Modify: `src/presentation/pages/LearnedItemsPage.tsx`

**Context:** `state.cards` is `Record<string, PropertyCard>`. `PropertyCard` has `symbolCharacter: string`, `property: string`, `srs: SrsDataDTO`. The symbol detail view renders when `selectedIdx !== null && tab !== "videos" && tab !== "vocabulary"`. `ConsonantSummary`, `VowelSummary`, and `ToneMarkSummary` all have a `character: string` field. `items` and `refresh` are NOT yet in the `useApp()` destructure here.

**Step 1: Add imports**

At the top of `LearnedItemsPage.tsx`, add:

```ts
import {
	StageOverrideSheet,
	type ItemCard,
} from "../components/organisms/StageOverrideSheet";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import { Button } from "@/presentation/components/ui/button";
```

**Step 2: Update useApp() destructure**

Change:
```ts
const { state, lesson } = useApp();
```
To:
```ts
const { state, lesson, items, refresh } = useApp();
```

**Step 3: Add sheet state and derived values**

After the existing `useState` calls, add:

```ts
const [sheetOpen, setSheetOpen] = useState(false);
```

Before the `return`, add:

```ts
const SCRIPT_PROPERTY_LABELS: Record<string, string> = {
	recognition: "Recognition",
	reading: "Reading",
	initialSound: "Initial Sound",
	toneIdentification: "Tone",
};

const selectedSymbolCharacter: string | null = (() => {
	if (selectedIdx === null) return null;
	if (tab === "consonants") return consonants[selectedIdx]?.character ?? null;
	if (tab === "vowels") return vowels[selectedIdx]?.character ?? null;
	if (tab === "toneMarks") return toneMarks[selectedIdx]?.character ?? null;
	return null;
})();

const scriptItemCards: ItemCard[] = selectedSymbolCharacter
	? Object.values(state.cards)
			.filter((c) => c.symbolCharacter === selectedSymbolCharacter)
			.map((c) => ({
				id: c.id,
				pool: "script" as const,
				label: SCRIPT_PROPERTY_LABELS[c.property] ?? c.property,
				currentStage: SrsStage.fromScheduleData(
					c.srs.learningStep,
					c.srs.interval,
				),
			}))
	: [];
```

**Step 4: Add button and sheet to the symbol detail panel**

Find the detail view block that starts `{selectedIdx !== null && tab !== "videos" && tab !== "vocabulary" && (`. Add the button and sheet at the bottom, inside the existing `div`, after all the conditional card renderers:

```tsx
{/* Stage override */}
{selectedSymbolCharacter && (
	<>
		<Button
			type="button"
			variant="outline"
			className="w-full mt-4"
			onClick={() => setSheetOpen(true)}
		>
			Override Stage
		</Button>
		<StageOverrideSheet
			open={sheetOpen}
			onClose={() => setSheetOpen(false)}
			itemLabel={selectedSymbolCharacter}
			cards={scriptItemCards}
			onOverride={(id, pool, stage) => {
				items.overrideCardStage(id, pool, stage);
				refresh();
			}}
		/>
	</>
)}
```

**Step 5: Run lint**

```bash
pnpm biome check src/presentation/pages/LearnedItemsPage.tsx
```
Expected: no errors

**Step 6: Run all tests**

```bash
pnpm vitest run
```
Expected: all tests pass

**Step 7: Commit**

```bash
git add src/presentation/pages/LearnedItemsPage.tsx
git commit -m "feat(items): add Override Stage sheet to symbol detail view"
```

---

## Final verification

```bash
pnpm vitest run && pnpm biome check src/
```
Expected: all tests pass, no lint errors.
