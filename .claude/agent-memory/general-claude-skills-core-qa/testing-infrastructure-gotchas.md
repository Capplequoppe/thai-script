---
name: testing-infrastructure-gotchas
description: Non-obvious test-infrastructure facts and failure modes in thai-script (vitest env, missing RTL extras, jsdom audio/canvas, AppContext singletons)
metadata:
  type: project
---

Verified 2026-09-05 while reviewing the game-modes execution plan. Re-verify before
relying on any of these — they are repo-state claims, not permanent truths.

- **No global vitest environment.** `vite.config.ts` sets only `test.exclude`; the
  default env is `node`. The established convention is a per-file
  `// @vitest-environment jsdom` docblock on line 1 (see
  `src/presentation/hooks/useReviewSession.test.ts`). A render test without it
  fails with "document is not defined".
- **No page- or component-level render test exists yet.** No `ReviewPage.test.tsx`,
  no `DrawingQuiz.test.tsx`. The nearest precedent is a hook test driven by
  `vi.fn()` doubles. Any plan claiming "matches how DrawingQuiz/ReviewPage are
  covered today" is claiming a precedent that does not exist.
- **Missing RTL extras**: `@testing-library/jest-dom` and
  `@testing-library/user-event` are not dependencies. No `toBeInTheDocument`, no
  `userEvent`; with `globals` off, RTL's auto-`cleanup` does not register.
- **jsdom does not implement `HTMLMediaElement.play`.** The repo-wide audio idiom
  is `new Audio(url).play().catch(() => {})` (`DrawingQuiz.tsx`); under jsdom
  `play()` returns `undefined`, so `.catch` throws `TypeError`. Any render test of
  an audio-on-mount component needs an `Audio` stub first.
- **`DrawingCanvas` is jsdom-safe** — it guards every `getContext("2d")` result, so
  it renders (jsdom just logs "Not implemented"). Don't assert on drawn pixels.
- **`AppProvider` has no DI seam.** `src/presentation/context/AppContext.tsx`
  builds every repository/service/use-case as a module-level `const` bound to a
  real `LocalStorageAdapter`. Tests either render a hand-built
  `<AppContext.Provider value={...}>` (bypassing the real wiring) or seed real
  `localStorage` and use the singletons. The latter works because
  `StorageCardRepository` is stateless and calls `storage.load()` on every query.
- **Common failure mode to look for in this repo**: "SRS state untouched" claims
  scoped to a card's `schedule` only. All SRS state lives in one localStorage blob
  (`thai-srs-state`) that also holds achievements/streak/sessionHistory, and
  `AppProvider.checkAchievements` writes to it. Assert the whole serialized blob.

Related: [[game-modes-plan-review]]
