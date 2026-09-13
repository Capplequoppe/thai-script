import { useState } from "react";
import type { UnlockSuggestion } from "../../../domain/sentence/services/SentenceLessonService";

interface Props {
	suggestions: UnlockSuggestion[];
	/** Whether the word this panel is shown for is itself pullable right now — a sentence with zero other missing words still needs THIS word pulled in first if it isn't pullable yet. */
	anchorIsPullable: boolean;
	/** Attempt to pull in a missing word; returns whether it actually succeeded (false = apprentice cap reached). */
	onPullInWord: (thai: string) => boolean;
}

export function SentenceUnlockSuggestions({
	suggestions,
	anchorIsPullable,
	onPullInWord,
}: Props) {
	const [capBlocked, setCapBlocked] = useState(false);

	if (suggestions.length === 0) return null;

	return (
		<div
			className="rounded-xl p-4"
			style={{ background: "var(--color-surface-2)" }}
		>
			<p
				className="text-xs font-semibold mb-3"
				style={{ color: "var(--color-text-muted)" }}
			>
				Appears in {suggestions.length} sentence
				{suggestions.length === 1 ? "" : "s"}
			</p>
			<div className="space-y-3">
				{suggestions.map(({ sentence, missingWords }) => (
					<div
						key={sentence.id}
						className="pb-3 last:pb-0 last:border-0"
						style={{ borderBottom: "1px solid var(--color-border)" }}
					>
						<p className="thai text-base">{sentence.thai}</p>
						<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
							{sentence.english}
						</p>
						{missingWords.length === 0 ? (
							<span
								className="text-xs font-semibold"
								style={{ color: "var(--color-master)" }}
							>
								{anchorIsPullable
									? "Unlocks immediately"
									: "Unlocks once you learn this word"}
							</span>
						) : (
							<div className="flex flex-wrap items-center gap-1 mt-1">
								<span
									className="text-xs"
									style={{ color: "var(--color-text-muted)" }}
								>
									Also pull in:
								</span>
								{missingWords.map((word) => (
									<button
										key={word}
										type="button"
										onClick={() => {
											const ok = onPullInWord(word);
											setCapBlocked(!ok);
										}}
										className="thai text-xs px-2 py-0.5 rounded"
										style={{
											background: "var(--color-surface)",
											color: "var(--color-primary)",
										}}
									>
										{word}
									</button>
								))}
							</div>
						)}
					</div>
				))}
			</div>
			{capBlocked && (
				<p className="text-sm mt-3" style={{ color: "var(--color-danger)" }}>
					Too many words in progress — clear some reviews first.
				</p>
			)}
		</div>
	);
}
