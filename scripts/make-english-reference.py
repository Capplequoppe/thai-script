#!/usr/bin/env python3
"""Make the reference clip the English narration voice is cloned from.

Usage:

    export ELEVENLABS_API_KEY=...          # see .env.example
    uv run --project scripts/deck-env python scripts/make-english-reference.py

One metered call, about 110 characters, run once for the life of the course.
Everything downstream of it — every English clip in every lesson — is cloned
locally and costs nothing.

**It refuses to overwrite.** The reference is a build input that hundreds of
committed clips were cloned from, and replacing it silently would invalidate
all of them while leaving them on disk looking current. Pass `--force` to mean
it, and expect the next lesson build to regenerate every English clip: the
reference is hashed into the English half of the cache key, which is exactly
what makes that regeneration happen rather than not happen.

Why a reference at all, and why this voice, is in
`scripts/lesson_deck/reference/README.md`.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lesson_deck.vendor import (  # noqa: E402
    API_ROOT,
    DEFAULT_ENGLISH_REFERENCE_AUDIO,
    DEFAULT_ENGLISH_REFERENCE_TEXT,
    DEFAULT_ENGLISH_REFERENCE_VOICE_ID,
    DEFAULT_MODEL_ID,
    REQUEST_TIMEOUT_SECONDS,
    MissingCredential,
    Redactor,
    VendorError,
    load_api_key,
)

EXIT_OK = 0
EXIT_NO_CREDENTIAL = 2
EXIT_REFUSED = 3

#: Short and slow, both deliberately, and both measured.
#:
#: Short because reference length changes the result badly: a forty-second
#: reference cloned to 182 words a minute where an eleven-second one cloned to
#: 159, from the same voice. The README asks for a short clip and it means it.
#:
#: Slow because the clone keeps some of a reference's pace even though it does
#: not keep all of it. Read at 114 wpm this clones to 159; the earlier
#: reference at 129 cloned to 182. The text is written to be said slowly —
#: short sentences, each its own thought — because the words do half the work
#: of slowing a reader down.
#:
#: Kept in step with reference/english-voice.txt, which is what the cloner is
#: told the audio says.
REFERENCE_TEXT = (
    "Let us begin slowly. Take a breath. "
    "Listen first, before you try to read anything at all. "
    "There is no hurry here."
)

#: stability at 1.0 for an even, unhurried read rather than an expressive one,
#: and speed at 0.7, which is the floor the API accepts.
REFERENCE_VOICE_SETTINGS = {
    "stability": 1.0,
    "similarity_boost": 0.75,
    "speed": 0.7,
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite an existing reference, regenerating every English clip",
    )
    args = parser.parse_args(argv)

    audio_path = DEFAULT_ENGLISH_REFERENCE_AUDIO
    text_path = DEFAULT_ENGLISH_REFERENCE_TEXT

    if audio_path.exists() and not args.force:
        print(
            f"error: {audio_path} already exists. Every committed English clip "
            "was cloned from it; replacing it regenerates all of them. Pass "
            "--force if that is what you want.",
            file=sys.stderr,
        )
        return EXIT_REFUSED

    try:
        api_key = load_api_key()
    except MissingCredential as error:
        print(f"error: {error}", file=sys.stderr)
        return EXIT_NO_CREDENTIAL

    redactor = Redactor((api_key,))
    import requests

    session = requests.Session()
    session.headers.update({"xi-api-key": api_key})
    try:
        response = session.post(
            f"{API_ROOT}/text-to-speech/{DEFAULT_ENGLISH_REFERENCE_VOICE_ID}",
            json={
                "text": REFERENCE_TEXT,
                "model_id": DEFAULT_MODEL_ID,
                # The one place this vendor is deliberately asked for English:
                # the point is to capture *this speaker* reading English, so
                # the local cloner can go on doing it for free.
                "language_code": "en",
                "voice_settings": dict(REFERENCE_VOICE_SETTINGS),
            },
            headers={"accept": "audio/mpeg"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as error:
        print(f"error: {redactor.redact(str(error))}", file=sys.stderr)
        return EXIT_REFUSED

    if response.status_code >= 400:
        print(
            "error: "
            + redactor.redact(
                f"{response.status_code} from the vendor: {response.text[:400]}"
            ),
            file=sys.stderr,
        )
        return EXIT_REFUSED

    audio_path.parent.mkdir(parents=True, exist_ok=True)
    audio_path.write_bytes(response.content)
    # Written together, always: the cloner is told what the audio says, and a
    # transcript that disagrees with it degrades the clone.
    text_path.write_text(REFERENCE_TEXT + "\n", encoding="utf-8")

    print(f"wrote {audio_path} ({len(response.content)} bytes)")
    print(f"wrote {text_path}")
    print(f"metered characters: {len(REFERENCE_TEXT)}")
    return EXIT_OK


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except VendorError as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(EXIT_REFUSED) from None
