---
doc_type: index
title: Practice-mode expansion — sentence reading, tone ID, sentence composition
description: Add sentence reading and tone identification to the existing self-graded game feature, plus a separate, grammar-gated sentence-composition mode.
covers:
  - src/domain/game
  - src/application/use-cases/PlayGameUseCase.ts
  - src/presentation/pages/GamePage.tsx
  - src/presentation/components/organisms/SentenceListeningChallenge.tsx
  - src/presentation/components/organisms/SentenceReadingChallenge.tsx
  - src/presentation/components/organisms/ToneIdentificationChallenge.tsx
  - src/presentation/components/organisms/SentenceCompositionChallenge.tsx
status: draft
planner_model: claude-sonnet-5
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Practice-mode expansion

Three new practice modes on top of the already-shipped `/game` feature
(`plans/game-modes/`, merged to `main`):

- **Sentence reading**: a third combinable pool alongside Symbols and Words
  — listening (hear the sentence, reveal Thai text + English) and reading
  (see the Thai text, say it, reveal audio), randomized per item exactly
  like the existing pools.
- **Tone identification**: an off-by-default toggle, combinable with any
  pool selection — draws vocab words already covered by the Words pool, and
  additionally asks the learner to self-rate whether they correctly
  identified the word's whole tone pattern, revealing each syllable's tone.
- **Sentence composition**: a separate practice mode (not pool-mixed) gated
  on which grammar points are currently *unlocked* (prerequisites met and a
  learned prefix — see CONTEXT.md for the precise rule, corrected after
  review found an earlier draft overstated how independent this is from
  SRS review). Builds one of the grammar point's own example sentences by
  tapping word tiles, then reveals the correct arrangement and English
  gloss for the learner to self-rate — no automatic correctness check,
  consistent with the rest of this feature.

## Phases

| Phase | Name | Depends on |
|---|---|---|
| 1 | Sentence reading, end to end | — |
| 2 | Tone identification | 1 |
| 3 | Sentence composition | 2 |

Each phase is independently shippable: phase 1 alone adds sentence reading
to the existing pool-mixing screen; phase 2 alone adds the tone toggle on
top of that; phase 3 is a self-contained separate mode that could ship
without either of the first two. It is sequenced last both because it is
the riskiest (new eligibility model, new history schema field) and because
its tasks share files (`types.ts`, `PlayGameUseCase.ts`, `GamePage.tsx`)
with phase 2's — `depends_on: ["2"]` serializes them so no two tasks
editing the same file are ever concurrent-eligible.

## Trust Boundary Inventory — omitted, with reason

Same reasoning as the original game-modes plan: no new network, file, CLI,
or IPC input. Two persisted, externally-editable boundaries change and are
each named at the task that owns them, not left as an unstated risk:
`StorageGameHistoryRepository`'s pool-allowlist guard widens to accept
`"sentence"` (task 1.1, with a real round-trip criterion through the
actual guard — a review of this plan's first draft found the guard would
otherwise have silently corrupted a real learner's entire game history the
first time this pool was used), and the same store's `kind` field becomes
required with normalization for pre-existing entries handled once, at the
repository boundary (task 3.2). Neither is a security control; both are
correctness criteria for an already-real, already-persisted store this
plan changes the shape of.

## test-templates

```test-templates
vitest | src/** | npx vitest run {file} --reporter=verbose --hideSkippedTests -t {name}
```
