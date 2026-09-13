import { useMemo } from "react";
import { Outlet } from "react-router";
import { useApp } from "../../hooks/useApp";
import { BottomTabBar } from "./BottomTabBar";
// import { HudStrip } from "./HudStrip";

export function Layout() {
	const { state, lesson, review } = useApp();

	// This shell wraps every page, so it re-renders on every answered card
	// (each review calls `refresh()`). Each of these fans out across all four
	// card pools and rebuilds every card entity from storage, and the three
	// unlock counts were being computed twice over — `BottomTabBar` is
	// rendered once for desktop and once for mobile. Computing them once per
	// learner state instead of once per render is what keeps a review session
	// off the CPU.
	// `state` is deliberately the cache key: it is the identity that changes
	// when the stored learner state changes, which is what these repository
	// reads actually depend on.
	// biome-ignore lint/correctness/useExhaustiveDependencies: explained above
	const nav = useMemo(
		() => ({
			dueCount: review.getDueCount(),
			vocabUnlocked: lesson.getVocabUnlockedCount() > 0,
			grammarUnlocked: lesson.getGrammarUnlockedCount() > 0,
			sentenceUnlocked: lesson.getSentenceUnlockedCount() > 0,
		}),
		[state, lesson, review],
	);

	return (
		<div
			className="min-h-screen flex flex-col"
			style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
		>
			{/* Always-visible HUD strip */}
			{/* <HudStrip dueCount={nav.dueCount} sessionHistory={state.sessionHistory} /> */}

			{/* Desktop-only top navigation bar */}
			<header
				className="hidden md:flex px-6 py-3 items-center gap-6"
				style={{
					background: "var(--color-surface)",
					borderBottom: "1px solid var(--color-border)",
				}}
			>
				<BottomTabBar
					vocabUnlocked={nav.vocabUnlocked}
					grammarUnlocked={nav.grammarUnlocked}
					sentenceUnlocked={nav.sentenceUnlocked}
					dueCount={nav.dueCount}
				/>
			</header>

			{/* Page content — extra bottom padding on mobile for tab bar */}
			<main className="flex-1 p-4 pb-24 md:pb-4 max-w-2xl mx-auto w-full">
				<Outlet />
			</main>

			{/* Mobile fixed bottom tab bar — mobileOnly suppresses the desktop nav duplicate */}
			<BottomTabBar
				vocabUnlocked={nav.vocabUnlocked}
				grammarUnlocked={nav.grammarUnlocked}
				sentenceUnlocked={nav.sentenceUnlocked}
				dueCount={nav.dueCount}
				mobileOnly
			/>
		</div>
	);
}
