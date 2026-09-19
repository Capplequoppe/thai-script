"""Does S2 Pro speak an undocumented delivery tag out loud?

`ENGINES.md` records that S2 Pro honours markup and does not say the tags —
measured on `[pause]`, `[warm]` and `[calm]`. The orientation rewrite
introduced `[short pause]`, which is the same shape but is not one of the
three that were actually tested.

The risk is asymmetric and worth thirty seconds of GPU. Thai narration is
transcribed back before it is accepted, so a tag spoken aloud there would be
caught; **English is not gated at all**, so a bad tag ships silently and the
first thing a learner ever hears is a woman saying the words "short pause".

    uv run --project scripts/deck-env python scripts/tests/probe_delivery_markup.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lesson_deck.vendor import LocalTranscriber, S2ProVoice, VoiceSpec  # noqa: E402

#: The tag under test, one already proven, and a control with no tag at all.
CASES = [
    ("[short pause] Welcome to this course. My name is Pim.", "the new tag"),
    ("[pause] Welcome to this course. My name is Pim.", "the documented tag"),
    ("Welcome to this course. My name is Pim.", "no markup"),
]

SUSPECT = ("short", "pause", "bracket")


def main() -> int:
    engine = S2ProVoice(compile_model=False)
    transcriber = LocalTranscriber(device="cpu")
    spec = VoiceSpec()
    try:
        for text, label in CASES:
            audio = engine.synthesize(text, "en", spec, 7)
            heard = (transcriber.transcribe(audio) or "").strip()
            leaked = [w for w in SUSPECT if w in heard.lower()]
            verdict = f"LEAKED {leaked}" if leaked else "clean"
            print(f"\n--- {label}\n  sent  {text}\n  heard {heard}\n  {verdict}")
    finally:
        engine.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
