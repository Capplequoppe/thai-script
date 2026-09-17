import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import type { LessonContent } from "../../../domain/script/data/lessonContent";
import type { LessonSummary } from "../../../domain/script/services/ScriptLessonService";
import { DeckSlide } from "./DeckSlide";
import {
	ConsonantCard,
	NumeralCard,
	RareVowelCard,
	SpecialRuleCard,
	ToneMarkCard,
	ToneRuleCard,
	VowelCard,
} from "./SymbolCard";

interface Props {
	summary: LessonSummary;
	/**
	 * What this lesson serves — a licensed video or an in-house deck. Already
	 * resolved by the caller (`LessonPage`/`CatchUpPage`): a lesson that can't
	 * be resolved at all is that caller's error state, not this component's.
	 */
	content: LessonContent;
	/**
	 * Skips the video slide even when `content` is the video arm — what
	 * `CatchUpPage` needs, since a catch-up lesson was already watched the
	 * first time around. Never affects the deck arm, which a catch-up
	 * learner sees for the first time either way.
	 */
	suppressVideo?: boolean;
	onComplete: () => void;
}

interface Slide {
	type: string;
	render: () => ReactNode;
}

function isEmbedUrl(url: string): boolean {
	return (
		url.includes("youtube.com") ||
		url.includes("youtu.be") ||
		url.includes("vimeo.com")
	);
}

function VideoSlide({ url, title }: { url: string; title: string }) {
	return (
		<div className="space-y-4">
			<h2 className="text-lg font-bold text-center">{title}</h2>
			<div className="relative w-full aspect-video max-h-[40vh] rounded-xl overflow-hidden bg-black">
				{isEmbedUrl(url) ? (
					<iframe
						src={url}
						title={title}
						className="absolute inset-0 w-full h-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					/>
				) : (
					// biome-ignore lint/a11y/useMediaCaption: Thai pronunciation videos are self-explanatory
					<video
						src={url}
						title={title}
						className="absolute inset-0 w-full h-full"
						controls
						preload="metadata"
					/>
				)}
			</div>
			<p
				className="text-sm text-center"
				style={{ color: "var(--color-text-muted)" }}
			>
				Watch the introduction, then continue to learn the symbols.
			</p>
		</div>
	);
}

export function LessonIntro({
	summary,
	content,
	suppressVideo,
	onComplete,
}: Props) {
	// A deck lesson stages two phases: the deck itself (which owns its own
	// stepping, see `DeckSlide`), then the symbol cards below, using this
	// component's own stepping exactly as the video arm already does. All
	// hooks below are called unconditionally regardless of phase — the
	// dispatch happens only in what's returned, never in which hooks run.
	const [deckDone, setDeckDone] = useState(false);
	// `LessonContent` carries both arms again, so the deck phase is gated on
	// the discriminant as well as on `deckDone`. The check is what narrows
	// `content` to the deck arm at the render site below; without it a video
	// lesson would fall into the deck branch and read a `deckPath` it has not
	// got.
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
		// Last, deliberately: a special rule qualifies how the tone rules
		// above are applied (ห นำ changes which class you apply them with),
		// so it reads as a caveat only once they have been stated.
		...summary.specialRules.map((r) => ({
			type: "special rule",
			render: () => (
				<SpecialRuleCard title={r.title} description={r.description} />
			),
		})),
	];

	const slides: Slide[] =
		content.kind === "video" && !suppressVideo
			? [
					{
						type: "video",
						render: () => (
							<VideoSlide
								url={content.url}
								title={`Lesson ${summary.lessonNumber}: ${summary.title}`}
							/>
						),
					},
					...cardSlides,
				]
			: cardSlides;

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
