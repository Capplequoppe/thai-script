---
doc_type: reference
title: "Task 1.3 — Frontend port, adapter, and conversation practice page"
description: A ConversationPracticePort domain interface, an HTTP-client adapter implementing it against task 1.1's contract, a new /conversation page reusing useMicRecorder, and wiring into AppContext.tsx and App.tsx — including the non-2xx, timeout, and mic-permission states a review found the first draft left unhandled.
covers:
  - src/domain/ports/ConversationPracticePort.ts
  - src/domain/conversation/types.ts
  - src/infrastructure/conversation/HttpConversationPracticeClient.ts
  - src/infrastructure/conversation/HttpConversationPracticeClient.test.ts
  - src/presentation/pages/ConversationPracticePage.tsx
  - src/presentation/pages/ConversationPracticePage.test.tsx
  - src/presentation/context/AppContext.tsx
  - src/presentation/App.tsx
  - src/presentation/App.test.tsx
  - src/presentation/test-utils/renderWithApp.tsx
status: draft
task_id: "1.3"
task_status: complete
depends_on: ["1.1"]
size: large
verify:
  - npm test -- src/domain/conversation src/infrastructure/conversation src/presentation/pages/ConversationPracticePage src/presentation/App
  - npx tsc -b
  - npx biome check src/domain/conversation src/infrastructure/conversation src/presentation/pages/ConversationPracticePage.tsx
ac_enforcement:
  - "AC1 -> HttpConversationPracticeClient.test.ts: getOpening() decodes the response's own MIME type, mocked fetch"
  - "AC2 -> HttpConversationPracticeClient.test.ts: judgeReply() sends the blob's own MIME type, maps to the domain verdict shape"
  - "AC3 -> HttpConversationPracticeClient.test.ts: a rejecting fetch resolves to {status: \"unavailable\"}"
  - "AC4 -> ConversationPracticePage.test.tsx: unavailable state shows a clear message, no dead record control"
  - "AC5 -> ConversationPracticePage.test.tsx: question text renders, replay control works"
  - "AC6 -> ConversationPracticePage.test.tsx: mic stub drives useMicRecorder's real state machine, blob reaches judgeReply"
  - "AC7 -> ConversationPracticePage.test.tsx: pass/fail/unscored each render distinctly"
  - "AC8a -> App.test.tsx: the real <App/> route table reaches ConversationPracticePage at its real (hash) URL"
  - "AC8b -> AppContext.tsx: the real provider value carries a real HttpConversationPracticeClient instance"
  - "AC9 -> HttpConversationPracticeClient.test.ts: a non-2xx response maps to unavailable, never a fake ok"
  - "AC10 -> HttpConversationPracticeClient.test.ts: a never-settling fetch resolves to unavailable within the bounded timeout"
  - "AC11 -> ConversationPracticePage.test.tsx: mic-denied and generic-error each render a distinct message"
ac_tests:
  - "AC1 -> src/infrastructure/conversation/HttpConversationPracticeClient.test.ts::GETs the contracted opening endpoint and decodes the audio with the response's own MIME type"
  - "AC2 -> src/infrastructure/conversation/HttpConversationPracticeClient.test.ts::POSTs the contracted body including the recorded blob's own MIME type, and maps the response into the domain verdict shape"
  - "AC3 -> src/infrastructure/conversation/HttpConversationPracticeClient.test.ts::resolves both calls to unavailable when fetch rejects because the backend is not running"
  - "AC4 -> src/presentation/pages/ConversationPracticePage.test.tsx::says the backend is not running and offers no record control that would do nothing"
  - "AC5 -> src/presentation/pages/ConversationPracticePage.test.tsx::shows the Thai question text and replays its audio on demand"
  - "AC6 -> src/presentation/pages/ConversationPracticePage.test.tsx::drives the recorder from idle to stopped and hands the recorded blob to judgeReply"
  - "AC7 -> src/presentation/pages/ConversationPracticePage.test.tsx::renders the unscored verdict in its own words"
  - "AC9 -> src/infrastructure/conversation/HttpConversationPracticeClient.test.ts::treats a 500 response as unavailable even when its body is contract-shaped"
  - "AC10 -> src/infrastructure/conversation/HttpConversationPracticeClient.test.ts::resolves to unavailable within the bounded timeout when the request never settles"
  - "AC11 -> src/presentation/pages/ConversationPracticePage.test.tsx::shows a microphone-access message distinct from the backend-unavailable one when permission is denied"
red_proof:
  - "AC1 -> In HttpConversationPracticeClient.fetchJson, changed the request URL from `${CONVERSATION_BACKEND_BASE_URL}${path}` to `${CONVERSATION_BACKEND_BASE_URL}/api${path}`. Verified from t… [see red-proofs/]"
  - "AC2 -> In judgeReply, replaced `reply_audio_mime_type: replyAudio.type` with a hardcoded `\"audio/wav\"` — the mistake CONTEXT.md warns about, since MediaRecorder's format is browser-chosen.… [see red-proofs/]"
  - "AC3 -> Removed the `.catch(() => null)` on the in-flight request promise in fetchJson, so a rejecting fetch propagates. The `Caused by:` line is the mutant's own rejection surfacing throug… [see red-proofs/]"
  - "AC9 -> Removed the status check in fetchJson: `return response.ok ? await response.json() : null;` → `return await response.json();`. The test had to be strengthened first — with a FastAPI… [see red-proofs/]"
  - "AC10 -> Removed the deadline from the race in fetchJson (`Promise.race([attempt, deadline])` → `return await attempt;`), leaving only the AbortController, which a stubbed never-settling fet… [see red-proofs/]"
  - "AC4 -> Added `<Button onClick={start}>Record your reply</Button>` to the page's backend-unavailable branch — a record control that would silently do nothing, since there is no question to… [see red-proofs/]"
  - "AC5 -> Changed the replay handler's `new Audio(questionAudioUrl)` to `new Audio(\"\")`, so the button still exists and still plays, but plays the wrong thing. The `createdAudioUrls()` assertion fired."
  - "AC6 -> Changed the judge call from `judgeReply(questionText, audioBlob)` to `judgeReply(questionText, new Blob([], { type: \"audio/wav\" }))` — judgeReply is still called with a Blob, but no… [see red-proofs/]"
  - "AC7 -> Collapsed unscored into fail at the render site: `VERDICT_PRESENTATION[judgement.verdict]` → `VERDICT_PRESENTATION[judgement.verdict === \"unscored\" ? \"fail\" : judgement.verdict]`. W… [see red-proofs/]"
  - "AC11 -> Made the page's `state === \"denied\"` branch render BACKEND_UNAVAILABLE_MESSAGE instead of its own copy — exactly the conflation the criterion forbids. Both the positive and the nega… [see red-proofs/]"
lint:
  before: 14
  after: 14
  outcome: unsupported
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
weight_votes:
  - "author -> 13"
---

# Task 1.3 — Frontend port, adapter, and conversation practice page

## Description

Read CONTEXT.md's "Ports-and-adapters, strictly" and
`useMicRecorder`/routing bullets before starting — this task's job is
to fit into that existing shape exactly, not invent a new one.

**1. `src/domain/ports/ConversationPracticePort.ts`** — narrow, one
purpose, matching `NotificationPort`'s style:

```ts
export interface ConversationPracticePort {
  getOpening(): Promise<ConversationOpeningResult>;
  judgeReply(questionText: string, replyAudio: Blob): Promise<ConversationJudgeResult>;
}
```

**2. `src/domain/conversation/types.ts`** — the result types. **Model
every non-success outcome as a real, named member of the result type,
not an exception the UI must remember to catch**: network failure, a
non-2xx response, and a timeout all collapse to the same `"unavailable"`
member (AC9, AC10) — the caller doesn't need to distinguish *why* the
backend isn't answering, only *that* it isn't. The judge result also
carries the contract's third verdict:

```ts
type ConversationOpeningResult =
  | { status: "ok"; questionText: string; questionAudioUrl: string }
  | { status: "unavailable" };

type ConversationJudgeResult =
  | { status: "ok"; transcript: string; verdict: "pass" | "fail" | "unscored"; feedbackEn: string }
  | { status: "unavailable" };
```

**3. `src/infrastructure/conversation/HttpConversationPracticeClient.ts`**
implements the port against task 1.1's contract
(`docs/conversation-backend-api.md`) via `fetch`, base URL a module
constant (`http://localhost:8000` — not user-configurable in this
phase). Decodes the base64 audio (using the response's own
`*_audio_mime_type`) into a `blob:` URL for playback; encodes the
recorded reply `Blob` to base64 **and sends its own `.type` as
`reply_audio_mime_type`** — `useMicRecorder`'s blob has no fixed format
(CONTEXT.md), so the adapter must report whatever the browser actually
produced, never hardcode a MIME string. Every call:
- catches a network failure or a **timeout** (an `AbortController` on a
  named, generous deadline — a request that never settles must not hang
  the page forever) and resolves `{status: "unavailable"}`;
- checks `response.ok` **before** parsing the body — a `500`/`422`/`404`
  resolves normally from `fetch`'s own perspective, so an unchecked
  `.json()` call would either throw on an unexpected error-body shape or
  silently produce a bogus `{status: "ok"}` read off fields that aren't
  there. A non-2xx response is `{status: "unavailable"}` too (AC9) —
  never propagated as an exception, never coerced into a fake success.

**4. `src/presentation/pages/ConversationPracticePage.tsx`** — on
mount, calls `getOpening()`; while unavailable, shows a clear message
(no record button rendered as if it would do something — AC4). Once a
question loads, shows the Thai text and a 🔊 replay button (`new
Audio(url).play()`, the exact pattern `SentenceListeningChallenge`/
`ToneIdentificationChallenge` already use). A record button drives
`useMicRecorder`; on `state === "denied"`, render a distinct "microphone
access needed" message (never the same copy as backend-unavailable);
on `state === "error"`, a distinct generic message (AC11) — both are a
first-visit-common path, not an edge case to skip. On
`state === "stopped"`, calls `judgeReply(questionText, audioBlob)` and
renders one of three distinct outcomes for `"pass"` / `"fail"` /
`"unscored"` (AC7) — an unscored turn must never read as a pass or as
the learner's own mistake. No rating buttons, no SRS card, no history
entry in this phase.

**5. Wire it in**: `AppContext.tsx` gets one new line,
`const conversationPractice = new HttpConversationPracticeClient();`,
added to `AppContextValue` and its provider value. `App.tsx` gets
`<Route path="/conversation" element={<ConversationPracticePage />} />`
in the existing flat list (production URLs resolve as `#/conversation`
under the app's `HashRouter` — state this explicitly since task 1.4's
Playwright navigation needs the hash form). `renderWithApp.tsx` gets:
a stub `ConversationPracticePort` in its default harness value,
following the same pattern as every other service it registers; a
`StubMediaRecorder`/`navigator.mediaDevices.getUserMedia` fake
recording a fixed `Blob`, following the existing `StubAudio`/
`createdAudioUrls()` convention (neither exists in jsdom today — AC6
cannot pass without them); and a `URL.createObjectURL`/`revokeObjectURL`
stub (also absent from jsdom, needed by step 3's blob-URL construction).
Do all of this in the same task that adds the real wiring, not a
follow-up, per CONTEXT.md's warning about a harness silently diverging
from production.

**6. Proving the composition root — honestly.** `renderWithApp`
constructs its own fresh services over in-memory storage and only
imports the `AppContext` object itself; it cannot prove anything about
`AppContext.tsx`'s real provider value, and it wraps elements in its
own `MemoryRouter`, so it cannot prove anything about `App.tsx`'s real
route table either. Proving both real things needs two separate,
honestly-scoped checks (AC8a, AC8b) instead of one claim `renderWithApp`
was never able to support.

## Acceptance Criteria

- AC1: `getOpening()` calls the contracted endpoint and returns a
  decoded, typed opening result, using the response's declared MIME
  type.
- AC2: `judgeReply()` posts the contracted shape, including the blob's
  own MIME type, and maps the response into the domain verdict type
  (including `"unscored"`).
- AC3: A network failure on either call resolves to
  `{status: "unavailable"}`, never an uncaught rejection.
- AC4: The page shows a clear "backend not running" state when
  unavailable, with no record control that would silently do nothing.
- AC5: The opening question's text and audio-replay both render and
  work, using the existing replay-button convention.
- AC6: Recording drives `useMicRecorder`'s real state machine against a
  fake mic the test harness provides, and the resulting blob reaches
  `judgeReply`.
- AC7: `"pass"`, `"fail"`, and `"unscored"` each render distinctly.
- AC8a: The real `<App/>` route table reaches `ConversationPracticePage`
  at its real (hash) URL.
- AC8b: `AppContext.tsx`'s real provider value carries a real
  `HttpConversationPracticeClient` instance.
- AC9: A non-2xx response is treated as unavailable, never as a fake
  `"ok"` result or an unhandled exception.
- AC10: A request that never settles resolves to the unavailable state
  within a bounded timeout, never hangs indefinitely.
- AC11: Mic-denied and generic-recorder-error each render their own
  distinct message.

## Architectural Decision

**Every non-success path — network failure, non-2xx, timeout — collapses
to one `"unavailable"` member, not three.** The caller (the page) only
ever needs to know "the backend isn't answering," not diagnose why; a
richer error type would be unused detail carried through every future
consumer of the port. Revisit only if a future task needs to show a
different message for "backend down" versus "backend returned an
error" specifically.

**"Unavailable" is a member of the result union, not a thrown error.**
Considered and rejected: letting `fetch` rejections propagate and
catching them once at the page level with a try/catch. Rejected because
that pattern is exactly what makes "never asked" and "asked and failed"
indistinguishable if a future caller forgets the try/catch — encoding
it in the type makes the compiler enforce that every caller handles the
case, the same reasoning `plans/practice-mode-expansion/CONTEXT.md`
used for its own "the third state goes missing" lesson.

**AC8 split into AC8a/AC8b instead of one claim through
`renderWithApp`.** A review of this plan's first draft found the
original AC8 asserted something `renderWithApp` structurally cannot
prove (see Description, point 6) — it would have stayed green with
`AppContext.tsx` left entirely unedited. Two honestly-scoped checks
replace one that couldn't fail for the right reason.

**No SRS card, no history entry, no rating buttons in this phase.**
Every other practice surface in this app ends in a self-rating or an
auto-graded card that feeds the SRS scheduler; conversation practice's
judge verdict is a different kind of signal, and how it should feed
into SRS, if at all, is explicitly **not** decided by this task —
building that integration now would be guessing at a shape phase 3 is
better positioned to settle.

## Test Cases

- `getOpening`/`judgeReply`: correct request shape (including MIME
  type), correct response mapping, network failure / non-2xx / timeout
  all → `unavailable`.
- Page, unavailable: no working record control, clear message.
- Page, opening question loaded: text visible, replay button works.
- Page, mic denied vs. mic error vs. backend unavailable: three
  distinct messages.
- Page, recording → stop (fake mic): `judgeReply` called with a `Blob`.
- Page, pass vs. fail vs. unscored verdict: three distinct renderings.
- Real `<App/>`: `#/conversation` reaches the page.
- Real `AppContext.tsx`: provider value carries a real
  `HttpConversationPracticeClient`.
