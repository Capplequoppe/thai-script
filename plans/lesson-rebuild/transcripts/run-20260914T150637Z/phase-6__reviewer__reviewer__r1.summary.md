---
run_id: "run-20260914T150637Z"
actor: "reviewer"
phase: "6"
task: null
round: 1
outcome: "complete"
audience: "human-reviewer"
summary_source: "model"
summarizer: "claude-haiku-4-5"
transcript: "transcripts/run-20260914T150637Z/phase-6__reviewer__reviewer__r1.jsonl"
entries: 1932
dropped_noise: 1793
elapsed_ms: 509441
files_touched: ["src/presentation/components/organisms/LessonIntro.tsx", "src/presentation/pages/LessonPage.test.tsx"]
looks_complete: true
truncated: false
result_is_error: false
result_subtype: "success"
generated_at: "2026-09-14T19:03:23.827Z"
---

# reviewer 6 round 1

Run `run-20260914T150637Z`. This invocation **ended cleanly** (recorded outcome: `complete`).

## Outcome

**1 fixed in-round · 1 handed to a fixer · 0 awaiting a human**

### Handed to a fixer

*a fixer invocation will attempt these next*

- **F1** `[7/1]` — LessonPage.tsx/CatchUpPage.tsx had used the legacy-number lookup (`lessonEntryByNumber`) against a value that is actually the URL's 1-based positio…

### Fixed in this round

*already repaired and committed by the reviewer itself*

- **F2** `[2/1]` — `LessonIntro.tsx` still gated `deckPhase` on `content.kind === "deck" && !deckDone`, a leftover from when `LessonContent` was a two-arm union; afte…

## What it tried that did NOT work, and what that ruled out

Attempted a LessonPage test fixture for position 15 with incomplete deck structure. The test initially failed validation because the deck's steps array lacked a `retrieval` step; fixing the fixture resolved it. This ruled out any assumption that minimal deck stubs would validate.

## Where it changed its mind, and what changed it

Initial confusion about scope: suspected the lesson resequencing (consonants, tone marks, numerals shifted across positions 15–19) was part of task 6.2. Running `git log --oneline -15 -- src/domain/script/data/symbols.ts` revealed the resequencing belonged to task 4.3 (already reviewed). Later suspected priority-value changes in the same file were 6.2 work; `git log -S"priority: 6," -- src/domain/script/data/symbols.ts` showed they came from task 4.1 (symbolPriority derivation). Both discoveries narrowed actual 6.2 scope to videoUrl removal and the lessonEntryByNumber fix only.

## What it established by RUNNING something

**Red proof via reversion:** Manually reverted `lessonEntryByPosition(num)` back to `lessonEntryByNumber(num)` in LessonPage.tsx and ran the test, producing `"Lesson not found"` error. Restored the fix and test passed. Quote: `"Confirmed genuine red proof — reverting the fix reproduces exactly the bug I diagnosed."`

**Green coverage:** Test suite: `"All 615 tests pass (614 existing + 1 new)."`  
Build gate: `npm run build` completed successfully.  
Biome formatting: 5 pre-existing warnings unrelated to touched files.

## What surprised it about this codebase

The routing parameter (URL `/:lessonNumber`) is actually 1-based position, not legacyNumber. The old `lessonEntryByNumber` lookup follows a different numbering scheme that diverges from position at lesson 15 (unwritten-vowels has position 15 but legacyNumber 26). This means positions 15–19 were silently broken under the old code despite summaries resolving fine — the fix addresses an asymmetry where `getLessonSummary(num)` correctly used position-based `entryAt(num)` but content resolution used legacy numbering. No existing test caught this divergence; the e2e lesson-intro.spec.ts risk mentioned in CONTEXT.md was already handled in an earlier phase.

## What it knows now that is not written down anywhere

Position-vs-legacyNumber divergence starts exactly at lesson 15 (lesson-unwritten-vowels). Positions 1–14 map identically to legacyNumbers; positions 15–19 use completely different legacyNumbers (26, 29, 27, 28, unknown). Using lessonEntryByNumber after position 14 returns "undeclared" even when summaries resolve correctly — this is the silent failure the regression test now prevents.

## Reusable errand

No reusable errand — the position-vs-number mapping is a one-time discovery tied to this specific artifact state, not a recurring diagnostic pattern.

## What it did

- 1932 transcript entries over 509s (2026-09-14T18:54:53Z → 2026-09-14T19:03:22Z)
- tool calls: Bash ×35, Read ×7, Edit ×2, Write ×2, StructuredOutput ×1

### Files it wrote or edited

- `src/presentation/components/organisms/LessonIntro.tsx`
- `src/presentation/pages/LessonPage.test.tsx`

## How it ended

> {"findings":[{"id":"F1","message":"LessonPage.tsx/CatchUpPage.tsx had used the legacy-number lookup (`lessonEntryByNumber`) against a value that is actually the URL's 1-based position, which task 4.3's resequence made diverge from legacy number starting at position 15 — any lesson at position ≥15 (lesson-unwritten-vowels, lesson-tone-marks, lesson-clusters, lesson-leading-consonants, lesson-numera…

## Last things it said

- Good, this is solid pre-existing infra correctly reused. This confirms the export script's containment behavior (AC4) is sound and consistent with the generator. Now let's check the export script for a subtle issue: what happens for a lesson id passed via CLI that fails the charset check — does it get caught before any read?
- Good, `LessonPaths.under` is called first thing in `export()`, before any file read — matches AC4's charset-before-read requirement. This looks solid. Now let's check `_render` for a subtle bug: the `image` field per slide is optional (falls back to `_blank_frame`), but what about a slide entirely missing `audio`? Already handled via `_slide_audio_track([])`. Let's check `resolve_slide_assets` for slides array validation edge cases.
- Clean. Let's do a final full check of decommission.test.ts's AC3 canary and confirm the whole `src` tree is genuinely clean (already done via test, but let's double-check with a broader net including `.json`/`.md` under src just in case, since the test only checks `.ts`/`.tsx`).
- Only the test file itself (which references the token by construction, not literally). Good — AC3 fully verified. Now let's finalize by re-running the full task 6.2 verify suite once more to be safe after my edits.
- All gates green. Now compiling the final structured output.

---

*A record of one agent invocation, for a reader who can see the diff but not*
*the reasoning behind it. Nothing here has been independently verified — where*
*a narrative is present it is model-written from the transcript at*
*`transcripts/run-20260914T150637Z/phase-6__reviewer__reviewer__r1.jsonl`.*


## Cost

| actor | invocations | output tok | cache read | wall | ~USD |
|---|---:|---:|---:|---:|---:|
| executor | 8 | 663,469 | 120,378,826 | 2.6 h | 104.15 |
| self-review | 8 | 186,874 | 35,241,721 | 44 min | 21.93 |
| reviewer | 5 | 75,174 | 13,436,732 | 18 min | 7.51 |
| fixer | 2 | 9,089 | 1,337,239 | 2 min | 0.87 |
| summarizer | 44 | 58,742 | 340,130 | 13 min | 0.74 |
| **total** | 67 | 993,348 | 170,734,648 | 3.9 h | 135.21 |

cache hit **98.3%** — `cache_read / (input + cache_read + cache_write)`, the same definition `plan metrics` uses.

*USD is computed from a price table in this repository, not from anything the API returned. Cache reads are charged at a tenth of an input token and writes at 1.25x. Treat it as an order of magnitude, not an invoice.*