"""
Rerank vocabulary.json so that "survival Thai" words — greetings, numbers,
self-introduction, directions, food ordering, money/bargaining, and other
words needed early by someone integrating into Thai society — are learned
sooner than pure corpus frequency would place them, without discarding the
underlying frequency order.

For every word tagged into a priority topic below, we compute a synthetic
"boosted rank" by dividing an effective baseline rank by the topic's tier
weight:

    boosted = min(existing_rank or TIER_CAP[tier], TIER_CAP[tier]) / weight

- A tagged word that is *already* frequent keeps roughly its existing
  position (frequency and topic priority interleave), scaled up modestly.
- A tagged word that is rare (or has no frequency rank at all, e.g. a
  vocabulary entry that was never assigned a rank) is pulled up to a
  ceiling appropriate for its tier, rather than jumping to rank #1.

Untagged words are left completely alone — the resequencing only changes
*relative* order among the union of {tagged words, previously-ranked words},
reassigned as new sequential integers 1..N. Words with no rank that are not
tagged stay unranked.

A small number of genuinely missing survival words are added as brand new
entries (see NEW_ENTRIES) before reranking, using the same
characters/syllables/toneRules conventions the app's tone-rule engine
already relies on (mirrored from analogous existing entries).
"""

import json
from pathlib import Path

VOCAB_PATH = (
    Path(__file__).resolve().parent.parent
    / "src"
    / "domain"
    / "vocabulary"
    / "data"
    / "vocabulary.json"
)

# ---------------------------------------------------------------------------
# Tier weights and rank ceilings
# ---------------------------------------------------------------------------
# weight: divides the effective baseline rank (bigger weight => bigger boost)
# cap: the effective baseline rank used for any tagged word whose existing
#      rank is null or larger than the cap — i.e. the "ceiling" a rare or
#      unranked priority word gets pulled up to before dividing by weight.
TIERS = {
    1: {"weight": 6.0, "cap": 1800},   # absolute essentials
    2: {"weight": 4.0, "cap": 2000},   # high-use survival words
    3: {"weight": 2.5, "cap": 1250},   # broader early-integration vocabulary
}

# ---------------------------------------------------------------------------
# Priority topics: topic name -> (tier, [thai strings])
# Every `thai` string must exact-match an existing VocabEntry.thai (or be
# listed in NEW_ENTRIES below).
# ---------------------------------------------------------------------------
TOPICS: dict[str, tuple[int, list[str]]] = {
    "greetings_farewells": (1, [
        "ลาก่อน", "ยินดีที่ได้รู้จัก", "ยินดีต้อนรับ", "ด้วยความยินดี",
        "คุณสบายดีไหม", "ฉันสบายดี", "ไม่เป็นไร",
    ]),
    "self_introduction": (1, [
        "ชื่อ", "อายุ", "ประเทศ", "อาชีพ", "นักเรียน", "ทำงาน",
        "แต่งงาน", "โสด", "ที่อยู่", "สัญชาติ", "ไทย",
        "อังกฤษ", "ญี่ปุ่น", "สเปน", "ฝรั่งเศส",
    ]),
    "numbers_counting": (1, [
        "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า",
        "สิบ", "ศูนย์", "ร้อย", "ยี่สิบ",
    ]),
    "time_dates": (2, [
        "วันนี้", "พรุ่งนี้", "เมื่อวาน", "เช้า", "ตอนเย็น", "กลางคืน",
        "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์",
        "วันเสาร์", "วันอาทิตย์", "นาฬิกา", "โมง", "ชั่วโมง", "นาที",
        "สัปดาห์", "เดือน",
    ]),
    "money_bargaining": (2, [
        "ต่อรอง", "แพง", "ลด", "ส่วนลด", "บาท", "เงินสด",
        "ใบเสร็จรับเงิน", "บิล", "เงิน", "ราคา",
    ]),
    "food_ordering": (2, [
        "สั่ง", "เมนู", "เผ็ด", "หวาน", "เปรี้ยว", "ไก่", "เนื้อ", "ปลา",
        "ผัก", "ไข่", "ผลไม้", "ก๋วยเตี๋ยว", "ข้าวเหนียว", "แก้ว", "จาน",
        "ถ้วย", "ทาน",
    ]),
    "directions_locations": (2, [
        "ซ้าย", "ขวา", "ตรง", "เลี้ยว", "เลี้ยวซ้าย", "เลี้ยวขวา", "ใกล้",
        "ไกล", "ที่ไหน",
    ]),
    "transport": (3, [
        "แท็กซี่", "รถเมล์", "รถไฟ", "มอเตอร์ไซค์", "สนามบิน", "ตั๋ว",
        "สถานี", "ขับรถ", "นั่ง",
    ]),
    "accommodation": (3, [
        "โรงแรม", "ห้องน้ำ", "จอง", "กุญแจ", "เตียง", "เช่า", "ผ้าขนหนู",
        "ชักโครก",
    ]),
    "emergencies_health": (3, [
        "ช่วยด้วย!", "ช่วย", "หมอ", "โรงพยาบาล", "ป่วย", "เจ็บ", "ไข้",
        "ยา", "ร้านขายยา", "ตำรวจ", "อุบัติเหตุ", "ฉุกเฉิน", "สถานีตำรวจ",
    ]),
    "family_small_talk": (3, [
        "ครอบครัว", "พี่ชาย", "น้องชาย", "น้องสาว", "สามี", "ภรรยา", "เพื่อน",
    ]),
    "weather": (3, [
        "อากาศ", "ฝน", "ลม", "หนาว", "สภาพอากาศ",
    ]),
}

# ---------------------------------------------------------------------------
# Genuinely missing survival vocabulary, added before reranking.
# characters/syllables/toneRules are hand-derived to match this app's tone
# rule engine, mirroring the closest existing analogous entries so the
# output is indistinguishable from what scripts/enrich-vocabulary.py would
# produce (e.g. "ร้อย" mirrors "ค่อย"; "ลาก่อน" mirrors "ลา" + "ก่อน").
# ---------------------------------------------------------------------------
NEW_ENTRIES = [
    {
        "thai": "ลาก่อน",
        "romanization": "laa gɔ̀ɔn",
        "word_class": "",
        "english": "goodbye",
        "rank": None,
        "frequency": 0,
        "mnemonic": None,
        "description": None,
        "characters": ["ล", "า", "ก", "่", "อ", "น"],
        "syllables": [
            {
                "text": "ลา", "initialConsonant": "ล", "vowel": "า",
                "finalConsonant": None, "toneMark": None,
                "consonantClass": "low", "syllableType": "live", "tone": "mid",
            },
            {
                "text": "ก่อน", "initialConsonant": "ก", "vowel": None,
                "finalConsonant": "น", "toneMark": "mayek",
                "consonantClass": "mid", "syllableType": "live", "tone": "low",
            },
        ],
        "toneRules": ["low-live", "mid-mayek"],
        "thai_audio_file": None,
        "english_audio_file": None,
        "image_file": None,
        "samples": [],
        "source": "survival-priority",
    },
    {
        "thai": "ร้อย",
        "romanization": "rɔ́ːj",
        "word_class": "n",
        "english": "hundred",
        "rank": None,
        "frequency": 0,
        "mnemonic": None,
        "description": None,
        "characters": ["ร", "้", "อ", "ย"],
        "syllables": [
            {
                "text": "ร้อย", "initialConsonant": "ร", "vowel": None,
                "finalConsonant": "ย", "toneMark": "maytho",
                "consonantClass": "low", "syllableType": "live", "tone": "high",
            },
        ],
        "toneRules": ["low-maytho"],
        "thai_audio_file": None,
        "english_audio_file": None,
        "image_file": None,
        "samples": [],
        "source": "survival-priority",
    },
    {
        "thai": "ไทย",
        "romanization": "thai",
        "word_class": "",
        "english": "Thai; Thailand",
        "rank": None,
        "frequency": 0,
        "mnemonic": None,
        "description": None,
        "characters": ["ไ", "ท", "ย"],
        "syllables": [
            {
                "text": "ไทย", "initialConsonant": "ท", "vowel": "ไ",
                "finalConsonant": "ย", "toneMark": None,
                "consonantClass": "low", "syllableType": "live", "tone": "mid",
            },
        ],
        "toneRules": ["low-live"],
        "thai_audio_file": None,
        "english_audio_file": None,
        "image_file": None,
        "samples": [],
        "source": "survival-priority",
    },
]


def build_tag_map() -> dict[str, int]:
    """thai string -> tier (highest-priority tier wins if tagged twice)."""
    tags: dict[str, int] = {}
    for tier, words in TOPICS.values():
        for w in words:
            if w in tags:
                tags[w] = min(tags[w], tier)  # lower tier number = higher priority
            else:
                tags[w] = tier
    return tags


def main() -> None:
    print(f"Reading vocabulary from {VOCAB_PATH}")
    with open(VOCAB_PATH, "r", encoding="utf-8") as f:
        vocabulary: list[dict] = json.load(f)

    by_thai = {}
    for e in vocabulary:
        by_thai.setdefault(e["thai"], []).append(e)

    tags = build_tag_map()

    # Validate every tagged word (other than NEW_ENTRIES) exists.
    new_thai = {e["thai"] for e in NEW_ENTRIES}
    missing = [w for w in tags if w not in by_thai and w not in new_thai]
    if missing:
        raise SystemExit(f"Tagged words not found in vocabulary.json: {missing}")

    # Add new entries (skip if a rerun already added them).
    added = []
    for entry in NEW_ENTRIES:
        if entry["thai"] in by_thai:
            print(f"  (already present, skipping add) {entry['thai']}")
            continue
        vocabulary.append(entry)
        by_thai.setdefault(entry["thai"], []).append(entry)
        added.append(entry["thai"])
    print(f"Added {len(added)} new entries: {added}")

    # Compute boosted score for every entry that will participate in
    # resequencing: tagged entries (regardless of current rank), plus every
    # other entry that already has a rank.
    scored: list[tuple[float, int, dict]] = []
    movements = []
    for idx, e in enumerate(vocabulary):
        tier = tags.get(e["thai"])
        if tier is not None:
            weight = TIERS[tier]["weight"]
            cap = TIERS[tier]["cap"]
            baseline = min(e["rank"], cap) if e["rank"] is not None else cap
            score = baseline / weight
            movements.append((e["thai"], e.get("english", ""), tier, e["rank"], score))
        elif e["rank"] is not None:
            score = float(e["rank"])
        else:
            continue
        scored.append((score, idx, e))

    scored.sort(key=lambda t: (t[0], t[1]))

    print(f"\nResequencing {len(scored)} entries (of {len(vocabulary)} total)...")
    for new_rank, (_, _, e) in enumerate(scored, start=1):
        e["rank"] = new_rank

    with open(VOCAB_PATH, "w", encoding="utf-8") as f:
        json.dump(vocabulary, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Wrote reranked vocabulary back to {VOCAB_PATH}")

    # Report movements for spot-checking.
    print("\nTagged-word outcomes (thai, english, tier, old_rank -> new_rank):")
    thai_to_new_rank = {e["thai"]: e["rank"] for _, _, e in scored}
    for thai, english, tier, old_rank, _ in sorted(
        movements, key=lambda m: thai_to_new_rank.get(m[0], 0)
    ):
        new_rank = thai_to_new_rank.get(thai)
        print(f"  [{tier}] {thai:12s} {english:30s} {old_rank} -> {new_rank}")


if __name__ == "__main__":
    main()
