---
doc_type: review
title: Accelerated-learning review of the lesson-rebuild plan
description: Learning-science review of the scene-grammar encoding system, the class derivation rule, the POS memory palace, scaffold fading and the plan's sequencing, with 17 findings against the plan and its phases.
reviewer: accelerated-learning-expert
specialisation: spaced repetition, mnemonic construction, method of loci, dual coding, desirable difficulties, interleaving, retrieval practice, cognitive load
plan: plans/lesson-rebuild
status: complete
generated: {by: claude-opus-5[1m]/agent, at: 2026-09-13}
profile_version: 1
---

# Accelerated-learning review — lesson rebuild

## Executive Summary

This is a strong plan with one structural omission and one overclaimed
mechanism.

The strength is real and worth naming before the criticism. The plan's central
insight — that consonant class is the largest memory burden in Thai script, that
the source course encodes it nowhere, and that it is *derivable* rather than
rote — is correct, and I verified the arithmetic against `symbols.ts`: 10
sonorants all low, 9 unaspirated stops plus อ constituting the entire mid class,
and 25 aspirates/fricatives of which exactly 11 are high. The reduction from 44
facts to 11 is genuine, and the argument that makes it genuine is the one the
plan gives: the rule's inputs (aspiration, sonorancy) are knowledge the learner
needs for pronunciation anyway, so the marginal cost of the rule is close to
zero. The channel allocation is also right. Tone→pitch→vertical is a pre-existing
cross-modal correspondence that costs nothing to install; class has no natural
spatial mapping and therefore benefits more from a rich distinctive locus than
from an arbitrary height. Spending the vertical axis on tone and giving class a
place is the correct trade and the plan's reasoning for it is sound. The
redundant colour channel with its red-green CVD justification is correct dual
encoding. And the plan's testing discipline — planted-overlap checks that defeat
vacuous passes, exact counts that defeat shrinking sources, "removing one rule
makes this test fail" mutation checks, and the insistence that the empty and
complete learners both pass trivially so the part-way learner is the real case —
is better than most plans I review.

**The structural omission is retrieval practice.** Across 20 tasks and 114
acceptance criteria, not one requires a learner to attempt to retrieve
anything. Every content AC is about coverage, originality, asset existence, or
derivability of a rule from stated material. The decks are specified as ordered
slides with an image and narration per slide — pure exposition, presented in the
same order every time, with the reveal always adjacent to the prompt. Retrieval
practice is the best-evidenced intervention in this literature and it is the one
lever the plan does not pull. A deck that meets every stated criterion is a
well-encoded, well-sequenced, original presentation that never asks the learner a
question. See **L1**.

**The overclaimed mechanism is the memory palace.** The reviewer's question was
whether the plan's asymmetry analysis is correct — rooms prune in production,
not in recognition, because the learner does not know the part of speech until
after recall. That analysis is correct and unusually sharp; most designs get this
wrong in both directions. But it rests on a prior claim that does not survive
contact with either the theory or the corpus. Pruning a partition is a benefit to
*search* — free recall, generation, ordered list recall — and an SRS review is
cued paired-associate recall where the cue already uniquely identifies the target.
There is no 5,454-entry search to prune. And the corpus makes it concrete: I
counted the distribution, and after backfill one room ("things") will hold over
70% of entries while three rooms hold fewer than 30 each. A partition with that
entropy prunes almost nothing even where pruning applies. The palace is still
worth building — as a consistent encoding context that makes images compose
rather than compete, which is what task 5.3 actually delivers — but the
justification in the phase README is the wrong one, and **AC4 is designed around
the wrong one**, which is how it ends up specifying a pre-reveal hint that trades
away retrieval effort. See **L2** and **L3**.

Beyond those two, the findings cluster in three places. The scene-grammar schema
(task 2.1) is the plan's narrowest seam, and two things route around it rather
than through it: visual confusability (held only in the prose strings task 2.4
deletes, while the repo already has *phonetic* confusable-map machinery that the
visual relation should feed) and scheduling priority (an existing field about to
acquire a second source, in a task whose `covers` cannot reach it). The tone-motion channel is
specified without a legitimate referent — a consonant has no tone, a vowel has no
tone, and a tone mark's tone is class-dependent, which task 4.1 AC1 states
explicitly. And the scaffold fade, which I checked in the shipped code, keys on
the *word's* SRS stage while applying to a *consonant's* class cue, so a class
scaffold disappears because a word burned rather than because the learner
mastered that letter — and task 2.3 AC3 locks that behaviour in rather than
fixing it.

On the reviewer's remaining questions: concentrating both recurring characters in
the high district is a mild distortion rather than a help, and the fix is free
(**L17**). Requiring structure in mnemonics improves checkability but does not
buy integration, which is the property that actually makes an image retrievable
(**L8**), and "binds shape, sound and class in one image" is not achievable for
all 73 symbols — the plan needs the third state here that it applies rigorously
everywhere else (**L9**). Teaching confusable pairs adjacently is correct, not a
mistake: for discrimination learning the contrast *is* the information, and the
interference worry belongs to arbitrary paired-associate learning, not to
perceptual discrimination. But adjacency only pays when the contrast is
juxtaposed, and no criterion requires that (**L11**). Blocking within lessons
while relying on the SRS for interleaving is the right split, and I verified it
works: `ReviewService.startSession` shuffles the selected cards Fisher-Yates
within a pool, so task 4.2's "the scheduler gives back what the consolidation
gives up" is a load-bearing argument and it holds.

Three reviewers checked my findings against the code and returned corrections,
all adopted here. The experienced-thai-teacher reviewer confirmed the class rule
is linguistically correct in every count and supplied a **placement blocker I had
missed**: the class-rule lesson cannot sit in the opening band, because the first
high-class consonant in the sequence is ข at lesson 12 and the 11-member high list
the lesson must teach is not introduced until lessons 12–22. I verified this
directly — the eleven land at lessons 12, 12, 13, 13, 13, 14, 14, 15, 19, 19, 22 —
so task 2.5's lesson would forward-reference eleven untaught glyphs and fail its
own AC2. Their split proposal resolves it and, as it happens, delivers **L7** as a
by-product. Folded into **L6**. The systems-architect reviewer corrected me on
`finalSound` — it is not lost, it has seven consumers including a generated SRS
card, and only its in-mnemonic reinforcement is dropped — and sharpened **L4** and
**L13**. The qa reviewer confirmed **L3** and reversed their own earlier finding
on it.

Verdict: the plan should proceed. L1 should be fixed before phase 1 ships, since
it changes the deck schema that everything downstream consumes. L2–L6 should be
resolved before their phases start — L6 now carries a sequencing blocker, not just
a wording fix. The rest are corrections within tasks.

## Plan-Level Findings

### Finding L1 — No deck contains a retrieval attempt

**Severity:** High

**Description.** Across the plan's 20 tasks, no acceptance criterion requires a
learner to attempt retrieval. Task 1.2 specifies the deck as an ordered `Slide[]`
with text fields, an image and audio per slide, rendered in declared order. The
content tasks (1.4, 2.5, 3.2, 3.3, 4.2, 4.3) assert coverage, originality, word
resolution and asset existence. Task 2.5 AC3 and 3.2 AC4 and 4.2 AC3 assert that
a rule is *derivable from* the lesson's stated content — which is a sufficiency
check on the exposition, not a retrieval event for the learner. The plan's north
star is stated entirely in encoding terms ("class is encoded twice, tone is
encoded as vertical motion, every symbol carries a mnemonic").

This matters more than it would in most curricula because the plan is explicitly
a learning-science rebuild. Testing effects are among the largest and most
replicated findings available: a study episode containing a retrieval attempt
produces substantially more durable retention than the same episode spent
re-reading or re-viewing, and the benefit is largest when retrieval is attempted
before the answer is available rather than after. The plan's decks are structured
so the answer is always adjacent to the prompt, in fixed order, on a slide the
learner advances through. The existing symbol cards that follow the deck do carry
SRS review, so the learner is not left without retrieval altogether — but the
lesson itself, the artefact this plan spends five phases authoring, contributes
none.

There is also a cheaper-than-it-looks variant available. A pretest — asking the
learner to guess a letter's class or sound *before* the deck teaches it — improves
retention of the subsequent exposition even when the guess is wrong. Given the
class rule is derivable, a deck can ask "this letter is an unaspirated stop; what
class?" and the learner can actually succeed, which makes it a generation
exercise rather than a blind guess.

**Recommendation.** Add a slide kind to the deck schema in task 1.1 that is a
retrieval prompt, distinct from a content slide and from its own reveal, and add
a criterion to each content task:

> ACn: Every symbol a deck introduces is the subject of at least one `prompt`
> slide whose reveal is a separate slide the learner reaches by advancing. A deck
> in which a symbol's first and only appearance is expository fails.

This is structurally checkable in the same way every other content criterion in
this plan is checkable — count prompt slides per declared symbol and assert the
reveal is a distinct slide index. Fix it in task 1.1, before phase 1 ships,
because it changes the schema every downstream task encodes against; retrofitting
it in phase 4 means re-authoring every deck.

### Finding L2 — The palace's pruning claim does not hold for cued-recall SRS, and the corpus distribution makes it worse

**Severity:** High

**Description.** The phase 5 README states the mechanism plainly: "Words get
**rooms**: one location per part of speech, so recall prunes to a partition
instead of searching 5,454 entries." Two problems.

*The mechanism.* Partition pruning is a benefit to retrieval that is a *search* —
free recall, ordered list recall, generation from a category. That is exactly what
the method of loci is optimised for, and CONTEXT.md already records the correct
version of this argument when it rejects literal memory palaces for symbol
recall: "a palace is optimised for sequential recall and SRS is random-access."
The same objection applies to the POS palace and the plan does not apply it. An
SRS review presents a unique cue — the English word, or the Thai word, or an audio
clip — and asks for its paired associate. The learner is not searching a 5,454-item
space; they are attempting a direct cued retrieval. Reducing a search space that
is not being searched buys nothing.

*The distribution.* I counted `vocabulary.json` directly. Of 5,454 entries, 2,254
carry a word class, distributed: `n` 1523, `v` 352, `adj` 211, `adv` 48, `prep`
27, `conj` 26, `part` 23, `pron` 16, `clf` 11, `det` 9, `aux` 7, `mod` 1. Mapped
onto the six proposed rooms that is roughly: things 1523, actions-and-states 563,
connectors 70, particles 23, people-and-pronouns 16, counting 11. After task 5.2
backfills the remaining 3,200 — and the corpus skew makes it near-certain most of
those are nouns — one room holds well over 70% of the corpus and three rooms hold
fewer than 30 entries each. Even where pruning applies, a partition this skewed
prunes almost nothing: knowing a word is a noun eliminates under 30% of
candidates, and the rooms that *do* prune sharply contain 11, 16 and 23 items,
which are small enough not to need a palace.

None of this means the work is wasted. The palace has a second, real benefit the
plan delivers but does not claim: a consistent encoding context. Staging every
noun in the same place with the same recurring cast makes images *compose* rather
than compete, gives every new word a ready-made scaffold to attach to, and gives
the learner a second retrieval route when the direct one fails. That is a good
reason to build it. It is also a reason to build it differently — a context that
supports composition wants to be rich and consistent, where a partition that
prunes wants to be balanced and discriminative.

The plan has half-noticed this: 5.1 AC3 requires the noun room to declare
sub-districts with bounded capacity, and the phase README says "Nouns are 1,523
entries and climbing. One room will not hold them; the sub-district scheme is the
part most likely to be underestimated." That instinct is right, and the numbers
say it is understated rather than merely likely — the noun sub-district scheme
*is* the palace, and the other five rooms are near-vestigial.

*Two data facts found late by the other reviewers, both of which I verified and
both of which bear on the taxonomy.*

**The room merge is correct for recall and wrong for generation, and nothing in the
plan keeps the two apart.** I endorsed merging verbs and adjectives — Thai
adjectives are stative verbs, and it is the merge that brings twelve classes down
to a holdable number. But `word_class` is not an inert filing field:
`GrammarCardGenerator.ts:23` fills grammar template slots by exact match,
`v.word_class === wordClass`, with an ordered fallback list. So the distinction the
rooms deliberately erase is precisely the one the templates need. A slot wanting an
action verb filled from a merged verb-and-adjective pool produces ungrammatical
Thai. Nothing in task 5.1 or 5.2 says the six rooms are a *recall* representation
that must not replace `word_class`, and an executor who reads 5.1's taxonomy and
tidies the corpus to match it breaks every template slot at once. This is a
one-sentence fix now and a debugging session in generated sentences later.

**The classifier room cannot be populated from the field it depends on.** The
corpus tags 11 entries `clf` — ครั้ง แห่ง อัน ใบ ชิ้น ราย องค์ ที เล่ม ฉบับ แผ่น —
and the two commonest classifiers in the language are not among them: คน (rank 47,
the classifier for people) is tagged `n`, and ตัว (rank 92, for animals) is tagged
`n`. `word_class` is single-valued, so a word that is both a noun and a classifier
can only be filed as one, and the corpus filed both as nouns. Classifiers are a
real word class English lacks — the phase 5 README says so — but the room that
depends on the distinction is being built on a field that cannot carry it. That is
worse than the skew: the counting room is not merely the smallest, it is
systematically missing its most important members.

**Recommendation.** Five changes, none of which cancel the task.

1. Restate the phase 5 README's mechanism. The palace's contribution here is a
   consistent encoding context and image composition, plus a secondary retrieval
   route; it is not search-space reduction. Getting this right matters because
   AC4's design follows from the wrong version (see L3).
2. Put the room-size table in task 5.1 as data, computed from the corpus rather
   than asserted, and add a criterion that reports each room's projected
   population after backfill. A room holding 70% of the corpus should be visible
   in the task's own output.
3. Re-centre 5.1 on the noun sub-districts and say so in the task body. As
   written, "12 classes to 6 rooms" reads as the work and the sub-districts as a
   detail; the numbers say the reverse.
4. State in 5.1 that the rooms are a **recall representation layered over**
   `word_class`, never a replacement for it, and add a criterion that the corpus's
   `word_class` values are unchanged in kind by the room work — the grammar
   templates depend on distinctions the rooms erase.
5. Decide what the counting room is before building it. Either `word_class` gains
   a multi-valued or secondary classifier field (so คน and ตัว can be both), or the
   room is declared to cover only the 11 tagged entries and the mismatch is stated.
   Silently building a room whose defining field cannot express its membership is
   the version that fails late.

### Finding L3 — Room-as-pre-reveal-cue trades away retrieval effort, and the direction model it assumes does not exist in the code

**Severity:** High

**Description.** Task 5.1 AC4 and task 5.3 AC4 specify that the room is shown as
a cue *before reveal* in the production direction and only after reveal in
recognition. The asymmetry analysis behind this is correct, and I want to be clear
about that: the plan is right that the learner does not know a word's part of
speech until they have recalled it, so the room cannot be a cue in the Thai→English
direction, and right that building UI which assumes symmetry would leak the
answer. That is a genuinely good catch and 5.3's architectural decision states it
well.

The problem is what it concludes for the *other* direction. Showing the room
before the learner attempts retrieval converts a harder retrieval into an easier
one, and retrieval benefit scales with the effort of a successful attempt. A
category cue supplied up front is the textbook way to reduce that effort. It will
raise apparent success rates in the session — which, because this app grades SRS
intervals on correctness, will also inflate scheduling intervals for items the
learner cannot actually retrieve unaided. The cue never fades, either: unlike the
class colour and the district, which task 2.3 AC3 correctly fades on the burn
schedule, nothing in 5.1 or 5.3 fades the room.

There is a second, sharper problem: the "production direction" the ACs assume
does not exist as a binary in this codebase. `src/domain/vocabulary/types.ts`
declares `VocabProperty = "thaiToEnglish" | "englishToThai" | "audioRecognition"
| "toneIdentification" | "spelling" | "spellingFromAudio"`, and
`VocabCardGenerator.ts` generates cards for all six. Mapping the plan's rule onto
them:

| `VocabProperty` | prompt | does the learner know the POS at prompt time? | room is |
|---|---|---|---|
| `englishToThai` | English word | yes | a cue |
| `spelling` | English word | yes | a cue |
| `thaiToEnglish` | Thai word | no | an output |
| `audioRecognition` | Thai audio | no | an output |
| `spellingFromAudio` | Thai audio | no | an output |
| `toneIdentification` | Thai word | no | an output |

So the room is a legitimate cue on two of six card properties, not on "the
production direction". Two of the six (`audioRecognition`, `spellingFromAudio`)
prompt with Thai audio, where the learner has the phonology but not the part of
speech — the room is an output there, exactly as in recognition, and the ACs as
written say nothing about them.

Finally, the enforcement site is wrong. AC4 is enforced by a case in
`WordCard.test.tsx`, but `WordCard.tsx` has no reveal state — it is the browse
card used by `VocabularyPage` and `DictionaryPage`. The reveal-gated component in
the review flow is `src/presentation/components/organisms/Flashcard.tsx`, which
holds `const [revealed, setRevealed] = useState(false)` and which no task in this
plan covers. As specified, AC4 cannot be enforced where it matters and the
component that would actually leak the answer is untouched.

The qa reviewer verified both halves and reversed their own earlier finding on
this: they had recorded 5.3 AC4's mapping to `WordCard.test.tsx` as "the right
layer" and 5.1 AC4's as the wrong one. Both are wrong. `WordCard.tsx` has no
`useState`, no reveal, no `showAnswer`; `Flashcard.tsx:30` has
`const [revealed, setRevealed] = useState(false)`. So both criteria that exist to
stop the palace leaking the answer are mapped to components that cannot leak it,
and the component that can is in no task's `covers` anywhere in the plan.

**Recommendation.**

- Change the room's exposure from a pre-reveal cue to an **on-demand hint**:
  available behind an explicit "stuck?" affordance the learner chooses, never
  shown before an attempt. That preserves the room as a retrieval route for a
  failing recall while keeping the unaided attempt first, and it makes the
  desirable-difficulty argument and the palace argument compatible instead of
  opposed.
- Restate AC4 per `VocabProperty`, with six cases, rather than per "direction".
  The table above is the rule.
- Fade the hint on the same `ScaffoldLevel` schedule as class colour and district,
  or state why it should not.
- Move the enforcement to `Flashcard.tsx` and add it to task 5.3's `covers`.

### Finding L4 — The tone-motion channel has no legitimate symbol-level referent, an existing component already occupies it, and the guard against interference is name-level only

**Severity:** High

**Description.** Task 2.3 AC4 requires that "tone renders as vertical motion
within the symbol's frame", and task 2.1 AC4 requires a mnemonic record to name a
tone motion "where the record carries a tone". Which symbols carry a tone?

- A consonant does not. Its class is one input to a tone, computed with vowel
  length, syllable type and any mark.
- A vowel does not.
- A tone mark does not carry a fixed tone either, and this plan states so
  explicitly: task 4.1 AC1 enumerates twelve class-by-mark cells precisely because
  mái-èek yields low on mid and high class but falling on low class.

So the one symbol type for which a tone motion is intuitively appealing — the tone
marks — is the one where a fixed motion per mark would teach a falsehood. And the
tone marks are, separately, the nine mnemonics that no task in this plan owns (see
L14). The channel is specified, given a five-member vocabulary in 2.1 AC3, and
has no valid application at the symbol level.

Its legitimate home is the *syllable*: a rendered word, where tone is a fact, and
the tone-mark *table*, where the motion belongs to the (mark × class) cell rather
than to the mark. Both already exist. `src/presentation/components/atoms/
ToneContourIcon.tsx` is shipped, renders tone as an iconic pitch contour in a 24×14
box with y=0 as high pitch, and `WordCard.tsx` already renders it per syllable
alongside `classColorForLevel`. Its header comment already makes this plan's
channel-allocation argument, unprompted:

> Pitch-contour shapes, not colors — color is already spoken for by consonant
> class (see consonantClassColor.ts), so a second arbitrary color-to-tone mapping
> would compete for the same visual channel. A contour is iconic instead.

Task 2.3 lists that file in `covers` but no acceptance criterion mentions it, and
AC4 specifies a different rendering ("vertical motion within the symbol's frame")
at a different site. Two tone encodings is the outcome, which is the failure mode
phase 2's own README warns about for class.

The systems-architect reviewer found the sharper version of this, which I had
looked at without seeing. One line below that comment, `TONE_CONTOUR_POINTS`
declares exactly five contours — `mid`, `low`, `high`, `falling`, `rising`. That
*is* task 2.1 AC3's "separate tone-motion vocabulary of five", already implemented
and shipping. So the problem is not only that 2.3 might add a second rendering;
2.1's seam re-declares a vocabulary the repository already settled, and 2.3 then
renders against the new copy.

There is a `covers` gap underneath it that neither of us had initially:
`ToneContourIcon`'s only consumer is `WordCard.tsx` (:7, :163), which sits in
**task 5.3's** `covers`, not 2.3's. A props change in 2.3 therefore breaks 2.3's
own `npm run build` gate on a file 2.3 is not permitted to edit.

There is also a reason not to want motion inside the glyph's frame specifically.
The glyph's shape is the thing being learned; displacing or animating it
vertically perturbs the percept the learner is trying to encode, and for the
several pairs that differ only in a stroke's vertical extent (ฟ vs พ: "the LAST
line sticks out HIGHER"; ป vs บ: "the line on the right side extends HIGHER than
the head") a vertical treatment competes directly with the discriminating feature.
The existing design — an iconic contour *beside* the glyph — avoids this.

Finally, the guard against district/tone interference is written at the wrong
level. Task 2.1 AC3 requires that the district and tone-motion vocabularies be
disjoint and that "no district is expressed as a vertical position" — a check on
*names*. The interference the plan correctly fears lives in the illustration: any
depicted place has vertical extent, and a figure higher up in a scene reads as
part of the place (a rooftop belongs to the building). A "temple district" passes
the name check and fails the thing the check exists to protect. The same
name-level-only pattern recurs in 5.1 AC2 (room names vs district names).

**Recommendation.**

- Restate 2.3 AC4: tone renders as a pitch contour on syllable-bearing surfaces,
  reusing `ToneContourIcon`, and never as displacement of the glyph itself. Add an
  AC asserting no second tone encoding is introduced, mirroring the existing "no
  second class mapping" criterion (2.3 AC1).
- Restate 2.1 AC4 so a tone motion is required only on records whose subject is a
  syllable. Make it an error for a consonant or vowel record to carry one.
- Give the tone-mark table (4.1) the motion, keyed to the (mark × class) cell, so
  the rendering teaches the class-dependence rather than contradicting it. This
  also gives the tone-motion vocabulary its first real consumer.
- Keep the two cues separate, which the experienced-thai-teacher reviewer worked
  out from this point and which is the non-obvious half: a tone mark's **stroke
  count is ordinal and belongs to the mark** (one, two, three, four strokes onto a
  fixed tone order — the best unused mnemonic in the system), while the **vertical
  motion belongs to the cell**. Collapsing them into a single per-mark cue is the
  natural implementation and would be wrong: ไม้เอก gives low on mid and high class
  but falling on low, so one motion per mark encodes a tone the learner does not
  hear for a third of the alphabet.
- Add an illustration constraint to 2.1, carried into the art brief task 1.3
  generates: districts are depicted on one shared horizontal ground plane with no
  salient vertical structure, and vertical displacement within a frame is reserved
  for the tone channel.

### Finding L5 — The scaffold fade keys on the wrong item, and the heaviest scaffold never fades at all

**Severity:** High

**Description.** The reviewer asked whether fading the encoding removes retrieval
support too early. The answer is no — if anything the opposite — but the fade has
a defect underneath that question, and task 2.3 AC3 propagates it.

The shipped schedule (`src/presentation/utils/srsFade.ts`) is `Apprentice`,
`Guru`, `Master` → `full`; `Enlightened` → `fading`; `Burned` → `none`. Fading
scaffolds as competence grows is correct and well-supported — a cue that outlives
mastery prevents transfer to unmarked text, which is exactly what the file's own
comment says. So the principle is right.

The defect is *what the fade is keyed to*. In `WordCard.tsx`:

```
const level = scaffoldLevel(stageName);      // the WORD's SRS stage
...
classColorForLevel(syl.consonantClass, level)  // a CONSONANT's class cue
```

The class scaffold on each syllable fades according to the *word's* stage, not the
consonant's. A learner who burns the word มา has the class cue removed from ม
inside it, regardless of whether they have mastered ม as a letter — and,
symmetrically, a learner who has burned ม still sees a full-strength class cue for
it inside every apprentice-stage word. The scaffold is attached to the wrong
competence. Task 2.3 AC3 ("district and colour fade together as an item burns...
matching the existing `classColorForLevel` contract") inherits this rather than
fixing it, and doubles the cue that is mis-keyed.

Second, the plan fades the light scaffold and leaves the heavy one permanent. The
mnemonic prose — the largest piece of retrieval support in the system — does not
fade: `SymbolCard.tsx` renders `<MnemonicBlock text={c.mnemonic} />` whenever
`!compact && c.mnemonic`, and `WordCard.tsx` renders `<MnemonicBlock
text={word.mnemonic} label="Memory tip" />` unconditionally. Neither takes a
`ScaffoldLevel`. A mnemonic is a *route* to the answer; its purpose is to be
abandoned once direct retrieval works, and a permanently visible one keeps the
learner on the slow path indefinitely. This plan authors 73 new mnemonics and 277+
vocabulary mnemonics without touching the question of when they go away.

Third, on the reviewer's actual question: the fade is not too early. Full
scaffolding through `Master` means the cue is present for nearly every review a
learner ever performs on an item, and `Burned` items are effectively retired. The
adjustment worth making is not to the burn threshold but to the *mode*: from the
middle stages the cue should become on-demand — hidden by default, uncoverable on
request — so that every review is an unaided attempt first. That is the same
mechanism L3 recommends for the room, and it converts a permanently-present cue
into a retrieval opportunity without removing support from anyone who needs it.

**Recommendation.**

- Key the class cue (colour and district) on the *symbol's* own SRS stage, not on
  the containing word's. Add a criterion to 2.3: a word at `Burned` containing a
  consonant at `Apprentice` still shows that consonant's class cue at full
  strength, and the converse.
- Put `MnemonicBlock` on the `ScaffoldLevel` schedule, or state in an
  architectural decision why the mnemonic is exempt. Owning task: 2.3, which
  already owns the fade contract.
- Consider an intermediate `on-demand` level between `full` and `fading`, applied
  to the mnemonic and to the room hint from L3.

### Finding L6 — The class rule is sound, but its lesson cannot sit where the plan puts it, its bucket labels will not survive a beginner, and it collides with phase 3

**Severity:** High (raised from Medium after the experienced-thai-teacher reviewer's placement finding)

**Description.** I verified the rule's arithmetic against `symbols.ts` and it
holds exactly as phase 2 states it. The 10 sonorants (ง ญ ณ น ม ย ร ล ว ฬ) are all
low. The 9 unaspirated stops plus silent อ (ก จ ฎ ฏ ด ต บ ป อ) are the entire mid
class — not merely a subset of it, which is what makes the rule complete rather
than heuristic. The remaining 25 are aspirates and fricatives, of which 11 are
high. The plan's headline claim is correct.

On the cognitive-load question the reviewer raised: a derivation rule is
genuinely lower load than 44 rote facts *here*, and the reason is specific rather
than general. The usual objection — that a rule adds an application step under
time pressure, where a memorised fact is a direct lookup — is real, but it
applies to the acquisition phase, not the endpoint. The endpoint is automaticity,
and automaticity comes from item practice, which this app's SRS supplies. What the
rule buys is the acquisition phase: 11 things to learn instead of 44, and the
inputs to the rule (is this letter aspirated? is it a sonorant?) are phonological
distinctions the learner must acquire anyway to pronounce the letters at all. The
plan makes exactly this argument ("the cheat code and the pronunciation drill are
the same drill") and it is the right one. `isAspirated` is already a populated
boolean on every consonant record, so task 2.1's derivation has existing data to
check itself against — with one caveat recorded below.

The experienced-thai-teacher reviewer independently extracted all 44 records and
confirmed every count: sonorants exactly 10 with no exceptions, mid class exactly
the 9 unaspirated stops plus อ, high class exactly 11 and every member an aspirate
or fricative (ห correctly a glottal fricative, its low partner ฮ in the same
bucket), low class totalling 24. The rule is sound. Everything below is about
delivering it, not about whether it is true.

The condition for this to work is that the rule *supplements* item-level practice
rather than replacing it, and the plan does not state that anywhere. Nothing in
2.5 or 4.1 requires that class remain an item-level SRS property practised per
letter. If the class-rule lesson is taken as licence to stop drilling per-letter
class, the plan trades a slow automatic lookup for a permanent two-step derivation
— which is the failure mode the reviewer's question anticipates.

Four concrete defects, the first of which blocks the task as scoped.

*The lesson cannot sit in the opening band.* This is the
experienced-thai-teacher reviewer's finding and I verified it directly by
extracting each high-class consonant's `lesson` field. The eleven high-class
letters are introduced at lessons **12 (ข, ฉ), 13 (ศ, ษ, ส), 14 (ผ, ฝ), 15 (ห), 19
(ถ, ฐ) and 22 (ฃ)**. Task 2.5 places the class-rule lesson in the opening band
(lessons 02–05) and its AC3 requires the lesson to teach the 11-member high list.
A lesson in the opening band therefore forward-references eleven untaught glyphs,
failing its own AC2 and task 3.3's sequence-wide AC3. The pedagogical version is
worse than the mechanical one: by lesson 5 the learner has met ช, ซ, พ and ฟ — so
every aspirate or fricative they have ever seen is *low class*, and the third
bucket would be taught with zero positive exemplars.

The reviewer's split resolves it and is better than a simple move:

- **Part 1 — the two derivable buckets — immediately after lesson 3.** At that
  point the learner holds ม น ง ย ว (five sonorants, all low) and ก ด บ (three
  unaspirated stops, all mid) and nothing else. Both buckets are fully visible
  with zero exceptions and zero forward references. Lesson 4 introduces ช and ซ,
  the first letters needing the third bucket, so part 1 must precede it.
- **Part 2 — the 11-member high list — at lesson 12**, where ข arrives and the
  first cousin pair ข↔ค becomes teachable.

These two findings should be read as one. **L7** shows that the 25-letter third
bucket and the seven cousin groups are the same set (verified by set equality), so
the split below is not merely a scheduling fix — it is the sequence that lets one
structure be taught as one structure, with the derivable buckets stated once early
and the seven decisions distributed to the lessons where their evidence arrives.

For my lens this is strictly better than the single lesson, and not only because
it removes the forward reference. It distributes the rule across the sequence
instead of front-loading it, it places each part at the moment its evidence is
complete, and part 2 lands exactly where **L7** wants the residue taught as
contrasts — task 3.3 already wants the six cousin pairs (ข↔ค, ฉ↔ช, ถ↔ท, ผ↔พ, ฝ↔ฟ,
ส↔ซ) in one lesson. The split delivers L7 as a by-product.

*The bucket labels will not survive contact with a beginner.* I had filed this as
a one-word fix — "unaspirated stop or affricate" to cover จ /tɕ/ — and the
experienced-thai-teacher reviewer is right that it is too narrow. "Unaspirated
stop" is not merely imprecise for จ; it is *meaningless* for ซ ศ ษ ส ฝ ฟ ห ฮ,
which are fricatives with no aspiration contrast at all. A learner told to sort
by "unaspirated stop" has no procedure for half the alphabet. Their replacement is
a test the learner performs with their own mouth:

> Can you hum it or sing it on a pitch? → sonorant → **low** (m n ng y r l w)
> Clean hard sound, no puff? → **mid** (g j d dt b bp, plus silent อ)
> Puff of air, or a hiss? → **high or low**, and only these 11 are high.

Keep the phonetic labels in `soundType.ts`; use the performable form in the
lesson. This matters for testability, not just phrasing: task 2.5 AC3 tests
derivation "from the lesson's stated rule", so the lesson's rule has to be the one
a learner can actually execute.

*A data defect will stop task 2.1's executor on contact.* `symbols.ts` carries
`isAspirated: false` on ฑ (line 1219) and ฒ (line 1235), but both are /tʰ/ — their
own `nameRomanized` fields read "thaaw monthoo" and "thaaw phuuthao". A derivation
keyed on `isAspirated` therefore sorts both into the mid bucket while their
declared class is low, and task 2.1 AC1 ("no exception list") fails. The tempting
repair is precisely the exception list the phase exists to remove. It is a
one-line data fix and it should be made in 2.1 before the derivation is written.

One correction on that defect's status, since it changes the urgency. The
systems-architect reviewer suggested `isAspirated` has no consumer outside
`symbols.ts`, which would make it a dormant error going live when 2.1 first reads
it. It has three: `ScriptLessonService.ts:39` and `:210` pass it through, and
`SymbolCard.tsx:72` renders it — `{c.isAspirated && <SymbolInfoRow
label="Aspirated" value="Yes" />}`. Because that renders only on `true`, ฑ and ฒ
today show *no* aspiration row where they should show "Aspirated: Yes". The defect
is already learner-visible rather than dormant, on two letters whose correct
pronunciation is /tʰ/ — which raises it from fix-before-2.1 housekeeping to a live
content error worth fixing whether or not the class rule ships.
The reviewer also notes one genuine linguistic exception worth teaching as a
pronunciation note rather than a classifier branch: ฑ is pronounced /d/ in a few
words such as บัณฑิต, while remaining low class. They also note the affricate
problem is wider than จ — ฉ, ช and ฌ are affricates too (/tɕʰ/) — so a
stop-versus-fricative taxonomy needs patching in two buckets rather than one,
which is the second reason to drop the phonetic labels from the lesson rather
than repair them.

*The sonorant rule appears to collide with phase 3's leading consonants — and the
fix is better than a patch.* Phase 2 installs "every sonorant is low". Phase 3
then teaches that a leading ห makes the following sonorant's syllable behave as
high class — หน, หม, หย, หล. To a learner these read as contradictory, and neither
task 2.5 nor task 3.2 flags the interaction. As stated that is a
proactive-interference hazard of the plan's own making: phase 2 installs a belief
that phase 3 appears to falsify, ten lessons later.

My original recommendation was to scope phase 2's claim to the letter's own class
and have phase 3 resolve the apparent contradiction. The experienced-thai-teacher
reviewer supplied a strictly better version that I am adopting in its place,
because it converts the interference into reinforcement rather than merely
defusing it: **ห นำ exists precisely *because* every sonorant is low.** The ten
sonorants are the only letters in Thai with no high-class partner, so they are the
only letters that cannot reach rising or low tone on their own, and ห นำ is the
repair the language evolved for exactly that gap. The inventory confirms it — ห
leads ง ญ น ม ย ร ล ว, all bucket 1, no exceptions and nothing else.

That is a considerably better piece of instructional design than either the
original plan or my patch. Taught in that order the second lesson *predicts* from
the first rather than qualifying it: a learner who knows sonorants are all low can
be asked what Thai must therefore do about rising-tone words beginning with /n/,
and derive ห นำ themselves. It turns a ten-lesson-delayed contradiction into a
ten-lesson-delayed payoff — spaced elaboration that strengthens the earlier fact
instead of destabilising it, and a genuine generation opportunity of the kind
**L1** says the decks otherwise lack.

The reviewer's carrying wording — "a letter's class never changes; what changes is
which letter is in charge" — also generalises to three other places the plan needs
the same idea: consonant clusters (the first member governs, which is why the tone
mark sits on the second), the mid-leader branch of อักษรนำ, and the class input to
the tone-mark table. One sentence serving four lessons is worth the coordination.

**Recommendation.**

- **Split the class-rule lesson**, and take the stronger version of the split the
  experienced-thai-teacher reviewer arrived at afterwards: there should be **no
  part 2 document at all**. Each contrast is teachable the moment its second member
  arrives, and I verified that the low cousin always precedes the high one — ช L4 →
  ฉ L12, ค L6 → ข L12, ซ L4 → ส L13, พ L5 → ผ L14, ฟ L5 → ฝ L14, ฮ L7 → ห L15, ท
  L7 → ถ L19. So the residue distributes across slots task 3.3 already owns, with no
  forward reference anywhere and no second lesson to place. Task 2.5 keeps one
  lesson — the two derivable buckets, after lesson 3 — and hands the contrast frame
  forward. Note this rules out parking the high list late (after lesson 22, as
  proposed elsewhere in the panel): that delivers the shortcut after the learner has
  already paid the eleven-fact cost it exists to avoid.
- Replace the phonetic bucket labels in the lesson with the three-question
  performable test, keeping the phonetic labels in `soundType.ts`. Add a test case
  to 2.5 AC3 applying the lesson's stated rule to จ and to ส specifically — an
  affricate and a fricative, the two cases the "unaspirated stop" phrasing fails.
- Fix `isAspirated` on ฑ and ฒ in task 2.1, before the derivation is written, and
  add the qa reviewer's criterion: `isAspirated` is asserted correct for all 44,
  since the whole phase-2 derivation rests on it. Note the fix needs `symbols.ts`
  in 2.1's `covers` (for the data) and the render side is in 2.3's (`SymbolCard`) —
  as the plan stands, no task owns both halves.
- Teach ห นำ as the *consequence* of the sonorant rule rather than as an exception
  to it, and give task 3.2 a criterion requiring the leading-consonant lesson to
  state that derivation: sonorants have no high partner, therefore they cannot
  reach rising or low tone alone, therefore ห. State it **from the low side and in
  the production direction** — "low letters come in two kinds, those with a high
  partner and the ten you can hum; if yours has no partner, that is what ห is for"
  — not as the symmetric "every high sound has a low twin", which is inert at point
  of use and invites the false converse. **L7** records why. Add the carrying sentence ("a
  letter's class never changes; what changes is which letter is in charge") to the
  cluster and tone-mark lessons too.
- Add a criterion to 4.1 or 2.5: class remains an item-level property practised
  per letter in the SRS; the rule is the acquisition path, not a replacement for
  the drill.

I have asked the experienced-thai-teacher reviewer to confirm the linguistic
framing of both points, since my load argument depends on the rule being correct.

### Finding L7 — The 11-letter residue is 7 contrasts, and the plan already has the better framing in a later task

**Severity:** Medium

**Description.** Task 2.5 presents the irreducible residue as an 11-member list
of high-class letters, and 2.1 AC2 asserts "that list has exactly 11 members". But
the 11 are not 11 independent facts. They answer 7 questions — for each of the
aspirate/fricative sound types (kh, ch, th, ph, f, s, h), which glyph is the high
one? Learning "for /kh/, ข is the high one" resolves ข, ค, ฆ and ฅ in a single
fact.

The plan already knows this. Task 3.3 teaches the cousins as pairs and says so
explicitly: "the high/low pairs (ข↔ค, ฉ↔ช, ถ↔ท, ผ↔พ, ฝ↔ฟ, ส↔ซ) are six decisions
rather than twelve letters." That is the same reduction, applied one phase later,
and 2.5 does not use it.

Two reasons the contrast framing is better than the list framing, beyond the
smaller number. First, it is the decision the learner actually faces while reading:
they are never asked "is ข on the high list", they are asked "this is a /kh/
glyph; which one is it and what class". Encoding specificity says to practise the
form the retrieval will take. Second, it is a better SRS unit — a contrast pair is
one card, and the discriminative practice is built into the item rather than
requiring the scheduler to happen to place the pair near each other.

The experienced-thai-teacher reviewer reached the same destination from the
sequencing side: their split of the class-rule lesson (see **L6**) puts part 2 at
lesson 12, where ข arrives and the cousin pairs become teachable, which is the
contrast framing this finding asks for. Adopting L6's split therefore implements
L7 rather than merely permitting it.

That reviewer also supplied the argument that turns this finding from a
preference into a further reduction the plan has not claimed, and I verified the
mapping against `symbols.ts`. The 11 high letters distribute over the 7 sound
contrasts unevenly:

| Contrast | High | Low |
|---|---|---|
| kh | ข, ฃ | ค, ฅ, ฆ |
| ch | ฉ | ช, ฌ |
| th | ถ, ฐ | ท, ธ, ฑ, ฒ |
| ph | ผ | พ, ภ |
| f | ฝ | ฟ |
| s | ศ, ษ, ส | ซ |
| h | ห | ฮ |

That is 11 high and 14 low, matching the verified totals. The three contrasts with
multiple high members (ถ/ฐ, ศ/ษ/ส, and ข/ฃ) pose *spelling* questions, not tone
questions — ถ and ฐ are both high, ศ ษ ส are all high, so which glyph a word uses
never changes the tone. **For tone purposes the residue is 7 binary questions, not
11 items.** Two of the seven are barely questions at all: for /s/ the high side is
common and the low side is the single rare ซ, and for /h/ the low side is the rare
ฮ — so "s is high unless it's ซ" and "h is high unless it's ฮ" are one fact each
rather than a contrast. The working residue is closer to **5 contrasts plus 2
freebies**.

These seven are also *derivable* rather than authored — grouping by `initialSound`
and keeping groups spanning more than one class reproduces them exactly from
existing fields (see **L10**). So the contrast framing is not merely better
pedagogy than the 11-item list; it is the framing that costs nothing to maintain
and cannot drift, where the list has to be kept correct by hand.

**And the derivation closes the loop with L6 exactly.** Both other reviewers ran
it independently and I checked the set membership: the seven groups cover 25
consonants — ข ฃ ค ฅ ฆ ฉ ช ซ ฌ ฐ ฑ ฒ ถ ท ธ ผ ฝ พ ฟ ภ ศ ษ ส ห ฮ — and that set is
*identical* to the class rule's third bucket, the 25 aspirates and fricatives. Not
overlapping: equal. So phase 2's "bucket three is 25 letters, of which memorise 11"
and phase 3's "the cousins are pairs" are not two ideas in two tasks. They are one
structure described twice:

> 44 consonants → 10 sonorants (low, derived) + 9 unaspirated stops and อ (mid,
> derived) + **25 letters falling into 7 sound groups, each posing one high/low
> decision**.

Stated that way the whole class system is three facts and seven binary questions,
two of which are near-free. That is a materially better thing to teach than either
task states on its own, and the plan currently has the two halves in different
phases with no line drawn between them.

The partition was recomputed independently by two reviewers over all 44 records and
comes out exact: the complement of the seven groups is 19 = 10 sonorants (ม น ง ย ว
ร ล ณ ญ ฬ, all low) + 9 unaspirated stops and อ (ก ด บ จ ต ป อ ฎ ฏ, all mid), which
is phase 2's own table. So task 2.1 AC2's derivability claim — that class resolves
for the first two buckets without consulting a table — is validated on the real
data rather than asserted, and the three-way split is complete and
non-overlapping. That is a stronger footing than the plan currently claims for
itself.

**Pushed one step further, the entire class system falls out of one operation — and
the fact that makes it work is worth teaching in its own right.** The
systems-architect reviewer split the sound groups by whether they span a class
boundary; I reproduced it over all 44:

| Sound groups | Count | Letters | Class |
|---|---:|---|---|
| uniform | 7 | ม น ณ ง ย ญ ว ร ล ฬ | all **low** |
| uniform | 7 | ก ด ฎ บ จ ต ฏ ป อ | all **mid** |
| class-spanning | 7 | the 25 | **high/low**, 11 high |

Three facts I verified and did not expect. Every spanning group spans *high and
low* — never mid. **No uniformly-high sound group exists.** And every one of the 11
high letters therefore sits inside a spanning group, which is where the number 11
comes from.

That structure is the *analysis*. Turning it into a *lesson* needs one more step,
and my first attempt at it was wrong in a way worth recording, because the error is
a common one.

I originally proposed stating it symmetrically — "every high-class sound has a
low-class partner; mid has none and needs none; sonorants have no high partner,
which is the gap ห นำ fills" — and asked the experienced-thai-teacher reviewer
whether it would survive a classroom. It would not, for two reasons I now think are
right. It is **inert at the point of use**: a learner never faces the question it
answers, because they have a letter in front of them and need its class, and are
never asked whether a high letter has a twin. And it **invites the false converse**
— that every low letter has a high twin, which fails for all ten sonorants.
Appending "but not the other way round" does not repair it; a negation hung off an
otherwise clean rule is exactly what gets dropped under retrieval load. The
symmetric statement is true, elegant, and useless.

Their fix is to state it from the low side, in the direction the learner actually
meets it, which is **production** — "I want a rising tone and my initial is /n/,
now what?":

> Low-class letters come in two kinds: those with a high partner — the aspirates and
> fricatives — and those without, the ten you can hum. If your letter has a partner,
> use the partner to get the high-class tones. If it has none, that is what ห is for.

Same fact, but the asymmetry is now the payload rather than the exception, it is
phrased in the direction of use, and it carries a consequence — which is what makes
a rule stick. It gets applied every time the learner writes หมา, หนู, หญิง, หรือ,
หลาย, ไหม or ใหม่. The symmetric version gets applied never.

This preserves the derivation opening for phase 3 intact, only re-pointed: phase 2
ends by showing that the hummable letters are the ones with no partner, and phase 3
opens by asking what Thai does about that. The gap is still shown ten lessons early
and still derived rather than told.

**This makes 3.3's ห/ฮ omission worse than a frequency oversight.** ห is doubly
load-bearing, and I verified both halves: it is the **4th commonest syllable initial
in the corpus at 6.09%**, and it is the letter that resolves the sonorant gap. Its
partner ฮ is 39th at 0.01% — so /h/ barely functions as a contrast at all, and ห is
effectively unpartnered from the other direction too. That last point is true and
mildly elegant and the reviewer recommends keeping it out of the lesson as too
subtle to survive; I agree, and note it here only because it explains why the
curated list dropped ห/ฮ in the first place. The derivation keeps it; a human
compiling contrasts by salience would not.

**One caveat on the derivation, which tempers the "nothing needs authoring"
conclusion.** Deriving the buckets from `(initialSound, classType)` is right for
*generating* the groupings and the 11-list — that is data the repo can compute and
the plan proposes to hand-write. But it cannot also serve as task 2.1 AC1's check.
AC1 requires the classification to "agree with each consonant's declared class for
all 44, with no exception list"; if the classification is derived *from* the
declared class, that agreement is tautological and the criterion tests nothing. The
plan's actual phonetic claim — sonorants are low, unaspirated stops are mid — is
only falsifiable against a sound-type classification that does **not** read
`classType`. So `soundType.ts` still has to exist and still has to be phonetically
grounded; what stops being hand-authored is the 11-member list and the group
memberships. This is also why the `isAspirated` defect on ฑ and ฒ (**L6**) still
has to be fixed: it sits on the one side of the check that has to stay independent.

A consequence for task 3.3's lesson text: it sells this as "six decisions rather
than twelve letters". Derived, it is **seven decisions covering twenty-five
letters** — more than double the reach it claims for its own idea. The
systems-architect reviewer made this point; the qa reviewer enumerated the same 25
letters while writing "nineteen", so for the record the count is 25 and the
enumeration both of them gave is right.

One robustness note also from that exchange, and it matters given **L6**'s data
defect: the derivation keys on `initialSound`, not on `isAspirated`. ฑ and ฒ
therefore land in the `th` low group correctly despite carrying `isAspirated:
false`. The cousin relation is immune to that defect, which is a reason to derive
from `initialSound` specifically rather than from the aspiration flag — the other
tempting source, and the one that would have propagated the bug.

This matters for the plan's headline claim. The plan advertises 44 → 11; the
reduction actually available is 44 → 7 binary decisions → effectively 5. That is
worth claiming, and it is worth teaching in that shape, because 5 decisions is
inside what a learner can hold as a single chunk and 11 items is not.

One correction to the shortlist from that reviewer, which I had taken from the
plan at face value: the plan's "7 critical high letters" (ข ฉ ถ ผ ฝ ส ห) drops ศ,
which carries 2.6× the token share of ฝ in the repo's own corpus (0.54% vs 0.21%)
and first appears at rank 251 against ฝ's 237. The shortlist should be 8, or —
better, since the plan already ranks everything — derived from the corpus rather
than asserted.

**Recommendation.** Teach the residue in 2.5 as 7 sound-type contrasts rather than
an 11-item list, and make the contrast pair the SRS unit in 4.1's priority model.
Keep 2.1 AC2's assertion that the high list has exactly 11 members — that is the
data-level invariant and it should stay — but do not let the list be the *taught*
form. The plan's own "7 of the 11 carry almost all early decisions" observation
(ข ฉ ถ ผ ฝ ส ห) is very nearly this finding already; it just stops one step short.

### Finding L8 — Structured records guarantee that the components are present, not that they are integrated

**Severity:** Medium

**Description.** The reviewer asked whether requiring structure improves or
constrains mnemonic quality. It improves checkability decisively — task 2.4's AC2,
AC3 and AC5 become mechanical rather than matters of reviewer taste, and the
architectural decision makes that case well. The plan is right that
`mnemonic?: string` "can hold anything and is checkable for nothing".

But the property that makes a mnemonic work is *integration*: the components must
interact within a single image, not merely co-occur. Relational, interactive
imagery is substantially more retrievable than a set of separately-imagined
features, and this is one of the more robust findings in the mnemonics literature.
The plan's own north star says it correctly — "binds shape, sound and class in one
image" — and then the schema specifies "the shape cue and the sound cue as
separate fields" (2.1 AC4). Three parallel fields structurally invite three
parallel non-interacting cues, and every acceptance criterion in task 2.4 passes
on a set that is entirely unintegrated: each record has a district, a shape cue
and a sound cue, the district matches the derived class, no 8-gram overlaps, and
the confusable pairs' cues differ. Nothing tests the binding, which is the thing
the north star names.

**Recommendation.** Add a required `scene` field to the schema in 2.1: one
sentence in which the shape cue acts on, becomes, or is acted on by the sound cue,
situated in the district. Make it the field the human reviewer judges, and say so
in 2.4 — the structural gate covers presence, the reviewer covers integration, and
the criterion should name that division the way task 1.4's originality decision
names its own floor ("it catches copied phrasing, not a mnemonic reproduced in
fresh words. That second case is the reviewer's, and the criterion says so"). That
is the right pattern and it should be applied here too.

### Finding L9 — "Binds shape, sound and class" is not achievable for all 73, and this is the one place the plan omits its three-state discipline

**Severity:** Medium

**Description.** The reviewer asked whether the binding is achievable for all 73
symbols or whether some will be forced. Some will be forced, and the ones that
will be are predictable:

- Several of the 29 vowels have no shape to build a story from. สระ อา is a single
  vertical stroke; อิ and อี differ by one tick; อึ and อื likewise; the short/long
  pairs are systematically "the same mark plus a diacritic".
- Several consonant pairs differ only in a loop or a stroke height: ฎ/ฏ, ถ/ภ, ป/บ,
  ฟ/พ. A shape cue that distinguishes them is a statement about a feature, not an
  image.
- Vowels have no class and therefore no district, so a third of the schema is
  inapplicable to 29 of the 73 records by construction. Task 2.4's own test case
  list acknowledges this ("A vowel record carries no district requirement and
  still validates") without acknowledging the consequence for the north star.

A forced mnemonic is not neutral. A vivid image that does not actually connect to
the target competes with the target at retrieval — the learner recalls the image
and cannot get from it to the letter. For the loop-and-tick cases the honest
device is not an image at all but an explicit stated contrast plus discrimination
practice, which is a different and legitimate teaching move.

What makes this a finding rather than an observation is that the plan applies a
"exactly one of three distinct states, and the exception never reads as the
absence" discipline with near-perfect consistency — 2.1 AC5, 2.2 AC4, 2.3 AC5, 3.1
AC6, 4.1 AC5, 5.1 AC5, 5.2 AC5, 5.3 AC6, 6.1 AC5 — and does not apply it to
mnemonic quality in 2.4, which is the place the exception is most certain to
arise.

**Recommendation.** Give 2.4 the third state it gives everything else:

> ACn: A symbol is in exactly one of three states with respect to its shape cue:
> has one; has none because no distinguishing shape story exists, with the reason
> recorded and the symbol taught by explicit contrast instead; or not yet written.
> The three are distinct values and the second never reads as the third. The count
> of symbols in the second state is reported.

Reporting the count is what keeps it honest — if it reaches 25, the schema is
wrong rather than the symbols being unusual.

### Finding L10 — The confusable-pair relation lives only in the prose being deleted, district is inert for six of the ten listed groups, and AC5's test is weaker than its criterion

**Severity:** Medium

**Description.** Three connected problems around task 2.4 AC5.

*The relation is deleted with the prose.* I parsed all 44 consonant mnemonic
strings to settle the scale, after the systems-architect reviewer counted this
differently: **exactly one** uses explicit "don't confuse" language
(`symbols.ts:804`, ค against ด), and **twelve** state a shape contrast against a
named partner glyph ("Looks very similar to ม but the loop is on the RIGHT",
"Similar to พ but the LAST line sticks out HIGHER", "Looks like ล with an extra
line"). Either way the conclusion is the same and stronger than I first put it:
visual confusability is barely encoded today, and what little there is lives in
strings task 2.4 replaces wholesale. Task 2.1's schema declares district, shape
cue, sound cue and tone motion; there is no `confusableWith`. After 2.4 the
relation exists nowhere in the domain model — the pair list survives only as
English prose inside an acceptance criterion, so the check can be written only by
transcribing AC text into a fixture, and task 3.3's "teach the cousins as pairs"
will transcribe it a second time.

*There are two different relations here, not one list stated twice — and only one
of them needs authoring.* The qa reviewer found that task 3.3's body carries its
own pair list (ข↔ค, ฉ↔ช, ถ↔ท, ผ↔พ, ฝ↔ฟ, ส↔ซ) beside 2.4 AC5's ten. The
systems-architect reviewer then worked out why they overlap so oddly, and I
verified it:

- **3.3's six are phonetic cousins** — same initial sound, different class. All six
  check out (ข/ค both /kh/ high-low, ส/ซ both /s/ high-low, and so on).
- **2.4's ten are visual look-alikes** — ม/น sound nothing alike.
- They intersect only at ผ/พ and ฝ/ฟ, which happen to be both. I checked all ten:
  those two are the only members of AC5's list that are also cousins.

That matters for my lane more than for the data model, because the two are
confusable for different reasons and need opposite remedies. A visual confusion is
a **perceptual discrimination** problem — the learner cannot tell the shapes apart,
and the fix is contrast training, juxtaposition and a shape cue naming the
distinguishing feature. A phonetic-cousin confusion is not perceptual at all — the
learner sees the difference perfectly well — it is a **paired-associate** problem:
which of two identical-sounding glyphs carries which class. Contrast training does
nothing for it; class-and-tone retrieval practice does. Merging them into one
`confusableWith` field would collapse two problems with different treatments, and
would feed the distractor sampler pairs confusable in a sense the card being drilled
is not testing.

**The phonetic relation should not be a list at all — it is computable.** Grouping
the 44 consonants by normalised `initialSound` and keeping groups that span more
than one class reproduces it exactly, from fields that already exist:

| Sound | High | Low |
|---|---|---|
| kh | ข ฃ | ค ฆ ฅ |
| ch | ฉ | ช ฌ |
| th | ถ ฐ | ท ธ ฑ ฒ |
| ph | ผ | พ ภ |
| f | ฝ | ฟ |
| s | ศ ษ ส | ซ |
| h | ห | ฮ |

Seven groups — which are precisely **L7**'s seven contrasts, arrived at by
computation rather than assertion. And the computation catches a real omission:
**3.3's hand-maintained list has six, missing /h/ — ห/ฮ.** ห is the single
highest-consequence high-class letter in the system, since it is also the ห นำ
letter that phase 3's leading-consonant lesson is built on. The hand list drops the
one that matters most, which is the standard failure of hand-maintained lists and
the argument for deriving this one.

*The repository already has the machinery this should feed.*
`VocabCardGenerator.ts` builds `initialSoundConfusableMap`,
`finalSoundConfusableMap` (:59, :63) and `vowelConfusableMap` (:85) from existing
symbol fields, and feeds them into multiple-choice distractor selection (:141–162)
— "Distractors are deliberately phonetically confusable". So *phonetic*
confusability is already derived, already encoded and already driving a
discrimination exercise. **Visual** confusability is the one kind the repo does not
hold, and it is the kind 2.4 AC5 is about (ม and น sound nothing alike; they look
alike). That reframes the recommendation from "add a field" to "add the one
missing confusable map and route it into the distractor generator that already
exists" — which also delivers most of **L11** for free.

*District is inert where it is most needed.* Task 3.3 says to "lean on the district
encoding: the two members of a pair differ in district". That is true of the
high/low cousins it is describing, and false of most of AC5's list. Taking the ten
groups AC5 names and their actual classes:

| Group | Classes | District helps? |
|---|---|---|
| ม / น | low, low | no |
| ช / ซ | low, low | no |
| พ / ฟ | low, low | no |
| บ / ป | mid, mid | no |
| ด / ต | mid, mid | no |
| ฎ / ฏ | mid, mid | no |
| ค / ด | low, mid | yes |
| ผ / พ | high, low | yes |
| ฝ / ฟ | high, low | yes |
| ถ / ก / ภ | high, mid, low | yes |

Six of the ten groups are same-district, so the district channel contributes
nothing to discriminating them and the shape cue must carry the whole contrast
alone. This is not a flaw in the district scheme — it is a fact about which pairs
are visually confusable — but it means the criterion should treat the two cases
differently, and it means the plan's general claim that district helps with
confusables is only half true.

*The list itself is wrong, and the errors run in both directions.* Once
`confusableWith` drives distractor selection (L11) rather than only a test
assertion, whether AC5's ten groups are the *right* groups becomes load-bearing.
The experienced-thai-teacher reviewer audited them and I verified every claim
against `symbols.ts` and the corpus.

The organising insight is one my own same-district/cross-district table (above)
reached from the encoding side and theirs reached from the consequence side: **a
visual confusion only costs a tone error when the two letters differ in class.**
Same-class confusions cost at most a pronunciation slip. That converges on the
same four groups — ถ/ก/ภ, ค/ด, ผ/พ, ฝ/ฟ — and it turns the split from an
observation into a weighting.

*Two of the highest-consequence pairs in the writing system are missing.* Verified
classes and syllable-initial frequencies from the corpus:

| Pair | Shape relation | Classes | Frequency |
|---|---|---|---|
| ส / ล | ส is ล plus one stroke | **High / Low** | 5.02% (8th) and 3.89% (13th) |
| ข / ช | ข has a notch where ช is smooth | **High / Low** | 3.73% (15th) and 2.38% (18th) |

Both cross a class boundary and both sit among the commonest syllable initials. ส
and ล together are about one syllable initial in eleven, so a learner who reads ล
for ส takes a tone error at that rate. Neither appears in AC5's list.

*And some confusions are free — which is the part worth teaching explicitly.* I
verified all five: ฬ/ล, ณ/น, ฆ/ค, ฑ/ท and ฒ/ท are visually similar, identical in
sound **and identical in class**, so misreading one as the other yields the correct
pronunciation and the correct tone. Their drill weight should be zero, and the fact
should be *stated to the learner*, because these are among the rarest letters in
the alphabet (ฬ 0.03%, ฆ 0.03%, ฑ 0.01%, ฒ 0.00%) and they attract anxiety out of
all proportion to their cost. Telling a learner "if you mix these up, nothing
happens" removes a burden rather than adding one — the rare inverse of a
discrimination criterion, and something no acceptance criterion in the plan can
currently express.

By the same weighting, ฎ/ฏ is the worst entry on AC5's list on every axis at once:
both mid class (so a confusion costs no tone), ฎ at 0.04% of syllable initials, ฏ
never occurring as one at all, and both on phase 4's demotion list — yet it is
drilled at the same weight as ค/ด.

*Vowels are absent from AC5 entirely*, though ิ/ี and ุ/ู differ by one stroke and
change vowel **length**, which changes tone through the live/dead syllable rules.
Task 2.4 rewrites all 29 vowel mnemonics with no contrast criterion over any of
them — the same gap **L9** notes from the authoring side.

*The test is weaker than the criterion.* AC5 says the cues must "differ on the
feature that actually distinguishes the glyphs". The test case says "For each
confusable pair, the two shape cues differ." Any two distinct strings pass. The
pareto-analyst reached the same point independently (their O4) from a
verification-depth angle; I reach it from the discrimination-learning side, and
the fix is the same. Separately, the list mixes a triple (ถ/ก/ภ) into what the
test iterates as pairs.

**Recommendation.**

- **Derive** the phonetic-cousin relation rather than listing it: group by
  normalised `initialSound`, keep groups spanning more than one class. Seven groups,
  no maintenance, no drift, and ห/ฮ stops being omitted.
- **Author** only the visual relation, as `confusableWith` + `contrastFeature` in
  2.1's schema, since shape similarity is not derivable from any existing field.
  Route both into distractor selection, kept separate by card type (L11).
- Restate 2.4 AC5 as: both members of a confusable group name the same
  `contrastFeature` with opposing values. For same-district groups, add that the
  shape cue alone must carry the contrast; for cross-district groups, that the
  district may.
- Make the structure a **group**, not a pair — ผ ฝ พ ฟ is one four-way clique
  rather than three overlapping pairs, and ถ/ก/ภ is already a triple.
- Carry a **consequence weight** per group, computed rather than asserted:
  spans-more-than-one-class × member frequency. That makes ส/ล and ข/ช surface as
  top-weighted, ฎ/ฏ fall to the floor, and the five same-class-same-sound groups
  resolve to zero — which is data the distractor generator can use directly.
- Add ส/ล and ข/ช to the list, and add a vowel contrast set covering at least
  ิ/ี and ุ/ู.
- Give the zero-weight groups a lesson slide of their own. "If you mix these up,
  nothing happens" is a teachable fact and it is the cheapest anxiety reduction
  available in the course.

### Finding L11 — Adjacency is correct, but nothing juxtaposes the contrast — and the one generator that could do it on a schedule picks distractors at random

**Severity:** High (raised from Medium; the review-side half turned out to be a verified defect in shipped behaviour, not a feature request)

**Description.** The reviewer asked whether teaching confusable pairs adjacently
induces interference. It does not, and the plan's decision to keep the source
course's adjacency is right. The interference worry belongs to arbitrary
paired-associate learning — learning two similar labels for two similar referents,
where similarity creates competition. Glyph discrimination is a different task:
the learner must learn to *tell the shapes apart*, and the difference between them
is the information they need. Contrasting cases presented together support
discrimination learning better than the same cases presented apart, because
juxtaposition is what makes the distinguishing feature perceptible. Separating ม
and น by five lessons does not reduce their confusability; it removes the learner's
only opportunity to see what distinguishes them.

The condition is juxtaposition, not mere adjacency. Two confusable letters in
consecutive slides, each with its own mnemonic, taught one after the other, gets
the similarity cost without the contrast benefit — the learner forms two competing
traces and never sees them side by side. The plan's criteria reach for the right
thing at the record level (2.4 AC5 on contrasting cues; 3.3's test that "each
high/low cousin pair is introduced in one lesson") but no criterion requires the
*lesson* to present the two members together, with the difference stated and
tested.

**Recommendation.**

- Route the relations into `ScriptCardGenerator.pickChoices`, **keeping them
  separate by card type** (see L10): a glyph-recognition card draws *visual*
  look-alikes as distractors — a card for ม offers น — while a class-or-tone card
  draws its *phonetic cousin* — a card for ข offers ค. Feeding one pool to both
  would supply distractors confusable in a sense that card is not testing. Assert
  both. This is the higher-leverage half of the finding, and it needs an owning
  task: none of 2.4, 3.3 or 4.1 reaches `ScriptCardGenerator.ts`, and no other task
  in the plan does either.
- Add a criterion to 2.5 and 3.3:

> ACn: A lesson introducing both members of a confusable group contains a slide
> presenting them side by side with the `contrastFeature` stated, followed by a
> discrimination prompt in which the learner identifies which is which before the
> reveal.

This is structurally checkable given L10's schema change, and it composes with
L1's prompt slide kind — it is the same mechanism applied to the case where it
pays most.

The review-side half of this turned out to be more than an opportunity. I
originally noted that `VocabCardGenerator.ts` maintains confusable maps a visual
relation could join. The systems-architect reviewer checked the other generator —
the one that actually teaches the glyphs — and I verified it.
`ScriptCardGenerator.ts:125`:

```
function pickChoices(correct: string, pool: string[], count = 4): string[] {
	const distractors = pool.filter((item) => item !== correct);
```

followed by a Fisher-Yates shuffle. **Script multiple-choice distractors are drawn
uniformly at random from the whole pool.** A learner drilling ม is as likely to be
offered ฬ and ฮ as น. So glyph discrimination — the thing the confusable pairs
exist for, and the thing an SRS is uniquely good at delivering repeatedly — is
never practised against the confusable partner, in the one place the schedule
could guarantee it.

That inverts how this finding should be read. It is not that the repo has
discrimination machinery in one layer and the plan should copy the pattern. It is
that the layer *with* the machinery (vocabulary) is keyed on sound and does not
need visual confusability, while the layer that teaches the glyphs draws at random
and has nothing good to feed it. The generator exists; the data does not. Adding
`confusableWith` (L10) and filtering `pickChoices` through it converts every
script recognition review into a discrimination trial — juxtaposition on the SRS
schedule, which is what makes the plan's adjacency decision pay.

The lesson slide and the review distractor are the two halves of this; the plan
currently specifies neither.

### Finding L12 — Nothing caps new symbols per lesson, and task 4.3 AC2 forces every demoted letter into some lesson

**Severity:** Medium

**Description.** No acceptance criterion anywhere in the plan bounds how many new
symbols a lesson may introduce. This is usually a minor omission; here two things
make it concrete.

Task 4.3 AC2 requires that "every symbol in the course is taught by exactly one
lesson — including ฬ, ฆ, ฑ, ฒ, ฐ, ฎ, ฏ, ฃ, ฅ and ฌ". That is ten rare letters that
must each land somewhere, and the phase's whole point is that they no longer get
four lessons of their own. The path of least resistance is a single rare-letters
lesson introducing all ten at once. Nothing in the plan prevents it.

And the plan is simultaneously compressing: 25 lessons become roughly 20, while
*adding* at least five new lessons (class rule, unwritten vowels, clusters,
leading consonants, consolidated tone marks) and one optional track. The freed
capacity — four sub-1% letter lessons and three numeral half-lessons, by the
README's own accounting — roughly covers the new lessons, which leaves the
remaining letter content to be redistributed across fewer slots than it occupies
today. Every pressure in the plan pushes items-per-lesson up and nothing pushes
back.

The cost is downstream of the lesson: a lesson introducing ten symbols enqueues
ten new SRS cards at once, and the learner meets all ten again in the same
sessions for weeks. Element interactivity between similar rare glyphs (ฑ/ฒ, ฎ/ฏ,
ฐ) is high, which makes the load worse than the count suggests.

**Recommendation.** Declare a per-lesson new-symbol cap in `lessonSequence.ts`
(task 3.1 owns that file) and assert it. A cap in the range of 5–7 new symbols
matches both the working-memory constraint and the practical SRS intake rate;
the exact number is the author's call but it should be a declared number with a
test, not an emergent property of where the content happened to fit. Add to task
4.3:

> ACn: No lesson in the sequence introduces more than the declared maximum number
> of new symbols. The maximum is declared in `lessonSequence.ts` and a lesson
> exceeding it fails.

### Finding L13 — Demotion is specified as data with no consumer, and duplicates an existing field

**Severity:** Medium

**Description.** Task 4.1 AC4 introduces a scheduling priority for all 44
consonants in a new module `symbolPriority.ts`, and its architectural decision
argues correctly that demotion must change scheduling rather than curriculum ("ฬ
stays in the course and stays in the SRS, it simply stops blocking progress").

Two problems. First, `priority?: number` already exists on every symbol record in
`symbols.ts` and is populated (ม carries `priority: 1`, น `priority: 2`). Task 4.1
does not mention it. Adding a second source keyed on the same concept is the
failure `consonantClassColor.ts`'s comment memorialises and that phase 2's README
cites as the reason not to add a second class map — the discipline is applied to
class and not to priority.

Second, and more consequential for the learning claim: I grepped all of
`src/domain` (excluding `symbols.ts`) and `src/application` — **nothing reads
`priority`.** No card generator, no selector, no scheduler. So the field is inert
today, and no task in this plan wires it into `ReviewService`'s selection. Task
4.3 AC3's criterion ("a demoted letter is reachable through review and does not
gate progression") is satisfiable with nothing consuming priority at all, because
nothing does. The demotion capability — one of phase 4's two headline
deliverables — would ship as a number in a data file.

This matters pedagogically because the demotion decision is a real one and the
plan's reasoning for it is good: ฬ, ฃ and ฅ genuinely should not occupy the same
scheduling slots as ก and ม, and "rare" and "not taught" genuinely should be
different states. Getting the data right and the scheduler wrong delivers neither.

The systems-architect reviewer added the fact that makes this unavoidable rather
than merely likely, and I verified it: **`symbols.ts` is not in task 4.1's
`covers`** (which lists `toneMarkTable.ts`, `symbolPriority.ts` and their tests).
So an executor who notices the existing field cannot migrate it, deprecate it, or
delete it. The duplication is not a risk the task might take — it is the only
outcome available to it.

The qa reviewer adds two dispositions worth carrying: task 4.3 AC3 should name the
selector that reads priority, so the criterion is discharged by a consumer rather
than by data; and if the panel prefers deleting the existing field to extending
it, note that it is populated across all 44 consonants and the vowels (98
occurrences), so the deletion is a whole-file diff that belongs in the same task
as the new model rather than in a follow-up.

**Recommendation.**

- Add `symbols.ts` to task 4.1's `covers`, then extend the existing `priority`
  field rather than adding `symbolPriority.ts` — or state in 4.1's architectural
  decision why a second representation is correct and what makes the existing
  field obsolete. Without the `covers` change neither option is executable.
- Give one task the scheduler consumer — a criterion that a demoted symbol's cards
  are introduced only after the non-demoted set reaches a stated stage — or state
  explicitly that demotion is a lesson-sequence concern only and drop the
  "scheduling" framing from 4.1.

### Finding L14 — Nine of the 82 mnemonics have no owning task, including the four where the tone channel would apply

**Severity:** Medium

**Description.** CONTEXT.md records that 82 `mnemonic` fields exist in
`symbols.ts` and that all of them read as close paraphrases of the licensed
transcripts. Task 2.4's title says "Replace all 82 existing mnemonics" and its body
says "Every one is replaced." But AC1 asserts a different set: "Every consonant
and every vowel carries a mnemonic record. The counts are asserted (44 consonants,
29 vowels)" — which is 73.

I counted by section boundary in `symbols.ts`: 44 in `consonants`, 29 in `vowels`,
4 in `toneMarks`, and 5 in `words`. The 9 mnemonics in the latter two are in no
task's scope anywhere in the plan — phase 5 covers `src/domain/vocabulary/data`,
not `symbols.ts`, and no phase-4 task touches `symbols.ts`'s tone-mark records. So
nine licensed paraphrases survive the rewrite, and because every 8-gram
originality gate in the plan is scoped to the artefact its own task produces, none
of them ever meets one. AC1's exact-count assertion passes regardless, because it
asserts 73 and 73 is what it will find.

The tone-mark four are the more interesting loss. Those are the records where the
tone channel would legitimately apply (L4), and they are the symbols the plan's
own README singles out as carrying no useful mnemonic today ("tone marks none").
The plan identifies the gap in its opening paragraph and then does not assign it.

The experienced-thai-teacher reviewer reached the same gap independently (their
T14) and added the reason it is the most costly of the nine: tone marks are the
*best* mnemonic targets in the system, because one, two, three and four strokes
map onto a fixed tone order. That is a rare case of an iconic, ordinal,
already-structured mnemonic sitting unused — and it is the one place the
vertical-motion vocabulary from task 2.1 has a legitimate referent (**L4**). Three
reviewers now converge on the tone marks being both uncovered and underexploited.

**Recommendation.** Either change 2.4 AC1 to assert 82 and bring the tone marks and
the five word records into scope, or name the owning task for the other nine —
4.2 is the natural home for the tone-mark four, since it is authoring the
tone-mark lesson anyway and would give them the (mark × class) treatment L4 asks
for. Whichever is chosen, the originality gate must reach all 82; nine unrewritten
paraphrases of licensed material is the exact thing CONTEXT.md's hard constraint
exists to prevent.

### Finding L15 — `teachingWords` is unbounded, and it is the only thing standing between the frequency principle and the early lessons

**Severity:** Medium

**Description.** The plan's strongest content claim is that example words come
from frequency ranks rather than from what conveniently demonstrates a letter.
That principle collides with "no symbol is used before it is taught" hardest in the
early lessons, where the taught alphabet is tiny and the highest-frequency Thai
words (ที่, ได้, จะ, นี้, ครับ — ranks 1–5) use letters the learner has not met.

I checked whether the collision is fatal at lesson 1 and it is not. With ม, น and
สระ อา the corpus yields seven spellable words, led by มา at rank 37, then นาน
(332), นา (538), นาม (1052), นานา (1513), นม (1847), มน (2601). The lesson builds
three words; the top three are rank 37, 332 and 538. The principle is not just
survivable at lesson 1, it is comfortable. That is a genuine validation of the
plan's premise and worth recording.

The problem is the escape hatch's shape. Task 1.4 AC3 admits a word that is "listed
in the deck's own `teachingWords` field with a stated reason", and the test case
is "found in `vocabulary.json` or in `teachingWords` with a non-empty reason". Any
word passes with any non-empty string. The architectural decision names the hatch
well and defends it correctly ("a letter's own acrophonic name, for one") — but
"declared with a reason" is not a constraint when the reason is free text and the
count is unbounded. The pressure to use it is highest in exactly the lessons where
the frequency principle is the headline improvement.

**Recommendation.** Two cheap constraints, both testable with the machinery the
plan already has:

- Make the reason a closed enum: acrophonic name, minimal pair for a taught
  contrast, tone-rule demonstration, unwritten-vowel demonstration. An unmatched
  reason fails.
- Cap the proportion of a deck's example words that may come from `teachingWords`,
  declared per deck and asserted. A lesson where half the words are escapes is a
  lesson that abandoned the principle.

### Finding L16 — The acrophonic name is already a sound cue, and the plan discards the strategy in the same phase that teaches the rule validating it

**Severity:** Low

**Description.** Task 2.5 teaches the naming cheat code: a consonant's name is its
initial sound plus ออ, then the acrophonic word — "that explains the shared `-aaw`
ending". Once a learner holds that rule, a mnemonic linking a glyph's *shape* to
its *acrophonic word* is automatically a shape-to-sound link, because the name
begins with the sound by construction. ม ม้า is "maaw maa"; a mug and a horse both
deliver /m/.

That is the strategy most of the existing mnemonics use — ฟ via ฟัน (teeth
sticking out higher), ซ via โซ่ (a chain), ห via an owl — and it is the strategy
Thai learners and Thai children actually use, because the acrophonic names are how
the alphabet is recited. Task 2.4 discards it: the schema's `soundCue` is
specified only as a field separate from the shape cue, with no relation to the
name, and the task body instructs writing "from the glyph's shape, its initial and
final sounds, its class and its district" — the name is not in the list.

The copyright constraint does not require discarding it. CONTEXT.md is explicit
that the facts are free and only the phrasing, the specific images and the curated
example choices are not. The acrophonic names are facts about the writing system;
building a fresh image around ฟัน is original work.

**Recommendation.** Have the schema in 2.1 anchor `soundCue` on the acrophonic
name where one exists, and say so in 2.4's instructions. It makes the sound cue
non-arbitrary, it compounds with the naming rule 2.5 teaches, and it gives the 73
mnemonics a consistent construction principle instead of 73 independent
inventions — which will also make them faster to author and more uniform in
quality.

### Finding L17 — Pom and Chan should not be natives of any district

**Severity:** Medium

**Description.** The character choice itself is good and the corpus supports it:
ฉัน is rank 14 and ผม is rank 15, so both are words the learner needs early, and
teaching the gendered first-person split by exposure rather than by instruction is
the right call. Task 5.3 AC1's declared politeness register is a genuinely good
decision — ฉัน versus ดิฉัน is exactly the kind of thing that drifts if each
mnemonic chooses for itself.

The district assignment is the problem. Task 5.3 observes that ผ and ฉ are both
high class and treats this as fortunate: "both characters are natives of the high
district — which is convenient, since that is the district whose seven critical
letters most need reinforcement." Three consequences work against it.

First, because *both* are high, character presence carries no information about
district. A cue that takes the same value in every instance cannot discriminate.
If one were high and one low the pair would teach the class contrast as a
by-product — but the language fixes ผม and ฉัน, so that option is not available,
and what remains is a constant.

Second, it gives the learner no evidence against the wrong generalisation.
"Characters appear in the high district" is indistinguishable, from the learner's
side, from "characters imply high class" — and since every instance confirms it,
nothing ever disconfirms it. When Pom later appears in a low-district scene for a
low-class word, the learner has a contradiction rather than a variation.

Third, and most practically: in phase 5 the characters appear across vocabulary
mnemonics, and a vocabulary mnemonic already carries a *room* (part of speech, per
5.3 AC2) while its word's consonants carry *districts* (class). That is two
place-like attributes in one image before the characters arrive with a third. Task
5.1 AC2 guards this at the name level only — "room names and district names share
no value" — which prevents a naming collision, not a spatial one.

**Recommendation.** Make Pom and Chan district-neutral: they travel, and the
district of a scene comes from the staging alone. The characters keep everything
they are actually for — the gender split, a consistent cast, register — and stop
carrying a class signal they cannot carry reliably. Consider also introducing them
by English name early (phase 2, in the symbol mnemonics) and landing their Thai
spellings ผม and ฉัน later as a payoff; the learner does not need to read ฉ to use
Chan, and by the time ฉ is taught in the middle band the character is already
familiar, which makes the letter's introduction a recognition rather than an
acquisition.

### Finding L18 — The vowel conditional-form rule exists only in five prose strings that task 2.4 deletes, and two later tasks depend on it

**Severity:** Medium (unrecoverable, unlike the other prose losses)

**Description.** This is the systems-architect reviewer's find, arrived at while
reconciling our two wrong counts of how many mnemonics mention final consonants.
Reading the strings rather than counting them turned up a second and larger loss.

Of the 13 mnemonic strings across all 82 records that mention "final", 8 are
consonant mnemonics teaching that consonant's own final behaviour — the loss I
originally filed, and the recoverable one, since `finalSound` survives as a
populated field with seven consumers. The other **5 are vowel mnemonics encoding
how a vowel's written form changes when a final consonant follows**. I read all
five and confirmed it:

- สระ อะ becomes ไม้หันอากาศ above the consonant
- เ-ะ: "When a final consonant follows, the อะ is replaced by…"
- เ-อ: "When no final consonant: สระ เอ before + อ after. When WITH a final
  consonant: สระ เอ before + สระ อิ above…"
- เ-อะ: the same alternation
- อัว: "No final consonant: ไม้หันอากาศ above + ว to the right. With final
  consonant: ว is sandwiched between initial and final."

I checked the `ThaiVowel` record shape: `character`, `name`, `length`, `sound`,
`position`, `audioUrl`, `priority`, `lesson`, `mnemonic`. There is no field for a
conditional form, and grepping for `withFinal`, `conditionalForm`, `formWithFinal`
and `altForm` returns nothing. So this rule exists **nowhere in the domain model
except those five prose strings**, and task 2.4 replaces all 29 vowel mnemonics
wholesale.

That is structurally identical to the confusability loss in **L10** — a relation
held only in prose, removed by a wholesale rewrite, with no field to move it into —
but worse in one respect: confusability can be re-derived by a person looking at
the glyphs, whereas a vowel's conditional written form is arbitrary orthography
that has to be known.

It also has downstream consumers inside this plan. Task 3.1 encodes implicit
vowels and reconciles them against `vocabulary.json`'s syllable analysis, and task
4.3 AC5 requires the complete sequence's rules to resolve every taught corpus
word's tone. Both need to know how vowel forms behave with and without a final —
and neither task's `covers` reaches `symbols.ts`, so neither executor can consult
what 2.4 deleted or restore it.

**Recommendation.** Add a conditional-form slot to the vowel side of task 2.1's
schema — the bare form, the with-final form, and which is canonical — and have task
2.4 populate it from the five strings before replacing them. Alternatively, require
2.4 to declare which facts it is dropping and name the task that re-teaches them;
what must not happen is the current path, where the rewrite passes every one of its
acceptance criteria while removing knowledge two later tasks assume.

A note on the companion recommendation, where I can correct a figure in the other
direction. The experienced-thai-teacher reviewer proposed an optional `finalCue`
field asserted for "every consonant whose finalSound differs from its
initialSound", estimating ~12 letters. I counted: with parentheticals stripped from
both fields, **40 of 44** differ. But almost all of those 40 are one rule, not 40
facts — every obstruent collapses to its place of articulation as a K-, T- or
P-stop, which is a single thing to learn. The letters whose final is genuinely not
derivable from that rule are **nine**: ย → /i/, ว → /o/, ร ล ญ ฬ → /n/, อ → the
vowel สระ ออ, and ห ฮ → no final use at all. Those nine are where a per-letter cue earns its place. The AC should name the nine,
not the forty and not a round estimate.

I first wrote that the nine "are almost exactly bucket one", and both other
reviewers pushed on it in opposite directions — one saying six, one saying eight. I
recounted: **six** of the nine are sonorants (ย ว ร ล ญ ฬ); อ belongs to the mid
bucket and ห and ฮ are aspirate/fricatives. Going the other way, four sonorants —
ม น ง ณ — have entirely regular finals. So my original phrasing was too strong and
the eight figure is wrong.

The version that survives checking is narrower and makes the point better, and it
is the systems-architect reviewer's: **the sonorant bucket is the only one where
irregular final behaviour is common** — six of its ten members, against near-zero
elsewhere. That matters for sequencing, not only for the data model. Task 2.1
teaches sonorants as the *free* bucket: derive the class, nothing to memorise. Six
of those ten then quietly carry a second fact that does have to be memorised,
arriving immediately after the lesson has told the learner this group needs no
memorisation. The extra cue slot on sonorant mnemonics is therefore worth more than
a headcount suggests — the irregularity lands exactly where the lesson has lowered
the learner's guard, which is the classic setup for a fact that never gets encoded
because the learner has been told not to look for one.

## Plan Quality Findings

| Dimension | Assessment | Detail |
|---|---|---|
| **AC testability** | Strong, with three exceptions | Nearly every criterion resolves to a script check, which is the plan's best structural property. Exceptions: 2.4 AC5's test is strictly weaker than its criterion (**L10**); 5.3 AC4 names an enforcement component that cannot enforce it (**L3**); 1.3 AC3/AC6 and 6.1 AC3 declare `ac_enforcement: none` with a named human check, which is honest rather than a gap. |
| **Behavioral ACs** | Adequate for data, absent for the learner | Seam tasks (2.1, 4.1, 5.1) are legitimately data-shaped. The content tasks assert properties *of the lesson artefact* — coverage, originality, derivability — and none asserts anything the learner does. No criterion in the plan describes a retrieval event (**L1**). The sufficiency criteria (2.5 AC3, 3.2 AC4, 4.2 AC3) are the closest thing and they test the exposition, not the learner. |
| **Test case quality** | Excellent | Consistently defeats the standard failure modes: planted-overlap assertions so a silently empty corpus cannot pass vacuously (1.4, 2.4, 2.5, 3.2, 3.3, 4.2, 5.3); exact counts so a shrinking source fails (2.1, 2.4, 4.3); "removing one rule makes this test fail" mutation checks (2.5, 3.2, 4.2); both-directions assertions on symbol sets (1.4, 3.3); and the explicit refusal to test only the empty and complete learner (1.1, 6.2). This is better than most plans and should be preserved as a pattern. |
| **YAGNI** | Disciplined | Reviewed from the learning-science side specifically; found no criterion buying learner value it will not deliver, with the caveat that **L2** describes a criterion buying the *wrong* value rather than none. The rejected-alternatives sections do real work — CONTEXT.md's rejection of literal ordered-route palaces for symbol recall is exactly right, and the plan would have been better had it applied the same argument to the POS palace. |
| **Architectural decisions with alternatives** | Strong | Every task carries one; most carry explicit *Rejected* entries with reasons. The channel-allocation decision in 2.1 (district for class, vertical for tone) is correctly reasoned and correctly resolved even though its downstream application is wrong (**L4**). 5.2's decision to report accuracy rather than gate on it is well argued. Thinner: 3.2 and 3.3 carry an architectural decision with no rejected alternative. |
| **Trust boundary inventory** | Complete for its stated scope, with one omission in mine | The five listed boundaries and their owning controls are well chosen, and including the `word_class` backfill because it "decides which memory room a word belongs to" shows the inventory is already thinking past the security frame. By the same argument, the agent-authored mnemonic and illustration content is missing: 73 symbol mnemonics plus vocabulary mnemonics are written by an agent, become the learner's durable memory content, and — unlike a wrong `word_class`, which a later pass can revise — a wrong mnemonic that has been rehearsed is expensive to remove, because the learner must unlearn it. The originality gate covers copying; nothing covers correctness. Recommend adding the row with task 2.4 owning the control, and the control being the human review of the `scene` field from **L8**. |

## Phase-by-Phase Review

### Phase 1 — Tracer

The right shape. Proving the format after one lesson rather than twenty is exactly
the discipline this kind of content rebuild needs, and AC4 of task 1.4 — the
learner's schedule and unlocked vocabulary unchanged across the migration — is a
real end-to-end criterion rather than four internal assertions.

From my lens the phase has one omission and it is the plan's biggest: the deck
schema is fixed here, and it is fixed without a retrieval-prompt slide kind
(**L1**). Everything downstream encodes against this schema; adding the kind later
means re-authoring every deck produced in phases 2, 3 and 4. This is the single
change I would make before phase 1 starts.

Validated: the frequency-ranked example-word principle is comfortable at lesson 1
— ม, น and สระ อา yield seven corpus words with the top three at ranks 37, 332 and
538 (**L15**). The escape hatch that exists for the harder cases is unbounded and
should be narrowed while it is still cheap to do so.

Task 1.4 AC5's originality floor and its architectural decision are well
constructed; the decision's honesty about what the n-gram check does *not* prove
is the right model for the reviewer/gate division that **L8** asks for elsewhere.

### Phase 2 — Encoding

The most valuable phase and the one carrying the most of my findings, which is
proportionate rather than a complaint.

The class rule (**L6**) is sound — I verified the arithmetic and the
experienced-thai-teacher reviewer verified it independently, record by record. But
task 2.5 as scoped cannot be executed: the lesson is placed in the opening band
and the eleven high-class letters it must teach are not introduced until lessons
12–22, so the lesson forward-references all eleven and fails its own AC2. Splitting
it — derivable buckets after lesson 3, the high list at lesson 12 — resolves that
and simultaneously delivers **L7**'s shift from an 11-item list to 7 sound-type
contrasts, which the plan already discovered in task 3.3 and did not carry back.
The bucket labels also need replacing with a test the learner can perform, since
"unaspirated stop" is meaningless for the eight fricatives, and `isAspirated` is
wrong on ฑ and ฒ in a way that will break task 2.1 AC1 on contact. The rule
additionally needs scoping so phase 3's ห นำ does not read as falsifying it.

The channel allocation — district for class, vertical for tone — is correct, and I
want to be unambiguous about that because the reviewer asked directly: tone is
pitch, pitch-height is a pre-existing cross-modal mapping that costs nothing to
install, and class has no natural spatial mapping and therefore gains more from a
rich distinctive locus than from an arbitrary height. Spending the vertical axis
on tone is right. The colour-plus-district redundancy is right and the CVD
argument for it is right.

What goes wrong is downstream of that correct decision. The tone-motion channel is
given no legitimate symbol-level referent, an existing shipped component already
occupies it, and the guard against district/tone interference is written against
names rather than against images (**L4**). The scaffold fade that 2.3 extends is
keyed to the containing word rather than to the symbol whose class it marks, and
the heaviest scaffold in the system — the mnemonic prose — never fades at all
(**L5**).

The mnemonic rewrite is the plan's largest authoring task and it is correctly
sized as such. Structure buys checkability and does not buy integration
(**L8**); the binding will not be achievable for all 73 and the task needs the
third state it gives everything else (**L9**); the visual confusability relation
is deleted along with the prose that holds it, while the repo already runs
phonetic confusable maps the visual one should join, and district is inert for six
of the ten confusable groups (**L10**). Nine of the 82 mnemonics fall outside every
task's scope (**L14**).

The final-consonant question I first filed here resolved into two halves once the
systems-architect reviewer and I reconciled our counts. `finalSound` itself is not
at risk — a populated field on all 44 with seven consumers including a generated
SRS card — so the consonant half is only a lost *reinforcement* channel (8 of 44
mnemonics) and is recoverable from surviving data. The vowel half is not
recoverable and is now **L18**: how a vowel's written form changes before a final
consonant lives only in five prose strings that 2.4 deletes, with no schema field
anywhere and two later tasks depending on it.

### Phase 3 — Hard parts

The diagnosis is correct and the promotion is the right call. Unwritten vowels,
clusters and อักษรนำ genuinely are what stops beginners reading, and teaching the
ห-leading and อ-leading cases as one mechanism rather than two coincidences ten
lessons apart is a real pedagogical repair. Task 3.2 AC2 enforcing the unification
is well specified, and stating the อ-leading set's closure at four members is
exactly right — an unstated closure invites over-application, which is a
predictable and expensive error.

Task 3.1 AC5's reconciliation against the corpus with a recorded baseline rather
than an assumed zero is the best single criterion in the plan. It is honest about
a rule system that has genuine exceptions and it makes regression detectable
without forcing the rules to be bent until a test passes.

One finding lands here: the leading-consonant rule contradicts phase 2's "every
sonorant is low" from the learner's side, and neither phase flags it (**L6**). The
fix is small and belongs in both lessons.

Also relevant here: the confusable-pair juxtaposition criterion (**L11**), since
the cluster and leading-consonant material is where the plan's own contrast
teaching is thinnest.

### Phase 4 — Sequence

The tone-mark consolidation is well argued and I verified the argument it rests
on. Task 4.2's decision — "the source's fragmentation is defensible for a video
course with no scheduler... this app has an SRS that handles spacing, so the only
thing fragmentation costs here is the pattern. The scheduler gives back what the
consolidation gives up" — is correct, and it is load-bearing, so it is worth
saying that the scheduler does in fact deliver: `ReviewService.startSession`
Fisher-Yates shuffles the selected cards before returning the session, so items
within a pool are interleaved rather than blocked. The script-pool items the
tone-mark lesson produces get genuine interleaving.

The consolidation's own cognitive load is handled correctly too. Twelve cells at
once would exceed working memory, and the plan's three framing observations — mid
takes all four marks in order, high and low take only two, low is the exception —
reduce it to three chunks. That is the right move and stating those three
observations *is* the load management. Task 4.2 AC2's insistence on teaching the
four unreachable cells is also right: a learner who does not know a combination is
impossible will keep looking for it, and absence is a fact worth teaching. The
rejected alternative says so explicitly.

Two findings land here. Nothing caps new symbols per lesson, and AC2's
teach-every-letter requirement plus the demotion of ten rare letters creates
direct pressure toward a ten-symbol lesson (**L12**). And the demotion capability
— one of the phase's two headline deliverables — is specified as data that
duplicates an existing field and that nothing in the codebase consumes (**L13**).

### Phase 5 — Vocabulary palace

The phase most in need of a revised justification and least in need of a revised
task list.

The asymmetry insight is correct and I want to credit it plainly: rooms are a cue
in production and an output in recognition, because the learner does not know the
part of speech until after recall. Most designs that reach for a POS palace miss
this entirely and build symmetric UI that leaks. The plan catches it, states it in
the phase README's "what will bite", and gives it a criterion.

What the insight is built on does not hold. Partition pruning helps searched
retrieval, not cued paired-associate retrieval, and the corpus distribution — which
I counted — puts over 70% of entries in one room after backfill with three rooms
below 30 entries each (**L2**). The palace is still worth building for encoding
context and image composition; the README should say that instead.

The conclusion drawn from the asymmetry needs changing too: a pre-reveal room cue
trades away the retrieval effort that produces the retention, the binary
production/recognition split does not exist in a codebase with six
`VocabProperty` values, and the enforcement names a component with no reveal state
(**L3**). On-demand exposure resolves all three.

Task 5.2's provenance requirement is a good decision and its reasoning — "a wrong
class puts a word in the wrong memory room, which is worse than no room, because
the learner builds an image there" — is exactly the right frame. Keeping backfilled
values distinguishable so a later pass can revisit only the guesses is right, and
the refusal to invent an accuracy threshold before seeing the method work is
defensible.

Pom and Chan are well chosen (ranks 14 and 15) and should not be district natives
(**L17**). The declared register is a good call and should stay.

The phase README's "what will bite" entries are unusually good — particularly "Thai
parts of speech are not English ones" and the note that merging verbs and
adjectives is linguistically correct rather than a shortcut. That is the right
call and worth keeping, with one guard rail the plan does not currently have: the
merge is correct *for recall* and wrong *for generation*. `word_class` feeds
`GrammarCardGenerator.pickWord` by exact match, so the verb/adjective distinction
the rooms erase is the one the sentence templates need. The rooms must layer over
`word_class`, never replace it (**L2**).

The classifier room has a second problem of the same kind: the field it partitions
on cannot express its membership, since คน and ตัว — the two commonest classifiers
in the language — are single-valued and tagged `n`. Of the six rooms, that one
needs a data decision before it needs a design.

### Phase 6 — Strangle

Little in my lane. The confirm-then-delete ordering enforced by criterion order is
correct, and keeping the `never` default after the union narrows to one arm is the
right instinct.

One learning-relevant observation, offered as an observation and not filed as a
finding: passive video watching is the weakest study mode available, and task 6.1
builds an export for it. The plan's justification — that a deck is interactive and
a video is not, and there are moments where watching is what the learner wants —
is a product judgement rather than a learning-science claim, and it is a
defensible one; the plan's premise was that the videos' *content* was weak, not
that video is a bad medium. I note only that if **L1** is adopted, the exported
video will be a rendering of a deck containing retrieval prompts, and the export
should either preserve the pause-for-answer beat or state that it does not.

## Summary Statistics

| | |
|---|---|
| Documents reviewed | 28 (plan README, CONTEXT.md, 6 phase READMEs, 20 task files) |
| Findings filed | 18 (L1–L18) |
| Severity: High | 7 (L1, L2, L3, L4, L5, L6, L11) |
| Severity: Medium | 10 (L7–L10, L12–L15, L17, L18) |
| Severity: Low | 1 (L16) |
| Findings verified against shipped code or data | 16 of 18 |
| Findings resting on literature alone | 2 (L1, L8) |
| Findings originated by another reviewer and verified by me | 2 (L6's placement blocker; L18) |
| Phases with findings | 5 of 6 (phase 6 carries an observation only) |
| Tasks with findings | 11 of 20 (1.1, 1.4, 2.1, 2.3, 2.4, 2.5, 3.2, 4.1, 4.3, 5.1, 5.3) |
| Plan claims verified as correct | 9 — class-rule arithmetic (10/9/25, 11 high); corpus counts (5,454 / 3,200 empty / 277 mnemonics / 12 classes); 82 mnemonic fields; lesson-1 frequency feasibility (7 words, top rank 37); `ReviewService` within-pool interleaving; tone/vertical channel allocation; the 7 derived cousin groups cover exactly the 25-letter third bucket (set equality); no uniformly-high sound group exists, so all 11 high letters fall in spanning groups; ห is the 4th commonest syllable initial at 6.09% while its partner ฮ is 39th at 0.01% |
| Corrections adopted from other reviewers | 11 — `finalSound` is not lost (7 consumers incl. a generated SRS card), so L10 drops that claim; the class-rule lesson's placement is unworkable, raising L6 to High; the tone-motion vocabulary of five already ships in `TONE_CONTOUR_POINTS`, sharpening L4; `symbols.ts` is absent from 4.1's `covers`, making L13's duplication forced rather than likely; ห นำ is the *consequence* of the sonorant rule rather than an exception to it, which replaces L6's patch with a better design; the residue is 7 binary tone questions of which 2 are near-free, strengthening L7; script distractors are uniform-random, raising L11 to High; the residue needs no second lesson at all, since every low cousin precedes its high partner; AC5's confusable list is wrong in both directions; the visual and phonetic-cousin lists are two relations rather than one, and the phonetic one is derivable; `word_class` is a live input to grammar-sentence generation, so the room merge must not propagate into it |
| Corrections I issued | 8 (and one of my own proposals withdrawn — the symmetric statement of the partner rule, replaced by the low-side production framing) — my "52 mnemonics teach final-consonant behaviour" counted `finalSound:` field lines (true: 8 of 44 consonant mnemonics, 13 of all 82); the `finalCue` AC should name the 9 letters whose final is not derivable from the obstruent-collapse rule, not the 40 whose fields differ nor a ~12 estimate; visual confusability appears in 1 mnemonic as explicit "don't confuse" language and 12 as a shape contrast against a named partner; `isAspirated` has three consumers, not none, one of which renders it, so the ฑ/ฒ defect is already learner-visible rather than dormant; `consonants` is exported at symbols.ts:3027, so task 2.1 AC1 can read all 44 without symbols.ts in its `covers`; six of the nine irregular finals are sonorants, not eight, and my own "almost exactly bucket one" was also too strong; task 3.3's cousin list omits /h/ (ห/ฮ), which the derivation recovers; the derived groups cover 25 letters, not 19 |
| Cross-references to other reviewers | pareto-analyst O4 (converges with L10); qa confirmed L3/L13/L14 and reversed their own Q27 on L3; systems-architect filed L4/L10/L13 as A19–A21; experienced-thai-teacher confirmed L6's arithmetic in full and supplied its placement blocker |

### Fix-before-execution set

1. **L1** — before phase 1. It changes the deck schema every later task encodes
   against.
2. **L6** — before phase 2 task 2.5 is scoped. The class-rule lesson cannot be
   authored where the plan places it, and the split changes which phase owns which
   half. The `isAspirated` data fix on ฑ and ฒ belongs in 2.1, ahead of the
   derivation.
3. **L4**, **L5** — before phase 2 task 2.3. Both concern channels and fade
   contracts that phases 3–5 inherit, and L4 now also carries a `covers` gap that
   would break 2.3's own build gate.
4. **L10** + **L11** — before task 2.4 authors 73 records. The schema fields have
   to exist before the mnemonics are written against them, and the
   `ScriptCardGenerator` half needs an owning task that currently does not exist.
5. **L2**, **L3** — before phase 5 task 5.1. The taxonomy's justification decides
   the exposure design, and the exposure design decides the UI.

Everything else is a correction inside its owning task.

### Cross-cutting pattern, promoted at the systems-architect reviewer's suggestion

Five of this panel's findings are the same shape: the plan builds *beside* a
repository feature rather than on it. `priority`, the five-contour tone
vocabulary, `ClassBadge`, `lessonSequence.ts` and `migrateState` all already
exist, and each acquires a parallel version. In three of those the owning task's
`covers` does not reach the original, so an executor who spots the duplication
cannot repair it. From my lens the learning-relevant instance is the tone
vocabulary — task 2.1 re-declares a five-member contour set the repo settled, with
a reasoned comment, before this plan existed. I support that reviewer's conclusion
that task 2.1's seam is drawn too narrow: it should own the full symbol-annotation
shape, and `confusableWith` plus a final-sound cue slot are the two concrete
things missing from it.
