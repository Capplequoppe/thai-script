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
| **English** | Fish Audio S2 Pro, cloned from a fixed reference, with `[markup]` | chosen by ear, and it keeps its outputs |

### How the English row was actually decided, and the assumption that was wrong

It was very nearly decided on pace, and that would have been the wrong answer.

The reasoning ran: the narration sounded rushed, so measure wpm, and prefer the
engine whose pace responds to instruction. Breeze won that comparison
decisively — Voice Direction pulled the same passage from 160 wpm to 102 while
S2 Pro's markup only reached 158. On the measurement, Breeze.

Then the clips were listened to, and the two picked as best were the **158 wpm
and 160 wpm** ones. The 102 wpm clip was not chosen. So pace was never the
complaint: **phrasing** was. Qwen ran sentences together at much the same speed
with no breath between them, and "Welcome before you learn a Thai letter" is a
missing pause, not a fast one. Both engines here put a break at the sentence
boundary; that alone fixed it.

Keep this in mind before optimising another measurable proxy. wpm was easy to
count and it was not the variable. The fix was a `[pause]`.

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

## English narration, measured

Two real passages from the orientation deck — the welcome line a learner hears
first, and a short-sentence paragraph where pause handling shows plainly.
Cloned from the same 11.6s / **114 wpm** Anna reference, transcribed back with
`faster-whisper large-v3`, accuracy by `SequenceMatcher` on the normalised
text.

| clip | secs | wpm | accuracy |
|---|---|---|---|
| S2 Pro, welcome, bare | 12.5 | 167 | 1.00 |
| S2 Pro, welcome, `[warm]` `[pause]` | 13.3 | 158 | 1.00 |
| S2 Pro, route, bare | 10.6 | 186 | 1.00 |
| S2 Pro, route, `[calm]` `[pause]` | 11.8 | 167 | 1.00 |
| Breeze, welcome, clone | 13.1 | 160 | 1.00 |
| **Breeze, welcome, direction** | 20.6 | **102** | 1.00 |
| Breeze, route, clone | 14.1 | 141 | 1.00 |
| **Breeze, route, direction** | 24.7 | **80** | 1.00 |

Three things worth keeping:

- **Accuracy is not the discriminator.** Every clip scored 1.00 — nothing
  dropped a word, including Breeze at 80 wpm. Any of these engines can *say*
  the narration. Choosing between them is entirely about delivery.
- **Cloning accelerates, on every engine tried.** 114 wpm in; 141–186 wpm out,
  for Qwen, S2 Pro and Breeze's plain clone alike. Treat this as a property of
  reference-conditioned TTS rather than a quirk of one model.
- **Only an instruction escapes it.** S2 Pro's markup is honoured — the tags
  are not spoken, and they slow it — but it buys about 5–10%, from 186 to 167
  and 167 to 158. Breeze's Voice Direction at `--cfg-scale 4` moved the same
  passages to 102 and 80 wpm, *below* the reference. That is a dial, not a
  nudge, and it is the capability whose absence produced "a bullet train going
  300km per hour".

The instruction used, verbatim, since the wording matters more than it looks:

> Speak slowly and calmly, like a patient teacher with all the time in the
> world. Leave a clear pause at the end of every sentence. Unhurried, warm,
> and deliberate.

80 wpm is probably past the point of usefulness; the useful finding is the
*range*, because a dial that overshoots can be backed off and one that does
not move cannot be pushed.

### One slide, one clip: what length does to S2 Pro

The opening slide's full narration — 266 words, 1579 bytes, nearly five times
`MAX_MERGED_WORDS` — rendered as a single unbroken call. fish-speech reported
`grouped into 1 batches`, so this really is one generation and not several
stitched together.

| | overall | first quarter | last quarter | drift | window range |
|---|---|---|---|---|---|
| bare | 167 wpm | 164 | 190 | **+26** | 148-213 |
| marked | 185 wpm | 170 | 227 | **+58** | 128-256 |

Three findings, in increasing order of importance.

**Long clips are faster overall.** 167-185 wpm here against 138-143 wpm for the
same engine on 6-10 second marked clips. Length alone costs roughly 30 wpm.

**Long clips accelerate, on this engine too.** Bare drifts +26 wpm start to
finish, against the +30 measured on uncapped ElevenLabs clips. `MAX_MERGED_WORDS`
is not a workaround for one vendor's quirk; it is answering something both
engines do. The cap stays.

**Markup stops helping and starts hurting.** On short clips the tags slowed
delivery usefully, 158 wpm to 138. At 266 words they did the reverse — +58 wpm
of drift and a 128 wpm window spread — and, worse:

> **the marked render hallucinated.** Accuracy 0.942 against 0.928 for bare,
> but the marked clip transcribed **295 words where the source has 266**,
> inserting a sentence that appears nowhere in the deck: *"...again you will
> never be able to get it right, this is why it..."*. The bare render
> transcribed exactly 266 and its only differences were `recognized` /
> `recognised` and `controlled` / `control` — a spelling variant and one
> ending, not invented content.

So markup's usefulness is bounded by clip length, in the same way it was on
Thai: a tag is direction when it is a small part of a short utterance, and a
destabiliser when the model has to hold it across two minutes. Between the Thai
result and this one, the rule is **markup on short English clips only**.

### Where the knee actually is, measured twice

One render is not a threshold, and S2 Pro's seeds are not deterministic — the
Thai work has `มอ ม้า` failing eight seeds once and passing first try another
time. So the fabrication above was checked properly, and a length ladder was
run to find where the trouble starts.

**A ladder of one passage, truncated at sentence boundaries, bare and marked:**

| words | bare drift | marked drift | fabrication |
|---|---|---|---|
| 43 | −9 | +9 | none |
| 68 | +23 | +10 | none |
| 90 | +9 | +8 | none |
| 140 | +6 | +5 | none |
| 190 | +0 | +4 | none |

Accuracy 1.00 on all twelve, no added words anywhere, and drift is directionless
noise rather than a trend — the largest is at 68 words and the smallest at 190.
**Up to 190 words there is no length effect to speak of.**

**Then the 266-word slide, five seeds, same text and markup:**

| seed | heard / 266 | accuracy | drift |
|---|---|---|---|
| 1 | 266 | 1.00 | +7 |
| 7 | 274 | 0.92 | +18 |
| 13 | **295** | 0.86 | +44 |
| 99 | **280** | 0.95 | +26 |
| 42 | **295** | 0.94 | +58 |

**Three of five fabricate.** Not seed luck, and not a subtle effect: the failing
renders insert whole sentences that appear nowhere in the deck. Drift predicts
it — the two faithful seeds sat at +7 and +18, the three bad ones at +26 and
above.

So the knee is somewhere between 190 and 266 words, unmeasured in between.
`MAX_MERGED_WORDS = 55` was inherited from Qwen and its arithmetic ("roughly
twenty seconds at this voice's pace") no longer describes the engine, but it
lands well clear of the cliff and there is no measured reason to move it. If
the seams ever justify fewer, larger clips, 150 words would still carry a
margin — but nothing above 190 should ship without the transcribe-back gate
covering English, because **fabrication is silent**: the clip sounds fluent, and
only a transcript catches it.

The hallucination has a consequence beyond pace. The transcribe-back gate runs
on Thai alone today, on the reasoning that a wrong tone teaches a wrong word
while English merely sounds off. That reasoning assumed English could only be
*mispronounced*, not *fabricated*. If English clips ever exceed the cap, they
need the gate too.

### Is it the same narrator every slide?

The question that disqualified VoiceDesign, asked of the engine that ships.
Six real orientation lines, six separate S2 Pro invocations, same reference,
same markup style:

| line | secs | wpm | pitch |
|---|---|---|---|
| welcome | 10.4 | 139 | 193 Hz |
| forgetting | 6.5 | 138 | 184 Hz |
| harbour | 9.2 | 143 | 183 Hz |
| pen | 5.1 | 200 | 186 Hz |
| struggle | 6.3 | 163 | 193 Hz |
| expect | 4.0 | 163 | 192 Hz |

**Pitch spread 10 Hz**, against VoiceDesign's 67 Hz. Cloning from a fixed
reference holds the speaker, as it should — this is the difference between
having a speaker and describing one.

Two things fall out of the wpm column, though:

- **Marked-up clips run slower than bare ones.** The longer lines land at
  138-143 wpm here, against 158-167 for the same engine unmarked. The tags are
  doing real work.
- **Short clips run fast.** `pen` at 5.1s came back at 200 wpm and `expect` at
  4.0s at 163, while everything over 9s sat near 140. Pace varies with clip
  length, in the opposite direction from the long-clip acceleration noted
  above — so both extremes drift and the middle is stable. Prefer clips in the
  6-12 second band. This is a pace wobble, not an identity wobble, and a
  listener forgives the first far more readily than the second.

## Markup support, measured

The same line was sent to each engine and the clip transcribed back:
`[whispers] Listen carefully. [pause] Now say it aloud.`

| engine | result |
|---|---|
| ElevenLabs `eleven_v3` | heard *"Listen carefully. Now say it aloud."* — **markup** |
| Fish Audio S2 Pro | heard *"Listen carefully. Now say it aloud."* — **markup** |
| Qwen3-TTS | heard *"Pause, welcome. Pause one second before…"* — **spoken aloud** |
| Breeze TTS 2 | installed and measured — but it does not use this syntax at all |

**Breeze spells markup differently, and this will bite.** Vocal events are
parentheses in English — `(sigh)`, `(laugh)`, `(clears throat)` — square
brackets are the *Chinese* syntax, and there is **no `(pause)`** among the
documented events. Pacing on Breeze is the `--instruction` argument's job, not
the text's. So `MARKUP` and `strip_markup`, which both assume `[square]`, are
the wrong shape for it: a `[pause]` left in Breeze text is neither honoured nor
stripped. Whatever ships as the English engine, that has to be reconciled —
`supports_markup` is a boolean where the truth is a syntax.

This is why `Vendor.supports_markup` exists and why `strip_markup` is applied
before handing text to an engine that lacks it. An optimistic default there
ends with a narrator saying the word "pause" to a learner.

### The tags are a published list, and an invented one does nothing

**Read the engine's README before inventing a tag.** S2 Pro publishes its
vocabulary, and the test above used `[whispers]` — which is not in it. The real
tag is `[whisper]`, singular.

That matters more than a typo normally would, because **an unrecognised tag is
silently dropped, not spoken**. So a made-up tag is indistinguishable from a
working one by ear: the clip renders, the words are right, and the only symptom
is that nothing changed. The conclusion recorded above — "the tags shaped the
delivery and were not spoken" — was half measured and half assumed. Not spoken
was measured. *Shaped the delivery* was not.

Measured properly afterwards, with two seeds per tag against a bare baseline on
the same text, and a noise floor taken from the baseline's own seed-to-seed
spread (8 wpm, 8 Hz, 0.04s):

| tag | on the list | effect |
|---|---|---|
| `[excited]` | yes | pitch +9 Hz |
| `[pause]` | yes | within noise here |
| `[serious]` | no | pitch +10 Hz |
| `[slowly]` `[warm]` `[calm]` `[gently]` `[encouraging]` `[thoughtful]` | **no** | **nothing** |
| `[whispers]` | **no — it is `[whisper]`** | **nothing** |

Eight of the ten invented tags moved pace, pitch and pause length by less than
the engine varies between seeds anyway. The list is in fish-speech's README and
mirrored in `src/presentation/components/studio/annotations.ts`, which is what
the studio's palette offers. Free-form descriptions are also supported — the
README claims 15,000+ tags and gives `[whisper in small voice]` — but a listed
tag is the one with a known effect.

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
| Breeze TTS 2 | code Apache 2.0; weights **and their Outputs** Research and Non-Commercial |

The two strongest open models are both non-commercial. That is fine on this
project's footing — personal use, for one family — but it is a ceiling, not a
detail: the day this became a product, both would need relicensing and
ElevenLabs would not.

Breeze's ceiling is worth stating exactly, because it is lower than "the
weights are restricted" implies. Read from the weights' own `LICENSE`, not the
README: §1.4 defines **Output** as the generated audio itself, and §1.7(d)
prohibits using Outputs for a Commercial Purpose. So the narration mp3s would
be encumbered, not merely the checkpoint that made them — swapping engines
later would mean **re-rendering every English clip**, not just changing a
dependency.

The same section is explicit that this project is permitted: §1.6 defines a
Non-Commercial Purpose as "personal, educational, hobbyist". The Apache 2.0
notice in the code repo covers the inference code only and does not reach the
weights or the audio.

**Fish Audio's licence is the more permissive of the two on exactly the thing
the course is made of**, and this is what decided the English row between two
clips that sounded equally good. From `LICENSE.md` in the weights:

- §IV(iii) *Ownership of Outputs*: "As between You and Fish Audio, **You own
  any outputs** generated from the Models."
- §V excludes outputs from Derivative Works: "but do not include the output of
  any Model."

Both licences restrict using the *model* commercially, so neither could be
used to generate audio for a product without a separate agreement. The
difference is what happens to audio already generated: under Fish Audio it is
yours, under Breeze it stays encumbered. Concretely, if this ever stopped being
a family project, S2 Pro would mean buying a licence to render *more* clips and
Breeze would mean re-rendering *every clip already made*.

Neither is a reason to relax. Both are non-commercial, and the honest summary
is that the open engines are on loan while ElevenLabs is not.

## Hardware

S2 Pro wants ≥24 GB VRAM against a 25.3 GB card. It fits, but a full deck build
also loads PixArt, CLIP and Whisper, so models must be loaded and released in
sequence rather than held together.

One more thing worth knowing: **`/tmp` on this machine is tmpfs**, i.e. RAM.
Downloading weights there exhausted memory and killed the dev server. `HF_HOME`
already points at disk; leave downloads to the cache rather than forcing a
`local_dir`.

### Why there are several Python environments, and what they cost

Each engine pins an incompatible torch, so they cannot share one venv:

| env | torch | for |
|---|---|---|
| `backend/.venv` | 2.14.0+cu130 | the app's own backend (transformers 5.x) |
| `scripts/deck-env` | 2.14.0+cu130 | qwen-tts, diffusers, faster-whisper |
| `scripts/fish-env` | 2.8.0+cu128 | fish-speech / S2 Pro |
| `scripts/breeze-env` | 2.9.1+cu128 | Breeze TTS 2 |

That is roughly **7.5 GB each, about 30 GB total**, and most of it is not the
engine — it is ~4.2 GB of `nvidia/` CUDA libraries per env, largely identical
between the two cu128 environments.

It is more than it needs to be, and the cause is a filesystem split rather
than the pins. uv **hardlinks** packages out of its cache into a venv when the
two share a filesystem, and copies every byte when they do not. The cache sits
on `/home` while every venv sits on the data drive, so nothing is shared.
Verified rather than assumed: a large `.so` in these venvs reports
`stat -c %h` = **1**, and the same install with `UV_CACHE_DIR` on the data
drive reports **2**.

So `UV_CACHE_DIR` on the data drive plus a reinstall would collapse the
duplicates — most usefully between `fish-env` and `breeze-env`, which want the
same cu128 libraries. The separate *environments* would remain; only the
duplicate bytes would go. Worth doing before adding a fifth engine, not
urgent — the drive has 286 GB free.
