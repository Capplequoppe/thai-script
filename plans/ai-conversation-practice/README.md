---
doc_type: index
title: AI conversation practice mode
description: A locally-hosted spoken-conversation practice feature — record a reply to an AI partner, get it judged, hear a response — constrained to the learner's own known vocabulary and gated behind a vocabulary/grammar threshold.
covers: [backend, src/domain/conversation, src/infrastructure/conversation, src/presentation/pages/ConversationPracticePage.tsx, src/presentation/App.tsx, src/presentation/context/AppContext.tsx]
status: draft
planner_model: claude-sonnet-5
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
---

# AI conversation practice mode

A learner records a spoken reply to a Thai question from a local AI
conversation partner, gets it judged (pass/fail + a one-line reason),
and hears the next question — entirely on the user's own machine (RTX
4090, 24GB VRAM, 125GB RAM), no cloud API. This is the first feature in
this app with a backend at all. See `CONTEXT.md` for the spike that
determined the architecture below — in particular, **why the AI's own
turns are drawn from a pre-generated content bank rather than generated
live** (live generation was measured unreliable; judging the learner's
freeform reply was measured reliable — the two halves of this feature
are built differently on purpose).

## Phases

| Phase | Name | Depends on |
|---|---|---|
| 1 | Conversation pipeline, one fixed exchange, end to end | — |
| 2 | Personalized content — curated question bank by vocabulary tier | 1 |
| 3 | Multi-turn sessions + feature gating | 2 |

Each phase is independently shippable at a coarser grain than the last:
phase 1 proves the entire mic → STT → judge → TTS → playback pipeline
works at all, with one hardcoded question — the riskiest, most novel
part of this plan (a backend has never existed in this app before).
Phase 2 replaces the hardcoded question with real content scoped to
each learner's actual known vocabulary. Phase 3 turns one exchange into
a real multi-turn conversation and adds the unlock gate discussed with
the user — the mode stays reachable before that threshold, but the
existing sentence-reading/listening/segmentation/composition challenges
(already shipped, `plans/practice-mode-expansion/`) are the intended
"meanwhile" content, not something this plan builds.

## Trust Boundary Inventory

New surface: this is the first feature in the app with a network
endpoint at all, and the first that accepts audio as input. The
`Source` column names every place an input can *originate*, not only
where it's meant to come from — the backend's actual boundary is its
listening socket, reachable by anything that can address it.

| Input | Source | Reaches |
|---|---|---|
| Inbound HTTP request (any endpoint) | Any local process or browser page able to reach `127.0.0.1:8000` — not only this app's own frontend | The full pipeline: STT, the judge LLM, TTS synthesis. **No CORS/origin check and no bind-address decision exists in this plan by default** — task 1.1 must add an explicit origin allowlist (never `allow_origins=["*"]`) and bind `127.0.0.1` explicitly, or this row stays open to any page the user has open in the same browser |
| Recorded audio blob | Learner's own microphone, via `useMicRecorder` — but see the row above, since the endpoint accepting it has no caller check | POSTed to the backend's judge endpoint; backend passes it to `faster-whisper` for transcription — no shell, no file path built from it (an in-memory/temp-file decode only, never a user-controlled filename) |
| Transcribed text (STT output) | Backend's own Whisper call over the audio above | Interpolated into the judge LLM's prompt — **prompt injection surface**: a learner (or anything routed through the row above) could speak something engineered to look like an instruction. The judge prompt template fences it as "the learner's spoken reply" data, never as instructions, and the judge's own output is constrained to the fixed `ผลลัพธ์:`/`เหตุผล:` response shape a task's parser validates before trusting it (task 1.2) — **this mitigation has no test exercising it anywhere in the plan; add one** |
| Judge/generation LLM output | Qwen2.5-7B-Instruct, backend-local | Rendered as text in the frontend UI (React, auto-escaped). Never used to pick arbitrary content at request time — phase 2's questions come from an **offline-generated, filtered, human-reviewed** bank, so live model output never reaches TTS directly; from phase 3 onward, prior session turns do feed back into the judge's own prompt as conversation context, which is the next thing to re-read this row for |
| Learner's known-vocabulary/grammar snapshot (phase 2+) | The frontend's own SRS state, sent to the backend per request — fully caller-controlled content once the row above is considered | Used only to select a bank entry / compute a tier — never interpolated into a shell command or file path |
| `session_id` (phase 3) | Client-supplied path parameter (`/conversation/session/{id}/...`) | Used as an in-memory dict key only; an unrecognized id is a `404`, never created as a new session. Benign as specified — named here because the table should enumerate new surface as it's added, not only at authoring time |
| Backend base URL | **Updated post-plan** (not one of the 11 tasks above): user-editable at runtime via Settings → "Conversation Backend" (`src/infrastructure/conversation/ConversationBackendSettings.ts`, its own `localStorage` key, never the `thai-srs-state` blob), so a phone can point at a backend on another device. Default remains the same-machine constant | `fetch()` calls only; no redirect-following to an arbitrary user-supplied host. This row's earlier mitigation ("not user-editable") no longer holds — the actual boundary is now row 1 (bind address/CORS) alone, which the backend still keeps `127.0.0.1`-by-default and requires an explicit opt-in (`--host 0.0.0.0`, `docs/conversation-backend-api.md`) to widen |
| Committed voice audio (`backend/assets/reference_clip.wav`, e2e reply fixtures) | Personal recordings, checked into a public repository that deploys to GitHub Pages | A working voice-cloning pipeline is pointed at the reference clip; both are published content, not just inputs to a sink — recorded here as an accepted, deliberate exposure (the speaker's own recordings, with their own knowledge), not an oversight |

No row here reaches a shell, a file path built from network input, or
`eval`. **The first row is the one to fix before any other task in
phase 1 lands** — every other row's mitigation assumes a caller check
that does not yet exist.

## test-templates

```test-templates
vitest | src/** | npx vitest run {file} --reporter=verbose --hideSkippedTests -t {name}
pytest | backend/** | uv run --project backend pytest {file} -k {name} -v -m "not gpu"
pytest | scripts/generate-conversation-bank/** | uv run --project scripts/generate-conversation-bank pytest {file} -k {name} -v -m "not gpu"
playwright | e2e/** | npm run test:e2e -- {file} -g {name}
```
