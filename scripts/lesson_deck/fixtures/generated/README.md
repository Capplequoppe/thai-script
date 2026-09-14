# Committed pipeline output

`lesson-02/` here is the `clean.json` scenario's output, committed so that
`src/domain/script/data/generatedDeck.test.ts` can assert over a real deck:
that it validates against the schema, that every asset path it names resolves
inside its own lesson directory, that the manifest's recorded hashes match the
bytes on disk, and that nothing key-shaped is in either file.

The audio is from the scripted vendor in `lesson_deck/testing/`, not from
ElevenLabs — real MPEG-1 Layer III frames of silence, deterministic per line of
narration. Nothing here is served to a learner; the shipped lesson assets live
under `public/lessons/<lessonId>/`.

Regenerate with:

    ELEVENLABS_API_KEY=unused-by-the-scripted-vendor \
      python3 scripts/lesson_deck/testing/run_scripted.py \
        --scenario scripts/lesson_deck/fixtures/clean.json \
        --assets-root scripts/lesson_deck/fixtures/generated
