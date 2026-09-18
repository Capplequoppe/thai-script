# Scoping: lesson-clusters

Source script: `content/lessons/lesson-clusters.md`
Built deck: `public/lessons/lesson-clusters/deck.json`, `public/lessons/lesson-clusters/manifest.json`

## Declares

Title line: `# Consonant clusters, true and false`
Lesson id line: `lesson: lesson-clusters`

HTML comment header, verbatim:

```
Phase 3, promoted lesson 2 of 3. The inventory is closed at twenty pairs and
the lesson has to say so: a learner who thinks clustering is productive will
read ถนน as thnon and never recover.
previews: none

`promotedLessons.test.ts` reads the inventory off the four pair slides — every
two-letter Thai run on one of them is a pair, and every longer run is an
example word — so a pair deleted from this text is a pair the lesson no longer
claims.
```

`previews:` line, verbatim (one line, `content/lessons/lesson-clusters.md:9`):

```
previews: none
```

`ranks:` line: **absent.** The script declares no `ranks:` window at all. (For comparison, `lesson-06`, `lesson-07`, `lesson-08`, `lesson-09`, `lesson-10`, `lesson-11`, `lesson-12`, `lesson-13`, `lesson-14`, `lesson-tone-marks` and `lesson-numerals` all carry one; `lesson-clusters`, `lesson-leading-consonants`, `lesson-03`, `lesson-04`, `lesson-05` and `lesson-unwritten-vowels` do not.)

**New consonants or vowels declared: none.** `src/domain/script/data/symbols.ts:3383-3396` files this lesson as legacy number 27 with `consonants: []`, `vowels: []`, `toneMarks: []`, `toneRulesIntroduced: []`. It teaches a rule only.

Slides, in order (11 total, 0 `scene:` lines):

| # | kind | id |
|---|---|---|
| 1 | exposition | `only-three-followers` |
| 2 | exposition | `true-clusters` |
| 3 | exposition | `false-sound-clusters` |
| 4 | exposition | `silent-second-clusters` |
| 5 | exposition | `lexical-pairs` |
| 6 | retrieval | `is-it-a-cluster` |
| 7 | reveal | `is-it-a-cluster-answer` |
| 8 | rule | `consonant-clusters` |
| 9 | exposition | `the-closure` |
| 10 | retrieval | `which-tone-decides` |
| 11 | reveal | `which-tone-decides-answer` |

`rule:` slides in the script: exactly one — `rule: consonant-clusters`.

Rules the lesson table makes available to this lesson but the script does **not** use (`symbols.ts:3392-3395`): `tho-ro-s-sound` and `silent-ro-clusters`. A rule slide may only name a rule its lesson declares (`lessonContent.ts:563-573`, error code `unknown-rule`), so both are available and currently unclaimed.

## The rule being taught

### `consonant-clusters` — the one rule slide

`src/domain/script/data/symbols.ts:538-545`, quoted in full:

```ts
{
    id: "consonant-clusters",
    title: "Consonant Clusters",
    description:
        "Only three letters can form consonant clusters when they follow other consonants: ร, ล, and ว. This is a major difference from English which has many more cluster possibilities.",
    lesson: 10,
},
```

A rule slide renders `title` + `description` off this record and carries no prose of its own (`lessonContent.ts:214-255`, and the `rule-slide-carries-prose` validation at `lessonContent.ts:445-453`). So the only text that will appear on slide 8 is the `title` and the `description` above.

Note the record's own `lesson: 10` field. `consonant-clusters` is introduced by **two** lesson-table entries: legacy 10 (`symbols.ts:3292-3296`) and legacy 27 (`symbols.ts:3392-3396`). `content/lessons/lesson-10.md:69-70` already carries a `## rule consonant-clusters` slide, so a learner reaching `lesson-clusters` at sequence position 17 has already seen this exact rule text once, at position 10.

### The two rules the script declares but does not slide

`src/domain/script/data/symbols.ts:636-642`:

```ts
{
    id: "tho-ro-s-sound",
    title: "ทร Makes S Sound",
    description:
        "The consonant pair ท + ร acts like ซ, making an S sound. Example: ทราย (saai) = sand.",
    lesson: 27,
},
```

`src/domain/script/data/symbols.ts:643-649`:

```ts
{
    id: "silent-ro-clusters",
    title: "Silent ร in Clusters with จ, ซ, ศ, ส",
    description:
        "When ร forms consonant clusters with จ, ซ, ศ, or ส, the ร is silent. Example: จริง (jing) = real.",
    lesson: 27,
},
```

### The inventory the lesson is checked against

The twenty pairs live in `src/domain/script/data/syllableRules.ts:260-294` as `CLUSTER_INVENTORY`. Its doc comment (`syllableRules.ts:229-248`), quoted in full:

```
Three kinds of consonant pair, and only the first is a cluster:

- `true` — both consonants are pronounced, in order. Only ร, ล and ว ever
  appear second, and only after the seven initials listed below.
- `false-sound` — the pair is pronounced as a single sound that is neither
  of its parts. ทร is /s/: ทราบ is *sâap*, not *thrâap*.
- `silent-second` — the ร is simply not pronounced. จริง is *jing*,
  สร้าง is *sâang*, เสร็จ is *sèt*.

The inventory is closed: a pair that is not listed here is not a cluster,
and the two consonants belong to different syllables (ถนน is thà-nǒn, not
*thnon*). That closure is what makes the rule usable — the learner is
reading off a list of 20, not judging plausibility.

Every pair is two consonants, because that is the only shape `clusterFor`
is ever asked for: the reader hands it two adjacent letters. A vowel-first
spelling like เสร็จ is the สร entry seen through its vowel, not a
twenty-first pair.
```

The twenty entries as declared (`pair, kind, initialSound, example, exampleRomanization`):

| pair | kind | initial sound | canonical example (data) |
|---|---|---|---|
| กร | true | gr | กรอบ / gràawp |
| ขร | true | khr | ขรุขระ / khrù-khrà |
| คร | true | khr | ครอง / khraawng |
| ตร | true | dtr | ตรง / dtrong |
| ปร | true | bpr | ประตู / bprà-dtuu |
| พร | true | phr | พระ / phrá |
| กล | true | gl | กลาง / glaang |
| ขล | true | khl | ขลุ่ย / khlùi |
| คล | true | khl | คลอง / khlaawng |
| ปล | true | bpl | ปลอม / bplaawm |
| ผล | true | phl | ผลิต / **phlìt** |
| พล | true | phl | พลอย / phlaawi |
| กว | true | gw | กว้าง / gwâang |
| ขว | true | khw | ขวา / khwǎa |
| คว | true | khw | ความ / khwaam |
| ทร | false-sound | s | ทราบ / sâap |
| ซร | false-sound | s | ไซร้ / sái |
| จร | silent-second | j | จริง / jing |
| ศร | silent-second | s | ศรี / sǐi |
| สร | silent-second | s | สร้าง / sâang |

`CLUSTER_SECOND_LETTERS` (`syllableRules.ts:303-307`) is `["ร", "ล", "ว"]`.

`PROMOTED_SPECIAL_RULES` (`syllableRules.ts:53-63`) maps all three of `consonant-clusters`, `tho-ro-s-sound` and `silent-ro-clusters` onto `CLUSTER_INVENTORY`.

### What the test harness enforces on this lesson's prose

`src/domain/script/data/promotedLessons.test.ts` reads the inventory back out of the script. Constraints a rewrite must not break:

- `CLUSTER_SLIDES` (`promotedLessons.test.ts:386-391`) hard-codes the four slide ids and their kinds: `true-clusters` → `true`, `false-sound-clusters` → `false-sound`, `silent-second-clusters` → `silent-second`, `lexical-pairs` → `lexical`. Renaming a slide breaks the harvest.
- Every 2-character Thai consonant run in those slides' **body lines** is harvested as a pair; every longer run is treated as an example word (`promotedLessons.test.ts:410-434`). Headings are not scanned for pairs.
- A false-sound pair's sound is parsed from the literal pattern `/([ก-ฮ]{2}) is read as ([a-z]+)\b/` (`promotedLessons.test.ts:415`). "ทร is read as s" must survive verbatim in that shape.
- The harvested key set must equal `CLUSTER_INVENTORY`'s twenty pairs exactly (`promotedLessons.test.ts:1120-1125`).
- `the-closure` must match `/\btwenty\b/i` and `/not one opening|two syllables/i` (`promotedLessons.test.ts:1126-1129`).
- `only-three-followers` must match `/ร, ล or ว/` (`promotedLessons.test.ts:1130`) — that exact comma-and-`or` spelling.
- `true-clusters` must match `/takes its class from the first letter/i`; `false-sound-clusters` must match `/the class does not/i`; `lexical-pairs` must match `/decided by the word/i` (`promotedLessons.test.ts:1157-1163`).
- ถน, ขน, สน, ตล, สว and นค must not be harvestable as pairs (`promotedLessons.test.ts:1141-1146`).

## Worked examples and ranks

All ranks and glosses from `src/domain/vocabulary/data/vocabulary.json` (5454 entries, max rank 4147). "chars" = Thai code points in the written word.

### Slide `true-clusters` — both letters spoken

| word | vocab romanisation | vocab English | rank | chars | illustrates |
|---|---|---|---|---|---|
| ตรง | dtrong | direct | 142 | 3 | ตร, the ร branch. Script glosses it "straight"; the corpus gloss is "direct". |
| ครอง | khraawng | put on; possess | 1393 | 4 | คร, the ร branch. **Gloss mismatch:** script says "to rule", corpus says "put on; possess". |
| ประตู | bprà-dtuu | door | 978 | 5 | ปร, the ร branch. Only two-syllable example on the slide; the cluster is in syllable 1 (ประ). |
| พระ | phrá | monk | 172 | 3 | พร, the ร branch — and the only low-class true cluster shown here, so the tone (high, from low class + dead short) comes off พ. |
| กรอบ | gràawp | framework; crisp; very | 880 | 4 | กร, the ร branch. Script glosses "crisp"; corpus leads with "framework". |
| กลาง | glaang | middle; center | 196 | 4 | กล, the ล branch. |
| กลับ | glàp | return | 230 | 4 | กล again, ล branch, dead syllable. |
| คลอง | khlaawng | canal | 1433 | 4 | คล, the ล branch. |
| ปลา | bplaa | fish | 224 | 3 | ปล, the ล branch. |
| ปลอม | bplaawm | FALSE | 1740 | 4 | ปล again, ล branch. **Highest-ranked word on this slide.** |
| ความ | khwaam | matter; affair; subject | 57 | 4 | คว, the ว branch. Script's gloss is functional ("makes a noun of whatever follows it"), not the corpus gloss. |
| ขวา | khwǎa | right | 422 | 3 | ขว, the ว branch — and the class demonstration: ข is high, so rising tone. |
| กว้าง | gwâang | wide | 610 | 5 | กว, the ว branch, with mai tho. |

Pairs named on the slide with **no example word**: ขร, ขล, ผล, พล (ผล and พล get their treatment on `lexical-pairs` instead). `CLUSTER_INVENTORY` has canonical examples for ขร (ขรุขระ) and ขล (ขลุ่ย), both **absent from vocabulary.json** — see Risks.

### Slide `false-sound-clusters` — ทร and ซร

| word | vocab romanisation | vocab English | rank | chars | illustrates |
|---|---|---|---|---|---|
| ทราบ | sâap | know | 314 | 4 | ทร read as s; also the class-does-not-change point (ท low → falling on a long dead syllable). `specialRules: ["tho-ro-s-sound"]`. |
| ทรง | song | style, hairdo | 204 | 3 | ทร read as s with an unwritten vowel. Script glosses "a form"; corpus says "style, hairdo". `specialRules: ["tho-ro-s-sound","unwritten-vowels"]`. |
| ทราย | saai | sand | 1705 | 4 | ทร read as s; matches the `tho-ro-s-sound` record's own example. |

ซร is named on the slide with **no example word** ("you will meet it about once"). `CLUSTER_INVENTORY`'s example for ซร is ไซร้ (sái), **absent from vocabulary.json**.

### Slide `silent-second-clusters` — จร, ศร, สร

| word | vocab romanisation | vocab English | rank | chars | illustrates |
|---|---|---|---|---|---|
| จริง | jing | real | 261 | 4 | จร with silent ร; matches the `silent-ro-clusters` record's example. `specialRules: ["silent-ro-clusters"]`. |
| สร้าง | sâang | create | 262 | 5 | สร with silent ร, plus a tone mark. `specialRules: ["silent-ro-clusters"]`. |

ศร is named with **no example word**. `CLUSTER_INVENTORY`'s example ศรี (sǐi) is **absent from vocabulary.json**. The corpus does contain เสร็จ (sèt, rank 717, `specialRules: ["silent-ro-clusters"]`), which the `syllableRules.ts` doc comment names as the สร entry "seen through its vowel" — the script does not use it.

### Slide `lexical-pairs` — ผล and พล

| word | vocab romanisation | vocab English | rank | chars | illustrates |
|---|---|---|---|---|---|
| ผลิต | phà lìt | manufacture | 483 | 4 | Script's claim: **not** a cluster; ผ is a separate light syllable. |
| ผลไม้ | phǒn-lá-máai | fruit | 561 | 5 | Script's claim: ผล is a bare pair (unwritten vowel), not a cluster. `specialRules: ["unwritten-vowels"]`. |
| พลัง | phá lang | energy; power | 911 | 4 | Script's claim: not a cluster. |
| พลอย | phlaawi | gem; jewelry | 1342 | 4 | Script's claim: **is** a cluster. `specialRules: ["unwritten-vowels"]`. |

### Slides `is-it-a-cluster` / `the-closure`

| word | vocab romanisation | vocab English | rank | chars | illustrates |
|---|---|---|---|---|---|
| ถนน | thà-nǒn | street | 590 | 3 | The negative case: ถน is not a pair, so two syllables. `specialRules: ["akson-nam","unwritten-vowels"]`, syllables `ถ` + `นน`. |
| ขนาด | khà nàat | size | 176 | 4 | The negative case again (ขน), contrasted against ขวา. `specialRules: ["akson-nam","unwritten-vowels"]`. |
| ขวา | khwǎa | right | 422 | 3 | The positive case in the same sentence. |

**Rank window:** the lesson declares none. Observed range across every word the script names: rank 57 (ความ) to rank 1740 (ปลอม). Nine words sit above 1000: ครอง 1393, คลอง 1433, ปลอม 1740, ทราย 1705, พลอย 1342. Nothing in the script falls outside the corpus's own 1-4147 span, but with no `ranks:` line there is no declared window to be outside of.

**Every word the script names is present in vocabulary.json.** Absences are only in `CLUSTER_INVENTORY`'s canonical examples the script chose not to use (ขรุขระ, ขลุ่ย, ไซร้, ศรี).

## Counterexamples

Pairs the **skeleton** contrasts:

1. **ขว in ขวา (is a cluster) vs ขน in ขนาด (is not).** Stated explicitly on `the-closure`: "it is the only way to know that ขน in ขนาด is not a cluster, and that ขว in ขวา is." Both start with ข; the discriminator is whether the second letter is one of ร/ล/ว. ขวา = khwǎa (one syllable, rank 422); ขนาด = khà-nàat (two syllables, rank 176).
2. **ถน in ถนน (not a cluster) vs any true pair.** The retrieval slide `is-it-a-cluster` and the header comment both use it: "a learner who thinks clustering is productive will read ถนน as thnon and never recover." ถนน = thà-nǒn, two syllables. The reveal names the discriminator: น is not ร/ล/ว.
3. **ทร in ทราบ read as s, vs ทร read as thr.** `false-sound-clusters`: "It is never thr." The tone counter-half is on `which-tone-decides`: the sound comes from neither letter, but the class still comes from ท (low), giving sâap and not a high-class sǎap.
4. **ผลิต (phà-lìt, not a cluster) vs ผลไม้ (phǒn-lá-máai, ผล is a bare pair, also not a cluster).** Both spelled with ผล; the script's point is that neither is a cluster but for two different reasons.
5. **พลัง (phá-lang, not a cluster) vs พลอย (phlaawi, is a cluster).** The sharpest pair in the lesson: identical written pair พล, opposite readings, and the script says the page will not tell you which.
6. **จริง (jing) and สร้าง (sâang) vs any ร that is pronounced.** `silent-second-clusters`: "Neither has an r in it anywhere."

Pairs the **symbols.ts / syllableRules.ts** explanations contrast:

7. **ทราบ is sâap, not \*thrâap\*** (`syllableRules.ts:234-235`).
8. **ถนน is thà-nǒn, not \*thnon\*** (`syllableRules.ts:241-242`).
9. **เสร็จ is the สร entry seen through its vowel, not a twenty-first pair** (`syllableRules.ts:245-248`) — a near-miss the script never mentions.
10. **ทร acts like ซ** (`symbols.ts` `tho-ro-s-sound`) — the contrast is with the letters' own sounds, not with a second word.
11. `consonant-clusters`'s own contrast is with **English** ("many more cluster possibilities"), not with a Thai pair. The script picks this up on `only-three-followers` ("str, spl, thw").

## Prerequisites

Sequence (`src/domain/script/data/lessonSequence.ts:59-79`), positions in declaration order:

```
1 lesson-01  2 lesson-02  3 lesson-03  4 lesson-04  5 lesson-05  6 lesson-06
7 lesson-07  8 lesson-08  9 lesson-09 10 lesson-10 11 lesson-11 12 lesson-12
13 lesson-13 14 lesson-14 15 lesson-unwritten-vowels 16 lesson-tone-marks
17 lesson-clusters 18 lesson-leading-consonants 19 lesson-numerals (optional)
```

`lesson-clusters` is **position 17**, legacy number 27, `required: true`.

Every Thai code point the script uses, with the lesson that teaches it:

| symbol | kind | taught at position |
|---|---|---|
| ม น า | consonant/vowel | 1 |
| ง ย ว | consonant | 2 |
| ก ด บ | consonant | 3 |
| ซ ะ ั ิ | consonant/vowel | 4 |
| พ ู | consonant/vowel | 5 |
| ค | consonant | 6 |
| ท | consonant | 7 |
| ร ล | consonant | 8 |
| ต ป จ | consonant | 9 |
| ไ | vowel | 10 |
| อ | consonant | 11 |
| ถ ข ผ ส | consonant | 12 |
| ศ | consonant | 13 |
| ้ (mai tho) | tone mark | 16 (`lesson-tone-marks`) |

**No example uses a letter, vowel or tone mark taught later than position 17.** The latest prerequisite is mai tho (้) in กว้าง and สร้าง, taught at position 16 — which is exactly the ordering constraint `lessonSequence.ts:52-55` records: "`lesson-tone-marks` comes after every spelling-based tone rule … and before `lesson-clusters` and `lesson-leading-consonants`, whose decks print marked words."

All 44 consonants are taught by position 14, so the full inventory (including ฉ, ษ, ฬ and the rare tail) is readable here.

## Risks

**1. SHORT-WORD RISK — example words under 3 Thai characters: none.**
Every word the script names is 3 code points or more. Shortest: ตรง, พระ, ปลา, ขวา, ทรง, ถนน — all exactly 3.

Adjacent, not a word: the script prints twenty **two-character pairs** (กร ขร คร ตร ปร พร กล ขล คล ปล ผล พล กว ขว คว ทร ซร จร ศร สร) plus ถน and ขน as counterexamples. These are letter pairs, not words, and are not synthesisable or verifiable as speech. If the narration pipeline reads slide body text aloud, `true-clusters`, `false-sound-clusters` and `silent-second-clusters` are almost entirely such runs. I could not find a codified minimum-word-length gate anywhere in `src/` or `scripts/` — the only length-like threshold is `MIN_VOICED_FRAMES = 10` in `scripts/audio-tone-check/check_tones.py:69`, which is an audio-frame count, not a character count.

**2. Example words absent from vocabulary.json: none.** All 24 words the script names resolve. Four of `CLUSTER_INVENTORY`'s canonical examples are absent — ขรุขระ, ขลุ่ย, ไซร้, ศรี — which is exactly why the script leaves ขร, ขล, ซร and ศร without example words. A rewrite that "helpfully" adds an example for one of those four would be adding a word the corpus cannot verify.

**3. Is the rule absolute or a tendency?**

The `consonant-clusters` record is stated as **absolute**, with no hedging: *"Only three letters can form consonant clusters when they follow other consonants: ร, ล, and ว."* `tho-ro-s-sound` and `silent-ro-clusters` are likewise flat statements with no qualifier. `syllableRules.ts`'s doc comment is emphatic about closure: *"The inventory is closed: a pair that is not listed here is not a cluster … the learner is reading off a list of 20, not judging plausibility."* So for this lesson, unlike `lesson-leading-consonants`, stating the rule as a law is the correct confidence.

The one genuinely soft part is **`lexical-pairs`**, and the script already flags it: ผล and พล are decided per-word, and "the page will not tell you." That is a lexical exception inside a closed inventory, not a hedge on the inventory itself.

**4. Data contradiction — ผลิต.** `CLUSTER_INVENTORY` (`syllableRules.ts:271`) gives ผลิต as the canonical example of ผล with romanisation **`phlìt`** (a true cluster). `vocabulary.json` gives ผลิต romanisation **`phà lìt`** (`toneStatus: "unsegmented"`, single-syllable `syllables` entry). The script sides with the corpus (`phà-lìt`), and `lesson-leading-consonants` also lists ผลิต as a *spoken-leader* word. One of the two data sources is wrong about this word, and both lessons currently read against `CLUSTER_INVENTORY`'s own example. Flagging rather than resolving.

**5. Taxonomy disagreement — ซร.** `symbols.ts` `silent-ro-clusters` puts ซ in the *silent-ร* group ("When ร forms consonant clusters with จ, ซ, ศ, or ส, the ร is silent"). `CLUSTER_INVENTORY` and the script put ซร in the *false-sound* group. Both readings produce `s`, so no audible difference, but the slide the pair lands on differs — and the test harness harvests `kind` from the slide, so the script's placement is what the inventory check sees.

**6. Rule-slide duplication.** `content/lessons/lesson-10.md:69-70` already renders `rule: consonant-clusters`. The learner meets the identical rule text at position 10 and again at position 17. Worth knowing before the narration decides how to introduce slide 8.

**7. Unclaimed declared rules.** Legacy lesson 27 declares `tho-ro-s-sound` and `silent-ro-clusters` (`symbols.ts:3392-3395`) and the script slides neither. The `false-sound-clusters` and `silent-second-clusters` expositions carry that material as the lesson's own prose instead, which means those two slides are *not* protected by the "a rule slide cannot drift from the rule" guarantee.

**8. The script currently has zero `narration:` lines, and narration is scanned by nothing.**
`grep -c "^narration:"` gives **0** for this script. Only `orientation` and `lesson-01` … `lesson-06` carry narration today (67, 60, 47, 52, 50, 43, 37 lines respectively); every lesson from `lesson-07` onward, including all three scoped here, has none.

The shape, from `content/lessons/lesson-06.md`: one `narration: en <prose>` line per slide, sitting between `heading:` and the bullet list.

Every check that reads a deck's text builds it through a `textsOf`/`textOf` helper, and **none of them includes narration**:
- `promotedLessons.test.ts:110-124` — `textOf` is `heading + body`; `textsOf` is `title + heading + prompt + body + answers`.
- `sequenceClosure.test.ts:108-117` and `middleBand.test.ts:107-116` — same fields.
- `openingBand.test.ts:117-131` — same, plus `slide.thai` (the reading panel).

So the inventory harvest, the closure-phrasing assertions, the glyph-coverage check and the rank-window check all read headings, prompts, bullets and answers only. `content/lessons/lesson-06.md:27-30` states the consequence in its own header: *"the check reads headings, prompts, bullets and answers — not narration. So ควาย, which ranks 2791, is spoken as the letter's name and never written into a bullet."*

Two things follow for this lesson. Narration can name a word outside the corpus or the rank window without failing anything — and narration that paraphrases a protected phrase is equally invisible, so it cannot *satisfy* an assertion either. Every phrase listed under "What the test harness enforces" must stay in a heading or bullet.

**9. `toneStatus` on the lexical pair words.** ผลิต, ผลไม้ and พลัง all carry `"toneStatus": "unsegmented"` in the corpus (contrast: every other word the script names is `"verified"`). ผลิต's `syllables` array claims one syllable while its romanisation shows two. The `lexical-pairs` slide is therefore the one slide whose four words all rest on unverified corpus analysis.

## Assets

**Images in `content/lessons/images/lesson-clusters/`: none — the directory does not exist.**
`content/lessons/images/` currently holds only `lesson-01` … `lesson-06` and `orientation`.

**`scene:` lines in the script: 0.**

This matches the convention for rule-teaching lessons: `lesson-unwritten-vowels`, `lesson-tone-marks` and `lesson-numerals` each have 0 `scene:` lines and 0 images. Letter-teaching lessons pair them 1:1 (e.g. `lesson-05` has 13 `scene:` lines and 13 images).

`public/lessons/lesson-clusters/manifest.json` declares `"assets": []`. No image references appear anywhere in `public/lessons/lesson-clusters/deck.json`.
