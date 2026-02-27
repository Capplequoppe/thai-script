# Accelerated SRS Algorithm Design

## Problem

The current SM-2 algorithm spaces first reviews at 1 day, 6 days, 15 days for "Good" answers. This is far too slow for an app designed to help users memorize Thai script quickly. Thai characters require encoding multiple novel dimensions (shape, sound, class, tone rules, vowel position) with no prior mental scaffold, making early memory traces especially fragile.

## Research Summary

Converging evidence from WaniKani (4hr, 8hr, 1d, 2d), Anki learning steps (1m, 10m), Memrise (4hr, 12hr, 24hr), and Pimsleur graduated recall (5s to 1hr to 1d) shows that novel script learning needs multiple sub-day reviews before the first overnight gap. Cepeda et al. (2008) found optimal inter-study gap is 10-20% of desired retention interval. Novel visual stimuli decay faster than vocabulary due to lack of existing semantic scaffold.

## Design

### Card Lifecycle

Cards progress through two phases:

```
LEARNING (fixed sub-day steps) → GRADUATED (SM-2 with conservative multiplier)
```

### Learning Phase

Fixed steps triggered by correct answers:

| Step | Interval | Cumulative |
|------|----------|------------|
| 0 | 0 (immediate) | 0 |
| 1 | 10 minutes | 10 min |
| 2 | 1 hour | ~1.2 hr |
| 3 | 8 hours | ~9 hr |
| 4 | 1 day | ~33 hr |

After completing step 4 correctly, the card graduates.

### Rating Effects During Learning

| Rating | Effect |
|--------|--------|
| 1 (Again) | Reset to step 0 (immediate) |
| 2 (Wrong) | Reset to step 1 (10min) |
| 3 (Hard) | Repeat current step |
| 4 (Good) | Advance one step |
| 5 (Easy) | Skip one step |

### Graduation

Cards enter SM-2 with:
- `interval = 3 days` (4320 minutes)
- `easeFactor = 2.0` (conservative for novel glyphs, down from 2.5)

### Graduated Phase (SM-2)

Existing 5-point rating logic with adjustments:
- Starting ease factor: 2.0
- Ease factor range: 1.3 - 3.0
- Interval unit: minutes (not days)
- Max interval: 180 days (259,200 minutes)
- Lapse rating 1 (Again): reset `learningStep = 0`, ease -= 0.3 (min 1.3)
- Lapse rating 2 (Wrong): reset `learningStep = 1`, ease -= 0.2 (min 1.3)

### Response Time Tracking

Track time from prompt display to answer submission. After 3+ reviews, build a per-card rolling average. Modulation (graduated cards only):

| Response time vs average | Interval multiplier |
|--------------------------|-------------------|
| < 0.7x | 1.1 (slight bonus) |
| 0.7x - 1.3x | 1.0 (no change) |
| > 1.3x | 0.85 (slight penalty) |
| > 2.0x | 0.7 (stronger penalty) |

Learning phase uses fixed steps — response time does not affect them.

### Data Model

```typescript
export interface SrsData {
  easeFactor: number;
  interval: number;            // in MINUTES (changed from days)
  repetitions: number;
  nextReviewDate: string;
  lastReviewDate: string | null;
  learningStep: number | null; // null = graduated, 0-4 = in learning
}
```

Constants:
```typescript
LEARNING_STEPS_MINUTES = [0, 10, 60, 480, 1440]  // 0, 10min, 1hr, 8hr, 1day
GRADUATING_INTERVAL_MINUTES = 4320                 // 3 days
DEFAULT_EASE_FACTOR = 2.0
MAX_INTERVAL_MINUTES = 259200                      // 180 days
```

### No Migration

Existing users reset progress. No migration logic needed.

## Files Affected

| File | Change |
|------|--------|
| `src/types.ts` | Add `learningStep` to `SrsData`, update `DEFAULT_SRS_DATA` |
| `src/srs.ts` | Rewrite `calculateNextReview` for learning/graduated phases, minutes, response time |
| `src/srs.test.ts` | Rewrite tests for new algorithm |
| `src/card-generator.ts` | `createSrsData` returns `learningStep: 0` |
| `src/review-service.ts` | Pass response time through to SRS |
| `src/review-service.test.ts` | Update tests for new intervals |
| `src/pages/ReviewPage.tsx` | Track and pass `responseTimeMs` |
| `src/components/Flashcard.tsx` | Track time from reveal to rating |
| `src/components/MultipleChoice.tsx` | Track time from display to answer |

## Expected Interval Progression (Good answers)

| Review | Phase | Interval |
|--------|-------|----------|
| 1 | Learning step 0→1 | 10 minutes |
| 2 | Learning step 1→2 | 1 hour |
| 3 | Learning step 2→3 | 8 hours |
| 4 | Learning step 3→4 | 1 day |
| 5 | Graduates | 3 days |
| 6 | SM-2 | 6 days (3d × 2.0) |
| 7 | SM-2 | 12 days |
| 8 | SM-2 | 24 days |
| 9 | SM-2 | 48 days |
| 10 | SM-2 | 96 days |
