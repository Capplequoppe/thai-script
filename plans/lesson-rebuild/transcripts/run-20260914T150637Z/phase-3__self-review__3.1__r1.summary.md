---
run_id: "run-20260914T150637Z"
actor: "self-review"
phase: "3"
task: "3.1"
round: 1
outcome: "complete"
audience: "human-reviewer"
summary_source: "model"
summarizer: "claude-haiku-4-5"
transcript: "transcripts/run-20260914T150637Z/phase-3__self-review__3.1__r1.jsonl"
entries: 2106
dropped_noise: 1985
elapsed_ms: 706525
files_touched: []
looks_complete: true
truncated: false
result_is_error: false
result_subtype: "success"
generated_at: "2026-09-14T15:25:50.190Z"
---

# self-review 3.1 round 1

Run `run-20260914T150637Z`. This invocation **ended cleanly** (recorded outcome: `complete`).

## 1. What didn't work

Attempting to export `THAI_CONSONANT_BLOCK` and `classOf` for test use was abandoned; the agent switched to `getConsonant(leader)?.classType` and rebuilt the consonant block inline in tests instead. Widening the module's public API for test convenience was rejected.

Deriving leaders from symbols.ts's `consonants` export was considered, then abandoned as out-of-scope API expansion. The agent stayed within existing public exports.

Including อ in `UNSTRESSED_LEADERS` failed: testing `resolveLeadingConsonant("อ", "ย", "สวัสดี")` returned false, proving อ only works through the hardcoded silent-o branch, not the general unstressed path. This ruled out treating อ like other mid/high consonants and forced exclusion to match how ห was already handled.

## 2. Changes of mind

The agent planned to de-export `toneWithoutMark`, `isThaiConsonant`, and `isSonorant`, reasoning they were trivial wrappers or redundant with public alternatives. This was committed as a second refactor, but the record shows hesitation about `isSonorant` — it remained de-exported, but the reasoning wasn't elaborated.

SONORANTS shifted from curation to derivation after discovering soundType.ts already exported the same ten sonorants via `classifyConsonant`'s soundType bucket. Deriving proved strictly better: provably equivalent and protected against drift.

## 3. Proven by running

`resolveLeadingConsonant("อ", "ย", "สวัสดี")` returned false, disproving that อ behaves like other unstressed leaders.

Mutation test: reverting to the original curated leaders list (omitting ส, ถ, ข) caused "declares the same leaders it behaves as" to fail—confirming the test catches the rule-2 defect.

Mutation test: adding ผ to `FINAL_SOUNDS` caused the reconciliation test to fail, verifying the four-letter disagreement (ฃ, ฅ, ผ, ฝ) is intentional and caught.

Mutation test: dropping "tho-ro-s-sound" from `PROMOTED_SPECIAL_RULES` failed as expected, confirming the new test catches lost references.

Lint-changes output: violations dropped from 16 to 15; undocumented-export findings resolved; `candidatesAt` improved from 147 lines/28 complexity to 120/18.

## 4. Surprise about the codebase

`ThaiConsonant.finalSound` is free-text prose ("K-stop", "ng", "i (blends...)"), not a normalized phoneme. This meant the agent's `FINAL_SOUNDS` table is a hand-typed parallel normalization that could genuinely drift from its source, not a duplication of a machine-readable field.

symbols.ts already ships `ror-han`, `tho-ro-s-sound`, and `silent-o-before-yo` specialRules entries, yet syllableRules.ts rebuilt and used them without any linking back or acknowledgment in the module.

## 5. Not written anywhere

Why the four letters (ฃ, ฅ, ผ, ฝ) are correctly absent from `FINAL_SOUNDS` — documented only in git commit log, not in code comments. Obsolete letters and consonants that never actually close syllables in modern Thai.

The three-state contract for resource reads in `resolveWord`: resolved, unresolvable, and unanalysed. Malformed stored analyses silently collapse into disagreement rather than a fourth state, which is acceptable but implicit.

## 6. Side quest

Sampling how prose fields like `finalSound` are used downstream (ScriptCardGenerator, ScriptLessonService) to detect normalization vs. direct reference — required scripting a consonant block traversal to compare against FINAL_SOUNDS.

## What it did

- 2106 transcript entries over 707s (2026-09-14T15:14:03Z → 2026-09-14T15:25:49Z)
- tool calls: Bash ×44, StructuredOutput ×1

## How it ended

> {"task_id":"3.1","task_status":"complete","blocked_reason":null,"branch":"worktree-lesson-rebuild","commit":"a1389e57","files_changed":["src/domain/script/data/syllableRules.ts","src/domain/script/data/syllableRules.test.ts","src/domain/script/data/lessonSequence.ts","src/domain/script/data/symbols.ts","plans/lesson-rebuild/phase-3-hard-parts/task-3.1-syllable-rules.md"],"gates_resolved":true,"gat…

## Last things it said

- One pass done. **Four findings, all repaired; one reported and not fixed.** Every one was in the same family — a list or a link asserted by hand where the repository already held the thing it restates. **1. Comments falsified by the code.** Three. - `CLUSTER_SECOND_LETTERS`: doc said "second in a **true** cluster"; the constant is used, and tested, as the constraint on *every* pair in the inventory — false-sound and silent-second pairs all end in ร too. Reworded. - An orphan `/** Thai consonant block, ก … ฮ */` sitting above `PROMOTED_SPECIAL_RULES`, documenting a constant that is not there. R…

---

*A record of one agent invocation, for a reader who can see the diff but not*
*the reasoning behind it. Nothing here has been independently verified — where*
*a narrative is present it is model-written from the transcript at*
*`transcripts/run-20260914T150637Z/phase-3__self-review__3.1__r1.jsonl`.*


## Cost

| actor | invocations | output tok | cache read | wall | ~USD |
|---|---:|---:|---:|---:|---:|
| self-review | 1 | 50,478 | 5,733,098 | 12 min | 4.57 |
| **total** | 1 | 50,478 | 5,733,098 | 12 min | 4.57 |

cache hit **98.8%** — `cache_read / (input + cache_read + cache_write)`, the same definition `plan metrics` uses.

*USD is computed from a price table in this repository, not from anything the API returned. Cache reads are charged at a tenth of an input token and writes at 1.25x. Treat it as an order of magnitude, not an invoice.*