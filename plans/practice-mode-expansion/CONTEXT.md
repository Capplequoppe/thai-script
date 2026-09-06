---
doc_type: deep-dive
title: Execution context for the practice-mode expansion
description: Repo orientation, conventions, and rejected alternatives for adding sentence reading, tone identification, and sentence composition to the existing game feature.
covers:
  - src/domain/game
  - src/application/use-cases/PlayGameUseCase.ts
  - src/presentation/pages/GamePage.tsx
status: draft
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Execution context — practice-mode expansion

Extends the **already-shipped** `/game` feature (`plans/game-modes/`,
merged to `main`). **This draft was itself reviewed** (`reviews/SUMMARY.md`
in this plan) and found three critical, verified-against-shipped-source
defects, fixed below — read this file in full before writing anything.

## The existing architecture

- **`src/domain/game/types.ts`** — `GameItemContent`/`GameItem` are
  **different** unions. `GameItemContent` is exactly
  `GameItemSource.eligibleContent()`'s return type — content **before** a
  direction is assigned, produced only by sources flowing through the
  shared draw pipeline (`sampleWithoutReplacement` + `assignDirection`).
  `GameItem` is wider: `type GameItem = SourcedGameItem |
  CompositionGameItem`, `SourcedGameItem = SymbolGameItem | WordGameItem |
  SentenceGameItem | ToneGameItem` — composition never goes through the
  pipeline at all. Content interfaces never carry `challengeDirection`
  themselves; it's intersected in one level up (`SymbolGameItem =
  SymbolItemContent & { challengeDirection }`) — every new content type
  follows this split, none fold direction into content.
- **`GameItemSelectionService.ts`** — sources are pool-keyed
  (`readonly pool: GameCardPool`, selected via
  `sources.filter(s => pools.includes(s.pool))`). **A source whose
  inclusion rule isn't "this pool is checked" cannot implement
  `GameItemSource`** — tone identification is exactly this case (pool-
  independent by design), so `ToneGameItemSource` gets its **own separate
  constructor parameter**, consulted whenever `includeTonePractice` is
  set, never added to `sources`. `assignDirection` and this file's two
  weighting helpers (`itemKeyOfCard`, `itemKeyOfContent`) are two-armed
  ternaries today (`kind === "symbol" ? A : B`) — **convert all three to
  exhaustive `switch (kind)` with a `const _never: never = …` default**
  the first time this plan touches the file (task 1.1), so every later
  phase gets a compile error at the exact line it must edit instead of a
  silent fallthrough into "everything that isn't a symbol."
- **`PlayGameUseCase.ts`** — stateless; `itemKeyOf` needs the same
  exhaustiveness treatment. No `CardRepository` is ever received here —
  phase 3's grammar-unlock provider must stay a read-only capability (a
  function returning data, never an object holding a repository).
- **`GamePage.tsx`** — one page, `setup | playing | summary`. Its pool
  selector (`PoolChoice`: `"symbols"|"words"|"mix"`) is being replaced by
  a genuine multi-select — **bigger than "swap a radio for checkboxes"**:
  `EMPTY_POOL_MESSAGES`/`DEFAULT_POOL_CHOICE`/`POOL_CHOICE_LABELS` are all
  keyed by the type being deleted; `countEligibleItems` and the
  `countInput`-reset `useEffect` are both keyed off `poolChoice` and need
  a new key; and the derived `pools` array must stay a **stable
  reference** across renders (a fresh array every render breaks the
  existing memoization dependency arrays). Read the whole file first.
- **`StorageGameHistoryRepository.ts`** — **the most dangerous file in
  this plan, and not obviously related to either new feature.** It
  hard-codes `const GAME_CARD_POOLS: readonly GameCardPool[] =
  ["script","vocab"]`; its shape guard rejects the **entire stored array**
  if any one entry fails it. Widening `GameCardPool` does not make `tsc`
  catch this. Unfixed: the first Sentence Reading round writes `pools:
  ["sentence"]`; the next read fails the guard; the whole blob reports
  `unavailable`; the *next* `save()` overwrites history with just the new
  entry (`save()` reads `current.status === "ok" ? current.entries : []`).
  Composition's pools-less entries hit the identical failure. **Fix once,
  at the boundary**: derive the pool allowlist so a future pool is a
  compile error (e.g. a `Record<GameCardPool, true>` anchor, not a
  hand-maintained array), and make `kind: "practice"` **required** on the
  domain type, with this repository filling in `"practice"` for any
  entry that predates the field, on read. Same lesson as the original
  plan's own review (SA-P5/QA-P7): back-compat per-consumer is the bug
  shape; back-compat once, at the boundary, is the fix.
  `GameHistoryList.poolsLabel`'s existing defensive comment about a
  legacy missing `pools` field is evidence this already leaked to the UI
  once.
- **The `toneIdentification` `VocabProperty` already exists**
  (`VocabCardGenerator.ts`), generated only when a word has determinable
  syllable tones. **Use it for eligibility only.** Its `syllables`/
  `promptWord` fields are not a safe content source: `syllables` was
  added to `VocabCard` after this repo already had persisted
  `toneIdentification` cards (so older cards can have `syllables ===
  undefined`), and `promptWord` is the exact field already documented
  elsewhere as unsafe to read generically. Content comes from
  **`VocabEntry`** instead (`entry.thai`, `entry.syllables` filtered to
  determinable tones) — the same data `WordGameItemSource` already
  injects. Export `VocabCardGenerator`'s existing 3-line filter
  (`word.syllables.filter(s => s.tone).map(s => ({text, tone}))`) as a
  shared helper (e.g. `toneSyllablesOf(entry)`) so both call sites share
  one definition.
- **`sentence/types.ts`** — `SentenceEntry` (`thai`, `english`, `words:
  string[]`, `thai_audio_file`); `SentenceCard.sentenceId`. **Every entry
  in the shipped `sentences.json` has `thai_audio_file: null`.** The
  existing audio-gated direction rule (no audio → always `"reading"`)
  already handles this and is the permanent mechanism, not a workaround —
  future sentence audio makes `"listening"` reachable with no code
  change. Build both directions/organisms; be honest in the phase README
  and a regression test that today's data never reaches `"listening"`.
- **`grammar/types.ts`**/**`GrammarLessonService.ts`** (class
  `GrammarService`) — `getUnlockedGrammarPoints()` is prerequisite-gated
  **and** learned-prefix-gated (excludes an entry if any earlier
  prerequisite-satisfying entry has no grammar card yet). The reason
  composition doesn't implement `GameItemSource` is narrower than "no SRS
  card involved": the interface promises "eligible because a card exists
  for *this* item," and this is a set-level computation, not a per-item
  check. Practically: with few grammar cards learned, the unlocked set is
  small (often one entry), and `selectCompositionRound` emits one item
  per entry — a composition "round" is genuinely tiny for most learners.
  **Do not use `generateDynamicApplication`** (calls `Math.random()`
  directly, bakes one fixed card at lesson time) — use a `GrammarEntry`'s
  own static `examples[]`.
- **`SentenceBuilder.tsx`** — reuse its tile-tap *interaction*, never its
  auto-graded `handleSubmit`/`onAnswer(isCorrect,...)`. Composition ends
  in `RatingButtons` self-rating like everything else here.
- **Every new organism keys reset/audio-replay effects on the item's own
  identity, not `audioUrl` alone**, and resets revealed/tile state on
  item change — same rule the original plan established, still enforced
  in `GamePage.test.tsx` for symbol/word organisms (React doesn't remount
  between two consecutive same-direction items).
- **`test-utils/renderWithApp.tsx`** — reuse, don't rebuild. Today it only
  seeds script cards and one `SymbolGameItemSource`. Every task needing a
  new fixture (sentence cards, tone-carrying vocab cards, graduated-
  vocab/unlocked-grammar state) adds it here and lists this file in its
  own `covers`.

## Naming and modeling decisions

- `GameCardPool` grows by one real member: `"sentence"`. Tone
  identification is **not** a fourth member — same vocab cards `"vocab"`
  already covers, not a distinct `CardRepository` partition. Modeled as
  an additive `GameRoundConfig.includeTonePractice?: boolean`, threaded
  into everything that reasons about eligible-item counts, including
  `GamePage.countEligibleItems`.
- The setup toggle is named **"Tone Identification"** everywhere — never
  "Prioritize tone identification" (that phrasing is borrowed from the
  unrelated weak-item toggle and is misleading: this toggle includes
  items, it doesn't reorder anything).
- Sentence composition is a separate mode (a "Practice" vs. "Sentence
  Composition" switch in `GamePage`), its own item shape kept out of
  `GameItemContent` (see above). `CompositionItemContent` carries
  `englishMeaning` (matching the other content types' naming) and **no
  `audioUrl`** — grammar examples carry no per-example audio, and a field
  specified to always be `undefined` invites a future reader to try
  playing it anyway.

## `GameHistoryEntry` — `kind` is required, normalized at the repository boundary

`PracticeHistoryEntry.kind: "practice"`, `CompositionHistoryEntry.kind:
"composition"` — both **required**. `StorageGameHistoryRepository`
normalizes any persisted entry with no `kind` (everything written before
this plan) to `"practice"` **on read**, once. No other consumer
(`GameHistoryList`, `PlayGameUseCase`) needs its own copy of the back-
compat rule.

## Quality gates (unchanged)

`npm run build`, `npm test` (`npm test -- <path>` scoped), `npx biome check
.`. `src/domain/game/architecture.test.ts` already enforces no
`presentation`/`application`/`infrastructure` import from `domain/game`;
it reads source as text, so "no file under `domain/game` reads
`.question`/`.correctAnswer`/`.promptWord` off a card" is a cheap addition
worth making — after this review this plan reads no card content anywhere
except a `toneIdentification` card's mere existence.

## SRS isolation — still the plan's most important property

Playing any round — practice or composition — must leave
`localStorage["thai-srs-state"]` byte-identical. Re-prove this per new
pool this plan touches, exactly as the original plan had to re-prove it
for vocab cards after phase 1 only covered script cards. Composition's
grammar-unlock closure is a read-only capability by construction (one
read-only method) — state this in task 3.2 and narrow `PlayGameUseCase`'s
doc comment to match, rather than leaving the broader pre-existing claim
inaccurate.

## Rejected alternatives

- **A `GrammarGameItemSource` implementing `GameItemSource`**: rejected —
  the interface promises per-item card eligibility; unlock status is a
  set-level computation, not that.
- **Reading a `toneIdentification` card's `syllables`/`promptWord`
  directly**: an earlier draft did this as a "narrow exception." Rejected
  after review found it unsafe (cards can predate the `syllables` field)
  and already broader than stated (`promptWord` is the specific field
  already flagged elsewhere as unsafe). Content comes from `VocabEntry`
  instead, like every other pool.
- **An optional grammar-unlock provider** ("so every construction site
  keeps compiling"): rejected — creates an untested "never asked" state
  indistinguishable from "asked, found nothing"; a real wiring regression
  would present as "nothing unlocked," permanently, with green tests
  (every harness also omits the provider). Required instead; the one real
  site and the harness factories are updated together.
- **`generateDynamicApplication` for composition content**: not
  deterministic, not meant to be called per round.
- **A second render-test harness**: `renderWithApp` already exists.
