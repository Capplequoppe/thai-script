import { useCallback, useEffect, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import {
	type DeckSlide as DeckSlideData,
	LESSON_ASSET_ROOT,
	type LessonDeck,
	renderRuleSlide,
	validateDeck,
} from "../../../domain/script/data/lessonContent";
import { useResetOnCardChange } from "../../hooks/useResetOnCardChange";

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
			readonly audioUrls: ReadonlyMap<string, string>;
	  };

/**
 * Every asset path a deck names for playback must resolve inside its own
 * `public/lessons/<lessonId>/` — the trust boundary the deck-JSON sink is
 * named against. A URL outside that root, or one containing `..`, is
 * dropped rather than played.
 */
function extractAudioUrls(
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
		const id = (item as Record<string, unknown>).id;
		const audioUrl = (item as Record<string, unknown>).audioUrl;
		if (
			typeof id === "string" &&
			typeof audioUrl === "string" &&
			audioUrl.startsWith(prefix) &&
			!audioUrl.includes("..")
		) {
			map.set(id, audioUrl);
		}
	}
	return map;
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

function ReplayButton({ url }: { url: string }) {
	return (
		<button
			type="button"
			onClick={() => {
				new Audio(url).play().catch(() => {});
			}}
			className="inline-flex items-center justify-center w-12 h-12 rounded-full text-2xl transition-colors"
			style={{
				background: "var(--color-surface-2)",
				color: "var(--color-primary)",
			}}
			aria-label="Replay audio"
		>
			🔊
		</button>
	);
}

/** Renders the one currently-visible slide of an already-loaded deck. */
function DeckSlideContent({
	deck,
	slide,
	audioUrl,
}: {
	deck: LessonDeck;
	slide: DeckSlideData;
	audioUrl?: string;
}) {
	// Reveal state for a "reveal" slide, mirroring `Flashcard.tsx`'s own
	// click-to-reveal pattern — the established mechanism in this repo, not a
	// second one. Reset (and re-triggered playback below) keys on the slide's
	// own identity so two consecutive slides that happen to share one audio
	// clip still reset — see AC5.
	const [revealed, setRevealed] = useState(false);
	useResetOnCardChange(slide.id, () => {
		setRevealed(false);
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: keys on the slide's own identity, not on audioUrl — two consecutive slides sharing a clip must still reset (see AC5)
	useEffect(() => {
		if (audioUrl && slide.kind !== "reveal") {
			new Audio(audioUrl).play().catch(() => {});
		}
	}, [slide.id]);

	// A "reveal" slide's audio is the answer's pronunciation, so it plays on
	// reveal rather than on arrival — hearing it first would answer the
	// retrieval step it follows. Mirrors `Flashcard.tsx`'s own reveal-time
	// audio effect.
	// biome-ignore lint/correctness/useExhaustiveDependencies: fires once per reveal, not on every audioUrl/slide identity change
	useEffect(() => {
		if (revealed && audioUrl) {
			new Audio(audioUrl).play().catch(() => {});
		}
	}, [revealed]);

	switch (slide.kind) {
		case "exposition":
			return (
				<div className="space-y-4">
					<h2 className="text-lg font-bold text-center">{slide.heading}</h2>
					<div className="space-y-2">
						{slide.body.map((paragraph, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: body is a static ordered list of paragraphs with no other identity
							<p key={i} className="text-center">
								{paragraph}
							</p>
						))}
					</div>
					{audioUrl && (
						<div className="flex justify-center">
							<ReplayButton url={audioUrl} />
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
					{audioUrl && (
						<div className="flex justify-center">
							<ReplayButton url={audioUrl} />
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
							{audioUrl && (
								<div className="flex justify-center">
									<ReplayButton url={audioUrl} />
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
				audioUrl={state.audioUrls.get(slide.id)}
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
