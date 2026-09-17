---
doc_type: reference
title: "Task 1.5 — The originality corpus and the shared overlap check"
description: Build a salted n-gram hash corpus from both licensed PDF sets and expose one overlap check with a canary and a size floor, so every content task consumes it rather than restating it.
covers:
  - scripts/build-originality-corpus.py
  - src/domain/script/data/originality.ts
  - src/domain/script/data/originality.test.ts
  - src/domain/script/data/originality-corpus.json
status: stable
task_id: "1.5"
task_status: complete
depends_on: []
size: large
verify:
  - python3 -m py_compile scripts/build-originality-corpus.py
  - npx tsc --noEmit -p tsconfig.domain-check.json
  - npm test -- src/domain/script/data/originality.test.ts
  - npx biome check scripts src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/originality.test.ts asserting the corpus covers both PDF sets by source tag"
  - "AC2 -> a case in src/domain/script/data/originality.test.ts asserting no entry is reversible to text"
  - "AC3 -> a case in src/domain/script/data/originality.test.ts asserting the configured n is 5 at the single call site"
  - "AC4 -> a case in src/domain/script/data/originality.test.ts asserting a known licensed phrase IS detected"
  - "AC5 -> a case in src/domain/script/data/originality.test.ts asserting an undersized corpus fails loudly"
  - "AC6 -> a case in src/domain/script/data/originality.test.ts measuring detection against the 82 shipped mnemonics"
  - "AC7 -> three cases in src/domain/script/data/originality.test.ts, one per state"
weight_votes:
  - "author -> 13"
  - "structure-estimator -> 5"
  - "implementation-estimator -> 13"
  - "unknowns-estimator -> 5"
  - "calibration-estimator -> 8"
weight_voted: "sha256:68de1341a807c067930b4e9036708e5071d1e81287e048d23cdd07fc20bd7963"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 1.5 — The originality corpus

The first draft asserted an overlap check in seven criteria across five tasks
and no task produced the corpus. This task produces it, once, and exposes one
check the content tasks consume.

**The committed artifact is salted hashes, never text.** The gate exists so the
repository does not carry licensed content; an extracted-text corpus would make
the gate the largest reproduction of that content in the repo.

## Acceptance Criteria

- AC1: The corpus is built from **both** PDF sets under `src/Thai Alphabet/` —
  the recording scripts and the lesson notes. Each hash entry records which set
  it came from, and both sets are represented. The lesson notes are not
  optional: the shipped ฌ mnemonic paraphrases a lesson-notes paragraph.
- AC2: The committed artifact contains only salted hashes and counts. No entry
  is reversible to source text, and a test asserts that no field in the artifact
  matches a readable Thai or English phrase.
- AC3: The n-gram width is **5**, configured at exactly one site. Measured
  against the 82 shipped paraphrase mnemonics, n=8 detects 13 and n=5 detects
  46; the wider window was near-vacuous.
- AC4: A canary passes: a phrase known to be verbatim in the source **is**
  detected by the check. This is the guard that a planted-overlap test cannot
  give — planting proves the algorithm runs, not that the corpus is loaded.
- AC5: An empty, truncated or unreadable corpus makes the check **fail**, not
  pass. A token-count floor is asserted before any candidate is evaluated.
- AC6: The check's detection rate against the 82 shipped mnemonics is measured
  and recorded as a number. Those strings are known paraphrases, so they are the
  only ground truth available; the criterion is that the figure is produced and
  recorded, not that it clears a threshold.
- AC7: A candidate is in exactly one of three states: cleared, overlapping
  (reporting which n-gram), or not checked because the corpus failed to load.
  The third never reads as cleared.

## Test cases

- The corpus carries entries tagged from both PDF sets; neither tag is absent.
- No artifact field matches a readable phrase in either language.
- The configured n is 5, at one site.
- A known verbatim source phrase is detected.
- An empty corpus makes the check fail; a corpus below the token floor fails.
- The detection rate over the 82 shipped mnemonics is computed and recorded.
- A candidate that overlaps reports which n-gram overlapped.
- The three check states are three distinct values.

## Architectural Decision

**Hashes, not text — the decision is the repository owner's and was taken
explicitly.** The alternatives were committing the extraction (simplest, and it
puts a full-text copy of licensed material in the repo) or dropping the
automated gate (honest, and it makes the constraint aspirational). Hashing
keeps the check at full strength while committing nothing reproducible.

**One module, not seven restatements.** Every content task asserts originality;
in the first draft each restated the mechanism in its own criterion, so the n
width, the canary and the floor would have been re-decided five times. Content
tasks now depend on this task and consume the check.

**n=5 is measured, not chosen.** The first draft picked 8 because it sounded
conservative. Against the only labelled data available — the 82 mnemonics
CONTEXT.md already calls paraphrases — 8 catches 13 and 5 catches 46. A gate
that misses 84% of known positives is decoration.

*Rejected:* deriving the corpus at test time from the PDFs. It would avoid a
committed artifact and make every content task's test depend on a PDF parse,
and the extracted text would exist on disk during every CI run anyway.
