# Pareto review — lesson rebuild

Scope read: `CONTEXT.md`, the top-level `README.md`, and all 6 phase READMEs plus
all 20 task files. This plan is unusually disciplined about the exact failure
mode this review exists to catch — the README's "gated structurally, then
judged" section states the doctrine directly, and most content tasks already
convert "is this good?" into a script-checkable criterion (exact symbol/word
counts, 8-gram overlap with a self-test for a planted match, sequence-wide
forward-reference checks, baseline-regression counts instead of zero-tolerance
asserts). That pattern is worth preserving as-is; the findings below are the
places it slips.

## Findings

**P1 — Task 1.3's tone-accuracy retry/failure bookkeeping is verified only by
a one-time human run, when the bookkeeping itself is deterministic and
mockable.**

AC6 (a Thai clip is transcribed back, a mismatch is retried, a clip still
failing is recorded as failed) and AC7 (three distinct manifest states) both
carry `ac_enforcement: none — requires the ElevenLabs API; ... the reviewer
reads it`. AC7 alone gets a real test (the three states are distinct *values*),
but nothing exercises the state *transitions* — mismatch → retry → accept,
retry-exhausted → recorded-as-failed — because that's bundled with "needs the
live API."

It doesn't need the live API. The retry loop and the manifest write are pure
logic; only the transcription call itself needs the network. A test that mocks
the transcription client (wrong transcript on attempt 1, correct on attempt 2;
wrong transcript on every attempt) exercises both paths deterministically and
leaves only "is this specific clip's Thai actually correct" to the human
listening — which is the judgement AC6 should be scoped to.

Consequence if this stays as-is: this generator is reused by every later
content task (2.5, 3.2, 3.3, 4.2, 4.3) without re-declaring an equivalent
check. A future edit that breaks the retry counter or mis-records a failed
segment as generated has no test to catch it — only a human who happens to
inspect the manifest on the one day a phase is reviewed, and that inspection
does not recur per lesson. Given the plan's own stated reason for the whole
two-voice, transcribe-back architecture ("a wrong tone teaches a
mispronunciation and the tone lessons are the product," CONTEXT.md), this is
the highest-consequence gap in the plan.

**P2 — Task 5.2's backfill accuracy is measured once and never regression-gated, despite feeding a UI cue shown for the majority of the vocabulary.**

AC4 deliberately doesn't threshold accuracy ("a threshold chosen now would be
chosen without knowing what is achievable") — that's a reasonable call, stated
and justified. But the plan stops at "recorded," where it has already proven a
better pattern twice: task 3.1 AC5 and task 4.3 AC5 both record a baseline
count and fail on regression, rather than trusting a number to stay read.
5.2 doesn't take its own plan's advice.

Blast radius here is real: `word_class` backfill covers 3,200 of 5,454 entries
(59% of the corpus), and per task 5.1 AC4 / 5.3 AC4, room is shown as a
pre-reveal *cue* in production-direction review — so a bad guess doesn't just
mis-file a word, it actively misleads the learner during recall, for as long
as that entry is reviewed, for well over half the corpus. A one-time reported
figure with no regression gate means a later re-run of the backfill script (a
prompt tweak, a model swap) could silently get worse and nothing would fail.

Fix: same mechanism as 3.1/4.3 — record the held-out accuracy as a baseline,
fail if a re-run drops below it. This is not new machinery; it's applying a
pattern this plan already built and validated twice.

**P3 — Task 5.3 declares no minimum coverage for vocabulary mnemonics, so the task can pass having authored zero of them.**

AC6 gives every word one of three states: has a mnemonic, has none yet, or was
found unsuitable with a reason. That's the right shape for a *permanently*
partial corpus (matches 2.1 AC5, 3.1 AC6, 5.1 AC5's pattern for classification
states elsewhere) — but nowhere does the task say how many words must move out
of "has none yet." Every other authoring task in this plan fixes an exact
target: 2.4 authors exactly 73 (44 + 29) mnemonics and asserts the count; 1.4,
2.5, 3.2, 3.3, 4.2, 4.3 each declare an exact symbol/lesson set. 5.3 is the one
content-authoring task sized "large" with an authoring target of "some."

As written, an executor's ad-hoc judgement — not the plan — decides whether
this task authors a handful of demonstration mnemonics or works through a
substantial slice of the 5,454-entry corpus, and those two readings differ by
roughly two orders of magnitude in the same "large" box. That's exactly the
unbounded-criterion shape this review looks for: it can be approached, never
finished, and "finished" is undefined.

**P4 — Task 1.3 AC3 (missing API key exits loudly) is left to manual review despite being a trivial, fully mockable code path.**

Lower stakes than P1 (this is a startup guard, not a data-quality mechanism),
but it's free to fix: a subprocess test asserting a non-zero exit code and the
missing variable's name in stderr is a few lines, and removes one more thing a
human has to remember to re-check by hand whenever the pipeline script
changes. Grouped separately from P1 because the fix and the risk are both much
smaller.

**P5 — Task 2.4 AC5's mechanical enforcement is weaker than the criterion it's attached to.**

The AC text promises confusable-pair shape cues "differ on the feature that
actually distinguishes the glyphs." The declared enforcement is "a case ...
asserting confusable pairs carry contrasting cues" — which, absent a
declared distinguishing feature per pair to check against, can only mean two
string fields are unequal. Two cues can be unequal and still both miss the
actual distinguishing feature (e.g., two shape cues that both describe
stroke count when the real confusion is loop direction), and the mechanical
check would pass.

The fix is cheap and consistent with how the rest of this task already works:
the ten confusable pairs are already enumerated by name in the AC text, so
add a `distinguishingFeature` field per pair (in 2.1's or 2.4's data) and
assert each pair's two shape cues reference it. That converts "a human has to
notice the contrast is meaningful" into an actual mechanical check, the same
move this plan already made for AC2–AC4 in the same task.

**Cross-reference:** plan-structure-expert independently reached P3 from their
own pass (their finding #4) — same gap, different lens (testability /
unbounded-AC pattern vs. structural task-sizing). Convergent finding.

**P6 — The 8-gram originality gate (reused across six tasks) is calibrated so
loosely it is close to decorative, per experienced-thai-teacher's measurement
(their T6).** This corrects something I got wrong above: in "What I did not
flag" I called the originality check "the plan's strongest structural
property" because it converts a judgement call into a script check reused
across 1.4, 2.4, 2.5, 3.2, 3.3, 4.2 and 5.3. That's still true structurally —
but experienced-thai-teacher measured the threshold against the 82 existing
`symbols.ts` mnemonics CONTEXT.md itself calls close paraphrases, and at n=8
the gate catches **13 of 82 (16%)** — it passes five out of six of exactly the
material it exists to exclude. A concrete instance: the ฌ mnemonic is a
near-verbatim paraphrase of its source lesson PDF and produces zero 8-gram
matches. Each task's own self-test (does the check catch a *planted* overlap)
proves the corpus loaded; it says nothing about whether the threshold is
useful, so all six tasks pass a green check believing it means more than it
does. This is exactly the verification-depth-vs-blast-radius mismatch this
review looks for, just with the direction reversed from P1/P4 — here the
check exists and looks rigorous, but does less than its own tasks assume.
The recall figure alone (13/82, independently reproduced by qa at 15/82)
rejects n=8 regardless of what replaces it — the specific replacement
threshold is still unsettled between experienced-thai-teacher and qa (their
n=5-on-content-words proposal measured out to *lower* recall than raw n=8,
and the false-positive side hasn't converged between the two of them yet), so
that tuning is qa's Q1/Q2 to close, not restated here. The shape of the fix
holds regardless of the number: keep the check as code, add a calibration
test asserting the gate flags at least N of the known-derivative fixture
(the 82 existing mnemonics), not only the planted-overlap self-test the plan
already has — the self-test proves the corpus loaded, not that the threshold
is useful.

**P7 — Task 3.1 AC5's baseline-regression mechanism is now shown, empirically, to enshrine a wrong rule if computed at the wrong time — the exact self-certifying-baseline risk flagged under P2/O2.**

When qa (Q4) and I discussed P2/O2 above, the concern that 3.1 AC5 and 4.3 AC5's baseline pattern "should be revisited on the same basis" before being trusted as a pattern anything else copies was stated as a risk in the abstract. experienced-thai-teacher's T1 makes it concrete: the unwritten-vowel rule 3.1 AC1/AC2 states matches roughly 6 of ~60 bare three-consonant words in the corpus's top 2,000 — a ~90% disagreement rate (about 54 of ~60) — because the stated rule misses the `อ`-as-vowel, `ว`-as-vowel and cluster readings entirely. If task 3.1's AC5 baseline is recorded from the rule as currently stated (which is what "recorded baseline" defaults to, absent an explicit instruction otherwise), it enshrines that ~90% miss rate as the accepted target, and the regression gate would faithfully protect a broken rule from ever improving by more than the baseline's own error — every later run then reads green against a baseline that was already broken when it was set. This is the same defect Q4 identified in the 5.2 reuse case, now observed rather than inferred, in the task the pattern originated from. Reinforces O2's existing instruction not to trust 3.1/4.3's mechanism as a template until it's fixed — and adds that 3.1 AC5 specifically must be computed only after T1/T2's rule corrections land, which experienced-thai-teacher already states as part of T1's recommendation.

## Cut list

- **C1 (→ P3).** Bound or cut task 5.3's mnemonic-authoring scope now, before
  it's executed. Either state a number (e.g., "every word in the opening and
  middle bands' example sets," or "the top N words per room") the way 2.4
  states 73, or explicitly descope 5.3 to taxonomy + character definitions +
  a handful of worked examples, with bulk mnemonic authoring named as a
  follow-up not covered by this plan. Leaving it open lets the actual
  authoring volume land wherever an executor's judgement puts it.

- **C2 (credit: experienced-thai-teacher, YAGNI table).** Cut task 6.1 (deck
  → video export) from this plan, or make it a separate evidence-led decision.
  Its justification is "passive review," which no criterion anywhere in the
  plan measures, and task 6.2 — the decommission, which is phase 6's entire
  reason to exist — depends on it only for sequencing, not for any AC. It is
  real effort (an ffmpeg pipeline, a staleness-tracking manifest, a whole
  task's worth of ACs) spent on a use case nobody has validated a learner
  wants. Ship phase 6 as decommission-only; revisit export once there's a
  measured reason to build it.

## Offload list

- **O1 (→ P1).** Move the retry-then-accept / retry-exhausted-then-fail state
  transitions in task 1.3 into a unit test against a mocked transcription
  client. Reserve the live-API manual check for genuine audio-quality
  judgement (does this clip actually sound right), which is the only part of
  AC6 that truly needs a human and the network.
- **O2 (→ P2).** Change task 5.2 AC4 from "accuracy is recorded" to "accuracy
  is recorded and regression-gated against a baseline," reusing the exact
  mechanism task 3.1 AC5 and task 4.3 AC5 already use elsewhere in this plan.
  systems-architect (A18, crediting this finding) confirms the same gap from
  an architectural angle and adds a prerequisite: `src/domain/vocabulary/
  types.ts` is in no task's `covers` today, yet 5.1 (room), 5.2 (provenance),
  5.3 (mnemonic record) and 2.2 AC5 (retained IPA) all add fields to
  `VocabEntry`. The provenance field O2's regression gate would key on has
  nowhere declared to land until that's fixed — see their A10.

  **Refined per qa (Q4, Q28):** the baseline-regression mechanism I proposed
  reusing from 3.1 AC5 / 4.3 AC5 is itself unvalidated as specified — neither
  task names an artifact to hold the baseline, so it lands as a literal in a
  test file set from whichever number the implementer's first run produces,
  and can't fail at authoring time for any value (their Q4). Separately,
  5.2 AC4's held-out sample is only drawn from the corpus's 2,254
  source-provided entries, which is also the only plausible input to whatever
  heuristic does the backfill — so nothing guarantees the accuracy figure
  wasn't measured on the method's own training data (their Q28). Gating on
  that number before both are fixed would make an unvalidated measurement
  load-bearing, which is worse than not gating. O2 still holds as the right
  *direction* — this corpus needs a regression gate, not a one-time report —
  but the correct order is: fix the held-out sample's independence (Q28) and
  turn the baseline into a committed, reviewed artifact rather than a test
  literal (Q4), *then* wire 5.2 into that mechanism, not the reverse. This
  also means 3.1 AC5 and 4.3 AC5 should be revisited on the same basis before
  either is trusted as the pattern to copy.
- **O3 (→ P4).** Add a subprocess test for task 1.3 AC3's missing-key exit
  behavior instead of leaving it to a one-time manual run.
- **O4 (→ P5).** Encode each confusable pair's actual distinguishing feature
  as data in task 2.4/2.1, and assert each mnemonic's shape cue is anchored
  to it, rather than relying on field-inequality as a proxy for "the cues
  meaningfully contrast." Same shape of fix applies to task 4.1's symbol
  priority per experienced-thai-teacher's T24: the plan appears to compute
  scheduling priority from initial-position frequency, but their retraction
  of their own earlier demotion confirmation shows that number and the
  any-position frequency a learner actually needs (to read the letter on
  sight, whether or not it carries a tone decision) are two different
  computations the plan conflates into one. Both belong in code, computed
  separately, rather than one number doing duty for both — the same pattern
  as O4's confusable pairs above, and the same pattern experienced-thai-teacher
  independently flagged in their T10 (the "7 critical letters" shortlist).

## What I did not flag (revised)

I originally wrote here that the originality/coverage/sufficiency checks
resolving to concrete scripts was "the plan's strongest structural property"
with no material exceptions. experienced-thai-teacher's T6 shows that's true
of the *shape* of the check but not of its *usefulness* at the threshold
chosen — see P6. Leaving the original claim uncorrected would have been the
review equivalent of trusting a baseline nobody had watched fail, which is
the exact thing P7 and qa's Q4 fault elsewhere in this plan, so it's fixed
above rather than left standing.

What still holds: unbounded prose criteria ("good," "engaging," "coherent"
with no test) are essentially absent from this plan's ACs, which remains
unusual and worth preserving. Verification depth elsewhere tracks blast
radius reasonably well: task 1.1 (the join-key seam) carries the plan's
heaviest test burden and earns it; task 6.1 AC3's one manual "play the
exported file" check is appropriately light for what it verifies, though see
C2 for whether task 6.1 should exist at all.
