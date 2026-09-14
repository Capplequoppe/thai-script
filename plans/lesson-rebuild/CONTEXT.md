---
doc_type: deep-dive
title: Execution context for the lesson rebuild
description: The five-store lesson-identity hazard, the build-on-not-beside rule, verified data defects, quality gates, and rejected alternatives for replacing the ThaiPod101 videos with in-house mnemonic lesson decks.
covers:
  - src/domain/script
  - src/domain/vocabulary
  - src/presentation/components/organisms/LessonIntro.tsx
  - scripts
status: draft
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Execution context — lesson rebuild

Replaces the 25 ThaiPod101 `.webm` lessons with in-house slide decks
(illustrations + ElevenLabs audio + the existing `SymbolCard` family), via a
strangler fig: both sources coexist, lesson by lesson, until the last legacy
lesson is gone.

**This document was rewritten after a six-expert review of the first draft**
(`reviews/`). Its earlier hazard table named three stores; there are five. Read
the two rules below before touching anything.

## Rule 1 — lesson identity is a join key across FIVE persisted stores

| # | Store | Where |
|---|---|---|
| 1 | `completedLessons: number[]` | `LearnerState`, `domain/shared/types.ts:173` |
| 2 | `currentLesson: number \| null` | `LearnerState`, `types.ts:174` |
| 3 | `lesson` on every symbol | `script/data/symbols.ts` |
| 4 | `number` on every lesson | `symbols.ts` lessons table |
| 5 | **`ScriptPropertyCard.lessonNumber`** | serialised per card — **295 of 295 cards in the repo's `progress.json` carry it** |

Store 5 is the one the first draft missed entirely. It is written at 20 sites
in `ScriptCardGenerator.ts` and joined against lesson identity at three places
in `ScriptLessonService.ts` — `unlearnLesson:170`, `getLessonMasteryProgress:279`,
and `reconcileCards → addPendingCatchUp:319-323` (which keys a
`Map<number, string[]>`). `tsc` catches none of it: every side is `number`.

**The migration boundary already exists.** `Storage.ts:40` declares
`migrateState`, called from `load:161` — the repo's own precedent for
migrate-once-at-load. Extend it. `StorageLearnerStateRepository` is a pure
delegator and is the wrong place.

**Three more things are keyed off the lesson count, in three layers:**
`ScriptLessonService.ts:21` (`TOTAL_LESSONS = 25`), `AchievementService.ts:28`,
`ProgressPage.tsx:38`, `ProgressPage.tsx:240`, and `AchievementBadge.tsx:24`
("Complete all 25 lessons" — user-facing copy whose text *and* unlock condition
both go wrong). Three integer walks assume `1..n`: `startLesson:132`,
`getNextLesson:182`, and `LessonPath.tsx:19`
(`Array.from({length: totalLessons}, (_, i) => i + 1)`, the primary navigation
surface). **Derive all of these from the declared sequence — do not update the
constants**, or the next resequence reopens every one.

## Rule 2 — build ON an existing feature, never BESIDE it

The first draft specified building five things that already ship, and in three
cases the owning task could not even reach the original:

| Already exists | First draft would have rebuilt it as |
|---|---|
| `priority` on every symbol (98 sites, **zero consumers**) | a new `symbolPriority.ts` |
| `TONE_CONTOUR_POINTS` — five contours, in `ToneContourIcon.tsx` | a new "tone-motion vocabulary of five" |
| `ClassBadge` | new district rendering |
| lesson ordering (array position + `lesson` field) | `lessonSequence.ts` |
| `migrateState` | a new migration at the repository |

Before adding any field, module or component: grep for it. If it exists,
extend it and put the original in your `covers`.

**And derive lists, never curate them.** Three review findings had one cause: a
list asserted in prose where a query over the corpus was available. Hand-compiling
by salience dropped ห/ฮ from the cousin pairs (ฮ is 0.01% of text, so it looks
skippable — and it takes ห, the 4th commonest initial, with it), dropped ศ from
the critical-letter shortlist, and left ส/ล out of the confusables. A derivation
does not weigh salience, so it keeps what a human reasonably drops.

## Verified data defects — fix, do not work around

- **`isAspirated` is `false` on ฑ and ฒ**, whose own `initialSound` reads
  `"th"`. A class derivation keyed on that field gets both wrong.
- **`vocabulary.json` is not uniformly IPA.** Measured: ~3,447 IPA, ~819
  already Paiboon, ~795 mixed, ~393 neither. A blind IPA→Paiboon pass corrupts
  roughly 2,000 entries. Classify per entry first.
- **`word_class` is empty on 3,200 of 5,454** entries.
- **The vowel conditional-form rules exist only inside mnemonic prose** — no
  `writtenForm`/`withFinal` field exists. So does the confusable-pair relation
  (in exactly one of 82 strings). **Extract relations into fields BEFORE
  rewriting prose**, or the rewrite destroys them.

## Originality — the constraint and its mechanism

The transcripts under `src/Thai Alphabet/` are copyrighted. Facts about the
writing system are free to use; their phrasing, their mnemonic images and their
curated examples are not. The 82 existing `mnemonic` strings are close
paraphrases and are **rewritten, not edited**.

The gate: **commit salted n-gram hashes, never extracted text.** Hash the
candidate's n-grams and test membership — the committed artifact is
non-reproducible and carries no licensed content.

- **n = 5.** Measured against the 82 known paraphrases: n=8 catches 13, n=5
  catches 46.
- **Both PDF sets** — recording scripts *and* lesson notes. The existing ฌ
  mnemonic paraphrases the lesson-notes PDF, which the first draft never read.
- The check needs a **canary** (assert a known phrase IS found) and a
  token-count floor. "Detects a planted overlap" proves the algorithm works and
  says nothing about the corpus being loaded.

## Repo orientation

- **`symbols.ts`** (~3,000 lines) — all 44 consonants (including ฌ), vowels,
  tone marks, `toneRules`, `toneMarkRules`, `specialRules`, the lessons table.
  The plan's highest-contention file.
- **`LessonIntro.tsx`** builds a `Slide[]`. A deck is a **new slide type beside
  the symbol cards, not a replacement for the page**. Two consumers:
  `LessonPage` (`/lesson/:n`) and `CatchUpPage` (`/catch-up/:n`).
- **Reveal state lives in `Flashcard.tsx:30`**, not `WordCard.tsx` (which has
  none). Any criterion about pre- vs post-reveal belongs there.
- **`e2e/lesson-intro.spec.ts` asserts Lesson 1 shows a `<video>` with controls**
  and checks a `maaw maa` romanization. `vite.config.ts:9` excludes `e2e/**`
  from vitest and no `verify` runs Playwright — so this plan breaks it
  invisibly unless a task owns it.
- **`ScriptCardGenerator.ts:168`** deliberately omits `consonantClass` from the
  class-retrieval card so the glyph renders with no hint. **Any new class
  channel must respect that suppression**, or the card testing class recall
  displays its answer.
- **`scripts/generate-sentence-audio.py`** — read its docstring before writing
  the new pipeline; it records the verification discipline and which levers are
  not levers.

## Conventions

Biome (**tabs**, double quotes). Vitest, tests co-located `*.test.ts(x)`.
Clean architecture: `domain` → `application` → `infrastructure` →
`presentation`; domain imports nothing outward. Generated assets under
`public/lessons/<lessonId>/`; audio committed, matching the 8,930 clips already
shipped. Pipeline scripts are Python under `scripts/` and **emit JSON that
vitest-side tests assert over** — the repo has no Python test runner.

## Quality gates

`npm test` (`npm test -- <path>` to scope), `npx biome check .`.
Tasks not touching `src/presentation` gate on
`npx tsc --noEmit -p tsconfig.domain-check.json`. Tasks touching presentation
gate on `npm run build`. A task that changes lesson identity or the lesson
count **must** gate on `npm run build`, because the breakage lands in
presentation.

## Rejected alternatives

- **One multilingual TTS voice code-switching mid-sentence.** A wrong tone
  teaches a mispronunciation. Segments are typed `en`/`th`; Thai output passes
  transcribe-back before shipping.
- **Runtime audio generation.** Static committed mp3s; no API dependency at
  page load.
- **Regenerating the 8,930 existing clips.** Out of scope; two voices coexist.
- **Keeping 25 numbered slots.** Leaves ordering hostage to the old structure
  and does not avoid the migration.
- **Committing extracted transcript text.** The gate would store the material
  it exists to protect. Hashes instead.
- **Literal memory palaces (ordered routes).** A palace serves *searched*
  recall; SRS is cued paired-associate recall with nothing to search. This
  applies to the vocabulary rooms as much as to symbols — the first draft
  rejected it for symbols and then built phase 5 on it. Rooms stage mnemonics
  and confirm *after* reveal; they are never a pre-reveal cue.
- **Class encoded by colour alone.** Fails for red-green CVD; district is the
  second channel.
- **A Python test runner for content gates.** See Conventions.
