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
merged to `main`). **This draft was itself reviewed** (`reviews/SUMMARY.md`)
and found three critical, verified-against-shipped-source defects, fixed
below — read this file in full before writing anything.

## The existing architecture

- **`src/domain/game/types.ts`** — `GameItemContent`/`GameItem` are
  **different** unions. `GameItemContent` is exactly
  `GameItemSource.eligibleContent()`'s return type — content **before** a
  direction is assigned, produced only by sources flowing through the
  shared draw pipeline (`sampleWithoutReplacement` + `assignDirection`).
  `GameItem` is wider: `type GameItem = SourcedGameItem |
  CompositionGameItem`, `SourcedGameItem = SymbolGameItem | WordGameItem |
  SentenceGameItem | ToneGameItem` — composition never goes through the
  pipeline. Content interfaces never carry `challengeDirection` — it's
  intersected one level up (`SymbolGameItem = SymbolItemContent &
  { challengeDirection }`); every new content type follows this split.
- **`GameItemSelectionService.ts`** — sources are pool-keyed
  (`readonly pool: GameCardPool`, selected via
  `sources.filter(s => pools.includes(s.pool))`). **A source whose
  inclusion rule isn't "this pool is checked" cannot implement
  `GameItemSource`** — tone identification is exactly this case
  (pool-independent by design), so `ToneGameItemSource` gets its **own
  separate constructor parameter**, consulted whenever
  `includeTonePractice` is set, never added to `sources`. `assignDirection`
  and this file's two weighting helpers (`itemKeyOfCard`,
  `itemKeyOfContent`) are two-armed ternaries today — **convert all three
  to exhaustive `switch (kind)` with a `const _never: never = …` default**
  the first time this plan touches the file (task 1.1), so every later
  phase gets a compile error at the line it must edit, not a silent
  fallthrough into "everything that isn't a symbol."
- **`PlayGameUseCase.ts`** — stateless; `itemKeyOf` needs the same
  exhaustiveness treatment (see SRS isolation below for the grammar-unlock
  provider's own constraint on this class).
- **`GamePage.tsx`** — one page, `setup | playing | summary`. Its pool
  selector (`PoolChoice`: `"symbols"|"words"|"mix"`) is being replaced by
  a genuine multi-select — **bigger than "swap a radio for checkboxes"**:
  `EMPTY_POOL_MESSAGES`/`DEFAULT_POOL_CHOICE`/`POOL_CHOICE_LABELS` and
  `countEligibleItems`/the `countInput`-reset `useEffect` are all keyed
  off the type being deleted and need a new key; the derived `pools`
  array must stay a **stable reference** across renders (a fresh array
  every render breaks existing memoization deps).
- **`StorageGameHistoryRepository.ts`** — **the most dangerous file in
  this plan, and not obviously related to either new feature.** It
  hard-codes `const GAME_CARD_POOLS: readonly GameCardPool[] =
  ["script","vocab"]`; its shape guard rejects the **entire stored array**
  if any one entry fails it, and widening `GameCardPool` does not make
  `tsc` catch this. Unfixed: the first Sentence Reading round writes
  `pools: ["sentence"]`; the next read fails the guard, reports
  `unavailable`, and the *next* `save()` overwrites history with just the
  new entry (`save()` reads `current.status === "ok" ? current.entries :
  []`). Composition's pools-less entries hit the identical failure. **Fix
  once, at the boundary**: derive the pool allowlist so a future pool is
  a compile error (e.g. a `Record<GameCardPool, true>` anchor, not a
  hand-maintained array), and make `kind: "practice"` **required** on the
  domain type, with this repository filling in `"practice"` for any
  entry that predates the field, on read — back-compat per-consumer is
  the bug shape; once, at the boundary, is the fix.
  `GameHistoryList.poolsLabel`'s own defensive comment about a legacy
  missing `pools` field is evidence this already leaked to the UI once.
- **The `toneIdentification` `VocabProperty` already exists**
  (`VocabCardGenerator.ts`), generated only when a word has determinable
  syllable tones. **Use it for eligibility only.** Its `syllables`/
  `promptWord` fields aren't safe content: `syllables` was added to
  `VocabCard` after persisted `toneIdentification` cards already existed
  (older cards can have `syllables === undefined`), and `promptWord` is
  already flagged elsewhere as unsafe to read generically. Content comes
  from **`VocabEntry`** instead (`entry.thai`, `entry.syllables` filtered
  to determinable tones) — the same data `WordGameItemSource` already
  injects. Export `VocabCardGenerator`'s existing 3-line filter
  (`word.syllables.filter(s => s.tone).map(s => ({text, tone}))`) as a
  shared helper (e.g. `toneSyllablesOf(entry)`) so both call sites share
  one definition.
- **`sentence/types.ts`** — `SentenceEntry` (`thai`, `english`, `words:
  string[]`, `thai_audio_file`); `SentenceCard.sentenceId`. **Every entry
  in the shipped `sentences.json` has `thai_audio_file: null`.** The
  existing audio-gated direction rule (no audio → always `"reading"`) is
  the permanent mechanism, not a workaround — future sentence audio makes
  `"listening"` reachable with no code change. Build both
  directions/organisms; be honest in the phase README and a regression
  test that today's data never reaches `"listening"`.
- **`grammar/types.ts`**/**`GrammarLessonService.ts`** (class
  `GrammarService`) — `getUnlockedGrammarPoints()` is prerequisite-gated
  **and** learned-prefix-gated (excludes an entry if any earlier
  prerequisite-satisfying entry has no grammar card yet). Composition
  doesn't implement `GameItemSource` for a narrower reason than "no SRS
  card involved": that interface promises "eligible because a card exists
  for *this* item," a per-item check, while this is set-level. With few
  grammar cards learned the unlocked set is small (often one entry) and
  `selectCompositionRound` emits one item per entry — a round is
  genuinely tiny for most learners. **Do not use
  `generateDynamicApplication`** (calls `Math.random()` directly, bakes
  one fixed card at lesson time) — use a `GrammarEntry`'s own static
  `examples[]`.
- **`SentenceBuilder.tsx`** — reuse its tile-tap *interaction*, never its
  auto-graded `handleSubmit`/`onAnswer(isCorrect,...)`; composition ends
  in `RatingButtons` self-rating like everything else here. **Every new
  organism keys reset/audio-replay effects on the item's own identity,
  not `audioUrl` alone**, resetting revealed/tile state on item change —
  same rule the original plan established, still enforced in
  `GamePage.test.tsx` (React doesn't remount between two consecutive
  same-direction items).
- **`test-utils/renderWithApp.tsx`** — reuse, don't rebuild. Today it only
  seeds script cards and one `SymbolGameItemSource`. Every task needing a
  new fixture (sentence cards, tone-carrying vocab cards, graduated-vocab/
  unlocked-grammar state) adds it here and lists this file in its `covers`.

## Naming and modeling decisions

- `GameCardPool` grows by one real member: `"sentence"`. Tone
  identification is **not** a fourth member — same vocab cards `"vocab"`
  already covers, not a distinct `CardRepository` partition — modeled as
  an additive `GameRoundConfig.includeTonePractice?: boolean`, threaded
  into everything reasoning about eligible-item counts, including
  `GamePage.countEligibleItems`.
- The setup toggle is named **"Tone Identification"** everywhere — never
  "Prioritize tone identification" (borrowed from the unrelated weak-item
  toggle and misleading: this toggle includes items, it doesn't reorder).
- Sentence composition is a separate mode (a "Practice" vs. "Sentence
  Composition" switch in `GamePage`), its own item shape kept out of
  `GameItemContent` (see above). `CompositionItemContent` carries
  `englishMeaning` (matching the other content types) and **no
  `audioUrl`** — grammar examples carry no per-example audio, and a field
  specified to always be `undefined` invites a future reader to try
  playing it anyway.

- **`GameHistoryEntry.kind`** — `"practice"`/`"composition"`, both
  **required**. `StorageGameHistoryRepository` normalizes any persisted
  entry with no `kind` (everything written before this plan) to
  `"practice"` **on read**, once — no other consumer (`GameHistoryList`,
  `PlayGameUseCase`) needs its own copy of the back-compat rule.

## Quality gates

`npm test` (`npm test -- <path>` scoped), `npx biome check .`.
`src/domain/game/architecture.test.ts` already enforces no
`presentation`/`application`/`infrastructure` import from `domain/game`
(reads source as text) — "no file under `domain/game` reads
`.question`/`.correctAnswer`/`.promptWord` off a card" is a cheap addition
worth making; after this review the plan reads no card content anywhere
except a `toneIdentification` card's mere existence.

**`npm run build` (whole-app) gates only each phase's last task** (1.3,
2.3, 3.3 — the ones touching `GamePage.tsx`). Every earlier task widens
the `GameCardPool`/`GameItem` union `GamePage.tsx`'s dispatch and
`GameHistoryList`'s label map switch over, so the build is guaranteed red
in those two files until the phase's last task lands — a correct
consequence of the design, not a defect (task 1.1 hit this and was
briefly, incorrectly, blocked on it). Every other task gates instead on
`npx tsc --noEmit -p tsconfig.domain-check.json` (repo-root, `extends`
the real `tsconfig.json`, scoped to `domain`/`application`/
`infrastructure`) — safe because that architecture test already proves
`domain/game` doesn't import outward, and application/infrastructure
don't import presentation either.

## SRS isolation — still the plan's most important property

Playing any round — practice or composition — must leave
`localStorage["thai-srs-state"]` byte-identical. Re-prove this per new
pool this plan touches, exactly as the original plan re-proved it for
vocab cards after phase 1 only covered script cards. Composition's
grammar-unlock closure is a read-only capability by construction (one
read-only method) — state this in task 3.2 and narrow `PlayGameUseCase`'s
doc comment to match, rather than leaving the broader pre-existing claim.

## Rejected alternatives

- **A `GrammarGameItemSource` implementing `GameItemSource`**: rejected —
  the interface promises per-item card eligibility; unlock status is a
  set-level computation.
- **Reading a `toneIdentification` card's `syllables`/`promptWord`
  directly**: an earlier draft's "narrow exception," rejected as unsafe
  (cards can predate `syllables`) and broader than stated (`promptWord`
  is already flagged elsewhere as unsafe). Content comes from `VocabEntry`
  instead, like every other pool.
- **An optional grammar-unlock provider** ("so every construction site
  keeps compiling"): rejected — creates an untested "never asked" state
  indistinguishable from "asked, found nothing"; a real wiring regression
  would present as "nothing unlocked," permanently, with green tests.
  Required instead, with the one real site and the harness factories
  updated together.
- **`generateDynamicApplication` for composition content**: not
  deterministic, not meant to be called per round. **A second
  render-test harness**: `renderWithApp` already exists.
