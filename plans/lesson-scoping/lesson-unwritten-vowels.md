# Scoping: lesson-unwritten-vowels

Source script: `content/lessons/lesson-unwritten-vowels.md`
Built deck: `public/lessons/lesson-unwritten-vowels/deck.json` (13 slides), `manifest.json` (`assets: []` — no audio generated)

## Declares

Full HTML comment header, `content/lessons/lesson-unwritten-vowels.md:5-14`:

```
<!--
Phase 3, promoted lesson 1 of 3. Introduces no new symbol, so its lessons-table
row declares none; it teaches the readings a written word gives you for free.
previews: none

The example pairs on the rule slides are load-bearing. `promotedLessons.test.ts`
derives each rule's vowel from them by stripping the onset and the final it can
already read off the alphabet, so an example removed here is a rule the lesson
no longer states.
-->
```

Verbatim, the lines asked for:

- `previews: none` (`lesson-unwritten-vowels.md:8`)
- `ranks:` — **there is no `ranks:` line.** Verified with `grep -n "ranks:" content/lessons/*.md`: of the twenty-one lesson scripts, eleven declare a window and this one does not. It shares that with `lesson-clusters`, `lesson-leading-consonants`, `lesson-sound-buckets` and lessons 01-05. So **no declared rank window exists to quote.**

  This is not an oversight the test suite will catch. `requiredRankWindow` (`sequenceClosure.test.ts:188-194`) throws on a missing window, but it is only applied to `NEW_LESSON_IDS` — `lesson-12`, `lesson-13`, `lesson-14`, `lesson-numerals` (`sequenceClosure.test.ts:59-64`). This lesson is in `PROMOTED` (`promotedLessons.test.ts:53-57`) instead, and that suite checks corpus **presence** but not rank. See *Example words and ranks*.

**`rule:` slides: one.** `content/lessons/lesson-unwritten-vowels.md:37-38`:

```
## rule unwritten-vowels
rule: unwritten-vowels
```

It resolves in the built deck to `{"kind": "rule", "id": "unwritten-vowels", "ruleId": "unwritten-vowels"}` — the slide carries no prose of its own; the text comes from `specialRules` in `symbols.ts` at render time.

**New consonant or vowel declared: none.** The lessons-table row, `src/domain/script/data/symbols.ts:3354-3363`:

```ts
{
    number: 26,
    title: "Vowels That Are Not Written",
    focus: "The four ways a Thai syllable carries a vowel it does not spell",
    consonants: [],
    vowels: [],
    toneMarks: [],
    toneRulesIntroduced: [],
    specialRulesIntroduced: ["unwritten-vowels", "ror-han"],
},
```

Sequence entry (`src/domain/script/data/lessonSequence.ts:75`):

```ts
{ id: "lesson-unwritten-vowels", legacyNumber: 26, required: true },
```

Two mismatches between the declaration and the script as written, both worth the writer's attention:

1. **The row declares two rules; the script has one rule slide.** `specialRulesIntroduced` lists `unwritten-vowels` **and** `ror-han`, but the script only places a `rule:` slide for `unwritten-vowels`. `ror-han` is taught in prose on the `ro-han` exposition slide instead. It is still surfaced to the learner elsewhere — `ScriptLessonService.ts:298-302` maps `specialRulesIntroduced` into the lesson summary, and `SpecialRuleCard` (`SymbolCard.tsx`) renders it — so the rule is reachable from the app without a rule slide. The writer can add `## rule ror-han` or leave it; nothing fails either way.
2. **The row's `focus` says "four"; the script teaches six.** The script's own opening reads "There are six readings that fill in a missing vowel, and this lesson is all six" (`:20`), and `promotedLessons.test.ts:1172` asserts exactly six are recoverable. The four/six split is real and structural, not a typo: `IMPLICIT_VOWEL_RULES` in `syllableRules.ts:525` holds four (`implicit-o`, `implicit-a`, `bare-final-ro`, `ro-han`) and `VOWEL_LETTERS` (`syllableRules.ts:197`) holds the other two (อ and ว read as vowels). `syllableRules.test.ts:553` asserts the four by name. The lesson teaches all six together.

## The content

### Rule id in the script

**`unwritten-vowels`** — one rule id, declared once at `lesson-unwritten-vowels.md:38`.

### Located in `src/domain/script/data/symbols.ts:622-629`, quoted in full

```ts
{
    id: "unwritten-vowels",
    title: "Unwritten Vowels",
    description:
        "When two consonants appear with nothing between them, there is an unwritten สระ โอะ (short o) between them. Example: กฎ (got) = rule. With three consonants, สระ อะ appears after the first, สระ โอะ between the second and third.",
    lesson: 26,
},
```

**Field-name note:** the task asked for `title` and `explanation`. There is no `explanation` field anywhere in `src/domain/script/`. The `SpecialRule` shape carries `id`, `title`, `description`, `lesson`; `description` is the field quoted above and is what `SpecialRuleCard` renders.

- **`title`** (verbatim): `Unwritten Vowels`
- **`description`** (verbatim): `When two consonants appear with nothing between them, there is an unwritten สระ โอะ (short o) between them. Example: กฎ (got) = rule. With three consonants, สระ อะ appears after the first, สระ โอะ between the second and third.`

**Every worked example the description gives — there is exactly one:**

| Example | Reading given | Gloss given | rank in `vocabulary.json` | Corpus romanisation | Corpus English |
|---|---|---|---|---|---|
| กฎ | `got` | rule | 1058 | `gòt` | rule; regulation |

That is the whole of it. The three-consonant half of the description ("สระ อะ appears after the first, สระ โอะ between the second and third") is stated **without any worked example at all** — no word is given for it. The lesson script supplies its own (ถนน, ขนม, ตลก, นคร) but the rule data does not.

Note that **กฎ does not appear in the lesson script.** It appears only in the rule slide's rendered text. This matters for the ordering rationale — `lessonSequence.ts:55-56` justifies the lesson's position by saying "`lesson-unwritten-vowels` comes after lesson-14, whose letters (ฎ, ฏ) appear in its examples", and ฎ reaches the learner only through the rule card's `กฎ`, never through the authored prose.

### The second declared rule, `ror-han`, `symbols.ts:601-608`

Declared by the lessons-table row but given no rule slide. Quoted in full since the lesson teaches it:

```ts
{
    id: "ror-han",
    title: "ร หัน (Ror Han) Double ร",
    description:
        "When two ร letters appear side-by-side after an initial consonant with no final consonant, pronounce it as อัน (an). This special pattern is called ร หัน. Example: ธรรม (tham).",
    lesson: 26,
},
```

- **`title`**: `ร หัน (Ror Han) Double ร`
- **Worked example**: **ธรรม** (`tham`) — rank **737**, corpus romanisation `tham má`, corpus English "fairness; Dharma". The corpus reads it as two syllables (`tham má`); the rule data reads it as one (`tham`). `syllableRules.test.ts:561` sides with the rule: "ร หัน is a vowel, not a doubled consonant: ธรรม is tham." The word does **not** appear in the lesson script, which uses กรรม and พรรค instead.

### The six readings the script teaches, and what the test derives from each

`promotedLessons.test.ts` reconstructs each rule from the `word (romanisation)` pairs printed on the slide — `examplePairs` (`:255-264`) matches `/([ก-๎]+)\s*\(([^)]+)\)/g` over the slide body, `deriveUnwrittenVowel` (`:283-327`) strips the onset and the known final and keeps the residue, and **every qualifying example must leave the same residue or the derivation throws**. `statedLength` (`:266-273`) additionally requires the slide's heading-plus-body to contain the word "short" or "long", and takes the **first** match.

| Slide id | Shape the test selects (`promotedLessons.test.ts:331-378`) | Qualifying examples in the script | Derived vowel | Required length word |
|---|---|---|---|---|
| `implicit-o` | 2 chars, both consonants | คน ลง ตก จบ นก ผล (6) | `o` | short |
| `implicit-a` | first char a consonant; no final | ถนน ขนม ตลก นคร (4) | `a` | short |
| `bare-final-ro` | 2 chars, second is ร | กร พร (2) | `aaw` | long |
| `ro-han` | 4 chars, chars 2 and 3 are ร | กรรม พรรค (2) | `a` | short |
| `o-as-vowel` | 3 chars, second is อ | ของ ชอบ บอก สอง (4) | `aaw` | long |
| `w-as-vowel` | 3 chars, second is ว | รวม ดวง ขวด (3) | `ua` | long |

Two further hard constraints on the prose, both literal string matches:

- `promotedLessons.test.ts:618-622` requires the `o-as-vowel` slide to contain the exact phrase **"อ is a consonant only at the front of a word"** — without it, `oIsConsonantOnlyAtWordStart` is false and the whole-word reader parses ตลอด as อ-initial nonsense.
- `promotedLessons.test.ts:1207-1212` requires the `which-reading-wins` slide to match all three of: `/fewer of them|fewer syllables/i`, `/where that ties|then/i`, `/bare ร ending beats the short o/i`.
- `promotedLessons.test.ts:1199-1202` requires **every** rule to rest on more than one example (`evidence > 1`). `bare-final-ro` and `ro-han` currently sit at exactly 2 — they have no margin. Dropping one example from either breaks the suite.
- `promotedLessons.test.ts:1226-1239` is an explicit guard: emptying the `implicit-o` slide's body must make the derivation throw. The examples are the rule.

### Every worked example printed in the script, slide by slide

- `every-syllable-has-one` — คน at rank 47
- `implicit-o` — คน (khon) person, ลง (long) go down, ตก (dtòk) fall, จบ (jòp) finish, นก (nók) bird, ผล (phǒn) result
- `read-a-bare-pair` / its reveal — ยก → `yók`, ก closing, low class + dead + short = high tone
- `implicit-a` — ถนน (thà-nǒn) street, ขนม (khà-nǒm) snack, ตลก (dtà-lòk) funny, นคร (ná-khaawn) city; plus the worked decomposition นน → nǒn with ถ left over
- `bare-final-ro` — กร (gaawn) hand, พร (phaawn) blessing, and นคร (ná-khaawn) again
- `ro-han` — กรรม (gam) karma/deed, พรรค (phák) political party
- `o-as-vowel` — ของ (khǎawng), ชอบ (châawp), บอก (bàawk), สอง (sǎawng), and ตลอด (dtà-làawt) as the combined case
- `w-as-vowel` — รวม (ruam), ดวง (duang), ขวด (khùat), ตรวจ (dtrùat), and วง as the contrast where ว is still a consonant
- `two-readings` / its reveal — ทรง vs ทราย
- `which-reading-wins` — สน inside สนใจ read as one syllable sǒn

## Example words and ranks

Every Thai word the skeleton mentions, against `src/domain/vocabulary/data/vocabulary.json` (5454 entries, 5276 distinct Thai spellings):

| Word | Script romanisation | Corpus romanisation | English (corpus) | rank | Notes |
|---|---|---|---|---|---|
| คน | khon | khon | person | 47 | |
| ลง | long | long | down | 90 | |
| ตก | dtòk | dtòk | fall | 447 | |
| จบ | jòp | jòp | end | 547 | script glosses "to finish" |
| นก | nók | nók | bird | 859 | |
| ผล | phǒn | phǒn | results | 272 | |
| ยก | **yók** | **jók** | lift; raise | 254 | **corpus disagrees — see Risks** |
| ถนน | thà-nǒn | thà-nǒn | road | 589 | script glosses "street" |
| ขนม | khà-nǒm | khà nǒm | candy | 1502 | script glosses "snack" |
| ตลก | dtà-lòk | dtà-lòk | funny | **1678** | |
| นคร | ná-khaawn | ná khaawn | city | 988 | |
| กร | gaawn | gaawn | worker; hand; sunlight | 1119 | |
| พร | phaawn | phaawn | blessing | **1723** | |
| กรรม | gam | gam | deed; karma | 1050 | |
| พรรค | phák | phák | party; group of people | 846 | |
| ของ | khǎawng | khǎawng | of | 17 | script glosses "thing/possession" |
| ชอบ | châawp | châawp | like | 86 | |
| บอก | bàawk | bàawk | tell | 128 | |
| สอง | sǎawng | sǎawng | two | 395 | |
| ตลอด | dtà-làawt | dtà làawt | throughout; always | 264 | |
| รวม | ruam | ruam | including | 298 | script glosses "to combine" |
| ดวง | duang | duang | spherical object | 1083 | script glosses "round object" |
| ขวด | khùat | khùat | bottle | **1691** | |
| ตรวจ | dtrùat | dtrùat | to check; examination | 885 | script glosses "to inspect" |
| วง | (none given) | wong | circle | 722 | |
| ทรง | (none given) | song | style, hairdo | 204 | |
| ทราย | (none given) | saai | sand | **1705** | |
| สน | sǒn (inside สนใจ) | — | — | — | **ABSENT from the corpus** |
| สนใจ | (none given) | sǒn jai | interested | 384 | |

**Outside a declared rank window:** none, because **no window is declared.** If the writer adds a `ranks:` line, note that the current examples span **rank 17 (ของ) to rank 1723 (พร)**, so any window narrower than `1-1723` would put existing examples outside it. Five words sit above 1600: ตลก 1678, ขวด 1691, ทราย 1705, พร 1723, ขนม 1502 (under). A `ranks: 1-1800` window would hold everything as written.

**Absent from the corpus:** **สน**, one word. It survives the suite only by exemption: `promotedLessons.test.ts:1341-1367` (the `it` block beginning at :1341) skips any run of exactly two consonants ("a spelling fragment the lessons quote — a cluster pair, นน, รร"). That same exemption covers คน ลง ตก จบ นก ผล ยก กร พร วง — ten of the lesson's examples are never looked up at all. Only the 3+-character words are actually gated on corpus presence, and all of those are present.

## Prerequisites

Position in the declared sequence (`src/domain/script/data/lessonSequence.ts:60-77`):

| Pos | id | legacy | required |
|---|---|---|---|
| 1-14 | lesson-01 … lesson-14 | 1-14 | true |
| **15** | **lesson-unwritten-vowels** | **26** | **true** |
| 16 | lesson-tone-marks | 29 | true |
| 17 | lesson-clusters | 27 | true |
| 18 | lesson-leading-consonants | 28 | true |
| 19 | lesson-numerals | 30 | false |

It is **the first lesson after the alphabet is complete** and the first of the four "machinery" lessons. The recorded rationale (`lessonSequence.ts:54-55`): "`lesson-unwritten-vowels` comes after lesson-14, whose letters (ฎ, ฏ) appear in its examples."

### Letters and vowels that must already be taught

Symbol-by-symbol, for every example word (character → teaching lesson → that lesson's sequence position):

| Word | Characters and their teaching position |
|---|---|
| คน | ค=L6@p6, น=L1@p1 |
| ลง | ล=L8@p8, ง=L2@p2 |
| ตก | ต=L9@p9, ก=L3@p3 |
| จบ | จ=L9@p9, บ=L3@p3 |
| นก | น=p1, ก=p3 |
| ผล | ผ=L12@p12, ล=p8 |
| ยก | ย=L2@p2, ก=p3 |
| ถนน | ถ=L12@p12, น=p1, น=p1 |
| ขนม | ข=L12@p12, น=p1, ม=L1@p1 |
| ตลก | ต=p9, ล=p8, ก=p3 |
| นคร | น=p1, ค=p6, ร=L8@p8 |
| กร | ก=p3, ร=p8 |
| พร | พ=L5@p5, ร=p8 |
| กรรม | ก=p3, ร=p8, ร=p8, ม=p1 |
| พรรค | พ=p5, ร=p8, ร=p8, ค=p6 |
| ของ | ข=p12, อ=L11@p11, ง=p2 |
| ชอบ | ช=L4@p4, อ=p11, บ=p3 |
| บอก | บ=p3, อ=p11, ก=p3 |
| สอง | ส=L12@p12, อ=p11, ง=p2 |
| ตลอด | ต=p9, ล=p8, อ=p11, ด=L3@p3 |
| รวม | ร=p8, ว=L2@p2, ม=p1 |
| ดวง | ด=p3, ว=p2, ง=p2 |
| ขวด | ข=p12, ว=p2, ด=p3 |
| ตรวจ | ต=p9, ร=p8, ว=p2, จ=p9 |
| วง | ว=p2, ง=p2 |
| ทรง | ท=L7@p7, ร=p8, ง=p2 |
| ทราย | ท=p7, ร=p8, า=L1@p1, ย=p2 |
| สน | ส=p12, น=p1 |
| สนใจ | ส=p12, น=p1, ใ=L10@p10, จ=p9 |

**No example uses a glyph taught later.** The latest glyph prerequisites are ผ ถ ข ส, all from `lesson-12` at position 12 — three positions before this lesson. The full prerequisite set is:

- **Consonants:** ก ข ค ง จ ช ด ต ถ ท น บ ผ พ ม ย ร ล ว ส (20 letters)
- **Vowels/signs written on the page:** า (L1), ใ (L10), and อ in its consonant role (L11)
- **No tone marks are used by any example** — deliberate, since `lesson-tone-marks` is position 16, *after* this one.

### Examples using something taught later — three, all rules rather than glyphs

The AC6 glyph sweep (`sequenceClosure.test.ts:707-726`) only checks characters, so these pass it while still asking the learner for knowledge they do not have:

1. **ทรง and ทราย (the `two-readings` retrieval slide) need the ทร → s rule, which is `tho-ro-s-sound`, `lesson: 27` — `lesson-clusters` at position 17, two positions later.** The corpus reads ทรง as `song` and ทราย as `saai`, both with an s. The slide avoids romanising either word, so the collision stays hidden — but a learner at position 15 who applies the lesson's own rule to ทรง gets *throng*, not *sǒng*, and nothing on the slide tells them otherwise. This is the sharpest forward reference in the lesson, and the writer should decide deliberately whether to keep it, flag it, or replace the pair.
2. **ตรวจ (on the `w-as-vowel` slide) contains the true cluster ตร.** That one is fine: `consonant-clusters` is introduced at `lesson: 10` (`symbols.ts:3292-3296`), position 10, and `lesson-10.md:73-77` names it explicitly.
3. **สนใจ (on the `which-reading-wins` slide) is a leading-consonant word.** `akson-nam` carries `lesson: 19` in `symbols.ts:585`, a **retired** legacy number (absorbed by `lesson-14`, `lessonSequence.ts:105`), and the lesson that actually teaches it is `lesson-leading-consonants` at **position 18**. The slide uses สนใจ only to make a syllable-counting point ("สน in สนใจ is one syllable, sǒn, and not two"), which is arguably fair at this position — but the word is not fully readable until three lessons later.

## Cross-lesson hooks

Every place in `content/lessons/*.md` that promises this lesson. This is what it has to pay off.

**1. `content/lessons/lesson-03.md:342`** — the นก reveal, the earliest promise in the course:

> "Two letters, and no written vowel anywhere. Thai does that, and a later lesson explains why."

**2. `content/lessons/lesson-06.md:257`** — the คน reveal:

> "Two letters, no vowel written between them at all — which is a thing Thai does and which has a lesson of its own coming. The buffalo, and the mouse's letter. There is a short vowel in there that nobody bothered to write."

and its bullets, `lesson-06.md:258-259`:

> "Buffalo, then the mouse's letter, and nothing written between."
> "Thai leaves a short vowel out there."

**3. `content/lessons/lesson-09.md:13`** — in the header comment, naming this lesson as the owner:

> "โ-ะ's with-final form is written with nothing at all, which is the implicit vowel `lesson-unwritten-vowels` owns — named here and taught there."

**4. `content/lessons/lesson-09.md:48`** — the strongest promise, and the one that sets the scope:

> "That is not a quirk of three words. Two bare consonants side by side with no vowel written between them are read with this vowel, every time, and the full rule — **including what happens with three consonants** — has a lesson to itself."

Lesson 9 also pre-answers the two-letter case at `lesson-09.md:46-49` and `:57-58` — คน, ตก and จน are already worked there, with "The short o of โ-ะ, unwritten" and "One syllable … the vowel between them is never spelled out". **So the implicit-o reading is not new material by the time this lesson runs.** The debt lesson 9 leaves specifically outstanding is the **three-consonant** case, which is this lesson's `implicit-a` slide.

**5. `content/lessons/lesson-10.md:77`** — pairs the two readings and points forward:

> "Until then: two consonants with nothing between them are either a cluster or an unwritten vowel, and last lesson gave you the other one."

**6. `content/lessons/lesson-14.md:69`** — the close of the alphabet, naming this lesson first in the queue:

> "What remains for the course is machinery, not letters: the vowels that are not written, the tone marks, clusters, and the leading consonants."

**7. `content/lessons/lesson-11.md:34`** — not a promise but a **prior payment**, and the writer needs to know it:

> "Put อ after a consonant with no vowel written, and it stops being silent and becomes a long aaw — a yawn with the jaw dropped all the way."

Lesson 11 already teaches the `o-as-vowel` reading in full, with its own examples (พอ รอ ตอน นอน มอง at `lesson-11.md:35`) and its own retrieval slide (`:39-42`). `symbols.ts:3307` records `specialRulesIntroduced: ["o-ang-dual-role"]` for lesson 11. **The `o-as-vowel` slide in this lesson is therefore consolidation, not introduction** — the sixth reading of six, but the second time the learner meets it. `lesson-06.md:227` ("It is a real letter with a real name and a job of its own and it gets a whole lesson later on") is a promise about อ that lesson 11 pays, not this one.

**Promises this lesson does NOT owe, checked and cleared:** nothing anywhere promises the ว-as-ua reading, the bare final ร, or ร หัน. `lesson-clusters.md:28` ("Speak both, left to right, with no vowel wedged between them") is forward-facing from a later lesson, not a debt. Those three readings arrive with no prior mention and must be motivated from scratch.

## Risks

**1. SHORT-WORD RISK — eleven examples under 3 Thai characters:**

คน (2), ลง (2), ตก (2), จบ (2), นก (2), ผล (2), ยก (2), กร (2), พร (2), วง (2), สน (2).

That is every example on the `implicit-o` slide, both on `bare-final-ro`, the retrieval word, the ว contrast, and the syllable-counting word — the structural core of the lesson. They cannot be swapped out for longer ones without breaking the derivations: `implicit-o`'s test shape *requires* `word.length === 2`, and `bare-final-ro`'s requires `word.length === 2 && word[1] === "ร"` (`promotedLessons.test.ts:332-345`). **A 2-character word is not a defect here; it is the shape the rule is about.**

The premise as handed to me does not match the pipeline, so here is the measurement rather than the assumption. **There is no 3-character floor anywhere in the deck pipeline** — I grepped `scripts/lesson_deck/` for one and found none. What exists is the opposite: a carrier route built specifically for short Thai. `scripts/lesson_deck/vendor.py:954-961`:

```python
#: Below this many Thai characters, a request gets a carrier. Above it the
#: text is its own context and needs no help; a long sentence also gives the
#: trim more chances to cut in the wrong place, so it is left alone.
#:
#: Twelve is above every letter name in the alphabet (`วอ แหวน` is six) and
#: above the vocabulary this teaches one word at a time, and well below a
#: narration sentence.
CARRIER_LIMIT = 12
```

Twelve characters or fewer is synthesised as `ขอโทษ ค่ะ [pause] <text> [pause] ขอบคุณ ค่ะ` and cut out on word timings (`vendor.py:1021-1035`); the transcribe-back reading kept is the one taken inside the carrier (`vendor.py:1039-1069`). Measured outcome, `vendor.py:986-990`:

```
bare request, one seed      1 of 5
bare request, eight seeds   3 of 5
carrier, cut on silence     1 of 5   (and one clip cut to nothing)
carrier, cut on timings     5 of 5
```

What the pipeline documents as genuinely unverifiable is the isolated **letter name** (`มอ ม้า` → `หมอ ม้า`, five of five native recordings rejected, `vendor.py:1045-1057`), not the short word. Every word in this lesson is a real ranked Thai word except สน.

**The risk does not currently bind at all**, and the writer should know why: the script contains **zero** `narration:`, `thai:` and `recording:` lines (`grep -n "^thai:\|^narration:\|^recording:"` returns only the single `rule:` line). Bullets become deck body text, not audio (`script_parser.py:145-150`). `public/lessons/lesson-unwritten-vowels/manifest.json` holds `"assets": []`. **No clip has ever been generated for this lesson, so nothing has ever been through the gate.** The short-word question only becomes live if the rewrite adds Thai narration, and at that point the carrier route is what it will take.

One case that would be a real problem if narrated: **สน**, which is not a word. A transcriber asked to hear สน in a carrier will hand back the nearest real word, which is exactly the failure mode `reading_of` documents for letter names. If the rewrite narrates the `which-reading-wins` slide, narrate สนใจ, not สน.

**2. Examples absent from `vocabulary.json` — one: สน.**

Confirmed by lookup against all 5454 entries. It is a syllable the lesson quotes out of สนใจ (rank 384), not a standalone word. It passes the suite only because `promotedLessons.test.ts:1341-1367` (the `it` block beginning at :1341) exempts every 2-consonant run from the corpus check. If that exemption ever narrows — or if this lesson is ever added to `NEW_LESSON_IDS`, whose sweep at `sequenceClosure.test.ts:776-777` has no such exemption — **สน fails immediately** with "สน is not in vocabulary.json". Every other example is present and ranked.

**3. ยก's romanisation is wrong in the corpus, and the lesson is right.**

`vocabulary.json` rank 254 gives ยก as **`jók`**. ย is `y`; the word is `yók`, which is what the script writes at `lesson-unwritten-vowels.md:34`. The tone (high) agrees; only the onset letter differs. The lesson currently escapes the contradiction because ยก is a 2-consonant run and is never looked up, and because ยก is not in `AC4_SAMPLE` (`promotedLessons.test.ts:874-934`) — the list of 51 words whose reading *is* checked against the corpus's own romanisation by `expectWordReads` (`:950-976`). **Do not add ยก to AC4_SAMPLE, and do not "correct" the lesson to match the corpus.** The corpus entry is the thing that is wrong.

**4. The lesson's rank spread has nothing keeping it honest.**

With no `ranks:` line and no rank assertion in `promotedLessons.test.ts`, examples at rank 1678, 1691, 1705 and 1723 sit alongside rank 17 and rank 47 with nothing flagging the spread. Neighbouring lessons declare 1-1500 (`lesson-12`, `lesson-13`, `lesson-tone-marks`) and 1-2700 (`lesson-14`). Four of this lesson's examples would be outside a 1-1500 window. Worth a deliberate decision rather than an accident.

**5. Two rules rest on exactly two examples each.**

`bare-final-ro` (กร, พร) and `ro-han` (กรรม, พรรค) both derive with `evidence === 2`, and `promotedLessons.test.ts:1199-1202` requires `evidence > 1`. **Removing one example from either breaks the test suite.** The other four rules have 3-6 examples and some slack. If the rewrite wants to trim, trim `implicit-o` (6) or `o-as-vowel` (4), never these two — and note that a third `bare-final-ro` example would have to be a 2-character word ending in ร, which `กร`/`พร` may nearly exhaust at usable frequency.

**6. Every romanisation printed on a rule slide is machine-read.**

`examplePairs` scoops up **any** `ThaiWord (romanisation)` pattern in a slide body, and `deriveUnwrittenVowel` refuses if the qualifying examples disagree (`residues.size !== 1` → "the lesson does not state this reading"). So an added example, a changed transcription, even an incidental `word (gloss)` parenthesis containing Thai on one of the six rule slides can break the derivation. The header comment already warns about removal; **addition and re-transcription are equally load-bearing** and the header does not say so.

## Assets

**Images: none.** `content/lessons/images/lesson-unwritten-vowels/` **does not exist** (`ls` → "No such file or directory"). The image directory holds seven lessons only:

```
content/lessons/images/lesson-01/    28 files
content/lessons/images/lesson-02/    17
content/lessons/images/lesson-03/    14
content/lessons/images/lesson-04/    13
content/lessons/images/lesson-05/    13
content/lessons/images/lesson-06/    12
content/lessons/images/orientation/  14
```

**`scene:` lines: 0.** `grep -c "^scene:" content/lessons/lesson-unwritten-vowels.md` → 0. Lessons 01-06 and orientation carry 12-21 `scene:` lines each; every lesson from 07 onward, this one included, carries none.

`public/lessons/lesson-unwritten-vowels/` holds only `deck.json` and `manifest.json` — no `audio/` or `images/` subdirectory. The containment test at `promotedLessons.test.ts:1296-1339` asserts that every file on disk in that directory is referenced by a slide and that every manifest asset exists, so an image or clip added must be wired into the deck in the same change.
