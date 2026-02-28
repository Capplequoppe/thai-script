import { useNavigate } from "react-router";
import { useApp } from "../hooks/useApp";
import { AchievementBadge, ACHIEVEMENT_DEFS } from "../components/AchievementBadge";
import { HeatmapWidget } from "../components/HeatmapWidget";
import { LessonPath } from "../components/LessonPath";

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
	const nextLesson = state.completedLessons.length < 25 ? state.completedLessons.length + 1 : null;

	return (
		<div className="space-y-8 py-4">
			<h1 className="text-2xl font-bold">Progress</h1>

			{/* SRS Stage Stats */}
			<div className="grid grid-cols-3 gap-3 text-center">
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold" style={{ color: "var(--color-apprentice)" }}>
						{stages.apprentice}
					</div>
					<div className="text-xs text-gray-500">Apprentice</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold" style={{ color: "var(--color-guru)" }}>{stages.guru}</div>
					<div className="text-xs text-gray-500">Guru</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold" style={{ color: "var(--color-master)" }}>{stages.master}</div>
					<div className="text-xs text-gray-500">Master</div>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-3 text-center">
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold" style={{ color: "var(--color-enlightened)" }}>
						{stages.enlightened}
					</div>
					<div className="text-xs text-gray-500">Enlightened</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold" style={{ color: "var(--color-burned)" }}>
						{stages.burned}
					</div>
					<div className="text-xs text-gray-500">Burned</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold" style={{ color: "var(--color-accent)" }}>{dueCount}</div>
					<div className="text-xs text-gray-500">Due</div>
				</div>
			</div>

			{/* 5-segment mastery bar */}
			{totalStaged > 0 && (
				<div>
					<div className="flex justify-between text-xs text-gray-500 mb-1">
						<span>SRS Stages</span>
						<span>{totalCards} cards</span>
					</div>
					<div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
						<div
							className="h-full"
							style={{ width: `${(stages.apprentice / totalStaged) * 100}%`, background: "var(--color-apprentice)" }}
						/>
						<div
							className="h-full"
							style={{ width: `${(stages.guru / totalStaged) * 100}%`, background: "var(--color-guru)" }}
						/>
						<div
							className="h-full"
							style={{ width: `${(stages.master / totalStaged) * 100}%`, background: "var(--color-master)" }}
						/>
						<div
							className="h-full"
							style={{ width: `${(stages.enlightened / totalStaged) * 100}%`, background: "var(--color-enlightened)" }}
						/>
						<div
							className="h-full"
							style={{ width: `${(stages.burned / totalStaged) * 100}%`, background: "var(--color-burned)" }}
						/>
					</div>
				</div>
			)}

			{/* Grammar SRS Stage Stats */}
			{totalGrammarStaged > 0 && (
				<div>
					<h2 className="text-sm font-semibold text-gray-500 mb-3">
						Grammar Stages
					</h2>
					<div className="grid grid-cols-3 gap-3 text-center">
						<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
							<div className="text-xl font-bold" style={{ color: "var(--color-apprentice)" }}>
								{grammarStages.apprentice}
							</div>
							<div className="text-xs text-gray-500">Apprentice</div>
						</div>
						<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
							<div className="text-xl font-bold" style={{ color: "var(--color-guru)" }}>
								{grammarStages.guru}
							</div>
							<div className="text-xs text-gray-500">Guru</div>
						</div>
						<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
							<div className="text-xl font-bold" style={{ color: "var(--color-master)" }}>
								{grammarStages.master}
							</div>
							<div className="text-xs text-gray-500">Master</div>
						</div>
					</div>
					<div className="grid grid-cols-3 gap-3 text-center mt-3">
						<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
							<div className="text-xl font-bold" style={{ color: "var(--color-enlightened)" }}>
								{grammarStages.enlightened}
							</div>
							<div className="text-xs text-gray-500">Enlightened</div>
						</div>
						<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
							<div className="text-xl font-bold" style={{ color: "var(--color-burned)" }}>
								{grammarStages.burned}
							</div>
							<div className="text-xs text-gray-500">Burned</div>
						</div>
					</div>
				</div>
			)}

			{/* Study Heatmap */}
			{state.sessionHistory.length > 0 && (
				<div className="card-royal p-4">
					<HeatmapWidget sessions={state.sessionHistory} />
				</div>
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
					<div className="section-header mb-3">Session History ({state.sessionHistory.length})</div>
					<div className="space-y-2 max-h-60 overflow-y-auto">
						{[...state.sessionHistory].reverse().map((s, i) => (
							<div
								key={`session-${i}-${s.type}`}
								className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-2 text-sm"
							>
								<span className="capitalize">{s.type}</span>
								<span>{s.totalCards} cards</span>
								<span
									className={
										s.accuracy >= 80
											? "text-green-600"
											: s.accuracy >= 50
												? "text-yellow-600"
												: "text-red-600"
									}
								>
									{s.accuracy}%
								</span>
							</div>
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
