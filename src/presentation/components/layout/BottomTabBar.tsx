import { NavLink } from "react-router";

function LotusIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className="w-6 h-6"
			aria-hidden="true"
		>
			<title>Home</title>
			<path
				d="M12 3C10 6 7 8 7 11c0 2.8 2.2 5 5 5s5-2.2 5-5c0-3-3-6-5-8z"
				opacity="0.5"
			/>
			<path d="M12 8C10.5 10.5 10 12 10 13.5a2 2 0 004 0c0-1.5-.5-3-2-5.5z" />
			<ellipse cx="12" cy="21" rx="3" ry="1" opacity="0.2" />
		</svg>
	);
}

function GemIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className="w-6 h-6"
			aria-hidden="true"
		>
			<title>Items</title>
			<path d="M6 9l6 12 6-12H6z" />
			<path d="M2 9l4 0L8 5H5z" opacity="0.7" />
			<path d="M22 9l-4 0L16 5h3z" opacity="0.7" />
			<path d="M5 5h14l2 4H3z" opacity="0.5" />
		</svg>
	);
}

function PagodaIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className="w-6 h-6"
			aria-hidden="true"
		>
			<title>Progress</title>
			<path d="M12 2l1.5 4h-3z" />
			<rect x="9.5" y="6" width="5" height="2.5" rx="0.5" />
			<rect x="7.5" y="8.5" width="9" height="2.5" rx="0.5" />
			<rect x="5.5" y="11" width="13" height="2.5" rx="0.5" />
			<rect x="7" y="13.5" width="10" height="6" rx="0.5" />
		</svg>
	);
}

function BookIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className="w-6 h-6"
			aria-hidden="true"
		>
			<title>Vocab</title>
			<path d="M4 4h7a2 2 0 012 2v13a1.5 1.5 0 00-1.5-1.5H4V4z" opacity="0.5" />
			<path d="M20 4h-7a2 2 0 00-2 2v13a1.5 1.5 0 011.5-1.5H20V4z" />
			<path d="M4 19.5h7.5A1.5 1.5 0 0113 21H4v-1.5z" opacity="0.4" />
			<path d="M20 19.5h-7.5A1.5 1.5 0 0011 21h9v-1.5z" opacity="0.7" />
		</svg>
	);
}

function GearIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className="w-6 h-6"
			aria-hidden="true"
		>
			<title>Settings</title>
			<path d="M12 15a3 3 0 100-6 3 3 0 000 6z" opacity="0.9" />
			<path
				d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
				opacity="0.5"
			/>
		</svg>
	);
}

interface BottomTabBarProps {
	vocabUnlocked: boolean;
	grammarUnlocked: boolean;
	sentenceUnlocked: boolean;
	dueCount: number;
	mobileOnly?: boolean;
}

const ACTIVE = "text-[var(--color-accent)]";
const INACTIVE =
	"text-[var(--color-text-muted)] hover:text-[var(--color-text)]";

export function BottomTabBar({
	vocabUnlocked,
	grammarUnlocked,
	sentenceUnlocked,
	dueCount,
	mobileOnly = false,
}: BottomTabBarProps) {
	const tabs = [
		{
			to: "/",
			end: true,
			label: "Home",
			icon: <LotusIcon />,
			badge: dueCount > 0 ? dueCount : undefined,
		},
		{ to: "/items", end: false, label: "Items", icon: <GemIcon /> },
		...(vocabUnlocked
			? [{ to: "/vocab", end: false, label: "Vocab", icon: <BookIcon /> }]
			: []),
		{ to: "/progress", end: false, label: "Progress", icon: <PagodaIcon /> },
		{ to: "/settings", end: false, label: "Settings", icon: <GearIcon /> },
	];

	return (
		<>
			{/* Mobile bottom tab bar */}
			<nav
				className="fixed bottom-0 left-0 right-0 md:hidden z-50"
				style={{
					background: "var(--color-surface)",
					borderTop: "1px solid var(--color-border)",
				}}
			>
				<div className="flex justify-around items-center h-16 px-2">
					{tabs.map(({ to, end, label, icon, badge }) => (
						<NavLink
							key={to}
							to={to}
							end={end}
							className={({ isActive }) =>
								`flex flex-col items-center gap-0.5 text-[10px] font-medium relative px-3 py-1 transition-colors ${
									isActive ? ACTIVE : INACTIVE
								}`
							}
						>
							<span className="relative">
								{icon}
								{badge !== undefined && (
									<span
										className="absolute -top-1 -right-2 text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-bold"
										style={{ background: "var(--color-apprentice)" }}
									>
										{badge > 99 ? "99+" : badge}
									</span>
								)}
							</span>
							{label}
						</NavLink>
					))}
				</div>
			</nav>

			{/* Desktop horizontal nav */}
			{!mobileOnly && (
				<nav className="hidden md:flex gap-6 items-center">
					{tabs.map(({ to, end, label, badge }) => (
						<NavLink
							key={to}
							to={to}
							end={end}
							className={({ isActive }) =>
								`text-sm font-medium transition-colors relative ${isActive ? ACTIVE : INACTIVE}`
							}
						>
							{label}
							{badge !== undefined && badge > 0 && (
								<span
									className="ml-1.5 text-white text-[9px] rounded-full px-1.5 py-0.5 font-bold"
									style={{ background: "var(--color-apprentice)" }}
								>
									{badge}
								</span>
							)}
						</NavLink>
					))}
					{grammarUnlocked && (
						<NavLink
							to="/grammar"
							className={({ isActive }) =>
								`text-sm font-medium transition-colors ${isActive ? ACTIVE : INACTIVE}`
							}
						>
							Grammar
						</NavLink>
					)}
					{sentenceUnlocked && (
						<NavLink
							to="/sentences"
							className={({ isActive }) =>
								`text-sm font-medium transition-colors ${isActive ? ACTIVE : INACTIVE}`
							}
						>
							Sentences
						</NavLink>
					)}
				</nav>
			)}
		</>
	);
}
