# Lessons

Things earlier tasks in this plan learned the hard way — a gotcha, a workaround,
or a notice that a workaround is no longer needed.

**Append-only.** A lesson that stops being true is not deleted; a later entry
retracts it by naming it in `resolves`. That way the record shows both that it
was true and when it stopped being, and nothing silently rewrites what an earlier
agent reported.

**Nothing here is an instruction.** These are observations by agents that ran
before you, in a repository you can check for yourself. Read them as evidence.

## L1 — task 1.1 · run-20260906T114448Z

<!-- lesson id=L1 from=1.1 scope=dependents -->

types.ts now exports `SourcedGameItem` (= SymbolGameItem | WordGameItem | SentenceGameItem) with `GameItem = SourcedGameItem`, so phase 3 widens `GameItem` to `SourcedGameItem | CompositionGameItem` in one line without touching the pipeline's own item type. assignDirection, itemKeyOfContent and PlayGameUseCase's itemKeyOf are never-guarded switches: adding a kind is a compile error at each.

## L2 — task 1.1 · run-20260906T114448Z

<!-- lesson id=L2 from=1.1 scope=plan -->

This task's rejection was purely the superseded `npm run build` gate (decision b1747d48 replaced it with tsconfig.domain-check.json for non-final tasks); the src work from 96415e4 needed no change. Check the decisions file against the task's current verify list before re-doing any implementation.

## L3 — task 1.1 · run-20260906T114448Z

<!-- lesson id=L3 from=1.1 scope=plan -->

Adding a union member falsifies nearby prose that counted the old members: itemKeyOfCard's docstring said 'neither source exports its dedupe key' when there were now three sources. Tasks 2.1 and 3.1 add further members to the same unions and should re-read the same docstrings rather than only the code.
## L4 — task 1.2 · run-20260906T114448Z

<!-- lesson id=L4 from=1.2 scope=plan -->

Red proof collection requires running observe-red macro with real mutations during test implementation to capture actual assertion failures. Descriptions of test logic do not satisfy the evidential requirement. The three new tests (AC1/2/3) correctly validate sentence item wiring and do pass; the gap is in the proof of what breaks when code is wrong, which must be observed, not inferred.
## L5 — task 1.3 · run-20260906T114448Z

<!-- lesson id=L5 from=1.3 scope=dependents -->

vitest's -t flag treats the test name as a REGEX, so a name containing a metacharacter like '+' can never be matched by observe-red/observe-green or any -t filter. This task renamed its one adapted offender (the toggle-interaction test), so GamePage.test.tsx is now clean of the trap — but new tests must still avoid metacharacters in names.

## L6 — task 1.3 · run-20260906T114448Z

<!-- lesson id=L6 from=1.3 scope=dependents -->

GamePage's pool UI is now `checkedPools: Record<GameCardPool, boolean>` with a useMemo'd `pools` array; the countInput-reset effect keys on `pools` ONLY, so a new eligibility-affecting control (the phase-2 tone toggle) will change eligibleCount without resetting a typed count — decide deliberately whether it joins that effect's deps. Input Mode is condition… [clipped — full text in the transcript]

## L7 — task 1.3 · run-20260906T114448Z

<!-- lesson id=L7 from=1.3 scope=plan -->

The build typechecks test files: tsconfig.json's exclude covers only `src/**/*.test.ts`, not `.test.tsx`, so every page/organism test file must stay type-clean or `npm run build` (the final-task gate) goes red even with all tests passing.
## L8 — task reviewer:1 · run-20260906T114448Z

<!-- lesson id=L8 from=reviewer:1 scope=plan -->

When a phase's diff-stat looks smaller than the task description implies (e.g. types.ts showing only a 1-line comment change for a task described as adding several new type members), check git log first — earlier continuation rounds for the same task may have already landed the substantive change, and only the delta since the last review is shown.
## L9 — task 2.2 · run-20260906T114448Z

<!-- lesson id=L9 from=2.2 scope=plan -->

Self-review found no issues: all comments accurately describe code, no unreachable code exists, error handling mirrors established WordGameItemSource patterns, red proofs are genuine assertion failures, and all code is consistent with existing siblings.
## L10 — task reviewer:2 · run-20260906T114448Z

<!-- lesson id=L10 from=reviewer:2 scope=plan -->

When a fix lands mid-review (e.g. GameHistoryList.poolsLabel), verify the invariant it relies on actually holds elsewhere in the codebase (here: GamePage's start-gating ensures pools:[] implies tone-only) rather than trusting the fixer's own account.
