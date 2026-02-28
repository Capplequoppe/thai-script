import { type ReactNode, useCallback, useEffect, useState } from "react";
import type { LessonSummary } from "../../domain/script/services/ScriptLessonService";
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
			<div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
				{isEmbedUrl(url) ? (
					<iframe
						src={url}
						title={title}
						className="absolute inset-0 w-full h-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					/>
				) : (
					<video
						src={url}
						title={title}
						className="absolute inset-0 w-full h-full"
						controls
						preload="metadata"
					/>
				)}
			</div>
			<p className="text-sm text-gray-500 text-center">
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
			<div className="flex justify-between items-center text-sm text-gray-500">
				<span>
					{idx + 1} / {slides.length}
				</span>
				<span className="capitalize px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">
					{current.type}
				</span>
			</div>

			{/* Progress bar */}
			<div className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full">
				<div
					className="h-full bg-indigo-600 rounded-full transition-all"
					style={{ width: `${((idx + 1) / slides.length) * 100}%` }}
				/>
			</div>

			{current.render()}

			<div className="flex gap-3">
				{idx > 0 && (
					<button
						onClick={goBack}
						className="py-3 px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold transition-colors"
					>
						Back
					</button>
				)}
				<button
					onClick={advance}
					className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
				>
					{isLast ? "Start Quiz" : "Next"}
				</button>
			</div>
		</div>
	);
}
