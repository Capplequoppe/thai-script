import type { VocabEntry } from "../../../domain/vocabulary/types";
import { MnemonicBlock } from "../molecules/MnemonicBlock";

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

function InlinePlayButton({ audioUrl }: { audioUrl: string }) {
	return (
		<button
			type="button"
			onClick={() => new Audio(audioUrl).play()}
			className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors shrink-0"
			style={{
				background: "var(--color-surface-2)",
				color: "var(--color-text-muted)",
			}}
			aria-label="Play audio"
		>
			<span className="text-xs">🔊</span>
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
	const hasDecomposition = word.syllables.some(
		(s) => s.initialConsonant || s.vowel || s.finalConsonant,
	);
	const visibleSamples = word.samples.filter((s) => s.thai);

	return (
		<div className="space-y-4">
			{/* 1. Hero — Image + Word + Audio */}
			<div className="text-center">
				{word.image_file && (
					<div className="flex justify-center mb-4">
						<img
							src={word.image_file}
							alt={word.english}
							className="rounded-xl object-contain max-h-64 w-full"
							style={{ background: "var(--color-surface-2)" }}
						/>
					</div>
				)}
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
				{word.description && (
					<p
						className="text-sm mt-3 text-center"
						style={{ color: "var(--color-text-muted)" }}
					>
						{word.description}
					</p>
				)}
			</div>

			{/* 2. Mnemonic */}
			{word.mnemonic && (
				<MnemonicBlock text={word.mnemonic} label="Memory tip" />
			)}

			{/* 3. Syllable Breakdown (enriched) */}
			{word.syllables.length > 0 && (
				<div
					className="rounded-xl p-4"
					style={{ background: "var(--color-surface-2)" }}
				>
					<p
						className="text-xs font-semibold mb-3"
						style={{ color: "var(--color-text-muted)" }}
					>
						Syllable Breakdown
					</p>
					<div className="space-y-3">
						{word.syllables.map((syl, i) => (
							<div
								key={`${syl.text}-${i}`}
								className="pb-3 last:pb-0 last:border-0"
								style={{ borderBottom: "1px solid var(--color-border)" }}
							>
								<div className="flex items-center justify-between mb-1">
									<span className="thai text-lg">{syl.text}</span>
									<div className="flex items-center gap-1.5 text-xs">
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
								{hasDecomposition && (
									<div
										className="flex items-center gap-2 text-xs mt-1"
										style={{ color: "var(--color-text-muted)" }}
									>
										{syl.initialConsonant && (
											<span>
												<span className="opacity-60">initial </span>
												<span
													className="thai text-sm font-semibold"
													style={{ color: "var(--color-text)" }}
												>
													{syl.initialConsonant}
												</span>
											</span>
										)}
										{syl.vowel && (
											<>
												<span className="opacity-40">→</span>
												<span>
													<span className="opacity-60">vowel </span>
													<span
														className="thai text-sm font-semibold"
														style={{ color: "var(--color-text)" }}
													>
														{syl.vowel}
													</span>
												</span>
											</>
										)}
										{syl.finalConsonant && (
											<>
												<span className="opacity-40">→</span>
												<span>
													<span className="opacity-60">final </span>
													<span
														className="thai text-sm font-semibold"
														style={{ color: "var(--color-text)" }}
													>
														{syl.finalConsonant}
													</span>
												</span>
											</>
										)}
										{syl.toneMark && (
											<>
												<span className="opacity-40">→</span>
												<span>
													<span className="opacity-60">mark </span>
													<span
														className="text-sm font-semibold"
														style={{ color: "var(--color-text)" }}
													>
														{syl.toneMark}
													</span>
												</span>
											</>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* 4. Example Sentences */}
			{visibleSamples.length > 0 && (
				<div
					className="rounded-xl p-4"
					style={{ background: "var(--color-surface-2)" }}
				>
					<p
						className="text-xs font-semibold mb-3"
						style={{ color: "var(--color-text-muted)" }}
					>
						Examples
					</p>
					<div className="space-y-3">
						{visibleSamples.map((sample) => (
							<div
								key={sample.thai}
								className="pb-3 last:pb-0 last:border-0"
								style={{ borderBottom: "1px solid var(--color-border)" }}
							>
								<div className="flex items-start gap-2">
									<p className="thai text-base leading-relaxed flex-1">
										{sample.thai}
									</p>
									{sample.thai_audio_file && (
										<InlinePlayButton audioUrl={sample.thai_audio_file} />
									)}
								</div>
								{sample.romanization && (
									<p
										className="text-xs mt-1 italic"
										style={{ color: "var(--color-text-muted)" }}
									>
										{sample.romanization}
									</p>
								)}
								{sample.english && (
									<p
										className="text-sm mt-1"
										style={{ color: "var(--color-text-muted)" }}
									>
										{sample.english}
									</p>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
