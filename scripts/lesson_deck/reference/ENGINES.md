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
| **Thai words** | Fish Audio S2 Pro, cloned from `thai-voice.mp3`, said inside a carrier | clears the tone gate, and costs nothing per clip |
| **Thai letter names** | the native recordings already in `public/audio/` | the engine is unreliable on them, and 42 correct clips already ship |
| **English** | Fish Audio S2 Pro, cloned from a fixed reference, with `[markup]` | chosen by ear, and it keeps its outputs |

The Thai row used to read "ElevenLabs, the only one that clears the tone gate",
and the measurement behind it is still in this file and still correct. What
changed is the reference and the carrier, not the standard — see **Thai on this
machine**. The metered voice remains reachable with `--metered-thai`, and one
metered call still buys the reference everything else is cloned from.

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
and lesson that use them. The entire course's Thai is a rounding error.

That argued against moving it, and it is worth being clear that cost is not
what moved it in the end. Correctness was never for sale at that price and
still is not: local Thai ships because it passes the same gate, and the clips
it cannot pass come from the native recordings instead. The saving is a
by-product. What the move actually bought was that a lesson can be built,
listened to, and rebuilt without reaching a vendor at all.

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

## Thai on this machine

Thai is now generated locally. Two things had to change first, and a third
turned out to be measuring the wrong thing entirely.

### A reference long enough to carry the language

The first local attempt cloned Thai from a one-second clip of `นานา`. Two of
six words cleared the gate and ง as an initial came back as ม. That was a
verdict on a one-second reference, not on the engine. With thirty seconds of
real Thai — see `README.md` for how the passage was chosen — `งาน` went from
`มาน่า` to a clean 1.00.

### A carrier sentence, because short requests have no context

A cloning engine asked for two syllables and nothing else has nothing to settle
its prosody against, so it guesses. The fix is to ask for a sentence and throw
the sentence away: the target is held between two `[pause]` tags, and the clip
is cut back to it afterwards.

| | passed |
|---|---|
| bare request, one seed | 1 of 5 |
| bare request, eight seeds | 3 of 5 |
| carrier, cut on silence | 1 of 5 — and one clip cut to nothing |
| carrier, cut on word timings | 5 of 5 |

The third row is a dead end worth keeping. `[pause]` is direction, not a
guaranteed stretch of digital silence: only half the clips had two gaps loud
enough for `silencedetect` to find. The cut is made on whisper's word timings.

### The gate cannot read an isolated letter name

The first real build with the carrier still failed 7 of 12 clips, and the cause
was not the engine. Run the pipeline's own check against the course's *native*
recordings — clips that are correct, shipped, and already heard by learners in
the listening quiz:

| clip | asked for | heard |
|---|---|---|
| `consonant-no-nu.mp3` | `นอ หนู` | `นอนู` |
| `consonant-mo-ma.mp3` | `มอ ม้า` | `มอมมา` |
| `consonant-ngo-ngu.mp3` | `งอ งู` | `น้องโง่` |
| `consonant-yo-yak.mp3` | `ยอ ยักษ์` | `ยอยยาก` |
| `consonant-wo-weng.mp3` | `วอ แหวน` | `ว้าวแหวน` |

**Five of five fail.** A letter name is a syllable Thai does not otherwise use,
so a transcriber hands back the nearest real word. A check that rejects every
known-good clip of a kind is not measuring that kind of clip — and it was
rejecting the generated letter names for the same reason, not for being wrong:
`วอ แหวน` generated here transcribes as `ว้าวแหวน`, character-for-character
what the native recording transcribes as.

So the reading the check sees is the one taken *inside the carrier*, where the
surrounding words settle what the target is. It is a real transcript of the
bytes that ship, not an exemption: a take that said the wrong word is heard
saying the wrong word and is still rejected. What moved is where whisper was
standing. With that, the same build went from 5 of 12 to **11 of 12**.

### Where it still fails, re-measured

The six clips from the table above, re-run through the shipped code — carrier,
timing cut, in-context reading, eight seeds:

| clip | S2 Pro, before | S2 Pro, now |
|---|---|---|
| `มอ ม้า` | never cleared in 8 | **never cleared in 8** |
| `นอ หนู` | 2 seeds | 8 seeds |
| `สระอา` | 1 seed | 1 seed |
| `นานา` | 1 seed | 1 seed |
| `มา` | 3 seeds | 1 seed |
| `นาน` | 1 seed | 1 seed |
| | 5 / 6 | **5 / 6** |

The verdict did not move, and that is the point of having re-run it rather than
assuming the carrier had swept the problem away.

Put beside lesson 2's results, the line is clean and it is not about tone
marks or vowel length:

- **Words** — `งาน ยาว งาม วง นานา ยายา สระอา มา นาน` — all pass, usually on
  the first seed.
- **Letter names** — 3 of 5 pass, none of them comfortably. `มอ ม้า` and
  `วอ แหวน` fail outright; `นอ หนู` needed all eight seeds.

Letter names are therefore the class to take from the native recordings rather
than generate. All 42 already ship for the listening quiz, and a lesson can
point at one with a `recording:` line — which also means the learner hears the
identical clip in the lesson and in the quiz that drills it.

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

### And then it was used, and measured, and it does almost nothing

The paragraph above was written before anything was rendered through it. Thirty
annotations later, on lesson 1, here is what a tag actually buys.

Calibrate first, because the obvious instrument is wrong. An early pass
measured loudness over frames selected by a threshold taken from *each clip's
own peak*, which normalises overall level away by construction: a whisper and a
shout score the same. Absolute RMS over the whole waveform, five baseline seeds,
and a floor that is the seed spread or a minimum worth caring about, whichever
is larger:

| tag | loudness | voiced fraction | verdict |
|---|---|---|---|
| `[whisper]` | **-0.0 dB** | +0.00 | nothing |
| `[loud]` | -0.1 dB | -0.00 | nothing |

A whisper is quiet and almost entirely unvoiced. Neither number moved. Every
other tag tried — `[sad]`, `[delight]`, `[low voice]`, `[excited]`, `[pause]`,
`[short pause]`, `[emphasis]` — moved pace, pitch, pitch spread, brightness,
pause count and pause length **less than the engine moves them between seeds on
the same text**. Confirmed by ear: bare and `[whisper]` are indistinguishable.

**A tag behaves like a seed change, not like direction.** It is not ignored —
every clip differs byte-for-byte from the untagged one — it simply perturbs
generation without steering it.

### Why, and what is not the reason

Checked in the installed package rather than guessed. Checkpoint
`fishaudio/s2-pro`, fish-speech 2.0.0 on current upstream.

- **Not a syntax or plumbing fault.** Our text reaches `generate_long`
  verbatim: no normalisation, no bracket handling, and `clean_text`
  (`fish_speech/text/clean.py:24`) is never called on the inference path — it
  belongs to dataset loading. The assembled prompt matches the trained format.
  There is no flag, field, checkpoint variant or entry point being missed.
- **Not the voice cloning.** fish-speech#1280 swept seven tags across
  temperature 0.6-1.5 **with no reference audio at all** and got the same
  result.
- **Not a local-inference gap that better weights would close.** Fish Audio
  state in discussion #1217 that the published weights are identical to
  production, and attribute the web demo's advantage to an unreleased
  orchestration pipeline. The `normalize` field their schema declares
  (`fish_speech/utils/schema.py:97`) is read by nothing, so that stage does not
  ship — but it is number and abbreviation expansion, which hand-written
  teaching prose has no use for.

**It is reproduced upstream and unanswered**: fish-speech#1280 and #1162 both
closed as not planned, and vllm-omni#2248 reports it against an unrelated
serving stack.

### What does govern delivery

The sentence, not the tag. fish-speech#1280 is the cleanest statement of it:

    [happy] What a beautiful day!            renders clearly
    [happy] The meeting starts at three.     near-inaudible

The tag amplifies what the words already imply and cannot impose what they do
not. The technical report says the same from the other side — Appendix A.2
scores "whether the overall prosody and affective tone of an utterance align
with the semantic content and contextual cues implied by the text and tags",
and A.1 requires models to "infer these events from the semantic and
conversational context".

Which makes the earlier finding in this file — that the narration complaint was
**phrasing, not pace**, and that the fix was a `[pause]` at a sentence boundary
— the general rule rather than an anecdote. Write the delivery into the prose.

### Two things worth trying, both untested here

- **A full descriptive instruction rather than a keyword.** Report §6.2.2 used
  an LLM to rewrite benchmark prompts into richer instructions before
  synthesis, moving the Audio Turing Test posterior 0.483 to 0.515. The shape
  rewarded is `[speaking slowly and deliberately, like a patient teacher]`, not
  `[slowly]`. Short free-form phrases were tried here and did nothing.
- **A `<|speaker:0|>` prefix on the synthesised text.** The CLI's own default
  carries it, and the training transcripts paired speaker turns with injected
  tags — we supply tags without turns. Both official frontends send raw text,
  so upstream does not treat it as required. An experiment, not a fix.

Both change the bytes without changing text, language or voice, so both need
the cache-key treatment described under **Sampling** below.

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

## Sampling, and why it belongs in the cache key

We sampled at `temperature=1.0`, `top_p=0.9` until it was checked against the
package. Both sit at or above the ceiling of every official range in
fish-speech 2.0.0:

| | ours | web UI default | web UI max | other callers |
|---|---|---|---|---|
| `temperature` | **1.0** | 0.8 | **1.0** | 0.7 |
| `top_p` | **0.9** | 0.8 | 0.95 | 0.7 |

Nothing had chosen those numbers against a measurement. They are now 0.8 and
0.8, the vendor's own operating point.

This mattered more than it looked, because `MAX_MERGED_WORDS` had just gone
from 75 to 150. The point where this model starts fabricating whole sentences —
266 words, three seeds in five — was measured *while sampling at maximum
temperature*, and approaching a length limit at the hottest available setting
is the wrong way round.

**It buys stability, not steering.** fish-speech#1280's reporter swept
temperature from 0.6 to 1.5 and never rescued a tag on a neutral sentence.

### Three parameters that do nothing

Holes in fish-speech 2.0.0, not faults in our code. Do not reason about them
and do not put them in a cache key — invalidating clips for a parameter that
cannot change a byte of them is worse than leaving it out.

- **`repetition_penalty`** — declared by `generate_long`
  (`text2semantic/inference.py:533`) and never passed to `generate()`.
  `model.fixed_repetition_penalty` is assigned and read nowhere. The web UI's
  slider and the server's request field both feed it. If a blog suggests it as
  a pacing knob, it cannot work on this code.
- **`iterative_prompt`** — declared, never referenced in the body.
- **`chunk_length`** — only reaches `group_turns_into_batches`, which runs only
  when the text carries `<|speaker:N|>` markers. Ours does not, so the whole
  string is one batch whatever the value. This is why a 266-word clip logs
  `grouped into 1 batches`.

### Anything that shapes a clip has to reach the key

The sampling parameters were literals inside the worker and appeared in no
cache key: a clip was keyed on `pipelineVersion + text + language + modelId +
reference digest`. Changing a literal would therefore have left every clip
already on disk at the old value while new clips used the new one — a deck
built at two operating points, with nothing recording which was which.

They now live on `VoiceSpec` and are hashed into the English projection, so
changing one regenerates exactly the clips it affects.

This is the second time this class of bug has been fixed here. `PIPELINE_VERSION`
version 5 reads: "vendor.ENGLISH_TEMPO joined the English cache key so a tempo
change regenerates rather than silently doing nothing." That precedent was lost
when the tempo pass was removed in version 7 — the pattern was not.

The rule: **if it changes the bytes, it goes in the key, or the version gets
bumped.** A silent cache hit on stale settings is the failure mode, and it
cannot be heard in one clip — only in a deck that drifts halfway through.

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
- **Cloning Thai from a one-second reference.** `นานา` as the whole reference:
  2 of 6, with ง as an initial coming back as ม. Length is not optional for a
  language the speaker has to carry.
- **Cutting a carrier on detected silence.** `[pause]` is direction, not
  guaranteed digital silence. Half the clips had no two gaps loud enough to
  find and one was cut to nothing. Cut on whisper's word timings instead.
- **Transcribing a one-second Thai letter name to verify it.** Rejects five of
  five of the course's own native recordings. The clip has to be judged in a
  context where it can be heard.

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
