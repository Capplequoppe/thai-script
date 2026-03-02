import { Outlet } from "react-router";
import { useApp } from "../../hooks/useApp";
import { BottomTabBar } from "./BottomTabBar";
// import { HudStrip } from "./HudStrip";

export function Layout() {
	const { state, lesson, review } = useApp();
	const dueCount = review.getDueCount();

	return (
		<div
			className="min-h-screen flex flex-col"
			style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
		>
			{/* Always-visible HUD strip */}
			{/* <HudStrip dueCount={dueCount} sessionHistory={state.sessionHistory} /> */}

			{/* Desktop-only top navigation bar */}
			<header
				className="hidden md:flex px-6 py-3 items-center gap-6"
				style={{
					background: "var(--color-surface)",
					borderBottom: "1px solid var(--color-border)",
				}}
			>
				<BottomTabBar
					vocabUnlocked={lesson.getVocabUnlockedCount() > 0}
					grammarUnlocked={lesson.getGrammarUnlockedCount() > 0}
					sentenceUnlocked={lesson.getSentenceUnlockedCount() > 0}
					dueCount={dueCount}
				/>
			</header>

			{/* Page content — extra bottom padding on mobile for tab bar */}
			<main className="flex-1 p-4 pb-24 md:pb-4 max-w-2xl mx-auto w-full">
				<Outlet />
			</main>

			{/* Mobile fixed bottom tab bar — mobileOnly suppresses the desktop nav duplicate */}
			<BottomTabBar
				vocabUnlocked={lesson.getVocabUnlockedCount() > 0}
				grammarUnlocked={lesson.getGrammarUnlockedCount() > 0}
				sentenceUnlocked={lesson.getSentenceUnlockedCount() > 0}
				dueCount={dueCount}
				mobileOnly
			/>
		</div>
	);
}
