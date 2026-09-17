---
doc_type: reference
title: "Execution plan review summary — lesson rebuild"
description: Six-expert panel review of the lesson-rebuild plan, its consolidated findings, and the disposition of every finding id.
covers:
  - plans/lesson-rebuild
status: stable
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Execution Plan Review Summary: lesson-rebuild

## Review Mode

Agent Team with 6 experts, cross-messaging enabled. Experts challenged and
corrected one another; five findings were revised or withdrawn by their own
authors during the exchange.

## Review Panel

| Expert | Report | Findings |
|--------|--------|---------:|
| qa | [qa-review.md](./qa-review.md) | 38 |
| systems-architect | [systems-architect-review.md](./systems-architect-review.md) | 27 |
| experienced-thai-teacher | [experienced-thai-teacher-review.md](./experienced-thai-teacher-review.md) | 25 |
| accelerated-learning-expert | [accelerated-learning-expert-review.md](./accelerated-learning-expert-review.md) | 18 |
| pareto-analyst | [pareto-analyst-review.md](./pareto-analyst-review.md) | 13 |
| plan-structure-expert | [plan-structure-expert-review.md](./plan-structure-expert-review.md) | 10 |

`ST{n}` below refers to the plan-structure-expert's numbered findings 1–10.

## Statistics

- Total finding ids: **131**
- accepted: 108 · deferred: 19 · partly accepted: 2 · rejected: 2 · withdrawn: 1

## Verdict the panel reached

The design is sound — seams in the right places, the phases genuinely vertical,
and the linguistic model verified correct against all 44 consonant records. What
failed was the **inventory**: lesson identity was counted as three persisted
stores when it is five, `covers` under-declared across every phase, and five
features the plan specified building already ship in the repository.

Two patterns account for most of it, and both are recorded in CONTEXT.md as
standing rules: phase `covers` named directories while task `covers` named
files with nothing checking one against the other; and the plan repeatedly built
*beside* an existing feature rather than on it.

## What the revision changed

- **Task 1.1 split** into 1.1a (additive identity, sequence and deck schema) and
  1.1b (the five-store migration). 1.3 rebased onto 1.1a, which makes the
  pipeline concurrent with the migration instead of serial behind it.
- **Task 1.5 created** — the originality corpus seven criteria depended on and
  no task produced. Commits salted n-gram hashes, never text, at n=5.
- **Retrieval became a schema rule** (1.1a AC3). The first draft had zero
  retrieval attempts across 114 criteria.
- **Phase 5 redesigned.** Rooms stage mnemonics and confirm after reveal; the
  partition-pruning claim is withdrawn, since SRS is cued recall with nothing to
  search — the argument CONTEXT.md already made when rejecting palaces.
- **Task 2.1 widened** to own the whole symbol-annotation shape, so the vowel
  conditional-form rules and the confusable-pair relation become fields before
  2.4 rewrites the prose that currently holds them.
- **Three content defects fixed**: the unwritten-vowel rule (a minority pattern,
  ~6 of 60 words), อักษรนำ's missing third branch (containing สวัสดี at rank 9),
  and task 2.5's self-contradicting lesson placement.
- **Two data defects fixed**: `isAspirated` on ฑ/ฒ, and the assumption that
  `vocabulary.json` is uniformly IPA (~2,000 entries are not).

## Disposition

Every finding id from every review appears exactly once.

> `plan check` cannot parse finding ids out of three of the six reports — their
> authors used heading forms the checker does not recognise (numbered headings,
> and `P8 (Q8)` compound labels). The reports are left as their authors wrote
> them; **this table is the authoritative record** that each finding was
> reached, and it was built from the ids as each report actually states them.

| Finding | Disposition | Note |
|---------|-------------|------|
| Q1 | accepted | Task 1.5 created: corpus + one shared check. Consumed by 7 ACs, produced by none |
| Q2 | accepted | 1.5 AC4/AC5 canary + token floor; n=5 (46 of 82 vs 13 at n=8) |
| Q3 | accepted | 1.1a AC9 adds a machine-readable rules block the rule slides render from |
| Q4 | deferred | The 3.1/4.3 baseline mechanism needs its own artifact before anything else reuses it. 5.2 AC4b already points at the corrected form |
| Q5 | deferred | The declared rank window needs its own data declaration, distinct from the sliding RANK_WINDOW_SIZE. Blocks nothing in phase 1 |
| Q6 | accepted | 1.1b covers all five stores and the four presentation files |
| Q7 | accepted | Trust inventory rewritten: missing rows added, every Reaches cell names a concrete sink |
| Q8 | deferred | Scheduling the human-judgement pass is a runner concern, not a plan document change |
| Q9 | accepted | 1.3 AC3 becomes a subprocess test with no key set |
| Q10 | withdrawn | Retired by its author in favour of pareto P1 |
| Q11 | accepted | 1.1b covers all five stores and the four presentation files |
| Q12 | accepted | 1.1b AC3 asserts via public getUnlockedWords(), covering tone rules too |
| Q13 | accepted | 1.1a AC3 declares the slide/retrieval schema 1.2's cases presumed |
| Q14 | accepted | 1.1a AC3 declares the slide/retrieval schema 1.2's cases presumed |
| Q15 | accepted | e2e/lesson-intro.spec.ts enters 1.1b covers and verify |
| Q16 | accepted | 2.3 AC6: class-retrieval card renders no district cue |
| Q17 | accepted | symbols.ts added to 2.1 and 4.1 covers |
| Q18 | accepted | 2.4 scope stated as 73 of 82; the nine others are owned by 2.1's annotation shape |
| Q19 | accepted | 1.5 AC4/AC5 canary + token floor; n=5 (46 of 82 vs 13 at n=8) |
| Q20 | accepted | lessonSequence.ts moved to 1.1a with its own criteria |
| Q21 | deferred | 3.1's reconciliation report location and slot-check direction: phase 3 revision |
| Q22 | deferred | 3.1's reconciliation report location and slot-check direction: phase 3 revision |
| Q23 | deferred | 4.3's new persisted learner state needs a persistence story: phase 4 revision |
| Q24 | deferred | The 3.1/4.3 baseline mechanism needs its own artifact before anything else reuses it. 5.2 AC4b already points at the corrected form |
| Q25 | accepted | 1.1b AC6: five count literals derived, incl. the badge copy |
| Q26 | accepted | 5.3 scope includes the 277 existing vocabulary mnemonics |
| Q27 | accepted | 5.3 AC4 asserts against Flashcard, which owns reveal state |
| Q28 | accepted | 5.2 AC4/AC4b: input-independent sample + committed baseline |
| Q29 | deferred | 6.1 determinism gate: phase 6 is unreached and the exporter is unwritten |
| Q30 | accepted | 6.2 AC3 asserts over directory contents; AC4 names phase 1 as reference |
| Q31 | accepted | 6.2 AC3 asserts over directory contents; AC4 names phase 1 as reference |
| Q32 | accepted | 1.1b AC7: all three integer walks read the declared sequence |
| Q33 | accepted | 4.1 AC4 extends the existing priority field; one declaration site asserted |
| Q34 | accepted | 5.3 AC7 declares an explicit coverage floor (three-way convergence) |
| Q35 | accepted | 3.1 AC1 rewritten to the four measured reading classes; AC8 adds vowels-in-disguise |
| Q36 | accepted | 2.2 AC1 classifies all four notations; only IPA is converted |
| Q37 | accepted | 2.1 AC4/AC5 extract vowel forms + confusable features to fields before 2.4 rewrites prose |
| Q38 | deferred | Script distractors are uniform random today; juxtaposing contrasts is an app-behaviour change beyond this plan's scope |
| A1 | accepted | 1.1b covers all five stores and the four presentation files |
| A2 | accepted | 1.1b AC2 runs the conversion inside Storage.ts migrateState |
| A3 | accepted | 1.1b covers all five stores and the four presentation files |
| A4 | accepted | 6.2 covers ScriptLessonService + LearnedItemsPage; AC2b asserts no videoUrl remains |
| A5 | accepted | Task 1.5 created: corpus + one shared check. Consumed by 7 ACs, produced by none |
| A6 | accepted | 1.1a folds LessonSummary into the union; deck loading gets three states |
| A7 | accepted | 1.1b covers all five stores and the four presentation files |
| A8 | accepted | 1.1b AC6: five count literals derived, incl. the badge copy |
| A9 | accepted | 2.3 covers and extends ClassBadge instead of adding a parallel badge |
| A10 | accepted | vocabulary/types.ts added to phase 5 and task covers |
| A11 | accepted | 1.1b AC3 asserts via public getUnlockedWords(), covering tone rules too |
| A12 | accepted | 1.1b AC7: all three integer walks read the declared sequence |
| A13 | accepted | Trust inventory rewritten: licensed PDFs, the 277 existing mnemonics, the hash artifact |
| A14 | accepted | 2.2's spurious dependency on 2.1 removed |
| A15 | partly accepted | 2.5 covers now names each lesson directory; the same sweep is pending for phases 3-4 |
| A16 | accepted | 1.1a folds LessonSummary into the union; deck loading gets three states |
| A17 | accepted | lessonSequence.ts created in 1.1a, not phase 2 |
| A18 | accepted | 5.2 AC4/AC4b: input-independent sample + committed baseline |
| A19 | accepted | 4.1 AC4 extends the existing priority field; one declaration site asserted |
| A20 | accepted | 2.1 AC6: TONE_CONTOUR_POINTS is the single tone-motion source |
| A21 | accepted | 2.1 AC4/AC5 extract vowel forms + confusable features to fields before 2.4 rewrites prose |
| A22 | accepted | 2.1 AC2 fixes isAspirated on ฑ/ฒ and pins it to initialSound |
| A23 | accepted | 2.2 AC1 classifies all four notations; only IPA is converted |
| A24 | accepted | 5.3 scope includes the 277 existing vocabulary mnemonics |
| A25 | deferred | Confusable-pair list membership and weighting: 2.1 AC5 now makes it data, so the list is editable without re-planning |
| A26 | accepted | 5.2 AC2 provenance keeps backfilled values distinguishable |
| A27 | accepted | 5.3 AC4 asserts against Flashcard, which owns reveal state |
| T1 | accepted | 3.1 AC1 rewritten to the four measured reading classes; AC8 adds vowels-in-disguise |
| T2 | accepted | 3.2 AC2 adds the mid/high-leader branch (สวัสดี r9 and seven more) |
| T3 | accepted | 2.5 split: derivable buckets early, high-class residue to phase 3 |
| T4 | accepted | 2.1 AC2 fixes isAspirated on ฑ/ฒ and pins it to initialSound |
| T5 | accepted | 2.2 AC1 classifies all four notations; only IPA is converted |
| T6 | accepted | 1.5 AC4/AC5 canary + token floor; n=5 (46 of 82 vs 13 at n=8) |
| T7 | accepted | 4.1 AC3 keys the mark on the syllable's governing class |
| T8 | accepted | 4.1 AC2 reworded to 'not used in standard spelling' |
| T9 | accepted | 4.1 AC2 reworded to 'not used in standard spelling' |
| T10 | accepted | 2.5/3.3 shortlist includes ศ, which outranks two of the seven |
| T11 | accepted | CONTEXT.md corrected: the ฌ claim was false; corpus covers both PDF sets |
| T12 | accepted | Task 1.5 created: corpus + one shared check. Consumed by 7 ACs, produced by none |
| T13 | accepted | 3.1 cluster inventory closes the first member; ฤ handled as its own case |
| T14 | deferred | Tone-mark mnemonics: 2.1's schema admits them; authoring is phase 4 content |
| T15 | deferred | The declared rank window needs its own data declaration, distinct from the sliding RANK_WINDOW_SIZE. Blocks nothing in phase 1 |
| T16 | accepted | 2.1 AC7 requires nameRomanized as a field, not prose |
| T17 | accepted | 2.1 AC1 uses 'unaspirated obstruent'; 2.5 teaches it as a learner-testable contrast |
| T18 | accepted | 3.1 cluster inventory closes the first member; ฤ handled as its own case |
| T19 | accepted | 5.2 AC4 no longer quantifies over an undecidable set |
| T20 | accepted | Trust inventory rewritten: licensed PDFs, the 277 existing mnemonics, the hash artifact |
| T21 | accepted | 2.5 reframes the residue as contrasts rather than an 11-item list |
| T22 | accepted | 2.1 AC7 adds a final-sound slot to the annotation shape |
| T23 | deferred | Confusable-pair list membership and weighting: 2.1 AC5 now makes it data, so the list is editable without re-planning |
| T24 | accepted | 4.1 AC4b computes priority from any-position frequency |
| T25 | accepted | 5.2 AC2 records provenance; grammar generation reads curated values only |
| L1 | accepted | 1.1a AC3 makes retrieval-before-reveal a schema rule; 2.5 AC8 enforces per deck |
| L2 | accepted | Phase 5 redesigned: rooms stage and confirm, never a pre-reveal cue |
| L3 | accepted | Phase 5 redesigned: rooms stage and confirm, never a pre-reveal cue |
| L4 | accepted | 2.1 AC6: TONE_CONTOUR_POINTS is the single tone-motion source |
| L5 | accepted | 2.3 AC7: scaffold keys on the symbol's own stage |
| L6 | accepted | 2.5 split: derivable buckets early, high-class residue to phase 3 |
| L7 | accepted | 2.5 reframes the residue as contrasts rather than an 11-item list |
| L8 | accepted | 2.1 AC7 requires integration fields; 2.4 keeps the three-state discipline |
| L9 | accepted | 2.1 AC7 requires integration fields; 2.4 keeps the three-state discipline |
| L10 | accepted | 2.1 AC4/AC5 extract vowel forms + confusable features to fields before 2.4 rewrites prose |
| L11 | deferred | Script distractors are uniform random today; juxtaposing contrasts is an app-behaviour change beyond this plan's scope |
| L12 | deferred | No cap on new symbols per lesson: revisit with phase 4's re-slice |
| L13 | accepted | 4.1 AC4 extends the existing priority field; one declaration site asserted |
| L14 | accepted | 2.1's annotation shape owns all 82 records, closing the nine-mnemonic gap |
| L15 | deferred | teachingWords remains unbounded; the rank-window declaration (Q5) is its prerequisite |
| L16 | accepted | 2.5 teaches the acrophonic naming rule as a sound cue |
| L17 | accepted | Pom and Chan move between rooms rather than being district natives |
| L18 | accepted | 2.1 AC4/AC5 extract vowel forms + confusable features to fields before 2.4 rewrites prose |
| ST1 | deferred | 4.3's content/mechanics re-slice: phase 4 was edit-scope this pass. Re-slice before phase 4 starts |
| ST2 | rejected | 2.4 consonant/vowel axis split: pareto rated it low value (29 of 73 records) |
| ST3 | accepted | lessonSequence.ts created in 1.1a, not phase 2 |
| ST4 | accepted | 5.3 AC7 declares an explicit coverage floor (three-way convergence) |
| ST5 | accepted | Duplicate of Q1/A5: task 1.5 created |
| ST6 | accepted | Task 1.1 split into 1.1a (additive) and 1.1b (migration) |
| ST7 | accepted | 6.2 covers ScriptLessonService + LearnedItemsPage; AC2b asserts no videoUrl remains |
| ST8 | partly accepted | Phase covers restored to file level this pass; the mechanical directory-diff check is deferred to pre-execution |
| ST9 | accepted | 2.5 split: derivable buckets early, high-class residue to phase 3 |
| ST10 | accepted | 4.1 now declares depends_on 3.1 |
| P1 | accepted | 1.3 AC6 drives the retry state machine against a mocked client |
| P2 | accepted | 5.2 AC4/AC4b: input-independent sample + committed baseline |
| P3 | accepted | 5.3 AC7 declares an explicit coverage floor (three-way convergence) |
| P4 | accepted | 1.3 AC3 becomes a subprocess test with no key set |
| P5 | accepted | 2.1 AC4/AC5 extract vowel forms + confusable features to fields before 2.4 rewrites prose |
| P6 | accepted | 1.5 AC4/AC5 canary + token floor; n=5 (46 of 82 vs 13 at n=8) |
| P7 | deferred | The 3.1/4.3 baseline mechanism needs its own artifact before anything else reuses it. 5.2 AC4b already points at the corrected form |
| C1 | accepted | 5.3 AC7 declares an explicit coverage floor (three-way convergence) |
| C2 | rejected | Cutting 6.1 conflicts with a settled user decision: slides now, video export later |
| O1 | accepted | 1.3 AC6 drives the retry state machine against a mocked client |
| O2 | accepted | 5.2 AC4/AC4b: input-independent sample + committed baseline |
| O3 | accepted | 1.3 AC3 becomes a subprocess test with no key set |
| O4 | accepted | 2.1 AC4/AC5 extract vowel forms + confusable features to fields before 2.4 rewrites prose |

## Key debates

- **The class rule.** accelerated-learning-expert argued ห นำ contradicts
  "sonorants are always low"; experienced-thai-teacher extracted all 44 records
  and showed the letter-class claim holds without exception. Resolved: ห นำ
  changes a *syllable's* tone behaviour, not a *letter's* class. The table stands.
- **Backfill gating order.** pareto proposed reusing the 3.1/4.3 baseline
  pattern for 5.2; qa showed that mechanism is self-certifying. Resolved: fix
  the mechanism first — accepting the gate without it would look like evidence
  and not be.
- **Two count corrections** were made by reviewers against each other
  (`isNextLessonAvailable` delegates rather than walking; the mnemonic "final"
  count is 8 not 13), both recorded in the reports rather than quietly amended.

## Next step

`weight-execution-plan plans/lesson-rebuild` — the panel deliberately did not
vote, since this pass reshaped the tasks an estimator would size.
