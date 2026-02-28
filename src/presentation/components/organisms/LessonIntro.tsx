import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import type { LessonSummary } from "../../../domain/script/services/ScriptLessonService";
import {
	ConsonantCard,
	ToneMarkCard,
	ToneRuleCard,
	VowelCard,
} from "./SymbolCard";

interface Props {
	summary: LessonSummary;
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

export function LessonIntro({ summary, onComplete }: Props) {
	const slides: Slide[] = [
		...(summary.videoUrl
			? [
					{
						type: "video",
						render: () => (
							<VideoSlide
								// biome-ignore lint/style/noNonNullAssertion: guarded by outer summary.videoUrl check
								url={summary.videoUrl!}
								title={`Lesson ${summary.lessonNumber}: ${summary.title}`}
							/>
						),
					},
				]
			: []),
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
		...summary.toneRules.map((r) => ({
			type: "tone rule",
			render: () => <ToneRuleCard description={r.description} />,
		})),
	];

	const [idx, setIdx] = useState(0);
	const current = slides[idx];
	const isLast = idx === slides.length - 1;

	const advance = useCallback(() => {
		if (isLast) onComplete();
		else setIdx((i) => i + 1);
	}, [isLast, onComplete]);

	const goBack = useCallback(() => {
		if (idx > 0) setIdx((i) => i - 1);
	}, [idx]);

	useEffect(() => {
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
	}, [advance, goBack]);

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
