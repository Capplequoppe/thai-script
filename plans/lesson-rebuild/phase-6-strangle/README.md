---
doc_type: index
title: "Phase 6 — Strangle: export to video and decommission the legacy path"
description: Render decks to video for passive watching, then delete the licensed files and remove the video arm of the content seam.
covers:
  - public/videos
  - scripts/export-deck-video.py
  - src/domain/script/data
  - src/presentation/components/organisms
  - src/presentation/pages
  - src/domain/script/services/ScriptLessonService.ts
phase_id: "6"
depends_on: ["4", "5"]
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Phase 6 — Strangle

The fig closes. Decks are the source of truth and gain a video export; the 25
licensed `.webm` files are deleted; the video arm of `LessonContent` is removed.

Export exists because a deck is interactive and a video is not, and there are
moments — a first pass through a lesson, a passive review — where watching is
what the learner wants. The deck stays the editable master: a typo is fixed in
the deck and re-exported, never patched in a rendered file.

## What a person can do at the end

Watch any lesson as a video rendered from its own deck, and open an app that
contains no licensed material.

## The end-to-end criterion

Task 6.2 AC4: no lesson resolves to the video arm, the arm no longer exists in
the type, `public/videos/` contains no ThaiPod101 file, and a learner's
scheduled cards and unlocked vocabulary are unchanged across the removal.

## If the plan stopped here

It cannot stop earlier than its own last task and leave the licensed files
removed — that is the one thing this phase exists to do. Stopping before phase
6 leaves a working app whose lessons are all in-house but whose repository
still carries the old files; stopping mid-phase leaves the exporter built and
the files still present, which is safe.

## Tasks

| Task | Delivers | Depends on |
|---|---|---|
| 6.1 | Deck-to-video export | — |
| 6.2 | Decommission: files deleted, video arm removed | 6.1 |

## The exception this phase takes

Task 6.2 is a **removal**, which is horizontal by nature: one representation
stops existing and every consumer changes at once. Staging it per lesson would
leave the union's video arm alive for the sake of lessons that no longer use
it, which is the state being removed.

## What will bite

- **Deleting the `.webm` files is irreversible in the working tree.** They are
  in git history, and a task that deletes them must confirm every lesson serves
  a deck *first* — AC4's ordering is not cosmetic.
- **Removing the video arm makes the exhaustive switch from task 1.1 a
  single-arm union.** That is fine and it will look like dead code to a reader;
  keep the `never` default, because phase 6 is not the last change this app
  will see.
- **`CatchUpPage` is the second consumer**, as it has been since phase 1.
