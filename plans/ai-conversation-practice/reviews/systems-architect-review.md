# Systems Architect Review: ai-conversation-practice

## Executive Summary

This is a well-reasoned plan: the phase shape (seam → parallel pair →
integration proof) is the right structure for a first-ever backend, the
spike evidence is genuinely load-bearing, and almost every non-trivial
choice carries a rationale with rejected alternatives. The problems are
concentrated in exactly the place the structure makes most expensive —
**task 1.1's contract is incomplete in two ways that neither 1.2's nor
1.3's own tests can detect**, so both defects surface for the first time
at 1.4, which is the failure mode the seam exists to prevent. Beyond
that, three claims the plan makes about existing code do not survive
CodeGraph (`AppContextValue` has no `grammar` member; `meetsPrerequisites`
is private and does not read `VocabularyLessonService`; `renderWithApp`
cannot prove anything about `AppContext.tsx`), phase 2 has an
unacknowledged seam of its own between the bank's schema and the
selection logic that reads it, and the "single-process / single-GPU /
synchronous" decision is declared but never made operative anywhere in
the backend or the Playwright config.

## Plan-Level Findings

### Finding SA-1: No CORS policy or bind address anywhere in the contract — and the failure mode is indistinguishable from "backend not running"
- **Severity**: critical
- **Description**: The frontend runs at `http://localhost:5173` (Vite,
  confirmed in `playwright.config.ts`); the backend at
  `http://localhost:8000` (task 1.1). These are **different origins**, so
  every `fetch` in `HttpConversationPracticeClient` is a cross-origin
  request. Task 1.1 scaffolds FastAPI and fixes "every field name above
  is final for this phase" but never mentions `CORSMiddleware`, an allowed
  origin list, or the bind address. Neither 1.2 nor 1.3 owns it: 1.2's
  tests use `fastapi.testclient.TestClient` (in-process, no browser, no
  preflight) and 1.3's tests mock `global fetch` — **both suites pass
  green with no CORS configured at all**. The first execution where it
  matters is task 1.4.

  What makes this critical rather than merely missing is the *shape* of
  the failure. A blocked cross-origin `fetch` rejects exactly like a
  connection refusal, so task 1.3's AC3 catches it and returns
  `{status: "unavailable"}`, and the page renders task 1.3's AC4 "backend
  not running" message — **while the backend is running fine**. Task 1.4's
  AC4 (closed backend → "not running" state) would pass; AC2/AC3 would
  fail with a UI actively telling the operator the wrong thing.

  The trust-boundary side is the same omission read the other way. The
  plan README asserts the inventory is complete ("No row here reaches a
  shell, a file path built from network input, or `eval`"), but the
  inventory has no row for **the backend's own listening socket**. An
  unauthenticated HTTP service on a fixed localhost port, with no origin
  check, that drives multi-second GPU inference, is reachable by *any*
  page the user has open in the same browser while the backend runs. The
  two concrete second routes: (a) `allow_origins=["*"]` — the reflex fix
  — makes that fully exploitable for compute exhaustion and for reading
  the judge LLM's output cross-origin; (b) binding `0.0.0.0` instead of
  `127.0.0.1` exposes it to the LAN. Neither is decided anywhere in the
  plan, so both are live possibilities at implementation time.
- **Recommendation**: Add to task 1.1's contract, as named decisions with
  rationale: (1) `CORSMiddleware` with an explicit origin allowlist
  (`http://localhost:5173` plus whatever the Playwright run uses), never
  `*`; (2) uvicorn binds `127.0.0.1` explicitly, stated in the run command
  in both CONTEXT.md and task 1.4's `webServer` entry; (3) a
  trust-boundary row for "any local origin can reach the backend", naming
  the CORS allowlist and loopback bind as the mitigations. Then add an AC
  to 1.1 or 1.4 that distinguishes a CORS rejection from a connection
  refusal in the UI, so the two never render alike — this plan already
  applies exactly that never-asked/empty/failed discipline everywhere
  else (task 1.2 AC5, task 3.1's exhaustion decision) and this is the one
  place it is missing.
- **CodeGraph evidence**: `src/presentation/App.tsx:1-41` and
  `playwright.config.ts` confirm the frontend origin is
  `http://localhost:5173`; `docs/conversation-backend-api.md` does not
  exist yet, and no task file in the plan contains the string CORS,
  `allow_origins`, `127.0.0.1`, or `--host`.

### Finding SA-2: The contract specifies base64 **WAV** for the learner's reply, but `useMicRecorder` cannot produce WAV
- **Severity**: critical
- **Description**: Task 1.1 fixes the request body as
  `{ question_text: string, reply_audio_base64: string }` — "the learner's
  recorded reply, **same base64-WAV shape**". Task 1.3 implements the
  client as "encodes the recorded reply `Blob` to base64 for the request
  body" — a straight encode, no transcode. The `Blob` comes from
  `useMicRecorder`, which CONTEXT.md instructs the implementer to reuse
  directly.

  `useMicRecorder` builds its blob as
  `new Blob(chunksRef.current, { type: recorder.mimeType })` from a bare
  `new MediaRecorder(stream)`. No browser implements WAV as a
  `MediaRecorder` output; Chromium's default `mimeType` here is
  `audio/webm;codecs=opus`. So the field named `reply_audio_base64` and
  documented as WAV will, in every real run, carry WebM/Opus bytes.

  Task 1.2 reads the same contract independently and builds its fixtures
  and its decode path around WAV (AC2 explicitly validates the *opening*
  audio "via the stdlib `wave` module"; the judge fixtures are
  checked-in `.wav` files). Task 1.4's fake microphone
  (`--use-file-for-fake-audio-capture=reply-pass.wav`) does **not** change
  this: it substitutes the *capture device*, and `MediaRecorder` still
  re-encodes to WebM. So the e2e fixture being a `.wav` file actively
  disguises the mismatch when reading the plan.

  In practice `faster-whisper` will decode WebM/Opus via its av/ffmpeg
  backend and it may just work — which is worse, not better, because it
  means the contract document is permanently wrong and the next consumer
  (or a `wave`-module-based validation added to the judge path, mirroring
  AC2) breaks on it. This is precisely the class of defect the seam is
  supposed to eliminate, and 1.2 and 1.3 are forbidden from discovering it
  between themselves.
- **Recommendation**: Decide it in task 1.1, not at 1.4. Either (a) rename
  the field to `reply_audio_base64` with a companion
  `reply_audio_mime_type: string`, document that the browser sends
  whatever `MediaRecorder` produced, and state that the backend decodes
  via faster-whisper's own decoder rather than the `wave` module; or
  (b) keep WAV and make task 1.3 responsible for client-side transcoding
  (`AudioContext.decodeAudioData` → PCM → WAV), which is real work that
  must be in 1.3's description and `covers`, not implied. (a) is clearly
  the cheaper call. Either way, the opening-audio direction (backend →
  browser) should state its MIME type too, because task 1.3 needs it to
  construct the `Blob` it hands to `new Audio(blobUrl)`.
- **CodeGraph evidence**: `origin/main:src/presentation/hooks/useMicRecorder.ts`
  — `recorder.onstop` builds `new Blob(chunksRef.current, { type: recorder.mimeType })`
  from `new MediaRecorder(stream)` with no `mimeType` option and no
  transcode step anywhere in the hook.

### Finding SA-3: `AppContextValue` has no `grammar` member, and `GrammarService` exposes no learned-grammar-id accessor — two tasks assume both exist
- **Severity**: major
- **Description**: Two tasks state as settled fact that grammar data is
  already reachable the way vocabulary is:
  - Task 2.1: "`ConversationPracticePage` calls it with
    `vocab.getLearnedEntries().map(e => e.thai)` and **the equivalent
    learned grammar-point id list, both already available through
    `AppContext` exactly as every other page in this app reads them**."
  - Task 3.2: "Called from `Dashboard.tsx` with
    `vocab.getLearnedCount()`/**`grammar.getLearnedCount()`** (both
    already exist, read exactly like every other Dashboard count)".

  Neither is true. `AppContextValue` exposes
  `{state, refresh, lesson, review, dashboard, data, items, vocab, game,
  checkAchievements}` — **no `grammar`**. `grammarService` is a
  module-level constant in `AppContext.tsx` reachable only indirectly
  (through `StartLessonUseCase`, and through a
  `() => grammarService.getUnlockedGrammarPoints()` closure handed to
  `PlayGameUseCase`). `Dashboard.tsx` destructures
  `{ state, lesson, review, dashboard, vocab }`. And there is no public
  method returning learned grammar ids at all: `getLearnedCount()` exists
  (returns a number), but `getLearnedGrammarEntries()` is **private**.

  So both tasks require edits to `AppContext.tsx` (add `grammar` to the
  interface and the provider value), to `GrammarLessonService.ts` (make a
  learned-ids accessor public), **and** to `renderWithApp.tsx` — which
  CONTEXT.md itself flags as the thing that must never silently diverge.
  None of those three files appear in task 2.1's or task 3.2's `covers`.
  Task 3.2's `covers` is `ConversationUnlockService{,.test}`,
  `Dashboard{,.test}`, `ConversationPracticePage{,.test}` only.

  The consequence is not just bookkeeping: task 3.2 is declared
  independent of task 3.1 and parallel-eligible with it, and task 2.1
  independent of 2.2, on the strength of disjoint `covers` lists that are
  missing their most-contended file.
- **Recommendation**: Add a short task (or fold into 2.1, which needs it
  first) that does exactly one thing: expose `grammar: GrammarService` on
  `AppContextValue`, register it in `renderWithApp`'s `makeAppValue`, and
  add the public learned-grammar accessor 2.1 needs. Then correct 2.1's
  and 3.2's prose and `covers`, and re-check the parallelism claims in the
  phase-2 and phase-3 READMEs against the corrected lists.
- **CodeGraph evidence**: `src/presentation/context/AppContext.tsx:129-140`
  (`AppContextValue`, no `grammar`) and `:173-187` (provider value, no
  `grammar`); `src/presentation/pages/Dashboard.tsx:31`
  (`const { state, lesson, review, dashboard, vocab } = useApp();`);
  `src/domain/grammar/services/GrammarLessonService.ts:159`
  (`getLearnedCount()` public, returns `number`) and `:165`
  (`private getLearnedGrammarEntries()`);
  `src/presentation/test-utils/renderWithApp.tsx:666-689` (the harness's
  `AppContextValue` literal, no `grammar`).

### Finding SA-4: Task 1.3's AC8 cannot be enforced the way it says — `renderWithApp` builds its own services and never touches `AppContext.tsx`'s composition root
- **Severity**: major
- **Description**: Task 1.3's AC8 and its enforcement line claim that
  "`AppContext.tsx`'s real composition root constructs a real
  `HttpConversationPracticeClient` (not undefined/a missing wire)" is
  "proven through `renderWithApp`'s real `AppContext.Provider`". It
  cannot be. `renderWithApp` calls `makeAppValue`, which constructs a
  **completely fresh** set of services over `InMemoryStorage` and returns
  its own `AppContextValue` literal; the only thing it imports from
  `AppContext.tsx` is the `AppContext` object itself. A test passing
  through `renderWithApp` proves the *harness* wires the port, which is
  the exact production/harness divergence CONTEXT.md warns about — it
  would stay green with `AppContext.tsx` left entirely unedited.

  The second half of AC8 has the same problem: "navigating to
  `/conversation` via the real router (`App.tsx`'s route table)".
  `renderWithApp` wraps the passed element in its *own* `MemoryRouter`,
  and `App` renders its own `AppProvider` + `HashRouter`, so `<App/>`
  cannot be rendered inside `renderWithApp` to exercise the route table.
  (Note also that `App` uses `HashRouter`, so the production URL is
  `#/conversation` — worth stating where the plan says "add `/conversation`
  alongside the existing entries", since task 1.4's Playwright navigation
  needs the hash form.)
- **Recommendation**: Split AC8 into two ACs with honest enforcement:
  (1) the route exists and resolves — a test rendering `<App/>` directly
  (no `renderWithApp`) and asserting the page appears at `#/conversation`;
  (2) the composition root registers the port — a test importing
  `AppContext.tsx` and asserting the provider value carries an
  `HttpConversationPracticeClient` instance, or at minimum a type-level
  check. And keep the separate `renderWithApp` stub-registration
  requirement as its own AC, since that is a real and distinct obligation.
- **CodeGraph evidence**: `src/presentation/test-utils/renderWithApp.tsx:604-692`
  (`makeAppValue` constructs `new StorageCardRepository(new InMemoryStorage())`
  and every service fresh) and `:704-724` (`renderWithApp` merges that value
  into its own `MemoryRouter`); `src/presentation/App.tsx:17-41` (`App`
  owns `AppProvider` and `HashRouter`).

### Finding SA-5: Phase 2 declares "no seam task is needed" — but the bank schema task 2.2 produces cannot answer the question task 2.3 asks of it
- **Severity**: major
- **Description**: The phase-2 README justifies having no seam task on the
  grounds that "2.2's bank file format is fixed by 2.3's own read logic,
  which 2.2's task description states directly." The two do not actually
  line up.

  Task 2.2's AC2 fixes the entry shape as `{id, tier, thai, english}` —
  "the shape 2.3 reads". Task 2.3's `select_entry` must "find the largest
  tier whose **every word** is contained in `known_words`", and its AC1
  asserts "`select_entry` returns an entry whose **own words** are all
  within that set". There is no `words` field in the schema. The backend
  can only recover it by re-tokenizing `thai` with
  `pythainlp.word_tokenize(..., engine="newmm")` at request time — which
  means adding pythainlp (and its CRF model) as a **live backend
  dependency**, which appears in no `covers` list, no `pyproject.toml`
  description, and no architectural decision.

  This is doubly odd because the plan names `sentences.json` as the
  precedent for this file, and `sentences.json` carries exactly the field
  that is missing here: `"words": ["มา", "กิน", "กัน"]` alongside `thai`,
  for exactly this reason (`SentenceService.getUnlockedSentences` filters
  on `entry.words.every(word => learnedWords.has(word))`). The precedent
  solves the problem and the plan dropped the field.
- **Recommendation**: Add `words: string[]` to task 2.2's AC2 schema —
  it is a free byproduct, since 2.2 already tokenizes every candidate to
  run the compliance filter. Then 2.3's selection is a pure set operation
  with no tokenizer in the backend, matching `SentenceService` exactly.
  If phase 2 keeps "no seam task", state the full entry schema in the
  phase README (not only in 2.2's AC2) so the phase's own no-seam
  justification is checkable.
- **CodeGraph evidence**: `src/domain/sentence/data/sentences.json`
  (entries carry `words: [...]` beside `thai`);
  `src/domain/sentence/services/SentenceLessonService.ts:28-33`
  (`getUnlockedSentences` filters on `entry.words.every(...)` against the
  learned-word set — the precedent 2.3 should be copying).

### Finding SA-6: The tier model assumes a learner's known words are a rank-prefix of `vocabulary.json` — the app's own unlock logic guarantees they are not
- **Severity**: major
- **Description**: Task 2.2 defines a tier as "a rank-ordered slice of
  `vocabulary.json`, e.g. the first 80, 150, 250, 400, 600 words". Task
  2.3 selects "the largest tier whose every word is contained in
  `known_words`", and AC2 illustrates with "a known-word set that doesn't
  cleanly match any tier (e.g. **300 words**) selects the largest tier
  fully covered". That illustration only makes sense if a learner with
  300 known words necessarily knows the first 250 by rank.

  They do not. `VocabularyService.getUnlockedWords` gates each word on
  character and tone-rule mastery *in addition to* rank: a word inside the
  rank window is still filtered out by `isWordMastered(entry, chars, rules)`.
  A learner's learned set is therefore a rank-ordered but **gappy**
  subset, not a prefix. A learner with 300 learned words can easily be
  missing several words from the first 80 — in which case "the largest
  tier fully covered" is **no tier at all**, and `select_entry` falls
  through to AC3's empty-vocabulary path. A gate-crossing learner
  (200 words, phase 3) hitting the "not enough vocabulary yet" branch is
  a visible product bug, and nothing in the plan's tests would catch it:
  AC1/AC2 are unit tests over hand-built word sets, and the e2e fixtures
  in AC4 are described as "one tier-2-sized, one tier-4-sized", i.e.
  constructed as prefixes.
- **Recommendation**: Change the selection rule from "every word of the
  tier is known" to "every word **of the entry** is known" — which is
  what AC1 actually asserts, what `SentenceService.getUnlockedSentences`
  does, and what makes tiers a generation-time device rather than a
  runtime containment check. Then tier becomes a tie-breaker for
  difficulty, not a gate. If the tier-containment rule is kept
  deliberately, add an AC covering a realistic gappy learner set (seeded
  the way `renderWithApp`'s `graduatedVocab` fixtures seed one) and state
  the fallback.
- **CodeGraph evidence**: `src/domain/vocabulary/services/VocabularyLessonService.ts:128-154`
  (`getUnlockedWords` applies `isWordMastered(entry, chars, rules)` on top
  of the rank window, so learned words are not a rank prefix) and
  `:217-226` (`getLearnedEntries` returns that gappy set, rank-sorted).

### Finding SA-7: The "self-contained" backend reads a data file out of the frontend's source tree at runtime
- **Severity**: major
- **Description**: CONTEXT.md is emphatic that the backend is a
  "self-contained `uv`-managed Python project — never inside `src/`".
  Task 2.2 writes the generated bank to
  `src/domain/conversation/data/conversationStarters.json`, and task 2.3
  has `backend/app/bank.py` load that file at startup. Nothing in `src/`
  ever reads it — no frontend task in phase 2 or 3 imports it, and it is
  not in any frontend `covers` list as a read.

  So the file is placed in the frontend's domain tree purely by analogy
  with `sentences.json`, while its only consumer is the Python process.
  That inverts the ownership the whole plan is built on: `backend/` now
  depends on a path inside `src/domain/`, which means the backend cannot
  be started from another working directory, cannot be containerized or
  moved without a path fix, and a frontend refactor of
  `src/domain/conversation/` silently breaks the backend with no
  TypeScript or Python type error. It also makes the "1.2 and 1.3 are
  disjoint in `covers` (`backend/` vs. `src/`)" framing false from phase 2
  onward.
- **Recommendation**: Put the bank where its consumer is —
  `backend/data/conversationStarters.json` — and have task 2.2's generator
  write there. If the frontend is ever expected to read it (e.g. to show
  "questions you could be asked"), that is the moment to introduce a
  shared location with a stated decision, not before. Either way, task
  2.3 should state the path resolution explicitly (relative to the
  package, not to the process CWD) since task 1.4 starts uvicorn from the
  repo root while CONTEXT.md documents running it from `backend/`.
- **CodeGraph evidence**: No symbol in `src/` references
  `conversationStarters`; the file appears only in task 2.2's `covers`
  (as a write) and task 2.3's Description (as a Python read).

### Finding SA-8: The vendored `flowtts` tree is a real maintenance liability the plan under-declares — and it will break `ruff check backend`
- **Severity**: major
- **Description**: The workaround itself is sound: upstream's
  `setuptools.find_packages()` silently omits `flowtts/` for want of an
  `__init__.py`, so vendoring with the file added is a legitimate,
  well-evidenced fix, and CONTEXT.md documents the cause rather than just
  the symptom. Three things are missing around it:

  1. **`backend/vendor/` appears in no `covers` list.** Task 1.2's
     `covers` names seven files, none of them the vendored tree. A
     third-party source drop is the single largest artifact this task
     adds and the plan's own file inventory does not know about it.
  2. **It breaks the task's own verify commands.** Task 1.1 AC3 requires
     `ruff check backend` to pass with **zero findings**, and task 1.2's
     `verify` re-runs it. `ruff check backend` recurses into
     `backend/vendor/`, and a third-party research codebase passing a
     clean ruff run is not a realistic expectation. Nothing in the plan
     adds an `extend-exclude` for it.
  3. **No provenance pinning or divergence plan.** The plan says "vendor
     the `flowtts` source" without naming the upstream commit SHA to
     vendor from, without requiring upstream's `LICENSE` (MIT) to be
     carried alongside — which MIT requires for redistribution, and this
     is a public repository — and without stating what happens when
     upstream fixes the packaging bug. As written, the vendored copy will
     silently diverge with no record of what it was forked from.
- **Recommendation**: Add `backend/vendor/**` to task 1.2's `covers`; add
  `extend-exclude = ["vendor"]` to `backend/pyproject.toml`'s ruff config
  in **task 1.1** (so AC3 is honest before 1.2 lands the tree); require
  the vendor drop to carry upstream's `LICENSE` plus a short
  `backend/vendor/README.md` recording the upstream URL, the exact commit
  SHA, and the one-line delta (`added flowtts/__init__.py`). Note in
  CONTEXT.md's TTS bullet that the vendored copy is a fork of record, to
  be re-synced deliberately, not a transient workaround.

### Finding SA-9: "Single-process, synchronous per request" is declared as a decision but never made operative anywhere
- **Severity**: major
- **Description**: CONTEXT.md states "Backend is **single-process,
  single-GPU, synchronous per request** — no queue, no worker pool.
  Deliberate YAGNI for a single-user local tool." The YAGNI call is
  right. But no task says *how* the synchronous property is obtained, and
  FastAPI's defaults do not give it for free: a `def` handler is
  dispatched to an anyio worker threadpool (40 threads by default), so
  two overlapping requests genuinely execute concurrently — hitting one
  GPU with two inference calls and, from phase 3, mutating one shared
  session `dict` from two threads. An `async def` handler serializes, but
  then a multi-second blocking `model.generate()` stalls the event loop,
  which would make task 1.4's AC1 `/health` readiness poll unresponsive
  during any in-flight judge.

  Overlap is not hypothetical for this UI: task 3.3 has the page
  auto-advance `judge → next` in a loop, React 19 StrictMode
  double-invokes effects in development (the page calls `getOpening()` on
  mount), and a learner double-clicking record, or reloading mid-judge,
  produces two in-flight requests trivially.
- **Recommendation**: Make the decision explicit in task 1.1 (it belongs
  in the seam, since it constrains both sides): declare handlers `async
  def` and run the three blocking model calls through
  `anyio.to_thread.run_sync` guarded by a single module-level
  `asyncio.Lock`, so `/health` stays responsive while inference is
  serialized by construction. Add an AC — it is testable without a GPU
  using the fake model objects task 1.2 already builds: two concurrent
  judge requests never overlap inside the fake, and `/health` answers
  while one is in flight. Also state the phase-3 session store's bound
  (max sessions, or eviction on start) so an unbounded `POST
  /session/start` cannot grow the dict without limit — relevant given
  SA-1.

### Finding SA-10: Playwright's existing `fullyParallel: true` directly contradicts the single-GPU backend, and task 1.4 does not address it
- **Severity**: major
- **Description**: `playwright.config.ts` today sets
  `fullyParallel: true` and `workers: process.env.CI ? 1 : undefined`
  (= CPU count locally). Task 1.4 adds a spec that drives real GPU
  inference, task 2.3 extends it with two more real round trips, and
  task 3.3 extends it again with a three-turn session (three real
  record→judge→next cycles) plus a locked-state case. Under the existing
  config these cases run **in parallel against one single-process,
  single-GPU backend** — the concrete point at which the "no scalability
  concerns for a single local user" assumption stops holding, and it
  holds only through phase 1 as written. The expected symptom is
  VRAM pressure and timeouts that look like flakes, on the task whose
  whole purpose is to be the trustworthy integration signal.

  A second, smaller config issue in the same place:
  `webServer.reuseExistingServer: !process.env.CI` applied to the new
  backend entry will silently reuse a backend started before task 2.2
  regenerated the bank — and the bank is loaded once at startup (task
  2.3), so task 2.3's AC4 could assert against a stale in-memory bank.
- **Recommendation**: Task 1.4 should give the conversation spec its own
  Playwright project with `fullyParallel: false` and `workers: 1`, so the
  serialization constraint lives in the harness rather than in an
  assumption; state it as an architectural decision referencing
  CONTEXT.md's single-GPU call. Set `reuseExistingServer: false` on the
  backend `webServer` entry, or note the stale-bank risk in 2.3.
- **CodeGraph evidence**: `playwright.config.ts` — `fullyParallel: true`,
  `workers: process.env.CI ? 1 : undefined`, single `webServer` object
  with `reuseExistingServer: !process.env.CI`.

### Finding SA-11: Task 3.1's AC4 cannot establish the property it claims to prove
- **Severity**: major
- **Description**: AC4 states sessions "genuinely don't survive a process
  restart — proves the in-memory-only decision from CONTEXT.md holds in
  code, not just in the design doc". Its enforcement is: "restarting the
  backend process (**simulated by constructing a fresh session store in
  the test**) leaves no session reachable by its old id." A freshly
  constructed `dict` has no keys by definition; the assertion holds for
  any implementation, including one that also writes every session to
  disk. It is a test of the test's own setup, not of the system.
- **Recommendation**: Either drop AC4 (the property is a structural
  invariant better enforced by code review of `session.py` than by a
  test), or make it real: assert the app creates no files under the
  backend directory across a start/judge/next cycle, or assert
  `app.state`'s session store is the only reference and that
  `session.py` imports nothing from a persistence module. Stating it as a
  reviewer check, the way AC3 of task 2.2 handles its non-testable
  property, would be more honest than a tautological test.

### Finding SA-12: Task 2.2's reproducibility AC is enforced by a test that structurally cannot observe the thing it asserts
- **Severity**: major
- **Description**: AC4 requires "the script run twice against the same
  fixture inputs with a fixed seed produces byte-identical output", and
  its enforcement is "**a non-GPU test**". The generation step is the
  GPU-resident Qwen2.5-7B forward pass; a non-GPU test necessarily stubs
  it, so it can only prove that the deterministic *post-processing and
  serialization* around the model are stable — which is worth testing, but
  is not what AC4 says. Meanwhile the actual risk AC4 exists to cover
  (a re-run reshuffling every existing entry's id) lives in the part the
  test cannot see. Independently: byte-identical GPU output across runs
  is a strong claim even under greedy decoding; the spike's own
  observation that one prompt was "byte-identical across 3 retries" under
  greedy decoding supports it, but it is not guaranteed across driver or
  batching changes.
- **Recommendation**: Split it. AC4a (non-GPU): given a fixed candidate
  list, serialization and id assignment are deterministic and
  byte-identical — which is the property that actually protects existing
  ids. AC4b: ids are derived from stable content (e.g. a hash of the
  entry's Thai text), so a re-run that produces different candidates
  cannot renumber unchanged entries — this removes the dependence on
  model determinism entirely and is the more robust design. Keep any
  real-model reproducibility check as a GPU-marked test, clearly labelled
  as best-effort.

### Finding SA-13: Task 2.3's Architectural Decision is an unfilled `[Author: ...]` placeholder, and phase 3 makes the decision it defers largely unreachable
- **Severity**: major
- **Description**: Task 2.3's "Architectural Decision" section contains a
  bracketed instruction to the implementer rather than a decision, and
  AC3's enforcement defers with it ("this task decides which"). The plan
  is deliberate about this and says so, which is better than pretending —
  but it has two consequences worth resolving in the plan rather than at
  implementation time.

  First, the deferred choice is not local: if the implementer picks
  "an explicit 'not enough vocabulary yet' result the frontend can render
  distinctly", that is a **new frontend state** requiring changes to
  `ConversationJudgeResult`/`ConversationOpeningResult`, the page, and its
  tests — none of which are in any task's `covers`, and task 2.1 (the only
  frontend task in phase 2) is declared complete without it.

  Second, phase 3 largely deletes the question. Task 3.2 gates the entire
  mode behind `MIN_VOCAB_COUNT = 200` and enforces it at the page itself
  (AC6), so after phase 3 a zero-vocabulary learner never reaches the
  backend at all, and 2.3's empty-set branch becomes unreachable through
  the UI. Given SA-6 it is not dead code — a gappy 250-word learner can
  land there — but the plan's own framing ("a real product decision phase
  3's gating work will need this task's answer to build on") has the
  dependency backwards.
- **Recommendation**: Decide it in the plan: smallest-tier fallback,
  which costs nothing, needs no new frontend state, keeps the empty branch
  out of the UI contract, and composes correctly with phase 3's gate.
  Replace the placeholder with that decision plus the rejected
  alternative and its cost (a new frontend state in a task that does not
  own the frontend). If the "not enough vocabulary yet" result is wanted
  instead, add the frontend work to phase 2 explicitly.

### Finding SA-14: Phase 3 never retires `/conversation/opening` and `/conversation/judge`, leaving the port and the contract doc with two parallel ways to do one thing
- **Severity**: major
- **Description**: Task 3.1 adds `POST /conversation/session/start`
  (explicitly "same content shape as phase 2's `/conversation/opening`,
  now inside a session"), `POST /conversation/session/{id}/judge` ("same
  shape as task 1.1's `/conversation/judge`"), and `/next`. Task 3.3
  "extends" the port with `startSession`, `next`, and "a session-scoped
  `judgeReply`". No task says whether the non-session endpoints and the
  non-session port methods are removed. Task 3.3's `covers` includes the
  port and the client but its description is additive throughout.

  If they survive, the plan ends with a `ConversationPracticePort` of five
  methods where two are strictly superseded, a contract doc documenting
  two ways to get an opening question, and backend handlers that phase
  3's session model does not account for (`/conversation/judge` records
  into no session; SA-1's exposure applies to it too). For a plan whose
  stated discipline is "narrow, one purpose" ports, this is the one place
  the port is allowed to sprawl unexamined.
- **Recommendation**: State it in task 3.3: the session endpoints replace
  the standalone pair, both are deleted from `backend/app/main.py`,
  `docs/conversation-backend-api.md`, `ConversationPracticePort` and
  `HttpConversationPracticeClient`, and an AC asserts the port surface is
  exactly the session API. Add `backend/app/main.py` and
  `docs/conversation-backend-api.md` to 3.3's `covers` if so.

### Finding SA-15: `URL.createObjectURL` does not exist in jsdom, and the plan's blob URLs are never revoked
- **Severity**: minor
- **Description**: Task 1.3 has the adapter "decode the base64 audio into
  a `blob:` URL for playback", and AC1 asserts `getOpening()` "returns a
  decoded `{questionText, questionAudioUrl}`" in a vitest/jsdom unit test.
  jsdom does not implement `URL.createObjectURL`; the harness stubs
  `globalThis.Audio` (`StubAudio`) but nothing stubs `URL.createObjectURL`,
  and the only existing caller in the app (`SettingsPage.tsx:21`) has no
  test. AC1 as written will throw on the first call unless the task also
  adds a stub, which is unstated work in a shared test-utils file.
  Separately, nothing revokes the URLs: a task-3.3 session creates one per
  question and leaks them all for the page's lifetime.
- **Recommendation**: Name the `URL.createObjectURL` stub in task 1.3's
  description (alongside the `renderWithApp` stub-port registration it
  already calls for), and add `URL.revokeObjectURL` on question change to
  task 3.3's state machine, mirroring how `SentenceListeningChallenge`
  tears down its `audioRef` on item change.
- **CodeGraph evidence**: `src/presentation/test-utils/renderWithApp.tsx:116-156`
  (stubs `globalThis.Audio` only); `src/presentation/pages/SettingsPage.tsx:21`
  is the sole `createObjectURL` caller and has no test file.

### Finding SA-16: CONTEXT.md's description of the gating pattern to copy does not match the code
- **Severity**: minor
- **Description**: CONTEXT.md says: "`GrammarLessonService.meetsPrerequisites`
  ... gates a grammar point on `minVocabByClass`/`minTotalVocab`, **from
  `VocabularyLessonService`'s graduated-word count**. Phase 3's unlock
  check is the same shape: **a pure function over current counts**."
  Three corrections: `meetsPrerequisites` is **private**; it does not
  read `VocabularyLessonService` at all but computes its own counts from
  `cardRepo.findAll("vocab")` in `getMasteredVocabCounts()`; and it is not
  a function over counts — it takes a `GrammarEntry` and also checks
  `applicationTemplate.functionWords` membership. Relatedly, the exported
  class names are `GrammarService` and `VocabularyService` (in files named
  `GrammarLessonService.ts`/`VocabularyLessonService.ts`), while the plan
  uses the file names as class names throughout.

  Task 3.2's actual design — a genuinely pure
  `checkConversationUnlock(vocabCount, grammarCount)` — is *better* than
  what it is modelled on, so nothing needs redesigning. But the claim
  "matching `meetsPrerequisites`'s shape exactly" will mislead an
  implementer who opens that file expecting a reusable pure helper.
- **Recommendation**: Correct CONTEXT.md's bullet to say the pattern being
  copied is the *idea* (a threshold check over graduated-vocabulary
  counts) and that `meetsPrerequisites` itself is private and not
  reusable; fix the class-name references.
- **CodeGraph evidence**: `src/domain/grammar/services/GrammarLessonService.ts:11`
  (`export class GrammarService`), `:19-49` (`getMasteredVocabCounts`
  reads `this.cardRepo.findAll("vocab")` directly), `:51-74`
  (`private meetsPrerequisites(entry, vocabCounts, graduatedWords)`, which
  also checks `entry.applicationTemplate.functionWords`).

### Finding SA-17: `docs/` already exists
- **Severity**: minor
- **Description**: Task 1.1 instructs: "a new top-level `docs/` file —
  **this repo has no existing `docs/` directory; create it**." It does:
  `docs/plans/` holds ~35 design and plan documents plus
  `docs/plans/sentence-unlock-progression.md`. Harmless in itself, but
  it is a stated fact about the repo that is wrong, and it leaves open
  whether the API contract belongs at `docs/conversation-backend-api.md`
  or under the existing structure.
- **Recommendation**: Drop the parenthetical; confirm the path sits
  correctly beside `docs/plans/`.

### Finding SA-18: The `scripts/` precedent is pip + `requirements.txt`, not `uv` — and phase 2 adds a third Python toolchain
- **Severity**: minor
- **Description**: Task 2.2 places the generator at
  `scripts/generate-conversation-bank/` as "its own small `uv` project,
  sibling to the existing `scripts/enrich-vocabulary.py` pattern". The
  existing pattern is a flat script with `scripts/requirements.txt`
  (`pythainlp>=5.0`, `python-crfsuite>=0.9`) and a gitignored
  `scripts/.venv/` — pip, not uv. After this plan the repo has three
  Python environments (pip `scripts/`, uv `backend/`, uv
  `scripts/generate-conversation-bank/`), two of which need the same
  large model weights cached and one of which duplicates the pythainlp
  dependency already declared in `scripts/requirements.txt`.
- **Recommendation**: Either state the migration (the new project is uv
  on purpose, the old one stays pip, and here is why) or fold the
  generator into the existing `scripts/` environment. Also worth stating
  that the generator and the backend share a Hugging Face cache so the
  7B weights are not downloaded twice.
- **CodeGraph evidence**: `scripts/requirements.txt` and the gitignored
  `scripts/.venv/`; no `pyproject.toml` or `uv.lock` under `scripts/`.

### Finding SA-19: Task 1.4's backend `webServer` command will not import `app.main` from the repo root
- **Severity**: minor
- **Description**: Task 1.4 specifies `uv run --project backend uvicorn
  app.main:app --port 8000` "from the repo root", while CONTEXT.md and
  task 1.1 document running it "from `backend/`". `--project` selects the
  uv project; it does not change the working directory, so `app.main` is
  not on `sys.path` when uvicorn resolves it from the repo root.
- **Recommendation**: Add `cwd: "backend"` to the `webServer` entry (a
  supported Playwright option), or use `--directory backend`, and make
  the documented run command identical in CONTEXT.md, task 1.1 and task
  1.4 so all three agree.

### Finding SA-20: Personal voice recordings are checked into a public repository, and the trust-boundary inventory does not cover outbound exposure
- **Severity**: minor
- **Description**: `backend/assets/reference_clip.wav` is "a ~6s trim of a
  **personal recording**" used as the voice-cloning reference, and task
  1.4 adds `backend/tests/fixtures/reply-pass.wav` /
  `reply-fail.wav` as "a real spoken utterance, not synthesized". All
  three are committed to a repository that publicly deploys to GitHub
  Pages. The Trust Boundary Inventory covers inputs reaching sinks but
  has no row for content the plan itself publishes — a biometric-adjacent
  voice sample plus a working voice-cloning pipeline pointed at it.
- **Recommendation**: One line in the inventory noting the reference clip
  and speech fixtures are committed to a public repo with the speaker's
  knowledge, or keep them out of git (a documented local path / Git LFS /
  a gitignored `backend/assets/` with a setup note). The
  CC-BY-NC-SA weights question is already handled well in CONTEXT.md;
  this is the same class of concern on the data side.

### Finding SA-21: The deployed GitHub Pages build will show conversation practice as unlocked but permanently unreachable
- **Severity**: suggestion
- **Description**: CONTEXT.md correctly requires the feature to "degrade
  to a clear 'backend not running' state" on the deployed site, and task
  1.3's typed `unavailable` member delivers that. But after task 3.2, a
  learner past the threshold sees an **enabled** Dashboard tile on the
  public site, clicks it, and lands on a page that can never work —
  `https://…github.io` fetching `http://localhost:8000` is mixed content,
  blocked before the request is made. Functionally correct (the fetch
  rejects, the page says "not running"), experientially a dead end that
  the plan's gating work actively promotes.
- **Recommendation**: Consider making the tile's enabled state also
  require backend reachability (a cheap `/health` probe on Dashboard
  mount, cached), or hide the mode when `import.meta.env.PROD` and the
  origin is not localhost. A decision either way, recorded in task 3.2,
  is enough — this may well be acceptable for a personal tool.

### Finding SA-22: Task 1.2's AC3 asserts a specific verdict from a live LLM
- **Severity**: suggestion
- **Description**: AC3 asserts `verdict: "pass"` and `verdict: "fail"` for
  two fixtures "against the REAL judge LLM, not a stub". It is GPU-marked
  and run manually, and greedy decoding plus the spike's 8/8 hand-checked
  results make it reasonable — but it is the one AC in the plan whose
  pass/fail is a property of a model rather than of the code, and the same
  spike documented sampling-time instability in this model family.
- **Recommendation**: Split the automated part from the judgement part, as
  tasks 1.4 and 2.2 already do elsewhere: the GPU test asserts the
  response **parses** into a valid verdict and a non-empty `feedback_en`
  (a property of the code); the specific pass/fail correctness becomes a
  recorded manual check alongside AC5's listening check.

### Finding SA-23: The phase-3 session store has no bound or eviction
- **Severity**: minor
- **Description**: Task 3.1 defines `dict[str, SessionState]` on
  `app.state` with a `uuid4` key per `POST /conversation/session/start`.
  Nothing removes an entry — not on exhaustion, not on a timeout, not on
  a cap. Each entry holds a full known-vocabulary snapshot (hundreds of
  strings). For one local learner this is genuinely negligible and the
  YAGNI call is right; it becomes non-negligible only in combination with
  SA-1, where any local origin can call `/session/start` in a loop.
- **Recommendation**: One line in task 3.1's Architectural Decision:
  either a hard cap with oldest-first eviction, or an explicit statement
  that unbounded growth is accepted because the only caller is one local
  page and the process is restarted freely. Either is fine; silence is
  what makes it a finding.

### Finding SA-24: Task 1.2's AC5 and its listed test case describe two different failure sources
- **Severity**: minor
- **Description**: AC5 requires distinguishing "silence/empty audio" from
  "a genuine **transcription** failure". Its enforcement line says the
  same. But the Test Cases section's third non-GPU case is "a genuine
  downstream exception during judging (**e.g. the fake LLM raises**)" —
  a judge failure, not a transcription failure, and already largely
  covered by AC4's parse-failure branch. As written it is ambiguous
  whether the implementation needs two branches or three.
- **Recommendation**: State the three states explicitly in the
  description — empty transcript, transcription error, judge error — each
  with its own `feedback_en`, and align the test-case list to them. The
  plan's never-asked/empty/failed discipline is right; this is just the
  one place the wording drifts.

## Plan Quality Findings

| # | Check | Phase | Task | Severity | Issue | Recommendation |
|---|-------|-------|------|----------|-------|-----------------|
| SA-1 | 11 Trust boundary | 1 | 1.1, 1.4 | critical | Inventory claims completeness but has no row for the backend's listening socket; no CORS or bind-address decision; the failure renders as "backend not running" | Add CORS allowlist + loopback bind to 1.1's contract and a trust-boundary row; AC distinguishing CORS block from connection refusal |
| SA-2 | 6, 7 AC testability | 1 | 1.1, 1.2, 1.3 | critical | Contract fixes base64 **WAV**; `useMicRecorder` emits `audio/webm;codecs=opus`; neither side's tests can see the mismatch | Carry a MIME field, or make transcoding explicit work in 1.3 |
| SA-3 | 1 Code-shape claim | 2, 3 | 2.1, 3.2 | major | `AppContextValue` has no `grammar`; no public learned-grammar-id accessor; required edits absent from `covers` | Add the wiring task; correct prose and `covers`; re-check parallelism claims |
| SA-4 | 6, 8 AC enforcement | 1 | 1.3 | major | AC8 claims `renderWithApp` proves `AppContext.tsx`'s composition root and `App.tsx`'s route table; it builds its own value and its own router | Split into a real `<App/>` route test and a real composition-root assertion |
| SA-5 | 2 Seam soundness | 2 | 2.2, 2.3 | major | Bank schema `{id, tier, thai, english}` lacks the `words` array 2.3's selection needs; phase README claims no seam is required | Add `words: string[]` to 2.2's AC2; state the full schema in the phase README |
| SA-6 | 1 Domain model | 2 | 2.2, 2.3 | major | Tier containment assumes learned words are a rank prefix; `getUnlockedWords` guarantees a gappy set | Select on the entry's own words, not the tier's; add a gappy-learner AC |
| SA-7 | 5 Layering | 2 | 2.2, 2.3 | major | `backend/` reads `src/domain/conversation/data/` at runtime, contradicting "never inside `src/`" | Move the bank to `backend/data/`; state package-relative path resolution |
| SA-8 | 4, 10 Vendoring | 1 | 1.2 | major | `backend/vendor/` absent from `covers`, will fail `ruff check backend` (AC3), no upstream SHA or LICENSE | Add to `covers`, `extend-exclude` ruff in 1.1, require provenance + LICENSE |
| SA-9 | 3 YAGNI consistency | 1, 3 | 1.1, 1.2, 3.1 | major | "Synchronous per request" declared but never implemented; FastAPI `def` handlers run in a threadpool | Declare the mechanism in 1.1 (async + lock + `to_thread`); add a non-GPU concurrency AC |
| SA-10 | 3 Scalability | 1, 2, 3 | 1.4, 2.3, 3.3 | major | `fullyParallel: true` runs GPU e2e cases concurrently against a single-GPU backend; `reuseExistingServer` can serve a stale bank | Dedicated serial Playwright project; `reuseExistingServer: false` for the backend |
| SA-11 | 8 Test quality | 3 | 3.1 | major | AC4 "simulated by constructing a fresh session store" is tautological — a new dict has no keys | Drop it, or assert no on-disk writes / no persistence import |
| SA-12 | 6 AC testability | 2 | 2.2 | major | AC4 asserts GPU-generation reproducibility via a **non-GPU** test | Split into deterministic serialization + content-hashed ids; GPU check separate |
| SA-13 | 10 Decisions documented | 2 | 2.3 | major | Architectural Decision is an unfilled `[Author: …]` placeholder; the deferred choice can require unowned frontend work; phase 3's gate makes it near-unreachable | Decide smallest-tier fallback in the plan, with the rejected alternative and its cost |
| SA-14 | 9 YAGNI / port sprawl | 3 | 3.1, 3.3 | major | Phase 3 never retires `/conversation/opening` + `/conversation/judge`; port ends with five methods, two superseded | State the retirement in 3.3; AC on the final port surface |
| SA-15 | 6 AC testability | 1, 3 | 1.3, 3.3 | minor | `URL.createObjectURL` absent in jsdom and unstubbed; blob URLs never revoked | Name the stub in 1.3; revoke on question change in 3.3 |
| SA-16 | 1 Code-shape claim | — | CONTEXT.md | minor | `meetsPrerequisites` is private, reads `cardRepo` not `VocabularyLessonService`, and is not a count-only function; class names are `GrammarService`/`VocabularyService` | Correct the bullet and the class-name references |
| SA-17 | 1 Code-shape claim | 1 | 1.1 | minor | "this repo has no existing `docs/` directory" — it does (`docs/plans/`, ~35 files) | Drop the parenthetical |
| SA-18 | 1 Code-shape claim | 2 | 2.2 | minor | `scripts/` precedent is pip + `requirements.txt`, not uv; plan adds a third Python env duplicating pythainlp | State the toolchain decision; share the HF cache |
| SA-19 | 6 Verify command | 1 | 1.4 | minor | `uv run --project backend uvicorn app.main:app` from repo root cannot import `app.main` | Add `cwd: "backend"`; make the run command identical in all three documents |
| SA-20 | 11 Trust boundary | 1 | 1.2, 1.4 | minor | Personal voice clip + real speech fixtures committed to a public repo; no inventory row for published content | One inventory line, or keep the audio out of git |
| SA-21 | 7 Behavioral AC | 3 | 3.2 | suggestion | Deployed Pages build promotes an unlocked tile to a permanently unreachable page (mixed content) | Gate the tile on reachability, or hide in prod; record the decision |
| SA-22 | 8 Test quality | 1 | 1.2 | suggestion | AC3 asserts a specific live-LLM verdict — a model property, not a code property | Automated: it parses. Manual: it is correct |
| SA-23 | 3 YAGNI consistency | 3 | 3.1 | minor | Session store has no cap, TTL, or eviction | One line: accept unbounded growth explicitly, or cap it |
| SA-24 | 6 AC testability | 1 | 1.2 | minor | AC5 says "transcription failure"; its test case raises from the fake **LLM** | Name the three states explicitly and align the test list |

## Phase-by-Phase Review

### Phase 1 — Conversation pipeline, one fixed exchange, end to end

The phase structure is the strongest part of the plan. Seam → parallel
disjoint pair → integration proof is exactly right for a first backend,
the `covers` disjointness between 1.2 (`backend/`) and 1.3 (`src/`) is
genuine, and "would this phase stand alone?" is answered honestly. The
problem is that the seam is under-specified in two respects (SA-1, SA-2),
and both are invisible to every pre-1.4 test — which converts the phase's
cheapest-integration-failure design into an expensive one.

#### task-1.1-conversation-api-contract-and-skeleton.md: Conversation API contract + backend project skeleton
- **Status**: findings
- **Findings**: SA-1 (no CORS or bind-address decision in the contract that
  both sides build against; no trust-boundary row for the listening
  socket), SA-2 (base64-WAV request field the browser cannot produce),
  SA-9 (the sync-per-request property belongs here, since it constrains
  both consumers, and is stated nowhere), SA-8 (AC3's zero-finding
  `ruff check backend` needs the vendor exclusion configured in *this*
  task, before 1.2 lands the tree), SA-17 (`docs/` already exists).
  The two architectural decisions present (base64-in-JSON over multipart
  or WebSocket; a hand-written contract over generated OpenAPI) are both
  well argued with genuine rejected alternatives and revisit triggers —
  this is the standard the rest of the plan mostly meets. AC4 (malformed
  body → 422, never 500 or a hang) is a good, behavioral,
  externally-observable criterion.

#### task-1.2-backend-pipeline.md: Backend pipeline: STT, judge, TTS, wired to the contract
- **Status**: findings
- **Findings**: SA-8 (vendored `flowtts` outside `covers`, ruff conflict,
  no provenance), SA-9 (models on `app.state` is right, but nothing
  serializes access to them), SA-22 (AC3 asserts a live-model verdict),
  SA-24 (AC5 vs. its test case), SA-2 (the WAV decode path).
  The architectural decisions here are the best in the plan: loading at
  `lifespan` with the cold-vs-warm latency argument; `pipeline.py`
  functions taking loaded models as arguments *specifically* so AC4/AC5
  can run without a GPU — that is dependency inversion applied for a
  concrete, stated testing reason rather than as ceremony, and it is what
  makes the GPU/non-GPU split honest; and `judge_prompt.py` isolated both
  for tuning and as the file a security pass reads. The instruction to
  write the empty-transcript and parse-failure branches "from the start,
  not bolted on" is exactly right and rare to see stated.

#### task-1.3-frontend-port-adapter-page.md: Frontend port, adapter, and conversation practice page
- **Status**: findings
- **Findings**: SA-4 (AC8 is unenforceable as specified — the harness
  proves the harness), SA-2 (blob encoding without a format decision),
  SA-15 (`URL.createObjectURL` unstubbed in jsdom).
  Otherwise this task follows the existing architecture faithfully and I
  can confirm each claim: the port shape matches `NotificationPort`'s
  narrowness; the replay pattern named
  (`new Audio(url).play()`, 🔊 button) is verbatim what
  `SentenceListeningChallenge` and `ToneIdentificationChallenge` do;
  `useMicRecorder`'s described API (`{state, audioBlob, start, stop,
  reset}`) matches `origin/main` exactly. The "unavailable is a member of
  the result union, not a thrown error" decision is the best single call
  in the plan — the rationale (a second caller forgetting a try/catch is
  how the third state collapses) is concrete and cites the prior plan's
  own lesson. The "no SRS card, no history, no rating buttons" decision is
  a textbook YAGNI deferral with a stated reason for deferring rather
  than deciding. AC6's framing — assert the stub received a `Blob`, not
  assert on `useMicRecorder`'s internals — is exactly the right
  behavioral discipline.

#### task-1.4-e2e-integration-proof.md: End-to-end integration proof (Playwright, real backend)
- **Status**: findings
- **Findings**: SA-10 (`fullyParallel: true` against a single-GPU
  backend), SA-19 (`webServer` cwd), SA-1 (AC4 will pass for the wrong
  reason if CORS is unconfigured, masking AC2/AC3's failure), SA-20
  (committed speech fixtures), SA-2 (the `.wav` fixtures disguise the
  format mismatch rather than exercise it).
  The task is otherwise well-judged: `gate: human` is correctly applied
  and correctly argued; AC5 being explicitly *not* a test is the right
  call honestly made; "real recorded speech, not TTS-synthesized" has a
  genuine rationale (avoiding a clean-signal bias in what STT is measured
  against). Flagging the `webServer` readiness probe as "a real open
  question to resolve while writing this task, not decided here" is
  appropriate — it is a mechanism question, not an architecture one.

### Phase 2 — Personalized content, curated question bank by vocabulary tier

The phase's central decision — offline generation + automated filter +
human review, never live — is the plan's strongest architectural call,
and it is backed by measurement rather than preference. The weakness is
that the phase declares itself seam-free (SA-5) when 2.2 and 2.3 do share
a contract, and that the tier abstraction rests on a containment property
the app's own unlock logic does not provide (SA-6).

#### task-2.1-known-vocabulary-snapshot.md: Frontend sends a known-vocabulary/grammar snapshot
- **Status**: findings
- **Findings**: SA-3 (the learned-grammar-id list is not available through
  `AppContext`; `AppContext.tsx`, `GrammarLessonService.ts` and
  `renderWithApp.tsx` all need edits that are outside this task's
  `covers`), SA-13 (if 2.3 chooses the explicit "not enough vocabulary
  yet" result, the frontend state it needs belongs in this task and is
  not here).
  `vocab.getLearnedEntries().map(e => e.thai)` is correct and verified.
  The query-parameters-over-POST decision is well argued with a real
  bound (~5,000-word corpus) and a stated revisit trigger. AC3 (zero
  learned words is a real tested state, not assumed-never-happens) is
  precisely the kind of criterion that catches production bugs.

#### task-2.2-curated-question-bank.md: Offline generation + auto-filtered question bank
- **Status**: findings
- **Findings**: SA-5 (schema missing `words`, which this task already
  computes for free), SA-12 (non-GPU test cannot establish
  generation reproducibility), SA-7 (output path inside `src/` though the
  only consumer is Python), SA-18 (uv vs. the existing pip `scripts/`
  pattern).
  Both architectural decisions are strong: converting the spike's
  *measurement* tool into the production *filter* (with an explicit "do
  not write a second implementation") is genuine reuse, and reusing the
  spike's own tested tier sizes rather than round numbers inherits the
  evidence instead of regenerating assumptions. AC3 declaring naturalness
  a reviewer step rather than a test is the right kind of honesty.

#### task-2.3-backend-tiered-selection.md: Backend selects from the bank by learner tier
- **Status**: findings
- **Findings**: SA-13 (unfilled `[Author: …]` Architectural Decision with
  cross-task consequences), SA-6 (rank-prefix assumption), SA-5 (AC1
  asserts against "the entry's own words", a field the schema lacks),
  SA-7 (reads the bank out of `src/`), SA-10 (e2e parallelism and stale
  bank).
  The deterministic hash-based selection decision is well argued — "a
  different question every refresh would read as a bug" is a real user
  observation, and deferring variety to phase 3's session concept is
  correct sequencing. AC4 (two different fixtures → two different
  questions, through the real backend and the real bank) is a genuinely
  behavioral end-to-end criterion.

### Phase 3 — Multi-turn sessions + feature gating

The phase correctly identifies itself as the one where the feature
actually becomes what was asked for, and the 3.1/3.2 independence claim
is sound in the backend/frontend direction. The gap is that 3.2's
frontend dependency is larger than its `covers` admits (SA-3), and that
neither task addresses what happens to phase 1's now-superseded
endpoints (SA-14).

#### task-3.1-backend-session-state.md: Backend session state + a continue endpoint
- **Status**: findings
- **Findings**: SA-11 (AC4 is tautological), SA-14 (the standalone
  endpoints are never retired), SA-9 (a shared mutable session dict under
  FastAPI's default threadpool dispatch), SA-23 (no bound or eviction),
  SA-1 (the new session endpoints inherit the unaddressed socket
  exposure and are not in the inventory).
  Both architectural decisions are correct and well reasoned: an opaque
  server-generated id rather than a content-derived key (the collision
  argument for two learners with identical snapshots is real), and
  exhaustion as a named response field rather than an empty 200 —
  which correctly extends the never-asked/empty/failed discipline from
  task 1.2 to a new endpoint rather than re-deriving it. Extending
  `select_entry` with `exclude_ids` rather than duplicating tier-matching
  logic in `session.py` is the right factoring.

#### task-3.2-frontend-unlock-gate.md: Frontend unlock gate
- **Status**: findings
- **Findings**: SA-3 (`grammar.getLearnedCount()` is not reachable from
  `AppContext`; `AppContext.tsx` and `renderWithApp.tsx` are not in
  `covers`), SA-16 (the `meetsPrerequisites` pattern being "matched
  exactly" is not what that code is), SA-21 (an enabled tile on the
  deployed build leads to a permanently unavailable page).
  The rest is good. Enforcing the gate at both the Dashboard and the page
  independently — with the explicit statement that the tile is a
  discoverability affordance and not the boundary (AC6) — is the correct
  instinct, and the decision *not* to introduce a route-guard abstraction
  for one caller is well argued against the codebase's actual shape
  (I can confirm `App.tsx` has no wrapper routes: every entry is a bare
  `<Route>` under one `<Route element={<Layout />}>`). The reuse of
  `QuickActionCard`'s existing `disabled` prop is accurate — it already
  renders the `opacity-50` muted state — and `LearnableCallout` exists
  with the described shape. AC3's insistence that the boundary be
  inclusive and *stated* rather than left to whichever comparison
  operator someone reaches for is exactly the right level of pedantry.
  AC4's "names the actual gap (120/200), not a bare padlock" is a
  well-formed behavioral criterion.

#### task-3.3-multiturn-session-ui.md: Multi-turn session UI + end-to-end proof
- **Status**: findings
- **Findings**: SA-14 (the port is extended but never trimmed; end state
  has two ways to do one thing), SA-10 (three real GPU round trips per
  e2e case under a parallel runner), SA-15 (blob URLs accumulate across a
  session), SA-2 (every turn sends the mis-declared audio format).
  The state machine (`locked → loading → question → judging →
  question | summary`) is the right shape, and AC3 — a mid-session
  failure shows the established unavailable state **with the tally
  preserved** — is an excellent criterion: it is behavioral, it is
  specific, and it names the thing an implementer would most naturally
  get wrong. The decision to keep the tally frontend-only and out of the
  SRS scheduler, with the reason ("how a conversation session should feed
  SRS is a real product question this plan doesn't answer") stated rather
  than assumed, correctly carries task 1.3's deferral through to the end
  of the plan instead of quietly resolving it. `gate: human` and AC5's
  real-voice manual check are consistent with 1.4's precedent.

## Summary Statistics

- Tasks reviewed: 10 (1.1–1.4, 2.1–2.3, 3.1–3.3), plus the root README,
  CONTEXT.md, and three phase READMEs
- Findings by severity: critical 2, major 12, minor 8, suggestion 2
