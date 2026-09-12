"""CLI: regenerate backend/data/conversationStarters.json.

Run it once, review the output, ship it. A re-run merges into what is already
there rather than replacing it — ids are content-addressed, so an entry a human
has already read keeps its id and its place.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .bank import MIN_ENTRIES_PER_TIER, Candidate, build_bank, serialize_bank, tier_counts
from .generation import QwenChatModel, generate_tier
from .paths import BANK_JSON
from .tiers import build_tiers


def load_existing(path: Path) -> list[Candidate]:
    if not path.exists():
        return []
    return [
        Candidate(tier=entry["tier"], thai=entry["thai"], english=entry["english"])
        for entry in json.loads(path.read_text(encoding="utf-8"))
    ]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="generate-conversation-bank")
    parser.add_argument(
        "--output",
        type=Path,
        default=BANK_JSON,
        help="bank file to merge into and rewrite (default: %(default)s)",
    )
    parser.add_argument(
        "--min-entries",
        type=int,
        default=MIN_ENTRIES_PER_TIER,
        help="entries each tier must hold before it is skipped (default: %(default)s)",
    )
    parser.add_argument(
        "--tier",
        type=int,
        action="append",
        help="only regenerate this tier (repeatable); default is every tier",
    )
    args = parser.parse_args(argv)

    existing = load_existing(args.output)
    already = tier_counts(build_bank(existing))
    tiers = [
        tier for tier in build_tiers() if args.tier is None or tier.number in args.tier
    ]

    model = QwenChatModel()
    candidates = list(existing)
    # Tiers ascend, and each one is told what its predecessors already claimed:
    # a larger tier allows every word a smaller one does, so it re-proposes the
    # smaller tier's lines constantly and would otherwise finish short once
    # `build_bank` charged the duplicates back to the lower tier.
    claimed = {candidate.thai for candidate in existing}
    for tier in tiers:
        needed = args.min_entries - already.get(tier.number, 0)
        if needed <= 0:
            print(f"tier {tier.number}: already has {already[tier.number]}, skipping")
            continue
        print(f"tier {tier.number} ({tier.size} words): generating {needed} more...")
        fresh = generate_tier(model, tier, min_entries=needed, exclude=frozenset(claimed))
        print(f"tier {tier.number}: kept {len(fresh)}")
        candidates.extend(fresh)
        claimed.update(candidate.thai for candidate in fresh)

    entries = build_bank(candidates)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(serialize_bank(entries), encoding="utf-8")

    print(f"wrote {len(entries)} entries to {args.output}")
    print(f"per tier: {dict(sorted(tier_counts(entries).items()))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
