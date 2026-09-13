import {
	type CSSProperties,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type {
	MinimalPairGameItem,
	MinimalPairOption,
} from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";
import { useResetOnCardChange } from "../../hooks/useResetOnCardChange";

interface Props {
	item: MinimalPairGameItem;
	onRate: (rating: RecallRating) => void;
}

/**
 * How an auto-graded answer enters the round's ratings.
 *
 * `4` and `2` rather than `5` and `1`: `PlayGameUseCase.finishRound` counts
 * 4 and 5 as correct, so a right answer has to land in that pair, and the
 * two extremes carry claims this exercise never observes. "Easy" is about
 * how effortless the recall felt and "Again" is a request to see the item
 * again soon; a multiple choice knows neither. "Good" and "Wrong" say
 * exactly what happened and nothing more, which keeps the round summary's
 * rating histogram honest — it reads as the correct/incorrect split it
 * actually is.
 */
export const CORRECT_RATING: RecallRating = 4;
export const INCORRECT_RATING: RecallRating = 2;

const THAI_NUMERALS = ["๑", "๒", "๓", "๔"] as const;

/** "low" + "falling" → "Low · Falling". */
function toneLabel(tones: readonly string[]): string {
	return tones
		.map((tone) => tone.charAt(0).toUpperCase() + tone.slice(1))
		.join(" · ");
}

/**
 * The two exercises that play the target on arrival, as opposed to the two
 * that hide it among the options. Autoplaying `audioFromMeaning` or
 * `audioFromTone` would be playing the answer.
 */
function autoplaysTarget(item: MinimalPairGameItem): boolean {
	return (
		item.challengeDirection === "toneFromAudio" ||
		item.challengeDirection === "meaningFromAudio"
	);
}

function play(url: string): void {
	new Audio(url).play().catch(() => {});
}

function PlayClipButton({
	audioUrl,
	label,
	big = false,
}: {
	audioUrl: string;
	label: string;
	big?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={() => play(audioUrl)}
			className={`inline-flex items-center justify-center rounded-full transition-colors ${
				big ? "w-16 h-16 text-3xl" : "w-11 h-11 text-xl"
			}`}
			style={{
				background: "var(--color-surface-2)",
				color: "var(--color-primary)",
			}}
			aria-label={label}
		>
			🔊
		</button>
	);
}

/**
 * The question, above the options. Four one-liners rather than four
 * components: the exercises differ only in which field of the same item is
 * the prompt.
 */
function Prompt({ item }: { item: MinimalPairGameItem }) {
	const instruction =
		item.challengeDirection === "toneFromAudio"
			? "Which tones do you hear?"
			: item.challengeDirection === "meaningFromAudio"
				? "What does this mean?"
				: item.challengeDirection === "audioFromMeaning"
					? "Which one means this?"
					: "Which one has these tones?";

	return (
		<div
			className="rounded-xl p-4 space-y-4"
			style={{
				border: "1px solid var(--color-border)",
				background: "var(--color-surface)",
			}}
		>
			<p
				className="text-center text-lg"
				style={{ color: "var(--color-text-muted)" }}
			>
				{instruction}
			</p>

			{autoplaysTarget(item) ? (
				<div className="flex justify-center py-2">
					<PlayClipButton
						audioUrl={item.audioUrl}
						label="Replay the word"
						big
					/>
				</div>
			) : (
				<p
					className="text-center font-bold py-2"
					style={{
						color: "var(--color-text)",
						fontSize:
							item.challengeDirection === "audioFromMeaning"
								? "2rem"
								: "1.75rem",
					}}
				>
					{item.challengeDirection === "audioFromMeaning"
						? item.englishMeaning
						: toneLabel(item.tones)}
				</p>
			)}
		</div>
	);
}

/**
 * What one option says before it is answered. An audio-answer exercise
 * shows nothing but a clip — showing the Thai spelling beside it would
 * turn a listening question into a reading one, which is the whole thing
 * this mode exists to avoid.
 */
function optionFace(
	item: MinimalPairGameItem,
	option: MinimalPairOption,
): string | null {
	switch (item.challengeDirection) {
		case "toneFromAudio":
			return toneLabel(option.tones);
		case "meaningFromAudio":
			return option.englishMeaning;
		default:
			return null;
	}
}

function OptionButton({
	item,
	option,
	index,
	answered,
	selected,
	onSelect,
}: {
	item: MinimalPairGameItem;
	option: MinimalPairOption;
	index: number;
	answered: boolean;
	selected: boolean;
	onSelect: () => void;
}) {
	const isCorrect = option.thaiWord === item.thaiWord;
	const face = optionFace(item, option);

	let style: CSSProperties = {
		background: "var(--color-surface)",
		borderColor: "var(--color-border)",
		color: "var(--color-text)",
	};
	if (answered && isCorrect) {
		style = {
			background: "var(--color-accent)",
			borderColor: "var(--color-accent)",
			color: "var(--color-text)",
		};
	} else if (answered && selected) {
		style = {
			background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
			borderColor: "var(--color-danger)",
			color: "var(--color-text)",
		};
	}

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={onSelect}
				disabled={answered}
				className="flex-1 flex items-center gap-3 px-4 py-4 rounded-xl border transition-colors min-h-[3.5rem] text-left"
				style={style}
			>
				<span
					className="text-base opacity-50 font-normal shrink-0"
					style={{ color: "var(--color-text-muted)" }}
				>
					{THAI_NUMERALS[index] ?? String(index + 1)}
				</span>
				{face !== null ? (
					<span className="text-base leading-tight break-words">{face}</span>
				) : (
					<span
						className="text-sm"
						style={{ color: "var(--color-text-muted)" }}
					>
						Clip {index + 1}
					</span>
				)}
				{/* Once answered, every option shows what it actually was — the
				    contrast is the lesson, and it is unreadable if the three
				    words the learner just chose between stay anonymous. */}
				{answered && (
					<span className="ml-auto text-right shrink-0">
						<span
							className="thai text-2xl block"
							style={{ color: "var(--color-text)" }}
						>
							{option.thaiWord}
						</span>
						<span
							className="text-xs block"
							style={{ color: "var(--color-text-muted)" }}
						>
							{toneLabel(option.tones)} · {option.englishMeaning}
						</span>
					</span>
				)}
			</button>
			{/* The clip stays reachable after answering for every direction that
			    has one, so the learner can A/B the pair they just got wrong. */}
			{option.audioUrl && (!autoplaysTarget(item) || answered) && (
				<PlayClipButton
					audioUrl={option.audioUrl}
					label={`Play option ${index + 1}`}
				/>
			)}
		</div>
	);
}

/**
 * One tone-pairs question: a multiple choice between words the learner
 * cannot tell apart except by tone — ไม้/ไหม/ใหม่, สี/สี่ — in one of the
 * four directions `MinimalPairChallengeDirection` names.
 *
 * **This is the one auto-graded challenge in the game.** Every other
 * organism here ends in `RatingButtons` and the learner's own
 * self-assessment, because "did you write that symbol correctly" is not
 * something the app can see. A multiple choice is different: the app knows
 * whether the chosen option was the right one, and asking the learner to
 * then also grade themselves would be asking them to restate a fact both
 * parties can already see. The answer maps to a `RecallRating`
 * (`CORRECT_RATING`/`INCORRECT_RATING`) and flows through the existing
 * round pipeline unchanged — so this mode is auto-graded *and* still
 * leaves `thai-srs-state` byte-identical, which is the game feature's #1
 * invariant. Auto-grading and SRS isolation are independent properties;
 * this mode takes one and keeps the other.
 *
 * Four directions in one organism, against this feature's usual
 * one-organism-per-direction split. The split earns its keep where the
 * directions genuinely differ (a symbol dictation has a drawing canvas, a
 * symbol reading has a reveal); here all four are the same
 * pick-then-reveal mechanic over the same option list, differing only in
 * which field is the prompt (`Prompt`) and which is the option's face
 * (`optionFace`). Four copies of the grading mechanic is the cost of
 * splitting, and it buys nothing.
 *
 * Reset is keyed on the item's full identity — group, target *and*
 * direction — and runs during render via `useResetOnCardChange`, never in
 * an effect: two consecutive tone-pairs items reuse this component
 * instance without a remount, and an after-paint reset flashes the
 * previous item's revealed answer over the new question.
 */
export function MinimalPairChallenge({ item, onRate }: Props) {
	const [selectedThai, setSelectedThai] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const itemId = `${item.groupKey}:${item.thaiWord}:${item.challengeDirection}`;

	useResetOnCardChange(itemId, () => setSelectedThai(null));

	// Autoplay is DOM work, so it stays in an effect even though the reset
	// above does not (see `useResetOnCardChange`).
	// biome-ignore lint/correctness/useExhaustiveDependencies: the item's identity drives autoplay, not the url alone — two items can share a clip
	useEffect(() => {
		if (!autoplaysTarget(item)) return;
		const audio = new Audio(item.audioUrl);
		audioRef.current = audio;
		audio.play().catch(() => {});
		return () => {
			audioRef.current?.pause();
			audioRef.current = null;
		};
	}, [itemId]);

	const answered = selectedThai !== null;
	const wasCorrect = selectedThai === item.thaiWord;

	const handleContinue = useCallback(() => {
		onRate(wasCorrect ? CORRECT_RATING : INCORRECT_RATING);
	}, [onRate, wasCorrect]);

	return (
		<div className="space-y-6">
			<Prompt item={item} />

			<div className="space-y-2">
				{item.options.map((option, index) => (
					<OptionButton
						key={option.thaiWord}
						item={item}
						option={option}
						index={index}
						answered={answered}
						selected={selectedThai === option.thaiWord}
						onSelect={() => setSelectedThai(option.thaiWord)}
					/>
				))}
			</div>

			{answered && (
				<div
					style={{ animation: "slideUp 0.25s ease-out" }}
					className="space-y-4"
				>
					<p
						className="text-center text-lg font-semibold"
						style={{
							color: wasCorrect ? "var(--color-master)" : "var(--color-danger)",
						}}
					>
						{wasCorrect ? "Correct" : "Not quite"}
					</p>
					<p
						className="text-center text-sm"
						style={{ color: "var(--color-text-muted)" }}
					>
						<span
							className="thai text-xl"
							style={{ color: "var(--color-text)" }}
						>
							{item.thaiWord}
						</span>{" "}
						— {toneLabel(item.tones)} — {item.englishMeaning}
					</p>
					<button
						type="button"
						onClick={handleContinue}
						className="w-full py-4 rounded-xl text-lg font-semibold transition-colors"
						style={{ background: "var(--color-primary)", color: "white" }}
					>
						Continue
					</button>
				</div>
			)}
		</div>
	);
}
