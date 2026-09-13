---
doc_type: reference
title: "Task 2.3 — Backend selects from the bank by learner tier"
description: Replace the fixed hardcoded opening question with a real pick from the phase-2 content bank, selecting on each entry's own word list (not a tier-wide containment check a real learner's gappy vocabulary can't satisfy), with a resolved empty-vocabulary fallback and a real e2e seeding mechanism.
covers:
  - backend/app/pipeline.py
  - backend/app/bank.py
  - backend/app/main.py
  - backend/tests/test_pipeline.py
  - backend/tests/test_bank.py
  - e2e/conversation-practice.spec.ts
  - e2e/fixtures/seedLearner.ts
status: draft
task_id: "2.3"
task_status: complete
depends_on: ["1.2", "1.4", "2.1", "2.2"]
size: large
verify:
  - uv run --project backend pytest backend/tests -v -m "not gpu"
  - npm run test:e2e -- --project=conversation-practice
ac_enforcement:
  - "AC1 -> a non-GPU test in test_bank.py: given a known-word set that is NOT a clean rank-ordered prefix (a realistic gappy set - missing a handful of words scattered across low ranks, the shape VocabularyLessonService.getUnlockedWords() actually produces, not an idealized contiguous slice), select_entry still returns an entry whose own words are all within that set, drawn from the highest-tier entry that qualifies - proven against the REAL conversationStarters.json task 2.2 produced"
  - "AC2 -> a non-GPU test: among all entries whose words are fully covered by a given known-word set, select_entry prefers one from the highest tier - a tie-break for difficulty, not a gate; a known-word set covering entries from tiers 1-3 never returns a tier-1 entry when a tier-3 entry also qualifies"
  - "AC3 -> a non-GPU test: an empty known-word set returns an entry from the smallest tier (the resolved decision - see Architectural Decision), never a 500, null, or a new frontend state - the smallest-tier entries were generated from a handful of the most basic words, so this is a legitimate, if minimal, exchange, not an error state"
  - "AC4 -> extends e2e/conversation-practice.spec.ts, using a new e2e/fixtures/seedLearner.ts helper (page.addInitScript writing the real localStorage SRS shapes StorageCardRepository/StorageLearnerStateRepository read - proven once, on its own, by a case asserting a seeded above-threshold state renders the unlocked Dashboard tile before any conversation-specific assertion runs): two runs with two different known-word fixtures (one gappy ~150-word set, one gappy ~400-word set) against the real backend and real bank produce two DIFFERENT question_text values, both drawn from entries whose words are within their respective fixture's known set"
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
weight_votes:
  - "author -> 8"
---

# Task 2.3 — Backend selects from the bank by learner tier

## Description

`backend/app/bank.py`: load `backend/data/conversationStarters.json`
(task 2.2, including its per-entry `words: string[]`) once at startup
(same `lifespan`/`app.state` pattern task 1.2 established for the three
models). One function,
`select_entry(known_words: set[str]) -> BankEntry`:

**Select on each entry's own words, not tier-wide containment.** A
review of this plan's first draft found the original design — "find
the largest *tier* whose every word is in `known_words`" — assumes a
learner's known words are a clean rank-ordered prefix of
`vocabulary.json`. They are not:
`VocabularyLessonService.getUnlockedWords()` additionally gates each
word on character/tone-rule mastery, so a real learner's known set is
rank-ordered but **gappy**. Under the original rule, a learner missing
even one word from a tier's list would fail that tier's containment
check entirely and fall through — often all the way to the
empty-vocabulary branch — regardless of how many words they actually
know. The fix: filter the **whole bank** to entries whose own
`words` are a subset of `known_words` (exactly `sentences.json`'s own
`getUnlockedSentences` pattern), then prefer the highest-`tier` entry
among the matches (AC2) — deterministic (a hash of the known-word set
mod the matching set's size, not `random.choice`, so a page reload
before phase 3's session concept asks the same question rather than a
different one every time). `tier` becomes a **difficulty tie-break**,
not a gate.

**The empty-vocabulary case is resolved, not deferred**: return an
entry from the smallest tier (AC3). A brand-new learner gets the
simplest available exchange rather than a new "not enough vocabulary
yet" frontend state that no task would otherwise build — and once
phase 3's `MIN_VOCAB_COUNT = 200` gate ships, nobody who can reach
`/conversation` has an empty known-word set anyway, so this branch is
real only during phases 1-2's pre-gate window.

`backend/app/pipeline.py`'s `synthesize_opening` (task 1.2) changes
signature to accept `known_words: list[str]` and call `select_entry`
instead of returning the fixed `"สบายดีไหม"` string.
`backend/app/main.py`'s `/conversation/opening` handler (now a `POST`,
task 2.1) reads `known_words` from the request body and passes it
through.

**The e2e seeding mechanism this and every later gated/personalized
test needs** (AC4): no existing e2e spec seeds any learner state — both
today just `page.goto` against whatever the browser profile happens to
hold. Add `e2e/fixtures/seedLearner.ts`, a `page.addInitScript` writing
the exact `localStorage` shapes `StorageCardRepository`/
`StorageLearnerStateRepository` read, parameterized by a target learned
word count. Prove the helper itself works (a seeded state actually
produces the learner state it claims to, via an observable — the
Dashboard tile, once task 3.2 exists) before this task's own AC4
depends on it silently working.

## Acceptance Criteria

- AC1: A realistic, gappy known-word set (not an idealized prefix)
  still selects a matching entry, against the real generated bank.
- AC2: Among qualifying entries, the highest tier is preferred — a
  difficulty tie-break, not a gate.
- AC3: An empty known-word set resolves to a smallest-tier entry, the
  stated decision, never a crash or an unbuilt frontend state.
- AC4: Two different (realistically gappy) known-vocabulary snapshots
  produce two different opening questions, end to end, through a
  seeding mechanism proven to work on its own first.

## Architectural Decision

**Entry-level containment, not tier-level.** See Description — this is
the fix for a defect three independent reviewers converged on
(product, architecture, and QA lenses all found the same gap from
different angles): the original tier-as-gate design assumes an
acquisition order the app's own vocabulary-unlock logic does not
produce.

**Empty-vocabulary resolves to the smallest tier, decided now rather
than left open.** A first draft of this task left this as an unfilled
placeholder for whoever implemented it, with phase 3's gating work
waiting on that implementer's eventual choice. Five independent review
passes converged on the same answer: the smallest-tier fallback costs
nothing, needs no new frontend state, and composes correctly with phase
3's gate making the branch practically unreachable for a real user once
it ships. Deciding it here, rather than in a bracket an executor would
have had to both resolve and retroactively propagate to sibling task
documents, is the whole of the fix.

**Deterministic selection (hash-based), not random, for a single
opening-question request.** A learner reloading `/conversation` before
phase 3's session concept exists should see a stable question, not a
different one every refresh. Real variety across a session is
explicitly phase 3's job.

**A shared `e2e/fixtures/seedLearner.ts` helper, proven on its own
before this task's AC4 depends on it.** Getting the seeded `localStorage`
DTO shape subtly wrong would otherwise produce a silently-empty learner
rather than a test failure — this task is the first consumer, and phase
3's gating/session e2e cases (tasks 3.2, 3.3) reuse the same helper
rather than each inventing their own.

## Test Cases

- Realistic gappy known-word set (not a prefix): selects a matching
  entry, real bank.
- Multiple qualifying entries across tiers: highest tier preferred.
- Empty known-word set: smallest-tier entry, every time.
- `seedLearner.ts` alone: a seeded above-threshold state renders the
  unlocked Dashboard tile (once task 3.2 exists).
- Two gappy fixtures (~150, ~400 words), real backend and bank: two
  different questions, e2e.
