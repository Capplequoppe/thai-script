import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Plays a short list of clips back to back, with one button to stop them.
 *
 * Written for the consonant dialog, where the native name is spoken by the
 * Thai voice and the explanation by the English narrator — two clips rather
 * than one recording, because merging them offline would mean regenerating
 * both whenever either changed, and would put an English-accented Thai name
 * one careless edit away. The tone-rule scenes then wanted the same thing for
 * the same reason, which is when this moved out of that file.
 *
 * Deliberately not `DeckSlide`'s `playSequence`: that carries the playback
 * rate and the per-language gaps a lesson slide needs, this needs neither,
 * and it is not exported.
 */
export function useClipSequence(urls: readonly string[]): {
	playing: boolean;
	play: () => void;
	stop: () => void;
} {
	const [playing, setPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const stop = useCallback(() => {
		audioRef.current?.pause();
		audioRef.current = null;
		setPlaying(false);
	}, []);

	// Closing the dialog, or walking out of the place, must not leave a voice
	// talking to an empty screen.
	useEffect(() => stop, [stop]);

	const play = useCallback(() => {
		if (urls.length === 0) return;
		stop();
		setPlaying(true);

		let index = 0;
		const next = (): void => {
			const url = urls[index];
			if (url === undefined) {
				setPlaying(false);
				audioRef.current = null;
				return;
			}
			index += 1;
			const audio = new Audio(url);
			audioRef.current = audio;
			audio.addEventListener("ended", next);
			// A missing clip takes only itself down: ฃ and ฅ have no native
			// recording at all, so the English half still plays.
			audio.addEventListener("error", next);
			void audio.play?.()?.catch?.(() => next());
		};
		next();
	}, [urls, stop]);

	return { playing, play, stop };
}
