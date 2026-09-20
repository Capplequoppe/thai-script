# `teaches:` — what a slide is the story of

A learner who opens ก in the market has met the chicken once, in a lesson they
finished weeks ago. Until this existed there was no way back to it: the decks
carried no per-slide reference to what they taught, so the only offer the
palace could make was the whole lesson from its first slide.

`teaches:` is a slide-level directive in `content/lessons/*.md`. The deck
builder passes it through to the slide's JSON, and `DeckSlide`'s `teaching`
prop shows only the slides carrying a given tag, in the order the lesson puts
them.

```
## exposition meet-ko-kai
image: images/lesson-02/meet-ko-kai.jpg
heading: The chicken that pecks glorious golden grain
teaches: ko-kai
narration: en ...
```

---

## Tags are slugs, never glyphs

Glyphs were the obvious choice and are the wrong one. `อ` is both a consonant
and a vowel and the two would collide into one tag; four of the roof vowels are
stored with a leading placeholder space (the convention `thaiText.ts`
documents, which gives a combining mark something to sit on); and `อ (as
vowel)` carries an English gloss. Slugs have none of that, and they read better
in the markdown.

| kind | slug | where it comes from |
|---|---|---|
| consonant | `ko-kai`, `mo-ma`, `tho-thahan` | the `id` in `consonant-scenes.json` — already the name of its image and its audio clip |
| vowel | `sara-aa`, `sara-ii`, `mai-han-akat` | the `name` in `symbols.ts`, kebab-cased |
| tone rule | `low-live`, `mid-mai-ek`, `high-dead-long` | `ALL_RULE_IDS` in `memoryPalace.ts` |
| tone scene | `paddy-alive`, `well-speared-once` | the `id` in `palace-scenes.json` |

Several to a slide, comma-separated: `teaches: ko-kai, kho-khay`.

Never invent a slug. Every one must already exist in one of those four
sources, and `slideTags.test.ts` fails the build if one does not.

---

## What to tag

**Tag a slide when it is part of that thing's story.** The test is whether a
learner who came looking for ก would want this slide.

Tag:

- The slide that introduces the letter, with its picture and its mnemonic.
- Slides that develop it — the shape cue, the sound, the writing practice for
  that letter specifically.
- A retrieval slide that asks about it, and the reveal that answers.
- A slide about a pair or a contrast, tagged with **both** letters, where the
  comparison is part of how each is learned (`teaches: kho-khay, kho-khwai`).

Do not tag:

- Openers, closers, pen-and-paper reminders, recaps of the lesson as a whole.
- A slide that merely *mentions* the letter while teaching something else. A
  slide that says "you already know ก" while teaching ข is ข's slide alone.
  This is the whole reason tags are authored rather than scanned for glyphs: a
  scan cannot tell those two apart, and a story viewer that opens on the wrong
  letter's story is worse than one that opens on nothing.

**A retrieval and its reveal always travel together.** `slidesTeaching` pulls
the partner in whichever of the two is tagged, so tagging one is enough — but
tag both anyway where both are clearly about the letter, because the tag is
also documentation of what the slide is for.

---

## What a good tagging looks like

A letter's tag set, read in order, should play as a coherent few minutes: meet
it, see why the picture is the shape, hear the sound, then be asked something
and answer it. Three to six slides is the usual span.

If a letter's tags come to one slide, look again — the lesson probably develops
it somewhere you passed over. If they come to twelve, some of those are lesson
slides rather than letter slides.

---

## A tone rule's story is the palace's story, said once

The eleven scenes in `palace-scenes.json` each carry a written story, a
picture and a narrated clip. For a while they were told nowhere a learner
would meet them: the lessons taught the rules analytically beside a picture of
the empty place, so lesson 4 drew a rooftop with nobody on it while the
mnemonic was a fisherman being struck by lightning on that roof.

Every rule now has a story slide in the lesson that teaches it, and that slide
is built the same way every time:

```
## exposition rooftop-story
image: images/palace/rooftop-fisherman-struck.jpg
heading: What happens on the rooftop
teaches: low-dead-short, rooftop-fisherman-struck
narration: en <the teacher walks the learner to the place>
recording: en <the scene's own words> public/palace/scenes/audio/rooftop-fisherman-struck.mp3
narration: en <the teacher hands it back, bound to the rule>
- <bullets>
```

**The middle line is a `recording:`, not narration.** It plays the exact clip
the Palace tab plays, and the picture is the same file, so the story a learner
hears in the lesson and the story they hear two months later looking it up are
the same words rather than two drafts of one idea. A mnemonic works by exact
repetition; two tellings that differ in their details are two things to hold.
It also costs nothing to synthesise.

Tag both the rule ids and the scene id. The rule ids are what `storyForToneRule`
resolves, which is how the palace offers a way back into the lesson from under
the scene; the scene id is what says which of the eleven this slide is.

**Where a scene runs ahead of the lesson, tell the part that fits and say so.**
`well-vendor-and-monk-fall` names the monk and counts four rules, and lesson 11
knows neither — so lesson 11 tells the vendor's half in the teacher's voice and
leaves the second figure on the well rim explicitly unnamed, and lesson 13
plays the clip once the monk exists and all four rules are on the table. The
alternative is a forward reference the learner cannot tell from an assumption,
which is the fault that put "you met this letter twenty minutes ago" into a
lesson nobody had started twenty minutes earlier.
