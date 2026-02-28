import { useNavigate } from "react-router";
import { useApp } from "../hooks/useApp";
import { lessons } from "../symbol";

export function ProgressPage() {
	const { state, getNumDueCards, getStageCounts, resetAll } = useApp();
	const navigate = useNavigate();
	const completed = new Set(state.completedLessons);
	const totalCards = Object.keys(state.cards).length;
	const dueCount = getNumDueCards();
	const stages = getStageCounts("script");
	const totalStaged = stages.apprentice + stages.guru + stages.master + stages.enlightened + stages.burned;

	return (
		<div className="space-y-8 py-4">
			<h1 className="text-2xl font-bold">Progress</h1>

			{/* SRS Stage Stats */}
			<div className="grid grid-cols-3 gap-3 text-center">
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold text-pink-500">{stages.apprentice}</div>
					<div className="text-xs text-gray-500">Apprentice</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold text-purple-500">{stages.guru}</div>
					<div className="text-xs text-gray-500">Guru</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold text-blue-500">{stages.master}</div>
					<div className="text-xs text-gray-500">Master</div>
				</div>
			</div>
			<div className="grid grid-cols-3 gap-3 text-center">
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold text-teal-500">{stages.enlightened}</div>
					<div className="text-xs text-gray-500">Enlightened</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold text-amber-500">{stages.burned}</div>
					<div className="text-xs text-gray-500">Burned</div>
				</div>
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
					<div className="text-xl font-bold text-orange-500">{dueCount}</div>
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
							className="h-full bg-pink-500"
							style={{ width: `${(stages.apprentice / totalStaged) * 100}%` }}
						/>
						<div
							className="h-full bg-purple-500"
							style={{ width: `${(stages.guru / totalStaged) * 100}%` }}
						/>
						<div
							className="h-full bg-blue-500"
							style={{ width: `${(stages.master / totalStaged) * 100}%` }}
						/>
						<div
							className="h-full bg-teal-500"
							style={{ width: `${(stages.enlightened / totalStaged) * 100}%` }}
						/>
						<div
							className="h-full bg-amber-500"
							style={{ width: `${(stages.burned / totalStaged) * 100}%` }}
						/>
					</div>
				</div>
			)}

			{/* Lesson grid */}
			<div>
				<h2 className="text-sm font-semibold text-gray-500 mb-3">Lessons</h2>
				<div className="grid grid-cols-5 gap-2">
					{lessons.map((l) => {
						const isCompleted = completed.has(l.number);
						const isAvailable =
							!isCompleted && (l.number === 1 || completed.has(l.number - 1));
						const isLocked = !isCompleted && !isAvailable;

						return (
							<button
								key={l.number}
								onClick={() => {
									if (isAvailable) navigate(`/lesson/${l.number}`);
								}}
								disabled={isLocked}
								title={l.title}
								className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-colors ${
									isCompleted
										? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
										: isAvailable
											? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 cursor-pointer"
											: "bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed"
								}`}
							>
								{l.number}
							</button>
						);
					})}
				</div>
			</div>

			{/* Session history */}
			{state.sessionHistory.length > 0 && (
				<div>
					<h2 className="text-sm font-semibold text-gray-500 mb-2">
						Session History ({state.sessionHistory.length})
					</h2>
					<div className="space-y-2 max-h-60 overflow-y-auto">
						{[...state.sessionHistory].reverse().map((s, i) => (
							<div
								key={i}
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
					onClick={() => {
						if (confirm("This will erase all progress. Are you sure?")) {
							resetAll();
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
