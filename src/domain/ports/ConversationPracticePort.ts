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
	getOpening(): Promise<ConversationOpeningResult>;
	judgeReply(
		questionText: string,
		replyAudio: Blob,
	): Promise<ConversationJudgeResult>;
}
