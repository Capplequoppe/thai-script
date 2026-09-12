---
doc_type: reference
title: "Task 2.2 / AC3 — reviewer note"
description: >
  Record of the naturalness read-through of backend/data/conversationStarters.json
  that AC3 requires, and an honest statement of what this note does and does not establish.
status: draft
covers:
  - backend/data/conversationStarters.json
---

# Task 2.2 / AC3 — reviewer note

## What this note is

AC3 (`task-2.2-curated-question-bank.md`) requires: *"A human has read
the generated bank once before it's considered final content — an
explicit reviewer step, not a test."* [F1] found that no artifact
anywhere in the repo or the run transcripts showed that step having
happened, distinct from the implementing agent's own in-flight
self-review reacting to its `quality.py` gate (see
`transcripts/run-20260912T111408Z/phase-2__self-review__2.2__r1.summary.md`).

This note records a line-by-line naturalness read of all 56 entries in
`backend/data/conversationStarters.json`, done fresh, by an agent
invoked specifically to repair [F1] — separate from the agent that
implemented task 2.2. **It is not the human read AC3's own text calls
for.** I am an AI agent, not a human, and no artifact I write can
honestly claim otherwise. Recording that limitation here rather than
papering over it is the point of this note.

## What the read-through found

Overwhelming majority of entries (≈50/56) are ordinary, natural
spoken-register Thai questions/greetings within their tier's
vocabulary — no off-topic content, no wrong-language leakage, no
broken grammar.

A small number of entries lean on Thai's topic-fronting construction
(`ที่นี่`/`นี้` as a fronted topic rather than a grammatical subject) in
a way that reads as mildly marked rather than clearly wrong — exactly
the category CONTEXT.md predicts a compliance filter can't catch
("grammatically odd but technically-compliant"):

- `cs-881e0bcbafab` (tier 1) — `ที่นี่ทำอะไรครับ` ("what's happening
  here?"): valid via topic-fronting, less common than
  `ทำอะไรที่นี่ครับ` (tier 4's `cs-49f5d7e3d3d4`).
- `cs-94758020a38e` (tier 1) — `นี้ทำอะไรไหมครับ`: reads fine pointing
  at an object; the `ครับ` address term sits oddly against an
  inanimate subject.
- `cs-148f1c4847b7` (tier 5) — `ที่นี่ไปไหนครับ`: closest to actually
  awkward of the set — "here go where" without an explicit `จาก`
  ("from") reads incomplete out of context.
- `cs-ad8469146954` (tier 2) — `คุณชอบแม่ของคุณมั้ยคะ` ("do you like
  your mother?"): not a grammar problem, an appropriateness/register
  one — an unusually personal thing for a conversation-opener bank.

None of these rise to "broken Thai" or "wrong topic" — they're the
kind of judgment call the task description itself says a human
reviewer, not the filter, exists to make. I have not edited
`conversationStarters.json` to act on them: three of the four sit in
tiers already at or barely above `MIN_ENTRIES_PER_TIER` (tier 5 is
*exactly* at 8 — removing `cs-148f1c4847b7` would trip AC6's own test),
and deciding whether to cut, keep, or regenerate replacements is
itself the judgment call this note is flagging as still open, not one
I should make unilaterally while repairing an unrelated finding about
missing review evidence.

## Status

**Not closed.** This note is preparatory material for the actual AC3
step — a real person (project owner: niclas@capplesoft.com) reading
`backend/data/conversationStarters.json` (or, at minimum, the four
entries flagged above plus a spot check of the rest) and recording
their own verdict, ideally by amending this file's Status section
directly rather than by any agent writing it on their behalf.
