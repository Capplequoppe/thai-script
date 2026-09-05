# QA Lead Review: game-modes

## Executive Summary

This is a well-structured plan with unusually good instincts in two places: task 1.3 AC5 correctly separates "nothing rated" from "rated, 0% accuracy", and CONTEXT.md correctly forbids proving SRS isolation by asserting a method was *not called*. However, the plan's flagship guarantee — "playing a game never mutates SRS state" — is scoped to `schedule` fields only and is proven exclusively against fixtures, while the same `thai-srs-state` blob also holds achievements/streak/sessionHistory that `AppProvider.checkAchievements` writes, and task 1.4 explicitly points the executor at `ReviewPage.tsx`, which calls `checkAchievements`. An executor can follow this plan exactly, ship a page that writes to the SRS blob, and have every AC pass.

Separately: across the nine tasks there are ~19 distinct resource reads and exactly **one** acceptance criterion (task 1.2 AC4) that names a failed read. The never-played and empty-pool states are handled well; the failed states are almost entirely absent, and the two most likely ones (corrupt game-history JSON, quota-exceeded on save) both crash the page rather than degrade.

---

## Plan-Level Findings

### Finding P-1: The SRS-isolation guarantee is under-scoped and never exercised against real wiring
- **Severity**: critical
- **Description**: Two independent problems compound here.

  (a) **Under-scoped.** Task 1.3 AC2 and 1.4 AC4 assert that each involved card's `schedule` fields are unchanged. But SRS state is one localStorage blob (`thai-srs-state`) that also contains `achievements`, `sessionHistory`, streak/stats, and every other card. `AppProvider` (`src/presentation/context/AppContext.tsx:104-111`) exposes `checkAchievements`, which calls `stateRepo.addAchievement(id)` — a **write** to that blob. Task 1.4's Description tells the executor: "Read `src/presentation/pages/ReviewPage.tsx` ... for the existing pattern of a page driving a multi-card session through hook state." `ReviewPage` calls both `refresh()` and `checkAchievements(summary)` at round end (`ReviewPage.tsx:29-60`). An executor imitating that pattern writes achievements into the SRS blob on every finished game round, and **every AC in this plan still passes**, because no criterion looks outside `schedule`.

  (b) **Never end-to-end.** Task 1.4 AC4's ac_enforcement says "completing a full round against a fixture repository". `AppProvider` constructs its repositories/use-cases as module-level singletons bound to `new LocalStorageAdapter()` — there is no injection seam. A "fixture repository" test therefore has to render a hand-built `<AppContext.Provider value={...}>`, which bypasses the exact wiring (which use case, which repository, which hook GamePage receives) that is the most plausible way to break isolation in production. The phase-1 README calls task 1.4 AC4 the plan's end-to-end criterion; as specified it is not end-to-end.

  This is feasible to fix cheaply: `StorageCardRepository` is stateless and re-reads `storage.load()` on every call (`src/infrastructure/persistence/StorageCardRepository.ts:74-78`), so a jsdom test can seed real `localStorage`, render through the real `AppProvider`, play a round, and compare the raw string.
- **Recommendation**: Rewrite task 1.4 AC4 as: *"After a full round played through `GamePage` rendered inside the real `AppProvider`, `localStorage.getItem('thai-srs-state')` is byte-identical to the value seeded before the round."* Keep task 1.3 AC2's schedule-level snapshot as the fast unit-level guard. Add to task 1.4's Description an explicit non-instruction: "`GamePage` must not call `checkAchievements`, `refresh()`, or anything on `review`/`items`/`data` from `useApp()`" — the ReviewPage-imitation instruction currently points the other way.

```
- Test: a completed game round leaves the entire SRS blob byte-identical
  Given: localStorage["thai-srs-state"] seeded with a known JSON string containing script cards, achievements, sessionHistory and streak fields
  When: GamePage is rendered inside the real AppProvider at /game, a round of 3 items is configured, started, revealed and rated (mixed ratings), and the summary screen appears
  Then: localStorage.getItem("thai-srs-state") === the exact seeded string
  Type: integration
  Priority: critical
```

### Finding P-2: The item-count input has no validation criterion anywhere, and the Trust Boundary rationale asserts otherwise
- **Severity**: major
- **Description**: The root README omits the Trust Boundary Inventory on the grounds that "degenerate local input (e.g. a requested count larger than the eligible pool, or zero eligible items) is instead covered by acceptance criteria in the tasks below". Only those two cases are covered (1.1 AC2, 1.1 AC3 / 1.4 AC6). Nothing in any task covers the number field's other degenerate values: `0`, negative, non-integer (`2.5`), empty string / `NaN`, or an absurd value (`1e9`). These flow straight from the setup form into `GameItemSelectionService`'s sampling. A negative count is the sharp edge: the natural implementations (`shuffled.slice(0, count)`, `Array.from({length: count})`) do silently wrong things with `-1` (drops the last item) and `NaN` (empty round), and an empty round then reaches task 1.3 AC5's "nothing rated" summary via a path nobody intended. `1e9` allocates or loops until the tab freezes.
- **Recommendation**: Add to task 1.1 an AC fixing the contract for a non-positive / non-integer / non-finite requested count (clamp to `[0, eligible]` and floor, or throw — pick one and state it), and to task 1.4 an AC that the setup form constrains the input (`min`/`max`/`step`, start disabled outside range) so the degenerate value never reaches the service in the first place. Both are needed: the UI guard is the user-facing behavior, the domain guard is the contract task 2.1/3.1 will keep relying on.

```
- Test: non-positive and non-integer item counts are clamped, not silently mis-sampled
  Given: a fixture CardRepository with 5 eligible distinct script symbols
  When: selection is requested with counts of 0, -1, 2.5, NaN and 1e9
  Then: the returned lengths are exactly 0, 0, 2, 0 and 5 respectively (or the stated throw), and no call takes longer than a few milliseconds
  Type: unit
  Priority: high
```

### Finding P-3: The "failed read" state is missing almost everywhere; corrupt history JSON crashes the page
- **Severity**: major
- **Description**: Counting, as the format spec requires: the nine tasks read roughly 19 distinct resources (task 1.1: the script card repo; 1.2: its own store; 1.3: the selection service + the history repo; 1.4: the card repo + the history store + audio; 2.1: script + vocab repos; 2.2: audio files; 2.3: persisted history entries; 3.1: card schedule stats). **Exactly one** acceptance criterion names a failed read: task 1.2 AC4 (`localStorage` undefined). Specifically missing:
  - **1.2**: the history key exists but holds unparseable or wrong-shaped JSON. `JSON.parse` throws; `list()` propagates; `GamePage` white-screens. The app already treats its other persisted blob as untrusted input (`Validation.ts`'s `validateLearnerState`, referenced in CONTEXT's Rejected Alternatives) — this new store gets no validation at all.
  - **1.2**: `localStorage.setItem` throwing `QuotaExceededError` when the (deliberately uncapped) history array grows. AC4 covers "localStorage absent" but not "localStorage present and refusing writes". A round the person just finished would throw at the moment of persisting.
  - **1.4 AC5** distinguishes *never played* from *played* — the two empty states — but not *history could not be read*. This is the exact shape the format spec warns about: with only those two named, a `catch { return [] }` in the repository collapses "broken" into "you have never played", and 1.4 AC5's test passes.
  - **2.2 AC4** covers a *null* audio file but not a failing one (404, decode error, or a browser blocking autoplay — `play()` returns a rejected promise; `DrawingQuiz.tsx:48` swallows it with `.catch(() => {})`, so the precedent exists but is not required by any AC).
- **Recommendation**: Add one criterion per resource in the form *"a failed read renders its reason, distinct from an empty result"*. Concretely: 1.2 gets "a store containing malformed JSON yields a distinguishable failure result, not `[]` and not a throw"; 1.2 gets "a `setItem` that throws does not prevent the summary screen from rendering"; 1.4 AC5 becomes three states (never played / entries present / history unavailable, each with its own message); 2.2 AC4 extends to "a rejected `play()` promise does not break the reveal-and-rate flow".

```
- Test: a corrupted game-history store is reported, not rendered as "no games played yet"
  Given: localStorage["thai-srs-game-history"] set to the string "{not json"
  When: GamePage's setup screen renders
  Then: the screen shows a history-unavailable message whose text differs from the never-played message, the start action is still enabled, and nothing throws
  Type: integration
  Priority: high

- Test: quota exhaustion while saving a round does not lose the summary
  Given: a repository whose underlying setItem throws QuotaExceededError
  When: a full round is finished
  Then: the summary screen renders with the round's counts and accuracy, and a "could not save to history" notice is shown
  Type: integration
  Priority: medium
```

### Finding P-4: The deterministic random source arrives one phase too late, leaving two statistical ACs flaky
- **Severity**: major
- **Description**: Task 3.1 introduces "an injectable random source (default `Math.random`) so a test can supply a seeded/deterministic source" — the right call, made in the wrong task. Randomness is introduced in **task 1.1** (shuffle + 50/50 direction assignment) and extended in **2.1** (mix composition, word direction). Consequences:
  - 1.1 AC4 and 2.1 AC4 are specified as ~200-trial distribution checks. Tolerable, but unnecessary once a seam exists.
  - **2.1 AC1 is genuinely flaky as written**: "`mix` [returns] a combination of both, when both kinds have eligible items", combined with the Description's "no fixed ratio — whatever proportion the eligible pools naturally have". With 40 eligible symbols, 3 eligible words and a 10-item round, uniform sampling of the union returns zero words a meaningful fraction of the time. The test will pass locally and fail in CI eventually. Its ac_enforcement doesn't constrain the fixture to make this deterministic.
  - Task 3.1 changing `GameItemSelectionService`'s signature to accept a random source invalidates the call shape that 1.1's, 2.1's, 1.3's and 1.4's tests were written against — a dependency-ordering problem the phase seams were supposed to prevent.
- **Recommendation**: Move the injectable random source into task 1.1 (it is the seam task; this is its job), default `Math.random`. Restate 1.1 AC4 and 2.1 AC4 as "with a seeded source producing values X, the assigned directions are exactly [...]" plus one cheap distribution smoke test. Restate 2.1 AC1 with a balanced fixture *or* a seeded source so "mix contains both kinds" is deterministic. Task 3.1 then adds a weighting flag only, not a signature change.

### Finding P-5: Phase 3's weighted sampler — the plan's only non-trivial algorithm — has no acceptance criterion, and 3.2 cites a test 3.1 never requires
- **Severity**: major
- **Description**: Task 3.1's four ACs cover: the unweighted path is unchanged (AC1), the *weight function* orders two fixture items correctly (AC2), the degenerate full-set request returns everything (AC3), and no new persisted stat (AC4, explicitly "none" for enforcement). Nothing covers the actual weighted-without-replacement **sampling** — i.e. that under-sampling k < N with weighting on actually favors the weak items. That is the only behavior the toggle exists to produce. Then task 3.2 AC2 says the page-level test uses "the same deterministic weak/strong fixture and injectable random source task 3.1's own tests established" — 3.1's ACs establish no such test, so 3.2 depends on an artifact its dependency isn't required to produce. An executor completing 3.1 to its stated ACs leaves 3.2 unbuildable as written.
- **Recommendation**: Add to 3.1: *"AC: With weighting on, a seeded random source, and a fixture of 3 weak / 3 strong items, requesting 3 items returns exactly the three weak items (the specific expected set for that seed is stated in the test)."* And add a deliverable: the weak/strong fixture and the seeded source live in a shared, exported test helper under `src/domain/game/` so 3.2 can import them rather than re-deriving them.

```
- Test: weighted sampling under-samples toward weak items deterministically
  Given: 3 items with easeFactor 1.3/lapseCount 5 and 3 items with easeFactor 2.8/lapseCount 0, and a seeded random source
  When: selection is requested with count 3 and weighting enabled
  Then: the returned items are exactly the three weak items, in the order the seed dictates
  Type: unit
  Priority: high

- Test: weighted sampling is total and duplicate-free for any seed
  Given: any eligible set of size N and any requested count k
  When: selection runs with weighting on across many seeds (proptest/fast-check style)
  Then: the result length is min(k, N) and all item identities are distinct
  Type: unit
  Priority: medium
```

### Finding P-6: Task 2.1 reshapes a type three other tasks compile against, with no cross-layer gate
- **Severity**: major
- **Description**: Task 2.1 turns `GameItem` into a discriminated union on `kind`. Its `verify` list is only `npm test -- src/domain/game`; its `covers` list names only `types.ts`, the service, and the service's test. But `PlayGameUseCase` (1.3), `GamePage` (1.4), and both symbol organisms (1.4) hold `GameItem` values. Type errors in those files are caught by `tsc -b`, which 2.1 never runs. Task 2.1's AC5/"Deliberately not extended" section claims "task 1.1's existing test cases in this same file are the regression guard" — that guards the domain test file only. Same gap in 3.1 (`verify` is domain tests only, while it changes a service signature the use case calls).
- **Recommendation**: Add `npm run build` to `verify` for 2.1 and 3.1, and add an AC to 2.1: *"`npm test` passes in full — phase 1's `PlayGameUseCase` and `GamePage` tests continue to pass with only additive changes (a `kind` field), not rewritten expectations."*

### Finding P-7: The persisted history entry has no schema contract and gains a field in phase 2 with no back-compat criterion
- **Severity**: major
- **Description**: Task 1.1 defines "a `GameHistoryRepository` port ... for persisting/listing `GameRoundResult`-derived history entries" but no AC fixes the entry's fields. Yet phase 1's declared end-to-end criterion is "one new history entry whose item count matches what was configured", and 1.4 AC5 renders "recent game-history entries" — both require a timestamp, an item count, and a stable key for React list rendering that no criterion establishes. Then task 2.3 adds `pool` to that shape. Every phase is declared independently shippable ("Would this phase stand alone? Yes"), so real users will have phase-1 entries in localStorage with no `pool` field when phase 2 lands. `GameHistoryList` rendering `"{entry.pool} · {n} items"` produces "undefined · 10 items". No AC covers reading a legacy entry.
- **Recommendation**: Add an AC to 1.1 or 1.2 fixing the entry schema (id, ISO timestamp, itemCount, per-rating counts, accuracy-or-null) and add to 2.3: *"AC: A history entry persisted without a `pool` field (written by phase 1) renders with a stated fallback label, never the string 'undefined', and does not break the list."* A `version` field on the stored blob is cheap insurance given the store is deliberately outside `validateLearnerState`.

### Finding P-8: Four tasks depend on page/component render-test infrastructure that does not exist, and no task builds it
- **Severity**: major
- **Description**: Tasks 1.4, 2.2, 2.3 and 3.2 all specify Testing-Library render tests. Repo reality:
  - `vite.config.ts` sets no `test.environment` and no `setupFiles`. The default environment is `node`; the existing convention is a per-file `// @vitest-environment jsdom` docblock (`src/presentation/hooks/useReviewSession.test.ts:1`). No task states this, and a render test written without it fails with "document is not defined".
  - There is **no existing page-level or component-level render test in the repo**. `src/presentation/pages/ReviewPage.test.tsx` and `src/presentation/components/organisms/DrawingQuiz.test.tsx` do not exist. CONTEXT.md's claim that render tests "match how `DrawingQuiz`/`ReviewPage` are covered today" is inaccurate — the nearest existing coverage is a *hook* test driven entirely by `vi.fn()` doubles. Task 1.4's `GamePage.test.tsx` would be this repo's first page render test.
  - `@testing-library/jest-dom` and `@testing-library/user-event` are not dependencies (`package.json:27-45`), so `toBeInTheDocument`/`userEvent` are unavailable; and with `globals` off, RTL's auto-`cleanup` does not register, so tests must clean up explicitly or leak DOM between cases.
  - jsdom does not implement `HTMLMediaElement.play`; `new Audio(url).play()` returns `undefined`, so `DrawingQuiz`'s `.play().catch(...)` idiom throws `TypeError` when copied into a challenge organism under test. Every one of the four challenge organisms auto-plays audio on mount, so **every** render test in this plan needs an `Audio` stub before it can render anything at all.
  - Rendering `GamePage` requires an `AppContextValue`; there is no existing test double for it and no injection seam in `AppProvider` (see P-1).
- **Recommendation**: Make the shared test harness an explicit deliverable of task 1.4 (it is the first task that needs it and three later tasks reuse it): a `src/presentation/test-utils/` module exporting a `renderWithApp(ui, overrides)` helper that supplies a full `AppContextValue`, an `Audio` stub that records constructed URLs and returns a resolved-promise `play()`, and the `// @vitest-environment jsdom` + explicit `cleanup()` convention. Add it to 1.4's `covers`. Otherwise four executors will each invent an incompatible version, and the audio-assertion ACs (1.4 AC2, 2.2 AC1/AC2) are unimplementable as written.

### Finding P-9: Which of a symbol's property cards supplies the prompt, answer and audio is unspecified — and dictation items may have no audio at all
- **Severity**: major
- **Description**: Task 1.1 deduplicates by `symbolCharacter` and projects "character, name/question text, correct answer, audio URL if any" — but a single symbol has cards under many `PropertyType` values with materially different content: `recognition`, `class`, `initialSound`, `finalSound`, `deadLive`, `audioRecognition`, `length`, `position`, `effectPerClass`, plus the extra `"toneRule"` literal (`src/domain/shared/types.ts:48-64`, `ScriptPropertyCard.ts:14`). The `class` card's `correctAnswer` is a consonant class ("High"); the `recognition` card's is the symbol's name. AC5 requires the character to appear once, but nothing says *which* card wins, so the reveal content is whatever `Object.values()` ordering yields — nondeterministic across users and untested. Worse: `audioUrl` is optional on both `ThaiSymbol` (`symbols.ts:19`) and `ScriptPropertyCard`. A symbol whose selected representative card has no `audioUrl`, assigned the "dictation" (hear it, write it) direction, produces an item with nothing to hear — unanswerable, and no AC forbids it. Task 2.2 AC4 notices the analogous word case but only requires "does not crash", which leaves the same unanswerable item.
- **Recommendation**: Add to task 1.1: *"AC: For a symbol with cards under several properties, the item's question/correctAnswer/audioUrl come from a stated representative (e.g. the `recognition` card, falling back to ...), asserted against a fixture with three differing property cards; `toneRule` cards do not make a symbol eligible on their own."* And: *"AC: A symbol with no `audioUrl` on any of its cards is never assigned the `dictation` direction (and, if no eligible symbol has audio, a symbols round contains only `reading` items)."* Mirror the second for words in 2.1.

### Finding P-10: The Trust Boundary omission is not justified — two rows belong
- **Severity**: medium
- **Description**: The stated rationale ("no network fetch, file read, CLI argument, or inter-process input") under-counts two boundaries. (1) The item-count number field is untrusted numeric input that reaches a sampling algorithm and an allocation — the rationale claims tasks cover it, and they do not (P-2). (2) `localStorage` is a persistence boundary the app itself already treats as untrusted: `LocalStorageAdapter.importData` runs `validateLearnerState` before accepting data, and `Storage.ts` carries a `migrateState` path for old shapes. The new game-history key is read back with `JSON.parse`, has no validation, no version, and is directly user-editable via devtools; it is then rendered into the DOM. That is the same class of boundary, minus the controls the existing one has.
- **Recommendation**: Replace the omission paragraph with a two-row inventory: (a) *item count → `GameItemSelectionService`*, control = clamp/floor at the domain boundary + `min`/`max` on the input, tested by P-2's case; (b) *`thai-srs-game-history` blob → `GameHistoryList`*, control = parse-with-validation returning a distinguishable failure result, tested by P-3's case. Both rows already have owners in the task list; the table just makes them non-optional.

---

## Plan Quality Findings

| # | Check | Phase | Task | Severity | Issue | Recommendation |
|---|-------|-------|------|----------|-------|-----------------|
| Q-1 | AC testability | 1 | 1.1 | major | AC6 ("exported from `src/domain/game/` with no import from any `presentation/` module") is declared enforced by "the `tsc` step of `npm run build`". `tsc` does not enforce layer boundaries — a domain file importing presentation compiles fine. `biome.json` enables only `recommended` rules, so no `noRestrictedImports` rule exists either. The criterion is currently unenforceable. | Either add a Biome `noRestrictedImports` rule for `src/domain/**` → `src/presentation/**` (and run `npx biome check .` in `verify`), or add a small test that reads the domain game sources and asserts no `presentation` import. Update the ac_enforcement line accordingly. |
| Q-2 | Behavioral ACs | 3 | 3.2 | major | AC1's enforcement — "a round started without checking it draws items via the unweighted path" — names an internal code path, not observable behavior. Any implementation of this assertion is a spy on which branch ran. | Restate observably: "with the toggle unchecked and the seeded source, the round contains the exact item set the unweighted algorithm produces for that seed — which differs from the weighted set for the same fixture." |
| Q-3 | Test case quality | 1 | 1.3 | medium | AC4's enforcement asserts "the history repository *received* two distinct entries" — mock-interaction phrasing. | Assert on state: after two rounds, `historyRepo.list()` returns 2 entries whose ids/timestamps/itemCounts differ and match the two rounds played. |
| Q-4 | Test case quality | 1 | 1.4 | medium | AC2's enforcement asserts an "audio autoplay call". Under jsdom there is no observable audio, so this necessarily becomes a mock assertion. | Narrow it to the highest-value observable: the stubbed `Audio` constructor is given *the item's* `audioUrl` (assert the URL, not the call count), and for the reading direction assert *ordering* — no `Audio` constructed before the reveal, one after. |
| Q-5 | AC testability | 1 | 1.2 | medium | AC5 defers a decision to the executor ("pick one — e.g. most-recent-first — and assert it"). Tasks 1.4 and 2.3 render "recent entries" and will encode the opposite assumption if the executor picks differently. | Fix the order in the plan (most-recent-first) and state the render limit (e.g. last 5) so 1.4/2.3's tests can assert it. |
| Q-6 | Architectural decision | 1 | 1.2 | minor | The Architectural Decision documents "no cap on length" by analogy with `sessionHistory`, but does not name the consequence it inherits (unbounded growth in a shared 5 MB origin quota, alongside the SRS blob) or the rejected alternative (cap at N). | One sentence: "rejected a cap because ...; the quota risk is handled by AC-<n> (a throwing `setItem` still renders the summary)". |
| Q-7 | YAGNI | 2 | 2.3 | minor | AC4 adds `pool` to the persisted entry purely so `GameHistoryList` can label rounds. This is required by AC4 itself, so it passes YAGNI — but it is the only field added retroactively to a shipped schema, which is what makes P-7 bite. Noting it here so P-7 isn't mistaken for a YAGNI cut: the fix is a back-compat criterion, not dropping the field. | Keep the field; add the legacy-entry criterion from P-7. |
| Q-8 | Ordering / dependency | 3 | 3.1 | major | 3.1 changes `GameItemSelectionService`'s signature (random source) after 1.1, 2.1, 1.3 and 1.4 have been written against the old one. See P-4. | Move the random-source parameter into 1.1. |
| Q-9 | Ordering / dependency | 2 | 2.1 | major | 2.1 reshapes `GameItem` with no build/test gate at the consuming layers. See P-6. | Add `npm run build` to `verify`; add a full-suite regression AC. |
| Q-10 | Implicit assumption | 2 | 2.2 | medium | AC4 names `thai_audio_file` / `english_audio_file` — raw vocabulary-data field names. The organisms consume a `WordGameItem` projection; `VocabCard` exposes a single optional `audioUrl` (`VocabCard.ts:16-18`). The AC is written one layer below the code it constrains, and implies two audio sources where the domain has one. | Restate at the organism's layer: "a word item whose `audioUrl` is absent renders without constructing an `Audio` and without throwing." Then add the missing upstream contract (next row). |
| Q-11 | Cross-task contract | 2 | 2.1 / 2.2 | major | 2.2 AC1 requires the dictation organism to reveal "both the Thai spelling and the English meaning" and to play "the word's Thai audio". Nothing in 2.1's ACs requires the `WordGameItem` to carry an English meaning, or to carry *Thai* audio specifically — the source `VocabCard`'s `question`/`correctAnswer`/`audioUrl` swap roles depending on which `VocabProperty` card the dedup happens to pick (the same problem as P-9, in the vocab pool). | Add to 2.1: "AC: every word item carries the Thai spelling, the English meaning, and the Thai-pronunciation audio URL (or an explicit absent marker), regardless of which `VocabProperty` card it was derived from — asserted against a fixture with two differing property cards for one word." |
| Q-12 | Implicit assumption | 2 | 2.1 | medium | Dedup is specified as parsing `vocab:{thai}:{property}` ids, even though `VocabCard.promptWord` is a public field holding the Thai word. Id parsing on an unexpected id (`split(":")[1]` → `undefined`) silently yields an item whose word is `undefined` and renders as such. | Prefer narrowing (`card instanceof VocabCard` → `promptWord`); if id parsing stays, add "AC: a vocab card whose id does not match `vocab:{thai}:{property}` is skipped, never turned into an item with an empty/undefined word." |
| Q-13 | Missing negative test | 1 | 1.3 | major | No criterion covers double-submission or re-rating. `RatingButtons` registers a **global** `keydown` handler for keys 1-5 with no disabled state (`RatingButtons.tsx:25-32`), so a keypress plus a click, or two fast taps, can fire `onRate` twice for one item. Depending on implementation that either double-counts a rating (breaking AC3's counts), skips an item, or finishes and persists the round twice. | Add: "AC: recording a rating twice for the same item index is idempotent (the second is ignored), and finishing an already-finished round does not append a second history entry." |
| Q-14 | State transition | 1 | 1.4 | medium | No criterion covers leaving a round: navigating away mid-round, or pressing start again from the summary. Whether a partial round persists to history, and whether the second round starts from a clean tally, is undefined — and "an interrupted round" is a state users will absolutely be in. | Add: "AC: navigating away mid-round persists nothing to history; returning to `/game` shows the setup screen, and starting a new round begins with an empty tally." |
| Q-15 | AC testability | 1 | 1.3 | minor | AC3 requires "an accuracy percentage" with tests asserting "hand-computed expectations", but no rounding/representation rule is stated. 2 of 3 Good → 66, 66.7, or 0.667? 1.4 AC4 asserts the page displays "the accuracy `PlayGameUseCase` computed", so a mismatch surfaces as a confusing UI test failure. | State it: integer percent, rounded half-up, `null` when nothing was rated (the latter is already AC5). |
| Q-16 | Concurrency | 1 | 1.2 | minor | Append is read-modify-write over one localStorage key. Two tabs finishing rounds interleaved lose one entry silently. The app is a PWA; two tabs is realistic. | Either accept explicitly in the Architectural Decision (one line: "last-write-wins across tabs is accepted; game history is not progress data"), or re-read immediately before write. Prefer the documented acceptance — but say it. |
| Q-17 | Third state | 3 | 3.1 | medium | Weighting reads each card's ease factor / lapse count, reusing what `ReviewService.getCriticalItems` reads — but that method *filters out* cards with `repetitions === 0` (`ReviewService.ts:218`). The plan doesn't say what weight a never-reviewed item gets. Never-reviewed cards carry `DEFAULT_SRS_DATA.easeFactor = 2.0` (`types.ts:34`), *lower* than a well-known card's, so a naive "lower ease = weaker" formula will silently rank brand-new items as among the weakest. That is the "never asked" state of the stats resource, and it is unnamed. | Add: "AC: an item with `repetitions === 0` (never reviewed) is weighted by a stated rule — e.g. treated as neutral, not as weak — asserted against a fixture containing one never-reviewed, one weak and one strong item." |
| Q-18 | Edge case | 3 | 3.1 | medium | No criterion for degenerate weights: all items equal weight, a formula yielding total weight 0, or a single eligible item. Weighted-without-replacement typically divides by the running total; a 0 total gives `NaN`, which silently returns fewer items than requested (or `undefined` entries). | Add: "AC: when all eligible items have equal weight (or total weight is 0), selection still returns exactly the requested count of distinct items." |
| Q-19 | Missing negative test | 2 | 2.2 | minor | Neither word organism has a criterion for the reveal-then-rate ordering that 1.4 AC3 establishes for the symbol organisms, even though all four are dispatched interchangeably by 2.3. | Add to 2.2: "AC: `RatingButtons` is absent before reveal and present after, in both organisms." |
| Q-20 | Missing AC for a documented decision | 2 | 2.3 | minor | The Architectural Decision fixes the default pool as "Symbols", but no AC asserts the default. | Add it to AC1 or as a one-line AC — it is a one-assertion test and the decision is explicitly load-bearing for repeat players. |

---

## Phase-by-Phase Review

### phase-1-symbol-practice

#### task-1.1-domain-model-and-selection.md: Domain model + symbol selection service
- **Status**: findings
- **Findings**:
  - **P-9 (major)**: representative-card selection for a multi-property symbol is unspecified; dictation items may have no audio. Both need ACs here — this is the seam and the projection is defined here.
  - **P-2 (major)**: no contract for a non-positive / non-integer / non-finite requested count. AC1 covers `≤ N`, AC2 covers `> N`, AC3 covers `N = 0` eligible; `count ≤ 0` and `NaN` fall through all three.
  - **Q-1 (major)**: AC6's layering constraint is not enforced by `tsc`, despite the ac_enforcement line saying it is.
  - **P-4 (major)**: the injectable random source belongs here, not in 3.1; AC4 is otherwise a 200-trial statistical assertion that 3.1 will later make unnecessary while also changing this service's signature.
  - **P-7 (major)**: this task fixes `GameRoundResult` and the `GameHistoryRepository` port but no AC fixes the persisted entry's fields (id, timestamp, itemCount) that phase 1's own end-to-end criterion depends on.
  - **Good**: AC5 (dedup across `PropertyType`) is a precise, high-value invariant with a fixture-shaped enforcement note. The Architectural Decision's YAGNI paragraph (rejecting a premature word union) is exactly the right call and correctly justified by the fact that all consumers are in-phase.
  - **Suggested additions**:
    ```
    - Test: the representative card for a multi-property symbol is deterministic
      Given: a fixture with three script cards for "ข" (properties recognition, class, audioRecognition) each with different question/correctAnswer, one carrying audioUrl
      When: a 1-item round is selected
      Then: the item's question/correctAnswer come from the stated representative property and its audioUrl is the one card that has it
      Type: unit
      Priority: high

    - Test: an audio-less symbol is never given the dictation direction
      Given: a fixture of 4 symbols, 2 of which have no audioUrl on any card
      When: 200 rounds of 4 items are selected
      Then: no item lacking audioUrl ever has challengeDirection "dictation"
      Type: unit
      Priority: high
    ```

#### task-1.2-game-history-repository.md: Game history repository
- **Status**: findings
- **Findings**:
  - **P-3 (major)**: three states named as two-and-a-bit. Never-written (AC2) and storage-absent (AC4) are covered; *present but corrupt* and *present but unwritable (quota)* are not. Both are the realistic failures for this store.
  - **Q-5 (medium)**: AC5 leaves the ordering choice to the executor while two downstream tasks render "recent entries".
  - **Q-16 (minor)**: cross-tab read-modify-write append race — accept it in writing or fix it.
  - **Q-6 (minor)**: the uncapped-history decision doesn't name its consequence.
  - **Good**: AC3 (saving history leaves the `thai-srs-state` blob untouched) is the right shape for the isolation guarantee at this layer — it asserts on the other store's contents, not on which methods ran.

#### task-1.3-play-game-use-case.md: PlayGameUseCase
- **Status**: findings
- **Findings**:
  - **P-1 (critical)**: AC2's snapshot covers `schedule` fields on the round's cards only. At this layer that scope is defensible (the use case has no `LearnerStateRepository`), but the task should state that explicitly so the executor doesn't quietly acquire one — and 1.4 must widen the scope (see P-1).
  - **Q-13 (major)**: no idempotency criterion for double-rating an item or double-finishing a round; `RatingButtons`' global key handler makes this reachable in practice.
  - **Q-15 (minor)**: accuracy rounding unspecified while 1.4 AC4 cross-checks the displayed value against it.
  - **Q-3 (medium)**: AC4's "the repository received two entries" is mock-shaped; assert `list()` instead.
  - **Missing**: what `recordRating` does with an out-of-range item index, and whether a round can be finished before every item is rated (AC5 implies a zero-rating finish is legal, so partial finishes presumably are too — say so).
  - **Good**: **AC5 is the single best criterion in this plan.** "Nothing rated" (`accuracy: null`) vs "rated, none correct" (`accuracy: 0`) is precisely the empty-vs-empty distinction that gets collapsed by default, and it is named with its enforcement. The Architectural Decision explaining the deliberate Good/Easy-only threshold divergence from `ReviewService` (≥3) pre-empts a reviewer "fixing" it — good defensive documentation.

#### task-1.4-symbol-game-presentation.md: Symbol game presentation
- **Status**: findings
- **Findings**:
  - **P-1 (critical)**: AC4 is the plan's end-to-end SRS-isolation criterion but runs against a hand-built context and asserts only `schedule` fields — while the Description points the executor at `ReviewPage`, whose end-of-session pattern writes achievements to the same blob.
  - **P-8 (major)**: this task needs, and should own, the render-test harness (jsdom docblock, `Audio` stub, `AppContextValue` double). Without it, 1.4 AC2 and every later render AC are unimplementable as specified.
  - **P-3 (major)**: AC5 names never-played vs populated; a failed history read collapses into "no games played yet".
  - **P-2 (major)**: AC1 only exercises "count ≤ eligible"; the input's degenerate values have no criterion.
  - **Q-14 (medium)**: no criterion for abandoning a round or replaying from the summary.
  - **Q-4 (medium)**: the audio-autoplay assertion is mock-shaped; make it assert the URL and the before/after-reveal ordering instead.
  - **Missing**: autoplay rejection (browsers block autoplay without interaction — the first item of every round is exactly that situation; `DrawingQuiz` swallows it, but no AC requires the new organisms to); revealing with an empty canvas (`DrawingCanvas.isEmpty()` exists and nothing uses it — either use it or note that self-grading permits an empty canvas).
  - **Good**: AC6 (zero eligible symbols ⇒ start unavailable *with an explanation*, rather than an empty round) is the right treatment of that empty state, and its distinction from AC5's empty history is exactly the discipline the rest of the plan needs.

### phase-2-word-practice-and-mix

#### task-2.1-word-pool-and-mix-selection.md: Word pool + mix in the selection service
- **Status**: findings
- **Findings**:
  - **P-4 (major)**: AC1's "mix returns a combination of both" is flaky under the Description's explicit "no fixed ratio" rule unless the fixture is balanced or the random source is seeded. As written this test will fail intermittently.
  - **P-6 (major)**: no `npm run build` in `verify` despite reshaping a type four other files consume.
  - **Q-11 (major)**: no AC guarantees the word item carries the English meaning and the Thai audio that 2.2's ACs then require.
  - **Q-12 (medium)**: id-parsing dedup where a typed public field exists; no criterion for a malformed id.
  - **Missing**: "mix" with *both* pools empty (1.1 AC3 covers symbols-only); word count `0` eligible at the domain layer (2.3 AC3 covers it at the UI layer only).
  - **Good**: AC3 (mix falls back cleanly when only one pool has items) is a genuinely well-chosen edge case, and the "Deliberately not extended" paragraph protecting phase 1's existing cases from being rewritten is the right instinct — it just needs the build gate to actually hold.

#### task-2.2-word-challenge-organisms.md: Word challenge organisms
- **Status**: findings
- **Findings**:
  - **Q-10 (medium)**: AC4 names raw-data field names (`thai_audio_file`/`english_audio_file`) that do not exist on the shape the organisms consume.
  - **Q-11 (major)**: depends on item fields 2.1 is not required to produce.
  - **P-3 (major)**: "null audio" is covered; "audio that fails to load or whose `play()` rejects" is not — and under jsdom `play()` is not implemented at all (P-8).
  - **Q-19 (minor)**: no reveal-then-rate ordering criterion, unlike the symbol organisms.
  - **Good**: AC3 (canvas present in draw mode, absent in paper mode) is precisely observable and cheap — the right kind of criterion.

#### task-2.3-pool-selector-and-dispatch.md: Pool selector + play-page dispatch
- **Status**: findings
- **Findings**:
  - **P-7 (major)**: adds `pool` to an already-shipped persisted schema with no legacy-entry criterion; `GameHistoryList` will render "undefined · N items" for phase-1 entries.
  - **Q-20 (minor)**: the documented "Symbols" default has no AC.
  - **Missing**: a mix round where one pool is exhausted mid-round (e.g. 3 words, 10 requested) — AC3 covers *zero* eligible in a pool but not *partially* eligible, which is the common case and interacts with 2.1 AC3's cap.
  - **Good**: AC2's stubbed mixed-selection dispatch test is the right isolation boundary — it tests dispatch without re-testing selection.

### phase-3-weak-item-prioritization

#### task-3.1-weighted-selection.md: Weighted selection
- **Status**: findings
- **Findings**:
  - **P-5 (major)**: the weighted sampler itself has no acceptance criterion; only the weight function (AC2) and the degenerate full-set case (AC3) are covered. This is the plan's only non-trivial algorithm.
  - **Q-17 (medium)**: never-reviewed items (`repetitions === 0`, which `getCriticalItems` filters out and which carry a *low* default ease factor of 2.0) have no stated weight.
  - **Q-18 (medium)**: no criterion for equal/zero total weight or a single eligible item.
  - **Q-8/P-4 (major)**: the random-source seam is introduced here rather than at the seam task, changing a signature four earlier files use.
  - **Note on AC4**: "AC4 -> none — ... checked by review" is honest, and the criterion (no new persisted statistic) is genuinely structural. Acceptable as-is; it's the only "enforcement: none" line in the plan that I'd let stand (AC6 in 1.1 is the other, and that one is mis-attributed to `tsc` — see Q-1).
  - **Good**: the Architectural Decision on using the *worst* underlying card's stats rather than an average is well-reasoned and states its rejected alternative. Splitting weight computation from sampling into two independently testable pieces is exactly right — the plan just forgot to write a criterion for the second piece.

#### task-3.2-prioritize-weak-items-toggle.md: Prioritize-weak-items toggle
- **Status**: findings
- **Findings**:
  - **P-5 (major)**: AC2 references a fixture and seeded source "task 3.1's own tests established", which 3.1's ACs do not require it to establish.
  - **Q-2 (major)**: AC1's "draws items via the unweighted path" is an implementation-path assertion; restate as an observable output comparison.
  - **Missing**: the toggle combined with zero eligible items (interaction with 1.4 AC6 / 2.3 AC3); and whether the toggle resets when returning to setup after a round (it's per-round state per the Architectural Decision — one assertion).
  - **Good**: the AD explicitly ties the not-persisted decision back to 1.4's input-mode decision, keeping the two consistent rather than re-litigating it.

---

## Testing Phase and Deployment Gate

There is no dedicated testing phase, and for a plan this size that is the right call — every task carries its own `verify` commands and ac_enforcement mapping, which is stronger than a trailing "write tests" phase. Two gaps at the plan level:

1. **Integration boundaries.** The two boundaries that matter — (a) `GamePage` ↔ the real `AppProvider` wiring, and (b) the game-history store ↔ the SRS store sharing one origin's `localStorage` — are each touched by exactly one AC (1.4 AC4 against a fixture; 1.2 AC3), and (a) is the one that carries the plan's headline guarantee. P-1's rewrite fixes this.

2. **E2E.** CONTEXT.md's claim that "this feature needs no new e2e coverage" is reasonable for the challenge organisms and defensible for the page, but weak for the isolation guarantee specifically: every isolation proof in the plan runs in jsdom against doubles, and the failure mode (wiring the page to something that writes SRS state) is a wiring failure. If P-1's real-`AppProvider` integration test is adopted, no e2e is needed. If it is not adopted, one Playwright spec — introduce a symbol, review it once, play a game round, assert `localStorage['thai-srs-state']` unchanged — should be mandatory.

**Minimum suite that should block deployment:**
- `npm run build` (`tsc -b`) — currently absent from 2.1's and 3.1's `verify` despite both changing shared types/signatures (P-6).
- `npm test` in full, not only the scoped path, for any task that changes `src/domain/game/types.ts` (1.1, 2.1, 2.3).
- The whole-blob SRS-isolation test from P-1.
- The corrupt-history and quota-exceeded tests from P-3.
- The seeded weighted-sampling test from P-5.

---

## Summary Statistics

- Tasks reviewed: 9 (1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2) across 3 phases, plus the root README and CONTEXT.md
- Plan-level findings: 10 (P-1 … P-10)
- Task-level quality findings: 20 (Q-1 … Q-20)
- Findings by severity:
  - **critical**: 1 (P-1 — SRS-isolation guarantee under-scoped and never exercised against real wiring)
  - **major**: 15 (P-2, P-3, P-4, P-5, P-6, P-7, P-8, P-9, Q-1, Q-2, Q-8, Q-9, Q-11, Q-13, plus P-5's manifestation in 3.2)
  - **medium**: 10 (P-10, Q-3, Q-4, Q-5, Q-10, Q-12, Q-14, Q-17, Q-18, and the e2e gap above)
  - **minor / suggestion**: 6 (Q-6, Q-7, Q-15, Q-16, Q-19, Q-20)
- Three-states count: ~19 resource reads across the 9 tasks; **1** acceptance criterion (1.2 AC4) names a failed read. Empty states are well covered (1.1 AC3, 1.2 AC2, 1.3 AC5, 1.4 AC5/AC6, 2.1 AC3, 2.3 AC3); failure states are not.
- Tasks with no findings: 0. Tasks whose findings are all minor: 0.
