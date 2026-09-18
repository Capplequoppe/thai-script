# The voice these lessons are written in

Lesson 1 is the reference. Everything else is measured against it, and where
they differ, lesson 1 wins. This document exists because the drift is
consistent, has a name, and is invisible until somebody says it out loud.

---

## The tell

**A clause whose only job is to characterise the clause before it.**

The shape is: state a thing, then add a second clause that says something
*about* the thing rather than saying something new. It reads as a small
verdict delivered on the learner's behalf. It is the single most reliable
sign that a line was machine-written.

Both of these are real lines that shipped, and both are wrong:

> Same sound, same length. **Only the seat moves.**
> Two consonants, **and they look nothing alike.**

Lesson 1 writes two-sentence bullets constantly. The difference is what the
second sentence is doing:

| lesson 1 — second sentence carries new information | mine — second clause comments |
|---|---|
| Real paper. **A real pen.** | Roll it hard or barely at all. **Both are normal speech.** |
| Start at the head, upper left. **Loop clockwise.** | Put it beside the boat. **Nothing alike — remember that.** |
| It stopped in front of the boy. **She was not there.** | Live ending, low class, flat tone. **You can derive that now.** |
| Many consonants share a sound. **Their class is what separates them.** | They arrive as one of the five. **Same ending, different coat.** |

The left column is two facts, two instructions, or two steps of a story. The
right column is a fact and then a remark about the fact.

### Three species of it

**The aphorism.** A neat compression of what was just said. *"Only the seat
moves."* *"Same ending, different coat."* *"Eye first, mouth second."* These
feel like good writing and are the worst offenders, because the pleasure of
the phrase is doing the work that information should do.

**The emphasis tag.** A word or fragment appended to insist. *"Always."*
*"Every time."* *"That is the point."* *"No exceptions."* If the sentence
needs insisting on, the sentence is wrong.

**The progress note.** A remark on what the learner can now do. *"You can
derive that now."* *"Not bad for a letter you met twenty minutes ago."*
*"Still the thing that catches people."* A teacher says these out loud
occasionally; a lesson that says one every third bullet is flattering the
reader on a schedule.

### The fix

Delete the commenting clause, or replace it with the next actual step. If
deleting it leaves the line thin, the line was thin already and the comment
was hiding it.

> ~~Same sound, same length. Only the seat moves.~~
> Same sound, same length. The mark just moves up over the letter.

> ~~Two consonants, and they look nothing alike.~~
> Two consonants, and one of them changes its sound at the end of a word.

---

## What lesson 1 actually does

Read `content/lessons/lesson-01.md` before writing. The things worth copying:

**It addresses the learner's state.** *"If you have ever seen Thai script
written down, you probably thought it was a great many squiggles and loops,
and I understand completely why that looks scary."* It says what the learner
is probably feeling, then answers it.

**It gives stakes before content.** *"Most people who try to learn Thai never
get it. The script looks frightening, so they skip it and work from
romanisation instead."* The reason to care arrives before the thing to learn.

**It asks real questions.** *"Makes sense?"* *"Are you ready to learn your
first consonant?"* *"Want to hear it in Thai?"* Short, conversational, and
they expect no answer.

**Its stories are about people doing specific things.** *"She did not use a
boat. She rode out at first light on a grey horse, straight off the beach and
into the shallows, until the water came up over its shoulders."* Concrete,
sequential, unhurried. No summary at the end of the paragraph telling you
what the paragraph meant.

**Its sentences run long and join with "and".** Average 13.6 words. The
rhythm is spoken, not written — a person talking, not prose being composed.

---

## The measurable floor

These are checks, not the standard. A lesson can pass all of them and still
be full of the tell. Run `scripts/check-lesson-voice.py`.

| measure | lesson 1 | acceptable |
|---|---|---|
| negation for emphasis | 2.5% | under 3% |
| questions to the learner | 2.2% | 1.5% – 3.5% |
| clipped fragments (≤5 words) | 18% | under 24% |
| mean sentence length | 13.6 words | 12 – 16 |

### Negation for emphasis

The construction is *"X is not Y"*, used to set up a contrast rather than to
contradict anything. All four of these were rejected on sight:

> You are not here simply to read Thai.
> And skipping is not free!
> Not mouthed, and not muttered under your breath.
> That missing puff is not a detail.

Three of those are from `orientation.md`, which is otherwise the best-liked
writing in the course — so a lesson can be good and still carry this, and
being good elsewhere is not a defence. The shape is the problem wherever it
appears.

I briefly argued the opposite: that a negation contradicting something the
reader actually believes was doing a teacher's job, and only the ones
negating their own description were at fault. That distinction does not
survive contact with the examples. Write the positive.

> ~~You are not here simply to read Thai.~~
> You are here to read Thai out loud, on the right tone, from the spelling.

> ~~That missing puff is not a detail.~~
> That missing puff is what makes these three a group.

Genuine absences are fine and are not this — *"there is no English word for
it"* states a fact rather than staging a contrast. The check flags
candidates; a person decides.

`orientation.md` sits at 8.9% and has not had this pass. It is deferred, not
exempt.

---

## Phrases the originality check rejects

The suite compares every deck line against the project's reference corpora.
These have each cost a rebuild, because the check reads the **built deck** and
only clears after regenerating:

"at the top of the" · "at the end of the" · "at the end of a" · "the only
difference between the" · "is written before the consonant" · "in front of
the consonant"

Replacements that have passed: "above the beach", "where the harbour
finishes", "put it at a syllable's end", "nothing else separates", "goes down
before the consonant does", "ahead of the consonant".

---

## The rules that are not about voice

Carried from `plans/lesson-scoping/BUILD-ORDER.md`, because a lesson that
reads beautifully and fails these still has to be rewritten:

1. Pen and paper, per letter, and say both halves of the name aloud.
2. A challenge and its answer never share a slide.
3. Every declared symbol must appear in a word — **both halves of a length
   pair.** This has been missed in four consecutive lessons.
4. Verify every `recording:` path with `ls` before writing it.
5. Never print a glyph taught in a later lesson when `previews: none`.
6. Image scenes: one subject. Never a comparison, never a relationship
   between figures, never Thai letterforms, never "no X" phrasing.
