# Frontend Engineer Review: practice-mode-expansion

## Executive Summary

This is a well-specified plan overall — it correctly restates the original plan's core rules ("cards decide eligibility, data decides content," stateless `PlayGameUseCase`, real-`AppProvider` SRS-isolation proofs) and every domain claim I independently re-verified against the current shipped source (`toneIdentification` card shape, `GrammarEntry.cards.application.correctExample` indexing, `GrammarCardGenerator`'s direct `Math.random()` use, `SentenceReviewCard`'s `sentenceId` field) held up. However, I found one concrete, untested, **production-breaking regression** the plan's own file lists omit (`StorageGameHistoryRepository.ts`'s pool allowlist), one **guaranteed `tsc` compile error** in task 1.1 that the plan gives no design guidance for resolving, and a **recurring gap** across all three new-organism tasks where the previous plan's explicit, tested reset/audio-keying discipline is silently dropped from both `CONTEXT.md` and every AC list. Task 3.3's mode switch is also under-specified in exactly the way the review brief anticipated: two executors would plausibly build different state shapes for composition's "how many items are eligible" and "how do I save this round's history" paths.

## Plan-Level Findings

### Finding P-1: `StorageGameHistoryRepository`'s pool allowlist is never extended for `"sentence"` — silently corrupts all game history on first use
- **Severity**: critical
- **Description**: `src/infrastructure/persistence/StorageGameHistoryRepository.ts` hard-codes `const GAME_CARD_POOLS: readonly GameCardPool[] = ["script", "vocab"]`, used by `isGameCardPool`/`isGameHistoryEntry`/`isGameHistoryEntryArray` — the `JsonShapeGuard` passed to `LocalStorageJsonStore` in `AppContext.tsx`'s production wiring. `LocalStorageJsonStore.load()` returns `{status: "corrupt"}` for the **entire** stored array if `isValidShape` rejects it (verified in `JsonStore.ts`), and `isGameHistoryEntryArray` is `value.every(isGameHistoryEntry)` — one bad entry taints the whole list. Task 1.1 adds `"sentence"` to `GameCardPool` (a real, `Extract<CardPool,...>`-typed member) and task 1.3 has the learner play and save a Sentence-Reading round, which persists a `GameHistoryEntry` with `pools: ["sentence"]` (or `["script","sentence"]`). On the very next history read, `isGameCardPool("sentence")` returns `false`, the whole `thai-srs-game-history` blob is now reported `{status: "unavailable"}`, and `GameHistoryList` renders "Game history is unavailable" for **every** past round, not just the new one — exactly the failure mode `GameHistoryList.tsx`'s own doc comment says must never be silently conflated with "no games played yet," now triggered by ordinary use of this plan's own headline feature.
  - This file is **not** in phase 1's `covers` list at all (task 1.1: `types.ts`, `SentenceGameItemSource(.test).ts`, `GameItemSelectionService(.test).ts`; task 1.2: `PlayGameUseCase(.test).ts`, `AppContext.tsx`; task 1.3: `GamePage(.test).tsx`, sentence organisms, `GameHistoryList.tsx`). It only reappears in phase 3's covers (for the unrelated `kind` discriminant work), by which point the bug has already shipped if phases ship independently, as the plan's own README claims they can.
  - `npm run build` will **not** catch this: `GAME_CARD_POOLS` is a plain `readonly GameCardPool[]` array literal, not a `Record<GameCardPool, ...>` (contrast with `GameHistoryList.tsx`'s `POOL_LABELS: Record<GameCardPool, string>`, which *would* force a compile error) — TypeScript has no way to know the array is meant to be exhaustive.
  - No AC in task 1.3 catches it either: AC5 (the SRS-isolation proof) only asserts `localStorage["thai-srs-game-history"]` `.not.toBeNull()` after saving — it never re-reads history through a second `getHistory()`/render pass to confirm it still parses. AC7 tests `GameHistoryList`'s label rendering directly against an in-memory `InMemoryJsonStore` (bypassing the shape guard entirely), so it can't catch this either.
- **Recommendation**: Add `src/infrastructure/persistence/StorageGameHistoryRepository.ts` (and its test file) to phase 1's (task 1.1 or 1.3) `covers`, extend `GAME_CARD_POOLS` to include `"sentence"`, and add an AC that a saved sentence-inclusive round is still readable (not `"unavailable"`) on a subsequent `getHistory()`/render — ideally by extending the real-`AppProvider` SRS-isolation test to also assert `screen.queryByText(/history is unavailable/i)` is null after re-rendering, or a direct `StorageGameHistoryRepository`-level round-trip test. Consider making the guard exhaustive at the type level (e.g., derive it from a `Record<GameCardPool, true>` the way `GameHistoryList.tsx` already does) so this class of omission is caught by `tsc` next time a pool is added.

### Finding P-2: `itemKeyOfCard`/`itemKeyOfContent` in `GameItemSelectionService.ts` will not compile once `GameItemContent` grows a `"sentence"` member, and the plan gives no design guidance for the fix
- **Severity**: major
- **Description**: The existing weak-item-weighting helpers are two-armed ternaries written for a two-member union:
  ```ts
  function itemKeyOfContent(content: GameItemContent): string {
    return content.kind === "symbol"
      ? `symbol:${content.symbolCharacter}`
      : `word:${content.thaiWord}`;
  }
  ```
  Once task 1.1 adds `SentenceItemContent` to `GameItemContent`, the `else` branch narrows `content` to `WordItemContent | SentenceItemContent`, and `content.thaiWord` is a genuine `tsc` error (`SentenceItemContent` has no `thaiWord` field) — this is a real, guaranteed break of task 1.1's own `verify: npm run build` step, not a hypothetical. `itemKeyOfCard` has the analogous problem for `instanceof` branches (no `SentenceReviewCard` branch exists, so it falls through to `return null` for every sentence card, silently excluding sentences from weighting).
  - The plan **must** force some fix here (the compiler will refuse anything else), but it gives **no direction** on what the correct behavior should be: should `prioritizeWeakItems` + Sentence Reading weight sentence cards properly (a `sentence:${sentenceId}` branch mirroring `symbol:`/`word:`), or is "sentence items are never weighted, always neutral weight 1" an accepted, documented limitation? Either is defensible, but the plan should decide it explicitly rather than leaving it for whichever branch the executor happens to write to satisfy the type checker.
  - No AC in task 1.1 (or anywhere else) exercises `prioritizeWeakItems: true` together with a `"sentence"`-inclusive pool, despite task 2.1's own AC4 demonstrating the plan is otherwise careful about exactly this kind of pool×toggle cross-cutting interaction (tone practice independent of pool selection).
- **Recommendation**: Add an explicit instruction and AC to task 1.1: either extend `itemKeyOfCard`/`itemKeyOfContent` with a `sentence` branch (recommended, for consistency — `SentenceReviewCard.sentenceId` is already the right identity) plus a weighting test, or explicitly document "sentence items are exempt from weak-item prioritization, always weight 1" as an Architectural Decision with a regression test proving it stays that way.

### Finding P-3: New organisms have no explicit reset/audio-keying requirement — a previously explicit, tested rule silently dropped
- **Severity**: major
- **Description**: The predecessor plan's `CONTEXT.md` stated, as an explicit rule every new organism had to follow: *"every new organism must key both effects on the item's own id (not `audioUrl` alone, which two same-audio items could share) and reset on item change."* `GamePage.test.tsx` still enforces this today via dedicated tests ("resets reveal and canvas across two consecutive dictation items," "resets reveal across two consecutive reading items" — both because two same-direction items reuse one component instance without remounting). This plan's `CONTEXT.md` does **not** restate that rule anywhere, and none of the three new-organism tasks' ACs include an equivalent case:
  - Task 1.3 (`SentenceListeningChallenge`/`SentenceReadingChallenge`): AC1-AC8 cover mount-time audio/reveal behavior for one item and the multi-select refactor, but no case plays two consecutive same-direction sentence items and asserts revealed state resets / audio replays for the second.
  - Task 2.3 (`ToneIdentificationChallenge`): same gap — no consecutive-tone-item reset case among AC1-AC7.
  - Task 3.3 (`SentenceCompositionChallenge`): same gap for the tile-tap state (`built`/`available`/`feedback` must reset when the composition item changes, mirroring `SentenceBuilder.tsx`'s own `useEffect` keyed on `card.id`) — no case among AC1-AC6 exercises two consecutive composition items.
  - This is exactly the kind of defect the missing tests would let slip through unnoticed, since the description text ("read `SymbolReadingChallenge.tsx`... for the shape to imitate") relies entirely on the executor independently inferring the reset discipline from precedent rather than it being a stated, enforced requirement.
- **Recommendation**: Restate the rule in this plan's `CONTEXT.md` (one sentence, as the original plan did) and add one consecutive-item reset AC to each of tasks 1.3, 2.3, and 3.3, matching the existing `GamePage.test.tsx` pattern for symbol/word organisms.

### Finding P-4: Task 3.3's mode switch leaves state-derivation parity with Practice mode unspecified, compounding `GamePage.tsx`'s growing complexity
- **Severity**: major
- **Description**: Practice mode's setup screen has real, non-trivial derived state: `countEligibleItems()` (calls `startRound` with `Number.MAX_SAFE_INTEGER` to learn eligible count), a `useEffect` that resets `countInput` when the pool selection changes, and `parsedCount`/`countValid` gating `handleStart`. Task 3.3 says Composition mode needs "just an item-count input" but never says how `GamePage` learns the eligible count for composition (there is no `PlayGameUseCase.countEligibleCompositionItems`, nor any AC calling `startCompositionRound(Number.MAX_SAFE_INTEGER)` the way Practice mode does) — AC5 only says zero-eligible "shows a distinct explanatory state," not what code path produces that number. Two executors would plausibly diverge: one adds a use-case method mirroring the existing pattern, another inlines a `game.startCompositionRound(Number.MAX_SAFE_INTEGER).length` call directly in `GamePage`.
  - Separately, `handleRate`'s existing body unconditionally calls `game.saveHistory({ pools, itemCount: items.length }, roundSummary)` — composition rounds have no `pools` at all (task 3.2's `CompositionHistoryEntry` explicitly has no `pools` field). Task 3.3's description never states that `handleRate`/the save call site needs its own mode-aware branch (or a parallel `handleRate`/`handleStart` pair for composition) to call the right `saveHistory` overload with the right shape. This is a real fork point left to invention, not a stylistic nicety.
  - More generally: `GamePage.tsx` will, after this plan, dispatch five `kind`s across up to two directions each, host a Practice/Composition mode switch, four setup-time toggles (pools, input mode, prioritize-weak, tone), and two structurally different setup forms — with no task suggesting extracting the setup screens or the items/ratings/currentIndex round-state machine into smaller units. This is worth stating explicitly as an accepted tradeoff (or addressed with a small refactor task) rather than left implicit; the risk compounds with each future phase this feature is designed to expect.
- **Recommendation**: Add explicit language to task 3.3's Description naming the composition-mode eligible-count mechanism (mirroring `countEligibleItems`) and stating that `handleStart`/`handleRate`/the history-save call site need a mode branch. Consider (as a suggestion, not a blocker) noting in the Architectural Decision that `GamePage.tsx`'s setup screens should eventually be split into `PracticeSetupForm`/`CompositionSetupForm` components if a future phase adds a fourth mode.

### Finding P-5: Task 3.2's lazy grammar-points provider weakens `PlayGameUseCase`'s own documented "structural, not a rule" SRS-isolation guarantee
- **Severity**: moderate
- **Description**: `PlayGameUseCase`'s class doc comment currently makes a strong, verifiable claim: *"No `CardRepository` is ever received here... There is therefore no code path through this use case that could ever call `CardRepository.save`... the SRS-isolation guarantee is structural, not merely a rule nobody happens to break."* That claim is true today because it is checkable by inspecting `PlayGameUseCase.ts`'s imports alone. Task 3.2 adds `unlockedGrammarPoints?: () => readonly GrammarEntry[]` to the constructor — an opaque closure whose implementation (`grammarService.getUnlockedGrammarPoints()`, which internally holds a `CardRepository` and calls `.findAll(...)`, read-only today) is invisible from `PlayGameUseCase.ts` itself. Nothing at the type level distinguishes "a read-only query closure" from "a closure that could call `.save()`" — the guarantee has moved from type-level/inspectable to "trust whatever `AppContext.tsx` happens to pass in today." This is a reasonable, pragmatic design (and the closure genuinely is read-only as specified), but the class's own doc comment becomes an inaccurate claim about the codebase if left unedited, which is exactly the kind of stale architectural comment that misleads the next person who reads it.
- **Recommendation**: Update `PlayGameUseCase`'s doc comment in task 3.2 to soften the claim (e.g., "no code path *directly* calls `CardRepository.save`; the one injected read-only provider is documented as read-only by convention, not by type") rather than leaving the now-inaccurate absolute claim in place.

## Plan Quality Findings

| # | Check | Phase | Task | Severity | Issue | Recommendation |
|---|-------|-------|------|----------|-------|-----------------|
| Q1 | Trust boundary / back-compat | 1 | 1.1, 1.3 | critical | `StorageGameHistoryRepository`'s pool allowlist omission (see P-1) | Add file to covers, extend allowlist, add round-trip AC |
| Q2 | AC testability / build correctness | 1 | 1.1 | major | `itemKeyOfContent`/`itemKeyOfCard` will not compile for the new `sentence` kind (see P-2) | Add explicit branch + AC, or document exemption |
| Q3 | Behavioral ACs / test case quality | 1 | 1.3 | major | No consecutive-item reset/replay AC for `SentenceListeningChallenge`/`SentenceReadingChallenge` (see P-3) | Add AC mirroring `GamePage.test.tsx`'s existing reset tests |
| Q4 | Behavioral ACs / test case quality | 2 | 2.3 | major | No consecutive-item reset/replay AC for `ToneIdentificationChallenge` (see P-3) | Same as Q3 |
| Q5 | Behavioral ACs / test case quality | 3 | 3.3 | major | No consecutive-item tile-state-reset AC for `SentenceCompositionChallenge` (see P-3) | Same as Q3 |
| Q6 | AC testability | 3 | 3.3 | major | Composition's eligible-count derivation and `handleRate`'s mode branch left unspecified (see P-4) | Name the mechanism explicitly in the Description |
| Q7 | Architectural decisions documented | 3 | 3.2 | moderate | `PlayGameUseCase`'s "structural not a rule" doc claim becomes stale (see P-5) | Update the doc comment as part of this task |
| Q8 | YAGNI / naming precision | 1 | 1.1 | minor | `SentenceEntry.id` vs. `SentenceCard.sentenceId` — different field names for the same concept, not called out; an executor matching them incorrectly (e.g. assuming a field literally named `sentenceId` on `SentenceEntry`) would silently produce an always-empty lookup | State explicitly in the Description: "match `SentenceCard.sentenceId` against `SentenceEntry.id`" |
| Q9 | Test case quality | 3 | 3.1 | minor | Tile-shuffle algorithm for `compositionSelection.ts` is unspecified ("shuffled with rng") — `sampleWithoutReplacement(tiles, tiles.length, {rng})` would reuse the already-tested primitive instead of a new ad hoc shuffle | State explicitly that the tile shuffle should reuse `sampleWithoutReplacement` at `count = tiles.length` |
| Q10 | UX / component design | 1 | 1.3 | minor | No AC addresses what the existing "Input Mode: Draw on canvas / Write on paper" radio group should do when only Sentence Reading is checked (sentences have no write-input at all) — likely renders an inert, confusing control | Add an AC hiding/disabling Input Mode when no checked pool uses it |
| Q11 | Test harness completeness | 1-3 | 1.3, 2.3, 3.3 | suggestion | `renderWithApp`'s `MakeAppValueOptions` seeds only script cards; sentence/tone/grammar fixtures need a locally-defined `PlayGameUseCase` factory the way `GamePage.test.tsx`'s own `makeMixGame` already does for Words/Mix — not called out explicitly, though discoverable from the instructed reading | Point to the `makeMixGame` precedent explicitly in each task's Description |
| Q12 | Component design | 3 | 3.3 | suggestion | `GamePage.tsx` complexity (5 kinds, 2 modes, 4 toggles) not addressed architecturally anywhere | Note as an accepted tradeoff or a follow-up refactor task |

## Phase-by-Phase Review

### Phase 1 — Sentence reading

#### task-1.1-sentence-domain-model-and-source.md
- **Status**: findings
- **Findings**: Domain modeling itself is sound and correctly additive (verified `SentenceEntry`/`SentenceCard`/`SentenceReviewCard` shapes match the task's description). Two concrete defects: P-2 (guaranteed compile break in `itemKeyOfContent`/`itemKeyOfCard`, no design guidance) and Q8 (id/sentenceId naming). AC1-AC6 are otherwise well-specified, seeded-RNG-based, and correctly scoped to fixtures rather than requiring `GrammarService`/`CardRepository` doubles.

#### task-1.2-wire-sentence-rounds.md
- **Status**: pass
- **Findings**: Mechanical, correctly scoped, matches `itemKeyOf`'s and `AppContext.tsx`'s existing conventions exactly. No issues found.

#### task-1.3-sentence-challenge-organisms-and-multiselect.md
- **Status**: findings
- **Findings**: The multi-select refactor itself is well-justified and the plan is explicit that existing `GamePage.test.tsx` cases must be adapted, not silently dropped — this is the right instinct given how many existing tests select pools by radio label (`getByLabelText("Words")`, `getByLabelText("Mix")`), all of which will need rewriting to checkbox semantics; AC1's wording ("preserving what each test actually verifies") is the correct framing, though it's worth noting explicitly that "Mix" as a *label* disappears entirely under a real multi-select (both Symbols and Words checked *is* the mix, there's no separate "Mix" option) — several existing tests (`getByLabelText("Mix")`, "defaults the pool selector to Symbols" checking `Mix` unchecked) will need more than a mechanical relabeling, they need to be restructured around "which subset of checkboxes is checked," which is a bigger diff than "adapt them to check/uncheck the new checkboxes" implies. This is a real, if second-order, understatement of the refactor's size worth flagging alongside P-1's testing gap.
  - Also affected by P-1 (history shape guard), P-3 (no reset AC), Q10 (Input Mode UX when only Sentence Reading is checked).
  - Positive: AC5's SRS-isolation proof correctly bypasses `renderWithApp` for the real `AppProvider`, exactly matching the established, hard-won pattern from the original plan.

### Phase 2 — Tone identification

#### task-2.1-tone-domain-model-and-source.md
- **Status**: pass
- **Findings**: I independently re-verified the plan's central factual claim (a `toneIdentification` `VocabCard` already exists, generated only when `toneSyllables.length > 0`, carrying `syllables` as a public field) against `VocabCardGenerator.ts` and `VocabCard.ts` — accurate. The narrow "read this one card field directly" exception is well-argued and correctly scoped (unlike the general "never read a card's own content" rule, there genuinely is exactly one relevant property here). `includeTonePractice` as an additive `GameRoundConfig` field, independent of `pools`, is a clean design that avoids overloading `GameCardPool`.

#### task-2.2-wire-tone-items.md
- **Status**: pass
- **Findings**: Mechanical, correctly scoped. No issues found.

#### task-2.3-tone-organism-and-toggle.md
- **Status**: findings
- **Findings**: The single-presentation (`ToneChallengeDirection` one-literal-value) design is well-justified and consistent with `assignDirection`'s existing exhaustiveness needs. Affected by P-3 (no consecutive-item reset AC). No other issues — the toggle's independence from pool checkboxes (AC3/AC4) is well-tested, including the interaction case (checked with only `["script"]` selected).

### Phase 3 — Sentence composition

#### task-3.1-composition-selection.md
- **Status**: findings
- **Findings**: The decision not to implement `GameItemSource` is well-argued and matches the actual interface contract (`eligibleContent()` genuinely can't express "prerequisites met" without lying about what every other implementer guarantees). `correctExample`-index-then-fallback logic is correctly derived from `GrammarCardGenerator.ts`'s real usage. Affected by Q9 (tile-shuffle algorithm left unspecified — should reuse `sampleWithoutReplacement`). `GrammarLessonService.ts`/`GrammarService` class-name mismatch note is accurate and appropriately called out for the executor.

#### task-3.2-wire-composition-rounds.md
- **Status**: findings
- **Findings**: The `GameHistoryEntry` discriminated-union back-compat handling (AC4: legacy no-`kind` entries read as `"practice"`) is exactly right and correctly tested. Affected by P-5 (stale doc-comment claim on `PlayGameUseCase` after adding the lazy grammar-points closure). The lazy-provider pattern itself (read fresh per call, not cached) is the right call and correctly justified by analogy to `GameItemSelectionService`'s existing optional `cardRepository` parameter.

#### task-3.3-composition-organism-and-mode-switch.md
- **Status**: findings
- **Findings**: Correctly identifies that `SentenceBuilder.tsx`'s auto-graded `handleSubmit`/`onAnswer(isCorrect, ...)` must not be reused — this is the single most important design constraint in this task and it's stated unambiguously (AC1 explicitly forbids "an auto-graded correct/incorrect verdict anywhere"). Affected by P-3 (no consecutive-item reset AC), P-4 (mode-switch state-derivation and `handleRate` branching under-specified), Q12 (`GamePage.tsx` complexity). `GameHistoryList`'s composition-vs-practice-vs-legacy rendering (AC6) is a good, precise three-way test that correctly operationalizes the back-compat rule at the UI layer.

## Summary Statistics

- Tasks reviewed: 9
- Findings by severity: critical: 1, major: 6, moderate: 2, minor: 4, suggestion: 2
