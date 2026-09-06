# Decisions

The runner writes the questions here; you write the answers. This file is part of
the plan's frozen prefix, so **every executor and reviewer on the next run reads it**
— which is what makes an answer take effect without anyone translating it into work.

Write below each `**Answer:**` marker. Leave it blank to say "still undecided"; the
question will be raised again. A run never edits or removes an answer you have written,
and never removes a block, so this file is the standing record of what was settled.

Two kinds of answer, and it is worth being explicit about which you are giving:

- **A policy** — "preserve the destination's mode, do not narrow to 0600". Agents can
  act on this directly.
- **An amendment** — "a task must own `uv.lock`". Prose cannot deliver this. Say so
  here, then amend the plan; the answer alone will change nothing.

## b1747d48 — continuation-1.1 · continuation/1.1 · Task 1.1 — the continuation bound

Task 1.1 could not fix itself. The runner handed the failure back to the executor's own session for every continuation this run was allowed to spend, and the task is still not green. Continuing is no longer the runner's call — the remedy on record for this cause is that the executor's own session is shown the failure and fixes it, and it has now been tried to the bound. What is left is a larger bound, or you.

**Options:**

- **A** — raise `--max-continuations` above 2
  2 continuation(s) were spent against a bound of 2 and the gate is still red. Worth it only if the last attempt was closer than the first: every continuation is a paid invocation, and a task that cannot fix itself in a bounded number of attempts usually has a problem no further attempt will find
- **B** — take this task by hand, then reset its `task_status` to `pending`
  the ending the runner has always had — the next run re-reads the plan and picks the task up from wherever you left the tree
- **C** — narrow task 1.1, or split the part that will not go green into its own task
  for work that turned out to be two jobs — the half that passes lands, and the half that does not stops holding everything downstream of it

**Answer:**

B, with an amendment. This was not a case option A would have fixed: the
executor's own report (and independent inspection) found the two failing
`npm run build` errors are in `GamePage.tsx` and `GameHistoryList.tsx` —
both outside task 1.1's `covers`, both owned by task 1.3. Widening
`GameCardPool`/`GameItem` in task 1.1 necessarily breaks those files'
exhaustive switch/Record until task 1.3 lands; no number of continuations
lets task 1.1 fix a file it isn't allowed to write, and the same
structural gate would recur at 2.1/2.2 (tone) and 3.1/3.2 (composition)
for the identical reason. Verified this by scoping a `tsc --noEmit` run
to exactly the files task 1.1 owns (domain/application/infrastructure) —
zero errors, confirming task 1.1's own work is correct and the failure is
entirely a same-phase sequencing artifact.

Amendment applied: added `tsconfig.domain-check.json` (repo root,
`extends` the real `tsconfig.json`, scoped to `src/domain`/
`src/application`/`src/infrastructure`), and replaced `npm run build` in
the `verify` list of every task except each phase's last (1.1, 1.2, 2.1,
2.2, 3.1, 3.2) with `npx tsc --noEmit -p tsconfig.domain-check.json`.
`npm run build` stays a real gate on 1.3/2.3/3.3, the tasks that actually
touch `GamePage.tsx` and close the union. See CONTEXT.md's "Quality
gates" section for the full rationale. Task 1.1's `task_status` reset to
`pending`; no covers changes were needed since I did not touch
`GamePage.tsx`/`GameHistoryList.tsx` by hand.

**Applied:**

yes — tsconfig.domain-check.json added; verify lists amended in
task-1.1, task-1.2, task-2.1, task-2.2, task-3.1, task-3.2; task 1.1
reset to pending; `docs-nav plan check` clean.

