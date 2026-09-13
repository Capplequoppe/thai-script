import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import {
	checkConversationUnlock,
	MIN_GRAMMAR_POINTS,
	MIN_VOCAB_COUNT,
} from "../../domain/conversation/services/ConversationUnlockService";
import type {
	ConversationJudgeResult,
	ConversationVerdict,
} from "../../domain/conversation/types";
import type { VocabularyService } from "../../domain/vocabulary/services/VocabularyLessonService";
import { useApp } from "../hooks/useApp";
import { useMicRecorder } from "../hooks/useMicRecorder";

/**
 * How each verdict reads. `"unscored"` is deliberately neither of the other
 * two: it is the backend admitting it could not judge the turn, so showing
 * it as a fail would blame the learner for a system fault, and showing it as
 * a pass would be a lie.
 */
const VERDICT_PRESENTATION: Record<
	ConversationVerdict,
	{ label: string; note: string; color: string }
> = {
	pass: {
		label: "Good answer",
		note: "That works as a reply.",
		color: "var(--color-success, #15803d)",
	},
	fail: {
		label: "Not quite",
		note: "That does not answer the question yet — try again.",
		color: "var(--color-danger, #b91c1c)",
	},
	unscored: {
		label: "Could not be scored",
		note: "Something went wrong on the backend, so this turn was not judged. It does not count against you.",
		color: "var(--color-text-muted, #6b7280)",
	},
};

const BACKEND_UNAVAILABLE_MESSAGE =
	"The conversation backend is not running, so there is nothing to talk to yet. Start it locally and reload this page.";

/**
 * The learner's known-word snapshot sent with the opening request — never a
 * placeholder, and a real empty array (not an omitted field) when nothing is
 * learned yet. Extracted so this mapping stays unit-testable independent of
 * the unlock gate, which makes the zero-known-words case unreachable through
 * a real render once a learner is actually below `MIN_VOCAB_COUNT` (a
 * positive count is required to unlock the page in the first place).
 */
export function knownWordsFor(
	vocab: Pick<VocabularyService, "getLearnedEntries">,
): string[] {
	return vocab.getLearnedEntries().map((entry) => entry.thai);
}

interface SessionQuestion {
	sessionId: string;
	questionText: string;
	questionAudioUrl: string;
}

/** Pass/fail/unscored, kept as three separate counts (never collapsed). */
interface Tally {
	passed: number;
	failed: number;
	unscored: number;
}

const EMPTY_TALLY: Tally = { passed: 0, failed: 0, unscored: 0 };

function tallyTotal(tally: Tally): number {
	return tally.passed + tally.failed + tally.unscored;
}

function tallyAfter(tally: Tally, verdict: ConversationVerdict): Tally {
	return {
		passed: tally.passed + (verdict === "pass" ? 1 : 0),
		failed: tally.failed + (verdict === "fail" ? 1 : 0),
		unscored: tally.unscored + (verdict === "unscored" ? 1 : 0),
	};
}

/** e.g. "2 passed / 3 asked, 1 unscored" — always names all three components. */
function tallySummary(tally: Tally): string {
	const base = `${tally.passed} passed / ${tallyTotal(tally)} asked`;
	return tally.unscored > 0 ? `${base}, ${tally.unscored} unscored` : base;
}

type Phase =
	| { kind: "loading" }
	| { kind: "unavailable" }
	| { kind: "active"; question: SessionQuestion }
	| { kind: "summary" };

/**
 * Spoken conversation practice: a multi-turn session against the real
 * backend — hear a question, record a reply, see whether it was judged an
 * acceptable answer, then automatically move to the next question until the
 * bank's matched tier runs out.
 *
 * There is deliberately no self-rating, no SRS card and no history entry: a
 * judge verdict is a different kind of signal from a recall rating, and how
 * it should feed the scheduler, if at all, is not this task's call to make
 * (see the Architectural Decision in this task's plan document).
 */
export function ConversationPracticePage() {
	const { conversationPractice, vocab, lesson } = useApp();
	const unlock = checkConversationUnlock(
		vocab.getLearnedCount(),
		lesson.getGrammarLearnedCount(),
	);
	const [phase, setPhase] = useState<Phase>({ kind: "loading" });
	const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
	const [judging, setJudging] = useState(false);
	const [lastJudgement, setLastJudgement] =
		useState<ConversationJudgeResult | null>(null);
	const { state, audioBlob, start, stop, reset } = useMicRecorder();
	const audioRef = useRef<HTMLAudioElement | null>(null);
	// The currently-live question's blob URL, so the previous one can be
	// revoked the moment a new one replaces it — a multi-turn session
	// creates one blob per question, and none of them are otherwise ever
	// released for the session's lifetime (AC4).
	const activeAudioUrlRef = useRef<string | null>(null);

	const setActiveQuestion = useCallback((question: SessionQuestion) => {
		if (
			activeAudioUrlRef.current &&
			activeAudioUrlRef.current !== question.questionAudioUrl
		) {
			URL.revokeObjectURL(activeAudioUrlRef.current);
		}
		activeAudioUrlRef.current = question.questionAudioUrl;
		setPhase({ kind: "active", question });
	}, []);

	useEffect(
		() => () => {
			if (activeAudioUrlRef.current) {
				URL.revokeObjectURL(activeAudioUrlRef.current);
				activeAudioUrlRef.current = null;
			}
		},
		[],
	);

	// Starts the session once, only for an unlocked learner — the gate is
	// enforced here too, not only by hiding the Dashboard tile (task 3.2
	// AC6/AC7): a learner who navigates here directly while below threshold
	// must never reach the backend at all.
	useEffect(() => {
		if (!unlock.unlocked) return;
		let cancelled = false;
		conversationPractice.startSession(knownWordsFor(vocab)).then((result) => {
			if (cancelled) return;
			if (result.status === "unavailable") {
				setPhase({ kind: "unavailable" });
				return;
			}
			setActiveQuestion({
				sessionId: result.sessionId,
				questionText: result.questionText,
				questionAudioUrl: result.questionAudioUrl,
			});
		});
		return () => {
			cancelled = true;
		};
	}, [conversationPractice, vocab, unlock.unlocked, setActiveQuestion]);

	const activeQuestion = phase.kind === "active" ? phase.question : null;

	// One finished take → judge it, then automatically advance (AC1) —
	// never a manual "next" step. Keyed on the blob's identity, so a
	// re-render never re-submits the same recording.
	useEffect(() => {
		if (state !== "stopped" || !audioBlob || !activeQuestion) return;
		const { sessionId, questionText } = activeQuestion;
		let cancelled = false;
		setJudging(true);
		conversationPractice
			.judgeReply(sessionId, questionText, audioBlob)
			.then(async (judgement) => {
				if (cancelled) return;
				if (judgement.status === "unavailable") {
					setJudging(false);
					setPhase({ kind: "unavailable" });
					return;
				}
				setLastJudgement(judgement);
				setTally((t) => tallyAfter(t, judgement.verdict));

				const nextResult = await conversationPractice.next(sessionId);
				if (cancelled) return;
				setJudging(false);
				reset();
				if (nextResult.status === "unavailable") {
					setPhase({ kind: "unavailable" });
				} else if (nextResult.status === "exhausted") {
					setPhase({ kind: "summary" });
				} else {
					setActiveQuestion({
						sessionId,
						questionText: nextResult.questionText,
						questionAudioUrl: nextResult.questionAudioUrl,
					});
				}
			});
		return () => {
			cancelled = true;
		};
	}, [
		state,
		audioBlob,
		activeQuestion,
		conversationPractice,
		reset,
		setActiveQuestion,
	]);

	// Same replay convention as SentenceListeningChallenge /
	// SymbolDictationChallenge: a fresh `Audio` per press, the previous one
	// stopped first, rejections swallowed (autoplay policy).
	const playQuestion = useCallback(() => {
		if (!activeQuestion) return;
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		const audio = new Audio(activeQuestion.questionAudioUrl);
		audioRef.current = audio;
		audio.play().catch(() => {});
	}, [activeQuestion]);

	useEffect(
		() => () => {
			audioRef.current?.pause();
			audioRef.current = null;
		},
		[],
	);

	// The actual security/product boundary (task 3.2's Architectural
	// Decision) — the Dashboard tile hiding the entry point is only a
	// discoverability affordance on top of this. A learner who types the
	// URL directly while below threshold sees this, never the live
	// recording UI, and nothing above has called the backend to get here.
	if (!unlock.unlocked) {
		return (
			<div className="space-y-4 p-4">
				<h1 className="text-xl font-semibold">Conversation practice</h1>
				<p role="alert">
					Conversation practice unlocks once you know at least {MIN_VOCAB_COUNT}{" "}
					words and {MIN_GRAMMAR_POINTS} grammar points.
					{unlock.vocabNeeded > 0 &&
						` ${unlock.vocabNeeded} more word${unlock.vocabNeeded === 1 ? "" : "s"} needed.`}
					{unlock.grammarNeeded > 0 &&
						` ${unlock.grammarNeeded} more grammar point${unlock.grammarNeeded === 1 ? "" : "s"} needed.`}
				</p>
			</div>
		);
	}

	if (phase.kind === "loading") {
		return <p className="p-4">Connecting to the conversation backend…</p>;
	}

	// No question means nothing to reply to — so no record control at all,
	// rather than one that would silently do nothing. The tally so far stays
	// visible: a learner who got through three questions before the backend
	// dropped should still see it, not nothing (AC3).
	if (phase.kind === "unavailable") {
		return (
			<div className="space-y-4 p-4">
				<h1 className="text-xl font-semibold">Conversation practice</h1>
				{tallyTotal(tally) > 0 && (
					<output>{tallySummary(tally)} so far.</output>
				)}
				<p role="alert">{BACKEND_UNAVAILABLE_MESSAGE}</p>
			</div>
		);
	}

	if (phase.kind === "summary") {
		return (
			<div className="space-y-4 p-4">
				<h1 className="text-xl font-semibold">Conversation practice</h1>
				<output>{tallySummary(tally)}.</output>
			</div>
		);
	}

	const { questionText } = phase.question;

	return (
		<div className="space-y-6 p-4">
			<h1 className="text-xl font-semibold">Conversation practice</h1>

			{tallyTotal(tally) > 0 && <p>{tallySummary(tally)} so far.</p>}

			<section className="space-y-3 text-center">
				<p className="text-3xl" lang="th">
					{questionText}
				</p>
				<button
					type="button"
					onClick={playQuestion}
					aria-label="Play question"
					className="inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl"
					style={{
						background: "var(--color-surface-2)",
						color: "var(--color-primary)",
					}}
				>
					🔊
				</button>
			</section>

			<section className="space-y-3">
				{state === "idle" && !judging && (
					<Button onClick={start}>Record your reply</Button>
				)}
				{state === "recording" && (
					<Button onClick={stop}>Stop recording</Button>
				)}
				{state === "denied" && (
					<p role="alert">
						Microphone access needed — allow the microphone in your browser,
						then try recording again.
					</p>
				)}
				{state === "error" && (
					<p role="alert">
						Your microphone could not be started. Check that a recording device
						is connected and try again.
					</p>
				)}
				{judging && <p>Judging your reply…</p>}
				{!judging && lastJudgement?.status === "ok" && (
					<div className="space-y-1">
						<p
							style={{
								color: VERDICT_PRESENTATION[lastJudgement.verdict].color,
							}}
						>
							<strong>
								{VERDICT_PRESENTATION[lastJudgement.verdict].label}
							</strong>
						</p>
						<p>{VERDICT_PRESENTATION[lastJudgement.verdict].note}</p>
						<p>
							We heard: <span lang="th">{lastJudgement.transcript}</span>
						</p>
						<p>{lastJudgement.feedbackEn}</p>
					</div>
				)}
			</section>
		</div>
	);
}
