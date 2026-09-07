import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { GrammarCard } from "../../domain/grammar/types";
import type { SentenceProperty } from "../../domain/sentence/types";
import type { CardPool } from "../../domain/shared/CardPool";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import type { VocabProperty } from "../../domain/vocabulary/types";
import { SectionHeader } from "../components/atoms/SectionHeader";
import { StageBadge } from "../components/molecules/StageBadge";
import {
	type ItemCard,
	StageOverrideSheet,
} from "../components/organisms/StageOverrideSheet";
import { useApp } from "../hooks/useApp";
import { withDottedCircles } from "../utils/thaiText";
import { propertyLabel } from "./LearnedItemsPage";

const STAGE_ORDER = ["Apprentice", "Guru", "Master", "Enlightened", "Burned"];

const CARD_POOL_ORDER: CardPool[] = ["script", "vocab", "grammar", "sentence"];

const POOL_TITLES: Record<CardPool, string> = {
	script: "Script",
	vocab: "Vocabulary",
	grammar: "Grammar",
	sentence: "Sentences",
};

const VOCAB_PROPERTY_LABELS: Record<VocabProperty, string> = {
	thaiToEnglish: "Thai → English",
	englishToThai: "English → Thai",
	audioRecognition: "Listening",
	toneIdentification: "Tone",
	spelling: "Spelling",
	spellingFromAudio: "Spelling (Audio)",
};

const GRAMMAR_PROPERTY_LABELS: Record<GrammarCard["property"], string> = {
	recognition: "Recognition",
	application: "Application",
};

const SENTENCE_PROPERTY_LABELS: Record<SentenceProperty, string> = {
	listeningComprehension: "Listening",
	readingComprehension: "Reading",
	sentenceBuilding: "Sentence Building",
	selfValidation: "Self Check",
};

function propertyLabelForPool(pool: CardPool, property: string): string {
	if (pool === "script") return propertyLabel(property);
	if (pool === "vocab")
		return VOCAB_PROPERTY_LABELS[property as VocabProperty] ?? property;
	if (pool === "grammar")
		return (
			GRAMMAR_PROPERTY_LABELS[property as GrammarCard["property"]] ?? property
		);
	return SENTENCE_PROPERTY_LABELS[property as SentenceProperty] ?? property;
}

interface StageCard {
	id: string;
	property: string;
	srs: { learningStep: number | null; interval: number };
}

interface StageItem {
	key: string;
	pool: CardPool;
	label: string;
	sub?: string;
	isThai: boolean;
	cards: StageCard[];
}

function representativeStage(cards: StageCard[]): SrsStage {
	if (cards.length === 0) return SrsStage.APPRENTICE;
	const stages = cards.map((c) =>
		SrsStage.fromScheduleData(c.srs.learningStep, c.srs.interval),
	);
	return stages.reduce((best, current) =>
		STAGE_ORDER.indexOf(current.name) > STAGE_ORDER.indexOf(best.name)
			? current
			: best,
	);
}

export function StageItemsPage() {
	const { state, lesson, vocab, items, refresh } = useApp();
	const navigate = useNavigate();
	const { stage } = useParams<{ stage: string }>();
	const [selected, setSelected] = useState<{
		pool: CardPool;
		key: string;
	} | null>(null);
	const [overrideOpen, setOverrideOpen] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: lesson is a stable service; completedLessons/cards changing drives re-computation
	const scriptGroups = useMemo(() => {
		const labels = new Map<string, string>();
		for (const lessonNum of [...state.completedLessons].sort((a, b) => a - b)) {
			const summary = lesson.getScriptSummary(lessonNum);
			for (const s of [
				...summary.consonants,
				...summary.vowels,
				...summary.toneMarks,
			]) {
				labels.set(s.character, s.name);
			}
		}
		const groups = new Map<string, StageItem>();
		for (const card of Object.values(state.cards)) {
			const existing = groups.get(card.symbolCharacter);
			if (existing) {
				existing.cards.push(card);
				continue;
			}
			groups.set(card.symbolCharacter, {
				key: card.symbolCharacter,
				pool: "script",
				label: card.symbolCharacter,
				sub: labels.get(card.symbolCharacter),
				isThai: true,
				cards: [card],
			});
		}
		return groups;
	}, [state.completedLessons, state.cards]);

	const vocabGroups = useMemo(() => {
		const entries = vocab.getLearnedEntries();
		const labels = new Map(entries.map((e) => [e.thai, e.english]));
		const groups = new Map<string, StageItem>();
		for (const card of Object.values(state.vocabCards)) {
			const existing = groups.get(card.promptWord);
			if (existing) {
				existing.cards.push(card);
				continue;
			}
			groups.set(card.promptWord, {
				key: card.promptWord,
				pool: "vocab",
				label: card.promptWord,
				sub: labels.get(card.promptWord),
				isThai: true,
				cards: [card],
			});
		}
		return groups;
	}, [vocab, state.vocabCards]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: lesson is a stable service; grammarCards changing drives re-computation
	const grammarGroups = useMemo(() => {
		const groups = new Map<string, StageItem>();
		for (const card of Object.values(state.grammarCards)) {
			const existing = groups.get(card.grammarId);
			if (existing) {
				existing.cards.push(card);
				continue;
			}
			const entry = lesson.getGrammarEntry(card.grammarId);
			groups.set(card.grammarId, {
				key: card.grammarId,
				pool: "grammar",
				label: entry?.title ?? card.grammarId,
				sub: entry?.pattern,
				isThai: false,
				cards: [card],
			});
		}
		return groups;
	}, [state.grammarCards]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: lesson is a stable service; sentenceCards changing drives re-computation
	const sentenceGroups = useMemo(() => {
		const groups = new Map<string, StageItem>();
		for (const card of Object.values(state.sentenceCards)) {
			const existing = groups.get(card.sentenceId);
			if (existing) {
				existing.cards.push(card);
				continue;
			}
			const entry = lesson.getSentenceEntry(card.sentenceId);
			groups.set(card.sentenceId, {
				key: card.sentenceId,
				pool: "sentence",
				label: entry?.thai ?? card.sentenceId,
				sub: entry?.english,
				isThai: true,
				cards: [card],
			});
		}
		return groups;
	}, [state.sentenceCards]);

	const groupsByPool = useMemo(
		() => ({
			script: scriptGroups,
			vocab: vocabGroups,
			grammar: grammarGroups,
			sentence: sentenceGroups,
		}),
		[scriptGroups, vocabGroups, grammarGroups, sentenceGroups],
	);

	const sections = useMemo(() => {
		return CARD_POOL_ORDER.map((pool) => ({
			pool,
			items: [...groupsByPool[pool].values()].filter(
				(item) => representativeStage(item.cards).name === stage,
			),
		})).filter((section) => section.items.length > 0);
	}, [groupsByPool, stage]);

	const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0);

	const selectedItem = selected
		? (groupsByPool[selected.pool].get(selected.key) ?? null)
		: null;

	const overrideCards: ItemCard[] = useMemo(() => {
		if (!selectedItem) return [];
		return selectedItem.cards.map((card) => ({
			id: card.id,
			pool: selectedItem.pool,
			label: propertyLabelForPool(selectedItem.pool, card.property),
			currentStage: SrsStage.fromScheduleData(
				card.srs.learningStep,
				card.srs.interval,
			),
		}));
	}, [selectedItem]);

	if (!stage || !STAGE_ORDER.includes(stage)) {
		return (
			<div className="text-center py-16 space-y-4">
				<h1 className="text-2xl font-bold">Unknown stage</h1>
				<button
					type="button"
					onClick={() => navigate("/progress")}
					className="text-sm hover:underline"
					style={{ color: "var(--color-primary)" }}
				>
					&larr; Back to Progress
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-6 py-4">
			<button
				type="button"
				onClick={() =>
					selectedItem ? setSelected(null) : navigate("/progress")
				}
				className="text-sm hover:underline"
				style={{ color: "var(--color-primary)" }}
			>
				&larr; {selectedItem ? "Back to list" : "Back to Progress"}
			</button>

			<div className="flex items-center gap-3">
				<h1 className="text-2xl font-bold">{stage}</h1>
				<StageBadge stage={stage} />
				{!selectedItem && (
					<span
						className="text-sm"
						style={{ color: "var(--color-text-muted)" }}
					>
						{totalCount} item{totalCount === 1 ? "" : "s"}
					</span>
				)}
			</div>

			{!selectedItem && totalCount === 0 && (
				<p style={{ color: "var(--color-text-muted)" }}>
					No items are currently in this stage.
				</p>
			)}

			{!selectedItem &&
				sections.map(({ pool, items: poolItems }) => (
					<div key={pool} className="space-y-2">
						<SectionHeader className="mb-1">
							{POOL_TITLES[pool]} ({poolItems.length})
						</SectionHeader>
						<div className="space-y-1">
							{poolItems.map((item) => (
								<button
									type="button"
									key={item.key}
									onClick={() =>
										setSelected({ pool: item.pool, key: item.key })
									}
									className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-colors"
									style={{ background: "var(--color-surface-2)" }}
								>
									<div className="min-w-0">
										<div
											className={item.isThai ? "thai text-lg" : "font-semibold"}
										>
											{item.isThai ? withDottedCircles(item.label) : item.label}
										</div>
										{item.sub && (
											<div
												className="text-xs truncate"
												style={{ color: "var(--color-text-muted)" }}
											>
												{item.sub}
											</div>
										)}
									</div>
								</button>
							))}
						</div>
					</div>
				))}

			{selectedItem && (
				<div
					className="border rounded-xl p-4 space-y-4"
					style={{ borderColor: "var(--color-border)" }}
				>
					<div>
						<div
							className={
								selectedItem.isThai ? "thai text-3xl" : "text-xl font-bold"
							}
						>
							{selectedItem.isThai
								? withDottedCircles(selectedItem.label)
								: selectedItem.label}
						</div>
						{selectedItem.sub && (
							<div
								className="text-sm mt-1"
								style={{ color: "var(--color-text-muted)" }}
							>
								{selectedItem.sub}
							</div>
						)}
						<div
							className="text-xs mt-1"
							style={{ color: "var(--color-text-muted)" }}
						>
							{POOL_TITLES[selectedItem.pool]}
						</div>
					</div>
					<button
						type="button"
						onClick={() => setOverrideOpen(true)}
						className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors"
						style={{
							background:
								"color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))",
							color: "var(--color-primary)",
							border:
								"1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
						}}
					>
						Override Stage
					</button>
					<StageOverrideSheet
						open={overrideOpen}
						onClose={() => setOverrideOpen(false)}
						itemLabel={selectedItem.label}
						cards={overrideCards}
						onOverride={(id, pool, newStage) => {
							items.overrideCardStage(id, pool, newStage);
							refresh();
						}}
					/>
				</div>
			)}
		</div>
	);
}
