import type {
	RecallRating,
	SrsData,
	SrsStage,
	StageCounts,
} from "./domain/shared/types";
import { RecallRating as RecallRatingVO } from "./domain/srs/value-objects/RecallRating";
import {
	type ResponseTimingData,
	SrsSchedule,
} from "./domain/srs/value-objects/SrsSchedule";
import { SrsStage as SrsStageVO } from "./domain/srs/value-objects/SrsStage";

export type { ResponseTimingData } from "./domain/srs/value-objects/SrsSchedule";

// --- Constants (kept for backward compatibility) ---

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

// --- Public API ---

export function createSrsData(now?: string): SrsData {
	return SrsSchedule.initial(now).toDTO();
}

export function calculateNextReview(
	current: SrsData,
	rating: RecallRating,
	now: string,
	timing?: ResponseTimingData,
): SrsData {
	return SrsSchedule.fromDTO(current)
		.applyReview(RecallRatingVO.fromRaw(rating), now, timing)
		.toDTO();
}

export function getSrsStage(srs: SrsData): SrsStage {
	return SrsStageVO.fromScheduleData(srs.learningStep, srs.interval)
		.name as SrsStage;
}

export function isDue(srs: SrsData, now: string): boolean {
	return SrsSchedule.fromDTO(srs).isDue(now);
}

export function isBurned(srs: SrsData): boolean {
	return SrsSchedule.fromDTO(srs).isBurned;
}

export function getStageCounts(cards: SrsData[]): StageCounts {
	const counts: StageCounts = {
		apprentice: 0,
		guru: 0,
		master: 0,
		enlightened: 0,
		burned: 0,
	};
	for (const srs of cards) {
		const stage = getSrsStage(srs);
		switch (stage) {
			case "Apprentice":
				counts.apprentice++;
				break;
			case "Guru":
				counts.guru++;
				break;
			case "Master":
				counts.master++;
				break;
			case "Enlightened":
				counts.enlightened++;
				break;
			case "Burned":
				counts.burned++;
				break;
		}
	}
	return counts;
}

export function resurrectCard(srs: SrsData, now?: string): SrsData {
	return SrsSchedule.fromDTO(srs).resurrect(now).toDTO();
}
