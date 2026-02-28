import type {
	ConsonantSummary,
	ToneMarkSummary,
	VowelSummary,
} from "../../domain/script/services/ScriptLessonService";
import { ClassBadge } from "./atoms/ClassBadge";
import { ThaiCharDisplay } from "./atoms/ThaiCharDisplay";
import { MnemonicBlock } from "./molecules/MnemonicBlock";
import { SymbolInfoRow } from "./molecules/SymbolInfoRow";

export function ConsonantCard({
	c,
	compact,
}: {
	c: ConsonantSummary;
	compact?: boolean;
}) {
	return (
		<div className="space-y-3">
			<div className="text-center">
				<ThaiCharDisplay
					character={c.character}
					className="text-[96px]"
					audioUrl={c.audioUrl}
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
					<ClassBadge classType={c.classType} />
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
				<SymbolInfoRow label="Mid class →" value={t.midClassTone} />
				{t.highClassTone && (
					<SymbolInfoRow label="High class →" value={t.highClassTone} />
				)}
				{t.lowClassTone && (
					<SymbolInfoRow label="Low class →" value={t.lowClassTone} />
				)}
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
