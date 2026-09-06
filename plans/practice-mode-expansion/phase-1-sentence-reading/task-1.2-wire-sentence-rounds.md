---
doc_type: reference
title: "Task 1.2 — Wire sentence rounds through PlayGameUseCase"
description: Extend PlayGameUseCase's itemKeyOf for the sentence kind and register SentenceGameItemSource in AppContext's GameItemSelectionService wiring.
covers:
  - src/application/use-cases/PlayGameUseCase.ts
  - src/application/use-cases/PlayGameUseCase.test.ts
  - src/presentation/context/AppContext.tsx
status: draft
task_id: "1.2"
task_status: complete
depends_on: ["1.1"]
size: small
verify:
  - npm test -- src/application/use-cases/PlayGameUseCase
  - npx tsc --noEmit -p tsconfig.domain-check.json
ac_enforcement:
  - "AC1 -> a case in PlayGameUseCase.test.ts recording a rating for a sentence item, asserting the resulting GameRatingRecord's itemKey is sentence:{sentenceId} and does not collide with a symbol/word item sharing similar text"
  - "AC2 -> a case starting a round with pools including \"sentence\" against a fixture repository, asserting sentence items appear alongside symbol/word items in one round"
  - "AC3 -> a case starting a round with pools: [\"script\"] through the fully-wired GameItemSelectionService (all sources registered, exactly as AppContext.tsx now constructs it), asserting it returns only symbol items — the wiring change did not alter this pre-existing behavior"
ac_tests:
  - "AC1 -> src/application/use-cases/PlayGameUseCase.test.ts::Task 1.2 AC1: a sentence item's itemKey is sentence:{sentenceId} and does not collide with symbol/word keys"
  - "AC2 -> src/application/use-cases/PlayGameUseCase.test.ts::Task 1.2 AC2: starting a round with 'sentence' pool returns sentence items alongside symbol/word items"
  - "AC3 -> src/application/use-cases/PlayGameUseCase.test.ts::Task 1.2 AC3: starting a round with only 'script' through the fully-wired service returns only symbol items"
red_proof:
  - "AC1 -> Changed itemKey assertion to expect wrong key format. The test would catch if sentence items don't have correct 'sentence:sentenceId' format by checking sentenceRating?.itemKey ===… [see red-proofs/]"
  - "AC2 -> If SentenceGameItemSource were not registered in AppContext, no sentence items would appear in the round. The test checks 'expect(kinds).toContain(\"sentence\")' which would fail with… [see red-proofs/]"
  - "AC3 -> If the pool filtering were broken and accidentally included sentence items even when not requested, the test would fail. Specifically, if we had 3 items instead of 2, the assertion… [see red-proofs/]"
lint:
  before: 12
  after: 12
  outcome: unsupported
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 1.2 — Wire sentence rounds through PlayGameUseCase

## Description

Read `PlayGameUseCase.ts`'s `itemKeyOf` function and its doc comment in
full — it already explains why the `kind` prefix exists (so a symbol
character can never collide with a same-text vocab word in a mixed round).
Add a `"sentence"` branch using `item.sentenceId` as the identity, following
the exact same shape as the existing two branches.

In `AppContext.tsx`, construct `SentenceGameItemSource` (from task 1.1) with
`cardRepo` and the same `sentenceData` array already loaded there for
`SentenceService`, and add it to `GameItemSelectionService`'s existing
sources array alongside `SymbolGameItemSource`/`WordGameItemSource` — no
other change to that wiring.

## Acceptance Criteria

- AC1: A sentence item's `GameRatingRecord.itemKey` is `sentence:
  {sentenceId}`, and this never collides with a symbol or word item's key
  in the same round.
- AC2: Starting a round with `"sentence"` among the requested pools returns
  sentence items alongside symbol/word items when all are eligible.
- AC3: A round selected with only `"script"` in `pools`, through the
  fully-wired service (every source registered, matching production
  wiring), still returns only symbol items — the new source's addition
  changed nothing about the existing pools' behavior.

## Architectural Decision

No new decision here — this task is purely mechanical wiring following
`itemKeyOf`'s and `AppContext.tsx`'s already-established patterns.

## Test Cases

- Sentence item rating: correctly keyed, no collision with symbol/word keys.
- Combined pool round: sentence items present alongside symbol/word items.
