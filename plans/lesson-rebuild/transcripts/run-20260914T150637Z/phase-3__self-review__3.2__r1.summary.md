---
run_id: "run-20260914T150637Z"
actor: "self-review"
phase: "3"
task: "3.2"
round: 1
outcome: "complete"
audience: "human-reviewer"
summary_source: "model"
summarizer: "claude-haiku-4-5"
transcript: "transcripts/run-20260914T150637Z/phase-3__self-review__3.2__r1.jsonl"
entries: 1004
dropped_noise: 954
elapsed_ms: 330735
files_touched: []
looks_complete: true
truncated: false
result_is_error: false
result_subtype: "success"
generated_at: "2026-09-14T15:54:39.874Z"
---

# self-review 3.2 round 1

Run `run-20260914T150637Z`. This invocation **ended cleanly** (recorded outcome: `complete`).

## Dead ends

The agent explored strengthening test coverage by adding words with preposed vowels (ไกล, ไหล) to exercise the silent-ห rule in that context. Reading the walker logic at lines 676–700, it discovered that `readingsOf` checks for a silent leader at the first character of the window—so ไหล (ไ, then silent ห, then ล) never retraced into the silent-leader path. This ruled out a full walker rewrite to handle preposed-vowel clusters, pivoting instead to a narrower `silentLeader` flag on `syllablesAt`.

## Mind changes

Reading the actual test bodies revealed two stale comments: `scoreOf`'s docstring named a test "theLessonStatesWhichReadingWins" that does not exist (real name: "states which reading wins when two of them fit"), and the vocabulary-check comment claimed two-consonant runs were exempt as spelling fragments, but the code exempted *all* runs under 3 characters—including single letters like "ล". The `vitest` run after the first repair wave confirmed AC4 passed with the walker refactor, but the vocabulary check then broke single-letter handling, forcing a second pass to separate the logic: 1 char = bare letter (exempt), 2 consonants = fragment (exempt), everything else = check.

## Measurements

The vitest run `./node_modules/.bin/vitest run src/domain/script/data/promotedLessons.test.ts` showed AC4 passing after the walker `silentLeader` flag was added. The `plan-runner macro run lint-changes` command reported violations dropped from **22 to 19** after the fixes.

## Codebase surprise

The walker's silent-leader detection assumes a leader at index 0, so preposed vowels (which shift the actual consonant to index 1) silently break the rule. The vocabulary check had accidentally conflated "bare letters" with "spelling fragments" via an overly broad `length < 3` exemption.

## Unwritten knowledge

Preposed-vowel + silent-leader combinations (ไหล, ไไหล patterns) are a known walker gap fixable with a `silentLeader` offset parameter, but the refactor was not attempted because extending `syllablesAt` was lower risk at this stage. The three-lesson rule enumeration in `syllablesAt` (complexity 38 vs. threshold 20) scatters readability if extracted; leaving it as-is trades a lint warning for clarity on rule interaction.

## Side quest

Vocabulary audit for test coverage gaps—searched for ุ words without tone marks (ขลุ่ย, หนุ่ม, ครุ, สุข) and ไ-initial clusters (ไกล, ไหล, ไกว). Confirmed ไกล and ไหล in the vocab, but fixed the walker gap instead of adding coverage.

## What it did

- 1004 transcript entries over 331s (2026-09-14T15:49:08Z → 2026-09-14T15:54:39Z)
- tool calls: Bash ×17, StructuredOutput ×1

## How it ended

> {"task_id":"3.2","task_status":"complete","branch":"worktree-lesson-rebuild","commit":"fe83bb3a824b03289e0c65b7c8f997ee099cfe56","files_changed":["content/lessons/lesson-unwritten-vowels.md","content/lessons/lesson-clusters.md","content/lessons/lesson-leading-consonants.md","public/lessons/lesson-unwritten-vowels/deck.json","public/lessons/lesson-unwritten-vowels/manifest.json","public/lessons/les…

## Last things it said

- Now the repairs.
- I found four things and fixed all four; all were inside `covers`. **1. Comments falsified by the change.** Two. - `scoreOf`'s docstring said the order was "asserted … by `theLessonStatesWhichReadingWins`" — a test name that does not exist. It now names the real one. - The vocabulary check's comment said two-consonant runs are exempt as quoted spelling fragments. The code exempted *every* run under three characters. **2. Nothing reaching it.** Three, two fixed. - That same `characters.every(isConsonant) && characters.length === 2` arm was unreachable behind `length < 3`. Replaced with the rule …

---

*A record of one agent invocation, for a reader who can see the diff but not*
*the reasoning behind it. Nothing here has been independently verified — where*
*a narrative is present it is model-written from the transcript at*
*`transcripts/run-20260914T150637Z/phase-3__self-review__3.2__r1.jsonl`.*


## Cost

| actor | invocations | output tok | cache read | wall | ~USD |
|---|---:|---:|---:|---:|---:|
| self-review | 2 | 74,316 | 9,223,304 | 17 min | 7.11 |
| executor | 1 | 30,395 | 3,451,119 | 7 min | 2.99 |
| summarizer | 7 | 7,122 | 55,370 | 2 min | 0.10 |
| **total** | 10 | 111,833 | 12,729,793 | 26 min | 10.20 |

cache hit **98.2%** — `cache_read / (input + cache_read + cache_write)`, the same definition `plan metrics` uses.

*USD is computed from a price table in this repository, not from anything the API returned. Cache reads are charged at a tenth of an input token and writes at 1.25x. Treat it as an order of magnitude, not an invoice.*