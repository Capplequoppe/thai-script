// Shared fade schedule for multi-sensory learning scaffolding (consonant
// class color, tone contour icons, …), keyed to the app's existing SRS
// stage names. Scaffolding should train recognition early, then get out of
// the way as a word is mastered — otherwise the visual aids never come off
// and a learner never transfers to reading unmarked real Thai text.
export type ScaffoldLevel = "full" | "fading" | "none";

const LEVEL_BY_STAGE: Record<string, ScaffoldLevel> = {
	Apprentice: "full",
	Guru: "full",
	Master: "full",
	Enlightened: "fading",
	Burned: "none",
};

/** No stage (e.g. a word not yet reviewed) gets full scaffolding — a new word deserves full support. */
export function scaffoldLevel(stageName?: string | null): ScaffoldLevel {
	if (!stageName) return "full";
	return LEVEL_BY_STAGE[stageName] ?? "full";
}
