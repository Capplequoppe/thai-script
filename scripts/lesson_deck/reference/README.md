# The English narration voice

`english-voice.mp3` is the reference the English narration is cloned from, and
`english-voice.txt` is exactly what it says. Both are build inputs. Neither is
served to a learner.

## Why there is a reference at all

Thai comes from a metered native voice because tone is the product and an
approximation teaches a mispronunciation. English is 97% of the course by
character count and has no business on a per-character vendor, so it is cloned
locally — and a clone needs a fixed reference, or every clip is a different
person.

**The two voices are deliberately different people.** They used to be the same
one: the English was cloned from the Thai voice, to avoid a seam where
narration crosses into a Thai word. That constraint was dropped once it was
measured — a 420 ms gap before a Thai word reads as a teacher pausing rather
than as a fault, and insisting on one speaker made the Thai worse. See
`ENGINES.md`.

## Provenance

Generated once by `scripts/make-english-reference.py`: ElevenLabs `eleven_v3`,
voice `QocxxnxEa0x8mrL2d4VT` (Zara — warm, natural, expressive), reading the
text in `english-voice.txt` at stability 1.0 and speed 0.7. About 113 metered
characters and ten seconds. Everything downstream of it is local and free.

### Why this voice

The reference was Anna, the Thai voice, until her English was listened to
properly. ElevenLabs labels her accent `singaporean` — "Thailand Female"
describes the language she can speak, not the accent she carries into English —
and in English she reads as British, which sits oddly on a Thai course.

Picking a replacement turned up two things worth recording:

- **A voice's name is not evidence about its accent.** A candidate called
  "Friendly & Professional Thai Teacher" read as West African.
- **Reference noise clones into every clip, permanently.** Shared-library
  voices are user uploads, and one sounded like a bedroom recording. This is
  measurable rather than a matter of taste: compare the 5th-percentile frame
  RMS against the 90th, in dB. Above 40 is clean, below 25 audibly hisses. The
  rejected candidate measured 28, and the only Burmese voice in the library 27.

No Lao or Khmer voices exist in the shared library, which is a shame — Lao is
Tai-Kadai like Thai, tonal, and largely mutually intelligible with Isan, so it
would have been the closest possible match. Vietnamese is the nearest clean
accent actually on offer: a different family, but a tonal one, and it reads as
Southeast Asian rather than European. Zara measured 43 dB and, at 111-130 wpm,
was also the slowest of the shortlist.

`vendor.DIALOGUE_ENGLISH_REFERENCE_VOICE_ID` holds a second voice — Trung Caha,
71 dB, the cleanest measured — chosen at the same time and against the same
text, for the two-speaker dialogues that listening exercises will want. Nothing
reads it yet.

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
