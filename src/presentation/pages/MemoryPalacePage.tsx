import { useEffect, useMemo, useRef, useState } from "react";
import {
	consonantImageFor,
	consonantSceneFor,
} from "../../domain/script/data/consonantScenes";
import {
	CLASS_CAST,
	characterForClass,
	districtPlaceFor,
	housePlace,
	mapNamed,
	markRuleId,
	type PalacePlace,
	placeForTone,
	roomPlaceFor,
	TONE_SCENES,
	type ToneScene,
	toneNarrationFor,
	tonePlaceOverviewFor,
} from "../../domain/script/data/memoryPalace";
import { districtForClass } from "../../domain/script/data/sceneGrammar";
import {
	type Story,
	storyForConsonant,
	storyForVowel,
} from "../../domain/script/data/slideTags";
import {
	consonants,
	type ThaiSymbolClass,
	type ThaiVowel,
	toneMarkRules,
	toneRules,
	vowels,
} from "../../domain/script/data/symbols";
import {
	HOUSE_ROOMS,
	type HouseRoom,
	roomsForPosition,
} from "../../domain/script/data/vowelHouse";
import { ROOMS } from "../../domain/vocabulary/types";
import { SectionHeader } from "../components/atoms/SectionHeader";
import {
	ConsonantDetailDialog,
	consonantSummaryFor,
} from "../components/organisms/ConsonantDetailDialog";
import { StoryViewer } from "../components/organisms/StoryViewer";
import { useClipSequence } from "../hooks/useClipSequence";
import { useLearnedScript } from "../hooks/useLearnedScript";

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

/** The letter and its word, which is what a letter is learned as. */
function storyTitle(character: string): string {
	const scene = consonantSceneFor(character);
	return scene ? `${character} — the ${scene.meaning}` : character;
}

/** What the viewer needs: which slides, and what to call them. */
interface Playing {
	readonly story: Story;
	readonly title: string;
}

type Selection =
	| { kind: "tone"; tone: string }
	| { kind: "district"; classType: ThaiSymbolClass }
	// The vowels' house, which is one building rather than a set — so unlike
	// the others this carries nothing beyond its own kind.
	| { kind: "house" }
	| { kind: "room"; room: string }
	| null;

export function MemoryPalacePage() {
	const [selected, setSelected] = useState<Selection>(null);
	const [openLetter, setOpenLetter] = useState<string | null>(null);
	// The story playing, if any — resolved, rather than held as a character,
	// because a letter, a vowel and a tone rule each resolve differently and
	// the viewer wants the same two things from all of them.
	//
	// Separate from `openLetter` because opening a story closes the letter
	// dialog: two stacked modals on a phone is a thing you cannot reliably get
	// out of.
	const [playing, setPlaying] = useState<Playing | null>(null);
	const detailRef = useRef<HTMLDivElement | null>(null);

	// Picking a region on the painted map opens a panel that can be a screen
	// and a half further down, and on a phone it is always below the fold —
	// so a tap would otherwise look like nothing happened. Scrolling on every
	// selection rather than only on a map click, because the diagram and the
	// district row have the same problem to a smaller degree and two different
	// behaviours for one gesture would be the stranger thing.
	//
	// `scrollIntoView` is optional-called: jsdom does not implement it, and a
	// page that throws in tests to do something cosmetic in a browser is a bad
	// trade.
	useEffect(() => {
		if (!selected) return;
		detailRef.current?.scrollIntoView?.({
			behavior: "smooth",
			block: "start",
		});
	}, [selected]);

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
					Four kinds of place, and no word means two of them. Consonants live in
					a district by class, vowels lodge in the house at the crossroads by
					where they are written, words stage in a room by what they do, and a
					tone rule resolves at the height its tone is spoken.
				</p>
			</header>

			<WorldMap selected={selected} onSelect={setSelected} />
			<DistrictRow selected={selected} onSelect={setSelected} />
			<HouseRow selected={selected} onSelect={setSelected} />
			<RoomRow selected={selected} onSelect={setSelected} />

			{/* The scroll target, wrapping rather than inside the panel so it
			    exists before a selection does. */}
			<div ref={detailRef} className="scroll-mt-4">
				<DetailPanel
					selected={selected}
					onOpenLetter={setOpenLetter}
					onPlayStory={setPlaying}
				/>
			</div>

			<ConsonantDetailDialog
				summary={openLetter ? consonantSummaryFor(openLetter) : null}
				onClose={() => setOpenLetter(null)}
				onWatchStory={(character) => {
					const story = storyForConsonant(character);
					if (!story) return;
					setOpenLetter(null);
					setPlaying({ story, title: storyTitle(character) });
				}}
			/>

			<StoryViewer
				story={playing?.story ?? null}
				title={playing?.title ?? ""}
				onClose={() => setPlaying(null)}
			/>
		</div>
	);
}

// ----------------------------------------------------------------------------
// The painted world, and its clickable regions
// ----------------------------------------------------------------------------

/**
 * The whole valley in one picture, above the clickable diagrams.
 *
 * It answers a question the diagrams cannot: what does it look like when it is
 * all one world. The interactive map below is the same places again, arranged
 * so the pitch is legible — a thing a painting is bad at and a diagram is good
 * at. Neither replaces the other.
 */
function WorldMap({
	selected,
	onSelect,
}: {
	selected: Selection;
	onSelect: (selection: Selection) => void;
}) {
	const map = mapNamed("map-world");
	if (!map) return null;

	return (
		<section className="space-y-2" aria-label="Map of the palace">
			<ClickableMap map={map} selected={selected} onSelect={onSelect} />
			<p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
				{map.caption}
			</p>
		</section>
	);
}

/**
 * A painted map with its regions made clickable, and visibly so.
 *
 * The regions are outlined and labelled at rest rather than on hover, because
 * hover does not exist on a phone: a map whose affordance only appears under a
 * cursor is, to half its readers, a picture. The outlines are kept faint so
 * the painting still reads as one, and firm up on hover and focus for anyone
 * who does have a pointer.
 *
 * Positions are percentages of the image box (see `MapHotspot`), so a region
 * stays over the thing it marks at any width without measuring anything.
 */
function ClickableMap({
	map,
	selected,
	onSelect,
}: {
	map: PalacePlace;
	selected: Selection;
	onSelect: (selection: Selection) => void;
}) {
	const [failed, setFailed] = useState(false);
	if (failed) return null;

	return (
		<div className="relative">
			<img
				src={`${import.meta.env.BASE_URL}palace/scenes/${map.id}.jpg`}
				alt={map.prompt}
				loading="lazy"
				className="rounded-2xl w-full block"
				onError={() => setFailed(true)}
			/>
			{(map.hotspots ?? []).map((spot) => {
				const isSelected =
					spot.kind === "district"
						? selected?.kind === "district" &&
							selected.classType === (spot.for as ThaiSymbolClass)
						: spot.kind === "house"
							? selected?.kind === "house"
							: selected?.kind === "tone" && selected.tone === spot.for;

				return (
					<button
						key={`${spot.kind}-${spot.for}`}
						type="button"
						onClick={() =>
							onSelect(
								spot.kind === "district"
									? {
											kind: "district",
											classType: spot.for as ThaiSymbolClass,
										}
									: spot.kind === "house"
										? { kind: "house" }
										: { kind: "tone", tone: spot.for },
							)
						}
						className="absolute group flex items-end justify-center pb-1 rounded-lg transition-colors"
						style={{
							left: `${spot.x}%`,
							top: `${spot.y}%`,
							width: `${spot.w}%`,
							height: `${spot.h}%`,
							// Comfortably tappable even where a region is a small part
							// of a narrow screen — the waterfall is 12% of the width.
							minWidth: 44,
							minHeight: 44,
							border: `2px solid ${
								isSelected
									? "var(--color-accent)"
									: "color-mix(in srgb, var(--color-surface) 55%, transparent)"
							}`,
							background: isSelected
								? "color-mix(in srgb, var(--color-accent) 22%, transparent)"
								: "transparent",
						}}
					>
						<span
							className="text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none"
							style={{
								background: isSelected
									? "var(--color-accent)"
									: "color-mix(in srgb, var(--color-surface) 85%, transparent)",
								color: isSelected
									? "var(--color-surface)"
									: "var(--color-text)",
							}}
						>
							{spot.label}
						</span>
					</button>
				);
			})}
		</div>
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
	return (
		// The three districts as a row of cards, and no second map.
		//
		// There used to be a painted districts map here as well, which drew the
		// temple, the market and the harbour a second time at a closer zoom. It
		// dated from before the lessons carried the districts themselves: a
		// learner meets the temple in lesson 2 now and the harbour in lesson 3,
		// with a story and a picture each, so a map whose whole content was
		// "these three places exist" was repeating a lesson rather than adding
		// to it — and every place on it was already reachable from the world
		// map above.
		<section className="space-y-3" aria-label="Where consonants live">
			<SectionHeader>Where consonants live</SectionHeader>
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

/**
 * The vowels' house, as one card rather than a region on the painting.
 *
 * It should be a region, and `THE_HOUSE_IS_REACHABLE` in `memoryPalace.ts`
 * records why it is not yet: sixteen renders of the valley with the house in
 * it, and not one drew all nine places. A region over a building the painting
 * does not contain is the one kind of wrong a map here cannot afford.
 *
 * Its own row rather than a fourth tile in the district row, because it is not
 * a district: the districts sort consonants by class, and the whole point of
 * the house is that vowels have no class to be sorted by.
 */
function HouseRow({
	selected,
	onSelect,
}: {
	selected: Selection;
	onSelect: (selection: Selection) => void;
}) {
	const active = selected?.kind === "house";

	return (
		<section className="space-y-3" aria-label="Where vowels lodge">
			<SectionHeader>Where vowels lodge</SectionHeader>
			<button
				type="button"
				onClick={() => onSelect({ kind: "house" })}
				className="w-full rounded-xl p-3 text-left transition-colors"
				style={{
					background: active ? "var(--color-accent)" : "var(--color-surface-2)",
					color: active ? "var(--color-surface)" : "var(--color-text)",
					border: `2px solid ${active ? "transparent" : "var(--color-border)"}`,
				}}
			>
				<span className="block text-sm font-semibold">
					The vowels&rsquo; house
				</span>
				<span className="block text-xs" style={{ opacity: 0.75 }}>
					Out at the crossroads, where the roads from all three districts meet
				</span>
				<span className="block text-xs mt-1" style={{ opacity: 0.6 }}>
					{HOUSE_ROOMS.length} rooms — a vowel lodges in the one it is written
					in
				</span>
			</button>
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
		<section className="space-y-3" aria-label="Where words stage">
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

function DetailPanel({
	selected,
	onOpenLetter,
	onPlayStory,
}: {
	selected: Selection;
	onOpenLetter: (character: string) => void;
	onPlayStory: (playing: Playing) => void;
}) {
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
	if (selected.kind === "house")
		return <HouseDetail onPlayStory={onPlayStory} />;
	if (selected.kind === "district")
		return (
			<DistrictDetail
				classType={selected.classType}
				onOpenLetter={onOpenLetter}
			/>
		);
	return <RoomDetail room={selected.room} />;
}

function TonePlaceDetail({ tone }: { tone: string }) {
	const place = placeForTone(tone as Parameters<typeof placeForTone>[0]);
	const learned = useLearnedScript();
	const scenes = useMemo(
		() =>
			// Any rule, not all of them: a scene carries several on purpose,
			// because the place exists to say they share an outcome, and holding
			// the picture back until the last is learned withholds exactly the
			// connection it is for.
			TONE_SCENES.filter(
				(scene) =>
					scene.tone === tone &&
					scene.covers.some((id) => learned.toneRules.has(id)),
			),
		[tone, learned.toneRules],
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

			{scenes.length === 0 ? (
				// The place, with nothing in it yet. Said plainly rather than
				// dressed as an error: an empty paddy is a real paddy, and the
				// learner is meant to arrive here before anything happens in it.
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					Nothing has happened here yet. The rules that fill this place arrive
					as you meet them.
				</p>
			) : (
				<div className="space-y-3">
					{scenes.map((scene) => (
						<SceneCard key={scene.id} scene={scene} />
					))}
				</div>
			)}

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

/**
 * One scene: the picture, the story told out loud, and then the story in text.
 *
 * The button sits above the prose because the prose is the same story written
 * down — someone who listens has no reason to read it afterwards, and someone
 * who would rather read has lost nothing by scrolling past a button.
 */
function SceneCard({ scene }: { scene: ToneScene }) {
	const clips = useMemo(
		() => [`${import.meta.env.BASE_URL}${toneNarrationFor(scene.id)}`],
		[scene.id],
	);
	const { playing, play, stop } = useClipSequence(clips);

	return (
		<article
			className="rounded-xl p-3 space-y-2"
			style={{ background: "var(--color-surface-2)" }}
		>
			<SceneIllustration scene={scene} />
			<button
				type="button"
				onClick={playing ? stop : play}
				className="w-full py-2 px-3 rounded-lg text-sm font-medium"
				style={{
					background: playing
						? "var(--color-accent)"
						: "color-mix(in srgb, var(--color-accent) 14%, var(--color-surface))",
					color: playing ? "var(--color-surface)" : "var(--color-accent)",
					border:
						"1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)",
				}}
			>
				{playing ? "■ Stop" : "▶ Hear what happens here"}
			</button>
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

function DistrictDetail({
	classType,
	onOpenLetter,
}: {
	classType: ThaiSymbolClass;
	onOpenLetter: (character: string) => void;
}) {
	const district = districtForClass(classType);
	const overview = districtPlaceFor(classType);
	const learned = useLearnedScript();
	const letters = useMemo(
		() =>
			consonants.filter(
				(consonant) =>
					consonant.classType === classType &&
					learned.consonants.has(consonant.character),
			),
		[classType, learned.consonants],
	);
	const rules = useMemo(
		() => [
			...toneRules.filter(
				(rule) =>
					rule.consonantClass === classType && learned.toneRules.has(rule.id),
			),
			...toneMarkRules.filter(
				(rule) =>
					rule.consonantClass === classType &&
					learned.toneRules.has(
						markRuleId(rule.consonantClass, rule.toneMarkName),
					),
			),
		],
		[classType, learned.toneRules],
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
					{letters.length === 0
						? `${classType} class. Nobody has moved in yet — the letters that live here arrive as you meet them.`
						: `${classType} class — ${letters.length} ${
								letters.length === 1 ? "letter" : "letters"
							} so far. In the tone scenes this district sends its ${characterForClass(classType)}.`}
				</p>
			</div>

			{/* Two columns on a phone rather than one, so the district reads as a
			    populated place at a glance instead of a very long list. */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
				{letters.map((consonant) => (
					<ConsonantTile
						key={consonant.character}
						character={consonant.character}
						name={consonant.name}
						onOpen={() => onOpenLetter(consonant.character)}
					/>
				))}
			</div>

			{/* Only once there is something to count, and without the total.
			    "0 of the seventeen tone rules start here" told a learner who had
			    been shown nothing exactly how much was being withheld, directly
			    under a line saying the place was empty. */}
			{rules.length > 0 && (
				<p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
					{rules.length === 1
						? "One tone rule starts here."
						: `${rules.length} tone rules start here.`}
				</p>
			)}
		</section>
	);
}

/**
 * One letter as it lives in its district: its picture, its glyph, its word.
 *
 * The word is shown rather than left to a tooltip, because it is the thing the
 * letter is learned as — ม is not "the two-loop one", it is the horse — and a
 * tooltip is invisible on a phone, which is where most of this is read.
 */
function ConsonantTile({
	character,
	name,
	onOpen,
}: {
	character: string;
	name: string;
	onOpen: () => void;
}) {
	const scene = consonantSceneFor(character);
	const [failed, setFailed] = useState(false);
	const src = consonantImageFor(character);

	return (
		<button
			type="button"
			onClick={onOpen}
			className="rounded-xl overflow-hidden text-left w-full transition-transform active:scale-[0.98]"
			style={{ background: "var(--color-surface-2)" }}
		>
			{src && !failed && (
				<img
					src={`${import.meta.env.BASE_URL}${src}`}
					alt={scene ? `${name} — ${scene.meaning}` : name}
					loading="lazy"
					className="w-full block"
					style={{ aspectRatio: "3 / 2", objectFit: "cover" }}
					onError={() => setFailed(true)}
				/>
			)}
			<span className="px-2 py-1.5 flex items-baseline gap-2">
				<span className="thai text-xl leading-none">{character}</span>
				<span
					className="text-[11px] leading-tight"
					style={{ color: "var(--color-text-muted)" }}
				>
					{scene?.meaning ?? name}
				</span>
			</span>
		</button>
	);
}

/**
 * Inside the house: five rooms, and whoever is lodging in each of them.
 *
 * The rooms are all here from the first day, empty ones included, for the same
 * reason the districts are. Knowing a vowel is written above its consonant is
 * knowing which room it is in, so the floor plan is worth having before there
 * is anything in it — and a learner who has met one vowel should be able to see
 * the four rooms it has not reached yet.
 *
 * A compound vowel appears in every room it reaches rather than in one chosen
 * room. `เ-ือ` really is written in three places, and finding it on the front
 * steps and on the roof is the fact rather than a duplicate.
 */
function HouseDetail({
	onPlayStory,
}: {
	onPlayStory: (playing: Playing) => void;
}) {
	const house = housePlace();
	const learned = useLearnedScript();
	const lodgers = useMemo(() => {
		const byRoom = new Map<string, ThaiVowel[]>(
			HOUSE_ROOMS.map((room) => [room.slug, []]),
		);
		for (const vowel of vowels) {
			if (!learned.vowels.has(vowel.character)) continue;
			for (const room of roomsForPosition(vowel.position)) {
				byRoom.get(room.slug)?.push(vowel);
			}
		}
		return byRoom;
	}, [learned.vowels]);

	return (
		<section
			className="rounded-2xl p-4 space-y-4"
			style={{
				background: "var(--color-surface)",
				border: "1px solid var(--color-border)",
			}}
		>
			{house && (
				<PalaceImage
					id={house.id}
					alt={house.prompt}
					className="rounded-xl w-full"
				/>
			)}

			<div>
				<h2 className="text-lg font-semibold">The vowels&rsquo; house</h2>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					{house?.caption}
				</p>
			</div>

			<div className="space-y-3">
				{HOUSE_ROOMS.map((room) => (
					<HouseRoomCard
						key={room.slug}
						room={room}
						lodgers={lodgers.get(room.slug) ?? []}
						onPlayStory={onPlayStory}
					/>
				))}
			</div>
		</section>
	);
}

function HouseRoomCard({
	room,
	lodgers,
	onPlayStory,
}: {
	room: HouseRoom;
	lodgers: readonly ThaiVowel[];
	onPlayStory: (playing: Playing) => void;
}) {
	const place = roomPlaceFor(room.slug);

	return (
		<article
			className="rounded-xl p-3 space-y-2"
			style={{ background: "var(--color-surface-2)" }}
		>
			{place && (
				<PalaceImage
					id={place.id}
					alt={place.prompt}
					className="rounded-lg w-full"
				/>
			)}
			<div>
				<h3 className="text-sm font-semibold capitalize">{room.name}</h3>
				<p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
					Written {room.written}. {room.reason}
				</p>
			</div>

			{lodgers.length === 0 ? (
				<p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
					Empty so far. The vowels written here move in as you meet them.
				</p>
			) : (
				<div className="flex flex-wrap gap-2">
					{lodgers.map((vowel) => (
						<Lodger
							key={vowel.character}
							vowel={vowel}
							onPlayStory={onPlayStory}
						/>
					))}
				</div>
			)}
		</article>
	);
}

/**
 * One vowel in its room, and a door into the lesson that taught it.
 *
 * A vowel with no tagged story stays a plain tile rather than becoming a
 * button that opens nothing: a control that does nothing when pressed is worse
 * than no control, and the lessons are tagged one at a time.
 */
function Lodger({
	vowel,
	onPlayStory,
}: {
	vowel: ThaiVowel;
	onPlayStory: (playing: Playing) => void;
}) {
	const story = storyForVowel(vowel.character);
	const inside = (
		<>
			<span className="thai text-lg leading-none">{vowel.character}</span>
			<span
				className="text-[11px]"
				style={{ color: "var(--color-text-muted)" }}
			>
				{vowel.sound}
			</span>
		</>
	);
	const className = "rounded-lg px-2 py-1 flex items-baseline gap-1.5";
	const style = { background: "var(--color-surface)" };

	if (!story) {
		return (
			<span className={className} style={style}>
				{inside}
			</span>
		);
	}

	return (
		<button
			type="button"
			onClick={() =>
				onPlayStory({ story, title: `${vowel.character} — ${vowel.name}` })
			}
			className={`${className} transition-transform active:scale-[0.98]`}
			style={style}
		>
			{inside}
		</button>
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
