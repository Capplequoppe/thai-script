# Scoping: lesson-11

Source skeleton: `content/lessons/lesson-11.md` (81 lines, 13 `##` slides).
Built deck: `public/lessons/lesson-11/deck.json` (13 slides, no audio, no images).
Sequence position 11 of 19; `legacyNumber: 11` (`src/domain/script/data/lessonSequence.ts:71`).
Last lesson of the middle band.

## Declares

HTML comment header, `content/lessons/lesson-11.md:5-15`, verbatim:

```
Middle band, lesson 6 of 6. Declares อ as a consonant, อ as a vowel, and เ-าะ,
and closes the four-way tone grid for the mid class.
previews: none
ranks: 1-2000

อ has been on the page since lesson six, as the prop สระ อือ needs when a
syllable ends bare — that form comes from `conditionalVowelForms`, not from a
row of its own. This is where it becomes a letter with a name, a class and two
jobs.
```

Quoted verbatim as required:
- `previews: none`
- `ranks: 1-2000`

There is **no `teaches:` line** in this header.

### Lessons-table row

`src/domain/script/data/symbols.ts:3299-3311`:

```ts
{
    number: 11,
    title: "The Silent Letter aaw aang",
    focus: "Silent consonant อ and aw vowels",
    consonants: ["อ"],
    vowels: ["อ (as vowel)", "เ-าะ"],
    toneMarks: [],
    toneRulesIntroduced: ["mid-dead-short", "mid-dead-long"],
    specialRulesIntroduced: ["o-ang-dual-role"],
    videoUrl: "/thai-script/videos/TAME_L11_tpod101_video-h.webm",
},
```

### Vowels declared

**อ (as vowel)** — `src/domain/script/data/symbols.ts:1936-1950`

```ts
character: "อ (as vowel)",
name: "sara aaw",
length: "long",
sound: "aaw (like AW in 'saw')",
position: "right",
audioUrl: "/thai-script/audio/sara-aw-long.mp3",
priority: 20,
lesson: 11,
sceneMnemonic: {
    shapeCue:
        "The basin ring standing after another consonant, serving as its vowel.",
    soundCue: "A long aw — a yawn with the jaw fully dropped.",
},
```

**เ-าะ** — `src/domain/script/data/symbols.ts:1951-1966`

```ts
character: "เ-าะ",
name: "sara aw",
length: "short",
sound: "aw (short version of สระ ออ)",
position: "around",
audioUrl: "/thai-script/audio/sara-aw-short.mp3",
priority: 21,
lesson: 11,
sceneMnemonic: {
    shapeCue:
        "Mast in front, then the า post and the stacked hooks — three pieces wrapping one short syllable.",
    soundCue: "A clipped aw, gone before the yawn can open.",
},
```

### Rules declared, as the `rule:` slides render them

`rule: o-ang-dual-role` (script line 24) — `symbols.ts:559-566`:

```ts
id: "o-ang-dual-role",
title: "อ (aaw aang) Dual Role",
description:
    "อ serves two purposes: (1) As a silent placeholder consonant for words that start with a vowel sound. (2) When following another consonant without a vowel, it acts as the vowel สระ ออ (aaw).",
lesson: 11,
```

`rule: mid-dead-short` (script line 55) — `symbols.ts:380-387`:

```ts
id: "mid-dead-short",
consonantClass: ThaiSymbolClass.Mid,
syllableType: "dead-short",
resultingTone: "low",
description: "Mid class consonant + dead syllable = low tone.",
lesson: 11,
```

`rule: mid-dead-long` (script line 58) — `symbols.ts:388-396`:

```ts
id: "mid-dead-long",
consonantClass: ThaiSymbolClass.Mid,
syllableType: "dead-long",
resultingTone: "low",
description:
    "Mid class consonant + dead syllable = low tone (regardless of vowel length).",
lesson: 11,
```

Related rule already shipped, which this lesson pays off — `sara-uee-placeholder`,
`symbols.ts:566-573`, taught on `content/lessons/lesson-06.md:219`:

```ts
id: "sara-uee-placeholder",
title: "สระ อื Requires อ Placeholder",
description:
    "When สระ อื (long uee) is not followed by a consonant, อ must be written after it as a placeholder. Example: มือ (muue) = hand.",
lesson: 6,
```

## Consonants

One consonant declared: **อ**.

### From `src/domain/script/data/consonant-scenes.json` (entry `o-ang`)

```json
{
  "id": "o-ang",
  "char": "อ",
  "name": "อ อ่าง",
  "meaning": "basin",
  "district": "market",
  "prompt": "A single empty round basin standing alone in the middle of an empty market row, plain and open, in a Thai open-air market of wooden stalls under striped awnings, baskets of produce around.",
  "narration": "The basin. [pause] Mid class, so you will find it in the market. [pause] A plain ring standing open — an empty basin in the middle of the market row. [pause] Silent at the front: it minds the stall for words that open on a vowel. Set after a consonant instead, it becomes the long vowel aaw."
}
```

- **letter:** อ
- **name:** `อ อ่าง` (romanised `aaw àang` in `symbols.ts`)
- **meaning:** `basin`
- **district:** `market`
- **class:** Mid (`ThaiSymbolClass.Mid`)
- **`prompt`:** quoted in full above
- **`narration`:** quoted in full above
- **`shapeCue`:** see `symbols.ts` record below

### From `src/domain/script/data/symbols.ts:1102-1123`

```ts
ThaiConsonant.fromPlain({
    character: "อ",
    name: "อ อ่าง",
    nameRomanized: "aaw àang",
    nameMeaning: "basin",
    classType: ThaiSymbolClass.Mid,
    hasDeadEnding: true,
    isAspirated: false,
    initialSound: "silent (placeholder for vowel-initial words)",
    finalSound: "acts as vowel สระ ออ (aaw)",
    audioUrl: "/thai-script/audio/consonant-o-ang.mp3",
    priority: 3,
    lesson: 11,
    sceneMnemonic: {
        district: "market",
        shapeCue:
            "A plain ring standing open — an empty basin in the middle of the market row.",
        soundCue:
            "Silent at the front: it minds the stall for words that open on a vowel. Set after a consonant instead, it becomes the long vowel aaw.",
    },
}),
```

**`shapeCue`**, verbatim:

> "A plain ring standing open — an empty basin in the middle of the market row."

**`soundCue`**, verbatim:

> "Silent at the front: it minds the stall for words that open on a vowel. Set after a
> consonant instead, it becomes the long vowel aaw."

Note `hasDeadEnding: true` — อ closing a syllable makes it dead, which is what the
`mid-dead-*` rules on this lesson's grid depend on (ออก).

## Shipped recordings (each verified with `ls`/`stat`)

| symbol | `audioUrl` in symbols.ts | file on disk | verified |
|---|---|---|---|
| อ (consonant) | `/thai-script/audio/consonant-o-ang.mp3` | `public/audio/consonant-o-ang.mp3` | **EXISTS**, 7393 bytes |
| อ (as vowel) | `/thai-script/audio/sara-aw-long.mp3` | `public/audio/sara-aw-long.mp3` | **EXISTS**, 8542 bytes |
| เ-าะ | `/thai-script/audio/sara-aw-short.mp3` | `public/audio/sara-aw-short.mp3` | **EXISTS**, 6527 bytes |

All three exist. No filename needed to be guessed.

Script-line format, copied from a lesson that already uses it
(`content/lessons/lesson-06.md:70` and `:198`):

```
recording: th ออ อ่าง public/audio/consonant-o-ang.mp3
recording: th สระออ  public/audio/sara-aw-long.mp3
```

The pipeline reads the named file's bytes (`scripts/lesson_deck/pipeline.py:439`) and
copies it into `public/lessons/lesson-11/audio/<hash>.mp3`; a recording skips the
transcribe-back verification entirely (`pipeline.py:427-441`).

## Example words and ranks

Every Thai word the skeleton mentions, with `rank` from
`src/domain/vocabulary/data/vocabulary.json`. Declared window is **1-2000**.

| word | romanisation | English | rank | Thai chars | in window |
|---|---|---|---|---|---|
| มือ | muue | hand | 534 | 3 | yes |
| คือ | khuue | is | 161 | 3 | yes |
| อีก | ìik | more | 107 | 3 | yes |
| อัน | an | piece (classifier) | 242 | 3 | yes |
| อา | aa | aunt/uncle (younger, father side) | 601 | 2 | yes |
| อาจ | àat | may | 175 | 3 | yes |
| พอ | phaaw | enough | 297 | 2 | yes |
| รอ | raaw | wait | 766 | 2 | yes |
| ตอน | dtaawn | when; during | 218 | 3 | yes |
| นอน | naawn | lie down; sleep | 132 | 3 | yes |
| มอง | maawng | view | 325 | 3 | yes |
| เกาะ | gàw | island | 962 | 4 | yes |
| ออก | àawk | exit | 121 | 3 | yes |
| ตาม | dtaam | follow; according | 102 | 3 | yes |
| จาก | jàak | from | 32 | 3 | yes |
| ปาก | bpàak | mouth | 786 | 3 | yes |
| ตก | dtòk | fall | 447 | 2 | yes |
| บอก | bàawk | tell | 128 | 3 | yes |
| ชอบ | châawp | like | 86 | 3 | yes |
| ตอบ | dtàawp | answer | 532 | 3 | yes |
| ยอม | yaawm | permit | 558 | 3 | yes |
| อาชีพ | aa chîip | career; occupation | 192 | 5 | yes |
| อายุ | aa yú | age | 101 | 4 | yes |

**No word is outside the window and no word is absent from the corpus.** The highest
rank used is เกาะ at 962 — this lesson has by far the most headroom of the three scoped.

Gloss divergences between skeleton and corpus (only `rank` is asserted, so these are
free, but worth knowing):
- ตอน — skeleton "a part or a moment"; corpus `english` is `when; during`.
- มอง — skeleton "to look at"; corpus `view`.
- ยอม — skeleton "to consent"; corpus `permit`.
- อา — skeleton "a parent's younger sibling"; corpus "aunt/uncle (younger, father side)".
- อาจ — skeleton "may or might"; corpus `may`.

Forward-reference check: every character in every word above is taught at or before
lesson 11. ชอบ needs ช (lesson 4); อาชีพ needs พ (lesson 5) and ี (lesson 3); อายุ
needs ุ (lesson 5); มือ/คือ need ื (lesson 6); ปาก/ตอบ need ป and ต (lesson 9).

## Risks

**1. LENGTH PAIRS — YES. This lesson declares both halves of one pair.**

- **long:** `อ (as vowel)` — `name: "sara aaw"`, `length: "long"`
- **short:** `เ-าะ` — `name: "sara aw"`, `length: "short"`, `sound: "aw (short version of สระ ออ)"`

The skeleton itself states the pairing (line 50: *"เ-าะ is the short version of the same
sound"*; line 52: *"The two lengths are different vowels in Thai, not a matter of
emphasis"*).

**The short form is under-served and the band test cannot catch it.** เ-าะ has exactly
**one** example word in the whole skeleton — เกาะ (line 51, reused line 63). The long
form has ten (พอ รอ ตอน นอน มอง ออก บอก ชอบ ตอบ ยอม).

Why the test will not catch a thinned เ-าะ: `declaredSymbols`
(`middleBand.test.ts:176-188`) decomposes `"เ-าะ"` into its **characters** — เ, า, ะ —
every one of which is taught earlier (เ in lesson 7, า in lesson 1, ะ in lesson 4). The
"declares X but never uses it" assertion (`middleBand.test.ts:426-433`) therefore passes
on any deck that contains เ, า and ะ anywhere at all, including from unrelated words.
**The short vowel could vanish from this lesson entirely and every test would stay
green.** This is a pedagogical guard the writer has to supply, not a mechanical one.

Same argument applies to `อ (as vowel)`: it decomposes to the single character อ, which
the consonant declaration already covers. The only character in this lesson that is
genuinely new to the sequence is **อ**.

**2. SHORT-WORD RISK — four words of 2 Thai characters.**
อา, พอ, รอ, ตก.

The mechanism: `narration: th <word>` is synthesised, transcribed back, and must clear
`TRANSCRIPT_MATCH_RATIO = 0.9` (`scripts/lesson_deck/pipeline.py:107`) on a
`difflib.SequenceMatcher` ratio (`pipeline.py:195-203`). At two characters, one
character of disagreement scores 0.5; at three, 0.67. So for anything this short the
transcription must come back exactly right or all retry seeds fail.

อา is the sharpest case — it is a bare consonant plus า, and the same string is also the
Thai gloss for the vowel name in `docs/vowel-house.md:118` (*"`า` | **อา** *aa* | aunt or
uncle | a person, one syllable, lesson 1's vowel"*). No `public/audio/` clip exists for
any of the four, so the `recording:` escape hatch is unavailable.

**3. Declared symbols with no example word — none, but เ-าะ is at the floor.**
- อ (consonant, silent initial) → อีก, อัน, อา, อาจ, อาชีพ, อายุ — six words, well served
- อ (as vowel) → พอ, รอ, ตอน, นอน, มอง, ออก, บอก, ชอบ, ตอบ, ยอม — ten words
- เ-าะ → **เกาะ only.** One word carries the entire short vowel. See risk 1.

**4. Only headings, prompts, bullets and answers are swept.**
`textsOf` (`middleBand.test.ts:107-116`) reads `deck.title`, `slide.heading`,
`slide.prompt`, `slide.body`, `slide.answers` — **not narration**. A word or symbol that
exists only in a `narration:` line does not count toward "uses everything it declares",
and is equally not rank-checked. Verified against the built deck: `rule` slides carry
only `{kind, id, ruleId}`, so rule descriptions are outside the sweep too.

**5. This is the band's last lesson, and it closes the forward-reference sweep.**
`FIRST_LESSON_AFTER_BAND = "lesson-12"` (`middleBand.test.ts:47`) and the sweep asserts
the handover (`middleBand.test.ts:405-412`). Anything lesson 11 borrows from lesson 12+
(เ-ีย, ำ, the high-class letters ข ฉ ถ ผ ฝ ส ห) fails AC3. The skeleton's line 64 list —
"ก ด บ จ ต ป or อ" — is the complete set of mid-class letters taught so far and is
correct: the market has nine letters, and ฎ and ฏ arrive in lesson 14. The skeleton's
own line 81 claim ("seven of the nine market letters") matches.

**6. The grid-closing claim at line 64 is strong and checkable.**
"Every syllable opening on ก ด บ จ ต ป or อ now has a tone you can work out from the
page alone, live or dead, long or short." That is true only because `mid-live` (lesson
3), `mid-dead-short` and `mid-dead-long` (this lesson) together cover the mid class —
and it will stop being true the moment the tone-mark lesson lands, since marks override
spelling rules (`tone-mark-placement`: *"Tone marks override all spelling-based tone
rules."*). The narration should not over-promise here; `lesson-tone-marks` sits five
positions later and takes it back.

## Cross-lesson hooks

### The อ "prop" promise — the one lesson-11 exists to pay off

**`content/lessons/lesson-06.md:227`** — this is the promise. Verbatim, in full:

> "narration: en A hand. Look at the end of it and you will see a letter you have never
> been taught. Do not learn it today. It is a real letter with a real name and a job of
> its own and **it gets a whole lesson later on**. Today it is a chair."

That slide is `## exposition the-prop` (`content/lessons/lesson-06.md:221`), whose
`scene:` line (`:223`) is:

> "A long wooden pole propped under the sagging eave of a Thai house on stilts, holding
> it up where there is nothing else beneath it, the rest of the eave resting on the wall
> further along, afternoon light."

and whose narration at `:225` sets it up:

> "Now the furniture. That long vowel is written above its consonant, and a mark sitting
> up there needs something underneath it at the end of the syllable. … And then there is
> nothing underneath, so Thai writes a prop in — a mark that is there to be stood on and
> for no other reason."

The bullet at `content/lessons/lesson-06.md:230`:

> "- When the syllable ends bare, a **prop** is written in."

The follow-up slide `## exposition the-prop-again` (`:232`), narration at `:237`:

> "It means is. The buffalo, the long grin vowel, and the prop holding it up because
> nothing else does. And here is the test, which is the useful part: it is never about
> how the word sounds. It is only ever about whether a consonant follows the vowel. If
> one does, no prop. If none does, prop."

and the bullet at `:240`:

> "- **Does a consonant follow the vowel?** If not, the prop goes in."

**And lesson-06's own header names lesson-11 as the payoff** —
`content/lessons/lesson-06.md:10-12`, verbatim:

```
อ is not previewed and is not taught here as a letter. It arrives through
`conditionalVowelForms`: the written form of ื with no final consonant is
-ือ, so the seat comes with the vowel, and lesson-11 turns it into a letter.
```

Lesson-06's opening `narration` at `:40` also flags it:

> "And a piece of furniture arrives with them: a mark that turns up in the writing purely
> to hold something else up, and which you are not going to learn as a letter today even
> though that is what it is."

The skeleton already answers this at line 20 (*"Since lesson six it has been the prop
under a bare ื, in มือ and คือ, and nothing was asked of it there"*) and at line 30
(*"It is holding the place, exactly as it held the place under ื"*). Both มือ and คือ
are the exact two words lesson-06 used — มือ at `lesson-06.md:226`, คือ at `:233-238` —
so the callback is literal, not approximate.

The mechanical counterpart: `conditionalSymbols` (`middleBand.test.ts:190-212`) documents
this seam directly, and is worth quoting because it explains why lesson-06 could use อ
five lessons before lesson-11 declares it:

> "สระ อือ has to be propped by อ when the syllable ends bare, and อ *is* listed, by row
> 11 — five lessons after row 6 teaches the vowel that needs it. A lesson that teaches
> the vowel teaches its conditional form with it, so both arrive with the row rather
> than needing a declaration of their own."

### The tone-grid promises

**`content/lessons/lesson-03.md:302`** — the classes-come-apart promise, which this
lesson finally completes for the market:

> "Good, and then a crow. Two classes now, and for the moment they agree — both of them
> give you a flat tone on a live ending. They come apart the moment a syllable stops
> dead, and that is the next rule you get."

and its bullet at `content/lessons/lesson-03.md:305`:

> "- They come apart as soon as a syllable ends dead."

The "next rule you get" is `low-dead-short` (lesson 4) — the *harbour* side. The market
side is this lesson, and lesson 3 never says so. The skeleton's line 62 ("Mid class live
you have had since lesson three") reaches back to exactly this slide.

**`content/lessons/lesson-03.md:287`** — the live/dead definition the grid rests on:

> "A syllable that ends like that has a name: it is dead. One that can carry on ringing
> is live. That single difference is about to decide tones, so it is worth more than it
> looks."

**`content/lessons/lesson-05.md:270`** — the low-class asymmetry the skeleton contrasts
against at line 65 ("the low class, which needed two dead rules because the lengths
disagree"):

> "The one with the long vowel falls. The one with the short vowel goes high. The class
> is the same in both, the ending is the same in both, and the vowel length is doing all
> of the work. Which is why the mark that tells you the length is worth as much as it
> is."

The skeleton's comparison is accurate: `low-dead-short` → high, `low-dead-long` →
falling, versus `mid-dead-short` and `mid-dead-long` both → low.

### Bonus hook outside the 01-06 range

Not requested, but load-bearing and worth flagging —
**`content/lessons/lesson-09.md:11`**, from lesson-09's own header:

> "The mid-live rule these three letters take is lesson three's, unchanged; the mid-dead
> rule is lesson eleven's and is deliberately not anticipated here."

Lesson 9 taught จ ต ป and deliberately withheld their dead-syllable behaviour for this
lesson. That is why the skeleton can say "ตก from last lesson" (via lesson-10 line 49)
and use จาก, ปาก and ตก as the grid's worked examples.

**No hook in lessons 01-06 mentions the aw vowel, เ-าะ, islands, or the basin** other
than the prop promise above. Searched for `aw`, `basin`, `ring`, `prop`, `corners`,
`grid`.

## Assets

**Images: none.** `content/lessons/images/lesson-11/` **does not exist**. Existing image
directories are `lesson-01` (28 files), `lesson-02` (17), `lesson-03` (14), `lesson-04`
(13), `lesson-05` (13), `lesson-06` (12), `orientation` (14).

**`scene:` lines: 0.** `grep -c '^scene:' content/lessons/lesson-11.md` → 0. Likewise
`## scene`. The `consonant-scenes.json` entry for อ already supplies a `prompt` (quoted
in full above) that reads as a ready-made `scene:` line for the letter's own slide.

**Built deck:** `public/lessons/lesson-11/deck.json` (5219 bytes, 13 slides). Every slide
has `audio: null` and `image: null`. `public/lessons/lesson-11/` holds only `deck.json`
and `manifest.json` — no `audio/` or `images/` subdirectory.

Slide inventory, in order: `exposition aaw-aang`, `rule o-ang-dual-role`,
`exposition job-one`, `exposition job-two`, `retrieval which-job`,
`reveal which-job-answer`, `exposition short-aw`, `rule mid-dead-short`,
`rule mid-dead-long`, `exposition the-grid-closes`, `retrieval close-the-grid`,
`reveal close-the-grid-answer`, `exposition more-words`.

Asset rule the writer must respect: every referenced asset must live under
`/thai-script/lessons/lesson-11/`, and **every file committed in that directory must be
referenced by some slide** — an orphaned image fails as hard as a missing one.
