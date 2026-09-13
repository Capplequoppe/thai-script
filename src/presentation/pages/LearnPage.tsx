import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/presentation/components/ui/button";
import {
	checkConversationUnlock,
	MIN_GRAMMAR_POINTS,
	MIN_VOCAB_COUNT,
} from "../../domain/conversation/services/ConversationUnlockService";
import { SectionHeader } from "../components/atoms/SectionHeader";
import { useApp } from "../hooks/useApp";

/**
 * One thing the learner can go and do. `locked` carries its own reason —
 * every gated surface in this app names a number rather than saying a bare
 * "locked", and the hub is where a learner comes to ask "why can't I?".
 */
interface Lane {
	key: string;
	label: string;
	to: string;
	accentColor: string;
	/** Left-hand summary: what is waiting, or why nothing is. */
	detail: string;
	/** Due-review count for this pool, shown as a pill. */
	due?: number;
	/** New, never-seen content ready to learn. Drives the "New" pill. */
	fresh?: number;
	locked?: string;
}

function LaneRow({ lane }: { lane: Lane }) {
	const navigate = useNavigate();
	const locked = Boolean(lane.locked);

	return (
		<button
			type="button"
			disabled={locked}
			onClick={() => navigate(lane.to)}
			className="w-full flex items-center justify-between gap-3 rounded-xl p-4 text-left transition-colors"
			style={{
				background: locked
					? "var(--color-surface-2)"
					: `color-mix(in srgb, ${lane.accentColor} 10%, var(--color-surface))`,
				border: locked
					? "1px solid var(--color-border)"
					: `1px solid color-mix(in srgb, ${lane.accentColor} 25%, transparent)`,
				opacity: locked ? 0.6 : 1,
				cursor: locked ? "default" : "pointer",
			}}
		>
			<div className="min-w-0">
				<div className="font-semibold text-sm">{lane.label}</div>
				<div
					className="text-xs mt-0.5"
					style={{ color: "var(--color-text-muted)" }}
				>
					{lane.locked ?? lane.detail}
				</div>
			</div>
			{!locked && (
				<div className="flex items-center gap-2 shrink-0">
					{lane.fresh !== undefined && lane.fresh > 0 && (
						<span
							className="text-[11px] font-bold px-2 py-1 rounded-full"
							style={{ background: lane.accentColor, color: "#fff" }}
						>
							{lane.fresh} new
						</span>
					)}
					{lane.due !== undefined && lane.due > 0 && (
						<span
							className="text-[11px] font-bold px-2 py-1 rounded-full"
							style={{
								background: "var(--color-apprentice)",
								color: "#fff",
							}}
						>
							{lane.due} due
						</span>
					)}
				</div>
			)}
		</button>
	);
}

export function LearnPage() {
	const { state, lesson, review, vocab } = useApp();
	const navigate = useNavigate();

	// Every one of these reads learner state back out of storage and rebuilds
	// card entities, so they are computed once per state rather than once per
	// render — the same reason `Layout` and `Dashboard` memoize on `state`.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `state` is deliberately the cache key; it is the identity that changes when the stored learner state does, which is what these repository reads depend on
	const d = useMemo(() => {
		const vocabUnlocked = lesson.getVocabUnlockedCount();
		return {
			nextScript: lesson.getNextScript(),
			scriptDue: review.getDueCount("script"),
			vocabUnlocked,
			vocabLearned: lesson.getVocabLearnedCount(),
			vocabDue: review.getDueCount("vocab"),
			nextVocab: vocabUnlocked > 0 ? vocab.getNextLesson() : null,
			grammarUnlocked: lesson.getGrammarUnlockedCount(),
			grammarLearned: lesson.getGrammarLearnedCount(),
			grammarDue: review.getDueCount("grammar"),
			nextGrammar: lesson.getNextGrammar(),
			sentenceUnlocked: lesson.getSentenceUnlockedCount(),
			sentenceLearned: lesson.getSentenceLearnedCount(),
			sentenceDue: review.getDueCount("sentence"),
			nextSentence: lesson.getNextSentence(),
			knownWords: vocab.getLearnedCount(),
		};
	}, [state, lesson, review, vocab]);

	const totalDue = d.scriptDue + d.vocabDue + d.grammarDue + d.sentenceDue;

	const conversation = checkConversationUnlock(d.knownWords, d.grammarLearned);

	const lessons: Lane[] = [
		{
			key: "script",
			label: "Script",
			to: d.nextScript ? `/lesson/${d.nextScript}` : "/items",
			accentColor: "var(--color-primary)",
			detail: d.nextScript
				? `Lesson ${d.nextScript} ready`
				: "Every lesson complete — browse what you've learned",
			due: d.scriptDue,
		},
		{
			key: "vocab",
			label: "Vocabulary",
			to: "/vocabulary",
			accentColor: "var(--color-enlightened)",
			detail: `${d.vocabLearned} learned of ${d.vocabUnlocked} unlocked`,
			due: d.vocabDue,
			fresh: d.nextVocab?.words.length,
			locked:
				d.vocabUnlocked === 0
					? "Complete script lessons to unlock words"
					: undefined,
		},
		{
			key: "grammar",
			label: "Grammar",
			to: "/grammar",
			accentColor: "var(--color-guru)",
			detail: `${d.grammarLearned} learned of ${d.grammarUnlocked} unlocked`,
			due: d.grammarDue,
			fresh: d.nextGrammar?.grammarPoints.length,
			locked:
				d.grammarUnlocked === 0
					? "Master more vocabulary to unlock grammar"
					: undefined,
		},
		{
			key: "sentence",
			label: "Sentences",
			to: "/sentences",
			accentColor: "var(--color-master)",
			detail: `${d.sentenceLearned} learned of ${d.sentenceUnlocked} unlocked`,
			due: d.sentenceDue,
			fresh: d.nextSentence?.sentences.length,
			locked:
				d.sentenceUnlocked === 0
					? "Master more vocabulary to unlock sentences"
					: undefined,
		},
	];

	const practice: Lane[] = [
		{
			key: "conversation",
			label: "Conversation Practice",
			to: "/conversation",
			accentColor: "var(--color-accent)",
			detail: "Speak with a partner that answers back",
			locked: conversation.unlocked
				? undefined
				: conversation.vocabNeeded > 0
					? `${d.knownWords}/${MIN_VOCAB_COUNT} words learned`
					: `${d.grammarLearned}/${MIN_GRAMMAR_POINTS} grammar points learned`,
		},
		{
			key: "game",
			label: "Game",
			to: "/game",
			accentColor: "var(--color-guru)",
			detail: "A quick practice round, no SRS effect",
		},
	];

	return (
		<div className="space-y-6 py-4">
			<h1 className="text-2xl font-bold">Learn</h1>

			{/* Reviews cut across every pool, so they lead rather than sitting in
			    a lane of their own — the same call the Dashboard's primary action
			    card makes. */}
			{totalDue > 0 && (
				<Button
					type="button"
					size="lg"
					className="w-full"
					onClick={() => navigate("/review")}
				>
					Review {totalDue} Due Card{totalDue === 1 ? "" : "s"}
				</Button>
			)}

			<div className="space-y-3">
				<SectionHeader className="mb-1">Lessons</SectionHeader>
				{lessons.map((lane) => (
					<LaneRow key={lane.key} lane={lane} />
				))}
			</div>

			<div className="space-y-3">
				<SectionHeader className="mb-1">Practice</SectionHeader>
				{practice.map((lane) => (
					<LaneRow key={lane.key} lane={lane} />
				))}
			</div>
		</div>
	);
}
