---
doc_type: reference
title: "Task 2.3 — Tone Identification organism + setup toggle"
description: A single-presentation Tone Identification organism, an off-by-default toggle threaded into countEligibleItems (not just startRound), and the SRS-isolation proof extended to the tone-practice path.
covers:
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
  - src/presentation/components/organisms/ToneIdentificationChallenge.tsx
  - src/presentation/components/organisms/ToneIdentificationChallenge.test.tsx
  - src/presentation/test-utils/renderWithApp.tsx
status: draft
task_id: "2.3"
task_status: pending
depends_on: ["2.2"]
size: large
weight_votes:
  - "author -> 8"
verify:
  - npm test -- src/presentation/pages/GamePage
  - npm test -- src/presentation/components/organisms/ToneIdentificationChallenge
  - npm run build
ac_enforcement:
  - "AC1 -> a render test asserting ToneIdentificationChallenge shows the Thai text and plays audio together on mount (when audio exists), presents no write-input at all, and reveals each syllable's tone after"
  - "AC2 -> a case asserting a tone item with no audioUrl renders without attempting Audio construction"
  - "AC3 -> a render test checking the \"Tone Identification\" toggle (unchecked by default, labeled identically to the phase README and every other reference to it) alongside any pool selection, asserting a checked round includes tone items and an unchecked round never does"
  - "AC4 -> a case asserting GamePage dispatches kind:\"tone\" items to ToneIdentificationChallenge"
  - "AC5 -> the critical case: seed localStorage['thai-srs-state'] with vocab cards including toneIdentification cards, render GamePage inside the REAL AppProvider, play a full round with the tone toggle checked to completion, assert the seeded string is byte-identical afterward"
  - "AC6 -> a case: with NO pool checkbox checked and the tone toggle checked, and tone-eligible words present, asserting start IS available and the round contains only kind:\"tone\" items (the exact scenario task 2.1 AC4 exists to enable) — and a SEPARATE case with the toggle checked but zero tone-eligible words, asserting a distinct explanatory message naming tone specifically, not the pool-empty message"
  - "AC7 -> a case asserting the toggle has an accessible label and is keyboard-operable"
  - "AC8 -> a case: with Symbols checked (3 eligible) and the tone toggle checked (4 tone-eligible words), asserting the item-count hint/cap reflects 7 total, not 3 — proving includeTonePractice is threaded into countEligibleItems, not just startRound"
  - "AC9 -> a case asserting two consecutive Tone Identification items each independently reset revealed state and replay audio correctly on the second item"
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 2.3 — Tone Identification organism + setup toggle

## Description

Read `SymbolReadingChallenge.tsx` for the reveal-then-`RatingButtons`
shape, but a tone item's prompt shows **both** the Thai text and its audio
together (no meaningful "hear it" vs. "see it" split — task 2.1's
`ToneChallengeDirection` has one value), and there is **no write-input**,
matching phase 1's sentence organisms. Reset/replay correctly on the
*second* of two consecutive tone items (AC9), same rule as every other
organism in this feature (CONTEXT.md).

- `ToneIdentificationChallenge`: shows the Thai word, plays audio if
  present, on mount; reveal shows each syllable's text alongside its tone,
  then `RatingButtons`.
- Add the **"Tone Identification"** checkbox to `GamePage`'s setup form —
  this exact label, matching the phase README and every task reference to
  it; not "Prioritize tone identification," which this plan explicitly
  rejects (CONTEXT.md) since the toggle includes items, it doesn't
  reorder anything. Positioned beside, not among, the pool checkboxes.
- Extend the dispatch switch with `kind: "tone"`.
- **`countEligibleItems` must learn about `includeTonePractice`.**
  `GamePage`'s existing eligible-count computation (which gates the
  item-count input and the empty-state branch) calls `startRound` today
  without threading this new config field through. Unthreaded, two
  things break: the item-count cap silently excludes tone items even when
  the toggle is checked, and — the more serious case — checking the
  toggle with **no pool checkbox checked** (a legal, intended state per
  task 2.1's design) reports zero eligible items and blocks start, even
  though tone items exist. AC6 and AC8 are the two ends of this: AC6
  proves the zero-pools-plus-tone-only state actually works end to end;
  AC8 proves the count itself is correct when a pool and the toggle are
  both active.

**`renderWithApp.tsx` needs a fixture this task adds**: a factory for a
`toneIdentification`-carrying vocab card (with real `syllables` data) and
a seeding option on `makeAppValue`, listed in this task's own `covers`.

## Acceptance Criteria

- AC1: `ToneIdentificationChallenge` shows text + audio together on
  mount, no write-input, reveals per-syllable tones.
- AC2: No-audio tone item: no `Audio` constructed.
- AC3: Toggle unchecked by default; checked includes tone items
  regardless of pool selection.
- AC4: `GamePage` dispatches `kind: "tone"` to `ToneIdentificationChallenge`.
- AC5: A full round with the toggle checked, through the real
  `AppProvider`, leaves the SRS blob byte-identical.
- AC6: No pool checked + toggle checked + tone-eligible words present:
  start available, round is tone-only. Toggle checked + zero tone-eligible
  words: a distinct message naming tone specifically.
- AC7: Toggle accessibly labeled, keyboard-operable.
- AC8: The eligible-item count/cap includes tone items when the toggle is
  checked, not just pool-sourced items.
- AC9: Two consecutive tone items each independently reset/replay.

## Architectural Decision

The toggle sits beside the pool checkboxes, not among them — it is not a
pool selection (task 2.1) and should not read as one.

"Tone Identification" is the one name used everywhere this toggle is
referenced — an earlier draft used "Prioritize tone identification" in
this task specifically while the phase README already said "Tone
Identification"; that mismatch would have been a real, executor-blocking
ambiguity once tests select the control by accessible name.

## Test Cases

- Tone prompt: text + audio together, no write-input, per-syllable reveal.
- No-audio tone item: no `Audio` construction.
- Toggle default off; checked includes tone items regardless of pools.
- Dispatch of `kind: "tone"` items.
- Full round with the toggle checked, real `AppProvider`: SRS blob
  byte-identical after.
- Zero pools + toggle checked + tone-eligible words: start works,
  tone-only round. Toggle checked + zero tone-eligible words: distinct
  message.
- Toggle accessibility.
- Eligible-count cap reflects tone items when the toggle is checked.
- Two consecutive tone items: independent reset/replay.
