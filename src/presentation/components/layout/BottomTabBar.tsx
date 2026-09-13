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

function GraduationIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className="w-6 h-6"
			aria-hidden="true"
		>
			<title>Learn</title>
			<path d="M12 4L2 8.5l10 4.5 10-4.5L12 4z" opacity="0.9" />
			<path
				d="M6 11v4.2c0 1.6 2.7 2.8 6 2.8s6-1.2 6-2.8V11l-6 2.7L6 11z"
				opacity="0.5"
			/>
			<rect x="20.4" y="8.5" width="1.2" height="6" rx="0.6" opacity="0.7" />
		</svg>
	);
}

function SearchIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className="w-6 h-6"
			aria-hidden="true"
		>
			<title>Dictionary</title>
			<circle cx="10" cy="10" r="6.5" opacity="0.15" />
			<circle
				cx="10"
				cy="10"
				r="6.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<rect
				x="14.8"
				y="14.8"
				width="2.4"
				height="7.5"
				rx="1.2"
				transform="rotate(45 14.8 14.8)"
			/>
		</svg>
	);
}

interface BottomTabBarProps {
	vocabUnlocked: boolean;
	dueCount: number;
	mobileOnly?: boolean;
}

const ACTIVE = "text-[var(--color-accent)]";
const INACTIVE =
	"text-[var(--color-text-muted)] hover:text-[var(--color-text)]";

export function BottomTabBar({
	vocabUnlocked,
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
		{ to: "/learn", end: false, label: "Learn", icon: <GraduationIcon /> },
		{ to: "/items", end: false, label: "Items", icon: <GemIcon /> },
		...(vocabUnlocked
			? [
					{
						to: "/dictionary",
						end: false,
						label: "Dictionary",
						icon: <SearchIcon />,
					},
				]
			: []),
		{ to: "/progress", end: false, label: "Progress", icon: <PagodaIcon /> },
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
				<div className="flex items-center gap-1 h-16 px-2 overflow-x-auto">
					{tabs.map(({ to, end, label, icon, badge }) => (
						<NavLink
							key={to}
							to={to}
							end={end}
							className={({ isActive }) =>
								`flex flex-shrink-0 flex-col items-center gap-0.5 text-[10px] font-medium relative px-3 py-1 transition-colors ${
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
				</nav>
			)}
		</>
	);
}
