---
doc_type: reference
title: "Task 6.1 — Export a deck to video"
description: Render any deck to a single video file from its own slides and audio, deterministically, with the deck remaining the editable master.
covers:
  - scripts/export-deck-video.py
  - src/domain/script/data/videoExport.test.ts
status: stable
task_id: "6.1"
task_status: pending
depends_on: []
size: medium
verify:
  - python3 -m py_compile scripts/export-deck-video.py
  - npm test -- src/domain/script/data/videoExport.test.ts
  - npx biome check scripts src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/videoExport.test.ts asserting the manifest names one output per deck slide sequence"
  - "AC2 -> a case in src/domain/script/data/videoExport.test.ts asserting the manifest's input hash matches the deck"
  - "AC3 -> none — requires ffmpeg and rendered output; the phase reviewer plays an exported file"
  - "AC4 -> a case in src/domain/script/data/videoExport.test.ts asserting every export path resolves under its lesson directory"
  - "AC5 -> three cases in src/domain/script/data/videoExport.test.ts, one per state"
weight_votes:
  - "author -> 8"
  - "structure-estimator -> 5"
  - "implementation-estimator -> 8"
  - "unknowns-estimator -> 3"
  - "calibration-estimator -> 5"
weight_voted: "sha256:559b11157336e723e0eb3230cb70bde347b4872cc8f85926a2d5cc6e9eac48e6"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 6.1 — Deck to video

A deck already holds everything a video needs: ordered slides, an image per
slide, and narration audio per segment. Export assembles them; it does not
author anything.

## Acceptance Criteria

- AC1: Any valid deck exports to one video file covering its slides in
  declared order, with each slide held for the duration of its own narration.
- AC2: The export manifest records a hash of the deck and assets it was
  rendered from. A deck edited after export is detectable as such, so a stale
  video is never mistaken for a current one.
- AC3: Export is deterministic given identical inputs: re-running against an
  unchanged deck produces a byte-identical file, so a re-export is a no-op rather
  than an unexplained diff.
- AC4: Every path the exporter reads or writes resolves inside that lesson's
  own directory, under the same charset constraint task 1.1 declared.
- AC5: A lesson is in exactly one of three export states: not exported,
  exported and current, exported and stale. Stale never reads as absent.

## Test cases

- A fixture deck's manifest names one output covering every slide in order.
- The manifest's deck hash matches the deck; editing the deck makes the export
  read stale rather than current.
- A crafted deck with a traversal segment in an asset path is refused.
- The three export states are three distinct values.
- Re-exporting an unchanged deck reports a no-op.

## Architectural Decision

**The deck stays the master and the video is derived.** The alternative —
authoring video directly — makes every copy edit a re-render of an opaque
artifact and puts the correction furthest from where the mistake is visible.
Deriving keeps the reviewable thing reviewable.

**Staleness is a recorded state, not a timestamp comparison.** Modification
times change for reasons unrelated to content — a checkout, a copy — and a
video re-rendered on every one of those is expensive. Hashing the inputs
answers the question that actually matters.
