import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { consonantNarrationFor } from "../../../domain/script/data/consonantScenes";
import { lessonEntryByNumber } from "../../../domain/script/data/lessonSequence";
import {
	consonants,
	lessons,
	type ThaiSymbolClass,
} from "../../../domain/script/data/symbols";
import type { ConsonantSummary } from "../../../domain/script/services/ScriptLessonService";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { ConsonantCard } from "./SymbolCard";

/**
 * One letter, opened from its district on the palace map.
 *
 * The map's tile shows the picture and the word, which is enough to recognise
 * a letter and not enough to study one. This is the rest of what the app knows
 * about it, in the place a learner is already standing rather than behind a
 * trip to another page — going somewhere else to read about ม is exactly the
 * navigation the palace exists to remove.
 *
 * `ConsonantCard` is reused rather than reproduced, so the letter looks the
 * same here as it does under Items. What is added is the way back out: which
 * lesson introduces this letter, and a door into it.
 */

/**
 * Where to find the lesson that introduces a letter.
 *
 * Two integer spaces meet here and they stopped being the same number at
 * position 15. `symbols.ts` files a consonant under a **legacy** lesson
 * number; routes and persisted progress speak **positions**. Reaching for the
 * legacy number as if it were a position would have been silently right for
 * the first fourteen lessons and wrong after — which is the worst shape a bug
 * can have, so the conversion is explicit and named.
 */
function lessonFor(character: string): {
	position: number;
	title: string;
} | null {
	const consonant = consonants.find((item) => item.character === character);
	const legacyNumber = consonant?.lesson;
	if (legacyNumber === undefined) return null;

	const entry = lessonEntryByNumber(legacyNumber);
	if (!entry) return null;

	const meta = lessons.find((lesson) => lesson.number === legacyNumber);
	return { position: entry.position, title: meta?.title ?? entry.id };
}

/**
 * Plays the native name, then the English explanation.
 *
 * Two clips rather than one recording, because they come from different mouths
 * for a reason: the name is Thai and is spoken by the native voice the course
 * already ships, and the explanation is English and is spoken by the narrator.
 * Merging them offline would mean regenerating both whenever either changed,
 * and would put an English-accented Thai name one careless edit away.
 *
 * Deliberately not `DeckSlide`'s `playSequence`: that carries playback rate and
 * per-language gaps a slide needs and this does not, and it is not exported.
 * Two clips and a stop button is less code than the seam would be.
 */
function useClipSequence(urls: readonly string[]) {
	const [playing, setPlaying] = useState(false);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const stop = useCallback(() => {
		audioRef.current?.pause();
		audioRef.current = null;
		setPlaying(false);
	}, []);

	// Closing the dialog mid-sentence must not leave a voice talking to an
	// empty screen.
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
			// A missing clip is not a reason to swallow the rest: ฃ and ฅ have no
			// native recording at all, so the English half still plays.
			audio.addEventListener("error", next);
			void audio.play?.()?.catch?.(() => next());
		};
		next();
	}, [urls, stop]);

	return { playing, play, stop };
}

export function ConsonantDetailDialog({
	summary,
	onClose,
}: {
	/** The letter to show, or null when nothing is open. */
	summary: ConsonantSummary | null;
	onClose: () => void;
}) {
	const navigate = useNavigate();
	const lesson = summary ? lessonFor(summary.character) : null;

	// The native name first, then the explanation — in that order because the
	// explanation refers to a sound the learner should have just heard.
	const base = import.meta.env.BASE_URL;
	const nativeName = summary?.audioUrl;
	const narration = summary
		? consonantNarrationFor(summary.character)
		: undefined;
	const clips = useMemo(() => {
		const urls: string[] = [];
		if (nativeName) urls.push(nativeName);
		if (narration) urls.push(`${base}${narration}`);
		return urls;
		// `base` is a build-time constant, so it is not a dependency.
	}, [nativeName, narration]);
	const { playing, play, stop } = useClipSequence(clips);

	return (
		<Dialog open={summary !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-h-[85vh] overflow-y-auto">
				{summary && (
					<>
						<DialogHeader>
							<DialogTitle>
								{summary.character} {summary.name}
							</DialogTitle>
							{/* Radix warns without one, and a screen reader that reads
							    only the glyph has been told almost nothing. */}
							<DialogDescription>
								{summary.nameRomanized} — "{summary.nameMeaning}"
							</DialogDescription>
						</DialogHeader>

						{clips.length > 0 && (
							<button
								type="button"
								onClick={playing ? stop : play}
								className="w-full py-2.5 px-4 rounded-lg text-sm font-medium"
								style={{
									background: playing
										? "var(--color-accent)"
										: "color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))",
									color: playing
										? "var(--color-surface)"
										: "var(--color-accent)",
									border:
										"1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)",
								}}
							>
								{playing ? "■ Stop" : "▶ Hear this letter explained"}
							</button>
						)}

						<ConsonantCard c={summary} />

						{lesson && (
							<button
								type="button"
								onClick={() => {
									onClose();
									navigate(`/lesson/${lesson.position}`);
								}}
								className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-left"
								style={{
									background:
										"color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))",
									color: "var(--color-primary)",
									border:
										"1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)",
								}}
							>
								Taught in lesson {lesson.position}: {lesson.title} &rarr;
							</button>
						)}
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}

/** Build the card shape `ConsonantCard` wants straight from `symbols.ts`. */
export function consonantSummaryFor(
	character: string,
): ConsonantSummary | null {
	const consonant = consonants.find((item) => item.character === character);
	if (!consonant) return null;

	return {
		character: consonant.character,
		name: consonant.name,
		nameRomanized: consonant.nameRomanized,
		nameMeaning: consonant.nameMeaning,
		classType: consonant.classType as ThaiSymbolClass,
		initialSound: consonant.initialSound,
		finalSound: consonant.finalSound,
		hasDeadEnding: consonant.hasDeadEnding,
		isAspirated: consonant.isAspirated,
		mnemonic: consonant.mnemonic,
		audioUrl: consonant.audioUrl,
	};
}
