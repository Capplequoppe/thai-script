import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import type {
	ConversationJudgeResult,
	ConversationOpeningResult,
	ConversationVerdict,
} from "../../domain/conversation/types";
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
 * Spoken conversation practice: hear one Thai question, record a reply, see
 * whether the local backend judged it as an acceptable answer.
 *
 * Phase 1 asks exactly one hardcoded question — real, vocabulary-scoped
 * content is phase 2's job. There is deliberately no self-rating, no SRS
 * card and no history entry: a judge verdict is a different kind of signal
 * from a recall rating, and how it should feed the scheduler, if at all, is
 * not this task's call to make.
 */
export function ConversationPracticePage() {
	const { conversationPractice } = useApp();
	const [opening, setOpening] = useState<ConversationOpeningResult | null>(
		null,
	);
	const [judgement, setJudgement] = useState<ConversationJudgeResult | null>(
		null,
	);
	const [judging, setJudging] = useState(false);
	const { state, audioBlob, start, stop, reset } = useMicRecorder();
	const audioRef = useRef<HTMLAudioElement | null>(null);

	useEffect(() => {
		let cancelled = false;
		conversationPractice.getOpening().then((result) => {
			if (!cancelled) setOpening(result);
		});
		return () => {
			cancelled = true;
		};
	}, [conversationPractice]);

	const questionText = opening?.status === "ok" ? opening.questionText : null;
	const questionAudioUrl =
		opening?.status === "ok" ? opening.questionAudioUrl : null;

	// One finished take → one judgement. Keyed on the blob's identity, so a
	// re-render never re-submits the same recording.
	useEffect(() => {
		if (state !== "stopped" || !audioBlob || !questionText) return;
		let cancelled = false;
		setJudging(true);
		conversationPractice.judgeReply(questionText, audioBlob).then((result) => {
			if (cancelled) return;
			setJudgement(result);
			setJudging(false);
		});
		return () => {
			cancelled = true;
		};
	}, [state, audioBlob, questionText, conversationPractice]);

	// Same replay convention as SentenceListeningChallenge /
	// SymbolDictationChallenge: a fresh `Audio` per press, the previous one
	// stopped first, rejections swallowed (autoplay policy).
	const playQuestion = useCallback(() => {
		if (!questionAudioUrl) return;
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		const audio = new Audio(questionAudioUrl);
		audioRef.current = audio;
		audio.play().catch(() => {});
	}, [questionAudioUrl]);

	useEffect(
		() => () => {
			audioRef.current?.pause();
			audioRef.current = null;
		},
		[],
	);

	function tryAgain() {
		setJudgement(null);
		reset();
	}

	if (opening === null) {
		return <p className="p-4">Connecting to the conversation backend…</p>;
	}

	// No question means nothing to reply to — so no record control at all,
	// rather than one that would silently do nothing.
	if (opening.status === "unavailable") {
		return (
			<div className="space-y-4 p-4">
				<h1 className="text-xl font-semibold">Conversation practice</h1>
				<p role="alert">{BACKEND_UNAVAILABLE_MESSAGE}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-4">
			<h1 className="text-xl font-semibold">Conversation practice</h1>

			<section className="space-y-3 text-center">
				<p className="text-3xl" lang="th">
					{opening.questionText}
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
				{state === "idle" && <Button onClick={start}>Record your reply</Button>}
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
				{state === "stopped" && judging && <p>Judging your reply…</p>}
				{state === "stopped" && judgement?.status === "unavailable" && (
					<p role="alert">{BACKEND_UNAVAILABLE_MESSAGE}</p>
				)}
				{state === "stopped" && judgement?.status === "ok" && (
					<div className="space-y-1">
						<p style={{ color: VERDICT_PRESENTATION[judgement.verdict].color }}>
							<strong>{VERDICT_PRESENTATION[judgement.verdict].label}</strong>
						</p>
						<p>{VERDICT_PRESENTATION[judgement.verdict].note}</p>
						<p>
							We heard: <span lang="th">{judgement.transcript}</span>
						</p>
						<p>{judgement.feedbackEn}</p>
					</div>
				)}
				{state === "stopped" && !judging && (
					<Button onClick={tryAgain}>Record another reply</Button>
				)}
			</section>
		</div>
	);
}
