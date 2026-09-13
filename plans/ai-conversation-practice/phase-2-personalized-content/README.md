---
doc_type: index
title: "Phase 2 — Personalized content, curated question bank by vocabulary tier"
description: Replace phase 1's single hardcoded question with a pre-generated, filtered bank of AI conversation-starters, and have the backend pick from it based on each learner's own known vocabulary — never generated live.
covers: [scripts/generate-conversation-bank, docs/conversation-backend-api.md, src/domain/conversation, src/domain/ports/ConversationPracticePort.ts, src/infrastructure/conversation, src/presentation/pages/ConversationPracticePage.tsx, src/presentation/pages/ConversationPracticePage.test.tsx, backend/app/pipeline.py, backend/app/bank.py, backend/app/main.py, backend/data/conversationStarters.json, backend/tests, e2e]
phase_id: "2"
depends_on: []
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
---

# Phase 2 — Personalized content, curated question bank

**Capability added**: two learners with different vocabulary progress,
opening `/conversation`, are asked *different* questions — each one
built only from words that specific learner has actually learned. The
questions themselves come from a **pre-generated, filtered content
bank** (never live LLM generation — CONTEXT.md's spike is why), tiered
by vocabulary size, selected by the backend based on a snapshot of the
learner's own known words the frontend now sends with each request.

**End-to-end criterion**: task 2.3's extension of the phase 1 Playwright
spec — two runs of the same flow with two different known-vocabulary
fixtures produce two different, appropriately-scoped opening questions,
through the real backend and the real bank file, not a stub.

**Would this phase stand alone?** Yes, if phase 1 has shipped — it
replaces one hardcoded string with real personalized content and
changes nothing else about the shape of an exchange. It does not
depend on phase 3's multi-turn/gating work at all.

**No phase-level `depends_on` on phase 1.** A review of this plan's
first draft found that task 2.2 (content generation) has zero technical
coupling to phase 1 — it only reads the existing `vocabulary.json` and
writes a new file — but a blanket phase-level dependency would have
blocked it behind all four phase-1 tasks anyway, including the
human-gated 1.4, for no structural reason. The real dependencies are
narrower and are stated at the task level instead (below), so 2.2 can
start on day one, in parallel with all of phase 1.

## Tasks

| Task | Title | Depends on |
|---|---|---|
| 2.1 | Frontend sends a known-vocabulary/grammar snapshot | 1.3 |
| 2.2 | Offline generation + auto-filtered question bank | — |
| 2.3 | Backend selects from the bank by learner tier | 1.2, 1.4, 2.1, 2.2 |

2.1 and 2.2 remain independent **of each other** — 2.1 touches `src/`
(the frontend's request shape, extending the port/adapter/page task 1.3
built), 2.2 touches `scripts/` and a new data file under `backend/data/`
and never reads or writes anything 2.1 owns. Both are prerequisites for
2.3, which is where the backend reads the bank and the snapshot
together for the first time. No seam task is needed for the 2.1/2.2
pair — 2.1's shape is fixed by extending phase 1's already-written API
contract (new fields, not a new endpoint), and 2.2's bank file format
is now stated completely in its own task (including the per-entry word
list 2.3's selection logic needs — a review of this plan's first draft
found the schema was missing exactly that field, which is the kind of
gap a seam task exists to catch; it's fixed here at the source instead).

2.3 also depends on 1.4: it extends the same
`e2e/conversation-practice.spec.ts` file task 1.4 creates, so the two
must run in sequence rather than the scheduler treating them as
concurrent-eligible file writers.
