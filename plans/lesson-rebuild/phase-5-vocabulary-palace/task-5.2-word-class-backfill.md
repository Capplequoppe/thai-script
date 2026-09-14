---
doc_type: reference
title: "Task 5.2 — Backfill word class across the unclassified corpus"
description: Classify the 3,200 entries carrying no word_class, keeping backfilled values distinguishable from source-provided ones.
covers:
  - src/domain/vocabulary/data/vocabulary.json
  - src/domain/vocabulary/services/WordClassBackfill.ts
  - src/domain/vocabulary/services/WordClassBackfill.test.ts
  - scripts/backfill-word-class.py
  - src/domain/vocabulary/types.ts
status: stable
task_id: "5.2"
task_status: pending
depends_on: ["5.1"]
size: large
verify:
  - npx tsc --noEmit -p tsconfig.domain-check.json
  - npm test -- src/domain/vocabulary
  - python3 -m py_compile scripts/backfill-word-class.py
  - npx biome check scripts src/domain/vocabulary src/domain/vocabulary/data src/domain/vocabulary/services
ac_enforcement:
  - "AC1 -> a case in src/domain/vocabulary/services/WordClassBackfill.test.ts asserting every entry carries a word class"
  - "AC2 -> a case in src/domain/vocabulary/services/WordClassBackfill.test.ts asserting provenance is recorded per entry"
  - "AC3 -> a case in src/domain/vocabulary/services/WordClassBackfill.test.ts asserting source-provided values are never overwritten"
  - "AC4 -> a case in src/domain/vocabulary/services/WordClassBackfill.test.ts checking an input-independent held-out sample"
  - "AC5 -> a case in src/domain/vocabulary/services/WordClassBackfill.test.ts comparing against the committed baseline artifact"
  - "AC6 -> three cases in src/domain/vocabulary/services/WordClassBackfill.test.ts, one per state"
weight_votes:
  - "author -> 13"
  - "structure-estimator -> 8"
  - "implementation-estimator -> 13"
  - "unknowns-estimator -> 8"
  - "calibration-estimator -> 8"
weight_voted: "sha256:4627d46e8a4e276c744dc9f6ae0fd378d46ca2c32a9e5647221e385684a29b43"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 5.2 — Word-class backfill

3,200 of 5,454 entries carry no `word_class`, and the room partition cannot be
built until they do. The classification is a **derived guess**, and the thing
that makes it safe is that it stays labelled as one.

## Acceptance Criteria

- AC1: Every corpus entry carries a word class after backfill, or appears in
  a reported residue naming why it could not be classified. Silence is not an
  outcome.
- AC2: Every entry records the provenance of its class: source-provided, or
  backfilled. A backfilled value is never indistinguishable from corpus data.
- AC3: The backfill never overwrites a source-provided value, including when
  it disagrees. A disagreement is reported rather than resolved silently.
- AC4: Accuracy is measured against a sample held out from the backfill
  method's **own inputs**, not merely from its outputs, and recorded as a
  number in a committed artifact. The criterion is that the figure exists, is
  reproducible, and does not regress — not that it clears a threshold chosen
  before anyone has seen the method work.
- AC5: The recorded figure is a committed baseline that a later run compares
  against, in the corrected form task 3.1 establishes. A test-file literal
  written from the implementer's own first run is not a baseline: it is green by
  construction for any value.
- AC6: An entry is in exactly one of three states: class from source, class
  backfilled, or unclassifiable with a reason. The three are distinct values, and
  unclassifiable never reads as unclassified.

## Test cases

- Every entry has a class or is in the reported residue.
- Each entry's provenance is one of the two values, never absent.
- An entry with a source-provided class keeps it when the backfill disagrees,
  and the disagreement is reported.
- Accuracy against the held-out sample is computed and recorded.
- The three per-entry states are three distinct values.
- Re-running the backfill is idempotent: a second run changes nothing and
  reports no new disagreements.

## Architectural Decision

**Provenance recorded per entry rather than the backfill being trusted.** 59%
of the corpus is being filled in by derivation, and a wrong class puts a word in
the wrong memory room — which is worse than no room, because the learner builds
an image there. Keeping provenance means a later pass can revisit only the
guesses, and a reviewer can tell what was measured from what was inferred.

**AC4 reports accuracy rather than gating on it.** A threshold set at authoring
time is a number invented before anyone has seen the method work. Reporting the
figure puts a real measurement in front of the reviewer, who can then decide
whether it is good enough — which is a judgement this task cannot make in
advance.

*Rejected:* classifying only the entries inside the currently taught rank
window. Smaller and it leaves the partition incomplete, so the room scheme
would be built on a corpus that grows into unclassified territory.
