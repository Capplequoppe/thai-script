import type {
	ConversationJudgeResult,
	ConversationOpeningResult,
} from "../conversation/types";

/**
 * The conversation practice backend, as the domain sees it: ask for the
 * opening turn, submit a spoken reply, get it judged.
 *
 * Neither method rejects — an unreachable or failing backend arrives as the
 * `"unavailable"` member of the result union (see `domain/conversation/types`).
 */
export interface ConversationPracticePort {
	/**
	 * `knownWords` is the learner's own known-vocabulary snapshot (every
	 * Thai word their SRS state counts as learned) — sent fresh with every
	 * request so the backend can eventually scope the question to it (task
	 * 2.2/2.3). An empty array is a real, valid state (a learner with
	 * nothing learned yet), never omitted.
	 */
	getOpening(knownWords: string[]): Promise<ConversationOpeningResult>;
	judgeReply(
		questionText: string,
		replyAudio: Blob,
	): Promise<ConversationJudgeResult>;
}
