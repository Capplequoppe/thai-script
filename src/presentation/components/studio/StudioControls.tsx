/**
 * The two controls the deck studio repeats most: a self-sizing text box and a
 * compact clip player. Development only — see `pages/StudioPage.tsx`.
 */
import {
	type MouseEvent,
	type TextareaHTMLAttributes,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

/**
 * A textarea that is always exactly as tall as its content.
 *
 * Narration lines run from four words to fifty-five, and a fixed height is
 * wrong at both ends: short lines waste half the column, long ones hide their
 * own ending behind a scrollbar. Since the editor exists to compare a line
 * against the clip it produced, a line you cannot see all of is the one thing
 * it must not do.
 *
 * `useLayoutEffect` rather than `useEffect`, so measuring and setting happen
 * before paint — with the latter the box is briefly one row tall and the page
 * jumps on every keystroke. Height is reset to `auto` first because
 * `scrollHeight` never reports less than the element's current height; without
 * that the box grows and never shrinks again.
 */
export function AutoTextarea({
	value,
	onChange,
	className = "",
	...rest
}: {
	value: string;
	onChange: (value: string) => void;
	className?: string;
} & Omit<
	TextareaHTMLAttributes<HTMLTextAreaElement>,
	"value" | "onChange" | "className"
>) {
	const ref = useRef<HTMLTextAreaElement>(null);

	// `value` is not read below: it is the *trigger*. The element must be
	// re-measured after React has written the new text into it, and without the
	// dependency the box keeps whatever height its first render produced.
	// biome-ignore lint/correctness/useExhaustiveDependencies: measured on change, not read
	useLayoutEffect(() => {
		const node = ref.current;
		if (!node) return;
		node.style.height = "auto";
		node.style.height = `${node.scrollHeight}px`;
	}, [value]);

	return (
		<textarea
			ref={ref}
			rows={1}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			className={`resize-none overflow-hidden ${className}`}
			{...rest}
		/>
	);
}

function clock(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const whole = Math.floor(seconds);
	return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * A compact player for one clip.
 *
 * The native `<audio controls>` widget is a few hundred pixels of browser
 * chrome that looks different in every browser, and there is one per clip —
 * six on a single slide. This is the same element with `controls` off and a
 * slim bar drawn over it: play, a scrubbable track, and elapsed of total.
 *
 * `preload="none"` on purpose. A slide holds up to six clips and a deck
 * eighteen slides; letting each fetch itself on render would pull a deck's
 * entire audio down to draw a page nobody has pressed play on.
 */
export function ClipPlayer({
	src,
	stale = false,
}: {
	src: string;
	stale?: boolean;
}) {
	const ref = useRef<HTMLAudioElement>(null);
	const [playing, setPlaying] = useState(false);
	const [time, setTime] = useState(0);
	const [duration, setDuration] = useState(0);

	// A regenerated clip keeps its URL but not its bytes, so a cache-busted
	// `src` arrives for what is visually the same row. Resetting stops a stale
	// progress bar being drawn over a fresh take.
	useEffect(() => {
		setPlaying(false);
		setTime(0);
		setDuration(0);
	}, []);

	const progress = duration > 0 ? (time / duration) * 100 : 0;

	function scrub(event: MouseEvent<HTMLButtonElement>) {
		const node = ref.current;
		if (!node || !Number.isFinite(node.duration)) return;
		const bounds = event.currentTarget.getBoundingClientRect();
		const ratio = (event.clientX - bounds.left) / bounds.width;
		node.currentTime = Math.min(Math.max(ratio, 0), 1) * node.duration;
	}

	return (
		<div
			className={`flex min-w-0 flex-1 items-center gap-2 rounded-full border px-2 py-1 transition ${
				stale
					? "border-amber-300 bg-amber-50"
					: "border-slate-200 bg-slate-50 hover:border-slate-300"
			}`}
		>
			<button
				type="button"
				aria-label={playing ? "Pause" : "Play"}
				onClick={() => {
					const node = ref.current;
					if (!node) return;
					if (node.paused) void node.play();
					else node.pause();
				}}
				className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-800 text-white transition hover:bg-slate-600"
			>
				{playing ? (
					<svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
						<title>Pause</title>
						<rect x="1" y="1" width="3" height="8" fill="currentColor" />
						<rect x="6" y="1" width="3" height="8" fill="currentColor" />
					</svg>
				) : (
					<svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
						<title>Play</title>
						<path d="M2 1 L9 5 L2 9 Z" fill="currentColor" />
					</svg>
				)}
			</button>

			<button
				type="button"
				aria-label="Seek"
				className="h-4 min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 py-1.5"
				onClick={scrub}
			>
				<div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
					<div
						className="h-full rounded-full bg-slate-700"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</button>

			<span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums">
				{clock(time)}
				<span className="text-slate-400">/{clock(duration)}</span>
			</span>

			{/* biome-ignore lint/a11y/useMediaCaption: narration audio generated
			    from the script beside it; the text is already on screen. */}
			<audio
				ref={ref}
				src={src}
				preload="none"
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onEnded={() => setPlaying(false)}
				onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
				onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
			/>
		</div>
	);
}
