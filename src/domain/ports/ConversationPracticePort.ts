import type {
	ConversationJudgeResult,
	ConversationNextResult,
	ConversationSessionStartResult,
} from "../conversation/types";

/**
 * The conversation practice backend, as the domain sees it: start a
 * multi-turn session, advance through it, judge each spoken reply.
 *
 * Phase 1/2's single-exchange methods (`getOpening`, a session-less
 * `judgeReply`) are retired here (task 3.3) — their backend routes are
 * retired in the same phase (task 3.1), and this app has exactly one
 * consumer of this port, so there is no reason to keep two ways to start a
 * conversation live at once.
 *
 * No method rejects — an unreachable or failing backend arrives as the
 * `"unavailable"` member of the relevant result union (see
 * `domain/conversation/types`).
 */
export interface ConversationPracticePort {
	/**
	 * `knownWords` is the learner's own known-vocabulary snapshot (every
	 * Thai word their SRS state counts as learned) — sent once, at session
	 * start, so the backend can scope every question in the session to it.
	 * An empty array is a real, valid state (a learner with nothing learned
	 * yet), never omitted.
	 */
	startSession(knownWords: string[]): Promise<ConversationSessionStartResult>;
	/** The session's next unasked question, or `"exhausted"` when the matched tier has none left. */
	next(sessionId: string): Promise<ConversationNextResult>;
	judgeReply(
		sessionId: string,
		questionText: string,
		replyAudio: Blob,
	): Promise<ConversationJudgeResult>;
}
