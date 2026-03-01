# Dashboard & Pages Atomic Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract four new molecules and replace all raw color classes, hardcoded RGBA values, and raw `div.section-header` elements across every page with the atomic design system.

**Architecture:** Four new molecules added to `src/presentation/components/molecules/`. Pages import atoms/molecules instead of duplicating inline JSX. Token convention: all colors via `var(--color-*)`, no Tailwind color classes, no raw `rgba()`.

**Tech Stack:** React + TypeScript, Tailwind v4, `var(--color-*)` tokens, Biome, Vitest.

---

## Verification command (run after each task)

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/components/ && pnpm vitest run
```

Expected: 0 TypeScript errors, 0 Biome errors in presentation/components/, 430 tests pass.

---

## Phase 1 — New Molecules

### Task 1: ForecastCell molecule

**Files:**
- Create: `src/presentation/components/molecules/ForecastCell.tsx`

**Step 1: Create the file**

```tsx
import { Card } from "@/presentation/components/ui/card";

interface Props {
	value: number;
	label: string;
}

export function ForecastCell({ value, label }: Props) {
	return (
		<Card className="p-2">
			<div
				className="text-lg font-bold"
				style={{
					color: value > 0 ? "var(--color-accent)" : "var(--color-text-muted)",
				}}
			>
				{value}
			</div>
			<div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
				{label}
			</div>
		</Card>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/molecules/ForecastCell.tsx
git commit -m "feat(molecules): add ForecastCell molecule"
```

---

### Task 2: StagePill molecule

**Files:**
- Create: `src/presentation/components/molecules/StagePill.tsx`

**Step 1: Create the file**

```tsx
const STAGE_COLORS: Record<string, string> = {
	Apprentice: "var(--color-apprentice)",
	Guru: "var(--color-guru)",
	Master: "var(--color-master)",
	Enlightened: "var(--color-enlightened)",
	Burned: "var(--color-burned)",
};

interface Props {
	stage: string;
	count: number;
	onClick: () => void;
}

export function StagePill({ stage, count, onClick }: Props) {
	const color = STAGE_COLORS[stage] ?? "var(--color-text-muted)";
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium cursor-pointer"
			style={{ borderColor: color, color }}
		>
			<span className="w-2 h-2 rounded-full" style={{ background: color }} />
			{stage}
			<span className="font-bold">{count}</span>
		</button>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/molecules/StagePill.tsx
git commit -m "feat(molecules): add StagePill molecule"
```

---

### Task 3: QuickActionCard molecule

**Files:**
- Create: `src/presentation/components/molecules/QuickActionCard.tsx`

**Step 1: Create the file**

```tsx
import type { ReactNode } from "react";
import { Card } from "@/presentation/components/ui/card";
import { SectionHeader } from "../atoms/SectionHeader";

interface Props {
	label: string;
	value: ReactNode;
	onClick?: () => void;
	disabled?: boolean;
}

export function QuickActionCard({ label, value, onClick, disabled }: Props) {
	return (
		<Card
			className={`p-4 text-left${onClick && !disabled ? " cursor-pointer" : ""}${disabled ? " opacity-50" : ""}`}
			onClick={!disabled ? onClick : undefined}
		>
			<SectionHeader className="mb-1 text-xs">{label}</SectionHeader>
			<div
				className="font-semibold mt-2"
				style={{
					color:
						onClick && !disabled
							? "var(--color-primary)"
							: "var(--color-text-muted)",
				}}
			>
				{value}
			</div>
		</Card>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/molecules/QuickActionCard.tsx
git commit -m "feat(molecules): add QuickActionCard molecule"
```

---

### Task 4: SessionStatGrid molecule

**Files:**
- Create: `src/presentation/components/molecules/SessionStatGrid.tsx`

**Step 1: Create the file**

```tsx
import { Card } from "@/presentation/components/ui/card";

interface Props {
	/** Label for the first column, e.g. "Reviewed" or "Cards" */
	totalLabel: string;
	total: number;
	correct: number;
	accuracy: number;
}

export function SessionStatGrid({ totalLabel, total, correct, accuracy }: Props) {
	return (
		<div className="grid grid-cols-3 gap-3">
			{[
				{ label: totalLabel, value: total, color: "var(--color-text)" },
				{ label: "Correct", value: correct, color: "var(--color-master)" },
				{
					label: "Accuracy",
					value: `${accuracy}%`,
					color:
						accuracy >= 80 ? "var(--color-accent)" : "var(--color-danger)",
				},
			].map(({ label, value, color }) => (
				<Card key={label} className="p-4 text-center">
					<div className="text-2xl font-bold" style={{ color }}>
						{value}
					</div>
					<div
						className="text-xs mt-1"
						style={{ color: "var(--color-text-muted)" }}
					>
						{label}
					</div>
				</Card>
			))}
		</div>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/molecules/SessionStatGrid.tsx
git commit -m "feat(molecules): add SessionStatGrid molecule"
```

---

## Phase 2 — Update Dashboard

### Task 5: Rewrite Dashboard.tsx

**Files:**
- Modify: `src/presentation/pages/Dashboard.tsx`

**Step 1: Rewrite the file**

Replace the entire file with:

```tsx
import { useNavigate } from "react-router";
import {
	ACHIEVEMENT_DEFS,
	AchievementBadge,
} from "../components/organisms/AchievementBadge";
import { HeatmapWidget } from "../components/organisms/HeatmapWidget";
import { NotificationBanner } from "../components/organisms/NotificationBanner";
import { SectionHeader } from "../components/atoms/SectionHeader";
import { ForecastCell } from "../components/molecules/ForecastCell";
import { QuickActionCard } from "../components/molecules/QuickActionCard";
import { StagePill } from "../components/molecules/StagePill";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card } from "@/presentation/components/ui/card";
import { useApp } from "../hooks/useApp";

const STAGES = ["Apprentice", "Guru", "Master", "Enlightened", "Burned"] as const;

export function Dashboard() {
	const { state, lesson, review, dashboard } = useApp();
	const navigate = useNavigate();

	const nextLesson = lesson.getNextScript();
	const dueCount = review.getDueCount();
	const nextReview = review.getNextReviewDate();
	const forecast = review.getForecast();
	const leechCount = dashboard.getLeechCount();
	const stages = dashboard.getStageCounts("script");
	const achievements = state.achievements ?? [];

	return (
		<div className="space-y-6 py-4">
			<NotificationBanner />

			{/* 1. Primary Action Card */}
			<div
				className="rounded-2xl p-6"
				style={{
					background:
						dueCount > 0 ? "var(--color-primary)" : "var(--color-surface-2)",
				}}
			>
				{dueCount > 0 ? (
					<>
						<div className="flex items-center gap-3 mb-4">
							<Badge variant="outline">{dueCount} due</Badge>
							<span
								className="text-sm"
								style={{ color: "rgba(255,255,255,0.7)" }}
							>
								Cards ready for review
							</span>
						</div>
						<Button
							type="button"
							onClick={() => navigate("/review")}
							className="w-full py-4 rounded-xl text-lg font-semibold transition-colors"
							style={{
								background: "var(--color-accent)",
								color: "var(--color-text)",
							}}
						>
							Start Review
						</Button>
					</>
				) : (
					<>
						<p
							className="text-sm font-semibold mb-2"
							style={{ color: "var(--color-text-muted)" }}
						>
							All reviews complete
						</p>
						{nextReview && (
							<p
								className="text-lg font-semibold"
								style={{ color: "var(--color-text)" }}
							>
								Next review{" "}
								{nextReview.toLocaleDateString([], { weekday: "short" })} at{" "}
								{nextReview.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
						)}
					</>
				)}
			</div>

			{/* 2. Secondary Actions (2-col) */}
			<div className="grid grid-cols-2 gap-3">
				{nextLesson ? (
					<QuickActionCard
						label="Next Lesson"
						value={`Lesson ${nextLesson}`}
						onClick={() => navigate(`/lesson/${nextLesson}`)}
					/>
				) : (
					<QuickActionCard label="Script" value="All done ✓" disabled />
				)}
				{lesson.getGrammarUnlockedCount() > 0 ? (
					<QuickActionCard
						label="Grammar"
						value={`${review.getDueCount("grammar")} due`}
						onClick={() => navigate("/grammar")}
					/>
				) : lesson.getVocabUnlockedCount() > 0 ? (
					<QuickActionCard
						label="Vocabulary"
						value={`${review.getDueCount("vocab")} due`}
						onClick={() => navigate("/vocabulary")}
					/>
				) : (
					<QuickActionCard label="Vocabulary" value="Locked" disabled />
				)}
			</div>

			{/* 3. Stage Progress Pills */}
			{Object.values(stages).some((v) => v > 0) && (
				<div>
					<SectionHeader className="mb-3">SRS Progress</SectionHeader>
					<div className="flex gap-2 overflow-x-auto pb-1">
						{STAGES.map((stage) => (
							<StagePill
								key={stage}
								stage={stage}
								count={stages[stage.toLowerCase() as keyof typeof stages]}
								onClick={() => navigate("/progress")}
							/>
						))}
					</div>
				</div>
			)}

			{/* 4. Study Heatmap */}
			{state.sessionHistory.length > 0 && (
				<Card className="p-4">
					<HeatmapWidget sessions={state.sessionHistory} />
				</Card>
			)}

			{/* 5. Achievement Shelf */}
			{achievements.length > 0 && (
				<div>
					<SectionHeader className="mb-3">Achievements</SectionHeader>
					<div className="flex gap-4 overflow-x-auto pb-1">
						{achievements.slice(-4).map((id) => (
							<AchievementBadge key={id} id={id} unlocked size="sm" />
						))}
						{ACHIEVEMENT_DEFS.filter((d) => !achievements.includes(d.id))
							.slice(0, 2)
							.map((d) => (
								<AchievementBadge
									key={d.id}
									id={d.id}
									unlocked={false}
									size="sm"
								/>
							))}
					</div>
					<div className="flex justify-end mt-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => navigate("/progress")}
							className="text-xs h-auto p-0"
							style={{ color: "var(--color-text-muted)" }}
						>
							See all →
						</Button>
					</div>
				</div>
			)}

			{/* 6. Upcoming Reviews Forecast */}
			{Object.keys(state.cards).length > 0 && (
				<div>
					<SectionHeader className="mb-3">Upcoming Reviews</SectionHeader>
					<div className="grid grid-cols-5 gap-2 text-center">
						<ForecastCell label="Now" value={forecast.dueNow} />
						<ForecastCell label="1 hr" value={forecast.nextHour} />
						<ForecastCell label="24 hr" value={forecast.next24Hours} />
						<ForecastCell label="3 days" value={forecast.next3Days} />
						<ForecastCell label="7 days" value={forecast.next7Days} />
					</div>
				</div>
			)}

			{/* 7. Leech Warning */}
			{leechCount > 0 && (
				<div
					className="rounded-xl p-4 flex justify-between items-center"
					style={{
						background:
							"color-mix(in srgb, var(--color-danger) 8%, transparent)",
						borderLeft: "3px solid var(--color-danger)",
					}}
				>
					<div>
						<div
							className="text-sm font-semibold"
							style={{ color: "var(--color-danger)" }}
						>
							Leeches Detected
						</div>
						<div
							className="text-xs mt-0.5"
							style={{ color: "var(--color-text-muted)" }}
						>
							Cards that keep failing — consider extra study
						</div>
					</div>
					<div
						className="text-2xl font-bold"
						style={{ color: "var(--color-danger)" }}
					>
						{leechCount}
					</div>
				</div>
			)}
		</div>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/pages/Dashboard.tsx
```

**Step 3: Commit**

```bash
git add src/presentation/pages/Dashboard.tsx
git commit -m "refactor(pages): update Dashboard to use atoms/molecules, fix tokens"
```

---

## Phase 3 — Pages Using SessionStatGrid

For each page, the pattern is identical: find the 3-col `grid grid-cols-3 gap-3` stats block and the adjacent `div.section-header` achievement heading, replace both.

### Task 6: Update ReviewPage.tsx

**Files:**
- Modify: `src/presentation/pages/ReviewPage.tsx`

**Step 1: Add imports**

At the top of the file, add:
```tsx
import { SectionHeader } from "../components/atoms/SectionHeader";
import { SessionStatGrid } from "../components/molecules/SessionStatGrid";
```

**Step 2: Replace stats grid (around line 142)**

Find:
```tsx
{/* Stats grid */}
<div className="grid grid-cols-3 gap-3">
	{[
		{
			label: "Reviewed",
			value: results.length,
			color: "var(--color-text)",
		},
		{
			label: "Correct",
			value: correctCount,
			color: "var(--color-master)",
		},
		{
			label: "Accuracy",
			value: `${accuracy.percentage}%`,
			color:
				accuracy.percentage >= 80
					? "var(--color-accent)"
					: "var(--color-danger)",
		},
	].map(({ label, value, color }) => (
		<Card key={label} className="p-4 text-center">
			<div className="text-2xl font-bold" style={{ color }}>
				{value}
			</div>
			<div
				className="text-xs mt-1"
				style={{ color: "var(--color-text-muted)" }}
			>
				{label}
			</div>
		</Card>
	))}
</div>
```

Replace with:
```tsx
{/* Stats grid */}
<SessionStatGrid
	totalLabel="Reviewed"
	total={results.length}
	correct={correctCount}
	accuracy={accuracy.percentage}
/>
```

**Step 3: Replace achievement section header (around line 183)**

Find:
```tsx
<div className="section-header mb-3">Achievement Unlocked!</div>
```

Replace with:
```tsx
<SectionHeader className="mb-3">Achievement Unlocked!</SectionHeader>
```

**Step 4: Remove now-unused `Card` import if it's no longer used elsewhere in the file** (check first — `Card` may still be used in other sections of ReviewPage).

**Step 5: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/pages/ReviewPage.tsx
```

**Step 6: Commit**

```bash
git add src/presentation/pages/ReviewPage.tsx
git commit -m "refactor(pages): use SessionStatGrid and SectionHeader in ReviewPage"
```

---

### Task 7: Update LessonPage.tsx

**Files:**
- Modify: `src/presentation/pages/LessonPage.tsx`

**Step 1: Add imports**

```tsx
import { SectionHeader } from "../components/atoms/SectionHeader";
import { SessionStatGrid } from "../components/molecules/SessionStatGrid";
```

**Step 2: Replace stats grid (around line 227)**

Find:
```tsx
<div className="grid grid-cols-3 gap-3">
	{[
		{
			label: "Cards",
			value: totalCardsCount,
			color: "var(--color-text)",
		},
		{
			label: "Correct",
			value: flow.correct,
			color: "var(--color-master)",
		},
		{
			label: "Accuracy",
			value: `${accuracy.percentage}%`,
			color:
				accuracy.percentage >= 80
					? "var(--color-accent)"
					: "var(--color-danger)",
		},
	].map(({ label, value, color }) => (
		<Card key={label} className="p-4 text-center">
			<div className="text-2xl font-bold" style={{ color }}>
				{value}
			</div>
			<div
				className="text-xs mt-1"
				style={{ color: "var(--color-text-muted)" }}
			>
				{label}
			</div>
		</Card>
	))}
</div>
```

Replace with:
```tsx
<SessionStatGrid
	totalLabel="Cards"
	total={totalCardsCount}
	correct={flow.correct}
	accuracy={accuracy.percentage}
/>
```

**Step 3: Replace `div.section-header` for achievements**

Find `<div className="section-header mb-3">Achievement Unlocked!</div>` and replace with `<SectionHeader className="mb-3">Achievement Unlocked!</SectionHeader>`.

**Step 4: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/pages/LessonPage.tsx
```

**Step 5: Commit**

```bash
git add src/presentation/pages/LessonPage.tsx
git commit -m "refactor(pages): use SessionStatGrid and SectionHeader in LessonPage"
```

---

### Task 8: Update VocabularyPage.tsx

**Files:**
- Modify: `src/presentation/pages/VocabularyPage.tsx`

**Step 1: Add imports**

```tsx
import { SectionHeader } from "../components/atoms/SectionHeader";
import { SessionStatGrid } from "../components/molecules/SessionStatGrid";
```

**Step 2: Replace the quiz-completion stats grid (around line 439)**

There is one `grid grid-cols-3 gap-3` in the quiz-complete phase. Find it and replace with:
```tsx
<SessionStatGrid
	totalLabel="Cards"
	total={totalCardsCount}
	correct={flow.correct}
	accuracy={accuracy.percentage}
/>
```

**Step 3: Replace `div.section-header mb-3` for achievements (line 476)**

Find: `<div className="section-header mb-3">Achievement Unlocked!</div>`
Replace: `<SectionHeader className="mb-3">Achievement Unlocked!</SectionHeader>`

**Step 4: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/pages/VocabularyPage.tsx
```

**Step 5: Commit**

```bash
git add src/presentation/pages/VocabularyPage.tsx
git commit -m "refactor(pages): use SessionStatGrid and SectionHeader in VocabularyPage"
```

---

### Task 9: Update GrammarPage.tsx

**Files:**
- Modify: `src/presentation/pages/GrammarPage.tsx`

**Step 1: Add imports**

```tsx
import { SectionHeader } from "../components/atoms/SectionHeader";
import { SessionStatGrid } from "../components/molecules/SessionStatGrid";
```

**Step 2: Replace the quiz-completion stats grid (around line 483)**

Find the `grid grid-cols-3 gap-3` block and replace with:
```tsx
<SessionStatGrid
	totalLabel="Cards"
	total={totalCardsCount}
	correct={flow.correct}
	accuracy={accuracy.percentage}
/>
```

**Step 3: Replace `div.section-header mb-3` for achievements (around line 520)**

Find: `<div className="section-header mb-3">Achievement Unlocked!</div>`
Replace: `<SectionHeader className="mb-3">Achievement Unlocked!</SectionHeader>`

**Step 4: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/pages/GrammarPage.tsx
```

**Step 5: Commit**

```bash
git add src/presentation/pages/GrammarPage.tsx
git commit -m "refactor(pages): use SessionStatGrid and SectionHeader in GrammarPage"
```

---

## Phase 4 — Token Cleanup

### Task 10: Update ProgressPage.tsx

**Files:**
- Modify: `src/presentation/pages/ProgressPage.tsx`

**Step 1: Add import**

```tsx
import { SectionHeader } from "../components/atoms/SectionHeader";
```

**Step 2: Replace all 4 `div.section-header` / `h2.section-header`**

Find every occurrence of `className="section-header ...` and replace the `<div>` or `<h2>` with `<SectionHeader>`. There are 4 instances (Grammar Stages, Script Stages, Study History, Lesson Progress or similar). Example:

```tsx
// Before
<h2 className="section-header mb-3">Grammar Stages</h2>
// After
<SectionHeader className="mb-3">Grammar Stages</SectionHeader>
```

**Step 3: Fix progress bar background**

Find: `className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex"`
Replace: remove `bg-gray-200 dark:bg-gray-800` and add `style={{ background: "var(--color-surface-2)" }}`

Result:
```tsx
<div
  className="w-full h-3 rounded-full overflow-hidden flex"
  style={{ background: "var(--color-surface-2)" }}
>
```

**Step 4: Fix border color**

Find any `border-gray-200 dark:border-gray-800` classes. Replace with `style={{ borderColor: "var(--color-border)" }}` (add to existing style prop or create one, remove the Tailwind border-color class).

**Step 5: Fix text-red-500**

Find: `className="... text-red-500 ..."` (on reset button label or danger heading)
Replace the color class with `style={{ color: "var(--color-danger)" }}` (move to inline style, remove class).

**Step 6: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/pages/ProgressPage.tsx
```

**Step 7: Commit**

```bash
git add src/presentation/pages/ProgressPage.tsx
git commit -m "refactor(pages): use SectionHeader and fix token violations in ProgressPage"
```

---

### Task 11: Update LearnedItemsPage.tsx

**Files:**
- Modify: `src/presentation/pages/LearnedItemsPage.tsx`

**Step 1: Add imports**

```tsx
import { ClassBadge } from "../components/atoms/ClassBadge";
```

**Step 2: Fix tab container background**

Find: `className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-xl p-1"`
Replace: `className="flex gap-1 rounded-xl p-1"` + `style={{ background: "var(--color-surface-2)" }}`

**Step 3: Fix tab button styling**

The tab buttons use `bg-white dark:bg-gray-800 shadow-sm` (active) and `text-gray-500 hover:text-gray-700 dark:hover:text-gray-300` (inactive).

Replace the ternary className with:
```tsx
className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
style={
  tab === key
    ? { background: "var(--color-surface)", color: "var(--color-text)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
    : { color: "var(--color-text-muted)" }
}
```

**Step 4: Fix empty-state text**

Find: `<p className="text-gray-500">Complete a lesson to see your learned symbols here.</p>`
Replace: `<p style={{ color: "var(--color-text-muted)" }}>Complete a lesson to see your learned symbols here.</p>`

**Step 5: Fix grid tile backgrounds**

The consonant, vowel, toneMarks, vocabulary grids all have:
`className="... bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 ..."`

Replace the color Tailwind classes with inline style:
```tsx
className="relative flex flex-col items-center p-3 rounded-xl transition-colors"
style={{ background: "var(--color-surface-2)" }}
```

(Remove hover classes — hover states without dedicated tokens are acceptable to drop for now.)

**Step 6: Fix `text-gray-500` on grid tile labels**

Find each `className="text-[10px] text-gray-500 ..."` inside grid tiles.
Replace: `className="text-[10px] ..."` + `style={{ color: "var(--color-text-muted)" }}`

**Step 7: Replace consonant class ternary with ClassBadge atom**

In the consonants grid, find:
```tsx
<span
  className={`text-[10px] mt-0.5 px-1.5 rounded capitalize ${
    c.classType === "low"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      : c.classType === "mid"
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
  }`}
>
  {c.classType}
</span>
```

Replace with:
```tsx
<ClassBadge classType={c.classType} />
```

**Step 8: Replace vowel length ternary with token-based inline style**

Find:
```tsx
<span
  className={`text-[10px] mt-0.5 px-1.5 rounded ${
    v.length === "long"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
  }`}
>
  {v.length}
</span>
```

Replace with:
```tsx
<span
  className="text-[10px] mt-0.5 px-1.5 rounded"
  style={{
    background:
      v.length === "long"
        ? "color-mix(in srgb, var(--color-enlightened) 15%, var(--color-surface))"
        : "color-mix(in srgb, var(--color-guru) 15%, var(--color-surface))",
    color:
      v.length === "long" ? "var(--color-enlightened)" : "var(--color-guru)",
  }}
>
  {v.length}
</span>
```

**Step 9: Fix video list tile background and lesson badge**

Find the video list `<button>` (around line 309):
```tsx
className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
```
Replace color classes: `className="w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left"` + `style={{ background: "var(--color-surface-2)" }}`

Find the lesson number badge inside it:
```tsx
className="flex-shrink-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold text-lg"
```
Replace:
```tsx
className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
style={{
  background: "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))",
  color: "var(--color-primary)",
}}
```

**Step 10: Fix `text-gray-500` on video focus text**
```tsx
// Before
<div className="text-sm text-gray-500 truncate">
// After
<div className="text-sm truncate" style={{ color: "var(--color-text-muted)" }}>
```

**Step 11: Fix detail view border and back-link colors**

Find: `className="border border-gray-200 dark:border-gray-800 rounded-xl p-4"`
Replace: `className="rounded-xl p-4 border"` + `style={{ borderColor: "var(--color-border)" }}`

Find: `className="text-sm text-indigo-600 dark:text-indigo-400 mb-4 hover:underline"` (back button)
Replace: `className="text-sm mb-4 hover:underline"` + `style={{ color: "var(--color-primary)" }}`

Find the VideoPlayer back link: `className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"`
Replace: `className="text-sm hover:underline"` + `style={{ color: "var(--color-primary)" }}`

Find the VideoPlayer focus text: `className="text-sm text-gray-500"`
Replace: `className="text-sm"` + `style={{ color: "var(--color-text-muted)" }}`

**Step 12: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/pages/LearnedItemsPage.tsx
```

**Step 13: Commit**

```bash
git add src/presentation/pages/LearnedItemsPage.tsx
git commit -m "refactor(pages): use atoms and fix all token violations in LearnedItemsPage"
```

---

### Task 12: Update SettingsPage.tsx

**Files:**
- Modify: `src/presentation/pages/SettingsPage.tsx`

**Step 1: Replace each raw color class with token equivalent**

| Find | Replace with |
|---|---|
| `className="text-sm font-semibold text-gray-500"` (section headings) | Remove `text-gray-500`, add `style={{ color: "var(--color-text-muted)" }}` |
| `className="text-sm text-gray-500 dark:text-gray-400"` (description paragraphs) | Remove color classes, add `style={{ color: "var(--color-text-muted)" }}` |
| `className="... file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300 dark:hover:file:bg-gray-700"` (file input) | Replace file: color classes with `file:style` is not possible in Tailwind — instead remove all `file:` color classes and add `style={{ color: "var(--color-text-muted)" }}` to the input element |
| `className="... text-green-600 ..."` (import success) | Remove class, add `style={{ color: "var(--color-master)" }}` |
| `className="... text-red-600 ..."` (import error) | Remove class, add `style={{ color: "var(--color-danger)" }}` |
| `className="... border-t border-gray-200 dark:border-gray-800"` (danger zone section) | Remove `border-gray-200 dark:border-gray-800`, add `style={{ borderColor: "var(--color-border)" }}` |
| `className="text-sm font-semibold text-red-500"` (Danger Zone heading) | Remove `text-red-500`, add `style={{ color: "var(--color-danger)" }}` |

For the import status `<p>` element, the pattern is:
```tsx
// Before
<p className={`text-sm ${importStatus.type === "success" ? "text-green-600" : "text-red-600"}`}>
// After
<p
  className="text-sm"
  style={{
    color: importStatus.type === "success" ? "var(--color-master)" : "var(--color-danger)",
  }}
>
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/pages/SettingsPage.tsx
```

**Step 3: Commit**

```bash
git add src/presentation/pages/SettingsPage.tsx
git commit -m "refactor(pages): fix all token violations in SettingsPage"
```

---

## Phase 5 — Final Verification

### Task 13: Full sweep

**Step 1: Grep for raw color classes in all pages and presentation components**

```bash
grep -r "bg-gray-\|bg-indigo-\|text-gray-\|text-indigo-\|bg-blue-\|text-blue-\|bg-green-\|text-green-\|bg-purple-\|text-purple-\|bg-red-\|text-red-\|bg-amber-\|text-amber-\|bg-orange-\|text-orange-\|dark:" \
  src/presentation/components/atoms/ \
  src/presentation/components/molecules/ \
  src/presentation/components/organisms/ \
  src/presentation/components/layout/ \
  src/presentation/pages/ \
  2>/dev/null
```

Expected: **no output** (zero matches). If any remain, fix them before continuing.

Also check for leftover raw `rgba()` that aren't white overlays:

```bash
grep -r "rgba(" src/presentation/pages/ src/presentation/components/atoms/ src/presentation/components/molecules/ src/presentation/components/organisms/ 2>/dev/null
```

Acceptable: `rgba(255,255,255,0.7)` in Dashboard primary card (white text opacity on colored background). All others must be replaced with `color-mix(...)`.

**Step 2: Full test and lint suite**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/ && pnpm vitest run
```

Expected: 0 TypeScript errors, 430 tests pass. Biome errors are acceptable only in pre-existing files (`ui/`, `AppContext.tsx`, `LearnedItemsPage.tsx:56` non-null assertion).

**Step 3: Final commit**

```bash
git add -A
git commit -m "refactor(ui): complete pages atomic design cleanup + token sweep"
```
