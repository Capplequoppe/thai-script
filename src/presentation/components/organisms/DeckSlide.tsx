import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import {
	type DeckSlide as DeckSlideData,
	LESSON_ASSET_ROOT,
	type LessonDeck,
	renderRuleSlide,
	validateDeck,
} from "../../../domain/script/data/lessonContent";
import { useResetOnCardChange } from "../../hooks/useResetOnCardChange";
import {
	NarrationTransport,
	usePlaybackRate,
} from "../molecules/NarrationTransport";

interface Props {
	/** Path of the deck's JSON, served from `public/lessons/<id>/deck.json`. */
	deckPath: string;
	/** Fires once, when the deck's own last slide is confirmed forward. */
	onComplete: () => void;
}

type LoadState =
	| { readonly status: "loading" }
	| { readonly status: "error"; readonly message: string }
	| {
			readonly status: "ready";
			readonly deck: LessonDeck;
			readonly audioUrls: ReadonlyMap<string, readonly string[]>;
			readonly imageUrls: ReadonlyMap<string, string>;
			readonly audioLanguages: ReadonlyMap<string, readonly string[]>;
	  };

/**
 * Every asset path a deck names for playback must resolve inside its own
 * `public/lessons/<lessonId>/` — the trust boundary the deck-JSON sink is
 * named against. A URL outside that root, or one containing `..`, is
 * refused rather than played — and that refusal is a `console.warn`, not a
 * silent drop: a slide with no audio at all and a slide whose every clip was
 * refused both end up with no replay button, and only the warning tells the
 * two apart.
 */
/**
 * One raw slide's `id` and its clip list.
 *
 * A slide's narration is a *sequence* — the generator emits one clip per
 * narration line, because each line is one language and the Thai ones are
 * checked before they are accepted. `audio` is that list. A lone `audioUrl`
 * string is still read, so a deck written before the split keeps playing.
 */
function readAudioCandidate(
	item: unknown,
): { id: string; audioUrls: string[] } | undefined {
	if (typeof item !== "object" || item === null) return undefined;
	const { id, audio, audioUrl } = item as Record<string, unknown>;
	if (typeof id !== "string") return undefined;
	if (Array.isArray(audio)) {
		const urls = audio.filter((url): url is string => typeof url === "string");
		return urls.length > 0 ? { id, audioUrls: urls } : undefined;
	}
	if (typeof audioUrl === "string") return { id, audioUrls: [audioUrl] };
	return undefined;
}

function extractAudioUrls(
	raw: unknown,
	lessonId: string,
): ReadonlyMap<string, readonly string[]> {
	const map = new Map<string, readonly string[]>();
	if (typeof raw !== "object" || raw === null) return map;
	const slidesRaw = (raw as Record<string, unknown>).slides;
	if (!Array.isArray(slidesRaw)) return map;

	const prefix = `${LESSON_ASSET_ROOT}/${lessonId}/`;
	for (const item of slidesRaw) {
		const candidate = readAudioCandidate(item);
		if (!candidate) continue;
		const { id, audioUrls } = candidate;

		// Each clip is checked on its own: one refused URL must not take the
		// rest of the slide's narration down with it, and each refusal is
		// warned about individually so the console says which clip was dropped.
		const allowed = audioUrls.filter((url) => {
			if (url.startsWith(prefix) && !url.includes("..")) return true;
			console.warn(
				`DeckSlide: refusing audio outside "${prefix}" for slide "${id}": ${url}`,
			);
			return false;
		});
		if (allowed.length > 0) map.set(id, allowed);
	}
	return map;
}

/**
 * Which language each of a slide's clips is in, parallel to its `audio` array.
 *
 * Read separately from the URLs and dropped entirely unless the two line up:
 * a mismatched length means the deck and this map disagree about which clip is
 * which, and a gap chosen from a mislabelled clip is worse than every gap being
 * the same. A deck built before this field existed simply has none, and falls
 * back to a uniform gap.
 */
function extractAudioLanguages(
	raw: unknown,
): ReadonlyMap<string, readonly string[]> {
	const map = new Map<string, readonly string[]>();
	if (typeof raw !== "object" || raw === null) return map;
	const slidesRaw = (raw as Record<string, unknown>).slides;
	if (!Array.isArray(slidesRaw)) return map;

	for (const item of slidesRaw) {
		if (typeof item !== "object" || item === null) continue;
		const { id, audio, audioLanguages } = item as Record<string, unknown>;
		if (typeof id !== "string") continue;
		if (!Array.isArray(audio) || !Array.isArray(audioLanguages)) continue;
		if (audio.length !== audioLanguages.length) continue;
		const languages = audioLanguages.filter(
			(value): value is string => typeof value === "string",
		);
		if (languages.length === audioLanguages.length) map.set(id, languages);
	}
	return map;
}

/**
 * A slide's illustration, under the same containment rule as its clips.
 *
 * Shares `extractAudioUrls`' boundary and its reasoning: a deck's JSON names
 * the assets, the deck's JSON is generated, and a path that resolves outside
 * `public/lessons/<lessonId>/` is refused rather than fetched. Refusal warns
 * rather than dropping silently, because a slide with no illustration and a
 * slide whose illustration was refused look identical on screen.
 */
function extractImageUrls(
	raw: unknown,
	lessonId: string,
): ReadonlyMap<string, string> {
	const map = new Map<string, string>();
	if (typeof raw !== "object" || raw === null) return map;
	const slidesRaw = (raw as Record<string, unknown>).slides;
	if (!Array.isArray(slidesRaw)) return map;

	const prefix = `${LESSON_ASSET_ROOT}/${lessonId}/`;
	for (const item of slidesRaw) {
		if (typeof item !== "object" || item === null) continue;
		const { id, image } = item as Record<string, unknown>;
		if (typeof id !== "string" || typeof image !== "string") continue;
		if (image.startsWith(prefix) && !image.includes("..")) {
			map.set(id, image);
			continue;
		}
		console.warn(
			`DeckSlide: refusing image outside "${prefix}" for slide "${id}": ${image}`,
		);
	}
	return map;
}

/**
 * Silence between one clip and the next, which is not one number.
 *
 * A slide's narration is several clips in sequence, and two different things
 * happen at those joins. Where the language changes — an English explanation,
 * then the Thai word it is about — a beat is right: it is a teacher pausing
 * before saying the thing, and it separates two voices that should sound
 * separate.
 *
 * Where it does not change, the join falls in the middle of one person's
 * continuous prose, and any pause at all is heard as the end of a thought.
 * A single 350ms gap was being applied to both, which made every sentence
 * boundary announce itself.
 *
 * The pause lives here rather than baked into the mp3s, so the same clip can
 * be reused in a different context without carrying a fixed silence with it.
 */
const SAME_LANGUAGE_GAP_MS = 90;
const LANGUAGE_CHANGE_GAP_MS = 420;

/**
 * Which clips are Thai, by index, so the player can tell a language change
 * from a sentence break. Absent for a deck built before this was recorded —
 * every gap is then the same, which is what it used to be.
 */
function gapBefore(index: number, languages?: readonly string[]): number {
	if (!languages) return SAME_LANGUAGE_GAP_MS;
	const previous = languages[index - 1];
	const current = languages[index];
	if (previous === undefined || current === undefined) {
		return SAME_LANGUAGE_GAP_MS;
	}
	return previous === current ? SAME_LANGUAGE_GAP_MS : LANGUAGE_CHANGE_GAP_MS;
}

/**
 * Plays `urls` in order, with a gap between them. Returns the cancel function.
 *
 * Cancellation is the whole reason this is not a loop of `await`: the learner
 * can step to the next slide mid-sentence, and the clip that was playing has to
 * stop with it rather than talking over what comes next.
 *
 * A refused `play()` stops the sequence instead of racing through the rest.
 * The usual cause is the browser's autoplay policy, which no later clip in the
 * same sequence will satisfy either — the replay button is a user gesture and
 * will work.
 */
function playSequence(
	urls: readonly string[],
	languages?: readonly string[],
	options?: {
		readonly rate?: number;
		/** Called when the last clip ends, but never on cancellation. */
		readonly onFinished?: () => void;
	},
): () => void {
	let cancelled = false;
	let playing: HTMLAudioElement | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const playFrom = (index: number): void => {
		if (cancelled) return;
		if (index >= urls.length) {
			// Reaching the end is not the same as being stopped, and the
			// transport has to tell them apart: one leaves a Play button, the
			// other a Stop button that would never clear.
			options?.onFinished?.();
			return;
		}
		const url = urls[index];
		if (!url) return;
		const audio = new Audio(url);
		// `preservesPitch` keeps a slowed clip from dropping an octave, which
		// matters more here than in most players: Thai tone is pitch, and a
		// learner listening at 0.75 to catch a tone must hear the tone the
		// speaker made.
		audio.preservesPitch = true;
		audio.playbackRate = options?.rate ?? 1;
		playing = audio;
		audio.addEventListener("ended", () => {
			if (cancelled) return;
			const wait = gapBefore(index + 1, languages);
			// Gaps shrink with the speech they separate. At 2x an unchanged
			// 420ms gap is half the length of the words around it and the
			// narration sounds like it keeps stalling.
			timer = setTimeout(
				() => playFrom(index + 1),
				wait / (options?.rate ?? 1),
			);
		});
		audio.play().catch(() => {});
	};

	playFrom(0);

	return () => {
		cancelled = true;
		if (timer !== undefined) clearTimeout(timer);
		playing?.pause();
	};
}

/**
 * True only for a deck that is structurally sound and simply has no slides
 * yet: `slides` is an empty array and the retrieval invariant
 * (`missing-retrieval`) is the *only* reported error — meaning `lessonId` and
 * `title` already passed validation. Any other error, or any actual slide,
 * routes to the ordinary failure state instead.
 */
function isUnauthoredEmptyDeck(
	raw: unknown,
	errors: readonly { readonly code: string }[],
): boolean {
	if (typeof raw !== "object" || raw === null) return false;
	const slides = (raw as Record<string, unknown>).slides;
	if (!Array.isArray(slides) || slides.length > 0) return false;
	return errors.length === 1 && errors[0]?.code === "missing-retrieval";
}

/**
 * Owns the slide's narration: what is playing, and how to stop it.
 *
 * A ref holds the canceller because every caller needs the *current* one and
 * none of them should re-render when it changes — stepping to the next slide,
 * pressing stop and starting again all have to cancel whatever is running now,
 * and a stale canceller silently leaves a clip talking over the next slide.
 */
function useNarration(
	urls: readonly string[] | undefined,
	languages: readonly string[] | undefined,
	rate: number,
) {
	const [playing, setPlaying] = useState(false);
	const cancel = useRef<(() => void) | null>(null);

	const stop = useCallback(() => {
		cancel.current?.();
		cancel.current = null;
		setPlaying(false);
	}, []);

	const start = useCallback(() => {
		if (!urls?.length) return;
		cancel.current?.();
		setPlaying(true);
		cancel.current = playSequence(urls, languages, {
			rate,
			onFinished: () => {
				cancel.current = null;
				setPlaying(false);
			},
		});
	}, [urls, languages, rate]);

	// Stepping off the slide, or unmounting, stops the narration. Without this
	// a clip carries on over whatever comes next.
	useEffect(() => stop, [stop]);

	return { playing, start, stop };
}

function ReplayButton({
	urls,
	languages,
}: {
	urls: readonly string[];
	languages?: readonly string[];
}) {
	const [rate, setRate] = usePlaybackRate();
	const { playing, start, stop } = useNarration(urls, languages, rate);

	return (
		<NarrationTransport
			playing={playing}
			onPlay={start}
			onStop={stop}
			onRestart={start}
			rate={rate}
			onRate={(next) => {
				// Applied from the top rather than mid-clip: `playbackRate` on a
				// playing element would change this clip and leave the rest of
				// the sequence at the old speed, which sounds like a fault.
				setRate(next);
				if (playing) stop();
			}}
		/>
	);
}

/** Renders the one currently-visible slide of an already-loaded deck. */
/**
 * A slide's illustration.
 *
 * The picture carries the scene's meaning and mood; it never carries the
 * letterform. A diffusion model will not draw a specific glyph shape
 * reliably, and the glyph itself — set in the app's own font in the slide
 * text — draws it exactly. So the heading is the accessible description: it
 * states what the slide teaches, which is the thing a learner who cannot see
 * the image actually needs.
 */
/**
 * Thai set large, for a slide whose job is to be read.
 *
 * The app's own font rather than a picture of the writing: sharp at any size,
 * selectable, and correct — which a glyph rasterised into a watercolour is
 * none of. The same argument `SlideIllustration` makes for keeping letterform
 * *out* of the illustrations is the argument for putting it here instead.
 *
 * Sized in `vw` with a ceiling so a word fills a phone without overflowing a
 * desktop, and given room to breathe: a learner decoding an unfamiliar script
 * is looking at strokes, not skimming.
 */
function ReadingPanel({ thai }: { thai: string }) {
	return (
		<div
			className="rounded-2xl py-10 px-4 text-center"
			style={{
				background: "var(--color-surface-2)",
				border: "1px solid var(--color-border)",
			}}
		>
			<span
				className="thai"
				style={{
					fontSize: "clamp(3.5rem, 18vw, 7rem)",
					lineHeight: 1.35,
					display: "block",
				}}
			>
				{thai}
			</span>
		</div>
	);
}

function SlideIllustration({ url, alt }: { url: string; alt: string }) {
	return (
		<img
			src={url}
			alt={alt}
			loading="lazy"
			decoding="async"
			className="w-full rounded-xl"
			style={{ aspectRatio: "3 / 2", objectFit: "cover" }}
		/>
	);
}

function DeckSlideContent({
	deck,
	slide,
	audioUrls,
	audioLanguages,
	imageUrl,
}: {
	deck: LessonDeck;
	slide: DeckSlideData;
	audioUrls?: readonly string[];
	audioLanguages?: readonly string[];
	imageUrl?: string;
}) {
	// Reveal state for a "reveal" slide, mirroring `Flashcard.tsx`'s own
	// click-to-reveal pattern — the established mechanism in this repo, not a
	// second one. Reset (and re-triggered playback below) keys on the slide's
	// own identity so two consecutive slides that happen to share one audio
	// clip still reset — see AC5.
	const [revealed, setRevealed] = useState(false);
	// Read here as well as in the transport so the slide's own auto-play starts
	// at the learner's speed rather than at 1.0.
	const [rate] = usePlaybackRate();
	useResetOnCardChange(slide.id, () => {
		setRevealed(false);
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: keys on the slide's own identity, not on audioUrls — two consecutive slides sharing a clip must still reset (see AC5)
	useEffect(() => {
		if (!audioUrls?.length || slide.kind === "reveal") return;
		// The returned canceller is the cleanup: stepping off the slide stops
		// whatever clip is mid-sentence rather than letting it talk over the
		// next slide's narration.
		return playSequence(audioUrls, audioLanguages, { rate });
	}, [slide.id]);

	// A "reveal" slide's audio is the answer's pronunciation, so it plays on
	// reveal rather than on arrival — hearing it first would answer the
	// retrieval step it follows. Mirrors `Flashcard.tsx`'s own reveal-time
	// audio effect.
	// biome-ignore lint/correctness/useExhaustiveDependencies: fires once per reveal, not on every audioUrls/slide identity change
	useEffect(() => {
		if (!revealed || !audioUrls?.length) return;
		return playSequence(audioUrls, audioLanguages, { rate });
	}, [revealed]);

	switch (slide.kind) {
		case "exposition":
			return (
				<div className="space-y-4">
					<h2 className="text-lg font-bold text-center">{slide.heading}</h2>
					{/* A reading slide shows the writing and nothing else. The
					    picture is not merely unnecessary there — it competes for
					    the attention the decoding needs, which is why this wins
					    over `imageUrl` rather than sitting beside it. */}
					{slide.thai ? (
						<ReadingPanel thai={slide.thai} />
					) : (
						imageUrl && <SlideIllustration url={imageUrl} alt={slide.heading} />
					)}
					<div className="space-y-2">
						{slide.body.map((paragraph, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: body is a static ordered list of paragraphs with no other identity
							<p key={i} className="text-center">
								{paragraph}
							</p>
						))}
					</div>
					{audioUrls && audioUrls.length > 0 && (
						<div className="flex justify-center">
							<ReplayButton urls={audioUrls} languages={audioLanguages} />
						</div>
					)}
				</div>
			);
		case "retrieval":
			// The answer lives on the reveal slide this one names, never here — the
			// schema itself refuses a retrieval slide that carries one.
			return (
				<div className="space-y-4">
					<p className="text-center text-lg">{slide.prompt}</p>
					{audioUrls && audioUrls.length > 0 && (
						<div className="flex justify-center">
							<ReplayButton urls={audioUrls} languages={audioLanguages} />
						</div>
					)}
				</div>
			);
		case "reveal":
			return (
				<div className="space-y-4">
					{!revealed ? (
						<button
							type="button"
							onClick={() => setRevealed(true)}
							className="w-full py-4 rounded-xl text-lg font-semibold transition-colors"
							style={{
								background: "var(--color-surface-2)",
								color: "var(--color-text)",
							}}
						>
							Show Answer
						</button>
					) : (
						<div
							style={{ animation: "slideUp 0.25s ease-out" }}
							className="space-y-3 text-center"
						>
							{slide.answers.map((answer, i) => (
								<p
									// biome-ignore lint/suspicious/noArrayIndexKey: answers is a static ordered list with no other identity
									key={i}
									className="text-2xl font-bold"
									style={{ color: "var(--color-primary)" }}
								>
									{answer}
								</p>
							))}
							{audioUrls && audioUrls.length > 0 && (
								<div className="flex justify-center">
									<ReplayButton urls={audioUrls} languages={audioLanguages} />
								</div>
							)}
						</div>
					)}
				</div>
			);
		case "rule": {
			const rule = renderRuleSlide(deck, slide);
			if (!rule) {
				return (
					<p role="alert">
						This lesson names a rule slide for a rule it does not declare.
					</p>
				);
			}
			return (
				<div className="space-y-3">
					<h2 className="text-lg font-bold text-center">{rule.title}</h2>
					<p className="text-center">{rule.text}</p>
				</div>
			);
		}
		default: {
			const _never: never = slide;
			return _never;
		}
	}
}

/**
 * The in-house deck experience: fetches `deckPath`, validates it against the
 * schema before anything renders (AC2), and steps through its slides in
 * declared order. Three states never collapse into one another: loading, an
 * empty deck, and a deck that failed to load or parse (AC3).
 *
 * Owns its own stepping — `onComplete` fires once, when the deck's own last
 * slide is confirmed forward, so the caller can hand off to whatever follows
 * (the lesson's symbol cards) using its own, separate navigation.
 */
export function DeckSlide({ deckPath, onComplete }: Props) {
	const [state, setState] = useState<LoadState>({ status: "loading" });
	const [idx, setIdx] = useState(0);

	useEffect(() => {
		let cancelled = false;
		setState({ status: "loading" });
		setIdx(0);

		fetch(deckPath)
			.then((res) => {
				if (!res.ok) {
					throw new Error(`request for ${deckPath} failed (${res.status})`);
				}
				return res.json();
			})
			.then((raw) => {
				if (cancelled) return;
				const result = validateDeck(raw);
				if (!result.ok) {
					// The schema's retrieval invariant (every deck must ask the
					// learner to attempt something) is unconditional, so it also
					// fires for a deck that authors nothing at all yet. That specific
					// shape — structurally sound, zero slides, no other error — is
					// the "empty deck" state AC3 asks to be distinguishable from a
					// real validation failure, not an instance of one.
					if (isUnauthoredEmptyDeck(raw, result.errors)) {
						setState({
							status: "ready",
							deck: {
								lessonId: (raw as Record<string, unknown>).lessonId as string,
								title: (raw as Record<string, unknown>).title as string,
								slides: [],
							},
							audioUrls: new Map(),
							imageUrls: new Map(),
							audioLanguages: new Map(),
						});
						return;
					}
					setState({
						status: "error",
						message: result.errors.map((e) => e.message).join("; "),
					});
					return;
				}
				setState({
					status: "ready",
					deck: result.deck,
					audioUrls: extractAudioUrls(raw, result.deck.lessonId),
					imageUrls: extractImageUrls(raw, result.deck.lessonId),
					audioLanguages: extractAudioLanguages(raw),
				});
			})
			.catch((err) => {
				if (cancelled) return;
				setState({
					status: "error",
					message: err instanceof Error ? err.message : "failed to load deck",
				});
			});

		return () => {
			cancelled = true;
		};
	}, [deckPath]);

	const isReady = state.status === "ready";
	const slides = isReady ? state.deck.slides : [];
	const isLast = idx === slides.length - 1;

	const advance = useCallback(() => {
		if (isLast) onComplete();
		else setIdx((i) => i + 1);
	}, [isLast, onComplete]);

	const goBack = useCallback(() => {
		if (idx > 0) setIdx((i) => i - 1);
	}, [idx]);

	if (state.status === "loading") {
		return (
			<p className="text-center" style={{ color: "var(--color-text-muted)" }}>
				Loading lesson…
			</p>
		);
	}

	if (state.status === "error") {
		return (
			<p role="alert" className="text-center">
				Couldn't load this lesson: {state.message}
			</p>
		);
	}

	if (slides.length === 0) {
		return (
			<p className="text-center" style={{ color: "var(--color-text-muted)" }}>
				This lesson's deck has no slides yet.
			</p>
		);
	}

	const slide = slides[idx];
	if (!slide) return null;

	return (
		<div className="space-y-6">
			<DeckSlideContent
				deck={state.deck}
				slide={slide}
				audioUrls={state.audioUrls.get(slide.id)}
				imageUrl={state.imageUrls.get(slide.id)}
				audioLanguages={state.audioLanguages.get(slide.id)}
			/>
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
					{isLast ? "Continue" : "Next"}
				</Button>
			</div>
		</div>
	);
}
