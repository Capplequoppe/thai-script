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
 */
import { useCallback, useEffect, useMemo, useState } from "react";

const API = "/__studio/api";

type NarrationLine = { language: string; text: string };

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

type Deck = { id: string; slides: Slide[]; audio: Record<string, string[]> };

/** Roughly how long this clip will take to say, at the engine's measured pace. */
function spokenSeconds(text: string): number {
	return (text.trim().split(/\s+/).filter(Boolean).length / 160) * 60;
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

	// Local edits, kept separate from the loaded deck so an unsaved change is
	// visibly unsaved rather than silently merged into what the server holds.
	const [draft, setDraft] = useState<NarrationLine[] | null>(null);
	const [bullets, setBullets] = useState<string[] | null>(null);
	const [heading, setHeading] = useState<string | null>(null);
	const [prompt, setPrompt] = useState("");
	const [seed, setSeed] = useState("42");

	const loadDeck = useCallback(async (id: string) => {
		setError(null);
		try {
			const data = await call<Deck>(`/deck/${id}`);
			setDeck(data);
			setSelected((current) =>
				current && data.slides.some((s) => s.id === current)
					? current
					: (data.slides[0]?.id ?? null),
			);
		} catch (cause) {
			setError(String(cause));
		}
	}, []);

	useEffect(() => {
		call<{ decks: string[] }>("/decks")
			.then((data) => setDecks(data.decks))
			.catch((cause) => setError(String(cause)));
	}, []);

	useEffect(() => {
		void loadDeck(deckId);
	}, [deckId, loadDeck]);

	const slide = useMemo(
		() => deck?.slides.find((s) => s.id === selected) ?? null,
		[deck, selected],
	);

	// Reset the draft whenever the selection changes, so edits cannot leak
	// from one slide onto another.
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
			setStatus("Saved to the script. Rebuild to hear it.");
		});

	const rebuild = () =>
		run("Rebuilding", async () => {
			const report = await call<{ generated: number; reused: number }>(
				`/deck/${deckId}/build`,
				{ method: "POST" },
			);
			await loadDeck(deckId);
			setStatus(
				`${report.generated} clip(s) generated, ${report.reused} reused.`,
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
			setStatus("Picture rendered. Its prompt and seed are on the slide now.");
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
			if (!slide) return;
			if (!window.confirm(`Remove slide "${slide.id}" from the script?`)) return;
			await call(`/deck/${deckId}/slide/${slide.id}`, { method: "DELETE" });
			setSelected(null);
			await loadDeck(deckId);
		});

	const clips = slide ? (deck?.audio[slide.id] ?? []) : [];

	return (
		<div className="mx-auto max-w-[1400px] p-4 text-sm">
			<header className="mb-4 flex flex-wrap items-center gap-3">
				<h1 className="font-semibold text-lg">Deck studio</h1>
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
					onClick={rebuild}
					disabled={busy !== null}
				>
					Rebuild audio
				</button>
				{busy && <span className="text-amber-700">{busy}…</span>}
				{status && <span className="text-emerald-700">{status}</span>}
				{error && <span className="text-red-700">{error}</span>}
			</header>

			<div className="grid grid-cols-[220px_1fr] gap-4">
				<nav className="max-h-[80vh] overflow-y-auto rounded border">
					{deck?.slides.map((entry) => (
						<button
							type="button"
							key={entry.id}
							onClick={() => setSelected(entry.id)}
							className={`block w-full border-b px-3 py-2 text-left ${
								entry.id === selected ? "bg-slate-100 font-medium" : ""
							}`}
						>
							<div className="truncate">{entry.id}</div>
							<div className="text-slate-500 text-xs">
								{entry.kind} · {entry.narration.length} line(s)
							</div>
						</button>
					))}
					<button
						type="button"
						className="w-full px-3 py-2 text-left text-slate-600"
						onClick={addSlide}
						disabled={busy !== null}
					>
						+ add slide after selected
					</button>
				</nav>

				{slide && draft && (
					<main className="space-y-4">
						<div className="flex items-center gap-3">
							<input
								className="flex-1 rounded border px-2 py-1"
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
								className="rounded border border-red-300 px-3 py-1 text-red-700"
								onClick={removeSlide}
								disabled={busy !== null}
							>
								Remove
							</button>
						</div>

						<section>
							<h2 className="mb-1 font-medium">Narration</h2>
							{draft.map((line, index) => {
								const seconds = spokenSeconds(line.text);
								return (
									<div key={index} className="mb-2 flex gap-2">
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
											className="min-h-[4.5rem] flex-1 rounded border p-2 font-mono text-xs"
											value={line.text}
											onChange={(event) => {
												const next = [...draft];
												next[index] = { ...line, text: event.target.value };
												setDraft(next);
											}}
										/>
										<div className="w-24 shrink-0 text-right text-xs">
											{/* Past roughly twelve seconds this engine starts to
											    drift, and past ~190 words it fabricates. */}
											<div
												className={
													seconds > 12 ? "text-amber-700" : "text-slate-500"
												}
											>
												~{seconds.toFixed(0)}s
											</div>
											<button
												type="button"
												className="mt-1 text-slate-500 hover:text-red-700"
												onClick={() =>
													setDraft(draft.filter((_, i) => i !== index))
												}
											>
												remove
											</button>
										</div>
									</div>
								);
							})}
							<button
								type="button"
								className="rounded border px-2 py-1"
								onClick={() => setDraft([...draft, { language: "en", text: "" }])}
							>
								+ line
							</button>
						</section>

						{clips.length > 0 && (
							<section>
								<h2 className="mb-1 font-medium">
									Audio ({clips.length} clip{clips.length === 1 ? "" : "s"})
								</h2>
								<div className="flex flex-wrap gap-2">
									{clips.map((src) => (
										<audio key={src} controls preload="none" src={src}>
											<track kind="captions" />
										</audio>
									))}
								</div>
							</section>
						)}

						<section className="grid grid-cols-2 gap-4">
							<div>
								<h2 className="mb-1 font-medium">Picture</h2>
								{slide.imageUrl ? (
									// Cache-busted on every reload: a regenerated picture keeps
									// its filename, so the browser would otherwise show the old
									// one and the button would look broken.
									<img
										src={`${slide.imageUrl}?v=${Date.now()}`}
										alt={slide.heading ?? slide.id}
										className="w-full rounded border"
									/>
								) : (
									<p className="text-slate-500">no image on this slide</p>
								)}
							</div>
							<div className="space-y-2">
								<label className="block" htmlFor="studio-prompt">
									<span className="text-slate-600 text-xs">
										Prompt {slide.prompt ? "(as last rendered)" : "(from scene)"}
									</span>
									<textarea
										id="studio-prompt"
										className="min-h-[9rem] w-full rounded border p-2 font-mono text-xs"
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
									Rendering stands the narration engine down and loads the
									image model; the next rebuild pays its startup again.
								</p>
							</div>
						</section>

						<section>
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
						</section>
					</main>
				)}
			</div>
		</div>
	);
}
