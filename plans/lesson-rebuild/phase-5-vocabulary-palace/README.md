---
doc_type: index
title: "Phase 5 — Vocabulary rooms as mnemonic staging"
description: Give every word a room that stages its mnemonic and confirms after reveal, backfill the 3,200 entries missing a word class with recorded provenance, and introduce Pom and Chan as recurring characters.
covers:
  - scripts/backfill-word-class.py
  - src/domain/vocabulary/data
  - src/domain/vocabulary/services
  - src/domain/vocabulary/types.ts
  - src/presentation/components/organisms
phase_id: "5"
depends_on: ["2"]
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Phase 5 — Vocabulary rooms

Symbols get scene grammar in phase 2. Words get **rooms** — a consistent place
each mnemonic is staged in, so images compose instead of competing.

**This phase was redesigned after the review.** The first draft claimed rooms
let recall "prune to a partition instead of searching 5,454 entries." That
claim does not hold: partition pruning helps *searched* retrieval, and SRS
review is cued paired-associate recall with nothing to search. CONTEXT.md
already makes that argument when rejecting literal palaces for symbols — and
the first draft then built this phase on the mechanism it had just rejected.

The corpus makes it worse: after backfill one room holds over 70% of entries
and three hold under 30 each. A partition that lopsided prunes little even
where pruning would apply.

## What rooms are for, now

- **Staging.** Every mnemonic for a word happens in that word's room, so cast,
  setting and props stay consistent and compose across words.
- **Post-reveal confirmation.** After the learner answers, the room is part of
  the answer, reinforcing the grammatical category alongside the meaning.
- **An on-demand hint.** A learner who is stuck may ask for the room. Asking is
  a choice with a cost, which leaves the retrieval attempt intact.

What rooms are **not**: something shown before the learner has tried. That
trades away the retrieval effort that produces retention, which is the single
thing this app exists to maximise.

## What a person can do at the end

Meet every word in a consistent setting with a consistent cast, reach for a room
hint when genuinely stuck, and pick up the gendered first-person split by
meeting Pom and Chan constantly rather than by being taught it.

## The end-to-end criterion

Task 5.3 AC4: across every `VocabProperty` a review can present, the room is
never rendered before the learner has acted, and is always available on demand.

## If the plan stopped here

Words have rooms, and the script track is wherever phases 3 and 4 have reached.
The rooms are additive — nothing in phases 1–4 depends on them.

## Tasks

| Task | Delivers | Depends on |
|---|---|---|
| 5.1 | The room taxonomy, noun sub-districts, and the on-demand exposure rule | — |
| 5.2 | `word_class` backfilled with recorded provenance and a regression gate | 5.1 |
| 5.3 | Pom and Chan, and vocabulary mnemonics staged in rooms | 5.1, 5.2 |

## What will bite

- **Six `VocabProperty` values, not two directions.** `audioRecognition` and
  `spellingFromAudio` behave like recognition for room exposure. The rule is
  declared per property — six cases.
- **Reveal state lives in `Flashcard.tsx:30`**, not `WordCard.tsx`, which has
  none. A pre- versus post-reveal criterion asserted against `WordCard` passes
  trivially and proves nothing.
- **`src/domain/vocabulary/types.ts` holds `VocabEntry`** and four tasks add
  fields to it. It is in this phase's covers; it was in nobody's before.
- **Nouns are 1,523 entries.** One room will not hold them, and the
  sub-district scheme is the part most likely to be underestimated.
- **A backfilled class is a guess.** Keep provenance, or a wrong guess becomes
  indistinguishable from curated corpus data.
