import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import type { LessonContent } from "../../../domain/script/data/lessonContent";
import type { LessonSummary } from "../../../domain/script/services/ScriptLessonService";
import { DeckSlide } from "./DeckSlide";
import {
	ConsonantCard,
	NumeralCard,
	RareVowelCard,
	ToneMarkCard,
	ToneRuleCard,
	VowelCard,
} from "./SymbolCard";

interface Props {
	summary: LessonSummary;
	/**
	 * What this lesson serves. Already resolved by the caller
	 * (`LessonPage`/`CatchUpPage`): a lesson that can't be resolved at all is
	 * that caller's error state, not this component's. `LessonContent` is a
	 * single-arm union now that task 6.2 removed the licensed-video arm, but
	 * it stays a discriminated union — see `lessonContent.ts` — so a future
	 * content source doesn't fall through silently.
	 */
	content: LessonContent;
	onComplete: () => void;
}

interface Slide {
	type: string;
	render: () => ReactNode;
}

export function LessonIntro({ summary, content, onComplete }: Props) {
	// A deck lesson stages two phases: the deck itself (which owns its own
	// stepping, see `DeckSlide`), then the symbol cards below, using this
	// component's own stepping exactly as the video arm already does. All
	// hooks below are called unconditionally regardless of phase — the
	// dispatch happens only in what's returned, never in which hooks run.
	const [deckDone, setDeckDone] = useState(false);
	const deckPhase = content.kind === "deck" && !deckDone;

	const cardSlides: Slide[] = [
		...summary.consonants.map((c) => ({
			type: "consonant",
			render: () => <ConsonantCard c={c} />,
		})),
		...summary.vowels.map((v) => ({
			type: "vowel",
			render: () => <VowelCard v={v} />,
		})),
		...summary.toneMarks.map((t) => ({
			type: "tone mark",
			render: () => <ToneMarkCard t={t} />,
		})),
		...summary.rareVowels.map((v) => ({
			type: "rare vowel",
			render: () => <RareVowelCard v={v} />,
		})),
		...summary.numerals.map((n) => ({
			type: "numeral",
			render: () => <NumeralCard n={n} />,
		})),
		...summary.toneRules.map((r) => ({
			type: "tone rule",
			render: () => <ToneRuleCard description={r.description} />,
		})),
	];

	const slides: Slide[] = cardSlides;

	const [idx, setIdx] = useState(0);
	const current = deckPhase ? undefined : slides[idx];
	const isLast = !deckPhase && idx === slides.length - 1;

	const advance = useCallback(() => {
		if (isLast) onComplete();
		else setIdx((i) => i + 1);
	}, [isLast, onComplete]);

	const goBack = useCallback(() => {
		if (idx > 0) setIdx((i) => i - 1);
	}, [idx]);

	useEffect(() => {
		if (deckPhase) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				advance();
			} else if (e.key === "ArrowLeft" || e.key === "Backspace") {
				e.preventDefault();
				goBack();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [advance, goBack, deckPhase]);

	if (deckPhase) {
		return (
			<div className="space-y-6">
				<DeckSlide
					deckPath={content.deckPath}
					onComplete={() => setDeckDone(true)}
				/>
			</div>
		);
	}

	if (!current) return null;

	return (
		<div className="space-y-6">
			<div
				className="flex justify-between items-center text-sm"
				style={{ color: "var(--color-text-muted)" }}
			>
				<span>
					{idx + 1} / {slides.length}
				</span>
				<span
					className="capitalize px-2 py-0.5 rounded text-xs"
					style={{ background: "var(--color-surface-2)" }}
				>
					{current.type}
				</span>
			</div>

			{/* Progress bar */}
			<div
				className="w-full h-1 rounded-full"
				style={{ background: "var(--color-border)" }}
			>
				<div
					className="h-full rounded-full transition-all"
					style={{
						background: "var(--color-accent)",
						width: `${((idx + 1) / slides.length) * 100}%`,
					}}
				/>
			</div>

			{current.render()}

			<div className="flex gap-3">
				{idx > 0 && (
					<Button
						variant="secondary"
						onClick={goBack}
						className="px-6 py-3 h-auto rounded-xl"
					>
						Back
					</Button>
				)}
				<Button onClick={advance} className="flex-1 py-3 h-auto rounded-xl">
					{isLast ? "Start Quiz" : "Next"}
				</Button>
			</div>
		</div>
	);
}
