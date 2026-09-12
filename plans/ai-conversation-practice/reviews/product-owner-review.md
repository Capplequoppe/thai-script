# Product Owner Review: ai-conversation-practice

## Executive Summary

This is an unusually honest plan: every phase boundary states plainly what it is and isn't ("not meant to be the shipped experience," "a technical stepping stone dressed up as one" — literally the language the plan itself uses for phases 1-2), and the SRS/history non-integration is a defensible, well-reasoned scope cut rather than an oversight. The two real product risks are (1) phase 2's personalization algorithm assumes learners acquire vocabulary as a contiguous rank-ordered prefix, but the app's own `VocabularyLessonService.getUnlockedWords()` gates learning on character/tone-rule mastery as well as rank — so a real learner's known-word set will have gaps a strict tier-subset match can silently fail on, untested by any of this plan's own test cases; and (2) task 2.3 ships with a literal unresolved decision in brackets that a downstream AC depends on. Neither is fatal, both are cheap to fix before implementation starts.

## Plan-Level Findings

### Finding PO-1: Tier-matching assumes contiguous rank-ordered vocabulary acquisition, which this app does not guarantee
- **Severity**: major
- **Description**: Task 2.2's bank tiers are literal rank-ordered prefixes of `vocabulary.json` (first 80/150/250/400/600 words by frequency `rank`). Task 2.3's `select_entry` requires a tier's *entire* word list to be a subset of the learner's `known_words` before that tier is eligible. But `VocabularyLessonService.getUnlockedWords()` (`src/domain/vocabulary/services/VocabularyLessonService.ts`) does not unlock words as a clean rank-ordered prefix — it additionally gates each word on whether its characters and tone rules are already mastered from script lessons, filtering a rank window rather than guaranteeing every word below a given rank is learned before any word above it. A real learner's known-word set can plausibly have gaps (a few skipped words even within a low rank range), which means a set of the same *size* as a tier may not be a *superset* of that tier — the exact-subset requirement can fail even for well-progressed learners, kicking them down to a much smaller tier or the unresolved empty-vocabulary fallback (see PO-2) far more often than the phase's "personalized, appropriately-scoped content" value proposition implies. This is the single largest gap between the plan's stated goal for phase 2 and what the code it's built on actually guarantees.
- **Recommendation**: Before task 2.3 is implemented, decide explicitly whether tier matching requires exact subset containment (current design) or "N-th percentile coverage" / "all but K missing words" tolerance, and add a test case in `test_bank.py` that exercises a `known_words` set with a realistic gap (matching `getUnlockedWords()`'s actual shape, not an idealized contiguous prefix) to prove the chosen behavior degrades gracefully rather than silently falling to the smallest tier for well-progressed learners.

### Finding PO-2: Task 2.3 ships with an unresolved product decision, and phase 3's gating is built on top of whichever answer is never actually written down
- **Severity**: major
- **Description**: Task 2.3's Architectural Decision section reads: "[Author: state the actual empty-vocabulary decision made while building this task — smallest-tier fallback vs. an explicit 'not enough vocabulary yet' result — ... this plan intentionally leaves the call to whoever implements it, rather than presupposing it here.]" This is a real product decision (does a new learner get a mismatched/too-easy question, or a clear "you're not ready yet" state?) left as an implementation-time coin flip, despite task 2.3's own text noting "phase 3's gating work will need this task's answer to build on." Leaving it unresolved means AC3 ("handled by an explicit, stated decision") is not actually verifiable as written — there is no decision to test against yet — and phase 3's design (task 3.2's locked-state UI, whose entire job is to prevent an under-vocabularied learner from reaching a live session) is being built downstream of an answer nobody has committed to.
- **Recommendation**: Answer this now, before phase 2 execution starts, not during it. Given phase 3 already gates the whole feature behind `MIN_VOCAB_COUNT = 200` — which sits between tier 2 (150) and tier 3 (250), see PO-3 — the empty/near-empty vocabulary case is largely a phase-1/phase-2-only concern (pre-gate); the smallest-tier fallback is almost certainly right for that period, since a hard "not enough vocabulary" empty state during phase 1/2 stepping-stone usage adds a new UI state to a task that already isn't meant to be the shipped experience. State that choice as this task's own Architectural Decision rather than an open bracket.

### Finding PO-3: The gate threshold (200 vocab) sits inside the content bank's own tier boundaries (150, 250) with no stated reconciliation
- **Severity**: minor
- **Description**: Phase 3 gates entry to conversation practice at `MIN_VOCAB_COUNT = 200`. Phase 2's content bank tiers are 80/150/250/400/600 words. A learner who just crossed the gate (200 known words) is, by definition, below tier 3 (250) and — per PO-1's gap risk — not guaranteed to fully cover even tier 2 (150). Two tiers (80, and very likely 150) become effectively dead content once the gate is live: nobody who can reach `/conversation` post-phase-3 will realistically be offered them, since the minimum reachable vocab count already exceeds tier 1 and sits right at tier 2's edge. Nothing in the plan states this was a deliberate choice (e.g., "the two smallest tiers exist only to serve phase 1/2 pre-gate usage") versus an oversight of building 5 tiers for a gate that only leaves 2-3 of them reachable.
- **Recommendation**: Not blocking, but worth one sentence in CONTEXT.md or task 2.2's Architectural Decision acknowledging that tiers 1 (and likely 2) are pre-gate-only content, so a future reader doesn't wonder why they're apparently unused once phase 3 ships.

### Finding PO-4: Vocabulary/grammar gating threshold is honestly flagged as provisional, but "content richness" as the sole justification is asserted, not shown
- **Severity**: minor
- **Description**: CONTEXT.md explicitly and correctly rules out "gate tuned to fix compliance" (measured not to help) and states the real gate is "justified by content richness only... starting defaults, easy to tune later." That's honest framing — it does not oversell 200/5 as empirically derived. But no reasoning connects 200 words / 5 grammar points specifically to "enough for a meaningful conversation" beyond it being a round number description of the review-panel's product discussion; it isn't tied to, e.g., the size of the smallest bank tier a learner should reliably match (which per PO-1/PO-3 is closer to 150-250 than 200) or a minimum grammar surface needed for the judge to have something to evaluate.
- **Recommendation**: No plan change required — this is a reasonable "ship with a defaults, tune later" posture, consistent with the rest of the plan's evidence-based-where-tested, honest-where-not tone. Flagging only so the number isn't later treated as more considered than it is when someone asks "why 200."

### Finding PO-5: No session history at all (not just no SRS integration) may be a bigger product gap than the plan credits
- **Severity**: minor
- **Description**: Tasks 1.3 and 3.3 make a well-reasoned call not to integrate conversation results into the SRS scheduler — that boundary is sound (a pass/fail judgment on a freeform utterance isn't a spaced-repetition review event, and guessing at the shape now would be premature). But task 3.3 goes further: the running tally is "frontend-only state for this phase... gone on navigation away." That means after phase 3 ships — the phase explicitly framed as "the feature as actually asked for" — a learner who completes ten conversation sessions has zero record that any of them happened: no count of sessions completed, no trend, nothing surfaced on the Dashboard alongside the unlock gate. That's a different and smaller ask than SRS integration (a simple local counter, not a scored review system) and the plan doesn't distinguish "we're not integrating with SRS" from "we're keeping zero history of any kind," which reads as a bigger scope cut than the stated reasoning actually argues for.
- **Recommendation**: Consider whether phase 3 (or a fast follow) should persist just a session count / last-session date — no scoring, no SRS — so the Dashboard tile can eventually show "12 sessions completed" the way every other unlockable surface in this app shows a number. Not blocking for this plan as scoped, since the plan is explicit that this is a stepping-stone practice loop, not a scored artifact — but worth a product decision rather than a byproduct of the SRS-deferral reasoning.

## Plan Quality Findings

| # | Check | Phase | Task | Severity | Issue | Recommendation |
|---|-------|-------|------|----------|-------|-----------------|
| PO-6 | AC testability | 2 | 2.3 | major | AC3 says the empty-vocab case is "handled by an explicit, stated decision" but the decision itself is an open bracket in the same task file (see PO-2) — AC3 can't be verified against a decision that doesn't exist yet | Resolve the decision before hardening/execution; update AC3's `ac_enforcement` line to name the actual chosen behavior |
| PO-7 | Test case quality | 2 | 2.3 | major | AC1/AC2's test cases use idealized, contiguous rank-ordered `known_words` sets ("matching tier 2 exactly," "300 words"); none exercise the realistic gapped shape `VocabularyLessonService.getUnlockedWords()` actually produces (see PO-1) | Add a test case built from a `known_words` set with a mid-tier gap, mirroring the real unlock service's output shape, not a synthetic clean prefix |
| PO-8 | AC testability | 1 | 1.4 | pass (by design) | AC5 (audio quality) is explicitly non-automatable and stated as such, with a documented manual note instead of a test — this is the right call, not a gap | none |
| PO-9 | AC testability | 2 | 2.2 | pass (by design) | AC3 (human reads the bank for naturalness) is explicitly non-automatable and stated as a reviewer step — right call | none |
| PO-10 | AC testability | 3 | 3.3 | pass (by design) | AC5 (one real end-to-end session by ear) follows the same precedent as 1.4's AC5 — consistent, not a gap | none |
| PO-11 | Architectural decisions documented | all | all | pass | Every task's Architectural Decision section states rejected alternatives with a concrete reason, not just the chosen option (e.g., 1.1's base64-vs-multipart-vs-websocket, 1.2's models-on-app.state, 3.1's opaque session id vs. content-keyed) | none |
| PO-12 | Trust boundary inventory | root | — | pass | Covers audio input, STT-output-as-prompt-injection surface, judge-LLM-output-as-render-surface, and known-vocab-snapshot-as-selector-only (never interpolated) — concrete rows, not generic boilerplate | none |
| PO-13 | YAGNI | 2 | 2.2 | minor | Generating 5 tiers when only ~3 are reachable post-gate (PO-3) is a small amount of wasted generation/review effort, not a functional problem | See PO-3's recommendation |

## Phase-by-Phase Review

### Phase 1 — Conversation pipeline, one fixed exchange, end to end
Delivers a real, if narrow, capability: a person can actually complete one full mic→verdict→TTS round trip locally. The phase README is explicit that this is a tech-proof ("would this phase stand alone? As a tech-proof, yes... It is not meant to be the shipped experience") — an honest framing a learner or stakeholder skimming just this phase's description would not be misled by. The seam/parallel-pair/integration-proof structure (1.1 seam, 1.2/1.3 parallel, 1.4 integration) is a sound de-risking shape for "first backend this app has ever had."

#### task-1.1-conversation-api-contract-and-skeleton.md: Conversation API contract + backend project skeleton
- **Status**: pass
- **Findings**: None. ACs are concretely testable (AC1/AC3/AC4 automated; AC2 correctly scoped as a documentation-completeness check for the phase reviewer, not a test). Architectural Decision section gives real rejected alternatives with reasons tied to this plan's own evidence (CONTEXT.md's streaming-STT rejection reused as precedent for rejecting a WebSocket contract).

#### task-1.2-backend-pipeline.md: Backend pipeline: STT, judge, TTS, wired to the contract
- **Status**: pass
- **Findings**: None from a product lens. AC4/AC5's three-state distinction (parse-failure vs. empty-audio vs. generic failure, each with different `feedback_en`) is a genuinely user-facing behavioral requirement, not an implementation detail dressed up as one — a learner who got silence-detected should not read the same message as one whose answer the judge choked on. Good behavioral AC.

#### task-1.3-frontend-port-adapter-page.md: Frontend port, adapter, and conversation practice page
- **Status**: pass
- **Findings**: None. The "unavailable is a type member, not a thrown exception" decision is well-justified and reused consistently through phases 2-3 (AC3/AC4 here, task 3.3's AC3 mid-session case). The explicit no-SRS-card/no-history/no-rating-buttons scope cut for this phase is reasonable — phase 1 is a pipeline proof, not a reviewable item, and correctly says so.

#### task-1.4-e2e-integration-proof.md: End-to-end integration proof (Playwright, real backend)
- **Status**: pass
- **Findings**: None. `gate: human` on this task is the right call and well-argued (it's the one task proving two independently-built sides actually agree, and AC5's audio-quality check fundamentally can't be automated). Real recorded speech (not TTS-synthesized) for the reply fixtures is a good call against test-suite drift.

### Phase 2 — Personalized content, curated question bank by vocabulary tier
The phase's stated value ("two learners with different vocabulary progress... asked different questions") is a real, describable improvement over phase 1 and is honestly scoped ("it replaces one hardcoded string... and changes nothing else about the shape of an exchange"). The core risk in this phase is PO-1/PO-6/PO-7: the tier-matching mechanism's precondition (clean rank-ordered vocabulary acquisition) doesn't match this app's actual learning-unlock mechanism, and the plan's own test cases don't catch that because they test against an idealized `known_words` shape rather than the real one.

#### task-2.1-known-vocabulary-snapshot.md: Frontend sends a known-vocabulary/grammar snapshot
- **Status**: pass
- **Findings**: None. Correctly scoped to "send the real snapshot," explicitly deferring selection logic to 2.3. AC3 (zero-learned-words still sends a valid empty request) is a good behavioral edge case, not assumed away. Query-param-on-GET vs. new-endpoint decision is reasoned against this app's actual scale (~5,000-word vocabulary ceiling).

#### task-2.2-curated-question-bank.md: Offline generation + auto-filtered question bank
- **Status**: findings
- **Findings**: PO-13 (minor, YAGNI) — see Plan-Level Findings. Otherwise sound: converting the spike's own measurement tool into the production filter (rather than writing a second implementation) is good reuse, and AC4's reproducibility requirement (fixed seed, stable ids across re-runs) is a concrete, testable, and correctly-motivated requirement (protects a future bank-extension pass from silently reshuffling existing entries).

#### task-2.3-backend-tiered-selection.md: Backend selects from the bank by learner tier
- **Status**: findings
- **Findings**: PO-1 (major), PO-2/PO-6 (major, unresolved decision), PO-7 (major, test coverage gap). This is the task the rest of phase 2 hinges on, and it's the one with the most substantive gaps in this review. The deterministic-not-random selection decision itself (stable question across reloads pre-phase-3) is well-reasoned and not in question.

### Phase 3 — Multi-turn sessions + feature gating
This phase's README correctly identifies itself as "the first phase where 'AI conversation practice mode' as discussed with the user actually exists" — phases 1-2 are honestly labeled as partial stepping stones both in the root README and in their own phase READMEs, so a stakeholder reading any single phase's description would not mistake it for the finished feature. The gate is enforced at two independent points (Dashboard tile AND the page itself, task 3.2 AC6) rather than only at the discoverable entry point, which is the right call for a boundary that's meant to actually hold, not just be hard to stumble into.

#### task-3.1-backend-session-state.md: Backend session state + a "continue" endpoint
- **Status**: pass
- **Findings**: None. Exhaustion-as-named-field (not an empty 200 or an exception) correctly reuses the plan's own never-asked/empty/failed distinction pattern from task 1.2. AC4 (sessions don't survive a restart) is a concretely testable proof of the stated in-memory-only design decision, not just an assumption.

#### task-3.2-frontend-unlock-gate.md: Frontend unlock gate
- **Status**: pass
- **Findings**: See PO-4 (minor) regarding the threshold's justification, filed at the plan level rather than against this task specifically, since this task correctly implements whatever threshold CONTEXT.md hands it. AC3's inclusive-boundary case (exactly 200/5 unlocks) is a good, easy-to-miss edge case called out explicitly. Reusing `QuickActionCard`/`LearnableCallout` rather than inventing a third locked-state visual treatment is good consistency, and AC4's requirement to name the actual gap ("120/200 words learned," not a bare padlock) matches this app's existing pattern per CONTEXT.md.

#### task-3.3-multiturn-session-ui.md: Multi-turn session UI + end-to-end proof
- **Status**: findings
- **Findings**: PO-5 (minor) — see Plan-Level Findings, regarding the tally being fully discarded on navigation rather than even minimally persisted as a session count. AC3 (mid-session failure preserves the tally-so-far rather than discarding it) is a genuinely good behavioral requirement — protects a learner's in-progress sense of accomplishment from a transient backend hiccup, correctly treated as user-facing, not incidental.

## Summary Statistics
- Tasks reviewed: 10 (1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3)
- Findings by severity: critical 0, major 3 (PO-1, PO-2/PO-6, PO-7), minor 4 (PO-3, PO-4, PO-5, PO-13), suggestion 0
