# QA Lead Review: practice-mode-expansion

## Executive Summary

The plan is well-shaped and has clearly internalized the original game-modes
review (SRS isolation is re-proven per pool, the three-state history read is
respected, content-vs-eligibility is explicit). But two defects it does not
address are, on my reading of the shipped source, guaranteed production
failures rather than risks: `StorageGameHistoryRepository`'s persisted-entry
shape guard rejects both of the entry shapes this plan introduces (silently
destroying a real user's game history), and **every sentence in
`sentences.json` has `thai_audio_file: null`**, which makes the entire
"listening" half of phase 1 unreachable content. Two further issues are
internal contradictions: task 2.2's wiring instruction defeats task 2.1's own
AC4, and the ordering fix the plan claims (phase 3 after phase 2) is
contradicted by the task-level `depends_on` values, which put 2.1 and 3.1 on
the same shared file with the same single predecessor.

## Plan-Level Findings

### Finding P-1: A sentence round and a composition round each corrupt the entire persisted game history, and no planned test can see it

- **Severity**: critical
- **Description**: `src/infrastructure/persistence/StorageGameHistoryRepository.ts`
  validates every persisted entry:

  ```ts
  const GAME_CARD_POOLS: readonly GameCardPool[] = ["script", "vocab"];
  ...
  Array.isArray(entry.pools) && entry.pools.every(isGameCardPool)
  ```

  `isGameHistoryEntryArray` is the shape guard passed to
  `LocalStorageJsonStore` in `AppContext.tsx`, and it fails the **whole array**
  if any single entry fails. Consequences:

  1. **Phase 1**: a round including the new pool writes `pools: ["sentence"]`.
     `isGameCardPool("sentence")` is `false` (the literal array was never
     widened), so on the next read `load()` returns `corrupt` → `list()`
     returns `{status:"unavailable"}` → the user sees "Game history is
     unavailable" **forever**, including for all their previously-valid
     rounds.
  2. **Phase 3**: `CompositionHistoryEntry` as specified in task 3.2 has **no
     `pools` field at all** → `Array.isArray(undefined)` is `false` → same
     outcome.
  3. **Data loss, not just a bad read.** `StorageGameHistoryRepository.save`
     does `const current = this.list(); const entries = current.status === "ok"
     ? current.entries : []`. Once the store reads corrupt, the *next* save
     writes an array containing only the new entry. Every prior round is
     permanently gone.

  Why nothing catches it:
  - `tsc` does not. `const GAME_CARD_POOLS: readonly GameCardPool[] =
    ["script","vocab"]` stays perfectly assignable when `GameCardPool` gains a
    member. `npm run build` is green.
  - No planned test does. `InMemoryJsonStore` applies **no shape guard at all**
    (`load()` just returns the stored value), and `renderWithApp`'s
    `makeAppValue`/`makeGame`/`makeFixedRoundGame` all use it. Task 1.3 AC7 and
    task 3.3 AC6 exercise `GameHistoryList` with in-memory or prop-level
    fixtures and will pass.
  - The three real-`AppProvider` tests (1.3 AC5, 2.3 AC5, 3.3 AC4) assert
    byte-identity of `thai-srs-state` and never re-read game history. The
    shipped precedent test only asserts
    `getItem("thai-srs-game-history")).not.toBeNull()` — and `save` succeeds,
    because only `load` validates.

  No phase-1 task lists `StorageGameHistoryRepository.ts` in `covers` at all.
  Task 3.2 does, but has no AC touching the guard.

  (Worth noting for the executor: `GameHistoryList.poolsLabel`'s doc comment
  already claims to handle an entry that "predates the `pools` field entirely
  — `undefined` at runtime". That entry could never reach the UI, because the
  storage guard rejects it first. The guard and the UI already disagree about
  what a legacy entry looks like; this plan is about to add two more shapes to
  the disagreement.)

- **Recommendation**: Add `src/infrastructure/persistence/StorageGameHistoryRepository.ts`
  (and its test) to task 1.1 or 1.2's `covers`, and add these ACs:
  - Task 1.x AC: *A persisted entry whose `pools` includes `"sentence"` loads
    back as `{status:"ok"}` with that entry present — `isGameCardPool` is
    derived from `GameCardPool`, not a hand-maintained literal.* (Prefer
    deriving it from `CardPools.isValid` or a single exported const so a fourth
    pool cannot repeat this.)
  - Task 3.2 AC: *A persisted entry with `kind: "composition"` and no `pools`
    field loads back as `{status:"ok"}`; the guard requires `pools` only for
    practice-kind entries.*
  - Promote to a page-level guard in 1.3 and 3.3:

```
- Test: a just-played round survives a round trip through real localStorage
  Given: GamePage rendered inside the REAL AppProvider with the new pool eligible
  When: a full round is played to completion and "Play Again" returns to setup
  Then: the Recent Rounds list shows that round; the text "history is
        unavailable" is absent
  Type: integration
  Priority: critical
```

### Finding P-2: The "listening" half of phase 1 is unreachable — no sentence in the shipped data has audio

- **Severity**: critical
- **Description**: All 55 entries in `src/domain/sentence/data/sentences.json`
  have `thai_audio_file: null` (verified: the set of distinct values is
  `[null]`). `SentenceCardGenerator` also only emits a
  `listeningComprehension` card `if (entry.thai_audio_file && ...)`, so no such
  card exists either. Under task 1.1's own AC3 (audio-less → always
  `"reading"`), **every** sentence item in production is assigned `"reading"`.

  Therefore:
  - `SentenceListeningChallenge.tsx` and its test (task 1.3 AC2) are built for
    a state no real user can enter. This is the clearest YAGNI violation in the
    plan, and unlike a sad path it is not a state the system will be in — it is
    a feature with no data.
  - `SentenceReadingChallenge`'s specified behavior, "reveal plays the audio
    and shows the English meaning" (task 1.3 AC3), degrades to "reveal shows
    the English meaning" for 100% of real content. There is no AC for the
    audio-less reading reveal, which is the only reveal that will ever render.
  - The plan README, phase-1 README, and CONTEXT.md all describe listening as
    a co-equal half of the capability. That description is not true of the
    shipped dataset.

  This is not "the data might be sparse" speculation — it is the entire
  dataset, and it directly determines which of two organisms is ever
  instantiated.

- **Recommendation**: Decide explicitly and record it. Either (a) cut
  `SentenceListeningChallenge` from phase 1 and reduce
  `SentenceChallengeDirection` to a single literal (matching the
  `ToneChallengeDirection`/`CompositionChallengeDirection` pattern the plan
  already uses twice for exactly this "nothing to randomize against" reason),
  or (b) keep it and state in the task that it is dormant pending an audio-data
  task, with the phase README's capability statement corrected. Either way add:

```
- Test: sentence reading reveal with no audio
  Given: a kind:"sentence" reading item whose audioUrl is undefined
  When: the learner reveals
  Then: the English meaning is shown, no Audio is constructed
        (createdAudioUrls() is empty), and no non-functional replay control
        is rendered
  Type: unit
  Priority: critical
```
```
- Test: no sentence in the shipped data is ever assigned "listening"
  Given: SentenceGameItemSource over the real sentences.json
  When: a round is selected with a seeded RandomSource
  Then: every sentence item's challengeDirection is "reading"
  Type: unit
  Priority: high
```

### Finding P-3: Task 2.2's wiring instruction defeats task 2.1's AC4

- **Severity**: major
- **Description**: Task 2.1 AC4 requires that `includeTonePractice: true` with
  `pools: ["script"]` still returns tone items — "tone inclusion is
  independent of the pools array." Task 2.2's Description then says: *"add it
  to `GameItemSelectionService`'s sources array"*. But the shipped
  `GameItemSelectionService.eligibleContent` is:

  ```ts
  return this.sources
      .filter((source) => pools.includes(source.pool))
      .flatMap((source) => source.eligibleContent());
  ```

  A source in that array is *only* consulted when its `pool` is in
  `config.pools`. A `ToneGameItemSource` added there with `pool: "vocab"`
  fires exactly when Words is checked and never otherwise — the precise
  opposite of AC4. It also cannot satisfy `GameItemSource`'s `readonly pool:
  GameCardPool` honestly, since task 2.1 is emphatic that tone is not a pool.

  Task 2.1's own Description is correct ("thread it through `selectRound`:
  when true, add `ToneGameItemSource`'s eligible content to the draw pool
  regardless of which `pools` are selected"), which requires a **separate
  constructor slot**, not the sources array. Two tasks in the same phase give
  contradictory instructions; the executor of 2.2 will follow 2.2's text and
  break 2.1's already-passing AC4.

- **Recommendation**: Rewrite 2.2's Description to construct
  `ToneGameItemSource` into `GameItemSelectionService`'s dedicated
  tone-source constructor parameter (named in 2.1), and state explicitly that
  it must **not** go into the `sources` array. Add to 2.1: *`ToneGameItemSource`
  does not implement `GameItemSource`* (same rationale the plan already uses to
  keep `selectCompositionRound` off that interface — the interface's `pool`
  field is a claim this source cannot make). Add an AC to 2.2:

```
- Test: tone items are independent of the pools filter through the full wiring
  Given: an AppContext-shaped selection service with all sources registered
  When: startRound({pools: ["script"], includeTonePractice: true})
  Then: the result contains at least one kind:"tone" item and zero kind:"word" items
  Type: integration
  Priority: critical
```

### Finding P-4: The claimed ordering fix is contradicted by the task-level `depends_on`; 2.1 and 3.1 are still concurrent-eligible on `types.ts`

- **Severity**: major
- **Description**: The plan README and phase-3 README state that
  `depends_on: ["2"]` serializes phase 3 after phase 2 "so no two tasks editing
  the same file are ever concurrent-eligible." But the task frontmatter says
  otherwise:

  | Task | frontmatter `depends_on` | phase README table | `covers` includes `types.ts` |
  |---|---|---|---|
  | 2.1 | `["1.1"]` | "1 (phase)" | yes |
  | 3.1 | `["1.1"]` | "1 (phase)" | yes |

  Both name task `1.1` — not the phase — as their only predecessor, and both
  edit `src/domain/game/types.ts`. If the runner schedules on task-level
  `depends_on` (which is the only machine-readable field), 2.1 and 3.1 become
  eligible the moment 1.1 lands, and two blank executors edit the same union
  declaration concurrently. The phase-level `depends_on` is stated in three
  prose locations and one phase frontmatter field, and disagrees with the task
  frontmatter in two places.

  I checked the within-phase pairs as asked: **no within-phase collision
  exists.** Phase 1 (1.1→1.2→1.3), phase 2 (2.1→2.2→2.3), and phase 3
  (3.1→3.2→3.3) are each strictly serial chains, and no two tasks inside one
  phase are ever concurrently eligible. The only overlap is the cross-phase
  2.1/3.1 pair above.

- **Recommendation**: Set `3.1.depends_on: ["2.3"]` and `2.1.depends_on:
  ["1.3"]` (mirroring how the original plan resolved the same issue —
  `2.1→1.4`, `3.1→2.3` per that plan's review summary), or make the phase
  READMEs' task tables the authoritative statement and remove the misleading
  task-level values. Also fix the phase-2 and phase-3 README task tables, which
  currently print "1 (phase)" for a task whose frontmatter says `1.1`.

### Finding P-5: The multi-select refactor drops three already-specified behaviors and conflates "no pool chosen" with "nothing eligible"

- **Severity**: major
- **Description**: Task 1.3 replaces `PoolChoice`/`POOL_CHOICE_POOLS` but does
  not account for what else is keyed off `PoolChoice` in the shipped page:

  1. **`EMPTY_POOL_MESSAGES: Record<PoolChoice, string>`** — three
     hand-written messages keyed by the type being deleted. With a real
     multi-select there are 2³ = 8 selections, and no task says what the empty
     message becomes for an arbitrary subset. AC6 covers only one of them
     ("Sentence Reading checked alone").
  2. **`DEFAULT_POOL_CHOICE = "symbols"`**, with a doc comment giving its
     rationale, and a shipped test *"defaults the pool selector to Symbols"*.
     Task 1.3 has **no AC pinning the default checked set** post-refactor, and
     no statement that Sentence Reading defaults unchecked for the same reason
     the original plan defaulted Words unchecked. This is a specified,
     currently-tested behavior with no successor criterion.
  3. **The zero-pools state.** Task 1.3's Description says zero checked
     "blocks start, same as today's zero-eligible-pool case" — i.e. it
     deliberately renders the *"No symbols to practice yet — complete a script
     lesson first"* family of messages when the actual situation is "you
     haven't picked anything." That is the plan choosing to collapse **"never
     asked"** into **"asked and found nothing."** A learner with a full deck who
     unchecks everything is told to go complete a lesson.

  There is also a concrete React hazard in the refactor. Today `const pools =
  POOL_CHOICE_POOLS[poolChoice]` is a **stable reference** (a lookup into a
  module constant), which is what makes `useMemo([game, phase, pools,
  prioritizeWeakItems])` and `useCallback([game, pools, ...])` behave. The
  natural checkbox implementation (`ALL_POOLS.filter(p => checked[p])`) produces
  a new array every render. The `useEffect(..., [poolChoice])` that resets
  `countInput` (already carrying a `biome-ignore useExhaustiveDependencies`)
  becomes `[pools]` → `setState` on every render → "Maximum update depth
  exceeded". And `eligibleCount`'s memo would re-run
  `countEligibleItems(..., MAX_SAFE_INTEGER)` — a full eligibility scan plus an
  O(n²) `sampleWithoutReplacement` splice loop over the entire eligible set —
  on every render.

- **Recommendation**: Add to task 1.3:
  - AC: *On first load, exactly Symbols is checked; Words and Sentence Reading
    are unchecked.*
  - AC: *With no pool checked, start is blocked with a message that names the
    reason as "select at least one pool" — distinct in text from the message
    shown when a pool is checked but has no eligible items.*
  - AC: *With two pools checked where one has zero eligible items, the round
    starts and draws from the non-empty pool* (today's mutually-exclusive radio
    made this unreachable; multi-select makes it the common case).
  - AC: *Typing a custom item count and then toggling Input mode or Prioritize
    weak items preserves the typed count; changing the pool selection resets
    it* — this is the observable form of the memoization requirement, and it
    fails loudly if `pools` is unstable.
  - Name in the Description that `EMPTY_POOL_MESSAGES`, `DEFAULT_POOL_CHOICE`,
    and `POOL_CHOICE_LABELS` all need successors, and that the shipped keyboard
    test asserting radio-group mutual exclusion
    (`wordsChoice.checked === true` ⇒ `symbolsChoice.checked === false`) must be
    **replaced**, not adapted — checkboxes have the opposite semantics and
    "adapting" it silently converts it into a test of nothing.

### Finding P-6: `countEligibleItems` never learns about `includeTonePractice`

- **Severity**: major
- **Description**: `GamePage.countEligibleItems` computes the item-count cap
  and the empty-state branch by calling
  `game.startRound({pools, itemCount: MAX_SAFE_INTEGER, prioritizeWeakItems,
  inputMode})`. Phase 2 adds `includeTonePractice` to `GameRoundConfig` but no
  task requires threading it into this call. If it is not threaded:
  - the max item count excludes tone items, so a learner who checks the tone
    toggle cannot request the items it added;
  - with **zero pools checked and only the tone toggle on** — a legal state
    under task 2.1's "independent of pools" design — `eligibleCount` is 0, so
    the page renders the empty-pool message and blocks start, even though tone
    items exist. This is a false "nothing eligible" for a genuinely populated
    round.

  Task 2.3 AC3 ("a checked round includes tone items") is satisfied by the
  round contents and does not exercise the count path. AC6 (zero tone-eligible
  words) tests the opposite direction.
- **Recommendation**: Add to task 2.3:

```
- Test: the item-count cap includes tone items
  Given: setup with Symbols checked (3 eligible symbols) and 4 tone-eligible words
  When: the tone toggle is checked
  Then: the "Whole number from 1 to N" hint reads 7, and entering 7 enables Start
  Type: integration
  Priority: high
```
```
- Test: tone toggle alone, no pool checked
  Given: no pool checkbox checked, tone-eligible words exist
  When: the tone toggle is checked
  Then: start is available and the round contains only kind:"tone" items
        — OR the plan states that at least one pool is required, and the
        message says so
  Type: integration
  Priority: high
```

### Finding P-7: The shared render harness needs fixtures no task owns, and phase 3's are expensive

- **Severity**: major
- **Description**: CONTEXT.md correctly forbids a second harness and points at
  `src/presentation/test-utils/renderWithApp.tsx`. But that file is in **no
  task's `covers`**, and it currently offers only `makeScriptCard`,
  `scriptCardWith`, `makeSymbolItem`, and `makeAppValue({ symbols })`.
  `makeAppValue` builds its `GameItemSelectionService` with **only**
  `[new SymbolGameItemSource(cardRepo)]` — which is why the shipped
  `GamePage.test.tsx` has to hand-build its own `makeMixGame` (its own comment
  says so). Tasks 1.3, 2.3, and 3.3 each need fixtures that do not exist:
  sentence cards, `toneIdentification` vocab cards carrying `syllables`, and —
  worst — unlocked grammar state.

  Phase 3's is materially harder than the plan acknowledges.
  `GrammarService.getUnlockedGrammarPoints()` derives unlock status from
  **graduated** vocab (`card.schedule.learningStep === null`) counted by
  `word_class` against `grammar.json`'s `prerequisites.minVocabByClass` (the
  first entry needs `{n: 2, v: 2}`), *plus* every `applicationTemplate`
  function word being graduated. The harness's `DEFAULT_SRS` uses
  `learningStep: 1`, so nothing seeded by the existing helpers graduates
  anything. Task 3.3 AC4 (real `AppProvider`, byte-identical blob) requires
  building that seed by hand against the real `vocabulary.json`.

  This is invisible cost that will land on whichever executor gets there
  first, and CONTEXT.md's instruction not to build a second harness means they
  must edit a file outside their `covers`.
- **Recommendation**: Add `src/presentation/test-utils/renderWithApp.tsx` to
  the `covers` of 1.3, 2.3, and 3.3, and name the specific additions in each
  Description: `makeSentenceCard(sentenceId)` and a `sentences` seeding option
  (1.3); `makeToneVocabCard(thai, syllables)` and a `vocabWords` option (2.3);
  a `graduatedVocab` seeding option and an exported
  `UNLOCKS_FIRST_GRAMMAR_POINT` fixture (3.3). Also extend `makeAppValue`'s
  selection service to register all sources, so `renderWithApp` stops
  diverging from `AppContext.tsx`. Re-weight 3.3 accordingly; `large`/8 looks
  low next to the original plan's task 1.4, which was re-weighted to
  `x-large`/13 purely for harness cost.

### Finding P-8: "Unlocked grammar" is described inaccurately, and composition rounds will be tiny

- **Severity**: major
- **Description**: CONTEXT.md says `getUnlockedGrammarPoints()` "returns
  grammar points whose **prerequisites are met** ... it does **not** require
  the grammar point to have an SRS card at all," and the plan README says
  "prerequisites met — not 'already reviewed'". The shipped implementation does
  something narrower:

  ```ts
  const previousMissing = sorted.some(
      (prev) => prev.lessonNumber < entry.lessonNumber &&
                !learnedGrammarIds.has(prev.id) &&
                this.meetsPrerequisites(prev, ...));
  if (previousMissing) continue;
  ```

  `learnedGrammarIds` comes from `cardRepo.findAll("grammar")`. So an entry is
  unlocked only if **every earlier prerequisite-satisfying entry already has
  grammar cards**. For a learner with plenty of vocab but who has never taken a
  grammar lesson, the returned set is a **single** entry. The claim "does not
  require an SRS card at all" is true of the entry itself and false of the set.

  Downstream consequence nobody has priced: with 15 grammar entries total (all
  15 have a `words`-bearing canonical example, so AC2/AC3's fallback paths are
  unreachable against real data), a typical composition round has 1–3 items.
  Task 3.3 AC2 specifies an "item-count-only setup step" and AC5 covers zero
  eligible — but there is **no criterion for the far more common middle case**:
  the learner asks for 10 and gets 1, with `sampleWithoutReplacement`'s clamp
  silently shortening the round. The original plan had a partial-pool-exhaustion
  AC for exactly this; phase 3 lost it.
- **Recommendation**: Correct CONTEXT.md's description of
  `getUnlockedGrammarPoints` to state the `previousMissing` gate. Add to 3.3:

```
- Test: composition setup states the true eligible count
  Given: exactly 2 unlocked grammar points with usable tile data
  When: Sentence Composition mode is selected
  Then: the item-count hint reads "1 to 2", and requesting 10 is rejected
        before start rather than silently producing a 2-item round
  Type: integration
  Priority: high
```
  And add a fallback-path note to 3.1: AC2 and AC3 describe shapes that do not
  occur in `grammar.json` today (all 15 canonical examples carry `words`), so
  they are fixture-only guards. That is fine — but say so, or an executor will
  assume they are exercised in production.

### Finding P-9: `kind`-less back-compat is never tested against a real persisted payload

- **Severity**: major
- **Description**: You asked me to scrutinize this specifically. As written, it
  is **not** tested against a real legacy shape:
  - Task 3.2 AC4 asserts on `list()` over a `JsonStore` double. `InMemoryJsonStore`
    applies no shape guard, so the fixture never passes through the code that
    actually decides whether a real user's blob is readable
    (`isGameHistoryEntryArray`, exercised only by `LocalStorageJsonStore`).
  - Task 3.3 AC6 asserts `GameHistoryList` renders a legacy entry — a
    prop-level fixture, again bypassing storage entirely.
  - Neither seeds `localStorage["thai-srs-game-history"]` with the literal
    JSON string a shipped build wrote. That string is the actual input.
  - AC4's phrasing — *"returns it as `kind: "practice"` (or an equivalent that
    every consumer treats identically to an explicit `"practice"`)"* — is a
    vague assertion. "An equivalent" is unfalsifiable; any behavior can be
    argued into it. It should name the observable outcome.

  Combined with P-1, the realistic sequence for an existing user is: the
  legacy entries are fine, the first composition round writes a pools-less
  entry, and the next read discards everything.
- **Recommendation**: Rewrite AC4 to name the value, and add a payload-level
  criterion to 3.2 or 3.3:

```
- Test: a real shipped-format history blob survives the schema change
  Given: localStorage["thai-srs-game-history"] seeded with the literal JSON
         string a pre-`kind` build wrote, e.g.
         '[{"id":"e1","playedAt":"2026-09-01T10:00:00.000Z","pools":["script"],
            "itemCount":4,"summary":{"ratingCounts":{"1":0,"2":1,"3":0,"4":2,"5":1},
            "ratedCount":4,"accuracy":75}}]'
  When: GamePage is rendered inside the REAL AppProvider
  Then: "Symbols · 4 items" and "75%" are shown; "history is unavailable"
        is absent
  Type: integration
  Priority: critical
```
```
- Test: a composition round does not evict legacy entries
  Given: the seed above, real AppProvider
  When: a full composition round is played and the learner returns to setup
  Then: both the legacy entry and the new composition entry are listed
  Type: integration
  Priority: critical
```

### Finding P-10: The optional grammar provider creates an untested "never asked" state that renders identically to "asked, found nothing"

- **Severity**: major
- **Description**: Task 3.2 makes the constructor parameter optional:
  `unlockedGrammarPoints?: () => readonly GrammarEntry[]`, explicitly "so every
  existing construction site (and every existing test) keeps compiling
  unchanged." That is exactly the problem. `renderWithApp`'s `makeAppValue`,
  `makeGame`, and `makeFixedRoundGame` all construct `PlayGameUseCase` with two
  arguments, so **every `renderWithApp`-based test in phase 3 runs with the
  provider absent** — and no AC says what `startCompositionRound` does then.

  There are three states here and the plan names one:
  - never asked — no provider wired (a wiring bug, or a test harness);
  - asked, found nothing — provider returned `[]` (a genuinely locked learner);
  - asked, it failed — `getUnlockedGrammarPoints()` throws (it dereferences
    `this.grammarData` and `cardRepo.findAll`, and is called fresh per round).

  Task 3.3 AC5 covers only the middle one. If the provider-absent path returns
  `[]`, a real wiring regression in `AppContext.tsx` presents to the user as
  "you haven't unlocked any grammar yet" — permanently, and with a green test
  suite, because the tests are in that same state.
- **Recommendation**: Make the parameter **required** and update the three
  harness factories (this is a smaller change than the plan assumes — those
  three call sites are all in one file), or add:

```
- Test: a missing unlocked-grammar provider is not an empty result
  Given: a PlayGameUseCase constructed without the provider
  When: startCompositionRound(5) is called
  Then: it throws a named error (or Sentence Composition mode is not offered
        at all) — it does not return [] and it does not render the same
        "no grammar unlocked yet" message a locked learner sees
  Type: unit
  Priority: high
```
  Generalizing the counting check across the plan: phase 3's tasks read three
  resources (unlocked grammar points, grammar example tile data, the persisted
  history blob) and name a failed read for **zero** of them. Phase 1 reads two
  (sentence cards, `SentenceEntry` data) and names one failure-ish state (1.1
  AC6, card with no matching entry). Phase 2 reads two (`toneIdentification`
  cards, `VocabEntry` audio) and names zero failures. Every phase is short at
  least one criterion of the form *"a failed read renders its reason, distinct
  from an empty result."*

### Finding P-11: `prioritizeWeakItems` × the new kinds is unspecified and untested

- **Severity**: medium
- **Description**: `GameItemSelectionService.weightOfFor` builds weights via
  two private helpers no task mentions:
  - `itemKeyOfCard` returns `null` for anything that is not a
    `ScriptPropertyCard` or `VocabCard` — so a `SentenceReviewCard` contributes
    no stats;
  - `itemKeyOfContent` is a two-way ternary
    (`content.kind === "symbol" ? … : \`word:${content.thaiWord}\``). Adding
    `"sentence"` makes `.thaiWord` a type error, so the executor *must* touch
    it — with no guidance on what to return. Adding `"tone"` does **not**, since
    tone content has a `thaiWord`; it will silently key as `word:…`.

  The fallback for an unkeyed item is a hardcoded `1`. A never-reviewed
  card-backed item scores `itemWeight(NEUTRAL_STATS)` = `1 + (3.0 − 2.5) + 0` =
  **1.5**. So with "Prioritize weak items" checked and Symbols + Sentence
  Reading both selected, sentence items are drawn at 2/3 the rate of a
  freshly-introduced symbol and the same rate as a fully-mastered one —
  quietly, with no decision recorded and no test. Tone items inherit whatever
  the executor's `itemKeyOfContent` edit happens to do.
- **Recommendation**: State the intended behavior in 1.1 and 2.1's
  Architectural Decisions (I would suggest: sentence items are weighted from
  their `SentenceReviewCard` stats via an extended `itemKeyOfCard`, or
  explicitly excluded from weighting with a stated reason; tone items
  deliberately share the word's weight key). Add to 1.1:

```
- Test: weak-item weighting is defined for sentence items
  Given: one heavily-lapsed symbol card and one sentence card, both eligible,
         a seeded RandomSource
  When: selectRound({pools:["script","sentence"], itemCount:1,
                     prioritizeWeakItems:true}) is run over a fixed seed sequence
  Then: the drawn item matches the exact expected sequence for the documented
        weighting rule
  Type: unit
  Priority: medium
```

### Finding P-12: The structural SRS-isolation claim in `PlayGameUseCase` is weakened by the grammar provider and is not restated

- **Severity**: medium
- **Description**: `PlayGameUseCase`'s class doc comment (and CONTEXT.md's
  restatement) says: *"No `CardRepository` is ever received here ... There is
  therefore no code path through this use case that could ever call
  `CardRepository.save`: the SRS-isolation guarantee is structural, not merely
  a rule nobody happens to break."* Task 3.2 wires in `() =>
  grammarService.getUnlockedGrammarPoints()`. `GrammarService` holds a
  `CardRepository` and has `startLesson()`, which calls `cardRepo.saveAll`. The
  guarantee is still *behaviorally* true (the closure exposes one read method)
  but is no longer structural in the sense the comment claims, and neither
  CONTEXT.md nor 3.2's Architectural Decision acknowledges the change.

  The end-to-end byte-identity AC (3.3 AC4) does cover the behavior, and I
  verified `StorageCardRepository.findAll` performs no writes. So this is a
  documentation-accuracy and future-regression concern, not a live bug.
- **Recommendation**: Have task 3.2 update the doc comment to the narrower,
  still-true claim ("this class receives no `CardRepository` and no service
  method that writes one; the grammar provider is a nullary read"), and add a
  cheap unit guard: *`startCompositionRound` over a `CardRepository` spy
  records zero `save`/`saveAll` calls* — the fast counterpart to the
  whole-blob integration proof.

### Finding P-13: Phase 3's stated end-to-end criterion has no corresponding task AC

- **Severity**: minor
- **Description**: The phase-3 README's end-to-end criterion is "a full
  composition round played through the real page, reaching a summary **and a
  correctly-typed history entry**." Task 3.3's ACs cover the organism (AC1),
  the setup step (AC2), dispatch (AC3), SRS isolation (AC4), the empty state
  (AC5), and history *rendering* (AC6) — none assert that finishing a
  composition round through `GamePage` writes an entry with `kind:
  "composition"`. This matters because `GamePage.handleRate` currently calls
  `game.saveHistory({ pools, itemCount: items.length }, roundSummary)` with the
  practice-mode `pools` closed over; in composition mode it must call the other
  signature, and nothing checks it.
- **Recommendation**: Add to 3.3: *Completing a composition round through the
  page produces exactly one history entry that renders with the composition
  label, and no entry carrying a pool label.*

### Finding P-14: The Trust Boundary omission is now marginally under-justified

- **Severity**: minor
- **Description**: The README reuses the original plan's omission rationale. It
  is mostly still right — no new network, file, CLI, or IPC input. But the one
  boundary it does name, `GameHistoryEntry` gaining `kind`, is downgraded to
  "an explicit backward-compatibility criterion ... not a security control,"
  and P-1 shows the deserialization guard for that boundary is exactly where
  this plan breaks. `LocalStorageJsonStore` + `isGameHistoryEntryArray` is a
  real trust boundary (an externally-editable blob crossing into typed domain
  objects), it is being modified by this plan in two phases, and the
  modification is invisible to `tsc`.
- **Recommendation**: Keep the omission for network/file/CLI/IPC, but add one
  row for the `thai-srs-game-history` deserialization boundary naming its
  guard function, the two new accepted shapes (`pools` containing
  `"sentence"`; `pools` absent when `kind === "composition"`), and the rule
  that widening `GameCardPool` must widen `GAME_CARD_POOLS`.

### Finding P-15: Partial-tone words reveal an incomplete syllable set

- **Severity**: minor
- **Description**: `VocabCardGenerator` filters `word.syllables` to those with
  a non-null, non-empty `tone` before storing them on the card. In the shipped
  `vocabulary.json`, 17 words have *some* syllables with a tone and some
  without. For those, the card's `syllables` array is a strict subset of the
  word's, so task 2.3 AC1's "reveals each syllable's tone" will display a
  reveal whose syllable texts do not reconstruct `thaiWord` — for a challenge
  whose whole premise is "identify the word's *whole* tone pattern." Task 2.1
  AC2 covers the zero-syllable case only.
- **Recommendation**: Add to 2.1 or 2.3:

```
- Test: a partially-toned word's reveal is honest about coverage
  Given: a toneIdentification card whose syllables cover 2 of the word's 3 syllables
  When: the learner reveals
  Then: the two toned syllables are shown with their tones, and the reveal does
        not imply it is the complete word (exact expected text asserted)
  Type: unit
  Priority: low
```

### Finding P-16: Two small robustness/flakiness items in task 3.1

- **Severity**: minor
- **Description**: (a) The Description says to use "the example at
  `cards.application.correctExample`'s index". The shipped
  `GrammarCardGenerator` writes this as `entry.examples[idx]` followed by
  `correctExample?.words` — the optional chaining is there because the index
  can miss. Task 3.1's ACs cover "canonical has no `words`" (AC2) and "no
  example has `words`" (AC3) but not "index out of range", where a
  non-defensive `examples[idx].words` throws. (b) AC1's wording, "tiles are a
  shuffled permutation," invites `expect(tiles).not.toEqual(correctOrder)`.
  Two of the fifteen real entries (`adj-predicate`, `polite-particles`) have
  exactly 2 tiles, where a uniform shuffle equals the original half the time.
  AC5's exact-seeded-permutation assertion is the right shape; AC1 should
  defer to it rather than invite an independent, flaky one.
- **Recommendation**: Add an out-of-range guard AC (*an entry whose
  `correctExample` index exceeds `examples.length` falls back to the first
  `words`-bearing example rather than throwing*), and restate AC1 as "tiles are
  a permutation of `correctOrder` — same multiset, order asserted only under
  AC5's seed."

## Plan Quality Findings

| # | Check | Phase | Task | Severity | Issue | Recommendation |
|---|-------|-------|------|----------|-------|-----------------|
| 1 | Coverage gap | 1, 3 | 1.1/1.2, 3.2 | critical | `isGameHistoryEntry`'s hardcoded `GAME_CARD_POOLS` and required `pools` reject both new entry shapes; `tsc` and every `InMemoryJsonStore`-based test miss it | P-1: own the file, derive the pool list, add a real-`AppProvider` round-trip AC |
| 2 | YAGNI / data reality | 1 | 1.3 | critical | `SentenceListeningChallenge` is built for content that does not exist — all 55 sentences have `thai_audio_file: null` | P-2: cut it or mark it dormant; add the audio-less reading-reveal AC |
| 3 | Internal contradiction | 2 | 2.2 vs 2.1 | major | 2.2 says put `ToneGameItemSource` in the `sources` array, which the `pools.includes(source.pool)` filter makes contradict 2.1 AC4 | P-3: dedicated constructor slot; state that it does not implement `GameItemSource` |
| 4 | Dependency/ordering | 2, 3 | 2.1, 3.1 | major | Both `depends_on: ["1.1"]`, both `cover` `types.ts`; the phase-level serialization the READMEs claim is not in the machine-readable field | P-4: `3.1 → 2.3`, `2.1 → 1.3`; fix both phase README tables |
| 5 | Missing regression AC | 1 | 1.3 | major | No AC pins the default checked pools; a shipped test and a documented rationale exist for "Symbols only" | P-5 |
| 6 | Third state | 1 | 1.3 | major | Zero pools checked is deliberately collapsed into "nothing eligible" — "never asked" rendered as "asked and found nothing" | P-5: separate message, own AC |
| 7 | Coverage gap | 1 | 1.3 | major | `EMPTY_POOL_MESSAGES`/`POOL_CHOICE_LABELS`/`DEFAULT_POOL_CHOICE` are keyed by the type being deleted; no successor specified | P-5 |
| 8 | Flakiness / correctness risk | 1 | 1.3 | major | A derived `pools` array breaks the stable-reference assumption behind the existing `useMemo`/`useEffect`/`useCallback` deps | P-5: add the count-preservation AC |
| 9 | Coverage gap | 2 | 2.3 | major | `countEligibleItems` is not threaded with `includeTonePractice`; the cap and empty-state branch ignore tone items | P-6 |
| 10 | Test infrastructure | 1, 2, 3 | 1.3, 2.3, 3.3 | major | `renderWithApp` lacks sentence/tone/graduated-vocab fixtures and is in no task's `covers`, while CONTEXT.md forbids a second harness | P-7; re-weight 3.3 |
| 11 | Factual accuracy | 3 | CONTEXT.md, 3.1 | major | `getUnlockedGrammarPoints` also gates on earlier entries having grammar cards; the "no SRS card required" claim is only half true | P-8 |
| 12 | Missing third state | 3 | 3.3 | major | No criterion for "asked for 10, 1 eligible" — the common composition case | P-8 |
| 13 | AC testability / vague assertion | 3 | 3.2 AC4 | major | "or an equivalent that every consumer treats identically" is unfalsifiable | P-9: name the observable value |
| 14 | Test realism | 3 | 3.2, 3.3 | major | Back-compat is proven only against idealized fixtures through guard-less stores, never a real persisted string | P-9 |
| 15 | Third state | 3 | 3.2, 3.3 | major | Provider-absent (never asked) is indistinguishable from provider-returned-`[]` (found nothing), and every harness is in the absent state | P-10 |
| 16 | Undocumented decision | 1, 2 | 1.1, 2.1 | medium | `prioritizeWeakItems` behavior for sentence/tone items is neither decided nor tested; unkeyed items silently weight 1.0 vs 1.5 | P-11 |
| 17 | Architectural claim erosion | 3 | 3.2 | medium | The "structural, not a rule" SRS-isolation comment is no longer literally true once a `GrammarService`-backed closure is held | P-12 |
| 18 | Phase criterion unmet | 3 | 3.3 | minor | The phase's own e2e criterion mentions a correctly-typed history entry; no task AC asserts it through the page | P-13 |
| 19 | Trust boundary | — | README | minor | The one boundary the omission names is exactly where the plan breaks, and the guard change is `tsc`-invisible | P-14: one row for the history-blob guard |
| 20 | Edge case | 2 | 2.1/2.3 | minor | Partially-toned words (17 in real data) reveal a subset of syllables for a "whole tone pattern" self-check | P-15 |
| 21 | Robustness | 3 | 3.1 | minor | `examples[correctExample]` can be out of range; the shipped generator guards it with `?.`, this task does not | P-16 |
| 22 | Flakiness risk | 3 | 3.1 AC1 | minor | "shuffled permutation" invites a `not.toEqual` that is 50% flaky for the two 2-tile entries | P-16: defer ordering to AC5's seed |
| 23 | Behavioral AC | 1 | 1.2 AC3 | suggestion | "no existing wiring line changes" is a diff property, not behavior; `ac_enforcement` honestly says "none" | Acceptable as-is (matches the shipped plan's precedent), but prefer "a symbols-only round selected through the fully-wired service returns only symbol items" |
| 24 | Assertion quality | 1 | 1.1 AC3 | suggestion | "across a seeded run long enough to be conclusive" is not a definite stopping rule | Restate as an exact seeded sequence, matching AC4's own form |

## Phase-by-Phase Review

### phase-1-sentence-reading

#### task-1.1-sentence-domain-model-and-source.md: Sentence domain model + item source

- **Status**: findings
- **Findings**:
  - The union extension and `SentenceGameItemSource` design are sound and
    genuinely additive; AC2 (content from `SentenceEntry`, proven with two
    differently-propertied cards) and AC6 (card with no matching entry
    excluded) are the right shape and directly reuse the original plan's
    hardest-won lesson. AC5's "existing cases pass unmodified" is a good
    mutation guard.
  - **P-1**: `StorageGameHistoryRepository`'s guard is not in this task's
    `covers` and will reject the entries this pool produces.
  - **P-2**: `SentenceChallengeDirection = "listening" | "reading"` models a
    50/50 split for a dataset in which the listening branch is unreachable.
    AC3 and AC4 are individually correct but jointly describe randomness that
    never happens.
  - **P-11**: extending `GameItemSelectionService` also forces a decision in
    `itemKeyOfContent`/`itemKeyOfCard` for weighting, which this task does not
    mention.
  - AC3's "across a seeded run long enough to be conclusive" is looser than
    AC4's exact-sequence form two lines below it; make both exact.

#### task-1.2-wire-sentence-rounds.md: Wire sentence rounds through PlayGameUseCase

- **Status**: findings
- **Findings**:
  - Correct and genuinely mechanical. AC1's collision requirement is the right
    black-box statement, and the `kind`-prefix rationale in `itemKeyOf`'s doc
    comment supports it.
  - AC3 is a diff property rather than a behavior, and `ac_enforcement`
    honestly declares no automated enforcement. This matches the shipped
    plan's precedent so I would not block on it — but a one-line behavioral
    substitute is cheap: *a symbols-only round selected through the
    fully-wired service still returns only symbol items.*
  - This is the natural home for P-1's storage-guard fix if 1.1 does not take
    it.

#### task-1.3-sentence-challenge-organisms-and-multiselect.md: Sentence challenge organisms + multi-select pool picker

- **Status**: findings
- **Findings**:
  - AC5 (SRS byte-identity for a sentence-only *and* a mixed round through the
    real `AppProvider`) is exactly right and correctly refuses to inherit the
    original plan's proof. The no-write-input Architectural Decision is well
    reasoned and correctly cites the `RatingButtons` global-keydown
    constraint.
  - **P-5** (four sub-items: default selection, `EMPTY_POOL_MESSAGES`,
    zero-pools-vs-zero-eligible, unstable `pools` reference) is the bulk of the
    risk here. The refactor touches more of the shipped page than the task
    describes.
  - **P-2**: AC2 tests an organism that cannot render in production; AC3
    tests an audio reveal that has no audio.
  - **P-7**: AC1/AC5/AC6 all need sentence-card fixtures the harness does not
    have, and the harness is not in `covers`.
  - The instruction to "adapt" existing tests is right in spirit but needs the
    explicit carve-out that the radio-mutual-exclusion keyboard test must be
    replaced — "adapting" it produces a test that asserts nothing.
  - AC7 is safe: `GameHistoryList.POOL_LABELS` is `Record<GameCardPool,
    string>`, so widening `GameCardPool` *is* caught by `tsc`. (This is the
    one place widening is caught — which makes P-1's silent case more
    surprising, not less.)

### phase-2-tone-identification

#### task-2.1-tone-domain-model-and-source.md: Tone domain model + item source

- **Status**: findings
- **Findings**:
  - I verified the premise: `VocabCardGenerator` does emit a
    `toneIdentification` card gated on `toneSyllables.length > 0`, `VocabCard`
    does expose `syllables` as a public readonly field, `promptWord` is
    `word.thai` for this property, and the card carries no `audioUrl`. The
    Architectural Decision's narrow-exception reasoning is correct and
    correctly bounded ("the *one* property whose entire purpose is the content
    needed"). AC3's card-vs-data split for audio is a good catch by the
    planner.
  - AC6 (single-literal `challengeDirection`, never randomized) is a sound
    mutation guard.
  - **P-3**: this task's design (a dedicated slot threaded by
    `includeTonePractice`) is right, and task 2.2 contradicts it. Say
    explicitly here that `ToneGameItemSource` does **not** implement
    `GameItemSource` and must not be added to the `sources` array.
  - **P-15**: AC2 covers "no card at all" but not the partial-syllable card.
  - **P-11**: tone content carries `thaiWord`, so `itemKeyOfContent`'s ternary
    will silently key tone items as `word:…` with no error and no decision.

#### task-2.2-wire-tone-items.md: Wire tone items through PlayGameUseCase

- **Status**: findings
- **Findings**:
  - **P-3** is the whole finding: the `AppContext.tsx` instruction is wrong
    given the shipped `eligibleContent` filter and will silently break 2.1's
    AC4. AC2 ("`includeTonePractice: true` produces tone items through the full
    `startRound` call") would catch it only if the fixture has vocab
    *unchecked*; as written a fixture with vocab in `pools` passes while the
    feature is broken. Pin the fixture: `pools: ["script"]`.
  - AC1's collision requirement is correct and important — a word item and a
    tone item for the same Thai word genuinely can co-occur, and
    `recordRating` de-dupes on `itemKey`, so a collision would silently
    undercount the round.

#### task-2.3-tone-organism-and-toggle.md: Tone identification organism + setup toggle

- **Status**: findings
- **Findings**:
  - AC2 (no-audio item constructs no `Audio`) and AC5 (byte-identity with
    `toneIdentification` cards seeded) are both well chosen; AC6's "distinct
    explanatory state, not a silently short round" is exactly the empty-state
    discipline the plan should have everywhere.
  - **P-6**: the item-count cap and the empty-state branch both flow through
    `countEligibleItems`, which no AC threads `includeTonePractice` into. The
    zero-pools-plus-tone-only state is currently a false "nothing eligible."
  - **P-7**: AC5 needs `vocabCards` seeded with `syllables` in the real blob;
    the harness has no factory for it.
  - Minor: the toggle's label is written as "Prioritize tone identification"
    in `ac_enforcement` AC3 but as "Tone Identification" in the phase README
    and "the tone toggle" elsewhere. Since the shipped tests select controls by
    accessible name, pick one string and state it — this is a real
    executor-blocking ambiguity, not a style point. ("Prioritize" is also
    misleading: it does not prioritize anything, it adds a source.)

### phase-3-sentence-composition

#### task-3.1-composition-selection.md: Composition selection over unlocked grammar points

- **Status**: findings
- **Findings**:
  - The strongest-designed task in the plan. Taking `readonly GrammarEntry[]`
    as a plain argument instead of calling `GrammarService` makes it testable
    with zero repository fixtures, and the "not a `GameItemSource`" decision is
    correctly argued (the interface's `pool` field is a claim this selection
    cannot make). AC4 (zero entries → empty, not a throw) and AC5 (exact seeded
    permutation) are right.
  - **P-4**: `depends_on: ["1.1"]` puts this on `types.ts` concurrently with
    2.1.
  - **P-8**: AC2 and AC3 describe fallback paths that do not occur in the real
    `grammar.json` (all 15 canonical examples carry `words`). Fine as guards —
    but say so, so nobody reads them as production behavior.
  - **P-16**: out-of-range `correctExample` index; AC1's flakiness-inviting
    wording for the two 2-tile entries.

#### task-3.2-wire-composition-rounds.md: Wire composition rounds through PlayGameUseCase + history schema

- **Status**: findings
- **Findings**:
  - The discriminated-union schema with `kind?: "practice"` is correct TypeScript
    (narrowing on the optional discriminant works, and reading `entry.pools`
    without narrowing becomes a compile error, which is a genuine safety win).
    AC5 (practice then composition on one instance) is a good state-leak guard
    given the `savedSummaries` `WeakSet`.
  - **P-1**: `CompositionHistoryEntry` has no `pools`, and this task covers
    `StorageGameHistoryRepository.ts` without a single AC about its shape
    guard. AC3 as written ("the persisted entry has `kind: "composition"` and
    no `pools` field") can be satisfied entirely on the write side while the
    read side is broken.
  - **P-9**: AC4's "or an equivalent" hedge, and no test against a real
    persisted string.
  - **P-10**: the optional provider's absent state.
  - **P-12**: the `GrammarService`-backed closure vs. the class's structural
    isolation claim.
  - `ac_enforcement` says "AC6 -> none" with no rationale, unlike 1.2 AC3 which
    explains itself. Add the one-line reason.

#### task-3.3-composition-organism-and-mode-switch.md: Composition organism + mode switch

- **Status**: findings
- **Findings**:
  - AC1's "no auto-graded verdict anywhere" is the right behavioral statement
    of the reuse-the-pattern-not-the-grading decision, and AC6's three-way
    render comparison (composition vs. practice vs. legacy-no-`kind`) is
    exactly the right shape for the back-compat rule at the UI layer. AC4's
    seed including grammar, vocab, *and* sentence cards is a correct refusal to
    inherit phase 1/2's isolation proofs.
  - **P-7**: AC4 and AC5 require constructing genuine unlock state
    (graduated vocab by `word_class` against the real `vocabulary.json`, plus
    `applicationTemplate` function words graduated). The `large`/8 weight does
    not reflect this; the original plan re-weighted its analogous task to
    `x-large`/13 for less.
  - **P-8**: no criterion for the short-round case, which will be the norm.
  - **P-13**: the phase's e2e criterion mentions a correctly-typed history
    entry; no AC here asserts it. `handleRate` currently hardcodes the
    practice-shaped `saveHistory` call.
  - **P-1/P-9**: AC6 exercises `GameHistoryList` at the prop level, so it
    cannot see the storage-guard rejection.
  - Worth stating in the Description: `GameHistoryList.poolsLabel` falls back
    to `POOL_LABELS.script` ("Symbols") for a pools-less entry, so a
    composition entry rendered without a `kind` check will silently label
    itself "Symbols". AC6 covers this, but the executor should be warned that
    the failure mode is a *plausible wrong label*, not a crash.

## Summary Statistics

- Tasks reviewed: 9 (plus 3 phase READMEs, the plan README, and CONTEXT.md)
- Plan-level findings: 16 (P-1 … P-16)
- Quality-table rows: 24
- Findings by severity: **critical 2** (P-1, P-2) · **major 8** (P-3, P-4, P-5,
  P-6, P-7, P-8, P-9, P-10) · **medium 2** (P-11, P-12) · **minor 4** (P-13,
  P-14, P-15, P-16)
- Tasks rated pass: 0 · findings: 9

### Minimum suite that should block deployment

1. Real-`AppProvider` history round trip after a round in each new mode
   (P-1) — the only test that exercises `isGameHistoryEntryArray`.
2. Real-persisted-string legacy-history test (P-9).
3. The three SRS byte-identity proofs already specified (1.3 AC5, 2.3 AC5,
   3.3 AC4), which are correctly scoped per pool.
4. `includeTonePractice: true` with `pools: ["script"]` through the fully-wired
   selection service (P-3).
5. Default-checked-pools and zero-pools-checked assertions (P-5).

### On E2E infrastructure

`renderWithApp` plus the real-`AppProvider` pattern is the right and only
available e2e seam (there is no Playwright setup in this repo), and it is
sufficient for everything above — provided P-7's fixture work is actually
scheduled into a task rather than discovered by an executor mid-phase.
