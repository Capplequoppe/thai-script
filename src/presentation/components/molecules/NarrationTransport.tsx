import { useCallback, useEffect, useState } from "react";
import {
	DEFAULT_PLAYBACK_RATE,
	getPlaybackRate,
	PLAYBACK_RATES,
	type PlaybackRate,
	setPlaybackRate,
} from "../../../infrastructure/settings/PlaybackSettings";

/**
 * The learner's controls over a slide's narration: play, stop, restart, speed.
 *
 * The button here used to be replay alone, which assumed the only thing a
 * learner wants is to hear it again. The other two wants are at least as
 * common and had no answer: stopping it — because someone walked in, or
 * because the slide's text is being read instead — and restarting from the
 * top after losing the thread halfway.
 *
 * Speed is remembered across slides and lessons rather than per slide. A
 * learner who needs 0.75 needs it for the whole course, and being asked again
 * on every slide would be its own kind of punishment.
 */
export function NarrationTransport({
	playing,
	onPlay,
	onStop,
	onRestart,
	rate,
	onRate,
}: {
	playing: boolean;
	onPlay: () => void;
	onStop: () => void;
	onRestart: () => void;
	rate: PlaybackRate;
	onRate: (rate: PlaybackRate) => void;
}) {
	return (
		<div className="flex flex-wrap items-center justify-center gap-2">
			<button
				type="button"
				onClick={playing ? onStop : onPlay}
				className="inline-flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-colors"
				style={{
					background: "var(--color-surface-2)",
					color: "var(--color-primary)",
				}}
				aria-label={playing ? "Stop audio" : "Play audio"}
			>
				{playing ? "⏸" : "🔊"}
			</button>

			<button
				type="button"
				onClick={onRestart}
				className="inline-flex h-12 w-12 items-center justify-center rounded-full text-xl transition-colors"
				style={{
					background: "var(--color-surface-2)",
					color: "var(--color-primary)",
				}}
				aria-label="Restart audio from the beginning"
			>
				⏮
			</button>

			<div
				className="flex items-center gap-0.5 rounded-full p-1"
				style={{ background: "var(--color-surface-2)" }}
				// A group rather than a `<select>`: every rate is one press, and
				// a learner mid-sentence at the wrong speed should not have to
				// open a menu to escape it.
				role="group"
				aria-label="Playback speed"
			>
				{PLAYBACK_RATES.map((value) => (
					<button
						type="button"
						key={value}
						onClick={() => onRate(value)}
						aria-pressed={value === rate}
						className="rounded-full px-2 py-1 text-xs tabular-nums transition-colors"
						style={
							value === rate
								? {
										background: "var(--color-primary)",
										color: "var(--color-surface-1)",
									}
								: { color: "var(--color-text-muted)" }
						}
					>
						{value === 1 ? "1×" : `${value}×`}
					</button>
				))}
			</div>
		</div>
	);
}

/**
 * The remembered playback rate, loaded once and written back on every change.
 *
 * Read lazily rather than in an effect so the first clip of a session plays at
 * the learner's own speed: an effect would run after that clip had already
 * started at 1.0, and the one slide where the setting is most likely to be
 * changed is the first one where it was needed.
 */
export function usePlaybackRate(): [
	PlaybackRate,
	(rate: PlaybackRate) => void,
] {
	const [rate, setRate] = useState<PlaybackRate>(() => {
		try {
			return getPlaybackRate();
		} catch {
			// Private windows and blocked site data throw on access rather than
			// returning nothing. Narration at the default speed is a far better
			// outcome than a deck that will not render.
			return DEFAULT_PLAYBACK_RATE;
		}
	});

	const choose = useCallback((next: PlaybackRate) => {
		setRate(next);
		try {
			setPlaybackRate(next);
		} catch {
			// Kept for this session even when it cannot be persisted.
		}
	}, []);

	// Another tab may have changed it — a learner with the deck open twice
	// should not have two speeds.
	useEffect(() => {
		const onStorage = () => {
			try {
				setRate(getPlaybackRate());
			} catch {
				/* leave it as it is */
			}
		};
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, []);

	return [rate, choose];
}
