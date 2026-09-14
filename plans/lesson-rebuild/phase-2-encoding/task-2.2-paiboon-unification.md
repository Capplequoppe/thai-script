---
doc_type: reference
title: "Task 2.2 — Unify romanization on Paiboon across the vocabulary corpus"
description: Classify every romanization in vocabulary.json by notation, then convert only what is IPA, keeping the canonical form and refusing to touch entries already in Paiboon or mixed.
covers:
  - src/domain/vocabulary/data/vocabulary.json
  - src/domain/vocabulary/services/Romanization.ts
  - src/domain/vocabulary/services/Romanization.test.ts
  - scripts/convert-romanization.py
status: stable
task_id: "2.2"
task_status: complete
depends_on: ["2.1"]
size: medium
verify:
  - npx tsc --noEmit -p tsconfig.domain-check.json
  - npm test -- src/domain/vocabulary
  - python3 -m py_compile scripts/convert-romanization.py
  - npx biome check scripts src/domain/vocabulary/data src/domain/vocabulary/services
ac_enforcement:
  - "AC1 -> a case in src/domain/vocabulary/services/Romanization.test.ts asserting all four notation classes are counted"
  - "AC2 -> a case in src/domain/vocabulary/services/Romanization.test.ts over a fixture table of known pairs"
  - "AC3 -> a case in src/domain/vocabulary/services/Romanization.test.ts iterating every corpus entry"
  - "AC4 -> a case in src/domain/vocabulary/services/Romanization.test.ts asserting tone diacritics survive conversion"
  - "AC5 -> three cases in src/domain/vocabulary/services/Romanization.test.ts, one per state"
  - "AC6 -> a case in src/domain/vocabulary/services/Romanization.test.ts asserting the IPA field is retained"
weight_votes:
  - "author -> 8"
  - "structure-estimator -> 5"
  - "implementation-estimator -> 8"
  - "unknowns-estimator -> 8"
  - "calibration-estimator -> 5"
weight_voted: "sha256:3d0b2e9636887a0676d123941d7985bc4810110c75f065ef95459843524317b7"
ac_tests:
  - "AC1 -> src/domain/vocabulary/services/Romanization.test.ts::counts all four notation classes over the corpus"
  - "AC2 -> src/domain/vocabulary/services/Romanization.test.ts::converts $ipa -> $paiboon ($label)"
  - "AC3 -> src/domain/vocabulary/services/Romanization.test.ts::leaves no untouched entry classified as ipa after the migration, except entries reported as conversion failures"
  - "AC4 -> src/domain/vocabulary/services/Romanization.test.ts::recovers each of the five tones from a converted Paiboon spelling"
  - "AC5 -> src/domain/vocabulary/services/Romanization.test.ts::returns three distinct states: unconverted, converted, failed"
  - "AC6 -> src/domain/vocabulary/services/Romanization.test.ts::every converted corpus entry still carries its original IPA"
red_proof:
  - "AC2 -> In Romanization.ts, changed ONSET_MAP.p from \"bp\" to \"XX\""
  - "AC1 -> In classifyNotation, changed `if (hasIpa) return \"ipa\";` to `return \"paiboon\";`"
  - "AC5 -> In convertEntry, changed `return { state: \"unconverted\", paiboon: null };` to `return { state: \"converted\", paiboon: null };`"
red_proof_waived:
  - "AC3 -> traced: Not separately mutation-tested; its assertion path (classifyNotation returning \"ipa\") is the exact code path broken and restored by the AC1 mutation above (hasIpa branch), so that s… [see red-proofs/]"
  - "AC4 -> traced: Not separately mutation-tested; recoverTone reads the same TONE_MARKS table that applyTone writes (exercised indirectly by the AC2 mutation's tone-bearing fixtures), and I traced re… [see red-proofs/]"
  - "AC6 -> traced: Not separately mutation-tested; verified by tracing scripts/convert-romanization.py's convert_corpus, which only ever sets entry['ipa'] = romanization immediately before overwriting… [see red-proofs/]"
lint:
  before: 13
  after: 13
  outcome: unsupported
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 2.2 — Paiboon unification

The app currently carries two romanizations: IPA in `vocabulary.json`
(`tʰîː`) and a Paiboon-like style in `symbols.ts` (`maaw maa`). Every asset
this plan generates bakes one in, so the corpus converges on the learner-facing
one before any content is produced.

IPA stays as the canonical stored field. Paiboon is what the learner sees.

## Acceptance Criteria

- AC1: Every entry is first classified by notation — IPA, already Paiboon,
  mixed, or neither — and the four counts are recorded. Measured today: roughly
  3,447 / 819 / 795 / 393. Only entries classified IPA are converted.
- AC2: A conversion table maps IPA to Paiboon for every phoneme the corpus
  uses, verified against a fixture covering all five tones, both vowel lengths,
  and the aspirated/unaspirated contrasts.
- AC3: Every entry in `vocabulary.json` has a Paiboon romanization after
  conversion. An entry the converter cannot handle is reported by its rank and
  Thai form rather than silently left in IPA or emptied.
- AC4: Tone diacritics survive conversion: a word's tone is recoverable from
  its Paiboon form for every entry carrying tone information.
- AC5: Three states are distinct for each entry: not yet converted,
  converted, and conversion failed. A failed conversion never reads as an absent
  romanization.
- AC6: The original IPA is retained on each entry. Display resolves to
  Paiboon; nothing in the corpus loses its canonical form.

## Test cases

- The fixture table round-trips: every known pair converts as stated.
- Every corpus entry has a non-empty Paiboon form, or appears in the failure
  report with its rank and Thai form.
- A word with each of the five tones retains a recoverable tone after
  conversion.
- The three per-entry states are three distinct values.
- A converted entry still carries its IPA.
- Running the converter twice is idempotent.

## Architectural Decision

**IPA canonical, Paiboon derived and stored.** Deriving Paiboon at render time
would keep one source of truth, and it would put a conversion on every card
render and make the learner's reading depend on code rather than on reviewable
data. Storing both keeps the corpus inspectable in a diff — which matters,
because a wrong romanization teaches a wrong pronunciation and the reviewer
needs to be able to read it.

*Rejected:* a blind IPA→Paiboon pass over the whole corpus. The first draft
assumed `vocabulary.json` was uniformly IPA; measurement says roughly 2,000 of
5,454 entries are not, and a blind pass corrupts every one of them.

*Rejected:* displaying IPA. Precise, and it makes the learner learn a second
notation on top of the script they came for.

*Rejected:* converting entry by entry as each is first shown. Leaves two
notations live at once, which is the state being removed, and makes the
corpus's correctness depend on traversal order.
