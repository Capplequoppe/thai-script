# Scoping: lesson-numerals

Source script: `content/lessons/lesson-numerals.md`
Built deck: `public/lessons/lesson-numerals/deck.json` (9 slides), `manifest.json` (`assets: []` — no audio generated)

## Declares

Full HTML comment header, `content/lessons/lesson-numerals.md:5-15`:

```
<!--
Task 4.3. The optional track. The source course spent the front halves of
three lessons on these digits; they are genuinely rare in running text and
genuinely present on price signs, tickets, house numbers and official
documents, so they are one honest lesson a learner may take or skip. The
sequence marks this lesson required: false — skipping it leaves the course
complete (AC4).
previews: none
ranks: 1-1600
teaches: ๐ ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ๙ — the digit glyphs; they live in thaiNumerals, not in a lessons-table row
-->
```

Verbatim, the two lines asked for:

- `previews: none` (`lesson-numerals.md:12`)
- `ranks: 1-1600` (`lesson-numerals.md:13`)

**`rule:` slides: none.** The script contains no `rule:` line at all (verified with `grep -n "^rule:"`). All nine slides are `exposition`, `retrieval` or `reveal`.

**New consonant or vowel declared: none.** The `lessons` row for this lesson, `src/domain/script/data/symbols.ts:3413-3422`:

```ts
{
    number: 30,
    title: "Thai Numerals, ๐ Through ๙",
    focus: "The ten digit glyphs and the number words behind them — optional",
    consonants: [],
    vowels: [],
    toneMarks: [],
    toneRulesIntroduced: [],
    specialRulesIntroduced: [],
},
```

Everything it introduces is the ten digits, which live in `thaiNumerals` (`symbols.ts:2247`), each with `lesson: 30`. The `teaches:` line is what makes the AC6 sweep in `sequenceClosure.test.ts:707` accept the glyphs — `taughtBy()` adds numerals whose `lesson` equals the entry's `legacyNumber`, plus anything `teaches:` declares.

Sequence entry (`src/domain/script/data/lessonSequence.ts:76`):

```ts
{ id: "lesson-numerals", legacyNumber: 30, required: false },
```

## The content

### The ten numerals, verbatim from `src/domain/script/data/symbols.ts:2247-2258`

```ts
export const thaiNumerals: ThaiNumeral[] = [
    { thai: "๐", arabic: 0, word: "ศูนย์", romanization: "suun",  lesson: 30 },
    { thai: "๑", arabic: 1, word: "หนึ่ง", romanization: "nueng", lesson: 30 },
    { thai: "๒", arabic: 2, word: "สอง",  romanization: "saawng", lesson: 30 },
    { thai: "๓", arabic: 3, word: "สาม",  romanization: "saam",  lesson: 30 },
    { thai: "๔", arabic: 4, word: "สี่",   romanization: "sii",   lesson: 30 },
    { thai: "๕", arabic: 5, word: "ห้า",   romanization: "haa",   lesson: 30 },
    { thai: "๖", arabic: 6, word: "หก",   romanization: "hok",   lesson: 30 },
    { thai: "๗", arabic: 7, word: "เจ็ด",  romanization: "jet",   lesson: 30 },
    { thai: "๘", arabic: 8, word: "แปด",  romanization: "bpaaet", lesson: 30 },
    { thai: "๙", arabic: 9, word: "เก้า",  romanization: "gao",   lesson: 30 },
];
```

The `ThaiNumeral` interface (`symbols.ts:2239-2245`) has exactly four data fields plus `lesson`: `thai`, `arabic`, `word`, `romanization`.

| Numeral | Value | Thai name | Data romanisation (unmarked) | Shape cue in the data |
|---|---|---|---|---|
| ๐ | 0 | ศูนย์ | `suun` | **none** |
| ๑ | 1 | หนึ่ง | `nueng` | **none** |
| ๒ | 2 | สอง | `saawng` | **none** |
| ๓ | 3 | สาม | `saam` | **none** |
| ๔ | 4 | สี่ | `sii` | **none** |
| ๕ | 5 | ห้า | `haa` | **none** |
| ๖ | 6 | หก | `hok` | **none** |
| ๗ | 7 | เจ็ด | `jet` | **none** |
| ๘ | 8 | แปด | `bpaaet` | **none** |
| ๙ | 9 | เก้า | `gao` | **none** |

**There is no shape cue anywhere in the data for any numeral.** `ThaiNumeral` has no `sceneMnemonic`, no `shapeCue`, no `notes` field — unlike `ThaiConsonant`/`ThaiVowel` (which carry `sceneMnemonic.shapeCue`) and `RareVowel` (which carries `notes`). Every shape claim currently in the script is authored prose with no data behind it:

- "๐ … a plain ring" (`lesson-numerals.md:23`)
- "the two and three share a base; three carries an extra hump" (`:25`)
- "its glyph forks like a flag" (๔, `:26`)
- "the glyph coils back on itself" (๕, `:29`)
- "a matched pair of hooks facing opposite ways" (๗/๘, `:30`)
- "with a tail that climbs" (๙, `:31`)

Note also: the data's romanisations carry **no tone diacritics** (`suun`, not `sǔun`). The script writes the toned forms (`sǔun`, `nùeng`, …), which match `vocabulary.json`, not `thaiNumerals`.

### Audio — verified with `ls`, not assumed

`ls -l public/audio/digit-*.mp3` returns ten files, all present and non-empty:

```
public/audio/digit-0.mp3   5657 bytes
public/audio/digit-1.mp3   4217 bytes
public/audio/digit-2.mp3   5369 bytes
public/audio/digit-3.mp3   6521 bytes
public/audio/digit-4.mp3   5081 bytes
public/audio/digit-5.mp3   5369 bytes
public/audio/digit-6.mp3   3209 bytes
public/audio/digit-7.mp3   3065 bytes
public/audio/digit-8.mp3   3353 bytes
public/audio/digit-9.mp3   4937 bytes
```

So: **audio exists for all ten, one file per digit, named by Arabic value.**

Two caveats I could verify, and one I could not:

1. **Nothing in `src/` references these files.** `grep -rn "digit-" src/ scripts/ backend/` returns no hit outside the audio directory itself. `ThaiNumeral` has no `audioUrl` field (consonants, vowels and tone marks all do). So the ten clips are on disk and orphaned — the app never plays them today.
2. **Nothing in the repo maps `digit-N.mp3` to `thaiNumerals`.** The mapping "digit-0 = ๐" is inferred from the filename only.
3. **I could not determine what the clips actually say** — whether each is the number word (`ศูนย์`) or the digit name. There is no manifest or transcript for `public/audio/`. Listening is outside what I can verify here.

They are, however, usable by the deck pipeline as-is: a `recording: th <text> public/audio/digit-N.mp3` line takes the recording route in `scripts/lesson_deck/pipeline.py:427-441`, which bypasses the transcribe-back gate entirely. That is the same route `lesson-01` … `lesson-06` use for consonant names.

### Where numerals already appear in the app

`NumeralSummary` is defined at `src/domain/script/services/ScriptLessonService.ts:83-88`:

```ts
export interface NumeralSummary {
    character: string;
    arabic: number;
    word: string;
    romanization: string;
}
```

It is produced at `ScriptLessonService.ts:287-294` (`thaiNumerals.filter((n) => n.lesson === legacyNumber)`) as the `numerals` field of the lesson summary (`:110`). Its callers:

- **`src/presentation/components/organisms/SymbolCard.tsx:290` — `NumeralCard`.** Renders the glyph at 96px, the Arabic value as an `<h2>`, then the Thai word and the romanisation. Nothing else — no shape cue, no audio button.
- **`src/presentation/pages/LearnedItemsPage.tsx`** — `:161` collects them across completed lessons, `:274-279` adds a **"numerals" tab** that appears only when `numerals.length > 0`, `:408-409` renders the selected one through `NumeralCard`, `:584` lists them in the grid. This is the concrete thing the lesson can point at: after completing the lesson, the digits show up as their own tab in Learned Items.
- **`src/presentation/pages/Dashboard.tsx:58`** — `summary.numerals.length` feeds `pendingCatchUpItemCount`, so unlearned digits count toward the dashboard's catch-up total.
- **`src/domain/script/services/ScriptCardGenerator.ts:567-569` → `generateNumeralCards` (`:453-490`)** — each digit generates **three** review cards, so ten digits become thirty cards:
  - `<digit>:value` — "What Arabic numeral is this Thai digit?" → `String(n.arabic)`
  - `<digit>:word` — "What is the Thai word for this number?" → `n.word`
  - `<digit>:romanization` — "How is the Thai word for this number pronounced?" → `n.romanization`
  Distractors are drawn from the pools at `ScriptCardGenerator.ts:118-120` (the other nine values / words / romanisations).

**Consequence for the writer:** the review cards ask for `n.romanization` — the *untoned* `suun`, `nueng`, `saawng` — while the lesson prose writes `sǔun`, `nùeng`, `sǎawng`. A learner who learns the lesson's spelling and then meets the card sees a different string. Flagging, not fixing.

## Example words and ranks

Declared window: **1-1600**. Every word below is present in `src/domain/vocabulary/data/vocabulary.json` and inside the window. No absences, no violations.

| Word | Romanisation (script) | Corpus romanisation | English (corpus) | rank | In 1-1600? |
|---|---|---|---|---|---|
| ศูนย์ | sǔun | sǔun | zero | 251 | yes |
| หนึ่ง | nùeng | nùeng | one | 394 | yes |
| สอง | sǎawng | sǎawng | two | 395 | yes |
| สาม | sǎam | sǎam | three | 396 | yes |
| สี่ | sìi | sìi | four | 397 | yes |
| ห้า | hâa | hâa | five | 398 | yes |
| หก | hòk | hòk | six | 399 | yes |
| เจ็ด | jèt | jèt | seven | 400 | yes |
| แปด | bpàaet | bpàaet | eight | 401 | yes |
| เก้า | gâo | gâo | nine | 402 | yes |
| สิบ | sìp | sìp | ten | 403 | yes |
| ร้อย | ráawi | ráawi | hundred | 413 | yes |
| พัน | phan | phan | thousand; to tie | 951 | yes |
| ล้าน | láan | láan | million | 866 | yes |
| เลข | lêek | lêek | number; digit | 1476 | yes |

Every script romanisation matches the corpus exactly.

Non-word Thai the script also prints: the digit strings **๒๕**, **๑๐๐**, **๗๕**, **๓๕** and the bare digits ๐-๙, ๓, ๕, ๙, ๗. These are exempt from the corpus check by construction — `thaiWordRunsIn` (`sequenceClosure.test.ts:133-141`) only treats a run as a candidate word if it is ≥2 characters **and** matches `/[ก-ฮ]/`; Thai digits sit at U+0E50-U+0E59, outside that class. Single letters named in prose (ศ at `:23`, ย at `:23`) are length-1 and skipped.

The rank window **is enforced** for this lesson: `lesson-numerals` is one of the four `NEW_LESSON_IDS` (`sequenceClosure.test.ts:59-64`) that the sweep at `:761-793` runs over, which requires every word run to be a corpus word with a rank inside `ranks:`, and requires more than four such words. The current script clears it with 15.

## Prerequisites

Position in the declared sequence (`src/domain/script/data/lessonSequence.ts:60-77`), all 19 entries:

| Pos | id | legacy | required |
|---|---|---|---|
| 1-14 | lesson-01 … lesson-14 | 1-14 | true |
| 15 | lesson-unwritten-vowels | 26 | true |
| 16 | lesson-tone-marks | 29 | true |
| 17 | lesson-clusters | 27 | true |
| 18 | lesson-leading-consonants | 28 | true |
| **19** | **lesson-numerals** | **30** | **false** |

`lesson-numerals` is **last, and the only optional entry.** The reason is recorded at `lessonSequence.ts:56-57`: "`lesson-numerals` is last: `startLesson` requires every earlier position complete, so an optional track anywhere else would block the course." `numeralsTrackState` (`lessonSequence.ts:148-159`) gives it three states — `not-started`, `skipped`, `completed` — and `requiredLessonCount` excludes it, so skipping does not hold the course open.

Symbol-by-symbol prerequisite check of every example word (character → the lesson that teaches it → that lesson's sequence position):

| Word | Characters and their teaching position |
|---|---|
| ศูนย์ | ศ=L13@p13, ู=L5@p5, น=L1@p1, ย=L2@p2, ์=lesson-13 (`specialRulesIntroduced: ["gaaran", …]`, `symbols.ts:3334`; also `teaches: ์` at `lesson-13.md:13`) |
| หนึ่ง | ห=L12@p12, น=p1, ึ=L6@p6, ่=L29@p16, ง=L2@p2 |
| สอง | ส=L12@p12, อ=L11@p11, ง=p2 |
| สาม | ส=p12, า=p1, ม=p1 |
| สี่ | ส=p12, ี=L3@p3, ่=p16 |
| ห้า | ห=p12, ้=p16, า=p1 |
| หก | ห=p12, ก=L3@p3 |
| เจ็ด | เ=L7@p7, จ=L9@p9, ็=L7@p7, ด=L3@p3 |
| แปด | แ=L8@p8, ป=L9@p9, ด=p3 |
| เก้า | เ=p7, ก=p3, ้=p16, า=p1 |
| สิบ | ส=p12, ิ=L4@p4, บ=L3@p3 |
| ร้อย | ร=L8@p8, ้=p16, อ=p11, ย=p2 |
| พัน | พ=L5@p5, ั=L4@p4, น=p1 |
| ล้าน | ล=L8@p8, ้=p16, า=p1, น=p1 |
| เลข | เ=p7, ล=p8, ข=L12@p12 |

**No example uses anything taught later.** The latest prerequisites are the tone marks ่ and ้ at position 16 (`lesson-tone-marks`) and ศ / ์ at position 13; this lesson sits at 19, three positions after the last of them. That is the whole benefit of being last — the writer has the entire alphabet, all four tone marks, clusters and leading consonants available.

Minimum set actually needed, stated positively: ก ข ง จ ด น บ ป พ ม ย ร ล ว(none) ศ ส ห + า ิ ี ึ ู ั ็ เ แ อ + ่ ้ + the silencer ์.

## Cross-lesson hooks

Searched `content/lessons/*.md` for promises pointing at this lesson. **There are none.** The only forward reference to numerals anywhere is negative, and it is inside this lesson itself:

- `content/lessons/lesson-numerals.md:20` — "Skipping this lesson skips nothing else: no later material depends on it, and the course is complete without it."

`content/lessons/lesson-14.md:69` enumerates what remains after the alphabet and deliberately omits numerals:

> "What remains for the course is machinery, not letters: the vowels that are not written, the tone marks, clusters, and the leading consonants."

The only other trace is in the data comments, not in learner-facing prose: `lessonSequence.ts:109-111` records that retired legacy lessons 23, 24 and 25 were `absorbedBy: "lesson-numerals"` (๑๒๓ / ๔๕๖ / ๗๘๙๐ respectively) — the three video lessons whose front halves this lesson replaces.

So: **nothing to pay off.** The lesson owes no promise made elsewhere, which is consistent with it being optional. It also means it must establish its own motivation from a standing start.

## Risks

**1. SHORT-WORD RISK.** Example words under 3 Thai characters:

- **หก** (six) — 2 characters. The only one.

All other number words are 3+ (สอง, สาม, สี่, ห้า, สิบ, พัน, เลข at 3; เจ็ด, เก้า, ร้อย, ล้าน, ทราย at 4; ศูนย์, หนึ่ง at 5).

But the premise as given to me does not match what I found in the pipeline, so I am reporting the measurement rather than the assumption. **Short Thai is handled, not rejected.** `scripts/lesson_deck/vendor.py:954-961`:

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

A Thai request of **12 normalised characters or fewer** is synthesised inside the carrier sentence `ขอโทษ ค่ะ [pause] <text> [pause] ขอบคุณ ค่ะ` and then cut out on word timings (`vendor.py:1021-1035`). The transcribe-back reading kept is the one taken *inside* the carrier (`vendor.py:1039-1069`), precisely because a bare short clip cannot be transcribed reliably. The measured result recorded at `vendor.py:986-990`, on the five things lesson 2 could not get:

```
bare request, one seed      1 of 5
bare request, eight seeds   3 of 5
carrier, cut on silence     1 of 5   (and one clip cut to nothing)
carrier, cut on timings     5 of 5
```

So the short-word route is 5 of 5, and there is **no 3-character floor anywhere in the pipeline** — I grepped for one and found none. What *is* documented as failing the bare gate is the isolated Thai *letter name* (`มอ ม้า` → `หมอ ม้า`), which is a syllable Thai does not otherwise use, not short words generally. `หก` is a real word with a frequency rank of 399; it is well inside the carrier's range and is not a letter name.

**2. Examples absent from `vocabulary.json`: none.** All 15 number words are present, ranked, and inside 1-1600. Verified programmatically against the 5454-entry corpus.

**3. Is a single numeral synthesisable at all?**

Reporting what I found rather than speculating:

- **The question does not currently arise.** The script contains **zero** `narration:`, `thai:` and `recording:` lines — verified with `grep -n "^thai:\|^narration:\|^recording:"`, which returns nothing. Bullets are parsed into `slide.bullets` (`script_parser.py:145-150`) and become deck body text; only `narration:` and `recording:` lines produce audio segments. `public/lessons/lesson-numerals/manifest.json` holds `"assets": []` — no clip has ever been generated for this lesson, so nothing has ever been put through the gate.
- **If narration is added, a bare digit would be a genuinely hard case.** A lone `๙` is one character and normalises to one character, so it would take the carrier route. But the carrier's cut works by finding the target *inside* the transcript (`_span`, `vendor.py:1127+`), and a transcriber asked for a Thai digit will hand back either the number word `เก้า` or the Arabic character `9` — neither matches the literal `๙`. I found nothing in the pipeline that normalises Thai digits to their words, and `normalise_thai` is not digit-aware. So a `narration: th ๙` line is the case most likely to fail, and I have no measurement either way because it has never been run.
- **There are two routes that avoid the question entirely.** (a) Narrate the *word*: `narration: th เก้า` is four characters, a ranked corpus word, and goes through the carrier like any other. (b) Use the ten existing clips: `recording: th <text> public/audio/digit-9.mp3` takes the recording branch at `pipeline.py:427-441`, which skips the transcribe-back check by design — "No transcribe-back check, and that is the point of the route rather than a gap in it." That is exactly how lessons 01-06 handle consonant names. Route (b) additionally depends on the unverified claim that `digit-9.mp3` says what the script says it says; someone should listen before committing to it.

**4. Additional risk not on the list — romanisation drift.** `thaiNumerals[].romanization` is untoned (`suun`, `nueng`, `saawng`, `sii`, `haa`, `hok`, `jet`, `bpaaet`, `gao`) and is the **correct answer** for the auto-generated review card `<digit>:romanization` (`ScriptCardGenerator.ts:478-487`). The script's prose uses the toned corpus forms. A learner taught `sǔun` will be graded on `suun`. The lesson cannot fix this itself; the writer should know the review cards disagree with the prose.

**5. Additional risk — the shape cues are unsourced.** Every glyph description in the current script (ring, hump, flag, coil, hooks, climbing tail) is authored, with no `shapeCue` field behind it. Unlike consonants, a rewrite has no data to check itself against and no memory-palace scene to hang on. If the new narration keeps shape cues, they are the author's claim alone.

## Assets

**Images: none.** `content/lessons/images/lesson-numerals/` **does not exist** (`ls` → "No such file or directory"). The image directory holds only seven lessons:

```
content/lessons/images/lesson-01/    28 files
content/lessons/images/lesson-02/    17
content/lessons/images/lesson-03/    14
content/lessons/images/lesson-04/    13
content/lessons/images/lesson-05/    13
content/lessons/images/lesson-06/    12
content/lessons/images/orientation/  14
```

**`scene:` lines: 0.** `grep -c "^scene:" content/lessons/lesson-numerals.md` → 0. This is the norm from lesson-07 onward — lessons 01-06 and orientation carry 12-21 `scene:` lines each; every lesson from 07 to the end of the sequence, this one included, carries none.

`public/lessons/lesson-numerals/` holds only `deck.json` and `manifest.json` — no `audio/` or `images/` subdirectory, unlike lessons 01-06 and orientation which have both. The containment test at `sequenceClosure.test.ts:796-830` asserts that every file on disk in that directory is referenced by a slide, so any image or clip added must be wired into the deck in the same change.
