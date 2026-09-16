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
import { useCallback, useEffect, useMemo, useState } from "react";

const API = "/__studio/api";

type NarrationLine = { language: string; text: string };

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
	seed: string | null;
	narration: NarrationLine[];
	bullets: string[];
};

type Deck = {
	id: string;
	slides: Slide[];
	clips: Record<string, Clip[]>;
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

	const [draft, setDraft] = useState<NarrationLine[] | null>(null);
	const [bullets, setBullets] = useState<string[] | null>(null);
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
		setDraft(slide ? slide.narration.map((line) => ({ ...line })) : null);
		setBullets(slide ? [...slide.bullets] : null);
		setHeading(slide?.heading ?? null);
		setPrompt(slide?.prompt ?? slide?.scene ?? "");
		setSeed(slide?.seed ?? "42");
	}, [slide]);

	const dirty = useMemo(() => {
		if (!slide || !draft || !bullets) return false;
		return (
			JSON.stringify(draft) !== JSON.stringify(slide.narration) ||
			JSON.stringify(bullets) !== JSON.stringify(slide.bullets) ||
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

	const save = () =>
		run("Saving", async () => {
			if (!slide || !draft) return;
			await call(`/deck/${deckId}/slide/${slide.id}`, {
				method: "PUT",
				body: JSON.stringify({ narration: draft, bullets, heading }),
			});
			await loadDeck(deckId);
			setStatus("Saved. Regenerate to hear it.");
		});

	/**
	 * Every scope is one call with a different force list — the pipeline skips
	 * whatever is unchanged, so "this clip", "this slide" and "the deck" differ
	 * only in what they insist on remaking.
	 */
	const rebuild = (label: string, force?: string[]) =>
		run(label, async () => {
			if (dirty) {
				await call(`/deck/${deckId}/slide/${slide?.id}`, {
					method: "PUT",
					body: JSON.stringify({ narration: draft, bullets, heading }),
				});
			}
			const report = await call<BuildReport>(`/deck/${deckId}/build`, {
				method: "POST",
				body: JSON.stringify({ force: force ?? null }),
			});
			await loadDeck(deckId);
			setAudioVersion((version) => version + 1);
			setStatus(
				report.errors.length > 0
					? `${report.errors.length} failed: ${report.errors[0]}`
					: `${report.generated} generated, ${report.reused} reused, ${report.synthCalls} call(s).`,
			);
		});

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
					onClick={() => rebuild("Rebuilding deck")}
					disabled={busy !== null}
				>
					Rebuild deck
				</button>
				<span className="flex-1" />
				{busy && <span className="text-amber-700">{busy}…</span>}
				{status && <span className="text-emerald-700">{status}</span>}
				{error && <span className="max-w-[40ch] truncate text-red-700">{error}</span>}
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
									entry.id === selected ? "bg-white font-medium shadow-inner" : ""
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
											key={index}
											className="mb-3 rounded border bg-white p-2"
										>
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
												<textarea
													className="min-h-[5rem] flex-1 rounded border p-2 font-mono text-xs"
													value={line.text}
													onChange={(event) => {
														const next = [...draft];
														next[index] = {
															...line,
															text: event.target.value,
														};
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

											{feeds.map((clip) => {
												const seconds = spokenSeconds(clip.words);
												const shared = clip.sources.length > 1;
												return (
													<div
														key={clip.key}
														className="mt-2 flex items-center gap-2 border-t pt-2"
													>
														{clip.url ? (
															<audio
																controls
																preload="none"
																className="h-8 min-w-0 flex-1"
																src={`${clip.url}?v=${audioVersion}`}
															>
																<track kind="captions" />
															</audio>
														) : (
															<span className="flex-1 text-amber-700 text-xs">
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
															{clip.key.split("-").pop()} · ~{seconds.toFixed(0)}s
															{shared && " · merged"}
														</span>
														<button
															type="button"
															className="shrink-0 rounded border px-2 py-1 text-xs disabled:opacity-40"
															onClick={() =>
																rebuild(`Regenerating ${clip.key}`, [clip.key])
															}
															disabled={busy !== null}
														>
															Regenerate
														</button>
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
										setDraft([...draft, { language: "en", text: "" }])
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
										Prompt {slide.prompt ? "(as last rendered)" : "(from scene)"}
									</span>
									<textarea
										id="studio-prompt"
										className="min-h-[8rem] w-full rounded border p-2 font-mono text-xs"
										value={prompt}
										onChange={(event) => setPrompt(event.target.value)}
									/>
								</label>
								<div className="flex items-center gap-2">
									<label htmlFor="studio-seed" className="text-slate-600 text-xs">
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
									{(bullets ?? []).map((text, index) => (
										<input
											key={index}
											className="mb-1 w-full rounded border px-2 py-1"
											value={text}
											onChange={(event) => {
												const next = [...(bullets ?? [])];
												next[index] = event.target.value;
												setBullets(next);
											}}
										/>
									))}
									<button
										type="button"
										className="rounded border px-2 py-1"
										onClick={() => setBullets([...(bullets ?? []), ""])}
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
