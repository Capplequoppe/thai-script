# The remaining lessons: what to build, in what order, and what blocks each

Consolidated from the thirteen scoping reports beside this file. Everything
here was verified by command; where a scout and I disagreed, the command won.

Six lessons ship today: orientation, 01, 02, 03, 04, 05, 06. **Thirteen are
writable. One is blocked on a decision that is not mine to make.**

---

## The premise I had wrong, corrected three ways

I had been saying that Thai words under three characters cannot be
synthesised, and had already replaced `ซิ` in lesson 4 on that basis. It is
not true, and three independent lines of evidence say so:

| evidence | finding |
|---|---|
| shipped manifests | **16** two-character Thai clips across lessons 01-06, **zero failures** |
| `vendor.py:961` | `CARRIER_LIMIT = 12` — anything shorter goes through the carrier |
| `vendor.py:986` | measured: bare request **3/5**, carrier cut on timings **5/5** |

What actually fails the bare gate is the **isolated letter name** — `มอ ม้า`
heard as `หมอ ม้า`, and five of five *native* recordings rejected. That is
what `recording:` exists for, and it is why pinning the letter names in
lessons 03-06 removed the retries rather than merely improving the voice.

The real cost of a short word is **retries, not failure**, because
`transcript_matches` uses a 0.9 ratio and a two-character string earns no
partial credit — one character of disagreement scores 0.5. `วง` and `คน` each
took three attempts and passed.

This correction matters beyond tidiness: `promotedLessons.test.ts:332`
*requires* `word.length === 2` for lesson-unwritten-vowels' `implicit-o` and
`bare-final-ro` derivations. Acting on the wrong premise there would have
meant rewriting examples the suite demands.

`ซิ` remains a genuine failure — 8 seeds, twice, heard as `ซ`. Every clip
that succeeds uses a vowel written *after*, *below*, or a *long* one above.
`ซิ` is the only short vowel written *above* a short syllable. That is a
hypothesis, not a finding, and it is narrow.

---

## Blocked, not writable

**`lesson-sound-buckets`.** `openingBand.test.ts:359` asserts it resolves to
`"undeclared"` — *"until its sequence position is decided"* — and
`lessonSequence.ts:242` names it as content shipped without a slot,
"unreachable from any route". Narration written for it reaches nobody, and
declaring it breaks the test guarding the decision.

It also carries a closure claim wider than its data: `bucket-two` says the
letters making "g, d and b" are "the whole of the mid class. Nine of them,
and the list has no leftovers." The nine include `จ` (*j*) and `อ`
(*silent*). The count is right and the converse is wrong.

**Decision needed:** give it a sequence position, or leave it parked. Until
then it is not an authoring task.

---

## The thirteen, in build order

Order follows the sequence, because each lesson's callbacks depend on the one
before. Two exceptions are noted.

### 07 — ท, ฮ, เ, เ-ะ · window 1-2500
Ready. All 13 recordings verified. **`ฮ` has exactly one usable word, `ฮา`
(2394)** — the next is rank 3478, far outside the window. If it will not
synthesise the letter has no word at all, so build this one early enough that
a problem is cheap.
`็` has no recording of its own; `symbols.ts:1806` points it at
`sara-e-short.mp3`.

### 08 — ร, ล, แ, แ-ะ · window 1-2000
Ready. Two gaps to write around: **`แ-ะ`'s with-final form has no usable
example** (the data's own is `แข็ง`, needing `ข` from lesson 12 under
`previews: none`), and **`และ` (rank 21) is a genuine `แ-ะ` word sitting
unlabelled** in the skeleton — the link is there to be drawn. The
`landing-as-n` claim covers `ล`, but every final-n example in the lesson uses
`ร`.

### 09 — จ, ต, ป, โ, โ-ะ · window 1-2000
Ready. **`โ-ะ`'s open form has no example and cannot have one** — `โต๊ะ`
needs a tone mark from a later lesson. The invisible form is well covered by
`คน`, `ตก`, `จน`. Carries the strongest inheritance in the band:
`lesson-03.md:61` promises the missing puff "turns into a shortcut that saves
you learning a whole set of them one at a time", and this is where it lands.

### 10 — เ-า, ไ, ใ · no consonant · window 1-2000
Ready, and confirmed to declare no consonant. **The twenty `ใ` words do not
exist as a list anywhere in the repo** — the corpus holds 160 `ใ` entries but
only sixteen monosyllables. `docs/vowel-house.md:394` logs this as an open
question; it is now answered "no". The skeleton's tactic — name five, meet
the rest as words — is the only one the data supports.

### 11 — อ as consonant and as vowel, เ-าะ · window 1-2000
Ready. Pays off `lesson-06.md:227`: *"It is a real letter with a real name
and a job of its own and it gets a whole lesson later on. Today it is a
chair."* The skeleton already calls back with lesson 6's own two words.

**The one test hole worth knowing.** `อ (as vowel)` and `เ-าะ` are a declared
length pair, and `เ-าะ` has exactly one word. The band test decomposes
`"เ-าะ"` into `เ`/`า`/`ะ`, all taught earlier, so the "declares X but never
uses it" assertion passes on any deck containing those characters anywhere.
**`เ-าะ` could vanish entirely and stay green.** This one needs an eye, not a
suite — and it is the third time this shape of gap has appeared.

### 12 — the temple cousins · window 1-1500
Ready. All 13 letter clips and 9 vowel clips present, every declared
consonant has a corpus word. Short words: `หา`, `ขอ`, `ผม`.
Grouping: cousin pairs, which `cousinPairs()` already computes. Gaps: `ฉ` has
no `confusablePairs` entry; `ญ` has **no already-taught shape anchor at all**.

### 13 — the Sanskrit set · window 1-1500
Ready. Clean on examples. Short words `ทำ` and `จำ` are **the only `ำ`
examples**, so that vowel's whole risk sits on two two-character words —
which, per the correction above, is a retry cost rather than a blocker.
Grouping: district, then cousin.

### 14 — the rare tail · window 1-2700
**The only lesson with missing assets.** `ฃ`, `ฅ` and `ฌ` have no
`consonant-*.mp3` and no `audioUrl` field — 42 files for 44 letters.

- `ฃ` and `ฅ` are obsolete, which is the `obsolete-consonants` rule's whole
  point; having no recording is arguably correct and can be said out loud.
- **`ฌ` is live, has no recording, and has zero corpus occurrences.**

There is an unreferenced `public/audio/consonant-cho-cho.mp3`. I tried to
identify it by transcription and the method cannot: whisper returned
`ช่วยเชิง` for it, `สวัสดีครับ` for the known-good `cho-chang`, and
`ต่อทิ้ง` for `cho-ching`. All three clips sit in the 0.9-1.4s band of every
other letter name, so those are mis-hearings, not contents — the documented
failure this pipeline already records. **Identifying it needs a human ear.**

Four declared letters have no possible example word: `ฎ` (fixable with
`กฎหมาย`, rank 515), and `ฃ`/`ฅ`/`ฌ` (no corpus occurrences at all). The
final band is covered by `sequenceClosure.test.ts`, which checks ranks and
forward references but **not** symbol usage, so this breaks nothing today. It
is a pedagogical gap, recorded so the call is deliberate.

Also: the vowel patterns split into Thai runs the word extractor reads as
words (`ีย`, `อะ`, `ัว`, `ือ`). `sequenceClosure.test.ts` exempts them by
deriving the set from the lessons table — **but only while each pattern is
spelled exactly as its row spells it**. Lesson 14 has four.

### tone-marks · window 1-1500
Ready, and **this one is closer to filling in a form than writing prose.**
`toneMarkLesson.test.ts:106` rebuilds the twelve-cell table by regex against
bullets on three fixed slides:

```
/mai (ek|tho|tri|chattawa)\b[^.]*?\bgives\b[^.]*?\b(low|falling|high|rising)\b/i
```

`if (!match) continue` — a reworded bullet is **skipped silently**, producing
a missing cell rather than an error naming the cause. So: *"mai ek **gives**
low"*, no full stop between mark and tone, and the unreachable line must read
*"mai tri and mai chattawa never sit over a temple letter"*.

**That second regex accepts `(?:temple|harbor)` — US spelling only**, against
every lesson written so far. The harbour/harbor split finally has a
consequence.

Closes `lesson-01.md:477`, which promises of `มา` versus `ม้า` that *"the
rule that produces it and the mark that spells it are both coming"*. `ม้า` is
already this lesson's low-class `mai tho` example. It is the only tone-mark
promise in lessons 01-06 and it closes exactly.

### clusters
Ready. `lesson-10.md:69` already carries a `rule: consonant-clusters` slide,
so that rule text appears twice in the course — worth reconciling.
`lesson-clusters` declares `tho-ro-s-sound` and `silent-ro-clusters` and
slides neither.

`promotedLessons.test.ts` harvests a twenty-pair inventory from four named
slides by regex, and fails if `only-three-followers` stops matching
`/ร, ล or ว/`, or if any slide *other than* `one-rule` matches the
class-transfer regex — which includes the natural phrase "the leader's
class". Frozen contradiction: `CLUSTER_INVENTORY` romanises `ผลิต` as
`phlìt`, `vocabulary.json` and both content lessons read `phà-lìt`, and
`promotedLessons.test.ts:1103` locks `ผลิต` onto `branch-spoken-leader`.

### leading-consonants
Ready, with one correction to make rather than inherit. **`akson-nam` says
verbatim: *"It is a strong tendency rather than an absolute: สมาชิก is
sa-MAA-chik, where the ม keeps its own low class."*** The skeleton's
`one-rule` slide states it unqualified and never mentions `สมาชิก`. A lesson
that teaches a tendency as a law teaches false confidence.

Worse: `akson-nam` carries `lesson: 19`, a retired legacy number, so **no
rule slide anywhere in the course can render it**. The branch this lesson
calls "wide open and you will meet it daily" has no data-backed rule text;
only the `ห` branch does.

Short words: `มด` (rank 3339) and `สน` (**absent from the corpus**, surviving
on a two-consonant exemption). The `hor-nam` rule slide renders `หมี` at rank
3363.

### numerals · window 1-1600
Ready. **Ten `digit-0.mp3` … `digit-9.mp3` exist, are non-empty, and are
referenced by nothing** — `ThaiNumeral` has no `audioUrl` field. Free assets,
contents unknown; a `recording:` line would take the escape route at
`pipeline.py:427` that skips transcribe-back, so **someone should listen
first**. The review cards grade untoned `suun`/`nueng` while the prose
teaches `sǔun`/`nùeng`.

### unwritten-vowels · no rank window
Ready, and **declares no `ranks:` line** — it is in `PROMOTED`, not
`NEW_LESSON_IDS`, so no rank test applies. Examples span rank 17 to 1723.

Eleven examples are two characters and **a test requires them to be**
(`promotedLessons.test.ts:332`). `ทรง`/`ทราย` on the `two-readings` slide
need the `ทร`→s rule taught two positions later in `lesson-clusters`.
`o-as-vowel` is already fully taught at `lesson-11.md:34`.

Pays off promises scattered through the written lessons — every place a
lesson says a short vowel is "left out" and "a later lesson explains it".

---

## Data defects found along the way

None of these block authoring; all are small and verified.

| defect | evidence |
|---|---|
| `ยก` romanised `jók` | every other `ย` word uses `y`: `yâak`, `yuuen`, `yaao` |
| `สน` absent from `vocabulary.json` | survives on a two-consonant exemption |
| `ผลิต` romanised two ways | `phlìt` in `CLUSTER_INVENTORY`, `phà-lìt` in the corpus; locked into a test |
| numerals graded untoned | review cards `suun`/`nueng` against prose `sǔun`/`nùeng` |
| `consonant-cho-cho.mp3` orphaned | referenced nowhere; contents unidentifiable by machine |
| `other-mayyamok.mp3` orphaned | for `ๆ`, referenced nowhere |
| `ฌ` has no recording | live letter, no audio, no corpus word |

---

## What every lesson needs, learned the hard way

Carried forward from lessons 03-06, where each was learned by getting it
wrong:

1. **Measure the voice against lesson 1 before rendering.** Negation-for-
   emphasis regressed to 5.1% in lesson 3 and 7.0% in lesson 6 against lesson
   1's 2.5%. It is the single reliable tell and it is cheap to check.
2. **Rapport questions.** Lesson 1 asks 2.2%; lessons 5 and 6 both arrived at
   zero.
3. **Every declared symbol must appear in a word**, not only as a glyph. Both
   halves of a length pair. Caught late in lessons 5 and 6, and lesson 11's
   test cannot catch it at all.
4. **Pen and paper, per letter**, and say both halves of the name aloud.
5. **A challenge and its answer never share a slide.**
6. **Verify every `recording:` path with `ls`.** `po-phan` was wrong for `พ`;
   it is `pho-phan`, and `po-pla` is a different letter.
7. **Image prompts:** never name what the scene is defined by *not* being;
   exclusions belong in `NEGATIVE_PROMPT`; never ask for Thai letterforms —
   `compose.py` overlays those in a real font.
8. **Do not sharpen a prompt to force a relationship between figures.** Tried
   twice, worse twice, and measurably: lesson 6's `the-pair` lost the bowl —
   the glyph's own shape — when pushed to show the buffalo's head, and lesson
   7's `written-first-spoken-second` went 0.239 to 0.222 and gained a third
   figure when pushed to show one person waiting while another passes. The
   model renders objects and settings well and relationships badly. Pick a
   scene whose composition already implies the relationship, or let the
   caption carry it. Reverting is free — the same prompt and seed reproduce
   the earlier image exactly.
8. **Restart the dev server after every render.** Vite snapshots `public/` at
   startup and serves the SPA fallback for anything added later, which
   presents as silent audio and no error.
