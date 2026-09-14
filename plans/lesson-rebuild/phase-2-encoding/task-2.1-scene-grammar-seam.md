---
doc_type: reference
title: "Task 2.1 — The symbol annotation shape, sound-type derivation, and scene grammar"
description: Own the full symbol-annotation schema — extracting the relations currently trapped in mnemonic prose into fields — fix the aspiration data defects, and derive consonant class from sound type without re-declaring what the repo already ships.
covers:
  - src/domain/script/data/sceneGrammar.ts
  - src/domain/script/data/sceneGrammar.test.ts
  - src/domain/script/data/soundType.ts
  - src/domain/script/data/soundType.test.ts
  - src/domain/script/data/symbols.ts
status: stable
task_id: "2.1"
task_status: pending
depends_on: []
size: x-large
verify:
  - npx tsc --noEmit -p tsconfig.domain-check.json
  - npm test -- src/domain/script
  - npx biome check src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/soundType.test.ts iterating all 44 consonants"
  - "AC2 -> a case in src/domain/script/data/soundType.test.ts asserting isAspirated agrees with initialSound for all 44"
  - "AC3 -> a case in src/domain/script/data/soundType.test.ts asserting the derivation consults no table for the first two buckets"
  - "AC4 -> a case in src/domain/script/data/sceneGrammar.test.ts asserting each vowel's conditional written forms are fields, not prose"
  - "AC5 -> a case in src/domain/script/data/sceneGrammar.test.ts asserting every confusable pair declares its distinguishing feature"
  - "AC6 -> a case in src/domain/script/data/sceneGrammar.test.ts asserting the tone-motion vocabulary has one declaration site repo-wide"
  - "AC7 -> a case in src/domain/script/data/sceneGrammar.test.ts validating a conforming and a deficient annotation record"
  - "AC8 -> three cases in src/domain/script/data/soundType.test.ts, one per state"
  - "AC9 -> a case in src/domain/script/data/sceneGrammar.test.ts asserting all 82 records carry the romanization and final-sound slots"
weight_votes:
  - "author -> 21"
  - "structure-estimator -> 8"
  - "implementation-estimator -> 21"
  - "unknowns-estimator -> 13"
  - "calibration-estimator -> 13"
weight_voted: "sha256:2f2acd697dc9bb8d9f795cf2d5db5ee6a04aa3bf9f12eec4c3d7db4396d2e92d"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 2.1 — The symbol annotation shape

The seam for phases 2 and 5. It was drawn too narrow in the first draft: it
owned a mnemonic record, while the real problem is that **several facts about
Thai exist in this repo only inside mnemonic prose strings** — and task 2.4
rewrites every one of those strings. This task gives those facts fields first.

Read CONTEXT.md Rule 2 before adding anything.

## Acceptance Criteria

- AC1: Every one of the 44 consonants classifies into exactly one sound type:
  sonorant, unaspirated obstruent (including silent อ), or aspirate/fricative.
  The classification is read from `initialSound` and aspiration and **never from
  `classType`** — a classification derived from declared class, then checked
  against declared class, passes by construction and tests nothing. Given that
  independence, the derived class agrees with the declared class for all 44.
- AC2: `isAspirated` agrees with each consonant's own `initialSound` for all 44.
  ฑ and ฒ are `false` today while their `initialSound` reads `"th"`; AC1's
  derivation keys on this field, so both are corrected here and a test stops the
  pair drifting apart again.
- AC3: Class is derived for the first two buckets without consulting any
  per-letter table. Only the aspirate/fricative bucket consults a list, and that
  list has exactly 11 members.
- AC4: Every vowel whose written form changes in the presence of a final
  consonant declares both forms as **fields**. Those rules exist today only
  inside five mnemonic strings, and tasks 3.1 and 4.3 depend on them.
- AC5: Every confusable pair declares the feature distinguishing the two glyphs
  as data — head direction, an added stroke, a bump — not as prose. That
  relation survives in exactly one of the 82 shipped strings today.
- AC6: The tone-motion vocabulary has exactly one declaration site in the
  repository. `TONE_CONTOUR_POINTS` in `ToneContourIcon.tsx` already declares
  five contours; this task names that as the source rather than adding a second.
- AC7: An annotation record validates only if it declares its district, its
  shape cue and its sound cue as separate fields, and its tone motion where it
  carries a tone. A record binding only shape fails, naming the missing field.
- AC8: A consonant is in exactly one of three states: classified;
  unclassifiable, reported with the reason; or not yet classified. An
  unclassifiable letter never reads as unclassified.
- AC9: The annotation shape has a slot for each symbol's romanized name and
  for its final-sound behaviour, and covers all **82** symbol records — not only
  the 73 task 2.4 rewrites. Nine records carry facts with no other home.

## Test cases

- All 44 consonants classify; derived class equals declared class for each; the
  count is asserted as 44.
- `isAspirated` agrees with `initialSound` for all 44 — ฑ and ฒ included.
- The high list has exactly 11 members, all aspirates or fricatives.
- No sonorant and no unaspirated obstruent appears in the high list.
- Every conditional-form vowel has both forms as fields; one recorded only in
  prose fails.
- Every confusable pair names its distinguishing feature; a pair whose two cues
  merely differ, without naming the feature, fails.
- Grepping the source finds one tone-motion declaration site.
- An annotation record missing its sound cue fails, naming that field.
- The three classification states are three distinct values.

## Architectural Decision

**The seam owns the whole annotation shape, not just mnemonics.** The review
found two facts — vowel conditional forms, and the confusable-pair relation —
living only in prose that task 2.4 deletes wholesale, with no field to move
into. Extracting them here makes 2.4 a rewrite of *presentation* over data that
already exists, rather than a destructive operation on an under-modelled
structure.

**The aspiration defect is fixed, not worked around.** `isAspirated` is the
field AC1's derivation keys on, and it disagrees with `initialSound` on ฑ and
ฒ. A derivation built on it produces a wrong class for both on day one, and the
rule gets blamed rather than the data.

**Class derived from sound type, not stored per letter.** Storing it invites the
44-fact table this phase exists to remove, and a derived value cannot drift from
the rule the lesson teaches. The 11-member high list is the irreducible residue.

**District for class, vertical motion for tone** — both want the vertical axis
and only one can have it. Tone is literally pitch height, so it keeps it; class
becomes a place.

*Rejected:* declaring a fresh tone-motion vocabulary. Five contours already ship
in `ToneContourIcon.tsx`, and a second declaration would drift from the one
already rendering on every word card.

*Rejected:* colour as the sole class channel — it fails for red-green colour
vision deficiency, so district is the second channel rather than decoration.
