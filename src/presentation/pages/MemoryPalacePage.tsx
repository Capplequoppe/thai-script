import { useMemo, useState } from "react";
import {
	CLASS_CAST,
	characterForClass,
	districtPlaceFor,
	mapNamed,
	placeForTone,
	TONE_PLACES,
	TONE_SCENES,
	type TonePlace,
	type ToneScene,
	tonePlaceOverviewFor,
} from "../../domain/script/data/memoryPalace";
import { districtForClass } from "../../domain/script/data/sceneGrammar";
import {
	consonants,
	type ThaiSymbolClass,
	toneMarkRules,
	toneRules,
} from "../../domain/script/data/symbols";
import { ROOMS } from "../../domain/vocabulary/types";
import { SectionHeader } from "../components/atoms/SectionHeader";

/**
 * The world, drawn — which until now it never was.
 *
 * `sceneGrammar.ts` has staged consonants in three districts and `rooms.ts`
 * has staged words in six rooms for some time, but both only ever surfaced as
 * a badge inside one card. A learner could use the districts for months
 * without knowing there was a world they belonged to, and a memory palace you
 * cannot look at is doing none of the work a palace is for.
 *
 * Laid out so the map itself teaches the one thing it can teach for free:
 * the tone places sit at the height their tone is spoken at, and the two
 * contour tones are drawn as the movement between heights. That is the same
 * metaphor `ToneContourIcon` already draws on every word card, which is why
 * it is reused rather than invented — a second, different picture of pitch
 * would cost more than it gave.
 */

type Selection =
	| { kind: "tone"; tone: string }
	| { kind: "district"; classType: ThaiSymbolClass }
	| { kind: "room"; room: string }
	| null;

export function MemoryPalacePage() {
	const [selected, setSelected] = useState<Selection>(null);

	return (
		<div className="space-y-8 pb-10">
			<header className="space-y-2">
				<h1
					className="text-2xl font-bold"
					style={{ color: "var(--color-text)" }}
				>
					The Memory Palace
				</h1>
				<p
					className="text-sm leading-relaxed"
					style={{ color: "var(--color-text-muted)" }}
				>
					Three kinds of place, and no word means two of them. Consonants live
					in a district by class, words stage in a room by what they do, and a
					tone rule resolves at the height its tone is spoken.
				</p>
			</header>

			<WorldMap />
			<ToneMap selected={selected} onSelect={setSelected} />
			<DistrictRow selected={selected} onSelect={setSelected} />
			<RoomRow selected={selected} onSelect={setSelected} />

			<DetailPanel selected={selected} />
		</div>
	);
}

// ----------------------------------------------------------------------------
// The tone country — a pitch axis you can click
// ----------------------------------------------------------------------------

const MAP_HEIGHT = 260;

/**
 * The whole valley in one picture, above the clickable diagrams.
 *
 * It answers a question the diagrams cannot: what does it look like when it is
 * all one world. The interactive map below is the same places again, arranged
 * so the pitch is legible — a thing a painting is bad at and a diagram is good
 * at. Neither replaces the other.
 */
function WorldMap() {
	const map = mapNamed("map-world");
	if (!map) return null;

	return (
		<section className="space-y-2">
			<PalaceImage
				id={map.id}
				alt={map.prompt}
				className="rounded-2xl w-full"
			/>
			<p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
				{map.caption}
			</p>
		</section>
	);
}

function ToneMap({
	selected,
	onSelect,
}: {
	selected: Selection;
	onSelect: (selection: Selection) => void;
}) {
	return (
		<section className="space-y-3">
			<SectionHeader>Where tones resolve</SectionHeader>
			<div
				className="relative rounded-2xl px-4"
				style={{
					height: MAP_HEIGHT,
					background: "var(--color-surface-2)",
					border: "1px solid var(--color-border)",
				}}
			>
				{/* The pitch axis, so "higher up the map" is legible as "higher
				    pitch" rather than left to be inferred. */}
				<span
					className="absolute left-2 top-2 text-[10px] uppercase tracking-wide"
					style={{ color: "var(--color-text-muted)" }}
				>
					high pitch
				</span>
				<span
					className="absolute left-2 bottom-2 text-[10px] uppercase tracking-wide"
					style={{ color: "var(--color-text-muted)" }}
				>
					low pitch
				</span>

				{TONE_PLACES.map((place) => (
					<TonePlaceMarker
						key={place.tone}
						place={place}
						active={selected?.kind === "tone" && selected.tone === place.tone}
						onSelect={() => onSelect({ kind: "tone", tone: place.tone })}
					/>
				))}
			</div>
		</section>
	);
}

/** Vertical position on the map: `from` is a fraction where 1 is the top. */
function topFor(fraction: number): number {
	return (1 - fraction) * (MAP_HEIGHT - 64) + 8;
}

function TonePlaceMarker({
	place,
	active,
	onSelect,
}: {
	place: TonePlace;
	active: boolean;
	onSelect: () => void;
}) {
	// Spread the five places across the width in declared order, which runs
	// mid, low, high, falling, rising — level tones first, then the two that
	// move, so the moving ones sit together at the right and read as a pair.
	const index = TONE_PLACES.indexOf(place);
	const left = `${8 + index * 18}%`;
	const moves = place.from !== place.to;

	return (
		<>
			{moves && (
				// The contour drawn as the drop or the climb it is. Decorative:
				// the button below carries the label and the interaction.
				<span
					aria-hidden="true"
					className="absolute w-0.5 rounded"
					style={{
						left: `calc(${left} + 28px)`,
						top: topFor(Math.max(place.from, place.to)) + 18,
						height: Math.abs(topFor(place.to) - topFor(place.from)),
						background: "var(--color-accent)",
						opacity: 0.45,
					}}
				/>
			)}
			<button
				type="button"
				onClick={onSelect}
				className="absolute rounded-xl px-2.5 py-2 text-left transition-colors"
				style={{
					left,
					top: topFor(place.from),
					width: "15%",
					minWidth: 92,
					background: active ? "var(--color-accent)" : "var(--color-surface)",
					color: active ? "var(--color-surface)" : "var(--color-text)",
					border: `2px solid ${active ? "transparent" : "var(--color-border)"}`,
				}}
			>
				<span className="block text-xs font-semibold leading-tight">
					{place.name}
				</span>
				<span
					className="block text-[10px] uppercase tracking-wide"
					style={{ opacity: 0.7 }}
				>
					{place.tone}
				</span>
			</button>
		</>
	);
}

// ----------------------------------------------------------------------------
// The class districts and the part-of-speech rooms
// ----------------------------------------------------------------------------

function DistrictRow({
	selected,
	onSelect,
}: {
	selected: Selection;
	onSelect: (selection: Selection) => void;
}) {
	const districtsMap = mapNamed("map-districts");

	return (
		<section className="space-y-3">
			<SectionHeader>Where consonants live</SectionHeader>
			{districtsMap && (
				<>
					<PalaceImage
						id={districtsMap.id}
						alt={districtsMap.prompt}
						className="rounded-2xl w-full"
					/>
					<p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
						{districtsMap.caption}
					</p>
				</>
			)}
			<div className="grid grid-cols-3 gap-3">
				{CLASS_CAST.map((entry) => {
					const active =
						selected?.kind === "district" &&
						selected.classType === entry.classType;
					return (
						<button
							key={entry.district}
							type="button"
							onClick={() =>
								onSelect({ kind: "district", classType: entry.classType })
							}
							className="rounded-xl p-3 text-left transition-colors"
							style={{
								background: active
									? "var(--color-accent)"
									: "var(--color-surface-2)",
								color: active ? "var(--color-surface)" : "var(--color-text)",
								border: `2px solid ${active ? "transparent" : "var(--color-border)"}`,
							}}
						>
							<span className="block text-sm font-semibold capitalize">
								{entry.district}
							</span>
							<span className="block text-xs" style={{ opacity: 0.75 }}>
								{entry.classType} class
							</span>
							<span className="block text-xs mt-1" style={{ opacity: 0.6 }}>
								{entry.character}
							</span>
						</button>
					);
				})}
			</div>
		</section>
	);
}

function RoomRow({
	selected,
	onSelect,
}: {
	selected: Selection;
	onSelect: (selection: Selection) => void;
}) {
	return (
		<section className="space-y-3">
			<SectionHeader>Where words stage</SectionHeader>
			<div className="flex flex-wrap gap-2">
				{ROOMS.map((room) => {
					const active = selected?.kind === "room" && selected.room === room;
					return (
						<button
							key={room}
							type="button"
							onClick={() => onSelect({ kind: "room", room })}
							className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
							style={{
								background: active
									? "var(--color-accent)"
									: "var(--color-surface-2)",
								color: active
									? "var(--color-surface)"
									: "var(--color-text-muted)",
								border: `2px solid ${active ? "transparent" : "var(--color-border)"}`,
							}}
						>
							{room.replaceAll("-", " ")}
						</button>
					);
				})}
			</div>
		</section>
	);
}

// ----------------------------------------------------------------------------
// Entering a location
// ----------------------------------------------------------------------------

function DetailPanel({ selected }: { selected: Selection }) {
	if (!selected) {
		return (
			<p
				className="text-sm text-center py-6"
				style={{ color: "var(--color-text-muted)" }}
			>
				Pick a place to go inside it.
			</p>
		);
	}

	if (selected.kind === "tone") return <TonePlaceDetail tone={selected.tone} />;
	if (selected.kind === "district")
		return <DistrictDetail classType={selected.classType} />;
	return <RoomDetail room={selected.room} />;
}

function TonePlaceDetail({ tone }: { tone: string }) {
	const place = placeForTone(tone as Parameters<typeof placeForTone>[0]);
	const scenes = useMemo(
		() => TONE_SCENES.filter((scene) => scene.tone === tone),
		[tone],
	);
	const overview = tonePlaceOverviewFor(tone);

	return (
		<section
			className="rounded-2xl p-4 space-y-4"
			style={{
				background: "var(--color-surface)",
				border: "1px solid var(--color-border)",
			}}
		>
			{/* The place empty, before anything happens in it. Arriving
			    somewhere and being handed straight to an event skips the step
			    where you learn the room. */}
			{overview && (
				<PalaceImage
					id={overview.id}
					alt={overview.prompt}
					className="rounded-xl w-full"
				/>
			)}

			<div>
				<h2 className="text-lg font-semibold capitalize">{place.name}</h2>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					{place.reason}
				</p>
			</div>

			<div className="space-y-3">
				{scenes.map((scene) => (
					<SceneCard key={scene.id} scene={scene} />
				))}
			</div>

			{/* Said outright, because it is the reason several scenes hold more
			    than one character and a learner should not have to infer it. */}
			{scenes.length > 1 && (
				<p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
					Everything here ends in a {tone} tone — that is what makes it one
					place.
				</p>
			)}
		</section>
	);
}

/**
 * A palace image by id, or nothing at all where it has not been rendered.
 *
 * Silence rather than a placeholder: a map or an establishing shot is scenery,
 * and a dashed "pending" box where scenery should be draws the eye to the
 * absence. A scene is different — its box says the scene exists and its
 * picture does not, which is worth saying.
 */
function PalaceImage({
	id,
	alt,
	className,
}: {
	id: string;
	alt: string;
	className?: string;
}) {
	const [failed, setFailed] = useState(false);
	if (failed) return null;

	return (
		<img
			src={`${import.meta.env.BASE_URL}palace/scenes/${id}.jpg`}
			alt={alt}
			loading="lazy"
			className={className ?? "rounded-xl w-full"}
			onError={() => setFailed(true)}
		/>
	);
}

/**
 * The scene's picture, or the scene's own words where there is no picture yet.
 *
 * `onError` rather than a manifest lookup: the images are generated offline by
 * `scripts/generate-palace-images.py` and a scene can legitimately be ahead of
 * its illustration — newly written, or being re-rolled. Shipping a broken
 * image icon in that window would be worse than the prose it replaces, and
 * asking the app to carry a list of which files exist would be one more thing
 * to keep in step with the directory.
 */
function SceneIllustration({ scene }: { scene: ToneScene }) {
	const [failed, setFailed] = useState(false);

	if (failed) {
		return (
			<div
				className="rounded-lg flex items-center justify-center text-xs px-3 text-center"
				style={{
					minHeight: 96,
					border: "1px dashed var(--color-border)",
					color: "var(--color-text-muted)",
				}}
			>
				illustration pending
			</div>
		);
	}

	return (
		<img
			src={`${import.meta.env.BASE_URL}palace/scenes/${scene.id}.jpg`}
			alt={scene.scene}
			loading="lazy"
			className="rounded-lg w-full"
			onError={() => setFailed(true)}
		/>
	);
}

function SceneCard({ scene }: { scene: ToneScene }) {
	return (
		<article
			className="rounded-xl p-3 space-y-2"
			style={{ background: "var(--color-surface-2)" }}
		>
			<SceneIllustration scene={scene} />
			<p className="text-sm leading-relaxed">{scene.scene}</p>
			<p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
				{scene.teaches}
			</p>
			<p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
				{scene.covers.length === 1
					? "1 rule"
					: `${scene.covers.length} rules, which agree`}
				{scene.prop ? ` · ${scene.prop}` : ""}
			</p>
		</article>
	);
}

function DistrictDetail({ classType }: { classType: ThaiSymbolClass }) {
	const district = districtForClass(classType);
	const overview = districtPlaceFor(classType);
	const letters = useMemo(
		() => consonants.filter((consonant) => consonant.classType === classType),
		[classType],
	);
	const rules = useMemo(
		() => [
			...toneRules.filter((rule) => rule.consonantClass === classType),
			...toneMarkRules.filter((rule) => rule.consonantClass === classType),
		],
		[classType],
	);

	return (
		<section
			className="rounded-2xl p-4 space-y-4"
			style={{
				background: "var(--color-surface)",
				border: "1px solid var(--color-border)",
			}}
		>
			{overview && (
				<PalaceImage
					id={overview.id}
					alt={overview.prompt}
					className="rounded-xl w-full"
				/>
			)}

			<div>
				<h2 className="text-lg font-semibold capitalize">{district}</h2>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					{classType} class — {letters.length} letters. In the tone scenes this
					district sends its {characterForClass(classType)}.
				</p>
			</div>

			<div className="flex flex-wrap gap-1.5">
				{letters.map((consonant) => (
					<span
						key={consonant.character}
						className="thai rounded-lg px-2 py-1 text-lg"
						style={{ background: "var(--color-surface-2)" }}
						title={consonant.name}
					>
						{consonant.character}
					</span>
				))}
			</div>

			<p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
				{rules.length} of the seventeen tone rules start here.
			</p>
		</section>
	);
}

function RoomDetail({ room }: { room: string }) {
	return (
		<section
			className="rounded-2xl p-4 space-y-2"
			style={{
				background: "var(--color-surface)",
				border: "1px solid var(--color-border)",
			}}
		>
			<h2 className="text-lg font-semibold capitalize">
				{room.replaceAll("-", " ")}
			</h2>
			<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
				Where a word of this kind stages its mnemonic, so the cast and props of
				one word compose with the next instead of competing.
			</p>
		</section>
	);
}
