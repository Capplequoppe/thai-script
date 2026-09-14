---
doc_type: reference
title: "Task 1.3 — The deck generation pipeline"
description: Turn a lesson script into deck JSON plus committed ElevenLabs audio and illustration assets, cached by content hash, with a tone-accuracy check on Thai segments.
covers:
  - scripts/generate-lesson-deck.py
  - scripts/lesson_deck/
  - scripts/requirements.txt
  - src/domain/script/data/generatedDeck.test.ts
  - .env.example
status: stable
task_id: "1.3"
task_status: pending
depends_on: ["1.1a"]
size: large
verify:
  - python3 -m py_compile scripts/generate-lesson-deck.py
  - npm test -- src/domain/script/data/generatedDeck.test.ts
  - npx biome check scripts src/domain/script/data
ac_enforcement:
  - "AC1 -> a case in src/domain/script/data/generatedDeck.test.ts validating a committed fixture deck against the schema"
  - "AC2 -> a case in src/domain/script/data/generatedDeck.test.ts asserting the manifest's content hashes match the committed assets"
  - "AC3 -> a case in src/domain/script/data/generatedDeck.test.ts invoking the generator as a subprocess with no key set"
  - "AC4 -> a case in src/domain/script/data/generatedDeck.test.ts asserting every asset path in the fixture deck resolves under its lesson directory"
  - "AC5 -> a case in src/domain/script/data/generatedDeck.test.ts scanning committed deck JSON and the manifest for anything key-shaped"
  - "AC6 -> a case in src/domain/script/data/generatedDeck.test.ts driving the retry state machine against a mocked transcription client"
  - "AC7 -> a case in src/domain/script/data/generatedDeck.test.ts asserting the three manifest states are distinct values"
weight_votes:
  - "author -> 13"
  - "structure-estimator -> 8"
  - "implementation-estimator -> 13"
  - "unknowns-estimator -> 5"
  - "calibration-estimator -> 8"
weight_voted: "sha256:becb2b4c9ee8466eb66f47f7b1a890c749531f3ef4e2d4b6186152ed273e0e14"
generated: {by: claude-opus-5/agent, at: 2026-09-13}
profile_version: 1
---

# Task 1.3 — The deck generation pipeline

A lesson script in, a deck plus its committed assets out. Read
`scripts/generate-sentence-audio.py`'s docstring first: it records the
verification discipline this pipeline reuses and several levers that are not
levers.

Narration is English prose with Thai embedded. The script marks spans `en` or
`th`; **both go to ElevenLabs**, but Thai spans additionally pass a
transcribe-back check before their clip is accepted, because a wrong tone
teaches a mispronunciation and the tone lessons are the product.

## Acceptance Criteria

- AC1: Given a lesson script, the generator emits deck JSON that validates
  against the schema from task 1.1, with one slide per declared slide and an
  asset reference per generated clip and image.
- AC2: Audio and images are cached by a hash of their inputs (segment text,
  voice id, model, settings). Re-running against an unchanged script issues no
  API calls; changing one segment regenerates that segment's clip and leaves the
  rest byte-identical. The manifest records each asset's hash.
- AC3: With no API key in the environment, the generator exits non-zero
  naming the missing variable. It never emits a deck with silently absent audio,
  and never falls back to a partial run that reads as a success.
- AC4: Every asset path written or referenced resolves inside
  `public/lessons/<lessonId>/`. A lesson id outside the charset task 1.1
  declares, or a path escaping that directory, is refused before any write.
- AC5: The API key never reaches deck JSON, the manifest, a committed file,
  or the generator's own stdout — including inside an error message echoed from
  the API.
- AC6: A Thai segment's clip is transcribed back before acceptance; a
  mismatch is retried, and a clip still failing after retries is recorded as
  failed rather than shipped. The manifest carries each Thai clip's verification
  outcome.
- AC7: Every segment in the manifest is in exactly one of three states —
  never generated, generated, or generation failed — and the three are distinct
  values. A failed segment is never recorded as absent.

## Test cases

- A committed fixture deck validates against the schema.
- Every asset path in the fixture resolves under its own lesson directory; a
  crafted deck with `../` in an asset path is refused.
- A lesson id with an uppercase letter, a slash, or 65 characters is refused.
- The manifest's recorded hash for each asset matches the committed file.
- Scanning committed deck JSON and manifest finds nothing matching an API-key
  shape.
- The manifest's three segment states are three distinct values, and a failed
  segment is not serialised as a missing one.

## Architectural Decision

**Evidence lands in vitest, not a new Python test runner.** The repo has no
Python test framework, and adding one to gate content would put half this
plan's evidence in a runner nothing else uses. The generator's contract is its
*output*, so the output is what is asserted over, from the runner already in
use. `py_compile` gates the script's syntax; the rest is checked through the
artifacts.

*Rejected:* one multilingual voice rendering a whole line of mixed narration
in a single call. Simpler, and it puts Thai tone accuracy beyond any check —
CONTEXT.md records the full argument.

*Rejected:* generating audio at request time. Static committed mp3s remove a
runtime dependency and make audio reviewable in a diff.

*Rejected:* caching on the script file's hash rather than per segment. A typo
fix anywhere would re-bill and re-voice the whole lesson, and re-voicing is not
idempotent — the same text returns different audio on a later call.
