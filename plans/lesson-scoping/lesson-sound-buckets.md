# Scoping: lesson-sound-buckets

Source script: `content/lessons/lesson-sound-buckets.md`
Built deck: `public/lessons/lesson-sound-buckets/deck.json`, `public/lessons/lesson-sound-buckets/manifest.json`

**Read this first:** this lesson is structurally unlike the other two. It has **no `rule:` slide**, **no row in the `lessons` table**, and **no position in `lessonSequence`**. It is committed, schema-valid, and unreachable from any route.

## Declares

Title line: `# Two buckets you can hear, and one you cannot`
Lesson id line: `lesson: lesson-sound-buckets`

HTML comment header, verbatim:

```
Opening band, sits after lesson-05. Introduces no new symbol: it re-sorts the
twelve consonants already taught into the three phonetic buckets, and teaches
the naming pattern behind every consonant's name.

previews: ห — the low-side rule needs a name for the repair a partnerless
hummed letter uses, and refusing to name it would leave the rule's second half
unusable. The glyph is shown, no class is claimed for it, and it is taught in
its own lesson later.
previews: อ — the naming pattern is the vowel aaw plus an acrophonic word, and
the letter that carries that vowel is อ. Shown so the pattern is complete; no
class is claimed for it, and it is taught in its own lesson later.
```

`previews:` lines, verbatim (`content/lessons/lesson-sound-buckets.md:10-16`) — note both are multi-line; the parser reads only the first physical line of each (`openingBand.test.ts:178-189`, regex `/^previews:\s*(.+)$/gm`, split on `—`, glyphs taken from the left side, reason required on the right):

```
previews: ห — the low-side rule needs a name for the repair a partnerless
hummed letter uses, and refusing to name it would leave the rule's second half
unusable. The glyph is shown, no class is claimed for it, and it is taught in
its own lesson later.
```

```
previews: อ — the naming pattern is the vowel aaw plus an acrophonic word, and
the letter that carries that vowel is อ. Shown so the pattern is complete; no
class is claimed for it, and it is taught in its own lesson later.
```

Declared previews resolve to the glyph set `{ห, อ}`. This is the **only** one of the three lessons scoped here that declares any preview; `lesson-clusters` and `lesson-leading-consonants` both declare `previews: none`.

`ranks:` line: **absent.**

**New consonants or vowels declared: none — and this lesson goes further than the other two.** The header says so in its own words: *"Introduces no new symbol: it re-sorts the twelve consonants already taught."* Unlike `lesson-clusters` (legacy 27) and `lesson-leading-consonants` (legacy 28), which each have a `lessons`-table row declaring empty `consonants`/`vowels` arrays, **`lesson-sound-buckets` has no row in the `lessons` table at all** and therefore no `legacyNumber`. `openingBand.test.ts:59-62` records why: *"`lesson-sound-buckets` has none: it introduces no symbol, so it declares no row."*

Slides, in order (13 total, 0 `scene:` lines):

| # | kind | id |
|---|---|---|
| 1 | exposition | `why` |
| 2 | exposition | `bucket-one` |
| 3 | exposition | `bucket-two` |
| 4 | retrieval | `derive-two` |
| 5 | reveal | `derive-two-answer` |
| 6 | exposition | `bucket-three` |
| 7 | exposition | `low-side` |
| 8 | retrieval | `which-bucket` |
| 9 | reveal | `which-bucket-answer` |
| 10 | exposition | `naming` |
| 11 | retrieval | `name-parts` |
| 12 | reveal | `name-parts-answer` |
| 13 | exposition | `payoff` |

**`rule:` slides in the script: none.** With no `lessons`-table row there is no `specialRulesIntroduced` list, so no rule slide is even expressible here — `lessonRules(legacyNumber)` returns `[]` for a lesson with no row (`lessonContent.ts:227-229`), and every `rule:` slide would fail validation as `unknown-rule`.

## The rule being taught

There is no `rule:` id in this script, so there is no `specialRules` record to quote. The rule this lesson teaches lives in **`src/domain/script/data/soundType.ts`** instead, as executable classification rather than as prose. Quoting the module's own statement of it in full (`soundType.ts:3-17`):

```
// ============================================================================
// Sound type — consonant class as a derivable property
// ============================================================================
// Thai consonant class is a phonetic natural class, not an arbitrary list of
// 44 facts:
//
//   sonorant                 → always low   (derived, no memorisation)
//   unaspirated obstruent    → always mid   (derived; this is the whole class)
//   aspirate or fricative    → high or low  (only the 11 high ones are learned)
//
// Everything here reads a consonant's `initialSound` and `isAspirated` and
// NOTHING else. In particular the declared class field is never consulted: a
// derivation that peeked at it would agree with it by construction and could
// never catch the data drifting from the rule the lessons teach.
```

The three buckets, as declared (`soundType.ts:19-23`):

```ts
/** The three phonetic buckets every Thai consonant falls into. */
export type SoundType =
    | "sonorant"
    | "unaspirated-obstruent"
    | "aspirate-or-fricative";
```

The residue, quoted in full (`soundType.ts:25-41`):

```ts
/**
 * The one genuine memorisation load in the class system: the 11 high-class
 * letters. Every one is an aspirated stop or a fricative — the other two
 * buckets never consult this (or any) per-letter table.
 */
export const HIGH_CLASS_CONSONANTS: readonly string[] = [
    "ข", "ฃ", "ฉ", "ฐ", "ถ", "ผ", "ฝ", "ศ", "ษ", "ส", "ห",
];
```

The phoneme sets, quoted in full (`soundType.ts:43-65`):

```ts
// Phoneme classes, keyed by the leading token of `initialSound`. These are
// definitions of sound types (seven sonorant onsets exist in Thai, and so on),
// not per-letter tables: a glyph never appears here, so any consonant — even
// one this file has never seen — classifies from its sound alone.
const SONORANT_PHONEMES: readonly string[] = [
    "m", "n", "ng", "y", "r", "l", "w",
];
const PLAIN_OBSTRUENT_PHONEMES: readonly string[] = [
    "g",
    "j",
    "d",
    "dt",
    "b",
    "bp",
    // อ, the silent placeholder onset, patterns with the plain stops: it is the
    // ninth member of the mid class.
    "silent",
];
const ASPIRATED_STOP_PHONEMES: readonly string[] = ["kh", "ch", "th", "ph"];
const FRICATIVE_PHONEMES: readonly string[] = ["f", "s", "h"];
```

Actual class counts in `symbols.ts`, derived from the 44 consonant records: **Low 24** (ม น ง ย ว ช ซ พ ฟ ค ท ฮ ร ล ภ ธ ณ ญ ฑ ฒ ฬ ฆ ฅ ฌ), **Mid 9** (ก ด บ จ ต ป อ ฎ ฏ), **High 11** (ข ฉ ศ ษ ส ผ ฝ ห ถ ฐ ฃ).

### What the test harness enforces on this lesson's prose

From `src/domain/script/data/openingBand.test.ts`:

- The third bucket's membership is read **off the slide**, not restated in the test. `namedLowInThirdBucket()` (`:285-307`) finds the slide with id **`bucket-three`** — a missing slide throws by name — and collects the Thai glyphs from every sentence in its body matching `/low[\s-]?class/i`. Those glyphs are the only letters the lesson can place in bucket three.
- `classFromStatedRule` (`:239-283`) then places all twelve taught consonants: bucket one and two via `classifyConsonant` (sound alone), bucket three via that harvested list. Every one must land on its declared `classType` (`:410-426`).
- **Exactly 8 of the 12 must be placeable from sound alone**, with bucket three's list removed (`:428-436`). That number is asserted, so moving a letter between buckets breaks it.
- **No sentence anywhere in the deck may make a class claim alongside an untaught glyph** (`:438-475`). `CLASS_CLAIM` is `/\b(?:low|mid|high)[\s-]?class\b|\b(?:temple|market|harbor)\b/i` (`:204-205`) — note the district words count as class claims. ห and อ are declared previews for *symbol use*, but a preview does **not** exempt a class claim: the script's own preview reasons say "no class is claimed for it" twice, and this test is why.
- `bucket-three`'s body must match `/split/i` (`:465`).
- At least one class claim must exist in the deck (`:461`).
- `consonantsTaughtInBand.length` must be 12 (`:408`).
- Every Thai glyph the deck uses must be taught by this point **or** a declared preview (`:390-406`).

## Worked examples and ranks

**This lesson names no Thai words at all.** Every Thai run in the script is a single letter. There is therefore nothing to look up in `vocabulary.json`, no rank to report, and no rank window to violate. That is a genuine structural difference from the other two lessons, not a gap in this scoping.

The full inventory of Thai the script uses — 14 distinct code points, all single consonant letters:

| letter | class | sound (`initialSound`) | taught in | what it illustrates |
|---|---|---|---|---|
| ม | Low | m | lesson-01 | Bucket one. Named on `bucket-one`; the anchor of `which-bucket` ("ม hums"). |
| น | Low | n | lesson-01 | Bucket one. |
| ง | Low | ng | lesson-02 | Bucket one; the anchor of `derive-two` ("place ง and ด"). |
| ย | Low | y | lesson-02 | Bucket one. |
| ว | Low | w | lesson-02 | Bucket one. |
| ก | Mid | g | lesson-03 | Bucket two. Also cited in `naming` as "gaaw gài is g plus aaw, then gài, a chicken". |
| ด | Mid | d | lesson-03 | Bucket two; the other anchor of `derive-two`, and the subject of `name-parts` ("daaw dèk is the name of ด"). |
| บ | Mid | b | lesson-03 | Bucket two. |
| ช | Low | ch (aspirated) | lesson-04 | Bucket three, named low class — i.e. it is one of the four letters the harvest picks up. |
| ซ | Low | s (fricative) | lesson-04 | Bucket three, named low class. |
| พ | Low | ph (aspirated) | lesson-05 | Bucket three, named low class. |
| ฟ | Low | f (fricative) | lesson-05 | Bucket three, named low class; the anchor of `which-bucket` ("ฟ hisses"). |
| ห | High | h (fricative) | lesson-12 | **Preview.** Named on `low-side` only, as the letter that performs the repair for a partnerless sonorant. No class is claimed for it. |
| อ | Mid | silent | lesson-11 | **Preview.** Named on `naming` only, as the letter that spells the vowel `aaw` and whose own name `aaw àang` is the formula applied to itself. No class is claimed for it. |

Romanised names the script uses without writing them in Thai: `maaw máa` (ม, "a horse"), `gaaw gài` (ก, "a chicken"), `daaw dèk` (ด, "a child"), `aaw àang` (อ). All four match the `nameRomanized`/`nameMeaning` fields on their `symbols.ts` records. The Thai spellings ม้า, ไก่, เด็ก, อ่าง are **not** written anywhere in the script — only romanised — so they are not glyph-coverage or vocabulary concerns.

Counts the script asserts, checked against the data:

| claim | slide | actual | verdict |
|---|---|---|---|
| "twelve consonants you already know" | `why`, `payoff` | 12 taught through lesson-05 | ✅ (and asserted at `openingBand.test.ts:408`) |
| "Every one, no exceptions, ten in total" (hummable → low) | `bucket-one` | 10 sonorants: ง ญ ณ น ม ย ร ล ว ฬ | ✅ |
| "You have five of them already: ม, น, ง, ย and ว" | `bucket-one` | 5 | ✅ |
| "Nine of them, and the list has no leftovers" (mid class) | `bucket-two` | 9 mid: ก ด บ จ ต ป อ ฎ ฏ | ✅ on the count; see Risks 3 on the *characterisation* |
| "ก, ด and บ are the three you have met" | `bucket-two` | 3 | ✅ |
| "Every letter of this kind you have met so far is low class: ช, ซ, พ and ฟ" | `bucket-three` | all four are Low | ✅ |
| "eight place themselves: five hum, three stop without breath" | `payoff` | 5 + 3 = 8 | ✅ (and asserted at `openingBand.test.ts:428-436`) |
| "Four sit in the split bucket" | `payoff` | ช ซ พ ฟ | ✅ |
| "The ones that breathe are the few worth memorising, and there are not many" | `payoff` | 11 high-class letters | ✅ — 11 of 44 |

## Counterexamples

This lesson's contrasts are **bucket-membership contrasts between letters**, not word pairs. There are no word pairs anywhere in it. Reported as pairs:

1. **ง (placeable from sound) vs ด (placeable from sound), on opposite sides.** `derive-two` / `derive-two-answer`. Both are derivable, so this pair is not a rule-vs-exception pair — it is a bucket-one-vs-bucket-two pair. "ง hums and can be held, so it is low class. ด halts the air and releases no breath, so it is mid class. Neither answer needed a list."
2. **ม (placeable) vs ฟ (not placeable from sound).** `which-bucket` / `which-bucket-answer` — this is the lesson's true rule-vs-exception pair. "ม hums, so bucket one places it: low class, from the sound and nothing else. ฟ hisses, so it lands in the split bucket and the sound settles nothing." The reveal then draws the distinction explicitly: *"You do know where ฟ sits — low class — but you know it because this lesson said so, not because you heard it."*
3. **A low-class letter with a partner vs one without.** `low-side`: "the ones with a partner across that split, and the ones with no partner at all." The partnered case's repair is the partner; the partnerless case's repair is ห. The script gives no letter names for either side on this slide — which is what keeps ห's mention from becoming a class claim.
4. **ช/ซ/พ/ฟ (low, on the near side of the split) vs "the letters on the far side of the split", unnamed.** `bucket-three` states the far side exists and deliberately does not name it. This is the structural counterexample the test at `openingBand.test.ts:438-475` exists to protect: naming ข, ผ, ถ, ส or ฝ here alongside "high class" would fail, because none is taught until lesson-12.

Counterexamples the **data** contrasts that the script does not:

5. **The mid-class letters that do not make a g/d/b sound: จ (j) and อ (silent).** `soundType.ts:52-62` lists them as plain obstruents and comments explicitly that อ *"patterns with the plain stops: it is the ninth member of the mid class"*. The script's `bucket-two` characterises bucket two only as "g, d and b". See Risks 3.
6. **ฮ (h, Low) vs ห (h, High).** The only genuine same-sound-different-class pair in the fricative bucket; ฮ is taught in lesson-07, ห in lesson-12, and neither is contrastable at this lesson's position without a class claim. The script does not attempt it.
7. **ฃ and ฅ.** Counted in the 44 (`symbols.ts` `obsolete-consonants`: *"still counted in the 44-consonant alphabet but are not used in any modern Thai words"*), and both are in the derived class counts this lesson's numbers rest on — ฃ is one of the 11 high-class letters and ฅ one of the 24 low. The script's counts are therefore alphabet counts, not usable-letter counts. It does not say so.

## Prerequisites

**The lesson has no position in the sequence.** `lessonSequence.ts:59-79` declares 19 entries and `lesson-sound-buckets` is not among them. `reconcileLessonSlots` (`lessonSequence.ts:238-259`) exists specifically to surface this, and its doc comment names the lesson: *"a lesson that shipped content without a slot (`lesson-sound-buckets` is one today) is unreachable from any route — a defect that is invisible unless something counts it."* `openingBand.test.ts:359-361` asserts the current state as intended: `resolveLessonContent("lesson-sound-buckets").status` must be `"undeclared"`.

The script's header states the intended position: **"Opening band, sits after lesson-05."** That would be sequence position 6, ahead of the current `lesson-06`.

Checked against that intended position, every symbol the lesson uses is available:

| symbol | kind | taught at position | status at "after lesson-05" |
|---|---|---|---|
| ม น | consonant | 1 | taught |
| ง ย ว | consonant | 2 | taught |
| ก ด บ | consonant | 3 | taught |
| ช ซ | consonant | 4 | taught |
| พ ฟ | consonant | 5 | taught |
| อ | consonant | **11** | **not taught — declared preview** |
| ห | consonant | **12** | **not taught — declared preview** |

No vowels and no tone marks are written anywhere in the script.

**Two examples use letters taught later — ห and อ — and both are correctly declared as previews with reasons.** `openingBand.test.ts:390-406` accepts a glyph that is either taught by this point or a declared preview, so both pass. The stricter class-claim check (`:438-475`) is what forces the script's careful wording: ห appears on `low-side` only as "ห is what performs it", and อ appears on `naming` only as the letter that spells `aaw` — neither sentence assigns a class, which is exactly what the two `previews:` reasons promise.

The three other lessons that show a symbol early declare previews the same way: `lesson-07` (`previews: ข ฉ ถ ผ ฝ ส ห — ฮ is the last of the seven hummed-and-breathed`). Every other lesson in the course declares `previews: none`.

## Risks

**1. SHORT-WORD RISK — example words under 3 Thai characters: not applicable, and the risk is inverted.**
The lesson contains **zero Thai words**. Every Thai run in the script is one letter long. So there is no word under 3 characters — but there is also nothing 3 characters or longer, and the fourteen single letters are all shorter than any word. If the pipeline's synthesis/verification step operates on Thai runs, this lesson offers it fourteen 1-character runs and nothing else.

Romanised syllables the script does ask to be said aloud — `maaw máa`, `gaaw gài`, `daaw dèk`, `aaw àang`, and the bare sounds `m`, `n`, `ng`, `y`, `r`, `l`, `w`, `g`, `d`, `b`, `kh`, `ch`, `th`, `ph`, `f`, `s`, `h` — are romanisation, not Thai script, and are not in the corpus in that form.

No codified minimum-length gate exists in `src/` or `scripts/`; the only length-like threshold is `MIN_VOICED_FRAMES = 10` in `scripts/audio-tone-check/check_tones.py:69`, an audio-frame count.

**2. Example words absent from vocabulary.json: not applicable — there are none to be absent.** `openingBand.test.ts:477+` ("the band's example words") resolves Thai example words against `vocabulary.json` for every band lesson; for this lesson the set is empty.

**3. Is the rule absolute or a tendency? — Absolute, and the lesson states it absolutely. But one of its absolute claims is wider than the data supports.**

`soundType.ts` states all three branches without hedging: sonorant → *always* low; unaspirated obstruent → *always* mid, *"this is the whole class"*; aspirate/fricative → high or low, *"only the 11 high ones are learned"*. There is no hedging language anywhere in `soundType.ts`, and the module comment goes out of its way to say the derivation *"reads `initialSound` and `isAspirated` and NOTHING else"*. So unlike `lesson-leading-consonants`, stating this rule as a law is correct.

The problem is the **converse** claim on `bucket-two`:

> *"A plain stop halts the air and lets none of it out. Palm up by your lips again: g, d and b should leave it perfectly still. Any Thai letter making one of those is mid class — and those letters are the whole of the mid class. Nine of them, and the list has no leftovers."*

The forward direction is true: g, d and b letters are mid class. The converse — that "those letters are the whole of the mid class", nine of them, no leftovers — does not hold as written. The nine mid-class letters are ก ด บ จ ต ป อ ฎ ฏ, and:

- **จ makes a `j` sound**, not g/d/b.
- **อ is `silent`**, not g/d/b.
- ต is `dt` and ป is `bp` (and ฏ is `dt`) — plain unaspirated stops in the same family, so arguably covered by "a plain stop", but not by "g, d and b".

`soundType.ts` defines bucket two as `PLAIN_OBSTRUENT_PHONEMES = ["g","j","d","dt","b","bp","silent"]` — seven onsets, not three — and comments อ's membership explicitly. A learner who takes `bucket-two` literally and later meets จ, ต, ป, อ, ฎ or ฏ has been given a rule that does not place any of them. **This is the "teaches a wrong confidence" case the brief asks about, and it is in this lesson rather than the other two:** the *count* is right (nine), the *rule* is right in the direction the lesson uses it, and the *closure claim* ("the whole of the mid class", "no leftovers") over-reaches.

The equivalent claim on `bucket-one` does **not** over-reach: "m, n, ng, y, r, l and w" is the complete `SONORANT_PHONEMES` list, and "ten in total" is the exact sonorant count.

**4. The lesson is unreachable.** No `lessonSequence` entry, no `legacyNumber`, absent from `DECK_LESSON_IDS` (`lessonContent.ts:87-93`), and `resolveLessonContent` returns `"undeclared"` — asserted as the *expected* state at `openingBand.test.ts:359-361`. Both `lessonContent.ts:87-93` and `openingBand.test.ts:316-333` say the same thing: giving it a position is a lesson-identity migration decision (CONTEXT.md Rule 1, the five-store hazard) deliberately deferred. **Narration written for this lesson ships to nobody until that decision is made.** That should be confirmed before the work is commissioned, not after.

**5. Inserting it "after lesson-05" renumbers everything behind it.** Positions are derived from declaration order (`lessonSequence.ts:81-86`), and persisted learner state holds *positions* (`lessonSequence.ts:1-17`, and the `RETIRED_LESSONS` migration note at `:88-98`). So the header's stated intent is not a one-line change.

**6. The class-claim guard is tighter than it looks.** `CLASS_CLAIM` (`openingBand.test.ts:204-205`) also fires on the bare words **temple**, **market** and **harbor** — the memory-palace district names. `bucket-one` currently says "They berth at the harbor" and `bucket-two` says "They trade at the market", and both pass only because every Thai letter in those sentences is already taught. Narration that mentions a district in a sentence containing ห or อ will fail. There is no "temple" sentence in the script today, and adding one would be the easiest way to break this lesson, since the temple district holds the high-class letters this lesson deliberately refuses to name.

**7. The `bucket-three` slide id is load-bearing.** `namedLowInThirdBucket()` throws by name if no slide with id `bucket-three` exists (`openingBand.test.ts:292-296`), and the four letters ช ซ พ ฟ must stay inside sentences matching `/low[\s-]?class/i` on that slide or the lesson loses the ability to place them. The slide body must also still match `/split/i`.

**8. The script currently has zero `narration:` lines — and for this lesson that is anomalous.**
`grep -c "^narration:"` gives **0**. But this is an *opening-band* lesson, and every other opening-band lesson has narration on every slide: `orientation` 60 lines, `lesson-01` 67, `lesson-02` 47, `lesson-03` 52, `lesson-04` 50, `lesson-05` 43 (`lesson-06`, the first middle-band lesson, has 37). Every lesson from `lesson-07` onward has none. So `lesson-sound-buckets` is the only lesson in the narrated band without narration — the same anomaly as its missing scenes and images (see Assets).

The shape, from `content/lessons/lesson-06.md`: one `narration: en <prose>` line per slide, between `heading:` and the bullets.

Narration is scanned by **nothing**. `openingBand.test.ts:117-131`'s `textsOf` takes `title + heading + prompt + slide.thai + body + answers`; `promotedLessons.test.ts:110-124`, `sequenceClosure.test.ts:108-117` and `middleBand.test.ts:107-116` take the same minus `slide.thai`. `content/lessons/lesson-06.md:27-30` states the consequence: *"the check reads headings, prompts, bullets and answers — not narration."*

For this lesson that cuts both ways, and the second way is the sharper one. Narration may name any word freely. But narration is **invisible to the class-claim guard** at `openingBand.test.ts:438-475` — so narration could assign a class to ห or อ (or name a temple-district letter) without failing the check that the two `previews:` reasons promise it will not violate. The guarantee "no class is claimed for it" is a bullet-and-heading guarantee only, and holding to it in narration is a matter of discipline, not of the test suite.

**9. Stale comment in the test suite, worth knowing but not acting on.** `openingBand.test.ts:470` says *"ผ is high class and is taught at lesson 14, nine lessons past this one"*. ผ is taught at lesson-12 since task 4.3's resequence. The assertion itself is unaffected (ผ is untaught either way); only the comment is out of date.

## Assets

**Images in `content/lessons/images/lesson-sound-buckets/`: none — the directory does not exist.**
`content/lessons/images/` currently holds only `lesson-01` … `lesson-06` and `orientation`.

**`scene:` lines in the script: 0.**

This is the notable one. `lesson-sound-buckets` is an **opening-band** lesson, and every other opening-band lesson pairs `scene:` lines 1:1 with images — `lesson-05`, for example, has 13 `scene:` lines and 13 files in `content/lessons/images/lesson-05/`. Only the rule-teaching lessons (`lesson-clusters`, `lesson-leading-consonants`, `lesson-unwritten-vowels`, `lesson-tone-marks`, `lesson-numerals`) have 0 and 0. So this lesson currently follows the rule-lesson asset convention while sitting in the band that follows the letter-lesson one — and the same holds for its missing narration (Risks 8).

Whether that is intended, I could not determine from the repository. `openingBand.test.ts:546-595` ("the band's assets") is the only asset check that covers this lesson, and it is **bidirectional-containment only**: every referenced asset must live under `/thai-script/lessons/<id>/` and exist on disk, and every file on disk must be referenced. It never requires an image to exist. Its own comment records the current state as expected: *"These decks carry no narration audio yet — no ELEVENLABS_API_KEY was available, and the scripts declare no `narration:` lines, so the pipeline ran for real with zero segments rather than skipping any."* Nothing in the header, the tests, or `lessonSequence.ts` states an image expectation for this lesson either way.

`public/lessons/lesson-sound-buckets/manifest.json` declares `"assets": []`; no image references in its `deck.json`.
