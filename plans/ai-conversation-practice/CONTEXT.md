---
doc_type: deep-dive
title: Execution context for AI conversation practice mode
description: Repo orientation, the local-model spike findings that shaped this plan's architecture, conventions, and rejected alternatives.
covers: [src/domain/conversation, src/infrastructure/conversation, src/presentation/pages/ConversationPracticePage.tsx, backend]
status: draft
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
---

# Execution context — AI conversation practice mode

A new feature: a learner has a spoken Thai conversation with a local AI
partner, constrained to their own known vocabulary, judged on each
spoken reply. Runs on the user's own machine (RTX 4090, 24GB VRAM,
125GB RAM) — no cloud API. **First backend this app has ever had**;
today it's a 100% static Vite PWA (`dist/` → GitHub Pages, no server,
no network calls beyond pre-recorded static audio under `public/`).

**Everything below was measured in a spike before this plan was
written, not assumed** — a stated number came from a real local run on
this machine, not documentation or general model knowledge.

## The two-sided task, and why they're architected differently

Two LLM-shaped jobs, **not equally reliable** with prompt-only control —
measured with Qwen2.5-7B-Instruct, not assumed:

1. **Generating the AI's own turn**, constrained to the learner's known
   vocabulary. **Measured unreliable — never build this as live-prompted
   generation.** First-pass compliance was ~85-90% with an explicit
   system-prompt allowlist, and the same words leaked through regardless
   of fix attempted: growing the allowed vocabulary 80→600 words did
   **not** improve it (stayed 78-85% — the leaks are stylistic
   preference, e.g. "คุย" over the allowed "พูด", not a coverage gap);
   explicitly **banning the offending word and regenerating made things
   worse** (one prompt was byte-identical across 3 "retries" — greedy
   decoding ignored the ban entirely; another degraded into the model
   breaking character and apologizing in Thai, introducing new
   violations); independent resampling (different seeds, no banning)
   was **0/5 clean** on both prompts tested, and separately produced a
   mid-sentence switch into **Chinese** once and **Arabic** once — a
   real, recurring failure mode. **Conclusion, acted on in phase 2**: the AI's own
   turns come from a **pre-generated, filtered, human-reviewable content
   bank** (shape of `sentences.json`), never generated live.

2. **Judging the learner's freeform spoken reply.** **Measured
   reliable — the one place live LLM generation is used.** Greedy
   decoding, ~500-800ms/judgment. 8/8 hand-checked cases got the correct
   verdict, including nuances a keyword-match would miss ("right words,
   scrambled order" failed; "terse but correct" passed; "I don't know"
   passed as valid despite dodging the question; off-topic failed).
   This asymmetry — bad at constrained *generation*, good at *judgment*
   — is why the two jobs use different mechanisms; don't conflate them.

## The three local models

- **STT — `faster-whisper` large-v3, GPU float16.** ~1.1s to transcribe
  19s of audio, warm. **Not streaming** (Whisper has no native
  incremental decoding — a chunked-rebuffer hack was considered and
  rejected, see below). Architecture: **VAD-triggered single-shot
  transcription** — detect end-of-utterance, transcribe once. Simpler
  and more accurate than a growing partial buffer for a turn-based UI.
- **Judge/generation LLM — `Qwen/Qwen2.5-7B-Instruct`, bf16, GPU.**
  Chosen over Llama-family for materially better Thai fluency at
  comparable size. ~200-800ms/generation. `AutoModelForCausalLM` +
  `AutoTokenizer.apply_chat_template` — **`transformers` 5.x returns a
  `BatchEncoding` dict from `apply_chat_template(...,
  return_tensors="pt")`, not a bare tensor**: call
  `model.generate(**inputs, ...)`. Re-check if pinning a different
  version.
- **TTS — ThonburianTTS** (`biodatlab/thonburian-tts` on GitHub,
  weights `biodatlab/ThonburianTTS` on HF), F5-TTS-based, built for
  pronunciation accuracy, used in **voice-cloning mode** (short
  reference clip + its transcript). ~330-500ms warm. Chosen over
  `facebook/mms-tts-tha` (generic VITS, faster but flatter — user's own
  verdict: "1 and 4 are usable... 4 is better") and `pythaitts`'s
  bundled voices ("completely useless" — never ship those). **Packaging
  bug**: `pip install git+.../biodatlab/thonburian-tts.git` installs
  metadata only — `flowtts/` has no `__init__.py`, so
  `find_packages()` omits it and `import flowtts` fails. Vendor it
  instead: add the missing `__init__.py`, carry upstream `LICENSE`
  (MIT), record the commit SHA.
  Weights license: **CC-BY-NC-SA (non-commercial)** — fine here,
  reconsider before commercial/distributed use. Real API (per the
  repo's own `f5tts_thai_example.py`, more current than its README):
  `flowtts.inference.FlowTTSPipeline(model_config, audio_config)`,
  called as `pipeline(text=..., ref_voice=<wav path>, ref_text=<its
  transcript>, output_file=...)`. Reference clip: a ~6s trim of a
  personal recording, transcribed once offline with Whisper — reuse the
  same clip + transcript.

## Rejected alternatives — do not re-propose without new evidence

- **Live-prompted generation + validate/retry for the AI's own turns**:
  the plan going in, rejected after measurement — retries don't
  converge, resampling doesn't either. Replaced by phase 2's
  pre-generated, filtered content bank.
- **Streaming STT** (`whisper_streaming`-style chunked re-transcription):
  real complexity and a hallucination-prone unstable tail, for a
  turn-based UI with no need for word-by-word partials. VAD-triggered
  single-shot transcription is simpler and more accurate.
- **`facebook/mms-tts-tha` / `pythaitts` as the shipped voice**: both
  work and are fast, but lost the side-by-side listening comparison
  against ThonburianTTS. Keep MMS-TTS as a possible fast fallback if
  latency ever gets tight — not the default.
- **In-browser/WASM inference** (whisper.cpp-wasm, ONNX Runtime Web,
  WebLLM): rejected once the user confirmed a local backend is fine —
  the hardware (4090, 125GB RAM) makes a real GPU Python service both
  faster and simpler than three models in a browser sandbox.
- **A vocabulary-size threshold tuned to fix compliance**: measured not
  to work. Phase 3's gate is justified by content richness only — live
  generation for the AI's own turns isn't used past phase 1 anyway.

## Repo orientation

- **Zero existing backend.** `src/` is 100% client-side TypeScript/React,
  Vite-built, deployed static. Only pre-existing Python:
  `scripts/enrich-vocabulary.py` (pip + `requirements.txt`, not a `uv`
  precedent — the new Python projects are `uv` by deliberate choice).
  This plan adds the first backend — local-only, unrelated to the
  GitHub Pages deploy, which can't reach `localhost` and must degrade
  to a clear "backend not running" state, never a silent failure.
- **Ports-and-adapters, strictly.** Every outside-world integration is
  a narrow `domain/ports/*.ts` interface (`CardRepository`,
  `LearnerStateRepository`, `NotificationPort`), one
  `infrastructure/` implementation, wired once in
  `AppContext.tsx` (flat `new Thing(deps)` calls, no DI container). The
  new backend call is the same shape — `ConversationPracticePort` +
  one HTTP-client adapter. **Reuse this pattern exactly.**
- **`src/presentation/hooks/useMicRecorder.ts`** exists on `origin/main`
  (PR #22) but **not on every local branch** — verified absent on
  `feat/consonant-class-color-coding`. Phase 1 execution must start
  from a checkout based on `origin/main`. `{state: idle|recording|
  stopped|denied|error, start, stop, reset, audioBlob}` — **reuse
  directly**. No fixed `mimeType`: bytes are whatever the browser
  defaults to (Chromium: `audio/webm;codecs=opus`) — the backend must
  decode that, not assume WAV (task 1.1). **Routing**: flat
  `<Route path="/x">` under a `HashRouter` (URLs are `#/conversation`).
- **Gating pattern to copy is the *idea*, not the code**:
  `GrammarLessonService.meetsPrerequisites` is **private** and not
  reusable. Phase 3's unlock check borrows only the shape (a threshold
  over graduated counts) as its own new pure function.
  `AppContextValue` has **no `grammar` member today** — exposing
  `GrammarService` there (plus a public learned-grammar-id accessor)
  is new wiring a task must own, not something already available.
- **Content-bank precedent**: `sentences.json` carries a per-entry
  `words: string[]` `SentenceService` filters on — phase 2's bank needs
  the same field. It lives at `backend/data/conversationStarters.json`,
  not under `src/`: its only reader is Python, and "never inside `src/`"
  applies to backend-owned data too.
- **Test harness**: `src/presentation/test-utils/renderWithApp.tsx`
  wires a full real `AppContextValue`. Extend with a stub
  `ConversationPracticePort`, same pattern as `game`/`lesson`/`review`.
  **Every service `AppContext.tsx` registers must also be registered
  here** — a subset silently diverges from production (called out in
  `plans/practice-mode-expansion/CONTEXT.md`).

## Quality gates

- **Frontend** (`src/`): `npm test` (`npm test -- <path>` scoped),
  `npx tsc -b`, `npx biome check .`.
- **Frontend e2e**: `npm run test:e2e` (Playwright) — first plan needing
  a *real* backend process for its specs; these get their own Playwright
  project, isolated from the app's existing e2e specs (task 1.4).
- **Backend** (`backend/`, new): `uv run pytest -m "not gpu"`,
  `uv run ruff check .`. **Never `npm test` on `backend/`** — separate
  Python project, own `pyproject.toml`/`uv.lock`.
- **GPU-dependent tests** are **not** in the default `pytest` run —
  slow, hardware-specific. Gate behind a registered `gpu` marker,
  skipped by default; each backend task's `verify` runs non-GPU tests
  only and states which ACs need manual checking against real models.

## Naming and modeling decisions

- Backend: `backend/` (repo root, sibling to `src/`), self-contained
  `uv`-managed Python project — never inside `src/`. Domain port
  `src/domain/ports/ConversationPracticePort.ts`; adapter
  `src/infrastructure/conversation/HttpConversationPracticeClient.ts`;
  domain types `src/domain/conversation/types.ts`; page
  `src/presentation/pages/ConversationPracticePage.tsx`.
- Backend is **single-process, single-GPU, synchronous per request** —
  no queue, no worker pool. YAGNI for a single-user tool, but **not
  FastAPI's default** (a `def` handler runs in its threadpool): built
  via `async def` + a lock around the model calls (task 1.1).
- Session state (phase 3): **in-memory dict keyed by session id**, not
  persisted. A restart loses the in-progress conversation, never SRS
  state (already entirely browser-side) — no backend persistence
  duplicating that.
- Gating thresholds (phase 3): `MIN_VOCAB_COUNT = 200`,
  `MIN_GRAMMAR_POINTS = 5`, named constants in one place. Starting
  defaults, easy to tune later.

## Trust boundary

New surface: the backend accepts **audio from the browser**, is
**reachable by any local origin** unless a task states a CORS/bind
decision, and returns **LLM-generated text** the frontend renders.
Full table in the plan README's Trust Boundary Inventory — read it
before writing any request handler in `backend/`.
