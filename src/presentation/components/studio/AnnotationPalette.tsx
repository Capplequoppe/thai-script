/**
 * The tag palette, and the warning that catches a tag the engine will ignore.
 *
 * Development only — see `pages/StudioPage.tsx`.
 */
import { useState } from "react";
import { ANNOTATIONS, unknownTags } from "./annotations";

/**
 * Inserts a tag into the focused narration box.
 *
 * Insertion goes through the DOM selection rather than through React state
 * because the caret is the point: an author reading a line decides a pause
 * belongs *here*, and a palette that could only append to the end would be
 * useless for the one thing pauses are for. The change is dispatched back
 * through `onInsert` so React stays the owner of the value.
 */
export function AnnotationPalette({
	onInsert,
}: {
	onInsert: (tag: string) => void;
}) {
	const [open, setOpen] = useState(false);

	return (
		<div className="relative">
			<button
				type="button"
				className="rounded border px-2 py-1 text-slate-600 text-xs hover:bg-slate-50"
				// Focus stays in the narration box, so the caret remains visible
				// and the author can see where the tag will land.
				onMouseDown={(event) => event.preventDefault()}
				onClick={() => setOpen((value) => !value)}
			>
				Tags {open ? "▾" : "▸"}
			</button>
			{open && (
				<div className="absolute right-0 z-20 mt-1 w-[26rem] rounded border bg-white p-3 shadow-lg">
					<p className="mb-2 text-slate-500 text-xs">
						Click to insert at the cursor. Direction, never spoken — but an
						unrecognised tag is silently ignored rather than flagged, so prefer
						these.
					</p>
					{ANNOTATIONS.map((group) => (
						<div key={group.title} className="mb-2">
							<div className="mb-1 font-medium text-[11px] text-slate-500 uppercase tracking-wide">
								{group.title}
							</div>
							<div className="flex flex-wrap gap-1">
								{group.items.map((item) => (
									<button
										type="button"
										key={item.tag}
										title={item.hint}
										className="rounded border bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] hover:border-slate-400 hover:bg-white"
										onMouseDown={(event) => event.preventDefault()}
										onClick={() => {
											onInsert(item.tag);
											// Closed on pick: the palette covers the line it
											// writes into, so leaving it open hides the result
											// of the thing just done.
											setOpen(false);
										}}
									>
										{item.tag}
									</button>
								))}
							</div>
						</div>
					))}
					<p className="mt-2 border-t pt-2 text-slate-500 text-xs">
						Free-form descriptions also work —{" "}
						<code>[whisper in small voice]</code>,{" "}
						<code>[professional broadcast tone]</code> — but a listed tag is the
						one with a known effect.
					</p>
				</div>
			)}
		</div>
	);
}

/** Names tags that are not on the official list. Advisory, never blocking. */
export function UnknownTagWarning({ text }: { text: string }) {
	const unknown = unknownTags(text);
	if (unknown.length === 0) return null;
	return (
		<p className="mt-1 text-[11px] text-amber-700">
			Not on the official list: {unknown.join(" ")} — free-form direction is
			supported, but a misspelt tag (<code>[whispers]</code> for{" "}
			<code>[whisper]</code>) is dropped without a word of complaint.
		</p>
	);
}
