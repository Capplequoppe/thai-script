---
doc_type: index
title: "Phase 2 — The encoding system, proven on the opening band"
description: Scene grammar for class and tone, Paiboon unification, rewritten mnemonics, the phonetic class rule taught as its own lesson, and the opening band of lessons served in-house.
covers:
  - content/lessons
  - public/lessons
  - scripts/convert-romanization.py
  - src/domain/script/data
  - src/domain/vocabulary/data/vocabulary.json
  - src/domain/vocabulary/services
  - src/presentation/components/atoms
  - src/presentation/components/organisms
  - src/presentation/utils
  - src/presentation/components/molecules/ClassBadge.tsx
  - src/domain/script/services/ScriptCardGenerator.ts
phase_id: "2"
depends_on: ["1"]
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Phase 2 — Encoding

The layer that makes the rebuild worth doing. Class stops being a fact the
learner memorises 44 times and becomes a property they can *derive*, encoded
redundantly in colour, in scene district, and in a rule.

## The rule this phase teaches

Thai consonant class is a phonetic natural class, not an arbitrary list:

| Sound type | Class | Count | Memorised? |
|---|---|---:|---|
| Sonorant — m, n, ng, y, r, l, w | **always low** | 10 | no — derived |
| Unaspirated stop, plus silent อ | **always mid** | 9 | no — derived; this is the entire mid class |
| Aspirate or fricative — kh, ch, th, ph, f, s, h | high **or** low | 25 | **yes — but only the 11 high ones** |

So the only genuine memorisation is 11 glyphs, of which 8 (ข ฉ ถ ผ ฝ ส ห ศ)
carry almost all early decisions — the rest being obsolete or rare. ศ is in the
shortlist on measurement: it carries 2.6x the token share of ฝ. The rule also
forces attention to aspiration, which the learner needs for pronunciation
regardless, so the cheat code and the pronunciation drill are the same drill.

## What a person can do at the end

See every consonant staged in its class district with a mnemonic binding shape,
sound and class in one image; read Paiboon consistently across symbols and
vocabulary; and learn class as a derivable rule in its own lesson rather than
as 44 separate facts.

## The end-to-end criterion

Task 2.5 AC3: a learner who has completed the derivable-buckets lesson can
state the class of every consonant taught so far from the rule alone. The
high-class residue is deferred to phase 3, where its letters are taught — the
first draft asked one early lesson to account for letters ten lessons away.

## If the plan stopped here

The opening band is in-house and encodes class properly; later lessons still
serve video through the seam. A learner gets the system's main idea and an
unchanged remainder.

## Tasks

| Task | Delivers | Depends on |
|---|---|---|
| 2.1 | The symbol annotation shape, aspiration fixes, and sound-type derivation | — |
| 2.2 | Paiboon unification across `vocabulary.json` | 2.1 |
| 2.3 | District and tone-motion rendering, and the non-colour channel | 2.1 |
| 2.4 | All 44 consonant and 29 vowel mnemonics rewritten under scene grammar | 2.1, 2.2 |
| 2.5 | The derivable-buckets lesson, and the opening band produced | 2.2, 2.3, 2.4 |

2.3 runs concurrently with 2.2; 2.4 waits for 2.2. The `covers` are disjoint —
vocabulary data, presentation, and `symbols.ts` — but 2.2 and 2.4 both emit
Paiboon, and run in parallel they would settle its conventions independently,
leaving the symbol names and the corpus disagreeing about how Thai is
romanised. 2.2 owns the convention; 2.4 consumes it. 2.1 fixes the district and
tone-motion vocabularies first for the same reason.

## The exception this phase takes

Task 2.2 is an **at-once migration**: every `romanization` in `vocabulary.json`
moves from IPA to Paiboon in one pass. A per-entry or per-consumer rollout
would leave two notations live simultaneously, which is the state the plan is
removing.

## What will bite

- **Class and tone both want vertical space.** Tone *is* pitch height, and that
  metaphor is too good to spend on class. Class gets district (a place); tone
  gets vertical motion within the frame. 2.1 fixes this and 2.3 must not
  quietly reintroduce height as a class cue.
- **`consonantClassColor.ts` is the single source** and its own comment records
  that two diverging copies existed once. Extend it; do not add a second map.
- **Colour alone fails for red-green CVD.** District is not decoration — it is
  the second channel, and the criterion for it is about distinguishability
  without colour.
- **`classColorForLevel` fades as an item burns.** Whatever district encoding
  2.3 adds must fade on the same schedule, or a burned item stays scaffolded.
