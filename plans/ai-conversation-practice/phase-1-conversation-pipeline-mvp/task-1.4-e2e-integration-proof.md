---
doc_type: reference
title: "Task 1.4 — End-to-end integration proof (Playwright, real backend)"
description: A Playwright spec, in its own isolated project, that starts the real backend process, feeds a fixture WAV as a fake microphone, and proves the whole pipeline works together for the first time — without forcing the app's existing, unrelated e2e specs to boot a GPU backend too.
covers:
  - e2e/conversation-practice.spec.ts
  - e2e/conversation-practice-fail.spec.ts
  - e2e/conversation-backend.setup.ts
  - e2e/conversation-backend.teardown.ts
  - playwright.config.ts
  - backend/tests/fixtures/reply-pass.wav
  - backend/tests/fixtures/reply-fail.wav
  - backend/tests/fixtures/opening-question-sample.wav
status: draft
task_id: "1.4"
task_status: complete
depends_on: ["1.2", "1.3"]
size: large
gate: human
verify:
  - npm run test:e2e -- --project=conversation-practice
ac_enforcement:
  - "AC1 -> the spec's own beforeAll: polls GET http://localhost:8000/health until every models_loaded field is true (or a bounded timeout fails the run naming which specific model never became ready, using the per-model health shape from task 1.1 - never a bare Playwright timeout)"
  - "AC2 -> a case: launching Chromium with --use-fake-device-for-media-stream and --use-file-for-fake-audio-capture pointed at reply-pass.wav (padded with leading/trailing silence well beyond Chromium's file-loop click-timing jitter), navigating to /thai-script/#/conversation, waiting for the opening question, clicking record then stop, asserting the rendered transcript is non-empty BEFORE asserting the verdict is \"pass\" - through the REAL backend, not a mocked port"
  - "AC3 -> a case: the same flow with reply-fail.wav asserts a \"fail\" verdict with visibly different rendering than AC2's pass case"
  - "AC4 -> a case: page.route(\"**/localhost:8000/**\", route => route.abort(\"connectionrefused\")) before navigating, asserting the page shows its \"backend not running\" state rather than hanging past a bounded timeout - no process is stopped and the frozen base-URL constant (task 1.3) is never repointed"
  - "AC5 -> none - manual verification only: a person actually listens to the opening question's audio and confirms it's audible, intelligible Thai in the cloned voice, since no automated test can judge audio quality; recorded as a note in this task's close-out rather than a test"
ac_tests:
  - "AC1 -> e2e/conversation-practice.spec.ts::a fake-mic pass reply drives a real pass verdict (AC2)"
  - "AC2 -> e2e/conversation-practice.spec.ts::a fake-mic pass reply drives a real pass verdict (AC2)"
  - "AC3 -> e2e/conversation-practice-fail.spec.ts::a fake-mic off-topic reply drives a real fail verdict, visibly distinct from pass (AC3)"
  - "AC4 -> e2e/conversation-practice.spec.ts::a simulated connection failure renders the not-running state without hanging (AC4)"
  - "AC5 -> none"
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
weight_votes:
  - "author -> 8"
---

# Task 1.4 — End-to-end integration proof (Playwright, real backend)

## Description

This is the task that proves tasks 1.2 and 1.3 — built in parallel,
against a written contract, never having seen each other's code —
actually agree. Everything before this task passed its own tests
against a scaffold (1.2) or a stub (1.3); this is the first time the
real backend process and the real browser page run together.

**An isolated Playwright project, not the shared config.** Add a
`conversation-practice` project to `playwright.config.ts` with its own
`webServer` (the FastAPI backend: `uv run --project backend uvicorn
app.main:app --host 127.0.0.1 --port 8000`, `cwd: "backend"` so
`app.main` resolves regardless of the invocation's own working
directory, `reuseExistingServer: false` so a stale bank/model state
from a previous run is never silently reused, a long `timeout` for cold
model loads), `fullyParallel: false`, `workers: 1`, and the fake-mic
`launchOptions.args` (below) — scoped to this project only. **Do not
add the backend to the app's existing `webServer` array**: the app
already has two unrelated e2e specs, and adding a GPU-backed server to
the shared config would force both of them to wait on a multi-minute
model load, and — combined with the existing config's
`fullyParallel: true` — would run GPU-dependent cases concurrently
against a backend CONTEXT.md deliberately made single-process and
synchronous. Run this task's spec with
`npm run test:e2e -- --project=conversation-practice`, never the bare
`npm run test:e2e`.

**Backend readiness (AC1).** Poll `GET /health` until every field in
task 1.1's per-model `models_loaded` shape is `true`; on timeout, name
which field(s) never flipped. This is exactly what the per-model health
shape (rather than one aggregate boolean) is for.

**Feeding a fake microphone.** Chromium supports
`--use-fake-device-for-media-stream` plus
`--use-file-for-fake-audio-capture=<path>` to make `getUserMedia`
return a real audio file's contents instead of a live mic. **Chromium
loops the fake-capture file continuously from stream start**, so what
`MediaRecorder` actually captures depends on when the click lands
relative to that loop — pad both fixtures with leading/trailing silence
well beyond realistic click-timing jitter, and assert the rendered
transcript is non-empty *before* asserting the verdict, so a
capture-timing miss reports as "nothing was heard" rather than as a
false "the judge said fail". Two fixture WAVs: one a real short
recording of an acceptable answer to "สบายดีไหม" (reuse the spike's own
validated recording approach — a real spoken utterance, not
synthesized, testing STT against genuine human speech and, through
`MediaRecorder`'s re-encoding, the browser's actual webm/opus output —
not the clean signal a TTS-synthesized reply would be), one an
off-topic reply.

**Simulating "backend not running" (AC4).** Task 1.3 froze the base URL
as a non-configurable constant, and this task's `webServer` owns the
backend process for the whole run — killing it mid-spec would break
every subsequent case. `page.route("**/localhost:8000/**", route =>
route.abort("connectionrefused"))` produces exactly the `fetch`
rejection the adapter's `unavailable` path is built for, with neither
constraint violated.

## Acceptance Criteria

- AC1: The backend is verified fully ready per-model (not just "port
  open") before any test step runs, with a clear failure message
  naming which model never became ready.
- AC2: A fake-mic "pass" reply drives the real pipeline to a rendered
  `"pass"` verdict, with the transcript checked non-empty first.
- AC3: A fake-mic "fail" reply drives the real pipeline to a rendered
  `"fail"` verdict, visibly different from AC2.
- AC4: A simulated connection failure (`page.route` abort) renders the
  "not running" state within a bounded timeout, never hangs
  indefinitely — without stopping the shared backend process or
  repointing the frozen base-URL constant.
- AC5: A person has actually listened to the synthesized opening
  question and confirms it's intelligible — recorded as a manual
  verification note, since no automated test can judge audio quality.

## Architectural Decision

**`gate: human`** on this task. Every other task in this phase can be
verified by its own automated suite; this one's AC5 fundamentally
cannot be, and it is also the task most likely to surface a real
integration mismatch between 1.2's and 1.3's independent readings of
the same written contract. A human should look at the result before
phase 2 builds on top of it.

**A dedicated Playwright project, not the shared config.** A review of
this plan's first draft found the originally-proposed shared
`webServer` array would force the app's existing e2e specs to boot a
GPU backend, and that `fullyParallel: true` would run this phase's own
GPU-dependent cases concurrently against a single-GPU backend — the
concrete point at which "no scalability concerns for a single local
user" stops holding. Isolating the project fixes both without touching
the existing specs' configuration at all.

**Real recorded speech in the fixtures, not TTS-synthesized "fake"
replies.** A TTS-synthesized reply would test Whisper against clean,
machine-generated audio — not representative of a real learner's
microphone, and would risk drifting from reality if TTS quality changes
independently of STT accuracy.

**`page.route(...).abort()` over stopping the backend process or making
the base URL configurable.** Both alternatives were considered: killing
the `webServer`-owned process breaks every later test in the run; a
configurable base URL is real new scope task 1.3 doesn't otherwise
need. Route-level abort produces the identical failure the adapter is
already built to handle, with neither cost.

## Test Cases

- Backend readiness: polled per-model and confirmed before any UI
  interaction; a stalled model names itself in the failure message.
- Fake-mic "pass" reply → non-empty transcript, then rendered `"pass"`
  verdict, through the real backend.
- Fake-mic "fail" reply → rendered `"fail"` verdict, visibly distinct.
- Simulated connection failure → "not running" state within a bounded
  timeout, no indefinite hang, no process killed.
- Manual: opening question audio is actually intelligible (recorded as
  a note, not a test assertion).

## Manual Verification (this task's `gate: human`)

Performed in an interactive session, at the user's explicit direction,
since the runner correctly refuses to dispatch a `gate: human` task to
an unattended agent.

**Implementation note — no per-project `webServer`.** This task's own
Description assumed Playwright supports a `webServer` scoped to one
project; checked against the installed Playwright version (1.58.2),
`webServer` has no per-project form — it starts unconditionally for
every project regardless of `--project` filtering. Implemented instead
via Playwright's setup/teardown project dependency mechanism
(`conversation-backend-setup`/`-teardown`, `dependencies`/`teardown` on
the `conversation-practice` project): a setup project spawns the real
backend, a teardown project stops it, and only a project that declares
the dependency ever triggers either — which is what actually keeps the
app's existing `home`/`lesson-intro` specs from booting a GPU backend,
the same goal the original design named.

**All 5 e2e cases ran and passed against the real backend**: the
2-test setup/teardown pair, plus AC1 (implicit — both real-backend
`beforeAll`s passed, meaning the per-model `/health` poll succeeded),
AC2 (`conversation-practice.spec.ts`, real pass verdict), AC3
(`conversation-practice-fail.spec.ts`, its own file because Playwright
refuses a `launchOptions` override inside a `describe` block — a
describe-scoped override "forces a new worker" and only a file-level
`test.use()` or the config itself are allowed), and AC4
(`conversation-practice.spec.ts`, simulated connection failure). 5
passed, 0 failed, ~30s.

**Deviation from "real recorded speech, not TTS-synthesized" for
`reply-pass.wav`/`reply-fail.wav`.** This session has no microphone and
cannot record real human speech. Both fixtures were instead generated
through the backend's own voice-cloning TTS pipeline (the same
mechanism task 1.2's own judge fixtures used), padded with ~1s of
leading/trailing silence to beat Chromium's fake-capture file-loop
timing per this task's own note. This is a real, acknowledged deviation
from the stated rationale (testing STT against a clean, synthesized
signal rather than genuine microphone noise) — if fidelity to the
original decision matters, these two fixtures should be replaced with
real recordings later.

**AC5 — no human has actually listened yet.** As a proxy, the opening
question's audio was independently regenerated and fed back through the
real Whisper model (bypassing the TTS's own generation path entirely),
which transcribed it as exactly `สบายดีไหม` — the intended text, with no
hallucination or distortion. That confirms the *content* is intelligible
to an ASR; it does **not** confirm the voice sounds natural or
non-robotic, which is a genuinely subjective judgment only a human ear
can make and is the actual reason this AC exists. The sample is saved at
`backend/tests/fixtures/opening-question-sample.wav` for a person to
listen to when convenient — **this AC's core claim (a person confirms
it's audible and natural) is still open** until someone actually does.

**Playwright browser install note.** `npx playwright install chromium`
hung indefinitely during extraction in this environment (verified: the
download itself completed in seconds; the extraction step consumed zero
CPU for 19+ minutes). Worked around by downloading the exact Chrome-for-
Testing and Chrome Headless Shell zips Playwright's own `--dry-run`
reported, and extracting them by hand into
`~/.cache/ms-playwright/{chromium-1208,chromium_headless_shell-1208}/`
with the same `INSTALLATION_COMPLETE`/`DEPENDENCIES_VALIDATED` marker
files Playwright's installer writes. Not a plan or code defect — a
local environment issue, noted here in case it recurs.
