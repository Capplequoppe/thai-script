# Systems Architect Review: practice-mode-expansion

## Executive Summary

The plan is unusually well-grounded — it reads the shipped code, restates the
prior review's lessons, and documents its rejected alternatives — but three of
its load-bearing structural claims do not survive contact with the actual
source. `GameItemSource` is keyed on `GameCardPool`, so tone identification
cannot be "one more source in the array" *and* be independent of the pool
checkboxes (tasks 2.1 and 2.2 contradict each other and contradict 2.1's own
AC5); the persisted-history shape guard (`isGameCardPool`/`isGameHistoryEntry`
in `StorageGameHistoryRepository.ts`) is a hand-maintained duplicate of
`GameCardPool` that no phase-1 task covers, so the first sentence round a real
person plays silently wipes their entire game history; and the tone
"narrow exception" is already wider than its own stated boundary (it reads
`promptWord`, the exact field the shipped doc comments name as unsafe),
buys nothing (the source already injects `VocabEntry`, which carries the same
tone data), and is unsafe against vocab cards persisted before `syllables`
existed (commit `4a3829c`).

On the panel's framing questions: the `"sentence"`-as-pool vs. tone-as-flag
split is a *coherent domain distinction* (a pool is a `CardRepository`
partition; tone is a different challenge over an existing partition) that is
made *incoherent by the current abstraction*, which has no way to express a
non-pool-keyed source — the missing unification is inverting
`GameItemSelectionService`'s filter so each source decides whether a config
includes it. Not implementing `GameItemSource` for composition is the right
call, but for the wrong stated reason, and the plan then undoes it by folding
`CompositionItemContent` into `GameItemContent` — which *is* that interface's
return type.

## Plan-Level Findings

### Finding P-1: `GameItemSource` is keyed on `GameCardPool`, so tone identification cannot be wired the way tasks 2.1 and 2.2 both describe

- **Severity**: critical
- **Description**: The shipped selector is
  `this.sources.filter((source) => pools.includes(source.pool)).flatMap(...)`
  (`GameItemSelectionService.eligibleContent`), and `GameItemSource` declares
  `readonly pool: GameCardPool` as its only selection key. Task 2.2 says to
  "construct `ToneGameItemSource` ... and add it to `GameItemSelectionService`'s
  sources array." Task 2.1 says tone content is added "regardless of which
  `pools` are selected." Both cannot be true of the shipped filter. Any
  `ToneGameItemSource` placed in `sources` must declare a `pool`; the only
  legal value describing its cards is `"vocab"`, which means checking **Words**
  would inject tone items even with `includeTonePractice` false — failing 2.1's
  own AC5 ("`includeTonePractice` omitted or `false` never returns a tone
  item"). Declaring a fake pool is a Liskov violation of the interface's
  contract; declaring none is a type error. Neither task states how
  `selectRound` distinguishes the tone source from the pool sources, so the
  executor will invent an ad hoc `instanceof`/name check inside the shared
  service — exactly the accretion the original plan's task 1.1 decomposition
  was designed to prevent.
  This is also the honest answer to the panel's question 1: the *distinction*
  (pool = repository partition, tone = a different challenge over an existing
  partition) is real and non-arbitrary. What is arbitrary is that the
  abstraction only has a slot for the first kind, so the second one has to be
  smuggled past it.
- **Recommendation**: Invert the filter — make inclusion the source's own
  decision, not the service's:
  `interface GameItemSource { includedBy(config: SelectRoundConfig): boolean;
  eligibleContent(): GameItemContent[] }`, with a
  `PoolGameItemSource` base/helper implementing
  `includedBy = (c) => c.pools.includes(this.pool)` for the three real pools and
  `ToneGameItemSource.includedBy = (c) => c.includeTonePractice === true`. This
  is Open/Closed done properly: adding a fifth mode becomes *adding a file*,
  with no edit to `GameItemSelectionService` at all — the property the original
  plan claimed for this seam but only half-delivered (today, every new kind
  still forces edits to `assignDirection`, `itemKeyOfContent`, and
  `PlayGameUseCase.itemKeyOf`). If the panel prefers the smaller change, the
  minimum is: state explicitly in 2.1 that the tone source is a **separate
  constructor parameter** on `GameItemSelectionService` (not a member of
  `sources`), and delete 2.2's "add it to the sources array" sentence. Either
  way, one of the two tasks must change; as written they cannot both be
  executed.

### Finding P-2: Adding `"sentence"` to `GameCardPool` silently destroys a real person's entire game history — no phase-1 task covers the guard that enforces it

- **Severity**: critical
- **Description**: `StorageGameHistoryRepository.ts` holds a hand-maintained
  duplicate of the pool vocabulary:
  ```ts
  const GAME_CARD_POOLS: readonly GameCardPool[] = ["script", "vocab"];
  ```
  and `isGameHistoryEntry` requires
  `Array.isArray(entry.pools) && entry.pools.every(isGameCardPool)`. Widening
  `GameCardPool` to include `"sentence"` (task 1.1) does **not** produce a
  compile error here — a `readonly GameCardPool[]` annotation happily accepts a
  narrower literal array. The failure chain is: play a sentence round → save an
  entry with `pools: ["sentence"]` → next `list()` → `isGameHistoryEntryArray`
  fails on that one entry → `JsonStore.load()` returns `"corrupt"` → `list()`
  returns `{status:"unavailable"}` → the history UI shows "unavailable" → and
  the next `save()` reads `current.status !== "ok"`, treats `entries` as `[]`,
  and **overwrites the whole blob with a single entry**. Every prior round is
  gone. `npm run build` passes, `npm test` passes, `POOL_LABELS` (which *is* a
  `Record<GameCardPool, string>`, so tsc does catch it) gives the executor a
  false sense that the compiler is covering this file class. No phase-1 task
  lists `src/infrastructure/persistence/StorageGameHistoryRepository.ts` in
  `covers`, and task 1.3's AC7 exercises `GameHistoryList` against an in-memory
  fixture, never the guard. This is the same defect class the original review
  logged as SA-P5/QA-P7 (pool back-compat), re-entering through a file the plan
  did not look at.
- **Recommendation**: Add `StorageGameHistoryRepository.ts` (+ its test) to task
  1.1's or 1.3's `covers`, derive `GAME_CARD_POOLS` from a single exhaustive
  source (`const GAME_CARD_POOLS = ["script","vocab","sentence"] as const
  satisfies readonly GameCardPool[]` plus a
  `Record<GameCardPool, true>` exhaustiveness anchor so a future pool is a
  compile error), and add two ACs: (a) an entry with `pools: ["sentence"]`
  written and read back through the real `LocalStorageJsonStore` round-trips as
  `{status:"ok"}`; (b) a store whose blob fails the guard must not lose data —
  `save()` on an `unavailable` read must not overwrite the existing raw blob
  (this amplification is a pre-existing defect, but this plan is what makes it
  reachable).

### Finding P-3: `CompositionHistoryEntry` has no `pools` field, which the same guard rejects — and the `kind` back-compat rule is enforced per-consumer, not at the repository boundary

- **Severity**: critical
- **Description**: Two problems in one place.
  (a) Task 3.2's `CompositionHistoryEntry` deliberately omits `pools`.
  `isGameHistoryEntry` requires `Array.isArray(entry.pools)`. Unless the guard
  is made kind-aware, the *first composition round ever played* triggers the
  identical corrupt→unavailable→overwrite chain as P-2. Task 3.2 does list the
  repository in `covers`, but AC3 only asserts "the persisted entry has
  `kind: "composition"` and no `pools` field" — which passes when asserted
  against the store's written value and says nothing about whether it can be
  *read back*. There is no AC for a mixed store (legacy no-`kind` + explicit
  practice + composition) surviving one `list()`.
  (b) On the panel's question 5: the back-compat handling is **not** at the
  right layer. `PracticeHistoryEntry.kind?: "practice"` makes the discriminant
  *optional*, which is a weak discriminant: `entry.kind === "composition"`
  narrows correctly but `entry.kind === "practice"` is `false` for every legacy
  entry, so the natural way to write a consumer is the buggy way. Task 3.2's
  prose ("every existing read path ... must treat an entry with `kind` absent
  as practice") and task 3.3's AC6 (the same rule re-tested in
  `GameHistoryList`) are exactly the "each consumer remembers independently"
  shape the original review's JsonStore-seam finding was meant to end. The
  codebase has already leaked this responsibility to the UI once —
  `GameHistoryList.poolsLabel` defensively handles a legacy missing `pools`
  with a comment explaining why — and this plan repeats the pattern rather than
  fixing the layer.
- **Recommendation**: Normalize at the repository boundary and make the domain
  type honest: `PracticeHistoryEntry.kind: "practice"` **required**, with
  `StorageGameHistoryRepository.list()` filling in `kind: "practice"` for any
  persisted entry lacking it (the guard accepts absent-or-`"practice"`-or-
  `"composition"` and rejects any other value; a composition-shaped entry is
  validated without `pools`). Then no consumer can forget, `GameHistoryList`
  needs no legacy branch at all, and 3.3's AC6 becomes a genuine rendering
  test rather than a second copy of the compatibility rule. Add an AC in 3.2:
  a store seeded with one legacy no-`kind` entry, one explicit practice entry,
  and one composition entry returns `{status:"ok"}` with three entries, all
  `kind`-populated, most-recent-first.

### Finding P-4: The tone "narrow exception" is already broader than its stated boundary, unnecessary, unenforced, and unsafe against legacy-persisted cards

- **Severity**: major
- **Description**: Four independent problems with the panel's question 2.
  1. **Already broader than stated.** Task 2.1's Description says it "reuses
     that card's `syllables` **and `promptWord`** fields directly," while its
     own Architectural Decision defines the exception as "read the *one*
     property whose entire purpose is the content needed." `promptWord` is not
     that field — it is a generic field on all six `VocabProperty` cards, and
     it is the *specific* field `WordItemContent`'s shipped doc comment and
     `WordGameItemSource`'s `thaiWordFromCardId` comment single out as unsafe
     ("holds the Thai word for five `VocabProperty` values but the *English*
     word for `englishToThai`"). It happens to be safe for this one property,
     which is precisely how the door gets propped open: the rule as written is
     "one property," the task as written is "two fields," and the next mode
     will read the third.
  2. **Unnecessary.** `ToneGameItemSource` already injects `VocabEntry[]` (for
     audio, per AC3). `VocabEntry.syllables: SyllableInfo[]` carries `tone`,
     and `VocabCardGenerator`'s "tone-parsing logic" is literally
     `word.syllables.filter(s => s.tone !== null && s.tone !== "").map(s => ({text: s.text, tone: s.tone}))`
     (lines 142-146) — a filter and a map, not parsing. The AD's justification
     ("recomputing it would mean duplicating `VocabCardGenerator`'s own
     tone-parsing logic in a second place") overstates the cost of the
     alternative by an order of magnitude. `thaiWord` should likewise come from
     `entry.thai`, exactly as `WordGameItemSource` does.
  3. **Unsafe against real persisted data.** `syllables` was added to
     `VocabCard` recently (`4a3829c feat(vocab): extend VocabCard entity with
     mnemonic and syllables`) and cards are hydrated from stored DTOs via
     `VocabCard.fromDTO`, never regenerated. A learner who introduced vocabulary
     before that commit has cards with `property === "toneIdentification"` and
     `syllables === undefined`. Task 2.1's eligibility filter is on `property`
     alone, so those cards become tone items with no syllables — the exact
     failure mode this plan's own CONTEXT.md warns about for history entries,
     one section earlier. Sourcing from `VocabEntry` is structurally immune.
     No AC covers it.
  4. **Unenforced.** The boundary exists only in prose. Nothing prevents task
     3.x or a future mode from reading `card.question`/`card.correctAnswer`.
     Also, `VocabCard.syllables` is a **mutable** `{text,tone}[]` owned by the
     card; assigning it into a `readonly` domain item aliases card-owned state
     across a boundary that the whole SRS-isolation guarantee is about.
- **Recommendation**: Delete the exception. Source `thaiWord` and `syllables`
  from `VocabEntry`, keep the `toneIdentification` card as *eligibility only*
  (the same shape as every other source), and export the three-line
  `toneSyllablesOf(entry: VocabEntry)` helper from the vocabulary domain so
  `VocabCardGenerator` and `ToneGameItemSource` share one definition rather than
  duplicating it. If the exception is kept anyway: (a) strike `promptWord` from
  it and take `thaiWord` from `VocabEntry`; (b) add an AC that a
  `toneIdentification` card with absent or empty `syllables` is excluded from
  eligibility rather than producing an empty item; (c) copy the array
  (`[...card.syllables]`) rather than aliasing it; (d) enforce the boundary in
  `src/domain/game/architecture.test.ts` — that file already does grep-style
  structural assertions, so a rule like "no file under `domain/game` references
  `.question`, `.correctAnswer`, or `.promptWord`" is a two-line addition and is
  the difference between a documented exception and an enforced one.

### Finding P-5: Folding `CompositionItemContent` into `GameItemContent` undoes phase 3's own reason for rejecting `GameItemSource` — and putting `challengeDirection` inside the *content* types breaks a shipped invariant

- **Severity**: major
- **Description**: Two related modeling errors.
  (a) `GameItemContent` is not a general-purpose union — it is precisely
  `GameItemSource.eligibleContent()`'s return type, documented as "Content for
  one game item, **before a direction has been assigned**," and consumed by
  `assignDirection`, `itemKeyOfContent`, and `sampleWithoutReplacement`'s
  `weightOf`. Task 3.1 adds `CompositionItemContent` to it while phase 3's
  whole thesis is that composition is *not* source-produced. The result is an
  interface that now advertises a member no implementation can produce, plus
  two dead branches in central functions, plus `weightOfFor` being handed a
  content shape it can never weight. That is the interface "lying about what it
  guarantees" — the exact charge the plan levels against the rejected
  `GrammarGameItemSource`, now true of the design it chose instead. On the
  panel's question 3: the *decision* (a separate selection function) is right —
  `eligibleContent(): GameItemContent[]` genuinely cannot express prerequisite
  gating — but the plan pays the coupling cost anyway and keeps none of the
  benefit.
  (b) Tasks 1.1, 2.1 and 3.1 all declare `challengeDirection` **inside** the
  `*ItemContent` interface. The shipped code deliberately separates them:
  `SymbolItemContent` has no direction, and `SymbolGameItem =
  SymbolItemContent & { challengeDirection }`. Following the tasks literally
  makes `eligibleContent()` responsible for assigning directions, which
  contradicts task 1.1's own instruction to extend `assignDirection`.
- **Recommendation**: Model the top of the union explicitly:
  `type PracticeGameItem = SymbolGameItem | WordGameItem | SentenceGameItem |
  ToneGameItem;` `type GameItem = PracticeGameItem | CompositionGameItem;`
  with `GameItemContent` (and therefore `GameItemSource`) covering only the
  practice members. `recordRating`/`finishRound`/`GameRatingRecord` stay generic
  over `GameItem` exactly as task 3.2 wants, and `assignDirection`/
  `itemKeyOfContent` keep an input type that matches reality. Fix (b) in all
  three tasks: content interfaces carry no `challengeDirection`; the
  `*GameItem` type intersects it in, per the shipped pattern. For tone and
  composition — whose direction is a single literal — the item type can just
  fix the literal (`& { challengeDirection: "identification" }`) without either
  passing through `assignDirection` or breaking generic consumers.

### Finding P-6: `PlayGameUseCase`'s optional `unlockedGrammarPoints` has no graceful degradation — the cited precedent does not hold, and the class becomes two use cases wearing one constructor

- **Severity**: major
- **Description**: Task 3.2's AD justifies the optional constructor parameter
  by analogy to `GameItemSelectionService`'s optional `cardRepository`. The
  analogy fails on the property that matters: when `cardRepository` is absent,
  the service **degrades gracefully** — `config.prioritizeWeakItems &&
  this.cardRepository` simply falls back to uniform sampling and every caller
  still gets a correct round. When `unlockedGrammarPoints` is absent,
  `startCompositionRound` cannot do its job at all, and the plan never says what
  it does instead (throw? return `[]`? — no AC covers it). That is an optional
  dependency that a public method hard-requires: a partially-constructed object
  whose interface advertises a capability the instance may not have, which is
  the ISP/LSP smell the original review's "god-service" finding was pointing at,
  now relocated to `PlayGameUseCase`. On the panel's question 4: the class is
  still small and `recordRating`/`finishRound`/`getHistory` genuinely are shared,
  so I would not call it a god class *yet* — but it now has two constructor
  dependency sets, two `start*` entry points, two history shapes, and one
  optional dependency used by exactly one of them. That is the profile of a
  class one more mode away from being split under duress.
  Separately, the wiring `() => grammarService.getUnlockedGrammarPoints()`
  places a closure over a `GrammarService` (which holds `cardRepo` and calls
  `cardRepo.findAll("grammar")`/`findAll("vocab")`) into the class whose doc
  comment says "No `CardRepository` is ever received here ... the SRS-isolation
  guarantee is structural, not merely a rule nobody happens to break." The
  closure is the *right* shape (it grants exactly one read-only capability, not
  the repository), but the plan does not say so, and the guarantee's wording
  becomes false as written.
- **Recommendation**: Make the provider a **required** constructor parameter
  (there is exactly one construction site, `AppContext.tsx`; existing tests can
  pass `() => []`, which is a one-line change and keeps the type honest), or
  extract `PlayCompositionRoundUseCase` as a sibling sharing the rating/summary
  helpers. Either way: add an AC pinning the behavior when no unlocked points
  are available, and update `PlayGameUseCase`'s class doc comment in 3.2 to
  state the refined guarantee — "receives no `CardRepository` and no object
  capable of writing one; the grammar provider is a read-only capability,
  deliberately a function rather than the service" — so the structural claim
  stays true and reviewable.

### Finding P-7: Weak-item weighting silently stops working for the two new selectable kinds, and no task or AC touches it

- **Severity**: major
- **Description**: `GameItemSelectionService.weightOfFor` is a second,
  independent per-kind switch that the plan never mentions:
  `itemKeyOfCard` handles `ScriptPropertyCard` and `VocabCard` only (a
  `SentenceReviewCard` returns `null` → contributes no stats), and
  `itemKeyOfContent` is `content.kind === "symbol" ? ... : \`word:${content.thaiWord}\``.
  tsc will force the executor to touch `itemKeyOfContent` (`thaiWord` is absent
  on `SentenceItemContent`), and the cheapest fix that compiles is to return a
  `sentence:`/`tone:` key — at which point `weightByKey.get(...) ?? 1` quietly
  returns the neutral fallback for every sentence and tone item, because
  `itemKeyOfCard` was never taught about `SentenceReviewCard`. Result: with
  "Prioritize weak items" checked, sentence items are drawn at a flat weight
  against symbol/word items whose weights can be several times higher — the
  shipped phase-3 feature is silently defeated for the new pool, and the "should
  be unreachable" comment on the fallback becomes routinely reachable.
  Tone is worse: `weightOfFor(config.pools)` only harvests cards from the
  *requested pools*, and tone practice is deliberately not pool-gated, so with
  `pools: ["script"]` + `includeTonePractice: true` no vocab card is ever
  scanned and every tone item is stuck at weight 1 by construction.
- **Recommendation**: Add explicit ACs to 1.1 and 2.1: with
  `prioritizeWeakItems: true` and a seeded rng, a low-ease sentence card's item
  is drawn ahead of a high-ease one (mirroring the original plan's task 3.1
  sampling-bias AC), and a tone item receives a real, card-derived weight rather
  than the fallback. Extend `itemKeyOfCard` for `SentenceReviewCard`
  (`sentence:${card.sentenceId}`) in 1.1, and in 2.1 decide and document the
  tone case explicitly — either harvest vocab stats whenever
  `includeTonePractice` is set regardless of `pools`, or state in the AD that
  tone items are intentionally unweighted and assert the fallback so the
  behavior is chosen rather than inherited.

### Finding P-8: The setup screen's eligible-count path is unowned by any task, and 2.3's "distinct explanatory state" has no mechanism behind it

- **Severity**: major
- **Description**: `GamePage` derives its start-gating from
  `countEligibleItems(game, pools, prioritizeWeakItems)`, which calls
  `startRound({pools, itemCount: MAX_SAFE_INTEGER, prioritizeWeakItems,
  inputMode})`, and `countValid` requires `parsedCount <= eligibleCount`.
  Neither task 1.3 nor 2.3 mentions this function. Consequences: (a) task 2.3's
  toggle must be threaded into `countEligibleItems` or the eligible count
  excludes every tone item — the learner checks the toggle and cannot request
  more items than the pools alone supply, and with pools deselected the count is
  0 so start is blocked outright even though tone items exist (contradicting
  2.1's AC4, which is the whole point of the feature); (b) task 1.3 replaces
  `PoolChoice` but the count-reset `useEffect` is keyed `[poolChoice]` with a
  `biome-ignore` on its dependency array — that key ceases to exist and the
  replacement is a judgment call the task does not make; (c) 2.3's AC6 asks for
  "a distinct explanatory state" when zero words carry a `toneIdentification`
  card, but the only existing mechanism is `EMPTY_POOL_MESSAGES[poolChoice]`
  keyed on a type task 1.3 deletes — there is no state to be distinct *from*
  and no task owns creating one.
- **Recommendation**: Name `countEligibleItems` and the count-reset effect
  explicitly in task 1.3's Description (with the new reset key stated), and add
  `includeTonePractice` to `countEligibleItems`'s signature in task 2.3 with an
  AC: "toggle checked, all pool checkboxes cleared, tone-eligible words present
  → start is permitted and the eligible count equals the tone-eligible count."
  Restate 2.3's AC6 against a concrete mechanism (e.g. a message rendered when
  `includeTonePractice` is set and the tone-eligible count is 0, distinct from
  the empty-pool message).

### Finding P-9: Phase 3's factual premise about `getUnlockedGrammarPoints` is wrong, and one item per grammar point makes a composition "round" a handful of items at best

- **Severity**: major
- **Description**: CONTEXT.md states that `getUnlockedGrammarPoints()` "returns
  grammar points whose prerequisites are met ... it does **not** require the
  grammar point to have an SRS card at all," and this claim is the sole stated
  justification for rejecting `GrammarGameItemSource`. The actual implementation
  (`GrammarLessonService.ts:80-114`) reads `cardRepo.findAll("grammar")`,
  builds `learnedGrammarIds`, and skips any entry for which an earlier
  prerequisite-meeting entry is *not* in that set. The returned set is therefore
  "the contiguous learned prefix plus exactly one frontier entry" — card
  existence is very much part of the test. The conclusion (a separate function)
  still stands on the *interface-contract* argument, but the plan's reason is
  not the real reason, and CONTEXT.md instructs the executor not to "fix" a
  behavior it has described incorrectly.
  The practical consequence the plan never surfaces: `selectCompositionRound`
  emits **one item per entry** (one chosen example), so the maximum round size
  equals the number of unlocked grammar points — for a learner with three
  grammar cards, a four-item ceiling; for a new learner, one. Task 3.1's AC6
  (capping) and 3.3's AC5 (zero) bracket the degenerate ends but nothing states
  that a "round" here is structurally tiny, and `GrammarEntry.examples` is an
  array from which the function deliberately picks only one.
- **Recommendation**: Correct CONTEXT.md's description of
  `getUnlockedGrammarPoints` (it is prerequisite-gated **and** learned-prefix-
  gated) and restate 3.1's AD to rest on the interface-contract argument alone
  — which is sound on its own. Then decide the supply question explicitly in
  3.1: either emit one item per *example carrying `words`* (raising the ceiling
  to `Σ examples`, and making the canonical-example pointer a preference rather
  than a filter), or keep one-per-entry and state the ceiling in the phase
  README's capability description so the setup screen's item-count input is
  designed against reality.

### Finding P-10: Task-level `depends_on` values contradict the phase-level serialization the plan added them for

- **Severity**: minor
- **Description**: Phase 3's README explains at length that `depends_on: ["2"]`
  exists specifically so that phase-2 and phase-3 tasks editing
  `types.ts`/`PlayGameUseCase.ts`/`GamePage.tsx` are never concurrent-eligible
  (citing `plan check`'s `covers_overlap` finding). Task 3.1's frontmatter then
  declares `depends_on: ["1.1"]` — a phase-1 task — while its `covers` includes
  `src/domain/game/types.ts`, which task 2.1 also edits. If task-level
  `depends_on` is authoritative for eligibility, 3.1 becomes eligible the moment
  1.1 lands, concurrent with 2.1 on the same file, reintroducing exactly the
  overlap the phase dependency was added to remove. The phase READMEs' task
  tables also disagree with their own frontmatter (tables say "1 (phase)" for
  2.1 and 3.1; frontmatter says `["1.1"]`). This is the same finding pattern as
  the original review's SA-P12.
- **Recommendation**: Set 3.1's `depends_on` to `["2.1"]` (the last task
  touching `types.ts` before it) and 2.1's to `["1.1"]` (already correct), and
  make each phase README's task table quote the frontmatter verbatim rather than
  paraphrasing it as "1 (phase)".

### Finding P-11: Three phases add branches to the same three non-exhaustive switches, with no exhaustiveness guard

- **Severity**: minor
- **Description**: `assignDirection`, `itemKeyOfContent` (both in
  `GameItemSelectionService.ts`) and `itemKeyOf` (in `PlayGameUseCase.ts`) are
  all written as `kind === "symbol" ? A : B`, where `B` is an *implicit default*
  for "everything else." Today that default is "word." After this plan it is
  "word, sentence, tone, or composition." Type inference catches most cases by
  accident (`SentenceItemContent` has no `thaiWord`), but that is luck, not
  design — `ToneItemContent` *does* have `thaiWord`, so a mistaken tone item
  reaching `itemKeyOf`'s else-branch produces a plausible-looking `tone:...`
  key by coincidence of field naming. Relatedly, no task mentions extending
  `GameChallengeDirection` (which `GameRatingRecord.challengeDirection` is typed
  as) — it will surface as a build error mid-task rather than as planned work.
- **Recommendation**: Have task 1.1 convert all three to exhaustive `switch
  (content.kind)` with a `default: { const _never: never = content; ... }`
  guard, so phases 2 and 3 get a compile error at every site they must update
  instead of a silent fallthrough. Add `GameChallengeDirection` to 1.1's and
  2.1's Descriptions explicitly.

### Finding P-12: The Trust Boundary Inventory omission is no longer accurate

- **Severity**: minor
- **Description**: The plan README says "The one new persisted boundary —
  `GameHistoryEntry` gaining a `kind` discriminant — is handled as an explicit
  backward-compatibility criterion in phase 3." That is now two understatements.
  Phase 1 changes the *accepted value domain* of an already-persisted field
  (`pools`) that is validated by a runtime guard against an externally editable
  blob (P-2), and phase 2's tone content reads a persisted `VocabCard.syllables`
  field that may be absent in a real store (P-4.3). Both are read-side trust
  boundaries with no criterion attached.
- **Recommendation**: Extend the omission paragraph to name all three
  boundary-crossings and point each at the task/AC that covers it (after P-2 and
  P-4 are addressed). The omission of a *security* control remains correct; the
  claim about which boundaries change does not.

### Finding P-13: Fields specified to be permanently unpopulated

- **Severity**: suggestion
- **Description**: `CompositionItemContent.audioUrl?: string` is specified in
  task 3.1 with "`audioUrl` is left undefined (grammar examples carry no
  per-example audio field)." A field documented never to hold a value is
  speculative shape, and it interacts badly with the audio-on-mount conventions
  the other organisms follow (a future reader will reasonably try to play it).
- **Recommendation**: Drop `audioUrl` from `CompositionItemContent`. Same
  question for `promptGloss` vs. the existing ubiquitous language — the other
  content types call this `englishMeaning`; two names for "the English side of
  this item" in one union is a small ubiquitous-language drift worth resolving
  now.

### Finding P-14: Tone-card identification should use the same mechanism its sibling source already uses

- **Severity**: minor
- **Description**: Task 2.1 identifies tone cards by `card.property ===
  "toneIdentification"`. `VocabCard.property` is typed `string` (not
  `VocabProperty`), so that comparison has zero compile-time protection. The
  sibling `WordGameItemSource` deliberately does not read `property` at all — it
  parses the id and validates the trailing segment against a
  `ReadonlySet<VocabProperty>`, which *is* type-anchored to the union. Two
  different mechanisms for "which property is this card" inside one folder is
  avoidable inconsistency.
- **Recommendation**: Reuse the id-parse-and-validate approach (or at minimum
  anchor the literal: `const TONE_PROPERTY: VocabProperty = "toneIdentification"`)
  so renaming the property is a compile error in the game domain too.

## Plan Quality Findings

| # | Check | Phase | Task | Severity | Issue | Recommendation |
|---|-------|-------|------|----------|-------|-----------------|
| 1 | 7 AC testability | 1 | 1.2 | minor | AC3 ("`AppContext.tsx`'s change is additive only — no existing wiring line changes") has `ac_enforcement: none` and is a property of a diff, not of behavior. Same shape as 3.2's AC6. | Delete both, or restate behaviorally: a round with `pools: ["script"]` through the real `AppProvider` returns exactly what it did before the wiring change. |
| 2 | 7 AC testability | 1 | 1.1 | minor | AC3's enforcement says "across a seeded run long enough to be conclusive" — non-deterministic phrasing in a task whose AC4 is exact-sequence. | The shipped `assignDirection` spends **no** rng on audio-less items ("no randomness is spent on it"). Assert that directly: a counting rng records zero calls for an audio-less sentence, and the direction is `"reading"`. |
| 3 | 7 AC testability | 3 | 3.2 | major | AC2 ("`startCompositionRound` returns the items `selectCompositionRound` would for the same input") asserts delegation, i.e. mirrors the implementation. It passes for any wrapper, including a broken one, as long as both sides share the bug. | Restate observably: given fixture unlocked entries and a seeded rng, `startCompositionRound(3)` returns an exact, literal list of items. |
| 4 | 8 Behavioral ACs | 2 | 2.3 | major | AC6 ("a distinct explanatory state") names no observable text, state, or element, and no task creates the mechanism (see P-8). | Name the rendered message and the condition, and assign ownership of the state to 2.3's Description. |
| 5 | 8 Behavioral ACs | 1 | 1.3 | minor | AC1's "existing single-pool test coverage is preserved ... with no loss of coverage" is a reviewer instruction, not an assertion. | Enumerate which existing `GamePage.test.tsx` cases must survive by name; "no loss of coverage" is unfalsifiable as written. |
| 6 | 9 Test case quality | 3 | 3.2 | critical | No test exercises a *read-back* of a composition entry through the real guard, nor a mixed store (legacy + practice + composition) — the exact case that silently wipes history (P-3). | Add the mixed-store round-trip AC described in P-3. |
| 7 | 9 Test case quality | 1 | 1.1/1.3 | critical | Nothing tests `pools: ["sentence"]` surviving `isGameHistoryEntryArray` (P-2). AC7 exercises `GameHistoryList` against a fixture, which cannot fail this way. | Add the storage round-trip AC from P-2. |
| 8 | 9 Test case quality | 2 | 2.1 | major | No case for a `toneIdentification` card with absent/empty `syllables` (real for cards persisted before `4a3829c`). | Add it, or remove the card-read exception entirely (P-4). |
| 9 | 9 Test case quality | 1/2 | 1.1, 2.1 | major | No case combines the new kinds with `prioritizeWeakItems: true` — the shipped weighting path is untested against them (P-7). | Add the sampling-bias ACs described in P-7. |
| 10 | 10 YAGNI | 3 | 3.1 | suggestion | `audioUrl` specified as permanently `undefined`. | Drop it (P-13). |
| 11 | 10 YAGNI | 1 | 1.3 | pass | The multi-select refactor is scope beyond "add a pool", but it is genuinely forced by a third pool and the plan argues it explicitly and constrains it (preserve existing coverage). Not creep. | — |
| 12 | 11 Decisions sound | 2 | 2.1 | major | The AD's premise ("recomputing would duplicate `VocabCardGenerator`'s tone-parsing logic") is a filter+map over data the source already injects, and the AD's own boundary ("the *one* property") is contradicted by the Description's `promptWord`. | See P-4. |
| 13 | 11 Decisions sound | 3 | 3.1 + CONTEXT | major | The rejected-alternative rationale rests on a misreading of `getUnlockedGrammarPoints` (it *does* read grammar cards). | Correct the premise; the interface-contract argument alone is sufficient (P-9). |
| 14 | 11 Decisions sound | 3 | 3.2 | major | The AD's cited precedent (optional `cardRepository`) degrades gracefully; this one cannot. | See P-6. |
| 15 | 11 Decisions sound | 1/2/3 | 1.3, 2.3, 3.3 | pass | "No write-input for sentences", "toggle beside not among the pools", "no input-mode toggle for composition", "no auto-graded verdict" are all correct, well-argued, and consistent with the feature's stated self-assessment rule. | — |
| 16 | 12 Trust boundary | — | README | minor | The omission's claim about which persisted boundaries change is now incomplete. | See P-12. |
| 17 | ubiquitous language | 2 | 2.3 | minor | The toggle is called "Tone Identification" (phase README), "Prioritize tone identification" (2.3 Description and AC3 enforcement) and `includeTonePractice` (domain). "Prioritize" is borrowed from the unrelated weak-item toggle and is wrong — it includes, it does not prioritize. | Settle on one user-facing name ("Tone Identification") matching `includeTonePractice`'s meaning, in all three documents. |
| 18 | phase README precision | 1/2 | READMEs | minor | Phase 1 and phase 2 end-to-end criteria cite "task 1.3's AC" / "task 2.3's AC" without a number — the same imprecision the original review logged as Plan-Structure P-1/P-2 and had fixed. | Cite AC5 and AC5 respectively. |
| 19 | phase README accuracy | 2 | README | minor | "Would this phase stand alone? Yes — usable independent of phase 1" while 2.1 `depends_on: ["1.1"]` and 2.1's AC5 requires phase-1 sentence cases to exist. | Reword to match phase 3's more accurate formulation (capability-independent, dependency-serialized). |

## Phase-by-Phase Review

### phase-1-sentence-reading

#### task-1.1-sentence-domain-model-and-source.md: Sentence domain model + item source
- **Status**: findings
- **Findings**: P-2 (critical — `StorageGameHistoryRepository`'s
  `GAME_CARD_POOLS` guard is a hand-maintained duplicate of the type this task
  widens, is not in any `covers`, and is not caught by tsc; first sentence round
  wipes history). P-5b (`SentenceItemContent` must not carry
  `challengeDirection` — the shipped split is content-then-item). P-7 (the task
  names only `assignDirection`, but `itemKeyOfCard`/`itemKeyOfContent` in the
  same file must change too, and weighting for sentences is silently neutered if
  only the latter is patched). P-11 (convert the three ternaries to exhaustive
  switches here, so phases 2-3 get compile errors instead of fallthroughs; also
  extend `GameChallengeDirection`). Quality row 2 (AC3 determinism). Otherwise
  the task is accurate: `SentenceEntry.id`/`thai`/`english`/`thai_audio_file`
  and `SentenceReviewCard.sentenceId` are all as described, and AC6's
  stale-data-entry framing correctly reflects that `sentenceId` is a typed
  field, not a parsed id.

#### task-1.2-wire-sentence-rounds.md: Wire sentence rounds through PlayGameUseCase
- **Status**: findings
- **Findings**: Quality row 1 (AC3 is a diff-shape assertion with
  `ac_enforcement: none`). P-11 (`itemKeyOf`'s implicit else). The
  `sentence:{sentenceId}` key choice is correct and consistent with
  `itemKeyOfCard`'s prefixing rationale. Note the mechanical-wiring claim in the
  AD is accurate for this task specifically — `AppContext.tsx` already loads
  `sentenceData` at line 69.

#### task-1.3-sentence-challenge-organisms-and-multiselect.md: Sentence challenge organisms + multi-select pool picker
- **Status**: findings
- **Findings**: P-8 (`countEligibleItems` and the `[poolChoice]`-keyed
  count-reset effect — both load-bearing, neither named; the effect's key
  literally ceases to exist). P-2 (AC7 exercises `GameHistoryList` against a
  fixture and therefore cannot catch the storage-guard rejection;
  `POOL_LABELS` being a `Record<GameCardPool, string>` *will* fail the build,
  which may create false confidence that this file class is compiler-covered).
  Quality row 5 (AC1's "no loss of coverage"). AC5 is the strongest AC in the
  plan and correctly applies the original review's hardest-won lesson. The
  no-write-input AD is well argued (the `RatingButtons` global-keydown
  constraint is a real, checkable reason, not a preference).

### phase-2-tone-identification

#### task-2.1-tone-domain-model-and-source.md: Tone domain model + item source
- **Status**: findings
- **Findings**: P-1 (critical — the task's "add tone content regardless of
  `pools`" cannot be implemented through `GameItemSource`'s pool-keyed filter;
  the task must say how, and 2.2 currently says the opposite). P-4 (major — the
  exception is broader than its stated boundary, unnecessary given the injected
  `VocabEntry[]`, unenforced, and broken for pre-`4a3829c` persisted cards).
  P-5b (`challengeDirection` in the content type). P-7 (tone items are
  structurally unweightable as designed, since `weightOfFor` only scans the
  requested pools). P-14 (`property === "toneIdentification"` on an untyped
  field). Quality row 17 (naming). The claim that `toneIdentification` cards
  exist with a public `syllables` field is **verified correct**
  (`VocabCardGenerator.ts:141-160`, `VocabCard.ts:16`), as is the claim that
  they never carry audio.

#### task-2.2-wire-tone-items.md: Wire tone items through PlayGameUseCase
- **Status**: findings
- **Findings**: P-1 lands here concretely — "add it to
  `GameItemSelectionService`'s sources array" is the instruction that breaks
  2.1's AC5, because the shipped `eligibleContent` filters `sources` by
  `pools.includes(source.pool)`. One of the two tasks must be rewritten. The
  `tone:{thaiWord}` key and the collision rationale are correct and, given that
  tone is pool-independent, the collision case is not hypothetical — good catch
  by the plan.

#### task-2.3-tone-organism-and-toggle.md: Tone identification organism + setup toggle
- **Status**: findings
- **Findings**: P-8 (the toggle must be threaded into `countEligibleItems` or
  the feature is unreachable when no pool is checked — which is precisely the
  configuration 2.1's AC4 exists to enable; AC6 has no mechanism). Quality row
  4, quality row 17. AC5's real-`AppProvider` byte-identity proof is correctly
  scoped to this phase's own path rather than inherited — the plan applied the
  prior review's lesson properly here.

### phase-3-sentence-composition

#### task-3.1-composition-selection.md: Composition selection over unlocked grammar points
- **Status**: findings
- **Findings**: P-5a (major — adding `CompositionItemContent` to
  `GameItemContent` re-couples composition to the very interface the phase
  rejected, and forces dead branches into `assignDirection`/`itemKeyOfContent`
  /`weightOf`). P-9 (the AD's and CONTEXT.md's characterization of
  `getUnlockedGrammarPoints` is factually wrong; and one item per entry caps a
  round at the unlocked-point count, with `examples[]` deliberately
  under-used). P-13. P-5b. The decision to take `readonly GrammarEntry[]` as a
  plain argument rather than reaching for `GrammarService` is excellent — it
  keeps the domain function pure, testable without a `CardRepository` fixture,
  and pushes the dependency to the composition root where it belongs. The
  `cards.application.correctExample` pointer is verified real
  (`GrammarCardGenerator.ts:222-226`) and is genuinely the existing canonical
  choice, so the fallback rule is well founded.

#### task-3.2-wire-composition-rounds.md: Wire composition rounds through PlayGameUseCase + history schema
- **Status**: findings
- **Findings**: P-3 (critical — a `pools`-less entry fails
  `isGameHistoryEntry`; no AC reads a composition entry back through the guard;
  and the optional `kind?: "practice"` discriminant pushes the compatibility
  rule onto every consumer instead of normalizing at the repository boundary,
  which is the layer the original review's `JsonStore` seam established for
  exactly this). P-6 (major — the optional `unlockedGrammarPoints` parameter has
  no defined behavior when absent and no graceful degradation, unlike the
  precedent it cites; and the SRS-isolation doc comment becomes literally false
  and should be restated rather than left). P-9. Quality rows 3 and 6. AC5
  (practice then composition on one instance) is a good, non-obvious case — the
  `savedSummaries` `WeakSet` makes it worth testing.

#### task-3.3-composition-organism-and-mode-switch.md: Composition organism + mode switch
- **Status**: findings
- **Findings**: P-3 (AC6 re-tests the compatibility rule at the UI layer; after
  normalizing in the repository this becomes a pure rendering test, and the
  `GameHistoryList.poolsLabel` precedent shows what happens when this
  responsibility is left in the component). The task does not mention the
  `saveHistory` call site — `GamePage.handleRate` currently calls
  `game.saveHistory({ pools, itemCount }, ...)` unconditionally, and a
  composition round must take the other branch; AC4 exercises the path but no AC
  pins the entry's `kind` as written *from the page*. Minor SRP note: `GamePage`
  is already ~450 lines carrying `setup|playing|summary`; adding an orthogonal
  mode axis makes it a 2×3 state machine in one component — worth extracting the
  setup step per mode even though this is a presentation, not a domain, concern.
  AC1's "no auto-graded verdict anywhere" is exactly the right way to state the
  `SentenceBuilder` reuse boundary.

## Summary Statistics

- Tasks reviewed: 9 (plus 3 phase READMEs, plan README, CONTEXT.md)
- Plan-level findings: 14 — critical 3 (P-1, P-2, P-3), major 6 (P-4, P-5, P-6,
  P-7, P-8, P-9), minor 4 (P-10, P-11, P-12, P-14), suggestion 1 (P-13)
- Plan quality rows: 19 — critical 2, major 7, minor 8, suggestion 1, pass 2
- Tasks passing without findings: 0
- Tasks with critical findings: 4 (1.1, 2.1, 2.2, 3.2) — plus 1.3 and 3.3 as
  downstream carriers of P-2/P-3
