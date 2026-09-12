---
run_id: "run-20260912T154629Z"
actor: "reviewer"
phase: "2"
task: null
round: 1
outcome: "complete"
audience: "human-reviewer"
summary_source: "model"
summarizer: "claude-haiku-4-5"
transcript: "transcripts/run-20260912T154629Z/phase-2__reviewer__reviewer__r1.jsonl"
entries: 2004
dropped_noise: 1941
elapsed_ms: 340979
files_touched: []
looks_complete: true
truncated: false
result_is_error: false
result_subtype: "success"
generated_at: "2026-09-12T17:07:18.713Z"
---

# reviewer 2 round 1

Run `run-20260912T154629Z`. This invocation **ended cleanly** (recorded outcome: `complete`).

## Outcome

**0 fixed in-round · 0 handed to a fixer · 1 awaiting a human · 1 left as-is**

### Awaiting a human

*the run cannot settle these; nothing proceeds until you answer*

- **F1** `[5/8]` — Task 2.3 shipped as `complete` with real, correct tests for all four of its own acceptance criteria (AC1-AC4 in backend/tests/test_bank.py and the …

### Left as-is

*seen, judged not worth acting on, and recorded so it is not re-found*

- **F2** `[2/1]` — `backend/app/schemas.py`'s `OpeningRequest` docstring (written by task 2.1) still says 'accepted and validated but not consumed — the opening pipel…

## What it tried that did NOT work, and what did that rule out

The agent investigated the GET compatibility shim at `/conversation/opening` as a misalignment issue, building a case that task 2.3 should have removed it when touching `test_pipeline.py`. Grep results for `.get("/conversation/opening")` ruled this out: `test_health.py` (phase 1, outside scope) still relies on it, so the shim can't be removed within phase 2 anyway. This recast it as legitimate inherited tech debt, not a defect.

It also flagged the stale docstring in `OpeningRequest` claiming `known_words` is "accepted but not consumed," but ruled out editing when it confirmed `schemas.py` isn't in the phase's declared covers list—so the file technically sits outside the reviewer's editing boundary despite being in task 2.1's individual covers.

## Where it changed its mind

The compat-shim investigation shifted from "2.3 should have cleaned this up" to "can't be removed, different task owns the blockers" when grep revealed which test files held the remaining GET calls and whose task scope they belonged to. This stopped the false pursuit of a cleanup that wouldn't help.

## What it established by running something

Verified tier-5 bank has exactly 8 entries via `python3 -c "import json; ... print(Counter(e['tier'] for e in d))"`. Traced `seedLearner.ts` fixture DTOs through `VocabCard.toDTO` and `SrsSchedule.toDTO` field definitions—confirmed the localStorage shape uses `{"srs": {...}}` with exact field mapping. Validated `gappy_known_words(150)` produces precisely 150 words by inspecting the TS loop's modulo-based index skipping. Confirmed `getLearnedThaiWords` counts any card as learned regardless of `learningStep` value, so fixture's `null` step is correct.

## What surprised it about this codebase

The phase README's covers list is narrower than the union of individual task covers (schemas.py in 2.1's covers but not phase-level). Domain code calls it "schedule" but the persistence layer DTO uses the field name "srs"—requires cross-checking infrastructure and domain layers to map terminology. Bank loads twice during startup (TTS warmup *inside* `load_models_into`, then again for `app.state.bank`) but the redundancy is harmless.

## What it knows now that is not written down

The storage DTO shape mapping (`{"srs": {...}}` field names) is implicit between `StorageCardRepository` and `SrsSchedule.toDTO`. The `gappy_known_words` algorithm's determinism (exactly N words, every Nth index skipped) is verified but not documented. Bank redundant-load is a micro-inefficiency left unflagged. Fixtures assume `learningStep: null` means graduated—correct but fragile if domain logic drifts.

## Did this work contain a side quest?

Tracing vocabCard DTO shape through `StorageCardRepository` → `VocabCard.toDTO` → `SrsSchedule.toDTO` across domain/infrastructure boundaries was multi-step. However, this is codebase-specific architecture unlikely to recur. **no reusable errand**

## What it did

- 2004 transcript entries over 341s (2026-09-12T17:01:37Z → 2026-09-12T17:07:15Z)
- tool calls: Bash ×20, StructuredOutput ×1

## How it ended

> {"ac_tests":[{"task_id":"2.1","criterion":"AC1","locator":"src/infrastructure/conversation/HttpConversationPracticeClient.test.ts::accepts a realistic 600-word known-word snapshot without truncating it","verdict":"valid"},{"task_id":"2.1","criterion":"AC2","locator":"src/presentation/pages/ConversationPracticePage.test.tsx::sends the learner's real learned-vocabulary set, not a placeholder list","…

## Last things it said

- Matches exactly. This confirms the fixture DTO shape is correct. Given the depth of verification already done, let me check one more area: whether `VocabularyLessonService.getLearnedEntries()` uses `learningStep === null` (graduated) as "learned," since seedLearner sets `learningStep: null`.
- That's enough confirmation. Now let me finalize the review with the ac_tests mapping and findings.

---

*A record of one agent invocation, for a reader who can see the diff but not*
*the reasoning behind it. Nothing here has been independently verified — where*
*a narrative is present it is model-written from the transcript at*
*`transcripts/run-20260912T154629Z/phase-2__reviewer__reviewer__r1.jsonl`.*


## Cost

| actor | invocations | output tok | cache read | wall | ~USD |
|---|---:|---:|---:|---:|---:|
| fixer | 3 | 62,491 | 9,626,253 | 33 min | 4.67 |
| executor | 1 | 44,297 | 5,474,185 | 14 min | 4.50 |
| reviewer | 2 | 52,944 | 2,475,891 | 11 min | 2.27 |
| summarizer | 9 | 13,499 | 71,190 | 3 min | 0.18 |
| side-quest | 3 | 0 | 0 | 0 min | 0.00 |
| **total** | 18 | 173,231 | 17,647,519 | 1.0 h | 11.62 |

cache hit **96.7%** — `cache_read / (input + cache_read + cache_write)`, the same definition `plan metrics` uses.

**3 invocation(s) reported no token figures** — a crash, a signal or a usage limit. They are counted as invocations and not as zero: this run cost more than the total above.

*USD is computed from a price table in this repository, not from anything the API returned. Cache reads are charged at a tenth of an input token and writes at 1.25x. Treat it as an order of magnitude, not an invoice.*