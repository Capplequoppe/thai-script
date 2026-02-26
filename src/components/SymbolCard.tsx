import type {
	ConsonantSummary,
	ToneMarkSummary,
	VowelSummary,
} from "../learning-service";

function Row({
	label,
	value,
	className,
}: {
	label: string;
	value: string;
	className?: string;
}) {
	return (
		<div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
			<span className="text-xs text-gray-500">{label}</span>
			<span className={`text-sm font-medium ${className ?? ""}`}>{value}</span>
		</div>
	);
}

function ClassBadge({ classType }: { classType: string }) {
	const colors: Record<string, string> = {
		low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
		mid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
		high: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
	};
	return (
		<span
			className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${colors[classType] ?? "bg-gray-100 text-gray-600"}`}
		>
			{classType} class
		</span>
	);
}

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
				<span className="thai text-[96px] leading-none">{c.character}</span>
				<h2 className="text-2xl font-semibold mt-2">{c.nameRomanized}</h2>
				<p className="thai text-lg text-gray-500 dark:text-gray-400">
					{c.name}
				</p>
				<p className="text-sm text-gray-400 italic">"{c.nameMeaning}"</p>
			</div>

			<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-0.5">
				<div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-800">
					<span className="text-xs text-gray-500">Class</span>
					<ClassBadge classType={c.classType} />
				</div>
				<Row label="Initial sound" value={c.initialSound} />
				<Row label="Final sound" value={c.finalSound} />
				<Row
					label="Ending type"
					value={c.hasDeadEnding ? "Dead" : "Live"}
					className={
						c.hasDeadEnding
							? "text-red-600 dark:text-red-400"
							: "text-green-600 dark:text-green-400"
					}
				/>
				{c.isAspirated && <Row label="Aspirated" value="Yes" />}
			</div>

			{!compact && c.mnemonic && (
				<div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
					<p className="text-sm text-amber-800 dark:text-amber-300">
						💡 {c.mnemonic}
					</p>
				</div>
			)}
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
				<span className="thai text-[96px] leading-none">{v.character}</span>
				<h2 className="text-2xl font-semibold mt-2">{v.name}</h2>
				<p className="text-sm text-gray-400">{v.sound}</p>
			</div>

			<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-0.5">
				<Row
					label="Length"
					value={v.length}
					className={
						v.length === "long"
							? "text-blue-600 dark:text-blue-400"
							: "text-orange-600 dark:text-orange-400"
					}
				/>
				<Row label="Position" value={v.position} />
			</div>

			{!compact && v.mnemonic && (
				<div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
					<p className="text-sm text-amber-800 dark:text-amber-300">
						💡 {v.mnemonic}
					</p>
				</div>
			)}
		</div>
	);
}

export function ToneMarkCard({ t }: { t: ToneMarkSummary }) {
	return (
		<div className="space-y-3">
			<div className="text-center">
				<span className="thai text-[96px] leading-none">{t.character}</span>
				<h2 className="text-2xl font-semibold mt-2">{t.name}</h2>
			</div>

			<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-0.5">
				<Row label="Mid class →" value={t.midClassTone} />
				{t.highClassTone && (
					<Row label="High class →" value={t.highClassTone} />
				)}
				{t.lowClassTone && <Row label="Low class →" value={t.lowClassTone} />}
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

			<div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
				<p className="text-sm text-indigo-800 dark:text-indigo-300">
					{description}
				</p>
			</div>
		</div>
	);
}
