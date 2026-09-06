---
doc_type: reference
title: "Task 2.2 — Wire tone items through PlayGameUseCase"
description: Extend PlayGameUseCase's itemKeyOf for the tone kind and wire ToneGameItemSource into GameItemSelectionService's dedicated tone-source parameter (never the pool-keyed sources array).
covers:
  - src/application/use-cases/PlayGameUseCase.ts
  - src/application/use-cases/PlayGameUseCase.test.ts
  - src/presentation/context/AppContext.tsx
status: draft
task_id: "2.2"
task_status: pending
depends_on: ["2.1"]
size: small
verify:
  - npm test -- src/application/use-cases/PlayGameUseCase
  - npm run build
ac_enforcement:
  - "AC1 -> a case recording a rating for a tone item, asserting the resulting itemKey is tone:{thaiWord} and does not collide with a word item for the same Thai word in the same round"
  - "AC2 -> a case starting a round with pools: [\"script\"] and includeTonePractice: true against a fixture repository (vocab cards present but \"vocab\" NOT in pools), asserting tone items still appear in the result"
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 2.2 — Wire tone items through PlayGameUseCase

## Description

Add a `"tone"` branch to `PlayGameUseCase.ts`'s `itemKeyOf`, using
`item.thaiWord` as the identity — prefixed with `kind` exactly like the
existing branches, since a tone-identification item and a word-dictation
item for the same Thai word can legitimately both appear in one round
(tone practice is independent of the Words pool, per task 2.1) and must
never collide into one rating record.

In `AppContext.tsx`, construct `ToneGameItemSource` with `cardRepo` and the
same `vocabularyData` array already loaded there, and pass it to
`GameItemSelectionService`'s **dedicated tone-source constructor
parameter** (fixed by task 2.1, after review rejected an earlier version
of this task's own instruction to add it to the `sources` array — do
**not** do that; the shipped `eligibleContent` filters `sources` strictly
by `pools.includes(source.pool)`, which would make tone items appear only
when Words is checked, breaking task 2.1's AC4).

## Acceptance Criteria

- AC1: A tone item's `itemKey` is `tone:{thaiWord}`, never colliding with a
  word item's key for the same Thai word.
- AC2: With `pools: ["script"]` (Words/`"vocab"` **not** in `pools`) and
  `includeTonePractice: true`, `startRound` still returns tone items — the
  fixture must pin `pools` to exclude `"vocab"`, otherwise this AC would
  pass even if `ToneGameItemSource` were wrongly wired into the `sources`
  array, which is exactly the bug this AC exists to catch.

## Architectural Decision

Mechanical wiring, corrected in this revision to route `ToneGameItemSource`
through the dedicated constructor slot task 2.1 defines rather than the
`sources` array — see Description.

## Test Cases

- Tone item rating: correctly keyed, no collision with a same-word word
  item.
- `pools: ["script"]` + `includeTonePractice: true`: tone items present in
  `startRound`'s result even though `"vocab"` is not requested.
