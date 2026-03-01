# Dashboard & Pages Atomic Refactor — Design Document

**Date:** 2026-03-01
**Status:** Approved

---

## Problem

All presentation pages have two categories of violations of the atomic design conventions established in the 2026-02-28 refactor:

1. **`div.section-header` used directly** — the `SectionHeader` atom exists for this, but pages still use raw divs (15+ instances across 6 pages).

2. **Raw color classes and hardcoded RGBA values** — `bg-gray-*`, `text-indigo-*`, `dark:*`, `rgba(...)`, and hardcoded hex values appear in every page, violating the "all colors via `var(--color-*)`" convention.

3. **Repeated inline JSX patterns** — four distinct patterns appear identically in 2–5 files each, with no shared component: the forecast cell grid, stage progress pills, quick action cards, and review completion stats grid.

---

## Solution

Extract four new molecules, then do a page-by-page token and `SectionHeader` cleanup pass.

---

## New Molecules

### `ForecastCell`
**File:** `src/presentation/components/molecules/ForecastCell.tsx`

Props: `value: number`, `label: string`

Renders the forecast count + time label card used in Dashboard's "Upcoming Reviews" section. Value color is `var(--color-accent)` when `> 0`, else `var(--color-text-muted)`.

### `StagePill`
**File:** `src/presentation/components/molecules/StagePill.tsx`

Props: `stage: string`, `count: number`, `onClick: () => void`

Renders the stage-colored pill button (dot + label + count) used in Dashboard's "SRS Progress" section. Replaces the `STAGE_PILL_CONFIG` array that re-declares the color map already owned by `StageBadge`. Stage colors come from the same `var(--color-<stage>)` tokens.

### `QuickActionCard`
**File:** `src/presentation/components/molecules/QuickActionCard.tsx`

Props: `label: string`, `value: ReactNode`, `onClick?: () => void`, `disabled?: boolean`

Renders the tappable card used in Dashboard's 2-column action grid (Next Lesson, Grammar, Vocabulary). Uses `SectionHeader` atom for the label. Disabled state renders at `opacity-50` with no click handler.

### `SessionStatGrid`
**File:** `src/presentation/components/molecules/SessionStatGrid.tsx`

Props: `correct: number`, `total: number`, `accuracy: number`, `streakDays: number`

Renders the 4-column stats grid (✦ correct / ◈ cards / accuracy% / streak) shown on every review/lesson completion screen. Used in ReviewPage, VocabularyPage, GrammarPage, LessonPage.

---

## Token Fixes Per Page

| Page | Fixes |
|---|---|
| `Dashboard.tsx` | 4× `div.section-header` → `<SectionHeader>`, `rgba(192,57,43,0.08)` → `color-mix(in srgb, var(--color-danger) 8%, transparent)`, `rgba(255,255,255,0.7)` stays (white opacity on primary bg — acceptable), inline patterns → molecules |
| `ProgressPage.tsx` | 4× `div.section-header` → `<SectionHeader>`, `bg-gray-200 dark:bg-gray-800` → `var(--color-surface-2)`, `border-gray-200 dark:border-gray-800` → `var(--color-border)`, `text-red-500` → `var(--color-danger)` |
| `ReviewPage.tsx` | 1× `div.section-header` → `<SectionHeader>`, stats grid → `<SessionStatGrid>` |
| `VocabularyPage.tsx` | 1× `div.section-header` → `<SectionHeader>`, stats grid → `<SessionStatGrid>` |
| `GrammarPage.tsx` | 1× `div.section-header` → `<SectionHeader>`, stats grid → `<SessionStatGrid>`, progress bar bg `bg-gray-200` → `var(--color-surface-2)` |
| `LessonPage.tsx` | 1× `div.section-header` → `<SectionHeader>`, stats grid → `<SessionStatGrid>` |
| `LearnedItemsPage.tsx` | `text-indigo-600 dark:text-indigo-400` → `var(--color-primary)`, `bg-gray-100 dark:bg-gray-900` tab bg → `var(--color-surface-2)`, tab text colors → tokens, lesson badge `bg-indigo-100 text-indigo-600` → `color-mix` bg + `var(--color-primary)`, inline class ternaries for consonant class badges → `<ClassBadge>` atom |
| `SettingsPage.tsx` | `text-gray-500` → `var(--color-text-muted)`, `text-red-500` → `var(--color-danger)`, `text-green-600` → `var(--color-master)`, `text-red-600` → `var(--color-danger)`, `border-gray-200 dark:border-gray-800` → `var(--color-border)` |

---

## Conventions (unchanged from 2026-02-28 refactor)

- No raw Tailwind color classes in any component or page
- All colors via `var(--color-*)` tokens or `color-mix(in srgb, var(--color-*) N%, ...)`
- `rgba(255,255,255,N)` is acceptable only for white overlays on colored backgrounds
- Import layering: Pages → any layer

---

## Testing

- All 430 existing unit tests must pass unchanged
- No new tests required (purely structural/token cleanup)
