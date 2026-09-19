# lesson-07 scoping

Source skeleton: `content/lessons/lesson-07.md`
Title line: `# The soldier and the owl, a mast in front, and the seven pairs`

## Declares

From the HTML comment header (`content/lessons/lesson-07.md:5-30`):

> Middle band, lesson 2 of 6. Declares ท and ฮ and the vowels เ and เ-ะ.

`ranks:` line, verbatim (`content/lessons/lesson-07.md:7`):

```
ranks: 1-2500
```

`previews:` line, verbatim — note it wraps over three physical lines in the file
(`content/lessons/lesson-07.md:15-17`); the band test's regex `^previews:\s*(.+)$`
reads **only the first physical line**, so the glyphs and the em-dash must stay on it:

```
previews: ข ฉ ถ ผ ฝ ส ห — ฮ is the last of the seven hummed-and-breathed
letters whose sound is shared with a temple letter, so this is the first point
in the sequence where the whole pairing can be shown at once. The glyphs are
shown as the far half of a pair and nothing is asked of them; each is taught,
named and drilled in its own lesson later. Showing the map costs seven glyphs
and saves fourteen facts, which is the entire argument for teaching class as
pairs.
```

Rest of the header, verbatim:

> The window is wider here than the rest of the band by five hundred ranks, and
> ฮ is the whole reason: its commonest word in the corpus is ฮา at rank 2394,
> and there is no second one before rank 3478. A letter is not droppable for
> being rare — ฮ is what completes the seventh pair, and the seventh pair is ห,
> the fourth commonest syllable initial in the language.

> `middleBand.test.ts` reads the pair inventory off the `cousin-pairs` slide:
> every bullet of the form "&lt;letter&gt; is &lt;district&gt;" is one half of a pair, and
> the pairs it finds must be exactly the sound groups that hold both a high and
> a low letter. Delete a bullet and the lesson stops claiming that pair.

> ๆ is not used here. เ-ะ brings ็ with it through `conditionalVowelForms`.

**`rule:` slides: NONE.** The skeleton has zero `rule:` lines and zero `## rule` headings
(verified: `grep -n '^rule:' content/lessons/lesson-07.md` returns nothing). Lesson 7
introduces `specialRulesIntroduced: ["mai-taikhu"]` in the `lessons` table
(`src/domain/script/data/symbols.ts:3184+`, row `number: 7`), but the skeleton teaches
that as prose on the `e-with-a-final` exposition, not as a `rule:` slide.

**Symbols the test will demand appear.** `declaredSymbols(7)` is built from the
`lessons` row's `consonants` + `vowels` + `toneMarks`, decomposed to characters:

| row field | value |
|---|---|
| `consonants` | `["ท", "ฮ"]` |
| `vowels` | `["เ", "เ-ะ", "็"]` |
| `toneMarks` | `[]` |

so the required character set is **ท ฮ เ ะ ็** — every one must appear somewhere in the
deck's title/headings/prompts/bullets/answers. `conditionalSymbols(7)` adds the chars of
`เ-ะ`'s forms (`openForm: "เ-ะ"`, `withFinalForm: "เ-็-"`, `sceneGrammar.ts:100-105`),
which is the same set.

## Consonants

### ท

From `src/domain/script/data/consonant-scenes.json` (entry `id: "tho-thahan"`):

- letter: `ท`
- name: `ท ทหาร`
- meaning: `soldier`
- district: `harbor`
- `prompt`: "A soldier in uniform pacing across a wooden harbour bridge, back straight, one arm swinging, on a fishing harbour quay, moored wooden longtail boats and drying nets behind."
- `narration`: "The soldier. [pause] Low class, so it lives down at the harbour. [pause] A head curls in, the back climbs straight, then an arch marches down — a soldier pacing the harbor bridge. [pause] T carried out on a breath — th — pacing low along the waterfront."

From `src/domain/script/data/symbols.ts:951-969`:

- class: `ThaiSymbolClass.Low`
- `nameRomanized: "thaaw thá-hǎan"`, `nameMeaning: "soldier"`
- `initialSound: "th (aspirated T, like T in 'top' with puff of air)"`
- `finalSound: "T-stop"`, `hasDeadEnding: true`, `isAspirated: true`
- `priority: 15`, `lesson: 7`
- `shapeCue`: "A head curls in, the back climbs straight, then an arch marches down — a soldier pacing the harbor bridge."
- `soundCue`: "T carried out on a breath — th — pacing low along the waterfront."

Confusable pairs touching ท (`sceneGrammar.ts`, `confusablePairs`):
- `ฑ` ↔ `ท`, feature `bump` — "ฑ puts a bump right after the head where ท goes straight up"
- `ท` ↔ `ห`, feature `bump` — "ห kinks its left stroke where ท drops straight" (ห is previewed here)

### ฮ

From `consonant-scenes.json` (entry `id: "ho-nokhu"`):

- letter: `ฮ`
- name: `ฮ นกฮูก`
- meaning: `owl`
- district: `harbor`
- `prompt`: "A round-eyed owl with tall zigzag ear-tufts perched on a mooring post at night, one enormous eye blinking, on a fishing harbour quay, moored wooden longtail boats and drying nets behind."
- `narration`: "The owl. [pause] Low class, so it lives down at the harbour. [pause] Like the basin's letter, but wearing a zigzag crest — an owl's ear-tufts over one round eye, blinking at the night harbor. [pause] A breathed h — The owl's hoo across the water; the one h berthed at the harbor while the chest's letter keeps the temple."

From `symbols.ts:972-991`:

- class: `ThaiSymbolClass.Low`
- `nameRomanized: "haaw nók-hûuk"`, `nameMeaning: "owl"`
- `initialSound: "h (like H in 'hoot')"`
- `finalSound: "not used as final consonant"`, `hasDeadEnding: false`, `isAspirated: false`
- `priority: 35`, `lesson: 7`
- `shapeCue`: "Like อ, but wearing a zigzag crest — an owl's ear-tufts over one round eye, blinking at the night harbor."
- `soundCue`: "A breathed h — the owl's hoo across the water; the one h berthed at the harbor while ห keeps the temple."

Confusable pair: `อ` ↔ `ฮ`, feature `added-stroke` — "ฮ wears a zigzag crown over the plain ring of อ".

**Forward-reference trap.** `symbols.ts`'s `shapeCue` and `soundCue` for ฮ both print glyphs
the deck may not print: **อ** is taught at lesson 11, and **ห** is previewed here (so ห is
safe, อ is not). `consonant-scenes.json` already routes around this — it says "the basin's
letter" and "the chest's letter" instead of the glyphs — and the skeleton does too
("a single round eye with a zigzag crest"). Narration must keep doing this: printing `อ` in
a heading, prompt, bullet or answer fails `middleBand.test.ts`'s AC3 sweep
("never uses a symbol the sequence teaches later").

## Shipped recordings (verified with `ls`)

Consonant name recordings — both exist:

| symbol | file | verified |
|---|---|---|
| ท | `public/audio/consonant-tho-thahan.mp3` | EXISTS (8262 bytes) |
| ฮ | `public/audio/consonant-ho-nokhu.mp3` | EXISTS (8116 bytes) |

Vowel name recordings — both exist:

| vowel | file | verified |
|---|---|---|
| เ (`sara ee`) | `public/audio/sara-e-long.mp3` | EXISTS (8541 bytes) |
| เ-ะ (`sara e`) | `public/audio/sara-e-short.mp3` | EXISTS (6958 bytes) |

`็` (`mai taikhu`) has **no recording of its own**. `symbols.ts:1806-1820` points it at
`/thai-script/audio/sara-e-short.mp3` — the same file as เ-ะ. There is no
`public/audio/*taikhu*.mp3` on disk.

Previewed temple letters — all seven exist, should the narration want to play them
(the header says "nothing is asked of them", so playing them is a choice, not a need):

- ข → `public/audio/consonant-kho-khay.mp3` EXISTS
- ฉ → `public/audio/consonant-cho-ching.mp3` EXISTS
- ถ → `public/audio/consonant-tho-thung.mp3` EXISTS
- ผ → `public/audio/consonant-pho-phing.mp3` EXISTS
- ฝ → `public/audio/consonant-fo-fa.mp3` EXISTS
- ส → `public/audio/consonant-so-sia.mp3` EXISTS
- ห → `public/audio/consonant-ho-hip.mp3` EXISTS

Harbour column already taught, also all present: ค `consonant-kho-khwai.mp3`,
ช `consonant-cho-chang.mp3`, พ `consonant-pho-phan.mp3`, ฟ `consonant-fo-fan.mp3`,
ซ `consonant-so-so.mp3`.

## Example words and ranks

Declared window: **1-2500**. Every word below resolves in
`src/domain/vocabulary/data/vocabulary.json` and **every one is inside the window**.
This is the complete set of Thai runs of length ≥2 in the skeleton — nothing else appears.

| word | skeleton romanisation | vocabulary.json romanisation | English (vocab) | rank | Thai chars |
|---|---|---|---|---|---|
| ทาง | thaang | thaang | directions | 109 | 3 |
| บาท | bàat | bàat | baht | 217 | 3 |
| ฮา | haa | haa | laugh; chuckle | 2394 | 2 |
| เท | thee | thee | pour | 1284 | 2 |
| เด็ก | dèk | dèk | child | 181 | 4 |
| เย็น | yen | yen | cold | 150 | 4 |
| เก็บ | gèp | gèp | store; put away | 271 | 4 |
| ก็ | gâaw | gâaw | then | 50 | 2 |
| ทุก | thúk | thúk | each | 159 | 3 |
| ทันที | than thii | than thii | immediately | 752 | 5 |
| นาที | naa-thii | naa-thii | minute | 335 | 4 |
| บางที | baang thii | baang thii | perhaps, maybe | 1125 | 5 |
| ทาน | thaan | thaan | eat | 472 | 3 |
| ทีม | thiim | thiim | team | 1592 | 3 |
| เกม | geem | geem | game | 2025 | 3 |
| บทบาท | bòt bàat | bòt bàat | role | 1147 | 5 |
| ทับ | tháp | tháp | overlay; put on top | 1403 | 3 |

**Nothing is outside the window and nothing is absent from vocabulary.json.**

Glossing differences worth knowing (the skeleton's English is not always the corpus's):
ทาง is glossed "a way or a direction" in the skeleton vs `directions` in the corpus;
เย็น is "cool or evening" vs `cold`; ทาน is "to eat" vs `eat`.

Headroom note: the window's ceiling is 2500 and ฮา sits at 2394, เกม at 2025, ทีม at 1592.
Any *new* word the narration writes into a **heading, prompt, bullet or answer** must also
rank ≤ 2500. Lesson 6's header states the escape hatch explicitly
(`content/lessons/lesson-06.md:27-30`): "the check reads headings, prompts, bullets and
answers — not narration", so an out-of-window word may be *spoken* but never *written*.

## Risks

### 1. LENGTH PAIRS

**Yes — one pair: เ (long, `sara ee`) and เ-ะ (short, `sara e`).**

- `เ` — `symbols.ts:1775-1789`, `length: "long"`, `position: "left"`, `priority: 10`.
- `เ-ะ` — `symbols.ts:1790-1804`, `length: "short"`, `position: "around"`, `priority: 11`.
- A third declared symbol rides along: `็` (`mai taikhu`) — `symbols.ts:1806-1820`,
  `lesson: 7`. It is listed in the lessons row's `vowels` array and is also produced by
  `conditionalFormFor("เ-ะ").withFinalForm === "เ-็-"`.

The character-level test is satisfied by the skeleton as it stands: `เ`, `ะ` and `็` all
appear in the deck text (verified against `public/lessons/lesson-07/deck.json` — chars used
include `เ ะ ็`).

**But the short form has no word of its own.** Every short-e example in the skeleton
(เด็ก, เย็น, เก็บ, ก็) shows the **็ roof** form, not the written-out `เ-ะ`. There is no
word anywhere in the lesson spelled with `เ…ะ`. If a later or stricter check ever asks
"is เ-ะ's open form used in a real word", this lesson has nothing to offer it, and the
skeleton's own prose concedes the point: "It is rarely written out in full, and the next
slide is why."

Symmetrically, `เ` long is carried by only two words — **เท** (rank 1284) and **เกม**
(rank 2025). เด็ก/เย็น/เก็บ are *not* long-เ words; their `เ` is half of `เ-็-`
(verified against vocabulary.json's syllable data: `เด็ก` has `vowel: "เ็"`, whereas
`เท` has `vowel: "เ"`). Two words is thin cover for the long member of the pair, and one
of them (เกม) is a loanword.

### 2. SHORT-WORD RISK (under 3 Thai characters)

Three words in this lesson are 2 characters:

- **ฮา** (2 chars) — and it is the **only** word for ฮ in the whole lesson.
- **เท** (2 chars)
- **ก็** (2 chars)

Correction to the premise as briefed: two-character Thai words do **not** uniformly fail
the transcribe-back gate. The pipeline (`scripts/lesson_deck/pipeline.py`) tries
`RETRY_SEEDS: tuple[int, ...] = (42, 1, 7, 13, 99, 2024, 5, 77)` — **eight** attempts —
and accepts at `TRANSCRIPT_MATCH_RATIO = 0.9`. The shipped lessons 01-06 contain many
verified 2-character Thai clips: นา, มา, มี, ดี, กา, นก, ดู, พบ (all attempt 1),
วง (attempt 3) and คน (attempt 3). Across all six built lessons there are **zero**
failed or mismatched Thai segments.

What is real is the *variance*: short Thai has high variance against the transcriber
(pipeline.py:94-98 says so in as many words: a letter name like `มอ ม้า` comes back as
`หมอ ม้า` and scores 0.909 against the 0.9 threshold). So expect retries on ฮา / เท / ก็,
and expect ก็ to be the worst of the three — it is a bare consonant plus a diacritic with
no vowel letter at all, which is exactly the shape the transcriber substitutes a real word
for. If any of the three burns all eight seeds, `ฮา` is the one that cannot simply be
dropped: see risk 3.

### 3. DECLARED SYMBOLS WITH NO EXAMPLE WORD

- **ท** — covered ten times over. No risk.
- **ฮ** — covered by exactly **one** word, ฮา, and the header explains why there is no
  second one: "its commonest word in the corpus is ฮา at rank 2394, and there is no second
  one before rank 3478". So ฮา is not replaceable and not supplementable inside the
  declared window. If ฮา fails synthesis, the lesson has no word for ฮ at all.
- **เ** — covered by เท and เกม. Thin but present.
- **เ-ะ** — **no word shows its open (written-out) form.** Covered only through its
  `็` conditional form. See risk 1.
- **็** — covered by เด็ก, เย็น, เก็บ, ก็. No risk.

## Cross-lesson hooks

**Dead endings, paid off by ท in final position.** `content/lessons/lesson-03.md:287`:

> That means much, or very. The chicken's letter is on the end of it, and it shuts the
> sound off at the back of the throat with nothing released. There is nowhere for the
> sound to go. A syllable that ends like that has a name: it is dead. One that can carry
> on ringing is live. That single difference is about to decide tones, so it is worth more
> than it looks.

The skeleton calls this out directly on `thaaw-thahaan`: "That is the dead-ending rule from
lesson three, unchanged." บาท (bàat) is the example.

**The shortener moving to the roof, paid off by `็`.** `content/lessons/lesson-04.md:233`:

> One thing about the back yard. It is not very big, and it is where a final consonant
> stands too. So when a syllable has a short vowel and something after it, both of them
> want the same spot, and the vowel is the one that moves. He goes up on the roof instead,
> and he leaves a different mark there — a single curl above the first letter. Same man.
> Same sound. Same short. The only thing that changed is where he was standing.

The skeleton's `e-with-a-final` slide names this: "ะ was the first, back in lesson four,
when it became a curl over the consonant." Lesson 7 is the *second* instance of the same
move, and the narration can lean on the learner already owning the shape of the rule.

**Class-as-pairs, part-paid by `cousin-pairs`.** `content/lessons/lesson-03.md:61`:

> That missing puff is what makes them a group rather than three separate letters, and a
> later lesson turns it into a shortcut that saves you learning a whole set of them one at
> a time.

This promise is aimed squarely at lesson 9's "why-the-market" (plain unaspirated stop ⇒ mid
class). Lesson 7's `cousin-pairs` is the *other* half of that economy — the header's own
words, "Showing the map costs seven glyphs and saves fourteen facts, which is the entire
argument for teaching class as pairs" — but it is not the referent of lesson 3's sentence.
Do not spend the payoff here; lesson 9 needs it.

**Low class + live ending, assumed throughout.** `content/lessons/lesson-02.md:223`:

> Every letter in the harbour is low class. When one of them opens a syllable and nothing
> stops the air at the end, the tone comes out flat — level from beginning to end, halfway
> up your speaking range. Low class, live ending, mid tone.

Both of lesson 7's letters are harbour/low, so this rule carries unchanged — lesson 6 made
the same move and called it "a rebate rather than a shortcut"
(`content/lessons/lesson-06.md:49`).

**No hook found that lesson 7 uniquely closes.** Lesson 1's loop-direction promise
(`content/lessons/lesson-01.md:141`) was already paid off in lesson 6, which says so in its
own header (`content/lessons/lesson-06.md:14-20`). I found no earlier promise of a
high/low pairing map, so `cousin-pairs` is a new claim rather than a payoff.

## Assets

**Images: none.** `content/lessons/images/lesson-07/` **does not exist**
(verified: `ls` returns "No such file or directory"). Only `lesson-01` through `lesson-06`
and `orientation` have image directories. For scale, `content/lessons/images/lesson-06/`
holds 12 `.jpg` files.

**`scene:` lines: 0.** Verified `grep -c '^scene:' content/lessons/lesson-07.md` → 0.
Lesson 6 has 12. Also 0 `image:` lines (lesson 6 has 14), 0 `narration:` lines
(lesson 6 has 37), 0 `thai:` lines and 0 `glyph:` lines.

**Built deck: present but silent.** `public/lessons/lesson-07/deck.json` exists (5532 bytes,
10 slides: 6 exposition, 2 retrieval, 2 reveal) and `public/lessons/lesson-07/manifest.json`
exists (376 bytes) with **`"assets": []`** — no audio has ever been generated for this
lesson. No slide carries an `audio` array or an `image`. Note the manifest's
`verificationOutcomes` list is `["not-required", "verified", "mismatch"]` — it lacks
`"recorded"`, which the built lessons 01-06 carry, so the manifest predates the
shipped-recording route being wired in.
