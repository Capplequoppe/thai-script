# The narration voices

Two references, one per language. Each is an `.mp3` and a `.txt` saying exactly
what the audio says, and the pair is what a voice is cloned from — the text is
not optional, because a transcript that disagrees with its audio degrades every
clip made from it.

| | reference | clones |
|---|---|---|
| English | `english-voice.mp3` / `.txt` | all narration |
| Thai | `thai-voice.mp3` / `.txt` | Thai that does not already exist |

All four files are build inputs. None is served to a learner.

## Why there are references at all

Both languages are voiced on this machine, and a clone needs a fixed reference
or every clip is a different person.

English was the first to move: it is 97% of the course by character count and
none of it is the language being taught, so it had no business on a
per-character vendor.

Thai stayed metered for longer, and for a real reason — tone is the product,
and an approximation teaches a mispronunciation that SRS then drills. What
changed is not the standard but the evidence: the local engine, cloning from
`thai-voice.mp3`, clears the same transcribe-back gate the metered voice had to
clear. See `ENGINES.md` for what that took and where it still fails.

**The local engine renders Thai that does not exist yet, and only that.**
`VoiceSpec.for_language("th")` deliberately does not name an engine, so the
Thai already in the course — the orientation, lesson 1, the 42 consonant
recordings — stays cached rather than being regenerated and replaced by clones
of itself.

**The two voices are deliberately different people.** They used to be the same
one: the English was cloned from the Thai voice, to avoid a seam where
narration crosses into a Thai word. That constraint was dropped once it was
measured — a 420 ms gap before a Thai word reads as a teacher pausing rather
than as a fault, and insisting on one speaker made the Thai worse. See
`ENGINES.md`.

## Provenance

### The English reference

Generated once by `scripts/make-english-reference.py`: ElevenLabs `eleven_v3`,
voice `QocxxnxEa0x8mrL2d4VT` (Zara — warm, natural, expressive), reading the
text in `english-voice.txt` at stability 1.0 and speed 0.7. About 113 metered
characters and ten seconds. Everything downstream of it is local and free.

### The Thai reference

Generated once by `scripts/make-thai-reference.py`: one ElevenLabs call of 213 characters, in the same voice the
course's existing Thai is recorded in (`brM9iIbwDREZaWL8luun`, Anna). About
thirty seconds.

**Every sentence is lifted whole from `sentences.json`.** Writing a passage by
hand would risk the one defect a reference must not have — text that disagrees
with its audio — and the corpus is already correct and already shipped. Nine
sentences were chosen greedily for Thai-character coverage, restricted to the
female register (`ค่ะ` / `คะ`) because a reference that changes speaker
mid-passage is worse than a shorter one.

**`งาน ง่าย งาม งดงาม งู` is appended deliberately.** No female sentence in the
corpus begins a word with ง, and ง as an initial is both the sound lesson 2
exists to teach and the one both engines had been getting wrong.

**It was transcribed back at 0.97 before it was kept**, and the script that
makes it refuses to save anything below 0.85. This passage is the one artefact
in the chain that nothing downstream can correct: a clip cloned from a bad
reference inherits whatever is wrong with it, and the gate would then be
checking clones of a fault against itself.

### Long, where English is short

The English notes below say a short reference clones better, and that is true
and was measured. The Thai reference is three times longer on purpose, because
the two are being asked for different things.

A first attempt cloned Thai from a one-second clip of `นานา`. Two of six words
cleared the gate and ง as an initial came back as ม — not a verdict on the
engine but on a one-second reference. With the thirty-second passage, `งาน`
went from `มาน่า` to a clean 1.00.

Pace is what a long reference costs, and pace is what matters for narration
that runs for minutes. Thai here is single words and letter names, where
nothing runs long enough for pace to show and phoneme coverage decides
everything.

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

## Changing one

Replace a reference's two files together; the text must match the audio or the
clone degrades.

`VoiceSpec.for_language("en")` hashes the English pair into the English cache
key, so a new English reference regenerates every English clip in the course
and leaves the Thai alone.

**The Thai key deliberately does not hash its reference.** A Thai clip is keyed
by the voice and the words — not by the engine or the reference — so that the
native clips already in the course survive, and so that the local engine only
ever makes Thai that does not exist yet. The consequence is the thing to know
before changing `thai-voice.mp3`: replacing it does *not* regenerate anything.
It changes what future Thai sounds like, and leaves everything already rendered
as it was. If a clip must be remade, delete it and let the build notice.
