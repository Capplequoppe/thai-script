---
doc_type: reference
title: "Task 2.5 — The derivable-buckets lesson and the opening band"
description: Teach the two derivable class buckets early, where their letters are already known, defer the high-class residue to phase 3, and produce the opening band of lessons as in-house decks.
covers:
  - content/lessons/lesson-02.md
  - content/lessons/lesson-03.md
  - content/lessons/lesson-04.md
  - content/lessons/lesson-05.md
  - content/lessons/lesson-sound-buckets.md
  - public/lessons/lesson-02
  - public/lessons/lesson-03
  - public/lessons/lesson-04
  - public/lessons/lesson-05
  - public/lessons/lesson-sound-buckets
  - src/domain/script/data/openingBand.test.ts
status: stable
task_id: "2.5"
task_status: pending
depends_on: ["2.2", "2.3", "2.4"]
size: large
verify:
  - npm test -- src/domain/script
  - npm run build
  - npx biome check src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/openingBand.test.ts asserting each band lesson resolves to the deck arm"
  - "AC2 -> a case in src/domain/script/data/openingBand.test.ts cross-checking taught symbols against declared sets"
  - "AC3 -> a case in src/domain/script/data/openingBand.test.ts deriving class for every consonant taught so far, from this lesson's stated rule alone"
  - "AC4 -> a case in src/domain/script/data/openingBand.test.ts asserting the lesson claims no class for an untaught letter"
  - "AC5 -> a case in src/domain/script/data/openingBand.test.ts resolving each example word against vocabulary.json"
  - "AC6 -> the shared originality check from task 1.5, invoked over every band lesson's narration"
  - "AC7 -> a case in src/domain/script/data/openingBand.test.ts asserting every referenced asset exists"
  - "AC8 -> a case in src/domain/script/data/openingBand.test.ts asserting each band deck carries a retrieval step"
weight_votes:
  - "author -> 13"
  - "structure-estimator -> 13"
  - "implementation-estimator -> 13"
  - "unknowns-estimator -> 5"
  - "calibration-estimator -> 8"
weight_voted: "sha256:ee57feb70d12f11f3e6e5d1184f12d156e7a0e5f3c608649a3d4422582891447"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 2.5 — The derivable buckets, and the opening band

The first draft placed one class-rule lesson in the 02–05 band and then asked
it to account for all 44 letters — including the 11 high-class ones the
sequence does not teach until lessons 12–19. Its own AC2 and AC3 could not both
hold.

The rule splits cleanly along the same seam the phonology does:

- **Here, early:** the two *derivable* buckets. A sonorant is low. An
  unaspirated obstruent is mid. Both are decidable from a sound the learner can
  already hear, over letters already taught.
- **Phase 3, at the high-class letters:** the residue. Aspirates and fricatives
  split high/low, and that is the part requiring memory rather than derivation.

This is a better placement for both halves, not a workaround. The early lesson
teaches a rule that pays off immediately on every letter known so far; the later
one arrives exactly when the contrasting pairs appear.

State the rule from the **low side**, in the direction the learner uses it:

> Low-class letters come in two kinds — those with a high partner (the
> aspirates and fricatives) and those without (the ten you can hum). If your
> letter has a partner, use the partner to reach the high-class tones. If it has
> none, that is what ห is for.

Not the symmetric version ("every high sound has a low twin"). That is true,
elegant and inert: a learner is never asked whether a high letter has a twin, so
the rule is never retrieved — and it invites the false converse, which a
"but not the other way round" caveat does not repair, because a negation hung off
a clean rule is the first thing to drop under load. The low-side form is used
every time the learner writes หมา, หนู, หญิง or ไหม, and it hands phase 3's
ห นำ mechanism to the learner as a consequence of this lesson rather than as an
unrelated rule ten lessons later.

Also teach the naming cheat code here — a consonant's name is its initial sound
plus the vowel ออ, then the acrophonic word. One slide, and it explains the
shared `-aaw` ending, previews สระ ออ, and explains อ อ่าง's own name.

## Acceptance Criteria

- AC1: Every lesson in the opening band resolves to the deck arm. Lessons
  outside the band still resolve to the video arm.
- AC2: Each band lesson introduces exactly the symbols it declares and uses no
  symbol not yet taught at that point in the sequence.
- AC3: The lesson's stated rule derives the correct class for **every consonant
  taught up to this point in the sequence**. A test applies the rule as the
  lesson states it and reproduces those assignments; a letter needing knowledge
  the lesson does not present fails.
- AC4: The lesson claims no class for a letter the sequence has not yet taught.
  It names the third bucket as existing and unresolved, and defers it — a lesson
  asserting the high list here fails, because that list is not yet knowable.
- AC5: Every Thai example word resolves to a `vocabulary.json` entry, or is
  declared in the deck's `teachingWords` with a stated reason.
- AC6: Every band lesson's narration clears the shared originality check from
  task 1.5.
- AC7: Every asset a band deck references exists at its declared path.
- AC8: Every band deck carries at least one retrieval step before its
  corresponding reveal, per the schema from task 1.1a.

## Test cases

- Each band lesson resolves to the deck arm; the first lesson outside it does
  not.
- Symbol sets match declarations in both directions, per lesson.
- Applying the stated rule reproduces the class of every consonant taught so
  far — and the test's letter set is derived from the sequence, so it grows
  automatically rather than being a frozen list.
- The lesson text asserts no class for an untaught letter; a planted claim about
  ผ fails the test.
- Every example word resolves, or is declared with a reason.
- Narration clears the originality check.
- Every asset exists; every deck has a retrieval step.

## Architectural Decision

**The rule is split by derivability, not by convenience.** Two buckets are
decidable from sound alone and one is not, which is exactly the boundary
between a lesson that can be taught early and a lesson that needs the letters in
front of it. Teaching the derivable half first also means the residue arrives
framed as "the part you actually memorise" — which is the plan's whole claim
about class, made at the moment it becomes true.

**AC4 exists because the tempting failure is silent.** A lesson that quietly
asserts the full class system reads fine and leaves the learner deriving from
letters they have never seen. Testing that the lesson *withholds* is what
catches it.

*Rejected:* keeping one lesson and moving it later, to lesson 12. That delays
the derivable half — the part that pays off from lesson 1 — for the sake of the
half that cannot be taught yet.

*Rejected:* teaching the high list early as a list to memorise ahead of its
letters. It is 11 glyphs with no shapes attached yet, which is rote learning of
exactly the kind this phase exists to remove.
