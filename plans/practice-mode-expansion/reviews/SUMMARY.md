# Execution Plan Review Summary: practice-mode-expansion

## Review Mode

Subagent Mode (no `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` flag set), 4 experts.

## Review Panel

| Expert | Report |
|--------|--------|
| QA Lead (`qa` agent) | [qa-lead-review.md](./qa-lead-review.md) |
| Frontend Engineer (`frontend-engineer` agent) | [frontend-engineer-review.md](./frontend-engineer-review.md) |
| Systems Architect (`systems-architect` agent) | [systems-architect-review.md](./systems-architect-review.md) |
| Plan Structure Expert (always deployed) | [plan-structure-expert-review.md](./plan-structure-expert-review.md) |

## Statistics

- Total findings (plan-level + quality-table rows, all four reports): 91
- Critical: 8 (before dedup — 3 independent clusters, each found by 2-3 reviewers) | Major: ~55 | Minor/suggestion: ~28
- Accepted: 85 | Deferred: 4 | No-change-needed (reviewer's own "pass"): 2
- Every accepted finding was applied directly to the plan documents (no separate implementation exists yet to patch).

## Key cross-reviewer findings

This panel found more, and more serious, issues than the original
game-modes plan's own review — including a bug that would have corrupted
a real user's entire game history the first time this plan's own headline
feature was used, found **independently by three of four reviewers**.

1. **`StorageGameHistoryRepository`'s pool allowlist would have silently
   destroyed all game history** (QA-P1, FE-P1, SA-P2/P3). Adding
   `"sentence"` to `GameCardPool` doesn't fail `tsc` (a `readonly
   GameCardPool[]` literal isn't checked for exhaustiveness), but the
   repository's shape guard rejects the whole stored array on the first
   entry that fails it — and the *next* `save()` overwrites history with
   just the new entry. Composition's pools-less entries hit the identical
   failure. Fixed: the allowlist is derived exhaustively (task 1.1), and
   `kind` becomes a **required** field normalized once at the repository
   boundary (task 3.2) rather than optional-and-re-tested by every
   consumer — the same lesson the original plan's own review already
   taught, now applied one layer deeper.
2. **Tasks 2.1 and 2.2 gave contradictory instructions that could not
   both be executed** (QA-P3, SA-P1). 2.2 said to add `ToneGameItemSource`
   to the pool-filtered `sources` array; 2.1 required tone items
   regardless of pool selection. The shipped `eligibleContent` filter
   makes these mutually exclusive. Fixed: `ToneGameItemSource` is not a
   `GameItemSource` at all — it is consulted through its own, separate
   constructor parameter.
3. **`GameItemContent`/`GameItem` were being modeled as one union**,
   which would have forced dead branches into `assignDirection` and
   `weightOfFor` for composition items that never flow through that
   pipeline (SA-P5). Fixed: `GameItemContent` (and therefore
   `GameItemSource`) covers only the four pool/toggle-sourced kinds;
   `GameItem` is wider and includes composition, used only by
   `PlayGameUseCase`'s generic rating/summary functions.

One genuine product question was put to the user directly: all 55
sentences in the shipped data have no audio, making the "listening"
direction currently unreachable for real content. The user's answer —
keep the existing audio-gated direction assignment, since it already *is*
the dynamic filter that will make listening reachable the moment audio
data exists — is reflected throughout (task 1.1 AC3, task 1.3 AC3,
CONTEXT.md, phase 1 README).

## Disposition

Every finding id from every review appears here, exactly once.

### Plan Structure Expert

| Finding | Disposition | Note |
|---|---|---|
| Quality row 1 (phase 2 `depends_on` rationale missing) | accepted | Phase 2 README now states the `covers`-overlap reason for `depends_on: ["1"]`, mirroring phase 3's existing explanation |

### QA Lead

| Finding | Disposition | Note |
|---|---|---|
| P-1 / Q1 (history corruption, both new entry shapes) | accepted | Task 1.1 AC8 (real round-trip for `pools:["sentence"]`), task 3.2 (required `kind`, repository-boundary normalization, AC4 mixed-store real round-trip); CONTEXT.md rewritten |
| P-2 / Q2 (all shipped sentences audio-less, listening unreachable) | accepted (per user decision) | Kept both directions; task 1.1 AC3 adds a real-`sentences.json` regression test; task 1.3 AC3 covers the audio-less reveal explicitly; CONTEXT.md states this plainly |
| P-3 (task 2.2 contradicts 2.1's AC4) | accepted | Task 2.1/2.2 rewritten: `ToneGameItemSource` is not a `GameItemSource`; task 2.2 AC2 pins `pools:["script"]` (vocab excluded) so the fixture actually catches the bug |
| P-4 / Q4 (2.1/3.1 both `depends_on:["1.1"]`, both touch `types.ts`) | accepted | `3.1.depends_on` set to `["2.1"]`; phase 2/3 READMEs' task tables now quote frontmatter exactly |
| P-5 / Q5,Q6,Q7,Q8 (multi-select refactor understated: `EMPTY_POOL_MESSAGES`/`DEFAULT_POOL_CHOICE`/`POOL_CHOICE_LABELS`/`countEligibleItems`/stable-reference/zero-pools-vs-zero-eligible/test replacement) | accepted | Task 1.3 fully rewritten: AC6 (default + zero-pools + zero-eligible, three distinct states), AC10 (stable-reference proof), Description names every successor explicitly and the tests that must be replaced, not adapted |
| P-6 / Q9 (`countEligibleItems` ignores `includeTonePractice`) | accepted | Task 2.3 AC8 + Description names the threading explicitly, including the zero-pools-plus-tone-only case (AC6) |
| P-7 / Q10 (`renderWithApp` fixture gaps, not in any `covers`) | accepted | Added to `covers` of tasks 1.3, 2.3, 3.2, 3.3; each names its specific new fixture; 1.3 and 3.3 re-weighted to `x-large`/13 |
| P-8 / Q11,Q12 (`getUnlockedGrammarPoints` misdescribed; composition rounds are tiny) | accepted | CONTEXT.md and task 3.1's AD corrected to the accurate rule; task 3.3 AC5 adds the small-nonzero-eligible-count case explicitly |
| P-9 / Q13,Q14 (AC4's "or an equivalent" unfalsifiable; back-compat untested against a real payload) | accepted | Superseded by the required-`kind`/repository-normalization redesign — there is no "equivalent" left to be vague about; task 3.2 AC4 seeds a real mixed store through the real guard |
| P-10 / Q15 (optional grammar provider, untested "never asked" state) | accepted | Parameter is now required (task 3.2 AC3); harness factories updated in the same task |
| P-11 / Q16 (weak-item weighting unspecified for new kinds) | accepted | Task 1.1 AC7 (sentence cards weighted via a new `itemKeyOfCard` branch); task 2.1 AC8 + AD (tone items documented and tested as permanently neutral-weight) |
| P-12 / Q17 (SRS-isolation doc comment erosion) | accepted | Task 3.2 Description states the narrowed, still-true claim explicitly |
| P-13 / Q18 (phase 3 e2e criterion — `kind` never asserted through the page) | accepted | Task 3.3 AC7 |
| P-14 / Q19 (Trust Boundary omission under-justified) | accepted | Plan README's omission paragraph now names both boundary-crossings and the task that owns each |
| P-15 (partially-toned words reveal an incomplete syllable set) | deferred | Real, minor UX polish; not blocking — revisit if it comes up in practice. `toneSyllablesOf` already only returns determinable-tone syllables (matching what's persisted), so the reveal is at least internally consistent |
| P-16 / Q20 (out-of-range `correctExample` index; AC1 flaky for 2-tile entries) | accepted | Task 3.1 AC7 (out-of-range guard) and AC1 restated as a permutation check, exact order deferred to AC5's seed |
| Q3 (AC3, task 1.2, diff-property not behavior) | accepted | Restated behaviorally |
| Q21 (task 1.2 AC3, same shape as 3.2's old AC6) | accepted | Same fix as above |
| Q22 (task 1.1 AC3 non-deterministic phrasing) | accepted | Restated as an exact zero-rng-call assertion plus the real-`sentences.json` regression case |
| Q23 (task 1.1 AC3, suggestion) | accepted | Same as above |
| Q24 (task 1.1 AC4, suggestion) | no_change_needed | Already exact-sequence as written |

### Frontend Engineer

| Finding | Disposition | Note |
|---|---|---|
| P-1 / Q1 (history-corruption regression) | accepted | Same fix as QA-P1/SA-P2 above |
| P-2 / Q2 (`itemKeyOfContent`/`itemKeyOfCard` won't compile for `sentence`, no design guidance) | accepted | Task 1.1 converts all four functions (plus `PlayGameUseCase.itemKeyOf`) to exhaustive switches with a `never` default, and explicitly extends `itemKeyOfCard` for `SentenceReviewCard` with a weighting AC (AC7) |
| P-3 / Q3,Q4,Q5 (reset/audio-keying rule dropped from CONTEXT.md and all three new-organism tasks) | accepted | Restored to CONTEXT.md; added as AC9 (task 1.3), AC9 (task 2.3), AC8 (task 3.3) |
| P-4 / Q6 (composition mode's eligible-count and `handleRate` branch unspecified) | accepted | Task 3.3 Description names both mechanisms explicitly (AC2, AC7) |
| P-5 / Q7 (SRS-isolation doc comment erosion) | accepted | Same fix as QA-P12 above |
| Q8 (`SentenceEntry.id` vs. `SentenceCard.sentenceId` naming) | accepted | Task 1.1's Description states the match explicitly |
| Q9 (tile shuffle should reuse `sampleWithoutReplacement`) | accepted | Task 3.1 Description states this explicitly |
| Q10 (Input Mode UX when only Sentence Reading is checked) | accepted | Task 1.3 AC12 |
| Q11 (`renderWithApp`/`makeMixGame` precedent not pointed at explicitly) | accepted | Folded into the P-7/Q10(QA) fix — each task now names its fixture additions and points at the existing divergence |
| Q12 (`GamePage.tsx` complexity — 5 kinds, 2 modes, 4 toggles) | deferred | A real, correctly-identified architectural pressure point, but a presentation-layer refactor suggestion with no functional risk attached; worth a follow-up task if a future mode is added, not this plan |

### Systems Architect

| Finding | Disposition | Note |
|---|---|---|
| P-1 (tone source: `GameItemSource` can't express pool-independence) | accepted | Same fix as QA-P3 above — separate constructor parameter, not `GameItemSource` |
| P-2 (history corruption from `GameCardPool` widening) | accepted | Same fix as QA-P1 above |
| P-3 (composition's pools-less entries hit the same guard; `kind?` optional pushes back-compat to every consumer) | accepted | Required `kind`, repository-boundary normalization (task 3.2) |
| P-4 (tone "exception" broader than stated, unnecessary, unsafe for pre-migration cards, unenforced) | accepted | Task 2.1 fully rewritten: content from `VocabEntry` via a shared `toneSyllablesOf` helper; the card is eligibility-only |
| P-5 (`CompositionItemContent` folded into `GameItemContent`; `challengeDirection` placed inside content types) | accepted | `GameItem = SourcedGameItem \| CompositionGameItem` split (CONTEXT.md, tasks 1.1/2.1/3.1); content/direction split restored to match the shipped pattern in all three new content types |
| P-6 (optional `unlockedGrammarPoints`, no graceful degradation, weak precedent analogy) | accepted | Same fix as QA-P10 above |
| P-7 (weak-item weighting silently defeated for sentence/tone) | accepted | Same fix as QA-P11 above |
| P-8 (`countEligibleItems` unowned; AC6 has no mechanism) | accepted | Same fix as QA-P6 above |
| P-9 (`getUnlockedGrammarPoints` premise wrong; composition rounds tiny) | accepted | Same fix as QA-P8 above |
| P-10 (task-level `depends_on` contradicts phase-level serialization) | accepted | Same fix as QA-P4 above |
| P-11 (three non-exhaustive switches, no exhaustiveness guard) | accepted | Same fix as FE-P2 above |
| P-12 (Trust Boundary omission incomplete) | accepted | Same fix as QA-P14 above |
| P-13 (`audioUrl` permanently undefined; `promptGloss` vs. `englishMeaning` naming drift) | accepted | Task 3.1: `audioUrl` dropped from `CompositionItemContent`; field renamed to `englishMeaning` |
| P-14 (`VocabCard.property` untyped; tone source's mechanism inconsistent with `WordGameItemSource`'s) | accepted | Task 2.1 anchors `TONE_PROPERTY: VocabProperty` as a typed constant |
| Quality row 1 (task 1.2 AC3 diff-property) | accepted | Same fix as QA-Q3 |
| Quality row 2 (task 1.1 AC3 non-deterministic phrasing) | accepted | Same fix as QA-Q22 |
| Quality row 3 (task 3.2 AC2 delegation-mirroring assertion) | accepted | Restated as an exact literal-output assertion |
| Quality row 4 (task 2.3 AC6 names no observable mechanism) | accepted | Restated with the concrete zero-pools-plus-tone mechanism (now AC6) |
| Quality row 5 (task 1.3 AC1 "no loss of coverage" unfalsifiable) | deferred | Reasonable ask (enumerate exact test names to preserve) but the specific existing test names are only fully knowable once the executor is looking at the current `GamePage.test.tsx` — left as executor judgment against the Description's explicit "replace, don't adapt" carve-outs rather than a hardcoded list that could itself go stale |
| Quality row 6 (task 3.2 — no read-back/mixed-store test) | accepted | Same fix as QA-P1/P9 above |
| Quality row 7 (task 1.1/1.3 — nothing tests `pools:["sentence"]` surviving the guard) | accepted | Same fix as QA-P1 above |
| Quality row 8 (task 2.1 — no case for absent/empty `syllables`) | accepted | Superseded — content no longer comes from the card at all, so this failure mode is structurally eliminated rather than tested around |
| Quality row 9 (no case combines new kinds with `prioritizeWeakItems`) | accepted | Same fix as QA-P11 above |
| Quality row 10 (suggestion — drop `audioUrl`) | accepted | Same as P-13 |
| Quality row 11 (task 1.3 multi-select refactor scope, pass) | no_change_needed | Reviewer's own "pass" verdict |
| Quality row 12 (task 2.1 AD premise unsound) | accepted | Same fix as P-4 |
| Quality row 13 (task 3.1/CONTEXT rejected-alternative premise wrong) | accepted | Same fix as P-9/QA-P8 |
| Quality row 14 (task 3.2 AD precedent doesn't hold) | accepted | Same fix as P-6 |
| Quality row 15 (tasks 1.3/2.3/3.3 ADs, pass) | no_change_needed | Reviewer's own "pass" verdict |
| Quality row 16 (Trust boundary) | accepted | Same as P-12 |
| Quality row 17 (toggle naming inconsistency) | accepted | "Tone Identification" used everywhere (CONTEXT.md, phase 2 README, task 2.3) |
| Quality row 18 (phase README AC citations imprecise) | accepted | Phase 1/2/3 READMEs now cite exact AC numbers |
| Quality row 19 (phase 2 "stand alone" wording inaccurate) | accepted | Reworded to the capability-independent/dependency-serialized framing, matching phase 3 |

## Accepted Changes — files modified

| File | What changed |
|---|---|
| `CONTEXT.md` | Full rewrite: `GameItemContent`/`GameItem` split stated explicitly; exhaustive-switch requirement; the storage-guard danger and its fix stated up front; tone content corrected to `VocabEntry`-sourced; sentence audio reality stated plainly; required-`kind`/repository-normalization rule; reset/audio-keying rule restored; "Tone Identification" naming fixed; rejected alternatives updated |
| `README.md` (plan) | Corrected the grammar-unlock claim; Trust Boundary paragraph names both real boundary-crossings and their owning tasks |
| `phase-1-sentence-reading/README.md` | Covers widened (storage repo + test, `renderWithApp`); end-to-end criterion cites AC5+AC12 explicitly; states the storage-guard fix and the audio reality honestly |
| `task-1.1-*.md` | Full rewrite: exhaustive switches, sentence weighting branch, storage-guard fix + real round-trip AC, real-`sentences.json` regression test, content/direction split |
| `task-1.2-*.md` | AC3 restated behaviorally |
| `task-1.3-*.md` | Full rewrite: named successors for every `PoolChoice`-keyed piece of state, stable-reference AC, reset/replay AC, real storage round-trip AC, Input Mode hidden-when-inapplicable AC, `renderWithApp` fixtures named, re-weighted to `x-large`/13, AC count reduced from 13 to 12 to clear the frontmatter headroom check |
| `phase-2-tone-identification/README.md` | Added the missing `depends_on` rationale; end-to-end criterion cites AC5; task table corrected |
| `task-2.1-*.md` | Full rewrite: content sourced from `VocabEntry` via a shared `toneSyllablesOf` helper (not the card); separate constructor slot, not `GameItemSource`; weighting exemption stated and tested; `TONE_PROPERTY` anchored |
| `task-2.2-*.md` | Corrected wiring instruction (dedicated slot, not `sources` array); AC2 fixture pinned to exclude `"vocab"` from `pools` |
| `task-2.3-*.md` | `countEligibleItems` threading, zero-pools-plus-tone case, reset/replay AC, consistent "Tone Identification" naming, `renderWithApp` fixture, re-weighted to `large`/8 |
| `phase-3-sentence-composition/README.md` | Corrected the eligibility claim; end-to-end criterion cites AC4+AC7; `depends_on` table corrected to `2.1`; small-round reality stated |
| `task-3.1-*.md` | `CompositionItemContent` removed from `GameItemContent`; `audioUrl` dropped, `englishMeaning` renamed; out-of-range guard; AC1 de-flaked; `depends_on` fixed to `["2.1"]`; AD corrected to the real eligibility rule; tile shuffle reuses `sampleWithoutReplacement` |
| `task-3.2-*.md` | Required (not optional) grammar provider; required `kind` with repository-boundary normalization; real mixed-store round-trip AC; `PlayGameUseCase` doc-comment narrowed; `renderWithApp` factories updated |
| `task-3.3-*.md` | Named eligible-count and `saveHistory` mode-branch mechanisms explicitly; small-nonzero-eligible-count AC; page-level `kind` proof; reset/replay AC; `GameHistoryList` test simplified to pure rendering (repository now normalizes); re-weighted to `x-large`/13 |

## Key Debates

Run in Subagent Mode (no live agent-to-agent debate), so overlaps were
resolved by the synthesizing session:

- **Three of four reviewers independently found the same critical
  history-corruption bug** (QA-P1, FE-P1, SA-P2/P3), each from a
  different entry point (QA traced the guard's failure chain; FE noticed
  the missing `covers`; SA connected it to the original plan's own
  review finding). No disagreement to resolve — full corroboration.
- **QA and SA independently proposed the same fix** for the `kind`
  back-compat problem (normalize once, at the repository boundary,
  making the field required rather than optional) — adopted as
  specified by both.
- No genuine disagreements this round; every reviewer's findings that
  overlapped pointed at the same underlying defect and the same
  direction of fix.

## Next step

`weight-execution-plan`, to cast the panel's votes on this now-hardened
plan (skipped for this run, per the same choice made for the original
game-modes plan — author votes are recorded per task).
