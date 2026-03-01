# Stage Override Design

**Goal:** Allow users to manually promote or demote any learned item (script symbol or vocabulary word) to any SRS stage from within the items/vocab pages.

**Architecture:** A bottom sheet triggered from item detail views. A generic `StageOverrideSheet` component works for both symbols and vocab words via a shared `ItemCards[]` descriptor. The domain layer gains `SrsSchedule.overrideStage()` and a new `ManageItemsUseCase`.

**Tech Stack:** React, TypeScript, shadcn Dialog (or custom sheet), existing SRS domain model

---

## Domain Layer

### `SrsSchedule.overrideStage(targetStage: SrsStage, now?: string): SrsSchedule`

Constructs a new schedule pinned to the target stage:

| Stage | learningStep | interval (min) | nextReviewDate |
|---|---|---|---|
| Apprentice | 1 | 10 | now (immediately due) |
| Guru | null | 2880 (2 days) | now |
| Master | null | 20160 (14 days) | now + 20160 min |
| Enlightened | null | 60480 (42 days) | now + 60480 min |
| Burned | null | 120960 (84 days) | now + 120960 min |

Demotion targets (Apprentice, Guru) set `nextReviewDate = now` so the item is immediately due. Promotion targets set `nextReviewDate` forward so the item isn't immediately swamped. `easeFactor` and `repetitions` are preserved from the existing schedule.

### `ManageItemsUseCase`

New use case in `src/application/use-cases/ManageItemsUseCase.ts`.

```typescript
overrideCardStage(id: string, pool: CardPool, targetStage: SrsStage): void
```

Loads the card by id+pool, applies `overrideStage`, saves back via `cardRepo.save()`. Exposed via `AppContext` as `items: ManageItemsUseCase`.

---

## UI Components

### `StageOverrideSheet`

Location: `src/presentation/components/organisms/StageOverrideSheet.tsx`

Props:
```typescript
interface ItemCard {
  id: string;
  pool: CardPool;
  label: string;          // e.g. "Recognition", "Reading", "Thai → English"
  currentStage: SrsStage;
}

interface Props {
  open: boolean;
  onClose: () => void;
  itemLabel: string;      // e.g. "ก" or "มา"
  cards: ItemCard[];
  onOverride: (id: string, pool: CardPool, stage: SrsStage) => void;
}
```

Layout:
```
┌─────────────────────────────────────┐
│  Override Stage: ก               ✕  │
│                                     │
│  [Apprentice] [Guru] [Master]       │
│  [Enlightened] [Burned]             │
│  (current combined stage chip lit)  │
│                                     │
│  ▶ Individual cards  (collapsible)  │
│  ┌─────────────────────────────┐   │
│  │ Recognition   [A][G][M][E][B]│   │
│  │ Reading       [A][G][M][E][B]│   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

- "Combined" stage = the most advanced stage across all cards for the item
- Tapping a chip in the top row calls `onOverride` for **all** cards
- Expanding "Individual cards" shows per-card chip rows; tapping calls `onOverride` for that card only
- Stage chips use existing stage token colors (`--color-apprentice`, `--color-guru`, etc.)

### Entrypoints

- **`LearnedItemsPage`** — "Override Stage" button in the existing symbol detail view panel (below the `ConsonantCard`/`VowelCard`/`ToneMarkCard`)
- **`VocabListPage`** — "Override Stage" button in the word detail view (below `StageBadge` + `WordCard`)

Both build the `ItemCard[]` from `state.cards` / `state.vocabCards` and call `items.overrideCardStage()` + `refresh()` on override.

---

## Data Flow

1. User taps symbol/word → detail view opens (existing behavior)
2. User taps "Override Stage" → `StageOverrideSheet` opens
3. User taps a stage chip (all row) → `onOverride` called for each card → `ManageItemsUseCase.overrideCardStage()` → `cardRepo.save()` → `refresh()`
4. User expands individual cards → same chip row per card → single card override
5. Sheet closes → detail view re-renders with updated `StageBadge`

---

## Testing

- `SrsSchedule.overrideStage()` — verify each target produces correct `learningStep`, `interval`, and `nextReviewDate` relative to `now`; verify demotion stages are immediately due; verify `easeFactor` is preserved
- `ManageItemsUseCase.overrideCardStage()` — verify card is loaded, schedule replaced, and saved; verify unknown card id throws or no-ops gracefully
