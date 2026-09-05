# Systems Architect Review: game-modes

## Executive Summary

The plan's core architectural instinct is right: a projection type (`GameItem`) instead of leaking `ReviewableCard` into presentation, a domain-defined `GameHistoryRepository` port, and an application-layer orchestrator that structurally cannot reach the code path that mutates a schedule. Those three decisions together make the headline guarantee ("playing never touches SRS") a property of the shape of the code rather than of a flag anyone can forget to check — that is the strongest part of the plan.

Two things block it as written. First, the `GameItem` union reshape in task 2.1 is a breaking change to a contract that tasks 1.3 and 1.4 have already built against, and **no task in phase 2 owns updating the phase-1 organisms** — 2.1's Architectural Decision even contradicts 2.3's Description about who narrows on `kind`. Second, and more serious, the plan never decides **where a game item's displayable content comes from**: `VocabCard` has no `thai` or `english` field, `promptWord` is the Thai word for five properties and the *English* word for `englishToThai`, and a symbol's `question`/`correctAnswer`/`audioUrl` differ per `PropertyType` — so "dedupe the cards and build an item" is not an implementable instruction. Task 2.2's AC4 then references `VocabEntry.thai_audio_file`, a field that exists in a data source task 2.1 never sources from.

Beyond those, the plan overstates its test foundation (the repo contains zero `.test.tsx` files, contrary to CONTEXT.md), enforces its domain-purity criterion with a gate that cannot enforce it, and lets `GameItemSelectionService` accrete five responsibilities by phase 3.

## Plan-Level Findings

### Finding P-1: Phase 2's `GameItem` union reshape is an unowned breaking change to phase-1 code
- **Severity**: critical
- **Description**: Task 1.1 fixes `GameItem` as a flat symbol shape and explicitly rejects tagging it, reasoning that "phase 2's task 2.1 ... is free to reshape `GameItem` into a discriminated union at that point since this task's only consumers (1.2, 1.3, 1.4) are all within this same phase". That reasoning holds only if phase 1 is never shipped independently — but the plan's whole phasing argument is that phase 1 *is* a standalone shippable capability. Concretely:
  - Task 2.1's `covers` is `types.ts`, `GameItemSelectionService.ts`, and its test. It does **not** cover `SymbolDictationChallenge.tsx`, `SymbolReadingChallenge.tsx`, `PlayGameUseCase.ts`, or `GameRoundSummary.tsx` — all of which are typed against the pre-union `GameItem`. Task 2.3's `covers` doesn't include the two symbol organisms either. So after 2.1 lands, the phase-1 organisms have a prop type that no task owns fixing, and `npm run build` (2.1's implicit gate, though 2.1's `verify` is only `npm test -- src/domain/game`, not `npm run build`) breaks in files no task claims.
  - 2.1's Architectural Decision says "callers (task 2.2's organisms, task 1.4's already-built dictation/reading organisms) narrow on `kind`". Task 2.3's Description says the *page* switches "on `kind` and then `challengeDirection`" and dispatches to organisms. Both cannot be true. The 2.3 model is the correct one (organisms should receive an already-narrowed variant and know nothing about the union); 2.1's AD is describing a design the plan does not actually build.
  - `depends_on: ["1.1"]` on task 2.1 is wrong. It must not start until 1.4 exists, because it changes 1.4's inputs. The phase-2 README's own table says "1 (phase)"; the frontmatter contradicts it (see also P-12).
- **Recommendation**: Define `GameItem` in task 1.1 as a one-member discriminated union — `type GameItem = SymbolGameItem` with `SymbolGameItem = { kind: "symbol"; challengeDirection: "dictation" | "reading"; ... }` — and type the phase-1 organisms on `SymbolGameItem`, not `GameItem`. This is not speculative generality (the rejected `WordGameItem` genuinely stays out); it is one literal field that converts 2.1 from a breaking change into a purely additive one, which is what "open for extension, closed for modification" buys you. Then fix 2.1's AD to say the *page* narrows, and set `depends_on: ["1.4"]`.

### Finding P-2: The plan never decides where a `GameItem`'s content comes from — and the two phases assume different sources
- **Severity**: critical
- **Description**: This is the single largest hole. `GameItem` needs, per task 1.1, "character, name/question text, correct answer, audio URL if any"; per task 2.2 a word item needs the Thai spelling, the English meaning, and the Thai audio. Neither is obtainable by the procedure the plan prescribes.
  - **Words.** `VocabCard` (`src/domain/vocabulary/entities/VocabCard.ts`) exposes `promptWord`, `property`, `question`, `correctAnswer`, `audioUrl` — there is no `thai` and no `english`. `VocabCardGenerator` sets `promptWord: word.thai` for `thaiToEnglish`/`audioRecognition`/`toneIdentification`/`spelling`/`spellingFromAudio`, but `promptWord: word.english` for `englishToThai`. `audioUrl` is set only on the cards generated when `thai_audio_file` is non-null. So building a `WordGameItem` from cards requires *cross-card assembly*: recover the Thai word by parsing `vocab:{thai}:{property}`, take the English meaning from the `thaiToEnglish` card's `correctAnswer`, and take the audio from whichever sibling card happens to carry `audioUrl`. Task 2.1 specifies none of this — it specifies only the dedupe.
  - **The two tasks disagree about the source.** Task 2.1 sources from `CardRepository.findAll("vocab")`. Task 2.2's AC4 says "a vocab fixture whose `thai_audio_file`/`english_audio_file` is null" — those are `VocabEntry` fields (`src/domain/vocabulary/types.ts`), from `vocabulary.json`, which task 2.1 never reads. Two adjacent tasks are written against two different data sources for the same object.
  - **Symbols have the identical problem, undetected.** Deduping `ScriptPropertyCard`s by `symbolCharacter` leaves several cards per symbol whose `question` and `correctAnswer` differ by `property` ("recognition", "class", "initialSound", "deadLive", ...). Picking an arbitrary one yields an item whose "correct answer" might be *"low class"* rather than the symbol's name. The canonical content lives in `src/domain/script/data/symbols.ts` (`ThaiSymbol.character/name/audioUrl/mnemonic`), which task 1.1's `covers` and Description never mention.
  - **Nobody wires the vocabulary corpus.** If the fix is to inject `VocabEntry[]` (the established pattern — `AppContext.tsx` already constructs `VocabularyService`, `GrammarService`, and `SentenceService` with `vocabularyData as VocabEntry[]`), then `AppContext.tsx` must change in phase 2. Only task 1.4 lists `AppContext.tsx` in `covers`; neither 2.1 nor 2.3 does.
- **Recommendation**: State the rule explicitly, once, in CONTEXT.md and in 1.1's Architectural Decision: **cards determine *eligibility*; the data files (`symbols.ts`, `vocabulary.json`) determine *content*.** That is already how CONTEXT.md describes eligibility ("A symbol only has a *card* ... once `CardRepository.findAll("script")` contains an entry whose `symbolCharacter` matches — there is no separate boolean flag"), so this is making an implicit decision explicit rather than changing direction. Then:
  - Task 1.1: inject the symbol arrays (or import them directly — domain→domain is fine) and add an AC that a symbol item's reveal content is the symbol's `name`, not an arbitrary property card's `correctAnswer`.
  - Task 2.1: add `vocabulary: VocabEntry[]` as a constructor dependency, and add `AppContext.tsx` to its `covers` (or to 2.3's).
  - Task 2.2: AC4 becomes coherent once the source is `VocabEntry`.

### Finding P-3: Presentation would depend on a persistence port
- **Severity**: major
- **Description**: Task 1.4 says `GameHistoryList.tsx` "renders recent entries from `GameHistoryRepository` (via `AppContext`)", and its scope adds `StorageGameHistoryRepository` to `AppContextValue`. Today `AppContextValue` exposes five use cases plus one domain service (`vocab: VocabularyService`) — and **no repository**. `cardRepo` and `stateRepo` are module-level `const`s that never escape `AppContext.tsx`. Putting a repository port on the context makes every component that touches history depend on a persistence abstraction, and it is a strictly weaker boundary than the one the codebase already holds. It also splits the read path: rounds are written through `PlayGameUseCase` but read around it.
- **Recommendation**: Expose `PlayGameUseCase.getHistory(limit?)` and keep `GameHistoryRepository` inside `AppContext.tsx` as a module-level const, exactly like `cardRepo`. One method on an existing use case, and the dependency graph stays presentation → application → domain port → infrastructure.

### Finding P-4: Task 1.1's AC6 (domain purity) is assigned to a gate that cannot enforce it
- **Severity**: major
- **Description**: AC6 requires the game domain types to be exported "with no import from any `presentation/` module", and `ac_enforcement` says "AC6 -> none — a structural/type-shape criterion checked by the `tsc` step of `npm run build`". `tsc` does not check import direction; it will compile `import { GamePage } from "../../presentation/pages/GamePage"` inside `src/domain/game/` without complaint. And `biome.json` is `"rules": { "recommended": true }` with no `noRestrictedImports` configuration, so lint won't catch it either. AC6 is therefore unenforced by any gate the plan runs. Separately, AC6 forbids only `presentation/` — the likelier and more damaging violations are `infrastructure/` (e.g. importing `LocalStorageAdapter` into the selection service) and `application/`.
- **Recommendation**: Broaden AC6 to "no import from `presentation/`, `application/`, or `infrastructure/`", and enforce it with one of: (a) a `src/domain/game/architecture.test.ts` that reads the `.ts` files under `src/domain/game/` and asserts no import specifier matches `/(presentation|application|infrastructure)/`; or (b) a Biome `overrides` entry scoping `noRestrictedImports` to `src/domain/**`. Option (a) is ~15 lines, needs no new dependency, and would be the repo's first architecture test — worth having given four more domain contexts already exist.

### Finding P-5: Game history bypasses the `IStorage` adapter seam, and 1.2's own AC1 presumes the seam it removes
- **Severity**: major
- **Description**: The *decision to use a separate key* is sound, and the rationale in CONTEXT.md's rejected alternatives (avoiding `validateLearnerState`/`mergeLearnerStates`/`SettingsPage` export-reset machinery that exists to protect SRS progress) is a real, well-argued tradeoff — I would keep it. What is wrong is the *layering* of the implementation. Task 1.2 prescribes "a thin class over `localStorage.getItem`/`setItem`" with the `typeof localStorage === "undefined"` guard inlined. That collapses two things the codebase deliberately keeps apart: `StorageLearnerStateRepository` is a pure repository over an `IStorage` interface, and `LocalStorageAdapter`/`InMemoryStorage` are the adapters. That split is why `StorageLearnerStateRepository.test.ts` can run without jsdom at all.
  - The plan's own AC1 gives this away: "including from a newly constructed repository instance **over the same storage**" — there is no "same storage" to construct two repositories over if the class talks to the global `localStorage` directly. AC1 and the Architectural Decision are internally inconsistent.
  - There is no schema validation or versioning on read. `Validation.ts` exists precisely because this app already learned that a persisted blob needs a guard; the new key gets a bare `JSON.parse` and a cast. There is no AC for a corrupt or hand-edited payload, and a throw here renders `/game` unusable with no recovery path.
  - Task 2.3 adds a `pool` field to the persisted history entry. Entries written by a shipped phase 1 will not have it. No task has a backward-compatibility AC, even though `LocalStorageAdapter.load`/`migrateState` is the in-repo precedent for exactly this problem.
- **Recommendation**: Introduce a minimal `JsonStore` port (`read<T>(): T | null; write<T>(v: T): void`) with `LocalStorageJsonStore` and `InMemoryJsonStore` adapters, and build `StorageGameHistoryRepository` over it. This costs ~25 lines, makes 1.2's AC1 and AC4 honest (AC4 becomes a property of the adapter, tested once, rather than repeated in every repository), keeps the "separate key" decision intact, and gives a future backup/sync feature a place to enumerate stores instead of grepping for `localStorage` calls. Add an AC to 1.2 for a malformed stored payload (returns `[]`, does not throw) and an AC to 2.3 for reading a phase-1-shaped entry with no `pool`.

### Finding P-6: The RTL render-test foundation the plan depends on does not exist, and CONTEXT.md misstates that it does
- **Severity**: major
- **Description**: Tasks 1.4, 2.2, 2.3, and 3.2 — four of nine, and the entire end-to-end criterion of every phase — rest on Testing-Library render tests. CONTEXT.md justifies this with "unit tests on the domain/application layers plus a Testing-Library render test on the page are sufficient and match how `DrawingQuiz`/`ReviewPage` are covered today". Neither `DrawingQuiz` nor `ReviewPage` has any test. There are **zero `.test.tsx` files in the repo**; the only jsdom test is `src/presentation/hooks/useReviewSession.test.ts`, which uses `renderHook`, not `render`. Concretely, an implementer following this plan hits:
  - **No global jsdom environment.** `vite.config.ts` sets only `test.exclude`; the convention is a per-file `// @vitest-environment jsdom` pragma. Every new `.test.tsx` needs it. Not mentioned anywhere.
  - **No `setupFiles`, no `globals: true`.** RTL 16's auto-cleanup registers via a global `afterEach`, which is not available; DOM state leaks between cases in the same file. `@testing-library/jest-dom` is not a dependency, so `toBeInTheDocument()` does not exist.
  - **Audio.** `DrawingQuiz.tsx:46-48` does `new Audio(card.audioUrl); audio.play().catch(() => {})`. jsdom's `HTMLMediaElement.play` throws synchronously ("Not implemented"), so the `.catch()` does not save it. Tasks 1.4 AC2 and 2.2 AC1/AC4 all assert on autoplay-on-mount and will need `HTMLMediaElement.prototype.play` stubbed — with no `setupFiles`, in every file.
  - **Fixture injection.** `AppContext.tsx` constructs `storage`, `cardRepo`, `stateRepo`, and every service/use case as module-level `const`s. `AppProvider` cannot be given fakes. Tasks 1.4 AC4 ("against a fixture repository") and 3.2 AC2 (a seeded random source reached "through the actual page") are only achievable by rendering under `<AppContext.Provider value={...}>` with a hand-built `AppContextValue` — feasible, since `AppContext` is exported, but done nowhere in this repo and never mentioned in the plan. This is a real chunk of 1.4's 8 points that the estimate does not reflect.
- **Recommendation**: Add a small task 1.0 (or fold into 1.4 and re-weight) that establishes the presentation-test harness: a `renderWithApp(ui, overrides)` helper building an `AppContextValue` from in-memory adapters, an audio stub, and explicit `afterEach(cleanup)`. Correct CONTEXT.md's "Files to imitate" claim — there is no existing render test to imitate, which is exactly the kind of thing an implementer will waste an hour discovering.

### Finding P-7: `GameItemSelectionService` reaches five responsibilities by phase 3
- **Severity**: major
- **Description**: By the end of the plan the class owns: symbol eligibility, symbol content projection, word eligibility (including `vocab:{thai}:{property}` id parsing), word content projection, mix composition, per-kind direction randomization, weight computation from `schedule`, and weighted-without-replacement sampling with an injectable RNG. That is at least five independent reasons to change, and one test file (`GameItemSelectionService.test.ts`) accumulates cases from 1.1, 2.1, and 3.1. The plan half-recognizes this — task 3.1 already prescribes splitting weighting into "a pure weight function" plus "sampling" — but stops short of naming the decomposition for the rest.
- **Recommendation**: Name the seams in task 1.1 so phases 2 and 3 are additive rather than accretive:
  - `GameItemSource` — `eligibleItems(): GameItem[]` — with `SymbolGameItemSource` in phase 1 and `WordGameItemSource` added in 2.1. `CardPool` already contains `"grammar"` and `"sentence"`; a source interface is the seam that lets those arrive without reopening the selection service, which is the actual OCP payoff here rather than a theoretical one.
  - `itemWeight(item, stats): number` as a free function module (3.1 already wants this).
  - `sampleWithoutReplacement(items, weightOf, rng)` as a free function.
  - `GameItemSelectionService` then composes sources + sampling and is ~30 lines. I would not call this over-engineering for an app this size: it is the difference between task 2.1 being a rewrite of one class and being one new file plus one constructor argument.

### Finding P-8: The weak-item weighting will surface *new* items, not weak ones, and CONTEXT.md's guidance about reusing `getCriticalItems` is self-contradictory
- **Severity**: major
- **Description**: Two concrete problems, both verifiable in the current code:
  - `ReviewService.getCriticalItems` (lines 214-234) filters `card.schedule.repetitions > 0` before sorting by ease factor. That filter is load-bearing: `DEFAULT_SRS_DATA.easeFactor` is **2.0** (`src/domain/shared/types.ts:36`) while `EaseFactor.DEFAULT` is **2.5**. A never-reviewed card therefore sits *below* the ease factor of a well-known card, so a naive "lower ease = higher weight" rule ranks brand-new cards as the weakest items in the pool. "Prioritize weak items" would preferentially drill the things the learner just unlocked. Task 3.1 has no AC for unreviewed items and never mentions `repetitions`.
  - CONTEXT.md says of `getCriticalItems`: "do not reimplement that sort, call through the same repository ports". Those two clauses are mutually exclusive — calling `getCriticalItems` means depending on `ReviewService` (a domain-service-on-domain-service coupling that would be worth objecting to), while going through `CardRepository` necessarily means implementing your own ranking. Task 3.1 in fact does the latter and does it correctly: it reads `card.schedule` via `CardRepository`, defines its own per-symbol/per-word weight, and takes the worst underlying card rather than an average (a well-argued decision). But it never says out loud that it is *not* calling `ReviewService`, and `getCriticalItems` could not serve this need anyway — it returns card-level `CriticalItem` DTOs keyed by card `id`, capped at `limit = 10`, with no `symbolCharacter` and no Thai word, so it cannot be mapped back to a game item at all.
- **Recommendation**: Rewrite the CONTEXT.md sentence to "read the same `schedule.easeFactor.value` / `lapseCount` fields that `getCriticalItems` reads, through `CardRepository`; do **not** call `ReviewService` — the game selection service and the review service are siblings, not a chain". Add an explicit AC to 3.1 for the never-reviewed case: state the chosen rule (I would mirror the existing semantic — items with `repetitions === 0` get baseline weight, not maximum weight) and assert it.

### Finding P-9: Pool naming diverges from the app's ubiquitous language
- **Severity**: minor
- **Description**: `GamePoolConfig = "symbols" | "words" | "mix"` sits next to the existing, closed `CardPool = "script" | "vocab" | "grammar" | "sentence"` (`src/domain/shared/CardPool.ts`) and names the same two concepts differently. Every other domain module in this repo says "script" and "vocab". A reader now has to hold two vocabularies for one idea, and any future grammar/sentence game mode has to extend a second enum in lockstep. Also: `GamePoolConfig` is a scalar value, not a configuration object, and it is a *field of* `GameRoundConfig` — the `-Config` suffix on both is confusing. Minor related point: three of the four directions are named for what the learner does (`reading`, `production`, `dictation`), but `dictationTranslate` is a compound that breaks the pattern with its symbol-side sibling `dictation` even though both are dictation.
- **Recommendation**: Either `type GamePoolSelection = "script" | "vocab" | "mixed"`, or — better for the OCP point in P-7 — model it as `readonly CardPool[]` on `GameRoundConfig`, with the UI labels ("Symbols" / "Words" / "Mix") living in presentation where user-facing wording belongs.

### Finding P-10: Port location deviates from the repo's convention without saying so
- **Severity**: minor
- **Description**: All three existing ports live flat in `src/domain/ports/` (`CardRepository`, `LearnerStateRepository`, `NotificationPort`). Task 1.1 places `GameHistoryRepository` in `src/domain/game/ports/`. I actually prefer the plan's location — a context-local port is better DDD, and `game` is a genuinely separate bounded context — but an undiscussed deviation in a repo with an established convention reads as an oversight and invites a reviewer to "fix" it back.
- **Recommendation**: One sentence in 1.1's Architectural Decision: the port lives with its context because `GameHistoryRepository` is meaningful only inside the game context, unlike `CardRepository` which is shared across script/vocab/grammar/sentence.

### Finding P-11: `prioritizeWeakItems` has no owning task for the domain type or the use case
- **Severity**: minor
- **Description**: Task 3.2's Description threads the toggle "through `PlayGameUseCase`'s round-start call into `GameItemSelectionService`'s weighting mode", but its `covers` is only `GamePage.tsx` and `GamePage.test.tsx`. Adding the field to `GameRoundConfig` (`src/domain/game/types.ts`) and the parameter to `PlayGameUseCase.startRound` belongs to nobody. Task 3.1's `covers` is only the selection service and its test. Same shape of gap as P-2's AppContext omission.
- **Recommendation**: Add `src/domain/game/types.ts` and `src/application/use-cases/PlayGameUseCase.ts` to 3.2's `covers` (or extend 3.1's).

### Finding P-12: `depends_on` frontmatter contradicts the phase READMEs and understates real coupling
- **Severity**: minor
- **Description**: Phase 2's README table says task 2.1 depends on "1 (phase)"; 2.1's frontmatter says `depends_on: ["1.1"]`. Phase 3's README says 3.1 depends on "2 (phase)"; 3.1's frontmatter says `["2.1"]`. The frontmatter is what a scheduler reads, and in both cases it is the wrong, looser one: 2.1 breaks 1.4 (P-1), and 3.1's AC1 — "selection behaves exactly as phases 1 and 2 already established" — is only meaningful once 2.3 has wired what phase 2 established.
- **Recommendation**: `2.1 -> ["1.4"]`, `3.1 -> ["2.3"]`. The rest of the graph (1.1 → {1.2, 1.3} → 1.4 → 2.1 → 2.2 → 2.3 → 3.1 → 3.2) is a clean DAG with a genuine parallelism opportunity at 1.2/1.3, which the plan correctly identifies.

### Finding P-13: Task 2.1's `ac_enforcement` references an AC that does not exist
- **Severity**: minor
- **Description**: 2.1's frontmatter has an `AC5 -> none — regression coverage is the existing task 1.1 cases ...` entry, but the body lists only AC1-AC4. The intended AC5 (existing 1.1 cases still pass unmodified) appears in the Test Cases list but is never stated as an acceptance criterion.
- **Recommendation**: Promote it to a body AC — it is the regression guard for the P-1 reshape and deserves to be a criterion, not a footnote.

### Finding P-14: The direction-randomization AC is weaker than the stated requirement, and the RNG seam is deferred one phase too far
- **Severity**: minor
- **Description**: The plan README specifies "randomized 50/50". Task 1.1's AC4 only requires that both directions "occur at least once" across ~200 samples — an implementation returning `"dictation"` 99% of the time passes. Meanwhile task 3.1 introduces an injectable random source ("so a test can supply a seeded/deterministic source instead of asserting on statistical noise") — which is precisely what 1.1's AC1, AC4, and AC5 already need. Deferring it makes 1.1's tests statistical, then changes the same function's signature two phases later.
- **Recommendation**: Introduce the injectable random source in task 1.1. This is not anticipatory design — 1.1's own tests are the first consumer. Then AC4 can assert an exact split against a controlled source, and AC1/AC5 become deterministic.

### Finding P-15: No AC for a symbol with no audio assigned a dictation challenge
- **Severity**: minor
- **Description**: `ThaiSymbol.audioUrl` is optional, and `ScriptCardGenerator` only emits the dedicated `audioRecognition` card `if (c.audioUrl)`. A symbol without audio is still eligible (it has other property cards) and can be assigned the "hear it, write it" direction, which is unplayable. Task 2.2's AC4 covers exactly this for words ("a vocab fixture whose audio file is null") but nothing covers the symbol case, which phase 1 ships first.
- **Recommendation**: Add an AC to 1.1: a symbol with no `audioUrl` is either excluded from the dictation direction or excluded from the round entirely — pick one and assert it.

### Finding P-16: The trust-boundary omission is accurate about *inputs* but skips the deserialization boundary the repo already treats as one
- **Severity**: suggestion
- **Description**: The claim that this feature adds no network, file, CLI, or IPC input is correct. But the plan's framing — "its only new 'input' is local UI state ... validated against card data the rest of the app already trusts" — quietly omits that it adds a **new persisted, externally-editable blob** that is `JSON.parse`d and cast without validation. This repo does not otherwise treat localStorage as trusted: `Validation.ts`/`validateLearnerState` exists specifically for that, and `LocalStorageAdapter.load` runs `migrateState` defensively over whatever it finds. The new key gets neither. Separately, the deliberate tradeoff ("clearing SRS progress will not clear game history, and vice versa") is stated in CONTEXT.md but appears in no acceptance criterion and no UI copy — a person who clicks "reset all progress" in `SettingsPage` and still sees their game history has hit a surprise the plan predicted and then didn't handle. `ManageDataUseCase.exportData()` will likewise silently exclude it.
- **Recommendation**: Keep the "no inventory table" conclusion but add one sentence acknowledging the new localStorage deserialization boundary and pointing at the malformed-payload AC recommended in P-5. Add an AC (1.4 or 2.3) that the game-history list survives a reset of SRS data, and consider one line of UI copy on the settings/export screen.

### Finding P-17: `RatingButtons` binds digits 1-5 globally on `window`
- **Severity**: minor
- **Description**: `RatingButtons.tsx:47-54` registers a `window` `keydown` handler that fires `onRate` for any keypress of 1-5, with no focus check. Reusing it as-is is right, but task 2.2's "the person writes the Thai spelling and the English meaning" and "presents the write-input per the input-mode prop" leave open whether a text input is involved. If it ever is, typing a digit silently submits a rating and advances the round.
- **Recommendation**: State in 2.2 that "write-input" means canvas-or-paper only, never a focusable text field, and say why. It is the kind of constraint that survives only if it is written down.

### Finding P-18: The SRS-isolation test is weaker than it reads — and the design already gives a stronger guarantee worth stating
- **Severity**: suggestion
- **Description**: `StorageCardRepository.findAll` reconstructs fresh domain objects from DTOs on every call (`toDomain(pool, raw)`), so "re-read the same cards from the repository and assert deep-equality" (1.3 AC2's enforcement) detects only whether `save`/`saveAll` was called — an in-memory mutation of a `ReviewableCard` handed onward would be invisible. Conversely, if the implementer writes a hand-rolled fake that caches card *instances*, the same test detects strictly more. The test's strength depends on an unstated fixture choice. Worth noting, though: the plan's own design already makes the mutation structurally impossible, because `GameItem` is a projection and no `ReviewableCard` ever escapes the selection service — that is a better guarantee than any assertion, and task 1.3's Architectural Decision only half-says it ("there is no separate 'don't apply to SRS' flag ... because the code path that would apply a rating to a schedule is simply never called").
- **Recommendation**: Have 1.3 AC2 snapshot the raw persisted blob (`InMemoryStorage.load()` or `exportData()`) before and after, using the real `StorageCardRepository` over `InMemoryStorage`. That is behavioral, honest about the adapter's semantics, and still avoids the "assert method not called" antipattern CONTEXT.md rightly bans. And add to 1.3's AD the stronger claim: no `ReviewableCard` instance crosses the selection service boundary, so presentation cannot mutate one even by accident.

## Plan Quality Findings

| # | Check | Phase | Task | Severity | Issue | Recommendation |
|---|-------|-------|------|----------|-------|-----------------|
| 1 | AC testability | 1 | 1.1 | major | AC6 (domain purity) mapped to `tsc`, which cannot check import direction; Biome is `recommended` only | Add an architecture test or Biome `noRestrictedImports` override (P-4) |
| 2 | AC testability | 1 | 1.1 | minor | AC4 ("both directions occur") does not test the stated 50/50 requirement | Inject the RNG in 1.1 and assert an exact split (P-14) |
| 3 | Behavioral ACs | 1 | 1.1 | major | No AC defines what content a `GameItem` carries or where it comes from | Add a content-source AC (P-2) |
| 4 | Behavioral ACs | 1 | 1.1 | minor | No AC for a symbol with no `audioUrl` under the dictation direction | Add exclusion AC (P-15) |
| 5 | Arch decision soundness | 1 | 1.1 | critical | The "phase 2 is free to reshape `GameItem`" rationale assumes phase 1 is never shipped alone, contradicting the plan's own phasing claim | Tag the union in 1.1 (P-1) |
| 6 | Arch decision documented | 1 | 1.1 | minor | Port placed in `domain/game/ports/` vs. repo's flat `domain/ports/`, undiscussed | State the reason (P-10) |
| 7 | Test case quality | 1 | 1.2 | major | AC1 ("a fresh repository instance over the same storage") is impossible under the AD's direct-`localStorage` design | Introduce a `JsonStore` seam (P-5) |
| 8 | Behavioral ACs | 1 | 1.2 | major | No AC for a malformed/corrupt stored payload; no validation, despite `Validation.ts` precedent | Add a malformed-payload AC (P-5) |
| 9 | Behavioral ACs | 1 | 1.2 | minor | The stated tradeoff (SRS reset does not clear history) has no AC in either direction; AC3 covers only history-write → LearnerState | Add the reset-direction AC (P-16) |
| 10 | AC testability | 1 | 1.2 | minor | The history-entry shape (id? `playedAt`?) is never fixed, yet AC5 asserts "most-recent-first" ordering | Fix the entry shape in 1.1 (it is 1.1's declared job) |
| 11 | Test case quality | 1 | 1.3 | suggestion | AC2's strength depends on an unstated fixture-repository choice | Snapshot the raw persisted blob (P-18) |
| 12 | Arch decision soundness | 1 | 1.3 | pass | The divergent accuracy threshold (Good/Easy vs `rating >= 3`) is correctly identified as a legitimate context-local convention, not a bug — verified against `ReviewService.endReviewSession:122` | — |
| 13 | Trust boundary | 1 | 1.4 | major | `AppContextValue` would expose a repository port to presentation | Route history reads through `PlayGameUseCase` (P-3) |
| 14 | AC testability | 1 | 1.4 | major | AC4's "fixture repository" is unreachable: `AppContext` builds all deps as module-level consts | Add a `renderWithApp` harness task (P-6) |
| 15 | AC testability | 1 | 1.4 | major | AC2's audio-autoplay assertion fails under jsdom without a `play()` stub; no `setupFiles` exists | Stub in the harness (P-6) |
| 16 | YAGNI | 1 | 1.4 | minor | Size 8 does not account for building the repo's first render-test infrastructure | Re-weight or split out task 1.0 |
| 17 | Arch decision soundness | 2 | 2.1 | critical | AD claims the phase-1 organisms narrow on `kind`; task 2.3 says the page does. `covers` omits every phase-1 consumer | Correct the AD; tag the union in 1.1 (P-1) |
| 18 | Behavioral ACs | 2 | 2.1 | critical | Dedupe-by-Thai-word is specified; deriving Thai/English/audio for a `WordGameItem` is not, and is not possible from one card | Decide the content source; inject `VocabEntry[]` (P-2) |
| 19 | Dependency direction | 2 | 2.1 | major | Injecting the vocabulary corpus requires an `AppContext.tsx` change that no phase-2 task covers | Add `AppContext.tsx` to 2.1 or 2.3 `covers` (P-2) |
| 20 | AC completeness | 2 | 2.1 | minor | `ac_enforcement` maps an AC5 that the body does not define | Promote the regression guard to a body AC (P-13) |
| 21 | Dependency ordering | 2 | 2.1 | minor | `depends_on: ["1.1"]` contradicts the phase README's "1 (phase)" and understates the break | `depends_on: ["1.4"]` (P-12) |
| 22 | Behavioral ACs | 2 | 2.2 | critical | AC4 asserts on `thai_audio_file`/`english_audio_file`, `VocabEntry` fields that 2.1's card-sourced pipeline never reads | Resolve with P-2 |
| 23 | AC testability | 2 | 2.2 | major | Same jsdom audio/cleanup gap as 1.4, now in two more files | Harness task (P-6) |
| 24 | Behavioral ACs | 2 | 2.2 | minor | "Write-input" is undefined; a text field would collide with `RatingButtons`' global digit handler | Constrain to canvas/paper and say why (P-17) |
| 25 | Arch decision soundness | 2 | 2.2 | pass | Two organisms over one parameterized component is correct and matches `DrawingQuiz`/`MultipleChoice`/`SentenceBuilder` | — |
| 26 | Behavioral ACs | 2 | 2.3 | major | Adds `pool` to the persisted history entry with no backward-compat AC for phase-1-written entries | Add a legacy-entry AC (P-5) |
| 27 | Arch decision documented | 2 | 2.3 | minor | AD covers only the default-pool choice; the dispatch strategy (page switches on `kind` then `challengeDirection`) is the more consequential decision and is only in the Description | Promote it to the AD, since it contradicts 2.1's |
| 28 | Behavioral ACs | 3 | 3.1 | major | No AC for never-reviewed items; `repetitions > 0` filter and the 2.0-vs-2.5 default-ease gap mean the toggle would surface new items | State and assert the baseline-weight rule (P-8) |
| 29 | Architectural decisions | 3 | 3.1 | major | Does not state that it deliberately does *not* call `ReviewService`; CONTEXT.md's guidance is self-contradictory on this point | Make the sibling-not-chain relationship explicit (P-8) |
| 30 | SRP / god service | 3 | 3.1 | major | Fifth responsibility added to `GameItemSelectionService`; one test file spans three phases | Extract sources + weight + sampling (P-7) |
| 31 | Arch decision soundness | 3 | 3.1 | pass | "Worst underlying card, not an average" is correct and well argued for a per-symbol drill | — |
| 32 | AC testability | 3 | 3.2 | major | AC2 requires injecting 3.1's deterministic RNG "through the actual page", impossible without the provider-override harness | Harness task (P-6) |
| 33 | Task scope ownership | 3 | 3.2 | minor | `covers` omits `types.ts` and `PlayGameUseCase.ts`, which it must modify | Extend `covers` (P-11) |
| 34 | Dependency ordering | 3 | 3.1 | minor | `depends_on: ["2.1"]` vs README's "2 (phase)"; AC1 needs 2.3 | `depends_on: ["2.3"]` (P-12) |
| 35 | Ubiquitous language | all | 1.1, 2.1 | minor | `"symbols"/"words"/"mix"` vs the app-wide `CardPool` `"script"/"vocab"`; `dictation` vs `dictationTranslate` | Align with `CardPool` (P-9) |
| 36 | Trust boundary inventory | plan | README | suggestion | Omission is accurate for inputs but skips the new unvalidated deserialization boundary | Add one acknowledging sentence (P-16) |

## Phase-by-Phase Review

### phase-1-symbol-practice

#### task-1.1-domain-model-and-selection.md: Domain model + symbol selection service
- **Status**: findings
- **Findings**: This is the seam, and three of the plan's four most expensive problems originate here.
  - **P-2 (critical)**: the task fixes `GameItem` as carrying "character, name/question text, correct answer, audio URL if any", but the only source it names is `CardRepository.findAll("script")` returning `ReviewableCard[]`. Deduping by `symbolCharacter` leaves several `ScriptPropertyCard`s per symbol whose `question`/`correctAnswer` are property-specific ("What class is this?" / "low class"). There is no rule for which one wins, and the right answer — `symbols.ts` — is not in `covers`. Note also that `CardRepository.findAll` is typed `ReviewableCard[]`, so reaching `symbolCharacter` requires a narrowing to `ScriptPropertyCard`; if content moves to `symbols.ts`, the cards are needed only as an eligibility set and the narrowing shrinks to one place.
  - **P-1 (critical)**: the AD's rejection of tagging `GameItem` is the wrong call for a plan that also claims phase 1 ships standalone. One `kind: "symbol"` field makes phase 2 additive.
  - **P-4 (major)**: AC6 is enforced by nothing. Also broaden it beyond `presentation/`.
  - **P-14, P-15 (minor)**: AC4 under-specifies the 50/50 requirement; no AC for audio-less symbols; the RNG seam should land here, not in 3.1.
  - **P-10 (minor)**: port location deviation should be a stated decision.
  - Missing: the task is declared owner of the `GameRoundResult`-derived history-entry shape, but never defines it — and 1.2's AC5 (ordering) depends on it having a timestamp or a defined insertion order.
  - Good: reusing the raw `RecallRating` (`src/domain/shared/types.ts`) rather than the `srs/value-objects/RecallRating` class is the right choice for a boundary DTO and matches how `ReviewService` imports it as `RawRecallRating`. Deduping by the public `symbolCharacter` rather than by card id is correct and well justified.

#### task-1.2-game-history-repository.md: Game history repository
- **Status**: findings
- **Findings**: The separate-key decision is sound and its rejected-alternative rationale is genuinely load-bearing — `LearnerState` fields really do flow through `Validation.ts`, `MergeService.ts`, and `SettingsPage`'s export/reset, and dragging a practice log through that machinery to gain nothing is the wrong trade. Keep it. The problems are in the layering and the read path (**P-5, major**): dropping the `IStorage`-style adapter seam contradicts the task's own AC1 wording, forces jsdom into what should be a pure unit test, and leaves no place for a future backup/sync feature to enumerate stores. Add a malformed-payload AC and a "SRS reset does not clear game history" AC (**P-16**). The `sessionHistory`-precedent argument for an uncapped array is fine.

#### task-1.3-play-game-use-case.md: PlayGameUseCase
- **Status**: findings
- **Findings**: Architecturally the strongest task in the plan. The AD nails the actual mechanism — ratings live only in the use case's in-memory round state, so the schedule-mutating code path is never reached — and it is right that this beats any "don't apply to SRS" flag. The divergent accuracy threshold (Good/Easy only, vs `ReviewService.endReviewSession`'s `rating >= 3` at line 122) is correctly identified as a legitimate context-local convention rather than an inconsistency to reconcile; I verified both and agree. AC5 (accuracy `null` vs `0`) is a genuinely good behavioral AC. Two notes: **P-18 (suggestion)** — AC2 is weaker than it reads given `StorageCardRepository` rebuilds cards from DTOs on every `findAll`; snapshot the raw persisted blob instead. And the AD should state the stronger structural claim: no `ReviewableCard` ever crosses the selection-service boundary, so mutation is not merely avoided but unreachable.

#### task-1.4-symbol-game-presentation.md: Symbol game presentation
- **Status**: findings
- **Findings**: The one-page-with-`setup | playing | summary`-state decision is right and correctly justified against `ReviewPage`/`LessonPage` precedent; putting the input-mode toggle in component state rather than persisting it is right too, and 3.2 correctly stays consistent with it. Three problems:
  - **P-3 (major)**: exposing `GameHistoryRepository` on `AppContextValue` puts a persistence port in front of presentation. No repository is on that context today.
  - **P-6 (major)**: AC1-AC6 all assume a render-test capability the repo has never exercised — no `.test.tsx` exists, `AppProvider` cannot be given fakes (module-level consts), jsdom will throw on `audio.play()`, and there is no `setupFiles`/`globals` so RTL cleanup is unregistered. CONTEXT.md's claim that `DrawingQuiz`/`ReviewPage` are "covered today" this way is simply not true.
  - AC2's "from the domain layer, not decided in this component" is exactly the right instinct and worth keeping as written.
  - Adding the nav entry to the desktop `<nav>` rather than the 5-icon mobile row is correct per `BottomTabBar.tsx`'s existing conditional Grammar/Sentences links.

### phase-2-word-practice-and-mix

#### task-2.1-word-pool-and-mix-selection.md: Word pool + mix in the selection service
- **Status**: findings
- **Findings**: The riskiest task in the plan.
  - **P-2 (critical)**: "source eligible vocab words the same way `getLearnedThaiWords()` does" gives you a `Set<string>` of Thai words and nothing else. `VocabCard` has no `thai` and no `english`; `promptWord` is `word.thai` for five properties and `word.english` for `englishToThai` (`VocabCardGenerator.ts:105,117,130,151,165,179`); `audioUrl` is present only when `thai_audio_file` was non-null. Building a `WordGameItem` from cards alone requires unstated cross-card assembly. Meanwhile the *public* `VocabularyService.getLearnedEntries()` already returns exactly the `VocabEntry[]` projection this feature wants — the task's instruction to avoid `VocabularyService` (correct, it owns unlock/mastery concerns the game has no business with) points at injecting `VocabEntry[]` directly, which is the established `AppContext` pattern, but the task never says so and no task covers the wiring.
  - **P-1 (critical)** and **P-17 in the table**: the AD misstates who narrows on `kind`, and `covers` omits every phase-1 consumer of `GameItem`.
  - **P-21/P-12 (minor)**: `depends_on` should be `["1.4"]`.
  - **P-13 (minor)**: `ac_enforcement` has an AC5 the body lacks.
  - **P-7 (major)**: this is where the selection service starts becoming a god service; per-pool sources would make this task additive.
  - Good: "mix draws with no fixed ratio, capped at the requested count" is a clean, testable rule, and AC3 (one pool empty) is exactly the degenerate case worth pinning.

#### task-2.2-word-challenge-organisms.md: Word challenge organisms
- **Status**: findings
- **Findings**: The two-components-not-one AD is right and consistent with `DrawingQuiz`/`MultipleChoice`/`SentenceBuilder`. **P-2 (critical)**: AC4 asserts on `thai_audio_file`/`english_audio_file`, which are `VocabEntry` fields; if 2.1 sources from cards, those fields are not reachable from a `WordGameItem` and this AC cannot be written as specified — the two tasks assume different data sources for the same object. **P-6 (major)**: same jsdom audio/cleanup gap, now in two more new `.test.tsx` files. **P-17 (minor)**: pin down that "write-input" means canvas or paper, never a text field, because `RatingButtons` binds digits 1-5 on `window` with no focus check. Instructing the implementer to reuse the phase-1 input-mode prop contract verbatim rather than inventing a second one is a good, concrete anti-drift instruction.

#### task-2.3-pool-selector-and-dispatch.md: Pool selector + play-page dispatch
- **Status**: findings
- **Findings**: The dispatch model (page switches on `kind`, then `challengeDirection`) is the correct one and should be promoted from the Description into the Architectural Decision, because it contradicts 2.1's AD and the contradiction should be resolved in favour of this task. Defaulting to "Symbols" is a well-reasoned, user-respecting choice. **P-5/table-26 (major)**: adding `pool` to the persisted history entry is the plan's second schema change to a store a shipped phase 1 has already written, with no backward-compatibility AC — `GameHistoryList` must not break on a `pool`-less legacy entry. AC3 correctly extends 1.4's AC6 to the words/mix cases rather than re-litigating it. Note that this task is the one place the plan acknowledges re-touching `GamePage.tsx` after the union reshape — but it is not enough, because the two symbol organisms are the files the reshape actually breaks (see P-1).

### phase-3-weak-item-prioritization

#### task-3.1-weighted-selection.md: Weighted selection
- **Status**: findings
- **Findings**: Good instincts, wrong-by-omission semantics.
  - **P-8 (major)**: `getCriticalItems` filters `repetitions > 0` for a reason. `DEFAULT_SRS_DATA.easeFactor` is 2.0 while `EaseFactor.DEFAULT` is 2.5, so a never-reviewed card outranks a well-known one on "lowest ease". As specified, "Prioritize weak items" would preferentially drill freshly-unlocked items. No AC touches this.
  - **P-8 (major)**: the task reads stats via `CardRepository` — correct, and it does *not* couple to `ReviewService`, which is the right call — but it never says so, and CONTEXT.md's "do not reimplement that sort, call through the same repository ports" is self-contradictory and would push an implementer toward the coupling. Note `getCriticalItems` is structurally unusable here anyway: card-level DTOs, `limit = 10`, no `symbolCharacter`/Thai word.
  - **P-7 (major)**: fifth responsibility on one class. The task already knows the shape of the fix (pure weight fn + sampling fn); extract them as modules rather than methods.
  - **P-14 (minor)**: the injectable random source arrives here, one phase after the tests that needed it.
  - Good: "worst underlying card, not an average" is correct for a per-symbol drill and well argued. AC3 (full-set request returns everything exactly once regardless of weight) is precisely the invariant weighted-without-replacement implementations get wrong.

#### task-3.2-prioritize-weak-items-toggle.md: Prioritize-weak-items toggle
- **Status**: findings
- **Findings**: The smallest task, and its consistency argument with 1.4's input-mode decision (component state, not a persisted setting) is sound. **P-6/table-32 (major)**: AC2 requires reaching 3.1's deterministic random source "through the actual page", which needs a provider-override harness that does not exist and that no task creates — `AppContext.tsx`'s module-level singletons make this the hard part of the task, and it is weighted at 2 points. **P-11 (minor)**: `covers` omits `domain/game/types.ts` and `PlayGameUseCase.ts`, so nobody owns adding `prioritizeWeakItems` to `GameRoundConfig` or the use case signature. **P-12 (minor)**: fix 3.1's `depends_on` upstream. AC1 ("unchecked by default behaves exactly as phases 1 and 2") is a good regression criterion.

## Summary Statistics

- Tasks reviewed: 9 (1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2)
- Phases reviewed: 3
- Plan-level findings: 18
- Findings by severity:
  - critical: 2 (P-1 unowned `GameItem` breaking change; P-2 undefined item content source)
  - major: 6 (P-3 repository on the context; P-4 unenforceable AC6; P-5 persistence seam + no validation/versioning; P-6 missing render-test foundation; P-7 selection-service SRP; P-8 weak-item semantics)
  - minor: 8 (P-9, P-10, P-11, P-12, P-13, P-14, P-15, P-17)
  - suggestion: 2 (P-16, P-18)
- Plan-quality table rows: 36 (3 recorded as `pass`)
- Tasks with status `pass`: 0 — though 1.3 is close, and its SRS-isolation Architectural Decision is the plan's strongest piece of design reasoning
- Dependency graph: a valid DAG, but two `depends_on` edges (2.1, 3.1) are looser than the real coupling and contradict their own phase READMEs
- Would Uncle Bob approve? Of the *intent* — projection DTOs at the boundary, a domain-defined port, an orchestrator that cannot reach the mutation path — yes. Of the execution as written, not yet: a domain-purity criterion enforced by a gate that cannot enforce it, a domain service accreting five responsibilities across three phases, a repository port handed to the view layer, and a shared type reshaped mid-plan with no task owning its consumers are all fixable, but they are exactly the four things the plan claims to have thought about.
