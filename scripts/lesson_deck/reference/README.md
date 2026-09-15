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
`english-voice.txt`. 433 metered characters, about forty seconds. Everything
downstream of it is local and free.

The text is deliberately phonetically broad and in the register the course
wants, because a clone copies delivery as well as timbre — a reference read
briskly makes every lesson brisk.

## Changing it

Replace both files together; the text must match the audio or the clone
degrades. `VoiceSpec.for_language("en")` hashes both into the cache key, so a
new reference regenerates every English clip in the course and leaves the Thai
untouched.
