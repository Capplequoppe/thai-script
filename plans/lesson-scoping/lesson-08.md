# lesson-08 scoping

Source skeleton: `content/lessons/lesson-08.md`
Title line: `# The boat and the monkey, twin masts, and two letters that land as n`

## Declares

From the HTML comment header (`content/lessons/lesson-08.md:5-14`):

> Middle band, lesson 3 of 6. Declares ร and ล and the vowels แ and แ-ะ.

`previews:` line, verbatim (`content/lessons/lesson-08.md:6`):

```
previews: none
```

`ranks:` line, verbatim (`content/lessons/lesson-08.md:7`):

```
ranks: 1-2000
```

Rest of the header, verbatim:

> ร and ล are the first two letters whose final sound is not their initial
> sound, and the ending they share is น — which the learner has had since
> lesson one. The pair is also a `confusablePairs` entry on the ล side (ล ↔ ส,
> added-stroke); ส is a temple letter and is not shown here.

**`rule:` slides: NONE.** Verified: `grep -n '^rule:' content/lessons/lesson-08.md` returns
nothing, and there are no `## rule` headings. The `lessons` table row
(`src/domain/script/data/symbols.ts`, `number: 8`) declares
`specialRulesIntroduced: ["mai-taikhu-ae"]` and `toneRulesIntroduced: []`, but the skeleton
teaches the ae-roof as a single bullet on `ae-vowels` rather than as a rule slide.

**Symbols the test will demand appear.** `declaredSymbols(8)` from the `lessons` row:

| row field | value |
|---|---|
| `consonants` | `["ร", "ล"]` |
| `vowels` | `["แ", "แ-ะ"]` |
| `toneMarks` | `[]` |

so the required character set is **ร ล แ ะ**. `conditionalSymbols(8)` adds the chars of
`แ-ะ`'s forms (`openForm: "แ-ะ"`, `withFinalForm: "แ-็-"`, `sceneGrammar.ts:106-111`),
which additionally permits `็` — already taught in lesson 7, so nothing new.

**`previews: none` is a decision, not a silence.** `middleBand.test.ts` has a dedicated
assertion, "states the previews line on every band script, none included", precisely so
that a script whose author never considered previews and one that considered them and
found none are distinguishable. The line is present and correct — do not delete it.
Its consequence: **no glyph taught after lesson 8 may appear anywhere in the deck's title,
headings, prompts, bullets or answers.** In particular the header's own note about ล ↔ ส
is a note *to the author*; **ส must not be printed** (it is a lesson-12 letter).

## Consonants

### ร

From `src/domain/script/data/consonant-scenes.json` (entry `id: "ro-ria"`):

- letter: `ร`
- name: `ร เรือ`
- meaning: `boat`
- district: `harbor`
- `prompt`: "A wooden boat prow rising out of the water with a long pennant flying from its mast and hooking over at the tip, on a fishing harbour quay, moored wooden longtail boats and drying nets behind."
- `narration`: "The boat. [pause] Low class, so it lives down at the harbour. [pause] A head sits low at the waterline while a pennant-line flies up and hooks over — a boat's prow flying its flag. [pause] A rolled r, the outboard motor turning over; at a syllable's tail it flattens out into n."

From `src/domain/script/data/symbols.ts:995-1013`:

- class: `ThaiSymbolClass.Low`
- `nameRomanized: "raaw ruuea"`, `nameMeaning: "boat"`
- `initialSound: "r (trilled R, like double R in 'burrito')"`
- `finalSound: "n (same as น, live ending)"`
- `hasDeadEnding: false`, `isAspirated: false`
- `priority: 2`, `lesson: 8`
- `shapeCue`: "A head sits low at the waterline while a pennant-line flies up and hooks over — a boat's prow flying its flag."
- `soundCue`: "A rolled r, the outboard motor turning over; at a syllable's tail it flattens out into n."

Confusable pair: `ธ` ↔ `ร`, feature `added-stroke` — "ธ closes its top into a loop with a
crossbar; ร stays open". **ธ is not taught by lesson 8 and `previews: none` — do not print it.**

Note `priority: 2` — ร is the second-highest-priority consonant in the whole table.

### ล

From `consonant-scenes.json` (entry `id: "lo-ling"`):

- letter: `ล`
- name: `ล ลิง`
- meaning: `monkey`
- district: `harbor`
- `prompt`: "A monkey crouched on top of a harbour post with its long tail arching up and over its own back, on a fishing harbour quay, moored wooden longtail boats and drying nets behind."
- `narration`: "The monkey. [pause] Low class, so it lives down at the harbour. [pause] A head at the base with a long tail arching right over its back — a monkey crouched on a harbor post. [pause] L lapped off the tongue-ridge, humming low; at the tail of a syllable it too lands as n."

From `symbols.ts:1016-1035`:

- class: `ThaiSymbolClass.Low`
- `nameRomanized: "laaw ling"`, `nameMeaning: "monkey"`
- `initialSound: "l (like L in 'little')"`
- `finalSound: "n (same as ร final, live ending)"`
- `hasDeadEnding: false`, `isAspirated: false`
- `priority: 9`, `lesson: 8`
- `shapeCue`: "A head at the base with a long tail arching right over its back — a monkey crouched on a harbor post."
- `soundCue`: "L lapped off the tongue-ridge, humming low; at the tail of a syllable it too lands as n."

Confusable pair: `ล` ↔ `ส`, feature `added-stroke` — "ส crosses the ล shape with an extra
line". The header flags this and rules it out of scope.

## Shipped recordings (verified with `ls`)

Consonant name recordings — both exist:

| symbol | file | verified |
|---|---|---|
| ร | `public/audio/consonant-ro-ria.mp3` | EXISTS (7826 bytes) |
| ล | `public/audio/consonant-lo-ling.mp3` | EXISTS (7107 bytes) |

Vowel name recordings — both exist:

| vowel | file | verified |
|---|---|---|
| แ (`sara aae`) | `public/audio/sara-ae-long.mp3` | EXISTS (9118 bytes) |
| แ-ะ (`sara ae`) | `public/audio/sara-ae-short.mp3` | EXISTS (6527 bytes) |

Also relevant, since the `ae-vowels` slide compares back to lesson 7's mast:
`public/audio/sara-e-long.mp3` EXISTS and `public/audio/sara-e-short.mp3` EXISTS.

The `็` roof, reused from lesson 7, still has no recording of its own — `symbols.ts:1806`
points it at `/thai-script/audio/sara-e-short.mp3`. There is no `public/audio/*taikhu*.mp3`.

No recording exists or is needed for ส (previews: none — the letter is out of scope here),
though `public/audio/consonant-so-sia.mp3` does exist for lesson 12.

## Example words and ranks

Declared window: **1-2000**. Every word below resolves in
`src/domain/vocabulary/data/vocabulary.json` and **every one is inside the window**; the
highest is รีบ at 1015, so the lesson sits comfortably under its ceiling. This is the
complete set of Thai runs of length ≥2 in the skeleton.

| word | skeleton romanisation | vocabulary.json romanisation | English (vocab) | rank | Thai chars |
|---|---|---|---|---|---|
| รัก | rák | rák | love | 113 | 3 |
| รับ | ráp | ráp | receive | 169 | 3 |
| ลูก | lûuk | lûuk | child | 111 | 3 |
| ลม | lom | lom | wind | 435 | 2 |
| การ | gaan | gaan | the process of; work; job | 33 | 3 |
| รายการ | raai-gaan | raai-gaan | program | 781 | 6 |
| ทางการ | thaang gaan | thaang gaan | official; authority; formal | 634 | 6 |
| แดง | daaeng | daaeng | red | 728 | 3 |
| แพง | phaaeng | phaaeng | expensive | 306 | 3 |
| แทน | thaaen | thaaen | instead | 324 | 3 |
| แยก | yâaek | yâaek | separate | 599 | 3 |
| แรก | râaek | râaek | first | 171 | 3 |
| และ | láe | láe | and | 21 | 3 |
| ละ | lá | lá | each | 267 | 2 |
| ระดับ | rá dàp | rá dàp | level; grade | 319 | 5 |
| ราคา | raa-khaa | raa-khaa | price | 182 | 4 |
| ดูแล | duu laae | duu laae | care for; look after | 510 | 4 |
| ทะเล | thá lee | thá lee | sea | 438 | 4 |
| เล็ก | lék | lék | small | 346 | 4 |
| เร็ว | reo | reo | quick | 702 | 4 |
| ลึก | lúek | lúek | deep | 773 | 3 |
| รีบ | rîip | rîip | hurry | 1015 | 3 |

**Nothing is outside the window and nothing is absent from vocabulary.json.**

The skeleton's closing claim — "That is four of the twenty commonest verbs in the language"
about ลึก / รีบ / รัก (plus, presumably, a fourth) — is **not verifiable from
vocabulary.json's `rank` field**, which is an overall frequency rank across all word
classes, not a rank within verbs. รัก is 113, รีบ is 1015, ลึก is 773. I could not
determine whether "four of the twenty commonest verbs" holds; the claim names only three
words explicitly and the fourth is unstated. Flagging rather than filling in.

Reminder on the window (from `content/lessons/lesson-06.md:27-30`): the rank check "reads
headings, prompts, bullets and answers — not narration". A word ranking above 2000 may be
spoken but must never be written into a bullet.

## Risks

### 1. LENGTH PAIRS

**Yes — one pair: แ (long, `sara aae`) and แ-ะ (short, `sara ae`).**

- `แ` — `symbols.ts:1824-1837`, `length: "long"`, `position: "left"`, `priority: 13`,
  `sound: "ae (like A in 'cat', long)"`.
- `แ-ะ` — `symbols.ts:1838-1853`, `length: "short"`, `position: "around"`, `priority: 14`,
  `sound: "ae (like A in 'cat', short)"`.

Character-level, the test passes as the skeleton stands: `แ` and `ะ` both appear in
`public/lessons/lesson-08/deck.json` (verified — chars used include `แ ะ`).

**The short member is the weak one, and in two directions at once.**

*Its open form is present but unlabelled.* **และ** (rank 21) is spelled แ + ล + ะ, and
vocabulary.json confirms it is genuinely this vowel: its syllable record is
`{"initialConsonant": "ล", "vowel": "แะ", "finalConsonant": null, ...}`. So the skeleton
*does* contain a แ-ะ word — but it sits in the `more-words` slide glossed only as "and",
with **no connection drawn to the vowel being taught two slides earlier**. A learner reads
และ as vocabulary, not as the short ae. The narration should make the link explicit; it is
free evidence and it is the 21st commonest word in the language.

*Its with-final form has no example at all.* `conditionalFormFor("แ-ะ")` gives
`withFinalForm: "แ-็-"` with `example: "แข็ง"` (`sceneGrammar.ts:106-111`). **แข็ง cannot be
used here**: it needs ข, a lesson-12 letter, and `previews: none` forbids printing it. I
searched the skeleton and there is no แ-็- word in it. So the slide's claim — "It behaves
exactly like เ-ะ did last lesson — add a final consonant and the hooks become the ็ roof" —
is asserted without a single instance the learner can see. That is the sharpest content
gap in this lesson.

*The long member is well covered*: แดง, แพง, แทน, แยก, แรก, ดูแล — six words, all
confirmed long `แ` in the corpus (e.g. แรก's syllable record is `"vowel": "แ"`).

### 2. SHORT-WORD RISK (under 3 Thai characters)

Two words are 2 characters:

- **ลม** (lom, rank 435, 2 chars)
- **ละ** (lá, rank 267, 2 chars)

Correction to the premise as briefed: 2-character Thai words do **not** uniformly fail the
gate. `scripts/lesson_deck/pipeline.py` retries across
`RETRY_SEEDS: tuple[int, ...] = (42, 1, 7, 13, 99, 2024, 5, 77)` — **eight** attempts — at
`TRANSCRIPT_MATCH_RATIO = 0.9`, and lessons 01-06 ship 2-character clips that verified:
นา, มา, มี, ดี, กา, นก, ดู, พบ on attempt 1, วง and คน on attempt 3. **Zero** failed or
mismatched Thai segments across all six built lessons.

The real exposure is retries, and pipeline.py:94-98 says why: "Short Thai has high variance
against the transcriber … `มอ` is not a word on its own, so the transcriber substitutes the
one that is". **ละ** is the riskier of the two — a bare consonant plus `ะ`, a single mora
that is also a common particle, so the transcriber has many neighbours to choose from.
Neither word is load-bearing: ล is covered by eight words and ละ/ลม could both be dropped
without leaving a symbol uncovered.

This lesson is comparatively safe on this axis — its content is unusually long-word-heavy
(รายการ and ทางการ are 6 characters each).

### 3. DECLARED SYMBOLS WITH NO EXAMPLE WORD

- **ร** — รัก, รับ, การ, รายการ, ทางการ, แรก, ระดับ, ราคา, เร็ว, รีบ. Ten words, and both
  positions (initial and final) are shown. No risk.
- **ล** — ลูก, ลม, และ, ละ, ดูแล, ทะเล, เล็ก, ลึก. Eight words. **But ล is never shown in
  final position**, which the `landing-as-n` slide claims it does: "It is what ร and ล
  always do in final position". Every final-n example in the lesson (การ, รายการ, ทางการ)
  uses **ร**, not ล. The claim about ล is made and never demonstrated. Words like ผล or กล
  would need lesson-12 letters or clusters; I did not find an in-window, in-inventory
  word showing final ล. Flagging as a gap I could not close.
- **แ** — six words. No risk.
- **แ-ะ** — one word (**และ**), present but never identified as this vowel; **with-final
  form has no example at all**. See risk 1.

## Cross-lesson hooks

**The five live endings, and why ร and ล are not a sixth.** `content/lessons/lesson-02.md:209`:

> Now the first of two rules, and you have already met every letter it needs. Five letters
> in the whole alphabet can close a syllable and leave the sound still going. Today's three
> are three of them. The other two are the horse and the mouse, from last lesson. Notice
> what the five have in common. They are the five you can hum — hold any one of them and it
> keeps going until you run out of breath.

and `content/lessons/lesson-02.md:217`:

> There they all are, and they all live in the same place. The horse, the mouse, the snake,
> the giant and the ring — every voice the harbour has, and every one of them a sound you
> can hold. That is the whole set. You will never have to memorise which letters end live,
> because they are simply the ones you can hum.

This is the promise lesson 8 has to protect rather than break. The skeleton knows it —
`landing-as-n` says: "it is why lesson two's live-endings rule names five letters without
naming either of these: they are not a new ending, they are น arriving in disguise."
Lesson 2 said "that is the whole set", flatly; the narration's job is to show ร and ล
joining the set **without** contradicting that sentence.

**Low class + live ending gives mid tone.** `content/lessons/lesson-02.md:223`:

> Every letter in the harbour is low class. When one of them opens a syllable and nothing
> stops the air at the end, the tone comes out flat — level from beginning to end, halfway
> up your speaking range. Low class, live ending, mid tone. That is the rule, and it is the
> one every other tone rule will be measured against.

The `final-r-answer` reveal depends on this exactly: "การ is a live syllable and takes the
live tone rule for its class." Both of lesson 8's letters are harbour/low, so the tone side
of the lesson is a rebate — the same move lesson 6 named
(`content/lessons/lesson-06.md:49`): "it is a rebate rather than a shortcut".

**The mast, one lesson old.** Lesson 8's `ae-vowels` and `one-mast-two` both lean on
lesson 7's `เ`, which is the immediately preceding lesson rather than a planted promise.
The `็` roof is likewise lesson 7's, carried forward in เล็ก and เร็ว.

**No hook found that lesson 8 uniquely closes.** Lesson 1's loop-direction promise was paid
off in lesson 6 (`content/lessons/lesson-06.md:14-20`); lesson 3's "flick" was paid off in
lesson 4 (`content/lessons/lesson-04.md:195`); lesson 3's missing-puff shortcut
(`content/lessons/lesson-03.md:61`) and the unwritten-vowel promises
(`content/lessons/lesson-03.md:342`, `content/lessons/lesson-06.md:257`) all belong to
lesson 9. I found no earlier promise pointing at ร, ล, or a letter whose final sound
differs from its initial.

## Assets

**Images: none.** `content/lessons/images/lesson-08/` **does not exist** (verified with
`ls`: "No such file or directory"). Only `lesson-01` … `lesson-06` and `orientation` have
image directories; `lesson-06` holds 12 `.jpg` files for scale.

**`scene:` lines: 0.** Verified `grep -c '^scene:' content/lessons/lesson-08.md` → 0.
Also 0 `image:` lines, 0 `narration:` lines, 0 `thai:` lines, 0 `glyph:` lines.
(Lesson 6, for comparison: 12 `scene:`, 14 `image:`, 37 `narration:`.)

**Built deck: present but silent.** `public/lessons/lesson-08/deck.json` exists (4467 bytes,
9 slides: 5 exposition, 2 retrieval, 2 reveal) and `public/lessons/lesson-08/manifest.json`
exists (376 bytes) with **`"assets": []`** — no audio generated. No slide carries an `audio`
array or an `image`. The manifest's `verificationOutcomes` is
`["not-required", "verified", "mismatch"]`, missing the `"recorded"` outcome the built
lessons 01-06 carry, so it predates the shipped-recording route.
