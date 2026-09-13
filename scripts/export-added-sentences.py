"""
Export the sentences added by the survival-vocabulary sentence-writing
project (see docs/sentence-batches/) to a JSON manifest and a readable
Markdown doc, grouped by batch.

Run from repo root: python3 scripts/export-added-sentences.py

To record a new batch, add an entry to BATCHES below (name, description,
and the exact list of sentence ids added in that batch) and re-run.
"""

import json
from pathlib import Path

SENT_PATH = Path("src/domain/sentence/data/sentences.json")
OUT_DIR = Path("docs/sentence-batches")
OUT_JSON = OUT_DIR / "added-sentences.json"
OUT_MD = OUT_DIR / "added-sentences.md"

# Each batch: name, one-line description, and the sentence ids it added,
# in authoring order. New batches are appended here as they're written.
BATCHES = [
    {
        "name": "batch-1-self-intro-greetings",
        "description": "Self-introduction (name/country/age/occupation/marital status/"
        "language) and new greetings & farewells (thank you, nice to meet you, "
        "how are you, welcome, you're welcome, it's okay).",
        "ids": (
            [f"intro-{i:03d}" for i in range(1, 24)]
            + [f"greet-{i:03d}" for i in (16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30)]
        ),
    },
    {
        "name": "batch-2-numbers-money-bargaining",
        "description": "Numbers 1-10/20/100 drilled through price amounts (X baht), plus "
        "money & bargaining phrases (too expensive, discount, negotiate, receipt, cash, "
        "the bill please).",
        "ids": (
            [f"number-{i:03d}" for i in range(1, 16)]
            + [f"money-{i:03d}" for i in range(16, 31)]
        ),
    },
    {
        "name": "batch-3-food-ordering-directions",
        "description": "Ordering food (menu, dishes, spice/sweet/sour level, "
        "hungry/delicious) and asking directions (where is X, turn left/right, "
        "straight ahead, near/far, in front/behind).",
        "ids": (
            [f"order-{i:03d}" for i in range(1, 20)]
            + [f"direction-{i:03d}" for i in range(1, 17)]
        ),
    },
    {
        "name": "batch-4-transport-time-dates",
        "description": "Transport (taxi/bus/train/motorcycle, tickets, airport, driving) "
        "and time & dates (days of the week, today/tomorrow/yesterday, morning/evening/"
        "night, now, appointments, durations).",
        "ids": (
            [f"transport-{i:03d}" for i in range(1, 17)]
            + [f"time-{i:03d}" for i in range(1, 21)]
        ),
    },
    {
        "name": "batch-5-accommodation-emergencies-health",
        "description": "Accommodation (booking a room, keys, towels, cleanliness, air "
        "conditioning, rent) and emergencies & health (help, sickness, pain, fever, "
        "doctor/hospital/pharmacy, calling police, accidents).",
        "ids": (
            [f"stay-{i:03d}" for i in range(1, 15)]
            + [f"health-{i:03d}" for i in range(1, 19)]
        ),
    },
    {
        "name": "batch-6-family-small-talk-weather",
        "description": "Family & small talk (family size, introducing husband/wife/"
        "siblings/friends, where relatives live/work) and weather (hot/cold/cool, "
        "rain, wind, general weather chat).",
        "ids": (
            [f"relatives-{i:03d}" for i in range(1, 15)]
            + [f"weather-{i:03d}" for i in range(1, 13)]
        ),
    },
    {
        "name": "batch-7-general-connectors",
        "description": "General-purpose sentences drilling common grammar/connector "
        "words (conjunctions, prepositions, particles) among the top 500 that don't "
        "belong to any single survival topic — give, with, in, if, because, which, "
        "therefore, and similar.",
        "ids": [f"general-{i:03d}" for i in range(1, 40)],
    },
    {
        "name": "batch-8-general-everyday-vocab",
        "description": "More general-purpose sentences covering common top-500 "
        "content/grammar words not yet touched — quantifiers (many/each/little), "
        "size/place/time words, and everyday verbs (start, change, understand, try, "
        "build, receive, miss someone, and similar).",
        "ids": [f"general-{i:03d}" for i in range(40, 100)],
    },
    {
        "name": "batch-9-closing-the-easy-remainder",
        "description": "Closes out most of the remaining easy top-500 words (ranks "
        "~8-360): ordinary nouns/verbs (floor, watch, choose, trust, system, society) "
        "plus common discourse particles (เถอะ, ซิ, เหรอ, มั้ง and similar).",
        "ids": [f"general-{i:03d}" for i in range(100, 200)],
    },
    {
        "name": "reinforcement-1-second-sentences-for-top-priority-words",
        "description": "A second example sentence, in a different context, for the "
        "highest-priority (lowest-rank) top-500 words that only had one sentence — "
        "deepening reinforcement rather than chasing raw coverage.",
        "ids": [f"reinforce-{i:03d}" for i in range(1, 42)],
    },
    {
        "name": "reinforcement-2-more-second-sentences",
        "description": "More second-sentence reinforcement for single-sentence "
        "top-500 words (ranks ~122-233) — pick up/receive, start, before/after, "
        "change, career, read, come back, and similar — plus a few bonus new-word "
        "hits (รอบ, หน้า) picked up along the way.",
        "ids": [f"reinforce-{i:03d}" for i in range(42, 89)],
    },
    {
        "name": "reinforcement-3-closing-most-of-the-gap",
        "description": "A large reinforcement pass giving a second sentence to most "
        "remaining single-sentence top-500 words (ranks ~230-500) — reduced the words "
        "below the 2-appearance target from 228 to 105.",
        "ids": [f"reinforce-{i:03d}" for i in range(89, 219)],
    },
    {
        "name": "reinforcement-4-closing-the-gap",
        "description": "The final reinforcement pass: two sentences for every "
        "remaining zero-appearance top-500 word and one more for every remaining "
        "single-appearance word (ranks ~313-500 plus scattered ordinary nouns/verbs "
        "and discourse particles) — every top-500 word now has at least 2 sentences.",
        "ids": [f"reinforce-{i:03d}" for i in range(219, 379)],
    },
]


def main() -> None:
    with open(SENT_PATH, encoding="utf-8") as f:
        sentences = json.load(f)
    by_id = {e["id"]: e for e in sentences}

    manifest = []
    md_lines = []

    total = 0
    for batch in BATCHES:
        batch_sentences = []
        missing = []
        for sid in batch["ids"]:
            e = by_id.get(sid)
            if e is None:
                missing.append(sid)
                continue
            batch_sentences.append(e)
        if missing:
            raise SystemExit(f"{batch['name']}: ids not found in sentences.json: {missing}")

        manifest.append({
            "name": batch["name"],
            "description": batch["description"],
            "count": len(batch_sentences),
            "sentences": batch_sentences,
        })
        total += len(batch_sentences)

        md_lines.append(f"## {batch['name']} ({len(batch_sentences)} sentences)")
        md_lines.append("")
        md_lines.append(batch["description"])
        md_lines.append("")
        md_lines.append("| id | thai | romanization | english |")
        md_lines.append("|---|---|---|---|")
        for e in batch_sentences:
            md_lines.append(
                f"| {e['id']} | {e['thai']} | {e['romanization']} | {e['english']} |"
            )
        md_lines.append("")

    header = [
        "# Sentences added (survival-vocabulary sentence project)",
        "",
        "Generated by `scripts/export-added-sentences.py`. Each batch lists the "
        "sentences added in that authoring pass, in order.",
        "",
        f"**Total sentences added so far: {total}**",
        "",
    ]
    md_lines = header + md_lines

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump({"total": total, "batches": manifest}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines) + "\n")

    print(f"Wrote {OUT_JSON} and {OUT_MD} ({total} sentences across {len(BATCHES)} batch(es))")


if __name__ == "__main__":
    main()
