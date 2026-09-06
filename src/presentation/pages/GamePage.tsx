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
import { SentenceListeningChallenge } from "../components/organisms/SentenceListeningChallenge";
import { SentenceReadingChallenge } from "../components/organisms/SentenceReadingChallenge";
import { SymbolDictationChallenge } from "../components/organisms/SymbolDictationChallenge";
import { SymbolReadingChallenge } from "../components/organisms/SymbolReadingChallenge";
import { WordDictationChallenge } from "../components/organisms/WordDictationChallenge";
import { WordProductionChallenge } from "../components/organisms/WordProductionChallenge";
import { useApp } from "../hooks/useApp";

type GamePhase = "setup" | "playing" | "summary";

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
 * Two different empty states, never collapsed into one text: "you haven't
 * chosen anything yet" vs. "you chose something and it has nothing
 * eligible". With a free multi-select there is no fixed set of named pool
 * combinations, so the second message is generic over whatever subset is
 * checked.
 */
const NO_POOLS_CHECKED_MESSAGE = "Select at least one pool to practice.";
const NOTHING_ELIGIBLE_MESSAGE =
	"Nothing to practice yet in the selected pools — complete a lesson that introduces them first.";

const DEFAULT_ITEM_COUNT = 10;

/**
 * Selection is a pure function, so asking for every item is a side-effect-
 * free way to learn how many are eligible — the use case exposes no
 * separate count query.
 */
function countEligibleItems(
	game: PlayGameUseCase,
	pools: readonly GameCardPool[],
	prioritizeWeakItems: boolean = false,
): number {
	return game.startRound({
		pools,
		itemCount: Number.MAX_SAFE_INTEGER,
		prioritizeWeakItems,
		inputMode: "draw",
	}).length;
}

/**
 * A self-graded practice round over introduced symbols, vocab words and/or
 * sentences, per the setup screen's checked pools. The page owns all round
 * state (`items`/`ratings`/`currentIndex`) and threads it through
 * `PlayGameUseCase`'s pure functions — the use case is a long-lived
 * singleton and must never hold a round.
 *
 * Deliberately reads only `game` from `useApp()`: no `refresh()`, no
 * `checkAchievements`, nothing that could write the SRS blob. A practice
 * round must leave `thai-srs-state` byte-identical.
 */
export function GamePage() {
	const { game } = useApp();
	const navigate = useNavigate();

	const [phase, setPhase] = useState<GamePhase>("setup");
	const [checkedPools, setCheckedPools] = useState<
		Readonly<Record<GameCardPool, boolean>>
	>(DEFAULT_CHECKED_POOLS);
	const [inputMode, setInputMode] = useState<GameInputMode>("draw");
	const [prioritizeWeakItems, setPrioritizeWeakItems] = useState(false);
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

	const eligibleCount = useMemo(
		() =>
			phase === "setup"
				? countEligibleItems(game, pools, prioritizeWeakItems)
				: 0,
		[game, phase, pools, prioritizeWeakItems],
	);
	const [countInput, setCountInput] = useState<string>(() =>
		eligibleCount > 0
			? String(Math.min(DEFAULT_ITEM_COUNT, eligibleCount))
			: "",
	);
	// The eligible count is pool-dependent — changing the checked set can
	// make a previously-typed count invalid without ever telling the learner
	// why.
	// biome-ignore lint/correctness/useExhaustiveDependencies: resets only when the checked pool set changes, never on every eligibleCount-affecting render
	useEffect(() => {
		setCountInput(
			eligibleCount > 0
				? String(Math.min(DEFAULT_ITEM_COUNT, eligibleCount))
				: "",
		);
	}, [pools]);
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

	const handleStart = useCallback(() => {
		const roundItems = game.startRound({
			pools,
			itemCount: parsedCount,
			prioritizeWeakItems,
			inputMode,
		});
		if (roundItems.length === 0) return;
		setItems(roundItems);
		setRatings([]);
		setCurrentIndex(0);
		setSummary(null);
		ratedIndexRef.current = -1;
		setPhase("playing");
	}, [game, pools, parsedCount, inputMode, prioritizeWeakItems]);

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
			game.saveHistory({ pools, itemCount: items.length }, roundSummary);
			setSummary(roundSummary);
			setPhase("summary");
		},
		[game, items, ratings, currentIndex, pools],
	);

	if (phase === "playing") {
		const item = items[currentIndex];
		if (!item) return null;

		// The page dispatches by `kind` then `challengeDirection`; each
		// organism receives a single-kind, single-direction prop and never
		// inspects `GameItem`'s union tag itself (see task 2.3's
		// architectural decision).
		const challenge =
			item.kind === "symbol" ? (
				item.challengeDirection === "dictation" ? (
					<SymbolDictationChallenge
						item={item}
						inputMode={inputMode}
						onRate={handleRate}
					/>
				) : (
					<SymbolReadingChallenge item={item} onRate={handleRate} />
				)
			) : item.kind === "word" ? (
				item.challengeDirection === "dictationTranslate" ? (
					<WordDictationChallenge
						item={item}
						inputMode={inputMode}
						onRate={handleRate}
					/>
				) : (
					<WordProductionChallenge
						item={item}
						inputMode={inputMode}
						onRate={handleRate}
					/>
				)
			) : item.challengeDirection === "listening" ? (
				<SentenceListeningChallenge item={item} onRate={handleRate} />
			) : (
				<SentenceReadingChallenge item={item} onRate={handleRate} />
			);

		return (
			<div>
				<div className="mb-4 flex items-center justify-between">
					<span
						className="text-sm font-semibold"
						style={{ color: "var(--color-text)" }}
					>
						Practice Round
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
					sentences — it never changes your review schedule.
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

			{pools.length === 0 || eligibleCount === 0 ? (
				<p
					className="rounded-xl p-4 text-sm"
					style={{
						background: "var(--color-surface-2)",
						color: "var(--color-text-muted)",
					}}
				>
					{pools.length === 0
						? NO_POOLS_CHECKED_MESSAGE
						: NOTHING_ELIGIBLE_MESSAGE}
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
					    hidden. */}
					{pools.some((pool) => pool !== "sentence") && (
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
