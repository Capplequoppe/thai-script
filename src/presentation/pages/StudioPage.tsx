/**
 * The deck studio: edit narration, slides and pictures without a full rebuild.
 *
 * Development only. It is mounted behind `import.meta.env.DEV` and talks to
 * `scripts/studio_server.py`, which writes to the repository and runs local GPU
 * jobs — neither of which has any business in a deployed build. A production
 * bundle never imports this file.
 *
 * The editing model is deliberately plain: Markdown under `content/lessons/`
 * stays the source of truth, this edits it, and rebuilding runs the ordinary
 * pipeline. Because that pipeline is content-addressed, changing one sentence
 * regenerates one clip and leaves the rest untouched — which is what makes a
 * save cheap enough to iterate on.
 *
 * **Clips are not narration lines**, and the layout says so. Packing merges
 * consecutive English and re-splits it at fifty-five words, so a slide of five
 * authored lines becomes six clips and one line can feed three of them. A
 * regenerate button therefore sits on a *clip*, which is the smallest thing
 * that can actually be remade, and each clip names the lines it came from.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	AnnotationPalette,
	UnknownTagWarning,
} from "../components/studio/AnnotationPalette";
import { insertAt } from "../components/studio/annotations";
import { AutoTextarea, ClipPlayer } from "../components/studio/StudioControls";

const API = "/__studio/api";

type NarrationLine = { language: string; text: string };

/**
 * An editable row, with an identity React can hold on to.
 *
 * Index keys are wrong here and not only by lint's reckoning: remove the second
 * of five narration lines and every row below shifts up one index, so React
 * reuses each box for different text. `AutoTextarea` measures itself and keeps
 * a ref, so the reused boxes keep the previous row's height — the list ends up
 * visibly mismatched with its own content. A counter assigned on load costs
 * nothing and removes the whole class of problem.
 */
type Editable<T> = T & { uid: number };

let nextUid = 0;
function withUid<T>(items: T[]): Editable<T>[] {
	return items.map((item) => ({ ...item, uid: nextUid++ }));
}

type Clip = {
	key: string;
	language: string;
	text: string;
	sources: number[];
	words: number;
	url: string | null;
};

type Slide = {
	id: string;
	kind: string;
	heading: string | null;
	image: string | null;
	imageUrl: string | null;
	scene: string | null;
	prompt: string | null;
	styledPrompt: string | null;
	seed: string | null;
	narration: NarrationLine[];
	bullets: string[];
};

type Deck = {
	id: string;
	slides: Slide[];
	clips: Record<string, Clip[]>;
};

/** The build the server is running, as the page polls it. */
type JobState = {
	running: boolean;
	deck?: string;
	scope?: string;
	done?: number;
	total?: number;
	current?: string | null;
	generated?: number;
	reused?: number;
	startedAt?: number;
	report?: BuildReport | null;
	error?: string | null;
};

type BuildReport = {
	generated: number;
	reused: number;
	failed: number;
	synthCalls: number;
	errors: string[];
};

/** Roughly how long this will take to say, at the engine's measured pace. */
function spokenSeconds(words: number): number {
	return (words / 160) * 60;
}

/** The wire shape: identities are a client-side concern and never persisted. */
function plainNarration(lines: Editable<NarrationLine>[]): NarrationLine[] {
	return lines.map(({ language, text }) => ({ language, text }));
}

function plainBullets(items: Editable<{ text: string }>[]): string[] {
	return items.map((item) => item.text);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API}${path}`, {
		...init,
		headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
	});
	const body = await response.json();
	if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
	return body as T;
}

export default function StudioPage() {
	const [decks, setDecks] = useState<string[]>([]);
	const [deckId, setDeckId] = useState("orientation");
	const [deck, setDeck] = useState<Deck | null>(null);
	const [selected, setSelected] = useState<string | null>(null);
	const [busy, setBusy] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	/** Bumped after a rebuild so `<audio>` refetches rather than replaying cache. */
	const [audioVersion, setAudioVersion] = useState(0);
	const [job, setJob] = useState<JobState | null>(null);

	const [draft, setDraft] = useState<Editable<NarrationLine>[] | null>(null);
	const [bullets, setBullets] = useState<Editable<{ text: string }>[] | null>(
		null,
	);
	const [heading, setHeading] = useState<string | null>(null);
	const [prompt, setPrompt] = useState("");
	const [seed, setSeed] = useState("42");

	const loadDeck = useCallback(async (id: string) => {
		const data = await call<Deck>(`/deck/${id}`);
		setDeck(data);
		setSelected((current) =>
			current && data.slides.some((s) => s.id === current)
				? current
				: (data.slides[0]?.id ?? null),
		);
	}, []);

	useEffect(() => {
		call<{ decks: string[] }>("/decks")
			.then((data) => setDecks(data.decks))
			.catch((cause) => setError(String(cause)));
	}, []);

	useEffect(() => {
		loadDeck(deckId).catch((cause) => setError(String(cause)));
	}, [deckId, loadDeck]);

	const slide = useMemo(
		() => deck?.slides.find((s) => s.id === selected) ?? null,
		[deck, selected],
	);
	const clips = useMemo(
		() => (slide ? (deck?.clips[slide.id] ?? []) : []),
		[deck, slide],
	);

	useEffect(() => {
		setDraft(slide ? withUid(slide.narration) : null);
		setBullets(slide ? withUid(slide.bullets.map((text) => ({ text }))) : null);
		setHeading(slide?.heading ?? null);
		// The recorded prompt if this picture was rendered before, otherwise the
		// scene *with the house style applied* — never the bare scene, which
		// renders as a different-looking image and brings back the text
		// artefacts the style suffix exists to forbid.
		setPrompt(slide?.prompt ?? slide?.styledPrompt ?? slide?.scene ?? "");
		setSeed(slide?.seed ?? "42");
	}, [slide]);

	const dirty = useMemo(() => {
		if (!slide || !draft || !bullets) return false;
		return (
			JSON.stringify(plainNarration(draft)) !==
				JSON.stringify(slide.narration) ||
			JSON.stringify(plainBullets(bullets)) !== JSON.stringify(slide.bullets) ||
			(heading ?? "") !== (slide.heading ?? "")
		);
	}, [slide, draft, bullets, heading]);

	async function run<T>(label: string, work: () => Promise<T>) {
		setBusy(label);
		setError(null);
		setStatus(null);
		try {
			return await work();
		} catch (cause) {
			setError(String(cause));
		} finally {
			setBusy(null);
		}
	}

	/**
	 * Where the caret was in each narration box, by line index.
	 *
	 * A ref rather than state: it changes on every keystroke and arrow key, and
	 * nothing renders from it, so putting it in state would re-render the whole
	 * editor for no visible reason.
	 */
	const caret = useRef<Record<number, { start: number; end: number }>>({});

	/**
	 * Put a tag into narration line `index`, at the caret.
	 *
	 * Reads the *recorded* caret rather than asking the DOM where focus is.
	 * The first version did the latter and always appended, because clicking
	 * the palette moves focus to the palette — by the time the handler runs,
	 * `document.activeElement` is a button and never the textarea it was
	 * opened from.
	 *
	 * A textarea does keep `selectionStart` across a blur, so reading the
	 * element directly would also work; recording it is preferred because it
	 * survives the box being unmounted and remounted, which happens whenever
	 * the clip list around it changes.
	 */
	const insertTag = (index: number, tag: string) => {
		if (!draft) return;
		const line = draft[index];
		const at = caret.current[index];
		const next = [...draft];
		if (at) {
			const { text, caret: moved } = insertAt(line.text, tag, at.start, at.end);
			next[index] = { ...line, text };
			// So a second tag lands after the first rather than inside it.
			caret.current[index] = { start: moved, end: moved };
		} else {
			next[index] = { ...line, text: `${line.text} ${tag}`.trim() };
		}
		setDraft(next);
	};

	const save = () =>
		run("Saving", async () => {
			if (!slide || !draft) return;
			await call(`/deck/${deckId}/slide/${slide.id}`, {
				method: "PUT",
				body: JSON.stringify({
					narration: plainNarration(draft),
					bullets: plainBullets(bullets ?? []),
					heading,
				}),
			});
			await loadDeck(deckId);
			setStatus("Saved. Regenerate to hear it.");
		});

	/**
	 * Every scope is one call with a different force list — the pipeline skips
	 * whatever is unchanged, so "this clip", "this slide" and "the deck" differ
	 * only in what they insist on remaking.
	 *
	 * The request returns as soon as the build has *started*. Progress arrives
	 * by polling `/job`, because a build is minutes long and a request that
	 * simply blocks is indistinguishable from a hang — which is exactly how
	 * this felt before: fans spinning, nothing on screen, no way to tell
	 * whether it was working or stuck.
	 */
	const rebuild = async (
		label: string,
		force: string[] | undefined,
		scope: string,
	) => {
		setError(null);
		setStatus(null);
		try {
			if (dirty && draft && slide) {
				await call(`/deck/${deckId}/slide/${slide.id}`, {
					method: "PUT",
					body: JSON.stringify({
						narration: plainNarration(draft),
						bullets: plainBullets(bullets ?? []),
						heading,
					}),
				});
				await loadDeck(deckId);
			}
			await call(`/deck/${deckId}/build`, {
				method: "POST",
				body: JSON.stringify({ force: force ?? null, scope }),
			});
			setBusy(label);
		} catch (cause) {
			setError(String(cause));
			setBusy(null);
		}
	};

	// While a build runs, ask the server where it is. Stops as soon as it is
	// finished, so an idle studio makes no requests at all.
	useEffect(() => {
		if (!busy) return;
		let live = true;
		const timer = setInterval(async () => {
			try {
				const state = await call<JobState>("/job");
				if (!live) return;
				setJob(state);
				if (!state.running) {
					clearInterval(timer);
					setBusy(null);
					setJob(null);
					await loadDeck(deckId);
					setAudioVersion((version) => version + 1);
					setStatus(null);
					if (state.error) {
						setError(state.error);
					} else if (state.report) {
						const { generated, reused, errors } = state.report;
						if (errors.length > 0) {
							// Failures go to the red banner, not the green one.
							// `setStatus` is the success channel and a build
							// that lost clips reported through it read as a
							// cheerful "16 failed".
							setError(
								`${errors.length} failed — ${errors[0]}` +
									(generated > 0 ? ` (${generated} did generate)` : ""),
							);
						} else {
							setStatus(`${generated} generated, ${reused} reused.`);
						}
					}
				}
			} catch (cause) {
				clearInterval(timer);
				setBusy(null);
				setError(String(cause));
			}
		}, 400);
		return () => {
			live = false;
			clearInterval(timer);
		};
	}, [busy, deckId, loadDeck]);

	const renderImage = () =>
		run("Rendering", async () => {
			if (!slide) return;
			await call(`/deck/${deckId}/slide/${slide.id}/image`, {
				method: "POST",
				body: JSON.stringify({ prompt, seed: Number(seed) }),
			});
			await loadDeck(deckId);
			setAudioVersion((version) => version + 1);
			setStatus("Rendered. Prompt and seed saved to the slide.");
		});

	/**
	 * Replace the picture with a supplied file.
	 *
	 * Sent as raw bytes rather than multipart: the studio server is a plain
	 * `http.server` and parsing multipart there would be more code than this
	 * whole feature deserves.
	 */
	const uploadImage = (file: File) =>
		run("Uploading", async () => {
			if (!slide) return;
			const response = await fetch(
				`${API}/deck/${deckId}/slide/${slide.id}/upload`,
				{ method: "POST", headers: { "Content-Type": file.type }, body: file },
			);
			const body = await response.json();
			if (!response.ok)
				throw new Error(body.error ?? `HTTP ${response.status}`);
			await loadDeck(deckId);
			setAudioVersion((version) => version + 1);
			setStatus("Picture replaced. Its prompt and seed were cleared.");
		});

	const addSlide = () =>
		run("Adding", async () => {
			const id = window.prompt("New slide id (letters, digits, hyphens):");
			if (!id) return;
			await call(`/deck/${deckId}/slide`, {
				method: "POST",
				body: JSON.stringify({ id, after: selected, kind: "exposition" }),
			});
			await loadDeck(deckId);
			setSelected(id);
		});

	const removeSlide = () =>
		run("Removing", async () => {
			if (!slide || !window.confirm(`Remove slide "${slide.id}"?`)) return;
			await call(`/deck/${deckId}/slide/${slide.id}`, { method: "DELETE" });
			setSelected(null);
			await loadDeck(deckId);
		});

	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden bg-white text-sm">
			<header className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-slate-50 px-4 py-2">
				<h1 className="font-semibold">Deck studio</h1>
				<select
					className="rounded border px-2 py-1"
					value={deckId}
					onChange={(event) => setDeckId(event.target.value)}
				>
					{decks.map((id) => (
						<option key={id} value={id}>
							{id}
						</option>
					))}
				</select>
				<button
					type="button"
					className="rounded bg-slate-800 px-3 py-1 text-white disabled:opacity-40"
					onClick={() => rebuild("Rebuilding deck", undefined, "deck")}
					disabled={busy !== null}
				>
					Rebuild deck
				</button>
				<span className="flex-1" />
				{busy && (
					<span className="flex items-center gap-2 text-amber-700">
						<span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
						{busy}
						{job?.total ? (
							<>
								<span className="tabular-nums">
									{job.done ?? 0}/{job.total}
								</span>
								<span className="h-1.5 w-28 overflow-hidden rounded-full bg-amber-200">
									<span
										className="block h-full rounded-full bg-amber-600 transition-[width]"
										style={{
											width: `${((job.done ?? 0) / job.total) * 100}%`,
										}}
									/>
								</span>
								{job.current && (
									<code className="text-[11px] text-amber-800">
										{job.current}
									</code>
								)}
							</>
						) : (
							<span className="text-xs">starting the engine…</span>
						)}
					</span>
				)}
				{status && <span className="text-emerald-700">{status}</span>}
				{/* Not truncated. A failure names the clip that broke and why,
				    which is the whole value of showing it — at 40 characters
				    "16 failed — three-hums-2: transcribed back as…" lost the
				    part that says what to do next. */}
				{error && (
					<span className="max-w-[70ch] text-red-700">{error}</span>
				)}
			</header>

			<div className="flex min-h-0 flex-1">
				{/* Sticky because a deck runs to eighteen slides and losing your
				    place while comparing two of them is the whole friction. */}
				<nav className="w-56 shrink-0 overflow-y-auto border-r bg-slate-50">
					{deck?.slides.map((entry) => {
						const count = deck.clips[entry.id]?.length ?? 0;
						const missing = (deck.clips[entry.id] ?? []).some((c) => !c.url);
						return (
							<button
								type="button"
								key={entry.id}
								onClick={() => setSelected(entry.id)}
								className={`block w-full border-b px-3 py-2 text-left hover:bg-white ${
									entry.id === selected
										? "bg-white font-medium shadow-inner"
										: ""
								}`}
							>
								<div className="truncate">{entry.id}</div>
								<div className="text-slate-500 text-xs">
									{entry.kind} · {count} clip{count === 1 ? "" : "s"}
									{missing && <span className="text-amber-600"> · stale</span>}
								</div>
							</button>
						);
					})}
					<button
						type="button"
						className="w-full px-3 py-2 text-left text-slate-600 hover:bg-white"
						onClick={addSlide}
						disabled={busy !== null}
					>
						+ slide
					</button>
				</nav>

				{slide && draft && (
					<main className="min-w-0 flex-1 overflow-y-auto p-4">
						<div className="mb-3 flex items-center gap-2">
							<input
								className="min-w-0 flex-1 rounded border px-2 py-1"
								value={heading ?? ""}
								placeholder="heading"
								onChange={(event) => setHeading(event.target.value)}
							/>
							<button
								type="button"
								className="rounded bg-emerald-700 px-3 py-1 text-white disabled:opacity-40"
								onClick={save}
								disabled={!dirty || busy !== null}
							>
								{dirty ? "Save" : "Saved"}
							</button>
							<button
								type="button"
								className="rounded bg-slate-800 px-3 py-1 text-white disabled:opacity-40"
								onClick={() =>
									rebuild(
										"Rebuilding slide",
										clips.map((clip) => clip.key),
										"slide",
									)
								}
								disabled={busy !== null}
							>
								Regenerate slide
							</button>
							<button
								type="button"
								className="rounded border border-red-300 px-3 py-1 text-red-700"
								onClick={removeSlide}
								disabled={busy !== null}
							>
								Remove
							</button>
						</div>

						<div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
							<section>
								<h2 className="mb-2 font-medium">
									Narration
									<span className="ml-2 font-normal text-slate-500 text-xs">
										{draft.length} line{draft.length === 1 ? "" : "s"} →{" "}
										{clips.length} clip{clips.length === 1 ? "" : "s"}
									</span>
								</h2>

								{draft.map((line, index) => {
									// Every clip this line feeds. Usually one; a long line
									// split at the cap feeds several, and the button on each
									// remakes that clip alone.
									const feeds = clips.filter((clip) =>
										clip.sources.includes(index),
									);
									return (
										<div
											key={line.uid}
											className="mb-3 rounded border bg-white p-2"
										>
											<div className="mb-1 flex items-center justify-between gap-2">
												<span className="text-slate-400 text-xs">
													line {index + 1}
													{feeds.length > 1 && ` · ${feeds.length} clips`}
												</span>
												<div className="flex items-center gap-2">
													<AnnotationPalette
														onInsert={(tag) => insertTag(index, tag)}
													/>
													<button
														type="button"
														className="rounded border px-2 py-1 text-xs disabled:opacity-40"
														onClick={() =>
															rebuild(
																`Regenerating line ${index + 1}`,
																feeds.map((clip) => clip.key),
																"line",
															)
														}
														disabled={busy !== null || feeds.length === 0}
													>
														Regenerate
													</button>
												</div>
											</div>
											<div className="flex gap-2">
												<select
													className="h-8 rounded border px-1"
													value={line.language}
													onChange={(event) => {
														const next = [...draft];
														next[index] = {
															...line,
															language: event.target.value,
														};
														setDraft(next);
													}}
												>
													<option value="en">en</option>
													<option value="th">th</option>
												</select>
												<AutoTextarea
													data-line-index={index}
													className="flex-1 rounded border p-2 font-mono text-xs leading-relaxed focus:border-slate-400 focus:outline-none"
													// Fires for clicks, arrow keys and drags alike, so
													// one handler covers every way a caret moves.
													onSelect={(event) => {
														const node = event.currentTarget;
														caret.current[index] = {
															start: node.selectionStart,
															end: node.selectionEnd,
														};
													}}
													value={line.text}
													onChange={(text) => {
														const next = [...draft];
														next[index] = { ...line, text };
														setDraft(next);
													}}
												/>
												<button
													type="button"
													className="self-start px-1 text-slate-400 hover:text-red-700"
													title="remove this line"
													onClick={() =>
														setDraft(draft.filter((_, i) => i !== index))
													}
												>
													×
												</button>
											</div>
											<UnknownTagWarning text={line.text} />

											{feeds.map((clip) => {
												const seconds = spokenSeconds(clip.words);
												const shared = clip.sources.length > 1;
												return (
													<div
														key={clip.key}
														className="mt-2 flex items-center gap-2 border-t pt-2"
													>
														{clip.url ? (
															<ClipPlayer
																key={`${clip.url}-${audioVersion}`}
																src={`${clip.url}?v=${audioVersion}`}
															/>
														) : (
															<span className="flex-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-700 text-xs">
																not built yet
															</span>
														)}
														<span
															className={`shrink-0 text-xs ${
																seconds > 12
																	? "text-amber-700"
																	: "text-slate-500"
															}`}
															title={
																shared
																	? `merged from lines ${clip.sources
																			.map((s) => s + 1)
																			.join(" and ")}`
																	: undefined
															}
														>
															{clip.key.split("-").pop()} · ~
															{seconds.toFixed(0)}s{shared && " · merged"}
														</span>
													</div>
												);
											})}
										</div>
									);
								})}
								<button
									type="button"
									className="rounded border px-2 py-1"
									onClick={() =>
										setDraft([
											...draft,
											{ language: "en", text: "", uid: nextUid++ },
										])
									}
								>
									+ line
								</button>
							</section>

							<section className="space-y-3">
								<div>
									<h2 className="mb-1 font-medium">Picture</h2>
									{slide.imageUrl ? (
										// Cache-busted: a regenerated picture keeps its
										// filename, so the browser would otherwise show the
										// old one and the button would look broken.
										<img
											src={`${slide.imageUrl}?v=${audioVersion}`}
											alt={slide.heading ?? slide.id}
											className="w-full rounded border"
										/>
									) : (
										<p className="text-slate-500">no image on this slide</p>
									)}
								</div>
								<label className="block" htmlFor="studio-prompt">
									<span className="text-slate-600 text-xs">
										Prompt{" "}
										{slide.prompt
											? "(as last rendered)"
											: "(scene + house style)"}
									</span>
									<AutoTextarea
										id="studio-prompt"
										className="w-full rounded border p-2 font-mono text-xs leading-relaxed focus:border-slate-400 focus:outline-none"
										value={prompt}
										onChange={setPrompt}
									/>
								</label>
								<div className="flex items-center gap-2">
									<label
										htmlFor="studio-seed"
										className="text-slate-600 text-xs"
									>
										seed
									</label>
									<input
										id="studio-seed"
										className="w-24 rounded border px-2 py-1"
										value={seed}
										onChange={(event) => setSeed(event.target.value)}
									/>
									<button
										type="button"
										className="rounded border px-2 py-1"
										onClick={() =>
											setSeed(String(Math.floor(Math.random() * 100000)))
										}
									>
										roll
									</button>
									<button
										type="button"
										className="rounded bg-slate-800 px-3 py-1 text-white disabled:opacity-40"
										onClick={renderImage}
										disabled={busy !== null || !slide.image}
									>
										Render
									</button>
								</div>
								<p className="text-slate-500 text-xs">
									Rendering stands the narration engine down; the next audio
									rebuild pays its startup again.
								</p>

								<div>
									<h2 className="mb-1 font-medium">Bullets</h2>
									{(bullets ?? []).map((item, index) => (
										<div key={item.uid} className="mb-1 flex gap-1">
											<input
												className="min-w-0 flex-1 rounded border px-2 py-1"
												value={item.text}
												onChange={(event) => {
													const next = [...(bullets ?? [])];
													next[index] = { ...item, text: event.target.value };
													setBullets(next);
												}}
											/>
											<button
												type="button"
												aria-label={`Remove bullet ${index + 1}`}
												title="remove this bullet"
												className="shrink-0 px-2 text-slate-400 hover:text-red-700"
												onClick={() =>
													setBullets(
														(bullets ?? []).filter((_, i) => i !== index),
													)
												}
											>
												×
											</button>
										</div>
									))}
									<button
										type="button"
										className="rounded border px-2 py-1"
										onClick={() =>
											setBullets([
												...(bullets ?? []),
												{ text: "", uid: nextUid++ },
											])
										}
									>
										+ bullet
									</button>
								</div>
							</section>
						</div>
					</main>
				)}
			</div>
		</div>
	);
}
