import type {
	AudibleMinimalPairOption,
	MinimalPairChallengeDirection,
	MinimalPairGameItem,
	MinimalPairOption,
	RandomSource,
} from "../types";
import type { EligibleMinimalPairGroup } from "./MinimalPairGameItemSource";
import { sampleWithoutReplacement } from "./sampling";

/**
 * Four choices at most. A tone contrast is a two-way discrimination at its
 * core, and Thai only has five tones, so a question is not made harder by
 * padding it past the point where the learner is choosing between things
 * they can actually confuse — it is made longer.
 */
const MAX_OPTIONS = 4;

/** The two exercises whose options are tone names or English meanings. */
const AUDIO_PROMPT_DIRECTIONS: readonly MinimalPairChallengeDirection[] = [
	"toneFromAudio",
	"meaningFromAudio",
];

/** The two exercises whose options are clips, so every option needs one. */
const AUDIO_OPTION_DIRECTIONS: readonly MinimalPairChallengeDirection[] = [
	"audioFromMeaning",
	"audioFromTone",
];

/**
 * One (group, target) pair that could be asked, with the two distractor
 * pools it could be asked from. Built before sampling and finalized after
 * it, mirroring `GameItemSelectionService.selectRound`'s own
 * sample-then-`assignDirection` order: a candidate that is never drawn must
 * not consume randomness, or adding a word to the learner's vocabulary
 * would silently re-roll every other item in the round.
 */
interface MinimalPairCandidate {
	readonly groupKey: string;
	readonly target: AudibleMinimalPairOption;
	readonly distractors: readonly MinimalPairOption[];
	readonly audibleDistractors: readonly AudibleMinimalPairOption[];
	readonly feasibleDirections: readonly MinimalPairChallengeDirection[];
}

/**
 * Builds a round of tone-pairs questions from the sound-alike groups
 * `MinimalPairGameItemSource.eligibleGroups()` found.
 *
 * A plain function over that array rather than a `GameItemSource`, for the
 * same reason `selectCompositionRound` is one: the interface promises
 * per-item card eligibility, and a sound-alike group is a set-level
 * computation over several words at once.
 *
 * Every question is asked about one **target** word, which must have audio
 * — all four exercises either play its clip or ask the learner to find it.
 * Which exercises a target can be asked in depends on its group-mates:
 *
 *  - answering with a tone name or an English meaning (`toneFromAudio`,
 *    `meaningFromAudio`) needs one sound-alike that contrasts with the
 *    target, recorded or not;
 *  - answering with a clip (`audioFromMeaning`, `audioFromTone`) needs one
 *    that *is* recorded.
 *
 * That split is deliberate, and it is why this mode works at all on the
 * shipped data: most vocabulary has no recording yet, so gating every
 * exercise on a fully-recorded group would leave almost nothing to play.
 * The mode gets richer on its own as `scripts/generate-vocab-audio.py`
 * fills clips in — no code here changes.
 *
 * The options of one question are always pairwise distinct in Thai
 * spelling, tone pattern *and* English meaning. Tone distinctness is what
 * makes `toneFromAudio` and `audioFromTone` single-answer questions;
 * meaning distinctness is what makes `meaningFromAudio` one, since
 * `vocabulary.json` glosses different words identically often enough to
 * matter (เรียน "learn"/"study"). Enforcing both for every direction costs
 * a distractor now and then and buys one grading rule — the drawn option
 * is right exactly when its `thaiWord` is the target's — instead of four.
 */
export function selectMinimalPairRound(
	groups: readonly EligibleMinimalPairGroup[],
	count: number,
	rng: RandomSource = Math.random,
): MinimalPairGameItem[] {
	const candidates = groups.flatMap(candidatesOf);
	const drawn = sampleWithoutReplacement(candidates, count, { rng });
	return drawn.map((candidate) => askCandidate(candidate, rng));
}

/**
 * One candidate per audible member of the group. A group with several
 * recorded members can be asked from each of them in turn — ไข่ against ไข้
 * and ไข้ against ไข่ are two different questions, and on a small learned
 * vocabulary they are the difference between a round of three items and a
 * round of ten.
 */
function candidatesOf(group: EligibleMinimalPairGroup): MinimalPairCandidate[] {
	const candidates: MinimalPairCandidate[] = [];

	for (const target of group.audibleMembers) {
		const distractors = contrastingWith(target, group.members);
		const audibleDistractors = contrastingWith(target, group.audibleMembers);

		const feasibleDirections = [
			...(distractors.length > 0 ? AUDIO_PROMPT_DIRECTIONS : []),
			...(audibleDistractors.length > 0 ? AUDIO_OPTION_DIRECTIONS : []),
		];
		if (feasibleDirections.length === 0) continue;

		candidates.push({
			groupKey: group.groupKey,
			target,
			distractors,
			audibleDistractors,
			feasibleDirections,
		});
	}

	return candidates;
}

/**
 * Picks one of the candidate's feasible directions and builds the question
 * for it. An even draw across whatever is feasible — never a fixed
 * preference order, which on a part-recorded group would mean the learner
 * only ever saw the two exercises that need no recorded distractors.
 */
function askCandidate(
	candidate: MinimalPairCandidate,
	rng: RandomSource,
): MinimalPairGameItem {
	const { target, groupKey } = candidate;
	const direction = pickOne(candidate.feasibleDirections, rng);
	const shared = {
		kind: "minimalPair",
		groupKey,
		thaiWord: target.thaiWord,
		englishMeaning: target.englishMeaning,
		tones: target.tones,
		audioUrl: target.audioUrl,
	} as const;

	if (direction === "audioFromMeaning" || direction === "audioFromTone") {
		return {
			...shared,
			challengeDirection: direction,
			options: distinctOptions(target, candidate.audibleDistractors, rng),
		};
	}

	return {
		...shared,
		challengeDirection: direction,
		options: distinctOptions(target, candidate.distractors, rng),
	};
}

/**
 * The target plus up to `MAX_OPTIONS - 1` distractors, all pairwise
 * distinct in tone pattern and English meaning, shuffled.
 *
 * The distractor pool is shuffled *before* the distinctness walk rather
 * than filtered in group order: in group order a four-member group would
 * show the same two distractors every time it came up, and the words a
 * learner never sees as a wrong answer are the ones they never learn to
 * rule out.
 */
function distinctOptions<T extends MinimalPairOption>(
	target: T,
	pool: readonly T[],
	rng: RandomSource,
): T[] {
	const chosen: T[] = [target];
	const tones = new Set([tonePatternOf(target)]);
	const meanings = new Set([target.englishMeaning]);

	for (const option of sampleWithoutReplacement(pool, pool.length, { rng })) {
		if (chosen.length >= MAX_OPTIONS) break;
		const tone = tonePatternOf(option);
		if (tones.has(tone) || meanings.has(option.englishMeaning)) continue;
		tones.add(tone);
		meanings.add(option.englishMeaning);
		chosen.push(option);
	}

	return sampleWithoutReplacement(chosen, chosen.length, { rng });
}

/**
 * The members that could stand as a wrong answer beside `target`: a
 * different word, saying a different thing, with a different tone pattern.
 * All three matter — a same-tone group-mate is not a tone question, and a
 * same-gloss one has no wrong answer to give.
 */
function contrastingWith<T extends MinimalPairOption>(
	target: MinimalPairOption,
	members: readonly T[],
): T[] {
	const targetTone = tonePatternOf(target);
	return members.filter(
		(member) =>
			member.thaiWord !== target.thaiWord &&
			member.englishMeaning !== target.englishMeaning &&
			tonePatternOf(member) !== targetTone,
	);
}

function tonePatternOf(option: MinimalPairOption): string {
	return option.tones.join("-");
}

/** `sampleWithoutReplacement` for a single draw from a non-empty list. */
function pickOne<T>(items: readonly T[], rng: RandomSource): T {
	return sampleWithoutReplacement(items, 1, { rng })[0] as T;
}
