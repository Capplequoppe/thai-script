# Vocabulary List Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/vocab` page that shows all learned vocabulary words in a tappable grid with dynamic word-class tabs and a full dictionary-style detail card.

**Architecture:** `VocabularyService.getLearnedEntries()` joins stored card wordThais against the full vocabulary JSON to return rich `VocabEntry` data. The new `VocabListPage` at `/vocab` consumes this via `useApp().vocab`. The Items page vocab tab navigates to `/vocab` instead of rendering an inline grid.

**Tech Stack:** React + TypeScript, React Router, Vitest, Biome. All colors via `var(--color-*)` tokens.

---

## Verification command (run after each task)

```bash
pnpm tsc --noEmit && pnpm biome check src/ && pnpm vitest run
```

Expected: 0 TypeScript errors, 0 Biome errors (excluding pre-existing shadcn/ui files), 430+ tests pass.

---

## Task 1: Add `getLearnedEntries()` to VocabularyService

**Files:**
- Modify: `src/domain/vocabulary/services/VocabularyLessonService.ts`
- Test: `src/domain/vocabulary/services/VocabularyLessonService.test.ts`

**Step 1: Write the failing test**

In `VocabularyLessonService.test.ts`, add inside the existing `describe("VocabularyService", ...)` block:

```ts
it("getLearnedEntries returns full VocabEntry for learned words sorted by rank", () => {
	const vocabulary = [
		makeEntry({ thai: "มา", rank: 1, english: "to come" }),
		makeEntry({
			thai: "นา",
			characters: ["น", "า"],
			rank: 2,
			english: "rice field",
		}),
	];
	const service = new VocabularyService(cardRepo, stateRepo, vocabulary);

	const state = storage.load();
	state.completedLessons = [1, 2];
	storage.save(state);

	expect(service.getLearnedEntries()).toHaveLength(0); // none learned yet

	service.startLesson();

	const entries = service.getLearnedEntries();
	expect(entries).toHaveLength(2);
	expect(entries[0]?.thai).toBe("มา");
	expect(entries[1]?.thai).toBe("นา");
});

it("getLearnedEntries returns empty array when no cards exist", () => {
	const vocabulary = [makeEntry()];
	const service = new VocabularyService(cardRepo, stateRepo, vocabulary);
	expect(service.getLearnedEntries()).toHaveLength(0);
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/domain/vocabulary/services/VocabularyLessonService.test.ts
```

Expected: FAIL — `getLearnedEntries is not a function`

**Step 3: Add `getLearnedEntries()` to VocabularyLessonService**

In `src/domain/vocabulary/services/VocabularyLessonService.ts`, add after `getLearnedCount()`:

```ts
/** Full VocabEntry for every word the learner has cards for, sorted by rank. */
getLearnedEntries(): VocabEntry[] {
	const vocabCards = this.cardRepo.findAll("vocab");
	const learnedThaiWords = new Set(
		vocabCards.map((c) => (c as VocabCard).wordThai),
	);
	return this.vocabulary
		.filter((entry) => learnedThaiWords.has(entry.thai))
		.sort(
			(a, b) =>
				(a.rank ?? Number.POSITIVE_INFINITY) -
				(b.rank ?? Number.POSITIVE_INFINITY),
		);
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/domain/vocabulary/services/VocabularyLessonService.test.ts
```

Expected: PASS — all tests including the 2 new ones

**Step 5: Commit**

```bash
git add src/domain/vocabulary/services/VocabularyLessonService.ts \
        src/domain/vocabulary/services/VocabularyLessonService.test.ts
git commit -m "feat(vocab): add getLearnedEntries to VocabularyService"
```

---

## Task 2: Expose `vocab` on AppContextValue

**Files:**
- Modify: `src/presentation/context/AppContext.tsx`

**Step 1: Add `vocab` to the interface and value**

In `AppContext.tsx`, find the `AppContextValue` interface and add one line:

```ts
// Before
export interface AppContextValue {
	state: LearnerState;
	refresh: () => void;
	lesson: StartLessonUseCase;
	review: ConductReviewUseCase;
	dashboard: QueryDashboardUseCase;
	data: ManageDataUseCase;
	checkAchievements: (summary: SessionSummary) => string[];
}

// After
export interface AppContextValue {
	state: LearnerState;
	refresh: () => void;
	lesson: StartLessonUseCase;
	review: ConductReviewUseCase;
	dashboard: QueryDashboardUseCase;
	data: ManageDataUseCase;
	vocab: VocabularyService;
	checkAchievements: (summary: SessionSummary) => string[];
}
```

Then find the `useMemo<AppContextValue>` call and add `vocab: vocabularyService`:

```ts
const value = useMemo<AppContextValue>(
	() => ({
		state,
		refresh,
		lesson: lessonUseCase,
		review: reviewUseCase,
		dashboard: dashboardUseCase,
		data: dataUseCase,
		vocab: vocabularyService,
		checkAchievements,
	}),
	[state, refresh, checkAchievements],
);
```

Note: `vocabularyService` is already instantiated at the module level in this file — no new imports needed.

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

Expected: 0 errors

**Step 3: Commit**

```bash
git add src/presentation/context/AppContext.tsx
git commit -m "feat(context): expose vocabularyService as vocab on AppContext"
```

---

## Task 3: Create VocabListPage

**Files:**
- Create: `src/presentation/pages/VocabListPage.tsx`

**Step 1: Create the file**

```tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { SectionHeader } from "../components/atoms/SectionHeader";
import { StageBadge } from "../components/molecules/StageBadge";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import type { VocabEntry } from "../../domain/vocabulary/types";
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
	return word_class || OTHER_KEY;
}

// ---------------------------------------------------------------------------
// Detail card
// ---------------------------------------------------------------------------

function VocabDetailCard({
	entry,
	stage,
}: {
	entry: VocabEntry;
	stage: string;
}) {
	return (
		<div className="space-y-6">
			{/* Thai word + audio */}
			<div className="text-center space-y-1">
				<div className="flex items-center justify-center gap-3">
					<span className="thai text-6xl">{entry.thai}</span>
					{entry.thai_audio_file && (
						<button
							type="button"
							onClick={() =>
								new Audio(entry.thai_audio_file!).play().catch(() => {})
							}
							className="text-2xl opacity-60 hover:opacity-100 transition-opacity"
							aria-label="Play Thai pronunciation"
						>
							🔊
						</button>
					)}
				</div>
				<p
					className="text-sm"
					style={{ color: "var(--color-text-muted)" }}
				>
					{entry.romanization}
				</p>
			</div>

			{/* Badges */}
			<div className="flex gap-2 justify-center flex-wrap">
				{entry.word_class && (
					<span
						className="text-sm px-3 py-1 rounded-full"
						style={{
							background:
								"color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))",
							color: "var(--color-primary)",
						}}
					>
						{WORD_CLASS_LABELS[entry.word_class] ?? entry.word_class}
					</span>
				)}
				<StageBadge stage={stage} />
			</div>

			{/* English meaning */}
			<p className="text-xl text-center font-semibold">{entry.english}</p>

			{/* Image */}
			{entry.image_file && (
				<img
					src={entry.image_file}
					alt={entry.english}
					className="w-full rounded-xl object-cover max-h-48"
				/>
			)}

			{/* Sample sentences */}
			{entry.samples.length > 0 && (
				<div className="space-y-3">
					<SectionHeader>Sample Sentences</SectionHeader>
					{entry.samples.slice(0, 3).map((s) => (
						<div
							key={s.thai}
							className="rounded-xl p-4 space-y-1"
							style={{ background: "var(--color-surface-2)" }}
						>
							<div className="flex items-center gap-2">
								<span className="thai text-lg">{s.thai}</span>
								{s.thai_audio_file && (
									<button
										type="button"
										onClick={() =>
											new Audio(s.thai_audio_file!).play().catch(() => {})
										}
										className="text-sm opacity-60 hover:opacity-100"
										aria-label="Play sample sentence"
									>
										🔊
									</button>
								)}
							</div>
							<p
								className="text-sm"
								style={{ color: "var(--color-text-muted)" }}
							>
								{s.romanization}
							</p>
							<p className="text-sm">{s.english}</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function VocabListPage() {
	const { vocab, state } = useApp();
	const navigate = useNavigate();
	const [classFilter, setClassFilter] = useState<string>("all");
	const [selectedThai, setSelectedThai] = useState<string | null>(null);

	const learnedEntries = useMemo(
		() => vocab.getLearnedEntries(),
		// Re-derive when vocab cards change
		// biome-ignore lint/correctness/useExhaustiveDependencies: vocab is stable; vocabCards drives re-computation
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
		// Known classes in priority order
		for (const cls of CLASS_ORDER) {
			if (present.has(cls)) {
				result.push({
					key: cls,
					label: WORD_CLASS_LABELS[cls] ?? cls,
					count: classCounts.get(cls) ?? 0,
				});
			}
		}
		// Any unknown classes not in CLASS_ORDER
		for (const key of present) {
			if (key !== OTHER_KEY && !CLASS_ORDER.includes(key)) {
				result.push({
					key,
					label: WORD_CLASS_LABELS[key] ?? key,
					count: classCounts.get(key) ?? 0,
				});
			}
		}
		// Other last
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
					←{" "}
					{selectedThai ? "Back to list" : "Back"}
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
									<span
										role="button"
										tabIndex={-1}
										onClick={(e) => {
											e.stopPropagation();
											new Audio(entry.thai_audio_file!).play().catch(() => {});
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.stopPropagation();
												new Audio(entry.thai_audio_file!).play().catch(() => {});
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
				<VocabDetailCard
					entry={selectedEntry}
					stage={getWordStage(selectedEntry.thai)}
				/>
			)}
		</div>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/pages/VocabListPage.tsx
```

Expected: 0 errors. Fix any Biome formatting issues with `pnpm biome check --write src/presentation/pages/VocabListPage.tsx`.

**Step 3: Commit**

```bash
git add src/presentation/pages/VocabListPage.tsx
git commit -m "feat(pages): add VocabListPage with word-class tabs and dictionary detail"
```

---

## Task 4: Wire up route and update Items page vocab tab

**Files:**
- Modify: `src/presentation/App.tsx`
- Modify: `src/presentation/pages/LearnedItemsPage.tsx`

**Step 1: Add route in App.tsx**

In `src/presentation/App.tsx`:

Add import:
```tsx
import { VocabListPage } from "./pages/VocabListPage";
```

Add route inside `<Route element={<Layout />}>`, before the `path="*"` catch-all:
```tsx
<Route path="/vocab" element={<VocabListPage />} />
```

**Step 2: Update LearnedItemsPage vocab tab**

In `src/presentation/pages/LearnedItemsPage.tsx`:

Add import at the top:
```tsx
import { useNavigate } from "react-router";
```

Add inside the component function (after `const [selectedIdx, setSelectedIdx] = useState...`):
```tsx
const navigate = useNavigate();
```

Find the tab button's `onClick` handler — currently all tabs use the same handler:
```tsx
onClick={() => {
    setTab(key);
    setSelectedIdx(null);
}}
```

Replace with a handler that navigates for the vocab tab:
```tsx
onClick={() => {
    if (key === "vocabulary") {
        navigate("/vocab");
        return;
    }
    setTab(key);
    setSelectedIdx(null);
}}
```

Remove the inline vocabulary grid section (find and delete this block):
```tsx
{selectedIdx === null && tab === "vocabulary" && (
    <div className="grid grid-cols-3 gap-2">
        {vocabWords.map((w) => (
            <div
                key={w.thai}
                ...
            >
                ...
            </div>
        ))}
    </div>
)}
```

Also remove the `vocabWords` useMemo (lines ~124–143) since the data is no longer shown here — it's used only for the tab count. Keep the count but derive it differently:

Replace the `vocabWords` useMemo with a simpler count:
```tsx
const vocabWordCount = useMemo(() => {
    const seen = new Set<string>();
    for (const card of Object.values(state.vocabCards)) {
        seen.add(card.wordThai);
    }
    return seen.size;
}, [state.vocabCards]);
```

Update the tabs array:
```tsx
{ key: "vocabulary", label: "Vocab", count: vocabWordCount },
```

**Step 3: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/App.tsx src/presentation/pages/LearnedItemsPage.tsx
```

Expected: 0 errors.

**Step 4: Run all tests**

```bash
pnpm vitest run
```

Expected: 430+ tests pass (no regressions).

**Step 5: Commit**

```bash
git add src/presentation/App.tsx src/presentation/pages/LearnedItemsPage.tsx
git commit -m "feat(nav): wire /vocab route and update Items page vocab tab to navigate"
```

---

## Final verification

```bash
pnpm tsc --noEmit && pnpm biome check src/ && pnpm vitest run
```

Expected: 0 TypeScript errors, 432 tests pass (430 original + 2 new for `getLearnedEntries`).
