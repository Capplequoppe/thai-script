import { useCallback, useEffect, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import type { CompositionGameItem } from "../../../domain/game/types";
import type { RecallRating } from "../../../domain/shared/types";
import { RatingButtons } from "./RatingButtons";

interface Props {
	item: CompositionGameItem;
	onRate: (rating: RecallRating) => void;
}

/**
 * Build one of a grammar point's own example sentences from shuffled word
 * tiles: the English gloss is the prompt, tapping a tile appends its word,
 * backspace removes the last one, and "Show Answer" reveals the correct
 * order for the learner to compare and self-rate with `RatingButtons`.
 *
 * This reuses `SentenceBuilder.tsx`'s tile-tap *interaction* only — never
 * its auto-graded submit. Nothing here compares the built sentence to the
 * correct one; there is no correct/incorrect verdict anywhere, matching
 * every other organism in this feature (see the task's AC1).
 *
 * Tiles are tracked by index, not text: an example sentence can repeat a
 * word, and two tiles with the same text are still two tiles.
 *
 * Reset is keyed on the item's own identity (`grammarId`, the key a round
 * dedupes on) — two consecutive composition items reuse this component
 * instance without a remount, so the second must not inherit the first's
 * built tiles or reveal state. There is no audio: `CompositionItemContent`
 * deliberately carries no `audioUrl` (see CONTEXT.md).
 */
export function SentenceCompositionChallenge({ item, onRate }: Props) {
	// Indices into `item.tiles`, in tap order — the built sentence and the
	// used-tile set are both derived from this one piece of state.
	const [builtIndices, setBuiltIndices] = useState<number[]>([]);
	const [revealed, setRevealed] = useState(false);

	// Reset on item change.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the item's identity drives the reset
	useEffect(() => {
		setBuiltIndices([]);
		setRevealed(false);
	}, [item.grammarId]);

	const usedIndices = new Set(builtIndices);
	const builtWords = builtIndices.map((index) => item.tiles[index]);

	const handleTap = useCallback(
		(index: number) => {
			if (revealed) return;
			setBuiltIndices((previous) =>
				previous.includes(index) ? previous : [...previous, index],
			);
		},
		[revealed],
	);

	const handleBackspace = useCallback(() => {
		if (revealed) return;
		setBuiltIndices((previous) => previous.slice(0, -1));
	}, [revealed]);

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
					Build this sentence in Thai
				</p>
				<p
					className="text-center text-2xl font-bold py-4"
					style={{ color: "var(--color-text)" }}
				>
					{item.englishMeaning}
				</p>
			</div>

			{/* Building area — one text node, so what the learner has built
			    reads as a sentence, not a row of fragments. */}
			<div
				className="min-h-[3rem] rounded-xl p-3 flex items-center justify-center"
				style={{
					background: "var(--color-surface)",
					border: "2px solid var(--color-border)",
				}}
			>
				{builtWords.length > 0 ? (
					<span
						className="thai text-xl font-semibold"
						style={{ color: "var(--color-text)" }}
					>
						{builtWords.join(" ")}
					</span>
				) : (
					<span
						className="text-sm"
						style={{ color: "var(--color-text-muted)" }}
					>
						Tap the word tiles below to build it
					</span>
				)}
			</div>

			<div className="flex flex-wrap gap-2 justify-center">
				{item.tiles.map((word, index) => {
					const used = usedIndices.has(index);
					return (
						<button
							// Tiles never reorder within one item, so the index is
							// the tile's stable identity even when words repeat.
							// biome-ignore lint/suspicious/noArrayIndexKey: see above
							key={`${word}-${index}`}
							type="button"
							disabled={used || revealed}
							onClick={() => handleTap(index)}
							className="thai text-lg font-semibold px-3 h-10 rounded-lg flex items-center justify-center transition-all"
							style={{
								background: used
									? "var(--color-border)"
									: "var(--color-surface)",
								color: used ? "var(--color-text-muted)" : "var(--color-text)",
								opacity: used ? 0.4 : 1,
							}}
						>
							{word}
						</button>
					);
				})}
			</div>

			{!revealed ? (
				<div className="flex gap-3">
					<Button
						type="button"
						variant="outline"
						onClick={handleBackspace}
						disabled={builtWords.length === 0}
						aria-label="Remove last word"
					>
						⌫
					</Button>
					<Button
						type="button"
						className="flex-1"
						onClick={() => setRevealed(true)}
					>
						Show Answer
					</Button>
				</div>
			) : (
				<div
					style={{ animation: "slideUp 0.25s ease-out" }}
					className="space-y-6"
				>
					<div
						className="py-4 px-3 rounded-xl space-y-2"
						style={{ background: "var(--color-surface-2)" }}
					>
						<p
							className="text-center text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							Correct order
						</p>
						<p
							className="thai text-center text-xl font-semibold"
							style={{ color: "var(--color-text)" }}
						>
							{item.correctOrder.join(" ")}
						</p>
					</div>
					<RatingButtons onRate={onRate} />
				</div>
			)}
		</div>
	);
}
