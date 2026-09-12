---
doc_type: index
title: "Phase 1 — Conversation pipeline, one fixed exchange, end to end"
description: A new local Python backend (STT, judge LLM, voice-cloned TTS) and a new frontend page wired together through one hardcoded exchange, proving the entire mic-to-playback pipeline works before any real content or gating exists.
covers: [backend, docs/conversation-backend-api.md, src/domain/ports/ConversationPracticePort.ts, src/domain/conversation, src/infrastructure/conversation, src/presentation/pages/ConversationPracticePage.tsx, src/presentation/pages/ConversationPracticePage.test.tsx, src/presentation/context/AppContext.tsx, src/presentation/App.tsx, src/presentation/test-utils/renderWithApp.tsx, e2e, playwright.config.ts]
phase_id: "1"
depends_on: []
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
---

# Phase 1 — Conversation pipeline, one fixed exchange, end to end

**Capability added**: a person can open `/conversation`, hear a fixed
Thai question spoken in a cloned voice, record a spoken reply, and
within a few seconds see whether the backend judged it as an acceptable
answer plus a one-line English reason — with the whole round trip
(browser mic → local backend → Whisper → Qwen2.5-7B judge → rendered
verdict; and separately, backend → ThonburianTTS → browser playback)
actually exercised, not mocked. There is exactly one question this
phase asks, always the same one (`สบายดีไหม` — see task 1.2) — real,
personalized content is phase 2's job. If the backend isn't running (or
isn't reachable — e.g. the deployed public GitHub Pages site), the page
says so clearly instead of hanging or silently failing.

**End-to-end criterion**: task 1.4's Playwright spec, which starts the
real backend process (models loaded, not mocked), opens the real page,
drives a recorded reply through a fake-but-real `MediaStream` (a
short WAV fixture, not a live microphone — see task 1.4's Architectural
Decision), and asserts a verdict renders. This is the one criterion in
this phase that proves the *integration*, not just each side's own unit
tests.

**Would this phase stand alone?** As a tech-proof, yes — a person could
use it today and it would work end-to-end, just always ask the same
question. It is not meant to be the shipped experience; phase 2 is what
makes it one.

## Tasks

| Task | Title | Depends on |
|---|---|---|
| 1.1 | Conversation API contract + backend project skeleton | — |
| 1.2 | Backend pipeline: STT, judge, TTS, wired to the contract | 1.1 |
| 1.3 | Frontend port, adapter, and conversation practice page | 1.1 |
| 1.4 | End-to-end integration proof (Playwright, real backend) | 1.2, 1.3 |

1.1 is the seam: it is the only task that touches both "sides," and it
touches them only to write down the HTTP contract (endpoint paths,
request/response JSON shapes, error shapes) and scaffold an empty,
running FastAPI process. 1.2 and 1.3 are disjoint in `covers`
(`backend/` vs. `src/`) and depend only on 1.1's contract, never on each
other — they are the parallel-eligible pair this phase is shaped around.
Neither needs to see the other's code: 1.2 proves its two endpoints
against the written contract with its own backend tests; 1.3 proves its
port/adapter/page against a **stub** implementation of
`ConversationPracticePort` with its own frontend tests. 1.4 is where the
two real implementations meet for the first time.
