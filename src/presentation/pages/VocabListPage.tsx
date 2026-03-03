import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import type { VocabProperty } from "../../domain/vocabulary/types";
import { StageBadge } from "../components/molecules/StageBadge";
import {
	type ItemCard,
	StageOverrideSheet,
} from "../components/organisms/StageOverrideSheet";
import { WordCard } from "../components/organisms/WordCard";
import { useApp } from "../hooks/useApp";

// ---------------------------------------------------------------------------
// Word-class display names
// ---------------------------------------------------------------------------

const WORD_CLASS_LABELS: Record<string, string> = {
	n: "Nouns",
	v: "Verbs",
	adj: "Adjectives",
	adv: "Adverbs",
	part: "Particles",
	conj: "Conjunctions",
	pron: "Pronouns",
	clf: "Classifiers",
	int: "Interjections",
	prep: "Prepositions",
};

// Preferred tab ordering for known classes
const CLASS_ORDER = [
	"n",
	"v",
	"adj",
	"adv",
	"part",
	"conj",
	"pron",
	"clf",
	"int",
	"prep",
];

// Sentinel for words with empty or unrecognised word_class
const OTHER_KEY = "__other__";

function toTabKey(word_class: string): string {
	if (!word_class || !(word_class in WORD_CLASS_LABELS)) return OTHER_KEY;
	return word_class;
}

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
	const getWordStage = (thai: string): string => {
		const cards = Object.values(state.vocabCards).filter(
			(c) => c.wordThai === thai,
		);
		if (cards.length === 0) return "Apprentice";
		const stageOrder = [
			"Apprentice",
			"Guru",
			"Master",
			"Enlightened",
			"Burned",
		];
		const stages = cards.map((c) =>
			SrsStage.fromScheduleData(c.srs.learningStep, c.srs.interval),
		);
		const best = stages.reduce((a, b) =>
			stageOrder.indexOf(b.name) > stageOrder.indexOf(a.name) ? b : a,
		);
		return best.name;
	};

	// Count learned words per class
	const classCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const entry of learnedEntries) {
			const key = toTabKey(entry.word_class);
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		return counts;
	}, [learnedEntries]);

	// Build ordered tab list
	const tabs = useMemo(() => {
		const present = new Set(classCounts.keys());
		const result: Array<{ key: string; label: string; count: number }> = [
			{ key: "all", label: "All", count: learnedEntries.length },
		];
		for (const cls of CLASS_ORDER) {
			if (present.has(cls)) {
				result.push({
					key: cls,
					label: WORD_CLASS_LABELS[cls] ?? cls,
					count: classCounts.get(cls) ?? 0,
				});
			}
		}
		for (const key of present) {
			if (key !== OTHER_KEY && !CLASS_ORDER.includes(key)) {
				result.push({
					key,
					label: WORD_CLASS_LABELS[key] ?? key,
					count: classCounts.get(key) ?? 0,
				});
			}
		}
		if (present.has(OTHER_KEY)) {
			result.push({
				key: OTHER_KEY,
				label: "Other",
				count: classCounts.get(OTHER_KEY) ?? 0,
			});
		}
		return result;
	}, [classCounts, learnedEntries.length]);

	// Filter entries for current tab
	const filteredEntries = useMemo(() => {
		if (classFilter === "all") return learnedEntries;
		if (classFilter === OTHER_KEY) {
			return learnedEntries.filter(
				(e) => !e.word_class || !(e.word_class in WORD_CLASS_LABELS),
			);
		}
		return learnedEntries.filter((e) => e.word_class === classFilter);
	}, [learnedEntries, classFilter]);

	const selectedEntry = selectedThai
		? (learnedEntries.find((e) => e.thai === selectedThai) ?? null)
		: null;

	const overrideCards: ItemCard[] = useMemo(() => {
		if (!selectedThai) return [];
		return Object.values(state.vocabCards)
			.filter((card) => card.wordThai === selectedThai)
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
				<h1 className="text-2xl font-bold">Vocabulary</h1>
			</div>

			{!selectedThai && (
				<>
					{/* Word-class tabs */}
					<div
						className="flex gap-1 rounded-xl p-1 overflow-x-auto"
						style={{ background: "var(--color-surface-2)" }}
					>
						{tabs.map(({ key, label, count }) => (
							<button
								type="button"
								key={key}
								onClick={() => setClassFilter(key)}
								className="flex-shrink-0 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
								style={
									classFilter === key
										? {
												background: "var(--color-surface)",
												color: "var(--color-text)",
												boxShadow:
													"0 1px 3px color-mix(in srgb, var(--color-text) 10%, transparent)",
											}
										: { color: "var(--color-text-muted)" }
								}
							>
								{label}{" "}
								<span
									className="text-xs"
									style={{ color: "var(--color-text-muted)" }}
								>
									({count})
								</span>
							</button>
						))}
					</div>

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
					<WordCard word={selectedEntry} />
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
