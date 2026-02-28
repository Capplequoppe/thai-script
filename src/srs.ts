import type { RecallRating, SrsData, SrsStage, StageCounts } from "./types";

// --- Constants ---

export const LEARNING_STEPS_MINUTES = [0, 10, 60, 480, 1440] as const;
export const GRADUATING_INTERVAL_MINUTES = 4320; // 3 days
export const DEFAULT_EASE_FACTOR = 2.0;
export const MAX_INTERVAL_MINUTES = 259200; // 180 days
export const MIN_EASE_FACTOR = 1.3;
export const MAX_EASE_FACTOR = 3.0;
export const MIN_GRADUATED_INTERVAL_MINUTES = 1440; // 1 day floor for hard

// SRS Stage thresholds (in minutes)
export const GURU_THRESHOLD_MINUTES = 20_160; // 14 days
export const MASTER_THRESHOLD_MINUTES = 60_480; // 42 days
export const ENLIGHTENED_THRESHOLD_MINUTES = 120_960; // 84 days

const LAST_LEARNING_STEP = LEARNING_STEPS_MINUTES.length - 1;

// --- Types ---

export interface ResponseTimingData {
	responseTimeMs: number;
	averageResponseTimeMs: number;
}

// --- Public API ---

export function createSrsData(now?: string): SrsData {
	const currentTime = now ?? new Date().toISOString();
	return {
		easeFactor: DEFAULT_EASE_FACTOR,
		interval: LEARNING_STEPS_MINUTES[1],
		repetitions: 0,
		learningStep: 1,
		nextReviewDate: addMinutesToIso(currentTime, LEARNING_STEPS_MINUTES[1]),
		lastReviewDate: null,
		lapseCount: 0,
	};
}

export function getSrsStage(srs: SrsData): SrsStage {
	if (srs.learningStep !== null) return "Apprentice";
	if (srs.interval >= ENLIGHTENED_THRESHOLD_MINUTES) return "Burned";
	if (srs.interval >= MASTER_THRESHOLD_MINUTES) return "Enlightened";
	if (srs.interval >= GURU_THRESHOLD_MINUTES) return "Master";
	return "Guru";
}

export function isBurned(srs: SrsData): boolean {
	return srs.learningStep === null && srs.interval >= ENLIGHTENED_THRESHOLD_MINUTES;
}

export function getStageCounts(cards: SrsData[]): StageCounts {
	const counts: StageCounts = { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0 };
	for (const srs of cards) {
		const stage = getSrsStage(srs);
		switch (stage) {
			case "Apprentice": counts.apprentice++; break;
			case "Guru": counts.guru++; break;
			case "Master": counts.master++; break;
			case "Enlightened": counts.enlightened++; break;
			case "Burned": counts.burned++; break;
		}
	}
	return counts;
}

export function resurrectCard(srs: SrsData, now?: string): SrsData {
	const currentTime = now ?? new Date().toISOString();
	return {
		easeFactor: srs.easeFactor,
		interval: GRADUATING_INTERVAL_MINUTES,
		repetitions: srs.repetitions,
		learningStep: null,
		nextReviewDate: addMinutesToIso(currentTime, GRADUATING_INTERVAL_MINUTES),
		lastReviewDate: currentTime,
		lapseCount: srs.lapseCount,
	};
}

export function calculateNextReview(
	current: SrsData,
	rating: RecallRating,
	now: string,
	timing?: ResponseTimingData,
): SrsData {
	const isLearning = current.learningStep !== null;

	if (isLearning) {
		return handleLearningPhase(current, rating, now);
	}

	return handleGraduatedPhase(current, rating, now, timing);
}

export function isDue(srs: SrsData, now: string): boolean {
	if (isBurned(srs)) return false;
	return new Date(srs.nextReviewDate) <= new Date(now);
}

// --- Learning Phase ---

function handleLearningPhase(
	current: SrsData,
	rating: RecallRating,
	now: string,
): SrsData {
	const step = current.learningStep as number;
	let newStep: number;

	switch (rating) {
		case 1: // Again
			newStep = 0;
			break;
		case 2: // Wrong
			newStep = 1;
			break;
		case 3: // Hard — repeat current step
			newStep = step;
			break;
		case 4: // Good — advance one step
			newStep = step + 1;
			break;
		case 5: // Easy — skip one step
			newStep = step + 2;
			break;
	}

	// Graduate if past last step
	if (newStep > LAST_LEARNING_STEP) {
		return graduate(current, now);
	}

	const interval = LEARNING_STEPS_MINUTES[newStep];
	return {
		easeFactor: current.easeFactor,
		interval,
		repetitions: current.repetitions + 1,
		learningStep: newStep,
		nextReviewDate: interval === 0 ? now : addMinutesToIso(now, interval),
		lastReviewDate: now,
		lapseCount: current.lapseCount,
	};
}

function graduate(current: SrsData, now: string): SrsData {
	return {
		easeFactor: current.easeFactor,
		interval: GRADUATING_INTERVAL_MINUTES,
		repetitions: current.repetitions + 1,
		learningStep: null,
		nextReviewDate: addMinutesToIso(now, GRADUATING_INTERVAL_MINUTES),
		lastReviewDate: now,
		lapseCount: current.lapseCount,
	};
}

// --- Graduated Phase ---

function handleGraduatedPhase(
	current: SrsData,
	rating: RecallRating,
	now: string,
	timing?: ResponseTimingData,
): SrsData {
	let newEf = current.easeFactor;
	let newInterval: number;
	const newLearningStep: number | null = null;

	switch (rating) {
		case 1: {
			// Again — lapse to step 0
			newEf = clampEase(current.easeFactor - 0.3);
			return {
				easeFactor: newEf,
				interval: 0,
				repetitions: current.repetitions + 1,
				learningStep: 0,
				nextReviewDate: now,
				lastReviewDate: now,
				lapseCount: (current.lapseCount ?? 0) + 1,
			};
		}
		case 2: {
			// Wrong — lapse to step 1
			newEf = clampEase(current.easeFactor - 0.2);
			return {
				easeFactor: newEf,
				interval: 10,
				repetitions: current.repetitions + 1,
				learningStep: 1,
				nextReviewDate: addMinutesToIso(now, 10),
				lastReviewDate: now,
				lapseCount: (current.lapseCount ?? 0) + 1,
			};
		}
		case 3: {
			// Hard
			newEf = clampEase(current.easeFactor - 0.15);
			newInterval = Math.max(
				MIN_GRADUATED_INTERVAL_MINUTES,
				Math.round(current.interval / 2),
			);
			break;
		}
		case 4: {
			// Good
			newInterval = Math.round(current.interval * current.easeFactor);
			break;
		}
		case 5: {
			// Easy
			newEf = clampEase(current.easeFactor + 0.15);
			newInterval = Math.round(
				current.interval * current.easeFactor * 1.3,
			);
			break;
		}
	}

	// Apply response time modulation for ratings 3-5
	if (timing) {
		newInterval = applyTimingModulation(newInterval, timing);
	}

	// Cap interval
	newInterval = Math.min(newInterval, MAX_INTERVAL_MINUTES);

	return {
		easeFactor: newEf,
		interval: newInterval,
		repetitions: current.repetitions + 1,
		learningStep: newLearningStep,
		nextReviewDate: addMinutesToIso(now, newInterval),
		lastReviewDate: now,
		lapseCount: current.lapseCount,
	};
}

// --- Helpers ---

function clampEase(ef: number): number {
	return Math.max(MIN_EASE_FACTOR, Math.min(MAX_EASE_FACTOR, ef));
}

function applyTimingModulation(
	interval: number,
	timing: ResponseTimingData,
): number {
	const ratio = timing.responseTimeMs / timing.averageResponseTimeMs;

	if (ratio < 0.7) {
		return Math.round(interval * 1.1);
	}
	if (ratio > 2.0) {
		return Math.round(interval * 0.7);
	}
	if (ratio > 1.3) {
		return Math.round(interval * 0.85);
	}
	return interval;
}

function addMinutesToIso(iso: string, minutes: number): string {
	const d = new Date(iso);
	return new Date(d.getTime() + minutes * 60_000).toISOString();
}
