"""Merge authored mnemonics from `mnemonics.json` into `vocabulary.json`.

Only the `mnemonic` field crosses over: it is the one part the app renders
(`WordCard.tsx`). Scenes, headlines and anchors stay build-side, because
`vocabulary.json` ships to every browser and is already 5454 entries.

Joins on `rank`, which is unique across the 4147 ranked entries. `thai` is
NOT unique — 139 spellings repeat, several within the top 300 — so joining on
the word would silently write a mnemonic onto the wrong sense.

    python scripts/mnemonics/apply_mnemonics.py            # report only
    python scripts/mnemonics/apply_mnemonics.py --write
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MNEMONICS = REPO_ROOT / "scripts" / "mnemonics" / "mnemonics.json"
VOCABULARY = REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--write",
        action="store_true",
        help="apply the changes; without it, only report what would change",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="also replace mnemonics that vocabulary.json already has",
    )
    args = parser.parse_args()

    authored = json.loads(MNEMONICS.read_text(encoding="utf-8"))["entries"]
    vocabulary = json.loads(VOCABULARY.read_text(encoding="utf-8"))

    by_rank = {e["rank"]: e for e in vocabulary if e.get("rank") is not None}

    written, skipped, missing, mismatched = 0, [], [], []
    for item in authored:
        rank = item["rank"]
        target = by_rank.get(rank)
        if target is None:
            missing.append(rank)
            continue
        # The authored file carries `thai` purely so a rank drifting under us
        # is caught here rather than shipping a mnemonic for another word.
        if target["thai"] != item["thai"]:
            mismatched.append((rank, item["thai"], target["thai"]))
            continue
        existing = target.get("mnemonic")
        if isinstance(existing, str) and existing.strip() and not args.overwrite:
            skipped.append(rank)
            continue
        target["mnemonic"] = item["mnemonic"]
        written += 1

    print(f"authored entries : {len(authored)}")
    print(f"would write      : {written}")
    if skipped:
        print(f"already present  : {len(skipped)} (pass --overwrite to replace) {skipped}")
    if missing:
        print(f"RANK NOT FOUND   : {missing}")
    if mismatched:
        print("RANK/WORD MISMATCH — authored file is stale, refusing these:")
        for rank, want, got in mismatched:
            print(f"  rank {rank}: authored {want!r}, vocabulary has {got!r}")

    if mismatched or missing:
        return 1

    if args.write:
        VOCABULARY.write_text(
            json.dumps(vocabulary, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"\nwrote {VOCABULARY.relative_to(REPO_ROOT)}")
    else:
        print("\n(dry run — pass --write to apply)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
