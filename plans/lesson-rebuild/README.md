---
doc_type: index
title: Lesson rebuild — in-house mnemonic decks replacing the ThaiPod101 videos
description: Replace 25 licensed video lessons with ~20 in-house slide decks built on a class-district scene-grammar mnemonic system, phased in lesson by lesson behind a content-source seam.
covers:
  - src/domain/script
  - src/domain/vocabulary
  - src/presentation/components/organisms/LessonIntro.tsx
  - src/presentation/components/organisms/SymbolCard.tsx
  - src/presentation/utils/consonantClassColor.ts
  - src/infrastructure/persistence
  - scripts
  - public/lessons
status: draft
planner_model: claude-opus-5
plan_value: 13
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Lesson rebuild

The app currently teaches the alphabet with 25 ThaiPod101 `.webm` files. Their
**sequencing is good** and is kept: words from lesson one, all final-consonant
sounds by lesson three, one tone rule per lesson, confusable pairs taught
adjacently. Their **content layer is the weak one** and is replaced.

Measured against the source transcripts: roughly 8 of 44 consonants carry a
mnemonic linking shape *and* sound, one vowel does, tone marks none, and
**consonant class none at all** — while class is the largest memory burden in
the system and every tone decision routes through it. Four lessons go to
letters under 1% of running text; three more spend their front halves on Thai
numerals. Example vocabulary is chosen to demonstrate a letter, not because it
is worth knowing, against a repo that already ranks 5,454 words by frequency.

## North star

A learner opens any lesson and gets in-house material in which **class is
encoded twice** (colour, already shipped; plus a scene district), **tone is
encoded as vertical motion**, and every symbol carries a mnemonic binding
shape, sound and class in one image — with example words drawn from the
frequency ranks the app already holds.

Success is not "20 decks exist." It is: the ThaiPod101 files are deleted, no
lesson serves a legacy video, and the learner's scheduled cards and unlocked
vocabulary are unchanged across the migration.

## Phases

Each carries one capability end to end. Phase 1 is the decision point: if
Lesson 1 through the new stack is not better than the video it replaces, that
is known after one lesson, not twenty.

| Phase | Capability at its end | Depends on |
|---|---|---|
| 1 — Tracer | Lesson 1 serves an in-house deck; lessons 2–25 still serve video, unchanged | — |
| 2 — Encoding | Class districts, tone motion and Paiboon are live; the opening band is in-house | 1 |
| 3 — Hard parts | Unwritten vowels, clusters and อักษรนำ are taught as real lessons | 2 |
| 4 — Sequence | Consolidated tone marks, rare letters demoted to an SRS tail; ~20-lesson sequence complete | 3 |
| 5 — Vocabulary palace | Words partition into POS rooms; Pom and Chan recur across mnemonics | 2 |
| 6 — Strangle | Decks export to video; the 25 licensed files and the legacy path are gone | 4, 5 |

Phase 5 depends on phase 2 rather than on 4: it needs the scene-grammar seam
and nothing from the later script lessons, so it runs alongside phases 3–4.

## Content tasks are gated structurally, then judged

Most tasks here author content, and "is this lesson good?" is not testable.
Every content task therefore carries criteria a script can check — a lesson
covers exactly its declared symbol set, no symbol is used before it is taught,
every example word resolves to a `vocabulary.json` entry inside a declared rank
window, every asset a deck references exists, and every mnemonic validates
against the scene-grammar schema. Human judgement reviews prose on top of a
green structural gate rather than being the only gate.

## test-templates

```text
vitest | src/** | ./node_modules/.bin/vitest run {file} --reporter=verbose --hideSkippedTests -t {name}
```

## Trust Boundary Inventory

The pipeline reaches the network, reads an API credential, writes files whose
paths come from data, and renders generated content into the app.

| Input | Source | Reaches |
|---|---|---|
| `ELEVENLABS_API_KEY` | env var, `.env` | an outbound `Authorization` header. Must never reach deck JSON, a committed file, a log line, or a finding's text |
| ElevenLabs response body | network | bytes written to `public/lessons/<id>/*.mp3` and served to the browser; error text that must not be echoed into a committed artifact |
| `lessonId`, asset filenames in deck JSON | generated, hand-editable | filesystem path derivation under `public/lessons/`, and `src`/`href` attributes in rendered slides — **traversal, and a path escaping the assets root** |
| lesson script Markdown (deck source) | hand-authored, agent-authored | parsed to deck JSON, rendered as slide content, and its `th` spans become TTS input |
| `word_class` backfill values | agent-generated | the POS partition that decides which memory room a word belongs to |
| persisted `completedLessons` | `localStorage`, and a second device via `MergeService` | the lesson-identity migration, and through it the mastered-character set gating vocabulary |

Controls, each owned by a task:

- `lessonId` is constrained to a closed charset (`^[a-z0-9-]{1,64}$`) at the
  one point a path is derived from it; every asset path resolves inside
  `public/lessons/<lessonId>/` or is refused. Task 1.1 owns the charset, task
  1.3 owns the containment check at the write boundary.
- Deck content renders as **text nodes only** — no `dangerouslySetInnerHTML`
  anywhere in the deck renderer. Task 1.2.
- The API key is read from the environment at generation time and never
  written to any artifact; the generator fails loudly when it is absent rather
  than silently skipping. Task 1.3.
- Deck JSON is schema-validated before anything renders it, and a deck failing
  validation reports its reason rather than rendering empty. Task 1.2.
- Persisted `completedLessons` passes through one migration at the repository
  boundary, with `Validation.ts` and `MergeService.ts` updated in the same
  task. Task 1.1.

The plan text itself is outside input under the same argument the format spec
makes: it is agent-authored and hand-editable, and its task bodies drive
tool-using agents. Task bodies here name no command a gate does not already
declare in `verify`.
