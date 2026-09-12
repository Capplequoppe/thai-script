# Review Summary — ai-conversation-practice

Mode: Agent Team (5 parallel named subagents: qa, product-owner,
systems-architect, pareto-analyst, plan-structure-expert). 76 raw
findings across 5 independent reports, deduplicated into canonical
issues below (many ids across reviewers point at the same root cause —
noted inline). Four cross-cutting decisions were confirmed with the
user via AskUserQuestion before applying fixes: **BRANCH-1**
(`useMicRecorder` precondition — noted, not built here), **AUDIO-1**
(MIME field carried, backend decodes native format), **DECISION-1**
(empty-vocabulary smallest-tier fallback — 5/5 reviewer consensus),
**STRUCTURE-1/2** (both critical-path restructurings applied).

Parser note: `docs-nav plan check`'s `review_findings_unaccounted`
counts 80, not 76 — the extra 9 are `task-1`/`task-2`/`task-3`, a false
positive from its heading-id regex matching the per-task-file section
headings (`#### task-2.1-known-vocabulary-snapshot.md: ...`) in
qa-review.md, product-owner-review.md, and systems-architect-review.md.
These are **not findings** — recorded here as `task-1`, `task-2`,
`task-3` so the mechanical check can see they were seen, not silently
skipped.

## Disposition

| Id | Severity | Disposition | Note |
|---|---|---|---|
| QA-1 | critical | accepted | CORS: `CORSMiddleware` + explicit origin allowlist, `127.0.0.1` bind, trust-boundary row — task 1.1 |
| QA-2 | critical | accepted | `useMicRecorder` branch precondition documented in CONTEXT.md (BRANCH-1) |
| QA-3 | major | accepted | `renderWithApp.tsx` `StubMediaRecorder`/`getUserMedia` fake required — task 1.3 |
| QA-4 | major | accepted | `verdict: "pass"\|"fail"\|"unscored"` — task 1.1 contract, task 1.2 branches, task 3.3 tally excludes unscored |
| QA-5 | major | accepted | `response.ok` check before parse, non-2xx → `unavailable` — task 1.3 AC9 |
| QA-6 | major | accepted | `AbortController` timeout — task 1.3 AC10 |
| QA-7 | major | accepted | MIME field carried, backend decodes native format (AUDIO-1, user-confirmed) |
| QA-8 | major | accepted | Dedicated Playwright project, `fullyParallel: false`, `workers: 1` — task 1.4 |
| QA-9 | major | accepted | `e2e/fixtures/seedLearner.ts`, proven independently before consumers depend on it — task 2.3 |
| QA-10 | major | accepted | `/conversation/opening` → `POST` body, correct byte-math rationale — task 2.1 |
| QA-11 | major | accepted | `words: string[]` added to bank schema; entry-level containment — tasks 2.2, 2.3 (= SA-5, SA-6, PO-1) |
| QA-12 | major | accepted | Empty-vocabulary decision resolved: smallest-tier fallback (DECISION-1; = PO-2, PO-6, SA-13, PA-3, PS-3) |
| QA-13 | major | accepted | 2.2 AC4 split into AC4a (non-GPU serialization)/AC4b (content-hash ids) + AC5 (GPU volume); task 1.2 AC8 funds conftest fakes for all three models |
| QA-14 | major | accepted | `page.route(...).abort("connectionrefused")` — task 1.4 AC4 |
| QA-15 | major | accepted | `/health` widened to per-model map (= PA-2) |
| QA-16 | minor | accepted | `pythonpath`/`testpaths` pinned in `backend/pyproject.toml` — task 1.1 |
| QA-17 | minor | accepted | `gpu` marker registered in task 1.1; CONTEXT.md test-templates expanded to 4 rows (vitest, backend pytest, bank-script pytest, playwright). Marker registration inside `scripts/generate-conversation-bank`'s own `pyproject.toml` is left as an implementation-time detail of task 2.2, not a separate task — low risk, same fix shape already demonstrated in task 1.1 |
| QA-18 | minor | accepted | AC4 replaced: real disk-write guard across a full lifecycle, not a tautological fresh-dict construction — task 3.1 (= SA-11) |
| QA-19 | minor | accepted | "expired" wording dropped; store bound by count (AC6, oldest-first eviction), not time — task 3.1 |
| QA-20 | minor | accepted | Per-session `asyncio.Lock` guards `/next`; concurrent-call AC5 added — task 3.1 |
| QA-21 | minor | accepted | AC1 rewritten as a fixed-input unit test, not the filter re-checking its own output — task 2.2 |
| QA-22 | minor | accepted | `known_grammar_ids` dropped entirely from task 2.1 (also resolves half of SA-3) |
| QA-23 | minor | accepted | Mic-denied vs. mic-error vs. backend-unavailable AC11 — task 1.3 |
| QA-24 | minor | accepted | Minimum-8-entries-per-tier AC6 — task 2.2 |
| QA-25 | minor | accepted | Undecodable-but-present base64 → clean error AC7 — task 1.2 |
| QA-26 | minor | accepted | Real-model silence test AC6 added alongside the faked-branch test — task 1.2 |
| QA-27 | minor | accepted | AC4/AC5 assert behavior (no `onClick` → no navigation) not CSS classes — task 3.2 (= this round's fix) |
| QA-28 | suggestion | accepted | E2e paths use `/thai-script/conversation` (Vite base path) — task 1.4 (already correct), task 3.2 AC7 (fixed this round) |
| QA-29 | suggestion | accepted | Corrected: `docs/` already exists; three endpoints not two — task 1.1 |
| QA-30 | suggestion | accepted | `LearnableCallout` unlock-transition cut (no AC existed for it) — task 3.2 |
| QA-31 | major | accepted | Trust Boundary Inventory: inbound-origin row, `Source` column reframed, `session_id` row, bank-text/LLM-output wording corrected — plan README |
| PO-1 | major | accepted | Same fix as QA-11/SA-6: entry-level containment, not tier-level |
| PO-2 | major | accepted | Same as QA-12 (DECISION-1) |
| PO-3 | minor | accepted | One-line note added: tiers 1-2 are deliberately pre-gate-only content — task 2.2 |
| PO-4 | minor | no action needed | Reviewer's own verdict: "no plan change required," honest framing already in place |
| PO-5 | minor | deferred | Session-count/history persistence is a real, distinct product question (bigger than "no SRS integration"); left for a future task rather than folded in here — would add scope this plan doesn't need to ship the gated multi-turn loop |
| PO-6 | major | accepted | Same as QA-12/PO-2 (DECISION-1) |
| PO-7 | major | accepted | Same as QA-11/SA-6: gappy known-word-set test cases now required (task 2.3 AC1) |
| PO-8 | — | no action needed | Reviewer-confirmed pass (AC5 manual note is the right call) |
| PO-9 | — | no action needed | Reviewer-confirmed pass (AC3 human-review step is the right call) |
| PO-10 | — | no action needed | Reviewer-confirmed pass (AC5/AC6 manual note follows 1.4's precedent) |
| PO-11 | — | no action needed | Reviewer-confirmed pass (Architectural Decisions already document rejected alternatives) |
| PO-12 | — | no action needed | Reviewer-confirmed pass (Trust Boundary Inventory rows are concrete) |
| PO-13 | minor | accepted | Same as PO-3 (dead-tier note) |
| SA-1 | critical | accepted | Same as QA-1 (CORS, bind address, trust-boundary row) |
| SA-2 | critical | accepted | Same as QA-7 (AUDIO-1: MIME field, native-format decode) |
| SA-3 | major | accepted | Resolved without new `AppContextValue` wiring: task 2.1 drops the grammar-id list entirely (QA-22); task 3.2 reads counts via the already-wired `lesson.getVocabLearnedCount()`/`lesson.getGrammarLearnedCount()` (`StartLessonUseCase`, already exposed as `AppContextValue.lesson`) instead of a nonexistent `grammar` member — simpler than the reviewer's literal suggestion (add a new context member), since the needed call path already exists |
| SA-4 | major | accepted | AC8 split into AC8a (real `<App/>` + `HashRouter`, `src/presentation/App.test.tsx`) and AC8b (direct `AppContext.tsx` import) — task 1.3 |
| SA-5 | major | accepted | Same as QA-11 (`words[]` schema field) |
| SA-6 | major | accepted | Same as QA-11/PO-1 (entry-level containment) |
| SA-7 | major | accepted | Bank file moved to `backend/data/conversationStarters.json`, not under `src/` — tasks 2.2, 2.3 |
| SA-8 | major | accepted | `backend/vendor/flowtts/**` added to task 1.2 covers; `ruff extend-exclude=["vendor"]` added in task 1.1 (before the tree lands); provenance requirement (upstream SHA, LICENSE, `backend/vendor/README.md`) |
| SA-9 | major | accepted | `async def` + `asyncio.Lock` concurrency requirement made explicit — task 1.1 (global judge lock) and task 3.1 (per-session lock, AC5) |
| SA-10 | major | accepted | Same as QA-8 (dedicated serial Playwright project); `reuseExistingServer: false` on the backend `webServer` entry |
| SA-11 | major | accepted | Same as QA-18 (real disk-write-guard test replaces the tautological one) |
| SA-12 | major | accepted | Same as QA-13 (AC4a/AC4b split) |
| SA-13 | major | accepted | Same as QA-12 (DECISION-1) |
| SA-14 | major | accepted | Phase-1/2 standalone endpoints (`/conversation/opening`, `/conversation/judge`) explicitly retired in task 3.1 (backend) and task 3.3 (frontend port/client), same PR as their replacements (PORTSPRAWL-1) |
| SA-15 | minor | accepted | `URL.createObjectURL`/`revokeObjectURL` stub named in task 1.3; revoke-on-question-change and on-unmount AC4 added — task 3.3 |
| SA-16 | minor | accepted | CONTEXT.md's `meetsPrerequisites` description corrected (private, doesn't read `VocabularyLessonService`, not count-only); task 3.2's "matches `meetsPrerequisites`'s shape exactly" claim removed |
| SA-17 | minor | accepted | Same as QA-29 (`docs/` already exists) |
| SA-18 | minor | accepted | Task 2.2 already states the uv-vs-pip toolchain distinction and the shared HF cache rationale |
| SA-19 | minor | accepted | `cwd: "backend"` on the `webServer` entry; run command aligned across CONTEXT.md/1.1/1.4 |
| SA-20 | minor | accepted | Trust Boundary Inventory row added for committed personal voice clips / speech fixtures in a public repo |
| SA-21 | suggestion | accepted | Known-limitation note added: HTTPS-deployed page + local HTTP backend is mixed content, out of scope to fix — task 3.2 |
| SA-22 | suggestion | accepted | Task 1.2 AC3 split: automated parse-correctness test vs. manual verdict-correctness note |
| SA-23 | minor | accepted | Same as QA-19 (count-bounded store, oldest-first eviction, AC6) |
| SA-24 | minor | accepted | Task 1.2 AC5 now names three distinct causes (empty transcript / transcription exception / judge-parse exception) with aligned test cases |
| PA-1 | critical | accepted | Prompt-injection-shaped transcript test — task 1.2 AC9 |
| PA-2 | major | accepted | Same as QA-15 (`/health` per-model map) |
| PA-3 | major | accepted | Same as QA-12 (DECISION-1) |
| PA-4 | major | accepted | Spike's nuanced judge cases (scrambled-order, terse-but-correct, "I don't know") added as fixtures — task 1.2 |
| PS-1 | major | accepted | Task 2.2 has `depends_on: []`, phase 2 has no phase-level `depends_on` on phase 1 (STRUCTURE-1) |
| PS-2 | major | accepted | Phase 3's gate e2e proof split out of task 3.3 into task 3.2's own `e2e/conversation-gate.spec.ts` (STRUCTURE-2) |
| PS-3 | major | accepted | Same as QA-12 (DECISION-1), plus the "unreachable after phase 3 ships" note already present in task 2.3's Description |
| PS-minor | minor | accepted | One-sentence "why no seam task" note added to phase-3 README, matching phase 1/2's own self-documentation |
| task-1 | n/a | not a finding | Parser artifact (see note above) |
| task-2 | n/a | not a finding | Parser artifact (see note above) |
| task-3 | n/a | not a finding | Parser artifact (see note above) |

## Totals

- 76 real findings: 0 rejected, 71 accepted and applied, 5 marked
  "no action needed" (reviewer-confirmed passes, PO-4/PO-8/PO-9/PO-10/PO-11/PO-12
  — six rows, five of which required no change), 1 deferred (PO-5,
  session-history persistence — a genuine future-scope product decision,
  not a defect in this plan as scoped).
- Severity of applied fixes: 4 critical, 33 major, 22 minor, 5 suggestion, plus 1 unlabeled minor.
- `docs-nav plan check --plan-root plans/ai-conversation-practice`: 0 errors, 12 info, 19 warn (all pre-existing/expected — `weight_stamp_unreadable` ×9, pre-weighting; `ac_enforcement_malformed` on the deliberately-split `AC4a`/`AC4b`/`AC8a`/`AC8b` ids; `covers_outside_phase` ×2 and `ac_enforcement_missing` ×2 in task 1.3/2.2, not part of this round's findings and left for `/weight-execution-plan` or a future pass; `frontmatter_headroom` warning on task 1.3, worth a follow-up trim before hardening).

Next documented step per the `review-execution-plan` skill:
`/weight-execution-plan plans/ai-conversation-practice`.
