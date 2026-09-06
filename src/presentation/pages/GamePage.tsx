import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/presentation/components/ui/button";
import type { PlayGameUseCase } from "../../application/use-cases/PlayGameUseCase";
import type {
	GameCardPool,
	GameInputMode,
	GameItem,
	GameRatingRecord,
	GameRoundSummary as GameRoundSummaryData,
} from "../../domain/game/types";
import type { RecallRating } from "../../domain/shared/types";
import { SectionHeader } from "../components/atoms/SectionHeader";
import { GameHistoryList } from "../components/molecules/GameHistoryList";
import { GameRoundSummary } from "../components/organisms/GameRoundSummary";
import { SentenceCompositionChallenge } from "../components/organisms/SentenceCompositionChallenge";
import { SentenceListeningChallenge } from "../components/organisms/SentenceListeningChallenge";
import { SentenceReadingChallenge } from "../components/organisms/SentenceReadingChallenge";
import { SymbolDictationChallenge } from "../components/organisms/SymbolDictationChallenge";
import { SymbolReadingChallenge } from "../components/organisms/SymbolReadingChallenge";
import { ToneIdentificationChallenge } from "../components/organisms/ToneIdentificationChallenge";
import { WordDictationChallenge } from "../components/organisms/WordDictationChallenge";
import { WordProductionChallenge } from "../components/organisms/WordProductionChallenge";
import { useApp } from "../hooks/useApp";

type GamePhase = "setup" | "playing" | "summary";

/**
 * Which of the page's two flows the setup screen configures: the pool-
 * mixing practice round (everything below `checkedPools`), or a sentence-
 * composition round over currently-unlocked grammar points — a separate
 * mode, not a fourth pool, because its supply is a set-level grammar
 * computation rather than a `GameCardPool` partition (see CONTEXT.md).
 */
type GameMode = "practice" | "composition";

const ALL_MODES: readonly GameMode[] = ["practice", "composition"];

const MODE_LABELS: Record<GameMode, string> = {
	practice: "Practice",
	composition: "Sentence Composition",
};

/**
 * The setup screen's pool multi-select — one independent checkbox per
 * `GameCardPool`, in this render order. `CardPool` values stay
 * `"script"`/`"vocab"`/`"sentence"` everywhere below the UI layer (see
 * CONTEXT.md); only the labels are learner-facing.
 */
const ALL_POOLS: readonly GameCardPool[] = ["script", "vocab", "sentence"];

const POOL_LABELS: Record<GameCardPool, string> = {
	script: "Symbols",
	vocab: "Words",
	sentence: "Sentence Reading",
};

/**
 * Symbols alone — the least surprising default for anyone who has only
 * used this feature since phase 1: a repeat player's setup screen doesn't
 * silently start offering words or sentences until they choose to.
 */
const DEFAULT_CHECKED_POOLS: Readonly<Record<GameCardPool, boolean>> = {
	script: true,
	vocab: false,
	sentence: false,
};

/**
 * Three different empty states, never collapsed into one text: "you haven't
 * chosen anything yet", "you chose pools and they have nothing eligible",
 * and "you chose tone practice and it has nothing eligible" — each sends
 * the learner to a different control. With a free multi-select there is no
 * fixed set of named pool combinations, so the pool message is generic over
 * whatever subset is checked. `emptySelectionMessage` below picks between
 * them.
 */
const NO_POOLS_CHECKED_MESSAGE =
	"Select at least one pool to practice, or turn on Tone Identification.";
const NOTHING_ELIGIBLE_MESSAGE =
	"Nothing to practice yet in the selected pools — complete a lesson that introduces them first.";
/**
 * Tone practice is not a pool (see `TONE_TOGGLE_LABEL`), so "nothing in the
 * selected pools" would be a false explanation when the toggle is the only
 * thing selected — the learner would go looking at pool checkboxes they
 * never checked.
 */
const NO_TONE_ELIGIBLE_MESSAGE =
	"No words with identifiable tones yet — learn some vocabulary first, then Tone Identification will have something to draw from.";

/**
 * Composition mode's own empty state — none of the three practice messages
 * above applies, since composition has no pools and no tone toggle. It also
 * covers an unlocked grammar point whose examples carry no word breakdown
 * ("to build from" is the accurate qualifier), which
 * `selectCompositionRound` excludes for the same zero count.
 */
const NO_COMPOSITION_ELIGIBLE_MESSAGE =
	"No unlocked grammar points to build from yet — graduate more vocabulary and learn earlier grammar lessons first.";

/**
 * The one name this toggle goes by, everywhere. Never "Prioritize tone
 * identification" (see CONTEXT.md): this control *includes* items, it does
 * not reorder them — that is the separate weak-item toggle's job.
 */
const TONE_TOGGLE_LABEL = "Tone Identification";

/**
 * Which of the three setup empty states applies, or `null` when the round
 * can start.
 */
function emptySelectionMessage(
	hasPools: boolean,
	includeTonePractice: boolean,
	eligibleCount: number,
): string | null {
	if (!hasPools && !includeTonePractice) return NO_POOLS_CHECKED_MESSAGE;
	if (eligibleCount > 0) return null;
	return hasPools ? NOTHING_ELIGIBLE_MESSAGE : NO_TONE_ELIGIBLE_MESSAGE;
}

const DEFAULT_ITEM_COUNT = 10;

/**
 * Selection is a pure function, so asking for every item is a side-effect-
 * free way to learn how many are eligible — the use case exposes no
 * separate count query.
 */
function countEligibleItems(
	game: PlayGameUseCase,
	pools: readonly GameCardPool[],
	prioritizeWeakItems: boolean,
	includeTonePractice: boolean,
): number {
	return game.startRound({
		pools,
		itemCount: Number.MAX_SAFE_INTEGER,
		prioritizeWeakItems,
		inputMode: "draw",
		includeTonePractice,
	}).length;
}

/**
 * Composition mode's `countEligibleItems`: the same ask-for-everything
 * trick over `startCompositionRound`, which is read-only by construction
 * (the grammar-unlock provider is one read-only method — see
 * `PlayGameUseCase`). This is *the* named mechanism the composition setup
 * step's count hint comes from; the eligible set is often genuinely tiny
 * (one item per unlocked grammar point), which is stated behavior, not a
 * symptom.
 */
function countEligibleCompositionItems(game: PlayGameUseCase): number {
	return game.startCompositionRound(Number.MAX_SAFE_INTEGER).length;
}

/**
 * The one place a `GameItem`'s union tag is inspected: each organism
 * receives a single-kind, single-direction prop and never narrows the union
 * itself (see task 2.3's architectural decision).
 *
 * Exhaustive on `kind` with a `never` default, matching every other switch
 * over this union (`assignDirection`, `itemKeyOf`): a new member must be a
 * compile error right here, at the page that has to render it, rather than
 * silently falling through to some other kind's organism.
 */
function renderChallenge(
	item: GameItem,
	inputMode: GameInputMode,
	onRate: (rating: RecallRating) => void,
) {
	switch (item.kind) {
		case "symbol":
			return item.challengeDirection === "dictation" ? (
				<SymbolDictationChallenge
					item={item}
					inputMode={inputMode}
					onRate={onRate}
				/>
			) : (
				<SymbolReadingChallenge item={item} onRate={onRate} />
			);
		case "word":
			return item.challengeDirection === "dictationTranslate" ? (
				<WordDictationChallenge
					item={item}
					inputMode={inputMode}
					onRate={onRate}
				/>
			) : (
				<WordProductionChallenge
					item={item}
					inputMode={inputMode}
					onRate={onRate}
				/>
			);
		case "sentence":
			return item.challengeDirection === "listening" ? (
				<SentenceListeningChallenge item={item} onRate={onRate} />
			) : (
				<SentenceReadingChallenge item={item} onRate={onRate} />
			);
		case "tone":
			return <ToneIdentificationChallenge item={item} onRate={onRate} />;
		case "composition":
			return <SentenceCompositionChallenge item={item} onRate={onRate} />;
		default: {
			const _never: never = item;
			throw new Error(`unhandled game item: ${JSON.stringify(_never)}`);
		}
	}
}

/**
 * A self-graded practice round over introduced symbols, vocab words and/or
 * sentences, per the setup screen's checked pools — or, in Sentence
 * Composition mode, a round built from currently-unlocked grammar points.
 * The page owns all round state (`items`/`ratings`/`currentIndex`) and
 * threads it through `PlayGameUseCase`'s pure functions — the use case is
 * a long-lived singleton and must never hold a round.
 *
 * Deliberately reads only `game` from `useApp()`: no `refresh()`, no
 * `checkAchievements`, nothing that could write the SRS blob. A round of
 * either mode must leave `thai-srs-state` byte-identical.
 */
export function GamePage() {
	const { game } = useApp();
	const navigate = useNavigate();

	const [phase, setPhase] = useState<GamePhase>("setup");
	const [mode, setMode] = useState<GameMode>("practice");
	const [checkedPools, setCheckedPools] = useState<
		Readonly<Record<GameCardPool, boolean>>
	>(DEFAULT_CHECKED_POOLS);
	const [inputMode, setInputMode] = useState<GameInputMode>("draw");
	const [prioritizeWeakItems, setPrioritizeWeakItems] = useState(false);
	// Off by default, and independent of `checkedPools` — tone practice is
	// not a pool (see `TONE_TOGGLE_LABEL`), so it combines with any pool
	// selection, including none at all.
	const [includeTonePractice, setIncludeTonePractice] = useState(false);
	const [items, setItems] = useState<GameItem[]>([]);
	const [ratings, setRatings] = useState<GameRatingRecord[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [summary, setSummary] = useState<GameRoundSummaryData | null>(null);
	// Guards against a rating landing twice for one item (a stray global
	// keypress on top of a click) advancing past the next item unseen.
	const ratedIndexRef = useRef(-1);

	// A stable reference for an unchanged checked set — `checkedPools` only
	// gets a new identity when a checkbox is actually toggled, so effects and
	// memos keyed on `pools` don't re-fire on unrelated re-renders (a fresh
	// array every render would silently re-key them all).
	const pools = useMemo(
		() => ALL_POOLS.filter((pool) => checkedPools[pool]),
		[checkedPools],
	);

	// Per-mode eligible cap: practice counts the checked pools (plus tone
	// practice), composition counts unlocked grammar points — two named
	// mechanisms, one call site, so neither flow invents its own count.
	const eligibleCount = useMemo(() => {
		if (phase !== "setup") return 0;
		return mode === "composition"
			? countEligibleCompositionItems(game)
			: countEligibleItems(
					game,
					pools,
					prioritizeWeakItems,
					includeTonePractice,
				);
	}, [game, phase, mode, pools, prioritizeWeakItems, includeTonePractice]);
	const [countInput, setCountInput] = useState<string>(() =>
		eligibleCount > 0
			? String(Math.min(DEFAULT_ITEM_COUNT, eligibleCount))
			: "",
	);
	// Changing what the round draws from can make a previously-typed count
	// invalid without ever telling the learner why — so the three controls
	// that change it (the checked pools, the tone toggle, and the mode
	// switch) all reset it. Nothing else does (the weak-item toggle and
	// input mode leave the eligible set alone).
	// biome-ignore lint/correctness/useExhaustiveDependencies: resets only when the drawn-from set changes, never on every eligibleCount-affecting render
	useEffect(() => {
		setCountInput(
			eligibleCount > 0
				? String(Math.min(DEFAULT_ITEM_COUNT, eligibleCount))
				: "",
		);
	}, [pools, includeTonePractice, mode]);
	const history = useMemo(
		() => (phase === "setup" ? game.getHistory() : null),
		[game, phase],
	);

	// `Number("")` is 0, which the >= 1 rule already rejects.
	const parsedCount = Number(countInput);
	const countValid =
		Number.isInteger(parsedCount) &&
		parsedCount >= 1 &&
		parsedCount <= eligibleCount;

	const emptyMessage =
		mode === "composition"
			? eligibleCount > 0
				? null
				: NO_COMPOSITION_ELIGIBLE_MESSAGE
			: emptySelectionMessage(
					pools.length > 0,
					includeTonePractice,
					eligibleCount,
				);

	const handleStart = useCallback(() => {
		const roundItems =
			mode === "composition"
				? game.startCompositionRound(parsedCount)
				: game.startRound({
						pools,
						itemCount: parsedCount,
						prioritizeWeakItems,
						inputMode,
						includeTonePractice,
					});
		if (roundItems.length === 0) return;
		setItems(roundItems);
		setRatings([]);
		setCurrentIndex(0);
		setSummary(null);
		ratedIndexRef.current = -1;
		setPhase("playing");
	}, [
		game,
		mode,
		pools,
		parsedCount,
		inputMode,
		prioritizeWeakItems,
		includeTonePractice,
	]);

	const handleRate = useCallback(
		(rating: RecallRating) => {
			if (ratedIndexRef.current >= currentIndex) return;
			ratedIndexRef.current = currentIndex;

			const nextRatings = game.recordRating(
				items,
				ratings,
				currentIndex,
				rating,
			);
			setRatings(nextRatings);

			if (currentIndex + 1 < items.length) {
				setCurrentIndex(currentIndex + 1);
				return;
			}

			const roundSummary = game.finishRound(nextRatings);
			// The explicit mode branch this call site needs now that two
			// history shapes exist: a composition round carries no `pools`,
			// and `PlayedRound`'s required `kind` keeps either branch from
			// silently taking the other's shape.
			game.saveHistory(
				mode === "composition"
					? { kind: "composition", itemCount: items.length }
					: { kind: "practice", pools, itemCount: items.length },
				roundSummary,
			);
			setSummary(roundSummary);
			setPhase("summary");
		},
		[game, items, ratings, currentIndex, mode, pools],
	);

	if (phase === "playing") {
		const item = items[currentIndex];
		if (!item) return null;

		const challenge = renderChallenge(item, inputMode, handleRate);

		return (
			<div>
				<div className="mb-4 flex items-center justify-between">
					<span
						className="text-sm font-semibold"
						style={{ color: "var(--color-text)" }}
					>
						{mode === "composition" ? "Sentence Composition" : "Practice Round"}
					</span>
					<span
						className="text-sm"
						style={{ color: "var(--color-text-muted)" }}
					>
						{currentIndex + 1} / {items.length}
					</span>
					<button
						type="button"
						onClick={() => navigate("/")}
						className="text-lg leading-none"
						style={{ color: "var(--color-text-muted)" }}
						aria-label="End round"
						title="End round"
					>
						✕
					</button>
				</div>

				{challenge}
			</div>
		);
	}

	if (phase === "summary" && summary) {
		return (
			<div className="space-y-6 py-8">
				<GameRoundSummary summary={summary} itemCount={items.length} />
				<div className="space-y-3">
					<Button className="w-full" onClick={() => setPhase("setup")}>
						Play Again
					</Button>
					<Button
						variant="outline"
						className="w-full"
						onClick={() => navigate("/")}
					>
						Go to Dashboard
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 py-4">
			<div>
				<h1
					className="text-2xl font-semibold"
					style={{ color: "var(--color-text)" }}
				>
					Practice Game
				</h1>
				<p
					className="text-sm mt-1"
					style={{ color: "var(--color-text-muted)" }}
				>
					Self-graded drilling over your introduced symbols, words, and
					sentences — or sentence composition from your unlocked grammar. It
					never changes your review schedule.
				</p>
			</div>

			<fieldset
				className="rounded-xl p-4"
				style={{
					border: "1px solid var(--color-border)",
					background: "var(--color-surface)",
				}}
			>
				<legend
					className="text-sm font-semibold mb-1"
					style={{ color: "var(--color-text)" }}
				>
					Mode
				</legend>
				<div className="flex flex-wrap gap-4">
					{ALL_MODES.map((gameMode) => (
						<span key={gameMode} className="flex items-center gap-2">
							<input
								id={`game-mode-${gameMode}`}
								type="radio"
								name="game-mode"
								checked={mode === gameMode}
								onChange={() => setMode(gameMode)}
							/>
							<label
								htmlFor={`game-mode-${gameMode}`}
								className="text-sm"
								style={{ color: "var(--color-text)" }}
							>
								{MODE_LABELS[gameMode]}
							</label>
						</span>
					))}
				</div>
			</fieldset>

			{/* Composition mode's setup is item-count-only: no pools (its
			    supply is the unlocked grammar set, not a pool), no tone
			    toggle, and none of the practice-only controls below. */}
			{mode === "practice" && (
				<>
					<fieldset
						className="rounded-xl p-4"
						style={{
							border: "1px solid var(--color-border)",
							background: "var(--color-surface)",
						}}
					>
						<legend
							className="text-sm font-semibold mb-1"
							style={{ color: "var(--color-text)" }}
						>
							Practice pools
						</legend>
						<div className="flex flex-wrap gap-4">
							{ALL_POOLS.map((pool) => (
								<span key={pool} className="flex items-center gap-2">
									<input
										id={`game-pool-${pool}`}
										type="checkbox"
										checked={checkedPools[pool]}
										onChange={() =>
											setCheckedPools((previous) => ({
												...previous,
												[pool]: !previous[pool],
											}))
										}
									/>
									<label
										htmlFor={`game-pool-${pool}`}
										className="text-sm"
										style={{ color: "var(--color-text)" }}
									>
										{POOL_LABELS[pool]}
									</label>
								</span>
							))}
						</div>
					</fieldset>

					{/* Beside the pool checkboxes, never among them: tone practice
					    draws from the same vocab words the Words pool covers and is
					    combinable with any pool selection, so reading as a fourth
					    pool would misdescribe it (see CONTEXT.md). It lives outside
					    the count/input-mode box below because that box disappears
					    once nothing is eligible — a toggle that can rescue an empty
					    selection must stay reachable from one. */}
					<div>
						<div className="flex items-center gap-2">
							<input
								id="game-include-tone"
								type="checkbox"
								checked={includeTonePractice}
								onChange={(e) => setIncludeTonePractice(e.target.checked)}
							/>
							<label
								htmlFor="game-include-tone"
								className="text-sm"
								style={{ color: "var(--color-text)" }}
							>
								{TONE_TOGGLE_LABEL}
							</label>
						</div>
						<p
							className="text-xs mt-1"
							style={{ color: "var(--color-text-muted)" }}
						>
							Adds tone-pattern items from your vocabulary, whichever pools are
							checked.
						</p>
					</div>
				</>
			)}

			{emptyMessage ? (
				<p
					className="rounded-xl p-4 text-sm"
					style={{
						background: "var(--color-surface-2)",
						color: "var(--color-text-muted)",
					}}
				>
					{emptyMessage}
				</p>
			) : (
				<div
					className="rounded-xl p-4 space-y-4"
					style={{
						border: "1px solid var(--color-border)",
						background: "var(--color-surface)",
					}}
				>
					<div>
						<label
							htmlFor="game-item-count"
							className="block text-sm font-semibold mb-1"
							style={{ color: "var(--color-text)" }}
						>
							Items per round
						</label>
						<input
							id="game-item-count"
							type="number"
							min={1}
							max={eligibleCount}
							step={1}
							value={countInput}
							onChange={(e) => setCountInput(e.target.value)}
							className="w-full rounded-xl p-3"
							style={{
								border: "1px solid var(--color-border)",
								background: "var(--color-surface-2)",
								color: "var(--color-text)",
							}}
						/>
						<p
							className="text-xs mt-1"
							style={{ color: "var(--color-text-muted)" }}
						>
							Whole number from 1 to {eligibleCount}
						</p>
					</div>

					{/* Input mode only controls the symbol/word write-input
					    challenges; a sentence challenge never asks for writing
					    (see the architectural decision), so with only Sentence
					    Reading checked the toggle would control nothing and is
					    hidden. Composition hides it for the same reason:
					    tile-tapping has no "on paper" alternative. */}
					{mode === "practice" && pools.some((pool) => pool !== "sentence") && (
						<fieldset>
							<legend
								className="text-sm font-semibold mb-1"
								style={{ color: "var(--color-text)" }}
							>
								Input mode
							</legend>
							<div className="flex gap-4">
								<span className="flex items-center gap-2">
									<input
										id="game-input-draw"
										type="radio"
										name="game-input-mode"
										checked={inputMode === "draw"}
										onChange={() => setInputMode("draw")}
									/>
									<label
										htmlFor="game-input-draw"
										className="text-sm"
										style={{ color: "var(--color-text)" }}
									>
										Draw on canvas
									</label>
								</span>
								<span className="flex items-center gap-2">
									<input
										id="game-input-paper"
										type="radio"
										name="game-input-mode"
										checked={inputMode === "paper"}
										onChange={() => setInputMode("paper")}
									/>
									<label
										htmlFor="game-input-paper"
										className="text-sm"
										style={{ color: "var(--color-text)" }}
									>
										Write on paper
									</label>
								</span>
							</div>
						</fieldset>
					)}

					{/* Composition has no per-item SRS weighting to prioritize —
					    `startCompositionRound` takes only a count — so the
					    toggle would control nothing there and is hidden. */}
					{mode === "practice" && (
						<div className="flex items-center gap-2">
							<input
								id="game-prioritize-weak"
								type="checkbox"
								checked={prioritizeWeakItems}
								onChange={(e) => setPrioritizeWeakItems(e.target.checked)}
							/>
							<label
								htmlFor="game-prioritize-weak"
								className="text-sm"
								style={{ color: "var(--color-text)" }}
							>
								Prioritize weak items
							</label>
						</div>
					)}

					<Button
						className="w-full"
						disabled={!countValid}
						onClick={handleStart}
					>
						Start Round
					</Button>
				</div>
			)}

			{history && (
				<div>
					<SectionHeader className="mb-3">Recent Rounds</SectionHeader>
					<GameHistoryList result={history} />
				</div>
			)}
		</div>
	);
}
