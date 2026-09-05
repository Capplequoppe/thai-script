import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/presentation/components/ui/button";
import type { PlayGameUseCase } from "../../application/use-cases/PlayGameUseCase";
import type {
	GameInputMode,
	GameItem,
	GameRatingRecord,
	GameRoundSummary as GameRoundSummaryData,
} from "../../domain/game/types";
import type { RecallRating } from "../../domain/shared/types";
import { SectionHeader } from "../components/atoms/SectionHeader";
import { GameHistoryList } from "../components/molecules/GameHistoryList";
import { GameRoundSummary } from "../components/organisms/GameRoundSummary";
import { SymbolDictationChallenge } from "../components/organisms/SymbolDictationChallenge";
import { SymbolReadingChallenge } from "../components/organisms/SymbolReadingChallenge";
import { useApp } from "../hooks/useApp";

type GamePhase = "setup" | "playing" | "summary";

/** Phase 1 practices symbols only; phase 2 adds the pool selector. */
const GAME_POOLS = ["script"] as const;

const DEFAULT_ITEM_COUNT = 10;

/**
 * Selection is a pure function, so asking for every item is a side-effect-
 * free way to learn how many are eligible — the use case exposes no
 * separate count query.
 */
function countEligibleItems(game: PlayGameUseCase): number {
	return game.startRound({
		pools: GAME_POOLS,
		itemCount: Number.MAX_SAFE_INTEGER,
		prioritizeWeakItems: false,
		inputMode: "draw",
	}).length;
}

/**
 * A self-graded practice round over introduced symbols. The page owns all
 * round state (`items`/`ratings`/`currentIndex`) and threads it through
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
	const [inputMode, setInputMode] = useState<GameInputMode>("draw");
	const [items, setItems] = useState<GameItem[]>([]);
	const [ratings, setRatings] = useState<GameRatingRecord[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [summary, setSummary] = useState<GameRoundSummaryData | null>(null);
	// Guards against a rating landing twice for one item (a stray global
	// keypress on top of a click) advancing past the next item unseen.
	const ratedIndexRef = useRef(-1);

	const eligibleCount = useMemo(
		() => (phase === "setup" ? countEligibleItems(game) : 0),
		[game, phase],
	);
	const [countInput, setCountInput] = useState<string>(() =>
		eligibleCount > 0
			? String(Math.min(DEFAULT_ITEM_COUNT, eligibleCount))
			: "",
	);
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
			pools: GAME_POOLS,
			itemCount: parsedCount,
			prioritizeWeakItems: false,
			inputMode,
		});
		if (roundItems.length === 0) return;
		setItems(roundItems);
		setRatings([]);
		setCurrentIndex(0);
		setSummary(null);
		ratedIndexRef.current = -1;
		setPhase("playing");
	}, [game, parsedCount, inputMode]);

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
			game.saveHistory(
				{ pools: GAME_POOLS, itemCount: items.length },
				roundSummary,
			);
			setSummary(roundSummary);
			setPhase("summary");
		},
		[game, items, ratings, currentIndex],
	);

	if (phase === "playing") {
		const item = items[currentIndex];
		// `GAME_POOLS` is script-only until task 2.3 adds the pool selector, so
		// a word item can never actually reach this page yet — this narrowing
		// is a type-safety guard for the `GameItem` union widened in task 2.1,
		// not a behavior change.
		if (!item || item.kind !== "symbol") return null;

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

				{item.challengeDirection === "dictation" ? (
					<SymbolDictationChallenge
						item={item}
						inputMode={inputMode}
						onRate={handleRate}
					/>
				) : (
					<SymbolReadingChallenge item={item} onRate={handleRate} />
				)}
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
					Self-graded drilling over your introduced symbols — it never changes
					your review schedule.
				</p>
			</div>

			{eligibleCount === 0 ? (
				<p
					className="rounded-xl p-4 text-sm"
					style={{
						background: "var(--color-surface-2)",
						color: "var(--color-text-muted)",
					}}
				>
					No symbols to practice yet — complete a script lesson first.
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
