"""The lesson-deck generation pipeline: a lesson script in, a deck plus its
committed assets out.

Split across modules along the trust boundaries the plan names:

* `ids`      — the closed lesson-id charset, and the one containment check
               every asset path passes before anything is written.
* `script_parser` — hand-authored Markdown in, a typed `LessonScript` out.
* `manifest` — the three segment states, and the record written for each asset.
* `vendor`   — the API credential, its redaction, and the two network calls.
* `pipeline` — caching, the transcribe-back retry machine, deck emission.

The generator's contract is its *output*, so the evidence for it lives in
`src/domain/script/data/generatedDeck.test.ts` rather than in a Python test
framework this repository does not otherwise have.
"""
