---
doc_type: reference
title: "Task 4.1 — The eight-cell tone-mark table and the rare-letter priority model"
description: Encode the complete tone-mark table as one checkable structure, and give every symbol a scheduling priority so rare letters can be demoted without being removed.
covers:
  - src/domain/script/data/toneMarkTable.ts
  - src/domain/script/data/toneMarkTable.test.ts
  - src/domain/script/data/symbolPriority.ts
  - src/domain/script/data/symbolPriority.test.ts
  - src/domain/script/data/symbols.ts
status: stable
task_id: "4.1"
task_status: complete
depends_on: ["3.1"]
size: medium
verify:
  - npx tsc --noEmit -p tsconfig.domain-check.json
  - npm test -- src/domain/script/data
  - npx biome check src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/toneMarkTable.test.ts enumerating every class and mark combination"
  - "AC2 -> a case in src/domain/script/data/toneMarkTable.test.ts asserting the unreachable combinations are declared unreachable"
  - "AC3 -> a case in src/domain/script/data/toneMarkTable.test.ts asserting a mark overrides the spelling rule"
  - "AC4 -> a case in src/domain/script/data/symbolPriority.test.ts asserting one priority declaration site repo-wide"
  - "AC5 -> a case in src/domain/script/data/symbolPriority.test.ts computing priority from any-position corpus counts"
  - "AC6 -> a case in src/domain/script/data/symbolPriority.test.ts asserting the symbol-set size is unchanged"
  - "AC7 -> three cases in src/domain/script/data/toneMarkTable.test.ts, one per state"
weight_votes:
  - "author -> 8"
  - "structure-estimator -> 5"
  - "implementation-estimator -> 8"
  - "unknowns-estimator -> 5"
  - "calibration-estimator -> 5"
weight_voted: "sha256:4e5da561dc01bd3a8f559df691a0f99ffbb5450bfd69b503ac38dd88ff01b3e5"
ac_tests:
  - "AC1 -> src/domain/script/data/toneMarkTable.test.ts::enumerates all twelve combinations with none missing"
  - "AC2 -> src/domain/script/data/toneMarkTable.test.ts::declares exactly the four stated combinations unreachable"
  - "AC3 -> src/domain/script/data/toneMarkTable.test.ts::resolves to the mark's tone even when the spelling rule disagrees"
  - "AC4 -> src/domain/script/data/symbolPriority.test.ts::reads ThaiConsonant.priority directly rather than a parallel map"
  - "AC5 -> src/domain/script/data/symbolPriority.test.ts::matches the declared symbols.ts priority for every consonant"
  - "AC6 -> src/domain/script/data/symbolPriority.test.ts::assigns every rank 1..44 exactly once — demotion reorders, never removes"
  - "AC7 -> src/domain/script/data/toneMarkTable.test.ts::gives three distinct values for the three query states"
red_proof:
  - "AC1 -> toneMarkTable.ts findRule(): appended `&& false` to the predicate so no rule ever matches."
  - "AC7 -> Same findRule() mutation as AC1 — with every mark unresolved, mid class collapses to \"undeclared\" instead of \"resolved\"."
  - "AC2 -> toneMarkTable.ts isDeclaredUnreachable(): replaced the body with `return false;` so no combination is ever declared unreachable."
  - "AC3 -> toneMarkTable.ts resolveSyllableTone(): deleted the tone-mark-wins branch so the function always falls through to the spelling rule regardless of a supplied mark."
  - "AC4 -> symbolPriority.ts getSchedulingPriority(): replaced the lookup with `return 1;` (a hardcoded constant, i.e. a second, disconnected 'priority' source)."
  - "AC5 -> symbolPriority.ts deriveConsonantPriority(): flipped the frequency comparator from `(frequency.get(b) - frequency.get(a))` to `(frequency.get(a) - frequency.get(b))`, ranking rarest… [see red-proofs/]"
  - "AC6 -> symbolPriority.ts deriveConsonantPriority(): changed `[...CONSONANT_CHARACTERS].sort(...)` to `[...CONSONANT_CHARACTERS].slice(0, -1).sort(...)`, dropping one consonant from the ranking."
lint:
  before: 10
  after: 10
  outcome: incomplete
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 4.1 — The tone-mark table and symbol priority

Two structures. The tone-mark table is the thing the lesson renders and the
learner memorises; symbol priority is what lets phase 4 demote rare letters
without dropping them out of the course.

## Acceptance Criteria

- AC1: Every combination of the three consonant classes and the four tone
  marks resolves to exactly one outcome: a resulting tone, or a declaration that
  the combination does not occur. Twelve combinations, none missing.
- AC2: The four combinations absent from standard orthography — mái-dtrii and
  mái-jàt-dtà-waa with high and with low class — are declared **not used in
  standard spelling**, and a consumer asking for one is told that rather than
  receiving nothing. They are not called unreachable: the shapes are writable
  and appear in loanwords and informal spelling, so a learner told "impossible"
  will be contradicted by a menu.
- AC3: A tone mark resolves against the **syllable's governing class** — which
  for a leading-consonant syllable is the leader's, not the class of the letter
  the mark sits over. Given that class, the mark determines the tone and the
  live/dead spelling rule is not consulted.
- AC4: Scheduling priority **extends the `priority` field that already exists**
  on every symbol — 98 populated sites with zero consumers today. This task
  gives it a consumer; it does not declare a second priority concept. A test
  asserts one declaration site repo-wide.
- AC5: Priority is computed from **any-position** corpus frequency, not from
  initial-position counts. Seven of the ten letters the plan demotes appear in
  top-600 words, so an initial-position measure would demote letters the learner
  meets early.
- AC6: Demotion changes priority and never removes a letter from the symbol
  set; the count of consonants in the SRS is unchanged by this task.
- AC7: Three states are distinct for a class-and-mark query: resolved,
  declared unreachable, and not yet declared. Unreachable never reads as
  undeclared.

## Test cases

- All twelve class-by-mark combinations resolve to a tone or to unreachable.
- The four unreachable combinations are exactly the ones stated, and asking for
  one returns the unreachable answer rather than undefined.
- Mid class maps its four marks onto four distinct tones.
- High class and low class each map their two marks, and the two classes
  disagree — low class gives falling and high where high class gives low and
  falling.
- A syllable whose spelling rule says one tone and whose mark says another
  resolves to the mark's.
- All 44 consonants carry a priority; the set size is 44 before and after
  demotion.
- The three query states are three distinct values.

## Architectural Decision

**Unreachable declared rather than absent.** A missing entry and a combination
that cannot occur are the same bytes to a consumer, and the lesson needs to
*teach* that mái-dtrii never appears with a low-class consonant — that is one
of the facts that makes the table small. Encoding it as a declaration lets the
lesson render it and lets a test assert it.

**Priority separate from the lesson sequence.** Demotion is a scheduling
concern, not a curricular one: ฬ stays in the course and stays in the SRS, it
simply stops blocking progress. Folding demotion into the sequence would make
"rare" and "not taught" the same state, and a learner would never meet the
letter at all.
