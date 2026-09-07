import { useCallback, useEffect, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import type { SentenceGameItem } from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";
import { RatingButtons } from "./RatingButtons";

interface Props {
	item: SentenceGameItem;
	onRate: (rating: RecallRating) => void;
}

/**
 * Thai script has no spaces between words — this is the one challenge that
 * asks the learner to find them. `item.thaiText` is space-joined (matching
 * `SentenceEntry.thai`, always exactly `words.join(" ")`); the puzzle strips
 * those spaces for display and the reveal splits on them for the answer,
 * rather than the content carrying a separate word list (see
 * `SentenceItemContent`'s own doc comment).
 *
 * Tapping a gap between two characters toggles a word-break there — the
 * character after a toggled gap gets a touch of margin, so the learner's own
 * attempt visibly takes shape as they tap. Nothing here compares that
 * attempt to the correct split: "Show Answer" reveals it as a separate,
 * un-diffed panel, matching every other organism in this feature (see
 * `SentenceCompositionChallenge`'s own doc comment — no correct/incorrect
 * verdict anywhere; the learner self-rates with `RatingButtons`).
 *
 * State is keyed on the item's own identity (`sentenceId`) — two consecutive
 * segmentation items reuse this component instance without a remount.
 */
export function SentenceSegmentationChallenge({ item, onRate }: Props) {
	// Index i means "there is a word break between character i and i+1".
	const [boundaries, setBoundaries] = useState<Set<number>>(new Set());
	const [revealed, setRevealed] = useState(false);

	// Reset on item change.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the item's identity drives the reset
	useEffect(() => {
		setBoundaries(new Set());
		setRevealed(false);
	}, [item.sentenceId]);

	const characters = [...item.thaiText.replace(/\s+/g, "")];
	const correctWords = item.thaiText.split(" ");

	const toggleBoundary = useCallback(
		(index: number) => {
			if (revealed) return;
			setBoundaries((previous) => {
				const next = new Set(previous);
				if (next.has(index)) {
					next.delete(index);
				} else {
					next.add(index);
				}
				return next;
			});
		},
		[revealed],
	);

	return (
		<div className="space-y-6">
			<div
				className="rounded-xl p-4"
				style={{
					border: "1px solid var(--color-border)",
					background: "var(--color-surface)",
				}}
			>
				<p
					className="text-center text-lg mb-4"
					style={{ color: "var(--color-text-muted)" }}
				>
					Tap between the words to split this sentence
				</p>
				<div className="flex flex-wrap justify-center items-center py-2">
					{characters.map((ch, index) => (
						// Characters never reorder within one item, so the index is
						// the character's stable identity.
						// biome-ignore lint/suspicious/noArrayIndexKey: see above
						<span key={index} className="inline-flex items-center">
							<span
								className="thai text-3xl font-bold"
								style={{
									color: "var(--color-text)",
									marginLeft:
										index > 0 && boundaries.has(index - 1) ? "0.5rem" : 0,
								}}
							>
								{ch}
							</span>
							{index < characters.length - 1 && (
								<button
									type="button"
									disabled={revealed}
									onClick={() => toggleBoundary(index)}
									aria-pressed={boundaries.has(index)}
									aria-label={
										boundaries.has(index)
											? `Remove word break after character ${index + 1}`
											: `Mark word break after character ${index + 1}`
									}
									className="inline-flex items-center justify-center"
									style={{ minWidth: 20, minHeight: 44, padding: "0 2px" }}
								>
									<span
										style={{
											display: "block",
											width: boundaries.has(index) ? 4 : 1,
											height: 28,
											borderRadius: 2,
											background: boundaries.has(index)
												? "var(--color-accent)"
												: "var(--color-border)",
										}}
									/>
								</button>
							)}
						</span>
					))}
				</div>
			</div>

			{!revealed ? (
				<Button
					type="button"
					className="w-full"
					onClick={() => setRevealed(true)}
				>
					Show Answer
				</Button>
			) : (
				<div
					style={{ animation: "slideUp 0.25s ease-out" }}
					className="space-y-6"
				>
					<div
						className="py-4 px-3 rounded-xl space-y-3"
						style={{ background: "var(--color-surface-2)" }}
					>
						<p
							className="text-center text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							Correct split
						</p>
						<div className="flex flex-wrap gap-2 justify-center">
							{correctWords.map((word, index) => (
								<span
									// A sentence can repeat a word; word+index keeps every
									// chip's key unique without implying an identity beyond
									// its fixed position.
									// biome-ignore lint/suspicious/noArrayIndexKey: see above
									key={`${word}-${index}`}
									className="thai text-xl font-semibold px-3 py-1 rounded-lg"
									style={{
										background: "var(--color-surface)",
										border: "1px solid var(--color-border)",
										color: "var(--color-text)",
									}}
								>
									{word}
								</span>
							))}
						</div>
						<p
							className="text-center text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							{item.englishMeaning}
						</p>
					</div>
					<RatingButtons onRate={onRate} />
				</div>
			)}
		</div>
	);
}
