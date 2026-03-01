# Vocabulary Description Field — Design

**Date:** 2026-03-01

## Goal

Add an optional `description` field to `VocabEntry` for rich, multi-sentence explanations of words that lack a clean direct translation. Shown alongside the short `english` label wherever a word is displayed in full.

## Motivation

Many Thai words have no direct English equivalent. The `english` field holds a best-attempt one-word gloss; `description` holds a fuller explanation — nuances, multiple meanings, usage context — for words where that matters.

## Data Layer

- Add `description?: string | null` to `VocabEntry` in `src/domain/vocabulary/types.ts`.
- Field is absent or `null` for most words; no migration needed.
- No changes to `VocabularyCard`, `VocabCard`, or `VocabCardGenerator` — description is display-only.

## Display

`WordCard` hero section (after `english`, before `word_class` badge):

```
ที่  🔊
at/in/on                         ← english (unchanged, text-2xl font-semibold)
tʰîː                             ← romanization (unchanged, text-sm muted)
[prep]                           ← word_class badge (unchanged)

A versatile preposition meaning   ← description (new, text-sm muted, only when present)
"at", "in", "on", or "of". Also
used as a relative clause marker.
```

- Rendered as a `<p>` with `text-sm` and `color-text-muted`, with `mt-2` spacing.
- Both surfaces that show `WordCard` — VocabularyPage intro and VocabListPage detail — pick this up automatically.

## Scope

- `src/domain/vocabulary/types.ts` — add field
- `src/presentation/components/organisms/WordCard.tsx` — conditional render
- `src/domain/vocabulary/data/vocabulary.json` — schema-compatible immediately; descriptions added manually over time

No quiz, SRS, card generation, or review flow changes.
