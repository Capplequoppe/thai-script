---
doc_type: reference
title: "Task 1.2 — The deck slide type in LessonIntro"
description: Render a validated in-house deck as slides beside the existing symbol cards, dispatching on LessonContent and keeping the video path unchanged.
covers:
  - src/presentation/components/organisms/LessonIntro.tsx
  - src/presentation/components/organisms/LessonIntro.test.tsx
  - src/presentation/components/organisms/DeckSlide.tsx
  - src/presentation/components/organisms/DeckSlide.test.tsx
  - src/presentation/pages/LessonPage.tsx
  - src/presentation/pages/CatchUpPage.tsx
  - src/presentation/test-utils/renderWithApp.tsx
  - src/presentation/components/organisms/Flashcard.tsx
status: stable
task_id: "1.2"
task_status: complete
depends_on: ["1.1a"]
size: medium
verify:
  - npm run build
  - npm test -- src/presentation
  - npx biome check src/presentation/components/organisms src/presentation/pages src/presentation/test-utils
ac_enforcement:
  - "AC1 -> two cases in src/presentation/components/organisms/LessonIntro.test.tsx, one per LessonContent arm"
  - "AC2 -> a case in src/presentation/components/organisms/DeckSlide.test.tsx rendering an invalid deck"
  - "AC3 -> three cases in src/presentation/components/organisms/DeckSlide.test.tsx, one per state"
  - "AC4 -> a case in src/presentation/components/organisms/DeckSlide.test.tsx asserting markup in a slide field is shown as text"
  - "AC5 -> a case in src/presentation/components/organisms/DeckSlide.test.tsx advancing between two audio slides"
  - "AC6 -> a case in src/presentation/components/organisms/LessonIntro.test.tsx counting onComplete calls"
  - "AC7 -> a case in src/presentation/components/organisms/DeckSlide.test.tsx asserting a retrieval step renders without its answer"
weight_votes:
  - "author -> 8"
  - "structure-estimator -> 5"
  - "implementation-estimator -> 8"
  - "unknowns-estimator -> 3"
  - "calibration-estimator -> 5"
weight_voted: "sha256:e6eb5f96059bc2482a76dd4fa99a6cf00bde7a4645406fa9a2606a410ff82ba8"
ac_tests:
  - "AC1 -> src/presentation/components/organisms/LessonIntro.test.tsx::a video-arm lesson renders the video element, unchanged"
  - "AC2 -> src/presentation/components/organisms/DeckSlide.test.tsx::renders the validation failure and no slide content"
  - "AC3 -> src/presentation/components/organisms/DeckSlide.test.tsx::an empty deck and a failed fetch produce different output"
  - "AC4 -> src/presentation/components/organisms/DeckSlide.test.tsx::shows markup characters literally rather than interpreting them"
  - "AC5 -> src/presentation/components/organisms/DeckSlide.test.tsx::plays audio again when advancing to a slide sharing the same clip"
  - "AC6 -> src/presentation/components/organisms/LessonIntro.test.tsx::stepping backward and forward after completion does not call it again"
  - "AC7 -> src/presentation/components/organisms/DeckSlide.test.tsx::keeps the reveal slide's answer hidden until the learner acts"
red_proof:
  - "AC5 -> Changed DeckSlideContent's audio-playback effect dependency array from [slide.id] to [audioUrl] in DeckSlide.tsx, so two consecutive slides sharing one audioUrl would not retrigger… [see red-proofs/]"
  - "AC6 -> Added a useEffect in LessonIntro.tsx that fires onComplete() whenever isLast becomes true (a plausible but wrong effect-based implementation), instead of only on the explicit final… [see red-proofs/]"
  - "AC2 -> Review-round addition: forced extractAudioUrls' containment check (`audioUrl.startsWith(prefix) && !audioUrl.includes(\"..\")`) to always pass (`if (true)`), so a refused audioUrl out… [see red-proofs/]"
red_proof_waived:
  - "AC1 -> traced: Both LessonIntro.test.tsx cases for AC1 read the same dispatch branch proven correct by the AC6 mutation's revert/green cycle (the whole component re-rendering correctly under mutat… [see red-proofs/]"
  - "AC3 -> traced: Directly hit a real red/green cycle while implementing isUnauthoredEmptyDeck during the original build: before that helper existed, the empty-deck fixture legitimately failed valida… [see red-proofs/]"
  - "AC4 -> traced: The component renders slide.body via React text children with no dangerouslySetInnerHTML anywhere in the file (grep-verified, re-confirmed during the review pass); did not additiona… [see red-proofs/]"
  - "AC7 -> traced: Reveal-state gating reuses the same useResetOnCardChange + useState('revealed') pattern already proven correct by Flashcard.test.tsx's own reveal tests; did not additionally mutate… [see red-proofs/]"
lint:
  before: 33
  after: 34
  outcome: violations
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 1.2 — The deck slide type

`LessonIntro` already builds a `Slide[]` and steps through it, mixing
`VideoSlide` with the symbol-card slides. This adds a deck slide type to that
same list. **The symbol cards stay** — a deck replaces the video segment, not
the lesson page.

Both consumers of `LessonIntro` are in scope: `LessonPage` (`/lesson/:n`) and
`CatchUpPage` (`/catch-up/:n`).

## Acceptance Criteria

- AC1: A lesson whose `LessonContent` is the deck arm renders its slides in
  declared order ahead of the symbol cards. A lesson whose content is the video
  arm renders exactly what it renders today, with no change to the video
  element's behaviour.
- AC2: Deck JSON is validated against the schema task 1.1 declares before
  any of it renders. A deck failing validation renders a message naming what
  failed, and renders no partial slides.
- AC3: Three states are distinguishable on screen and never collapse into
  one another: the lesson serves video and has no deck (not an error, and not an
  empty deck); a deck loads and declares zero slides (reported as an empty
  deck); a deck fails to load or parse (reported with its reason).
- AC4: Every slide field renders as a text node. The deck renderer contains
  no `dangerouslySetInnerHTML`; a slide whose text contains markup shows that
  markup literally rather than interpreting it.
- AC5: Slide audio is replayable, and advancing to another slide resets
  playback state. Effects key on the **slide's own identity**, not on its audio
  URL — two consecutive slides sharing a clip must still reset, which is the
  rule the repo's existing organisms already follow.
- AC6: Completing the last slide calls `onComplete` exactly once, matching
  the video path's contract. Stepping backwards and forwards again does not call
  it a second time.

- AC7: A retrieval step renders its prompt with the answer not present in the
  DOM until the learner acts. Reveal state is read from `Flashcard.tsx`, which
  owns it — `WordCard.tsx` has none.

## Test cases

- A deck-arm lesson renders its first slide's text; a video-arm lesson renders
  the video element.
- A deck declaring slides out of order renders them in declared order, not
  array order, if the two differ.
- An invalid deck (missing a required field) renders the failure reason and no
  slides.
- A zero-slide deck and a failed fetch produce **different** output; assert
  both, in the same file, so a future change collapsing them fails.
- A slide whose caption contains `<b>x</b>` displays those characters.
- Two consecutive slides sharing one audio URL: advancing resets playback.
- `onComplete` fires once across a forward, backward, forward traversal.
- A lesson reached through `/catch-up/:n` renders the same deck as
  `/lesson/:n`.

## Architectural Decision

**A slide type beside the symbol cards, not a new page.** `LessonIntro`'s
`Slide[]` already interleaves a media slide with card slides, and the symbol
cards are the part of the current lesson flow that works. Replacing the page
would discard them and duplicate their SRS wiring.

*Rejected:* rendering deck HTML directly. It would make authoring more
expressive and puts generated, hand-editable content on a path to the DOM —
the trust inventory's sink. Slides carry structured fields rendered as text.

*Rejected:* validating lazily, per slide, as each renders. A deck that fails
half way through has already shown the learner a partial lesson, and the
failure arrives as a blank slide rather than a reason.
