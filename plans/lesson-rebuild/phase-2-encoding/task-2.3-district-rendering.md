---
doc_type: reference
title: "Task 2.3 — Render class as district and tone as vertical motion"
description: Add the non-colour class channel to the symbol cards and encode tone as vertical motion, both fading on the existing burn schedule.
covers:
  - src/presentation/utils/consonantClassColor.ts
  - src/presentation/utils/consonantClassColor.test.ts
  - src/presentation/components/organisms/SymbolCard.tsx
  - src/presentation/components/organisms/SymbolCard.test.tsx
  - src/presentation/components/atoms/ThaiCharDisplay.tsx
  - src/presentation/components/atoms/DistrictBadge.tsx
  - src/presentation/components/atoms/DistrictBadge.test.tsx
  - src/presentation/components/atoms/ToneContourIcon.tsx
  - src/presentation/components/molecules/ClassBadge.tsx
  - src/domain/script/services/ScriptCardGenerator.ts
status: stable
task_id: "2.3"
task_status: complete
depends_on: ["2.1"]
size: medium
verify:
  - npm run build
  - npm test -- src/presentation
  - npx biome check src/domain/script/services src/presentation/components/atoms src/presentation/components/molecules src/presentation/components/organisms src/presentation/utils
ac_enforcement:
  - "AC1 -> a case in src/presentation/components/atoms/DistrictBadge.test.tsx asserting a distinct non-colour cue per class"
  - "AC2 -> a case in src/presentation/components/atoms/DistrictBadge.test.tsx asserting classes stay distinguishable with colour removed"
  - "AC3 -> a case in src/presentation/utils/consonantClassColor.test.ts asserting district and colour fade on one schedule"
  - "AC4 -> a case in src/presentation/components/organisms/SymbolCard.test.tsx asserting tone renders as motion, not as class position"
  - "AC5 -> three cases in src/presentation/components/organisms/SymbolCard.test.tsx, one per state"
  - "AC6 -> a case in src/presentation/components/organisms/SymbolCard.test.tsx rendering the class-retrieval card"
  - "AC7 -> a case in src/presentation/utils/consonantClassColor.test.ts asserting the scaffold keys on the symbol's own stage"
weight_votes:
  - "author -> 8"
  - "structure-estimator -> 13"
  - "implementation-estimator -> 8"
  - "unknowns-estimator -> 3"
  - "calibration-estimator -> 5"
weight_voted: "sha256:7e680f3687a12556d5abe3e9bea22a26a95826e42658a4f507d125f0a31f9a07"
ac_tests:
  - "AC1 -> src/presentation/components/atoms/DistrictBadge.test.tsx::DistrictBadge renders a distinct non-colour cue per class"
  - "AC2 -> src/presentation/components/atoms/DistrictBadge.test.tsx::DistrictBadge stays distinguishable with colour removed"
  - "AC3 -> src/presentation/utils/consonantClassColor.test.ts::district and colour fade together both present at full and fading, both absent once burned"
  - "AC4 -> src/presentation/components/organisms/SymbolCard.test.tsx::ToneMarkCard — tone as motion (AC4) renders a tone-contour icon for each class's tone"
  - "AC5 -> src/presentation/components/organisms/SymbolCard.test.tsx::ConsonantCard — class cue states (AC5) renders an unresolved cue, distinguishable from not-applicable, for a value that isn't a real class"
  - "AC6 -> src/presentation/components/organisms/SymbolCard.test.tsx::ConsonantCard — class-retrieval card (AC6) renders no district cue and no class colour when hideClassCue is set"
  - "AC7 -> src/presentation/utils/consonantClassColor.test.ts::classDistrictForLevel keys on the symbol's own stage returns independent results for two calls with different levels, as if for two consonants in one word"
red_proof:
  - "AC1 -> In consonantClassColor.ts, changed classDistrict() to always return \"temple\" regardless of the known class passed in."
  - "AC4 -> In SymbolCard.tsx, replaced the mid-class-tone <ToneContourIcon tone={t.midClassTone} /> in ToneMarkCard with the literal `null`."
  - "AC2 -> In DistrictBadge.tsx, added color: \"red\" to the badge span's style object."
  - "AC3 -> In consonantClassColor.ts, removed the `if (level === \"none\") return undefined;` gate from classDistrictForLevel, so it always derived a district regardless of level."
  - "AC5 -> In consonantClassColor.ts, changed classCueState() to return \"not-applicable\" instead of \"unresolved\" for a non-empty, non-real class value."
  - "AC6 -> In SymbolCard.tsx, changed `{!hideClassCue && <ClassBadge classType={c.classType} />}` to unconditionally render `<ClassBadge classType={c.classType} />`."
  - "AC7 -> Same as AC3's mutation (classDistrictForLevel's level-gating is the mechanism both criteria rest on): removing the \"none\" gate collapses per-call independence, since a call for a bu… [see red-proofs/]"
lint:
  before: 17
  after: 17
  outcome: incomplete
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 2.3 — District and tone-motion rendering

`consonantClassColor.ts` is the single source for class colour and already
fades it toward default text as an item burns. This adds the second channel —
district — on the same schedule, and gives tone the vertical axis.

## Acceptance Criteria

- AC1: Each of the three classes renders a distinct non-colour cue, derived
  from the district vocabulary task 2.1 fixed. The cue comes from the same single
  source as the colour; no second class mapping is introduced.
- AC2: With colour information removed, the three classes remain mutually
  distinguishable. A test that passes only because the classes differ in hue
  fails this criterion.
- AC3: District and colour fade together as an item burns. A burned item
  shows neither — it reads as unmarked Thai text, matching the existing
  `classColorForLevel` contract.
- AC4: Tone renders as vertical motion within the symbol's frame. Class
  never renders as vertical position, so a high-class consonant with a low tone
  is not shown lower or higher on account of its class.
- AC5: Three states are distinct where a symbol's class is concerned: class
  known, class not applicable (a vowel, a numeral), and class unresolved. An
  unresolved class is not rendered as an absent one.

- AC6: The class-retrieval card renders **no** district cue and no class
  colour. `ScriptCardGenerator.ts:168` already suppresses the colour hint
  because that card's question is the class; a second channel that ignores the
  suppression displays the answer.
- AC7: The class scaffold fades on the **symbol's** own SRS stage, not the
  containing word's. `WordCard.tsx` currently passes the word's stage, so a
  well-known word strips the cue from a still-weak consonant.

## Test cases

- Each class yields a distinct district cue.
- Stripping colour from the rendered output leaves the three classes
  distinguishable.
- An item at each scaffold level shows colour and district consistently: both
  at full, both faded, neither when burned.
- A symbol carrying a tone renders its motion cue; changing the symbol's class
  does not change its vertical placement.
- A vowel renders no class cue and is not reported as unresolved.
- A symbol with an unresolved class renders distinguishably from a vowel.

## Architectural Decision

**The district cue extends `consonantClassColor.ts` rather than living beside
it.** That file's own comment records that `ClassBadge` and `WordCard` once
each held their own partly-wrong mapping. A second module keyed on class would
recreate exactly that, and the two would drift in the same direction — colour
and district disagreeing about one letter is worse than either being absent.

*Rejected:* encoding class as vertical position, which is the intuitive
choice and collides with tone. Task 2.1 records the full argument.

*Rejected:* a district cue that does not fade. Scaffolding that outlives
mastery is the thing `classColorForLevel` was built to avoid.
