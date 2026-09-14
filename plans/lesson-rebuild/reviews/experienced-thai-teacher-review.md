---
doc_type: review
title: "Thai pedagogy review — lesson rebuild"
description: Linguistic and pedagogical review of the lesson-rebuild execution plan by an experienced Thai teacher, with every load-bearing factual claim verified against symbols.ts, vocabulary.json and the source transcripts.
reviewer: experienced-thai-teacher
plan: plans/lesson-rebuild
generated: {by: claude-opus-5/agent, at: 2026-09-13}
---

# Thai pedagogy review — lesson rebuild

## Executive Summary

This is a good plan built on a mostly-correct linguistic model. The core
insight — that Thai consonant class is a phonetic natural class and collapses
from 44 memorised facts to 10 sonorants + 9 unaspirated stops + a list of 11 —
is **correct as stated**, and I verified every count against `symbols.ts`. The
sequencing it chooses to keep is genuinely good and I would keep it too. The
scene-grammar / district / tone-motion encoding is the right shape, and the
decision to give the vertical axis to tone rather than class is the decision a
teacher would make.

Two of its claims about Thai are wrong in ways that will reach learners, and
both sit in phase 3:

1. **The unwritten-vowel rule is a minority pattern, not the rule.** Of the ~60
   bare three-consonant words in the corpus's top 2,000, roughly six follow the
   plan's stated rule. The dominant readings are `อ` as the vowel สระ ออ
   (ของ, rank 17), `ว` as สระ อัว (รวม, 298), true clusters (ตรง, 142) and
   false clusters (ทรง, 204). Taught as the plan states it, a learner reads
   ของ, ขอ, พอ, ควร and ตรง wrong — all inside the top 300.
2. **อักษรนำ is much broader than ห and อ.** The plan closes the mechanism at
   ห-leading plus four อ words. The larger family — a high or mid class leader
   passing its class across an unwritten อะ to a following sonorant — is
   missing, and it includes **สวัสดี at rank 9**, the first word any learner
   meets, plus ขนาด (176), ตลอด (264), สงบ (383), สนใจ (384), สมัย (415),
   ผลิต (483), ถนน (589), ผสม (981), อร่อย (153).

Everything else I flag is a correctable defect rather than a wrong model. The
highest-value structural finding is **T3**: the class-rule lesson is placed in
the opening band (lessons 02–05) but must name 11 high-class letters that the
sequence does not teach until lessons 12–19 — so task 2.5's AC3 cannot be
satisfied without violating its own AC2 and task 3.3's AC3.

I also measured the originality gate, and the measurement went several rounds
with the QA reviewer — the table in T6 is the settled result, not my first
answer. The plan's 8-gram check catches **13 of the 82**
existing mnemonics that CONTEXT.md itself describes as close paraphrases of the
licensed transcripts. It is close to vacuous at n=8; at n=6 it catches 34, at
n=5 it catches 46.

**Verdict: proceed, with T1, T2 and T3 resolved before phase 2 content is
authored.** T1 and T2 change what phase 3 teaches; T3 changes where a phase-2
lesson sits.

### What I checked and found correct

Recorded explicitly, because these are the claims the rest of the plan rests on
and confirming them is as useful as flagging the rest:

| Claim | Verdict |
|---|---|
| Every sonorant is low class; exactly 10 (ง ญ ณ น ม ย ร ล ว ฬ) | **Correct.** All 10 are `ThaiSymbolClass.Low` in `symbols.ts`, no exception |
| Mid class is exactly the unaspirated stops plus silent อ; 9 (ก จ ฎ ฏ ด ต บ ป อ) | **Correct**, and it is the entire mid class. See T4 for the one real exception and T17 for wording |
| High class is exactly 11, all aspirates or fricatives (ข ฃ ฉ ฐ ถ ผ ฝ ศ ษ ส ห) | **Correct.** All 11 verified; every member is an aspirate or fricative |
| ห is a fricative | **Correct.** /h/ is a glottal fricative; it belongs in bucket 3, and its low-class partner ฮ is there too |
| 10 + 9 + 25 = 44, of the 25 exactly 11 high | **Correct** |
| The อ-leading set is closed at exactly four words | **Correct.** Corpus confirms: อยู่ (49), อย่าง (56), อยาก (95), อย่า (562); every other hit is a compound of those four |
| ห-leading and อ-leading are one mechanism | **Sound.** Both are a silent class-bearing leader imposing its class on a following sonorant. Teaching them as one is right — but see T2, the mechanism is bigger than the two spellings |
| Only ร ล ว form true initial clusters | **Correct as to the second member.** Incomplete as to the first — see T13 |
| The tone-mark table's values (mid: low/falling/high/rising; high: low/falling; low: falling/high) | **Correct**, and they match `toneMarkRules` and `completeToneChart` in `symbols.ts` |
| Nine spelling tone rules | **Correct**; `toneRules` has exactly 9 |
| Paiboon over RTGS for adult learners | **Right call.** RTGS marks neither tone nor vowel length and would make the tone lessons unteachable. See T5 for the conversion risk, which is real and larger than the plan thinks |
| Sequencing: words from lesson one, all final sounds by lesson 3, confusable pairs adjacent | **Correct and worth keeping.** Lessons 1–3 deliver all eight final sounds (m n ng y w live; k t p dead). ม/น L1, ช/ซ L4, พ/ฟ L5, ผ/ฝ L14, ฎ/ฏ L19 |
| Demoting ฬ ฆ ฑ ฒ ฐ ฎ ฏ ฃ ฅ ฌ; numerals optional | **Right as a scheduling decision, but see T24** — the priority must be computed from any-position frequency, not the initial-position figures I first quoted. Numerals are confirmed to occupy lessons 23, 24 and 25. The plan **excludes ถ** from the demotion list — correct, ถ is 1.15% and one of the critical letters |
| Example words must resolve to a ranked corpus entry | **Will not starve the early lessons.** See T15 — the constraint is fine, the undeclared rank window is the risk |

## Plan-Level Findings

### Finding T1 — The unwritten-vowel rule, as stated, mis-teaches the top 300 words

**Severity: Critical**

**Description.** Phase 3's README and task 3.1 AC1/AC2 state the rule as: a
bare two-consonant word takes an implicit short โอะ; a polysyllable takes an
implicit อะ after the first consonant. This is inherited verbatim from the
`unwritten-vowels` special rule already in `symbols.ts:546`. Task 3.1 AC1 makes
it a universal — "for every such word in the corpus" — and the corpus refutes
it.

For **two**-consonant strings the rule holds well (ผม 15, คน 47, ลง 90, ลด 145,
จน 212, พบ 239, ยก 254, บน 259, ผล 272, คง 283 …) with two systematic exception
families in the top 1,500:

- **C + อ = /ɔɔ/**, where อ is the vowel สระ ออ and not a consonant at all:
  ขอ (232), พอ (297), รอ (766), คอ (1184).
- **C + ร = /ɔɔn/**: กร (1119).

For **three**-consonant strings the rule is a **minority pattern**. Of the ~60
bare three-consonant words in the corpus's top 2,000, I count roughly six that
the rule describes (สงบ 383, ถนน 589, ผสม 981, นคร 988, ขนม 1502, ตลก 1678).
The rest divide as:

| Reading | Count in top 2,000 | Examples |
|---|---:|---|
| `อ` is the vowel สระ ออ | ~27 | ของ (17), ชอบ (86), ออก (121), บอก (128), นอน (132), นอก (198), ตอน (218) |
| `ว` is the vowel สระ อัว | ~11 | รวม (298), พวก (326), สวย (813), สวน (840), ดวง (1083) |
| True initial cluster + โอะ | ~5 | ตรง (142), ควร (250), ครบ (793), กรม (1057) |
| False cluster | ~2 | ทรง (204, reads /soŋ/) |
| ห-leading | ~4 | หมอ (317), หมด (367), หลง (1149), หลบ (1596) |

**Why it matters as a teacher.** The learner's actual first problem is not
"which vowel is unwritten" — it is **"which of these letters is functioning as
a consonant at all."** Until they can see that the อ in ของ and the ว in รวม
are vowels, the unwritten-vowel rule has nothing to apply to, and applying it
anyway produces *khǒng → khong*, *ruam → rom*, *troŋ → tà-rong*. Those are the
mispronunciations I spend the most time undoing in real classrooms.

**Recommendation.**

1. Split the promoted "unwritten vowels" lesson into two, in this order:
   - **Lesson A — which letters are vowels in disguise.** อ ว ย ร in
     non-initial position. This is the prerequisite and it is currently
     nowhere in the plan. `symbols.ts` already carries `o-ang-dual-role` and
     `sara-uee-placeholder` as scattered special rules; consolidate them here.
   - **Lesson B — the implicit vowel**, applied only to strings that survive
     lesson A's parse.
2. Rewrite task 3.1 AC1/AC2 so the antecedent is "a word whose letters are all
   *functioning as consonants*", not "a word written as two consonants". As
   written, AC1's universal is false and a faithful executor either fails the
   task or quietly weakens the criterion.
3. Add the `อร → /ɔɔn/` reading to the rule set (ควร 250, นคร 988, สมควร 1278,
   พร 1723, ศร 2459). It is not in `symbols.ts` at all today.
4. Task 3.1's reconciliation baseline (AC5) should be computed **after** these
   changes, not before — otherwise the baseline enshrines the wrong rule's
   error rate as the target.

### Finding T2 — อักษรนำ is closed too early; the mid/high-leader family is missing, and it contains rank 9

**Severity: Critical**

**Description.** Phase 3 treats leading consonants as ห-leading plus a closed
set of four อ words. Both halves of that are individually correct (I confirmed
the อ set against the corpus). But อักษรนำ in Thai has a second, larger branch
the plan never mentions: a **high- or mid-class consonant followed directly by
a sonorant with no written vowel**, pronounced as two syllables with an
inserted /a/, where the second syllable inherits the **leader's** class.

`symbols.ts` has no special rule for this either — only `hor-nam` — so the gap
is in the data as well as the plan.

The corpus, top 1,000 by rank:

| Word | Rank | Reading | Why the plan's rules fail it |
|---|---:|---|---|
| สวัสดี | **9** | sà-wàt-dii | ว inherits ส's high class → wàt is low tone, not mid |
| อร่อย | 153 | à-ràwy | ร inherits อ's mid class → ร่อย is low tone |
| ขนาด | 176 | khà-nàat | น inherits ข's high class |
| ตลอด | 264 | dtà-làwt | ล inherits ต's mid class |
| สงบ | 383 | sà-ngòp | ง inherits ส's high class |
| สนใจ | 384 | sǒn-jai | น inherits ส's high class → rising |
| สมัย | 415 | sà-mǎi | ม inherits ส's high class → rising |
| ผลิต | 483 | phà-lìt | ล inherits ผ's high class |
| ถนน | 589 | thà-nǒn | น inherits ถ's high class → rising |
| ผสม | 981 | phà-sǒm | already correct by ส's own class, but the syllabification is the leader rule |

**สวัสดี is rank 9.** It is in lesson one of every Thai course in existence,
including this one. A plan whose leading-consonant lesson cannot derive its
tone has closed the mechanism a lesson too early.

Note also that the *same* fact is what makes T1's ขนม / ถนน / ตลก cases work —
this finding and T1 are one lesson's worth of material seen from two sides.

**Recommendation.**

1. Widen the leading-consonant rule to its real scope: **a silent or
   half-silent high/mid-class leader passes its class to the following
   sonorant.** Three spellings, one rule:
   - ห + sonorant (leader fully silent) — productive
   - อ + ย (leader fully silent) — closed at four words
   - high/mid consonant + sonorant with unwritten อะ (leader pronounced as its
     own syllable) — productive, and the common case
   The plan's own instinct — "one mechanism, not three coincidences" — is
   exactly right; it just stopped two-thirds of the way through.
2. Task 3.1 AC4 and task 3.2 AC2 currently assert *two* spellings. Change to
   three, and add a corpus-backed test case: สวัสดี, ถนน and หมา resolve from
   one rule statement.
3. Phase 3's README "What will bite" should say the อ set is closed **and the
   third branch is productive** — a learner who thinks the whole mechanism is
   closed will under-apply it, which is the mirror of the over-application the
   plan already warns about.
4. Resolve the apparent collision with phase 2 by **scoping phase 2's claim to
   the letter's own class**: a letter's class never changes; what changes is
   which letter governs the syllable. ห is still high and น is still low — in
   หนู, น simply is not the one in charge. That one sentence also covers
   clusters (T7), the mid/high-leader branch, and the tone-mark table's class
   input.

   Better still, teach it as **reinforcement rather than exception**. ห นำ
   exists *because* every sonorant is low. The ten sonorants are the only
   letters in Thai with no high-class partner, so they are the only letters
   that cannot reach rising or low tone unaided — and ห นำ is the repair the
   language evolved for exactly that gap. The inventory confirms it: ห leads
   ง ญ น ม ย ร ล ว and nothing else, all of them bucket 1. Sequenced that way,
   phase 3 confirms phase 2's rule instead of appearing to contradict it.

### Finding T3 — The class-rule lesson needs 11 letters the sequence has not taught; AC2 and AC3 of task 2.5 contradict each other

**Severity: High**

**Description.** Task 2.5 places the class-rule lesson in the opening band
(`content/lessons/lesson-02.md` … `lesson-05.md` plus
`lesson-class-rule.md`). Its AC3 requires that the lesson's own stated rule,
**given the 11-member high list it teaches**, is sufficient to derive all 44
class assignments. Its AC2 requires that each band lesson "uses no symbol not
yet taught at that point in the sequence," and task 3.3 AC3 makes that a
sequence-wide invariant.

The first high-class consonant in the sequence is **ข at lesson 12**. The
others land at lessons 12 (ฉ), 13 (ศ ษ ส), 14 (ผ ฝ), 15 (ห), 19 (ถ ฐ) and 22
(ฃ). A class-rule lesson placed at or before lesson 5 that names all 11 is
forward-referencing 11 untaught glyphs. One of the two criteria has to give.

There is a second, subtler problem. By lesson 5 the learner has met ม น ง ย ว
(low sonorants), ก ด บ (mid unaspirated stops) and ช ซ พ ฟ (**all low**
aspirates/fricatives). Every aspirate they have seen is low. Bucket 3 —
"aspirates and fricatives split high or low" — has no high exemplar to point
at, so the most important third of the rule is taught entirely in the abstract.

**Recommendation.** Split the lesson — and note that the second half needs no
lesson slot of its own once the residue is framed as contrasts (T21). Every
low-class cousin is taught five to twelve lessons before its high-class
counterpart, so each contrast is teachable the moment its second member
arrives, with no forward reference anywhere:

| Contrast | Low member | High member | Teach at |
|---|---|---|---|
| ch | ช L4 | ฉ L12 | L12 |
| kh | ค L6 | ข L12 | L12 |
| s | ซ L4 | ส L13 | L13 |
| ph | พ L5 | ผ L14 | L14 |
| f | ฟ L5 | ฝ L14 | L14 |
| h | ฮ L7 | ห L15 | L15 |
| th | ท L7 | ถ L19 | L19 |

Task 3.3 already owns these slots and already frames them as pairs; it needs
only to know it is completing the class rule rather than teaching an unrelated
pairing. **Do not place a second class-rule lesson after lesson 22.** That is
the only point where all 11 high letters are already taught, so it satisfies
the forward-reference invariant — but by then the learner has memorised each
letter's class individually as it arrived, and a shortcut delivered after its
cost has been paid is not a shortcut.

So the split is:

- **Class rule, part 1 — placed immediately after lesson 3, before lesson 4.**
  At that exact point the learner holds five sonorants (all low) and three
  unaspirated stops (all mid) and nothing else. The two derivable buckets are
  visible with **zero exceptions and zero forward references**. This is the
  single best placement in the whole sequence and the plan should state it
  rather than leave the lesson floating in a band. Lesson 4 (ช, ซ) is the first
  letter that needs bucket 3, which is why part 1 belongs before it.
- **Class rule, part 2 — the residue — distributed across the contrast slots
  in the table above, not gathered into a lesson.** Part 1 closes by telling
  the learner that everything with a puff or a hiss splits and that they will
  meet the split as pairs; each pair then lands where task 3.3 already places
  it. No new slot is needed and no phase has to absorb one.

Then AC3 splits cleanly: task 2.5's criterion narrows to "derives low and mid
for the 19 letters in buckets 1 and 2 from the lesson's stated rule" —
satisfiable, and no longer in conflict with its own AC2. Task 3.3 picks up
"each contrast, once taught, resolves both its members' classes." Neither
forward-references.

If the plan prefers to keep one lesson, then AC2 needs an explicit, declared
exemption for a preview chart, and the phase README must say why — but I would
not choose that. A preview chart of 11 unfamiliar glyphs at lesson 4 is exactly
the "memorise this table" experience the phase exists to remove.

### Finding T4 — `isAspirated` in `symbols.ts` is wrong for ฑ and ฒ; a derivation keyed on it fails task 2.1 AC1

**Severity: High**

**Description.** Task 2.1 AC1 requires that all 44 consonants classify with
**no exception list**, and AC2 requires the first two buckets be derived rather
than tabled. The obvious implementation reads `ThaiConsonant.isAspirated` and
`initialSound`. Those two fields contradict each other on two letters:

| Letter | `initialSound` | `isAspirated` | `classType` | Real value |
|---|---|---|---|---|
| ฑ | `"th (usually same as ท, sometimes d)"` | **false** | Low | /tʰ/ — aspirated |
| ฒ | `"th (same as ฑ and ท)"` | **false** | Low | /tʰ/ — aspirated |

Compare ท, which has the same `initialSound` prefix and `isAspirated: true`.

An executor deriving "unaspirated + stop → mid" from `isAspirated` will
classify ฑ and ฒ as **mid**, while their declared class is **low**. AC1 fails,
and the likely reaction under schedule pressure is to add the exception list
AC1 forbids — which would quietly discredit the phase's whole thesis.

**There is also one genuine linguistic exception, and it is ฑ.** In a small set
of words ฑ is pronounced /d/ — an unaspirated stop — while remaining **low**
class: บัณฑิต (ban-dìt, corpus rank 2340), มณฑป. So "every unaspirated stop is
mid" is true at the letter level for all 44 letters once the data is fixed, but
false at the sound level for ฑ in those words.

**Recommendation.**

1. Add a task-2.1 acceptance criterion covering the data fix: `isAspirated` is
   `true` for ฑ and ฒ, and a test asserts `isAspirated` agrees with
   `initialSound`'s aspiration for all 44. This is a one-line data change but it
   is load-bearing for the phase's central claim and should not be discovered
   mid-task.
2. Record ฑ's /d/ realisation as a **stated note in the lesson**, not an
   exception in the classifier. The classifier keys on the letter's canonical
   sound; the note tells the learner that ฑ is a low-class letter that
   occasionally sounds like a mid-class one, which is a pronunciation fact, not
   a class fact. This preserves "no exception list" honestly.

3. **The data fix is what makes AC1 non-circular, which is why it cannot be
   skipped.** Sound groups can be derived from `(initialSound, classType)` —
   and that is enough to *generate* the 11-member high list, since the groups
   fall out of the structure (T17). But it cannot *validate* the phonetic rule:
   a classification that reads declared class, checked against declared class,
   passes by construction. Task 2.1 AC1 asserts the derivation "agrees with
   each consonant's declared class for all 44 **with no exception list**" —
   that is only falsifiable against a sound-type source which does not consult
   class. A corrected `isAspirated` is that source. With the field left wrong,
   the executor's two options are a circular test that always passes or the
   exception list AC1 forbids. *(Circularity point raised by the
   accelerated-learning reviewer.)*

### Finding T5 — `vocabulary.json` is not uniformly IPA; task 2.2's premise is wrong and its converter will corrupt 1,294 entries

**Severity: High**

**Description.** Task 2.2 opens: "The app currently carries two romanizations:
IPA in `vocabulary.json` (`tʰîː`) and a Paiboon-like style in `symbols.ts`
(`maaw maa`)." The corpus does not agree. Classifying all 5,454 `romanization`
values by whether they contain IPA-only characters (ː ʰ ɔ ɛ ə ɤ ɯ ʔ ŋ tɕ) and
whether they contain Paiboon-only digraphs (aaw, bp, dt, ooe, uue, ph/th/kh):

| State | Count | Share | Example |
|---|---:|---:|---|
| IPA only | 3,322 | 61% | ที่ `tʰîː`, จะ `tɕàʔ` |
| Paiboon only | 558 | 10% | ไป `bpai`, งาน `ngaan` |
| **Both — mixed within one string** | **736** | **13%** | ถูก `thùuk`, ทาง `thaang` |
| Neither marker present | 838 | 15% | `troŋ`, `lom` |

So the field is already three-quarters of the way through an undocumented,
half-finished migration. Feeding an already-Paiboon string (`bpai`) through an
IPA→Paiboon mapper will mangle it, and the mixed 736 will mangle partially —
the worst case, because the output still looks plausible.

Task 2.2's test-case list includes "running the converter twice is idempotent",
which is the right instinct but tests the wrong thing: idempotence over the
converter's *own output*, not over pre-existing Paiboon input.

**Recommendation.**

1. Restate task 2.2 as a **normalisation of a heterogeneous field**, not a
   one-way conversion. Add an AC: the converter detects each entry's current
   notation (IPA / Paiboon / mixed / indeterminate) before converting, and an
   indeterminate entry is reported rather than guessed. The task already has a
   three-state model in AC4 — extend it to four, with "already converted" as a
   first-class state.
2. Add the test case the current list is missing: **an already-Paiboon entry
   passes through unchanged**, and **a mixed entry converts only its IPA
   fragments**.
3. Pin the target table explicitly. "Paiboon-style" is ambiguous — Benjawan
   Becker's own scheme writes ออ as *aw* and เออ as *er*, while `symbols.ts`
   writes *aaw* and *ooe* and the corpus's Paiboon entries agree with
   `symbols.ts`. Since the app must match `symbols.ts`, the plan should name
   that table as normative and stop calling it "Paiboon" unqualified, or the
   two tasks will each reach for a different published standard. This is the
   exact failure mode the phase README warns about between 2.2 and 2.4 — it
   just needs to be pinned in writing, not only sequenced.

### Finding T6 — The 8-gram originality gate catches 13 of the 82 mnemonics it was designed to catch

**Severity: High**

**Description.** Six tasks (1.4 AC5, 2.4 AC4, 2.5 AC5, 3.2 AC5, 3.3 AC5,
4.2 AC5, 5.3 AC5) gate originality on "no eight-word sequence occurs in the
extracted transcript corpus." CONTEXT.md states the 82 existing mnemonics in
`symbols.ts` "read as close paraphrases of those transcripts." That gives a
ready-made calibration set: if the gate works, it should flag most of them.

I extracted all 52 ThaiPod101 PDFs (220 KB of text) and measured:

| n | Mnemonics containing an overlapping n-gram |
|---:|---|
| 5 | **46 / 82** (56%) |
| 6 | **34 / 82** (41%) |
| 7 | **26 / 82** (32%) |
| **8** | **13 / 82 (16%)** |
| 10 | 3 / 82 (4%) |

At the plan's chosen n=8 the gate passes **five out of six** of exactly the
material it exists to exclude. Task 1.4's ADR says the check "is a floor and
not a proof" — correct and honourably stated — but the measured floor is much
lower than the prose implies, and six tasks treat a green gate as meaningful
evidence.

A concrete instance: the ฌ mnemonic in `symbols.ts:1322` reads "mostly from
Cambodian, Balinese, and Sanskrit origins. Examples: ฌาน (meditative
absorption), เพชฌฆาต (executioner)." Lesson 22's PDF reads "most are words
originally from the Cambodian, Balinese, and Sanskrit languages. Examples are
ฌาน (romanization: chaan) 'meditative absorption'… เพชฌฆาต … 'executioner'."
No 8-gram matches. It is unmistakably derived.

**Recommendation.**

1. Move to **raw 4-grams** — no stop-word stripping. Full grid over the same
   82-item calibration set, with a five-sentence false-positive probe of
   independently-worded true statements:

   | Threshold | Recall | FP |
   |---|---:|---:|
   | raw n=3 | 79/82 | 4/5 |
   | **raw n=4** | **64/82** | **0/5** |
   | raw n=5 | 46/82 | 0/5 |
   | raw n=8 *(the plan)* | 13/82 | 0/5 |
   | content n=4 | 43/82 | 0/5 |
   | content n=5 | 23/82 | 0/5 |

   **Correction to an earlier version of this finding:** I first recommended
   n=5 on content words, reasoning that stripping stop words would raise
   recall. It does the opposite, at every n — the QA reviewer measured it and
   the mechanism is theirs: removing stop words makes each n-gram span a wider
   window of source text, so a match requires a longer verbatim run. Raw n=4
   dominates both my original proposal and that revision.

   **Second correction, and the settled answer.** Raw n=4 does not survive
   inspection either: printing the matched spans rather than counting them
   shows several of its extra catches are function-word scaffolding ("to the
   left of", 3/4 function words). But content n=4 has a blind spot that matters
   more — **it misses the ฌ mnemonic**, the one case independently confirmed as
   copied (T11). Its giveaway, "Cambodian, Balinese, and Sanskrit", is four raw
   tokens but only three *content* words, so it cannot form a content 4-gram at
   any setting. Content filtering cannot represent short distinctive spans by
   construction — proper nouns, transliterations, technical terms — which is
   exactly where copying is most legible and most legally salient.

   The resolution is to run **both arms and flag on either**, with the raw arm
   capped at one function word and one domain term per match:

   | Configuration | Recall | FP | Catches ฌ |
   |---|---:|---:|---|
   | raw n=8 *(the plan)* | 13/82 | 0/5 | — |
   | content n=4 | 43/82 | 0/5 | **no** |
   | raw n=4, ≤1 function word | 44/82 | 2/5 | yes |
   | union | 53–54/82 | 2/5 | yes |
   | **union, raw arm ≤1 function word and ≤1 domain term** | **49/82** | **0/5** | **yes** |

   The last row is no worse than content n=4 on any axis measured and better on
   two. The two arms miss different things by construction, which is why the
   union beats either. The FP column throughout rests on five hand-written
   controls and **cannot establish a rate** — it is sufficient only for the
   weaker claim just made. Re-tune once the first band's original mnemonics
   exist and there is a real precision denominator.
2. Keep the number in **one place** — `originality.ts` or similar — rather than
   restating "eight-word" in seven AC bodies, so tuning it is one edit.
3. Add a **calibration test** rather than only the planted-overlap test the
   plan already has: assert the gate flags at least N of a committed fixture of
   known-derivative strings. The planted-overlap test proves the corpus loaded;
   a calibration test proves the threshold is set somewhere useful. This is a
   better use of the same effort.
4. State plainly in CONTEXT.md that the gate is a lint, and that the reviewer
   is the control for reproduced-in-fresh-words derivation. The plan half-says
   this already; the measurement makes it necessary to say fully.

### Finding T7 — The tone-mark table must key on the syllable's governing class, not on the letter under the mark

**Severity: High**

**Description.** Task 4.1's table is keyed on "consonant class," and nothing in
AC1–AC3 says *which* consonant supplies it. In real Thai the mark is written
over the second consonant of a cluster while the **first** governs the tone,
and after a leading consonant the **leader** governs.

The corpus makes this vivid. Searching all 5,454 entries for ๊ and ๋ and
attributing each to the nearest preceding consonant — the naive rule — yields
55 occurrences, of which two appear to sit on low-class letters:

- **กรี๊ด** (kríit, scream) — ๊ sits on ร (low), but ก-ร is a true cluster and
  ก (mid) governs. Mid + ๊ = high tone. ✓
- **ปลั๊กไฟ** (bplák-fai, electric plug) — ๊ sits on ล (low), but ป-ล is a
  cluster and ป (mid) governs. ✓

Both are correct standard Thai and both look like counterexamples to a naive
implementation. So the plan's "never with high or low class" survives the
corpus — but only if class is taken from the governing consonant. An
implementation that reads the letter under the mark will report two spurious
violations and, more importantly, will resolve tones wrongly across every
clustered and every ห-led word.

`symbols.ts` states the rule (`tone-mark-placement`, lesson 17) but nothing in
phase 4 wires it into `toneMarkTable.ts`.

**Recommendation.**

1. Add a task-4.1 AC: the table's class input is the **syllable's governing
   class** — first consonant of a cluster, the leader for อักษรนำ, otherwise
   the initial — and the module either takes that as a required parameter or
   computes it from `syllableRules.ts`. A test case: กรี๊ด and ปลั๊ก resolve
   correctly, and the mark's position is shown not to be the class source.
2. This makes task 4.1 depend on task 3.1, which the plan currently declares as
   `depends_on: []`. That dependency is real and should be declared.
3. Task 4.2 AC3 ("tones resolve from the table as the lesson states it") then
   needs the lesson to state the governing-class rule, or the criterion is
   unsatisfiable for any clustered example word.

### Finding T8 — "Unreachable" is the wrong word for the four empty cells

**Severity: Medium**

**Description.** Task 4.1 AC2 declares mái-dtrii and mái-jàt-dtà-waa with high
and with low class "**unreachable**", and the ADR defends encoding that as a
declaration rather than an absence — which is the right engineering call. But
"unreachable" is not what is true of those four cells, and a learner told
"unreachable" will be misled in a specific, predictable way. The four cells
differ from each other:

| Cell | Nominal tone | Actual status |
|---|---|---|
| Low + ๊ (mái-dtrii) | high | **Redundant.** Low + mái-thoo already gives high tone |
| High + ๋ (mái-jàt-dtà-waa) | rising | **Redundant.** A high-class live syllable is already rising |
| Low + ๋ | rising | **A real gap filled another way.** A bare low consonant cannot make rising; Thai uses ห-leading instead of the mark |
| High + ๊ | high | **Genuinely unavailable to that class** — a high-class initial has no route to high tone; you use its low-class cousin |

Only the last is "unreachable" in any strong sense. And outside this curated
corpus the combination does occur: informal loanword and onomatopoeia spellings
put ๊ on low-class letters (น๊อต, ล๊อค, โน๊ต, ช๊อป, and the widely-seen
นะค๊ะ). A learner who has been told these are impossible will not know what to
do when they see one on a shop sign — and they will, in week one.

**Recommendation.** Rename the state to **`not-used-in-standard-orthography`**
(or `notAttested`) and have each of the four cells carry its own short reason
from the table above. Task 4.2's ADR already argues, correctly, that the four
absent cells should be taught rather than hidden — this makes the thing being
taught true. Add a line to the lesson: *when you see one of these in the wild
it is an informal spelling of a foreign word, and it means what the mark
normally means.* That is one sentence and it removes a recurring beginner
question.

### Finding T9 — "Tone marks override spelling rules" needs qualifying

**Severity: Medium**

**Description.** Task 4.1 AC3: "A tone mark overrides the spelling-derived
tone… the resolved tone is the mark's, and the spelling rule's result is not
consulted." As an implementation contract this is fine. As the sentence a
lesson puts in front of a learner it is dangerous, because it reads as *the
mark settles the tone* — and the mark does not. Class still selects which tone
the mark yields (่ gives low on mid and high, falling on low), and class itself
may come from a leading consonant or a cluster's first member (T7).

What a tone mark actually overrides is the **live/dead and vowel-length
branch** of the spelling rules. Everything about class survives it.

**Recommendation.** Reword AC3 to: *a tone mark replaces the syllable's
live/dead-derived tone; the governing consonant's class still selects which
tone the mark produces.* Add a test case a learner would recognise: a
low-class dead-short syllable (which spells to high tone) carrying mái-èek
resolves to falling — the mark's low-class outcome, not the mark's mid-class
outcome and not the spelling's. That single case pins both halves.

### Finding T10 — The "7 critical high-class letters" shortlist drops ศ, which outranks two of the seven

**Severity: Medium**

**Description.** Phase 2's README claims 7 of the 11 high-class letters —
ข ฉ ถ ผ ฝ ส ห — "carry almost all early decisions," the rest being obsolete or
rare. The repo's own corpus does not support that cut. Token-weighted share of
syllable-initial position across all 5,454 entries:

| Letter | Token share | First appears at rank | In the "7"? |
|---|---:|---:|---|
| ห | 6.09% | 12 (ให้) | yes |
| ส | 5.02% | 9 (สวัสดี) | yes |
| ข | 3.73% | 17 (ของ) | yes |
| ผ | 2.28% | 15 (ผม) | yes |
| ถ | 1.15% | 40 (ถึง) | yes |
| **ศ** | **0.54%** | **251 (ศูนย์)** | **no** |
| ฉ | 0.42% | 14 (ฉัน) | yes |
| ษ | 0.40% | 350 (รักษา) | no |
| **ฝ** | **0.21%** | **237 (ฝ่าย)** | **yes** |
| ฐ | 0.09% | 564 (ฐานะ) | no |
| ฃ | 0.00% | — | no |

ศ carries **2.6× the token share of ฝ** and first appears 14 ranks later.
Including ฝ and excluding ศ is not derivable from any measure in this
repository. ฉ earns its place on first-rank (ฉัน, 14) despite low share — that
is a defensible tiebreak, and it should be the *stated* one.

Note also that ศ and ษ are not "obsolete": they are Sanskrit-derived and they
cluster in exactly the register of vocabulary an intermediate learner meets
(ศูนย์, ประเทศ, การศึกษา, พิเศษ, รักษา, เศรษฐกิจ).

**Recommendation.** Either make it **8** (add ศ) or, better, derive the
shortlist in code from the corpus rather than asserting it in prose: rank the
11 by token share and by first-appearance rank, take the union of the top *k*
on each. That turns a judgement call into a checkable one and it survives a
corpus update. Whichever is chosen, phase 2's README should state the criterion
next to the list.

### Finding T11 — The ฌ claim is false, and it points at a gap in the originality corpus

**Severity: Medium**

**Description.** CONTEXT.md states: "All 44 consonants are present (the video
course teaches only 43 — ฌ was added here)." Half true, and the false half
matters.

- The **recording script** for lesson 22 (the spoken video) does not mention ฌ.
  It covers ฃ, ฅ and the four rare vowels. So "the video teaches 43" holds.
- The **lesson-note PDF** for lesson 22 teaches ฌ explicitly: its name
  (ฌ เฌอ, chaaw chooe), its class (low), that it is pronounced identically to
  ช, and three example words — ฌาน, เฌอ, เพชฌฆาต.
- The ฌ entry in `symbols.ts:1311` — including `nameRomanized: "chaaw chooe"`,
  `nameMeaning: "tree"`, and the mnemonic quoted in T6 — is a close paraphrase
  of that paragraph.

So ฌ is **not** the one letter the repo added independently. It came from the
source like the other 43, and its mnemonic is subject to the same rewrite
constraint as the other 82.

The larger point: the plan's originality corpus is described as "the extracted
ThaiPod101 transcript corpus," and *transcript* naturally reads as the
recording scripts. If the extraction takes only the 25 `*_recordingscript.pdf`
files it will miss the 25 lesson-note PDFs, which are longer, denser, and are
where the existing mnemonics actually came from.

**Recommendation.**

1. Correct the sentence in CONTEXT.md. ฌ is in the source material; what is
   true is that the *video* omits it, which is still a good reason for the app
   to teach it.
2. Specify the corpus as **all 50 PDFs** — `TAME_L*_tpod101.pdf` and
   `TAME_L*_tpod101_recordingscript.pdf` — in whichever task owns the
   extraction (see T12). `pdftotext -enc UTF-8` handles them; I verified this,
   220 KB of extractable text.

### Finding T12 — No task owns extracting the transcript corpus that seven ACs depend on

**Severity: Medium**

**Description.** Seven acceptance criteria across five phases assert "no
eight-word sequence occurs in **the extracted transcript corpus**." No task's
`covers` list contains an extraction script or an extracted artifact, and
nothing under `src/Thai Alphabet/` is anything but a PDF today. The first task
to need it (1.4) will invent it, and the other six will each depend on an
artifact whose shape, location and freshness nobody declared.

The plan's own format is strict about exactly this — task 3.1 owns
`lessonSequence.ts` specifically so 3.2 and 3.3 do not each invent an ordering.
The same argument applies here and has not been made.

**Recommendation.** Give task 1.1 (the phase-1 seam task, which already owns
cross-cutting contracts) or a new small task in phase 1 the ownership of:
`scripts/extract-transcripts.py`, its output path, and the originality-check
module. Add the artifact to the trust-boundary inventory — see T20 — and add an
AC that the check fails loudly when the corpus is absent or empty, which the
plan currently approximates with the planted-overlap test in each consumer.

### Finding T13 — The cluster inventory must close the first member as well as the second

**Severity: Medium**

**Description.** Phase 3's README characterises the source's treatment as "one
passing mention that only ร ล ว cluster." That is correct about the **second**
member. The **first** member is also closed — only ก ข ค ต ป ผ พ (plus
historical ฃ ฅ) lead a true cluster — and this is what actually decides the
common cases:

- **ทร** is not a cluster: ทราย /saai/, ทราบ /sâap/, ทรง /soŋ/ (rank 204)
- **สร** is not a cluster: สร้าง /sâang/ (rank 262), the ร silent
- **จร** is not a cluster: จริง /jing/ (rank 261), the ร silent
- **ศร** is not a cluster: ศรี /sǐi/

Task 3.1 AC3 does ask for "which pairs are false clusters that change the
sound, and which drop the second consonant" — good, and `symbols.ts` already
carries `tho-ro-s-sound` and `silent-ro-clusters`. But AC3's phrasing —
"**which consonants may follow another** to form a true initial cluster" —
describes only the second-member set, and a faithful executor could satisfy it
with `{ร, ล, ว}` and a false-cluster exception list, which inverts the right
model: the true-cluster set is the small closed one and everything else is the
default.

**Recommendation.** Reword AC3 as "**which ordered pairs** form a true initial
cluster" and require the inventory to be enumerated as pairs (กร กล กว ขร ขล
ขว คร คล คว ตร ปร ปล ผล พร พล) rather than as two independent sets. Add test
cases from the corpus at the ranks where they bite: จริง (261) and สร้าง (262)
are adjacent in frequency and are both silent-ร, and ทรง (204) is the /s/ case.

### Finding T14 — Tone marks get no mnemonic, which is one of the three gaps the plan opens by citing

**Severity: Medium**

**Description.** The plan README's motivation is: "roughly 8 of 44 consonants
carry a mnemonic linking shape *and* sound, one vowel does, **tone marks
none**, and consonant class none at all." Task 2.4 then fixes consonants and
vowels — AC1 asserts "44 consonants, 29 vowels", and the ADR counts "73
original mnemonics." `symbols.ts` has 44 consonants, 29 vowels and **4 tone
marks**; 44 + 29 = 73 excludes the tone marks.

So of the four gaps the plan names, the tone-mark one is closed nowhere. Task
4.2 teaches the table but none of its ACs require a mnemonic, and task 2.1's
scene-grammar schema explicitly anticipates a tone motion on records that carry
a tone — which is exactly what a tone-mark record is.

The four marks are also the best mnemonic targets in the system: ่ ้ ๊ ๋ are
one, two, three and four strokes mapping onto a fixed tone order, and the
vertical-motion vocabulary task 2.1 fixes is made for them.

**Recommendation.** Extend task 2.4 AC1 to 44 consonants, 29 vowels and 4 tone
marks (77 records), and say so in the ADR's sizing paragraph. The task is
already x-large; four more records is not what will make it slip.

One constraint on how: the tone marks are the only symbols where task 2.1's
vertical-motion vocabulary has a legitimate referent, but the motion must be
keyed to the **(mark × class) cell, not to the mark**. ไม้เอก gives *low* on
mid and high class but *falling* on low class, so a single motion per mark
would encode a tone the learner does not hear a third of the time. The
stroke-count mnemonic (one, two, three, four strokes onto a fixed tone order)
is ordinal and belongs to the mark; the motion belongs to the cell. They are
two different cues and the record needs both.

### Finding T15 — The "declared rank window" appears in four ACs and is declared by no task

**Severity: Medium**

**Description.** The example-word constraint is stated three different ways:

| Task | AC | Wording |
|---|---|---|
| 1.4 | AC3 | "resolves to a `vocabulary.json` entry, or is listed in `teachingWords`" — **no window** |
| 2.5 | AC4 | "resolves to a `vocabulary.json` entry or is declared in `teachingWords`" — **no window** |
| 3.3 | AC4 | "resolves to a `vocabulary.json` entry **inside the declared rank window**" |
| 4.2 | AC4 | "…**inside the declared rank window**" |

No task declares the window, and the plan README describes the constraint with
a window ("inside a declared rank window") as though it were uniform.

**On whether the constraint starves the early lessons** — the brief flags this
as a real risk, and I measured it. It does not, but it is close:

| Lesson | Cumulative symbols | Corpus words writable with *only* those symbols | Of those, rank ≤ 1,000 |
|---|---:|---:|---:|
| 1 (ม น า) | 3 | **7** | 3 |
| 2 (+ ง ย ว) | 6 | 26 | 11 |
| 3 (+ ก ด บ ี) | 10 | 74 | 23 |
| 4 (+ ช ซ ะ ั ิ) | 15 | 174 | 60 |
| 5 | 19 | 240 | — |

Lesson 1's seven are มา (37), นาน (332), นา (538), นาม (1052), นานา (1513),
นม (1847), มน (2601). The last two need the implicit โอะ, which is not taught
until phase 3, so lesson 1 has **exactly three usable words: มา, นาน, นา** —
which is precisely the "three words" task 1.4 says it builds. The constraint
fits, with zero slack.

That zero slack is the finding. At a window of rank ≤ 500 lesson 1 has *two*
words. At ≤ 1,000 it has three. Whoever declares the window is deciding whether
lesson 1 is authorable, and right now nobody does.

**Recommendation.**

1. Have task 1.1 (which fixes the deck schema) declare the rank window as a
   named constant with a stated value, and make all four ACs reference it
   identically. My recommendation from the table: **rank ≤ 1,000 for lessons
   1–5, ≤ 2,000 thereafter** — a per-band window, since the early bands have no
   choice and the later ones have thousands.
2. Note explicitly in task 1.4 that acrophonic letter names (ม้า, หนู, ไก่, …)
   are the canonical `teachingWords` case — the ADR says this in prose; it
   should be a named category so the escape hatch is not re-argued in every
   content task.

### Finding T16 — `nameRomanized` is rewritten by prose only

**Severity: Low**

**Description.** Task 2.4's ADR states: "This task rewrites `nameRomanized` on
every symbol while 2.2 converts the vocabulary corpus." That is the stated
reason 2.4 depends on 2.2. But no acceptance criterion in 2.4 mentions
`nameRomanized`, and no test case covers it. The whole justification for the
2.2 → 2.4 dependency rests on work nothing enforces.

Separately: the existing `nameRomanized` values carry **no tone marks** —
`"khaaw khai"` where Paiboon would be *khɔ̌ɔ khài*, `"saaw suuea"` where it
would be *sɔ̌ɔ sɯ̌ɯa*. Since the letter names are the learner's first sustained
exposure to reading Paiboon, unmarked names teach that tone is optional
notation. In a course whose selling point is tone, that is the wrong first
impression.

**Recommendation.** Add a 2.4 AC: every symbol's `nameRomanized` conforms to
the table 2.2 fixed, **carries a tone mark where the syllable's tone is not
mid**, and a test asserts this over all 44 + 29 + 4. It costs one criterion and
it makes the declared dependency real.

### Finding T17 — "Unaspirated stop" is a phonetician's label, not a learner's test

**Severity: Low**

**Description.** The bucket names in phase 2 and task 2.1 are *sonorant*,
*unaspirated stop*, *aspirate or fricative*. They are correct, and they do not
survive contact with a beginner. จ is an affricate, not a stop; ฉ ช ฌ are
affricates, not "aspirates"; ซ ศ ษ ส ฝ ฟ ห ฮ are fricatives with no aspiration
contrast at all. A learner asked "is ซ an unaspirated stop?" has no way to
answer.

The rule is genuinely derivable — the plan is right about that — but it needs a
test the learner can perform with their own mouth. The version I use:

- **Can you hum it, or sing it on a pitch?** → sonorant → **low**. (m n ng y r l w)
- **Is it a clean, hard, no-puff sound?** → **mid**. (g j d dt b bp, and silent อ)
- **Is there a puff of air, or a hiss?** → **high or low**, and only these
  eleven are high.

The plan's own line — "the rule also forces attention to aspiration, which the
learner needs for pronunciation regardless, so the cheat code and the
pronunciation drill are the same drill" — is exactly right and is the best
sentence in the phase README. The bucket labels should match that framing.

**Recommendation.** Keep the phonetic labels in `soundType.ts` where they
belong; use the three-question form in the lesson text. Task 2.5 AC3 tests
derivation "from the lesson's stated rule" — so the lesson's rule needs to be
the performable one, or AC3 tests a rule no learner can run.

### Where the number 11 comes from — and how to state it

Grouping all 44 consonants by initial sound gives **21 groups in a 7/7/7
split**: 7 uniformly low (the sonorants), 7 uniformly mid, and 7 that span a
class boundary. Every spanning group spans **high/low and never mid**, there is
**no uniformly-high group at all**, and the 7 spanning groups contain exactly
25 letters of which exactly **11 are high**. So the 11 is not a list anyone
compiled — it falls out of the structure.

That yields a symmetry worth teaching: **every high sound has a low partner;
mid class has no partners and needs none; the sonorants have no high partner at
all** — which is precisely the gap ห นำ exists to fill (T2).

**But do not state it in that direction.** "Every high sound has a low twin" is
true, elegant, and *inert*: a learner never faces the question "does this high
letter have a low twin?", because they have a letter in front of them and need
its class. Worse, the symmetric phrasing invites the false converse — that every
low letter has a high twin — which fails for all ten sonorants. Appending "but
not the other way round" does not fix it; a negation hung off a clean rule is
exactly what is lost under retrieval load.

State it **from the low side**, where it stops being an observation and becomes
a decision procedure the learner runs constantly:

> Low-class letters come in two kinds. Those with a high partner — the
> aspirates and fricatives — and those without: the ten you can hum. If your
> letter has a partner, use the partner to get the high-class tones. If it has
> none, that is what ห is for.

The asymmetry is now the payload rather than the exception, it is phrased in
the direction the learner meets it (production: *I want a rising tone and my
initial is /n/*), and it is used every time they write หมา, หนู, หญิง, หรือ,
หลาย, ไหม or ใหม่. The symmetric version would never be used at all.

One consequence for T10 and for task 3.3: **ห is doubly load-bearing** — it is
the highest-consequence high-class letter by corpus share (6.09%) *and* the
letter that resolves the sonorant gap. Task 3.3 lists **six** cousin pairs
(ข↔ค, ฉ↔ช, ถ↔ท, ผ↔พ, ฝ↔ฟ, ส↔ซ); /h/ is the seventh contrast and is absent.

To be precise about what that omission costs, since T21 and T23 both argue ฮ
deserves almost no attention at 0.01% of running text: the gap is one of
**coverage, not drill weight**. ห/ฮ should not be drilled as a contrast — it
collapses to "h is high unless it is ฮ", one fact. But ห must be *reached* by
whatever completes the class rule, and under the T3/T21 resolution the contrast
sequence is what completes it. A six-pair frame leaves the single most
consequential high-class letter outside the structure that teaches class, which
is a different and worse problem than under-drilling ฮ.

**And the omission is diagnostic, which is the argument for T10's and T23's
shared recommendation.** A human compiling contrasts by salience naturally drops
the pair whose low member is 0.01% of running text — that is a reasonable call
on the pair, and it silently loses the 4th commonest initial in the language.
Deriving the set from the sound groups keeps it, because a derivation does not
weigh salience. So the missing seventh contrast was not carelessness; it is the
predictable output of hand-compiling, and it is the same mechanism that dropped
ศ from the critical-letter shortlist (T10) and left ส/ล out of the confusable
list (T23). Three findings, one cause: a list asserted in prose where a query
over the corpus was available. *(Diagnosis raised by the accelerated-learning
reviewer.)*

*(The 7/7/7 structure is the systems architect's and the accelerated-learning
reviewer's; I verified it over all 44 and the framing advice above is mine.)*

### Finding T18 — ฤ is analysed as an initial consonant in the corpus but is not one of the 44

**Severity: Low**

**Description.** Seven corpus entries (ฤดู rank 1315, ทฤษฎี 1421, and others)
carry `initialConsonant: "ฤ"` in their `syllables` analysis. ฤ is not one of
the 44 consonants — it is one of the four rare vowels in
`symbols.ts:rareVowels` — and it behaves as ร + สระ อึ (sometimes ริ). Task
3.1 AC5 reconciles the rules against `vocabulary.json`'s syllable analysis and
will hit these.

**Recommendation.** Name ฤ (and ฤๅ ฦ ฦๅ) in task 3.1's expected-disagreement
notes so the executor recognises it as a known corpus-analysis artifact rather
than a rule defect. One sentence; it prevents a wasted investigation.

### Finding T19 — "Every entry carrying tone information" is not a decidable set

**Severity: Low**

**Description.** Task 2.2 AC3: "a word's tone is recoverable from its Paiboon
form **for every entry carrying tone information**." In Paiboon mid tone is
written with no diacritic, so an entry with no diacritic is indistinguishable
from one whose tone was never recorded. 839 of 5,454 entries carry no combining
diacritic at all; ไป `bpai`, งาน `ngaan` and ตรง `troŋ` are correctly unmarked
mid, but nothing in the data says so.

**Recommendation.** Declare "unmarked = mid tone" as part of the normative
table (T5's recommendation 3), which makes the set decidable and AC3 testable:
*every entry's tone is recoverable, with absence of a diacritic meaning mid.*
Then add the test case that actually bites — a mid-tone word and a
never-analysed word must not be the same value, which the four-state model from
T5 gives you for free.

### Finding T20 — The trust-boundary inventory omits the licensed transcripts and the 277 existing vocabulary mnemonics

**Severity: Low**

**Description.** The inventory in the plan README is good and unusually
thorough for a content plan — the `lessonId` charset, the assets-root
containment check, the no-`dangerouslySetInnerHTML` rule and the API-key
handling are all correctly owned. Two inputs are missing:

1. **The transcript PDFs and their extracted text.** Agents read them (to build
   the originality corpus) and the extracted plaintext is a derived work of
   licensed material. It must not be committed, must not be pasted into a
   finding, a task body or a commit message, and must not reach a lesson script.
   That is the same class of control as the API key and it has no owner.
   `.gitignore` for the extraction output is the concrete control.
2. **The 277 existing `mnemonic` values in `vocabulary.json`.** CONTEXT.md
   subjects the 82 mnemonics in `symbols.ts` to the rewrite constraint but says
   nothing about these. They are of unknown provenance and phase 5 builds on
   top of them. Task 5.3's AC5 applies the 8-gram check to mnemonics the task
   *writes*; it does not audit the 277 already there.

**Recommendation.** Add both rows to the inventory. For (2), add a task-5.3 AC:
the existing 277 are run through the same originality check, and any that flag
are either rewritten or recorded — this is cheap (it is the same check already
being built) and it closes the only place in the plan where inherited content
passes unexamined.

### Finding T21 — The residue is 7 tone contrasts, not an 11-item list, and task 2.5's framing fights task 3.3

**Severity: Medium**

**Description.** Phase 2 frames the irreducible memorisation as "a list of 11."
Task 3.3 then teaches the same material as six high/low cousin *pairs* and says
so explicitly ("six decisions rather than twelve letters"). The two tasks
disagree about the shape of the same fact, and task 3.3 has the better version
— but it stops short of the full reduction.

The 11 high letters answer only **7 sound questions**:

| Sound | High | Low |
|---|---|---|
| kh | ข (ฃ obsolete) | ค ฅ ฆ |
| ch | ฉ | ช ฌ |
| th | ถ ฐ | ท ธ ฑ ฒ |
| ph | ผ | พ ภ |
| f | ฝ | ฟ |
| s | ศ ษ ส | ซ |
| h | ห | ฮ |

Three contrasts carry more than one high member (ถ/ฐ, and ศ/ษ/ส), but those
internal choices are **spelling** questions, not tone questions: ถ and ฐ are
both high, ศ ษ ส are all high, so which glyph a word uses never changes the
tone. For the purpose the class rule exists to serve, the residue is 7 binary
questions.

Two of the seven are barely contrasts at all, because one side is a single rare
letter: for **s** the high side is ~8% of syllable-initials and the low side is
ซ alone (0.56%); for **h** the low side is ฮ alone (0.15%). "s is high unless
it is ซ" is one fact, not a contrast. Realistically: **5 contrasts to learn and
2 near-freebies.**

That is a further reduction on top of the plan's 44 → 11, and the plan does not
claim it.

**Recommendation.** Restate phase 2's residue as 7 contrasts (5 real), and have
task 2.5 hand them to task 3.3 in that shape rather than as a list. This also
removes the forward-reference problem's sharpest edge: a *contrast* can be
taught one pair at a time as each pair's letters arrive, which is what the
T3 split already wants to do. Defer ถ-vs-ฐ and ศ-vs-ษ-vs-ส entirely — they are
orthography, they belong wherever spelling is taught, and they carry no tone
consequence.

### Finding T22 — The mnemonic schema has no slot for final-sound behaviour

**Severity: Low**

**Description.** Task 2.1's scene-grammar schema requires a district, a shape
cue, a sound cue, and a tone motion where applicable. `finalSound` is populated
on all 44 consonant records in `symbols.ts` and has no corresponding slot, so
the rewrite in task 2.4 drops whatever final-consonant teaching the current
mnemonics carry.

The count of mnemonics affected is small, but the material is front-loaded:
lessons 1–3 deliver all eight final-consonant sounds, which is the sequencing
decision the plan correctly identifies as the source course's best. And the
finals that most need a mnemonic are exactly bucket 1 — ย reads as /i/, ว as
/o/, and ร ล ฬ ญ ณ all collapse to /n/ — so the sonorants each carry a second
fact the schema cannot express, in the same lessons where finals are being
introduced.

**Recommendation.** Add an **optional `finalCue`** field to the mnemonic
record, and a task-2.4 AC requiring one on the **nine letters whose final is
genuinely irregular** — not on every letter whose final differs from its
initial.

Counting with parentheticals stripped from both fields: 4 consonants have
identical initial and final, **31 are the single regular rule** (obstruents
collapse to K-, T- or P-stop), and **9 are irregular**:

| | |
|---|---|
| ย → /i/, ว → /o/ | glide into the vowel |
| ร, ล, ญ, ฬ → /n/ | four letters collapsing to one sound |
| อ → สระ ออ | becomes a vowel |
| ห, ฮ | no final use at all |

Asserting a cue across all 40 that differ would make 31 records restate the
same rule. The nine are where a mnemonic earns its place.

**Six of the nine are bucket-1 sonorants** (ย ว ร ล ญ ฬ); อ is mid and ห ฮ are
aspirate/fricatives, while four sonorants — ม น ง ณ — have entirely regular
finals. So the sonorant bucket is not uniformly irregular, but it is the *only*
bucket where irregular finals are common: 6 of its 10 members, against
near-zero elsewhere.

That matters for sequencing, and it sharpens rather than weakens the point.
Task 2.1 teaches the sonorants as the **free** bucket — derive the class, there
is nothing to memorise — and then six of those ten turn out to carry a second
memorised fact, arriving just after the learner has been told this group needs
none. The irregularity lands exactly where the lesson has lowered their guard.

(Two corrections are folded in here: my original estimate of ~12 letters was
wrong, and ณ, which I had listed as irregular, is identity /n/ → /n/; and my
follow-up claim of "eight of nine sonorants" was also wrong. Six is the number.)

### Finding T23 — The confusable-pair list omits the two highest-consequence pairs in Thai and drills one that costs nothing

**Severity: Medium** (raise to **High** if the list drives distractor selection
rather than only a test assertion)

**Description.** Task 2.4 AC5 names ten confusable groups as English prose
inside the criterion, with no stated source: ม/น, ช/ซ, พ/ฟ, ค/ด, บ/ป, ด/ต,
ผ/พ, ฝ/ฟ, ถ/ก/ภ, ฎ/ฏ. Every one of them is a genuine confusion — I would not
remove any. But the list is unweighted, and two things follow.

**Confusability has a consequence dimension the list ignores.** Mistaking one
glyph for another costs the learner a *tone error* only when the two letters
differ in class. Of the ten listed groups, only four cross a class boundary:

| Group | Classes | Crosses? | Token share |
|---|---|---|---|
| ถ/ก/ภ | high/mid/low | **yes — all three** | 1.15 / 8.18 / 0.61 |
| ผ/พ | high/low | **yes** | 2.28 / 2.77 |
| ค/ด | low/mid | **yes** | 8.38 / 4.29 |
| ฝ/ฟ | high/low | **yes** | 0.21 / 0.21 |
| ม/น | low/low | no | 5.85 / 5.79 |
| ช/ซ | low/low | no | 2.38 / 0.56 |
| พ/ฟ | low/low | no | 2.77 / 0.21 |
| บ/ป | mid/mid | no | 2.24 / 5.05 |
| ด/ต | mid/mid | no | 4.29 / 4.53 |
| ฎ/ฏ | mid/mid | no | **0.04 / 0.00** |

ฎ/ฏ is the weakest entry in the list on every axis at once: both letters are
mid class so the confusion carries no tone cost, ฎ is 0.04% of running text,
and **ฏ never occurs in syllable-initial position** — so it never carries an
initial-position tone decision, though it does appear inside common words
(T24). Both are on task
4.3's demotion list. It is being drilled at the same weight as ค/ด.

**Two high-consequence pairs are missing**, and they are the two I spend the
most classroom time on:

- **ส / ล** — ส is ล with one additional stroke. ส is **high** class, ล is
  **low**, at 5.02% and 3.89% of syllable-initials (8th and 13th by that
  measure; an earlier version of this finding said 2nd and 6th, which was
  wrong — the percentages were right, the ranking was not). A learner who reads
  ล for ส gets the wrong class, and
  therefore the wrong tone, on roughly one syllable in eleven.
- **ข / ช** — ข carries a notch where ช is smooth. ข is **high**, ช is **low**
  (3.73% and 2.38%). Same failure mode.

By frequency × class-crossing these are the two highest-consequence visual
confusions in the writing system, and neither is in the list.

A third, lower priority: **อ / ฮ** (ฮ is อ with a hook), mid versus low. Worth
recording for recognition, but ฮ is 0.01% of running text so it earns no
drill weight.

**The inverse also matters: some confusions are free.** ฬ/ล, ณ/น, ฆ/ค, ฑ/ท and
ฒ/ท are all visually similar, all identical in sound, and all **identical in
class**. Misreading one as the other produces the correct pronunciation and the
correct tone. These should be explicitly recorded as zero-weight — telling a
learner "these two look alike and it does not matter" removes anxiety that
would otherwise attach to the rarest letters in the alphabet.

**Vowels are not covered at all.** AC5 lists consonant groups only, while the
vowel confusions are as costly and more frequent: ิ / ี and ุ / ู differ by a
single stroke and change vowel length, which changes the tone through the
live/dead rules; เ / แ differ by one stroke. Task 2.4 rewrites all 29 vowel
mnemonics and has no criterion requiring any of them to contrast.

**Recommendation.**

1. Replace the prose list with structured data — **groups, not pairs.** ผ ฝ พ ฟ
   is a single four-way clique, not the three overlapping pairs the current list
   implies; ค ด ต likewise. Distractor selection should sample the connected
   component.
2. Carry a **consequence weight** per group, computed rather than asserted:
   whether the group spans more than one class, times the members' corpus
   frequency. That makes ฎ/ฏ fall to the bottom and ส/ล rise to the top without
   anyone arguing about it, and it survives a corpus update.
3. Add ส/ล and ข/ช; record ฬ/ล, ณ/น, ฆ/ค, ฑ/ท, ฒ/ท as zero-weight; extend to
   the vowel contrasts above.
4. If this data feeds `pickChoices` on the script recognition cards rather than
   only a test fixture — which is the right use and is what the systems
   architect has proposed — then whether the list is correct stops being a
   documentation question, which is why this finding is scoped as data rather
   than as prose.

### Finding T24 — Rare-letter priority must be computed from any-position frequency; seven of the ten demoted letters appear in top-600 words

**Severity: Medium**

**Description.** This corrects an earlier confirmation in this review. I first
assessed the demotion list using **syllable-initial** frequency, because that
is what carries a tone decision, and reported that ฃ ฅ ฏ ฌ "do not occur at
all." Prompted by the systems architect catching the ฏ case, I re-ran the count
at **any position** in the word. The two measures diverge sharply:

| Letter | As initial | Any position | Commonest word containing it |
|---|---:|---:|---|
| ฒ | 2 | 8 | **พัฒนา rank 336** |
| ฐ | 10 | 30 | **เศรษฐกิจ rank 437** |
| ฏ | **0** | **15** | **ปฏิบัติ rank 497**, ปรากฏ rank 508 |
| ฎ | 8 | 16 | **กฎหมาย rank 515** |
| ฬ | 12 | 13 | **นาฬิกา rank 523** |
| ฆ | 6 | 11 | ฆ่า rank 596 |
| ฑ | 4 | 10 | ผลิตภัณฑ์ rank 1212 |
| ฃ | 0 | **0** | — |
| ฅ | 0 | **0** | — |
| ฌ | 0 | **0** | — |

**Seven of the ten demoted letters appear in a word inside rank ~600.** ฒ, by
initial-position share the rarest letter in the alphabet at 0.004%, sits in
พัฒนา at rank 336. A learner who has "completed" the course and is reading at
the 500-word level meets ปฏิบัติ, พัฒนา, กฎหมาย, ปรากฏ, เศรษฐกิจ and นาฬิกา.

So task 4.3's demotion is right in kind and wrong in its likely basis. If
`symbolPriority.ts` is keyed on initial-position frequency — the natural
reading of "letters under 1% of running text" — then six letters a reader meets
inside the first 600 words are scheduled as though they were never encountered.

**The demoted set is really two sets**, and the systems architect's framing is
the right one: some glyphs need **recognition**, not **discrimination drill**.

- **ฃ ฅ ฌ** — genuinely absent from the corpus at any position. Recognition
  only; a learner need never produce or discriminate them.
- **ฏ ฐ ฎ ฑ ฒ ฬ ฆ** — encountered while reading common words, but carrying no
  initial-position tone decision. They must be *readable* on sight well before
  a learner finishes; they simply never need to be reasoned about.

**Recommendation.**

1. Compute `symbolPriority` from **any-position** corpus frequency, and state
   in task 4.1 which measure it uses. The two differ by enough to change six
   letters' scheduling.
2. Split the demotion into the two tiers above rather than one flat tail. Task
   4.3's AC3 already asserts demoted letters stay in the SRS; add that the
   seven reading-required letters are scheduled to be *recognisable* within the
   taught rank window, which is a stronger and checkable property.
3. This interacts with T15's rank window: if the taught window is rank ≤ 1,000,
   then six of these letters are inside it by definition, and a sequence that
   defers them past it fails task 4.3 AC5 (every corpus word inside the taught
   window resolves).
4. General form, worth stating once: **frequency for scheduling is
   any-position; frequency for tone-decision weight is initial-position.** The
   plan uses one number for both purposes. My own error here came from the same
   conflation, and T10's critical-letters shortlist is the one place where
   initial-position is genuinely the right measure, because that finding is
   about which letters carry early *tone* decisions.

### Finding T25 — The `word_class` backfill feeds grammar sentence generation, and three Thai-specific classes cannot survive a single-valued guess

**Severity: High**

**Description.** The systems architect found that `word_class` is not an inert
filing field: `GrammarCardGenerator.pickWord` fills each grammar template slot
by **exact** `word_class` match with a fallback chain, and
`GrammarLessonService` reports graduated vocabulary by class. Task 5.2
backfills 3,200 of 5,454 entries, every one of which is currently invisible to
`pickWord` because `word_class: ""` matches no slot. After the backfill they
all become eligible at once.

So a wrong guess is not a misfiled word. It is a **generated ungrammatical Thai
sentence shown to a learner**, and `pickWord`'s fallback chain makes the
failure silent — a slot that finds no classifier quietly takes a noun and emits
a sentence that reads fine and is wrong.

Asked where 5.2 should spend its accuracy budget, here is the ranking, with
what the corpus already shows.

**Highest risk — the three that are structurally, not just practically, hard:**

1. **`clf` (classifiers) — a single-valued field cannot represent them.** Thai
   has roughly 50 common classifiers and the corpus tags **11**: ครั้ง แห่ง
   อัน ใบ ชิ้น ราย องค์ ที เล่ม ฉบับ แผ่น. The deeper problem is not
   sparseness but that the commonest classifiers are *simultaneously* nouns, so
   a single-valued field files them under the other sense. Of the 17 commonest
   classifiers in the language, only five carry the tag:

   | Tagged | Words |
   |---|---|
   | `clf` | ครั้ง (144), อัน (242), ใบ (542), ชิ้น (565), เล่ม (709) |
   | `n` | **คน (47)**, **ตัว (92)**, ลูก (111), ต้น (256), ผล (272), เครื่อง (416) |
   | `prep` | หลัง (277), ที่ (**rank 1**) |
   | *empty* | แก้ว (274), ดวง (1083), คัน (1218), ขวด (1691) |

   **คน and ตัว — the classifiers for people and for animals, the first two any
   learner needs — are not in the classifier set at all.** One word class is
   scattered across four field values. No backfill accuracy fixes this, because
   the field cannot express the membership criterion; counting templates starve
   and fall back silently regardless.

   This makes task 5.1's counting room qualitatively unlike the other five.
   Those are skewed — one room holds 70% of the corpus, three hold under 30
   entries — which is a design problem with a design answer. This one
   partitions on a field that **cannot represent its own membership**, so the
   room systematically excludes its most important members however well it is
   designed. Task 5.1 should settle this before building: either `word_class`
   gains a secondary or multi-valued classifier field so คน and ตัว can be
   both, or the room is declared to cover only the tagged 11 and the mismatch
   is stated. Building it silently is the version that fails late, after
   mnemonics have been staged there.

2. **`adj` versus `v` — and this collides with phase 5's own room taxonomy.**
   Thai adjectives *are* stative verbs: ดี (139), ใหญ่ (193), สวย (813) are all
   tagged `adj` and all behave as verbs. Task 5.1 merges verbs and adjectives
   into one memory room, which is **linguistically correct for recall** and
   which the plan defends well. But that merge must not propagate into
   `word_class`, because `pickWord` matches exact strings and the grammar
   templates need the distinction that the rooms deliberately erase. A slot
   wanting an action verb filled with a stative one produces
   *ผม สวย หนังสือ* — ungrammatical. This is the sharpest coupling in the
   phase: the right answer for memory is the wrong answer for generation, and
   nothing in the plan says the two representations must stay separate.

3. **`part` (particles) — position-locked and highly visible.** ครับ (5), ค่ะ
   (6), นะ (45) are correctly tagged, but particles are sentence-final and a
   particle miscast as `adv` can be placed mid-sentence by a template. These
   are the highest-frequency words in the language and the error is glaring to
   any Thai speaker.

**Medium risk — genuinely ambiguous, and the corpus has already made a choice
worth preserving:** `aux` versus `v` for ได้ (2), จะ (3), ต้อง (16) — all
correctly tagged `aux` today, all *also* main verbs (ได้ = to get); and `prep`
versus `v` for the serial-verb set อยู่ (49), ให้ (12), ถึง (40), where ที่
(rank 1) is tagged `prep` while its own `description` field records that it is
also a relativizer and a nominalizer.

**Lowest risk — `n`.** 1,523 already tagged, it is the natural fallback, and a
noun misfiled as a noun subtype costs `pickWord` nothing.

**Recommendation.**

1. **Guessed values must not reach `pickWord` at full confidence.** Phase 5's
   README already says "a backfilled class is a guess" and requires it stay
   distinguishable from a source-provided value — but if that marker lives in a
   separate field, `pickWord` never sees it. Have `pickWord` prefer
   source-provided values and fall back to backfilled ones.

   **This recommendation is currently blocked by two `covers` gaps and the
   three want fixing together** (both identified by the systems architect):
   `src/domain/vocabulary/types.ts`, where the provenance field would be
   declared, is in no task's `covers` anywhere in the plan; and
   `src/domain/grammar/`, where `pickWord` lives, is absent from task 5.2's.
   So the task that creates the guesses can reach neither the type that would
   mark them nor the consumer that would respect the mark.
2. **Allow a word more than one class**, at least for the noun/classifier
   overlap. Otherwise คน and ตัว are permanently unavailable to counting
   templates regardless of backfill quality.
3. **State that the room taxonomy (5.1) and `word_class` are separate
   representations** and that collapsing 12 classes to 6 rooms must not be
   applied to `word_class`. As an AC: `pickWord` resolves every template slot
   after the backfill, asserted per slot type — which catches a room-shaped
   `word_class` immediately.
4. **Make the fallback chain loud.** A slot resolved by fallback rather than by
   exact match should be recorded, so a starved `clf` slot is visible as a
   count rather than as a plausible wrong sentence.

## Plan Quality Findings

| Concern | Assessment |
|---|---|
| **AC testability** | Strong overall. The pattern of testing content *against the lesson's own stated material* rather than against the rule module (2.5 AC3, 3.2 AC4, 4.2 AC3) is the best idea in the plan's verification design — it catches "correct but incomplete," which is the actual failure mode of teaching material. Three exceptions: 2.2 AC3 is not decidable as written (T19); 3.1 AC1's universal quantifier is refuted by the corpus (T1); 2.4's `nameRomanized` work has no AC (T16). |
| **Behavioral ACs** | Good. Almost every AC names an observable outcome rather than an implementation. The end-to-end criteria per phase (1.4 AC4 on scheduled cards, 3.2 AC4 on word resolution, 4.3 AC5 on tone across the rank window, 5.3 AC4 on room-by-direction) are genuinely behavioral and genuinely falsifiable. 2.1 AC2 ("without consulting any per-letter table") is the one that reads as an implementation constraint — though I think it earns its place, since it is the phase's actual thesis. |
| **Test case quality** | Above average. Counts asserted exactly so a shrinking source cannot pass (2.1, 2.4, 4.3); both-direction set equality (1.4, 2.5, 3.3); mutation-style tests that assert the test itself fails when the input is thinned (2.5, 3.2, 4.2) — that last pattern is rare and valuable. Weakest: the planted-overlap tests prove the corpus loaded but not that the threshold is useful (T6), and 2.2's idempotence case tests the wrong direction (T5). |
| **YAGNI** | Mostly disciplined. The three-state modelling repeated across tasks (classified/unclassifiable/unclassified; converted/failed/not-yet; resolved/unresolvable/unanalysed) is a real pattern earning its repetition, not ceremony — for content data, "we tried and it does not work" versus "we have not tried" is the distinction that keeps a backlog honest. Phase 6's video export is the one item I would question: it is real work serving a use case ("passive review") that no criterion elsewhere in the plan measures, and the decommission it gates does not need it. Worth confirming the learner actually wants it before building it. |
| **Architectural decisions documented with alternatives** | Excellent, and better than most plans I review. Every task carries an ADR with a named rejected alternative and the reason. CONTEXT.md's *Rejected alternatives* section is the strongest part of the plan — particularly the argument against literal memory palaces for random-access SRS, which is correct and is a mistake I have seen made. Two gaps: nothing documents *why Paiboon rather than RTGS* despite that being a real choice with real tradeoffs (the plan only rejects IPA), and nothing documents the choice of n=8 (T6). |
| **Trust boundary inventory** | Strong for a content plan, with two omissions — see T20. The controls are each assigned to a specific task, which is the part most inventories skip. |
| **Internal consistency** | One hard contradiction (T3: 2.5 AC2 versus 2.5 AC3 versus 3.3 AC3). One undeclared dependency (T7: 4.1 needs 3.1). One unowned shared artifact (T12). One constant referenced by four ACs and declared by none (T15). |

## Phase-by-Phase Review

### Phase 1 — Tracer

**Assessment: sound, and correctly identified as the decision point.**

The lesson-identity hazard in CONTEXT.md is real and well-analysed — I traced
`getMasteredCharacters()` intersecting `completedLessons` with `sym.lesson`, and
the three-store join-key framing is accurate. Requiring the migration to move
the stored array and `sym.lesson` together, at the boundary, is right.

Task 1.4's content is feasible: lesson 1 has exactly the three corpus words it
claims (มา, นาน, นา) and no more (T15). AC4 — same scheduled cards and same
unlocked vocabulary either side of the migration — is the right end-to-end
criterion and I would not weaken it.

Findings touching this phase: **T12** (transcript extraction has no owner and
1.4 is the first consumer), **T15** (rank window), **T6** (the gate 1.4's ADR
introduces).

### Phase 2 — Encoding

**Assessment: the linguistic model is correct; the lesson's placement is not.**

The class rule is right in every count I checked — 10 sonorants all low, 9
unaspirated stops plus อ as the entire mid class, 11 high all aspirate or
fricative, 25 in the split bucket. This is the best idea in the plan and it is
worth the phase.

But **T3** is a hard blocker: the class-rule lesson as scoped cannot satisfy
AC3 without breaking AC2. Splitting it — derivable buckets right after lesson
3, the high list at lesson 12 — resolves it and gives both halves a better
placement than either has now.

**T4** will bite task 2.1's executor within the first hour: `isAspirated` is
`false` on ฑ and ฒ, which are /tʰ/, so the derivation AC1 demands will produce
two mismatches and the tempting fix is the exception list AC1 forbids.

**T5** changes task 2.2's shape materially — it is a normalisation of a
three-state field, not a conversion of a uniform one, and 1,294 entries are at
risk of corruption from a naive IPA→Paiboon pass.

Task 2.3 is the cleanest task in the plan. The argument that tone owns the
vertical axis because tone *is* pitch height, and class therefore gets a place
rather than a height, is the correct call and correctly defended. AC2 —
distinguishable with colour removed — is the right operationalisation of the
CVD concern.

Also here: **T10** (the shortlist drops ศ), **T14** (tone marks get no
mnemonic), **T16** (`nameRomanized`).

### Phase 3 — The hard parts

**Assessment: right instinct, wrong content. This phase needs the most work.**

The diagnosis is correct: unwritten vowels, clusters and อักษรนำ are exactly
the three things that stop beginners reading, and treating them as asides is
the source course's real failure. Promoting them to lessons is the right
response, and the insistence that ห-leading and อ-leading are one mechanism is
a genuine improvement on the source.

But both of the plan's factual claims about what those lessons contain are
incomplete in ways the corpus refutes at the top of the frequency list:
**T1** (the implicit-vowel rule is a minority pattern for three-consonant
strings, and the missing prerequisite is "which letters are vowels in
disguise") and **T2** (อักษรนำ's productive third branch, containing สวัสดี at
rank 9, is absent).

Task 3.1's decision to reconcile against the corpus with a **recorded baseline
rather than a zero target** is exactly right and is what makes these findings
fixable rather than fatal — but the baseline must be recorded *after* T1 and T2
land, not before, or it will freeze the wrong error rate as the target.

**T13** (cluster inventory must be ordered pairs) and **T18** (ฤ) also land
here.

### Phase 4 — Sequence

**Assessment: the consolidation argument is right; two precision problems.**

Consolidating six fragmented tone-mark lessons into one is correct, and the
reasoning — the source's fragmentation is spacing, and this app has an SRS that
does spacing — is exactly the right way to think about it. The three
observations the lesson is built on (mid takes all four in order; the other two
take only two; low is the odd one out) are true and are what make eight cells
memorable.

**T7** is the implementation risk: the table must key on the syllable's
governing class, not on the letter under the mark, and the corpus's only two
apparent counterexamples (กรี๊ด, ปลั๊ก) are both cluster cases that prove it.
This also makes 4.1 depend on 3.1, which is not declared.

**T8** and **T9** are wording precision on the two facts the lesson is most
likely to be quoted on.

The demotion model is right in kind and I want to record agreement explicitly:
keeping all 44 in the SRS and changing only priority, with ฬ still reachable
through review, is the honest design. So is making "skipped" a first-class
numerals state rather than an absence, and so is the decision *not* to demote ถ.

**T24** qualifies the basis rather than the decision. An earlier version of this
section said the corpus supports the demotion list exactly as drawn; that was
measured on syllable-initial frequency alone, and seven of the ten demoted
letters appear in words inside rank ~600 (พัฒนา 336, เศรษฐกิจ 437, ปฏิบัติ 497,
กฎหมาย 515, นาฬิกา 523). Demotion stays; the priority behind it has to be
computed from any-position frequency, and the demoted set splits into three
letters a reader never meets and seven they meet but never reason about.

### Phase 5 — Vocabulary palace

**Assessment: linguistically the most careful phase in the plan.**

Three things here are right in ways plans usually get wrong. Merging verbs and
adjectives because Thai adjectives *are* stative verbs (ดี is a verb) is
correct, not a simplification. Treating classifiers as a real class English
lacks is correct. And the observation that rooms prune in production but not in
recognition — and the refusal to build UI that pretends otherwise — is the kind
of honesty about a mnemonic device's actual reach that makes the difference
between a system a learner keeps and one they abandon.

Pom and Chan are a good choice: ผม and ฉัน are rank 15 and 14, both high-class
initials, and the gendered first-person split genuinely is better learned by
exposure than by being told. The register decision in 5.3's ADR (ฉัน informal,
ดิฉัน formal, declared once per character) is a real issue correctly caught —
an inconsistent Chan would teach register noise.

One addition I would make: **Chan's ฉ is the rarest of the plan's seven
critical high letters** (0.42% token share) and ผม's ผ is the fourth commonest
(2.28%). If the characters are meant to reinforce the high district, they
reinforce it unevenly. Worth one line in 5.3 noting that the reinforcement
value is in the *district*, not the letters.

**T20**'s second half lands here: the 277 existing `mnemonic` values in
`vocabulary.json` are inherited unexamined.

**But the phase has one High finding, T25, and it is the coupling the phase's
own best decision creates.** `word_class` already drives grammar sentence
generation through `GrammarCardGenerator.pickWord`, so task 5.2's backfill of
3,200 entries makes them all eligible for template slots at once, and a wrong
guess becomes a generated ungrammatical sentence rather than a misfiling. The
sharpest case is the verb/adjective merge: correct for memory rooms, wrong for
`word_class`, and nothing in the plan says the two representations must stay
separate. Classifiers are worse — คน and ตัว, the two commonest classifiers in
Thai, are tagged `n`, and no single-valued field can represent a word that is
both.

### Phase 6 — Strangle

**Assessment: correctly ordered; one scope question.**

The ordering constraint in 6.2 AC4 — confirm every lesson serves a deck
*before* deleting the `.webm` files — is right and the phase says why. Keeping
the `never` default after the union goes single-arm is a small, correct call.

My one question is whether task 6.1 (deck → video export) is needed at all.
Its justification is passive review, which no criterion anywhere in the plan
measures, and 6.2 does not depend on it for anything except sequencing. It is
the one place in an otherwise disciplined plan where real effort buys something
unvalidated. I would ship phase 6 as decommission-only and treat export as a
separate, evidence-led decision.

## Summary Statistics

| | |
|---|---:|
| Documents reviewed | 27 (README, CONTEXT, 6 phase READMEs, 20 task files) |
| Factual claims verified against repo data | 15 |
| Verified **correct** | 13 |
| Verified **incorrect or materially incomplete** | 2 (T1, T2) — plus T11, a sourcing claim |
| Findings raised | 25 |
| — Critical | 2 (T1, T2) |
| — High | 6 (T3, T4, T5, T6, T7, T25) |
| — Medium | 11 (T8, T9, T10, T11, T12, T13, T14, T15, T21, T23, T24) |
| — Low | 6 (T16, T17, T18, T19, T20, T22) |
| Findings backed by a measurement over repo data | 15 (T1, T2, T4, T5, T6, T7, T10, T11, T15, T18, T19, T21, T23, T24, T25) |
| Claims of mine the panel corrected | 5 (T6 threshold twice, T22 count twice, T23/T24 frequency measure) |
| Phases requiring changes before content authoring | 2 (phase 2 — T3, T4; phase 3 — T1, T2) |
| Phases needing linguistic change at all | 3 (phase 2, phase 3, and phase 5 — added late, see T25) |
| Phases needing none | 3 (phase 1, phase 4, phase 6) |

### Data sources used for verification

- `src/domain/script/data/symbols.ts` — all 44 consonant records extracted and
  classified; `toneRules` (9), `toneMarkRules` (8), `completeToneChart`,
  `specialRules` (19), `lessons` (25), 29 vowels, 4 tone marks, 4 rare vowels,
  82 mnemonics
- `src/domain/vocabulary/data/vocabulary.json` — 5,454 entries; per-syllable
  initial-consonant frequency both type-weighted and token-weighted by the
  `frequency` field; per-lesson cumulative writable-word counts; ๊/๋ attribution
  by governing class; romanization notation classification; bare
  two- and three-consonant word inventories by rank
- `src/Thai Alphabet/*.pdf` — all 50 lesson and recording-script PDFs extracted
  with `pdftotext -enc UTF-8` (220 KB of text) for the ฌ check and the n-gram
  calibration
