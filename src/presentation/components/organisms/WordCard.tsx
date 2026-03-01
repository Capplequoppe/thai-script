import type { VocabEntry } from "../../../domain/vocabulary/types";

function PlayAudioButton({ audioUrl }: { audioUrl: string }) {
	return (
		<button
			type="button"
			onClick={() => new Audio(audioUrl).play()}
			className="ml-3 inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors align-middle"
			style={{
				background: "var(--color-surface-2)",
				color: "var(--color-text-muted)",
			}}
			aria-label="Play pronunciation"
		>
			🔊
		</button>
	);
}

function consonantClassStyle(cls: string): React.CSSProperties {
	if (cls === "mid") {
		return {
			background:
				"color-mix(in srgb, var(--color-master) 12%, var(--color-surface))",
			color: "var(--color-master)",
		};
	}
	if (cls === "high") {
		return {
			background:
				"color-mix(in srgb, var(--color-enlightened) 12%, var(--color-surface))",
			color: "var(--color-enlightened)",
		};
	}
	// low
	return {
		background:
			"color-mix(in srgb, var(--color-enlightened) 12%, var(--color-surface))",
		color: "var(--color-enlightened)",
	};
}

function syllableTypeStyle(type: string): React.CSSProperties {
	if (type === "live") {
		return {
			background:
				"color-mix(in srgb, var(--color-master) 12%, var(--color-surface))",
			color: "var(--color-master)",
		};
	}
	return {
		background:
			"color-mix(in srgb, var(--color-danger) 12%, var(--color-surface))",
		color: "var(--color-danger)",
	};
}

export function WordCard({ word }: { word: VocabEntry }) {
	return (
		<div className="space-y-3">
			{/* Word display */}
			<div className="text-center">
				<span className="thai text-[72px] leading-none">{word.thai}</span>
				{word.thai_audio_file && (
					<PlayAudioButton audioUrl={word.thai_audio_file} />
				)}
				<p className="text-2xl font-semibold mt-2">{word.english}</p>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					{word.romanization}
				</p>
				{word.word_class && (
					<span
						className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold"
						style={{
							background: "var(--color-surface-2)",
							color: "var(--color-text-muted)",
						}}
					>
						{word.word_class}
					</span>
				)}
			</div>

			{/* Syllable breakdown */}
			{word.syllables.length > 0 && (
				<div
					className="rounded-xl p-4"
					style={{ background: "var(--color-surface-2)" }}
				>
					<p
						className="text-xs mb-2"
						style={{ color: "var(--color-text-muted)" }}
					>
						Syllable breakdown
					</p>
					<div className="space-y-2">
						{word.syllables.map((syl, i) => (
							<div
								key={`${syl.text}-${i}`}
								className="flex items-center justify-between py-1.5 last:border-0"
								style={{ borderBottom: "1px solid var(--color-border)" }}
							>
								<span className="thai text-lg">{syl.text}</span>
								<div className="flex items-center gap-2 text-xs">
									{syl.consonantClass && (
										<span
											className="px-2 py-0.5 rounded font-semibold capitalize"
											style={consonantClassStyle(syl.consonantClass)}
										>
											{syl.consonantClass}
										</span>
									)}
									{syl.tone && (
										<span
											className="px-2 py-0.5 rounded font-semibold"
											style={{
												background:
													"color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))",
												color: "var(--color-primary)",
											}}
										>
											{syl.tone}
										</span>
									)}
									{syl.syllableType && (
										<span
											className="px-2 py-0.5 rounded font-semibold"
											style={syllableTypeStyle(syl.syllableType)}
										>
											{syl.syllableType}
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Mnemonic */}
			{word.mnemonic && (
				<div
					className="rounded-xl p-3"
					style={{
						background:
							"color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
					}}
				>
					<p className="text-sm" style={{ color: "var(--color-accent)" }}>
						💡 {word.mnemonic}
					</p>
				</div>
			)}
		</div>
	);
}
