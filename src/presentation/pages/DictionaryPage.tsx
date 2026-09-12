import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { StageDot } from "../components/atoms/StageDot";
import { PullInVocabButton } from "../components/molecules/PullInVocabButton";
import { StageBadge } from "../components/molecules/StageBadge";
import { WordClassTabs } from "../components/molecules/WordClassTabs";
import { SentenceUnlockSuggestions } from "../components/organisms/SentenceUnlockSuggestions";
import { WordCard } from "../components/organisms/WordCard";
import { useApp } from "../hooks/useApp";
import { bestVocabStage } from "../utils/vocabStage";
import {
	buildWordClassTabs,
	filterByWordClassTab,
	WORD_CLASS_LABELS,
} from "../utils/wordClass";

type SortMode = "frequency" | "alpha";

export function DictionaryPage() {
	const { vocab, sentence, lesson, state, refresh } = useApp();
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [sortMode, setSortMode] = useState<SortMode>("frequency");
	const [classFilter, setClassFilter] = useState<string>("all");
	const [selectedThai, setSelectedThai] = useState<string | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: vocab is a stable service; completedLessons/vocabCards changing drives re-computation
	const unlockedWords = useMemo(
		() => vocab.getUnlockedWords(),
		[state.completedLessons, state.vocabCards],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: vocab is a stable service; vocabCards changing drives re-computation
	const learnedThai = useMemo(
		() => new Set(vocab.getLearnedEntries().map((e) => e.thai)),
		[state.vocabCards],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: vocab is a stable service; its backing array never changes at runtime
	const allWords = useMemo(() => vocab.getAllWords(), []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: vocab is a stable service; completedLessons/vocabCards changing drives re-computation
	const pullableWords = useMemo(
		() => vocab.getPullableWords(),
		[state.completedLessons, state.vocabCards],
	);

	const unlockedThai = useMemo(
		() => new Set(unlockedWords.map((e) => e.thai)),
		[unlockedWords],
	);

	const pullableThai = useMemo(
		() => new Set(pullableWords.map((e) => e.thai)),
		[pullableWords],
	);

	const searched = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return unlockedWords;
		const matches = (list: typeof unlockedWords) =>
			list.filter(
				(e) =>
					e.english.toLowerCase().includes(query) ||
					e.thai.toLowerCase().includes(query),
			);
		const primary = matches(unlockedWords);
		const primaryThai = new Set(primary.map((e) => e.thai));
		const extra = matches(allWords).filter((e) => !primaryThai.has(e.thai));
		return [...primary, ...extra];
	}, [unlockedWords, allWords, search]);

	const tabs = useMemo(() => buildWordClassTabs(searched), [searched]);

	const classFiltered = useMemo(
		() => filterByWordClassTab(searched, classFilter),
		[searched, classFilter],
	);

	const sortedEntries = useMemo(() => {
		const list = [...classFiltered];
		if (sortMode === "alpha") {
			list.sort((a, b) => a.english.localeCompare(b.english));
		} else {
			list.sort(
				(a, b) =>
					(a.rank ?? Number.POSITIVE_INFINITY) -
					(b.rank ?? Number.POSITIVE_INFINITY),
			);
		}
		return list;
	}, [classFiltered, sortMode]);

	const selectedEntry = selectedThai
		? (allWords.find((e) => e.thai === selectedThai) ?? null)
		: null;

	if (unlockedWords.length === 0) {
		return (
			<div className="text-center py-16 space-y-4">
				<span className="text-6xl">📖</span>
				<h1 className="text-2xl font-bold">No words unlocked yet</h1>
				<p style={{ color: "var(--color-text-muted)" }}>
					Words unlock as you learn the script and tone rules they need.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 py-4">
			{/* Header */}
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() =>
						selectedThai ? setSelectedThai(null) : navigate("/vocab")
					}
					className="text-sm hover:underline"
					style={{ color: "var(--color-primary)" }}
				>
					← {selectedThai ? "Back to list" : "Back"}
				</button>
				<h1 className="text-2xl font-bold flex-1">Dictionary</h1>
				{!selectedThai && (
					<span
						className="text-sm"
						style={{ color: "var(--color-text-muted)" }}
					>
						{unlockedWords.length} word
						{unlockedWords.length === 1 ? "" : "s"}
					</span>
				)}
			</div>

			{!selectedThai && (
				<>
					{/* Search */}
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by English or Thai..."
						className="w-full px-4 py-2 rounded-xl text-sm outline-none"
						style={{
							background: "var(--color-surface-2)",
							color: "var(--color-text)",
							border: "1px solid var(--color-border)",
						}}
						aria-label="Search dictionary"
					/>

					{/* Sort toggle */}
					<div
						className="flex gap-1 rounded-xl p-1 w-fit"
						style={{ background: "var(--color-surface-2)" }}
					>
						{(
							[
								{ key: "frequency", label: "Frequency" },
								{ key: "alpha", label: "A–Z" },
							] as const
						).map(({ key, label }) => (
							<button
								type="button"
								key={key}
								onClick={() => setSortMode(key)}
								className="py-1.5 px-3 rounded-lg text-sm font-medium transition-colors"
								style={
									sortMode === key
										? {
												background: "var(--color-surface)",
												color: "var(--color-text)",
												boxShadow:
													"0 1px 3px color-mix(in srgb, var(--color-text) 10%, transparent)",
											}
										: { color: "var(--color-text-muted)" }
								}
							>
								{label}
							</button>
						))}
					</div>

					{/* Word-class tabs */}
					<WordClassTabs
						tabs={tabs}
						activeKey={classFilter}
						onSelect={setClassFilter}
					/>

					{sortedEntries.length === 0 ? (
						<p
							className="text-center text-sm py-8"
							style={{ color: "var(--color-text-muted)" }}
						>
							No matching words.
						</p>
					) : (
						/* Word grid */
						<div className="grid grid-cols-3 gap-2">
							{sortedEntries.map((entry) => {
								const isPullableOnly =
									!unlockedThai.has(entry.thai) && pullableThai.has(entry.thai);
								const isLocked =
									!unlockedThai.has(entry.thai) &&
									!pullableThai.has(entry.thai);
								return (
									<button
										type="button"
										key={entry.thai}
										onClick={() => setSelectedThai(entry.thai)}
										className="relative flex flex-col items-center p-3 rounded-xl text-center"
										style={{
											background: "var(--color-surface-2)",
											...(isPullableOnly && {
												border: "1px dashed var(--color-border)",
											}),
											...(isLocked && { opacity: 0.6 }),
										}}
									>
										{learnedThai.has(entry.thai) && (
											<span className="absolute top-1 left-1">
												<StageDot
													stageName={bestVocabStage(
														entry.thai,
														state.vocabCards,
													)}
												/>
											</span>
										)}
										{isPullableOnly && (
											<span
												className="absolute top-1 left-1 text-[9px] px-1 rounded"
												style={{
													background: "var(--color-surface)",
													color: "var(--color-text-muted)",
												}}
											>
												not yet due
											</span>
										)}
										{isLocked && (
											<span
												className="absolute top-1 left-1 text-[9px] px-1 rounded"
												style={{
													background: "var(--color-surface)",
													color: "var(--color-text-muted)",
												}}
											>
												locked
											</span>
										)}
										{entry.thai_audio_file && (
											// biome-ignore lint/a11y/useSemanticElements: nested interactive element for audio
											<span
												role="button"
												tabIndex={-1}
												onClick={(e) => {
													e.stopPropagation();
													new Audio(entry.thai_audio_file as string)
														.play()
														.catch(() => {});
												}}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.stopPropagation();
														new Audio(entry.thai_audio_file as string)
															.play()
															.catch(() => {});
													}
												}}
												className="absolute top-1 right-1 text-xs opacity-50 hover:opacity-100 cursor-pointer"
												aria-label="Play pronunciation"
											>
												🔊
											</span>
										)}
										<span className="thai text-3xl">{entry.thai}</span>
										<span
											className="text-[10px] mt-0.5"
											style={{ color: "var(--color-text-muted)" }}
										>
											{entry.romanization}
										</span>
										<span
											className="text-[10px] mt-0.5 truncate w-full"
											style={{ color: "var(--color-text-muted)" }}
										>
											{entry.english}
										</span>
										{entry.word_class && (
											<span
												className="text-[9px] mt-0.5 px-1.5 rounded"
												style={{
													background:
														"color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))",
													color: "var(--color-primary)",
												}}
											>
												{WORD_CLASS_LABELS[entry.word_class] ??
													entry.word_class}
											</span>
										)}
									</button>
								);
							})}
						</div>
					)}
				</>
			)}

			{/* Detail card — read-only, no SRS/override controls: an unlocked
			    word may have no cards yet, so there's nothing to override. */}
			{selectedThai && selectedEntry && (
				<div className="space-y-4">
					{learnedThai.has(selectedEntry.thai) && (
						<div className="flex justify-center">
							<StageBadge
								stage={bestVocabStage(selectedEntry.thai, state.vocabCards)}
							/>
						</div>
					)}
					<WordCard
						word={selectedEntry}
						stageName={
							learnedThai.has(selectedEntry.thai)
								? bestVocabStage(selectedEntry.thai, state.vocabCards)
								: null
						}
					/>
					{!learnedThai.has(selectedEntry.thai) && (
						<>
							<PullInVocabButton
								key={selectedEntry.thai}
								thai={selectedEntry.thai}
								isPullable={vocab.isPullable(selectedEntry)}
								missingPrerequisites={vocab.getMissingPrerequisites(
									selectedEntry,
								)}
								onPullIn={(thai) => {
									const ok = lesson.pullInVocabWord(thai);
									if (ok) refresh();
									return ok;
								}}
							/>
							<SentenceUnlockSuggestions
								suggestions={sentence.getUnlockSuggestions(selectedEntry.thai)}
								onPullInWord={(thai) => {
									if (lesson.pullInVocabWord(thai)) refresh();
								}}
							/>
						</>
					)}
				</div>
			)}
		</div>
	);
}
