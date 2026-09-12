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

## 0247e163 — f1 · phase 1 round 2 · e2e/conversation-practice.spec.ts

Task 1.4's e2e criteria AC1, AC3, and AC4 (backend per-model readiness gating, fail-verdict rendering, simulated-connection-failure handling) have no recorded red proof — unlike AC2, which was validated with one. Their tests have never been observed failing, so per the ledger's own legend they are not yet evidence of anything beyond 'ran once and passed'.

> This block's id includes the finding's wording, because the review supplied no
> criterion to anchor it to. If a later review rewords this finding it will be
> asked again as a new block, and this answer will stay here unattached.

**Scored severity 4/10, effort 7/10** — the effort is the cost of the repair including proving it safe. It reached you because a real defect that is expensive to fix is the one case where spending without your agreement is itself the risk.

**Options:**

- **A** — Accept the manual-verification note as sufficient compensating evidence for a gate:human task and leave AC1/AC3/AC4 without formal red proofs permanently  ← recommended
  Matches how this task was actually executed and gated, but leaves these three criteria's tests unvalidated against a known-failing mutation — a future regression in readiness-polling or connection-failure handling could pass silently if the e2e suite itself has a latent bug.
- **B** — Require a follow-up task/session with real GPU hardware to run mutation-based red proofs for AC1, AC3, AC4 and record them under red-proofs/
  Closes the gap properly but costs another full GPU-backed e2e run cycle (cold model load + ~30s per mutation × 3 criteria) for a phase that is otherwise complete and already human-gated.

**Answer:**

A

**Applied:**

not yet — awaiting an answer

