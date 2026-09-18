# Scoping: lesson-13 — The Sanskrit set

Source script: `content/lessons/lesson-13.md` (15 slides).
Shipped deck: `public/lessons/lesson-13/deck.json` (15 slides, `assets: []`).
All facts below verified against the working tree.

---

## Declares

### Header comment (`content/lessons/lesson-13.md`, lines 5-14), verbatim

```
previews: none
ranks: 1-1500
teaches: ์ — the gaaran sign this lesson introduces; no lessons-table row lists it
```

Full header text:

> Task 4.3, final band 2 of 3. Six letters Thai keeps for words it borrowed —
> two more temple s letters and four harbor letters that double sounds the
> learner has — plus สระ อำ, the oe vowels with their เ-ิ written change, and
> การันต์. The old course put these in lessons 13 and 16 with the rationale
> never stated; stating it (loanword spelling) is what makes the set cohere.

The `teaches:` line is the script's **only** declaration channel for ์ (gaaran). It is parsed by `sequenceClosure.test.ts:declarationsOf` and `middleBand.test.ts:declarationsOf`, both of which require the `<glyphs> — <reason>` form with a non-empty reason; this line satisfies it.

### Lessons-table row (`src/domain/script/data/symbols.ts:3326-3335`)

```ts
number: 13,
title: "The Sanskrit Set",
focus: "Six loanword letters, sara am, the oe vowels, and gaaran",
consonants: ["ศ", "ษ", "ภ", "ธ", "ณ", "ญ"],
vowels: ["เ-อ", "เ-อะ", "ำ"],
toneMarks: [],
toneRulesIntroduced: ["high-dead-short", "high-dead-long"],
specialRulesIntroduced: ["gaaran", "sara-am-properties"],
```

**Consonants (6):** ศ ษ ภ ธ ณ ญ — note the table's order differs from the script's prose order (ศ ษ ณ ญ ภ ธ).
**Vowels (3):** เ-อ (sara ooe, long), เ-อะ (sara oe, short), ำ (sara am, short)
**Tone marks:** none
**Extra glyph via `teaches:`:** ์

### `rule:` slides in the script (4)

| slide | `rule:` id | shipped record |
| --- | --- | --- |
| `## rule high-dead-short-rule` | `high-dead-short` | `symbols.ts:407-414` — `High` + `dead-short` → `"low"`; description `"High class consonant + dead syllable = low tone."`; `lesson: 13` |
| `## rule high-dead-long-rule` | `high-dead-long` | `symbols.ts:415-423` — `High` + `dead-long` → `"low"`; description `"High class consonant + dead syllable = low tone (regardless of vowel length)."`; `lesson: 13` |
| `## rule sara-am-rule` | `sara-am-properties` | `symbols.ts:595-601` — title `"สระ อำ (sara am) Properties"`; description `"สระ อำ combines สระ อะ (a) + ม (m). It always forms a live syllable because of its built-in final ม sound. Any letters following it begin the next syllable."`; `lesson: 13` |
| `## rule gaaran-rule` | `gaaran` | `symbols.ts:574-580` — title `"การันต์ (Gaa-ran) Silent Marker"`; description `"A symbol written above a consonant to indicate it is silent. Used to preserve original spellings of loanwords. Example: สัตว์ (sat) = animal, where ว์ is silent."`; `lesson: 13` |

### Vowel records (`symbols.ts`)

- **เ-อ** — `name: "sara ooe"`, `length: "long"`, `sound: "ooe (like ER in 'her' with relaxed throat)"`, `position: "around"`, `audioUrl: "/thai-script/audio/sara-uh-long.mp3"`, `priority: 24`, `lesson: 13`.
  `shapeCue: "Mast in front and the basin ring after; when a final consonant joins, the ring gives way to a ิ brim above — except before ย, where nothing is written at all."`
  `soundCue: "An er with no r in it, throat loose, held long."`
- **เ-อะ** — `name: "sara oe"`, `length: "short"`, `sound: "oe (short version of sara ooe)"`, `position: "around"`, `audioUrl: "/thai-script/audio/sara-uh-short.mp3"`, `priority: 25`, `lesson: 13`.
  `shapeCue: "Mast, consonant, ring, then the stacked hooks — the short spelling of the loose-throat vowel; a final consonant swaps in the ิ brim."`
  `soundCue: "The same r-less er, clipped."`
- **ำ** — `name: "sara am"`, `length: "short"`, `sound: "am (built-in: สระ อะ + ม)"`, `position: "above"`, `audioUrl: "/thai-script/audio/sara-am.mp3"`, `priority: 29`, `lesson: 13`.
  `shapeCue: "A small ring floating above with the า post right after — ring first, post second."`
  `soundCue: "Am — the ม comes built in, so the syllable always ends humming and lives."`

`ำ` is additionally listed in `sceneGrammar.ts:LIVE_SHORT_VOWELS = ["ำ", "ไ", "ใ", "เ-า"]` — short vowels whose open syllable is nonetheless live.

### Conditional written forms (`sceneGrammar.ts:conditionalVowelForms`)

Two of this lesson's three vowels change shape before a final consonant, and both are declared as data:

```ts
{ vowel: "เ-อ", openForm: "เ-อ", withFinalForm: "เ-ิ-", example: "เดิน",
  exceptions: [{ finalConsonant: "ย", form: "เ-ย", example: "เลย",
                 note: "before a final ย the อ drops and no สระ อิ is written" }] },
{ vowel: "เ-อะ", openForm: "เ-อะ", withFinalForm: "เ-ิ-" },   // no example — see below
```

The `เ-อะ` entry ships with a deliberate comment: *"The only entry with no example: common Thai has no closed short เ-อะ syllable to cite, so the with-final form stands on the shipped prose alone."*

The **ย exception (เ-ย, เลย)** is shipped data the skeleton does not mention.

---

## Consonants

Prior teaching set (lessons 1-12): ม น ง ย ว ก ด บ ช ซ พ ฟ ค ท ฮ ร ล จ ต ป อ ข ฉ ถ ผ ฝ ส ห — 28 consonants.

### ศ — ศ ศาลา "pavilion"

- District **temple**; class **High**; `hasDeadEnding: true`; `isAspirated: false`; `initialSound: "s"`; `finalSound: "T-stop"`; `priority: 24`.
- `prompt` (id `so-sala`):
  > An open wooden pavilion with a pointed roof, a single pennant planted upright on the roof ridge, in the courtyard of a Thai temple with tiered golden roofs and white walls.
- `narration`:
  > The pavilion. [pause] High class, so it belongs up at the temple. [pause] Like the water buffalo's letter, but with an extra flag-stroke planted on the roof — a pavilion flying its pennant on the temple grounds. [pause] S — wind hissing through the open pavilion; the first of the temple's three s-letters.
- `shapeCue`:
  > Like ค, but with an extra flag-stroke planted on the roof — a pavilion flying its pennant on the temple grounds.
- `soundCue`:
  > S — wind hissing through the open pavilion; the first of the temple's three s-letters.
- **Shape ≈ ค** (taught lesson 6). Stated by shapeCue; `confusablePairs`: `ค~ศ [added-stroke] "ศ plants an extra flag stroke on top of the ค shape"`.
  The skeleton instead says "ศ leans forward with a split head", which names no reference letter and does not match the shipped cue.
- **Sound ≈ ส** (taught lesson 12) and **ซ** (lesson 4). Not stated in `initialSound` (bare `"s"`); the `s` group is ซ(Low/L4) ศ(High/L13) ษ(High/L13) ส(High/L12). ส is the same class and district, so it is the closer analogue.

### ษ — ษ ฤๅษี "hermit"

- District **temple**; class **High**; `hasDeadEnding: true`; `isAspirated: false`; `initialSound: "s"`; `finalSound: "T-stop"`; `priority: 28`.
- `prompt` (id `so-risi`):
  > A bearded hermit in a tiger-skin robe carrying a basket, his long wooden staff laid across it, in the courtyard of a Thai temple with tiered golden roofs and white walls.
- `narration`:
  > The hermit. [pause] High class, so it belongs up at the temple. [pause] Like the leaf's letter, but crossed with an extra line — The hermit's staff laid across the bucket he carries up to the temple. [pause] S — The second temple s, whispered through the hermit's beard.
- `shapeCue`:
  > Like บ, but crossed with an extra line — the hermit's staff laid across the bucket he carries up to the temple.
- `soundCue`:
  > S — the second temple s, whispered through the hermit's beard.
- **Shape ≈ บ** (taught lesson 3). Stated by shapeCue; `confusablePairs`: `บ~ษ [added-stroke] "ษ crosses the บ shape with an extra line"`.
  The skeleton says "ษ carries a broken crown" — again not the shipped reference.
- **Sound ≈ ส** (lesson 12) / **ซ** (lesson 4), as ศ above.
- Note: this letter's own **name**, ฤๅษี, contains ฤ and ๅ, both taught in lesson 14. The skeleton never prints the name, which is what keeps it clear of the forward-reference sweep.

### ณ — ณ เณร "novice monk"

- District **harbor**; class **Low**; `hasDeadEnding: false` (ณ and ญ are the lesson's only two letters with no dead ending); `isAspirated: false`; `initialSound: "n (same as น)"`; `finalSound: "n (live ending)"`; `priority: 25`.
- `prompt` (id `no-nen`):
  > A young novice monk in orange robes walking ahead down a wooden pier, a small mouse trotting behind him, on a fishing harbour quay, moored wooden longtail boats and drying nets behind.
- `narration`:
  > The novice monk. [pause] Low class, so it lives down at the harbour. [pause] Like the mouse's letter, but a whole frame like the chicken's letter opens first, the loop arriving only at the end — The novice walking ahead of the mouse down the pier. [pause] An n your ear cannot tell from the mouse's letter — a second n humming at the harbor.
- `shapeCue`:
  > Like น, but a whole ก-frame opens first, the loop arriving only at the end — the novice walking ahead of the mouse down the pier.
- `soundCue`:
  > An n your ear cannot tell from น — a second n humming at the harbor.
- **Shape ≈ น** (lesson 1), with a secondary reference to **ก** (lesson 3). Stated by shapeCue; `confusablePairs`: `ณ~น [added-stroke] "ณ opens with a whole ก-frame before the loop that is all of น"`. There is also a same-lesson pair `ญ~ณ [added-stroke] "ญ hangs a detached curl underneath; ณ ends in an attached loop"`.
  The skeleton says "ณ is น with a long tail folded under it" — same reference letter, different feature description from the shipped `added-stroke` framing.
- **Sound ≈ น** (lesson 1). Stated explicitly: `initialSound: "n (same as น)"`. The `n` group is น(Low/L1) ณ(Low/L13) only.

### ญ — ญ หญิง "woman/female"

- District **harbor**; class **Low**; `hasDeadEnding: false`; `isAspirated: false`; `initialSound: "y (same as ย)"`; `finalSound: "n"`; `priority: 30`.
- `prompt` (id `yo-ying`):
  > A tall woman striding along a harbour wall, her long black hair streaming out behind her, one loose ringlet drifting below the hem of her skirt, on a fishing harbour quay, moored wooden longtail boats and drying nets behind.
- `narration`:
  > The woman. [pause] Low class, so it lives down at the harbour. [pause] A frame flowing up to the right with a detached curl floating free underneath — a tall woman striding the harbour wall, her long hair streaming out behind her, one loose ringlet drifting down below the hem of her skirt. [pause] A second gliding y, humming low; doubled inside a word it closes one syllable and opens the next.
- `shapeCue`:
  > A frame flowing up to the right with a detached curl floating free underneath — a tall woman striding the harbour wall, her long hair streaming out behind her, one loose ringlet drifting down below the hem of her skirt.
- `soundCue`:
  > A second gliding y, humming low; doubled inside a word it closes one syllable and opens the next.
- **Shape ≈ ณ (same lesson, not already taught).** The shapeCue names **no** letter. The only shipped shape relationship is `confusablePairs`: `ญ~ณ`, and ณ is introduced in this same lesson. There is **no already-taught shape anchor for ญ in the data.**
  The skeleton asserts "ญ is ย standing over a small base", which is *not* in `confusablePairs` and not in the shapeCue.
- **Sound ≈ ย** (lesson 2). Stated explicitly: `initialSound: "y (same as ย)"`. The `y` group is ย(Low/L2) ญ(Low/L13) only.
- Note: `finalSound: "n"` — ญ as a final reads n, not y. The skeleton does not mention this.

### ภ — ภ สำเภา "Chinese junk ship"

- District **harbor**; class **Low**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "ph (like P in 'pink')"`; `finalSound: "P-stop"`; `priority: 26`.
- `prompt` (id `pho-samphau`):
  > A Chinese junk ship with battened sails, its heavy iron anchor swung right out over the port side on a chain, on a fishing harbour quay, moored wooden longtail boats and drying nets behind.
- `narration`:
  > The Chinese junk ship. [pause] Low class, so it lives down at the harbour. [pause] Like the chicken's letter, but a head hangs outside the frame, off the left leg — a junk with its anchor swung out over the port side. [pause] Another breathy ph riding low — The heavy freighter ph of the harbor.
- `shapeCue`:
  > Like ก, but a head hangs outside the frame, off the left leg — a junk with its anchor swung out over the port side.
- `soundCue`:
  > Another breathy ph riding low — the heavy freighter ph of the harbor.
- **Shape ≈ ก** (lesson 3), with a second shipped contrast against **ถ** (lesson 12). `confusablePairs` carries both: `ก~ภ [added-stroke] "ภ hangs a head off the left leg that ก does without"` and `ถ~ภ [head-direction] "ถ's head coils inside the frame; ภ's sticks out to the left"`. The ถ~ภ pair is the more useful one here — ถ was taught last lesson.
  The skeleton says "ภ is a steep sail", which names no reference letter.
- **Sound ≈ พ** (lesson 5), and **ผ** (lesson 12). Not stated in `initialSound`; the `ph` group is พ(Low/L5) ผ(High/L12) ภ(Low/L13). พ shares its class and district, so it is the closer analogue.

### ธ — ธ ธง "flag"

- District **harbor**; class **Low**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "th (aspirated T, like T in 'tennis')"`; `finalSound: "T-stop"`; `priority: 29`.
- `prompt` (id `tho-thong`):
  > A cloth flag knotted shut around its line above a quay, unable to unfurl, a crossbar through the knot, on a fishing harbour quay, moored wooden longtail boats and drying nets behind.
- `narration`:
  > The flag. [pause] Low class, so it lives down at the harbour. [pause] Like the boat's letter, but the open top closes into a loop with a crossbar through it — a flag knotted shut on its line above the quay. [pause] A breathy th flying low — The flag snaps th-th in the harbor wind.
- `shapeCue`:
  > Like ร, but the open top closes into a loop with a crossbar through it — a flag knotted shut on its line above the quay.
- `soundCue`:
  > A breathy th flying low — the flag snaps th-th in the harbor wind.
- **Shape ≈ ร** (lesson 8). Stated by shapeCue; `confusablePairs`: `ธ~ร [added-stroke] "ธ closes its top into a loop with a crossbar; ร stays open"`.
  The skeleton says "ธ is a flag on a pole", which names no reference letter.
- **Sound ≈ ท** (lesson 7), and **ถ** (lesson 12). Not stated in `initialSound`; the `th` group is ท(Low/L7) ธ(Low/L13) ถ(High/L12) ฐ(High/L14) ฑ(Low/L14) ฒ(Low/L14). ท shares class and district with ธ.

### Summary table

| letter | class / district | shape ≈ (already taught) | stated where | sound ≈ (already taught) | stated where |
| --- | --- | --- | --- | --- | --- |
| ศ | High / temple | ค (L6) | shapeCue + confusablePairs | ส (L12) / ซ (L4) | derived from `s` group |
| ษ | High / temple | บ (L3) | shapeCue + confusablePairs | ส (L12) / ซ (L4) | derived from `s` group |
| ณ | Low / harbor | น (L1), also ก (L3) | shapeCue + confusablePairs | น (L1) | `initialSound` |
| ญ | Low / harbor | **none already taught** — only ณ, same lesson | confusablePairs `ญ~ณ` only | ย (L2) | `initialSound` |
| ภ | Low / harbor | ก (L3), ถ (L12) | shapeCue + 2× confusablePairs | พ (L5) / ผ (L12) | derived from `ph` group |
| ธ | Low / harbor | ร (L8) | shapeCue + confusablePairs | ท (L7) / ถ (L12) | derived from `th` group |

The lesson's own split is 2 temple / 4 harbor, which the skeleton states correctly ("ศ and ษ are temple s, like ส. ณ is harbor n, like น. ญ is harbor y, like ย. ภ is harbor ph, like พ. ธ is harbor th, like ท.") — every one of those five sound claims matches the derived phoneme groups.

---

## Shipped recordings (each path confirmed with `ls`)

All six `public/audio/consonant-*.mp3` files exist.

| letter | scene id | path | `ls` result |
| --- | --- | --- | --- |
| ศ | so-sala | `public/audio/consonant-so-sala.mp3` | EXISTS |
| ษ | so-risi | `public/audio/consonant-so-risi.mp3` | EXISTS |
| ณ | no-nen | `public/audio/consonant-no-nen.mp3` | EXISTS |
| ญ | yo-ying | `public/audio/consonant-yo-ying.mp3` | EXISTS |
| ภ | pho-samphau | `public/audio/consonant-pho-samphau.mp3` | EXISTS |
| ธ | tho-thong | `public/audio/consonant-tho-thong.mp3` | EXISTS |

Every one matches the `audioUrl` on its `ThaiConsonant` record.

**Vowel recordings** — all three exist: `public/audio/sara-uh-long.mp3` (เ-อ), `public/audio/sara-uh-short.mp3` (เ-อะ), `public/audio/sara-am.mp3` (ำ).

**Palace assets** — all six have both image and narration clip:
`public/palace/consonants/{so-sala,so-risi,no-nen,yo-ying,pho-samphau,tho-thong}.jpg` and `public/palace/consonants/audio/<id>.mp3`. All 12 confirmed present.

**Lesson-level assets:** `public/lessons/lesson-13/manifest.json` has `"assets": []`; no deck slide carries `audio` or `image`. Nothing generated yet.

**No recording exists for the gaaran sign ์ on its own** — it is a diacritic, not a consonant, and there is no `public/audio/gaaran*.mp3`. It is only ever heard inside a word (สัตว์).

---

## Example words and ranks

Declared window: **1-1500**. Ranks read as the test reads them (last duplicate wins).

| word | romanisation (corpus) | English (corpus) | rank | Thai chars | in window? |
| --- | --- | --- | --- | --- | --- |
| คุณ | khun | you | 13 | 3 | yes |
| ทำ | tham | make | 77 | 2 | yes |
| ภาพ | phâap | image | 225 | 3 | yes |
| เธอ | thooe | her | 281 | 3 | yes |
| ญาติ | yâat | relative | 327 | 4 | yes |
| เดิน | dooen | walk | 386 | 4 | yes |
| หก | hòk | six | 399 | 2 | yes |
| ศึกษา | sùek sǎa | study | 533 | 5 | yes |
| สัตว์ | sàt | animal | 627 | 5 | yes |
| จำ | jam | remember | 708 | 2 | yes |
| เจอ | jooe | find | 847 | 3 | yes |
| เงิน | ngoen | money | 105 | 4 | yes |

**No word is outside the window and none is absent from the corpus.** 12 words; the shipped gate requires more than 4 — satisfied.

Duplicate-key caveats:

- **ทำ** has rank 76 `"do"` and rank 77 `"make"`; the last wins → 77. The skeleton glosses it "to do".
- **เงิน** has three entries: rank 103 `"silver"`, 104 `"silver"`, 105 `"money"`. Last wins → 105, which matches the skeleton's "money".

Gloss mismatches worth knowing: corpus **เธอ** = `"her"` (skeleton: "you"); corpus **เจอ** = `"find"` (skeleton: "to meet"); corpus **ภาพ** = `"image"` (skeleton: "a picture"). All are ordinary sense variants, not errors, but the corpus gloss is what the rank lookup returns.

---

## Risks

### 1. Declared symbol with no example word

**None for the consonants**, but coverage is at the absolute minimum: **every one of the six rests on exactly one word.**

| letter | corpus words in the skeleton containing it |
| --- | --- |
| ศ | ศึกษา (533) |
| ษ | ศึกษา (533) |
| ภ | ภาพ (225) |
| ธ | เธอ (281) |
| ณ | คุณ (13) |
| ญ | ญาติ (327) |

**ศ and ษ share their single example word** — ศึกษา is the only place either letter appears. If ศึกษา is dropped or changed in a rewrite, two declared letters lose their only instance simultaneously. The skeleton is aware ("ศึกษา (sùek-sǎa) — to study — carries two of them at once") and reuses the word again on the `temple-dead` slide and in the `two-halves` retrieval, so it carries three of the lesson's slides.

Vowels and the taught sign:

- **ำ** — two examples (ทำ 77, จำ 708). Fine.
- **เ-อ (open form)** — two examples (เธอ 281, เจอ 847). Fine.
- **เ-ิ (closed form of เ-อ)** — two examples (เงิน 105, เดิน 386). Fine.
- **เ-อะ** — **no example word.** The skeleton says only "The short mate เ-อะ clips it, and is rare in running text." This is consistent with the shipped data: `conditionalVowelForms` ships `เ-อะ` with no `example` and an explicit comment that common Thai has no closed short เ-อะ syllable to cite.
- **์ (gaaran)** — one example (สัตว์ 627), used on both the `gaaran` exposition slide and the `silent-letter` retrieval.

Character-level coverage checked directly against `public/lessons/lesson-13/deck.json`: **DECLARED-BUT-UNUSED = none** (declared chars ญ ณ ธ ภ ศ ษ อ ะ ำ เ ์ all appear).

Corpus alternatives if a second ศ/ษ example is wanted inside 1-1500: ภาษา (471, `"language"`) has ษ and ภ; รักษา (350, `"maintain"`) has ษ; พิเศษ (481, `"special"`) has ษ; ขอโทษ (28/29) has ษ. For ศ specifically: เศรษฐกิจ (437) — but it contains ฐ, a lesson-14 letter, so it would forward-reference.

### 2. SHORT-WORD RISK (under 3 Thai characters)

**Three words, all 2 characters:**

| word | rank | gloss used |
| --- | --- | --- |
| ทำ | 77 | to do |
| จำ | 708 | to remember |
| หก | 399 | six |

ทำ and จำ carry the ำ vowel and are the lesson's **only** ำ examples, so the short-word risk falls entirely on the one vowel with no longer alternative in the skeleton.

Mechanics (same as lesson 12): `vendor.py` gives sub-`CARRIER_LIMIT` (12 normalised chars) Thai a carrier sentence, so synthesis works; the exposure is `pipeline.py:transcript_matches` at `TRANSCRIPT_MATCH_RATIO = 0.9`, which on a 2-character string leaves no room for a single wrong character (one of two matching scores 0.5). `RETRY_SEEDS` gives 8 attempts.

หก is additionally at risk because it is a bare CV-C syllable a transcriber may hear as a longer real word.

Longer ำ-bearing corpus words in the 1-1500 window, if a safer example is wanted: `ทำงาน` (rank 118, `"work"` — 5 chars), `คำ` is also 2, `สำคัญ` (rank 214, `"important"` — 5 chars, but it uses ญ, which is *this* lesson's letter, so it is legal and would double as a second ญ example). These are options, not findings; verify each before use.

### 3. Genuinely rare or archaic letters

**None of the six is archaic**, but the lesson's premise is that they are *restricted* — the header calls them "Six letters Thai keeps for words it borrowed". What the data says about attention:

Scheduling priorities (`symbols.ts`, lower = earlier in the 1-44 SRS queue): ศ 24, ณ 25, ภ 26, ษ 28, ธ 29, ญ 30. All six sit in the middle of the queue — well ahead of the lesson-14 tail (34-44) and behind the working core. None appears in `sequenceClosure.test.ts:DEMOTED_LETTERS`, which lists only the ten lesson-14 letters.

The skeleton's own statement of how much attention they deserve: *"They double sounds you already read, and seeing one is a hint that the word is old, formal, or borrowed."* It makes no claim that any of the six is rare enough to skip, and the corpus supports that — ษ alone has 78 ranked corpus words.

### 4. Additional findings not in the three required categories

- **`เ-อะ` fragment is exempted by the shipped test, conditionally.** Printing `เ-อะ` yields the Thai run `อะ`, which is 2 characters and contains อ (inside `ก-ฮ`), so the word-extractor treats it as a word; `อะ` is **absent from vocabulary.json**. `sequenceClosure.test.ts:145` `patternFragments()` exempts it because it derives the exempt set from `lessons[].vowels`. **This holds only while the pattern is spelled exactly as the lessons row spells it (`เ-อะ`).** `เ-อ` splits to `เ` and `อ`, both length 1, so it is harmless either way; `ำ` is a single character and never forms a run on its own.
- **The ย exception to เ-อ is shipped but untaught.** `conditionalVowelForms` declares `เ-ย` / `เลย` with the note "before a final ย the อ drops and no สระ อิ is written". The skeleton teaches only the `เ-ิ` form. The `เ-อ` shapeCue itself states the exception ("except before ย, where nothing is written at all"), so the shipped mnemonic and the shipped lesson prose currently disagree about scope. Note เลย is in the corpus and would need a rank check before use.
- **ญ has no already-taught shape anchor in the data.** Its `confusablePairs` entry is against ณ, introduced in this same lesson, and its `shapeCue` names no letter at all. The skeleton's claim ("ญ is ย standing over a small base") is prose the data does not back. This is the one letter in the lesson where a shape statement has to be authored rather than quoted.
- **ญ's `finalSound` is `"n"`, not y** — an asymmetry with ย that the skeleton does not mention, and that คุณ/ญาติ do not demonstrate.
- **Four of the six shipped shapeCues name a reference letter the skeleton replaces with an unanchored description** (ศ: ค → "split head"; ษ: บ → "broken crown"; ภ: ก/ถ → "steep sail"; ธ: ร → "flag on a pole"). Whoever writes the narration should decide deliberately whether to follow the data or the skeleton; the data is what the mnemonic system and the palace images are built from.

---

## Grouping proposal

Six letters. Four groupings are supported by shipped data.

### A. By district — **2 temple / 4 harbor; strongest single split**

`classType` and the derived `district` field split the six cleanly, and the split is exactly the s-letters versus the rest:

| district | letters | class |
| --- | --- | --- |
| temple | ศ ษ | High |
| harbor | ณ ญ ภ ธ | Low |

Evidence: `symbols.ts` `classType` / `sceneMnemonic.district` on each record; `sceneGrammar.ts:districtForClass`; the palace image prompts (`consonant-scenes.json`) stage ศ and ษ in the temple courtyard and the other four on the harbour quay, so the shipped artwork already carries this split.

This is also the split the lesson's two tone rules need: `high-dead-short` and `high-dead-long` apply to ศ and ษ only. The four harbor letters demonstrate none of the lesson's declared rules.

### B. By sound cousin (phoneme group) — supported and complete

Derived the same way `middleBand.test.ts:cousinPairs()` derives it, from the leading token of `initialSound`:

| phoneme | this lesson | already taught |
| --- | --- | --- |
| s | ศ, ษ | ซ (L4), ส (L12) |
| n | ณ | น (L1) |
| y | ญ | ย (L2) |
| ph | ภ | พ (L5), ผ (L12) |
| th | ธ | ท (L7), ถ (L12) |

Covers all six with no gaps. Two of the five groups (`s` and `n`/`y`) put the new letter with an already-taught letter of the *same* class and district, which the two `same as` fields state outright (`"n (same as น)"`, `"y (same as ย)"`).

### C. By shape family — supported for five of six

`sceneGrammar.ts:confusablePairs` `feature` values:

| feature | pairs involving this lesson |
| --- | --- |
| added-stroke | ค~ศ, บ~ษ, ณ~น, ญ~ณ, ก~ภ, ธ~ร |
| head-direction | ถ~ภ |

Five of the six (ศ ษ ณ ภ ธ) anchor on an already-taught letter. **ญ anchors only on ณ, a same-lesson letter** — so this grouping cannot be stated from data for all six without introducing ณ before ญ.

Note the dominance of `added-stroke`: six of the seven relevant pairs. The lesson's shape story is almost entirely "a familiar letter plus one extra stroke", which is a real, data-backed generalisation.

### D. By sound type (`soundType.ts`) — splits 2/3/1

`SONORANT_PHONEMES` / `ASPIRATED_STOP_PHONEMES` / `FRICATIVE_PHONEMES`:

- sonorant (`n`, `y`): ณ ญ — always Low, class derivable with no memorisation
- aspirated stop (`ph`, `th`): ภ ธ — `isAspirated: true`
- fricative (`s`): ศ ษ — `isAspirated: false`, and both High

This is the grouping that *explains* the district split rather than just stating it: `soundType.ts`'s own comment is that sonorants are always low (derived), while aspirates and fricatives are the only bucket where High/Low must be learned. ศ and ษ are two of the eleven names in `HIGH_CLASS_CONSONANTS`.

### Recommendation

**Group by district (A) at the top level — two temple s-letters, four harbor doubles — and use sound cousin (B) as the per-letter line inside each group.** (A) is the split the lesson's two declared tone rules require, it matches the shipped artwork, and the skeleton's `borrowed-letters` slide already states it in exactly that order. (B) supplies the one-line "doubles which letter you already read" claim for all six with no gaps.

Use (C) only on the `telling-them-apart` slide, and state ณ before ญ there so ญ's only shipped shape anchor is available when it is needed. Do **not** rely on (C) for ญ against ย — the data does not support it.

(D) is the right frame if the lesson wants to say *why* the two s-letters are High and the other four are Low; it is the only grouping that makes that derivable rather than asserted.

---

## Assets

**Images:** `content/lessons/images/lesson-13/` **does not exist**. Image directories exist only for `lesson-01` … `lesson-06` and `orientation`.

**`scene:` lines in the script: 0.** `grep -n '^scene:' content/lessons/lesson-13.md` returns nothing; there are also no `image:` lines.

**Slide count: 15** — 7 `exposition`, 4 `rule`, 2 `retrieval`, 2 `reveal`. This is the largest of the three final-band lessons, driven by the four `rule:` slides.

Slide ids in order: `borrowed-letters`, `telling-them-apart`, `high-dead-short-rule`, `high-dead-long-rule`, `temple-dead`, `sara-am`, `sara-am-rule`, `oe-vowel`, `gaaran-rule`, `gaaran`, `two-halves`, `two-halves-answer`, `silent-letter`, `silent-letter-answer`, `close`.

Note the two tone rules sit on **consecutive slides** with a single exposition (`temple-dead`) covering both; `high-dead-short` and `high-dead-long` differ only in `syllableType` and both resolve to `"low"`.

**Deck manifest:** `public/lessons/lesson-13/manifest.json` → `"assets": []`. Voice spec present (`voiceId: "JBFqnCBsd6RMkjVDRZzb"`, `modelId: "eleven_multilingual_v2"`, stability 0.5 / similarity_boost 0.75 / speed 1.0). No slide carries `audio` or `image`. Nothing generated yet.

**Reusable assets that do exist:** all six palace consonant scene images at `public/palace/consonants/<id>.jpg` with narration clips at `public/palace/consonants/audio/<id>.mp3`, plus the 6 letter-name clips and 3 vowel clips under `public/audio/` listed above.
