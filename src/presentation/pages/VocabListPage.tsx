import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import type { VocabProperty } from "../../domain/vocabulary/types";
import { StageBadge } from "../components/molecules/StageBadge";
import { WordClassTabs } from "../components/molecules/WordClassTabs";
import {
	type ItemCard,
	StageOverrideSheet,
} from "../components/organisms/StageOverrideSheet";
import { WordCard } from "../components/organisms/WordCard";
import { useApp } from "../hooks/useApp";
import { bestVocabStage } from "../utils/vocabStage";
import {
	buildWordClassTabs,
	filterByWordClassTab,
	WORD_CLASS_LABELS,
} from "../utils/wordClass";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const VOCAB_PROPERTY_LABELS: Record<VocabProperty, string> = {
	thaiToEnglish: "Thai → English",
	englishToThai: "English → Thai",
	audioRecognition: "Listening",
	toneIdentification: "Tone",
	spelling: "Spelling",
	spellingFromAudio: "Spelling (Audio)",
};

export function VocabListPage() {
	const { vocab, state, items, refresh } = useApp();
	const navigate = useNavigate();
	const [classFilter, setClassFilter] = useState<string>("all");
	const [selectedThai, setSelectedThai] = useState<string | null>(null);
	const [overrideOpen, setOverrideOpen] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: vocab is a stable service; vocabCards changing drives re-computation
	const learnedEntries = useMemo(
		() => vocab.getLearnedEntries(),
		[state.vocabCards],
	);

	// Derive the SRS stage for a word from its best (most-advanced) card
	const getWordStage = (thai: string): string =>
		bestVocabStage(thai, state.vocabCards);

	// Build ordered tab list, counted over learned words
	const tabs = useMemo(
		() => buildWordClassTabs(learnedEntries),
		[learnedEntries],
	);

	// Filter entries for current tab
	const filteredEntries = useMemo(
		() => filterByWordClassTab(learnedEntries, classFilter),
		[learnedEntries, classFilter],
	);

	const selectedEntry = selectedThai
		? (learnedEntries.find((e) => e.thai === selectedThai) ?? null)
		: null;

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

	if (learnedEntries.length === 0) {
		return (
			<div className="text-center py-16 space-y-4">
				<span className="text-6xl">📖</span>
				<h1 className="text-2xl font-bold">No vocabulary learned yet</h1>
				<p style={{ color: "var(--color-text-muted)" }}>
					Complete a vocabulary lesson to see words here.
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
						selectedThai ? setSelectedThai(null) : navigate("/items")
					}
					className="text-sm hover:underline"
					style={{ color: "var(--color-primary)" }}
				>
					← {selectedThai ? "Back to list" : "Back"}
				</button>
				<h1 className="text-2xl font-bold flex-1">Vocabulary</h1>
				{!selectedThai && (
					<button
						type="button"
						onClick={() => navigate("/dictionary")}
						className="text-sm hover:underline"
						style={{ color: "var(--color-primary)" }}
					>
						Dictionary →
					</button>
				)}
			</div>

			{!selectedThai && (
				<>
					{/* Word-class tabs */}
					<WordClassTabs
						tabs={tabs}
						activeKey={classFilter}
						onSelect={setClassFilter}
					/>

					{/* Word grid */}
					<div className="grid grid-cols-3 gap-2">
						{filteredEntries.map((entry) => (
							<button
								type="button"
								key={entry.thai}
								onClick={() => setSelectedThai(entry.thai)}
								className="relative flex flex-col items-center p-3 rounded-xl text-center"
								style={{ background: "var(--color-surface-2)" }}
							>
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
										{WORD_CLASS_LABELS[entry.word_class] ?? entry.word_class}
									</span>
								)}
							</button>
						))}
					</div>
				</>
			)}

			{/* Detail card */}
			{selectedThai && selectedEntry && (
				<div className="space-y-4">
					<div className="flex justify-center">
						<StageBadge stage={getWordStage(selectedEntry.thai)} />
					</div>
					<WordCard
						word={selectedEntry}
						stageName={getWordStage(selectedEntry.thai)}
					/>
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
				</div>
			)}
		</div>
	);
}
