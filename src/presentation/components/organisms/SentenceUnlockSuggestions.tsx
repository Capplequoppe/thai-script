import type { UnlockSuggestion } from "../../../domain/sentence/services/SentenceLessonService";

interface Props {
	suggestions: UnlockSuggestion[];
	onPullInWord: (thai: string) => void;
}

export function SentenceUnlockSuggestions({
	suggestions,
	onPullInWord,
}: Props) {
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
						<p
							className="text-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							{sentence.english}
						</p>
						{missingWords.length === 0 ? (
							<span
								className="text-xs font-semibold"
								style={{ color: "var(--color-master)" }}
							>
								Unlocks immediately
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
										onClick={() => onPullInWord(word)}
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
		</div>
	);
}
