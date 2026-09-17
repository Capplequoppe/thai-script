---
doc_type: reference
title: "Systems architect review — lesson rebuild"
description: Structural review of plans/lesson-rebuild against the indexed repository, focused on covers completeness, layering, seam sizing and the trust boundary inventory.
reviewer: systems-architect
plan: plans/lesson-rebuild
status: complete
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Systems architect review — lesson rebuild

## Executive Summary

This is a well-argued plan. Its phases are genuine vertical slices, its
architectural decisions almost all name a rejected alternative with a reason,
and every quantitative claim I spot-checked against the repository is exact —
5,454 corpus entries, 3,200 with an empty `word_class`, 277 mnemonics, 12
distinct classes, 1,523 nouns, 82 `mnemonic:` fields in `symbols.ts`, 25
`.webm` files, the `SyllableInfo` shape, and `LessonIntro`'s two consumers.
The `LessonContent` discriminated union is the right call over twin optional
fields, and CONTEXT.md's warning about the lesson-number join key is the right
thing to have put first.

A theme worth naming up front, because five findings share it: **the plan
repeatedly builds beside a repository feature instead of on it.** `priority`,
the five-way tone-contour vocabulary, the class badge, the lesson-order
declaration and the `migrateState` hook all already exist, and a task adds a
parallel version of each. In three of those cases the task's covers does not
even reach the existing one, so the duplication cannot be resolved by the
executor who notices it.

It is also, as written, **not schedulable**. Five separate covers gaps stop
phases 1 and 6 from reaching green, and each one is the same failure the
review brief flagged as precedent: a task that owns a change but not the files
the change reaches.

The largest is that CONTEXT.md's central claim is under-counted. Lesson number
is a join key across **four** persisted stores, not three. Every script card
in the learner's `localStorage` carries `lessonNumber` — 295 of 295 in the
`progress.json` sitting in this repository's root — and the three files that
write and read it appear in no task's covers. Task 1.1 migrates
`completedLessons`, leaves `card.lessonNumber` at its old integer, and every
consumer that joins the two (`unlearnLesson`, `getLessonMasteryProgress`,
`reconcileCards` → `addPendingCatchUp`) silently stops matching. That is
precisely the half-migration CONTEXT.md opens by warning about, reproduced
inside the task written to prevent it.

Four more blockers follow the same shape: the actual migration boundary lives
in `Storage.ts`, which no task covers; four presentation files break on the
identity change and no task can edit them; task 6.2 omits every video dispatch
site outside `LessonIntro`; and seven acceptance criteria assert against an
"extracted transcript corpus" that no task produces.

None of these are design faults. The design is sound and the seams are in the
right places. They are inventory faults, and they are all fixable by widening
covers and adding four or five acceptance criteria. My one structural
recommendation is to split task 1.1, which is carrying two separable jobs and
whose covers has to roughly double.

**Verdict: changes required before execution.** 5 blockers, 5 major, 6 medium.

## Plan-Level Findings

### A1 (Blocker) — Lesson number is a join key across four persisted stores; the fourth has no owner

CONTEXT.md's table names three stores. There is a fourth, and it is the one
holding the learner's SRS schedule.

Every `ScriptPropertyCard` serialises `lessonNumber` into persisted state:

- `src/domain/script/entities/ScriptPropertyCard.ts:15` (constructor),
  `:36` (`toDTO`), `:49` (`fromDTO`)
- `src/domain/shared/types.ts:85` — `PropertyCard.lessonNumber: number`, the
  persisted shape
- `src/domain/script/services/ScriptCardGenerator.ts` — assigns it at 20 call
  sites, sourced from `sym.lesson` (`const lesson = c.lesson ?? 0` at `:152`,
  and the same pattern at `:249`, `:314`, `:387`)
- `src/infrastructure/persistence/StorageCardRepository.ts:31-35` —
  rehydrates via `ScriptPropertyCard.fromDTO`

This is not theoretical. The `progress.json` in the repository root — a real
export, `completedLessons: [1..15]` — carries `lessonNumber` on **295 of 295**
cards.

Three consumers join persisted `card.lessonNumber` against a lesson identity:

- `ScriptLessonService.ts:170` — `unlearnLesson` deletes cards where
  `card.lessonNumber === lessonNumber`
- `ScriptLessonService.ts:279` — `getLessonMasteryProgress` filters the same way
- `ScriptLessonService.ts:319-323` — `reconcileCards` groups new cards by
  `card.lessonNumber` and calls `addPendingCatchUp(lessonNumber, ids)`

After task 1.1 moves lesson identity to strings and leaves persisted cards at
their old integers: unlearn silently no-ops, mastery progress reads zero for
every lesson, and catch-ups are written under a key `/catch-up/:lessonNumber`
can no longer resolve. `tsc` catches the type mismatch at the boundary if the
DTO type moves, and catches nothing at all if it does not — which is the
hazard CONTEXT.md describes.

**None of `ScriptPropertyCard.ts`, `ScriptCardGenerator.ts` or
`StorageCardRepository.ts` appears in any task's `covers` in this plan.**

*Fix:* add all three to task 1.1's covers, extend CONTEXT.md's table to four
rows, and add an AC: a pre-migration fixture whose cards carry integer
`lessonNumber` loads with those cards joined to the migrated lesson ids, and
`unlearnLesson` on a migrated lesson removes exactly the cards it removed
before.

### A2 (Blocker) — The migration boundary is `Storage.ts`, which no task covers

Task 1.1 AC3 requires the migration to happen "in one pass at the repository
boundary and nowhere else". That boundary is not the file the task covers.

- `src/infrastructure/persistence/Storage.ts:40` — `migrateState(state, now)`,
  the repository's existing legacy-migration hook (it already does
  `wordThai` → `promptWord` at `:51-54`)
- `Storage.ts:161` — `LocalStorageStorage.load()` calls `migrateState` and
  caches the result
- `Storage.ts:189-193` — `importData` runs `validateLearnerState` then
  `mergeLearnerStates` then `save`

`StorageLearnerStateRepository.ts`, which task 1.1 *does* cover, is a pure
delegator: `getCompletedLessons()` is `return this.storage.load().completedLessons`.
There is nowhere in it for a migration to live.

Two uncovered test files assert the pre-migration shape and will fail:
`src/storage.test.ts:27-32` and `:61-77` (round-trips `completedLessons: [1,2]`)
and `src/types.test.ts:14`. Neither is inside task 1.1's `verify` scopes
(`src/domain/script`, `src/infrastructure/persistence`, `src/domain/vocabulary`),
so 1.1 reports green and a later full `npm test` fails.

*Fix:* add `src/infrastructure/persistence/Storage.ts`, `src/storage.test.ts`
and `src/types.test.ts` to task 1.1's covers, and name `migrateState` in AC3
so the executor puts the migration where the repo's other migrations live.

### A3 (Blocker) — Task 1.1 breaks four presentation files that no task covers

Task 1.1's covers contains zero presentation files, and its verify is
`npx tsc --noEmit -p tsconfig.domain-check.json`, whose `include` is
`src/domain/**`, `src/application/**`, `src/infrastructure/**` only. So the
task goes green while presentation is broken. Task 1.2 runs `npm run build`,
which fails — on files 1.2's covers does not reach.

| File | Line | What breaks |
|---|---|---|
| `src/presentation/pages/ProgressPage.tsx` | `:20`, `:38-39`, `:241` | `new Set(state.completedLessons)`; `length < 25 ? length + 1` computes the next lesson by count |
| `src/presentation/components/organisms/LessonPath.tsx` | `:3`, `:19`, `:68` | prop typed `completedLessons: Set<number>`, **and `:19` generates the lesson list as `Array.from({ length: totalLessons }, (_, i) => i + 1)`** |
| `src/presentation/pages/StageItemsPage.tsx` | `:93` | `[...state.completedLessons].sort((a, b) => a - b)` |
| `src/presentation/pages/LearnedItemsPage.tsx` | `:163` | same numeric sort, then `lesson.getScriptSummary(lessonNum)` |

`StartLessonUseCase.getScriptSummary(lessonNumber: number)` (`:52`) is in 1.1's
covers, so its signature moves — and its three presentation callers
(`LessonPage.tsx:41`, `StageItemsPage.tsx:94`, `LearnedItemsPage.tsx:164`) do
not, except `LessonPage`.

`LessonPath.tsx:19` is the sharpest of the four and was found late, by the QA
review following a prop back from `ProgressPage.tsx:240`. It is not a type
error to be patched: it *derives lesson identities from integer arithmetic*, on
the primary navigation surface of the script course, and then hands an integer
to the lesson route via `onLessonClick: (n: number) => void`. Under stable
string ids the component cannot enumerate the sequence at all — there is
nothing to count up to. It has to read the declared order instead, which is the
third consumer arguing for `lessonSequence.ts` existing at 1.1 (A17).

*Fix:* add the four files to task 1.1's covers (or to a dedicated
presentation-migration task in phase 1), and add `npm run build` to 1.1's
verify so the gap cannot recur silently.

### A4 (Blocker) — Task 6.2's covers omits every video dispatch site outside `LessonIntro`

Phase 6's README says "`CatchUpPage` is the second consumer, as it has been
since phase 1". That is true of `LessonIntro`. It is not true of the video
arm, which has two more dispatch sites:

- `src/presentation/pages/LearnedItemsPage.tsx:77` — `const url = lesson.videoUrl!;`
  inside its own `VideoPlayer`, a complete second video renderer
- `src/presentation/pages/LearnedItemsPage.tsx:171` — `if (summary.videoUrl)`,
  building the "videos" list
- `src/domain/script/services/ScriptLessonService.ts:87` — `videoUrl?: string`
  on `LessonSummary`; `:198` populates it; `:362` sets it `undefined`
- `src/domain/script/services/ScriptLessonService.test.ts:356` — asserts
  `summary.videoUrl` is undefined

Task 6.2's covers names none of these. Its verify runs `npm run build` and
`npm test -- src/presentation` and `npm test -- src/domain/script`; all three
fail on files the task cannot edit.

*Fix:* add `LearnedItemsPage.tsx`, `ScriptLessonService.ts` and
`ScriptLessonService.test.ts` to task 6.2's covers, and extend AC5 to name the
third surface — the learned-items video list — rather than only the two lesson
routes.

### A5 (Blocker) — The "extracted transcript corpus" is owned by no task

Seven acceptance criteria assert against it:

| Task | AC | Phase |
|---|---|---|
| 1.4 | AC5 | 1 |
| 2.4 | AC4 | 2 |
| 2.5 | AC5 | 2 |
| 3.2 | AC5 | 3 |
| 3.3 | AC5 | 3 |
| 4.2 | AC5 | 4 |
| 5.3 | AC5 | 5 |

The source material is 52 files under `src/Thai Alphabet/` — and they are
**PDFs** (`TAME_L*_tpod101.pdf`, `TAME_L*_tpod101_recordingscript.pdf`), not
text. Extracting them needs a PDF text extractor, a place to put the result,
and a decision about whether the result is committed.

No task's `covers` names an extraction script, a corpus artifact, or a
dependency. No `verify` block runs one. `scripts/requirements.txt` is in task
1.3's covers, but 1.3 has no AC about the corpus. The first task that needs it
is 1.4, whose covers is four files: a lesson script, an asset directory,
`symbols.ts`, and one test.

There is a second question behind the scheduling one. CONTEXT.md's originality
constraint says the transcripts are copyrighted and the facts in them are not.
An extracted, committed, full-text corpus of all 25 transcripts is a
reproduction of the protected expression, sitting in the repository as a test
fixture — which is a different artifact from the PDFs already there, and the
plan does not say whether it is committed, generated locally, or
`.gitignore`d. The 8-gram check is the right mechanism; where its corpus lives
needs a decision.

**The mitigation those ACs carry does not hold either.** All seven say some
version of "the check asserts it detects a planted overlap, so an empty or
unreadable corpus cannot make it pass vacuously". As the QA review points out,
that inference is wrong: planting an overlap and detecting it proves the
*algorithm* works and says nothing about the corpus being loaded. An empty
corpus plus one planted sentence passes the positive case and the negative case
simultaneously. So even once someone builds the extractor, the check stays
vacuous unless it also carries a canary — assert that a known verbatim
transcript phrase *is* found — and a token-count floor on the loaded corpus.

*Fix:* give the corpus an owning task in phase 1 — extraction script, corpus
artifact path, PDF dependency in `requirements.txt`, all in covers — add the
canary and the size floor to the shared check rather than to each of the seven
ACs, and add an AD recording whether the corpus is committed and why.

## Plan Quality Findings

| ID | Severity | Finding | Where |
|---|---|---|---|
| A1 | Blocker | `lessonNumber` on 295/295 persisted cards is a fourth join-key store; its three files are in no covers | Task 1.1, CONTEXT.md |
| A2 | Blocker | The migration boundary is `Storage.ts`/`migrateState`, in no covers; `StorageLearnerStateRepository` is a delegator | Task 1.1 |
| A3 | Blocker | Four presentation files break on the identity change and no task covers them; 1.1's gate cannot see presentation | Task 1.1 |
| A4 | Blocker | Task 6.2 omits `LearnedItemsPage`'s own `VideoPlayer` and `LessonSummary.videoUrl` | Task 6.2 |
| A5 | Blocker | Seven ACs assert against a transcript corpus no task produces; source is 52 PDFs | Tasks 1.4, 2.4, 2.5, 3.2, 3.3, 4.2, 5.3 |
| A6 | Major | The seam 1.1 fixes does not include `LessonSummary`, the only thing `LessonIntro` receives | Tasks 1.1, 1.2 |
| A7 | Major | `currentLesson`, `PendingCatchUp.lessonNumber` and `LessonProgress.lessonNumber` are persisted and unmigrated | Task 1.1 |
| A8 | Major | `AchievementService` and `ProgressPage` hardcode 25 lessons; the plan ships ~20 | Task 4.3 |
| A9 | Major | Task 2.3 creates `DistrictBadge` beside the existing `ClassBadge`, the second-mapping pattern its own AD forbids | Task 2.3 |
| A10 | Major | `VocabEntry`'s type file is in no covers, yet four tasks add fields to it | Tasks 2.2, 5.1, 5.2, 5.3 |
| A11 | Medium | AC4 names a `private` method on a class whose name differs from its file | Task 1.1 |
| A12 | Medium | AC7 covers one of three integer prerequisite walks in the same file | Task 1.1 |
| A13 | Medium | Trust inventory: three missing rows, one Reaches cell naming no sink | Plan README |
| A14 | Medium | Task 2.2's dependency on 2.1 is spurious and lengthens the phase's critical path | Phase 2 |
| A15 | Medium | `public/lessons/` as a covers entry hides which directories 2.5 creates | Task 2.5 |
| A16 | Medium | `deckPath` is an infrastructure path in a domain type, and deck loading has no declared owner | Tasks 1.1, 1.2 |
| A17 | Major | `lessonSequence.ts` is first created in phase 2 but task 1.1 AC7 already requires a declared order | Tasks 1.1, 2.5, 3.1 |
| A18 | Major | The backfill's accuracy is reported once and never regression-gated, though the same plan uses a baseline contract twice elsewhere | Task 5.2 |
| A19 | Major | `symbols.ts` already declares and populates `priority`; task 4.1 adds a second source and cannot reconcile it | Task 4.1 |
| A20 | Major | `ToneContourIcon` already encodes tone as contour with the five-way vocabulary 2.1 AC3 specifies; 2.3 adds a second encoding, and its only consumer is in no covers | Tasks 2.1, 2.3 |
| A21 | Medium | Confusability is asserted over by two tasks but exists as data nowhere — 2.4 AC5's pair list lives only in AC prose | Tasks 2.1, 2.4, 3.3 |
| A22 | Major | `isAspirated` contradicts `initialSound` on ฑ and ฒ, which makes task 2.1 AC1 unsatisfiable — and 2.1's covers cannot reach the data | Task 2.1 |
| A23 | Major | `romanization` is not uniformly IPA; task 2.2's premise is false and a blanket conversion corrupts entries already converted | Task 2.2 |
| A24 | Medium | The 277 existing `vocabulary.json` mnemonics are outside the originality constraint that governs the 82 in `symbols.ts` | Tasks 5.3, CONTEXT.md |
| A25 | Major | Task 2.4 AC5's confusable list omits the two highest-consequence pairs, weights a worthless one equally, and covers no vowels — and it should be derived, not asserted | Tasks 2.1, 2.4 |
| A26 | Major | `word_class` already drives grammar card generation; task 5.2's backfill silently changes it, and `src/domain/grammar/` is in no task's covers | Task 5.2 |
| A27 | Major | 5.1's room taxonomy and `word_class` are two representations with incompatible requirements, and nothing says they must stay separate | Tasks 5.1, 5.2 |

## Phase-by-Phase Review

### Phase 1 — Tracer

The phase shape is right. Four tasks, a real seam task first, two concurrent
tasks on genuinely disjoint covers, and an end-to-end criterion (1.4 AC4) that
fails if any hop is wrong. The "if the plan stopped here" section is honest.
Every blocker in this review except A4 and part of A5 lands in this phase, and
they all land in task 1.1.

**A6 (Major) — the seam does not include what presentation consumes.**
`LessonIntro`'s entire input is `summary: LessonSummary`
(`LessonIntro.tsx:13-16`), built by `ScriptLessonService.getLessonSummary`
(`:188-198`) and surfaced through `StartLessonUseCase.getScriptSummary` (`:52`).
For task 1.2 to dispatch on `LessonContent` at all, `LessonSummary` has to
carry it. Both files are in task 1.1's covers — good — but **none of 1.1's
seven ACs mentions `LessonSummary`**, so the contract 1.2 is told to build
against is not one 1.1 is required to deliver. 1.2 cannot add it (wrong
covers) and cannot proceed without it.

*Fix:* add an AC to 1.1: `LessonSummary` carries the lesson's `LessonContent`,
and `getScriptSummary` surfaces it unchanged.

**A7 (Major) — three more persisted lesson-number fields.** AC3 migrates
`completedLessons` only. Also persisted in `thai-srs-state` and keyed on lesson
number:

- `src/domain/shared/types.ts:174` — `currentLesson: number | null`, written
  by `setCurrentLesson`, read by `ScriptLessonService.ts:160` and `:175`
- `src/domain/shared/types.ts:167-168` — `PendingCatchUp.lessonNumber`, written
  by `addPendingCatchUp`, matched in `CatchUpPage.tsx:30`
  (`p.lessonNumber === num`)
- `src/domain/shared/types.ts:113` — `LessonProgress.lessonNumber`

`currentLesson` unmigrated means a learner mid-lesson resumes into nothing.
`pendingCatchUps` unmigrated means a queued catch-up becomes unreachable.

**A11 (Medium) — AC4 is not executable as written.**
`getMasteredCharacters()` is `private`
(`VocabularyLessonService.ts:41`), and the exported class is
`VocabularyService`, not `VocabularyLessonService` — the file name and the
class name differ. CONTEXT.md carries the same slip. The observable equivalent
is `getUnlockedWords()` (`:117`), which is also the thing that actually
matters to a learner. The criterion is right; its handle is wrong.

**A12 (Medium) — AC7 names one of three integer walks.** The full inventory,
after two corrections in review (my first count of three was right by accident,
for the wrong reasons; QA's two was right about the domain and short overall):

| Site | Form |
|---|---|
| `ScriptLessonService.ts:132` | `for (let i = 1; i < lessonNumber; i++)` — `startLesson`'s prerequisite check |
| `ScriptLessonService.ts:182` | `for (let i = 1; i <= TOTAL_LESSONS; i++)` — `getNextLesson` |
| `LessonPath.tsx:19` | `Array.from({ length: totalLessons }, (_, i) => i + 1)` — the lesson path's node list |

`isNextLessonAvailable` (`:291`) is `return this.getNextLesson() !== null`; it
inherits the assumption rather than holding a fourth walk.

AC7 and its test cases name only `startLesson`. `getNextLesson` is more
consequential — it decides what the Dashboard's next-lesson affordance offers,
so a wrong answer there is the learner's entry point rather than an error
message. The third is in presentation and belongs to A3; see below for why it
raises that finding's severity.

**A16 (Medium) — where the deck is loaded is undecided.**
`LessonContent = { kind: "deck", deckPath }` puts a `public/`-relative path in
a domain type (`src/domain/script/data/lessonContent.ts`). That is not worse
than the `videoUrl` it replaces, so I would not block on it. What is genuinely
undecided is *who fetches the deck*: 1.2 AC3 requires "a deck fails to load or
parse" to be a distinct state, which implies a fetch, and 1.2's covers admits
only `DeckSlide.tsx`. The repo has precedent for both placements —
`useToneAttempt.ts:31` fetches from presentation,
`HttpConversationPracticeClient.ts:74` from infrastructure. CONTEXT.md's own
clean-architecture line argues for the second. Either works; the plan should
say which, because the choice is currently being made by omission.

**A17 (Major) — the order AC7 depends on is not created until phase 2.**
(Raised by the plan-structure review; the call is a type-design one, so
answering it here.) Task 1.1 AC7 requires `startLesson` to enforce
prerequisites "from the declared lesson order, not from integer arithmetic over
the id". `lessonSequence.ts` appears in no phase-1 covers — it first shows up
in task 2.5's (phase 2), and phase 3's README then calls task 3.1 its owner.

The two readings are (a) 1.1 declares order as a field on the existing
`lessons[]` table in `symbols.ts` and 2.5 extracts it later, or (b)
`lessonSequence.ts` should exist from 1.1 and its absence is a gap. **It is
(b)**, for three reasons:

1. Reading (a) makes phase 1 declare ordering one way and phase 2 replace it
   with another. That is a representation swap with a per-consumer window
   between the two — the shape CONTEXT.md rejects in its own rejected
   alternatives.
2. `symbols.ts` is the plan's highest-contention file: tasks 1.1, 1.4, 2.4 and
   6.2 all cover it, and it is ~3,000 lines. Curriculum ordering is the one
   thing in this plan that three later tasks read as a unit (3.1 AC7, 3.3 AC3,
   4.3 AC6) and that no task should have to diff a 3,000-line data file to
   change.
3. The existing `lessons[]` ordering is implied twice over — by array position
   and by a `number` field that 1.1 removes. Neither survives the change, so
   something has to be created at 1.1 regardless; the only question is whether
   it is named.

*Fix:* move `src/domain/script/data/lessonSequence.ts` (and its test) into task
1.1's covers, declaring the ordered lesson ids and the number-to-id
correspondence the migration needs. Task 2.5 then extends a file that exists,
and phase 3's "3.1 owns `lessonSequence.ts`" becomes "owns it as of phase 3",
which is what it means.

**Confirmed correct:** task 1.2's claim about `LessonIntro`'s consumers. The
only importers are `LessonPage.tsx` and `CatchUpPage.tsx`; the third grep hit,
`ScriptLessonService.ts:336`, is a comment. Both are in 1.2's covers, and both
parse the route param identically (`Number(lessonNumber)` at `LessonPage.tsx:27`
and `CatchUpPage.tsx:22`), which the deck arm will have to stop doing — also
in covers.

**On task 1.3's architecture.** Python generators in `scripts/` whose *output*
is asserted from vitest is the right boundary, and the AD's reasoning is
correct: the contract is the committed artifact, the artifact is committed, and
the runner that already exists can read it. Two honest caveats worth stating
rather than fixing: `py_compile` is a syntax check and not a test, and AC3 and
AC6 both carry `ac_enforcement: none` — so the plan's most expensive external
dependency has no automated evidence at all, only a reviewer running the
generator. Given the rejected alternative (a second test runner) that is the
right trade, but the phase reviewer needs to know those two are hand-checks.

### Phase 2 — Encoding

The strongest phase in the plan. The phonetic class rule is a real reduction
(44 facts to 11), task 2.1 correctly makes it a derivation rather than a table,
and the district-for-class / motion-for-tone split is argued from the right
premise — two attributes competing for one axis, and tone has the better claim
on it.

**A9 (Major) — 2.3 creates the second class mapping its own AD forbids.**
`src/presentation/components/atoms/ClassBadge.tsx` already exists and already
imports `consonantClassColor`. It is the component whose entire job is showing
a consonant's class. Task 2.3's AD says a second module keyed on class would
"recreate exactly" the divergence `consonantClassColor.ts`'s comment records —
and then the task adds `DistrictBadge.tsx` as a new atom, leaving `ClassBadge`
out of covers. The result is two class-display atoms, one with a district and
one without, and AC2 ("with colour removed the three classes remain
distinguishable") is satisfied by the new one while the old one still fails
for red-green CVD wherever it is used.

Related: five more files import `consonantClassColor` and none is in 2.3's
covers — `MultipleChoice.tsx`, `Flashcard.tsx`, `WordCard.tsx`,
`VocabularyPage.tsx`, `DictionaryPage.tsx` (the last three confirmed by
`codegraph impact classColorForLevel`). If AC3 changes what
`classColorForLevel` returns, they break. If it only adds an export, they do
not. The plan should say which.

*Fix:* put `ClassBadge.tsx` in 2.3's covers and make AC1 about extending it,
not about a parallel atom. Keep `DistrictBadge` only if `ClassBadge` composes
it.

**A22 (Major) — a source-data defect makes task 2.1 AC1 unsatisfiable, and
2.1 cannot reach the data to fix it.** (Raised by the Thai-teacher review;
confirmed, and bounded.) AC1 requires all 44 consonants to classify into a
sound type "with no exception list", and AC2 requires the sonorant and
unaspirated-stop buckets to be *derived*. The obvious derivation reads
`ThaiConsonant.isAspirated`. Two records contradict themselves:

| Character | `initialSound` | `isAspirated` |
|---|---|---|
| ฑ | `"th (usually same as ท, sometimes d)"` | `false` |
| ฒ | `"th (same as ฑ and ท)"` | `false` |
| ท (for contrast) | `"th (aspirated T, like T in 'top'...)"` | `true` |

Both are /tʰ/ — aspirated — and both are declared low class. A derivation keyed
on `isAspirated` therefore resolves them to **mid**, contradicting their
declared class, and AC1 fails. The tempting repair is precisely the exception
list AC1 forbids.

I scanned all 44 records comparing `isAspirated` against the aspiration implied
by `initialSound`: **exactly two disagree**, ฑ and ฒ. That is worth stating,
because it makes the fix a bounded data correction rather than an audit.

And the same shape as A19: **`symbols.ts` is not in task 2.1's covers**
(`sceneGrammar.ts`, `soundType.ts` and their tests). The task whose central
criterion the defect breaks cannot edit the data that breaks it.

**This is a live defect, not a latent one — correcting my own earlier claim.**
I told two reviewers that `isAspirated` had no consumer outside `symbols.ts`
and that the error had survived because nothing read the field. That was wrong;
I asserted it without grepping. It has three consumers —
`ScriptLessonService.ts:39` and `:210` carry it through the DTO, and
`SymbolCard.tsx:72` renders it:

```
{c.isAspirated && <SymbolInfoRow label="Aspirated" value="Yes" />}
```

Because the row is truthy-gated, ฑ and ฒ today display **no aspiration row at
all** where they should read "Aspirated: Yes". So the defect is already visible
to learners on two letters pronounced /tʰ/, independently of anything in this
plan. It should be fixed regardless of whether the class rule ships, and it
does not belong to the dormant-field pattern. (`priority`, in A19, genuinely
does: declared, populated, zero readers — verified separately.)

Note the fix spans two tasks' covers as the plan stands: the data lives in
`symbols.ts` (task 2.1 cannot reach it) and the render in `SymbolCard.tsx`
(task 2.3's covers). Nothing currently owns both.

*Fix:* add `symbols.ts` to 2.1's covers and a data-fix AC — `isAspirated` is
`true` for ฑ and ฒ, plus a test asserting `isAspirated` agrees with
`initialSound`'s implied aspiration for all 44, so the invariant holds after
later edits rather than being repaired once.

**Part of task 2.1's structure should be derived rather than authored — but
only part, and the boundary matters.** This began as the accelerated-learning
review's observation that the seven cousin groups cover 25 letters. Grouping all
44 by normalised `initialSound` and splitting on whether a group spans more than
one `classType` gives:

| | groups | letters | |
|---|---:|---:|---|
| non-spanning, all Low | 7 | **10** | ม น ณ ง ย ญ ว ร ล ฬ |
| non-spanning, all Mid | 7 | **9** | ก ด ฎ บ จ ต ฏ ป อ |
| class-spanning | **7** | **25** | of which **11 High**: ข ฃ ฉ ฐ ถ ผ ฝ ศ ษ ส ห |

Three properties hold that are not obvious in advance: every spanning group
spans High/Low and never Mid; **no uniformly-high sound group exists**; and
therefore all 11 high letters sit inside spanning groups, which is where the
number 11 comes from.

**Where the derivation is safe, and where it is not.** I first wrote that this
means none of `soundType.ts` needs authoring. That was wrong, and the
accelerated-learning review caught it — the error is worth recording because it
would have passed as a strengthening while gutting the task's central check.

AC1 requires the sound-type classification to *agree with each consonant's
declared class for all 44*. If the classification is derived **from**
`classType`, that agreement is tautological and AC1 tests nothing. The plan's
real claim — sonorants are low, unaspirated stops are mid — is a claim about
Thai phonology, and it is falsifiable only against a sound type determined
independently of the class it is being checked against.

So the boundary is:

- **Still authored, and phonetically grounded:** the sound-type classification
  itself, read from `initialSound` (and aspiration), never from `classType`.
  This is the independent side of AC1's check and is the whole reason AC1 is
  worth running.
- **Safe to derive:** the seven group memberships and the 11-member high list —
  "which aspirate/fricative letters are declared High". That is enumeration, not
  hypothesis, so computing it from `(soundType, classType)` asserts nothing and
  removes the hand-maintained list A25 objects to.

This also makes A22's data fix **necessary rather than moot**. Distinguishing an
unaspirated stop from an aspirate *is* the aspiration question, so the
independent side of the check leans on exactly the field that is wrong for ฑ and
ฒ. Read aspiration from `initialSound`, which is correct for both, rather than
from `isAspirated`, which is not — and fix the flag regardless, since
`SymbolCard.tsx:72` renders it.

**A symmetry that connects two phases.** The split above states as one story
what the plan teaches as three rules: every high-class sound in Thai has a
low-class partner; mid class has no partners and needs none; **sonorants have no
high partner at all** — which is precisely the gap ห นำ exists to fill. The plan
teaches the first half as a phase-2 rule and the second as an unrelated phase-3
mechanism (task 3.2's leading-consonant lesson). They are two halves of one
symmetry, and a course that says so gets a good deal of phase 3 free from phase
2. Worth an explicit link between task 2.5's class-rule lesson and task 3.2's,
neither of which currently references the other.

**A23 (Major) — `romanization` has no invariant, and task 2.2's premise is
false.** 2.2 opens "The app currently carries two romanizations: IPA in
`vocabulary.json` (`tʰîː`) and a Paiboon-like style in `symbols.ts`". The
corpus does not agree. Classifying all 5,454 values by whether they carry
IPA-distinctive characters (`ʰ ː ɔ ɛ ə ŋ ʔ ɯ` …) or Paiboon markers (`bp`, `dt`,
tone diacritics):

| | count |
|---|---:|
| carries IPA-distinctive characters | 3,061 |
| no IPA character, Paiboon markers present — ไป `bpai`, ถูก `thùuk`, ให้ `hâi` | 1,894 |
| neither — ได้ `dâj`, เป็น `pen`, ไม่ `mâj`, กับ `kàp` | 495 |
| mixed within one string — ครับ `kʰráp`, หรือเปล่า `rʉ̌ʉ-plàaw` | 4 |

My split differs from the Thai-teacher review's (3,322 / 558 / 736 / 838)
because we drew the marker boundaries differently — they counted Paiboon tone
diacritics on an IPA segment as "mixed", I counted them as Paiboon. **That the
two careful classifications disagree this much is itself the finding.** The
field is heterogeneous enough that its notation cannot be determined by
inspection, so a blanket one-way conversion is being applied to a column where,
on any reading, at least 2,400 of 5,454 entries (44%) carry no IPA character at
all. Those get converted a second time. And the `neither` bucket is a third
notation, not a subset of the other two — `dâj` and `mâj` use `j` for /j/ where
Paiboon writes `i`.

*Fix:* restate 2.2 as a **normalisation of a heterogeneous field with per-entry
notation detection**, not a conversion. Extend its three-state model to four,
with "already in the target notation" as a first-class state rather than
something the converter discovers. The task's own ADR — IPA canonical, Paiboon
derived and stored, both kept for diff reviewability — is sound and should
stand.

*Related, and cheap to fix now:* nothing in the plan says **which** Paiboon.
Benjawan Becker's own scheme writes ออ as `aw` and เออ as `er`; `symbols.ts`
writes `aaw` and `ooe`, and the corpus's already-Paiboon entries agree with
`symbols.ts`. The plan correctly sequences 2.2 before 2.4 so the two do not
settle conventions independently, but ordering alone does not pin a convention.
2.2 should carry a normative table, not just precedence.

**A25 (Major) — the confusable list is the wrong list, and asserting it in
prose is why.** (Raised by the Thai-teacher review once A21's redirect made the
list behavioural rather than documentary; every claim below independently
verified against `symbols.ts` and the corpus.)

A visual confusion costs a **tone** error only when the two glyphs differ in
class. Checking all ten of AC5's groups against `classType`, only four cross a
class boundary — ถ/ก/ภ, ค/ด, ผ/พ, ฝ/ฟ. The other six (ม/น, ช/ซ, พ/ฟ, บ/ป, ด/ต,
ฎ/ฏ) are same-class on both sides and carry no tone cost at all.

**Two high-consequence pairs are missing**, and both cross High/Low:

| Pair | Classes | Token-weighted syllable-initial share |
|---|---|---|
| ส / ล — ส is ล plus one stroke | High / Low | 5.02% / 3.89% |
| ข / ช — ข has a notch where ช is smooth | High / Low | 3.73% / 2.38% |

By frequency times class-crossing these are the two costliest visual confusions
in the writing system, and neither is in the list. (อ/ฮ also crosses, Mid/Low,
but ฮ is 0.01% — worth recording, not worth drilling.)

**One entry is worth nothing.** ฎ/ฏ is both-mid, so no tone cost, and ฎ is 0.04%
of running text. It currently carries the same weight as ค/ด.

**And some confusions are free.** ฬ/ล, ณ/น, ฆ/ค, ฑ/ท, ฒ/ท are each visually
similar, identical in sound *and* identical in class — verified for all five.
Misreading one as the other produces the correct pronunciation and the correct
tone. A confusable map that treats these like ส/ล spends SRS time buying
nothing, and telling a learner "these look alike and it does not matter"
removes anxiety that otherwise attaches to the rarest letters in the alphabet.

**Vowels are absent entirely.** AC5 lists consonant groups only, while ิ/ ี and
ุ/ ู differ by one stroke and change vowel *length*, which changes tone through
the live/dead rules; เ/แ differ by one stroke. Task 2.4 rewrites all 29 vowel
mnemonics with no criterion requiring any of them to contrast.

**There are three statements of this relation, and they are not the same
relation.** Task 2.4 AC5 lists ten groups as AC prose. Task 3.3's body lists six
more — ข↔ค, ฉ↔ช, ถ↔ท, ผ↔พ, ฝ↔ฟ, ส↔ซ — as "the high/low pairs... six decisions
rather than twelve letters". No task asserts the two agree.

They overlap on ผ/พ and ฝ/ฟ and diverge everywhere else, and the reason is that
they are **different relations**. 3.3's six are phonetic cousins: same sound,
different class (ข/ค both /kʰ/, ส/ซ both /s/). 2.4's ten are visual
look-alikes. ผ/พ and ฝ/ฟ appear in both because those letters happen to look
alike *and* sound alike. Modelling them as one `confusableWith` field would
merge two relations that a learner confuses for different reasons and that need
different remedies — a visual contrast cue versus a class-and-tone contrast —
and would feed a distractor sampler pairs that are confusable in a sense the
card being drilled is not testing.

**One of the two relations is fully computable from fields that already
exist.** (Accelerated-learning review's extension; I verified it and it is
stronger than either of us first had it.) Grouping all 44 consonants by
normalised `initialSound` and keeping the groups that span more than one
`classType` reproduces the phonetic-cousin relation exactly — no authoring at
all:

| Sound | High | Low |
|---|---|---|
| kh | ข ฃ | ค ฆ ฅ |
| ch | ฉ | ช ฌ |
| th | ถ ฐ | ท ธ ฑ ฒ |
| ph | ผ | พ ภ |
| f | ฝ | ฟ |
| s | ศ ษ ส | ซ |
| h | **ห** | **ฮ** |

Two things fall out of the derivation that the hand-written list does not have.

**It finds a missing member.** Seven groups derive; task 3.3's body lists
**six**. The one it omits is /h/ — ห/ฮ. ห is arguably the highest-consequence
high-class consonant in the system, because it is also the ห-นำ letter that
phase 3's entire leading-consonant lesson is built on. The hand list drops the
member that matters most, which is both the ordinary failure mode of curated
lists and a concrete argument for deriving this one.

**It is richer than pairs.** `th` is High ถ ฐ against Low ท ธ ฑ ฒ — six
letters, not two; `s` is four. The seven derived groups cover **25 of the 44
consonants**. Task 3.3's framing, "six decisions rather than twelve letters",
understates its own idea: derived, it is seven decisions covering twenty-five
letters.

Worth noting the derivation is also robust to A22 — it keys on `initialSound`,
which is correct for ฑ and ฒ, rather than `isAspirated`, which is not. They land
in the `th` group correctly.

*Fix:* **two relations — one derived, one authored.** Phonetic cousins computed
from `(initialSound, classType)`: free, complete, and unable to drift. Visual
look-alikes authored as `confusableWith` with a `contrastFeature`, because
shape similarity genuinely is not derivable from any field the repo holds. The
overlap (ผ/พ, ฝ/ฟ) falls out rather than being maintained against either list.

The split matters beyond the data model, and it decides how A21's `pickChoices`
redirect must be wired: the two confusions have opposite remedies. A visual
confusion is perceptual — the learner cannot tell the shapes apart, and
contrast training fixes it. A cousin confusion is not perceptual at all; the
learner sees the difference fine and cannot recall which identical-sounding
glyph carries which class, which is paired-associate and needs class retrieval
practice. So the distractor pools have to stay **separate by card type**: a
glyph-recognition card for ม offers น; a class card for ข offers ค. One merged
`confusableWith` field feeding one pool would supply each card type with the
distractors meant for the other. Specifically: (1)
store **groups**, not pairs — ผ ฝ พ ฟ is one four-way clique, not three
overlapping pairs, and the distractor sampler should take the connected
component; (2) attach a **consequence weight computed** as spans-more-than-one-class
times members' corpus frequency, which drops ฎ/ฏ to the floor and lifts ส/ล to
the top with no one arguing, and survives a corpus update; (3) extend to vowels
on the same structure. A derived weight also means A21's `pickChoices` redirect
draws distractors in proportion to what a confusion actually costs, rather than
uniformly across a hand-written list.

*Two supporting facts corrected, without changing the conclusions.* The
Thai-teacher review gives ส and ล as the 2nd and 6th commonest syllable
initials; by token-weighted share they are 8th and 13th (ค, ก, ท, ห, ม, น, ป
lead). The percentages quoted are exact and the ranking claim is the only part
that moves — ส/ล remains the highest-consequence *class-crossing* pair. And ฏ is
described as not occurring anywhere in the corpus; it occurs in 15 entries,
including ปฏิบัติ (rank 497) and ปรากฏ (rank 508), but **never as a syllable
initial** — zero occurrences in that position. So a learner does meet the glyph
in common words; what is true, and what matters for weighting, is that it never
carries an initial-position tone decision.

**A20 (Major) — 2.3 adds a second tone encoding beside one that already
exists.** (Raised by the accelerated-learning review; confirmed, and it is
sharper than a duplication worry.)
`src/presentation/components/atoms/ToneContourIcon.tsx` already renders tone as
a pitch contour, and its header comment already makes this plan's own
channel-allocation argument, in the plan's own terms: "color is already spoken
for by consonant class (see consonantClassColor.ts), so a second arbitrary
color-to-tone mapping would compete for the same visual channel. A contour is
iconic instead... and it scales to 5 categories better than color does".

More than that: `TONE_CONTOUR_POINTS` already declares exactly five tone
shapes — mid, low, high, falling, rising. **That is the "separate tone-motion
vocabulary of five" task 2.1 AC3 specifies, already implemented.** 2.1 is
written as though it is fixing that vocabulary for the first time.

Task 2.3 lists `ToneContourIcon.tsx` in covers but no AC mentions it, and AC4
instead specifies motion "within the symbol's frame" — a different rendering at
a different site. So either 2.3 extends the existing atom, or the app ships two
tone encodings.

There is a covers gap behind it. `ToneContourIcon`'s only consumer is
`WordCard.tsx` (`:7`, `:163`), which is in task **5.3's** covers, not 2.3's.
A props change in 2.3 therefore breaks 2.3's own `npm run build` on a file 2.3
cannot edit.

*Fix:* have 2.1 AC3 declare that the tone-motion vocabulary **is**
`TONE_CONTOUR_POINTS`, not a new one; have 2.3 AC4 extend `ToneContourIcon` to
the symbol frame rather than describe a parallel rendering; add `WordCard.tsx`
to 2.3's covers.

**A21 (Medium) — confusability is asserted over but exists as data nowhere.**
Task 2.4 AC5 requires ten confusable pairs (ม/น, ช/ซ, พ/ฟ, ค/ด, บ/ป, ด/ต, ผ/พ,
ฝ/ฟ, ถ/ก/ภ, ฎ/ฏ) to carry contrasting shape cues, and task 3.3's test cases
require each high/low cousin pair to be introduced together with differing
districts. Neither the existing `symbols.ts` nor task 2.1's mnemonic schema
(district, shape cue, sound cue, tone motion) has a field for the relation.

I checked the scale, because it bears on the fix: of the 82 mnemonic strings,
exactly **one** states a confusable relation in prose (`symbols.ts:804` — "Don't
confuse with ด: ค has counter-clockwise head, ด has clockwise head"). So the
relation is barely encoded today. That makes the finding sharper rather than
weaker — 2.4 AC5's pair list currently exists **only as English prose inside
the acceptance criterion**, which means the check can only be written by
transcribing the AC text into a test fixture, and 3.3 will transcribe it again.

**The repo already models confusability — of the other kind, in the other
layer.** (Found by the accelerated-learning review; verified and extended.)
`VocabCardGenerator.ts` builds three confusable maps —
`initialSoundConfusableMap` (`:59`), `finalSoundConfusableMap` (`:63`) and
`buildVowelConfusableMap` (`:85`) — derived from existing symbol fields, and
feeds them into distractor selection at `:141-162` under the comment
"Distractors are deliberately phonetically confusable". Its own comment names
the groups: "ข/ฃ/ค/ฅ/ฆ all 'kh'", "ด/ต/ฎ/ฏ/ถ/ฐ/ท/ธ/ศ/ษ/ส all 'T-stop' as
finals".

Every one of those maps is keyed on **sound**. Visual confusability — ม against
น, ผ against พ, ฎ against ฏ — is the kind the repo does not model, and it is
exactly what 2.4 AC5 is about. ม and น sound nothing alike; they look alike.

I checked the other half, and it makes the case stronger than "add a field".
The script cards — the ones that teach glyph recognition, and the cards 2.4
AC5's pairs exist for — select their distractors with
`ScriptCardGenerator.ts:125`, `pickChoices(correct, pool)`, which is
`pool.filter(item => item !== correct)` and a Fisher-Yates shuffle. **Uniform
random.** So the layer with confusability machinery doesn't need visual
confusability, and the layer that teaches the glyphs draws its distractors at
random.

*Fix (revised, and cheaper than either of the two above):* 2.1 owns
`confusableWith` as domain data, and it feeds `pickChoices` on the script
recognition cards — not only a test fixture for 2.4 AC5 and 3.3. The map
builders in `VocabCardGenerator.ts` are the working precedent for the shape.
At that point confusable glyphs become each other's multiple-choice distractors
on the SRS schedule, which is the discrimination practice the mnemonic contrast
is trying to buy in prose, obtained from data the plan is already committing to
author. This is also the one place in the review where the build-beside pattern
(A9, A17, A19, A20, A22) has an obvious build-*on* available.

*On the `finalSound` half of this, which took two passes to pin down:*
`finalSound` is **not** lost. It is a first-class field on every consonant
(`symbols.ts:61`, `:92`, `:107`) with seven consumers, including a generated
SRS card (`ScriptCardGenerator.ts:198`, `${c.character}:finalSound`), and task
2.4 replaces only `mnemonic`, so the fact survives untouched.

The counts: 13 of the 82 mnemonic strings contain the word "final". Reading
them splits the 13 in two, and the split matters because the two halves are
different teaching points.

- **8 are consonant mnemonics teaching that consonant's final behaviour** —
  "the T-stop final sound is made by...", "the P-stop final sound is made by
  closing your lips", ค "makes the same K-stop as ก when final". (This is the
  accelerated-learning review's corrected figure of 8, and it is the right one;
  my earlier 13 was the unfiltered match.)
- **5 are vowel mnemonics where a final consonant changes the vowel's written
  form** — "When a final consonant follows, the อะ is replaced...", "No final
  consonant: ไม้หันอากาศ above + ว to the right. With final consonant: ว is
  sandwiched between...".

Task 2.1's schema (district, shape cue, sound cue, tone motion) has a slot for
neither. The first is a sound-behaviour fact the plan README explicitly keeps
("all final-consonant sounds by lesson three" is named as sequencing worth
preserving), and it is at least recoverable — `finalSound` is still a field, so
a later task could re-derive the reinforcement. The second is not recoverable:
a vowel's form conditioned on whether a final consonant follows is nowhere in
the domain model except those five prose strings, which 2.4 deletes. That is
the same shape as the confusability loss above, and it is the stronger half of
this finding.

*Fix:* 2.1's schema carries a final-behaviour slot for consonants and a
conditional-form slot for vowels, or task 2.4 declares which of these 13 facts
it is dropping and where they are taught instead.

**Scoping that slot — assert it for nine letters, not forty.** The
Thai-teacher review proposed a `finalCue` required wherever `finalSound`
differs from `initialSound`, estimating ~12 letters; the accelerated-learning
review counted 40. Both are right about their own question, and I get the same
numbers: stripping parentheticals from both fields, **40 of 44** differ, but
**31 of those 40 are one rule, not 31 facts** — every obstruent collapses to
its place of articulation as a K-, T- or P-stop. Exactly **nine** finals are
not a K/T/P-stop:

| | final |
|---|---|
| ย | /i/ |
| ว | /o/ |
| ร, ล, ญ, ฬ | /n/ |
| อ | acts as the vowel สระ ออ |
| ห, ฮ | not used as a final |

Those nine are what a `finalCue` slot should be required for. Asserting it
across all 40 would force 31 records to restate a rule the learner derives
once, which is the opposite of what a schema is for — and it is the same
mistake as the 44-fact class table this plan exists to remove.

One refinement on the pattern the accelerated-learning review noticed: six of
the nine (ย ว ร ล ญ ฬ) are sonorants, not "almost exactly bucket one" — อ is
the unaspirated-stop bucket's silent member and ห ฮ are aspirate/fricatives,
while four sonorants (ม น ง ณ) have regular finals. The accurate version is
that **the sonorant bucket is the only one where a letter's final behaviour is
commonly irregular**, which is still a real argument for the sonorant mnemonics
carrying the extra slot: those letters are learned as "derive the class, no
memorisation needed", and six of them quietly carry a second fact that does
have to be memorised.

**A10 (Major) — the corpus entry type has no owner.** `VocabEntry` is declared
at `src/domain/vocabulary/types.ts:29-50`, with `romanization: string` at `:31`
and `word_class: string` at `:32`. Task 2.2 AC5 requires the IPA to be retained
*and* a Paiboon form stored — two fields where there is one. Task 5.1 assigns
rooms, 5.2 AC2 records provenance per entry, 5.3 attaches mnemonic records.
All four need `types.ts`. **It is in no task's covers.**

**A14 (Medium) — 2.2's dependency on 2.1 is spurious.** Task 2.2's covers is
`vocabulary.json`, `Romanization.ts`, `convert-romanization.py`; 2.1's output
is `sceneGrammar.ts` and `soundType.ts`. No AC in 2.2 references a district, a
tone motion or a sound type. The phase README justifies it as "2.1 fixes the
district and tone-motion vocabularies first for the same reason" — but the
reason given is romanization convention, which 2.1 does not own. The chain
2.1 → 2.2 → 2.4 → 2.5 is the phase's critical path and this edge adds a step to
it for nothing. (The 2.2 → 2.4 edge, by contrast, is well argued and should
stay: both emit Paiboon and would settle conventions independently.)

**A15 (Medium) — `public/lessons/` claims the asset root.** Task 2.5 covers
the whole directory rather than the five it produces. Tasks 3.3 and 4.3
enumerate theirs, which is the right pattern. The practical effect is that
`public/lessons/lesson-02/` through `lesson-05/` and
`public/lessons/lesson-class-rule/` are named nowhere in the plan — the
directory entry is doing the work of five undeclared ones. It is honest in
outcome (no concurrent phase-2 task writes there) and dishonest in form.

**Verified:** the 12 → 6 class mapping premise. The corpus really does have 12
non-empty `word_class` values (`n` 1523, `v` 352, `adj` 211, `adv` 48, `prep`
27, `conj` 26, `part` 23, `pron` 16, `clf` 11, `det` 9, `aux` 7, `mod` 1).

### Phase 3 — Hard parts

Structurally clean, and the best-reasoned dependency argument in the plan:
3.1 owns `lessonSequence.ts` so that 3.2 and 3.3 fill declared slots instead
of each inventing an ordering. That is exactly the collaboration trap the
format warns about, correctly identified and correctly solved.

CONTEXT.md's claim that `vocabulary.json` already carries a per-entry syllable
analysis is **accurate** — `SyllableInfo` (`src/domain/vocabulary/types.ts:18-27`)
has `initialConsonant`, `vowel`, `finalConsonant`, `toneMark`,
`consonantClass`, `syllableType` and `tone`, and the rank-1 entry ที่ carries a
fully populated one. Task 3.1 AC5's reconcile-against-a-baseline approach is
the right call over demanding zero disagreements.

Task 3.2's AD — AC4 reads the lesson's own stated content rather than
`syllableRules.ts`, with a test that fails when the content is thinned — is
the sharpest testing idea in the plan. It is what distinguishes "the rule is
correct" from "the lesson teaches enough of the rule", and the same pattern is
reused correctly in 2.5 AC3 and 4.2 AC3.

No blockers here beyond A5's corpus, which 3.2 and 3.3 both consume.

### Phase 4 — Sequence

**A8 (Major) — the plan makes an achievement permanently unreachable.**
`src/domain/shared/services/AchievementService.ts:28`:

```
check("all_lessons", completedLessons.length >= 25);
```

is one of **five** sites across four files. The full list, settled between the
QA review and this one after each of us undercounted it:

| Site | Literal |
|---|---|
| `ScriptLessonService.ts:21` | `const TOTAL_LESSONS = 25` — the bound `getNextLesson` walks to at `:182` |
| `AchievementService.ts:28` | `completedLessons.length >= 25` — the `all_lessons` unlock condition |
| `ProgressPage.tsx:38` | `length < 25 ? length + 1 : null` — the next-lesson computation |
| `ProgressPage.tsx:240` | `totalLessons={25}` — a second, separate literal in the same file, feeding `LessonPath` |
| `AchievementBadge.tsx:24` | `description: "Complete all 25 lessons"` — user-facing copy |

So one number decides achievement eligibility, the progress display, which
lesson the app offers next, how many nodes the lesson path draws, and what the
badge tells the learner to do — across three layers. Task 4.3 ships a
~20-lesson sequence. After it, no learner can ever earn `all_lessons`, and `ProgressPage`
offers a next lesson that does not exist. `AchievementService.ts` is in no
task's covers, and 4.3's ACs are about symbols staying taught and the numerals
track's three states — neither reaches completion semantics.

This interacts with AC4. The task correctly makes "deliberately skipped" a
first-class state so a skipping learner is not reported incomplete — and then
completion is computed elsewhere from a hardcoded count that knows nothing
about it.

`AchievementBadge.tsx:24` deserves its own sentence: it is the display label
for the exact achievement `AchievementService.ts:28` makes unreachable. As the
plan stands, phase 4 ships a badge whose unlock condition and whose text are
both wrong, and neither file is in any task's covers.

*Fix:* add `AchievementService.ts` (and its test), `ProgressPage.tsx`,
`LessonPath.tsx` and `AchievementBadge.tsx` to 4.3's covers —
`ScriptLessonService.ts` is already in 1.1's, so `TOTAL_LESSONS` retires there
— and add an AC: lesson count, course completion and the badge copy all derive
from the declared sequence and the numerals track's state, not from a literal.
This is the same root as A17. Five literals exist in four files because extent
and ordering have nowhere else to live; updating them is relocating the
problem to the next resequence, and `lessonSequence.ts` is where it stops.

**On the "taught rank window", which several criteria depend on and nothing
declares.** Task 3.3 AC4, task 4.2 AC4 and task 4.3 AC5 all scope themselves to
"the declared rank window". No task declares it, and no covers entry names a
file that would hold it. The Thai-teacher review's T24 shows why the number is
not cosmetic: seven of the ten letters task 4.3 demotes appear in a word ranked
inside ~600 (ฒ in พัฒนา at 336, ฐ in เศรษฐกิจ at 437, ฏ in ปฏิบัติ at 497, ฎ in
กฎหมาย at 515, ฬ in นาฬิกา at 523, ฆ in ฆ่า at 596, ฑ in ผลิตภัณฑ์ at 1212 —
I verified every row). So if the window is rank ≤ 1000, six demoted letters
fall inside it by construction, and a sequence deferring them past it fails
4.3's own AC5. The demotion decision and the undeclared window are coupled, and
the coupling is invisible while the window is a phrase rather than a number.

**A19 (Major) — `priority` is about to get a second source, and 4.1 cannot
prevent it.** (Raised by the accelerated-learning review; confirmed.)
`symbols.ts` already declares `priority?: number` on the symbol base class
(`:9`, `:20`, `:23`, `:30`, `:37`, `:45`, `:64`, `:67`) and populates it across
98 occurrences — ม carries `priority: 1`, ค carries `priority: 13`. Grepping
`src/` outside `symbols.ts` returns **no consumer at all**: the field is
declared, populated, and read by nothing.

Task 4.1 AC4 adds `src/domain/script/data/symbolPriority.ts` and requires all
44 consonants to carry a scheduling priority, with no AC reconciling it against
the field that already exists. That is the divergence
`consonantClassColor.ts`'s header comment memorialises, and which phase 2's
README cites as the reason not to add a second class map — the same discipline
is not applied here.

The covers make it worse: **`symbols.ts` is not in task 4.1's covers** (which
is `toneMarkTable.ts`, `symbolPriority.ts` and their tests). So even an
executor who notices the existing field cannot migrate or remove it. The app
ends with two priority sources, one of them dead, and no task able to say so.

*Fix:* add `symbols.ts` to 4.1's covers and an AC — either `symbolPriority.ts`
is derived from the existing field and the field stays the source, or the field
is removed in the same task and the module becomes the source. Not both.

Otherwise the phase is sound. Task 4.1's "unreachable declared rather than
absent" is right for both reasons given — the consumer distinction and the
teachability of the fact. Priority-separate-from-sequence is the correct
decomposition: demotion is scheduling, and folding it into curriculum would
make "rare" and "not taught" the same state.

### Phase 5 — Vocabulary palace

Depends on 2 and not on 3 or 4, correctly: 5.1 AC2 is the only cross-phase
constraint (room names disjoint from district names) and it needs 2.1 alone.
Running it alongside 3–4 is right.

The corpus statistics the phase is built on are **exact**: 5,454 entries,
3,200 with an empty `word_class` (58.7%), 277 with a mnemonic, 1,523 nouns.

Task 5.2's two decisions — provenance per entry, and AC4 reporting accuracy
rather than gating on it — are both correct and the reasoning for the second
is better than most plans manage: a threshold invented before the method has
been seen is not a quality bar.

Task 5.3's asymmetric room exposure (cue in production, output in recognition)
is a genuine insight about what the device can actually do, and AC4 exists
because the symmetric version is the tempting one. That is the right reason to
write an AC.

**A18 (Major) — an inference pipeline's output reaches a rendered surface with
no regression contract.** (Raised by the pareto review as P2/O2; it reads the
same way from the structural angle, so recording it here too.) Task 5.2
derives `word_class` for 3,200 of 5,454 entries — 59% of the corpus. Task 5.1
AC4 and task 5.3 AC4 then render the room derived from that value as a
**pre-reveal cue** in production-direction review. So a wrong class does not
merely mis-file a word; it is shown to the learner as a hint at the moment of
recall.

5.2 AC4's decision not to gate on a threshold is right, and its reasoning — a
number invented before the method has been seen is not a quality bar — holds.
But the task stops one step short of the pattern this plan has already
validated twice. Task 3.1 AC5 and task 4.3 AC5 both handle exactly this shape:
a derivation with genuine exceptions, where zero disagreements would be a lie,
so the *count* is recorded as a baseline and a **regression** in it fails.
Applying the same contract to 5.2 costs nothing — the held-out measurement
already exists under AC4 — and it closes the case the task currently leaves
open: a later re-run with a changed prompt or a different model silently
getting worse, with the degradation surfacing as a misleading cue rather than
as a failing test.

Note that 5.3 already anticipates the churn — one of its test cases surfaces a
mnemonic as needing restaging when a word's room changes — so the plan is
aware the value moves. What is missing is the gate that notices *when* it
moves and *which way*.

*Fix:* extend 5.2 AC4 to record the accuracy figure as a baseline and fail on a
regression against it, matching 3.1 AC5 and 4.3 AC5. Keep the no-threshold
decision; add the no-regression one.

**A26 (Major) — the backfill has a second consumer nobody has looked at.**
`word_class` is not an inert field waiting for phase 5 to give it a purpose. It
already drives grammar card generation:

- `GrammarCardGenerator.ts:29-30` — `pickWord` fills each grammar template slot
  by exact `word_class` match (`v.word_class === wordClass`), with a fallback
  chain at `:36-43`
- `GrammarLessonService.ts:39` — reports the learner's graduated vocabulary
  `byClass`
- `WordCard.tsx:97,105` — displays it

Task 5.2 fills in `word_class` for **3,200 of 5,454 entries**. Every one of
those is currently invisible to `pickWord` — an entry with `word_class: ""`
matches no slot. After the backfill they all become eligible. So a task whose
stated purpose is building a memory-room partition **silently changes which
words appear in generated grammar sentences**, roughly trebling the candidate
pool, with no AC about it, no test, and no ability to adjust the consumer:
`src/domain/grammar/` appears in **no task's covers anywhere in this plan**.

This also sharpens A18. A wrong backfilled class does not only mis-file a word
into the wrong memory room — it injects that word into a grammar template as a
part of speech it is not, which is a visible, ungrammatical sentence rather
than a quiet filing error. The regression contract A18 asks for is worth more
than it looked.

*Fix:* add `src/domain/grammar/` to 5.2's covers, and an AC — the set of words
eligible for each grammar template slot is compared before and after the
backfill, and the change is reported rather than discovered. Whether the wider
pool is desirable is a product call; it should be a decision, not a side
effect.

**A27 (Major) — the room taxonomy and `word_class` are two representations,
and the plan never says so.** (Thai-teacher review's T25, answering a question I
put to them; the examples below are theirs and I verified every rank and tag.)

Task 5.1 merges verbs and adjectives into one memory room. That is
linguistically right — Thai adjectives are stative verbs — and both that review
and this one endorse it for recall. But `word_class` is consumed by
`GrammarCardGenerator.pickWord` with **exact string matching**, and the
templates need precisely the distinction the rooms deliberately erase:

| Word | Rank | `word_class` |
|---|---:|---|
| ดี "good" | 139 | `adj` |
| ใหญ่ "big" | 193 | `adj` |
| สวย "beautiful" | 813 | `adj` |

A template slot wanting an action verb, filled with a stative one, generates
ผม สวย หนังสือ — ungrammatical, and shown to a learner as a worked example.

So the correct answer for memory is the wrong answer for generation, and
**nothing in the plan states that `word_class` and the six rooms are separate
representations**. Tasks 5.1 and 5.2 are adjacent, by the same author, and 5.2's
covers includes `vocabulary.json`. An executor normalising `word_class` to the
six rooms is doing the obvious tidy-up, and it breaks every template slot at
once. This is the failure mode to guard first, because it is invited rather than
merely possible.

Two more risks in the same field, both verified:

- **`clf` is structurally unassignable, not merely hard.** Thai has roughly
  fifty common classifiers; the corpus tags **11**. The commonest are
  simultaneously nouns, and the corpus is already inconsistent about which sense
  wins: คน (rank 47, the classifier for people) is tagged `n`; ตัว (rank 92, the
  classifier for animals) is tagged `n`; ใบ (rank 542) is tagged `clf` but
  glossed "leaf", its noun sense. No single-valued assignment is correct, so
  counting templates starve and fall back silently no matter how accurate the
  backfill is. This one is not an accuracy problem and an accuracy budget cannot
  fix it.
- **`part` is position-locked and maximally visible.** ครับ (5), ค่ะ (6), นะ
  (45) are correctly tagged today. Particles are sentence-final; one miscast as
  `adv` can be placed mid-sentence, in the highest-frequency words in the
  language, with the error glaring to any Thai speaker.

Genuinely ambiguous and already defensibly resolved in the corpus — worth
preserving rather than re-deriving: `aux` vs `v` for ได้ (2), จะ (3), ต้อง (16),
all also main verbs; `prep` vs `v` for อยู่ (49), ให้ (12), ถึง (40). `n` is the
low-risk bulk at 1,523 already tagged, and is where a backfill should spend its
speed.

*Fix — four, and they compose with A10 and A26:*

1. State that 5.1's rooms and `word_class` are **separate representations**,
   with an AC that `pickWord` resolves every template slot type after the
   backfill. That catches a room-shaped `word_class` immediately rather than in
   a generated sentence.
2. Guessed values must not reach `pickWord` at full confidence. Phase 5 already
   requires a backfilled class be distinguishable from a source-provided one —
   but if that marker lives in a field `pickWord` never reads, the requirement
   buys nothing. `pickWord` should prefer source-provided and fall back to
   backfilled, which needs the provenance field declared (A10's
   `src/domain/vocabulary/types.ts`) and `src/domain/grammar/` in 5.2's covers
   (A26).
3. Allow multiple classes per word, at minimum for the noun/classifier overlap.
4. Make the fallback chain loud — a slot resolved by fallback rather than exact
   match should be counted, so a starved `clf` slot surfaces as a number rather
   than as a plausible wrong sentence.

**A24 (Medium) — 277 mnemonics sit outside the originality constraint.**
CONTEXT.md's originality section subjects the 82 `mnemonic` strings in
`symbols.ts` to the rewrite constraint and says nothing about the **277
mnemonics already in `vocabulary.json`** (verified: 277 of 5,454 entries carry
one). Phase 5 builds on top of them — task 5.3 stages vocabulary mnemonics in
rooms — and 5.3 AC5 applies the 8-gram check only to mnemonics the task
*writes*. So the corpus keeps 277 mnemonics of unexamined provenance while
every newly authored one is gated.

The fix is nearly free because the machinery is being built anyway: run the 277
through the same check task 5.3 constructs, and either rewrite what flags or
record why it is clean. Worth doing in 5.3 rather than deferring, since that is
the task holding the check.

A10 applies here as much as in phase 2: rooms, provenance and mnemonic records
are all fields on `VocabEntry`, whose type file no task covers.

### Phase 6 — Strangle

A4 is the blocker. Beyond it:

The ordering argument in 6.2's AD — AC1 is a precondition, not a summary — is
correct and the reason given (a deleted file is recoverable from git, a lesson
with no content in the working tree still reaches a learner first) is the right
one. Keeping the `never` default after the union narrows to one arm is also
right, and the AD anticipates the reviewer who will call it dead code.

Task 6.1's staleness-by-hash over mtime comparison is correct.

One gap in the trust inventory that phase 6 creates: 6.1 invokes an external
renderer with paths derived from deck JSON. AC4 covers containment of read and
write paths, which is the filesystem sink. It does not cover the argv sink —
deck-derived values becoming arguments to `ffmpeg`. Those are different sinks
with different controls. See A13.

### A13 (Medium) — Trust boundary inventory

The six rows are well-formed and five of them name a concrete sink. Reviewed
row by row, the gaps are:

**Missing row — imported progress JSON.** The inventory's `completedLessons`
row names `localStorage` and "a second device via `MergeService`". There is a
third, more exposed route: `Storage.importData` (`Storage.ts:189-193`) takes a
**user-supplied file**, `JSON.parse`s it, runs `validateLearnerState`
(a three-field shape check — `Validation.ts` verifies only that
`completedLessons` and `sessionHistory` are arrays and `cards` is a non-array
object), then `mergeLearnerStates` merges it into live state and saves. That is
an untrusted file reaching the same store the migration touches, through the
same two files task 1.1 covers. The repository root currently holds
`progress.json`, `Untitled.json` and `Untitled-repaired.json`, so this is a
route the user actually exercises.

**Missing row — the extracted transcript corpus.** Per A5: licensed source
material, extracted, reaching a committed test fixture read by seven tests. The
Thai-teacher review makes the control concrete and I agree with it: extracted
plaintext is a derived work of the licensed PDFs and belongs in the same
control class as the API key — it must not be committed, must not reach a
commit message or a finding's text, and must not reach a lesson script. The
enforceable version is a `.gitignore` entry for the extraction output plus a
test asserting the corpus path is ignored, owned by whichever task A5 gives the
extractor to.

**Missing row — deck JSON to renderer arguments.** Task 6.1: deck-derived
values become process arguments. Distinct sink from the filesystem-write row.

**Weak Reaches cell — `word_class` backfill values.** The cell reads "the POS
partition that decides which memory room a word belongs to". That is a
consequence, not a sink. The row describes a correctness risk (which task 5.2
handles well through provenance) rather than a boundary, and naming it as a
boundary weakens the table's other five rows by association. Either name the
sink — the rendered mnemonic and the review-time room cue — or move the row to
a risks section.

One more, minor: the ElevenLabs row covers the TTS response body. Task 1.3
AC6's transcribe-back check sends generated audio *out* to a speech-to-text
endpoint under the same credential. Same key, same header, so it does not need
its own row, but the row's Source should say "TTS and STT responses".

## Summary Statistics

| Metric | Value |
|---|---|
| Documents reviewed | 27 (plan README, CONTEXT.md, 6 phase READMEs, 20 task files) |
| Tasks reviewed | 20 |
| Acceptance criteria reviewed | 114 |
| Findings | 27 |
| Blockers | 5 (A1–A5) |
| Major | 14 (A6–A10, A17–A20, A22, A23, A25–A27) |
| Medium | 8 (A11–A16, A21, A24) |
| Tasks with covers gaps | 10 of 20 (1.1, 1.4, 2.1, 2.2, 2.3, 2.5, 4.1, 4.3, 5.2, 6.2) |
| Findings raised by another reviewer and confirmed here | 10 (A17–A25, A27); A26 found while checking one |
| Own findings corrected by another reviewer | 4 (A12 walk inventory, A21 mnemonic counts, A22 dormant-field claim, A22 derivation boundary) |
| Source files touched by the plan and named in no task's covers | 15 |
| Repo claims spot-checked | 79 |
| Repo claims found inaccurate | 3 (CONTEXT.md's "three stores"; task 2.2's "IPA in vocabulary.json"; `isAspirated` on ฑ/ฒ) |
| ACs depending on an artifact no task produces | 7 |
| Tasks whose ADs name an explicitly rejected alternative | 14 of 20 |

**Files touched by this plan that appear in no task's `covers`:**

```
src/infrastructure/persistence/Storage.ts
src/storage.test.ts
src/types.test.ts
src/domain/ports/LearnerStateRepository.ts
src/domain/script/entities/ScriptPropertyCard.ts
src/domain/script/services/ScriptCardGenerator.ts
src/infrastructure/persistence/StorageCardRepository.ts
src/domain/shared/services/AchievementService.ts
src/domain/vocabulary/types.ts
src/presentation/pages/ProgressPage.tsx
src/presentation/pages/StageItemsPage.tsx
src/presentation/pages/LearnedItemsPage.tsx
src/presentation/components/organisms/LessonPath.tsx
src/presentation/components/atoms/ClassBadge.tsx
src/presentation/components/organisms/AchievementBadge.tsx
```

**Recommended structural change.** Split task 1.1. It is voted 13, it is the
dependency of everything in the plan, and its covers has to roughly double to
close A1–A3, A7 and A17. The clean cut is not quite "identity vs. types" —
`sym.lesson` moving number-to-id *is* the migration, so the additive half has
to stop short of touching it. What makes the split work is that the id
vocabulary can be declared alongside the numbers before anything moves.

**1.1a — lesson identity declared (purely additive; nothing persisted changes).**
Covers `lessonContent.ts`(+test), `lessonSequence.ts`(+test), `symbols.ts`,
`shared/types.ts`, `ScriptLessonService.ts`(+test), `StartLessonUseCase.ts`.
Delivers the `^[a-z0-9-]{1,64}$` charset and the `LessonId` type; the ordered
lesson ids plus the number-to-id correspondence the migration will consume; the
`LessonContent` union and the deck schema; `lessons[]` gaining `id` and
`content` while `number` and `videoUrl` stay; and `LessonSummary` carrying
`LessonContent` (A6). `sym.lesson` is untouched. Today's AC1 and AC2 plus the
`LessonSummary` criterion. Gate: domain tsc and domain tests — no build needed,
because nothing in presentation changes.

**1.1b — the four-store migration (horizontal, at-once, the risky half).**
Covers `symbols.ts`, `shared/types.ts`, `ports/LearnerStateRepository.ts`,
`ScriptLessonService.ts`(+test), `ScriptCardGenerator.ts`,
`ScriptPropertyCard.ts`, `StorageCardRepository.ts`, `Storage.ts`,
`StorageLearnerStateRepository.ts`(+test), `Validation.ts`(+test),
`MergeService.ts`(+test), `src/storage.test.ts`, `src/types.test.ts`,
`VocabularyLessonService.ts`(+test), `integration.test.ts`, `ProgressPage.tsx`,
`LessonPath.tsx`, `StageItemsPage.tsx`, `LearnedItemsPage.tsx`,
`LessonPage.tsx`, `CatchUpPage.tsx`. Moves `sym.lesson` and, in the same pass,
`completedLessons`, `currentLesson`, `pendingCatchUps[].lessonNumber` and
persisted `card.lessonNumber`; fixes all three integer walks; migrates both
route params (`LessonPage.tsx:27`, `CatchUpPage.tsx:22`). Today's AC3–AC7,
extended per A1, A7 and A12. **Gate on `npm run build` as well as the domain
tsc** — today's 1.1 gates only on `tsconfig.domain-check.json`, whose `include`
is domain/application/infrastructure, which is exactly why A3's four
presentation files went unnoticed.

**Dependencies:** 1.1a `[]`; 1.1b `["1.1a"]`; 1.2 `["1.1b"]` (not 1.1a — 1.2
shares `LessonPage.tsx` and `CatchUpPage.tsx` with 1.1b and should build on
migrated route params rather than redo them); **1.3 `["1.1a"]`**; 1.4
`["1.2", "1.3"]`, unchanged.

The payoff is 1.3. It needs the deck schema and the id charset and nothing from
the migration, and it is voted 13 against 1.1's 13 — today it waits behind the
whole of 1.1. After the split, phase 1's critical path is
1.1a → 1.1b → 1.2 → 1.4 with the pipeline build running alongside, instead of
1.1 → {1.2, 1.3} → 1.4. The large, risky migration also gets its own gate and
its own review, which is worth more than the schedule.

**A note on how these gaps got through.** Every one of A1–A4 is a file the
*phase* README claims via a directory and no *task* claims by name. A
mechanical check closes most of it: expand each phase README's directory covers
to its file list, subtract the union of that phase's task covers, and report the
remainder. Run against phase 1 today that returns `Storage.ts`,
`ScriptCardGenerator.ts`, `ProgressPage.tsx`, `StageItemsPage.tsx`,
`LearnedItemsPage.tsx` and `LessonPath.tsx` — four of the five blockers from
one grep. It does not catch A1's `ScriptPropertyCard.ts` (whose directory,
`src/domain/script/entities`, is absent from the phase covers too) or A5's
corpus. The check is necessary, not sufficient: where the phase covers is also
wrong, only reading the graph finds it.
