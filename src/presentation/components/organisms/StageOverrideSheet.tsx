import { useState } from "react";
import type { CardPool } from "../../../domain/shared/CardPool";
import { SrsStage } from "../../../domain/srs/value-objects/SrsStage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

const STAGE_ORDER: Record<string, number> = {
	Apprentice: 0,
	Guru: 1,
	Master: 2,
	Enlightened: 3,
	Burned: 4,
};

const STAGE_COLORS: Record<string, string> = {
	Apprentice: "var(--color-apprentice)",
	Guru: "var(--color-guru)",
	Master: "var(--color-master)",
	Enlightened: "var(--color-enlightened)",
	Burned: "var(--color-burned)",
};

const STAGE_ABBREV: Record<string, string> = {
	Apprentice: "A",
	Guru: "G",
	Master: "M",
	Enlightened: "E",
	Burned: "B",
};

const ALL_STAGES: SrsStage[] = [
	SrsStage.APPRENTICE,
	SrsStage.GURU,
	SrsStage.MASTER,
	SrsStage.ENLIGHTENED,
	SrsStage.BURNED,
];

export interface ItemCard {
	id: string;
	pool: CardPool;
	label: string;
	currentStage: SrsStage;
}

interface Props {
	open: boolean;
	onClose: () => void;
	itemLabel: string;
	cards: ItemCard[];
	onOverride: (id: string, pool: CardPool, stage: SrsStage) => void;
}

function combinedStage(cards: ItemCard[]): SrsStage {
	if (cards.length === 0) return ALL_STAGES[0];
	return cards.reduce((best, card) => {
		const bestOrder = STAGE_ORDER[best.name] ?? 0;
		const cardOrder = STAGE_ORDER[card.currentStage.name] ?? 0;
		return cardOrder > bestOrder ? card.currentStage : best;
	}, cards[0].currentStage);
}

interface StageChipProps {
	stage: SrsStage;
	active: boolean;
	onClick: () => void;
}

function StageChip({ stage, active, onClick }: StageChipProps) {
	const color = STAGE_COLORS[stage.name] ?? "var(--color-text-muted)";
	const abbrev = STAGE_ABBREV[stage.name] ?? stage.name[0];

	return (
		<button
			type="button"
			onClick={onClick}
			title={stage.name}
			aria-label={`Set stage to ${stage.name}`}
			aria-pressed={active}
			className="w-8 h-8 rounded-full text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
			style={
				active
					? {
							background: color,
							color: "white",
							boxShadow: `0 0 0 2px ${color}`,
						}
					: {
							background: "var(--color-surface-2)",
							color: "var(--color-text-muted)",
							border: "1px solid var(--color-border)",
						}
			}
		>
			{abbrev}
		</button>
	);
}

export function StageOverrideSheet({
	open,
	onClose,
	itemLabel,
	cards,
	onOverride,
}: Props) {
	const [individualOpen, setIndividualOpen] = useState(false);
	const current = combinedStage(cards);

	function handleAllCards(stage: SrsStage) {
		for (const card of cards) {
			onOverride(card.id, card.pool, stage);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent
				className="max-w-sm w-full"
				style={{ background: "var(--color-surface)" }}
			>
				<DialogHeader>
					<DialogTitle
						className="text-base font-semibold"
						style={{ color: "var(--color-text)" }}
					>
						Override Stage: <span className="thai font-bold">{itemLabel}</span>
					</DialogTitle>
				</DialogHeader>

				{/* All-cards section */}
				<div className="space-y-2">
					<p
						className="text-xs font-medium uppercase tracking-wide"
						style={{ color: "var(--color-text-muted)" }}
					>
						All cards
					</p>
					<div className="flex items-center gap-2 flex-wrap">
						{ALL_STAGES.map((stage) => (
							<StageChip
								key={stage.name}
								stage={stage}
								active={stage.name === current.name}
								onClick={() => handleAllCards(stage)}
							/>
						))}
						<span
							className="text-xs ml-1"
							style={{ color: "var(--color-text-muted)" }}
						>
							{current.name}
						</span>
					</div>
				</div>

				{/* Individual cards section */}
				{cards.length > 1 && (
					<div
						className="rounded-lg overflow-hidden"
						style={{ border: "1px solid var(--color-border)" }}
					>
						<button
							type="button"
							onClick={() => setIndividualOpen((prev) => !prev)}
							aria-expanded={individualOpen}
							aria-controls="stage-override-individual-cards"
							className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium transition-colors"
							style={{
								background: "var(--color-surface-2)",
								color: "var(--color-text)",
							}}
						>
							<span>Individual cards</span>
							<span
								className="text-xs transition-transform duration-200"
								style={{
									display: "inline-block",
									transform: individualOpen ? "rotate(90deg)" : "rotate(0deg)",
								}}
							>
								&#9654;
							</span>
						</button>

						{individualOpen && (
							<div
								id="stage-override-individual-cards"
								className="divide-y"
								style={{ borderTop: "1px solid var(--color-border)" }}
							>
								{cards.map((card) => (
									<div
										key={`${card.id}-${card.pool}`}
										className="flex items-center justify-between gap-3 px-3 py-2"
										style={{ background: "var(--color-surface)" }}
									>
										<span
											className="text-sm flex-1 min-w-0 truncate"
											style={{ color: "var(--color-text)" }}
										>
											{card.label}
										</span>
										<div className="flex items-center gap-1.5 flex-shrink-0">
											{ALL_STAGES.map((stage) => (
												<StageChip
													key={stage.name}
													stage={stage}
													active={stage.name === card.currentStage.name}
													onClick={() => onOverride(card.id, card.pool, stage)}
												/>
											))}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
