/**
 * Page-level render-test harness — the first in this repository.
 *
 * Importing this module registers the environment repairs every page-level
 * render test needs and that no global vitest config provides (see
 * CONTEXT.md):
 *
 * - an explicit `afterEach(cleanup)` — there is no `globals: true` /
 *   `setupFiles`, so Testing-Library's auto-cleanup never registers;
 * - a hand-built `localStorage` on `globalThis` — jsdom under vitest 4 in
 *   this repo leaves it undefined (Node's own experimental global
 *   conflicts), so tests stub a Storage-shaped fake instead;
 * - a stubbed `Audio` constructor that records constructed URLs (jsdom's
 *   `HTMLMediaElement.play` throws synchronously) plus prototype stubs for
 *   `play`/`pause` for any real media element;
 * - a stubbed `HTMLCanvasElement.getContext` returning a shared recording
 *   2D context (jsdom has none without the `canvas` package), which also
 *   lets tests observe `clearRect` calls.
 *
 * Test files still need their own `// @vitest-environment jsdom` docblock —
 * the pragma only works in the test file itself.
 */
import { cleanup, type RenderResult, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, vi } from "vitest";
import { ConductReviewUseCase } from "../../application/use-cases/ConductReviewUseCase";
import { ManageDataUseCase } from "../../application/use-cases/ManageDataUseCase";
import { ManageItemsUseCase } from "../../application/use-cases/ManageItemsUseCase";
import { PlayGameUseCase } from "../../application/use-cases/PlayGameUseCase";
import { QueryDashboardUseCase } from "../../application/use-cases/QueryDashboardUseCase";
import { StartLessonUseCase } from "../../application/use-cases/StartLessonUseCase";
import type { GameHistoryRepository } from "../../domain/game/ports/GameHistoryRepository";
import { GameItemSelectionService } from "../../domain/game/services/GameItemSelectionService";
import { SentenceGameItemSource } from "../../domain/game/services/SentenceGameItemSource";
import { SymbolGameItemSource } from "../../domain/game/services/SymbolGameItemSource";
import { normalizeRequestedCount } from "../../domain/game/services/sampling";
import { ToneGameItemSource } from "../../domain/game/services/ToneGameItemSource";
import { WordGameItemSource } from "../../domain/game/services/WordGameItemSource";
import type {
	GameHistoryEntry,
	GameItem,
	GameRoundConfig,
	SymbolChallengeDirection,
	SymbolItemContent,
} from "../../domain/game/types";
import grammarData from "../../domain/grammar/data/grammar.json";
import { GrammarService } from "../../domain/grammar/services/GrammarLessonService";
import type { GrammarEntry } from "../../domain/grammar/types";
import { ScriptPropertyCard } from "../../domain/script/entities/ScriptPropertyCard";
import { LearningService } from "../../domain/script/services/ScriptLessonService";
import sentenceData from "../../domain/sentence/data/sentences.json";
import { SentenceReviewCard } from "../../domain/sentence/entities/SentenceReviewCard";
import { SentenceService } from "../../domain/sentence/services/SentenceLessonService";
import type { SentenceEntry } from "../../domain/sentence/types";
import { ReviewService } from "../../domain/session/services/ReviewService";
import { ApprenticeService } from "../../domain/shared/services/ApprenticeService";
import { LeechService } from "../../domain/shared/services/LeechService";
import vocabularyData from "../../domain/vocabulary/data/vocabulary.json";
import { VocabCard } from "../../domain/vocabulary/entities/VocabCard";
import { toneSyllablesOf } from "../../domain/vocabulary/services/toneSyllables";
import { VocabularyService } from "../../domain/vocabulary/services/VocabularyLessonService";
import type { VocabEntry } from "../../domain/vocabulary/types";
import { NotificationScheduler } from "../../infrastructure/notifications/NotificationScheduler";
import {
	InMemoryJsonStore,
	type JsonStore,
	type JsonStoreLoadResult,
	type JsonStoreSaveResult,
} from "../../infrastructure/persistence/JsonStore";
import { InMemoryStorage } from "../../infrastructure/persistence/Storage";
import { StorageCardRepository } from "../../infrastructure/persistence/StorageCardRepository";
import { StorageGameHistoryRepository } from "../../infrastructure/persistence/StorageGameHistoryRepository";
import { StorageLearnerStateRepository } from "../../infrastructure/persistence/StorageLearnerStateRepository";
import { AppContext, type AppContextValue } from "../context/AppContext";

// --- localStorage fake (jsdom's own is unreliable here, see module docs) ---

export class FakeLocalStorage implements Storage {
	private store = new Map<string, string>();

	get length(): number {
		return this.store.size;
	}

	clear(): void {
		this.store.clear();
	}

	getItem(key: string): string | null {
		return this.store.has(key) ? (this.store.get(key) as string) : null;
	}

	key(index: number): string | null {
		return Array.from(this.store.keys())[index] ?? null;
	}

	removeItem(key: string): void {
		this.store.delete(key);
	}

	setItem(key: string, value: string): void {
		this.store.set(key, value);
	}
}

let fakeLocalStorage = new FakeLocalStorage();

/** The per-test `localStorage` stand-in installed on `globalThis`. */
export function getFakeLocalStorage(): FakeLocalStorage {
	return fakeLocalStorage;
}

// --- Audio stub (jsdom throws synchronously from `play()`) ---

export class StubAudio {
	static createdUrls: string[] = [];
	currentTime = 0;

	constructor(readonly src?: string) {
		StubAudio.createdUrls.push(src ?? "");
	}

	play(): Promise<void> {
		return Promise.resolve();
	}

	pause(): void {}
}

/** URLs passed to `new Audio(url)` since the current test began. */
export function createdAudioUrls(): readonly string[] {
	return StubAudio.createdUrls;
}

// --- Canvas 2D stub (jsdom has no 2D context without the canvas package) ---

export const canvas2d = {
	clearRect: vi.fn(),
	beginPath: vi.fn(),
	moveTo: vi.fn(),
	lineTo: vi.fn(),
	stroke: vi.fn(),
	lineCap: "round",
	lineJoin: "round",
	lineWidth: 4,
	strokeStyle: "",
};

beforeEach(() => {
	fakeLocalStorage = new FakeLocalStorage();
	globalThis.localStorage = fakeLocalStorage;
	globalThis.Audio = StubAudio as unknown as typeof Audio;
	StubAudio.createdUrls = [];
	canvas2d.clearRect.mockClear();
	canvas2d.beginPath.mockClear();
	canvas2d.moveTo.mockClear();
	canvas2d.lineTo.mockClear();
	canvas2d.stroke.mockClear();
	if (typeof HTMLMediaElement !== "undefined") {
		HTMLMediaElement.prototype.play = () => Promise.resolve();
		HTMLMediaElement.prototype.pause = () => {};
	}
	if (typeof HTMLCanvasElement !== "undefined") {
		HTMLCanvasElement.prototype.getContext = (() =>
			canvas2d) as unknown as HTMLCanvasElement["getContext"];
	}
});

afterEach(() => {
	cleanup();
	Reflect.deleteProperty(globalThis, "localStorage");
});

// --- Fixtures ---

const DEFAULT_SRS = {
	easeFactor: 2.0,
	interval: 10,
	repetitions: 0,
	learningStep: 1,
	nextReviewDate: "2026-01-01T00:00:00.000Z",
	lastReviewDate: null,
	lapseCount: 0,
};

/**
 * One script card for `symbolCharacter` — enough to make that symbol
 * eligible (eligibility is card-driven; content still comes from
 * `symbols.ts`, so pass characters that exist there, e.g. "ม", "น", "ง").
 */
export function makeScriptCard(symbolCharacter: string): ScriptPropertyCard {
	return ScriptPropertyCard.fromDTO({
		id: `${symbolCharacter}-recognition`,
		question: `What sound does ${symbolCharacter} make?`,
		correctAnswer: "answer",
		choices: ["answer", "other"],
		srs: { ...DEFAULT_SRS },
		symbolCharacter,
		property: "recognition",
		lessonNumber: 1,
	});
}

/**
 * A script card with an explicit SRS history — for weighting/weak-item tests.
 */
export function scriptCardWith(
	symbolCharacter: string,
	easeFactor: number,
	lapseCount: number,
	repetitions: number,
): ScriptPropertyCard {
	return ScriptPropertyCard.fromDTO({
		id: `${symbolCharacter}-recognition`,
		question: "question",
		correctAnswer: "answer",
		choices: ["answer"],
		srs: {
			easeFactor,
			interval: 10,
			repetitions,
			learningStep: null,
			nextReviewDate: "2026-01-01T00:00:00.000Z",
			lastReviewDate: "2026-01-01T00:00:00.000Z",
			lapseCount,
		},
		symbolCharacter,
		property: "recognition",
		lessonNumber: 1,
	});
}

/**
 * One sentence review card for `sentenceId` — enough to make that sentence
 * eligible (eligibility is card-driven; content still comes from
 * `sentences.json`, so pass ids that exist there, e.g. "basic-001").
 */
export function makeSentenceCard(sentenceId: string): SentenceReviewCard {
	return SentenceReviewCard.fromDTO({
		id: `sentence:${sentenceId}:readingComprehension`,
		question: `question for ${sentenceId}`,
		correctAnswer: "answer",
		choices: ["answer", "other"],
		srs: { ...DEFAULT_SRS },
		sentenceId,
		property: "readingComprehension",
	});
}

/**
 * One `toneIdentification` vocab card for `thai` — enough to make that word
 * eligible for tone practice (eligibility is card-driven; the item's
 * content still comes from the matching `VocabEntry`, so pass Thai words
 * that exist in `vocabulary.json`, e.g. "ที่", "ได้", "จะ", "นี้").
 *
 * The card carries the word's real syllables, exactly as
 * `VocabCardGenerator` writes them, so a fixture can never accidentally
 * prove more than production does — but nothing reads them: a card
 * persisted before that field existed has `syllables === undefined`, which
 * is why `ToneGameItemSource` sources its content from the entry instead
 * (see CONTEXT.md).
 */
export function makeToneVocabCard(thai: string): VocabCard {
	const entry = (vocabularyData as VocabEntry[]).find(
		(word) => word.thai === thai,
	);
	if (!entry) {
		throw new Error(`no vocabulary entry for "${thai}"`);
	}
	return VocabCard.fromDTO({
		id: `vocab:${thai}:toneIdentification`,
		question: `What is the tone pattern of ${thai}?`,
		correctAnswer: "answer",
		choices: ["answer", "other"],
		srs: { ...DEFAULT_SRS },
		promptWord: thai,
		property: "toneIdentification",
		syllables: toneSyllablesOf(entry),
	});
}

/** A `GameItem` with a pre-assigned direction, for fixed-round tests. */
export function makeSymbolItem(
	symbolCharacter: string,
	challengeDirection: SymbolChallengeDirection,
	overrides: Partial<Omit<SymbolItemContent, "kind">> = {},
): GameItem {
	return {
		kind: "symbol",
		symbolCharacter,
		promptText: symbolCharacter,
		correctAnswer: `${symbolCharacter} name`,
		audioUrl: `/audio/${symbolCharacter}.mp3`,
		...overrides,
		challengeDirection,
	};
}

/** A persisted history entry, for seeding history stores. */
export function makeHistoryEntry(
	overrides: Partial<GameHistoryEntry> = {},
): GameHistoryEntry {
	return {
		kind: "practice",
		id: "entry-1",
		playedAt: "2026-09-01T10:00:00.000Z",
		pools: ["script"],
		itemCount: 4,
		summary: {
			ratingCounts: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 1 },
			ratedCount: 4,
			accuracy: 75,
		},
		...overrides,
	};
}

/** A `JsonStore` whose every load reports corrupt — the unavailable case. */
export class CorruptJsonStore<T> implements JsonStore<T> {
	load(): JsonStoreLoadResult<T> {
		return { status: "corrupt" };
	}

	save(): JsonStoreSaveResult {
		return { status: "ok" };
	}
}

// --- Game use-case factories ---

export interface MakeGameOptions {
	symbols?: readonly string[];
	historyStore?: JsonStore<GameHistoryEntry[]>;
}

/** A real `PlayGameUseCase` over in-memory persistence. */
export function makeGame(options: MakeGameOptions = {}): PlayGameUseCase {
	const cardRepo = new StorageCardRepository(new InMemoryStorage());
	cardRepo.saveAll((options.symbols ?? []).map(makeScriptCard));
	return new PlayGameUseCase(
		new GameItemSelectionService([new SymbolGameItemSource(cardRepo)]),
		new StorageGameHistoryRepository(
			options.historyStore ?? new InMemoryJsonStore<GameHistoryEntry[]>(),
		),
		// No composition rounds from this factory: it wires one symbol source
		// and no grammar, so an empty unlocked set is the honest answer.
		() => [],
	);
}

class FixedRoundGame extends PlayGameUseCase {
	constructor(
		private readonly fixedItems: readonly GameItem[],
		selection: GameItemSelectionService,
		historyRepository: GameHistoryRepository,
	) {
		super(selection, historyRepository, () => []);
	}

	override startRound(config: GameRoundConfig): GameItem[] {
		return this.fixedRound(config.itemCount);
	}

	/**
	 * Composition rounds are fixed the same way practice rounds are, so a
	 * page test can drive either mode from one list of pre-built items.
	 */
	override startCompositionRound(count: number): GameItem[] {
		return this.fixedRound(count);
	}

	private fixedRound(count: number): GameItem[] {
		return this.fixedItems.slice(
			0,
			normalizeRequestedCount(count, this.fixedItems.length),
		);
	}
}

/**
 * A `PlayGameUseCase` whose rounds are exactly `items`, in order, with the
 * directions the test pre-assigned — everything else (rating, finishing,
 * history) stays real.
 */
export function makeFixedRoundGame(
	items: readonly GameItem[],
	options: Pick<MakeGameOptions, "historyStore"> = {},
): { game: PlayGameUseCase; historyStore: JsonStore<GameHistoryEntry[]> } {
	const historyStore =
		options.historyStore ?? new InMemoryJsonStore<GameHistoryEntry[]>();
	const cardRepo = new StorageCardRepository(new InMemoryStorage());
	const game = new FixedRoundGame(
		items,
		new GameItemSelectionService([new SymbolGameItemSource(cardRepo)]),
		new StorageGameHistoryRepository(historyStore),
	);
	return { game, historyStore };
}

// --- The harness itself ---

export interface AppHarness {
	value: AppContextValue;
	storage: InMemoryStorage;
	cardRepo: StorageCardRepository;
	historyStore: InMemoryJsonStore<GameHistoryEntry[]>;
	game: PlayGameUseCase;
}

export interface MakeAppValueOptions {
	/** Characters (existing in `symbols.ts`) to seed one script card each for. */
	symbols?: readonly string[];
	/** Sentence ids (existing in `sentences.json`) to seed one card each for. */
	sentences?: readonly string[];
	/**
	 * Thai words (existing in `vocabulary.json`) to seed one
	 * `toneIdentification` card each for — what makes a word eligible for
	 * tone practice.
	 */
	toneWords?: readonly string[];
}

/**
 * A complete in-memory `AppContextValue`: every use case and service the
 * real `AppContext.tsx` wires, built over `InMemoryStorage` instead of
 * `localStorage`, plus a real `PlayGameUseCase` over an in-memory history
 * store. `refresh` and `checkAchievements` are inert stubs — pass overrides
 * if a test needs either to be observable.
 */
export function makeAppValue(options: MakeAppValueOptions = {}): AppHarness {
	const storage = new InMemoryStorage();
	const cardRepo = new StorageCardRepository(storage);
	const stateRepo = new StorageLearnerStateRepository(storage);
	const apprenticeService = new ApprenticeService(cardRepo);
	const leechService = new LeechService(cardRepo);
	const learningService = new LearningService(
		cardRepo,
		stateRepo,
		apprenticeService,
	);
	const reviewService = new ReviewService(cardRepo, stateRepo);
	const vocabularyService = new VocabularyService(
		cardRepo,
		stateRepo,
		vocabularyData as VocabEntry[],
	);
	const grammarService = new GrammarService(
		cardRepo,
		grammarData as unknown as GrammarEntry[],
		apprenticeService,
		vocabularyData as VocabEntry[],
	);
	const sentenceService = new SentenceService(
		cardRepo,
		sentenceData as unknown as SentenceEntry[],
		vocabularyService,
		apprenticeService,
	);

	cardRepo.saveAll((options.symbols ?? []).map(makeScriptCard));
	cardRepo.saveAll((options.sentences ?? []).map(makeSentenceCard));
	cardRepo.saveAll((options.toneWords ?? []).map(makeToneVocabCard));

	const historyStore = new InMemoryJsonStore<GameHistoryEntry[]>();
	// Register every source the real `AppContext.tsx` registers — a harness
	// that registers a subset silently diverges from production per pool
	// (see task 1.3), which is how "works in the harness, empty in the app"
	// bugs are born.
	const game = new PlayGameUseCase(
		new GameItemSelectionService(
			[
				new SymbolGameItemSource(cardRepo),
				new WordGameItemSource(cardRepo, vocabularyData as VocabEntry[]),
				new SentenceGameItemSource(
					cardRepo,
					sentenceData as unknown as SentenceEntry[],
				),
			],
			cardRepo,
			new ToneGameItemSource(cardRepo, vocabularyData as VocabEntry[]),
		),
		new StorageGameHistoryRepository(historyStore),
		// The real `GrammarService`, exactly as `AppContext.tsx` wires it — a
		// harness that stubs this diverges from production on the one
		// question composition mode asks (see task 1.3's own note above).
		() => grammarService.getUnlockedGrammarPoints(),
	);

	const value: AppContextValue = {
		state: storage.load(),
		refresh: () => {},
		lesson: new StartLessonUseCase(
			learningService,
			vocabularyService,
			grammarService,
			sentenceService,
		),
		review: new ConductReviewUseCase(
			reviewService,
			new NotificationScheduler(),
		),
		dashboard: new QueryDashboardUseCase(
			cardRepo,
			apprenticeService,
			leechService,
		),
		data: new ManageDataUseCase(stateRepo),
		items: new ManageItemsUseCase(cardRepo),
		vocab: vocabularyService,
		checkAchievements: () => [],
		game,
	};

	return { value, storage, cardRepo, historyStore, game };
}

export interface RenderWithAppOptions extends MakeAppValueOptions {
	/** Initial router entry, default `/`. */
	route?: string;
}

/**
 * Renders `ui` inside `<AppContext.Provider>` (a fresh in-memory
 * `AppContextValue`, with `overrides` merged in) and a `MemoryRouter`.
 * Returns Testing-Library's render result plus the harness internals.
 */
export function renderWithApp(
	ui: ReactElement,
	overrides: Partial<AppContextValue> = {},
	options: RenderWithAppOptions = {},
): RenderResult & { app: AppHarness } {
	const app = makeAppValue({
		symbols: options.symbols,
		sentences: options.sentences,
		toneWords: options.toneWords,
	});
	const value: AppContextValue = { ...app.value, ...overrides };
	const result = render(
		<AppContext.Provider value={value}>
			<MemoryRouter initialEntries={[options.route ?? "/"]}>{ui}</MemoryRouter>
		</AppContext.Provider>,
	);
	return Object.assign(result, { app: { ...app, value, game: value.game } });
}
