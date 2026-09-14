---
doc_type: review
title: QA review — lesson rebuild execution plan
description: Test coverage, AC testability and gate-efficacy review of plans/lesson-rebuild, with 31 dispositionable findings.
reviewer: qa
lens: test coverage, edge cases, AC testability, implementation-coupled tests, gate efficacy
plan: plans/lesson-rebuild
generated: {by: claude-opus-5/agent, at: 2026-09-13}
---

# QA review — lesson rebuild

## Executive Summary

The plan is unusually disciplined for a content-heavy plan. The three-state
criterion pattern (`absent` / `present` / `failed` never collapsing) is applied
consistently and is the single best thing in it; the `ac_enforcement` mapping is
present on every task; and several architectural decisions correctly identify
the *tempting wrong test* and write a criterion against it (2.5 AC3's "test the
lesson, not `soundType.ts`"; 3.3 AC3's sequence-wide rather than per-lesson
forward-reference check; 5.3 AC4's directional asymmetry). Those are senior
calls and I would not change them.

The problems are concentrated in three places.

**First, the plan's flagship content gate does not exist.** Seven acceptance
criteria across five tasks assert against "the extracted ThaiPod101 transcript
corpus". The transcripts in this repository are 51 PDFs under
`src/Thai Alphabet/`. There is no extracted text, no extraction script, no
corpus artifact, and no `covers` entry in any task naming one. The plan's
originality constraint — described in CONTEXT.md as "a hard constraint on every
content task" — currently has no implementable gate behind it (Q1). Worse, the
anti-vacuity clause the plan repeats seven times ("the check asserts it detects
a planted overlap, so an empty or unreadable corpus cannot make it pass
vacuously") does not do what it claims: planting an overlap and then detecting
it passes whether or not the real corpus loaded (Q2). This was the specific
question in the brief, and the answer is that the mitigation as written is
unsound.

**Second, three criteria of the form "applying the rule as the lesson states it
reproduces X" are not automatable against the artifact the plan produces.**
Lessons are prose Markdown under `content/lessons/`. No task declares a
machine-readable rule block in the lesson format, and the two tasks that own
the format (1.1, the schema; 1.3, the script→deck parser) never mention one.
Every one of these ACs also carries a mutation test ("removing one row makes
AC3 fail") that presupposes structured content. The intent is right and the
seam is missing (Q3).

**Third, the plan's own headline hazard is under-scoped.** CONTEXT.md opens
with the lesson-number join key and names three downstream consumers.
`completedLessons` is referenced in 25 files; task 1.1's `covers` names 13.
Two further persisted lesson identifiers exist that no task migrates —
`LearnerState.currentLesson` and `PropertyCard.lessonNumber` on every stored SRS
card (Q11). `getMasteredToneRules()` reads `lesson` off `toneRules` and
`toneMarkRules` and gates `getUnlockedWords()` exactly as the character set
does, but 1.1 AC4 — explicitly billed as "the join-key proof" — asserts only
`getMasteredCharacters()` (Q12). And 1.1's `verify` (domain-scoped `tsc` plus
three scoped test paths) cannot see any of the presentation-side breakage the
migration causes (Q6).

Two further findings are worth reading before anything else, because both are
cheap to fix and expensive to discover late: the new district cue in task 2.3
will leak the answer on the class-recall SRS card that colour is deliberately
withheld from (Q16), and three existing Playwright tests assert Lesson 1 shows a
`<video>` element, which task 1.4 makes false — in a suite no task covers and no
`verify` runs (Q15).

On the `ac_enforcement: none` declarations: 1.3 AC6 and 6.1 AC3 are broadly
honest calls with a testable remainder (Q10, Q30). 1.3 AC3 is not — it is the
one failure path that *requires no API key by construction* (Q9).

A panel exchange after this review was drafted added three findings in my lens
(Q32–Q34) and corrected three of mine (Q12, Q18, Q27 — each marked in place).
Two are worth pulling forward: task 5.3 can pass having authored **zero** new
vocabulary mnemonics, since AC6 makes "has none yet" a terminal state with no
floor anywhere in the task (Q34); and 1.1 AC4 does not merely under-assert, it
names a `private` method on a class whose exported name differs from its
filename, so the criterion cannot be executed as written at all (Q12).

A later pass by experienced-thai-teacher supplied the one thing this review was
missing: a *measurement* of whether the originality gate works. It does not. The
82 mnemonics CONTEXT.md calls close paraphrases are a labelled calibration set,
and at the plan's 8-gram threshold the gate catches 15 of them — it passes five
out of six items of exactly the material it exists to exclude (Q19, reproduced
independently). That moves Q19 from Medium to High and makes the originality
problem three-layered rather than two: the corpus does not exist (Q1), the
vacuity guard does not guard (Q2), and the threshold is set where it cannot bite
(Q19). Two further criteria from that pass are blocking in their own right — a
universal in 3.1 AC1 that the corpus refutes inside the top 1,200 words (Q35),
and 2.2's premise that `vocabulary.json` is uniformly IPA when roughly a
thousand entries are already Paiboon (Q36).

Verdict: the plan is not ready to execute as written. Q1, Q2, Q3, Q6, Q11, Q12,
Q19, Q34, Q35 and Q36 are blocking. The rest are repairable in place and most are one or two
lines of criterion text. Nothing here argues against the plan's approach — the
structural-gate-then-judgement strategy is the right one for content work, and
the repairs are almost entirely to how the gates are specified rather than to
what they are trying to catch.

---

## Plan-Level Findings

### P1 (Q1) — The transcript corpus every originality gate depends on does not exist and no task owns it

**Severity: Critical**

**Description.** Seven ACs assert against "the extracted ThaiPod101 transcript
corpus": 1.4 AC5, 2.4 AC4, 2.5 AC5, 3.2 AC5, 3.3 AC5, 4.2 AC5, 5.3 AC5. The
repository's transcripts are 51 PDFs (`src/Thai Alphabet/TAME_L*_tpod101*.pdf`);
the only non-PDF in that directory is `download_videos.sh`. Nothing in the plan
extracts them. No task's `covers` names a corpus artifact, an extraction script,
or an n-gram module. `grep -rn "extracted\|corpus" plans/lesson-rebuild` returns
only the seven ACs and their restatements.

Consequences, all of which land on the executor of task 1.4 with no guidance:
where the corpus lives; what format; whether it is committed; which PDF text
extractor (none is a dependency — `package.json` has no PDF library, and the
plan forbids adding a Python test runner); how narration is tokenised into
"words" when it is English prose with Thai spans embedded and Thai has no word
spaces; and whether the check is case- and punctuation-normalised. Then six
later tasks in four other phases re-derive all of those decisions
independently, in six separate test files, with no shared module — so the gate's
strength varies per task and drifts.

**Recommendation.** Add a seam task in phase 1 (before 1.4) owning: a corpus
extraction step; a committed corpus artifact at a declared path; and a single
`originality.ts` module exporting the overlap check with a declared
tokenisation. Every later content task lists that module in `covers` as a
consumer and its AC becomes "calls the shared check" rather than "asserts no
8-gram overlap". Give the seam task an AC that the committed corpus covers all
25 source lessons and that its total token count is asserted against a recorded
figure.

---

### P2 (Q2) — The "planted overlap" clause does not close the vacuous-pass hole it claims to close

**Severity: Critical**

**Description.** Five tasks state some form of: *"the check asserts it detects a
planted overlap, so an empty or unreadable corpus cannot make it pass
vacuously"* (2.4 AC4 is the most explicit). The inference is false under either
reasonable implementation:

- If the planted overlap is planted into a test-local corpus, the real corpus is
  never exercised by the positive case at all, and an empty real corpus passes
  the negative case silently.
- If the planted overlap is appended to the real loaded corpus, then an empty
  real corpus plus one appended sentence is a one-sentence corpus — the positive
  case detects it, and the negative case still passes vacuously.

In both cases every assertion is green and the gate checks nothing. A planted
overlap proves the *algorithm* works; it says nothing about the *corpus* being
loaded. These are orthogonal failures and only one is being tested.

**Recommendation.** Two additional assertions, in the shared module's own test,
not repeated per task:

1. **A canary.** Assert that a known verbatim phrase taken from the real
   transcripts IS found in the loaded corpus. This is the assertion that fails
   when the corpus is empty, truncated, or extracted into mojibake.
2. **A size floor.** Assert the loaded corpus's token count against a recorded
   figure (see Q1), so a silently halved extraction is visible.
3. **A calibration test** (experienced-thai-teacher's, and the strongest of the
   three): assert the gate flags at least N of a committed fixture of known-
   derivative strings. The planted-overlap test proves the corpus loaded; a
   calibration test proves the *threshold is set somewhere useful*, which is the
   property Q19 shows the plan currently lacks. The 82 pre-rewrite mnemonics are
   the obvious fixture — they are being deleted anyway, so preserving them as a
   calibration corpus costs nothing and is the only labelled data available.

Then reword the seven task ACs to drop the unsound justification and instead say
the check is the shared one, whose corpus-integrity assertions live with it.

---

### P3 (Q3) — "Applying the rule as the lesson states it" is not automatable against prose Markdown

**Severity: High**

**Description.** Three ACs require a test to apply a rule *as a lesson states
it*: 2.5 AC3 (derive all 44 class assignments), 3.2 AC4 (resolve corpus words
from the three syllable rules), 4.2 AC3 (resolve tones from the stated
tone-mark table). Each is mapped to a vitest case, and each carries a mutation
test asserting the case fails when the lesson's content is thinned.

The lesson artifact is `content/lessons/*.md` — hand- and agent-authored prose,
parsed to deck JSON by the pipeline task 1.3 builds. For a vitest case to
"apply the rule as the lesson states it", the lesson must carry a
machine-readable declaration of the rule. Neither task 1.1 (which owns the deck
schema) nor task 1.3 (which owns the parser) mentions such a block, and none of
the three tasks' `covers` includes a schema file. As written the executor's
options are (a) parse English prose, which is not a test, or (b) have an agent
read the lesson and judge, which is not a vitest case and not what
`ac_enforcement` claims.

There is a second, subtler failure the ACs do not guard. If the structured block
is authored *beside* the prose rather than being what the prose is generated
from, the test can pass on a block that says X while the learner reads prose
that says Y. That is precisely the failure these ACs exist to catch, reproduced
one layer down.

**Recommendation.** Have task 1.1 (or the 1.3 parser) declare a `rules:` block
in the lesson script format: a structured statement of what the lesson teaches,
which the deck's rule slides are **rendered from**, so prose and block cannot
disagree. Add an AC to whichever task owns the format asserting that a lesson's
rendered rule content derives from its declared block. Then 2.5 AC3, 3.2 AC4 and
4.2 AC3 become mechanical — and their mutation tests become implementable
(delete a key from the block, re-run).

The alternative — declaring these three ACs `ac_enforcement: none` and assigning
them to the phase reviewer — is honest but spends the plan's best content
criterion.

---

### P4 (Q4) — Baseline-count criteria are self-certifying and unbounded

**Severity: High**

**Description.** 3.1 AC5 and 4.3 AC5 assert a disagreement count "against a
recorded baseline rather than assumed to be zero". The architectural decision
in 3.1 argues this well: genuine exceptions exist, zero would be false, and a
moving number is the signal. I agree with the reasoning and the criterion still
does not bite, for three reasons.

1. **No artifact is named.** 3.1's `covers` is `syllableRules.ts`,
   `syllableRules.test.ts`, `lessonSequence.ts`. There is nowhere for the
   baseline, or for the per-disagreement report AC5 requires ("reported with the
   word and both readings"), to live. It will end up as a literal in the test
   file, which nobody reads.
2. **It cannot fail on first authorship.** The implementer runs the rules,
   observes N disagreements, writes N into the test. Green, by construction,
   for any N. A rule set disagreeing with the corpus on 4,000 of 5,454 entries
   satisfies AC5 exactly as well as one disagreeing on 40.
3. **No review step is attached.** Nothing requires the number, or the report,
   to be put in front of a human. The plan's "structural gate then human
   judgement" framing is not wired up here (see Q8).

**Recommendation.** Require the baseline to be a **committed artifact** (a JSON
or Markdown report, one row per disagreement with the word and both readings),
named in `covers`, with the test asserting the count matches the artifact's
length and the artifact matches the current run. Add to both ACs: the
disagreement count and a sample of rows are reported in the task's completion
note for reviewer sign-off. That converts a self-certifying literal into a
reviewable object at roughly zero extra cost.

Note also that 4.3 AC5's baseline is a *different* baseline over a *different*
population than 3.1 AC5's, and the population is undefined (see Q5).

---

### P5 (Q5) — "The declared rank window" is never declared, and collides with an existing differently-shaped concept

**Severity: High**

**Description.** Three ACs constrain example words to "the declared rank
window": 3.3 AC4, 4.2 AC4, 4.3 AC5. Nothing in the plan declares one — no task,
no phase README, no CONTEXT.md section, and no `covers` entry. Two more content
tasks (1.4 AC3, 2.5 AC4) omit the window entirely and require only that a word
resolves to a `vocabulary.json` entry, so the plan README's stated rule ("every
example word resolves to a `vocabulary.json` entry inside a declared rank
window") is enforced in three of five content tasks and unimplementable in
those three.

The name also collides. `VocabularyLessonService.getUnlockedWords()` already
computes a rank window: it finds the first unlearned word by rank and admits
`rank <= firstUnlearned.rank + RANK_WINDOW_SIZE - 1`. That window is
**learner-relative and sliding**. A test asserting "this deck's example words
fall inside the declared rank window" cannot be written against it — the answer
differs per learner and per moment. The plan means something else (a fixed
curricular ceiling), and an executor reading `VocabularyLessonService` will
reasonably reach for the wrong one.

**Recommendation.** Declare the window once, as data, in the task that first
needs it (1.4): a named constant with a stated value and a one-line rationale,
distinct in name from `RANK_WINDOW_SIZE`. Apply the constraint uniformly across
all five content tasks' example-word ACs, or state explicitly in 1.4 and 2.5 why
the opening lessons are exempt.

---

### P6 (Q6) — Task 1.1's covers and verify understate the migration's blast radius by roughly half

**Severity: High**

**Description.** `grep -rln completedLessons src` returns 25 files. Task 1.1's
`covers` names 13. The omissions are not incidental:

| File | Why it breaks |
|---|---|
| `src/presentation/components/organisms/LessonPath.tsx` | prop typed `completedLessons: Set<number>`, `.has(n)` on a lesson number |
| `src/domain/shared/services/AchievementService.ts` | `completedLessons.length >= 25` (see Q25) |
| `src/presentation/pages/ProgressPage.tsx` | `state.completedLessons.length < 25`, `length + 1` as the next lesson |
| `src/infrastructure/persistence/Storage.ts` | owns `load`/`save`/`importData` — the actual serialization boundary AC3 says the migration lives at, and the only caller of `validateLearnerState` |
| `src/application/use-cases/StartLessonUseCase.test.ts` | the `.ts` is covered, its test is not |
| `src/types.test.ts`, `src/storage.test.ts` | top-level legacy tests over the persisted shape |
| `src/presentation/App.tsx` | routes are `/lesson/:lessonNumber`; task 6.2 writes `/lesson/:id`, so the param changes and no task covers it |

Compounding this, 1.1's `verify` is `tsc --noEmit -p tsconfig.domain-check.json`
(scoped to `domain`/`application`/`infrastructure`) plus three scoped `npm test`
paths. Neither `npm run build` nor an unscoped `npm test` runs. Task 1.1 can
therefore go fully green while the application does not compile and ten or more
presentation tests fail. Task 1.2's `verify` does run `npm run build` and will
inherit the breakage — in files 1.2 does not own.

**Recommendation.** Extend 1.1's `covers` to the files above and add
`npm run build` and an unscoped `npm test` to its `verify`. If that makes 1.1
too large, the presentation-side ordinal assumptions (`LessonPath`,
`ProgressPage`, `AchievementService`) are separable as a follow-on task in phase
1 that 1.2 depends on — but they cannot be left unowned, because the type change
reaches them whether or not a task claims them.

---

### P7 (Q7) — Trust boundary inventory: one missing row, one uncontrolled sink, one uncontrolled row

**Severity: Medium**

**Description.** Every row's `Reaches` cell does name a concrete sink, which is
better than most inventories. Three defects:

1. **Missing row — imported progress file.** `Storage.importData(json)` parses a
   user-supplied JSON file and merges it into learner state; a `progress.json`
   sits in the repository root, so this path is in live use. That is genuinely
   external input reaching `completedLessons` → the lesson-identity migration →
   the mastered-character set, and it is a **second route to the same sink** as
   the `localStorage` row. The inventory's Source cell for that row says
   "`localStorage`, and a second device via `MergeService`" and stops there.
   Import is the least-trusted of the three routes and the only one not listed.

2. **Uncontrolled sink on an existing row.** Row 3 names two sinks for
   data-derived asset paths: filesystem path derivation, **and** "`src`/`href`
   attributes in rendered slides". The controls list covers the first
   (charset in 1.1, containment at the write boundary in 1.3) and not the
   second. Task 1.2 AC4 covers text fields only — an asset path going into a
   `src` attribute is not a text node, and 1.3 AC4's containment assertion is
   over the *generator's* fixture, not over what the renderer accepts. Deck JSON
   is described in the same row as hand-editable, so the renderer sees input the
   generator never validated. The later content tasks' "every asset exists at
   its declared path" ACs (1.4 AC6, 2.5 AC6, 3.2 AC6, 3.3 AC6, 4.2 AC6) are
   existence checks, not containment checks.

3. **Row with no control.** The `word_class` backfill row has no matching
   control bullet. 5.2 AC2/AC3 (provenance recorded, source values never
   overwritten) are the de-facto control; the inventory does not say so.

Minor: the controls list predates phase 6. Task 6.1 AC4 is a second route to the
lessonId path sink and the inventory names only 1.1 and 1.3 as owners.

**Recommendation.** Add the import row. Add a control bullet giving task 1.2 a
render-side containment check (an asset reference must be a relative path under
`lessons/<lessonId>/`, refused otherwise) and a matching AC. Attribute the
`word_class` row to task 5.2, and add 6.1 to the lessonId control bullet.

---

### P8 (Q8) — "Human judgement on top of a green structural gate" is asserted plan-level and never scheduled

**Severity: Medium**

**Description.** The plan README states the content strategy as "Human judgement
reviews prose on top of a green structural gate rather than being the only
gate." Nothing schedules the human half. Only two places in 26 documents name a
reviewer action: 1.3 AC3 ("the phase reviewer runs the generator with no key")
and 6.1 AC3 ("the phase reviewer plays an exported file"). No content task
defines what the reviewer reads, what artifact they produce, or what a failed
prose review does to the task's status.

This matters most where the structural gate is weakest by construction — the 73
rewritten mnemonics (Q19) and the "is this lesson actually good?" question the
plan correctly declines to make testable.

**Recommendation.** Give each content task (1.4, 2.4, 2.5, 3.2, 3.3, 4.2, 4.3,
5.3) one explicit reviewer-judgement criterion with `ac_enforcement: none` and a
named artifact (e.g. "the reviewer reads all 73 mnemonic records and records a
verdict per confusable pair"). An `ac_enforcement: none` entry naming the
reviewer is the plan's own existing idiom for this; it is simply not applied
where it matters most.

---

## Plan Quality Findings

| Dimension | Assessment | Notes |
|---|---|---|
| AC testability | **Weak in places** | 3 ACs not automatable as written (Q3); 3 ACs reference an undeclared population (Q5); 7 ACs reference a non-existent artifact (Q1) |
| Behavioral vs implementation-coupled | **Strong** | ACs describe learner-visible or data-visible outcomes throughout. 5.1 AC4 is the one exception, asserted at the wrong layer (Q27) |
| Test cases black-box, not mock-asserting | **Strong** | No AC or test case asserts on a mock, spy or call count except 1.2 AC6 (`onComplete` once), which is a genuine contract |
| Gate efficacy (do the checks bite?) | **Weak** | The originality gate cannot run (Q1) and its anti-vacuity clause is unsound (Q2); baseline gates are self-certifying (Q4) |
| Edge-case coverage | **Strong** | The three-state pattern is applied consistently and catches the real class of persistence bugs. Gaps are in scope, not in rigour |
| Regression coverage of existing behaviour | **Weak** | 3 Playwright tests break silently (Q15); `AchievementService` becomes unreachable (Q25); class-recall card leaks its answer (Q16) |
| Blast-radius accounting | **Weak** | 1.1 understated by ~12 files (Q6); 2 further lesson identifiers unmigrated (Q11) |
| YAGNI | **Strong** | No speculative generality found. `symbolPriority` (4.1), `teachingWords` (1.4) and per-entry provenance (5.2) each have a stated consumer |
| Architectural decisions with alternatives | **Strong** | Every task carries one, most with named rejected alternatives and the reasoning. Among the better examples I have reviewed |
| Trust boundary inventory | **Adequate** | Rows name concrete sinks; one row missing, one sink uncontrolled, one row unattributed (Q7) |
| `ac_enforcement` honesty | **Mostly honest** | 2 of 3 `none` declarations defensible with a testable remainder; 1 is avoidable (Q9) |

---

## Phase-by-Phase Review

### Phase 1 — Tracer

The phase is correctly shaped: the end-to-end criterion (1.4 AC4) genuinely
fails if any hop is wrong, and 1.2/1.3 running concurrently on disjoint `covers`
against a contract 1.1 fixes is the right decomposition. Findings are about
scope and about one dishonest enforcement declaration.

**Q9 — 1.3 AC3's `ac_enforcement: none` is avoidable. Severity: Medium.**
The declaration reads "none — an operational failure path; the phase reviewer
runs the generator with no key". This is the one API-touching criterion that
**requires no API key by construction**: the assertion is that the generator
exits non-zero and names the missing variable *when the key is absent*. A vitest
case can `spawnSync("python3", ["scripts/generate-lesson-deck.py", ...], {env:
<key removed>})` and assert on exit code and stderr. `python3` is already
assumed available — `py_compile` is in the same task's `verify` — and there is
precedent for filesystem-touching vitest cases in `src/domain/game/architecture.test.ts`.
*Recommendation:* map AC3 to that case. It also catches the more likely
regression: a later edit that makes the generator fall through to a partial run.

**Q10 — 1.3 AC6's `none` is honest but leaves a testable half on the table.
Severity: Medium.** Transcribe-back genuinely needs the API at generation time,
so `none` is right for the *act* of verification. But AC6's second sentence —
"The manifest carries each Thai clip's verification outcome" — is assertable over
the committed manifest with no API at all: every Thai segment carries a
verification outcome, and no asset referenced by the shipped deck is in the
`failed` state. Neither 1.3 nor 1.4 asserts this, so a manifest full of `failed`
clips ships a green task. *Recommendation:* split AC6 into the API-dependent act
(`none`, reviewer) and the artifact-shape assertion (a vitest case in
`generatedDeck.test.ts`), or add the artifact assertion to 1.4 alongside AC6's
asset-existence check.

**Q11 — Two further persisted lesson identifiers are unmigrated. Severity:
High.** CONTEXT.md's three-store table lists `completedLessons`, `sym.lesson`
and `lessons[].number`. Two more exist:

- `LearnerState.currentLesson: number | null` (`src/domain/shared/types.ts:174`),
  read and written by `StorageLearnerStateRepository`, carried through
  `MergeService`, set by `ScriptLessonService.startLesson`.
- `PropertyCard.lessonNumber: number` (`types.ts:82`) on every persisted SRS
  card in `LearnerState.cards`.

Task 1.1's AC3, AC5 and AC6 speak only of `completedLessons`. If the id type
changes and `Validation.ts` is tightened to match (which AC6 requires), an
unmigrated stored `currentLesson` number makes `validateLearnerState` reject the
**whole** persisted state — total learner progress loss, which is the exact
failure class CONTEXT.md opens with. If Validation is left loose, the app keeps a
stale number that no longer identifies a lesson. *Recommendation:* extend AC3 to
name all three persisted fields, and add a test case for a pre-migration fixture
carrying `currentLesson` and cards with `lessonNumber`.

**Q12 — 1.1 AC4 is a partial join-key proof. Severity: High.**
AC4 is billed as *the* join-key proof and asserts `getMasteredCharacters()`
parity. `VocabularyLessonService.getUnlockedWords()` filters on
`isWordMastered(entry, chars, rules)` — and `rules` comes from
`getMasteredToneRules()`, which reads `lesson` off `toneRules` (10 records) and
`toneMarkRules` (9 records). `lesson:` fields exist on nine collections in
`symbols.ts`, not two. A migration that moves consonants, vowels and tone marks
but leaves `toneRules[].lesson` behind passes AC4 while silently changing every
learner's unlocked vocabulary.

**Correction after systems-architect's pass** (verified): AC4 is not merely
partial, it is uncallable as written. `getMasteredCharacters()` is `private`
(`VocabularyLessonService.ts:41`), and the exported class in that file is
`VocabularyService`, not `VocabularyLessonService` — the filename and the class
name differ, and CONTEXT.md carries the same slip. So the criterion names a
private method on a class that does not exist under that name.

*Recommendation:* restate AC4 through `getUnlockedWords()` (`:117`), which is
public, is the gate that actually matters, and subsumes both the character set
and the tone-rule set — closing the private-method problem and the partial-proof
problem in one edit. Add a test case asserting the count of migrated `lesson`
fields per collection, so a collection missed entirely is visible. Add a test case
asserting the count of migrated `lesson` fields per collection, so a collection
missed entirely is visible.

**Q13 — AC6 requires a signature change at an uncovered call site. Severity:
Medium.** `validateLearnerState(data: unknown): boolean` cannot express AC6's
"the reason is reported". Changing it to a result type changes its only two call
sites, both in `src/infrastructure/persistence/Storage.ts` — which is not in
1.1's `covers`, despite AC3 placing the migration "at the repository boundary"
and `Storage.ts` being that boundary. `Storage.ts` also already contains `migrateState()` (line 40, called once at
line 161 behind a cache whose doc comment exists specifically so migration does
not re-run on every read) — i.e. the repository already implements the exact
"migrate once at the load boundary" pattern AC3 describes, in the file the task
does not cover. *Recommendation:* add `Storage.ts` and `Storage.test.ts` to
1.1's `covers` and point AC3 at `migrateState()` as the extension point; state
in AC6 that the reason propagates to the caller rather than stopping at the
validator.

**Q14 — 1.2's declared-order test case presumes schema the plan never declares.
Severity: Medium.** Test case: *"A deck declaring slides out of order renders
them in declared order, not array order, if the two differ."* That is only
meaningful if a slide carries an explicit order field distinct from its array
index. Task 1.1 owns the schema and no AC of 1.1 mentions one; 1.2 AC1 says only
"in declared order", which reads as array order. As written 1.2's executor either
cannot implement the case or invents schema 1.1 owns. *Recommendation:* decide
in 1.1 — either array order is declared order (and 1.2 drops the case) or the
schema carries an explicit index (and 1.1 gets an AC for it).

**Q15 — Three Playwright tests assert Lesson 1 shows a video, in a suite no gate
runs. Severity: High.** `e2e/lesson-intro.spec.ts` contains three tests that
locate a `<video>` element after clicking "Next Lesson" and assert it is visible
with `controls`; one also asserts a layout property relative to the video. Task
1.4 makes Lesson 1 a deck, breaking all three. A fourth assertion in the same
file expects `maaw maa`, which task 2.4 rewrites under the Paiboon convention
from 2.2 — a second, independent breakage.

`e2e/` is in no task's `covers`; no task's `verify` runs `npm run test:e2e`;
and `vite.config.ts` excludes `e2e/**` from vitest. So neither breakage is
visible to any gate in the plan. *Recommendation:* add `e2e/lesson-intro.spec.ts`
to 1.4's `covers` with an AC that the lesson-intro e2e suite passes against the
deck, and to 2.4's `covers` for the romanization change. At minimum, add
`npm run test:e2e -- lesson-intro` to 1.4's `verify`.

### Phase 2 — Encoding

The strongest phase conceptually. The class-derivation rule is a real reduction
and 2.1 AC2's "derived for the first two buckets, an 11-member list for the
third" is a criterion that genuinely constrains the implementation. Two
significant findings.

**Q16 — The new district cue leaks the answer on the class-recall card.
Severity: High.** `ScriptCardGenerator.ts:168` carries a deliberate suppression:

> `// No `consonantClass` here: this card's question IS "what class is this"`

mirrored by a comment on `PropertyCard.consonantClass` in `types.ts`. Task 2.3
adds a *second* class channel — the district cue — rendered by `SymbolCard` and
`DistrictBadge`, and task 2.1 AC4 requires every consonant mnemonic to name its
district. None of 2.3's five ACs or six test cases mentions the class-property
card. The default outcome is that the card testing "what class is this letter"
displays the letter's district, and the SRS silently stops measuring class
recall — the single fact the whole phase exists to teach.

*Recommendation:* add an AC to 2.3: on the class-property retrieval card, no
class cue renders — not colour, not district, not the mnemonic's district
field — with a test case asserting it for each of the three classes. This is the
highest-value single criterion I would add to the plan.

**Q17 — Tasks 2.1 and 4.1 need write access to `symbols.ts` that their `covers`
does not grant. Severity: Medium.**

**Correction — my original premise was wrong.** I filed this as "2.1 cannot
*read* the collection", on the grounds that `consonants` and `vowels` are
declared `const` at `symbols.ts:586` and `:1331` with no `export const`.
accelerated-learning-expert checked what I did not: they are exported at
`symbols.ts:3027` via a trailing export list (`export { consonants, vowels,
toneMarks, alphabet };`), and four files already import `consonants`, including
three test files. Reading was never blocked. I inferred absence of an export
from the absence of one export *form* — the same grep-and-report error
systems-architect flagged in themselves earlier in this review, in a different
guise.

**What survives is a write problem, and for 2.1 it is sharper than the read
problem I imagined.** 2.1 AC1 requires the derived classification to agree with
every consonant's declared class "for all 44, with no exception list", and AC2
requires the aspirate/fricative bucket to consult a list of exactly 11. The
derivation must read aspiration from somewhere, and `isAspirated` is wrong for
at least two letters:

| Letter | `isAspirated` | `initialSound` | Actual class |
|---|---|---|---|
| ท | `true` | "th (aspirated T…)" | low |
| ธ | `true` | "th (aspirated T…)" | low |
| **ฑ** | **`false`** | "th (usually same as ท…)" | low |
| **ฒ** | **`false`** | "th (same as ฑ and ท)" | low |

ฑ and ฒ are aspirated /tʰ/ recorded as unaspirated, so a sound-type derivation
reading that field buckets them as unaspirated stops and resolves them **mid**
when they are low. AC1 therefore fails on correct data — which is the criterion
working — but the executor's cheapest routes out are to add the exception list
AC1 forbids, or to bend the derivation. Fixing the data is the right route and
requires writing `symbols.ts`, which 2.1's `covers` does not permit. The field
is also learner-visible: `SymbolCard.tsx:72` renders an "Aspirated: Yes" row
only when true, so ฑ and ฒ show no aspiration row today.

4.1's case is the same shape and independently real: it must write or reconcile
`priority` on all 44 consonants (Q33), and `symbols.ts` is absent from its
`covers` too.

*Recommendation:* add `symbols.ts` to the `covers` of 2.1 and 4.1, and give 2.1
an AC that `isAspirated` is correct for every consonant — since the whole
phase-2 class derivation rests on that field and two entries are currently
wrong. **I withdraw the sweep I recommended.** accelerated-learning-expert is
right that one task which turns out not to be read-blocked plus one
write-blocked task is not a pattern; two write-needs in two phases is worth two
spot fixes, not a programme, unless a third instance appears.

*Credit: correction and the ฑ/ฒ instance from accelerated-learning-expert; the
class consequence and the `SymbolCard` visibility verified here.*


**Q18 — The mnemonic rewrite's scope is 73 of 82. Severity: Medium.**
`symbols.ts` contains 82 `mnemonic:` fields. Task 2.4 AC1 asserts counts for
consonants (44) and vowels (29) only. The exact breakdown, verified by section
boundary after accelerated-learning-expert's pass: 44 consonants + 29 vowels +
**4 tone marks** (`const toneMarks`, line 1711) + **5 `words`** entries = 82. So
nine licensed paraphrases survive the rewrite untouched, and because AC1 asserts
exactly 73 they survive *with the count assertion passing*. CONTEXT.md says all 82 "read as close paraphrases" of the
licensed transcripts and are to be rewritten. AC4's scope — "any mnemonic" — is
ambiguous about whether it covers the nine outside AC1's count. *Recommendation:*
state the total explicitly in AC1 (73 rewritten under scene grammar, 9
elsewhere handled how) and make AC4's population explicit.

**Q19 — The originality gate is measurably near-vacuous at n=8. Severity:
High** (raised from Medium on evidence). An 8-gram window rarely triggers on the
short, structured cue fields 2.4 produces (a shape cue and a sound cue per
symbol).

**This is now measured, not argued.** experienced-thai-teacher observed that
CONTEXT.md's own claim — the 82 existing mnemonics "read as close paraphrases"
of the transcripts — makes them a ready-made calibration set with known ground
truth. I reproduced their measurement independently (`pdftotext -enc UTF-8` over
all 51 PDFs, 249KB, 38,456 Latin tokens; all 82 `mnemonic:` strings extracted
from `symbols.ts`), and added a false-positive probe of five hand-written
strings that state the same *facts* in independent words — the thing the gate
must not flag:

| Configuration | Catches (of 82 known paraphrases) | Flags control (of 5) |
|---|---:|---:|
| raw 8-gram — **the plan's choice** | 15 (18%) | 0 |
| raw 6-gram | 36 (44%) | 1 |
| raw 5-gram | 48 (59%) | 2 |
| raw 4-gram | 64 (78%) | 3 |
| raw 3-gram | 79 (96%) | 5 |
| content-word 3-gram | 71 (87%) | 3 |
| **content-word 4-gram — recommended** | **43 (52%)** | **0** |
| content-word 5-gram | 24 (29%) | 0 |

At the plan's n=8 the gate passes **five out of six** items of exactly the
material it exists to exclude. Content-word 4-grams nearly triple the catch rate
at the same zero false-positive rate on this probe, so the plan's operating
point is dominated rather than merely conservative.

Worked instance (experienced-thai-teacher's, verified at `symbols.ts:1322`): the
ฌ mnemonic reads *"mostly from Cambodian, Balinese, and Sanskrit origins.
Examples: ฌาน (meditative absorption), เพชฌฆาต (executioner)"*; Lesson 22's PDF
reads *"most are words originally from the Cambodian, Balinese, and Sanskrit
languages. Examples are ฌาน ... 'meditative absorption') ... เพชฌฆาต ...
'executioner'"*. Unmistakably derived, and no 8-gram match.

**The raw-vs-content question, settled by inspection rather than by counting.**
experienced-thai-teacher ran a cell I had skipped — raw 4-grams — and got 64/82
recall at 0/5 false positives on *their* probe, proposing it as the best
operating point. On my probe raw n=4 gives the same 64/82 recall but **3/5 false
positives**, and raw n=5 gives 2/5 against their 0/5. A systematic disagreement
on the same thresholds means neither FP count is worth quoting, as they rightly
said. But the question is still decidable: instead of counting flags, print
*what matched*. Every raw-n-gram false positive is a function-word span:

| Matched span | Function words |
|---|---:|
| `a loop on the` | 75% |
| `on the left and` | 75% |
| `the consonant and is` | 75% |
| `is written above the` | 50% |
| `the four tone marks` | 25% |

None of these is evidence of copying. They are evidence that English has a small
closed vocabulary of connectives, and that any two texts describing Thai script
will share them. So raw n=4's recall advantage over content n=4 (64 vs 43) is
**bought by matching scaffolding**, which is the false-positive mechanism itself
— and their 0/5 is an artifact of five sentences that happened to avoid those
connectives, not a property of the threshold.

This vindicates experienced-thai-teacher's original instinct while confirming my
objection to their stated reason. Their proposal was "strip stop words — it
should raise recall and kill the false positives like *the head on top of the
letter*". The first half is wrong (stripping lowers recall at every n, sharply).
The second half is right, and the example they chose is exactly the pattern the
table above demonstrates. Content-word filtering earns its place by removing
meaningless matches, not by finding more of them.

**Content n=4 has a structural blind spot, and it misses the one case both
reviewers independently confirmed as copied.** experienced-thai-teacher then
applied the inspection method to the *recall* side and found that content
filtering cannot catch the ฌ mnemonic at any setting. The giveaway span is
"Cambodian, Balinese, and Sanskrit" — four raw tokens but only **three** content
words, so it cannot form a content 4-gram by construction. The same holds for
"meditative absorption" and for transliterated example-word lists generally.
Content filtering discards short distinctive spans, and those are exactly where
copying is most legible and most legally salient: proper nouns, technical terms,
transliterations. Verified:

| | catches ฌ (`symbols.ts:1322`) |
|---|---|
| raw n=4 | yes |
| raw n=4, ≤1 function word | yes |
| content n=4 | **no** |

So the two checks fail on *different* material and are complementary rather than
competing — their proposal to run both and flag on either is right in principle.
Measuring it, and then adding one refinement, gives a strictly dominant
configuration:

| Configuration | Recall | FP (of 5) | Catches ฌ |
|---|---:|---:|:--:|
| content n=4 | 43/82 | 0 | no |
| raw n=4, ≤1 function word | 44/82 | 2 | yes |
| union of the two | 53/82 | 2 | yes |
| **union, raw arm ≤1 function word *and* ≤1 domain term** | **49/82** | **0** | **yes** |

The refinement comes from inspecting the union's residual false positives, which
are not scaffolding: "written above the consonant", "the four tone marks", "a
low class consonant". Those are *domain terminology* — unavoidable in any text
about Thai script, and not evidence of copying. So matched spans fall into three
classes, not two: function-word scaffolding (excluded by the ≤1 function-word
cap), domain terminology (excluded by a ≤1 domain-term cap), and distinctive
content — "cambodian balinese and sanskrit", "a counter clockwise head", "a
little bump after" — which is what remains and what the gate is for.

**Recommended operating point: the union, with the raw arm capped on both
function words and domain terms.** It dominates content n=4 alone (+6 recall,
same zero FP, and it catches ฌ) and dominates the plain union (−4 recall for 2
fewer false positives). Q1's shared module exposes one `isDerivative(text)` that
ORs the two arms; Q2's calibration test then tunes four numbers rather than one,
which is the same shape of work.

*Caveat unchanged:* five controls cannot establish an FP rate. What the table
supports is the weaker and sufficient claim that the recommended configuration
is no worse than content n=4 on any axis measured here, and better on two.

*Caveat retained:* five hand-written controls is insufficient evidence for any
FP *rate* — that is why the argument above rests on the *content* of the matches
rather than their count. The recall column is the robust half: our two
independent runs agree closely everywhere (raw n=5: 48 vs 46; raw n=8: 15 vs 13;
content n=4: 43 vs 43), and it alone rejects n=8. Task 1.4's
architectural decision states this honestly — *"a floor and not a proof: it
catches copied phrasing, not a mnemonic reproduced in fresh words. That second
case is the reviewer's"* — and assigns the remainder to a reviewer. Task 2.4's
architectural decision makes no such statement, and 2.4 AC4 is the only
originality gate on the 73 records that CONTEXT.md identifies as the most
derivative material in the repository. *Recommendation:* carry 1.4's sentence
into 2.4, and pair AC4 with a reviewer criterion per Q8.

**Q20 — 2.5 covers `lessonSequence.ts` with no AC, and task 3.1 declares itself
its owner. Severity: Low.** `lessonSequence.ts` appears in the `covers` of 2.5,
3.1 and 4.3. Phase 3's README states 3.1 "owns `lessonSequence.ts`" and explains
why. Phase 2's README does not mention the file, and no AC of 2.5 references it.
The phases serialize so this is not a collision, but ownership is asserted in one
phase for a file another phase silently edits first. *Recommendation:* move the file's creation into **task 1.1**, not 2.5 — Q32
shows three phase-1 consumers already require a declared order — and have 2.5,
3.1 and 4.3 each declare itself a consumer that adds slots, with 2.5 gaining an
AC over the slots it fills.

### Phase 3 — Hard parts

The pedagogical diagnosis is the best-evidenced part of the plan and 3.3 AC3's
sequence-wide forward-reference check is exactly right. Findings are Q3 (3.2 AC4
is one of the three unautomatable criteria) and Q4 (3.1 AC5's baseline), both
plan-level.

**Q21 — 3.1's reconciliation report has nowhere to live. Severity: Medium.**
AC5 requires "every disagreement is reported with the word and both readings".
3.1's `covers` has no artifact for that report. With 5,454 corpus entries the
report is not a test-output line. *Recommendation:* name a committed report
artifact in `covers` (see Q4's recommendation, of which this is the concrete
half).

**Q22 — 3.1 AC7's slot check is asserted in one direction in the AC and both in
the test case. Severity: Low.** AC7 says "a lesson with content and no slot, or a
slot never filled, is reported" and the test case says "every declared slot is
filled by exactly one lesson". But 3.1 runs *before* 3.2 and 3.3 produce the
content that fills the slots, so at 3.1's own gate every slot is unfilled. The
criterion cannot hold at the time it is verified. *Recommendation:* split it —
3.1 asserts every phase-3 lesson has a slot; 3.2 and 3.3 each assert their own
lessons fill theirs; a slot-coverage assertion lands in 4.3, which already
carries the sequence-closure criteria.

### Phase 4 — Sequence

The tone-mark consolidation is well-argued and 4.1's "unreachable declared
rather than absent" is a good call that a lesser plan would have gotten wrong.

**Q23 — 4.3 AC4 introduces new persisted learner state with no persistence
coverage. Severity: High.** AC4 requires the numerals track to be "in exactly one
of three states for a learner ... not started, completed, and deliberately
skipped". "For a learner" means persisted. 4.3's `covers` contains no
persistence file — not `types.ts`, not `Validation.ts`, not `MergeService.ts`,
not `StorageLearnerStateRepository.ts`. A new field on `LearnerState` needs a
default for existing states, a `Validation` rule, and merge semantics across two
devices (what does "skipped" on one device union with "completed" on the other?).
None of that is specified, in the one plan whose opening hazard is exactly
unmigrated persisted learner state. *Recommendation:* add the four persistence
files to 4.3's `covers`, and add a test case for merging a skipping device with
a completing device.

**Q24 — 4.3 AC5 asserts a baseline over an undefined population. Severity:
Medium.** See Q4 (self-certifying baseline) and Q5 (the "taught rank window" is
never declared). Both defects apply to this single criterion, which the phase
README nominates as its end-to-end proof.

**Q25 — Resequencing to ~20 lessons makes an achievement permanently
unreachable. Severity: Medium.** `AchievementService.ts:28` checks
`check("all_lessons", completedLessons.length >= 25)`; line 27 checks `>= 5`.
`ProgressPage.tsx` carries the same literal twice. The plan replaces 25 lessons
with roughly 20. No AC in any phase mentions achievements, and
`AchievementService.ts` is in no task's `covers`. The most legible statement of the stakes is systems-architect's:
`AchievementBadge.tsx:24` is the *display label* for that same achievement
(`description: "Complete all 25 lessons"`), so as written phase 4 ships a badge
whose unlock condition and whose text are both wrong — a learner who finishes
every lesson in the new sequence sees a tile promising something that can never
light up. Neither file is in any task's `covers`.

*Recommendation:* add `AchievementService.ts` (+ its test), `ProgressPage.tsx`,
`LessonPath.tsx` and `AchievementBadge.tsx` to 4.3's `covers`, with an AC that
every achievement remains reachable under the final sequence and that no
user-facing copy states a lesson count. Frame the fix as *derive extent and
completion from the declared sequence*, not "update the constants": five
literals across four files exist precisely because extent has nowhere to live,
so relocating them defers the problem to the next resequence.

### Phase 5 — Vocabulary palace

The linguistic reasoning (adjectives as stative verbs, classifiers as a real
class, noun sub-districting from the start) is sound and 5.2's provenance
decision is the right one. Three findings.

**Q26 — 5.3's scope omits the 277 existing vocabulary mnemonics. Severity:
Medium.** `vocabulary.json` carries a `mnemonic` field populated on 277 of 5,454
entries — a figure the phase README itself quotes. 5.3's `covers` does not
include `vocabulary.json`. AC6 requires every word to be in one of three states
with respect to mnemonics, which implies a per-word mnemonic store; AC2 requires
every vocabulary mnemonic to be staged in its word's room; AC5 runs the
originality check over "any vocabulary mnemonic". If the 277 existing entries are
in scope, the file must be covered; if they are not, AC2/AC5/AC6 are silently
scoped to newly authored mnemonics only and the existing 277 sit unchecked in the
same field. *Recommendation:* state the scope and adjust `covers` to match.

**Q27 — 5.1 AC4's enforcement is mapped to the wrong layer. Severity: Medium.**
AC4 ("the room is a cue in production and an output in recognition") is mapped to
"a case in `src/domain/vocabulary/data/rooms.test.ts`", and the test case reads
"asking for a word's room in the recognition direction before reveal is refused".
`rooms.ts` is a taxonomy module — a class-to-room mapping. It has no notion of a
review direction or of reveal state, and no direction concept exists in the
vocabulary domain today (`types.ts` has `"recognition"` as a *card property*
enum member, not a direction). Asserting reveal-gating in a taxonomy module's
test either couples that module to review state it should not know about, or the
test asserts on a stub.

**Correction.** I originally wrote that 5.3 AC4 — mapped to `WordCard.test.tsx`
— was the right layer and should carry this criterion. That is wrong, and
accelerated-learning-expert's pass is correct: `WordCard.tsx` has **no reveal
state at all** (no `useState`, no `revealed`/`showAnswer`/`isRevealed` — zero
grep hits). It is the browse card used by `VocabularyPage` and `DictionaryPage`.
The reveal-gated component in the review flow is
`src/presentation/components/organisms/Flashcard.tsx` (`const [revealed,
setRevealed] = useState(false)`, line 30), which appears in **no task's `covers`
anywhere in the plan**. So both ACs that exist to stop the palace leaking the
answer are mapped to components that cannot leak it, and the component that can
is untouched.

The binary the two ACs assume also does not exist. `src/domain/vocabulary/types.ts`
defines six `VocabProperty` values — `thaiToEnglish`, `englishToThai`,
`audioRecognition`, `toneIdentification`, `spelling`, `spellingFromAudio` — and
`VocabCardGenerator` generates cards for all six. Two of them
(`audioRecognition`, `spellingFromAudio`) prompt with Thai audio, so the room is
an *output* there exactly as in recognition, and neither AC says so.

*Recommendation:* drop AC4 from 5.1 or restate it as a data property (rooms are
derivable from word class alone). Move the behavioural criterion to
`Flashcard.tsx`, add that file to 5.3's `covers`, and declare the exposure rule
**per `VocabProperty`** — six test cases, not two.

**Q28 — 5.2 AC4's held-out sample is not required to be held out. Severity:
Medium.** AC4 reports backfill accuracy against "a held-out sample of entries
whose class is known independently". The only entries with independently known
classes are the 2,254 that already carry a source-provided `word_class` — which
is also the only plausible basis for whatever heuristic or model does the
backfill. Nothing in the AC requires the sample to be excluded from that basis,
and nothing states a minimum sample size. A figure measured on data the method
was built from is not an accuracy figure, and the AC's own rationale ("puts a
real measurement in front of the reviewer") depends entirely on it being one.
*Recommendation:* AC4 states the sample is withheld from the backfill's inputs
and gives a minimum size. I agree with the decision not to set an accuracy
threshold — that reasoning is correct.

### Phase 6 — Strangle

Correctly ordered (confirm, then delete) and the decision to keep the `never`
default after the union narrows to one arm is right.

**Q29 — 6.1 AC3's determinism has no gate and is likely false by default.
Severity: Medium.** `ac_enforcement: none — requires ffmpeg`. Byte-identical
ffmpeg output is not the default behaviour: encoders write creation timestamps
and encoder-version metadata into container headers, so an unflagged re-encode
differs byte-for-byte from an identical input. The AC will be quietly unmet
unless the exporter explicitly normalises them. The reviewer action attached to
this task is "plays an exported file", which does not test determinism at all.
*Recommendation:* either give AC3 a reviewer action that actually tests it
(export twice, compare hashes) or state the normalisation the exporter must
apply. Separately, 6.1's test case *"Re-exporting an unchanged deck reports a
no-op"* is mapped to no AC and **is** testable from the manifest without ffmpeg
— map it to AC2 or AC5.

**Q30 — 6.2 AC3's "over the directory's contents, not a list of names" is
under-specified. Severity: Medium.** After the exporter lands, `public/videos/`
(currently 25 `.webm` files) will hold *derived* videos alongside — or instead
of — the licensed ones. AC3 says the assertion is over contents so that "a file
renamed rather than removed still fails", which implies content-based
identification (hashes of the 25 licensed files, recorded before deletion) — but
the AC does not say so, and the obvious implementation (assert the directory is
empty, or assert no filename matches `TAME_*`) is exactly the name-based check
the AC rules out. *Recommendation:* state the mechanism: record the 25 files'
hashes in the task that first touches them, and assert no file in the tree
matches one.

**Q31 — 6.2 AC4's end-to-end parity has no stated reference point. Severity:
Low.** AC4 asserts scheduled cards and unlocked vocabulary are "unchanged across
the removal". Phase 1's equivalent (1.4 AC4) names its reference explicitly ("a
learner who completed it before this plan"). By phase 6 the pre-plan state is
five phases behind, and "unchanged across the removal" most likely means across
6.2's own diff — which is a much weaker property, and a fine one, but it should
say which. *Recommendation:* one clause naming the reference state.

---

### Findings added after the panel exchange

**Q38 — Script distractors are uniform random, so the confusability work has no
consumer and Q37's assertion must be behavioural. Severity: Medium.**
`ScriptCardGenerator.ts:125`: `pickChoices` is `pool.filter(item => item !==
correct)` plus a Fisher-Yates shuffle. Script multiple-choice distractors are
drawn uniformly at random from the whole pool, so a recognition card for ม is as
likely to offer ฬ or ฮ as น. The vocabulary generator is confusability-weighted
(Q37) and the script generator is not.

Two consequences for test design. First, it changes the assertion Q37 should
buy: `contrastFeature` as a schema field checks that the *data* is coherent, but
the property worth asserting is behavioural — "a recognition card for ม offers น
among its choices" — because a coherent map that nothing reads is Q33's failure
again. Second, no task owns the change: `ScriptCardGenerator.ts` is in the
`covers` of none of 2.4, 3.3 or 4.1, which are the three tasks whose criteria
depend on confusable pairs being distinguishable.

*Recommendation:* whichever task owns the confusability schema also gains
`ScriptCardGenerator.ts` in `covers`, with **two** distractor assertions rather
than one — the pools must stay separate by card type. A glyph-recognition card
for ม should offer น (visual); a class-or-tone card for ข should offer ค
(phonetic cousin). Feeding one pool to both card types supplies distractors
confusable in a sense the card is not testing, which would satisfy a naive
"does it use the map" assertion while degrading the drill. Without it the plan encodes a
relation, tests the encoding, and changes nothing a learner meets.

*Credit: systems-architect and accelerated-learning-expert; `pickChoices`
verified here.*

**Q37 — Three different confusability relations, two of them prose-only, with
no shared representation and no consistency check. Severity: Medium.** The
repository already encodes confusability and exercises it:
`VocabCardGenerator.ts` builds `initialSoundConfusableMap` (:59) and
`finalSoundConfusableMap` (:63) via `buildConsonantConfusableMap` (:38) plus
`buildVowelConfusableMap` (:85), and feeds them into multiple-choice distractor
selection (:141-162). That is **phonetic** confusability, derived from existing
symbol fields.

The plan then introduces two more relations, both in prose only:

| Relation | Where | Members |
|---|---|---|
| phonetic (exists) | `VocabCardGenerator.ts`, derived | shared initial/final sound |
| **visual** | 2.4 AC5 body | ม/น, ช/ซ, พ/ฟ, ค/ด, บ/ป, ด/ต, ผ/พ, ฝ/ฟ, ถ/ก/ภ, ฎ/ฏ |
| **high/low cousin** | 3.3 body | ข↔ค, ฉ↔ช, ถ↔ท, ผ↔พ, ฝ↔ฟ, ส↔ซ |

These are genuinely different relations — ม and น look alike and sound nothing
alike, which is precisely why the existing phonetic map does not cover 2.4 AC5 —
but they overlap (ผ/พ and ฝ/ฟ are in both lists) and neither is data. Each will
be transcribed into its own test fixture, so the same relation is stated twice
in prose and twice again in test code, with nothing asserting the four agree.

This also gives pareto-analyst's P5 a better repair than either of us proposed.
Their objection is that "confusable pairs carry contrasting cues" can only be
mechanised as *string inequality*, which two cues can satisfy while both missing
the real distinguishing feature. Rather than a fixture transcribing the ten
groups, put `confusableWith` and `contrastFeature` in the 2.1 schema and assert
that both members of a group name the same `contrastFeature` with **opposing
values** — a data-driven check that cannot be satisfied by two arbitrary
unequal strings. A second assertion checks the visual map reaches the distractor
generator, which is free given the machinery already exists.

**The two relations need different test strategies, because one is derivable and
one is not.** systems-architect and accelerated-learning-expert worked out why
the lists overlap so oddly, and I verified it by derivation: group all 44
consonants by normalised `initialSound` and keep the groups spanning more than
one class, and 3.3's relation falls out exactly —

| Sound | High | Low |
|---|---|---|
| kh | ข ฃ | ค ฆ ฅ |
| ch | ฉ | ช ฌ |
| th | ถ ฐ | ท ธ ฑ ฒ |
| ph | ผ | พ ภ |
| f | ฝ | ฟ |
| s | ศ ษ ส | ซ |
| **h** | **ห** | **ฮ** |

**Seven groups. 3.3's hand-maintained list has six — it omits ห/ฮ.** A fixture
transcribed from 3.3's prose, which is what its test case implies, would have
locked that omission into the test suite and made it permanent.

Two further consequences the plan should take. First, 3.3's framing undercounts
its own result: it says the high/low pairs "are six decisions rather than twelve
letters", but the derivation covers **seven** groups and **25** letters. (I
first wrote nineteen — that is the size of the *complement*, and I reported the
wrong side of the partition; accelerated-learning-expert caught it.) The plan's
pedagogical argument is materially stronger than the plan states it.

Second, and the reason this finding matters beyond a missing pair: **the 25
letters the seven groups cover are exactly phase 2's third bucket.** Not
overlapping — equal. Verified by computing the partition over all 44:

```
44 = 10 sonorants        (all Low  — derived, no table)
   +  9 unaspirated stops + อ (all Mid  — derived, no table)
   + 25 aspirates/fricatives in 7 sound groups, one high/low decision each
```

Every sonorant resolves Low and every unaspirated stop resolves Mid on the real
data, which independently validates 2.1 AC2's derivability claim. So phase 2's
class rule and phase 3's cousin pairs are **one structure described twice in two
phases**, with no line drawn between them — three facts and seven binary
questions, rather than a rule in one phase and a list of pairs in another.

**This changes what the derivation test should assert.** Counting groups is
weak: a wrong grouping can still produce seven. The invariant worth asserting is
that **the union of the seven groups equals the set of consonants that are
neither sonorant nor unaspirated stop** — a property linking 2.1's
`soundType.ts` to 3.3's cousin teaching, which holds on correct data and fails
loudly if either side drifts.

Third, this is independent confirmation of Q17's ฑ/ฒ defect — ฑ and ฒ sit in the
`th` low group by `initialSound` while carrying `isAspirated: false`, exactly
the contradiction that will make 2.1 AC1 fail. Note the robustness detail: the
cousin derivation keys on `initialSound`, so it is **immune** to that defect and
places ฑ/ฒ correctly despite it. The AC should specify `initialSound` as the
source, because `isAspirated` is the other tempting field and would propagate
the bug into a second place.

The visual relation is genuinely not derivable — shape similarity follows from
no field — so it is the one that needs authored `confusableWith` and
`contrastFeature` data.

*Recommendation:* **derive** the phonetic relation and assert the derivation
produces seven groups and that the lessons teach all seven; **author** the
visual relation as 2.1 schema fields and assert contrast over it. Neither
should be a prose list transcribed into a fixture.

**Related coverage gap, worth recording even though it is pedagogy rather than
test design:** no criterion anywhere requires a confusable pair to be
*presented together*. Adjacency in the sequence without juxtaposition buys the
interference cost of similar items without the discrimination benefit. The
distractor path above is the cheapest way to get juxtaposition into review.

*Credit: accelerated-learning-expert; maps, line numbers and the two prose
lists verified independently.*

**Q35 — 3.1 AC1 states a universal the corpus refutes inside the top 1,200
words. Severity: High.** AC1: *"A word written as two consonants with no vowel
symbol resolves with the implicit short โอะ between them, **for every such word
in the corpus**."* Verified counterexamples, with their ranks:

| Word | Rank | Actual reading |
|---|---:|---|
| ขอ | 232 | second letter is the vowel สระ ออ, not a consonant |
| พอ | 297 | as above |
| รอ | 766 | as above |
| คอ | 1,184 | as above |
| กร | 1,119 | reads `kɔːn` — not the implicit-โอะ pattern |

อ is both a consonant and a vowel glyph, so "written as two consonants" is not a
decidable predicate over orthography alone. An executor taking AC1 literally
either fails the task or quietly weakens the criterion to make it pass — and the
second is the likelier outcome, because AC1 is the one that reads as
uncontroversial. *Recommendation:* restate the antecedent as "two letters both
**functioning as** consonants", which makes the rule true and forces the lesson
to teach the อ ambiguity — which a learner needs anyway, and which the source
course's treatment of อ-leading (phase 3's own subject) depends on.

*Credit: experienced-thai-teacher; ranks verified independently.*

**Q36 — 2.2 assumes a uniformly-IPA corpus that is not uniform, and its
idempotence test guards the wrong direction. Severity: High.** Task 2.2 reads as
a one-way IPA→Paiboon conversion ("The app currently carries two romanizations:
IPA in `vocabulary.json` ... and a Paiboon-like style in `symbols.ts`"). The
corpus does not match that premise. Sampling the five words from Q35 alone:
ขอ `kʰɔ̌ː`, พอ `pʰɔː` and กร `kɔːn` are IPA, while รอ `raaw` and คอ `khaaw` are
**already Paiboon** — two notations inside one file, in five consecutive
spot-checks.

Classifying the whole corpus by notation markers, I get roughly 3,300 IPA-only
against ~1,000 already-Paiboon, with the remainder ambiguous.
experienced-thai-teacher's partition (3,322 / 558 / 736 mixed-within-one-string
/ 838 neither) differs from mine because the numbers are sensitive to the marker
set chosen, and I could not reproduce their exact split. **The direction is not
sensitive to that choice**: on any classifier, four figures' worth of entries
are already converted, and a naive one-way pass corrupts them.

The failure mode is the dangerous kind — a double-converted Paiboon string still
looks like Paiboon, so AC2 ("every entry has a Paiboon romanization") passes on
corrupted data. The task's idempotence test case ("running the converter twice
is idempotent") tests the converter against *its own output* and cannot see
this; the risk is pre-existing input, not repeated application.

*Recommendation:* two test cases 2.2 currently lacks — an already-Paiboon entry
passes through byte-identical, and a mixed-notation entry converts only its IPA
fragments. Add an AC that the converter classifies each entry's notation before
converting, and reports the per-notation counts so the corpus's actual
composition is visible rather than assumed.

Relatedly, **2.2 AC3's population is not decidable as written**: it quantifies
over "every entry carrying tone information", but Paiboon writes mid tone with
no diacritic, so an unmarked string is indistinguishable from an unconverted
one. A large fraction of entries carry no combining diacritic at all (2,653 by
my count, 839 by theirs — again marker-dependent). AC3 needs "unmarked = mid"
declared in the normative conversion table before the set it quantifies over
exists.

*Credit: experienced-thai-teacher; spot-checks and composition verified
independently, with the discrepancy noted above.*

**Q32 — 1.1 AC7 covers one of two integer walks, and a fourth hardcoded `25`
sits in the uncovered one. Severity: High.** AC7 requires `startLesson` to
enforce prerequisites "from the declared lesson order, not from integer
arithmetic over the id", and names only `startLesson`. `ScriptLessonService`
holds two such walks: `startLesson` (line 132, `for (let i = 1; i <
lessonNumber; i++)`) and **`getNextLesson`** (line 182, `for (let i = 1; i <=
TOTAL_LESSONS; i++)`), with `isNextLessonAvailable` (line 291) delegating to the
second. `const TOTAL_LESSONS = 25` is declared at line 21 of the same file (Q25).

**Corrected inventory.** I first called `TOTAL_LESSONS` "a fourth hardcoded 25",
having miscounted `ProgressPage.tsx:38-39` as two sites when it is one ternary.
systems-architect corrected that to three; grepping every non-test `25` literal
in `src` shows it is **five sites across four files**, of which four are logic:

| Site | Form |
|---|---|
| `ScriptLessonService.ts:21` | `const TOTAL_LESSONS = 25` |
| `AchievementService.ts:28` | `completedLessons.length >= 25` |
| `ProgressPage.tsx:38` | `completedLessons.length < 25 ? length + 1 : null` |
| `ProgressPage.tsx:240` | `totalLessons={25}` — a *second, separate* literal in that file |
| `AchievementBadge.tsx:24` | `description: "Complete all 25 lessons"` — user-facing copy |

The last two are in no task's `covers` and were missed by both of our first
passes. `AchievementBadge.tsx:24` is the display label for the very achievement
Q25 shows becomes unreachable, so the plan would ship a badge whose text and
whose unlock condition are both wrong.

**And a third integer walk, in the layer neither of us was looking at.**
`ProgressPage.tsx:240` feeds `LessonPath.tsx:19`:

```ts
const lessons = Array.from({ length: totalLessons }, (_, i) => i + 1);
```

That is the same `1..n` assumption as `startLesson` and `getNextLesson` —
*generating lesson identities from integer arithmetic* — but in presentation,
on the primary navigation surface for the whole script course. Combined with the
component's `completedLessons: Set<number>` prop and `onLessonClick: (n: number)
=> void` (Q6), the lesson path renders 25 integer-labelled nodes and hands an
integer to the lesson route. Under stable string ids it cannot enumerate the
sequence at all.

So the walk inventory is three sites, not two: `startLesson:132`,
`getNextLesson:182`, `LessonPath.tsx:19`.

**This relocates `lessonSequence.ts`, which is the finding's real consequence.**
The plan creates that file in task 3.1, where phase 3's README declares 3.1
owns it (with 2.5 and 4.3 also covering it — see Q20). But three independent
phase-1 consumers need a declared order before phase 3 exists: the migration
itself (a lesson id has no successor without one), `getNextLesson`, and now
`LessonPath`, which under string ids cannot enumerate the sequence at all and
must read the declared order rather than counting to a total. Task 1.1 AC7
already half-admits this — "prerequisites from the declared lesson order, not
from integer arithmetic" — while the artifact holding that order is created two
phases later. *Recommendation:* `lessonSequence.ts` moves into task 1.1 as part
of the identity seam; 3.1, 2.5 and 4.3 become consumers that add slots rather
than three tasks that each partly own its creation. systems-architect reached
the same conclusion from the architecture side.

`getNextLesson` is the more load-bearing of the two: it decides what the
Dashboard's "Next Lesson" button does, which is the entry point the Playwright
suite clicks (Q15). After phase 4's ~20-lesson resequence it walks a range that
no longer matches the sequence. *Recommendation:* AC7 names all three enumeration sites and `TOTAL_LESSONS`,
with a test case asserting `getNextLesson` returns the declared successor for a
sparse and a reordered sequence — the two shapes stable ids make possible and
integer arithmetic cannot express. I endorse systems-architect's framing of the
fix over my own first one: *derive count and ordering from `lessonSequence.ts`*,
not "update the constants". Three unrelated behaviours — achievement
eligibility, the progress display, and which lesson the app offers next — are
keyed off the same number in three layers because today it has nowhere else to
live, and relocating the literals just defers the problem to the next
resequence. `ScriptLessonService.ts` is already in 1.1's `covers`, so
`TOTAL_LESSONS` can retire there; `AchievementService.ts`, `ProgressPage.tsx`,
`LessonPath.tsx` and `AchievementBadge.tsx` need adding to 4.3's.

*Credit: walk inventory raised by systems-architect (as three walks; two in
`ScriptLessonService`, the third is `LessonPath.tsx:19` in presentation, and
`isNextLessonAvailable:291` delegates rather than walking). `TOTAL_LESSONS`,
`ProgressPage.tsx:240`, `AchievementBadge.tsx:24` and the `LessonPath` walk are
mine.*

**Q33 — Task 4.1 introduces a priority model that duplicates an existing dead
field, and 4.3 AC3 is satisfiable with no consumer. Severity: Medium.**
`priority?: number` already exists on every consonant and vowel record in
`symbols.ts` (ม carries `priority: 1`). Grepping all of `src/domain` and
`src/application` excluding `symbols.ts` returns **zero readers** — it is
populated and unused. Task 4.1 AC4 introduces a new `symbolPriority.ts` with no
AC reconciling it against the existing field. That is precisely the
duplicate-mapping failure `consonantClassColor.ts`'s own comment records, and
which phase 2's README correctly warns against for class colour — applied to a
different field, in a phase that does not repeat the warning.

Worse for my lens: task 4.3 AC3 ("demoted letters remain in the SRS set ... only
their priority differs") and its test case ("a demoted letter is reachable
through review and does not gate progression") are satisfiable while *nothing
consumes priority at all*, because nothing does today. The demotion capability
is specified as data with no reader, and its criterion asserts a scheduling
behaviour no scheduler implements. *Recommendation:* 4.1 gets an AC reconciling
the two fields (extend the existing one or delete it — not a second map), and
4.3 AC3 names the selector or scheduler that reads priority, with a test case
asserting a demoted letter is scheduled after a promoted one.

*Credit: accelerated-learning-expert.*

**Q34 — Task 5.3 declares no minimum mnemonic coverage, so it can pass having
authored none. Severity: High.** AC6 makes "has none yet" a legitimate terminal
state for any word, with no minimum count, percentage or rank-window floor
anywhere in the task's ACs or test cases. 277 of 5,454 entries carry a mnemonic
today, so 5.3 is satisfiable by staging those 277 in their rooms and declaring
the other 5,177 "none yet" — every AC green, the phase's stated goal (Pom and
Chan recurring often enough to teach the gendered split by exposure) essentially
unmet.

This is the plan's one content-authoring task sized `large` with an authoring
target of "some". Every other one fixes an exact, asserted target: 2.4 authors
73 and asserts the count; 1.4, 2.5, 3.2, 3.3, 4.2 and 4.3 each declare an exact
symbol or lesson set, asserted in both directions. The three-state pattern is
right for a permanently partial corpus and it is not a substitute for a floor.
*Recommendation:* state a floor scoped the way example words are scoped
elsewhere — every word inside the taught rank window (which must first be
declared; see Q5) — and assert it. Disposition together with Q26, which finds a
different under-specification in the same task's scope.

*Credit: raised independently by plan-structure-expert (#4) and pareto-analyst
(P3); endorsed and given an id here so it can be dispositioned in my lens too.*

---

## Cross-references and one resolved disagreement

Written after exchanging findings with pareto-analyst, plan-structure-expert,
systems-architect and accelerated-learning-expert. Their findings that land in
my lens are carried above as Q32–Q34, with three corrections to my own findings
(Q12, Q18, Q27) marked in place.

**Convergent.** Their P4 and my Q9 are the same finding about 1.3 AC3, reached
independently: the missing-key exit path is trivially testable and should not be
`ac_enforcement: none`.

**Their P1 supersedes my Q10, and I withdraw mine in its favour.** I proposed
asserting the *committed manifest's* shape (every Thai segment carries a
verification outcome; no shipped asset is in the `failed` state). Their proposal
— mock the transcription client and test the retry-then-accept and
retry-exhausted-then-fail *transitions* — is strictly better: it covers the
state machine rather than one snapshot of its output, and it correctly scopes
the human's job to "does this clip sound right", which is the only part that
needs the network. Do both if cheap; do theirs if only one.

**Their P3 and P5 are findings in my lens that I missed, and I endorse both.**
P3 (task 5.3 declares no minimum mnemonic coverage, so it can pass having
authored zero) is the clearest unbounded-criterion in the plan. P5 (2.4 AC5's
"cues contrast" can only be mechanised as string inequality, which two cues can
satisfy while both missing the actual distinguishing feature) is exactly the
"structural criterion satisfiable vacuously" shape I was asked to hunt for, and
their fix — a `distinguishingFeature` per pair, asserted against — is right.
My Q26 (5.3's scope omits the 277 existing `vocabulary.json` mnemonics) is a
different aspect of the same under-specified task and should be dispositioned
alongside their P3.

**Disagreement — their P2 / O2 — now resolved; recorded because it changes
the disposition order for three findings.** They propose changing 5.2 AC4 from "accuracy
is recorded" to "accuracy is recorded and regression-gated against a baseline,
reusing the exact mechanism task 3.1 AC5 and 4.3 AC5 already use". I would not
do that yet, for two reasons.

First, my Q4 finds that mechanism is not sound as specified: a baseline written
from the implementer's own first run, into a test-file literal, with no named
artifact and no review step, cannot fail at authoring time for any value. It
detects later drift and nothing else. Propagating it to a third site propagates
the defect; it should be fixed at 3.1 and 4.3 first.

Second, and more specifically: my Q28 finds that 5.2 AC4's held-out sample is
not required to be held out. The only entries with independently known classes
are the 2,254 carrying a source-provided `word_class`, which is also the only
plausible basis for the backfill itself. Gating on a number that may have been
measured on the method's own inputs converts an unvalidated measurement into a
load-bearing one. Fix the sample's independence and state a minimum size
(Q28), fix the baseline mechanism (Q4), and *then* gating 5.2 on it is the right
move — in that order. Their reading of the blast radius (59% of the corpus,
feeding a pre-reveal production cue) is correct and is why the ordering matters
rather than why it should be skipped.

**Resolution.** pareto-analyst agreed and has updated O2 to sequence the repair:
fix Q28 (sample independence) and Q4 (a committed, reviewed baseline artifact
rather than a test literal) first, then wire 5.2 into the corrected mechanism.
They have also added that 3.1 AC5 and 4.3 AC5 should themselves be revisited on
the same basis before being treated as the pattern anything else copies — which
is the stronger form of my Q4, and I endorse it. Direction was never in dispute;
only the ordering was.

**Consequence for dispositioning.** Q4, Q28 and pareto-analyst's O2 are one
repair in three parts and should be dispositioned together, in that order. Q4 is
the prerequisite: it is the only one of the three that touches criteria already
written into two tasks (3.1 AC5, 4.3 AC5), so accepting O2 while rejecting Q4
would propagate a gate neither reviewer now believes bites.

---

## Summary Statistics

| | |
|---|---|
| Documents reviewed | 26 (plan README, CONTEXT, 6 phase READMEs, 18 task files) |
| Acceptance criteria reviewed | 114 |
| `ac_enforcement` entries reviewed | 114, one per AC (3 declared `none`) |
| Findings raised | 38 (Q1–Q38) |
| Critical | 2 (Q1, Q2) |
| High | 15 (Q3, Q4, Q5, Q6, Q11, Q12, Q15, Q16, Q23, Q32, Q34, Q35, Q36) + Q19 and Q27 raised to High on evidence |
| Medium | 18 (Q33, Q37, Q38 added; Q19, Q27 promoted out) |
| Low | 3 |
| Blocking execution as written | 10 (Q1, Q2, Q3, Q6, Q11, Q12, Q19, Q34, Q35, Q36) |
| Plan-level findings | 8 (P1–P8) |
| Phase-level findings | 30 |
| ACs not automatable as written | 3 (2.5 AC3, 3.2 AC4, 4.2 AC3) |
| ACs referencing an artifact no task produces | 7 (the 8-gram checks) |
| ACs referencing an undeclared population | 3 (3.3 AC4, 4.2 AC4, 4.3 AC5) |
| ACs mapped to the wrong layer | 1 (5.1 AC4) |
| Unmapped test cases found | 3 (1.2 catch-up route, 6.1 no-op re-export, 3.1 AC7 slot-filling) |
| `ac_enforcement: none` judged honest | 2 of 3 (1.3 AC6, 6.1 AC3 — each with a testable remainder) |
| Existing tests broken with no gate to see it | 3 Playwright cases + 1 romanization assertion |
| Trust boundary rows reviewed | 6 (1 missing row, 1 uncontrolled sink, 1 unattributed row) |
| Repository facts verified during review | 30+ (corpus and symbol counts, consumer inventories, route and test-suite shapes, method visibility, confusable maps, every non-test `25` literal) |
| Measurements run | 1 — transcript corpus extracted from 51 PDFs and the 8-gram gate calibrated against the 82 known paraphrases (Q19) |
| Panel items verified before adoption | 16 across 4 reviewers; 1 partially disconfirmed (systems-architect's walk count), 1 disconfirmed (experienced-thai-teacher's stop-word fix) |
| My own findings corrected or withdrawn | 6 (Q12, Q18, Q27, Q32's arithmetic, Q17's premise; Q10 withdrawn) |
| Recommendations withdrawn | 1 — the Q17 "covers sweep", on accelerated-learning-expert's objection |

**Findings by phase:** plan-level 8 · phase 1: 8 (+Q32) · phase 2: 5 · phase 3: 2 ·
phase 4: 4 (+Q33) · phase 5: 4 (+Q34) · phase 6: 3.

**Corrections to my own findings after the panel exchange:** 3 (Q12 — the named
method is private and the class name differs; Q18 — exact 44/29/4/5 breakdown;
Q27 — `WordCard` has no reveal state, `Flashcard.tsx` does and is uncovered).
**Withdrawn:** 1 (Q10, in favour of pareto-analyst P1).

**Highest-value single additions**, if only three changes are made:
the corpus seam task with a canary assertion (Q1 + Q2); the class-recall
answer-leak criterion in 2.3 (Q16); and extending task 1.1's `covers` and
`verify` to the migration's real blast radius (Q6 + Q11 + Q12).
