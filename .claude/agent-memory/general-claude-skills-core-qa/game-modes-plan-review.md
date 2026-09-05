---
name: game-modes-plan-review
description: Context and outcome of the QA-lead review of the game-modes execution plan (self-graded practice rounds that must not touch SRS)
metadata:
  type: project
---

The `plans/game-modes/` execution plan (drafted 2026-09-05, 3 phases / 9 tasks,
not yet implemented) adds self-graded practice rounds to the Thai-script app.

**Why:** the rounds are deliberately separate from SRS review — the load-bearing
guarantee is that playing a game never mutates SRS scheduling state. Game history
is a dedicated localStorage key, deliberately outside `validateLearnerState` /
`MergeService` / the export-reset flows, so clearing SRS progress does not clear
game history and vice versa.

**How to apply:** if asked to implement or re-review any part of this plan, the
QA review at `plans/game-modes/reviews/qa-lead-review.md` is the prior art. Its
critical finding (P-1) is that the isolation guarantee was scoped to card
`schedule` fields and proven only against test doubles, while the same blob holds
achievements the page could write via `checkAchievements`. Check whether that was
fixed before trusting any "SRS untouched" test.

**Plan-file naming (this repo's execution plans):** phase dirs are hand-chosen
short slugs, not mechanical (`phase-1-symbol-practice`,
`phase-2-word-practice-and-mix`, `phase-3-weak-item-prioritization`); task files
are `task-{id}-{abbreviated-kebab-title}.md`. There is no manifest — if directory
listing is unavailable, read the phase README task tables to enumerate tasks.

Related: [[testing-infrastructure-gotchas]]
