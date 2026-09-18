# Scoping: lesson-12 — The temple cousins

Source script: `content/lessons/lesson-12.md` (11 slides).
Shipped deck: `public/lessons/lesson-12/deck.json` (11 slides, `assets: []`).
All facts below verified against the working tree; commands used are named where the answer depends on them.

---

## Declares

### Header comment (`content/lessons/lesson-12.md`, lines 5-13), verbatim

```
previews: none
ranks: 1-1500
```

There is no `teaches:` line on this script. Full header text:

> Task 4.3, final band 1 of 3. Seven high-class letters in one lesson, because
> they are one idea repeated seven times: each writes a sound the learner
> already has a harbor letter for, and moves it to the temple. The old course
> spread these seven across lessons 12-15; stated as pairs against ค ช ท พ ฟ ซ ฮ
> they are a single pattern, and the high-live tone rule lands with them.

### Lessons-table row (`src/domain/script/data/symbols.ts:3316-3325`)

```ts
number: 12,
title: "The Temple Cousins",
focus: "Seven high class letters that echo sounds already learned",
consonants: ["ข", "ฉ", "ถ", "ผ", "ฝ", "ส", "ห"],
vowels: ["เ-ีย", "เ-ียะ"],
toneMarks: [],
toneRulesIntroduced: ["high-live"],
specialRulesIntroduced: [],
```

**Consonants (7):** ข ฉ ถ ผ ฝ ส ห
**Vowels (2):** เ-ีย (sara iia, long), เ-ียะ (sara ia, short)
**Tone marks:** none

### `rule:` slides in the script (1)

| slide | `rule:` id | shipped rule record |
| --- | --- | --- |
| `## rule high-live-rule` | `high-live` | `symbols.ts:398-405` — `consonantClass: High`, `syllableType: "live"`, `resultingTone: "rising"`, description `"High class consonant + live syllable = rising tone."`, `lesson: 12` |

### Vowel records (`symbols.ts`)

- **เ-ีย** — `name: "sara iia"`, `length: "long"`, `sound: "iia (like IA in 'Mamma Mia')"`, `position: "left-above-right"`, `audioUrl: "/thai-script/audio/sara-ia-long.mp3"`, `priority: 22`, `lesson: 12`.
  `shapeCue: "Mast in front, beret above, and ย standing after — three stations around one consonant."`
  `soundCue: "Ee sliding down into ya — one long glide."`
- **เ-ียะ** — `name: "sara ia"`, `length: "short"`, `sound: "ia (short version of sara iia)"`, `position: "left-above-right"`, `audioUrl: "/thai-script/audio/sara-ia-short.mp3"`, `priority: 23`, `lesson: 12`.
  `shapeCue: "The same three stations with the stacked hooks added at the end."`
  `soundCue: "The ee-ya glide snipped short."`

Neither vowel has an entry in `conditionalVowelForms` (`sceneGrammar.ts:92-157`) — **เ-ีย has no written change before a final consonant**, unlike เ-อ (lesson 13) and -ัว (lesson 14).

---

## Consonants

Prior teaching set (everything declared by lessons 1-11): ม น ง ย ว ก ด บ ช ซ พ ฟ ค ท ฮ ร ล จ ต ป อ — 21 consonants.

### ข — ข ไข่ "egg"

- District **temple**; class **High**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "kh (same sound as ค, but high class)"`; `finalSound: "K-stop"`; `priority: 20`.
- `prompt` (consonant-scenes.json, id `kho-khay`):
  > A single white egg resting in a monk's brass alms bowl, nothing else in the bowl, in the courtyard of a Thai temple with tiered golden roofs and white walls.
- `narration`:
  > The egg. [pause] High class, so it belongs up at the temple. [pause] Like the elephant's letter stripped of its tail — nothing rises past the top line — an egg resting in the temple's alms bowl. [pause] Kh, a k wrapped in soft breath — The temple's hush; first face of the eleven that must be learned by sight.
- `shapeCue` (symbols.ts):
  > Like ช stripped of its tail — nothing rises past the top line — an egg resting in the temple's alms bowl.
- `soundCue`:
  > Kh, a k wrapped in soft breath — the temple's hush; first face of the eleven that must be learned by sight.
- **Shape ≈ ช** (taught lesson 4). Stated by the data: shapeCue says *"Like ช stripped of its tail"*. `confusablePairs` also carries `ข~ช [tail] "ช raises a tail above the line while ข stays at height"`.
- **Sound ≈ ค** (taught lesson 6). Stated by `initialSound: "kh (same sound as ค, but high class)"`.

### ฉ — ฉ ฉิ่ง "cymbals"

- District **temple**; class **High**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "ch (same sound as ช, but high class)"`; `finalSound: "T-stop"`; `priority: 32`.
- `prompt` (id `cho-ching`):
  > A pair of small brass finger-cymbals held up at the moment they chime, a flick of ribbon on top, in the courtyard of a Thai temple with tiered golden roofs and white walls.
- `narration`:
  > The cymbals. [pause] High class, so it belongs up at the temple. [pause] A profile as stubby as the mouse's letter, wearing a flicked tail on top — finger-cymbals held up mid-chime on the temple step. [pause] Ch on a breath, shimmering — The cymbal's hiss under the eaves; second face of the temple's eleven.
- `shapeCue`:
  > A stubby น-profile wearing a flicked tail on top — finger-cymbals held up mid-chime on the temple step.
- `soundCue`:
  > Ch on a breath, shimmering — the cymbal's hiss under the eaves; second face of the temple's eleven.
- **Shape ≈ น** (taught lesson 1). Stated by shapeCue: *"A stubby น-profile"*. **ฉ is the only lesson-12 letter with no `confusablePairs` entry.**
- **Sound ≈ ช** (taught lesson 4). Stated by `initialSound: "ch (same sound as ช, but high class)"`.

### ถ — ถ ถุง "bag/sack"

- District **temple**; class **High**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "th (like T in 'top')"`; `finalSound: "T-stop"`; `priority: 23`.
- `prompt` (id `tho-thung`):
  > A cloth alms bag bulging with fruit, carried open in both hands toward the temple steps, in the courtyard of a Thai temple with tiered golden roofs and white walls.
- `narration`:
  > The bag. [pause] High class, so it belongs up at the temple. [pause] Like the chicken's letter, but a head coils inside the near end of the frame — fruit sitting inside the cloth bag brought for the monks. [pause] T breathed open — th — The bag sighing as it is set down at the temple.
- `shapeCue`:
  > Like ก, but a head coils inside the near end of the frame — fruit sitting inside the cloth bag brought for the monks.
- `soundCue`:
  > T breathed open — th — the bag sighing as it is set down at the temple.
- **Shape ≈ ก** (taught lesson 3). Stated by shapeCue and by `confusablePairs`: `ก~ถ [added-stroke] "ถ coils a head inside the frame that ก leaves open"`.
- **Sound ≈ ท** (taught lesson 7). **Not stated in `initialSound`** — `"th (like T in 'top')"` names no letter. The link is derivable: the `th` phoneme group (leading token of `initialSound`) is ท(Low/L7) ธ(Low/L13) ถ(High/L12) ฐ(High/L14) ฑ(Low/L14) ฒ(Low/L14), and ท is the only already-taught member.

### ผ — ผ ผึ้ง "bee"

- District **temple**; class **High**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "ph (like P in 'pig')"`; `finalSound: "P-stop"`; `priority: 22`.
- `prompt` (id `pho-phing`):
  > A fat bee crawling head-first deep into an open pink lotus flower, only its striped back showing, in the courtyard of a Thai temple with tiered golden roofs and white walls.
- `narration`:
  > The bee. [pause] High class, so it belongs up at the temple. [pause] Like the offering tray's letter in outline, but the head curls inside the left rim — a bee tucked head-first into a temple lotus. [pause] P on a puff of breath — ph — fanned upward by wings on the temple steps.
- `shapeCue`:
  > Like พ in outline, but the head curls inside the left rim — a bee tucked head-first into a temple lotus.
- `soundCue`:
  > P on a puff of breath — ph — fanned upward by wings on the temple steps.
- **Shape ≈ พ** (taught lesson 5). Stated by shapeCue; `confusablePairs` has `ผ~พ [head-direction] "ผ's head stays inside the letter; พ's sits outside it"`.
- **Sound ≈ พ** (taught lesson 5). Not stated in `initialSound` (`"ph (like P in 'pig')"`); derivable from the `ph` group: พ(Low/L5) ผ(High/L12) ภ(Low/L13) — พ is the only already-taught member. **ผ and ฝ are the two lesson-12 letters whose shape cousin and sound cousin are the same letter** (ผ↔พ, ฝ↔ฟ); the other five split.

### ฝ — ฝ ฝา "lid/cover"

- District **temple**; class **High**; `hasDeadEnding: true`; `isAspirated: false`; `initialSound: "f (like F in 'fan')"`; `finalSound: "P-stop"`; `priority: 33`.
- `prompt` (id `fo-fa`):
  > A lidded ceramic jar on a temple shelf, tall knob on its lid turned inward, the lid slightly ajar, in the courtyard of a Thai temple with tiered golden roofs and white walls.
- `narration`:
  > The lid. [pause] High class, so it belongs up at the temple. [pause] The head stays inside the rim and the last stroke stands tall — a lidded jar on the temple shelf, its knob turned inward. [pause] F — breath brushed past the jar's lip; temple air, so plain syllables drift upward.
- `shapeCue`:
  > The head stays inside the rim and the last stroke stands tall — a lidded jar on the temple shelf, its knob turned inward.
- `soundCue`:
  > F — breath brushed past the jar's lip; temple air, so plain syllables drift upward.
- **Shape ≈ ฟ** (taught lesson 5). **The shapeCue names no letter.** `confusablePairs` supplies it: `ฝ~ฟ [head-direction] "ฝ's head stays inside the letter; ฟ's sits outside it"`. Note the existing skeleton instead pairs ฝ against same-lesson ผ ("ฝ raises a taller stem than ผ"), which is *not* an already-taught contrast and is not in `confusablePairs`.
- **Sound ≈ ฟ** (taught lesson 5). Not stated in `initialSound`; the `f` group is ฟ(Low/L5) ฝ(High/L12) only.

### ส — ส เสือ "tiger"

- District **temple**; class **High**; `hasDeadEnding: true`; `isAspirated: false`; `initialSound: "s"`; `finalSound: "T-stop"`; `priority: 11` (the highest scheduling priority of any lesson-12 letter).
- `prompt` (id `so-sia`):
  > A tiger pacing behind a temple gate, one iron bar crossing its arched tail, in the courtyard of a Thai temple with tiered golden roofs and white walls.
- `narration`:
  > The tiger. [pause] High class, so it belongs up at the temple. [pause] Like the monkey's letter, but crossed with an extra line — a tiger behind the temple gate, one bar across its arched tail. [pause] S — The everyday s of Thai text, hissed at the gate; third and busiest of the temple's s-letters.
- `shapeCue`:
  > Like ล, but crossed with an extra line — a tiger behind the temple gate, one bar across its arched tail.
- `soundCue`:
  > S — the everyday s of Thai text, hissed at the gate; third and busiest of the temple's s-letters.
- **Shape ≈ ล** (taught lesson 8). Stated by shapeCue; `confusablePairs`: `ล~ส [added-stroke] "ส crosses the ล shape with an extra line"`.
- **Sound ≈ ซ** (taught lesson 4). Not stated in `initialSound` (bare `"s"`); the `s` group is ซ(Low/L4) ศ(High/L13) ษ(High/L13) ส(High/L12) — ซ is the only already-taught member.
- Note: the soundCue already forward-references ศ and ษ ("third and busiest of the temple's **three** s-letters"), which arrive in lesson 13.

### ห — ห หีบ "chest/trunk"

- District **temple**; class **High**; `hasDeadEnding: true`; `isAspirated: false`; `initialSound: "h (like H in 'Hello')"`; `finalSound: "not used as final consonant"` (the only lesson-12 letter with no final role); `priority: 13`.
- `prompt` (id `ho-hip`):
  > A big carved wooden chest with a domed lid set against a white temple wall, one corner kinked where the wood warped, in the courtyard of a Thai temple with tiered golden roofs and white walls.
- `narration`:
  > The chest. [pause] High class, so it belongs up at the temple. [pause] The left stroke kinks where the soldier's letter drops straight, then a loop and a tall right wall — a carved chest set against the temple wall. [pause] H — pure breath, the temple's own hush. Stood silent before a humming letter, it lifts that letter into temple tone rules.
- `shapeCue`:
  > The left stroke kinks where ท drops straight, then a loop and a tall right wall — a carved chest set against the temple wall.
- `soundCue`:
  > H — pure breath, the temple's own hush. Stood silent before a humming letter, it lifts that letter into temple tone rules.
- **Shape ≈ ท** (taught lesson 7). Stated by shapeCue; `confusablePairs`: `ท~ห [bump] "ห kinks its left stroke where ท drops straight"`.
- **Sound ≈ ฮ** (taught lesson 7). Not stated in `initialSound`; the `h` group is ฮ(Low/L7) ห(High/L12) only.
- The soundCue forward-references ห นำ, whose rule record `hor-nam` is filed `lesson: 28` (`lesson-leading-consonants`). The skeleton does not currently use ห นำ.

### Summary table

| letter | class / district | shape ≈ (already taught) | stated where | sound ≈ (already taught) | stated where |
| --- | --- | --- | --- | --- | --- |
| ข | High / temple | ช (L4) | shapeCue + confusablePairs | ค (L6) | `initialSound` |
| ฉ | High / temple | น (L1) | shapeCue only (no confusablePairs entry) | ช (L4) | `initialSound` |
| ถ | High / temple | ก (L3) | shapeCue + confusablePairs | ท (L7) | derived from `th` group only |
| ผ | High / temple | พ (L5) | shapeCue + confusablePairs | พ (L5) | derived from `ph` group only |
| ฝ | High / temple | ฟ (L5) | confusablePairs only (shapeCue names nothing) | ฟ (L5) | derived from `f` group only |
| ส | High / temple | ล (L8) | shapeCue + confusablePairs | ซ (L4) | derived from `s` group only |
| ห | High / temple | ท (L7) | shapeCue + confusablePairs | ฮ (L7) | derived from `h` group only |

---

## Shipped recordings (each path confirmed with `ls`)

All seven `public/audio/consonant-*.mp3` files exist.

| letter | scene id | path | `ls` result |
| --- | --- | --- | --- |
| ข | kho-khay | `public/audio/consonant-kho-khay.mp3` | EXISTS |
| ฉ | cho-ching | `public/audio/consonant-cho-ching.mp3` | EXISTS |
| ถ | tho-thung | `public/audio/consonant-tho-thung.mp3` | EXISTS |
| ผ | pho-phing | `public/audio/consonant-pho-phing.mp3` | EXISTS |
| ฝ | fo-fa | `public/audio/consonant-fo-fa.mp3` | EXISTS |
| ส | so-sia | `public/audio/consonant-so-sia.mp3` | EXISTS |
| ห | ho-hip | `public/audio/consonant-ho-hip.mp3` | EXISTS |

Every one matches the `audioUrl` field on its `ThaiConsonant` record (`/thai-script/audio/<file>`).

**Vowel recordings** — both exist: `public/audio/sara-ia-long.mp3`, `public/audio/sara-ia-short.mp3`.

**Palace assets** — all seven have both a scene image and a narration clip:
`public/palace/consonants/{kho-khay,cho-ching,tho-thung,pho-phing,fo-fa,so-sia,ho-hip}.jpg` and the matching `public/palace/consonants/audio/<id>.mp3`. All 14 confirmed present.

**Lesson-level assets:** `public/lessons/lesson-12/manifest.json` has `"assets": []` and no deck slide carries `audio` or `image`. Nothing has been generated for this lesson yet.

---

## Example words and ranks

Every Thai word the skeleton uses. Ranks are read from `src/domain/vocabulary/data/vocabulary.json` the way the test reads them — `new Map(vocabulary.map(...))`, which keeps the **last** entry for a duplicated `thai` key. Declared window: **1-1500**.

| word | romanisation (corpus) | English (corpus) | rank | Thai chars | in window? |
| --- | --- | --- | --- | --- | --- |
| ฉัน | chǎn | I (mostly female) | 14 | 3 | yes |
| ของ | khǎawng | of | 17 | 3 | yes |
| ถึง | thǔeng | reach; arrive at | 40 | 3 | yes |
| หา | hǎa | find | 126 | 2 | yes |
| ถาม | thǎam | ask | 131 | 3 | yes |
| เขา | khǎo | he | 156 | 3 | yes |
| สูง | sǔung | tall | 185 | 3 | yes |
| เสีย | sǐa | waste | 211 | 4 | yes |
| ขอ | khǎaw | ask | 232 | 2 | yes |
| เรียน | riian | study | 310 | 5 | yes |
| ฝัน | fǎn | dream | 977 | 3 | yes |
| ผม | phǒm | I (male) | 15 | 2 | yes |

**No word is outside the window and no word is absent from the corpus.** Total 12 words; the shipped gate (`sequenceClosure.test.ts`, "the authored lessons resolve their example words inside the declared rank window") requires more than 4 — satisfied.

Duplicate-key caveats (the corpus holds 139 duplicated `thai` keys; three touch this lesson):

- **ผม** has two entries: rank 195 `"hair"` and rank 15 `"I (male)"`. The last wins → 15. The skeleton glosses it "I for a man", which matches the rank-15 entry.
- **สูง** has rank 184 `"high"` and rank 185 `"tall"`. Last wins → 185. The skeleton glosses it "tall".
- **เรียน** has rank 309 `"learn"` and rank 310 `"study"`. Last wins → 310. The skeleton glosses it "to study".

The corpus gloss for **เสีย** is `"waste"`; the skeleton says "to lose or to break". The corpus gloss for **เขา** is `"he"`; the skeleton says "he or she".

---

## Risks

### 1. Declared symbol with no example word

**None.** Every one of the seven declared consonants appears inside at least one corpus word in the skeleton, and both declared vowels appear:

| letter | corpus words in the skeleton that contain it |
| --- | --- |
| ข | ขอ (232), ของ (17), เขา (156) |
| ฉ | ฉัน (14) |
| ถ | ถาม (131), ถึง (40) |
| ผ | ผม (15) |
| ฝ | ฝัน (977) |
| ส | สูง (185), เสีย (211) |
| ห | หา (126) |

Thinnest coverage: ฉ, ผ, ฝ and ห each rest on a **single** word. Deleting ฝัน, ฉัน, ผม or หา in a rewrite removes that letter's only example.

เ-ีย is exemplified twice (เสีย under temple ส, เรียน under harbor ร) — that contrast is the lesson's tone demonstration. **เ-ียะ has no example word at all**; the skeleton says only "A short mate, เ-ียะ, exists and is rare; clip the glide short and stop it." This is safe for the shipped tests (no test requires a word per vowel) but it is the one declared symbol with no worked example.

Character-level coverage was checked directly against `public/lessons/lesson-12/deck.json`: **DECLARED-BUT-UNUSED = none**.

### 2. SHORT-WORD RISK (under 3 Thai characters)

**Three words, all 2 characters:**

| word | rank | gloss used |
| --- | --- | --- |
| หา | 126 | to look for |
| ขอ | 232 | to ask for |
| ผม | 15 | I (for a man) |

Why this matters, from the shipped pipeline:

- `scripts/lesson_deck/vendor.py` gives any Thai request under `CARRIER_LIMIT = 12` normalised characters a carrier sentence (`ขอโทษ ค่ะ [pause] <text> [pause] ขอบคุณ ค่ะ`) and cuts the target out on word timings. So a 2-character word **can** be synthesised.
- The failure mode is verification. `pipeline.py:195` `transcript_matches` accepts on `difflib.SequenceMatcher(...).ratio() >= TRANSCRIPT_MATCH_RATIO` where `TRANSCRIPT_MATCH_RATIO = 0.9`. On a 2-character string one wrong character scores 0.5, so there is no partial credit: the clip either transcribes exactly or the attempt is rejected. `RETRY_SEEDS` is 8 long specifically because "Short Thai has high variance against the transcriber" (comment at `pipeline.py:94`), and the worked example in that comment (`มอ ม้า` → `หมอ ม้า`, scoring 0.909) is *only just* accepted.

So these three are the segments most likely to burn all 8 seeds and land in `failed`. ผม and ขอ are additionally hazardous because the transcriber's nearest real word may differ (ขอ vs ขอ- prefixed forms; ผม vs ผ่ม).

The longer alternatives already in the skeleton for the same letters: ของ (3), เขา (3) for ข; ฉัน (3) for ฉ.

### 3. Genuinely rare or archaic letters

**None in this lesson.** All seven are high-frequency working letters. Scheduling priorities from `symbols.ts` (lower = earlier in the SRS queue, 1-44 scale): ส 11, ห 13, ข 20, ผ 22, ถ 23, ฉ 32, ฝ 33. The rarest here is ฝ at 33 of 44 — still ahead of every lesson-14 letter (34-44).

The script itself makes no "rare" claim about any of the seven; its framing is that each is a cousin of a letter already known.

### 4. Additional findings not in the three required categories

- **Vowel-pattern fragments are already exempted by the shipped test.** Printing `เ-ีย` produces the Thai run `ีย`, which is 2 characters and contains ย (inside `ก-ฮ`), so the naive word-extractor treats it as a word; `ียะ` likewise. Both are absent from `vocabulary.json`. `sequenceClosure.test.ts:145` `patternFragments()` derives the exempt set from `lessons[].vowels` and `rareVowels`, so `ีย` and `ียะ` are skipped. **This exemption only holds while the pattern is written with its placeholder hyphen exactly as the lessons row spells it** (`เ-ีย`, `เ-ียะ`). Writing it any other way (e.g. `เ◌ีย`, or `เ-ีย-`) breaks the fragment match and the run becomes an unresolvable "word".
- `ส`'s shipped `soundCue` says "third and busiest of the temple's **three** s-letters", naming a set completed only in lesson 13. The script's `previews: none` means no glyph is previewed, and no glyph actually leaks — but the prose commits to a fact the learner cannot yet check.
- The shipped `ห` soundCue references ห นำ ("Stood silent before a humming letter, it lifts that letter into temple tone rules"), whose rule record is filed under lesson 28.

---

## Grouping proposal

Seven letters, one slide's worth of structure. Three groupings are supported by shipped data; they rank as follows.

### A. By cousin pair (sound), 7 pairs — **strongest shipped support**

This is the grouping the data derives, and the one an existing test already computes. `middleBand.test.ts:cousinPairs()` groups `consonants` on the leading token of `initialSound` and keeps groups that straddle High and Low. Lesson 7's `cousin-pairs` slide is validated against exactly that derivation, and the test asserts `derived.length === 7`.

The seven derived groups, restricted to already-taught + lesson-12 members:

| phoneme | temple (High, lesson 12) | harbor (Low, already taught) |
| --- | --- | --- |
| kh | ข (p20) | ค (L6, p16) |
| ch | ฉ (p32) | ช (L4, p21) |
| th | ถ (p23) | ท (L7, p15) |
| ph | ผ (p22) | พ (L5, p18) |
| f | ฝ (p33) | ฟ (L5, p27) |
| s | ส (p11) | ซ (L4, p31) |
| h | ห (p13) | ฮ (L7, p35) |

Evidence: `src/domain/script/data/symbols.ts` `initialSound` fields; `middleBand.test.ts:326-341` (`function cousinPairs`), with the `expect(derived.length).toBe(7)` assertion at `middleBand.test.ts:544`. Note the pairing ordering in the script's header — "ค ช ท พ ฟ ซ ฮ" — is exactly these seven low halves in this order.

Caveat: the full `kh`, `ch`, `th`, `ph` and `s` groups have more than two members (ฆ ฃ ฅ; ฌ; ธ ฐ ฑ ฒ; ภ; ศ ษ), all taught in lessons 13-14. Only the ข/ค, ฉ/ช, ผ/พ, ฝ/ฟ, ส/ซ, ห/ฮ, ถ/ท sub-pairs are legal at lesson 12.

### B. By shape family — supported, but incomplete

`sceneGrammar.ts:confusablePairs` (27 entries) ships a `feature` taxonomy: `added-stroke`, `bump`, `head-direction`, `mirror`, `stroke-height`, `tail`, `top-ornament`. Lesson-12 letters fall out as:

| feature | pairs |
| --- | --- |
| added-stroke | ก~ถ, ล~ส |
| head-direction | ผ~พ, ฝ~ฟ |
| bump | ท~ห |
| tail | ข~ช |
| *(none)* | **ฉ** |

ฉ has no `confusablePairs` entry, so this grouping cannot cover all seven from data alone. The shapeCue supplies ฉ's reference (น) but no `feature` label.

### C. By district — supported but degenerate here

All seven are `district: "temple"` / `classType: High`. `sceneGrammar.ts:districtForClass` and `palace-places.json` back the district model, but as a *grouping* it produces one bucket of seven, which is the lesson's premise rather than a slide split.

### D. By sound type — supported, splits 4/3

`soundType.ts` ships the phonetic buckets. `ASPIRATED_STOP_PHONEMES = ["kh","ch","th","ph"]`, `FRICATIVE_PHONEMES = ["f","s","h"]`. Applied here:

- aspirated stop (`isAspirated: true`): ข ฉ ถ ผ
- fricative (`isAspirated: false`): ฝ ส ห

`soundType.ts:HIGH_CLASS_CONSONANTS` also ships the full 11-letter High list (ข ฃ ฉ ฐ ถ ผ ฝ ศ ษ ส ห) with the comment that these eleven are "the one genuine memorisation load in the class system" — the shipped soundCues for ข and ฉ already count themselves into it ("first face of the eleven", "second face of the temple's eleven").

### Recommendation

**Group by cousin pair (A), seven bullets, one per pair, ordered by the low half's familiarity.** It is the only grouping with an executable derivation in the repo, it matches the header's own stated framing, and it covers all seven letters with no gaps. Use (D) as a secondary split if the seven need to be broken across two slides (4 aspirated stops / 3 fricatives), and (B) only for the "telling cousins apart" slide, where it supplies the distinguishing feature for six of the seven.

The current skeleton already uses (A) on `seven-at-once` and a partial (B) on `telling-cousins-apart` — but its (B) treatment pairs ฝ against same-lesson ผ rather than against already-taught ฟ, which is the one place the prose departs from `confusablePairs`.

---

## Assets

**Images:** `content/lessons/images/lesson-12/` **does not exist**. (For comparison, `content/lessons/images/lesson-06/` holds 10 `.jpg` files.) Image directories exist only for `lesson-01` … `lesson-06` and `orientation`.

**`scene:` lines in the script: 0.** `grep -n '^scene:' content/lessons/lesson-12.md` returns nothing. There are also no `image:` lines. (Lesson 06 has 10 `image:` lines and 9 `scene:` lines.)

**Slide count: 11** — 6 `exposition`, 1 `rule`, 2 `retrieval`, 2 `reveal`.

Slide ids in order: `seven-at-once`, `why-the-doubles-exist`, `high-live-rule`, `rising-everywhere`, `telling-cousins-apart`, `ia-vowel`, `which-cousin`, `which-cousin-answer`, `which-letter`, `which-letter-answer`, `close`.

**Deck manifest:** `public/lessons/lesson-12/manifest.json` → `"assets": []`. Voice spec is present (`voiceId: "JBFqnCBsd6RMkjVDRZzb"`, `modelId: "eleven_multilingual_v2"`, stability 0.5 / similarity_boost 0.75 / speed 1.0). No slide in `deck.json` carries an `audio` or `image` key. Nothing is generated yet for this lesson.

**Reusable assets that do exist** (outside `content/lessons/images/`): all seven palace consonant scene images at `public/palace/consonants/<id>.jpg` and their narration clips at `public/palace/consonants/audio/<id>.mp3`, plus the 7 letter-name clips and 2 vowel clips under `public/audio/` listed above.
