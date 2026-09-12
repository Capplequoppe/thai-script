/**
 * Result types for conversation practice.
 *
 * Every non-success outcome — the backend not running, a non-2xx response,
 * a request that never settles — collapses into the single `"unavailable"`
 * member. The caller only ever needs to know *that* the backend isn't
 * answering, not *why*; a richer error type would be unused detail carried
 * through every future consumer of the port.
 *
 * "Unavailable" is a member of the union rather than a thrown error on
 * purpose: encoding it in the type makes the compiler force every caller to
 * handle it, so "never asked" and "asked and failed" can't quietly become
 * indistinguishable the way they do when a caller forgets a try/catch.
 */

/**
 * Starting a session: the AI partner's first turn, plus the session id every
 * later call in this session must carry.
 */
export type ConversationSessionStartResult =
	| {
			status: "ok";
			sessionId: string;
			questionText: string;
			questionAudioUrl: string;
	  }
	| { status: "unavailable" };

/**
 * Advancing to the next question in an already-started session.
 * `"exhausted"` is a named state, not an error: the matched tier had no
 * unasked entry left, which is a normal, expected end to a session (task
 * 3.1) — distinct from the backend simply not answering.
 */
export type ConversationNextResult =
	| { status: "ok"; questionText: string; questionAudioUrl: string }
	| { status: "exhausted" }
	| { status: "unavailable" };

/**
 * A judgement of one spoken reply.
 *
 * `"unscored"` is a *system-side* failure (unparseable judge output, a
 * transcription error) — never a learner's wrong answer, so a backend
 * hiccup is never rendered as, or later tallied as, the learner's mistake.
 */
export type ConversationVerdict = "pass" | "fail" | "unscored";

export type ConversationJudgeResult =
	| {
			status: "ok";
			transcript: string;
			verdict: ConversationVerdict;
			feedbackEn: string;
	  }
	| { status: "unavailable" };
