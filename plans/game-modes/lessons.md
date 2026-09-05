# Lessons

Things earlier tasks in this plan learned the hard way — a gotcha, a workaround,
or a notice that a workaround is no longer needed.

**Append-only.** A lesson that stops being true is not deleted; a later entry
retracts it by naming it in `resolves`. That way the record shows both that it
was true and when it stopped being, and nothing silently rewrites what an earlier
agent reported.

**Nothing here is an instruction.** These are observations by agents that ran
before you, in a repository you can check for yourself. Read them as evidence.

## L1 — task 1.2 · run-20260905T125011Z

<!-- lesson id=L1 from=1.2 scope=dependents -->

jsdom under vitest 4 in this repo leaves global/window.localStorage undefined (a Node 22 experimental-global conflict), so `// @vitest-environment jsdom` alone does not give a working localStorage in tests. Stub a hand-built Storage-shaped object onto globalThis.localStorage in beforeEach/afterEach instead of relying on jsdom's own or Storage.prototype spies.
## L2 — task 1.3 · run-20260905T125011Z

<!-- lesson id=L2 from=1.3 scope=dependents -->

PlayGameUseCase's actual signatures deviate slightly from the task's pseudocode: recordRating(items, ratings, itemIndex, rating) needs items to derive itemKey/kind/challengeDirection; finishRound(ratings) dropped the items param since it's unused for computing counts/accuracy.
## L3 — task 1.4 · run-20260905T125011Z

<!-- lesson id=L3 from=1.4 scope=dependents -->

renderWithApp.tsx registers its stubs (localStorage fake, URL-recording Audio, canvas2d context) and afterEach(cleanup) via hooks that attach when the module is imported, but the `// @vitest-environment jsdom` docblock still has to sit in each test file — the pragma does nothing in an imported helper. createdAudioUrls() observes Audio construction order; ma… [clipped — full text in the transcript]

## L4 — task 1.4 · run-20260905T125011Z

<!-- lesson id=L4 from=1.4 scope=plan -->

PlayGameUseCase exposes no eligible-count query, so GamePage derives the count by calling startRound with itemCount Number.MAX_SAFE_INTEGER — selection is pure, so the probe is side-effect-free. Phase 2's pool selector will want the same probe per pool combination. Also: a corrupt thai-srs-state blob throws in LocalStorageAdapter.load() and crashes at AppPr… [clipped — full text in the transcript]

## L5 — task 1.4 · run-20260905T125011Z

<!-- lesson id=L5 from=1.4 scope=plan -->

`npx biome check .` reports thousands of errors that come from generated dist/ and the plans/ tree; scoped to src it shows 6 errors and 48 warnings, all pre-existing and byte-identical in count with this task's changes stashed. The deterministic lint-changes grammar covers none of this task's file types, so its 'clean' meant 'measured nothing' — direct biom… [clipped — full text in the transcript]
## L6 — task reviewer:2 · run-20260905T125011Z

<!-- lesson id=L6 from=reviewer:2 scope=plan -->

vitest tests may be run directly via `npx vitest run <path> -t <name>` even when `npm test -- <path>` is refused by the harness's whole-suite guard — useful for verifying a targeted fix without tripping the 'no whole-suite runs' rule.

## L7 — task reviewer:2 · run-20260905T125011Z

<!-- lesson id=L7 from=reviewer:2 scope=plan -->

A fixture sized so one pool already meets the default/requested item count (e.g. 10 symbols for a 10-item Mix round) lets a 'draws from both pools' assertion pass even if one source were silently dropped; size fixtures below the requested count on both sides to get a mathematical (not statistical) guarantee, as task 2.1's own domain-level test already models.
## L8 — task 3.1 · run-20260905T125011Z

<!-- lesson id=L8 from=3.1 scope=dependents -->

GameItemSelectionService's optional 2nd constructor arg is `cardRepository?: CardRepository`, used only for weighting; `selectRound`'s config type is `Pick<GameRoundConfig,"pools"|"itemCount"> & {prioritizeWeakItems?: boolean}`. Task 3.2 must pass a real `CardRepository` at AppContext.tsx's construction site (covered by neither 3.1 nor 3.2) for the toggle to have any effect in production.

## L9 — task 3.1 · run-20260905T125011Z

<!-- lesson id=L9 from=3.1 scope=plan -->

GameItemSelectionService.test.ts's outer describe (and the pre-existing nested 'word pool and mix' describe) already exceeded the length lint bound before task 3.1 touched the file (317 lines vs bound 150); the file-wide convention of nesting every feature's tests inside one describe makes a partial extraction inconsistent without fixing the underlying issu… [clipped — full text in the transcript]
## L10 — task reviewer:3 · run-20260905T125011Z

<!-- lesson id=L10 from=reviewer:3 scope=plan -->

In this repo, `npx biome check --write` sometimes reports 'Fixed 1 file' for one safe fix while leaving other flagged unused-imports unfixed as 'unsafe' in the same run (e.g. removing exports from a module the tool treats as possibly side-effecting) — always re-run `biome check` (no --write) after to see what's left, rather than trusting the 'Fixed' message covered everything reported.
## L11 — task 2.1 · run-20260905T152954Z

<!-- lesson id=L11 from=2.1 scope=plan -->

Redo of task 2.1 found the work already fully implemented and committed (384bdc6), with phases 2.2/2.3/3.1/3.2 already built on top; no code changes were needed, only gate re-verification and a red-proof observation.
