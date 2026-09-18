# Scoping: lesson-tone-marks

Source skeleton: `content/lessons/lesson-tone-marks.md` (75 lines, 11 `##` slides).
Built deck: `public/lessons/lesson-tone-marks/deck.json` (no audio, no images).
Sequence **position 16** of 19; `legacyNumber: 29`
(`src/domain/script/data/lessonSequence.ts:76`) — i.e. it sits after lesson-14 and after
`lesson-unwritten-vowels`, and before `lesson-clusters` and `lesson-leading-consonants`.

This lesson is governed by its own dedicated test file,
`src/domain/script/data/toneMarkLesson.test.ts` (473 lines), **not** by
`middleBand.test.ts` (whose `BAND` is lessons 06-11 only). That test parses the lesson's
own prose with regexes — see Risks, which is the most important section of this report.

## Declares

HTML comment header, `content/lessons/lesson-tone-marks.md:5-20`, verbatim:

```
Phase 4, task 4.2. The source course spread these eight cells across six
lessons with unrelated letters between them — mid class in lessons 17-18,
temple (high) class in 21-22, harbor (low) class in 23-24. Stated together the
whole table is one pattern: the market takes all four marks in order, the
temple and the harbor only ever take two, and the harbor is the one that
swaps them. This lesson states it in one place.
previews: none
ranks: 1-1500

toneMarkLesson.test.ts derives the twelve cells, the corpus-word resolver and
the rank window straight out of this deck's own text — never out of
toneMarkTable.ts — so a lesson that states the table incompletely fails even
though the underlying data is correct. Thinning any one class's slide is
enough to break the resolver test, by design.
```

Quoted verbatim as required:
- `previews: none`
- `ranks: 1-1500` — **note this is a tighter window than lessons 10 and 11 (1-2000).**

There is **no `teaches:` line**.

### Lessons-table row

`src/domain/script/data/symbols.ts:3364-3380`:

```ts
{
    number: 29,
    title: "The Eight-Cell Tone-Mark Table",
    focus:
        "All four tone marks against all three consonant classes, as one pattern",
    consonants: [],
    vowels: [],
    toneMarks: ["่", "้", "๊", "๋"],
    toneRulesIntroduced: [],
    specialRulesIntroduced: [
        "tone-mark-placement",
        "mai-tri-chattawa-middle-only",
    ],
},
```

No `videoUrl` — this lesson has no source video; it replaced legacy lessons 17-18 and
21-24 (`lessonSequence.ts:103-104`: `{ legacyNumber: 17, absorbedBy: "lesson-tone-marks" }`,
`{ legacyNumber: 18, absorbedBy: "lesson-tone-marks" }`).

### Rules declared, as the `rule:` slides render them

`rule: tone-mark-placement` (script line 66) — `symbols.ts:608-615`:

```ts
id: "tone-mark-placement",
title: "Tone Mark Placement Rules",
description:
    "Tone marks go above the initial consonant. If a vowel is above the consonant, the tone mark goes above the vowel. For consonant clusters, the tone mark goes over the second consonant, but the class of the first consonant determines the tone. Tone marks override all spelling-based tone rules.",
lesson: 29,
```

`rule: mai-tri-chattawa-scope` (slide id) / `rule: mai-tri-chattawa-middle-only` (rule id)
(script lines 68-69) — `symbols.ts:615-622`:

```ts
id: "mai-tri-chattawa-middle-only",
title: "Mai Tri and Mai Chattawa: Middle Class Only",
description:
    "ไม้ตรี (mai tri) and ไม้จัตวา (mai chattawa) are only used with middle class consonants. They are never used with high or low class consonants.",
lesson: 29,
```

Note the slide heading id and the rule id differ here (`mai-tri-chattawa-scope` vs
`mai-tri-chattawa-middle-only`); every other `rule:` slide in the repo uses the same
string for both. That is deliberate in the skeleton, not a typo to "fix".

## Consonants

**This lesson declares no consonant.** `consonants: []` and `vowels: []` in the lessons
row. It declares only the four tone marks. Nothing to report from
`consonant-scenes.json`.

## The full set of tone marks, and what `symbols.ts` says about each

Source: `src/domain/script/data/symbols.ts:2116-2183`, the `toneMarks` array, under the
section header `// Tone Marks (the consolidated tone-mark lesson)`. There are exactly
four; the array is the complete inventory.

### ่ — mai ek (`symbols.ts:2117-2133`)

```ts
character: "่",
name: "mai ek",
midClassTone: "low",
highClassTone: "low",
lowClassTone: "falling",
audioUrl: "/thai-script/audio/tone-mayek.mp3",
priority: 1,
lesson: 29,
sceneMnemonic: {
    shapeCue: "A single short stick above the letter — one stroke, mark one.",
    soundCue:
        "The voice steps down and lies flat along the floor of your range — though over a harbor letter the same stick tips into a fall; the class, not the mark, has the last word.",
    toneMotion: "low",
},
```

### ้ — mai tho (`symbols.ts:2134-2149`)

```ts
character: "้",
name: "mai tho",
midClassTone: "falling",
highClassTone: "falling",
lowClassTone: "high",
audioUrl: "/thai-script/audio/tone-maytho.mp3",
priority: 2,
lesson: 29,
sceneMnemonic: {
    shapeCue: "A hooked flag above the letter — two bends, mark two.",
    soundCue:
        "The voice climbs its crest and tips over into a fall — over a harbor letter it parks high instead.",
    toneMotion: "falling",
},
```

### ๊ — mai tri (`symbols.ts:2150-2166`)

```ts
character: "๊",
name: "mai tri",
midClassTone: "high",
highClassTone: null,
lowClassTone: null,
audioUrl: "/thai-script/audio/tone-maytri.mp3",
priority: 3,
lesson: 29,
sceneMnemonic: {
    shapeCue:
        "A small kinked peak floating above — mark three, worn by market letters only.",
    soundCue:
        "The voice parks up high and stays there; it mostly rides borrowed words — menu Thai in particular.",
    toneMotion: "high",
},
```

### ๋ — mai chattawa (`symbols.ts:2167-2183`)

```ts
character: "๋",
name: "mai chattawa",
midClassTone: "rising",
highClassTone: null,
lowClassTone: null,
audioUrl: "/thai-script/audio/tone-mayjattawa.mp3",
priority: 4,
lesson: 29,
sceneMnemonic: {
    shapeCue:
        "A little cross floating above — four points, mark four, again market letters only.",
    soundCue:
        "The voice dips and then swings upward — the rarest ride in the tone system.",
    toneMotion: "rising",
},
```

### The twelve-cell table, read off those four records

| | market (mid) | temple (high) | harbor (low) |
|---|---|---|---|
| ่ mai ek | low | low | **falling** |
| ้ mai tho | falling | falling | **high** |
| ๊ mai tri | high | `null` (unreachable) | `null` (unreachable) |
| ๋ mai chattawa | rising | `null` (unreachable) | `null` (unreachable) |

Eight resolved, four `null`. The skeleton's three class slides state exactly this and the
test asserts the agreement cell by cell — see Risks.

The Thai names in Thai script appear in the rule description only:
`ไม้ตรี` (mai tri) and `ไม้จัตวา` (mai chattawa) at `symbols.ts:619`. `symbols.ts`
carries no Thai spelling for mai ek or mai tho. `ไม้ยมก` appears at `symbols.ts:554` but
belongs to lesson 10.

## Shipped recordings (each verified with `ls`/`stat`)

| mark | `audioUrl` in symbols.ts | file on disk | verified |
|---|---|---|---|
| ่ mai ek | `/thai-script/audio/tone-mayek.mp3` | `public/audio/tone-mayek.mp3` | **EXISTS**, 5373 bytes |
| ้ mai tho | `/thai-script/audio/tone-maytho.mp3` | `public/audio/tone-maytho.mp3` | **EXISTS**, 6670 bytes |
| ๊ mai tri | `/thai-script/audio/tone-maytri.mp3` | `public/audio/tone-maytri.mp3` | **EXISTS**, 6526 bytes |
| ๋ mai chattawa | `/thai-script/audio/tone-mayjattawa.mp3` | `public/audio/tone-mayjattawa.mp3` | **EXISTS**, 7250 bytes |

All four exist. **Note the spelling of the fourth: `tone-mayjattawa.mp3`** — `mayj`, not
`maych` and not `maychattawa`. Confirmed by `ls public/audio/ | grep tone-`, which
returns exactly these four files and no others.

No consonant or vowel recordings are needed — none is declared.

## Example words and ranks

Every Thai word the skeleton mentions, with `rank` from
`src/domain/vocabulary/data/vocabulary.json`. Declared window is **1-1500**.

| word | romanisation | English | rank | Thai chars | mark | class | in window |
|---|---|---|---|---|---|---|---|
| ไก่ | gài | chicken | 427 | 3 | mai ek | mid | yes |
| เก้า | gâo | nine | 402 | 4 | mai tho | mid | yes |
| โต๊ะ | dtó | table | 1199 | 4 | mai tri | mid | yes |
| เดี๋ยว | dǐao | soon; shortly | 1462 | 6 | mai chattawa | mid | yes |
| ข่าว | khàao | news | 718 | 4 | mai ek | high | yes |
| ให้ | hâi | give | 12 | 3 | mai tho | high | yes |
| ล่าง | lâang | lower; below; under | 808 | 4 | mai ek | low | yes |
| ม้า | máa | horse | 1352 | 3 | mai tho | low | yes |
| ตั๋ว | dtǔua | ticket | 651 | 4 | mai chattawa | mid | yes |

**No word is outside the window and no word is absent from the corpus.**

Duplicate corpus entries (same `thai`, adjacent ranks — the map keeps the first):
ไก่ at 427 and 428; โต๊ะ at 1199 and 1200; ตั๋ว at 651, 652, 653 and 654.
`vocabularyByThai` is built with `new Map(vocabulary.map(...))`, so the **last** entry
wins — ไก่ resolves to 428, โต๊ะ to 1200, ตั๋ว to 654. All still inside 1-1500.

Gloss divergences (only `rank` is asserted):
- เดี๋ยว — skeleton `"in a moment."`; corpus `english` is `soon; shortly`.
- ล่าง — skeleton "below"; corpus "lower; below; under".

**Headroom is thin at the top.** เดี๋ยว at 1462 sits 38 ranks below the declared ceiling
of 1500, and ม้า at 1352 and โต๊ะ at 1199/1200 are next. Three of the eight AC3 sample
words are above rank 1150. Any new example word the narration introduces must be under
1500 — a materially harder constraint than lessons 10 and 11 face.

### The eight words are not free choices — they are hard-coded in the test

`toneMarkLesson.test.ts:283-296`, `AC3_SAMPLE`:

```ts
const AC3_SAMPLE: readonly MarkedWord[] = [
    { thai: "ไก่", toneMarkName: "mai ek", consonantClass: ThaiSymbolClass.Mid },
    { thai: "เก้า", toneMarkName: "mai tho", consonantClass: ThaiSymbolClass.Mid },
    { thai: "โต๊ะ", toneMarkName: "mai tri", consonantClass: ThaiSymbolClass.Mid },
    { thai: "เดี๋ยว", toneMarkName: "mai chattawa", consonantClass: ThaiSymbolClass.Mid },
    { thai: "ข่าว", toneMarkName: "mai ek", consonantClass: ThaiSymbolClass.High },
    { thai: "ให้", toneMarkName: "mai tho", consonantClass: ThaiSymbolClass.High },
    { thai: "ล่าง", toneMarkName: "mai ek", consonantClass: ThaiSymbolClass.Low },
    { thai: "ม้า", toneMarkName: "mai tho", consonantClass: ThaiSymbolClass.Low },
];
```

Those eight are exactly the eight the skeleton's class slides already use, one per
resolved cell. The test resolves each word's tone through the **lesson's own stated
table** and compares against `entry.syllables[0].tone` from the corpus. Removing or
replacing any of the eight from the class slides does not fail this list directly — the
list lives in the test — but a class slide that stops stating the corresponding cell
makes `resolveFromLesson` return `undefined` and the assertion fails.

ตั๋ว (used in the `which-tone-a` retrieval prompt) is the ninth word and is **not** in
`AC3_SAMPLE`; it is only rank-checked.

### Forward-reference check

Every character in these nine words is taught before sequence position 16:
ไ (lesson 10), เ-ีย in เดี๋ยว (lesson 12), โ-ะ in โต๊ะ (lesson 9), -ัว in ตั๋ว (lesson 14),
ข and ห (lesson 12), ล (lesson 8), ม (lesson 1), ก (lesson 3), ต (lesson 9), ว (lesson 2),
ง (lesson 2), ย (lesson 2), า (lesson 1). เดี๋ยว and ตั๋ว both depend on lessons 12 and
14 respectively, which is precisely why this lesson is sequenced where it is.

`toneMarkLesson.test.ts:152-175` asserts this formally: every rule in `toneRules` must
name a lesson whose sequence `position` is **less than** this lesson's. So the position
is load-bearing and cannot move earlier.

## Risks

**1. LENGTH PAIRS — none, and not applicable.** This lesson declares no vowel
(`vowels: []`). The `length` field does not arise. The four tone marks are not a length
system.

**2. SHORT-WORD RISK — none.** The shortest words are ไก่, ให้ and ม้า, each 3 Thai
characters. No 2-character word appears. This is the only one of the three lessons scoped
with no short-word exposure at all.

For context on why the threshold matters elsewhere: a `narration: th <word>` is
synthesised, transcribed back, and must clear `TRANSCRIPT_MATCH_RATIO = 0.9`
(`scripts/lesson_deck/pipeline.py:107`) on a `difflib.SequenceMatcher` ratio
(`pipeline.py:195-203`). At 3 characters a single character of disagreement scores 0.67
and fails, so even these words need an exact transcription — but they are not in the
2-character danger zone.

**3. Declared symbols with no example word — none.**
- ่ mai ek → ไก่, ข่าว, ล่าง (one per class — the mark appears in all three class slides)
- ้ mai tho → เก้า, ให้, ม้า (one per class)
- ๊ mai tri → **โต๊ะ only.** One word carries the whole mark.
- ๋ mai chattawa → เดี๋ยว, ตั๋ว

๊ mai tri is the thinnest. It is defensible — the mark genuinely is market-only and
mostly loanwords (`soundCue`: *"it mostly rides borrowed words — menu Thai in
particular"*) — but if a second example is wanted it must be a mai-tri word under rank
1500, and โต๊ะ at 1199/1200 is already near the ceiling.

**4. THE BIGGEST RISK: the test parses the lesson's prose with regexes. Rewording
breaks it.**

This is not the usual "must use the symbol" check. `toneMarkLesson.test.ts` reconstructs
the entire twelve-cell table by regex from three specific slides, and never consults
`toneMarkTable.ts`. The narration writer is editing a machine-read surface.

**(a) The three class slides have fixed ids** (`toneMarkLesson.test.ts:88-92`):

```ts
const CLASS_SLIDES: Readonly<Record<ThaiSymbolClass, string>> = {
    [ThaiSymbolClass.Mid]: "mid-class-marks",
    [ThaiSymbolClass.High]: "high-class-marks",
    [ThaiSymbolClass.Low]: "low-class-marks",
};
```

Renaming any of the three slide ids throws (`slide()` at `:60-64` throws on a missing
id). The skeleton's ids match.

**(b) Each resolved cell must be stated in one bullet matching this regex**
(`toneMarkLesson.test.ts:101-102`):

```js
/mai (ek|tho|tri|chattawa)\b[^.]*?\bgives\b[^.]*?\b(low|falling|high|rising)\b/i
```

Read literally, a bullet must contain, **in this order and within one sentence** (no `.`
between them): the mark's name as `mai ek` / `mai tho` / `mai tri` / `mai chattawa`, then
the literal word **`gives`**, then one of `low` / `falling` / `high` / `rising`.

The skeleton's bullets are built to this shape, e.g.
`content/lessons/lesson-tone-marks.md:30`: *"mai ek (่) gives low tone. ไก่ (gài) is
chicken."* — the mark name, `gives`, the tone, then a full stop, then the example.

Things that break it:
- "mai ek **produces** low tone" / "**yields**" / "**lands on**" — no `gives`, cell lost.
- "low tone **comes from** mai ek" — wrong order, cell lost.
- "mai ek **(่)** gives, over a market letter, a low tone" — still fine (`[^.]*?` spans it).
- "mai ek. It gives low tone." — the `.` splits it, cell lost.
- Stating the tone before the word `gives` — cell lost.
- Any bullet in the **wrong class slide** silently writes into that class's map.

Worse, this is *silent*: `resolvedCellsFromLesson` (`:113-127`) does `if (!match)
continue;`. A reworded bullet does not error — the cell just disappears, and the failure
surfaces as `"<class>/<mark> is resolved in toneMarkTable.ts but the lesson never states
it"` (`:210-212`) with `resolvedChecked` short of 8.

Note also: the regex takes the **last** matching bullet per mark per slide, because
`resolved.set(mark, ...)` overwrites. Two bullets naming the same mark on one class slide
and disagreeing means the later one wins silently.

**(c) The unreachable statement is its own fixed phrase** (`toneMarkLesson.test.ts:104-105`):

```js
/mai tri and mai chattawa never sit over a (?:temple|harbor) letter/i
```

Both the high-class and low-class slides must each contain that exact phrasing, matched
against `heading + body` joined (`textOf`, `:68-71`). The skeleton satisfies it twice:
- `lesson-tone-marks.md:40`: *"mai tri and mai chattawa never sit over a temple letter in standard spelling."*
- `lesson-tone-marks.md:47`: *"Mai tri and mai chattawa never sit over a harbor letter either, for the same reason as the temple: not used in standard spelling."*

Both must survive rewriting **word for word up to `letter`**. `"neither mai tri nor mai
chattawa"` fails. `"never sit above a temple letter"` fails (`over`, not `above`).
`"never sit over temple letters"` fails (singular `letter`, and the article `a` is
required). Note the American spelling **`harbor`** — the rest of this course's prose uses
British spellings, so this is a genuine trap.

**(d) The same slides must state no tone for an unreachable cell**
(`toneMarkLesson.test.ts:232-234`): a bullet on the high or low slide matching
`CELL_LINE` for mai tri or mai chattawa would fail. So the writer must talk about those
two marks on those slides — the unreachable phrase requires it — **without** ever writing
`mai tri … gives … <tone>` there. The skeleton threads this correctly.

**(e) All four names and all three district words must appear somewhere in the deck**
(`toneMarkLesson.test.ts:243-252`):

```ts
for (const name of TONE_MARK_NAMES) expect(allText, name).toContain(name);
expect(allText).toMatch(/market/);
expect(allText).toMatch(/temple/);
expect(allText).toMatch(/harbor/);
```

Again **`harbor`**, American spelling, and the literal lowercase strings `market`,
`temple`, `harbor` must appear in `textsOf()` — which is `deck.title`, `slide.heading`,
`slide.prompt`, `slide.body`, `slide.answers`, and **not narration**. Verified against the
built deck: a `rule` slide carries only `{kind, id, ruleId}`, so rule descriptions are
outside the sweep entirely.

**(f) `TONE_MARK_NAMES` is imported from `toneMarkTable.ts`**, so the four names must be
spelled exactly as that module spells them — the same four strings used in
`symbols.ts` (`mai ek`, `mai tho`, `mai tri`, `mai chattawa`).

**5. The rank window is tighter than the neighbouring lessons.** 1-1500, versus 1-2000
for lessons 10 and 11. AC4 (`toneMarkLesson.test.ts:345-390`) sweeps every Thai run of
≥2 characters in `textsOf()` (regex `/[ก-๙]+/g`) and requires each to be in
`vocabulary.json` **with a non-null rank inside 1-1500**. A word with `rank: null` fails
explicitly (`"<run> has no frequency rank"`), which matters because 60-odd ใ-words and
many phrasebook entries in the corpus have `rank: null`.

Note the run regex here is `[ก-๙]+` with **no consonant requirement**, unlike
`middleBand.test.ts`'s `thaiWordsIn`. A bare 2-character vowel fragment printed in a
bullet (`าะ`, `ั้`) would be treated as a word and fail. Printing a bare tone mark is
safe — a 1-character run is skipped (`if (characters.length === 1) continue;`).

**6. Originality check (AC5).** `toneMarkLesson.test.ts:396-419` runs
`checkOriginality` on **every** string in `textsOf()` and fails on any n-gram overlap
with `src/domain/script/data/originality-corpus.json` (the source transcripts). This
lesson consolidates six source-course lessons, so its subject matter is the most heavily
covered by those transcripts of anything in the course — the highest originality risk of
the three lessons scoped.

**7. `tone-mark-placement` says tone marks override spelling rules.** Its description
ends: *"Tone marks override all spelling-based tone rules."* This directly qualifies
lesson-11's closing claim that a market syllable's tone can be worked out "from the page
alone". If the narration wants to reconcile the two, this is the slide where it happens.

## Which tone rules already exist as `rule:` ids across all lesson scripts

Exhaustive: `grep -rn "^rule: " content/lessons/`, all 25 occurrences, sorted by rule id.

| rule id | script | line | kind |
|---|---|---|---|
| `ao-ai-tone-exception` | lesson-10.md | 43 | special (tone-relevant) |
| `consonant-clusters` | lesson-10.md | 70 | special |
| `consonant-clusters` | lesson-clusters.md | 57 | special (restated) |
| `dead-endings` | lesson-03.md | 279 | syllable type |
| `gaaran` | lesson-13.md | 54 | special |
| `high-dead-long` | lesson-13.md | 32 | **tone rule** |
| `high-dead-short` | lesson-13.md | 29 | **tone rule** |
| `high-live` | lesson-12.md | 27 | **tone rule** |
| `hor-nam` | lesson-leading-consonants.md | 58 | special (tone-changing) |
| `live-endings` | lesson-02.md | 208 | syllable type |
| `low-dead-long` | lesson-05.md | 235 | **tone rule** |
| `low-dead-short` | lesson-04.md | 262 | **tone rule** |
| `low-live` | lesson-02.md | 222 | **tone rule** |
| `mai-han-akat` | lesson-04.md | 227 | special |
| `mai-tri-chattawa-middle-only` | **lesson-tone-marks.md** | 69 | special (this lesson) |
| `mai-yamok` | lesson-10.md | 61 | special |
| `mid-dead-long` | lesson-11.md | 58 | **tone rule** |
| `mid-dead-short` | lesson-11.md | 55 | **tone rule** |
| `mid-live` | lesson-03.md | 293 | **tone rule** |
| `o-ang-dual-role` | lesson-11.md | 24 | special |
| `obsolete-consonants` | lesson-14.md | 31 | special |
| `sara-am-properties` | lesson-13.md | 45 | special |
| `sara-uee-placeholder` | lesson-06.md | 219 | special |
| `tone-mark-placement` | **lesson-tone-marks.md** | 66 | special (this lesson) |
| `unwritten-vowels` | lesson-unwritten-vowels.md | 38 | special |

### The spelling-based tone rules, as a set — all nine exist and all precede this lesson

Every entry in `toneRules` (`symbols.ts:340-420`), in sequence order:

| rule id | class | syllable type | resulting tone | lesson | script line |
|---|---|---|---|---|---|
| `low-live` | Low | live | mid | 2 | lesson-02.md:222 |
| `mid-live` | Mid | live | mid | 3 | lesson-03.md:293 |
| `low-dead-short` | Low | dead-short | high | 4 | lesson-04.md:262 |
| `low-dead-long` | Low | dead-long | falling | 5 | lesson-05.md:235 |
| `mid-dead-short` | Mid | dead-short | low | 11 | lesson-11.md:55 |
| `mid-dead-long` | Mid | dead-long | low | 11 | lesson-11.md:58 |
| `high-live` | High | live | rising | 12 | lesson-12.md:27 |
| `high-dead-short` | High | dead-short | low | 13 | lesson-13.md:29 |
| `high-dead-long` | High | dead-long | low | 13 | lesson-13.md:32 |

**Every one of the nine has a `rule:` slide in a script, and every one is at a sequence
position before 16.** `toneMarkLesson.test.ts:152-175` asserts exactly this and would
fail if the sequence were reordered.

Two supporting rules also precede it and define the live/dead axis the table sits on:
`live-endings` (lesson-02.md:208) and `dead-endings` (lesson-03.md:279).

One tone-affecting rule comes **after**: `hor-nam` (`lesson-leading-consonants.md:58`,
sequence position 18), which lets ห make a low-class letter follow high-class rules.
Since it is *after*, this lesson cannot rely on it. `akson-nam` (`symbols.ts:585-592`,
`lesson: 19`) has **no `rule:` slide in any script** — it is declared in `symbols.ts`
only, and is the only special rule in that file with no slide anywhere.

## Cross-lesson hooks

Searched `content/lessons/lesson-0[1-6].md`.

### The one explicit tone-mark promise — `content/lessons/lesson-01.md:477`

This is the lesson's payoff, and it is made in the very first lesson. The slide is
`## exposition word-maa` (`lesson-01.md:277`), teaching มา against the ม้า in the
letter's own name. Verbatim:

> "narration: en Same consonant. Same vowel. Same length. The only thing separating the
> animal from the verb is the tone — and if you say one of them flat when it should not
> be, you have said the other. That is not a quirk of this one pair. It is how the
> language works, and it is exactly what a learner who skips the script never gets
> control of."

and then, `content/lessons/lesson-01.md:477`:

> "narration: en You are not expected to make that difference yet, and you do not yet
> have the mark that writes it down. Today you only need to have heard that the
> difference is real. **The rule that produces it and the mark that spells it are both
> coming.**"

with the bullets at `content/lessons/lesson-01.md:478-481`:

> - "The horse's letter, then the same long vowel. It means **to come**."
> - "The word for **horse** is the same letters again — only the *tone* differs."
> - "Say one flat when it should not be, and you have said the other."
> - "**The mark that writes that difference is coming.**"

**This lesson is that payoff, and the word is already in its example set.** ม้า (rank
1352) is the skeleton's low-class mai tho example (`lesson-tone-marks.md:45`: *"mai tho
(้) gives high tone here — again the opposite of the temple's falling. ม้า (máa) is
horse."*) — the same ม้า from lesson 1's very first consonant name, `ม ม้า`. The circle
closes exactly: lesson 1 promised the mark that separates มา from ม้า, and mai tho over
a harbour letter is that mark.

Worth noting for the writer: the ม ม้า scene in `consonant-scenes.json` is the first
entry in the file, and its narration ends *"the idling drone of the harbor itself"* —
the same American `harbor` the test regex requires.

### `content/lessons/lesson-01.md:176` — the live/dead groundwork

> "This letter has a characteristic that only a few consonants share, and it is worth
> naming now, because it comes back in a big way later. It is live. … That is a dead
> sound. This is not just trivia. It comes back when we get into the tone rules."

### `content/lessons/lesson-01.md:115` — the whole-course promise this lesson completes

> "mastering the tone rules lets you nail the pronunciation of a word just by knowing how
> it is spelled. The spelling tells you the tone."

Note the tension flagged in Risk 7: `tone-mark-placement` says marks **override** the
spelling rules. The narration has the opportunity — and arguably the obligation — to
reframe that promise rather than contradict it, since a written mark is itself part of
the spelling.

### No hook names the individual marks

Searched lessons 01-06 for `mai ek`, `mai tho`, `mai tri`, `chattawa`, `่`, `้`, `๊`, `๋`
and for `four marks`. **Nothing.** The `mark` hits in lessons 03-06 are all about vowel
marks, not tone marks:
- `lesson-03.md:246` (*"It sits on top of its consonant like a beret, and the brim flicks up"*) is สระ อี.
- `lesson-04.md:195` and `:233` are ั mai han akat.
- `lesson-05.md:181`/`:193` are ุ and ู.
- `lesson-06.md:177`/`:225` are ึ/ื and the อ prop.

So `lesson-01.md:477-481` is the **only** forward promise in the opening band that this
lesson pays off, and it is a strong one.

## Assets

**Images: none.** `content/lessons/images/lesson-tone-marks/` **does not exist**.
Existing image directories are `lesson-01` (28 files), `lesson-02` (17), `lesson-03`
(14), `lesson-04` (13), `lesson-05` (13), `lesson-06` (12), `orientation` (14).

**`scene:` lines: 0.** `grep -c '^scene:' content/lessons/lesson-tone-marks.md` → 0.
Likewise `## scene`.

Unlike lessons 10 and 11, there is **no `consonant-scenes.json` prompt to draw on** — the
lesson declares no consonant. The four `shapeCue` strings quoted above ("a single short
stick", "a hooked flag", "a small kinked peak", "a little cross floating above") are the
only visual material `symbols.ts` provides, and they describe glyph shapes rather than
memory-palace scenes. There is no district for the marks: `sceneMnemonic.district` is
absent on all four (only consonants carry one — `symbols.ts:21`: *"Class district the
image stages in — exactly the consonants carry one"*). They carry `toneMotion` instead
(`low`, `falling`, `high`, `rising`), which `symbols.ts:23` describes as *"Named tone
motion — exactly the tone-carrying records carry one."*

**Built deck:** `public/lessons/lesson-tone-marks/deck.json` (4356 bytes, 11 slides — the
smallest of the three). No audio, no images. `public/lessons/lesson-tone-marks/` holds
only `deck.json` and `manifest.json`.

Slide inventory, in order: `exposition one-table`, `exposition mid-class-marks`,
`exposition high-class-marks`, `exposition low-class-marks`, `retrieval which-tone-a`,
`reveal which-tone-a-answer`, `retrieval which-tone-b`, `reveal which-tone-b-answer`,
`rule tone-mark-placement`, `rule mai-tri-chattawa-scope`,
`exposition the-shape-of-the-table`.

**Asset rule, stated explicitly in this lesson's own test**
(`toneMarkLesson.test.ts:437-465`): every referenced asset must start with
`/thai-script/lessons/lesson-tone-marks/`, must not contain `..`, and must exist on
disk — **and every file committed in that directory other than `deck.json` and
`manifest.json` must be referenced by some slide**, or the test fails with
`"lesson-tone-marks/<name> is committed but no slide references it"`. An orphaned image
fails as hard as a missing one.
