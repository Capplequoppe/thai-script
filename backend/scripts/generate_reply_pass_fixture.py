"""One-off: regenerate backend/tests/fixtures/reply-pass.wav.

The bank's real content changed under vocabulary.json's reranking (see
git history), so the 220-known-word learner e2e tests (AC2/AC3) now get
asked "คุณชอบอาหารไหนมากที่สุดครับ" (which food do you like most?)
instead of the "กำลังทำอะไรครับ" opener reply-pass.wav was recorded to
answer. Regenerates it as an on-topic reply to the *current* question,
through the same voice-cloning TTS pipeline the original fixture and the
opening-question audio both use (see task 1.4's own note on this
deviation from real recorded speech).

Run from the repo root: uv run --project backend python backend/scripts/generate_reply_pass_fixture.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models import load_tts
from app.pipeline import synthesize_question

REPLY_TEXT = "ผมชอบส้มตำมากที่สุดครับ"
OUTPUT_PATH = (
    Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "reply-pass.wav"
)


def main() -> None:
    print("Loading TTS pipeline (this loads real GPU weights)...")
    tts = load_tts()
    print(f"Synthesizing: {REPLY_TEXT!r}")
    audio_bytes, mime_type = synthesize_question(tts, REPLY_TEXT)
    assert mime_type == "audio/wav"
    OUTPUT_PATH.write_bytes(audio_bytes)
    print(f"Wrote {len(audio_bytes)} bytes to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
