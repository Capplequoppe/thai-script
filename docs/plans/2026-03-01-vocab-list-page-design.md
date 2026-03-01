# Vocabulary List Page — Design Document

**Date:** 2026-03-01
**Status:** Approved

---

## Problem

The Items page "Vocab" tab shows learned vocabulary as a non-interactive grid. There is no way to tap a word and see its full dictionary entry (romanization, image, sample sentences, SRS stage, word class). Word-class filtering does not exist.

---

## Solution

A new `VocabListPage` at `/vocab` with dynamic word-class tabs, a tappable grid, and a full dictionary-style detail card. The Items page "Vocab" tab becomes a navigation link to this page.

A separate enrichment task will classify the 3655 unclassified entries in `vocabulary.json` (adding `part`, `conj`, `pron`, `clf`, `int`, `prep` values). The page is designed to pick up new classes automatically as they are added.

---

## Navigation

- **Entry point:** Items page "Vocab" tab navigates to `/vocab` (replaces inline grid)
- **Back:** Back arrow on `/vocab` returns to `/items`
- **Detail:** Tapping a word replaces the grid with a detail card; back button returns to grid

---

## Word-Class Tabs

Tabs are **dynamic**: derived from the `word_class` values present in the user's learned words. Classes with 0 learned words are hidden. "All" tab is always first.

Display-name map for known classes:

| `word_class` | Tab label |
|---|---|
| `n` | Nouns |
| `v` | Verbs |
| `adj` | Adjectives |
| `adv` | Adverbs |
| `part` | Particles |
| `conj` | Conjunctions |
| `pron` | Pronouns |
| `clf` | Classifiers |
| `int` | Interjections |
| `prep` | Prepositions |
| `""` or unknown | Other |

---

## Grid View

3-column grid of learned vocabulary words. Each tile shows:
- Thai word (large, `thai` CSS class)
- Romanization (muted, small)
- English meaning (muted, small, truncated)
- Word class badge
- Audio button (top-right, if `thai_audio_file` exists)

Tapping a tile navigates to the detail card.

---

## Detail Card (Dictionary Entry)

Replaces the grid. Contains a back button at the top. Fields:

1. **Thai word** — large, with inline audio button if `thai_audio_file` exists
2. **Romanization** — muted text below
3. **Badges row** — word class badge + SRS stage badge side by side
4. **English meaning**
5. **Image** — full-width rounded image if `image_file` exists
6. **Sample sentences** — up to 3, each showing:
   - Thai sentence + Thai audio button
   - Romanization (muted)
   - English translation

If no image and no samples, only items 1–4 are shown.

---

## Data Access

`VocabularyService` needs one new method:

```ts
/** Full VocabEntry for every word the learner has cards for, sorted by rank. */
getLearnedEntries(): VocabEntry[]
```

Implementation: join `cardRepo.findAll("vocab")` word Thais against `this.vocabulary`, deduplicate, sort by rank.

`useApp` exposes this as `vocab.getLearnedEntries()`.

The SRS stage for a word is derived from the best (highest) stage across the word's cards in `state.vocabCards`.

---

## Routing

- Add `<Route path="/vocab" element={<VocabListPage />} />` to `App.tsx`
- Items page: vocab tab `onClick` → `navigate("/vocab")` (removes inline grid rendering)

---

## Conventions

- All colors via `var(--color-*)` tokens — no raw Tailwind color classes
- New atoms/molecules if patterns are reused; inline JSX for one-off patterns
- No new tests required (purely presentational; data logic tested via `getLearnedEntries`)

---

## Testing

- Add unit tests for `VocabularyService.getLearnedEntries()`
- All existing 430 tests must pass unchanged
