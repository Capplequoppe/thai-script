# lesson-09 scoping

Source skeleton: `content/lessons/lesson-09.md`
Title line: `# Three letters from the market, and a mast that leans`

## Declares

From the HTML comment header (`content/lessons/lesson-09.md:5-14`):

> Middle band, lesson 4 of 6. Declares จ, ต and ป and the vowels โ and โ-ะ.

`previews:` line, verbatim (`content/lessons/lesson-09.md:6`):

```
previews: none
```

`ranks:` line, verbatim (`content/lessons/lesson-09.md:7`):

```
ranks: 1-2000
```

Rest of the header, verbatim:

> The mid-live rule these three letters take is lesson three's, unchanged; the
> mid-dead rule is lesson eleven's and is deliberately not anticipated here.
> โ-ะ's with-final form is written with nothing at all, which is the implicit
> vowel `lesson-unwritten-vowels` owns — named here and taught there.

Both claims verified:
- `src/domain/script/data/symbols.ts`, `lessons` row `number: 3`, has
  `toneRulesIntroduced: ["mid-live"]`; row `number: 11` has
  `toneRulesIntroduced: ["mid-dead-short", "mid-dead-long"]`.
- `content/lessons/lesson-unwritten-vowels.md` exists and its `implicit-o` slide opens
  "Two consonants together hold a short o" with the examples คน, ลง, ตก, จบ, นก, ผล.
  It sits at position 15 in `lessonSequence.ts` (`legacyNumber: 26`), i.e. after lesson-14.

**`rule:` slides: NONE.** Verified: `grep -n '^rule:' content/lessons/lesson-09.md` returns
nothing and there are no `## rule` headings. The `lessons` row for 9 declares
`toneRulesIntroduced: []` and `specialRulesIntroduced: []` — this lesson genuinely
introduces no rule record, which is consistent with the header.

**Symbols the test will demand appear.** `declaredSymbols(9)` from the `lessons` row:

| row field | value |
|---|---|
| `consonants` | `["จ", "ต", "ป"]` |
| `vowels` | `["โ", "โ-ะ"]` |
| `toneMarks` | `[]` |

so the required character set is **จ ต ป โ ะ**. `conditionalSymbols(9)` adds the chars of
`โ-ะ`'s forms (`openForm: "โ-ะ"`, `withFinalForm: "--"`, `sceneGrammar.ts:112-117`) —
the with-final form contains **no Thai characters at all**, so it adds nothing.

**`previews: none`** means no glyph taught after lesson 9 may be printed in the deck's
title, headings, prompts, bullets or answers. Note the skeleton's `why-the-market` slide
prints ก ด บ (lesson 3), พ (lesson 5) and ม (lesson 1) — all safely earlier — and
`o-vowels`/`the-vowel-you-cannot-see` print ค น ล ย (lessons 6, 1, 8, 2). All verified
present in `taughtAfter` by position 9. Nothing in the built deck forward-references.

## Consonants

### จ

From `src/domain/script/data/consonant-scenes.json` (entry `id: "jo-jan"`):

- letter: `จ`
- name: `จ จาน`
- meaning: `plate/dish`
- district: `market`
- `prompt`: "A flat ceramic plate spinning on one fingertip above a noodle stall, tilted, hooking over at the top of its spin, in a Thai open-air market of wooden stalls under striped awnings, baskets of produce around."
- `narration`: "The plate. [pause] Mid class, so you will find it in the market. [pause] A hook curving up and over from a mid-height head — a plate spun on one finger at the noodle stall. [pause] An unpuffed j, halfway toward ch — The market's plain j; its tail seals as a t-stop."

From `src/domain/script/data/symbols.ts:1039-1057`:

- class: `ThaiSymbolClass.Mid`
- `nameRomanized: "jaaw jaan"`, `nameMeaning: "plate/dish"`
- `initialSound: "j (like J in 'jump')"`
- `finalSound: "T-stop"`, `hasDeadEnding: true`, `isAspirated: false`
- `priority: 19`, `lesson: 9`
- `shapeCue`: "A hook curving up and over from a mid-height head — a plate spun on one finger at the noodle stall."
- `soundCue`: "An unpuffed j, halfway toward ch — the market's plain j; its tail seals as a t-stop."

No `confusablePairs` entry names จ.

### ต

From `consonant-scenes.json` (entry `id: "to-tau"`):

- letter: `ต`
- name: `ต เต่า`
- meaning: `turtle`
- district: `market`
- `prompt`: "A turtle pulling its head right inside a notched shell, a clear dent in the rim where the head went in, in a Thai open-air market of wooden stalls under striped awnings, baskets of produce around."
- `narration`: "The turtle. [pause] Mid class, so you will find it in the market. [pause] Like the child's letter, but the rim is notched — a dent in the shell where the turtle tucked its head in. [pause] Dt — press d and t into one flat sound with no breath riding out."

From `symbols.ts:1060-1078`:

- class: `ThaiSymbolClass.Mid`
- `nameRomanized: "dtaaw dtào"`, `nameMeaning: "turtle"`
- `initialSound: "dt (between D and T, unaspirated T)"`
- `finalSound: "T-stop"`, `hasDeadEnding: true`, `isAspirated: false`
- `priority: 12`, `lesson: 9`
- `shapeCue`: "Like ด, but the rim is notched — a dent in the shell where the turtle tucked its head in."
- `soundCue`: "Dt — press d and t into one flat sound with no breath riding out."

Confusable pair: `ด` ↔ `ต`, feature `bump` — "ต dents the top of the bowl that ด keeps
round". ด is a lesson-3 letter, so this pair is safe to print in full.

### ป

From `consonant-scenes.json` (entry `id: "po-pla"`):

- letter: `ป`
- name: `ป ปลา`
- meaning: `fish`
- district: `market`
- `prompt`: "A silver fish leaping clear out of a market basket, its body rising higher than the basket's rim, in a Thai open-air market of wooden stalls under striped awnings, baskets of produce around."
- `narration`: "The fish. [pause] Mid class, so you will find it in the market. [pause] Like the leaf's letter, but the right wall rises higher than the rim — a fish jumping clear of the market bucket. [pause] Bp — b and p pressed into one flat sound, no puff; the fish slaps back down bp."

From `symbols.ts:1081-1099`:

- class: `ThaiSymbolClass.Mid`
- `nameRomanized: "bpaaw bplaa"`, `nameMeaning: "fish"`
- `initialSound: "bp (between B and P, unaspirated P)"`
- `finalSound: "P-stop"`, `hasDeadEnding: true`, `isAspirated: false`
- `priority: 17`, `lesson: 9`
- `shapeCue`: "Like บ, but the right wall rises higher than the rim — a fish jumping clear of the market bucket."
- `soundCue`: "Bp — b and p pressed into one flat sound, no puff; the fish slaps back down bp."

Confusable pair: `บ` ↔ `ป`, feature `stroke-height` — "ป's right stroke rises past the head;
บ's stops level". บ is a lesson-3 letter, so this pair is safe to print in full.

**Naming note.** The letter name **ปลา** (`bpaaw bplaa`) is a consonant cluster — ป + ล + า.
ล is taught in lesson 8, so the glyphs are legal by position 9, but the cluster *rule* is
lesson 10's (`lessons` row 10, `specialRulesIntroduced: ["consonant-clusters", ...]`).
Speaking the name is fine; writing ปลา into a bullet would print a cluster the learner has
no rule for, and ปลา's rank would then also be checked against 1-2000.

## Shipped recordings (verified with `ls`)

Consonant name recordings — all three exist:

| symbol | file | verified |
|---|---|---|
| จ | `public/audio/consonant-jo-jan.mp3` | EXISTS (7826 bytes) |
| ต | `public/audio/consonant-to-tau.mp3` | EXISTS (6530 bytes) |
| ป | `public/audio/consonant-po-pla.mp3` | EXISTS (6530 bytes) |

Vowel name recordings — both exist:

| vowel | file | verified |
|---|---|---|
| โ (`sara oo`) | `public/audio/sara-o-long.mp3` | EXISTS (8109 bytes) |
| โ-ะ (`sara o`) | `public/audio/sara-o-short.mp3` | EXISTS (6526 bytes) |

Letters the lesson compares against on `three-market-letters` and `why-the-market`, all
verified present:

- ด → `public/audio/consonant-do-dek.mp3` EXISTS
- บ → `public/audio/consonant-bo-baimai.mp3` EXISTS
- ก → `public/audio/consonant-ko-kai.mp3` EXISTS
- ม → `public/audio/consonant-mo-ma.mp3` EXISTS
- พ → `public/audio/consonant-pho-phan.mp3` EXISTS
- ค → `public/audio/consonant-kho-khwai.mp3` EXISTS

`public/audio/` holds 42 `consonant-*.mp3` files in total.

**Nothing is missing for this lesson.**

## Example words and ranks

Declared window: **1-2000**. Every word below resolves in
`src/domain/vocabulary/data/vocabulary.json` and **every one is inside the window**; the
highest is ปาก at 786, so this lesson sits well clear of its ceiling. This is the complete
set of Thai runs of length ≥2 in the skeleton.

| word | skeleton romanisation | vocabulary.json romanisation | English (vocab) | rank | Thai chars |
|---|---|---|---|---|---|
| ปี | bpii | bpii | year | 164 | 2 |
| โต | dtoo | dtoo | large; grow up | 485 | 2 |
| โลก | lôok | lôok | world | 233 | 3 |
| โดย | dooi | dooi | by | 124 | 3 |
| คน | khon | khon | person | 47 | 2 |
| ตก | dtòk | dtòk | fall | 447 | 2 |
| จน | jon | jon | until | 212 | 2 |
| จะ | jà | jà | will | 3 | 2 |
| จาก | jàak | jàak | from | 32 | 3 |
| ตาม | dtaam | dtaam | follow; acccording | 102 | 3 |
| เป็น | bpen | bpen | is; be able | 10 | 4 |
| ตา | dtaa | dtaa | eye | 453 | 2 |
| ตี | dtii | dtii | hit | 759 | 2 |
| ปาก | bpàak | bpàak | mouth | 786 | 3 |
| จับ | jàp | jàp | catch; touch | 504 | 3 |

**Nothing is outside the window and nothing is absent from vocabulary.json.**

The skeleton's claim that "จะ … is the third commonest word in Thai" is **confirmed**:
จะ has `rank: 3`. (The corpus's English gloss for ตาม contains a typo, "acccording" — worth
not copying into a bullet.)

Reminder on the window (`content/lessons/lesson-06.md:27-30`): the rank check "reads
headings, prompts, bullets and answers — not narration", so any new word above rank 2000
may be spoken but never written.

## Risks

### 1. LENGTH PAIRS

**Yes — one pair: โ (long, `sara oo`) and โ-ะ (short, `sara o`).**

- `โ` — `symbols.ts:1855-1869`, `length: "long"`, `position: "left"`, `priority: 15`,
  `sound: "oo (like O in 'go', long)"`.
- `โ-ะ` — `symbols.ts:1870-1885`, `length: "short"`, `position: "around"`, `priority: 16`,
  `sound: "o (like O in 'go', short)"`.

Character-level, the test passes as the skeleton stands: `โ` and `ะ` both appear in
`public/lessons/lesson-09/deck.json` (verified — chars used include `โ ะ`), the `ะ` coming
from the literal pattern `โ-ะ` printed on the `o-vowels` and `the-vowel-you-cannot-see`
slides.

**This pair is the inverse of lessons 7 and 8, and that is the whole lesson's hinge.**
Where `เ-ะ` and `แ-ะ` shrink to a `็` roof when a final consonant arrives,
`conditionalFormFor("โ-ะ")` gives `withFinalForm: "--"` — literally two consonant slots and
nothing between them (`sceneGrammar.ts:112-117`, whose comment says so explicitly: "โ-ะ's
with-final form is `--` — the vowel is written with nothing at all"). Its stored `example`
is **กฎ**, which needs ฎ — a letter absorbed into lesson-14 — so **the data's own example
is unusable here**. The skeleton substitutes คน, ตก and จน, which is the right move.

**The short form's *open* (written-out) spelling has no example word.** Every โ-ะ instance
in the lesson is the invisible with-final form. A word spelling `โ…ะ` in full (โต๊ะ, "table")
needs `๊`, a tone mark taught in `lesson-tone-marks` — so it is unavailable, and I found no
in-inventory, in-window substitute. The skeleton does not claim otherwise; it says the short
one is "written with the loop in front and the stacked hooks after" and then immediately
pivots to the invisible form. Flagged so the narration does not promise an example it
cannot then give.

**The long form is well covered**: โต, โลก, โดย — three words, and vocabulary.json confirms
they are genuinely long โ (โต's syllable record is `{"vowel": "โ", "finalConsonant": null}`).

**The invisible form is well covered by the corpus's own data**: คน, ตก and จน all record
`"vowel": null` with a `finalConsonant` — exactly the two-bare-consonants shape.

### 2. SHORT-WORD RISK (under 3 Thai characters)

**Eight of the fifteen example words are 2 characters — this is by a wide margin the
shortest-word lesson of the three.**

ปี (164), โต (485), คน (47), ตก (447), จน (212), จะ (3), ตา (453), ตี (759).

Correction to the premise as briefed: 2-character Thai words do **not** uniformly fail the
transcribe-back gate. `scripts/lesson_deck/pipeline.py` retries across
`RETRY_SEEDS: tuple[int, ...] = (42, 1, 7, 13, 99, 2024, 5, 77)` — **eight** attempts —
accepting at `TRANSCRIPT_MATCH_RATIO = 0.9`. Lessons 01-06 ship these verified 2-character
clips: นา, มา, มี, ดี, กา, นก, ดู, พบ on attempt 1; วง and คน on attempt 3. Across all six
built lessons there are **zero** failed or mismatched Thai segments, so no shipped evidence
of an 8/8 failure exists.

**คน specifically has already been through this pipeline and passed**, on the third seed,
as `read-khon-answer-0` in `public/lessons/lesson-06/manifest.json`. That is the single most
reassuring data point for this lesson, because คน is the word its central slide is built
around.

What is real is variance and retry cost — pipeline.py:94-98: "Short Thai has high variance
against the transcriber … `มอ` is not a word on its own, so the transcriber substitutes the
one that is". The riskiest here are the ones that are a syllable rather than a salient word:
**จะ** (a grammatical particle the transcriber may attach to whatever follows) and **ตี**
/ **ตา** (minimal-pair-dense). Mitigation the pipeline already gives you: clips are
content-addressed, so a text that verifies once is reused everywhere, and คน's verified clip
from lesson 6 carries over by input hash if the segment text matches.

Budget expectation rather than a blocker: with eight 2-character Thai clips, expect a
handful of multi-attempt segments and a longer generation run than lessons 7 and 8.

### 3. DECLARED SYMBOLS WITH NO EXAMPLE WORD

- **จ** — จน, จะ, จาก, จับ. Four words, initial position only. The stored `finalSound` is
  "T-stop", and **no example shows จ in final position** — but that is correct pedagogy
  rather than a gap: final จ is vanishingly rare in common Thai, and the skeleton does not
  claim to show it.
- **ต** — ตก, ตาม, ตา, ตี, plus โต. Five words. Also no final-position example, and again
  none is claimed.
- **ป** — ปี, ปาก, เป็น. Three words, all initial. `finalSound: "P-stop"` is likewise never
  shown, and not claimed. (จับ ends in บ, not ป — it is a จ word, not a ป word.)
- **โ** — โต, โลก, โดย. Three words. No risk.
- **โ-ะ** — คน, ตก, จน for the invisible form. **The written-out open form has no word.**
  See risk 1.

One extra observation on `why-the-market`: it invites the learner to hold a hand up and say
**ปี** to feel no puff land. That is a 2-character word doing load-bearing demonstration
work — if any short clip must be reliable, it is this one.

**Overlap with `lesson-unwritten-vowels`.** That lesson's `implicit-o` slide uses
**คน** and **ตก** as two of its six examples — the same two this lesson uses. That is the
deliberate handoff the header describes ("named here and taught there"), not a defect. The
originality check (`checkOriginality`) runs against an external corpus, not against sibling
lessons, so the repetition does not trip a gate. Worth knowing so the narration can name
the handoff rather than accidentally pre-empting lesson-unwritten-vowels' full six-reading
rule.

## Cross-lesson hooks

**The missing puff becomes a shortcut — lesson 3 planted it, and this is the payoff.**
`content/lessons/lesson-03.md:61`:

> Everything in the market is mid class, which is your second district and the second half
> of what decides a tone, so all three of today's letters live here. And all three are made
> the same way in your mouth. The air stops dead and nothing comes out behind it. Try it on
> your hand. Hold your palm up close to your lips and say the English word key — you will
> feel the puff hit it. Now say pin. Another puff. Today's three do not do that at all. The
> air halts, nothing follows it, and your hand should stay completely still. **That missing
> puff is what makes them a group rather than three separate letters, and a later lesson
> turns it into a shortcut that saves you learning a whole set of them one at a time.**

This is lesson 9's most explicit inherited debt, and `why-the-market` is written to pay it:
"That is the market's rule, and it has no exceptions. A Thai consonant that stops and
releases no breath is mid class. You do not memorise the list; you listen for the missing
puff." It even reuses lesson 3's hand-to-the-lips test. The narration should say out loud
that this is the promise arriving — lesson 6 set the precedent for doing that
(`content/lessons/lesson-06.md:105`: "Cast your mind right back to lesson one … Remember
that? This is the pair").

**Two letters and no written vowel — promised twice, part-paid here.**
`content/lessons/lesson-03.md:342`:

> Two letters, and no written vowel anywhere. **Thai does that, and a later lesson explains
> why.** The mouse's letter, then the chicken's letter sealing the end. Same again — out
> loud, before you turn it over.

(that slide's word is **นก**), and again `content/lessons/lesson-06.md:257`:

> Two letters, no vowel written between them at all — **which is a thing Thai does and
> which has a lesson of its own coming.** The buffalo, and the mouse's letter. There is a
> short vowel in there that nobody bothered to write. Say it before you turn it over.

(that slide's word is **คน** — the same word lesson 9 builds its central slide on).

These two promises point at *different* destinations and the narration has to split them
carefully. Lesson 6's wording, "has a lesson of its own coming", is a promise of
`lesson-unwritten-vowels`, not of lesson 9. Lesson 3's, "a later lesson explains why", is
answered here. The skeleton already holds that line: it names the vowel and the shape
("Two bare consonants side by side with no vowel written between them are read with this
vowel, every time") and then defers — "the full rule — including what happens with three
consonants — has a lesson to itself". Keep that seam; do not let the narration teach the
six readings.

**The dead-ending rule, and the one tone rule still missing.**
`content/lessons/lesson-03.md:287`:

> A syllable that ends like that has a name: it is dead. One that can carry on ringing is
> live. That single difference is about to decide tones, so it is worth more than it looks.

The `more-words` slide closes on exactly this gap: "Some of these end dead — จาก, ปาก, จับ,
ตก — and you cannot yet say what tone they take. Mid class on a dead syllable is the one
rule of the four still missing, and it arrives in lesson eleven." Verified against
`symbols.ts`: row 11 carries `toneRulesIntroduced: ["mid-dead-short", "mid-dead-long"]`.

**The market as a place, established in lesson 3.** `content/lessons/lesson-03.md:61` also
gives the district its scene — "open to the sky under long strips of striped awning … really
only one aisle … wooden stalls down both sides, baskets standing on the ground" — which is
the same set `consonant-scenes.json` stages all three of this lesson's prompts in ("in a
Thai open-air market of wooden stalls under striped awnings, baskets of produce around").
The narration can treat the market as already-furnished rather than re-describing it; lesson
4 made the equivalent move for the harbour (`content/lessons/lesson-04.md:41`: "it is the
same harbour, so you already know the smell of it").

**The market vendor left waiting in lesson 2.** `content/lessons/lesson-02.md:229`:

> There is a market vendor standing with him. Ignore him for now; he is there for a rule you
> have not met yet, and when you do meet it you will find him already waiting.

This was paid off by lesson 3's `mid-live` rule, not by lesson 9 — lesson 9's header says
the mid-live rule is "lesson three's, unchanged". Do not re-spend it.

## Assets

**Images: none.** `content/lessons/images/lesson-09/` **does not exist** (verified with
`ls`: "No such file or directory"). Only `lesson-01` … `lesson-06` and `orientation` have
image directories; `lesson-06` holds 12 `.jpg` files for scale.

**`scene:` lines: 0.** Verified `grep -c '^scene:' content/lessons/lesson-09.md` → 0.
Also 0 `image:` lines, 0 `narration:` lines, 0 `thai:` lines, 0 `glyph:` lines.
(Lesson 6, for comparison: 12 `scene:`, 14 `image:`, 37 `narration:`.)

Three ready-made scene prompts do exist in `consonant-scenes.json` for the three letters —
the `prompt` fields quoted in full under **Consonants** above — so the letter-introduction
scenes do not need inventing from scratch.

**Built deck: present but silent.** `public/lessons/lesson-09/deck.json` exists (4810 bytes,
9 slides: 5 exposition, 2 retrieval, 2 reveal) and `public/lessons/lesson-09/manifest.json`
exists (376 bytes) with **`"assets": []`** — no audio generated. No slide carries an `audio`
array or an `image`. The manifest's `verificationOutcomes` is
`["not-required", "verified", "mismatch"]`, missing the `"recorded"` outcome the built
lessons 01-06 carry, so it predates the shipped-recording route being wired in.
