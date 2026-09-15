# Which engine speaks which language, and why

Four text-to-speech engines were evaluated for this course. Everything below
was measured on this machine, against the gate the shipped clips already pass —
`faster-whisper large-v3`, Thai characters only, 0.9 similarity. Nothing here is
quoted from a vendor's documentation without being checked, because on two
occasions the documentation and the measurement disagreed.

Read this before proposing a fifth engine, or before re-running an experiment
listed under **Dead ends**.

## The decision

| | engine | why |
|---|---|---|
| **Thai** | ElevenLabs `eleven_v3`, voice `brM9iIbwDREZaWL8luun` (Anna) | the only one that clears the tone gate |
| **English** | open — local, cheap to iterate | judged on sound alone |

The two voices do **not** need to be the same person. That constraint was
self-imposed early on, to avoid an audible seam when narration crosses from
English into a Thai word, and it drove a long detour through voice cloning. It
was dropped deliberately: a 420ms gap before a Thai word reads as a teacher
pausing, not as a fault, and insisting on one speaker made the Thai worse.

Thai is also **tiny** — about 26 characters per lesson, because Thai clips are
single words and letter names, content-addressed and shared across every slide
and lesson that use them. The entire course's Thai is a rounding error. There
was never much to save by moving it, and correctness is not for sale at that
price.

## Thai tone accuracy, measured

Six clips lesson 1 needs, each given the pipeline's eight-seed budget.

| clip | ElevenLabs | S2 Pro (Thai reference) |
|---|---|---|
| `มอ ม้า` | cleared, 8 seeds | **never cleared in 8** |
| `นอ หนู` | 1 seed | 2 seeds |
| `สระอา` | 2 seeds | 1 seed |
| `นานา` | 1 seed | 1 seed |
| `มา` | 1 seed | 3 seeds |
| `นาน` | 1 seed | 1 seed |
| | **6 / 6** | **5 / 6** |

S2 Pro is closer than a first, badly-posed test suggested — see **Dead ends** —
but `มอ ม้า` never passed. Across eight seeds it produced `หมอ มา`, `มอม่า` and
`ม. ม.`; note that `หมอ **มา**` drops the tone on the second syllable outright.
A wrong tone is a wrong word, and SRS will then drill it.

## Markup support, measured

The same line was sent to each engine and the clip transcribed back:
`[whispers] Listen carefully. [pause] Now say it aloud.`

| engine | result |
|---|---|
| ElevenLabs `eleven_v3` | heard *"Listen carefully. Now say it aloud."* — **markup** |
| Fish Audio S2 Pro | heard *"Listen carefully. Now say it aloud."* — **markup** |
| Qwen3-TTS | heard *"Pause, welcome. Pause one second before…"* — **spoken aloud** |
| Breeze TTS 2 | documented `(sigh)` / `(clears throat)`; **not installed, not measured** |

This is why `Vendor.supports_markup` exists and why `strip_markup` is applied
before handing text to an engine that lacks it. An optimistic default there
ends with a narrator saying the word "pause" to a learner.

### Where markup is appropriate — and where it is not

**Not on Thai.** Tested on `มอ ม้า`, the hardest clip in lesson 1, with the
full eight-seed budget:

| text | cleared at |
|---|---|
| `มอ ม้า` | seed 1 |
| `[slowly] มอ ม้า` | seed 2 |
| `[clearly] มอ ม้า` | seed 6 |
| `[slowly and clearly] มอ ม้า` | never in 8 |
| `[teacher pronouncing a letter name] มอ ม้า` | seed 3 |

Markup made it monotonically worse the longer the tag got, which is the
opposite of the intent. A Thai clip here is a single word or a letter name —
six characters — so a tag is a large fraction of the input and appears to
dominate the conditioning rather than colour it. Thai clips stay bare.

**On English narration prose, yes** — that is where a pause between sentences
is worth buying, and where a tag is a small fraction of a fifty-word clip. It
is not in use today only because the English engine is Qwen, which cannot read
it. The plumbing is in place for the engine that replaces it.

## Pace and prosody, measured

Findings that cost real time and should not be rediscovered:

- **Qwen's clone discards tempo.** A 129 wpm reference cloned to 182; a 114 wpm
  reference cloned to 159; a 107 wpm *designed* reference cloned to 169 —
  faster than its own source every time.
- **Reference length matters more than it looks.** The same voice at 40 seconds
  cloned to 182 wpm and at 11 seconds to 159. Short, as the README says.
- **VoiceDesign is not a fixed speaker.** Five calls with one instruct spanned
  209–276 Hz median pitch and 172–245 wpm. Cloning its output narrows that only
  slightly. It cannot narrate a course directly.
- **Long clips accelerate.** Uncapped merging produced 80- and 90-second
  utterances; 14 of 16 ended faster than they began, by 30 wpm on average. The
  two that held pace were the two short ones. Hence `MAX_MERGED_WORDS`.
- **Calm is not the absence of energy.** Driving ElevenLabs to `stability: 1.0`
  plus `speed: 0.7` plus a further `atempo` stretch produced something correctly
  described as apathetic. Stability is the expressiveness dial; turning it to
  the top removes the shape that makes slow speech sound deliberate rather than
  flat.

## Dead ends

Each of these was tried and did not work. Do not re-run them without a reason
that is not in this file.

- **Instruct on a Qwen clone.** `generate_voice_clone` takes no `instruct`.
- **VoiceDesign, then clone, to reach an instruction.** The documented route,
  and the persona does transfer — but tempo does not, and the speaker drifts.
- **Pause annotations on Qwen.** Read aloud as words.
- **Trimming silence at clip edges.** Measured before and after; removed
  nothing. The residue is quiet breath above the threshold, not silence.
- **Cloning a Thai voice from an English reference.** Cross-lingual transfer is
  the hardest case and the first S2 Pro gate did exactly this, scoring 2/6 and
  producing `สวัสดีครับ` where `สระอา` was asked for. With a Thai reference the
  same model scored 5/6. The failure was the test, not the model.

## Licensing, which is a real constraint

| engine | weights |
|---|---|
| ElevenLabs | a hosted service; output usable, personal use established |
| Qwen3-TTS | Apache 2.0 |
| Fish Audio S2 Pro | **Research and Non-Commercial** — commercial needs a Fish Audio licence |
| Breeze TTS 2 | **Research and Non-Commercial** — commercial needs RESONIA, INC |

The two strongest open models are both non-commercial. That is fine on this
project's footing — personal use, for one family — but it is a ceiling, not a
detail: the day this became a product, both would need relicensing and
ElevenLabs would not.

## Hardware

S2 Pro wants ≥24 GB VRAM against a 25.3 GB card. It fits, but a full deck build
also loads PixArt, CLIP and Whisper, so models must be loaded and released in
sequence rather than held together.

One more thing worth knowing: **`/tmp` on this machine is tmpfs**, i.e. RAM.
Downloading weights there exhausted memory and killed the dev server. `HF_HOME`
already points at disk; leave downloads to the cache rather than forcing a
`local_dir`.
