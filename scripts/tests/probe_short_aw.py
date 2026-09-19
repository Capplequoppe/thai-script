"""Which เ-าะ word can this pipeline actually voice?

`เกาะ` failed eight seeds twice, heard as `ก` or `ะ` — the trim cutting a
one-syllable word down to a single character. `ซิ` failed the same way. The
question is whether the fault is the length of the string, the number of
syllables, or that particular word, because lesson 11 has to voice this vowel
somehow and the corpus does not offer many candidates.

Prints what each candidate is heard as, inside the carrier, which is the same
reading the pipeline's gate uses.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lesson_deck.vendor import LocalThaiVoice, LocalTranscriber, S2ProVoice, VoiceSpec  # noqa: E402

CANDIDATES = ["เกาะ", "เจาะ", "เพราะ", "เกาะ เกาะ"]


def main() -> int:
	engine = S2ProVoice()
	voice = LocalThaiVoice(engine=engine, transcriber=LocalTranscriber(device="cpu"))
	spec = VoiceSpec()
	try:
		for text in CANDIDATES:
			for seed in (42, 1, 7):
				audio = voice.synthesize(text, "th", spec, seed)
				heard = voice.reading_of(audio) or "(no reading)"
				ok = "MATCH" if heard.strip() == text else ""
				print(f"{text:<12} seed {seed:<4} heard {heard!r:<24} {ok}")
	finally:
		engine.close()
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
