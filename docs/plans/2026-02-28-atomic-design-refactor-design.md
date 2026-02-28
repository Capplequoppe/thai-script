# Atomic Design Refactor — Design Document

**Date:** 2026-02-28
**Status:** Approved

---

## Problem

The presentation layer has two intertwined issues introduced during the Thai Royal color palette refactor:

1. **Flat component structure** — all components live in a single `components/` folder with no hierarchy, causing duplicated primitives (`PlayAudioButton` copied in both `SymbolCard` and `MultipleChoice`, `ThaiCharDisplay` pattern repeated in three files) and no clear rule for where new components should go.

2. **Broken token usage** — `Flashcard.tsx` still uses pre-refactor Tailwind color classes (`bg-gray-100`, `dark:bg-gray-800`, `bg-indigo-50`, `text-indigo-600`) that look wrong against the Thai Royal palette. `ClassBadge` in `SymbolCard` uses hardcoded `bg-blue-100 text-blue-700` etc.

---

## Solution

Adopt **atomic design** as the component hierarchy with a combined token cleanup pass.

**Approach:** atoms-first, bottom-up — extract shared primitives first, build molecules from them, update organisms to consume molecules. Token fixes happen as a natural consequence of extraction.

---

## File Structure

```
src/presentation/
├── components/
│   ├── atoms/
│   │   ├── ThaiCharDisplay.tsx      # Thai char + optional audio button
│   │   ├── PlayAudioButton.tsx      # Standalone audio replay button
│   │   ├── StageDot.tsx             # Small colored circle showing SRS stage
│   │   ├── SectionHeader.tsx        # Gold left-border section title
│   │   └── ClassBadge.tsx           # Consonant class badge (low/mid/high)
│   ├── molecules/
│   │   ├── SymbolInfoRow.tsx         # Label/value row in info panels
│   │   ├── MnemonicBlock.tsx         # "💡 hint" block
│   │   ├── AnswerOptionButton.tsx    # Single answer choice in MultipleChoice
│   │   └── StageBadge.tsx           # Stage-colored Badge (promotions/HUD)
│   ├── organisms/
│   │   ├── Flashcard.tsx
│   │   ├── MultipleChoice.tsx
│   │   ├── LessonIntro.tsx
│   │   ├── StagePromotionPanel.tsx
│   │   ├── SymbolCard.tsx           # ConsonantCard, VowelCard, ToneMarkCard, ToneRuleCard
│   │   ├── RatingButtons.tsx
│   │   ├── WordCard.tsx
│   │   ├── HeatmapWidget.tsx
│   │   ├── LessonPath.tsx
│   │   ├── AchievementBadge.tsx
│   │   └── NotificationBanner.tsx
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── BottomTabBar.tsx
│   │   └── HudStrip.tsx
│   └── ui/                          # shadcn primitives — untouched
└── pages/                           # Untouched except import path updates
```

---

## Token Fixes

| Component | Problem | Fix |
|---|---|---|
| `Flashcard` | `bg-gray-100 dark:bg-gray-800` on audio button | `background: var(--color-surface-2)`, `color: var(--color-text-muted)` |
| `Flashcard` | `text-gray-600 dark:text-gray-300` on question text | `color: var(--color-text-muted)` |
| `Flashcard` | `bg-indigo-50` / `text-indigo-600` on answer reveal panel | `background: var(--color-surface-2)`, `color: var(--color-primary)` |
| `Flashcard` | `bg-gray-100 …` on "Show Answer" button | `background: var(--color-surface-2)`, `color: var(--color-text)` |
| `ClassBadge` | `bg-blue-100 text-blue-700` etc. hardcoded | Thai Royal token palette per class |
| `ThaiCharDisplay` (new) | Pattern duplicated in 3+ files | Single atom, canonical sizing and token usage |

---

## Conventions

**Token rule** — No component may use raw Tailwind color classes (`bg-gray-*`, `text-indigo-*`, etc.). All colors must come from `var(--color-*)` design tokens. The only exception is `ui/` (shadcn internals).

**Import layering** — Each layer may only import from layers below it or from `ui/`:
- Atoms → `ui/` only
- Molecules → atoms + `ui/`
- Organisms → molecules + atoms + `ui/`
- Layout → atoms + `ui/`
- Pages → any layer

**No barrel files** — Components imported directly by path; no `index.ts` re-exports that obscure hierarchy.

**Pages unchanged except imports** — No logic or JSX in pages changes; only import paths update.

---

## Testing

- All 430 existing unit tests must pass unchanged (purely structural reorganization)
- E2E Playwright tests must pass after the move
- No new tests required for this refactor
