import { useState } from "react";
import {
	consonantImageFor,
	consonantSceneFor,
} from "../../../domain/script/data/consonantScenes";
import {
	describeSwedish,
	swedishFor,
} from "../../../domain/script/data/vowelAnalogies";
import type {
	ConsonantSummary,
	NumeralSummary,
	RareVowelSummary,
	ToneMarkSummary,
	VowelSummary,
} from "../../../domain/script/services/ScriptLessonService";

import { classColor } from "../../utils/consonantClassColor";
import { ClassBadge } from "../atoms/ClassBadge";
import { ThaiCharDisplay } from "../atoms/ThaiCharDisplay";
import { ToneContourIcon } from "../atoms/ToneContourIcon";
import { MnemonicBlock } from "../molecules/MnemonicBlock";
import { SymbolInfoRow } from "../molecules/SymbolInfoRow";

/**
 * The consonant's own word, illustrated where its class lives.
 *
 * Rendered only if the file is there: the pictures are generated offline by
 * `scripts/generate-consonant-images.py`, and a letter can legitimately be
 * ahead of its illustration. A broken image icon in that window would be worse
 * than nothing, and the card reads perfectly well without it.
 */
function ConsonantSceneImage({
	character,
	name,
}: {
	character: string;
	name: string;
}) {
	const scene = consonantSceneFor(character);
	const src = consonantImageFor(character);
	const [failed, setFailed] = useState(false);

	if (!src || failed) return null;

	return (
		<figure className="rounded-xl overflow-hidden">
			<img
				src={`${import.meta.env.BASE_URL}${src}`}
				alt={scene ? `${name} — ${scene.meaning}` : name}
				loading="lazy"
				className="w-full block"
				onError={() => setFailed(true)}
			/>
			{scene && (
				<figcaption
					className="text-xs px-3 py-2"
					style={{
						background: "var(--color-surface-2)",
						color: "var(--color-text-muted)",
					}}
				>
					The {scene.meaning} in the {scene.district}.
				</figcaption>
			)}
		</figure>
	);
}

export function ConsonantCard({
	c,
	compact,
	hideClassCue,
}: {
	c: ConsonantSummary;
	compact?: boolean;
	/**
	 * The class-retrieval card's own question IS "what class is this
	 * consonant" — suppresses colour *and* district so neither channel
	 * renders the answer. Mirrors `ScriptCardGenerator.ts`'s existing
	 * suppression of `consonantClass` on that same card.
	 */
	hideClassCue?: boolean;
}) {
	return (
		<div className="space-y-3">
			<div className="text-center">
				<ThaiCharDisplay
					character={c.character}
					className="text-[96px]"
					audioUrl={c.audioUrl}
					color={hideClassCue ? undefined : classColor(c.classType)}
				/>
				<h2 className="text-2xl font-semibold mt-2">{c.nameRomanized}</h2>
				<p
					className="thai text-lg"
					style={{ color: "var(--color-text-muted)" }}
				>
					{c.name}
				</p>
				<p
					className="text-sm italic"
					style={{ color: "var(--color-text-muted)" }}
				>
					"{c.nameMeaning}"
				</p>
			</div>

			{/* The letter's word, in the district its class lives in. Placed
			    under the glyph rather than beside the mnemonic prose because it
			    is the same thing the prose describes, and a learner should meet
			    the horse before reading about the two loops. Suppressed on a
			    class-retrieval card for the reason `hideClassCue` exists: the
			    harbour behind the horse is an answer. */}
			{!hideClassCue && !compact && (
				<ConsonantSceneImage character={c.character} name={c.name} />
			)}

			<div
				className="rounded-xl p-4 space-y-0.5"
				style={{ background: "var(--color-surface-2)" }}
			>
				<div
					className="flex justify-between items-center py-1.5 border-b last:border-0"
					style={{ borderColor: "var(--color-border)" }}
				>
					<span
						className="text-xs"
						style={{ color: "var(--color-text-muted)" }}
					>
						Class
					</span>
					{!hideClassCue && <ClassBadge classType={c.classType} />}
				</div>
				<SymbolInfoRow label="Initial sound" value={c.initialSound} />
				<SymbolInfoRow label="Final sound" value={c.finalSound} />
				<SymbolInfoRow
					label="Ending type"
					value={c.hasDeadEnding ? "Dead" : "Live"}
					valueStyle={{
						color: c.hasDeadEnding
							? "var(--color-danger)"
							: "var(--color-master)",
					}}
				/>
				{c.isAspirated && <SymbolInfoRow label="Aspirated" value="Yes" />}
			</div>

			{!compact && c.mnemonic && <MnemonicBlock text={c.mnemonic} />}
		</div>
	);
}

export function VowelCard({
	v,
	compact,
}: {
	v: VowelSummary;
	compact?: boolean;
}) {
	// Shown under the English gloss rather than instead of it: the English is
	// what every other course and dictionary will give this vowel, and a
	// learner who only ever sees the Swedish cannot follow them.
	const swedish = swedishFor(v.character);
	return (
		<div className="space-y-3">
			<div className="text-center">
				<ThaiCharDisplay
					character={v.character}
					className="text-[96px]"
					audioUrl={v.audioUrl}
				/>
				<h2 className="text-2xl font-semibold mt-2">{v.name}</h2>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					{v.sound}
				</p>
				{swedish && (
					<p className="text-sm mt-1" style={{ color: "var(--color-master)" }}>
						Swedish: {describeSwedish(swedish)}
					</p>
				)}
			</div>

			<div
				className="rounded-xl p-4 space-y-0.5"
				style={{ background: "var(--color-surface-2)" }}
			>
				<SymbolInfoRow
					label="Length"
					value={v.length}
					valueStyle={{
						color:
							v.length === "long"
								? "var(--color-enlightened)"
								: "var(--color-guru)",
					}}
				/>
				<SymbolInfoRow label="Position" value={v.position} />
			</div>

			{!compact && v.mnemonic && <MnemonicBlock text={v.mnemonic} />}
		</div>
	);
}

export function ToneMarkCard({ t }: { t: ToneMarkSummary }) {
	return (
		<div className="space-y-3">
			<div className="text-center">
				<ThaiCharDisplay
					character={t.character}
					className="text-[96px]"
					audioUrl={t.audioUrl}
				/>
				<h2 className="text-2xl font-semibold mt-2">{t.name}</h2>
			</div>

			<div
				className="rounded-xl p-4 space-y-0.5"
				style={{ background: "var(--color-surface-2)" }}
			>
				<SymbolInfoRow
					label="Mid class →"
					value={
						<span className="inline-flex items-center gap-2">
							{t.midClassTone}
							<ToneContourIcon tone={t.midClassTone} />
						</span>
					}
				/>
				{t.highClassTone && (
					<SymbolInfoRow
						label="High class →"
						value={
							<span className="inline-flex items-center gap-2">
								{t.highClassTone}
								<ToneContourIcon tone={t.highClassTone} />
							</span>
						}
					/>
				)}
				{t.lowClassTone && (
					<SymbolInfoRow
						label="Low class →"
						value={
							<span className="inline-flex items-center gap-2">
								{t.lowClassTone}
								<ToneContourIcon tone={t.lowClassTone} />
							</span>
						}
					/>
				)}
			</div>
		</div>
	);
}

export function RareVowelCard({ v }: { v: RareVowelSummary }) {
	return (
		<div className="space-y-3">
			<div className="text-center">
				<ThaiCharDisplay character={v.character} className="text-[96px]" />
				<h2 className="text-2xl font-semibold mt-2">{v.name}</h2>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					{v.pronunciation}
				</p>
			</div>

			<div
				className="rounded-xl p-4 space-y-0.5"
				style={{ background: "var(--color-surface-2)" }}
			>
				<SymbolInfoRow
					label="Length"
					value={v.length}
					valueStyle={{
						color:
							v.length === "long"
								? "var(--color-enlightened)"
								: "var(--color-guru)",
					}}
				/>
			</div>

			{v.notes && <MnemonicBlock text={v.notes} />}
		</div>
	);
}

export function NumeralCard({ n }: { n: NumeralSummary }) {
	return (
		<div className="space-y-3">
			<div className="text-center">
				<ThaiCharDisplay character={n.character} className="text-[96px]" />
				<h2 className="text-2xl font-semibold mt-2">{n.arabic}</h2>
				<p
					className="thai text-lg"
					style={{ color: "var(--color-text-muted)" }}
				>
					{n.word}
				</p>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					{n.romanization}
				</p>
			</div>
		</div>
	);
}

/**
 * A rule that changes how the script is *read* rather than mapping a class
 * to a tone — ห นำ, การันต์, unwritten vowels. These were written into
 * `symbols.ts` and assigned to lessons from the start but never rendered,
 * so a learner met หมี and ขนาด without ever being shown the rule that
 * decides their tone.
 */
export function SpecialRuleCard({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="space-y-3">
			<div className="text-center py-4">
				<span className="text-6xl">🔑</span>
				<h2 className="text-2xl font-semibold mt-4">{title}</h2>
			</div>

			<div
				className="rounded-xl p-4"
				style={{
					background:
						"color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
				}}
			>
				<p className="text-sm" style={{ color: "var(--color-text)" }}>
					{description}
				</p>
			</div>
		</div>
	);
}

export function ToneRuleCard({ description }: { description: string }) {
	return (
		<div className="space-y-3">
			<div className="text-center py-4">
				<span className="text-6xl">📏</span>
				<h2 className="text-2xl font-semibold mt-4">Tone Rule</h2>
			</div>

			<div
				className="rounded-xl p-4"
				style={{
					background:
						"color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))",
				}}
			>
				<p className="text-sm" style={{ color: "var(--color-text)" }}>
					{description}
				</p>
			</div>
		</div>
	);
}
