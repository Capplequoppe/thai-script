---
doc_type: reference
title: "Task 3.2 — Frontend unlock gate"
description: A pure function deciding whether conversation practice is unlocked, given the learner's current vocab/grammar counts (read through the app's existing StartLessonUseCase, not a new context member), plus the Dashboard entry point, a locked-state screen, and this feature's own independent e2e proof that the gate holds through the real page.
covers:
  - src/domain/conversation/services/ConversationUnlockService.ts
  - src/domain/conversation/services/ConversationUnlockService.test.ts
  - src/presentation/pages/Dashboard.tsx
  - src/presentation/pages/Dashboard.test.tsx
  - src/presentation/pages/ConversationPracticePage.tsx
  - src/presentation/pages/ConversationPracticePage.test.tsx
  - e2e/conversation-gate.spec.ts
  - e2e/fixtures/seedLearner.ts
status: draft
task_id: "3.2"
task_status: pending
depends_on: ["2.3"]
size: medium
verify:
  - npm test -- src/domain/conversation/services/ConversationUnlockService src/presentation/pages/Dashboard src/presentation/pages/ConversationPracticePage
  - npx tsc -b
  - npm run test:e2e -- --project=conversation-practice
ac_enforcement:
  - "AC1 -> a case in ConversationUnlockService.test.ts: vocabCount below MIN_VOCAB_COUNT (200) returns unlocked: false regardless of grammar count"
  - "AC2 -> a case: grammarCount below MIN_GRAMMAR_POINTS (5) returns unlocked: false regardless of vocab count"
  - "AC3 -> a case: both thresholds met returns unlocked: true, and a case at exactly the threshold (200 vocab, 5 grammar) is also unlocked: true (boundary is inclusive, stated explicitly rather than left to whichever comparison operator someone reaches for)"
  - "AC4 -> a case in Dashboard.test.tsx, seeded below threshold (via renderWithApp's existing graduatedVocab/learnedGrammar options - no new AppContextValue member needed, see Architectural Decision): a QuickActionCard-shaped tile for conversation practice renders with no onClick handler and a message naming what's still needed (e.g. \"120/200 words learned\") - asserted by confirming a click produces no navigation (QuickActionCard has no disabled DOM attribute or ARIA state to assert against, only conditional styling - see Architectural Decision), not by asserting a CSS class"
  - "AC5 -> a case, seeded above threshold: the tile has an onClick handler and navigates to /conversation on click"
  - "AC6 -> a case in ConversationPracticePage.test.tsx: navigating to /conversation directly (bypassing the Dashboard tile) while below threshold still shows the locked explanation, never the live recording UI - the gate is enforced at the page, not only hidden at the entry point"
  - "AC7 -> a new e2e/conversation-gate.spec.ts, in the conversation-practice Playwright project, using e2e/fixtures/seedLearner.ts (task 2.3): a learner seeded below threshold who navigates directly to /thai-script/conversation (typed URL, not a tile click - the Vite base path per vite.config.ts's base: \"/thai-script/\", not the bare /conversation a unit test's MemoryRouter uses) sees the locked explanation and the page never calls the backend at all (asserted via page.route interception - zero requests to the conversation API); a learner seeded above threshold sees the unlocked Dashboard tile and can navigate through it - this is this feature's OWN e2e proof, independent of task 3.3's multi-turn session proof, so a gating regression fails here without needing a real multi-turn session to even start"
generated: {by: claude-sonnet-5/agent, at: 2026-09-11}
profile_version: 1
weight_votes:
  - "author -> 5"
---

# Task 3.2 — Frontend unlock gate

## Description

`src/domain/conversation/services/ConversationUnlockService.ts` — one
pure function, no dependencies:

```ts
export const MIN_VOCAB_COUNT = 200;
export const MIN_GRAMMAR_POINTS = 5;

export function checkConversationUnlock(
  learnedVocabCount: number,
  learnedGrammarCount: number,
): { unlocked: boolean; vocabNeeded: number; grammarNeeded: number } {
  // vocabNeeded/grammarNeeded are 0 when that dimension's threshold is
  // already met — the UI's "what's still needed" message reads directly
  // off these, never recomputes the subtraction itself.
}
```

Called from `Dashboard.tsx` and `ConversationPracticePage.tsx` with
`app.vocab.getLearnedCount()` (already exposed directly on
`AppContextValue.vocab`) and `app.lesson.getGrammarLearnedCount()` —
`StartLessonUseCase` (exposed today as `AppContextValue.lesson`, used
by every other page that needs a cross-domain count) already wraps
`GrammarService.getLearnedCount()` for exactly this purpose. **No new
`AppContextValue` member, and no change to `AppContext.tsx` or
`renderWithApp.tsx`** — a first draft of this task called for adding a
`grammar: GrammarService` member neither file has today, when the count
this task actually needs already has a live call path through
`lesson`. **The gate is enforced at both places, independently** (AC6):
the Dashboard tile existing in a disabled state is a discoverability
affordance, not the actual security/product boundary; a learner
navigating to `/conversation` directly must see the same locked
explanation, not a live recording UI that happens to have no
discoverable entry point.

**Dashboard tile**: reuse `QuickActionCard` for the entry point in both
states — locked and unlocked — rather than introducing a second visual
treatment or a "just unlocked" transition callout. `QuickActionCard`
has no `disabled` DOM attribute or ARIA state (its `disabled` prop only
conditionally applies an `opacity-50` class and omits the `onClick`
handler — see its source), so the locked state is provable only by
behavior: no `onClick`, so a click produces no navigation. Locked state
names the actual gap (AC4): "120/200 words learned" is different from
"80% there" and different from a bare padlock icon with no number —
every other locked/unlocked surface in this app names a number, not
just a state. A first draft of this task also proposed a
`LearnableCallout`-based "you just unlocked this" transition moment;
cut here rather than left as an unbuilt aspiration with no AC of its
own — the plain unlocked tile already communicates availability, and a
celebratory transition state can be added later as its own scoped
task if wanted.

**This feature's own e2e proof (AC7), independent of task 3.3's.** A
first draft bundled "the gate holds through the real page" into task
3.3's multi-turn session e2e case, so a session-mechanics regression
and a gating regression shared one signoff — a plan review split them:
this task owns proving the locked path end to end (reusing task 2.3's
`seedLearner.ts` helper for a below-threshold seed), so it can fail
independently of whether a real multi-turn session even works. The
locked-path case also asserts the page makes zero backend requests —
the strongest available proof that "locked" isn't just a UI label
sitting in front of a live, reachable recording flow.

**Known limitation, not solved here: mixed content on a deployed
HTTPS page.** If this app is ever served over HTTPS (e.g. GitHub
Pages) while the backend stays on plain HTTP on the user's own machine,
browsers block that request as mixed content regardless of this gate.
Nothing in this plan proposes serving the backend over HTTPS, so
conversation practice is, for now, a feature that only works when both
the frontend and backend run locally — noted here as an accepted
constraint, not a defect this task fixes.

## Acceptance Criteria

- AC1: Vocab below threshold locks regardless of grammar progress.
- AC2: Grammar below threshold locks regardless of vocab progress.
- AC3: Meeting both, including exactly at the threshold, unlocks.
- AC4: The Dashboard tile shows a disabled-by-behavior state (no
  navigation) naming the specific remaining gap, not just a generic
  locked look.
- AC5: Above threshold, the tile is enabled and functional.
- AC6: The gate holds at the page itself, not only at the Dashboard
  entry point (unit-level proof).
- AC7: The gate holds at the page itself, proven end to end through
  the real app and a real seeded learner state, including a zero-
  backend-requests assertion for the locked path.

## Architectural Decision

**The threshold check is duplicated at two call sites (Dashboard,
page) on purpose, not centralized into one router-level guard.** This
app has no route-guard/middleware concept today (every existing route
in `App.tsx` is a bare `<Route>`, no wrapper) — introducing one for
this single feature would be new infrastructure for one caller. Two
calls to one pure, cheap function is simpler and matches how this app
already does every other "is X available" check (each page calls the
service itself; see `LessonPage`/`GamePage`'s own apprentice-limit
checks).

**Read counts through the existing `lesson`/`vocab` members, not a new
`AppContextValue.grammar` member.** A first draft assumed a `grammar`
service was already exposed on context, matching how `vocab` is —
checked against the actual source, it isn't. Rather than adding a new
context member (and updating both `AppContext.tsx` and
`renderWithApp.tsx` to register it, with the drift risk that implies),
this task uses `StartLessonUseCase.getGrammarLearnedCount()`, which
already wraps the same `GrammarService.getLearnedCount()` call and is
already wired everywhere `lesson` is — zero new production wiring.

**No "just unlocked" transition state.** A first draft's `LearnableCallout`-based
transition moment had no acceptance criterion backing it — an aspiration, not a
built requirement. Cut per this plan's pareto pass: the plain unlocked tile
already delivers the actual capability (discoverable, working entry point);
a celebratory transition is a distinct, independently-scoped enhancement.

**This task owns the locked-path e2e proof; task 3.3 owns only the
session proof.** Splitting these means either capability can regress
and fail its own dedicated case, rather than both riding on one
bundled Playwright spec whose failure wouldn't say which half broke.

## Test Cases

- Below vocab threshold: locked, regardless of grammar.
- Below grammar threshold: locked, regardless of vocab.
- At or above both thresholds (including the exact boundary): unlocked.
- Dashboard, below threshold: no `onClick`, click produces no
  navigation, message names the gap.
- Dashboard, above threshold: `onClick` present, navigates correctly.
- Direct navigation to `/conversation` below threshold (unit): locked
  explanation, no live recording UI.
- Direct navigation to `/conversation` below threshold (e2e, seeded):
  locked explanation, zero backend requests.
- Seeded above-threshold learner (e2e): unlocked Dashboard tile,
  navigates through to `/conversation`.
