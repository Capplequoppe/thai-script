# Writing vocabulary mnemonics

A mnemonic here has one job: to make a learner recall **the Thai pronunciation**
when they meet **the English meaning**, and vice versa. Everything else is in
service of that.

## The three jobs of a mnemonic

1. **Sound.** An English (or otherwise familiar) word or phrase that genuinely
   approximates the Thai. This is the hook and the hardest part.
2. **Meaning.** A concrete scene in which that sound-alike and the English
   meaning are forced together, so recalling one drags in the other.
3. **Tone.** A parenthetical note at the end, tying the tone to something
   physical in the scene — a gesture, a falling object, a shout.

## The rule that matters most: do not force it

A forced mnemonic is worse than none. It costs the learner memory to store and
gives back a wrong sound. **If no honest anchor exists, say so and skip the
word.** Skipping is a valid, expected outcome — roughly one word in six.

Specifically, reject an anchor that:

- teaches the wrong vowel or a wrong consonant (ไหน "where" vs "nigh" — the
  vowel is wrong, so it is a skip);
- only works if you mispronounce the English;
- needs a chain of two or more puns to arrive;
- is a rhyme with no scene attached ("*sǎam* sounds like *psalm*, meaning
  three" — no image, nothing to recall).

When you skip, still emit the entry with `"mnemonic": null` and a one-line
`"skip_reason"`. That is a useful result, not a failure.

A **structural** mnemonic is an acceptable alternative to a sound-alike when it
is *true*: contrasting a word against a near-twin the learner will confuse it
with (ไหน vs ไหม — same rising climb, different initial consonant), or pointing
out a real compound. Use it when it genuinely helps; never as a way to avoid
admitting there is no hook.

## Tone glyphs

| glyph | tone | feels like |
|---|---|---|
| `—` | mid | flat, sits in the middle |
| `▁` | low | flat, sits at the bottom |
| `↓` | falling | starts high, drops |
| `▲` | high | up and taut |
| `↑` | rising | climbs, like a question |

**Take the tone from the `romanization`, not from the `tones` field.** The
`tones` field is derived from a broken syllable analyser: it disagrees with the
romanization on 2600 of 5454 entries, and the romanization is right. Read the
diacritic on each syllable of the romanization:

| diacritic | tone | glyph |
|---|---|---|
| `à` grave | low | `▁` |
| `á` acute | high | `▲` |
| `â` circumflex | falling | `↓` |
| `ǎ` caron | rising | `↑` |
| no mark | mid | `—` |

So `sà baːj` is low + mid, and `ʔaː júʔ` is mid + high. Never invent a tone. For a multi-syllable word, note
the tone that carries the word's character (usually the stressed final
syllable) rather than listing every syllable mechanically.

Tone notes should be physical: `(↓ voice drops, generous gesture)`,
`(▲ high, a small bright voice)`, `(▁ low and small, the voice shrinks with the
gesture)`. Not `(falling tone)`.

## Worked examples

> **ต้อง** *tôŋ* — must — A basement is flooding and the water keeps rising.
> The only way to stop it is with a giant **tong**, and the man shouts, "I HAVE
> TO use the tong!" (↓ firm obligation)

> **หน่อย** *nɔ̀i* — a bit — She asks for chilli and the cook reaches for the
> whole jar. "**Nòi**!" — voice dropping low as she pinches her fingers a
> centimetre apart. Just a bit. (▁ low and small, the voice shrinks with the
> gesture)

> **กี่** *kìi* — how many — An old janitor lifts a keyring so heavy it needs
> both hands — hundreds of **keys** fanning out like a metal peacock. Someone
> asks the only sensible question: "Kìi?" How many keys? (▁ low and flat, a
> short blunt question)

Note what these share: one anchor, one scene, the meaning is *what happens*
rather than a label, and the tone note describes a movement.

## Length and voice

40–80 words. Present tense. Concrete nouns. No second-person instructions
("imagine that…", "picture a…") — just tell the scene. No exclamation marks
beyond one. British spelling.

## The illustration scene

Each mnemonic also needs a `scene`: what the picture should show, as a single
paragraph of 30–60 words, in plain visual language.

- Describe **only what is visible**. No narration, no "he realises that…".
- **Never mention text, letters, words, signs, captions or writing.** Captions
  are composited afterwards with a real font; a diffusion model cannot spell
  and cannot render Thai at all.
- Name the subject, what they are doing, the setting, and the light.
- Avoid naming real people or brands.
- One moment, not a sequence.

Also supply:

- `anchor` — the sound-alike, **18 characters maximum**. It is a label on a
  plaque, not a sentence (`"DOOM"`, not `"DOOM, lips spread"`).
- `headline` — a short line of speech or sound from the scene, or `null`.

## Rating an existing mnemonic (for audits)

Score 1–5 on effectiveness:

- **5** — honest sound anchor, vivid scene that carries the meaning, tone tied
  to something physical. Would work on a stranger.
- **4** — solid; maybe the tone note is missing or flat, but the hook works.
- **3** — the hook works but the scene is thin or abstract; recall is weak.
- **2** — forced anchor, or a scene that does not actually connect sound to
  meaning. A learner would have to memorise the mnemonic itself.
- **1** — wrong sound, wrong meaning, or no mnemonic content at all (a bare
  definition, a note to self, a fragment).

Rate **4 or 5 → keep unchanged**. Rate **1–3 → propose a replacement** written
to this guide, or skip the word with a reason if no honest anchor exists.

Be willing to say 5. Many existing entries are good, and churning them wastes
the learner's familiarity. Be equally willing to say 1 — some entries are a
fragment or an unfinished thought.

## Output format

Emit **only** a JSON array, no prose around it:

```json
[
  {
    "rank": 87,
    "thai": "กี่",
    "mnemonic": "…",
    "anchor": "KEY",
    "headline": "Kìi?",
    "scene": "…",
    "rating": 2,
    "verdict": "replaced",
    "skip_reason": null
  }
]
```

- `rank` and `thai` must be copied exactly from the input — they are the join
  key and the safety check.
- `verdict`: `"written"` (new), `"kept"` (audit, unchanged — then `mnemonic`
  may be null), `"replaced"` (audit, new text supplied), `"skipped"`.
- `rating` and `verdict: "kept"/"replaced"` apply to audits only; writers emit
  `"written"` or `"skipped"` and may omit `rating`.
