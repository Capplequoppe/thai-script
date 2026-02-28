import type { VocabEntry } from "../../domain/vocabulary/types";

function PlayAudioButton({ audioUrl }: { audioUrl: string }) {
	return (
		<button
			type="button"
			onClick={() => new Audio(audioUrl).play()}
			className="ml-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors align-middle"
			aria-label="Play pronunciation"
		>
			🔊
		</button>
	);
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
				<p className="text-sm text-gray-400">{word.romanization}</p>
				{word.word_class && (
					<span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
						{word.word_class}
					</span>
				)}
			</div>

			{/* Syllable breakdown */}
			{word.syllables.length > 0 && (
				<div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
					<p className="text-xs text-gray-500 mb-2">Syllable breakdown</p>
					<div className="space-y-2">
						{word.syllables.map((syl, i) => (
							<div
								key={`${syl.text}-${i}`}
								className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
							>
								<span className="thai text-lg">{syl.text}</span>
								<div className="flex items-center gap-2 text-xs">
									{syl.consonantClass && (
										<span
											className={`px-2 py-0.5 rounded font-semibold capitalize ${
												syl.consonantClass === "mid"
													? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
													: syl.consonantClass === "high"
														? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
														: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
											}`}
										>
											{syl.consonantClass}
										</span>
									)}
									{syl.tone && (
										<span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-semibold">
											{syl.tone}
										</span>
									)}
									{syl.syllableType && (
										<span
											className={`px-2 py-0.5 rounded font-semibold ${
												syl.syllableType === "live"
													? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
													: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
											}`}
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
				<div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
					<p className="text-sm text-amber-800 dark:text-amber-300">
						💡 {word.mnemonic}
					</p>
				</div>
			)}
		</div>
	);
}
