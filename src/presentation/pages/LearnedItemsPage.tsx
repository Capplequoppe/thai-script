import { useMemo, useState } from "react";
import type {
	ConsonantSummary,
	LessonSummary,
	ToneMarkSummary,
	VowelSummary,
} from "../../domain/script/services/ScriptLessonService";
import { ClassBadge } from "../components/atoms/ClassBadge";
import {
	ConsonantCard,
	ToneMarkCard,
	VowelCard,
} from "../components/organisms/SymbolCard";
import { useApp } from "../hooks/useApp";

type Tab = "consonants" | "vowels" | "toneMarks" | "vocabulary" | "videos";

function isEmbedUrl(url: string): boolean {
	return (
		url.includes("youtube.com") ||
		url.includes("youtu.be") ||
		url.includes("vimeo.com")
	);
}

function TileAudioButton({ audioUrl }: { audioUrl: string }) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: interactive span with role="button" is intentional for inline audio trigger
		<span
			role="button"
			tabIndex={0}
			onClick={(e) => {
				e.stopPropagation();
				new Audio(audioUrl).play();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					e.stopPropagation();
					new Audio(audioUrl).play();
				}
			}}
			className="absolute top-1 right-1 text-xs opacity-50 hover:opacity-100 cursor-pointer"
			aria-label="Play pronunciation"
		>
			🔊
		</span>
	);
}

function VideoPlayer({
	lesson,
	onBack,
}: {
	lesson: LessonSummary;
	onBack: () => void;
}) {
	const url = lesson.videoUrl!;
	return (
		<div className="space-y-4">
			<button
				type="button"
				onClick={onBack}
				className="text-sm hover:underline"
				style={{ color: "var(--color-primary)" }}
			>
				&larr; Back to list
			</button>
			<h2 className="text-lg font-bold">
				Lesson {lesson.lessonNumber}: {lesson.title}
			</h2>
			<div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
				{isEmbedUrl(url) ? (
					<iframe
						src={url}
						title={lesson.title}
						className="absolute inset-0 w-full h-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					/>
				) : (
					// biome-ignore lint/a11y/useMediaCaption: Thai pronunciation videos are self-explanatory
					<video
						src={url}
						title={lesson.title}
						className="absolute inset-0 w-full h-full"
						controls
						preload="metadata"
					/>
				)}
			</div>
			<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
				{lesson.focus}
			</p>
		</div>
	);
}

export function LearnedItemsPage() {
	const { state, lesson } = useApp();
	const [tab, setTab] = useState<Tab>("consonants");
	const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

	// Collect all learned items across completed lessons
	const { consonants, vowels, toneMarks, videos } = useMemo(() => {
		const c: ConsonantSummary[] = [];
		const v: VowelSummary[] = [];
		const t: ToneMarkSummary[] = [];
		const vids: LessonSummary[] = [];

		for (const lessonNum of [...state.completedLessons].sort((a, b) => a - b)) {
			const summary = lesson.getScriptSummary(lessonNum);
			c.push(...summary.consonants);
			v.push(...summary.vowels);
			t.push(...summary.toneMarks);
			if (summary.videoUrl) {
				vids.push(summary);
			}
		}

		return { consonants: c, vowels: v, toneMarks: t, videos: vids };
	}, [state.completedLessons, lesson]);

	// Collect learned vocabulary words (deduplicated by wordThai, prefer thaiToEnglish for English meaning)
	const vocabWords = useMemo(() => {
		const byWord = new Map<
			string,
			{ thai: string; english: string; audioUrl?: string }
		>();
		for (const card of Object.values(state.vocabCards)) {
			const existing = byWord.get(card.wordThai);
			if (!existing || card.property === "thaiToEnglish") {
				byWord.set(card.wordThai, {
					thai: card.wordThai,
					english:
						card.property === "thaiToEnglish"
							? card.correctAnswer
							: (existing?.english ?? card.question),
					audioUrl: card.audioUrl ?? existing?.audioUrl,
				});
			}
		}
		return Array.from(byWord.values());
	}, [state.vocabCards]);

	const tabs: { key: Tab; label: string; count: number }[] = [
		{ key: "consonants", label: "Consonants", count: consonants.length },
		{ key: "vowels", label: "Vowels", count: vowels.length },
		{ key: "toneMarks", label: "Tones", count: toneMarks.length },
		{ key: "vocabulary", label: "Vocab", count: vocabWords.length },
		{ key: "videos", label: "Videos", count: videos.length },
	];

	const total =
		consonants.length + vowels.length + toneMarks.length + vocabWords.length;

	if (total === 0) {
		return (
			<div className="text-center py-16 space-y-4">
				<span className="text-6xl">📚</span>
				<h1 className="text-2xl font-bold">No items learned yet</h1>
				<p style={{ color: "var(--color-text-muted)" }}>
					Complete a lesson to see your learned symbols here.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 py-4">
			<h1 className="text-2xl font-bold">Learned Items</h1>

			{/* Tabs */}
			<div
				className="flex gap-1 rounded-xl p-1"
				style={{ background: "var(--color-surface-2)" }}
			>
				{tabs.map(({ key, label, count }) => (
					<button
						type="button"
						key={key}
						onClick={() => {
							setTab(key);
							setSelectedIdx(null);
						}}
						className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
						style={
							tab === key
								? {
										background: "var(--color-surface)",
										color: "var(--color-text)",
										boxShadow:
											"0 1px 3px color-mix(in srgb, var(--color-text) 10%, transparent)",
									}
								: { color: "var(--color-text-muted)" }
						}
					>
						{label}{" "}
						<span
							className="text-xs"
							style={{ color: "var(--color-text-muted)" }}
						>
							({count})
						</span>
					</button>
				))}
			</div>

			{/* Detail view */}
			{selectedIdx !== null && tab !== "videos" && tab !== "vocabulary" && (
				<div
					className="border rounded-xl p-4"
					style={{ borderColor: "var(--color-border)" }}
				>
					<button
						type="button"
						onClick={() => setSelectedIdx(null)}
						className="text-sm mb-4 hover:underline"
						style={{ color: "var(--color-primary)" }}
					>
						← Back to list
					</button>
					{tab === "consonants" && consonants[selectedIdx] && (
						<ConsonantCard c={consonants[selectedIdx]} />
					)}
					{tab === "vowels" && vowels[selectedIdx] && (
						<VowelCard v={vowels[selectedIdx]} />
					)}
					{tab === "toneMarks" && toneMarks[selectedIdx] && (
						<ToneMarkCard t={toneMarks[selectedIdx]} />
					)}
				</div>
			)}

			{/* Grid view */}
			{selectedIdx === null && tab === "consonants" && (
				<div className="grid grid-cols-4 gap-2">
					{consonants.map((c, i) => (
						<button
							type="button"
							key={c.character}
							onClick={() => setSelectedIdx(i)}
							className="relative flex flex-col items-center p-3 rounded-xl transition-colors"
							style={{ background: "var(--color-surface-2)" }}
						>
							{c.audioUrl && <TileAudioButton audioUrl={c.audioUrl} />}
							<span className="thai text-4xl">{c.character}</span>
							<span
								className="text-[10px] mt-1 truncate w-full text-center"
								style={{ color: "var(--color-text-muted)" }}
							>
								{c.nameRomanized}
							</span>
							<ClassBadge classType={c.classType} />
						</button>
					))}
				</div>
			)}

			{selectedIdx === null && tab === "vowels" && (
				<div className="grid grid-cols-4 gap-2">
					{vowels.map((v, i) => (
						<button
							type="button"
							key={v.character}
							onClick={() => setSelectedIdx(i)}
							className="relative flex flex-col items-center p-3 rounded-xl transition-colors"
							style={{ background: "var(--color-surface-2)" }}
						>
							{v.audioUrl && <TileAudioButton audioUrl={v.audioUrl} />}
							<span className="thai text-4xl">{v.character}</span>
							<span
								className="text-[10px] mt-1"
								style={{ color: "var(--color-text-muted)" }}
							>
								{v.name}
							</span>
							<span
								className="text-[10px] mt-0.5 px-1.5 rounded"
								style={{
									background:
										v.length === "long"
											? "color-mix(in srgb, var(--color-enlightened) 15%, var(--color-surface))"
											: "color-mix(in srgb, var(--color-guru) 15%, var(--color-surface))",
									color:
										v.length === "long"
											? "var(--color-enlightened)"
											: "var(--color-guru)",
								}}
							>
								{v.length}
							</span>
						</button>
					))}
				</div>
			)}

			{selectedIdx === null && tab === "toneMarks" && (
				<div className="grid grid-cols-4 gap-2">
					{toneMarks.map((t, i) => (
						<button
							type="button"
							key={t.character}
							onClick={() => setSelectedIdx(i)}
							className="relative flex flex-col items-center p-3 rounded-xl transition-colors"
							style={{ background: "var(--color-surface-2)" }}
						>
							{t.audioUrl && <TileAudioButton audioUrl={t.audioUrl} />}
							<span className="thai text-4xl">{t.character}</span>
							<span
								className="text-[10px] mt-1"
								style={{ color: "var(--color-text-muted)" }}
							>
								{t.name}
							</span>
						</button>
					))}
				</div>
			)}

			{selectedIdx === null && tab === "vocabulary" && (
				<div className="grid grid-cols-3 gap-2">
					{vocabWords.map((w) => (
						<div
							key={w.thai}
							className="relative flex flex-col items-center p-3 rounded-xl"
							style={{ background: "var(--color-surface-2)" }}
						>
							{w.audioUrl && <TileAudioButton audioUrl={w.audioUrl} />}
							<span className="thai text-3xl">{w.thai}</span>
							<span
								className="text-[10px] mt-1 text-center leading-tight"
								style={{ color: "var(--color-text-muted)" }}
							>
								{w.english}
							</span>
						</div>
					))}
				</div>
			)}

			{tab === "videos" && selectedIdx === null && (
				<div className="space-y-3">
					{videos.map((lesson, i) => (
						<button
							type="button"
							key={lesson.lessonNumber}
							onClick={() => setSelectedIdx(i)}
							className="w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left"
							style={{ background: "var(--color-surface-2)" }}
						>
							<div
								className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
								style={{
									background:
										"color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))",
									color: "var(--color-primary)",
								}}
							>
								{lesson.lessonNumber}
							</div>
							<div className="min-w-0">
								<div className="font-semibold truncate">{lesson.title}</div>
								<div
									className="text-sm truncate"
									style={{ color: "var(--color-text-muted)" }}
								>
									{lesson.focus}
								</div>
							</div>
						</button>
					))}
				</div>
			)}

			{tab === "videos" && selectedIdx !== null && videos[selectedIdx] && (
				<VideoPlayer
					lesson={videos[selectedIdx]}
					onBack={() => setSelectedIdx(null)}
				/>
			)}
		</div>
	);
}
