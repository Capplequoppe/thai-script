import type { SrsData, RecallRating } from "./types";

const MIN_EASE_FACTOR = 1.3;

export function createSrsData(now?: string): SrsData {
  return {
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: now ?? new Date().toISOString(),
    lastReviewDate: null,
  };
}

export function calculateNextReview(
  current: SrsData,
  rating: RecallRating,
  now: string
): SrsData {
  const ef = current.easeFactor;
  let newEf = ef;
  let newInterval: number;
  let newReps: number;

  switch (rating) {
    case 1: // Blackout — review again immediately
      newReps = 0;
      newInterval = 0;
      newEf = Math.max(MIN_EASE_FACTOR, ef - 0.3);
      break;

    case 2: // Wrong — review tomorrow
      newReps = 0;
      newInterval = 1;
      newEf = Math.max(MIN_EASE_FACTOR, ef - 0.2);
      break;

    case 3: // Hard — keep going but slow
      newReps = current.repetitions + 1;
      newEf = Math.max(MIN_EASE_FACTOR, ef - 0.15);
      if (current.repetitions === 0) {
        newInterval = 1;
      } else if (current.repetitions === 1) {
        newInterval = 3;
      } else {
        newInterval = Math.round(current.interval * newEf * 0.8);
      }
      break;

    case 4: // Good — standard SM-2
      newReps = current.repetitions + 1;
      newEf = ef;
      if (current.repetitions === 0) {
        newInterval = 1;
      } else if (current.repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(current.interval * ef);
      }
      break;

    case 5: // Easy — bonus
      newReps = current.repetitions + 1;
      newEf = Math.min(3.0, ef + 0.15);
      if (current.repetitions === 0) {
        newInterval = 2;
      } else if (current.repetitions === 1) {
        newInterval = 7;
      } else {
        newInterval = Math.round(current.interval * ef * 1.3);
      }
      break;
  }

  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + newInterval);

  return {
    easeFactor: newEf,
    interval: newInterval,
    repetitions: newReps,
    nextReviewDate: newInterval === 0 ? now : nextDate.toISOString(),
    lastReviewDate: now,
  };
}

export function isDue(srs: SrsData, now: string): boolean {
  return new Date(srs.nextReviewDate) <= new Date(now);
}
