---
doc_type: reference
title: "Task 2.3 — Pool selector + play-page dispatch"
description: Add the Symbols/Words/Mix setup selector, dispatch each played item to its correct organism, verify SRS isolation for vocab/mix rounds end to end, and handle legacy (pool-less) history entries.
covers:
  - src/domain/game/types.ts
  - src/application/use-cases/PlayGameUseCase.ts
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
  - src/presentation/components/molecules/GameHistoryList.tsx
status: draft
task_id: "2.3"
task_status: complete
depends_on: ["2.2"]
size: medium
verify:
  - npm test -- src/presentation/pages/GamePage
  - npm run build
ac_enforcement:
  - "AC1 -> a case selecting \"Words\" and starting a round against a fixture with only word items eligible, asserting every rendered challenge is one of the two word organisms"
  - "AC2 -> a case selecting \"Mix\" against a stubbed selection result containing both a symbol item and a word item, asserting each is dispatched to its correct organism by kind and challengeDirection"
  - "AC3 -> a case selecting a pool with zero eligible items, asserting the start action is blocked with an explanatory message (mirrors task 1.4 AC6 for the words/mix cases)"
  - "AC4 -> the critical case: seed localStorage['thai-srs-state'] with vocab cards included, render GamePage inside the REAL AppProvider, play a full Words (and separately a Mix) round to completion, assert the seeded string is byte-identical afterward — extending task 1.4 AC4's proof to the pool this phase introduces"
  - "AC5 -> a case finishing a \"Words\"-pool round and a \"Mix\"-pool round, asserting the two persisted history entries record their respective pools and GameHistoryList renders them distinguishably"
  - "AC6 -> a case rendering GameHistoryList against a stored entry that predates the `pools` field (a phase-1-shaped entry), asserting it renders with a stated fallback label — never the string \"undefined\" — and does not break the list"
  - "AC7 -> a case asserting the default pool selection on a fresh setup screen is \"Symbols\""
  - "AC8 -> a case: a Mix round requested with more items than one pool can supply (e.g. 3 eligible words, 10 requested, plenty of eligible symbols) completes using the available words plus symbols to fill the rest, rather than under-filling or erroring"
  - "AC9 -> a case asserting each pool-selector option has an accessible name and can be chosen via keyboard"
ac_tests:
  - "AC1 -> src/presentation/pages/GamePage.test.tsx::Words: renders every item through a word organism"
  - "AC2 -> src/presentation/pages/GamePage.test.tsx::Mix: dispatches each item to its correct organism by kind and direction"
  - "AC3 -> src/presentation/pages/GamePage.test.tsx::keeps start unavailable and explains why for Words and Mix with no eligible items"
  - "AC4 -> src/presentation/pages/GamePage.test.tsx::leaves the whole thai-srs-state blob byte-identical after a full Words round through the real AppProvider"
  - "AC5 -> src/presentation/pages/GamePage.test.tsx::records which pools a finished round used, distinguishably in history"
  - "AC6 -> src/presentation/pages/GamePage.test.tsx::renders a legacy history entry with no pools field using a fallback label, never 'undefined'"
  - "AC7 -> src/presentation/pages/GamePage.test.tsx::defaults the pool selector to Symbols"
  - "AC8 -> src/presentation/pages/GamePage.test.tsx::fills a Mix round from both pools when one pool alone can't supply the requested count"
  - "AC9 -> src/presentation/pages/GamePage.test.tsx::labels each pool-selector option accessibly and keeps them keyboard-operable"
red_proof:
  - "AC1 -> Reverted GamePage.tsx's playing-phase dispatch guard to the old phase-1 shape `if (!item || item.kind !== \"symbol\") return null;`, which blanks the screen for any word item."
  - "AC2 -> Changed GamePage.tsx's playing-phase word-dispatch condition from `item.challengeDirection === \"dictationTranslate\"` to `true`, forcing every word item through WordDictationChallenge."
  - "AC3 -> Changed GamePage.tsx's empty-pool guard from `eligibleCount === 0` to `eligibleCount < 0`."
  - "AC4 -> Re-verified during review: replaced the earlier weak mutation (hardcoding pools:[\"script\"], which only broke round setup) with one that lets the Words round complete normally but th… [see red-proofs/]"
  - "AC5 -> Hardcoded `pools: [\"script\"]` in GamePage.tsx's saveHistory call, discarding the round's actual pool choice."
  - "AC6 -> Reverted GameHistoryList.tsx's poolsLabel guard to a bare `(pools as readonly GameCardPool[]).map(...)`, removing the undefined check."
  - "AC7 -> Changed GamePage.tsx's DEFAULT_POOL_CHOICE from \"symbols\" to \"words\"."
  - "AC8 -> Changed GameItemSelectionService.eligibleContent's source filter to also require `source.pool === pools[0]`, restricting a Mix round to one pool."
  - "AC9 -> Broke the pool-selector input's `id`/`htmlFor` link in GamePage.tsx by changing the input `id` to `game-pool-x-${choice}`."
lint:
  before: 0
  after: 0
  outcome: unsupported
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 2.3 — Pool selector + play-page dispatch

## Description

Extend `GamePage.tsx` with the pool selector (Symbols / Words / Mix, mapping
to `GameRoundConfig.pools` values `["script"]` / `["vocab"]` /
`["script","vocab"]`) and dispatch logic routing each `GameItem` to the
correct organism by `kind` then `challengeDirection`:
`SymbolDictationChallenge`/`SymbolReadingChallenge` (task 1.4) for
`kind: "symbol"`, `WordDictationChallenge`/`WordProductionChallenge` (task
2.2) for `kind: "word"`.

Revised after panel review found two gaps: (1) no AC in phase 2 re-verified
the plan's headline SRS-isolation guarantee for the pool this phase
introduces — phase 1's proof covered script cards only, and vocab cards are
first touched here; (2) adding `pools` to `GameHistoryEntry` (task 1.1's
schema) means entries a shipped phase 1 already wrote won't have it, and
`GameHistoryList` must handle that rather than render `"undefined"`.

Add `pools: readonly GameCardPool[]` to `GameRoundConfig`/
`GameHistoryEntry` if not already carried through from task 1.1 (it is;
this task is the first to give it a non-single-valued populated meaning),
threaded through `PlayGameUseCase.startRound`/`saveHistory`.

## Acceptance Criteria

- AC1: Selecting "Words" and starting a round renders every item through a
  word organism.
- AC2: Selecting "Mix" against a round containing both kinds dispatches
  each to the correct organism.
- AC3: Selecting a pool with zero eligible items blocks starting and states
  why, for "Words" and "Mix" (task 1.4 covers "Symbols").
- AC4: A full Words round and a full Mix round, played through `GamePage`
  inside the real `AppProvider`, leave `localStorage["thai-srs-state"]`
  byte-identical — extending task 1.4's proof to vocab cards.
- AC5: A finished round's persisted history entry records which pools it
  used, rendered distinguishably in `GameHistoryList`.
- AC6: A stored history entry with no `pools` field (written by a shipped
  phase 1) renders with a stated fallback label, not `"undefined"`, and does
  not break the list.
- AC7: The default pool selection is "Symbols".
- AC8: A Mix round requesting more items than one pool can supply completes
  by filling the remainder from the other pool, rather than under-filling
  or erroring.
- AC9: The pool selector has an accessible name for each option and is
  keyboard-operable, matching the labeling precedent task 1.4 sets for the
  item-count input and input-mode toggle.

## Architectural Decision

Default pool is "Symbols" — the least surprising choice for anyone who has
only used this feature since phase 1, rather than silently changing what a
repeat player gets without them choosing it.

The dispatch model — the *page* switches on `kind` then `challengeDirection`
and hands each organism an already-narrowed item — is the one this task
implements; organisms themselves receive a single-kind, single-direction
prop and never inspect `GameItem`'s union tag.

## Test Cases

- "Words" round: every rendered challenge is a word organism.
- "Mix" round with a stubbed mixed selection: correct per-item dispatch.
- "Words" or "Mix" selected with zero eligible items: blocked, explained.
- Full Words round and full Mix round through the real `AppProvider`: SRS
  blob byte-identical after each.
- Two finished rounds under different pools: history distinguishes them.
- A pool-less legacy history entry: fallback label, no crash.
- Fresh setup screen: "Symbols" selected by default.
- Mix round exceeding one pool's supply: fills from the other pool.
