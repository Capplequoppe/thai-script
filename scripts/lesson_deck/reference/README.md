# The English narration voice

`english-voice.mp3` is the reference the English narration is cloned from, and
`english-voice.txt` is exactly what it says. Both are build inputs. Neither is
served to a learner.

## Why there is a reference at all

The course is narrated by one person. Thai comes from a metered native voice
because tone is the product and an approximation teaches a mispronunciation;
English is 97% of the course by character count and has no business on a
per-character vendor. Two engines would ordinarily mean two voices, and a
lesson that changes speaker every time it says a Thai word sounds broken.

So the English is cloned from the Thai voice. One speaker throughout — and,
because she is a Thai native reading English, a Thai teacher's English rather
than a newsreader's.

## Provenance

Generated once by `scripts/make-english-reference.py`: ElevenLabs `eleven_v3`,
voice `brM9iIbwDREZaWL8luun` (Anna — Thailand Female), reading the text in
`english-voice.txt` at stability 1.0 and speed 0.7. About 110 metered
characters and twelve seconds. Everything downstream of it is local and free.

## Short and slow, both measured

Both properties were arrived at by measuring, and both matter more than they
look.

**Short.** A forty-second reference of this same voice cloned to 182 words a
minute; an eleven-second one cloned to 159. The README for Qwen3-TTS asks for a
short clip and it means it — a long reference makes the clone *faster*, not
more faithful.

**Slow.** The clone keeps some of a reference's pace, though not all of it. At
114 wpm this clones to 159; the previous reference at 129 cloned to 182. What
the clone will not do is inherit tempo outright, which is why
`vendor.ENGLISH_TEMPO` still exists: no reference produces a clone slow enough
on its own.

Things that were tried and did not work, so they are not tried again:

- **Instruct on the clone call.** `generate_voice_clone` does not take one.
- **VoiceDesign, then clone it.** This is the documented way to reach an
  instruction, and the persona does transfer — but a 107 wpm designed reference
  still cloned to 169. Tempo does not survive the hop.
- **Pause annotations in the text.** `[pause one second]` is read out loud as
  the words "pause one second"; transcribing the clip back confirms it.
- **Trimming silence at clip edges.** Removed nothing measurable.

## Changing it

Replace both files together; the text must match the audio or the clone
degrades. `VoiceSpec.for_language("en")` hashes both into the cache key, so a
new reference regenerates every English clip in the course and leaves the Thai
untouched.
