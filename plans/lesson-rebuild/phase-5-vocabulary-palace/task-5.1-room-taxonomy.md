---
doc_type: reference
title: "Task 5.1 — The room taxonomy and noun sub-districts"
description: Map the corpus's 12 word classes onto 6 memory rooms shaped for Thai, and give the noun room a sub-district scheme that scales past 1,500 entries.
covers:
  - src/domain/vocabulary/data/rooms.ts
  - src/domain/vocabulary/data/rooms.test.ts
  - src/domain/vocabulary/types.ts
status: stable
task_id: "5.1"
task_status: complete
depends_on: []
size: medium
verify:
  - npx tsc --noEmit -p tsconfig.domain-check.json
  - npm test -- src/domain/vocabulary
  - npx biome check src/domain/vocabulary src/domain/vocabulary/data
ac_enforcement:
  - "AC1 -> a case in src/domain/vocabulary/data/rooms.test.ts asserting every word class maps to exactly one room"
  - "AC2 -> a case in src/domain/vocabulary/data/rooms.test.ts asserting rooms and scene-grammar districts are disjoint vocabularies"
  - "AC3 -> a case in src/domain/vocabulary/data/rooms.test.ts asserting every noun sub-district has a bounded capacity"
  - "AC4 -> six cases in src/domain/vocabulary/data/rooms.test.ts, one per VocabProperty"
  - "AC5 -> three cases in src/domain/vocabulary/data/rooms.test.ts, one per state"
weight_votes:
  - "author -> 8"
  - "structure-estimator -> 5"
  - "implementation-estimator -> 8"
  - "unknowns-estimator -> 3"
  - "calibration-estimator -> 5"
weight_voted: "sha256:7ab30063ef4d87b5c4aaa10249a63df5fc09e3ccd591112eb788a936c200edf4"
ac_tests:
  - "AC1 -> src/domain/vocabulary/data/rooms.test.ts::maps every known word class to exactly one room, total in both directions"
  - "AC2 -> src/domain/vocabulary/data/rooms.test.ts::shares no name between ROOMS and DISTRICTS"
  - "AC3 -> src/domain/vocabulary/data/rooms.test.ts::reports a sub-district pushed past its declared capacity"
  - "AC4 -> src/domain/vocabulary/data/rooms.test.ts::for %s: hidden before acting, obtainable on request, present after reveal"
  - "AC5 -> src/domain/vocabulary/data/rooms.test.ts::produces three distinct state values"
red_proof:
  - "AC1 -> Changed ROOM_FOR_WORD_CLASS.adj from \"actions-and-states\" to \"things\" in rooms.ts."
  - "AC2 -> Changed ROOMS[3] in types.ts from \"connectors\" to \"temple\" (a district name)."
  - "AC3 -> Changed the overflow condition in reportNounSubdistrictOverflows from `count > capacity` to `count > capacity + 1000`."
  - "AC4 -> Removed the hintRequested branch from stageOnRequestThenOnReveal so an on-demand hint request before reveal always returned hidden."
  - "AC5 -> Changed assignRoom(\"\") to return {state:\"unassignable\", reason:\"empty word class\"} instead of {state:\"unclassified\"}."
lint:
  before: 9
  after: 6
  outcome: incomplete
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 5.1 — Room taxonomy

Six rooms, shaped for Thai rather than borrowed from English grammar:
people and pronouns; things; actions and states; connectors; particles;
counting and classifiers.

Merging verbs with adjectives is the significant call and it is linguistically
correct — Thai adjectives are stative verbs — which is also what brings 12
classes down to a number of places a learner can actually hold.

## Acceptance Criteria

- AC1: Every one of the corpus's word-class values maps to exactly one room,
  with no value unmapped and no room unreachable. The mapping is total in both
  directions.
- AC2: Room names and the scene-grammar district names from task 2.1 are
  disjoint vocabularies. A learner is never asked to hold one word meaning both a
  class district and a part-of-speech room.
- AC3: The noun room declares sub-districts by semantic field, each with a
  stated capacity. A sub-district over capacity is reported, so the scheme fails
  visibly rather than silently becoming one undifferentiated room again.
- AC4: The room is never exposed before the learner has acted, in **any** of
  the six `VocabProperty` values a review can present. It is available on demand
  as a hint, and shown as part of the answer after reveal. The rule is declared
  per property, not per notional direction — `audioRecognition` and
  `spellingFromAudio` behave like recognition and the first draft's two-way
  model did not cover them.
- AC5: A word is in exactly one of three states: assigned to a room; not
  assignable, reported with the reason; and not yet classified. Unassignable never
  reads as unclassified.

## Test cases

- Every corpus word-class value maps to a room; every room has at least one
  class mapping to it.
- Verbs and adjectives map to the same room.
- Classifiers and particles each have their own room, not folded into
  connectors.
- Room names and district names share no value.
- A noun sub-district pushed past its capacity is reported.
- For each of the six properties: the room is absent before the learner acts,
  obtainable on request, and present after reveal.
- A room requested as a hint is recorded as a hint, so a learner who asked is
  distinguishable from one who recalled unaided.
- The three per-word states are three distinct values.

## Architectural Decision

**Six rooms, not twelve.** A room is a place the learner builds and maintains;
twelve is past what the device pays for. The merges that get there — verbs with
adjectives, determiners and auxiliaries and modals into connectors — are chosen
so each is defensible in Thai rather than convenient.

**The noun room is sub-districted from the start.** 1,523 nouns is not a place.
Deferring the sub-scheme until the room "gets full" means rebuilding every noun
mnemonic later, because the sub-district is part of the image.

*Rejected:* one room per corpus class. It is the least work now and it is the
version that does not function as a palace.
