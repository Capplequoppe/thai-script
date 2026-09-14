---
doc_type: reference
title: "Task 3.1 — Syllable rules as domain data"
description: Encode implicit vowels, the cluster inventory and the leading-consonant rule as checkable data, reconciled against the syllable analysis already in the vocabulary corpus.
covers:
  - src/domain/script/data/syllableRules.ts
  - src/domain/script/data/syllableRules.test.ts
  - src/domain/script/data/lessonSequence.ts
status: stable
task_id: "3.1"
task_status: pending
depends_on: []
size: large
verify:
  - npx tsc --noEmit -p tsconfig.domain-check.json
  - npm test -- src/domain/script/data
  - npx biome check src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/syllableRules.test.ts over every bare-consonant word in the corpus top 2,000, asserting each reading class"
  - "AC2 -> a case in src/domain/script/data/syllableRules.test.ts over polysyllabic words with an implicit first vowel"
  - "AC3 -> a case in src/domain/script/data/syllableRules.test.ts asserting the cluster inventory is closed and complete"
  - "AC4 -> a case in src/domain/script/data/syllableRules.test.ts applying one leading-consonant rule to both the ห and อ forms"
  - "AC5 -> a case in src/domain/script/data/syllableRules.test.ts reconciling the rules against vocabulary.json's syllables"
  - "AC6 -> a case in src/domain/script/data/syllableRules.test.ts asserting อ and ว are declared as vowels with their conditions"
  - "AC7 -> three cases in src/domain/script/data/syllableRules.test.ts, one per state"
  - "AC8 -> a case in src/domain/script/data/syllableRules.test.ts asserting every phase-3 lesson has a declared sequence slot"
weight_votes:
  - "author -> 13"
  - "structure-estimator -> 13"
  - "implementation-estimator -> 13"
  - "unknowns-estimator -> 8"
  - "calibration-estimator -> 8"
weight_voted: "sha256:90ac879328fc3bd2c68506e34566afa5c8989010a9ae0f99eab45837a78e05e4"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 3.1 — Syllable rules

The three rules phase 3 teaches, encoded as data the lessons render and the
tests check. `vocabulary.json` already carries a per-entry `syllables` analysis
— these rules must agree with it on real words, and a disagreement means one of
the two is wrong.

## Acceptance Criteria

- AC1: Bare-consonant words are resolved by the **full** set of competing
  readings, not by the implicit-โอะ rule alone. Measured over the corpus's top
  2,000, only about six of ~60 bare three-consonant words take implicit โอะ;
  the dominant readings are อ-as-vowel (~27, including ของ r17, ชอบ r86,
  ออก r121), ว-as-vowel (~11, including รวม r298), and initial clusters
  (ตรง r142, ควร r250). The rules resolve each class correctly and the
  distribution is recorded.
- AC2: A polysyllabic word whose first syllable carries no written vowel
  resolves with the implicit อะ, and the resulting syllable division matches the
  corpus analysis.
- AC3: The cluster inventory is closed and stated: which consonants may
  follow another to form a true initial cluster, which pairs are false clusters
  that change the sound, and which drop the second consonant. A pair outside the
  inventory is not treated as a cluster.
- AC4: Leading consonants are one rule with **three** branches: silent ห, the
  closed four-word อ set, and a mid- or high-class leader followed by a
  sonorant. The same rule resolves all three, the อ set is declared closed, and
  the third branch is declared productive — it contains สวัสดี at rank 9.
- AC5: Applied across `vocabulary.json`, the rules reproduce the stored
  syllable analysis. Every disagreement is reported with the word and both
  readings; the count of disagreements is asserted against a recorded baseline
  rather than assumed to be zero.
- AC6: The letters that act as vowels — อ and ว in the readings above — are
  declared as such, with the conditions under which they do. That prerequisite
  is what makes AC1 decidable, and the first draft omitted it entirely.
- AC7: A word is in exactly one of three states: resolved by the rules;
  unresolvable, reported with which rule ran out; and not yet analysed. An
  unresolvable word never reads as unanalysed.
- AC8: Every lesson phase 3 will produce has a declared slot in the lesson
  sequence before its content exists. Tasks 3.2 and 3.3 fill declared slots; a
  lesson with content and no slot, or a slot never filled, is reported.

## Test cases

- Every bare-consonant word in the top 2,000 resolves to the correct reading
  class; the four-way distribution matches the recorded baseline.
- ของ, ชอบ, ออก resolve with อ as a vowel, not as implicit โอะ.
- รวม resolves with ว as a vowel; ตรง resolves as an initial cluster.
- Polysyllables with an unwritten first vowel divide as the corpus divides them.
- A consonant pair outside the cluster inventory is not read as a cluster.
- A false cluster resolves to its actual sound, not to the sum of its parts.
- One leading-consonant rule handles both the ห and the อ spelling.
- The อ-leading set has exactly four members.
- Reconciliation across the corpus reports its disagreement count; the count
  matches the recorded baseline.
- The three per-word states are three distinct values.
- Every phase-3 lesson has a declared sequence slot, and every declared slot is
  filled by exactly one lesson.

## Architectural Decision

**Reconciled against the corpus rather than asserted as correct.** These rules
have genuine exceptions, and a test demanding zero disagreements across 5,454
entries would either be false or force the rules to be bent until it passed.
Recording a baseline count makes the exceptions visible and makes a *regression*
detectable — the number moving is the signal, not the number being zero.

*Rejected:* deriving the rules from the corpus analysis automatically. The
corpus is the check; deriving from it would leave nothing to check against, and
the lessons need rules a learner can state, not a table fitted to data.
