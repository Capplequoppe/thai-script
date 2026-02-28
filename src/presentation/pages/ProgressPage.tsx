import { useNavigate } from "react-router";
import { Badge } from "@/presentation/components/ui/badge";
import { Card } from "@/presentation/components/ui/card";
import {
	ACHIEVEMENT_DEFS,
	AchievementBadge,
} from "../components/organisms/AchievementBadge";
import { HeatmapWidget } from "../components/organisms/HeatmapWidget";
import { LessonPath } from "../components/organisms/LessonPath";
import { useApp } from "../hooks/useApp";

export function ProgressPage() {
	const { state, review, dashboard, data, refresh } = useApp();
	const navigate = useNavigate();
	const completed = new Set(state.completedLessons);
	const totalCards = Object.keys(state.cards).length;
	const dueCount = review.getDueCount();
	const stages = dashboard.getStageCounts("script");
	const totalStaged =
		stages.apprentice +
		stages.guru +
		stages.master +
		stages.enlightened +
		stages.burned;
	const grammarStages = dashboard.getStageCounts("grammar");
	const totalGrammarStaged =
		grammarStages.apprentice +
		grammarStages.guru +
		grammarStages.master +
		grammarStages.enlightened +
		grammarStages.burned;
	const nextLesson =
		state.completedLessons.length < 25
			? state.completedLessons.length + 1
			: null;

	return (
		<div className="space-y-8 py-4">
			<h1 className="text-2xl font-bold">Progress</h1>

			{/* SRS Stage Stats */}
			<div className="grid grid-cols-3 gap-3 text-center">
				<Card className="rounded-xl p-3">
					<div
						className="text-xl font-bold"
						style={{ color: "var(--color-apprentice)" }}
					>
						{stages.apprentice}
					</div>
					<Badge style={{ background: "var(--color-apprentice)" }}>
						Apprentice
					</Badge>
				</Card>
				<Card className="rounded-xl p-3">
					<div
						className="text-xl font-bold"
						style={{ color: "var(--color-guru)" }}
					>
						{stages.guru}
					</div>
					<Badge style={{ background: "var(--color-guru)" }}>Guru</Badge>
				</Card>
				<Card className="rounded-xl p-3">
					<div
						className="text-xl font-bold"
						style={{ color: "var(--color-master)" }}
					>
						{stages.master}
					</div>
					<Badge style={{ background: "var(--color-master)" }}>Master</Badge>
				</Card>
			</div>
			<div className="grid grid-cols-3 gap-3 text-center">
				<Card className="rounded-xl p-3">
					<div
						className="text-xl font-bold"
						style={{ color: "var(--color-enlightened)" }}
					>
						{stages.enlightened}
					</div>
					<Badge style={{ background: "var(--color-enlightened)" }}>
						Enlightened
					</Badge>
				</Card>
				<Card className="rounded-xl p-3">
					<div
						className="text-xl font-bold"
						style={{ color: "var(--color-burned)" }}
					>
						{stages.burned}
					</div>
					<Badge style={{ background: "var(--color-burned)" }}>Burned</Badge>
				</Card>
				<Card className="rounded-xl p-3">
					<div
						className="text-xl font-bold"
						style={{ color: "var(--color-accent)" }}
					>
						{dueCount}
					</div>
					<div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
						Due
					</div>
				</Card>
			</div>

			{/* 5-segment mastery bar */}
			{totalStaged > 0 && (
				<div>
					<div
						className="flex justify-between text-xs mb-1"
						style={{ color: "var(--color-text-muted)" }}
					>
						<span>SRS Stages</span>
						<span>{totalCards} cards</span>
					</div>
					<div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
						<div
							className="h-full"
							style={{
								width: `${(stages.apprentice / totalStaged) * 100}%`,
								background: "var(--color-apprentice)",
							}}
						/>
						<div
							className="h-full"
							style={{
								width: `${(stages.guru / totalStaged) * 100}%`,
								background: "var(--color-guru)",
							}}
						/>
						<div
							className="h-full"
							style={{
								width: `${(stages.master / totalStaged) * 100}%`,
								background: "var(--color-master)",
							}}
						/>
						<div
							className="h-full"
							style={{
								width: `${(stages.enlightened / totalStaged) * 100}%`,
								background: "var(--color-enlightened)",
							}}
						/>
						<div
							className="h-full"
							style={{
								width: `${(stages.burned / totalStaged) * 100}%`,
								background: "var(--color-burned)",
							}}
						/>
					</div>
				</div>
			)}

			{/* Grammar SRS Stage Stats */}
			{totalGrammarStaged > 0 && (
				<div>
					<h2 className="section-header mb-3">Grammar Stages</h2>
					<div className="grid grid-cols-3 gap-3 text-center">
						<Card className="rounded-xl p-3">
							<div
								className="text-xl font-bold"
								style={{ color: "var(--color-apprentice)" }}
							>
								{grammarStages.apprentice}
							</div>
							<Badge style={{ background: "var(--color-apprentice)" }}>
								Apprentice
							</Badge>
						</Card>
						<Card className="rounded-xl p-3">
							<div
								className="text-xl font-bold"
								style={{ color: "var(--color-guru)" }}
							>
								{grammarStages.guru}
							</div>
							<Badge style={{ background: "var(--color-guru)" }}>Guru</Badge>
						</Card>
						<Card className="rounded-xl p-3">
							<div
								className="text-xl font-bold"
								style={{ color: "var(--color-master)" }}
							>
								{grammarStages.master}
							</div>
							<Badge style={{ background: "var(--color-master)" }}>
								Master
							</Badge>
						</Card>
					</div>
					<div className="grid grid-cols-3 gap-3 text-center mt-3">
						<Card className="rounded-xl p-3">
							<div
								className="text-xl font-bold"
								style={{ color: "var(--color-enlightened)" }}
							>
								{grammarStages.enlightened}
							</div>
							<Badge style={{ background: "var(--color-enlightened)" }}>
								Enlightened
							</Badge>
						</Card>
						<Card className="rounded-xl p-3">
							<div
								className="text-xl font-bold"
								style={{ color: "var(--color-burned)" }}
							>
								{grammarStages.burned}
							</div>
							<Badge style={{ background: "var(--color-burned)" }}>
								Burned
							</Badge>
						</Card>
					</div>
				</div>
			)}

			{/* Study Heatmap */}
			{state.sessionHistory.length > 0 && (
				<Card className="p-4">
					<HeatmapWidget sessions={state.sessionHistory} />
				</Card>
			)}

			{/* Lesson Path */}
			<div>
				<div className="section-header mb-4">Lesson Progress</div>
				<LessonPath
					totalLessons={25}
					completedLessons={completed}
					nextAvailable={nextLesson}
					onLessonClick={(n) => {
						if (completed.has(n) || n === nextLesson) navigate(`/lesson/${n}`);
					}}
				/>
			</div>

			{/* Achievements */}
			<div>
				<div className="section-header mb-4">Achievements</div>
				<div className="flex flex-wrap gap-4">
					{ACHIEVEMENT_DEFS.map((def) => (
						<AchievementBadge
							key={def.id}
							id={def.id}
							unlocked={(state.achievements ?? []).includes(def.id)}
							size="md"
						/>
					))}
				</div>
			</div>

			{/* Session history */}
			{state.sessionHistory.length > 0 && (
				<div>
					<div className="section-header mb-3">
						Session History ({state.sessionHistory.length})
					</div>
					<div className="space-y-2 max-h-60 overflow-y-auto">
						{[...state.sessionHistory].reverse().map((s, i) => (
							<Card
								key={`session-${i}-${s.type}`}
								className="flex justify-between items-center rounded-lg px-4 py-2 text-sm"
							>
								<span className="capitalize">{s.type}</span>
								<span>{s.totalCards} cards</span>
								<span
									style={{
										color:
											s.accuracy >= 80
												? "var(--color-master)"
												: s.accuracy >= 50
													? "var(--color-guru)"
													: "var(--color-danger)",
									}}
								>
									{s.accuracy}%
								</span>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* Reset */}
			<div className="pt-4 border-t border-gray-200 dark:border-gray-800">
				<button
					type="button"
					onClick={() => {
						if (confirm("This will erase all progress. Are you sure?")) {
							data.reset();
							refresh();
							navigate("/");
						}
					}}
					className="text-sm text-red-500 hover:text-red-600"
				>
					Reset All Progress
				</button>
			</div>
		</div>
	);
}
