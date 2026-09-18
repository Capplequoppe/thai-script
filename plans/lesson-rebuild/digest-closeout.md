# Plan digest — close-out

Generated 2026-09-14T19:25:46.625Z from scaffold `sha256:db275592165005126602960fb50ef9c6b7d90eb1280e8f36c0782d9063307c7a`.

## Close-out

Run `run-20260914T091410Z` verified 0 of 0 acceptance criteria.

Decisions answered during this run:

- **Task 1.1a could not fix itself. The runner handed the failure back to the executor's own session for every continuation this run was allowed to spend, and the task is still not green. Continuing is no longer the runner's call — the remedy on record for this cause is that the executor's own session is shown the failure and fixes it, and it has now been tried to the bound. What is left is a larger bound, or you.

**Options:**

- **A** — raise `--max-continuations` above 2
  2 continuation(s) were spent against a bound of 2 and the gate is still red. Worth it only if the last attempt was closer than the first: every continuation is a paid invocation, and a task that cannot fix itself in a bounded number of attempts usually has a problem no further attempt will find
- **B** — take this task by hand, then reset its `task_status` to `pending`
  the ending the runner has always had — the next run re-reads the plan and picks the task up from wherever you left the tree
- **C** — narrow task 1.1a, or split the part that will not go green into its own task
  for work that turned out to be two jobs — the half that passes lands, and the half that does not stops holding everything downstream of it** — B
S
- **Task 1.5 could not fix itself. The runner handed the failure back to the executor's own session for every continuation this run was allowed to spend, and the task is still not green. Continuing is no longer the runner's call — the remedy on record for this cause is that the executor's own session is shown the failure and fixes it, and it has now been tried to the bound. What is left is a larger bound, or you.

**Options:**

- **A** — raise `--max-continuations` above 2
  2 continuation(s) were spent against a bound of 2 and the gate is still red. Worth it only if the last attempt was closer than the first: every continuation is a paid invocation, and a task that cannot fix itself in a bounded number of attempts usually has a problem no further attempt will find
- **B** — take this task by hand, then reset its `task_status` to `pending`
  the ending the runner has always had — the next run re-reads the plan and picks the task up from wherever you left the tree
- **C** — narrow task 1.5, or split the part that will not go green into its own task
  for work that turned out to be two jobs — the half that passes lands, and the half that does not stops holding everything downstream of it** — B

## What's changing and why

The plan replaces the licensed ThaiPod101 videos in the lessons with in-house mnemonic decks the app generates and owns. The goal it states: a learner opens any lesson and gets material where consonant class is encoded twice (colour, already shipped, plus a scene district), tone is encoded as vertical motion, and every symbol carries a mnemonic binding shape, sound and class into one image, with example words drawn from frequency ranks the app already holds. Supporting work includes a deck schema and a generation pipeline (lesson script to deck JSON plus committed ElevenLabs audio and illustration assets, cached by content hash), unifying romanization on Paiboon across the vocabulary corpus, rewriting all 82 symbol mnemonics, encoding syllable rules and the eight-cell tone-mark table as checkable data, staging vocabulary mnemonics in memory rooms, and finally exporting decks to video so the legacy path can be deleted. Every task in the plan is marked complete.

## Biggest risks

The scaffold flags two things directly: no trust boundaries are stated anywhere, and 22 tasks had no CODEOWNERS domain matched to them, so most of this work has no named owner. Beyond that, the plan points at its own sensitive spots rather than at mitigations: five persisted stores keyed on lesson number are converted in a single pass at the existing state-migration boundary, so a learner's saved progress rides on that one conversion; originality against the two licensed PDF sets rests on a single salted n-gram overlap check (with a canary and a size floor) that all content tasks consume; and the last phase deletes the licensed files outright after confirming every lesson serves a deck. The scaffold gives no test, rollout or rollback detail, so I can't say how any of these were verified.

## Phase by phase

Phase 1 is a tracer that takes Lesson 1 through the new stack end to end: lesson identity vocabulary, the content union and deck schema, the deck slide type, the generation pipeline, Lesson 1 itself, and the shared originality corpus. Phase 2 builds and proves the encoding system — the symbol annotation schema, Paiboon romanization, class-as-district and tone-as-motion rendering, rewritten mnemonics, and the opening band of lessons. Phase 3 takes the hard material: syllable rules as data, then lessons for unwritten vowels, consonant clusters and leading consonants, plus the middle band. Phase 4 consolidates the eight-cell tone-mark table into one lesson replacing six fragmented ones, adds a priority model so rare letters can be demoted without removal, and closes the sequence. Phase 5 stages vocabulary mnemonics in six memory rooms, backfills word class on 3,200 unclassified entries, and introduces two recurring characters. Phase 6 strangles the old path: export a deck to video, then decommission the legacy video arm.
