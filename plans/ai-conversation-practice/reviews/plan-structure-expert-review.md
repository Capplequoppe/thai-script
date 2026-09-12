# Plan structure review — AI conversation practice mode

Reviewer lens: Team Topologies (stream-aligned work vs. shared platform/contract, fan-out/fan-in shape, dependency structure) and tracer-bullet vs. tiered-layer phasing. Findings are tagged `PS-{n}` for citation by synthesis.

## Overall shape: correctly a set of vertical tracer bullets, not stacked tiers

The plan's three phases are genuinely vertical slices, not horizontal layers deferred to a final integration phase:

- Phase 1 proves the entire mic → STT → judge → TTS → playback pipeline end to end with one hardcoded question, explicitly framed as "the riskiest, most novel part of this plan" (`phase-1-conversation-pipeline-mvp/README.md:35-37`).
- Phase 2 and Phase 3 each replace exactly one dimension of that working pipeline (content, then multi-turn/gating) without re-opening the others.
- Every phase carries its own real integration proof rather than pushing integration to the end: task 1.4 (Playwright, real backend), task 2.3's extension of that spec (`phase-2.../task-2.3-backend-tiered-selection.md:24`, AC4), and task 3.3's further extension (`phase-3.../task-3.3-multiturn-session-ui.md:26`, AC4). Each phase README also explicitly answers "Would this phase stand alone?" — a good discipline that should be kept in any future phases added to this plan.

This is the target shape for this kind of plan and should not be disturbed by the findings below.

## PS-1: Task 2.2 (content-bank generation) is gated behind phase 1 with no technical dependency justifying it

`phase-2-personalized-content/README.md:6` sets phase-level `depends_on: ["1"]`, and its prose (lines 28-32) justifies the whole phase's sequencing after phase 1 ("It is sequenced after phase 1 because it depends on the pipeline phase 1 proves end to end"). That reasoning is true for tasks 2.1 and 2.3, which extend phase 1's contract and pipeline — but not for task 2.2.

Task 2.2 (`task-2.2-curated-question-bank.md`) has `depends_on: []` (line 11) and is explicitly described as a standalone content-authoring tool: "not part of the live backend... it runs once... produces `src/domain/conversation/data/conversationStarters.json`" (lines 30-35). It reads only `src/domain/vocabulary/data/vocabulary.json` (an existing file) and the Qwen model already validated in the spike; it has no dependency on phase 1's backend skeleton, endpoints, or frontend work. The phase-2 README itself confirms this in its own task-independence note: "2.1 and 2.2 are independent of each other... 2.2 touches `scripts/`... and never reads or writes anything 2.1 owns" (lines 41-44).

Task 2.2 is also `size: large`, involves a GPU generation run, and has a mandatory human-review step (AC3) — three separate cost/latency sources stacked onto the critical path for no structural reason, since none of them touch anything phase 1 builds. As written, the plan forces this work to wait behind all four phase-1 tasks (including the human-gated 1.4) before it can even start.

**Recommendation**: pull task 2.2 out of phase 2's dependency chain — either run it as a zero-dependency, phase-1-parallel task (start it on day one alongside 1.1-1.4), or restructure it as its own ungated side-track task that phase 2 only needs for task 2.3. Either shortens the critical path by roughly one full phase's worth of human-gated wall-clock time.

## PS-2: Phase 3 bundles two orthogonal capabilities into one x-large, doubly-human-gated integration task

Phase 3 combines two capabilities that the plan's own text says are unrelated: multi-turn session mechanics (tasks 3.1, 3.3) and vocabulary/grammar unlock gating (task 3.2). The phase-3 README states this independence directly: "3.1 doesn't know or care whether a session is gated; 3.2 is a pure function of the learner's existing SRS counts plus a locked/unlocked UI state, and needs nothing from the backend to be built or tested" (`phase-3-multiturn-sessions-and-gating/README.md:47-52`).

Because both land in the same phase, task 3.3 — already the plan's largest task (`size: x-large`, the only other `x-large` being task 1.2's three-model integration) — is the single point that has to prove *both* concerns end to end in one Playwright extension and carry the one human-verification note for the whole phase (`task-3.3-multiturn-session-ui.md` AC4/AC5, lines 26-27). A failure or rework need in the gating half (e.g. the locked-state copy) and a failure in the multi-turn half (e.g. session exhaustion UI) both block the same task's signoff, even though task 3.2 (the gate) has zero engineering coupling to task 3.1 (the session backend).

This is a smaller version of the same "no real dependency forces sequencing/bundling" pattern as PS-1, but here there is at least a plausible *product* reason for the bundling: phases 1-2's own READMEs state the early pipeline is deliberately not the shipped/discoverable experience ("It is not meant to be the shipped experience" — `phase-1.../README.md:36`), so surfacing an unlock gate before phase 3 would advertise an unfinished, one-question demo. That reasoning applies to *exposing the gate*, not to *building and unit-testing it* — task 3.2's own unit-level ACs (1-3) and its Dashboard-tile ACs (4-5) don't need session mechanics at all and could be built and merged earlier, with only the final "wire it into the shipped Dashboard" step held until phase 3.

**Recommendation**: at minimum, split task 3.3's single e2e spec extension into two independently-passable cases (or two tasks) — one proving the gate holds through the real page, one proving the multi-turn loop — so the two orthogonal concerns don't share one human gate and one pass/fail signal. Consider whether task 3.2's pure-function/unit-test portion could be pulled into an earlier phase, with only the Dashboard-visibility wiring staying in phase 3.

## PS-3: Task 2.3 ships with an unresolved decision placeholder baked into the task file, and the edge case it resolves is later made unreachable without the plan ever saying so

`task-2.3-backend-tiered-selection.md`'s Architectural Decision section contains an explicit unfilled placeholder: "**[Author: state the actual empty-vocabulary decision made while building this task — smallest-tier fallback vs. an explicit 'not enough vocabulary yet' result — and update AC3's enforcement and the frontend task list accordingly if the latter is chosen...]**" (lines 85-90). AC3's own enforcement text (line 23) likewise defers the decision to the implementer ("this task decides which... not silently").

Two structural problems with this, distinct from the product question itself (which is reasonably left open — see PS-3a below):

1. **The decision is deferred into the task body rather than the plan's own decision mechanism.** This plan/toolchain has a dedicated place for unresolved plan-level decisions (the `answer-plan-decisions` workflow); leaving a bracketed author-note inside a task's Architectural Decision section instead means an executor discovers and resolves a real product/API-shape choice *while implementing*, with no recorded decision artifact and — per the note's own instruction — a mandate to go back and edit AC3's enforcement text and "the frontend task list" (i.e., mutate sibling task documents) after the fact. That's unusual for an automated or semi-automated runner and worth flagging even if a human is driving.
2. **The edge case may be moot by the time phase 3 ships, and nothing in the plan says so.** Task 3.2 gates the entire `/conversation` route behind `MIN_VOCAB_COUNT = 200` (`task-3.2-frontend-unlock-gate.md:42`), enforced both at the Dashboard entry point and at the page itself (AC6). Once phase 3 ships, no learner who could reach the page has an empty-or-near-empty known-word set — so whichever behavior 2.3 picks for AC3 becomes dead code for real users after phase 3, while remaining live (and worth getting right) during the phase 1-2 window when the page is reachable ungated. The plan never states this, so a future reader of task 2.3 in isolation has no way to know the branch's real-world relevance is temporary.

**Recommendation**: resolve the empty-vocabulary decision now, as part of plan review, rather than leaving it for the executor to both decide and retroactively propagate. Regardless of which way it's resolved, add a one-line note (in 2.3 or 3.2) that this branch is only reachable before phase 3's gate ships.

## Minor: inconsistent self-documentation of "why no seam task" between phase 2 and phase 3

Phase 2's README explicitly argues why no seam/contract-negotiation task is needed ("No seam task is needed here... 2.2's bank file format is fixed by 2.3's own read logic" — lines 46-52). Phase 3 introduces three brand-new endpoints in task 3.1 (`/conversation/session/start`, `/next`, `/judge`) with no equivalent explicit statement of why no seam task is needed before task 3.3 consumes them. The implicit reason is sound (3.3 depends_on 3.1 rather than running in parallel against an unwritten contract, unlike phase 1's 1.2/1.3 pair), but stating it explicitly would keep the plan's own rationale self-consistent for a reader comparing phases, the way phase 1 and phase 2 already do for their own structural choices.
