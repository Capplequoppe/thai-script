import { useMemo, useState } from "react";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import { StageDot } from "../components/atoms/StageDot";
import { PullInVocabButton } from "../components/molecules/PullInVocabButton";
import { StageBadge } from "../components/molecules/StageBadge";
import { WordClassTabs } from "../components/molecules/WordClassTabs";
import { SentenceUnlockSuggestions } from "../components/organisms/SentenceUnlockSuggestions";
import {
	type ItemCard,
	StageOverrideSheet,
} from "../components/organisms/StageOverrideSheet";
import { WordCard } from "../components/organisms/WordCard";
import { useApp } from "../hooks/useApp";
import { VOCAB_PROPERTY_LABELS } from "../utils/propertyLabels";
import { bestVocabStage } from "../utils/vocabStage";
import {
	buildWordClassTabs,
	filterByWordClassTab,
	WORD_CLASS_LABELS,
} from "../utils/wordClass";

type SortMode = "frequency" | "alpha";

/** Which slice of the vocabulary the grid is browsing. The three are nested:
 *  learned ⊆ unlocked ⊆ all. */
type Scope = "learned" | "unlocked" | "all";

const SCOPES: { key: Scope; label: string }[] = [
	{ key: "learned", label: "Learned" },
	{ key: "unlocked", label: "Unlocked" },
	{ key: "all", label: "All" },
];

/** The "all" scope spans ~5,500 words. Rendering a tile per word janks the
 *  grid for no benefit, so the list is capped and the search box is the way
 *  to reach past the cap. */
const GRID_CAP = 300;

export function DictionaryPage() {
	const { vocab, sentence, lesson, items, state, refresh } = useApp();
	const [search, setSearch] = useState("");
	const [sortMode, setSortMode] = useState<SortMode>("frequency");
	const [classFilter, setClassFilter] = useState<string>("all");
	const [selectedThai, setSelectedThai] = useState<string | null>(null);
	const [overrideOpen, setOverrideOpen] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: vocab is a stable service; completedLessons/vocabCards changing drives re-computation
	const unlockedWords = useMemo(
		() => vocab.getUnlockedWords(),
		[state.completedLessons, state.vocabCards],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: vocab is a stable service; vocabCards changing drives re-computation
	const learnedEntries = useMemo(
		() => vocab.getLearnedEntries(),
		[state.vocabCards],
	);

	const learnedThai = useMemo(
		() => new Set(learnedEntries.map((e) => e.thai)),
		[learnedEntries],
	);

	// A learner with no words yet would land on an empty "Learned" grid, so
	// the opening scope is the widest one that has something in it.
	const [scope, setScope] = useState<Scope>(() =>
		learnedEntries.length > 0 ? "learned" : "unlocked",
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

	const scopeWords = useMemo(() => {
		if (scope === "learned") return learnedEntries;
		if (scope === "unlocked") return unlockedWords;
		return allWords;
	}, [scope, learnedEntries, unlockedWords, allWords]);

	const searched = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return scopeWords;
		const matches = (list: typeof scopeWords) =>
			list.filter(
				(e) =>
					e.english.toLowerCase().includes(query) ||
					e.thai.toLowerCase().includes(query),
			);
		const primary = matches(scopeWords);
		// Search escapes the current scope: a word you haven't unlocked (or
		// haven't learned) is still findable by name. Only once the query is
		// specific enough, though, and capped — a one- or two-letter query
		// against every word in the dictionary would otherwise flood the grid.
		if (query.length < 2 || scope === "all") return primary;
		const primaryThai = new Set(primary.map((e) => e.thai));
		const extra = matches(allWords)
			.filter((e) => !primaryThai.has(e.thai))
			.slice(0, 50);
		return [...primary, ...extra];
	}, [scopeWords, allWords, scope, search]);

	// One tile per headword. `vocabulary.json` holds more rows than distinct
	// Thai spellings — some spellings repeat as separate senses (ทำ "do" and
	// ทำ "make"), others as outright duplicate rows. Both the grid's React key
	// and the detail lookup are the Thai spelling, so a repeat rendered two
	// tiles that opened the same card and collided on their key, which makes
	// React drop tiles. Keep the best-ranked row for each spelling.
	const deduped = useMemo(() => {
		const byThai = new Map<string, (typeof searched)[number]>();
		for (const entry of searched) {
			const held = byThai.get(entry.thai);
			if (
				!held ||
				(entry.rank ?? Number.POSITIVE_INFINITY) <
					(held.rank ?? Number.POSITIVE_INFINITY)
			) {
				byThai.set(entry.thai, entry);
			}
		}
		return [...byThai.values()];
	}, [searched]);

	const tabs = useMemo(() => buildWordClassTabs(deduped), [deduped]);

	// `buildWordClassTabs` only emits tabs for classes present in the current
	// list, so narrowing the scope (or typing a search) can leave `classFilter`
	// pointing at a tab that no longer renders — an empty grid with no active
	// tab and no way back. Fall back to "all" whenever that happens.
	const activeClassFilter = tabs.some((t) => t.key === classFilter)
		? classFilter
		: "all";

	const classFiltered = useMemo(
		() => filterByWordClassTab(deduped, activeClassFilter),
		[deduped, activeClassFilter],
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

	const visibleEntries = useMemo(
		() => sortedEntries.slice(0, GRID_CAP),
		[sortedEntries],
	);
	const hiddenCount = sortedEntries.length - visibleEntries.length;

	const selectedEntry = selectedThai
		? (allWords.find((e) => e.thai === selectedThai) ?? null)
		: null;

	// biome-ignore lint/correctness/useExhaustiveDependencies: vocab is a stable service; completedLessons/vocabCards changing drives re-computation
	const selectedIsPullable = useMemo(
		() => (selectedEntry ? vocab.isPullable(selectedEntry) : false),
		[selectedEntry, state.completedLessons, state.vocabCards],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: vocab is a stable service; completedLessons/vocabCards changing drives re-computation
	const selectedMissingPrerequisites = useMemo(
		() =>
			selectedEntry
				? vocab.getMissingPrerequisites(selectedEntry)
				: { characters: [], toneRules: [] },
		[selectedEntry, state.completedLessons, state.vocabCards],
	);

	const overrideCards: ItemCard[] = useMemo(() => {
		if (!selectedThai) return [];
		return Object.values(state.vocabCards)
			.filter((card) => card.id.split(":")[1] === selectedThai)
			.map((card) => ({
				id: card.id,
				pool: "vocab" as const,
				label: VOCAB_PROPERTY_LABELS[card.property] ?? card.property,
				currentStage: SrsStage.fromScheduleData(
					card.srs.learningStep,
					card.srs.interval,
				),
			}));
	}, [selectedThai, state.vocabCards]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: sentence is a stable service; completedLessons/vocabCards changing drives re-computation
	const selectedSuggestions = useMemo(
		() =>
			selectedEntry ? sentence.getUnlockSuggestions(selectedEntry.thai) : [],
		[selectedEntry, state.completedLessons, state.vocabCards],
	);

	// Guarded on both slices, not just the unlocked one: this page is now the
	// only way to browse vocabulary, and a learner can hold learned words while
	// nothing is currently unlocked. Showing them "no words" would strand them.
	if (unlockedWords.length === 0 && learnedEntries.length === 0) {
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
			{/* Header — this is a nav-root page, so there is nowhere to go
			    "back" to except out of a word's detail view. */}
			<div className="flex items-center gap-3">
				{selectedThai && (
					<button
						type="button"
						onClick={() => {
							setSelectedThai(null);
							setOverrideOpen(false);
						}}
						className="text-sm hover:underline"
						style={{ color: "var(--color-primary)" }}
					>
						← Back to list
					</button>
				)}
				<h1 className="text-2xl font-bold flex-1">Dictionary</h1>
				{!selectedThai && (
					<span
						className="text-sm"
						style={{ color: "var(--color-text-muted)" }}
					>
						{sortedEntries.length} word
						{sortedEntries.length === 1 ? "" : "s"}
					</span>
				)}
			</div>

			{!selectedThai && (
				<>
					{/* Scope — learned ⊆ unlocked ⊆ all */}
					<div
						className="flex gap-1 rounded-xl p-1"
						style={{ background: "var(--color-surface-2)" }}
					>
						{SCOPES.map(({ key, label }) => (
							<button
								type="button"
								key={key}
								onClick={() => setScope(key)}
								aria-pressed={scope === key}
								className="flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors"
								style={
									scope === key
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
						activeKey={activeClassFilter}
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
							{visibleEntries.map((entry) => {
								const isPullableOnly =
									!learnedThai.has(entry.thai) &&
									!unlockedThai.has(entry.thai) &&
									pullableThai.has(entry.thai);
								const isLocked =
									!learnedThai.has(entry.thai) &&
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

					{hiddenCount > 0 && (
						<p
							className="text-center text-xs"
							style={{ color: "var(--color-text-muted)" }}
						>
							{hiddenCount} more word{hiddenCount === 1 ? "" : "s"} not shown —
							search to narrow the list.
						</p>
					)}
				</>
			)}

			{/* Detail card. A learned word gets its stage badge and the
			    override sheet; an unlocked-but-unlearned one has no cards yet,
			    so there is nothing to override — it gets the pull-in flow. */}
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
					{learnedThai.has(selectedEntry.thai) && (
						<>
							<div className="flex justify-center">
								<button
									type="button"
									onClick={() => setOverrideOpen(true)}
									className="text-sm px-4 py-2 rounded-lg font-medium transition-colors"
									style={{
										background: "var(--color-surface-2)",
										color: "var(--color-text-muted)",
										border: "1px solid var(--color-border)",
									}}
								>
									Override Stage
								</button>
							</div>
							<StageOverrideSheet
								open={overrideOpen}
								onClose={() => setOverrideOpen(false)}
								itemLabel={selectedEntry.thai}
								cards={overrideCards}
								onOverride={(id, pool, stage) => {
									items.overrideCardStage(id, pool, stage);
									refresh();
								}}
							/>
						</>
					)}

					{!learnedThai.has(selectedEntry.thai) && (
						<>
							<PullInVocabButton
								key={selectedEntry.thai}
								thai={selectedEntry.thai}
								isPullable={selectedIsPullable}
								missingPrerequisites={selectedMissingPrerequisites}
								onPullIn={(thai) => {
									const ok = lesson.pullInVocabWord(thai);
									if (ok) refresh();
									return ok;
								}}
							/>
							<SentenceUnlockSuggestions
								suggestions={selectedSuggestions}
								anchorIsPullable={selectedIsPullable}
								onPullInWord={(thai) => {
									const ok = lesson.pullInVocabWord(thai);
									if (ok) refresh();
									return ok;
								}}
							/>
						</>
					)}
				</div>
			)}
		</div>
	);
}
