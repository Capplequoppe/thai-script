# Audio tone check

Does each vocabulary recording actually sound like what the app teaches? The
learner takes tone and vowel length from the audio, not from the
romanization, so a clip that says the wrong thing teaches the wrong thing
whatever `vocabulary.json` claims.

```bash
scripts/.venv/bin/python scripts/audio-tone-check/check_tones.py \
    --report tone-report.json
```

Two checks, both plain statistics against a class the word already belongs
to — no classifier, no learned model, and every number it prints can be
checked by listening to the clip:

- **Pitch movement** per tone. Falling and rising travel 10-12 semitones
  across the corpus; mid and high travel 3. A falling clip that barely moves
  is worth a listen.
- **Voiced duration** per `live/dead × short/long` class. Vowel length is
  phonemic and decides the dead-syllable tone rule, so a long vowel recorded
  short teaches the wrong word. Dead-short runs ~180 ms, dead-long ~480 ms.

Clips flagged by *both* are the ones to listen to first.

## Cross-checking the app's pitch tracker

`extract-contours.mjs` runs the app's own `extractPitchContour` over every
clip and writes the contours as JSON. It exists to check that the app's
tracker — the one scoring the learner's pronunciation in
`useToneAttempt` — agrees with Praat. Last measured, it does: within about
one semitone on every tone.

```bash
node --experimental-strip-types scripts/audio-tone-check/extract-contours.mjs > contours.json
```

## A warning, from getting this wrong twice

The first two versions learned a mean contour per tone and flagged clips
closer to another tone's mean. Both were wrong, and both looked plausible:
unfiltered octave errors gave a "rising" mean opening two and a half octaves
above its own median, and the fix for that — rejecting frames far from the
clip's median — discarded exactly the excursion that defines a falling tone,
reporting falling as flatter than mid and very nearly blaming the
recordings.

If you extend this, prefer a measurement you can verify by ear on one clip
over a model fitted to all of them.
