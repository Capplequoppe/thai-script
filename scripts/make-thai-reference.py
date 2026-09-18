"""Buy one good Thai reference clip, so every later Thai clip is free.

The local engine can clone a voice but has no Thai of its own worth using; the
metered voice has Thai and charges per character. One call buys the bridge: a
single long passage in the native voice, kept as the reference that every local
Thai clip is then cloned from.

Run it only to *replace* the reference. `reference/thai-voice.mp3` is committed
and nothing needs this script to build a lesson — see `reference/README.md`
for what replacing it does and does not regenerate.

**The passage is not written, it is chosen.** Every sentence is lifted whole
from the shipped `sentences.json`, because a reference whose text disagrees
with its audio degrades every clone made from it, and composing Thai by hand is
exactly how that happens. Female register only (`ค่ะ` / `คะ`): the Thai voice
is Anna, and a reference that changes speaker mid-passage is worse than a short
one.

**`งาน ง่าย งาม งดงาม งู` is appended on purpose.** No female sentence in the
corpus starts a word with ง, and ง as an initial is both what lesson 2 exists
to teach and what both engines kept getting wrong — a one-second reference of
`นานา` turned it into ม.

**Verified before it is kept.** This passage is the one artefact in the chain
that nothing downstream can correct: a clip cloned from a bad reference
inherits the fault, and the gate would then be checking clones of a fault
against itself. So it is transcribed back and checked exactly as a shipped clip
would be, and refused below 0.85.

    uv run --project scripts/deck-env python scripts/make-thai-reference.py
"""

from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lesson_deck.vendor import (  # noqa: E402
    DEFAULT_VOICE_ID,
    ElevenLabsVendor,
    LocalTranscriber,
    MissingCredential,
    Redactor,
    VoiceSpec,
    load_api_key,
    normalise_thai,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
REFERENCE_DIR = REPO_ROOT / "scripts" / "lesson_deck" / "reference"
SENTENCES = REPO_ROOT / "src" / "domain" / "sentence" / "data" / "sentences.json"

#: Sentences to take. Nine covered 48 distinct Thai characters, which was the
#: point at which another sentence added almost nothing.
WANTED_SENTENCES = 9

#: ง leading a word, which the corpus's female register does not supply.
NG_TAIL = "งาน ง่าย งาม งดงาม งู"

#: Below this the reference is refused. A clone cannot be better than what it
#: was cloned from, and this is the only check that stands between a bad
#: passage and every Thai clip made afterwards.
KEEP_ABOVE = 0.85

THAI_WORD_START = re.compile(r"(?:^|\s)([฀-๿])")


def thai_chars(text: str) -> set[str]:
    return {c for c in text if "฀" <= c <= "๿"}


def starts_a_word_with_ng(thai: str) -> bool:
    return "ง" in THAI_WORD_START.findall(thai)


def choose_passage() -> tuple[str, list[dict], int]:
    """Greedily take the sentences that add the most unseen Thai characters."""
    sentences = json.loads(SENTENCES.read_text(encoding="utf-8"))
    # ค่ะ / คะ mark the female register; ครับ is the male one.
    female = [s for s in sentences if "ค่ะ" in s["thai"] or "คะ" in s["thai"]]

    chosen: list[dict] = []
    seen: set[str] = set()
    while len(chosen) < WANTED_SENTENCES:
        best, best_gain = None, 0
        for candidate in female:
            if candidate in chosen:
                continue
            gain = len(thai_chars(candidate["thai"]) - seen)
            if gain > best_gain:
                best, best_gain = candidate, gain
        if best is None:
            break
        chosen.append(best)
        seen |= thai_chars(best["thai"])

    passage = " ".join(s["thai"] for s in chosen)
    if not any(starts_a_word_with_ng(s["thai"]) for s in chosen):
        passage = f"{passage} {NG_TAIL}"
        seen |= thai_chars(NG_TAIL)
    return passage, chosen, len(seen)


def load_dotenv() -> None:
    if os.environ.get("ELEVENLABS_API_KEY"):
        return
    for directory in [Path.cwd(), *Path.cwd().parents]:
        candidate = directory / ".env"
        if not candidate.is_file():
            continue
        for line in candidate.read_text(encoding="utf-8").splitlines():
            matched = re.match(r"^ELEVENLABS_API_KEY=(.*)$", line.strip())
            if matched:
                os.environ["ELEVENLABS_API_KEY"] = (
                    matched.group(1).strip().strip("'\"")
                )
                return
        return


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="choose and print the passage without spending a call on it",
    )
    parser.add_argument("--voice-id", default=DEFAULT_VOICE_ID)
    args = parser.parse_args(argv)

    passage, chosen, covered = choose_passage()
    print(f"{len(chosen)} sentences, {len(passage)} characters")
    print(f"distinct Thai characters covered: {covered}\n")
    for sentence in chosen:
        print(f"  {sentence['thai']}   | {sentence['english'][:44]}")
    print(f"\n{passage}\n")
    if args.dry_run:
        return 0

    load_dotenv()
    try:
        key = load_api_key()
    except MissingCredential as error:
        print(f"error: {error}", file=sys.stderr)
        return 2

    vendor = ElevenLabsVendor(key, Redactor((key,)))
    print(f"one metered call, {len(passage)} characters of Thai")
    audio = vendor.synthesize(passage, "th", VoiceSpec(voice_id=args.voice_id), 42)
    print(f"got {len(audio) / 1024:.0f} KB")

    heard = LocalTranscriber().transcribe(audio)
    ratio = difflib.SequenceMatcher(
        None, normalise_thai(passage), normalise_thai(heard)
    ).ratio()
    print(f"\ntranscribed back at {ratio:.2f}")
    print(f"heard: {heard[:220]}")

    if ratio < KEEP_ABOVE:
        print(
            f"\nerror: refusing to keep a reference that transcribes at "
            f"{ratio:.2f} — every clone would inherit whatever is wrong with "
            "it. Nothing was written.",
            file=sys.stderr,
        )
        return 3

    REFERENCE_DIR.mkdir(parents=True, exist_ok=True)
    (REFERENCE_DIR / "thai-voice.mp3").write_bytes(audio)
    (REFERENCE_DIR / "thai-voice.txt").write_text(passage, encoding="utf-8")
    print(f"\nkept as {REFERENCE_DIR}/thai-voice.mp3 and .txt")
    print(
        "Note: replacing the reference does not regenerate existing Thai — "
        "the Thai cache key does not hash it. See reference/README.md."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
