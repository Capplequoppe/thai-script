# WordCard Enrichment Design

## Problem

The vocabulary lesson intro phase shows a minimal WordCard with Thai word, English translation, romanization, word class, syllable badges, and mnemonic. Rich data fields — `image_file`, `samples`, `SyllableInfo` decomposition (`initialConsonant`, `vowel`, `finalConsonant`, `toneMark`), and sample audio — are unused.

## Data Availability (5,435 words)

| Field | Count |
|---|---|
| `syllables` (all fields) | 5,435 |
| `samples` (Thai only) | 5,218 |
| `samples` (with English + romanization) | 1,835 |
| `image_file` | 2,052 |
| `thai_audio_file` | 2,052 |
| `english_audio_file` | 2,052 |
| Sample audio | ~1,835 |

## Design

Single sectioned scrollable card with four visual zones. All sections conditionally rendered — graceful degradation when data is sparse.

### Section 1 — Hero (word identity)

- Image at top if `image_file` exists (rounded, max-height capped, centered)
- Thai word large (72px) with play audio button
- English translation + romanization
- Word class badge

### Section 2 — Syllable Breakdown (enriched)

- Section header: "Syllable Breakdown"
- Each syllable row:
  - Syllable text (Thai, large) on the left
  - Decomposition line: `initial: ท → vowel: ำ → final: —` with labeled spans
  - Badges on the right: consonant class, tone, syllable type
  - Tone mark label if present

### Section 3 — Example Sentences

- Section header: "Examples"
- Only rendered when samples with content exist
- Each example:
  - Thai sentence with inline play button (if sample `thai_audio_file`)
  - Romanization in muted text (if available)
  - English translation (if available)

### Section 4 — Mnemonic (unchanged)

- Accent-colored block with mnemonic text (as today)

## Component Structure

All changes scoped to `WordCard.tsx`. No new components needed — the sections are simple enough to live within the single organism.

## Decisions

- **Layout**: Sectioned scroll (not tabs or progressive reveal)
- **Syllable detail**: Full consonant/vowel/final decomposition shown
- **Sample audio**: Play button per sentence when audio available
