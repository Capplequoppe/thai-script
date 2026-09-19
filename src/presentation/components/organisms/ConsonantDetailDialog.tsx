import { useMemo } from "react";
import { useNavigate } from "react-router";
import { consonantNarrationFor } from "../../../domain/script/data/consonantScenes";
import { lessonEntryByNumber } from "../../../domain/script/data/lessonSequence";
import { storyForConsonant } from "../../../domain/script/data/slideTags";
import {
	consonants,
	lessons,
	type ThaiSymbolClass,
} from "../../../domain/script/data/symbols";
import type { ConsonantSummary } from "../../../domain/script/services/ScriptLessonService";
import { useClipSequence } from "../../hooks/useClipSequence";
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

export function ConsonantDetailDialog({
	summary,
	onClose,
	onWatchStory,
}: {
	/** The letter to show, or null when nothing is open. */
	summary: ConsonantSummary | null;
	onClose: () => void;
	/**
	 * Asked for this letter's story from the lesson that tells it.
	 *
	 * Raised rather than opened here: the story is itself a dialog, and two
	 * stacked modals on a phone is a thing you cannot reliably get out of. The
	 * page closes this one and opens that one in its place.
	 */
	onWatchStory?: (character: string) => void;
}) {
	const navigate = useNavigate();
	const lesson = summary ? lessonFor(summary.character) : null;

	// The native name first, then the explanation — in that order because the
	// explanation refers to a sound the learner should have just heard.
	const base = import.meta.env.BASE_URL;
	const story = summary ? storyForConsonant(summary.character) : undefined;
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

						{onWatchStory && story && (
							<button
								type="button"
								onClick={() => onWatchStory(summary.character)}
								className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-left"
								style={{
									background:
										"color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
									color: "var(--color-accent)",
									border:
										"1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)",
								}}
							>
								Watch this letter&rsquo;s story &rarr;
							</button>
						)}

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
