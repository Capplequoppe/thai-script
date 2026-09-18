# Scoping: lesson-10

Source skeleton: `content/lessons/lesson-10.md` (83 lines, 13 `##` slides).
Built deck: `public/lessons/lesson-10/deck.json` (13 slides, no audio, no images).
Sequence position 10 of 19; `legacyNumber: 10` (`src/domain/script/data/lessonSequence.ts:70`).

## Declares

HTML comment header, `content/lessons/lesson-10.md:5-18`, verbatim:

```
Middle band, lesson 5 of 6. Declares no consonant; the vowels are เ-า, ไ and ใ.
previews: none
teaches: ๆ — mai yamok is one of the three rules this lesson's row declares,
and the symbol is the rule. The lessons table records it under
`specialRulesIntroduced` rather than in `vowels` or `toneMarks`, so there is no
row entry for the glyph to arrive through; it is declared here instead.
ranks: 1-2000

The clusters rule slide renders from `specialRules`, states the inventory and
stops there. True and false clusters — ทร reading as s, the silent ร — belong
to `lesson-clusters`, which this lesson names. Stating half of it here and the
other half twelve lessons away is the split phase three exists to repair.
```

Quoted verbatim as required:
- `previews: none`
- `ranks: 1-2000`

(There is no `ranks:` variant line; the window is 1-2000.)

### Lessons-table row

`src/domain/script/data/symbols.ts:3284-3299`:

```ts
{
    number: 10,
    title: "Ao, Ai mai-malaai, Ai mai-muuan, and Mai-yamok",
    focus: "Diphthongs and repetition symbol",
    consonants: [],
    vowels: ["เ-า", "ไ", "ใ"],
    toneMarks: [],
    toneRulesIntroduced: [],
    specialRulesIntroduced: [
        "consonant-clusters",
        "ao-ai-tone-exception",
        "mai-yamok",
    ],
    videoUrl: "/thai-script/videos/TAME_L10_tpod101_video-h.webm",
},
```

### Vowels declared

**เ-า** — `src/domain/script/data/symbols.ts:1887-1902`

```ts
character: "เ-า",
name: "sara ao",
length: "short",
sound: "ao (like OW in 'how')",
position: "around",
audioUrl: "/thai-script/audio/sara-au.mp3",
priority: 17,
lesson: 10,
sceneMnemonic: {
    shapeCue:
        "A mast before and the า post after — the pair bracketing the consonant.",
    soundCue:
        "Ao, a yelp of surprise — short to say, yet it counts long when tones are decided.",
},
```

**ไ** — `src/domain/script/data/symbols.ts:1903-1918`

```ts
character: "ไ",
name: "sara ai mai malaai",
length: "short",
sound: "ai (like I in 'Hi')",
position: "left",
audioUrl: "/thai-script/audio/sara-ay-may-malay.mp3",
priority: 18,
lesson: 10,
sceneMnemonic: {
    shapeCue:
        "A mast whose top breaks into a zigzag — the everyday spelling of ai.",
    soundCue:
        "Ai, the English pronoun I; short, but the syllable it makes stays live.",
},
```

**ใ** — `src/domain/script/data/symbols.ts:1919-1932`

```ts
character: "ใ",
name: "sara ai mai muuan",
length: "short",
sound: "ai (same sound as ไ)",
position: "left",
audioUrl: "/thai-script/audio/sara-ay-may-muan.mp3",
priority: 19,
lesson: 10,
sceneMnemonic: {
    shapeCue:
        "A mast whose top rolls into a curl — ไ's rarer twin, reserved for a short closed list of words.",
    soundCue: "The same ai — the spelling changes, the sound does not.",
},
```

### ๆ (mai yamok)

There is **no `ThaiSymbol` record for ๆ anywhere in `symbols.ts`.** It exists only as a
special rule. This is why the header declares it through `teaches:` — see Risks.

### Rules declared, as the `rule:` slides render them

`rule: ao-ai-tone-exception` (script line 43) — `symbols.ts:545-552`:

```ts
id: "ao-ai-tone-exception",
title: "สระ เอา and สระ ไอ Tone Exception",
description:
    "Although สระ เอา (ao) and สระ ไอ/ใอ (ai) are short vowels, they count as long vowels / live syllable endings for tone determination purposes.",
lesson: 10,
```

`rule: mai-yamok` (script line 61) — `symbols.ts:552-559`:

```ts
id: "mai-yamok",
title: "Mai Yamok (ไม้ยมก) ๆ",
description:
    "The symbol ๆ indicates that the preceding word should be repeated. For example, ใครๆ (khrai-khrai) means 'anyone'.",
lesson: 10,
```

`rule: consonant-clusters` (script line 70) — `symbols.ts:538-545`:

```ts
id: "consonant-clusters",
title: "Consonant Clusters",
description:
    "Only three letters can form consonant clusters when they follow other consonants: ร, ล, and ว. This is a major difference from English which has many more cluster possibilities.",
lesson: 10,
```

## Consonants

**This lesson declares no consonant.** Confirmed true:
`consonants: []` in the lessons row (`symbols.ts:3288`), and the header states it
("Declares no consonant"). Nothing to report from `consonant-scenes.json`.

`consonant-scenes.json` holds 44 scenes; none of them belongs to this lesson.

## Shipped recordings (each verified with `ls`/`stat`)

Vowel name recordings — the `audioUrl` on each declared vowel, rooted at `public/`:

| symbol | `audioUrl` in symbols.ts | file on disk | verified |
|---|---|---|---|
| เ-า | `/thai-script/audio/sara-au.mp3` | `public/audio/sara-au.mp3` | **EXISTS**, 7097 bytes |
| ไ | `/thai-script/audio/sara-ay-may-malay.mp3` | `public/audio/sara-ay-may-malay.mp3` | **EXISTS**, 14883 bytes |
| ใ | `/thai-script/audio/sara-ay-may-muan.mp3` | `public/audio/sara-ay-may-muan.mp3` | **EXISTS**, 14162 bytes |

Consonant recordings: none needed — no consonant declared.

Additional recording available and **unused by the current skeleton**:

- `public/audio/other-mayyamok.mp3` — **EXISTS**. This is the only shipped clip that
  matches ๆ. Nothing in the repo currently references it. Filename confirmed by
  `ls public/audio/ | grep yamok`; do not guess any other spelling.

How a recording is wired: the script line format is
`recording: th <thai text> <path>` — e.g. `content/lessons/lesson-06.md:198`:
`recording: th สระอือ public/audio/sara-eu-long.mp3`. The pipeline reads that file's
bytes (`scripts/lesson_deck/pipeline.py:439`, `segment.recording.read_bytes()`) and
copies it into `public/lessons/lesson-10/audio/<hash>.mp3`. A path that does not exist
is an unhandled read error, which is why a guessed filename breaks the build.

## Example words and ranks

Every Thai word the skeleton mentions, with `rank` from
`src/domain/vocabulary/data/vocabulary.json`. Declared window is **1-2000**.

| word | romanisation | English | rank | Thai chars | in window |
|---|---|---|---|---|---|
| เอา | ao | take; want | 110 | 3 | yes |
| เรา | rao | we; us | 123 | 3 | yes |
| ไป | bpai | go | 34 | 2 | yes |
| ไฟ | fai | fire | 819 | 2 | yes |
| ใน | nai | in | 23 | 2 | yes |
| ใจ | jai | mind | 293 | 2 | yes |
| ใบ | bai | leaf | 542 | 2 | yes |
| ใด | dai | any | 294 | 2 | yes |
| ใคร | khrai | who | 62 | 3 | yes |
| ตก | dtòk | fall | 447 | 2 | yes |
| เด็ก | dèk | child | 181 | 4 | yes |
| ดีใจ | dii jai | glad | 1957 | 4 | yes |
| ตกใจ | dtòk jai | frightened | 1870 | 4 | yes |
| ไทย | thai | Thai; Thailand | 414 | 3 | yes |

**No word is outside the window and no word is absent from the corpus.**

Two glosses in the skeleton differ slightly from the corpus English (corpus is the
authority the test reads, but only `rank` is asserted, so the prose gloss is free):
- ใจ — skeleton "the heart or mind"; corpus `english` is `mind`.
- ตกใจ — skeleton "startled"; corpus `english` is `frightened`.

ดีใจ at 1957 and ตกใจ at 1870 are within 1-2000 but with little headroom — if the
window is ever tightened they are the first two to fail.

Forward-reference check (AC3 in `middleBand.test.ts`): every character in every word
above is taught at or before lesson 10. ไทย needs ท (lesson 7) and ย (lesson 2);
เด็ก needs ็ (lesson 7); ใคร needs ค (lesson 6) and ร (lesson 8); ดีใจ needs จ
(lesson 9). The skeleton's claims at lines 49 ("ตก from last lesson") and 83
("readable since lesson seven") are both correct.

## Risks

**1. LENGTH PAIRS — none.**
All three declared vowels carry `length: "short"` in `symbols.ts` and none has a long
counterpart declared here or anywhere. ไ and ใ are **not** a length pair; they are two
spellings of one short sound (see Special notes). `docs/vowel-house.md:173` lists them
explicitly as an exception: `| ไ ใ | short with no long form at all — the couple |`.

**2. SHORT-WORD RISK — seven words of 2 Thai characters.**
ไป, ไฟ, ใน, ใจ, ใบ, ใด, ตก.

What actually happens: a `narration: th <word>` segment is synthesised and then
transcribed back, and the round-trip must clear
`TRANSCRIPT_MATCH_RATIO = 0.9` (`scripts/lesson_deck/pipeline.py:107`) against a
`difflib.SequenceMatcher` ratio (`pipeline.py:195-203`). On a 2-character string a
single character of disagreement scores 0.5, and on a 3-character string 0.67 —
so for any word this short the transcription must come back **exactly** right or the
segment fails all retry seeds. Seven of this lesson's fourteen words are in that
bracket, which is the highest concentration of any lesson scoped here.

The escape hatch is the `recording:` route, which skips the transcribe-back check
entirely (`pipeline.py:427-441`) — but only a shipped clip qualifies, and no
`public/audio/` clip exists for any of these seven words.

**3. Declared symbols with no example word — none.**
- เ-า → เอา, เรา
- ไ → ไป, ไฟ, ไทย
- ใ → ใน, ใจ, ใบ, ใด, ใคร
- ๆ → เด็ก ๆ, ใคร ๆ (script line 66)

**4. The ๆ declaration is load-bearing and fragile.**
`middleBand.test.ts:435-444` asserts, for every glyph declared via `teaches:`, both that
the deck **uses** it and that it is **not** also in the lessons row. ๆ satisfies both
today. The `teaches:` parser (`middleBand.test.ts:228-246`) requires the line to contain
an em dash with non-empty text after it — a reworded header that drops the `—` silently
stops declaring ๆ and the lesson then fails the forward-reference sweep instead.

**5. ๆ must stay space-separated from its word.**
The skeleton writes `เด็ก ๆ` and `ใคร ๆ` with a plain ASCII `0x20` (verified by
hexdump). `thaiWordsIn` (`middleBand.test.ts:137-145`) collects Thai runs of ≥2
characters containing a consonant and requires each to be in `vocabulary.json`.
Written closed as `เด็กๆ` / `ใครๆ` the run becomes a 5- or 4-character "word" that is
**not** in the corpus, and AC4 fails. Note that `symbols.ts:556` writes the rule's own
example closed (`ใครๆ`) — but that string is safe: verified against the built deck, a
`rule` slide carries only `{kind, id, ruleId}` and no `heading`/`body`, so the rule
description never reaches `textsOf` and its `ใครๆ` is never swept. The risk is confined
to the exposition bullets the narration writer authors.

**6. Only headings, prompts, bullets and answers are swept — not narration.**
`textsOf` (`middleBand.test.ts:107-116`) reads `deck.title`, `slide.heading`,
`slide.prompt`, `slide.body` and `slide.answers`. A word that appears **only** in
`narration:` does not count as "using" a declared symbol, and equally is not
rank-checked. The narration writer must keep every declared symbol and every example
word visible in a heading or bullet, not only spoken.

## Cross-lesson hooks

Searched `content/lessons/lesson-0[1-6].md`.

**`content/lessons/lesson-03.md:302`** — the classes-come-apart promise. Paid partly by
lessons 4-5 (low class) and, for the market, by lesson 11; lesson 10 is the one that
supplies the vowel that decides it:

> "Good, and then a crow. Two classes now, and for the moment they agree — both of them
> give you a flat tone on a live ending. They come apart the moment a syllable stops
> dead, and that is the next rule you get."

**`content/lessons/lesson-03.md:287`** — the live/dead distinction this lesson's
`ao-ai-tone-exception` complicates:

> "A syllable that ends like that has a name: it is dead. One that can carry on ringing
> is live. That single difference is about to decide tones, so it is worth more than it
> looks."

and the bullet at **`content/lessons/lesson-03.md:290`**:

> "Nothing about the letter at the front. Only the ending decides."

That bullet is the thing lesson 10 refines: with เ-า/ไ/ใ the *vowel* decides, because
the syllable ends on it. The skeleton's "Length of time is not what the rule measures"
(line 58) is answering that promise directly.

**`content/lessons/lesson-03.md:342`** — the unwritten-vowel promise, which lesson 10
references at line 77 ("last lesson gave you the other one"):

> "Two letters, and no written vowel anywhere. Thai does that, and a later lesson
> explains why."

That promise is *formally* paid by `lesson-unwritten-vowels` (sequence position 15), but
lesson-10's line 77 ("last lesson gave you the other one") is nonetheless accurate:
verified that `content/lessons/lesson-09.md:48` already names it —

> "That is not a quirk of three words. Two bare consonants side by side with no vowel
> written between them are read with this vowel, every time, and the full rule —
> including what happens with three consonants — has a lesson to itself."

and lesson-09's own header (line 12-13) records the split: *"โ-ะ's with-final form is
written with nothing at all, which is the implicit vowel `lesson-unwritten-vowels` owns
— named here and taught there."*

**No hook in lessons 01-06 mentions ai, ao, the repetition mark, or clusters.** Searched
for `cluster`, `two consonants`, `repeat`, `ai`, `ao`. Nothing. Lesson 10 pays off
general promises about how endings decide tone; it is not the payoff of a named promise.

## Special notes — ไ versus ใ, per `docs/vowel-house.md`

The document is 395 lines. It uses Swedish working names for the vowels (a deliberate
device, stated at line 137: *"The prose below still uses the Swedish working names until
the Thai ones are settled."*). ไ and ใ are **Aina** and **Aino**.

`docs/vowel-house.md:53` — one voice, two spellings:

```
| **Aina / Aino** | `ไ` `ใ` | *aj* |
```

and immediately after (line 60): *"Ten names for nine voices, because Aina and Aino
share one — the only place two [names share a voice]"*.

`docs/vowel-house.md:129-130` — why the usual mnemonic trick fails here:

> "`ใ` has no candidate and cannot have one — no Thai word begins `ใอ`. The couple needs
> another way to tell the twins apart."

`docs/vowel-house.md:173` — in the table of the four vowels that earn a story of their
own:

```
| `ไ` `ใ` | short with no long form at all — the couple |
```

`docs/vowel-house.md:220-230` — the section "Aina and Aino are never in the room
together", quoted in full:

> "They are the one exception to a name being a sound, and they earn it: `ไ` and `ใ` are
> not a length pair, they are two spellings of one short sound with nothing in the shape
> to tell you which a word takes.
>
> So they are a couple with one voice, and only ever one of them turns up. There is no
> word where both appear, and none where it is a choice — the spelling decides who
> answers the door, and they sound identical.
>
> That makes the twenty `ใ` words **a guest list** rather than an exception list: the
> twenty houses where Aino is the one who comes. A set of specific words with a person
> attached is an easier thing to learn than an irregularity."

`docs/vowel-house.md:319` — the lesson mapping:

```
| 10 | `เ-า` `ไ` `ใ` | **Aina and Aino** take turns |
```

`docs/vowel-house.md:392-395` — the open question, verbatim:

> "**Aino's guest list.** Twenty words, and the couple framing makes them worth teaching
> rather than looking up — but twenty is still twenty, and they need somewhere to live.
> Probably one later lesson rather than a drip."

### Does a list of the twenty ใ words exist anywhere in the repo?

**No. I searched and found nothing.**

- `grep -rn "twenty\|20 words\|closed list"` across `docs/`, `content/`, `src/` returns
  only prose *referring* to twenty words (`docs/vowel-house.md:228,229,394`;
  `content/lessons/lesson-10.md:29,31,40`) — never an enumeration.
- The rare monosyllables that would mark a canonical list (ใฝ่, ใบ้, สะใภ้) appear
  nowhere as list members. ใฝ่ฝัน and สะใภ้ occur only inside example *sentences* buried
  in `vocabulary.json` (lines 103257 and 169891).
- `grep -rn "mai-muan\|maiMuan\|muuan"` hits only `symbols.ts` (the vowel's own name),
  `tone-minimal-pairs.json`, `vocabulary.json` and a mnemonics work file — no list.

The corpus contains **160 distinct entries containing ใ**, but almost all are compounds
(เข้าใจ, ส่วนใหญ่, ตัดสินใจ, …), so the corpus is not a substitute for the list. The
monosyllabic ใ words it does hold, in rank order, are:

ให้ (12), ใน (23), ใช่ (35), ใคร (62), ใช้ (94), ใหม่ (166), ใหญ่ (193), ใกล้ (206),
ใจ (293), ใด (294), ใต้ (359), ใส่ (457), ใบ (542), ใส (1423), ใคร่ (2417), ใย (2847).

That is sixteen, not twenty, and it is a corpus artefact rather than the canonical set.
**If the narration is to name more than the five the skeleton already names (ใน, ใจ,
ใบ, ใด, ใคร), the remaining words have to come from outside this repo — there is no
source here to copy from.** The skeleton's current strategy of naming five and saying
"You will meet the rest as words, not as a rule" (line 30) is the only one the repo's
own data supports.

## Assets

**Images: none.** `content/lessons/images/lesson-10/` **does not exist**. Only
`lesson-01` (28 files), `lesson-02` (17), `lesson-03` (14), `lesson-04` (13),
`lesson-05` (13), `lesson-06` (12) and `orientation` (14) exist.

**`scene:` lines: 0.** `grep -c '^scene:' content/lessons/lesson-10.md` → 0.
So does `## scene`. For comparison, `content/lessons/lesson-06.md` carries 10+ `scene:`
lines, each paired with an `image: images/lesson-06/<name>.jpg` line (e.g.
`lesson-06.md:222-223`).

**Built deck:** `public/lessons/lesson-10/deck.json` (5365 bytes, 13 slides). Every
slide has `audio: null` and `image: null`. `public/lessons/lesson-10/` holds only
`deck.json` and `manifest.json` — no `audio/` or `images/` subdirectory, unlike
`public/lessons/lesson-06/` which has both.

Slide inventory, in order: `exposition ao-and-ai`, `exposition which-ai`,
`retrieval two-spellings`, `reveal two-spellings-answer`, `rule ao-ai-tone-exception`,
`exposition short-but-live`, `retrieval short-or-live`, `reveal short-or-live-answer`,
`rule mai-yamok`, `exposition the-repeat-mark`, `rule consonant-clusters`,
`exposition clusters-named`, `exposition more-words`.

Asset rule the writer must respect (`toneMarkLesson.test.ts:437-465`, and the
equivalent in the band test): every referenced asset must live under
`/thai-script/lessons/lesson-10/`, and **every file committed in that directory must be
referenced by some slide** — an orphaned image fails the test as hard as a missing one.
