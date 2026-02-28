export interface AchievementDef {
	id: string;
	name: string;
	description: string;
	icon: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
	{
		id: "first_lesson",
		name: "First Steps",
		description: "Complete your first lesson",
		icon: "❀",
	},
	{
		id: "five_lessons",
		name: "Scholar's Path",
		description: "Complete 5 lessons",
		icon: "📜",
	},
	{
		id: "all_lessons",
		name: "Royal Student",
		description: "Complete all 25 lessons",
		icon: "🏛",
	},
	{
		id: "first_review",
		name: "First Review",
		description: "Complete your first review session",
		icon: "⚔",
	},
	{
		id: "century",
		name: "Century",
		description: "Review 100 cards total",
		icon: "❂",
	},
	{
		id: "warrior",
		name: "Warrior's Discipline",
		description: "Review 500 cards total",
		icon: "◈",
	},
	{
		id: "first_guru",
		name: "Apprentice Graduate",
		description: "Reach Guru stage on any card",
		icon: "✦",
	},
	{
		id: "first_master",
		name: "Guru Achieved",
		description: "Reach Master stage on any card",
		icon: "⬡",
	},
	{
		id: "first_burned",
		name: "Burning Bright",
		description: "Burn your first card",
		icon: "✸",
	},
	{
		id: "vocab_start",
		name: "Word Weaver",
		description: "Start vocabulary learning",
		icon: "◉",
	},
	{
		id: "grammar_start",
		name: "Grammar Master",
		description: "Complete your first grammar lesson",
		icon: "⛩",
	},
	{
		id: "perfect_session",
		name: "Golden Seal",
		description: "100% accuracy on a session of 10+ cards",
		icon: "◎",
	},
];

interface AchievementBadgeProps {
	id: string;
	unlocked: boolean;
	size?: "sm" | "md";
}

export function AchievementBadge({ id, unlocked, size = "md" }: AchievementBadgeProps) {
	const def = ACHIEVEMENT_DEFS.find((a) => a.id === id);
	if (!def) return null;

	const sizeClasses = size === "sm" ? "w-12 h-12 text-xl" : "w-16 h-16 text-2xl";
	const maxWidth = size === "sm" ? "56px" : "72px";

	return (
		<div
			className="flex flex-col items-center gap-1 text-center flex-shrink-0"
			style={{ maxWidth }}
			title={def.description}
		>
			<div
				className={`${sizeClasses} rounded-full flex items-center justify-center border-2 transition-all`}
				style={
					unlocked
						? {
								background: "var(--color-accent)",
								borderColor: "var(--color-accent-h)",
								color: "white",
							}
						: {
								background: "var(--color-surface-2)",
								borderColor: "var(--color-border)",
								color: "var(--color-border)",
								filter: "grayscale(1) opacity(0.6)",
							}
				}
			>
				{def.icon}
			</div>
			<span
				className="text-[10px] font-medium leading-tight"
				style={{
					color: unlocked ? "var(--color-text)" : "var(--color-text-muted)",
					maxWidth,
				}}
			>
				{def.name}
			</span>
		</div>
	);
}
