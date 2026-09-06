---
doc_type: reference
title: "Task 1.3 — Sentence challenge organisms + multi-select pool picker"
description: New listening/reading organisms (no write-input, audio-gated), a genuine multi-select pool picker replacing the fixed 3-way radio (with all its dependent state renamed, not just the radio itself), and the SRS-isolation proof re-run through the real storage guard.
covers:
  - src/presentation/pages/GamePage.tsx
  - src/presentation/pages/GamePage.test.tsx
  - src/presentation/components/organisms/SentenceListeningChallenge.tsx
  - src/presentation/components/organisms/SentenceListeningChallenge.test.tsx
  - src/presentation/components/organisms/SentenceReadingChallenge.tsx
  - src/presentation/components/organisms/SentenceReadingChallenge.test.tsx
  - src/presentation/components/molecules/GameHistoryList.tsx
  - src/presentation/test-utils/renderWithApp.tsx
status: draft
task_id: "1.3"
task_status: pending
depends_on: ["1.2"]
size: x-large
weight_votes:
  - "author -> 13"
verify:
  - npm test -- src/presentation/pages/GamePage
  - npm test -- src/presentation/components/organisms/SentenceListeningChallenge
  - npm test -- src/presentation/components/organisms/SentenceReadingChallenge
  - npm run build
ac_enforcement:
  - "AC1 -> a render test checking Symbols and Sentence Reading together (Words unchecked), asserting the round draws only from those two pools"
  - "AC2 -> a render test: SentenceListeningChallenge auto-plays on mount, no write-input, reveals text + meaning"
  - "AC3 -> a render test: SentenceReadingChallenge shows text, no autoplay, reveals via audio + meaning; plus an audio-less case (the real shipped-data reveal) showing meaning only, no Audio constructed"
  - "AC4 -> a case: GamePage dispatches a kind:\"sentence\" item to the correct organism by challengeDirection"
  - "AC5 -> seed the SRS blob with sentence cards, real AppProvider, play a Sentence-Reading-only and a mixed Symbols+Sentence round, assert byte-identity after each"
  - "AC6 -> three cases sharing one mechanism: Symbols checked by default; zero pools checked blocks start with \"select at least one pool\"; Sentence Reading checked alone with zero eligible sentences blocks start with a message distinct from the zero-pools one; Symbols+Sentence Reading checked with Sentence Reading empty still starts, drawing only Symbols"
  - "AC7 -> GameHistoryList renders a \"sentence\"-inclusive round sensibly, never \"undefined\""
  - "AC8 -> pool checkboxes are accessibly labeled and keyboard-operable"
  - "AC9 -> two consecutive Sentence Reading items each independently reset/replay, keyed on item identity not audioUrl"
  - "AC10 -> a typed item count survives toggling Input Mode/Prioritize Weak Items but resets on a pool-selection change — proof `pools` stays a stable reference"
  - "AC11 -> the critical storage case: a full round through the REAL AppProvider (not renderWithApp's InMemoryJsonStore), returning to setup, shows the round in Recent Rounds with no \"unavailable\" text"
  - "AC12 -> Input Mode is hidden/disabled when only Sentence Reading is checked"
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 1.3 — Sentence challenge organisms + multi-select pool picker

## Description

Read `GamePage.tsx` **in full**, not just the pool-selection lines, before
changing anything — CONTEXT.md lists exactly what else is keyed off
`PoolChoice` and must gain a successor:

- `EMPTY_POOL_MESSAGES: Record<PoolChoice, string>` — with a real
  multi-select there is no fixed set of named combinations; write the
  zero-eligible message generically (it should read sensibly for any
  subset of checked pools that has nothing eligible) and, separately, a
  distinct message for the **zero-pools-checked** state (AC6) — these are
  two different empty states ("you checked something and it's empty" vs.
  "you haven't chosen anything yet") and must not collapse into one text.
- `DEFAULT_POOL_CHOICE = "symbols"` — becomes "Symbols checked, everything
  else unchecked" by default (AC6). There is a shipped test for this
  today; write its multi-select successor, don't drop it.
- `POOL_CHOICE_LABELS` — becomes per-checkbox labels (Symbols / Words /
  Sentence Reading).
- `countEligibleItems` and the `useEffect` that resets `countInput` are
  both keyed off `poolChoice` today (the latter carries a
  `biome-ignore useExhaustiveDependencies`) — both need to be re-keyed off
  the new derived `pools` value.
- The derived `pools` array **must be a stable reference** across
  re-renders when the checked set hasn't changed (today's `POOL_CHOICE_POOLS
  [poolChoice]` lookup is a stable module-constant reference, which is what
  makes the existing `useMemo`/`useEffect`/`useCallback` dependency arrays
  safe). A naive `ALL_POOLS.filter(p => checked[p])` produces a new array
  every render and will break them silently — memoize it (e.g. `useMemo`
  keyed on the individual checkbox booleans, or a stable derivation from a
  `Set`). AC10 is the observable proof this is done correctly.

**Existing `GamePage.test.tsx` cases must be adapted, not dropped** — but
"adapt" means something more than relabeling a query for several of them:
any test selecting `getByLabelText("Mix")` has no successor (there is no
"Mix" checkbox — checking both Symbols and Words *is* the mix), and the
keyboard test asserting radio-group mutual exclusion
(`wordsChoice.checked === true` implies `symbolsChoice.checked === false`)
must be **replaced** with a test asserting checkboxes are **independent**
— "adapting" it to checkbox selectors while keeping its mutual-exclusion
assertion produces a test that fails, or worse, one written to pass that
asserts nothing true about checkboxes.

**New organisms** — read `SymbolReadingChallenge.tsx`/
`WordDictationChallenge.tsx` for the audio-on-mount/reveal shape, but
sentences have **no write-input step at all** (no canvas, no paper-mode
button — see the Architectural Decision). Every organism resets its own
revealed state and replays audio keyed on the item's own identity, not
`audioUrl` alone, and does so again correctly for the *second* of two
consecutive same-direction items (AC9) — see CONTEXT.md.

- `SentenceListeningChallenge`: plays audio on mount; reveal shows Thai
  text + English meaning + replay.
- `SentenceReadingChallenge`: shows Thai text (no autoplay); reveal plays
  audio (when present) and shows English meaning. **The audio-less case
  (AC3's second half) is the one every real sentence in shipped data will
  actually render** — do not treat it as a rare edge case.

**`renderWithApp.tsx` needs new fixtures** this task adds and lists in its
own `covers`: a `makeSentenceCard(sentenceId)` factory and a `sentences`
seeding option on `makeAppValue`, and — since `makeAppValue`'s
`GameItemSelectionService` today registers only `SymbolGameItemSource` —
register every source `AppContext.tsx` now registers (mirroring the
`makeMixGame` pattern `GamePage.test.tsx` already hand-rolls, per its own
comment) so this divergence stops recurring per task.

`GameHistoryList` needs one addition: a round whose `pools` includes
`"sentence"` renders a sensible label. **AC11 is separate from AC7 and
matters more**: AC7 exercises the label against an in-memory fixture (which
cannot see task 1.1's storage-guard fix); AC11 is the one case in this
whole plan that plays a real round and re-reads it through the real
`LocalStorageJsonStore`, proving the fix from task 1.1 actually holds
end-to-end, not just at the unit level.

## Acceptance Criteria

- AC1: Symbols + Sentence Reading checked (Words unchecked) draws only
  from those two pools; existing single-pool coverage is preserved through
  the checkbox UI.
- AC2: `SentenceListeningChallenge` auto-plays on mount, no write-input,
  reveals text + meaning.
- AC3: `SentenceReadingChallenge` shows text first, no premature audio,
  reveals via audio + meaning when audio exists — and, separately, an
  audio-less item's reveal shows the meaning with no `Audio` constructed
  at all.
- AC4: `GamePage` dispatches `kind: "sentence"` items by
  `challengeDirection`.
- AC5: A full Sentence-Reading-only round and a full mixed
  Symbols+Sentence round, through the real `AppProvider`, each leave the
  SRS blob byte-identical.
- AC6: Symbols checked by default; zero pools checked blocks start with
  a distinct "select at least one pool" message; Sentence Reading checked
  alone with zero eligible sentences blocks start with a message distinct
  from that zero-pools one; a checked-but-empty pool alongside a
  non-empty one still starts, drawing from the non-empty one.
- AC7: `GameHistoryList` renders a `"sentence"`-inclusive round
  sensibly.
- AC8: Pool checkboxes are accessibly labeled, keyboard-operable.
- AC9: Two consecutive Sentence Reading items each independently reset
  and replay correctly.
- AC10: The derived `pools` value stays stable enough that an unrelated
  toggle change preserves a typed item count.
- AC11: A full Sentence-Reading round through the real `AppProvider`
  round-trips through history — no "unavailable" message afterward.
- AC12: Input Mode is hidden/disabled when only Sentence Reading is
  checked.

## Architectural Decision

No write-input for sentences: a full sentence is not something this
feature asks the learner to write; the challenge is purely listening/
speaking comprehension. This is also why Input Mode has nothing to
control when only Sentence Reading is checked (AC12) — offering it would
control nothing, per CONTEXT.md's own audio-less-reality note.

The multi-select refactor is genuinely larger than "add a third radio
option" — seven other pieces of state and two effects are keyed off the
type being deleted (see Description). This task owns all of it rather
than leaving successors to be invented mid-implementation.

## Test Cases

- Symbols + Sentence Reading checked, Words unchecked: correct draw.
- Sentence listening: audio autoplay, no write-input, reveal shows
  text + meaning.
- Sentence reading: text first, audio + meaning on reveal when present;
  meaning only, no `Audio`, when absent.
- Dispatch by `challengeDirection` for sentence items.
- Full Sentence-only and mixed rounds through the real `AppProvider`: SRS
  blob byte-identical after each.
- Zero eligible sentences (alone) vs. zero pools checked: two distinct
  messages.
- History list: sentence-inclusive round labeled sensibly (fixture-level).
- Checkbox accessibility.
- Two consecutive sentence-reading items: independent reset/replay.
- Default-checked Symbols; zero-pools message; partial-empty-pool round
  still starts from the non-empty pool.
- Typed count survives an unrelated toggle change.
- A real round through the real `AppProvider` round-trips through history
  with no "unavailable" message.
- Input Mode hidden/disabled with only Sentence Reading checked.
