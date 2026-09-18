# Scoping: lesson-leading-consonants

Source script: `content/lessons/lesson-leading-consonants.md`
Built deck: `public/lessons/lesson-leading-consonants/deck.json`, `public/lessons/lesson-leading-consonants/manifest.json`

## Declares

Title line: `# Leading consonants: อักษรนำ`
Lesson id line: `lesson: lesson-leading-consonants`

HTML comment header, verbatim:

```
Phase 3, promoted lesson 3 of 3, and the repair this phase exists to make. The
source course states the ห case and the อ case ten lessons apart and never
connects them, and states the productive case once as an observation about two
words. They are one mechanism and this lesson says so once.
previews: none

The rule is stated on `one-rule` and nowhere else. `promotedLessons.test.ts`
asserts that: a branch slide that restates the class transfer in its own words
is the split being repaired, growing back.
```

`previews:` line, verbatim (`content/lessons/lesson-leading-consonants.md:10`):

```
previews: none
```

`ranks:` line: **absent.** The script declares no rank window.

**New consonants or vowels declared: none.** `src/domain/script/data/symbols.ts:3398-3408` files this lesson as legacy number 28 with `consonants: []`, `vowels: []`, `toneMarks: []`, `toneRulesIntroduced: []`. Rule-only.

Slides, in order (11 total, 0 `scene:` lines):

| # | kind | id |
|---|---|---|
| 1 | exposition | `why-it-exists` |
| 2 | exposition | `one-rule` |
| 3 | exposition | `branch-silent-h` |
| 4 | exposition | `branch-silent-o` |
| 5 | exposition | `branch-spoken-leader` |
| 6 | retrieval | `two-first-letters` |
| 7 | reveal | `two-first-letters-answer` |
| 8 | rule | `hor-nam` |
| 9 | exposition | `not-every-pair` |
| 10 | retrieval | `which-tone` |
| 11 | reveal | `which-tone-answer` |

`rule:` slides in the script: exactly one — `rule: hor-nam`.

Rule the lesson table makes available but the script does **not** slide (`symbols.ts:3407`): `silent-o-before-yo`.

## The rule being taught

### `hor-nam` — the one rule slide

`src/domain/script/data/symbols.ts:587-594`, quoted in full:

```ts
{
    id: "hor-nam",
    title: "ห as Class-Changing Prefix (ห นำ)",
    description:
        "ห can be placed as a silent letter before a low class consonant to make it follow high class tone rules. This allows low class consonants to produce rising tone and low tone, which they cannot make on their own. Example: หมี (mii, rising tone) = bear.",
    lesson: 28,
},
```

A rule slide renders `title` + `description` and nothing else (`lessonContent.ts:214-255`). So slide 8 will show only the ห branch — the lesson's own prose carries the other two branches.

Note the record's example, **หมี**, does not appear anywhere in the script.

### `silent-o-before-yo` — declared, not slid

`src/domain/script/data/symbols.ts:650-657`, quoted in full:

```ts
{
    id: "silent-o-before-yo",
    title: "Silent อ Before ย (4 Words)",
    description:
        "Placing silent อ before ย makes it act like a mid class consonant. Only 4 words use this: อย่า (yaa, don't), อยู่ (yuu, to stay), อย่าง (yaang, a type), อยาก (yaak, to want). Mnemonic: อย่าอยู่อย่างอยาก = Don't exist in a state of desire.",
    lesson: 28,
},
```

### `akson-nam` — the productive branch's rule record, reachable from no lesson

`src/domain/script/data/symbols.ts:580-586`, quoted in full:

```ts
{
    id: "akson-nam",
    title: "อักษรนำ (Leading Consonant Across Syllables)",
    description:
        "When a word starts with a lone consonant that has no vowel of its own, that consonant becomes its own short syllable with an unwritten 'a' — and if the next syllable starts with one of the single-class low consonants (ง ญ ณ น ม ย ร ล ว ฬ), the leading consonant also lends it its class. ขนาด is kha-NAAT: ข is high class, so the น is read as high class too, giving low tone rather than falling. Same idea as ห นำ, but across two syllables instead of inside one. It is a strong tendency rather than an absolute: สมาชิก is sa-MAA-chik, where the ม keeps its own low class.",
    lesson: 19,
},
```

**`akson-nam` carries `lesson: 19`, and legacy lesson 19 no longer exists.** The `lessons` table in `symbols.ts` declares numbers 1-14, 26, 27, 28, 29, 30 only; 19 was retired by task 4.3 (`lessonSequence.ts:99-114`, `{ legacyNumber: 19, absorbedBy: "lesson-14" }`). No lesson lists `akson-nam` in `specialRulesIntroduced`, so no `rule:` slide anywhere in the course can render it (`lessonContent.ts:563-573` would reject it as `unknown-rule`). The corpus still tags 8+ entries with `"akson-nam"` in their `specialRules`, including every spoken-leader word this lesson uses.

Consequence for scoping: the *only* rule text this lesson can render from data is the ห branch. The whole productive branch — the branch the script calls "wide open and you will meet it daily" — is the lesson's own prose, with no data-backed rule slide behind it.

### The unified rule the lesson is checked against

`src/domain/script/data/syllableRules.ts:396-435`, `LEADING_CONSONANT_RULE`, quoted in full:

```ts
export const LEADING_CONSONANT_RULE = Object.freeze({
    id: "leading-consonant",
    title: "อักษรนำ — the leading consonant",
    statement:
        "A mid- or high-class consonant written in front of a sonorant leads it: the sonorant is pronounced with the leader's class, not its own.",
    whyItExists:
        "The ten sonorants ง ญ ณ น ม ย ร ล ว ฬ are low class and have no high- or mid-class counterpart, so on their own they cannot be written with a rising tone or a low tone. A leader is how those tones are spelled.",
    branches: Object.freeze([
        Object.freeze({
            id: "silent-h" as const,
            leaders: Object.freeze(["ห"]),
            leaderPronounced: false,
            closure: "productive" as const,
            words: Object.freeze(["หมอ", "หลง", "หมด", "หนอง", "หรอก", "หลวง"]),
            statement:
                "ห before a sonorant is not pronounced. It is there to make the sonorant high class.",
            extendsSpecialRule: "hor-nam",
        }),
        Object.freeze({
            id: "silent-o" as const,
            leaders: Object.freeze(["อ"]),
            leaderPronounced: false,
            closure: "closed" as const,
            words: O_LEADING_WORDS,
            statement:
                "อ before ย is not pronounced, and makes ย mid class. This happens in four words and nowhere else.",
            extendsSpecialRule: "o-ang-dual-role",
        }),
        Object.freeze({
            id: "unstressed-leader" as const,
            leaders: UNSTRESSED_LEADERS,
            leaderPronounced: true,
            closure: "productive" as const,
            words: Object.freeze(["สวัสดี", "ถนน", "ขนม", "ตลก", "สงบ", "ตลอด"]),
            statement:
                "Any other mid- or high-class consonant in front of a sonorant is pronounced, as its own unstressed syllable with an unwritten อะ — and it still hands the sonorant its class.",
            extendsSpecialRule: "unwritten-vowels",
        }),
    ]) as readonly LeadingBranch[],
});
```

Its framing doc comment (`syllableRules.ts:317-331`), quoted in full:

```
The repair this phase exists to make.

The source course states the ห case in its lesson 15 and the อ case in its
lesson 11 and never connects them; the productive case it states once, about
two words, as an observation. They are one rule:

  **A leading consonant begins the written word but not the spoken syllable.
  It hands its class to the consonant after it.**

The three branches differ only in what happens to the leader's own sound —
dropped (ห), dropped (อ), or kept as an unstressed อะ syllable — and in
whether the branch is open or closed.
```

`O_LEADING_WORDS` (`syllableRules.ts:385-394`): `["อย่า", "อยู่", "อย่าง", "อยาก"]`, with the comment *"อ leads in exactly four words. There is no fifth; the branch is closed and the lesson says so."*

`SONORANTS` (`syllableRules.ts:82-107`) is **derived**, not listed — it is the set of consonants `soundType.ts` classifies as `sonorant`, which resolves to ง ญ ณ น ม ย ร ล ว ฬ. The doc comment: *"This is the set of low-class consonants with no high-class counterpart — which is why the leading-consonant rule exists at all: it is the only way to write a rising or a low tone on one of them."*

`UNSTRESSED_LEADERS` (`syllableRules.ts:365-372`) is likewise derived: every consonant of mid or high class except ห and อ, which are held out because each has its own branch. Its doc comment (`syllableRules.ts:349-363`) records that a hand-written list of leaders was wrong and that **ส leads สวัสดี at rank 9 and was missing**.

### What the test harness enforces on this lesson's prose

From `src/domain/script/data/promotedLessons.test.ts`:

- `BRANCH_SLIDES` (`:454-458`) hard-codes the slide ids `branch-silent-h`, `branch-silent-o`, `branch-spoken-leader`. Renaming a slide breaks the harvest.
- **The class transfer must appear on `one-rule` and on no other slide.** `:1040-1055` collects every slide whose heading or body matches `CLASS_TRANSFER` (`:447-449`: `/\bhands? (?:its|their) class\b|\bpasses (?:its|their) class\b|\bgives (?:its|their) class\b|\bthe leader's class\b/i`) and asserts the list is exactly `["one-rule"]`, with the failure message "the class transfer is stated on more than one slide, which is the split this lesson exists to close".
- `why-it-exists` must contain a line matching `/\bare the sonorants\b/i`, and the Thai letters on that line must be exactly the ten `SONORANTS` (`:474-481`, `:1109-1113`).
- The leaders of each branch are read from the slide **heading**, not the body (`:487-491`) — so ห must appear in `branch-silent-h`'s heading and อ in `branch-silent-o`'s.
- A branch counts as silent-leadered if its text matches `SILENT_LEADER` (`:450-451`: `/\bsilent\b|\bnever spoken\b|\bnot spoken\b|\bnot hear it\b/i`); `branch-spoken-leader` must match none of those.
- A branch counts as closed if its text matches `CLOSED_BRANCH` (`:452`: `/\bcomplete list\b|\bno fifth\b|\bno more\b/i`). `branch-silent-o` must match it; the other two must not.
- `branch-silent-o` must additionally match `/\bfour\b/i`, and its harvested word list must equal `O_LEADING_WORDS` exactly (`:1087-1095`).
- `branch-silent-h` must match `/\bopen\b/i` (`:1107`).
- `branch-spoken-leader` must literally contain all seven of `AC2_SPOKEN_LEADER_WORDS` (`:940-948`): **สวัสดี, ขนาด, ตลอด, สงบ, สมัย, ผลิต, ถนน** (`:1103-1106`).

## Worked examples and ranks

All ranks and glosses from `src/domain/vocabulary/data/vocabulary.json`. "chars" = Thai code points.

### Slide `why-it-exists` — the ten sonorants

ง ญ ณ น ม ย ร ล ว ฬ. No words. This list is asserted equal to the derived `SONORANTS` set.

### Slide `branch-silent-h` — ห leads, and is not heard

| word | vocab romanisation | vocab English | rank | chars | illustrates |
|---|---|---|---|---|---|
| หมด | mòt | all; empty | 367 | 3 | ห + ม, **low tone** — a tone ม cannot spell alone. `specialRules: ["hor-nam","unwritten-vowels"]`. Reused as the counterexample anchor on slides 6, 10, 11. |
| หลง | lǒng | lost; neglected; mentally weak | 1149 | 3 | ห + ล, **rising tone** — the other tone ล cannot spell alone. Script glosses "to be lost". |
| หนัง | nǎng | film | 617 | 4 | ห + น, rising. The only ห word here with a written vowel (ั) rather than an unwritten one. |
| หญิง | yǐng | female | 370 | 4 | ห + ญ, rising — demonstrates that the rule ranges over the *rare* sonorants too, not just น/ม/ล. Script glosses "a woman". |
| หมอ | mǎaw | doctor | 318 | 3 | ห + ม, rising — pairs against หมด (same leader, same sonorant, different tone from live/dead). |
| หรอก | ràawk | surely not; of course not | 133 | 4 | ห + ร, low, dead. **Highest-frequency ห word in the lesson.** Script glosses "softens a denial". |

The slide closes with "Any of the ten may follow it, and new words still take it, so treat this as open" — the `closure: "productive"` claim and the `/\bopen\b/i` assertion.

Branch words in `LEADING_CONSONANT_RULE` the script does **not** use: หนอง (nǎawng, "pus; swamp, bog, mire", rank 1310) and หลวง (lǔang, "royal", rank 557). Both are present in the corpus; the script substitutes หนัง, หญิง and หรอก instead.

### Slide `branch-silent-o` — อ leads ย, four words, closed

| word | vocab romanisation | vocab English | rank | chars | illustrates |
|---|---|---|---|---|---|
| อย่า | yàa | do not | 562 | 4 | อ + ย → mid class; mai ek on mid class + live = low tone. |
| อยู่ | yùu | located; present; exists | 49 | 4 | Same, and the **highest-ranked word in the whole lesson**. |
| อย่าง | yàang | type; like | 56 | 5 | Same; rank 56. |
| อยาก | yàak | want | 95 | 4 | Same, but **dead** syllable — mid class + dead = low with no tone mark needed. |

All four carry `specialRules: []` in the corpus — the `silent-o-before-yo` tag is not applied to them. All four are `syllables: [{ consonantClass: "mid", … }]`, so the corpus already records the class transfer as having happened.

The slide's contrast words:

| word | vocab romanisation | vocab English | rank | chars | illustrates |
|---|---|---|---|---|---|
| ยาก | yâak | difficult | 331 | 3 | Bare ย, **low class**, dead long → falling. Minimal pair against อยาก (yàak). |
| ยาว | yaao | long | 381 | 3 | Bare ย, low class, live → mid tone. Minimal pair against อย่าง in shape only. |

### Slide `branch-spoken-leader` — any other mid/high leader, and you hear it

The seven the test requires literally:

| word | vocab romanisation | vocab English | rank | chars | leader → sonorant | illustrates |
|---|---|---|---|---|---|---|
| สวัสดี | sà wàt dii | hello | 9 | 6 | ส → ว | The anchor case, explicitly cited "at rank nine". **`toneStatus: "unsegmented"`**; corpus `syllables` splits it `สวัส` + `ดี` (two, not three), contradicting the three-part romanisation. |
| ขนาด | khà nàat | size | 176 | 4 | ข → น | High leader; ข makes น high, so low tone not falling. This is the exact example inside the `akson-nam` record. `specialRules: ["akson-nam","unwritten-vowels"]`. |
| ตลอด | dtà làawt | throughout; always | 264 | 4 | ต → ล | **Mid** leader — the only mid-class leader in the required seven, so it is what proves the branch is not high-class-only. |
| สงบ | sà-ngòp | calm | 383 | 3 | ส → ง | High leader over ง, a sonorant that is easy to misread as a final. |
| สมัย | sà mǎi | period | 415 | 4 | ส → ม | High leader; second syllable is **live**, so rising (มัย → mǎi) rather than low — the branch's only rising outcome. |
| ผลิต | phà lìt | manufacture | 483 | 4 | ผ → ล | High leader. **Contradicted by `CLUSTER_INVENTORY`, which lists ผลิต as the true-cluster example for ผล with romanisation `phlìt`.** See Risks. `toneStatus: "unsegmented"`. |
| ถนน | thà-nǒn | street | 590 | 3 | ถ → น | High leader; also the counterexample `lesson-clusters` uses for "not a cluster". |

The five the slide adds as "the same shape":

| word | vocab romanisation | vocab English | rank | chars | leader → sonorant | illustrates |
|---|---|---|---|---|---|---|
| ตลก | dtà-lòk | funny | 1678 | 3 | ต → ล | Mid leader, both syllables dead. **Highest rank in the lesson.** |
| ขนม | khà nǒm | candy | 1502 | 3 | ข → น | High leader, live second syllable → rising. |
| สบาย | sà baai | comfortable | 44 | 4 | ส → บ | **บ is not a sonorant.** `specialRules: ["unwritten-vowels"]` only — no `akson-nam` tag, and the corpus reads บาย as **mid** class (บ's own class), not high. See Risks. |
| ตลาด | dtà-làat | market | 695 | 4 | ต → ล | Mid leader, dead second syllable. |
| ฉลาด | chà-làat | clever | 1478 | 4 | ฉ → ล | High leader; the only ฉ word in the lesson. |

### Slide `not-every-pair` — when a first letter is just the initial

| word | vocab romanisation | vocab English | rank | chars | illustrates |
|---|---|---|---|---|---|
| สนใจ | sǒn jai | interested | 384 | 4 | ส + น read **into one syllable** with an unwritten short o — so ส is an ordinary initial, not a leader. Corpus `syllables`: `สน` + `ใจ`. |
| สน | — | — | — | 2 | Cited as a fragment ("สน is a bare pair with a short o"), not as a word. **Absent from vocabulary.json.** |
| นคร | ná khaawn | city | 988 | 3 | A **low-class** first letter, so no leading at all: two ordinary syllables. `specialRules: ["unwritten-vowels"]` — note, no `akson-nam`. |

### Slides `which-tone` / `which-tone-answer` — the minimal pair

| word | vocab romanisation | vocab English | rank | chars | illustrates |
|---|---|---|---|---|---|
| มด | mót | ant | **3339** | **2** | Bare ม, low class, short dead → high tone. |
| หมด | mòt | all; empty | 367 | 3 | ห + ม, high class, short dead → low tone. |

**Rank window:** the lesson declares none. Observed range across the script's own words: rank 9 (สวัสดี) — or rank 44 (สบาย) / 49 (อยู่) among non-anchor words — up to **rank 3339 (มด)**. Excluding มด, the top is 1678 (ตลก). The rule slide adds a word the script does not name: **หมี at rank 3363**, from the `hor-nam` record's example. มด and หมี are the two furthest-out words in any of the three lessons scoped here; the next highest anywhere is 1740.

**Every word the script names is present in vocabulary.json except the fragment สน**, which the script presents as a syllable, not a word.

## Counterexamples

Pairs the **skeleton** contrasts:

1. **หมด (mòt, low) vs มด (mót, high).** Slides 10-11, and the lesson's sharpest pair: identical after the ห, identical vowel, identical dead ending, opposite tone. The reveal names the cause: "ม is low class … the ห in front makes the reading a high class one."
2. **หมด (ห not spoken) vs ตลก (ต spoken).** Slides 6-7. The pair the retrieval is built on. The reveal's point: "In both, the letter in front is the one the tone is worked out from … Spoken or not spoken: that is all that separates one branch from the next."
3. **อยาก (yàak) vs ยาก (yâak).** `branch-silent-o` — same ย, same vowel, same dead ending; the อ changes mid-class low tone into low-class falling. The script states it as "Read ยาก and ยาว as the low class ย they are, because nothing precedes them."
4. **อย่าง (yàang) vs ยาว (yaao).** Same slide; the second half of the same closure argument.
5. **ถนน / ขนาด (ส-type leader, two syllables) vs สนใจ (ส is the initial, one syllable).** Slide `not-every-pair`: "Count syllables the shorter way first. Only when a letter cannot be read into the syllable beside it does it become a leader." ส + น in สนใจ reads as one syllable (sǒn); ถ + น in ถนน cannot, so ถ leads.
6. **ขนาด (high leader, leads) vs นคร (low leader, does not).** Same slide: "a low class first letter never leads at all. It has no class the sonorant does not already have, so นคร is ná-khaawn with two ordinary syllables."
7. **ห silent vs ส/ข/ต/ผ/ถ/ฉ spoken** — the branch structure itself, `branch-silent-h` against `branch-spoken-leader`.

Pairs the **symbols.ts / syllableRules.ts** explanations contrast:

8. **ขนาด (ข lends its class to น → low tone) vs สมาชิก (ม keeps its own low class).** The `akson-nam` record, verbatim: *"It is a strong tendency rather than an absolute: สมาชิก is sa-MAA-chik, where the ม keeps its own low class."* สมาชิก is in the corpus at rank 772 (`sà maa chík`, "member") with `toneStatus: "exception"`. **The script never mentions สมาชิก or any counterexample to the productive branch.** This is the single most significant gap between the data and the skeleton.
9. **หมี (mii, rising) vs a bare มี** — implied by the `hor-nam` record's example. หมี is not in the script; มี is not contrasted anywhere. The rule slide will show หมี with no surrounding treatment.
10. **The four อ words vs every other ย word** — implied by `silent-o-before-yo`'s "Only 4 words use this", and by `promotedLessons.test.ts:1096` which asserts that `applyLeadingRule(rule, "อ", "ย", "ยาก").leads` is `false`.
11. **A low-class leader leads nothing** — `promotedLessons.test.ts:1079-1080` asserts `applyLeadingRule(rule, "ล", "ม", "ลม").leads === false`. ลม is in the corpus (rank 435, `lom`, "wind", 2 chars) but is not used by the script — it uses นคร for the same point.
12. **ห and อ held out of `UNSTRESSED_LEADERS`** (`syllableRules.ts:349-363`), and **อร่อย held out deliberately**: *"That is also why อ is absent despite อร่อย: these lessons teach the อ branch as closed at four words (AC4), and a pronounced-อ reading is not in scope."* อร่อย is in the corpus at rank 154 (`à-ràwy`, "Delicious!") with `specialRules: ["akson-nam","unwritten-vowels"]` — a real word where อ leads and *is* pronounced, which the lesson's "there is no fifth word and no fifth is coming" does not cover. See Risks.

## Prerequisites

Sequence (`src/domain/script/data/lessonSequence.ts:59-79`). `lesson-leading-consonants` is **position 18** of 19, legacy number 28, `required: true` — the last required lesson in the course (`lesson-numerals` at 19 is optional).

Every Thai code point the script uses, with the lesson that teaches it:

| symbol | kind | taught at position |
|---|---|---|
| น ม า | consonant/vowel | 1 |
| ง ย ว | consonant | 2 |
| ก ด ี บ | consonant/vowel | 3 |
| ั ิ | vowel | 4 |
| ู | vowel | 5 |
| ค | consonant | 6 |
| ร ล | consonant | 8 |
| ต จ | consonant | 9 |
| ใ | vowel | 10 |
| อ | consonant | 11 |
| ห ข ส ผ ถ ฉ | consonant | 12 |
| ษ ำ ญ ณ | consonant/vowel | 13 |
| ฬ | consonant | 14 |
| ่ (mai ek) | tone mark | 16 (`lesson-tone-marks`) |

**No example uses a letter, vowel or tone mark taught later than position 18.** Latest prerequisites:

- **ฬ** (position 14, `lesson-14`) — used only in the ten-sonorant list on `why-it-exists`. Taught four positions earlier.
- **ญ, ณ** (position 13, `lesson-13`) — ญ is used both in the sonorant list and in the example หญิง; ณ only in the sonorant list.
- **ษ, ำ** (position 13) — used only in the word อักษรนำ in the lesson title.
- **mai ek ่** (position 16, `lesson-tone-marks`) — in อย่า, อยู่, อย่าง. This is the ordering constraint `lessonSequence.ts:52-55` records explicitly.

All 44 consonants and all written vowels are taught by position 14, so the lesson sits safely after everything it needs.

## Risks

**1. SHORT-WORD RISK — example words under 3 Thai characters: TWO.**

- **มด (2 code points, rank 3339)** — the anchor of the `which-tone` retrieval and its reveal. It is a real corpus word (`mót`, "ant", `toneStatus: "verified"`) but it is two characters and cannot be synthesised/verified under the stated pipeline constraint. It is also structurally load-bearing: the whole minimal pair หมด/มด collapses without it.
- **สน (2 code points)** — on `not-every-pair`, presented as a syllable fragment rather than a word, and **absent from vocabulary.json** (see risk 2).

Everything else is 3 code points or more. Exactly-3 words: หมด, หลง, หมอ, สงบ, ถนน, ตลก, ขนม, นคร, ยาก, ยาว.

No codified minimum-word-length gate exists anywhere I could find in `src/` or `scripts/`; the only length-like threshold is `MIN_VOICED_FRAMES = 10` in `scripts/audio-tone-check/check_tones.py:69`, an audio-frame count.

**2. Words absent from vocabulary.json: one — สน.** Used on `not-every-pair` as "สน is a bare pair with a short o". It is a syllable of สนใจ, not a standalone entry. Everything else the script names resolves.

**3. Is the rule absolute or a tendency?**

This is the lesson's central risk, and the skeleton currently states as a law something the data explicitly hedges.

The `akson-nam` record — the rule record for the **productive branch**, which is the branch the script calls "wide open and you will meet it daily" — says verbatim:

> *"It is a strong tendency rather than an absolute: สมาชิก is sa-MAA-chik, where the ม keeps its own low class."*

The skeleton's `one-rule` slide states it without qualification: *"A mid or high class consonant written directly in front of a sonorant leads it, and hands its class to the syllable the sonorant opens."* `branch-spoken-leader` adds no hedge either. `LEADING_CONSONANT_RULE.statement` is also unhedged: *"A mid- or high-class consonant written in front of a sonorant leads it: the sonorant is pronounced with the leader's class, not its own."*

So `syllableRules.ts` and `symbols.ts` disagree with each other about the confidence of this rule, and the skeleton follows the unhedged one. The only hedge the script offers is the syllable-counting heuristic on `not-every-pair` ("Count syllables the shorter way first"), which addresses a *different* failure mode (สนใจ) than the one `akson-nam` names (สมาชิก, where the split is right but the class transfer does not happen).

The other two branches are stated as absolutes by every source and there is no hedging language on either:
- `hor-nam`: "ห can be placed as a silent letter before a low class consonant to make it follow high class tone rules."
- `silent-o-before-yo`: "Only 4 words use this."

**4. Corpus counterexamples to the productive branch the script does not address.**

- **สมาชิก** (rank 772, `sà maa chík`, "member"). `toneStatus: "exception"`. Its corpus `syllables` are internally inconsistent: `ส[high/dead/low] + มา[high/live/mid] + ชิก[low/dead/high]` — the second syllable is tagged `consonantClass: "high"` but `tone: "mid"`, and high class + live should be rising, not mid. The romanisation (`maa`) matches a **low**-class reading. So the corpus row records the class transfer as having happened while its tone and romanisation record it as not having happened. One of the two is wrong.
- **สบาย** (rank 44, `sà baai`). The script lists it under "the same shape" on `branch-spoken-leader`, but บ is **not a sonorant** — the rule as stated does not apply to it. Its corpus row agrees: `specialRules: ["unwritten-vowels"]` with no `akson-nam` tag, and the second syllable reads as **mid** class (บ's own), not high (ส's). สบาย is an unwritten-vowel two-syllable word, not a leading-consonant word, and listing it on this slide teaches the rule as broader than it is.
- **อร่อย** (rank 154, `à-ràwy`). `specialRules: ["akson-nam","unwritten-vowels"]`. A common word where อ leads ร and **is pronounced** — a fifth อ word in the broad sense. The script's "There is no fifth word and no fifth is coming" is true only for the *silent*-อ reading. `syllableRules.ts:359-363` records the exclusion as deliberate and in-scope-limited; the script states it flatly.

**5. `akson-nam` is unreachable as a rule slide** (`lesson: 19`, and legacy 19 is retired — see "The rule being taught"). The productive branch therefore has no data-backed rule text anywhere in the course, while the ห branch has one. If the narration wants the rule slide to cover what the lesson actually teaches, the gap is structural, not editorial.

**6. `hor-nam`'s rendered example is orphaned, and it is a rank-3363 word.** Slide 8 will print "Example: หมี (mii, rising tone) = bear." หมี appears nowhere else in the script. It *is* in the corpus — rank **3363**, `mǐi`, "bear", 3 chars, `specialRules: ["hor-nam"]`, `toneStatus: "verified"` — but at rank 3363 it is the second-furthest-out word anywhere in this lesson, behind only มด at 3339. Note also that the record's romanisation is written `mii` (no tone diacritic) while its own gloss says "rising tone"; the corpus spells it `mǐi`. The obvious minimal partner มี (rank 11, `mii`, "have; there is") is 2 chars and is not used anywhere.

**7. `toneStatus` on the required spoken-leader words.** สวัสดี and ผลิต are both `"unsegmented"`, and สมาชิก is `"exception"`. สวัสดี's corpus `syllables` array has two entries (`สวัส` + `ดี`) while its own romanisation has three (`sà wàt dii`) — the very word the script cites as "at rank nine is this branch".

**8. Data contradiction — ผลิต.** `CLUSTER_INVENTORY` (`syllableRules.ts:271`) lists ผลิต as the canonical **true-cluster** example for ผล, romanised `phlìt`. This lesson lists it as a **spoken-leader** word (`phà-lìt`), and `lesson-clusters`'s `lexical-pairs` slide also says it is not a cluster. Both content lessons agree with each other and with `vocabulary.json`, and both disagree with `CLUSTER_INVENTORY`. The test at `promotedLessons.test.ts:1103-1106` requires ผลิต to be on `branch-spoken-leader`, so the disagreement is currently frozen into the test suite.

**9. The script currently has zero `narration:` lines, and narration is scanned by nothing.**
`grep -c "^narration:"` gives **0** for this script. Only `orientation` and `lesson-01` … `lesson-06` carry narration today; every lesson from `lesson-07` onward, including all three scoped here, has none.

The shape, from `content/lessons/lesson-06.md`: one `narration: en <prose>` line per slide, between `heading:` and the bullets.

Every check that reads deck text builds it through a `textsOf`/`textOf` helper, and **none includes narration** — `promotedLessons.test.ts:110-124`, `sequenceClosure.test.ts:108-117`, `middleBand.test.ts:107-116`, `openingBand.test.ts:117-131` all take `title + heading + prompt + body + answers` (plus `slide.thai` in the opening band) and nothing else. `content/lessons/lesson-06.md:27-30` states the consequence explicitly: *"the check reads headings, prompts, bullets and answers — not narration."*

Two consequences here. Narration may name a word outside the corpus (สมาชิก, อร่อย, มี, ลม, หมี) with no gate. But narration is **also** invisible to the class-transfer detector at `promotedLessons.test.ts:1040-1055` — so the "stated once" guarantee does not actually hold for narration, and narration on a branch slide could restate the class transfer without failing the test that exists to prevent exactly that. The guarantee is a bullet-and-heading guarantee only.

**10. The "state the rule once" constraint is narrow and brittle.** `promotedLessons.test.ts:1040-1055` fails if *any* slide other than `one-rule` matches the class-transfer regex. Narration that paraphrases "hands its class" on a branch slide, a reveal, or even the retrieval prompt will break the build, and the failure message frames it as re-opening the split the lesson exists to close. The regex also matches "the leader's class", which is a natural phrase to reach for.

## Assets

**Images in `content/lessons/images/lesson-leading-consonants/`: none — the directory does not exist.**
`content/lessons/images/` currently holds only `lesson-01` … `lesson-06` and `orientation`.

**`scene:` lines in the script: 0.**

Consistent with the other rule lessons (`lesson-clusters`, `lesson-unwritten-vowels`, `lesson-tone-marks`, `lesson-numerals`: all 0 scenes, 0 images).

`public/lessons/lesson-leading-consonants/manifest.json` declares `"assets": []`; no image references in its `deck.json`.
