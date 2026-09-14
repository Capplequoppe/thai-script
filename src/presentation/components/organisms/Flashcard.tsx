import { useCallback, useEffect, useState } from "react";
import type { RecallRating } from "../../../domain/shared/types";
import { SrsStage } from "../../../domain/srs/value-objects/SrsStage";
import { roomExposureFor } from "../../../domain/vocabulary/data/rooms";
import {
	isVocabProperty,
	roomForVocabCardId,
	roomLabel,
} from "../../../domain/vocabulary/services/VocabMnemonic";
import type { Room } from "../../../domain/vocabulary/types";
import { useResetOnCardChange } from "../../hooks/useResetOnCardChange";
import { classColor } from "../../utils/consonantClassColor";
import { scaffoldLevel } from "../../utils/srsFade";
import { DistrictBadge } from "../atoms/DistrictBadge";
import { StageDot } from "../atoms/StageDot";
import { ThaiCharDisplay } from "../atoms/ThaiCharDisplay";
import { RatingButtons } from "./RatingButtons";

interface SrsData {
	learningStep: number | null;
	interval: number;
}

interface QuizCardView {
	id: string;
	question: string;
	correctAnswer: string;
	choices: readonly string[];
	audioUrl?: string;
	srs?: SrsData;
}

interface Props {
	card: QuizCardView;
	onRate: (rating: RecallRating) => void;
}

/**
 * The word's room, as part of the answer.
 *
 * Never rendered before the learner has acted: a room is a part-of-speech
 * signal, and on a recognition card the part of speech is half the answer. It
 * is available on request instead — asking costs something, which leaves the
 * retrieval attempt intact — and is shown unasked only once the answer is out.
 * `roomExposureFor` owns that rule, per property; this component only draws
 * what it decides.
 */
function RoomNote({ room, via }: { room: Room; via: "hint" | "reveal" }) {
	return (
		<p
			className="text-center text-sm mt-2"
			style={{ color: "var(--color-text-muted)" }}
		>
			Room: {roomLabel(room)}
			{via === "hint" && <span className="ml-1 opacity-60">(hint)</span>}
		</p>
	);
}

export function Flashcard({ card, onRate }: Props) {
	const [revealed, setRevealed] = useState(false);
	const [roomHintRequested, setRoomHintRequested] = useState(false);

	const cardProperty =
		"property" in card ? (card as Record<string, unknown>).property : null;
	// Both are "hear it, then recall the meaning" cards — vocab/symbol's own
	// audioRecognition property and a sentence's listeningComprehension
	// property (which has no symbolCharacter/promptWord of its own for the
	// boxes below to key off, so without this it would fall through to no
	// audio at all) — mirrors MultipleChoice's playsAudioUpfront.
	const playsAudioUpfront =
		cardProperty === "audioRecognition" ||
		cardProperty === "listeningComprehension";
	const hideAudioHint =
		cardProperty === "recognition" || cardProperty === "initialSound";
	const symbolChar =
		"symbolCharacter" in card
			? ((card as Record<string, unknown>).symbolCharacter as string)
			: "";
	const symbolClass =
		"consonantClass" in card
			? ((card as Record<string, unknown>).consonantClass as string | undefined)
			: undefined;
	const promptWord =
		"promptWord" in card
			? ((card as Record<string, unknown>).promptWord as string)
			: "";
	// Every other card shape with audio (symbol, vocab) already gets a player
	// via the boxes below — this is only true for a shape with none of them,
	// which today means a sentence's `selfValidation` card: its `audioUrl` is
	// the *answer's* pronunciation, so it belongs in the reveal, not before
	// it (hearing it first would answer the challenge — see
	// `SentenceReadingChallenge`'s own doc comment for the same rule).
	const hasTopAudio =
		playsAudioUpfront || Boolean(symbolChar) || Boolean(promptWord);

	// Only a vocabulary card has a room: the id carries the Thai spelling for
	// all six properties, while promptWord does not (it is the English on an
	// englishToThai card).
	const vocabProperty = isVocabProperty(cardProperty) ? cardProperty : null;
	const room = vocabProperty ? roomForVocabCardId(card.id) : null;
	const roomExposure =
		vocabProperty && room
			? roomExposureFor(vocabProperty, {
					revealed,
					hintRequested: roomHintRequested,
				})
			: null;

	const stage = card.srs
		? SrsStage.fromScheduleData(card.srs.learningStep, card.srs.interval)
		: null;
	const scaffolding = scaffoldLevel(stage?.name);

	// Reset during render, not in an effect: an effect resets after paint, and
	// iOS Safari then shows a frame of the new card with the answer already
	// revealed. See `useResetOnCardChange`.
	useResetOnCardChange(card.id, () => {
		setRevealed(false);
		setRoomHintRequested(false);
	});

	useEffect(() => {
		if (playsAudioUpfront && card.audioUrl) {
			new Audio(card.audioUrl).play().catch(() => {});
		}
	}, [playsAudioUpfront, card.audioUrl]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: fires once per reveal, not on every audioUrl/hasTopAudio identity change
	useEffect(() => {
		if (revealed && !hasTopAudio && card.audioUrl) {
			new Audio(card.audioUrl).play().catch(() => {});
		}
	}, [revealed]);

	const handleReveal = useCallback(() => {
		setRevealed(true);
	}, []);

	const handleRate = useCallback(
		(rating: RecallRating) => {
			onRate(rating);
		},
		[onRate],
	);

	useEffect(() => {
		if (revealed) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === " ") {
				e.preventDefault();
				handleReveal();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [revealed, handleReveal]);

	return (
		<div className="space-y-6">
			<div
				className="relative rounded-xl p-4"
				style={{
					border: "1px solid var(--color-border)",
					background: "var(--color-surface)",
				}}
			>
				{stage && (
					<div className="absolute top-3 right-3">
						<StageDot stageName={stage.name} />
					</div>
				)}

				{playsAudioUpfront && card.audioUrl ? (
					<div className="text-center">
						<button
							type="button"
							onClick={() => {
								if (card.audioUrl) {
									new Audio(card.audioUrl).play().catch(() => {});
								}
							}}
							className="inline-flex items-center justify-center w-24 h-24 rounded-full transition-colors text-5xl"
							style={{
								background: "var(--color-surface-2)",
								color: "var(--color-primary)",
							}}
							aria-label="Replay pronunciation"
						>
							🔊
						</button>
					</div>
				) : symbolChar ? (
					<div className="text-center">
						<ThaiCharDisplay
							character={symbolChar}
							className="text-8xl"
							audioUrl={card.audioUrl}
							hideAudio={hideAudioHint}
							color={classColor(symbolClass)}
						/>
						{/* Colour is one class channel and fails for red-green CVD
						    (see CONTEXT.md "Rejected alternatives") — the district
						    glyph is the second, non-colour channel, and this is the
						    only place a learner sees either during an actual SRS
						    review. `symbolClass` is already `undefined` on the
						    class-recall card itself (ScriptCardGenerator's
						    deliberate suppression), so DistrictBadge renders
						    nothing there, same as the colour above. */}
						<DistrictBadge
							classType={symbolClass}
							level={scaffolding}
							className="text-2xl mt-1 inline-block"
						/>
					</div>
				) : promptWord ? (
					<div className="text-center">
						<ThaiCharDisplay
							character={promptWord}
							className="text-6xl"
							audioUrl={card.audioUrl}
						/>
					</div>
				) : null}

				<p
					className="text-center text-lg"
					style={{ color: "var(--color-text-muted)" }}
				>
					{card.question}
				</p>
			</div>

			{!revealed ? (
				<>
					{room && roomExposure?.visible === false && (
						<button
							type="button"
							onClick={() => setRoomHintRequested(true)}
							className="w-full py-2 rounded-xl text-sm"
							style={{
								background: "transparent",
								color: "var(--color-text-muted)",
							}}
						>
							Stuck? Show the room
						</button>
					)}
					{room && roomExposure?.visible && (
						<RoomNote room={room} via={roomExposure.via} />
					)}
					<button
						type="button"
						onClick={handleReveal}
						className="w-full py-4 rounded-xl text-lg font-semibold transition-colors"
						style={{
							background: "var(--color-surface-2)",
							color: "var(--color-text)",
						}}
					>
						Show Answer <span className="text-xs opacity-50 ml-1">(Space)</span>
					</button>
				</>
			) : (
				<div
					style={{ animation: "slideUp 0.25s ease-out" }}
					className="space-y-6"
				>
					<div
						className="text-center py-4 rounded-xl"
						style={{ background: "var(--color-surface-2)" }}
					>
						<p
							className={`text-2xl font-bold${!hasTopAudio && card.audioUrl ? " thai" : ""}`}
							style={{ color: "var(--color-primary)" }}
						>
							{card.correctAnswer}
						</p>
						{!hasTopAudio && card.audioUrl && (
							<button
								type="button"
								onClick={() => {
									if (card.audioUrl) {
										new Audio(card.audioUrl).play().catch(() => {});
									}
								}}
								className="mt-3 inline-flex items-center justify-center w-12 h-12 rounded-full text-2xl transition-colors"
								style={{
									background: "var(--color-surface)",
									color: "var(--color-primary)",
								}}
								aria-label="Replay pronunciation"
							>
								🔊
							</button>
						)}
						{room && roomExposure?.visible && (
							<RoomNote room={room} via={roomExposure.via} />
						)}
					</div>
					<RatingButtons onRate={handleRate} />
				</div>
			)}
		</div>
	);
}
