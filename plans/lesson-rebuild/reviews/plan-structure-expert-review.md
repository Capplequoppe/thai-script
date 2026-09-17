# Plan-structure review — lesson rebuild

Reviewed: `plans/lesson-rebuild/README.md`, `CONTEXT.md`, all 6 phase READMEs, all
24 task documents. Cross-checked against the live repo (`ScriptLessonService.ts`,
`LessonIntro.tsx`, `LessonPage.tsx`/`CatchUpPage.tsx`) via CodeGraph to confirm
the plan's factual claims about current code (the `for i in 1..lessonNumber`
prerequisite walk, the two `LessonIntro` consumers, the `Slide[]` shape) — all
verified accurate.

## Verdict

This is a well-sliced plan. Every phase is a genuine vertical tracer bullet —
each ends with something a learner can do, not a layer a later phase makes
usable. The three horizontal exceptions (task 1.1's identity migration, task
2.2's Paiboon migration, task 6.2's removal) are each correctly identified as
exceptions, justified by "one representation replaces another / stops existing
at once," and kept as a task *inside* a vertical phase rather than promoted to
a phase of its own. That's the right call in all three cases — I checked each
against the alternative (a horizontal phase) and a horizontal phase would be
strictly worse: it would either half-migrate (the exact bug CONTEXT.md opens
with) or gate every other phase on infrastructure nobody can see working yet.

The seam→fan-out→fan-in shape repeats deliberately across phases 1–3 and each
time the plan states *why* the fan-out tasks don't collide (disjoint `covers`,
plus an explicit note when two tasks would otherwise independently invent the
same convention — 2.2/2.4's Paiboon spelling, 3.1's sole ownership of
`lessonSequence.ts`). That's exactly the collaboration-trap reasoning Team
Topologies asks for, applied correctly, not just asserted. I did not find a
phase where two concurrently-scheduled tasks share a file in `covers` — I
checked every same-phase pair by hand.

Below are the things I'd want fixed or answered before execution. Findings 1–4
are from my own pass; 5–10 were found by qa, systems-architect and
experienced-thai-teacher and I've verified each against the live repo (or, for
finding #10's linguistic claim, verified the structural half and deferred to
the domain expert for the rest) before including it here — they're more
severe than anything I found on my own pass, to the point that findings 6, 7,
8 and 9 mean **phase 1, phase 2 and phase 6 are not schedulable as written**:
the tasks' own `verify` gates fail on files outside any task's `covers`, or an
AC contradicts another AC for any placement inside its declared phase.

## Findings

### 1. Task 4.3 doesn't follow the mechanics/content split the plan uses everywhere else — re-slice proposed

Phase 3 is explicit about why sequence mechanics and content are separate
tasks: task 3.1 alone owns `lessonSequence.ts` and pre-declares every slot,
*specifically* so the content tasks (3.2, 3.3) can run concurrently without
racing on that file. Phase 4 sets up the same shape with 4.1 (mechanics: the
tone-mark table and the priority model) — but then abandons it. Task 4.3 bundles:

- authoring three lessons' worth of content (lessons 12–14 + numerals),
- demoting rare letters,
- resequencing `lessonSequence.ts` and every symbol's `lesson` field,
- and the phase's widest end-to-end proof (AC5, AC6).

into one `x-large` task with the plan's single highest self-reported weight
(21 — every other task tops out at 13). It runs strictly after 4.2, so there's
no parallelism left in phase 4 at all once 4.1 lands: 4.2 then 4.3, serially.

The demotion+resequencing bundling is justified in the task's own "Architectural
Decision" section and I agree with that part — they're the same edit to the
same file and splitting them would recreate the collision 3.1 was built to
avoid. What isn't justified is bundling *that* with three lessons of net-new
content authoring, which is the judgment-heavy, review-heavy, slow-to-produce
part of the task and has no file-level reason to be coupled to the sequence
edit.

**Proposed re-slice:**
- `4.3a` — final-band + numerals content authoring (`content/lessons/lesson-12..14.md`,
  `lesson-numerals.md`, their `public/lessons/` assets). Depends only on `4.1`
  (it needs the priority model to know what it's *not* teaching yet, not the
  tone-mark lesson's prose). Can run **concurrently with 4.2**.
- `4.3b` — demotion, resequencing, and the phase's closing proof (AC1, AC2,
  AC3, AC5, AC6 as currently written). Depends on `4.1`, `4.2`, `4.3a`.

This shortens phase 4's critical path (4.2 and 4.3a run in parallel instead of
4.2 then 4.3) and turns the plan's largest, riskiest single task into two
smaller ones — one of which is close to mechanical and easy to review in
isolation from the prose-quality judgment calls in the other.

### 2. Task 2.4 is the other outlier (x-large, weight 13, 73 original mnemonics in one task) — flagged, not necessarily wrong

The task's own decision record considers and rejects splitting by symbol class,
correctly, because the confusable pairs the task must cross-check (ข/ช, ผ/พ,
etc.) span class boundaries — a split by class would put both halves of a
contrast in different tasks that can't see each other, which is a real
collaboration trap and the task is right to avoid it.

What isn't considered is a split by *axis* rather than by *class*: e.g., a
first task that stages all 44 consonants (district + shape + sound cues, no
vowels) and asserts AC3 (district-matches-class) and AC5 (confusable-pair
contrast) in full, followed by a second task for the 29 vowels (no class/district
requirement at all — the vowel AC explicitly says a vowel record "carries no
district requirement"). Vowels and consonants don't interact in AC5's
confusable-pair check, so this split wouldn't recreate the cross-boundary
problem the class-split has. I'm not asserting this is better — vowels are a
small fraction of the 73 records, so the split is lopsided and might not be
worth the coordination overhead. Flagging it for the panel because it's the
second-largest task in the plan and the decision record only rules out one
alternative slice, not the one I'd have tried first. Route to
**pareto-analyst**: is splitting worth it here, or is one long content pass
genuinely cheaper than two reviewable ones?

### 3. `lessonSequence.ts`'s ownership chain has a gap at the phase-1 boundary — resolved: it's reading (b)

Task 1.1 AC7 requires `startLesson` to enforce prerequisites "from the declared
lesson order, not from integer arithmetic over the id" — this is the fix for
the `for (let i = 1; i < lessonNumber; i++)` loop I confirmed still lives in
`ScriptLessonService.ts:132` today. That AC needs *some* explicit order
declaration to exist by the end of task 1.1, and I raised it as an open
question between two readings.

**systems-architect resolved it** (filed as their A17): `lessonSequence.ts`
belongs in task 1.1, not 2.5. Reading (a) — order declared informally in 1.1,
`lessonSequence.ts` extracted later by 2.5 — has phase 1 declare ordering one
way and phase 2 replace it with another, which is a representation swap with a
per-consumer window in between, the exact shape CONTEXT.md's own rejected
alternatives rule out. It's also the highest-contention file question in the
plan for a second reason: `symbols.ts` is covered by tasks 1.1, 1.4, 2.4 and
6.2, and ordering is the one thing three *later* tasks (3.1 AC7, 3.3 AC3, 4.3
AC6) need to read as a single declared unit rather than diff out of a
~3,000-line file. And the current ordering is already implied twice today
(array position, and the `number` field 1.1 removes) — neither survives 1.1,
so something new gets created at 1.1 regardless; the only open question was
whether it gets a name. It should: `lessonSequence.ts` (+ test) goes in 1.1's
`covers`, 2.5 then *extends* a file that already exists, and phase 3's "3.1
owns `lessonSequence.ts`" reads correctly as "owns it as of phase 3" rather
than as a claim to first ownership.

### 4. Task 5.3 has no coverage floor for vocabulary mnemonics — completeness pattern break

Every content-authoring task in phases 1–4 asserts an exact, checkable count:
1.4/2.5/3.2/3.3/4.2/4.3 all assert "exactly the declared symbol set," with the
counts named in the AC text (44 consonants, 29 vowels, etc.) specifically so a
task can't pass by covering fewer symbols than it claims. Task 5.3 breaks this
pattern: its AC6 makes "has none yet" a legitimate terminal state for any word,
with no minimum count, percentage, or rank-window requirement anywhere in its
ACs or test cases. The phase's own README stat table says 277 of 5,454 entries
(5%) currently have a mnemonic — as written, task 5.3 is satisfiable by staging
those 277 in their rooms and declaring the other 5,177 "none yet," which
technically passes every AC while leaving the phase's stated north star ("Pom
and Chan recur across mnemonics") almost entirely unmet.

This is the same shape of gap every other content task closes with a rank
window or an exact count. **Three reviewers converged on this independently**
— pareto-analyst found it as their P3 and qa filed it as Q34 (High) from a
testability angle — which I'd flag to the lead on its own as a stronger signal
than any one of our findings usually carries.

qa also sharpened the fix I originally proposed, and corrected it. I'd
suggested anchoring the floor to "the currently-taught rank window,"
mirroring the pattern elsewhere in the plan — qa points out two problems with
that specific anchor:

- It doesn't actually exist as a consistent pattern to mirror. Only tasks 3.3
  (AC4), 4.2 (AC4) and 4.3 (AC5) gate example words on "the declared rank
  window"; task 1.4 (AC3) and task 2.5 (AC4) require only that a word resolves
  to a `vocabulary.json` entry or is declared in `teachingWords`, with no
  window at all. That's a real inconsistency in its own right, separate from
  5.3's gap — the plan enforces its own rank-window rule in three of five
  content tasks that touch example words, not all five, and nothing explains
  why 1.4 and 2.5 are exempt.
- The name would collide with an existing, differently-shaped concept.
  `VocabularyLessonService`'s `RANK_WINDOW_SIZE` (`:17`, used in
  `getUnlockedWords()`, `:128`) is learner-relative and sliding — it moves
  with whatever the learner's first-unlearned rank is, not a fixed curricular
  range. A floor anchored to that has no stable answer to "did 5.3 author
  enough," since the answer would change per learner and per moment rather
  than being a fixed target the task either meets or doesn't.

qa's fix, which I'd adopt over my own: declare a fixed curricular rank window
as data, named distinctly from `RANK_WINDOW_SIZE` (their Q5), and anchor 5.3's
floor to *that* — or, if the lead wants a floor that doesn't wait on Q5 first,
anchor it to something that already exists as declared data by the time 5.3
runs: the example-word sets of the opening and middle bands (phases 2 and 3).
Either way, routing the concrete fix to **qa** and **pareto-analyst** — the gap
itself is a completeness-criterion problem in their lane more than a
phase-slicing one, and qa's rank-window correction is exactly the kind of
cross-task consistency check testability work turns up that a structure-only
pass like mine would miss.

**Fourth independent convergence, from a fourth lens**: experienced-thai-teacher
found the same "declared rank window is referenced but never declared" gap as
their T15, from content viability rather than testability — they measured that
lesson 1 has exactly 3 usable corpus words within whatever window applies
(มา, r37; นาน, r332; นา, r538), meaning the window's actual value decides
whether lesson 1 is authorable at all under task 1.4, not just whether 5.3's
mnemonic count is checkable. That raises the priority of declaring this
constant beyond "a completeness-criterion nicety" — task 1.4 is phase 1's
proof task, and if the window is too narrow it may not have three teachable
words to work with. Since task 1.1 already owns the deck schema (see finding
#6's 1.1a), it's the natural place to declare this constant too, ahead of
task 1.4 needing it.

### 5. No task owns the transcript-corpus extraction — a consumed seam with no producer (qa's finding, independently verified, and independently re-found by experienced-thai-teacher as T12)

Seven ACs across five tasks assert against "the extracted ThaiPod101 transcript
corpus" (1.4 AC5, 2.4 AC4, 2.5 AC5, 3.2 AC5, 3.3 AC5, 4.2 AC5, 5.3 AC5), and
every one of them is gated in `verify` by a vitest case that runs this check.
Two reviewers from two different lenses (qa's testability pass and
experienced-thai-teacher's content-authorability pass) landed on this
independently, and experienced-thai-teacher drew the same comparison I did:
it's the same collaboration-trap shape task 3.1's ownership of
`lessonSequence.ts` already solves correctly elsewhere in the plan — a shared
thing 3.2 and 3.3 both need, with one task declared to own producing it — the
same reasoning just wasn't applied here. I confirmed the transcripts exist
only as 51 PDFs under `src/Thai Alphabet/` — there is no extracted text, no
extraction script, and no task anywhere in the plan whose `covers` names a
corpus artifact or an n-gram/originality module.
As written, task 1.4 (the first consumer) has to invent the extraction
pipeline, decide where the artifact lives, and write the n-gram check from
scratch, and six later tasks each depend on that ad hoc decision without it
ever being declared as a seam. This is the same failure mode phase 3's README
names for `lessonSequence.ts` — a shared thing two-or-more tasks need, with no
task that owns producing it — except here it's five tasks across four phases,
and it's silent rather than called out.

This belongs in phase 1, as its own task rather than folded into task 1.1 —
experienced-thai-teacher's original suggestion was to fold it into 1.1, and
they withdrew that once finding #6 split 1.1 into 1.1a (identity + deck
schema) and 1.1b (the four-store migration): neither half has a natural
connection to PDF extraction or n-gram checking, and bolting a third job onto
1.1a would recreate exactly the problem finding #6 exists to fix. It's
schedulable concurrently with 1.2/1.3 (none of the three `covers` sets
overlap) and 1.4 would then depend on all three instead of two.

Two content-correctness details to carry into that task's scope, both from
experienced-thai-teacher (T20, T11) and outside what a structural pass would
catch on its own:

- **The extraction must cover both PDF families under `src/Thai Alphabet/`**
  — the `_tpod101.pdf` lesson notes and the separate
  `_tpod101_recordingscript.pdf` files. "Transcript" reads naturally as only
  the recording scripts, but the existing 82 `mnemonic` strings this plan
  replaces were drawn from the lesson-note PDFs — an originality check that
  only extracts the recording scripts would miss the actual source of the
  material it's checking against, defeating the point of finding #5's own fix.
- **The extracted plaintext is a derived work of copyrighted material and must
  never be committed** — the task owns a `.gitignore` entry for its output
  alongside the extraction script itself, and the artifact must never reach a
  commit, a commit message, or a finding's text. This is a sharper version of
  CONTEXT.md's own originality constraint, applied to the intermediate
  artifact this plan's fix creates rather than just to the mnemonics it
  produces.

### 6. Task 1.1's blast radius is understated, and the fix is to split it — qa's and systems-architect's finding, independently verified and extended

`completedLessons` is referenced in 24 files; task 1.1's `covers` names 13. I
confirmed by grep and read the gaps directly, and systems-architect found a
fourth persisted store I'd missed. The confirmed gap list:

- **`src/infrastructure/persistence/Storage.ts`** is not covered, and it's the
  actual migration boundary — `migrateState()` (Storage.ts:40) is called from
  `LocalStorageAdapter.load()` (:161) and `importData` (:189), and is where the
  repo's existing "migrate once, at the load boundary" pattern for `SrsCard`
  legacy fields already lives (read its own doc comment: it exists specifically
  so every repository method doesn't re-run migration on every read). AC3's
  `completedLessons` migration is the same shape of problem this file already
  solves for other fields, and CONTEXT.md's "migrate once, at the boundary"
  instruction points straight at it. `StorageLearnerStateRepository.ts` — the
  file 1.1 *does* cover — is a pure delegator (`this.storage.load()
  .completedLessons`); the boundary AC3 names is in a file no task can edit.
- **`LearnerState.currentLesson: number | null`** (`shared/types.ts:174`),
  read/written by `StorageLearnerStateRepository.getCurrentLesson()`/
  `setCurrentLesson()` and carried through `MergeService` — a fourth
  lesson-number store CONTEXT.md's three-store table doesn't list. If AC3
  migrates `completedLessons` to string ids and leaves `currentLesson` as a
  raw number, the two stores disagree about what a lesson identifier *is*
  within the same `LearnerState` object — the join-key hazard CONTEXT.md
  opens with, reappearing inside the task meant to fix it.
- **`ScriptPropertyCard.lessonNumber`** (systems-architect's find, confirmed:
  `ScriptPropertyCard.ts:15,36,49`) — every persisted script-review card
  carries a raw `lessonNumber`, written at 20 sites in `ScriptCardGenerator.ts`
  and read by `ScriptLessonService` at `unlearnLesson` (:170),
  `getLessonMasteryProgress` (:279), and the catch-up reconciliation path
  (:319–323). This is a **fourth** persisted store keyed on lesson number —
  CONTEXT.md's table has three, the real count is four — and none of
  `ScriptPropertyCard.ts`, `ScriptCardGenerator.ts`, or `StorageCardRepository.ts`
  is in any task's `covers`. The user's own `progress.json` at the repo root
  has this field on all 295 of its cards, which is a live illustration of the
  blast radius, not a hypothetical one.
- **Four presentation files break on the type change**, none covered by 1.1 or
  1.2: `ProgressPage.tsx` (`Set<number>` at :20, hardcoded `< 25`/`+ 1` at
  :38–39), `LessonPath.tsx` (`completedLessons: Set<number>` prop type, :3),
  and `StageItemsPage.tsx`/`LearnedItemsPage.tsx` (both do
  `[...state.completedLessons].sort((a, b) => a - b)` — numeric subtraction
  sort, which is wrong the moment `completedLessons` holds strings, silently
  rather than as a type error if the sort comparator itself isn't typed
  strictly).

This matters structurally, not just for test coverage: task 1.2's `verify`
runs `npm run build`, and 1.2 owns none of the five files above. If 1.1
doesn't fix them, 1.2 inherits a broken build in files outside its own
`covers` — the exact cross-task blast-radius miss `covers` exists to prevent.

**The fix isn't just widening `covers` — it's splitting the task.** My
original read was that the cut is identity+migration vs. type+schema.
systems-architect sharpened it: `sym.lesson` moving number→id *is* the
migration, so the additive half has to stop short of touching it — what makes
the cut work is that the **id vocabulary can be declared alongside the
numbers** before anything moves. Concrete boundary, with the corrected
`covers` and `depends_on`:

- **1.1a — lesson identity declared** (purely additive; nothing persisted
  changes). Covers `lessonContent.ts`(+test), `lessonSequence.ts`(+test) —
  see finding #3 — `symbols.ts`, `shared/types.ts`, `ScriptLessonService.ts`
  (+test), `StartLessonUseCase.ts`. Declares the `^[a-z0-9-]{1,64}$` charset
  and the `LessonId` type, the ordered lesson ids and the number→id
  correspondence the migration will later consume, and the `LessonContent`
  union + deck schema. `lessons[]` gains `id` and `content`; `number` and
  `videoUrl` stay; `sym.lesson` is untouched. Also folds in systems-architect's
  separate finding (their A6) that today's seam omits the one thing
  `LessonIntro` actually receives — `LessonSummary` needs to carry
  `LessonContent`, surfaced through `getScriptSummary` unchanged otherwise.
  `verify`: domain `tsc` + domain tests only — no `npm run build`, since
  nothing in `presentation` changes yet. `depends_on: []`.
- **1.1b — the four-store migration** (horizontal, at-once, the risky half).
  Covers `symbols.ts`, `shared/types.ts`, `ports/LearnerStateRepository.ts`,
  `ScriptLessonService.ts`(+test), `ScriptCardGenerator.ts`,
  `ScriptPropertyCard.ts`, `StorageCardRepository.ts`, `Storage.ts`,
  `StorageLearnerStateRepository.ts`(+test), `Validation.ts`(+test),
  `MergeService.ts`(+test), `storage.test.ts`, `types.test.ts`,
  `VocabularyLessonService.ts`(+test), `integration.test.ts`, plus the five
  presentation files from the confirmed gap list above, plus `LessonPage.tsx`/
  `CatchUpPage.tsx` for their `Number(lessonNumber)` route-param reads
  (`LessonPage.tsx:27`, `CatchUpPage.tsx:22`) — a third join-key site neither
  of us had named. Moves `sym.lesson`, `completedLessons`, `currentLesson`,
  `pendingCatchUps[].lessonNumber`, and persisted `card.lessonNumber` together
  in one pass, and fixes all three integer prerequisite walks in
  `ScriptLessonService.ts` (:132, :183, :291 — today's AC7 names only the
  first). `verify`: domain `tsc` + `npm run build` + the full test scopes —
  the build gate is load-bearing here, since today's 1.1 gates only on
  `tsconfig.domain-check.json` (domain/application/infrastructure), which is
  exactly why the four presentation files went unnoticed in the first place.
  `depends_on: ["1.1a"]`.
- **1.2**: `depends_on: ["1.1b"]`, not `1.1a` — 1.2 and 1.1b both touch
  `LessonPage.tsx`/`CatchUpPage.tsx`, and 1.2 should build on already-migrated
  route params rather than redoing that work.
- **1.3**: `depends_on: ["1.1a"]` — this is the payoff. 1.3 needs only the
  deck schema and the id charset, nothing from the migration; today it waits
  behind all of 1.1 despite being unrelated to the migration's risk. 1.3 is
  voted the same weight as 1.1 (13), so today's plan has two equally-sized
  tasks serialized for no reason the dependency requires.
- **1.4**: `depends_on: ["1.2", "1.3"]`, unchanged.

Net effect on phase 1's critical path: `1.1a → 1.1b → 1.2 → 1.4` with `1.3`
running alongside from `1.1a` onward, instead of `1.1 → {1.2, 1.3} → 1.4`
where 1.3 sits idle behind migration work it doesn't need. This is the same
shape of win as the 4.3a/4.3b split in finding #1 — separating a hazardous,
horizontal, file-heavy piece from an additive one that a sibling task actually
depends on.

### 7. Task 6.2 has the same shape of gap at the other end of the plan — systems-architect's finding, independently verified

Task 6.2's `covers` lists `LessonIntro.tsx`, `LessonPage.tsx`, and
`CatchUpPage.tsx` for the video-arm removal, but two more dispatch sites read
`videoUrl` and aren't covered: `LearnedItemsPage.tsx` (`const url =
lesson.videoUrl!` at :77, and a second read at :171) and
`ScriptLessonService.ts`'s `LessonSummary.videoUrl` field itself (:87, set at
:198, cleared at :362) plus its own test at `ScriptLessonService.test.ts:356`.
6.2's `verify` runs `npm run build` and `npm test -- src/presentation`; per
AC2, `LessonContent`'s video arm is removed entirely, which makes
`LessonSummary.videoUrl` and `LearnedItemsPage`'s non-null-asserted read of it
dead code that won't compile — in files 6.2 doesn't own. Phase 6's README
correctly identifies `CatchUpPage` as "the second consumer... most likely to
be missed" but the plan missed a third and fourth site of the same field.

Same fix as finding #6: widen `covers` to the confirmed list before task 6.2
starts, rather than leaving the gap for the executor to discover via a failed
build at the phase's last task — which is also the task the whole plan's
success criterion (Phase 6 README's "no lesson serves a licensed video")
depends on landing cleanly.

### 8. Root cause: phase-level `covers` lists directories, task-level `covers` lists files — the mismatch is what hid findings 5–7

Every phase README's `covers` frontmatter uses directory-granularity entries —
phase 1's README covers `src/presentation/pages` and
`src/infrastructure/persistence`; phase 6's covers `src/presentation/pages` and
`src/presentation/components/organisms`. Read at the phase level, both phases
*look* fully covered: every file qa and systems-architect found (`Storage.ts`,
`ProgressPage.tsx`, `LessonPath.tsx`, `StageItemsPage.tsx`,
`LearnedItemsPage.tsx`) sits inside a directory the phase README already
names. It's only at the task level, where `covers` narrows to specific files,
that the gaps open up — and nothing in the plan format cross-checks a task's
file-level `covers` against its phase's directory-level `covers` for
completeness. A phase README's directory entry reads as a promise ("this
phase's tasks, between them, handle everything under this directory") that the
task-level `covers` lists don't have to keep, and in five confirmed cases here,
don't.

This is worth fixing at the pattern level, not just patching the five files.
**systems-architect made the check mechanical**: for each phase, expand every
directory in the phase README's `covers` to its file list, subtract the union
of that phase's task-level `covers`, and report the remainder. Run against
phase 1 today, that one operation returns `Storage.ts`, `ScriptCardGenerator.ts`,
`ProgressPage.tsx`, `StageItemsPage.tsx`, `LearnedItemsPage.tsx`,
`LessonPath.tsx` — four of the five blockers in finding #6, from one grep, no
manual file-by-file hunting required.

It's necessary but not sufficient, and worth stating that plainly rather than
oversell it: the directory-diff doesn't catch `ScriptPropertyCard.ts` (its
directory, `src/domain/script/entities`, isn't in phase 1's README `covers`
either) or the missing transcript-corpus task from finding #5 (nothing names
that directory or artifact as scope anywhere, so there's no directory claim to
diff against). For those, the phase-level `covers` itself is incomplete, not
just under-distributed across tasks — a second, harder check, closer to "does
this phase's own `covers` list actually name everything its ACs depend on."
The mechanical diff is still worth running before every phase is marked ready:
it's nearly free and it would have caught the majority of what took two
people reading source by hand to find here.

### 9. Task 2.5 places the class-rule lesson where its own AC3 is unsatisfiable — experienced-thai-teacher's finding, verified, and resolved without a cross-phase slot

I independently confirmed this against `symbols.ts`. Task 2.5 puts the
class-rule lesson in the opening band (`content/lessons/lesson-02.md` through
`lesson-05.md`, plus `lesson-class-rule.md`). Its own AC3 requires that lesson
to teach the 11-member high-class list well enough that applying the rule "as
the lesson states it" reproduces all 44 class assignments. I extracted every
consonant's `classType` and `lesson` field from `symbols.ts` directly: the 11
high-class letters are ข, ฉ, ศ, ษ, ส, ผ, ฝ, ห, ถ, ฐ, ฃ, and they land at
lessons 12, 12, 13, 13, 13, 14, 14, 15, 19, 19, 22 — every one of them well
past lesson 5. A class-rule lesson placed inside the opening band cannot teach
AC3's own list without forward-referencing glyphs the sequence hasn't taught
yet, which is exactly what task 2.5's own AC2 (and task 3.3 AC3's later
sequence-wide version of the same check) forbids. The two ACs contradict each
other for any placement inside the opening band, and neither the task nor the
phase 2 README notices.

This is a phase-slicing problem, not just a content-authoring one, so it's
squarely in my lane: the class-rule lesson's *content* (which two buckets are
derivable) can land early, in the opening band, since sonorants and
unaspirated stops are both taught by lesson 3. But the third bucket — "these
11 are the exception, memorise them" — cannot be taught before the learner has
met all 11.

**My first pass proposed a second sequence slot after lesson 22 for the
exception list. experienced-thai-teacher corrected this, and the correction is
better than my original finding.** Placing the 11-item list after lesson 22
teaches it *after* the learner has already paid the cost it's supposed to
save — the learner would meet ข at lesson 12, ฉ at 12, ศ/ษ/ส at 13, and so on,
memorising each one's class individually as it arrives, and only be told at
lesson 23 that a rule would have shortened that. A shortcut taught after the
long way round isn't a shortcut.

The actual fix needs no second slot and no cross-phase decision at all. I
verified the underlying claim myself, pulling `classType`/`lesson` for both
members of all six confusable pairs directly from `symbols.ts` — every low
member precedes its high-class counterpart by 5–12 lessons:

| contrast | low member | high member |
|---|---|---|
| ch | ช — lesson 4 | ฉ — lesson 12 |
| kh | ค — lesson 6 | ข — lesson 12 |
| s | ซ — lesson 4 | ส — lesson 13 |
| ph | พ — lesson 5 | ผ — lesson 14 |
| f | ฟ — lesson 5 | ฝ — lesson 14 |
| h | ฮ — lesson 7 | ห — lesson 15 |
| th | ท — lesson 7 | ถ, ฐ — lesson 19 |

Since a contrast can be taught the moment its *second* (high-class) member
arrives, and every row above already lands inside the middle band, **task
3.3 already owns every lesson where this needs to happen** — its own
"Architectural Decision" section already frames the six cousin pairs as "six
decisions rather than twelve letters" and its test cases already assert each
pair is introduced in one lesson with contrasting districts. 3.3 doesn't need
new scope; it needs to know it's *completing* the class rule task 2.5 starts,
not teaching an unrelated pairing. (ถ/ฐ landing at lesson 19 rather than in
the current middle band's lesson range is the one row that needs a look, and
ฐ is already on task 4.3's demotion list regardless.)

**Revised re-slice, replacing my original one**: task 2.5's scope narrows
rather than splits across phases — it teaches only the two derivable buckets
(sonorant→low, unaspirated stop→mid) plus the naming cheat code, and states
the third bucket as "everything with a puff or a hiss splits into a pair;
you'll meet each split as it comes." Its AC3 narrows to match: sufficiency to
derive low and mid for the 19 letters in the first two buckets, not all 44.
Task 3.3 picks up an explicit note (not new `covers`, since it already touches
the right files) that it is completing the class rule, and its own tests gain
one more assertion: applying the rule cumulatively after each cousin pair's
lesson correctly classifies both members. This turns what looked like an open
cross-phase ownership question into a same-file clarification of a task that
already exists — no new dependency, no new `covers` entry, no decision for the
lead to make about which phase absorbs anything.

### 10. Task 4.1 has an undeclared dependency on task 3.1 — experienced-thai-teacher's finding, structurally confirmed, phonology confirmed by the domain expert

Task 4.1's frontmatter declares `depends_on: []`, and its tone-mark table is
keyed on "consonant class" without specifying *which* consonant's class,
in a syllable with more than one. experienced-thai-teacher's linguistic
finding, stated plainly by them for citation: **in Thai, the tone of a
syllable is governed by the first consonant of an initial cluster, and by the
leading consonant in อักษรนำ — not by the letter the tone mark is visually
written over.** The mark's position is orthographic convention; the
governing consonant determines the outcome the mark's table looks up. Their
empirical check against this repo's own data: of 55 mái-trii/mái-jàt-dtà-waa
occurrences in `vocabulary.json`, the only two that appear to sit on a
low-class letter — กรี๊ด, ปลั๊กไฟ — are both clusters whose mid-class first
member actually governs. A naive implementation of task 4.1's table, reading
class off the letter under the mark, would report both as violations of the
plan's own "never occurs with low class" claim (task 4.1 AC2) and resolve
both words' tones wrongly.

That governing-class computation is task 3.1's domain — `syllableRules.ts`
owns the cluster inventory and the leading-consonant rule — so task 4.1 needs
what 3.1 produces, not just a bare consonant's own class, or its table is
under-specified for any word containing a cluster or a leading consonant.

The structural half is mine to confirm and I have: `depends_on: []` is what's
in the frontmatter today, and task 4.2's AC3 ("tones resolve from the table as
the lesson states it") is unsatisfiable for any example word containing a
cluster or a leading consonant without the governing-class rule 3.1 owns
being available to 4.1 first. Phase 4's README declares `depends_on: ["3"]` at
the phase level, but that's not the same guarantee as a task-level dependency
— it only means phase 3 finishes before
phase 4 *starts*, not that task 4.1 specifically consumes what task 3.1
produces, and nothing in 4.1's own document says it does. **Fix**: add
`"3.1"` to task 4.1's `depends_on` and have it explicitly cover (or import
from) the governing-class logic in `syllableRules.ts`, rather than relying on
phase-level ordering to make the connection an executor has to notice on
their own.

## Panel convergence

- Finding #4 (task 5.3's missing coverage floor) was found independently by
  **three** reviewers from three different lenses: mine (phase-slicing/
  completeness-pattern), **pareto-analyst**'s P3 (value/effort — an unbounded
  AC), and **qa**'s Q34, High (testability — a green suite that can't tell a
  thin pass from a real one). Three-way independent convergence on one task is
  worth surfacing to the lead on its own regardless of any single lens's
  confidence.
- **qa** corrected my proposed fix for finding #4: my "anchor to the
  currently-taught rank window" suggestion assumed that pattern was consistent
  across the plan's content tasks — it isn't (only 3.3/4.2/4.3 use it; 1.4/2.5
  don't), and the name collides with `VocabularyLessonService`'s
  learner-relative, sliding `RANK_WINDOW_SIZE`. Adopted qa's correction in
  finding #4 directly.
- **pareto-analyst** agrees with the 4.3a/4.3b split (finding #1): the
  join-key-hazard verification (AC1, 2, 3, 6) stays with the mechanics half
  either way, so the split doesn't dilute verification depth anywhere and
  removes the phase's only remaining serialization.
- **pareto-analyst** rates the 2.4 axis-split (finding #2) as a real seam but
  low value — vowels are 29 of 73 records and likely finish quickly even
  bundled in, so splitting trades a modest wall-clock win for a second
  AC-enforcement suite. I'd weight that the same way: legitimate, not worth
  blocking on, left to the estimators' cost call rather than treated as a
  standing finding.

## What I did not find

- No task pair in the same phase shares a `covers` file while both are
  schedulable concurrently — this held up under my own pass; it's a different
  axis from findings 5–8, which are about `covers` being *incomplete*, not
  about two tasks colliding on the same file.
- No phase's `depends_on` frontmatter disagrees with its README's dependency
  table — checked all 6.
- No phase is a horizontal tier in tracer-bullet clothing; each phase's "What a
  person can do at the end" is genuinely true of that phase's own tasks, not
  borrowed from a later one.
- Phase 5's independence from phases 3–4 (declared as running alongside them,
  gated only on phase 2) is correctly justified — it needs the scene-grammar
  seam and nothing from the syllable-rule or tone-mark work, and phase 6
  correctly gates on both 4 and 5 rather than assuming 5 finishes first.

Given findings 5–8, I'd treat phases 2–5's `covers` lists with the same
suspicion until someone runs the grep-based check finding #8 proposes against
each — I did not do that pass for every phase myself (only phases 1 and 6,
following qa's and systems-architect's leads), so absence of a reported gap in
phases 2–5 is not the same as a confirmed clean bill.
