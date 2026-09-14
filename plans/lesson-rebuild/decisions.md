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

## baca6a39 — continuation-1.1a · continuation/1.1a · Task 1.1a — the continuation bound

Task 1.1a could not fix itself. The runner handed the failure back to the executor's own session for every continuation this run was allowed to spend, and the task is still not green. Continuing is no longer the runner's call — the remedy on record for this cause is that the executor's own session is shown the failure and fixes it, and it has now been tried to the bound. What is left is a larger bound, or you.

**Options:**

- **A** — raise `--max-continuations` above 2
  2 continuation(s) were spent against a bound of 2 and the gate is still red. Worth it only if the last attempt was closer than the first: every continuation is a paid invocation, and a task that cannot fix itself in a bounded number of attempts usually has a problem no further attempt will find
- **B** — take this task by hand, then reset its `task_status` to `pending`
  the ending the runner has always had — the next run re-reads the plan and picks the task up from wherever you left the tree
- **C** — narrow task 1.1a, or split the part that will not go green into its own task
  for work that turned out to be two jobs — the half that passes lands, and the half that does not stops holding everything downstream of it

**Answer:**

B
S
**Applied:**

not yet — awaiting an answer

## 182860f4 — continuation-1.5 · continuation/1.5 · Task 1.5 — the continuation bound

Task 1.5 could not fix itself. The runner handed the failure back to the executor's own session for every continuation this run was allowed to spend, and the task is still not green. Continuing is no longer the runner's call — the remedy on record for this cause is that the executor's own session is shown the failure and fixes it, and it has now been tried to the bound. What is left is a larger bound, or you.

**Options:**

- **A** — raise `--max-continuations` above 2
  2 continuation(s) were spent against a bound of 2 and the gate is still red. Worth it only if the last attempt was closer than the first: every continuation is a paid invocation, and a task that cannot fix itself in a bounded number of attempts usually has a problem no further attempt will find
- **B** — take this task by hand, then reset its `task_status` to `pending`
  the ending the runner has always had — the next run re-reads the plan and picks the task up from wherever you left the tree
- **C** — narrow task 1.5, or split the part that will not go green into its own task
  for work that turned out to be two jobs — the half that passes lands, and the half that does not stops holding everything downstream of it

**Answer:**

B

**Applied:**

not yet — awaiting an answer

