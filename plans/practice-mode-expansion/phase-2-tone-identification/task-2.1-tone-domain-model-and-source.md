---
doc_type: reference
title: "Task 2.1 — Tone domain model + item source"
description: A tone-only GameItem kind whose eligibility comes from the existing toneIdentification VocabCard property and whose content comes from VocabEntry (via a helper shared with VocabCardGenerator) — a separate GameItemSelectionService constructor slot, not a GameItemSource.
covers:
  - src/domain/game/types.ts
  - src/domain/game/services/ToneGameItemSource.ts
  - src/domain/game/services/ToneGameItemSource.test.ts
  - src/domain/game/services/GameItemSelectionService.ts
  - src/domain/game/services/GameItemSelectionService.test.ts
  - src/domain/vocabulary/services/toneSyllables.ts
  - src/domain/vocabulary/services/toneSyllables.test.ts
  - src/domain/vocabulary/services/VocabCardGenerator.ts
status: draft
task_id: "2.1"
task_status: pending
depends_on: ["1.1"]
size: medium
verify:
  - npm test -- src/domain/game
  - npm test -- src/domain/vocabulary
  - npm run build
ac_enforcement:
  - "AC1 -> a case in ToneGameItemSource.test.ts: a fixture VocabEntry with two syllables carrying tones, asserting the produced content's thaiWord/syllables match toneSyllablesOf(entry) exactly, and a toneIdentification card exists only for eligibility (a fixture where the card's own syllables field is absent/undefined still produces correct content, proving content never comes from the card)"
  - "AC2 -> a case: a vocab word with no toneIdentification card (no determinable tone) is excluded from tone eligibility, without affecting its eligibility for the Words pool"
  - "AC3 -> a case asserting a tone item's audioUrl comes from the matching VocabEntry's thai_audio_file"
  - "AC4 -> a case in GameItemSelectionService.test.ts: selectRound called with includeTonePractice: true and pools: [\"script\"] (vocab NOT checked) still returns tone items, proving tone inclusion is independent of the pools array and does not require ToneGameItemSource to be registered in the sources array at all"
  - "AC5 -> a case asserting selectRound with includeTonePractice omitted or false never returns a tone item, and every existing case in this test file passes unmodified"
  - "AC6 -> a case asserting every tone item's challengeDirection is the single literal value ToneChallengeDirection defines, never randomized"
  - "AC7 -> a case in toneSyllables.test.ts: toneSyllablesOf(entry) returns only syllables with a determinable tone, matching exactly what VocabCardGenerator.ts already computes inline today — this is a refactor-safety test, not new behavior"
  - "AC8 -> a case: prioritizeWeakItems true has no effect on tone item selection (tone items are documented as permanently neutral-weight, per the Architectural Decision) — asserted by confirming a heavily-lapsed tone-eligible word's tone item is drawn no more often than a fresh one across a seeded run"
generated: {by: claude-sonnet-5/agent, at: 2026-09-05}
profile_version: 1
---

# Task 2.1 — Tone domain model + item source

## Description

**Revised after panel review rejected this task's earlier "read the card's
own `syllables`/`promptWord` directly" design** — it was already broader
than its own stated boundary, unsafe against vocab cards persisted before
`VocabCard.syllables` existed (which can be `undefined` on real, already-
shipped cards), and unnecessary given the source already needs
`VocabEntry` anyway. Read CONTEXT.md's tone-identification section before
writing anything.

- Add `ToneItemContent` to `GameItemContent`'s union: `{ kind: "tone";
  thaiWord: string; syllables: readonly { text: string; tone: string }[];
  audioUrl?: string }` — **no `challengeDirection` on the content type**
  (same split as task 1.1's `SentenceItemContent`). `ToneChallengeDirection`
  is a single-literal type (e.g. `"identification"`) — kept as a field on
  `ToneGameItem = ToneItemContent & { challengeDirection:
  ToneChallengeDirection }`, not omitted, so every generic consumer of
  `item.challengeDirection` needs no special case.
- **Extract `toneSyllablesOf(entry: VocabEntry): {text: string; tone:
  string}[]`** into a new file, `src/domain/vocabulary/services
  /toneSyllables.ts` — the exact filter+map `VocabCardGenerator.ts`
  already computes inline (`word.syllables.filter(s => s.tone).map(s =>
  ({text: s.text, tone: s.tone}))`, approximately — read the real lines
  before copying). Update `VocabCardGenerator.ts` to call this helper
  instead of computing it inline, so the two call sites share one
  definition. AC7 is a refactor-safety test: the generated
  `toneIdentification` card's `syllables` field must be unchanged by this
  refactor.
- Implement `ToneGameItemSource`: **eligibility only** from
  `CardRepository.findAll("vocab")` filtered to cards whose `property`
  equals a single anchored constant (`const TONE_PROPERTY: VocabProperty =
  "toneIdentification"` — anchor it to the typed union, since
  `VocabCard.property` itself is untyped `string`, unlike
  `WordGameItemSource`'s id-parse-and-validate approach for its own
  properties). **Content** — `thaiWord`, `syllables`, `audioUrl` — comes
  entirely from the matching `VocabEntry` (constructor-injected, same
  array `WordGameItemSource` already receives): `entry.thai`,
  `toneSyllablesOf(entry)`, `entry.thai_audio_file`.
- **Do not implement `GameItemSource`.** `ToneGameItemSource` has no
  `pool` — it is consulted through its **own, separate constructor
  parameter** on `GameItemSelectionService`, added alongside the existing
  `sources` array, read whenever `config.includeTonePractice` is `true`
  regardless of `config.pools`. This is the corrected version of an
  earlier draft that said to add it to the `sources` array — that
  instruction is wrong and must not be followed; the shipped
  `eligibleContent` filters `sources` strictly by `pools.includes
  (source.pool)`, which cannot express "always included."

## Acceptance Criteria

- AC1: A tone item's content matches `toneSyllablesOf(entry)`/`entry.thai`
  exactly — proven with a fixture where the card's own `syllables` field
  is absent, so content provably never comes from the card.
- AC2: A word with no `toneIdentification` card is excluded from tone
  eligibility, still eligible for Words.
- AC3: A tone item's `audioUrl` comes from `VocabEntry.thai_audio_file`.
- AC4: `includeTonePractice: true` returns tone items even when `"vocab"`
  is not in `pools` — proving the separate-constructor-slot design, not a
  `sources`-array membership.
- AC5: `includeTonePractice` omitted/`false`: never a tone item; all
  existing cases pass unmodified.
- AC6: Every tone item's `challengeDirection` is the one literal value.
- AC7: `toneSyllablesOf` matches what `VocabCardGenerator` already
  computes today — a refactor-safety guard.
- AC8: `prioritizeWeakItems` has no effect on tone item selection (see
  Architectural Decision).

## Architectural Decision

**Content from `VocabEntry`, not the card** — corrected from an earlier
draft's rejected "narrow exception." The `toneIdentification` card is used
for exactly one thing: does this word have determinable tone at all
(eligibility). This matches every other pool's rule with no exception
needed, and is immune to the real, verified risk that older persisted
cards can have `syllables === undefined`.

**A separate constructor parameter, never `GameItemSource`**: `pool:
GameCardPool` is a claim about which `CardRepository` partition a source
draws from. Tone practice is independent of pool selection by design
(CONTEXT.md), so no honest value of `pool` describes it — declaring one
anyway (`"vocab"`) would make tone items appear exactly when Words is
checked, the opposite of AC4.

**`prioritizeWeakItems` does not weight tone items — stated and tested,
not silently inherited.** Tone items are never drawn from
`GameItemSelectionService`'s pool-filtered `weightOfFor` path (that method
only scans cards in the requested `pools`, and tone is pool-independent by
construction), so giving them a real weight would require scanning vocab
regardless of `pools` — a second, parallel weighting path for one toggle.
Declaring them permanently neutral-weight is the simpler, honestly-stated
choice; AC8 is the regression test that keeps it from silently changing
in either direction.

## Test Cases

- Tone content matches `toneSyllablesOf`/`entry.thai`, independent of the
  card's own (possibly absent) `syllables` field.
- A word with no `toneIdentification` card: excluded from tone, still
  eligible for Words.
- Tone item audio: from `VocabEntry`.
- `includeTonePractice: true` with `pools: ["script"]`: tone items still
  appear.
- `includeTonePractice` false/omitted: no tone items; existing cases
  unaffected.
- Tone item direction: always the single defined value.
- `toneSyllablesOf` matches `VocabCardGenerator`'s existing computation.
- `prioritizeWeakItems` does not bias tone item selection.
