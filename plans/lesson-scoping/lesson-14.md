# Scoping: lesson-14 — The rare tail

Source script: `content/lessons/lesson-14.md` (11 slides).
Shipped deck: `public/lessons/lesson-14/deck.json` (11 slides, `assets: []`).
All facts below verified against the working tree. **This is the highest-risk of the three lessons: four of its ten declared consonants have no example word, and three of them cannot have one.**

---

## Declares

### Header comment (`content/lessons/lesson-14.md`, lines 5-14), verbatim

```
previews: none
ranks: 1-2700
teaches: ฤ ๅ ฦ — the rare vowel signs; they live in rareVowels, not in a lessons-table row
```

Full header text:

> Task 4.3, final band 3 of 3. The ten rarest letters in one sitting — under one
> percent of running text between them, which is why the old course's four
> lessons here were the misallocation this phase removes. They are taught once,
> honestly, at the lowest scheduling priority, and the review queue carries them
> from here (AC2, AC3). The lesson also finishes the written vowels: the ua and
> uea families, and the four rare vowel signs.

### Lessons-table row (`src/domain/script/data/symbols.ts:3336-3346`)

```ts
number: 14,
title: "The Rare Tail",
focus:
    "The ten rarest letters, the rare vowel signs, and the ua/uea vowels",
consonants: ["ฐ", "ฎ", "ฏ", "ฑ", "ฒ", "ฬ", "ฆ", "ฃ", "ฅ", "ฌ"],
vowels: ["เ-ือ", "เ-ือะ", "-ัว", "-ัวะ"],
toneMarks: [],
toneRulesIntroduced: [],
specialRulesIntroduced: ["obsolete-consonants"],
```

**Consonants (10):** ฐ ฎ ฏ ฑ ฒ ฬ ฆ ฃ ฅ ฌ
**Vowels (4):** เ-ือ (sara uuea, long), เ-ือะ (sara uea, short), -ัว (sara uua, long), -ัวะ (sara ua, short)
**Tone marks:** none
**Tone rules:** **none** — this is the only one of the three final-band lessons that introduces no tone rule.
**Extra glyphs via `teaches:`:** ฤ ๅ ฦ

These ten are exactly `sequenceClosure.test.ts:DEMOTED_LETTERS` (`["ฬ","ฆ","ฑ","ฒ","ฐ","ฎ","ฏ","ฃ","ฅ","ฌ"]`).

### `rule:` slides in the script (1)

| slide | `rule:` id | shipped record |
| --- | --- | --- |
| `## rule obsolete-rule` | `obsolete-consonants` | `symbols.ts:629-636` — title `"Obsolete Consonants ฃ and ฅ"`; description `"ฃ (kho khuat) and ฅ (kho khon) are still counted in the 44-consonant alphabet but are not used in any modern Thai words."`; `lesson: 14` |

### Vowel records (`symbols.ts`)

- **เ-ือ** — `name: "sara uuea"`, `length: "long"`, `sound: "uuea (combination of สระ อื + สระ อะ)"`, `position: "left-above-right"`, `audioUrl: "/thai-script/audio/sara-eua-long.mp3"`, `priority: 26`, `lesson: 14`.
  `shapeCue: "Mast in front, the double-pinned ื above, and the ring after — a three-story spelling."`
  `soundCue: "The grin-vowel gliding open into ah."`
- **เ-ือะ** — `name: "sara uea"`, `length: "short"`, `sound: "uea (short combination of สระ อื + สระ อะ)"`, `position: "left-above-right"`, `audioUrl: "/thai-script/audio/sara-eua-short.mp3"`, `priority: 27`, `lesson: 14`.
  `shapeCue: "The three-story spelling with the stacked hooks appended."`
  `soundCue: "The same opening glide, cut off short."`
- **-ัว** — `name: "sara uua"`, `length: "long"`, `sound: "uua (combination of อู + อะ)"`, `position: "above"`, `audioUrl: "/thai-script/audio/sara-ua-long.mp3"`, `priority: 27`, `lesson: 14`.
  `shapeCue: "The lone curl above with ว standing after; when a final consonant joins, the curl vanishes and ว sits sandwiched between."`
  `soundCue: "Oo swinging open into ah — one long swing."`
- **-ัวะ** — `name: "sara ua"`, `length: "short"`, `sound: "ua (short combination of อู + อะ)"`, `position: "above"`, `audioUrl: "/thai-script/audio/sara-ua-short.mp3"`, `priority: 28`, `lesson: 14`.
  `shapeCue: "The curl, then ว, then the stacked hooks to close it off."`
  `soundCue: "The oo-ah swing pulled up short."`

**Conditional written form** (`sceneGrammar.ts:conditionalVowelForms`): `-ัว` ships one —

```ts
{ vowel: "-ัว", openForm: "-ัว", withFinalForm: "-ว-", example: "สวน" },
```

**The skeleton does not teach this closed form.** `เ-ือ` and `เ-ือะ` have no conditional-form entry.

### Rare vowel signs (`symbols.ts:2198-2232`, `rareVowels`)

Four records, not three — the `teaches:` line names three *characters* because `ฤๅ` and `ฦๅ` are ฤ/ฦ plus ๅ.

| character | name | pronunciation | length | notes |
| --- | --- | --- | --- | --- |
| ฤ | rue | `ร + สระ อึ (sometimes ร + สระ อิ)` | short | `"Used in some common words like ฤดู (rue-duu, season) and อังกฤษ (ang-grit, English). Written like ถ with an extra long line."` |
| ฤๅ | ruue | `ร + สระ อื` | long | `"Rare. Like ฤ with what looks like สระ อา on its right side."` |
| ฦ | lue | `ล + สระ อึ or สระ อื` | short | `"Extremely rare in modern Thai. Part of the official 32 vowels due to Sanskrit origins."` |
| ฦๅ | luue | `ล + สระ อื` | long | (record continues past the excerpt read) |

All four carry `lesson: 14`.

---

## Consonants

Prior teaching set (lessons 1-13): ม น ง ย ว ก ด บ ช ซ พ ฟ ค ท ฮ ร ล จ ต ป อ ข ฉ ถ ผ ฝ ส ห ศ ษ ภ ธ ณ ญ — 34 consonants.

### ฐ — ฐ ฐาน "base/platform"

- District **temple**; class **High**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "th (same as ถ)"`; `finalSound: "T-stop"`; `priority: 34`.
- `prompt` (id `tho-than`):
  > A carved stone pedestal standing empty in a temple hall, an ornate curve floating above its footed base, in the courtyard of a Thai temple with tiered golden roofs and white walls.
- `narration`:
  > The base. [pause] High class, so it belongs up at the temple. [pause] An upper curve like the plate's letter, floating over a separate footed base, head and curl beneath — The pedestal an image stands on in the temple hall. [pause] The same breathed th, raised on a pedestal — grand spellings favour it.
- `shapeCue`:
  > An upper จ-like curve floating over a separate footed base, head and curl beneath — the pedestal an image stands on in the temple hall.
- `soundCue`:
  > The same breathed th, raised on a pedestal — grand spellings favour it.
- **Shape ≈ จ** (lesson 9). Stated by shapeCue ("An upper จ-like curve"). **No `confusablePairs` entry for ฐ** — the shapeCue is the only shipped shape relationship.
- **Sound ≈ ถ** (lesson 12). Stated explicitly: `initialSound: "th (same as ถ)"`. Same class (High) and district (temple) as ถ — the only lesson-14 letter that pairs with a lesson-12 letter on both sound and class.

### ฎ — ฎ ชฎา "pointed crown/headdress"

- District **market**; class **Mid**; `hasDeadEnding: true`; `isAspirated: false`; `initialSound: "d (same as ด)"`; `finalSound: "T-stop"`; `priority: 36`.
- `prompt` (id `do-chada`):
  > An ornate pointed golden Thai crown resting on a velvet cushion at a silversmith's stall, a loop of chain hanging below it, in a Thai open-air market of wooden stalls under striped awnings, baskets of produce around.
- `narration`:
  > The pointed crown. [pause] Mid class, so you will find it in the market. [pause] The child's letter in regalia: the pointed bowl again, but its base line runs smooth into a loop hung below — a crown on its cushion at the silversmith's stall. [pause] A plain d to the ear, twin of the child's letter — kept for royal and Pali spellings, still flat, still mid.
- `shapeCue`:
  > ด in regalia: the pointed bowl again, but its base line runs smooth into a loop hung below — a crown on its cushion at the silversmith's stall.
- `soundCue`:
  > A plain d to the ear, twin of ด — kept for royal and Pali spellings, still flat, still mid.
- **Shape ≈ ด** (lesson 3). Stated by shapeCue. `confusablePairs` carries only `ฎ~ฏ`, a same-lesson pair.
- **Sound ≈ ด** (lesson 3). Stated explicitly: `"d (same as ด)"`. The `d` group is ด(Mid/L3) ฎ(Mid/L14) only — same class, same district.

### ฏ — ฏ ปฏัก "spear/goad"

- District **market**; class **Mid**; `hasDeadEnding: true`; `isAspirated: false`; `initialSound: "dt (same as ต)"`; `finalSound: "T-stop"`; `priority: 37`.
- `prompt` (id `to-patak`):
  > A long wooden cattle goad with an iron spear tip, a thick knuckle worked into the shaft near its base, in a Thai open-air market of wooden stalls under striped awnings, baskets of produce around.
- `narration`:
  > The spear. [pause] Mid class, so you will find it in the market. [pause] Like the pointed crown's letter, but a bump is worked into the base line before the loop — The knuckle on the goad's shaft. [pause] A flat unpuffed dt sharing duty with the turtle's letter — rare, royal, and still market-plain.
- `shapeCue`:
  > Like ฎ, but a bump is worked into the base line before the loop — the knuckle on the goad's shaft.
- `soundCue`:
  > A flat unpuffed dt sharing duty with ต — rare, royal, and still market-plain.
- **Shape ≈ ฎ (same lesson, not already taught).** Both the shapeCue and `confusablePairs` (`ฎ~ฏ [bump] "ฏ works an extra bump into the base line before the loop"`) anchor ฏ on ฎ. **No already-taught shape anchor in the data.** Transitively it reduces to ด via ฎ.
- **Sound ≈ ต** (lesson 9). Stated explicitly: `"dt (same as ต)"`. The `dt` group is ต(Mid/L9) ฏ(Mid/L14) only — same class, same district.

### ฑ — ฑ มณโฑ "Montho (literary character)"

- District **harbor**; class **Low**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "th (usually same as ท, sometimes d)"`; `finalSound: "T-stop"`; `priority: 40`.
- `prompt` (id `tho-montho`):
  > Queen Montho in a tall gilded Thai crown and court dress standing on a quay, shoulders squared, chin raised, on a fishing harbour quay, moored wooden longtail boats and drying nets behind.
- `narration`:
  > The Montho (literary character). [pause] Low class, so it lives down at the harbour. [pause] Like the soldier's letter, but a bump swells just after the head, before the upright — Queen Montho herself on the quay in her tall gilded crown, shoulders squared where the soldier's back climbs straight. [pause] The breathy th of the soldier's letter again — a palace name paying a rare call at the harbor.
- `shapeCue`:
  > Like ท, but a bump swells just after the head, before the upright — Queen Montho herself on the quay in her tall gilded crown, shoulders squared where the soldier's back climbs straight.
- `soundCue`:
  > The breathy th of ท again — a palace name paying a rare call at the harbor.
- **Shape ≈ ท** (lesson 7). Stated by shapeCue; `confusablePairs`: `ฑ~ท [bump] "ฑ puts a bump right after the head where ท goes straight up"`.
- **Sound ≈ ท** (lesson 7). Stated explicitly: `"th (usually same as ท, sometimes d)"`. Note the parenthetical: **ฑ is the only letter in the lesson whose sound is not single-valued.** The skeleton does not mention the `d` reading (it is what makes บัณฑิต *ban-dìt* rather than *ban-thìt*).
- ฑ's letter name **มณโฑ** contains ณ (lesson 13) and โ (lesson 9) — safe to print.

### ฒ — ฒ ผู้เฒ่า "elder/old man"

- District **harbor**; class **Low**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "th (same as ฑ and ท)"`; `finalSound: "T-stop"`; `priority: 41`.
- `prompt` (id `tho-phuthau`):
  > A stooped elderly man leaning on two walking canes on a stone quay, back bent, face deeply lined, on a fishing harbour quay, moored wooden longtail boats and drying nets behind.
- `narration`:
  > The elder. [pause] Low class, so it lives down at the harbour. [pause] Opens as the turtle's letter's notched bowl and closes into the horse's letter's shouldered loop — an elder stooped over two canes on the quay. [pause] A breathy th, rare and unhurried — The elder's soft th, low by the water.
- `shapeCue`:
  > Opens as ต's notched bowl and closes into ม's shouldered loop — an elder stooped over two canes on the quay.
- `soundCue`:
  > A breathy th, rare and unhurried — the elder's soft th, low by the water.
- **Shape ≈ ต (lesson 9) + ม (lesson 1)** — a two-letter composition, not a single-letter resemblance. Stated by shapeCue. **No `confusablePairs` entry for ฒ.**
- **Sound ≈ ท** (lesson 7), via ฑ. Stated explicitly: `"th (same as ฑ and ท)"` — the only lesson-14 `initialSound` that names a same-lesson letter first.

### ฬ — ฬ จุฬา "star-shaped kite"

- District **harbor**; class **Low**; `hasDeadEnding: false` (**the only letter in this lesson with no dead ending** — the other nine are all `true`); `isAspirated: false`; `initialSound: "l (same as ล)"`; `finalSound: "n (live ending)"`; `priority: 38`.
- `prompt` (id `lo-jula`):
  > A star-shaped kite high above the masts, its long tail snapping and coiling into an extra curl at the end, on a fishing harbour quay, moored wooden longtail boats and drying nets behind.
- `narration`:
  > The star-shaped kite. [pause] Low class, so it lives down at the harbour. [pause] Like the offering tray's letter, but the last stroke coils on into an extra curled tail — a star kite's tail snapping above the masts. [pause] A second l, flown high on its kite string yet berthed low at the harbor.
- `shapeCue`:
  > Like พ, but the last stroke coils on into an extra curled tail — a star kite's tail snapping above the masts.
- `soundCue`:
  > A second l, flown high on its kite string yet berthed low at the harbor.
- **Shape ≈ พ** (lesson 5). Stated by shapeCue; `confusablePairs`: `พ~ฬ [added-stroke] "ฬ ends in an extra curled tail that พ never grows"`. Note this is a **shape** neighbour whose sound is unrelated — the lesson's clearest case of shape and sound pulling apart.
- **Sound ≈ ล** (lesson 8). Stated explicitly: `"l (same as ล)"`. The `l` group is ล(Low/L8) ฬ(Low/L14) only.
- The skeleton calls ฬ "the harbor l of กีฬา" but does not state the พ shape link.

### ฆ — ฆ ระฆัง "bell"

- District **harbor**; class **Low**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "kh (same as ค and ข)"`; `finalSound: "K-stop"`; `priority: 39`.
- `prompt` (id `kho-rakhang`):
  > A big bronze ship's bell slung on a rope beside a mooring post, swinging mid-strike, on a fishing harbour quay, moored wooden longtail boats and drying nets behind.
- `narration`:
  > The bell. [pause] Low class, so it lives down at the harbour. [pause] Like the horse's letter, but an extra bumped curve swells in after the head — a ship's bell slung beside the mooring rope. [pause] A breathy kh in harbor bronze — strike it and the note hums away low.
- `shapeCue`:
  > Like ม, but an extra bumped curve swells in after the head — a ship's bell slung beside the mooring rope.
- `soundCue`:
  > A breathy kh in harbor bronze — strike it and the note hums away low.
- **Shape ≈ ม** (lesson 1). Stated by shapeCue; `confusablePairs`: `ฆ~ม [added-stroke] "ฆ adds a bumped curve after the head that ม lacks"`. Another shape/sound split — ม is an m, ฆ is a kh.
- **Sound ≈ ค** (lesson 6) and **ข** (lesson 12). Stated explicitly: `"kh (same as ค and ข)"`. ค shares ฆ's class and district.

### ฃ — ฃ ขวด "bottle"

- District **temple**; class **High**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "kh (same as ข)"`; `finalSound: "K-stop"`; `priority: 42`.
- **No `audioUrl` field on this record.**
- `prompt` (id `khaaw-khuat`):
  > A glass bottle with a chipped rim standing on a dusty temple storeroom shelf, in the courtyard of a Thai temple with tiered golden roofs and white walls.
- `narration`:
  > The bottle. [pause] High class, so it belongs up at the temple. [pause] Like the egg's letter, but a notch cut into the top stroke — a bottle with a chipped rim, shelved in the temple storeroom. [pause] A breathy kh no modern word still spells — everything it once held now pours from the egg's letter.
- `shapeCue`:
  > Like ข, but a notch cut into the top stroke — a bottle with a chipped rim, shelved in the temple storeroom.
- `soundCue`:
  > A breathy kh no modern word still spells — everything it once held now pours from ข.
- **Shape ≈ ข** (lesson 12). Stated by shapeCue; `confusablePairs`: `ข~ฃ [bump] "ฃ cuts a notch into the top stroke that ข keeps smooth"`.
- **Sound ≈ ข** (lesson 12). Stated explicitly: `"kh (same as ข)"`. Same class, same district — ฃ is ข's exact twin in every field but the glyph.

### ฅ — ฅ คน "person"

- District **harbor**; class **Low**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "kh (same as ค)"`; `finalSound: "K-stop"`; `priority: 43`.
- **No `audioUrl` field on this record.**
- `prompt` (id `khaaw-khon`):
  > A weathered old person in a dented flat cap sitting on a crate watching the water, hands on his knees, on a fishing harbour quay, moored wooden longtail boats and drying nets behind.
- `narration`:
  > The person. [pause] Low class, so it lives down at the harbour. [pause] Like the water buffalo's letter, but a notch cut into the top stroke — a retired stevedore in a dented cap, sitting out the day at the harbor. [pause] A breathy kh retired from every modern spelling — The word for person sailed on with the water buffalo's letter.
- `shapeCue`:
  > Like ค, but a notch cut into the top stroke — a retired stevedore in a dented cap, sitting out the day at the harbor.
- `soundCue`:
  > A breathy kh retired from every modern spelling — the word for person sailed on with ค.
- **Shape ≈ ค** (lesson 6). Stated by shapeCue; `confusablePairs`: `ค~ฅ [bump] "ฅ cuts a notch into the top stroke that ค keeps smooth"`.
- **Sound ≈ ค** (lesson 6). Stated explicitly: `"kh (same as ค)"`. Same class, same district — ฅ is ค's exact twin.
- ฃ and ฅ form a perfectly symmetric pair: both are "a notch cut into the top stroke" of their living twin, one temple and one harbor. That symmetry is shipped in both shapeCues and both `confusablePairs` details, word for word.

### ฌ — ฌ เฌอ "tree"

- District **harbor**; class **Low**; `hasDeadEnding: true`; `isAspirated: true`; `initialSound: "ch (same as ช)"`; `finalSound: "T-stop"`; `priority: 44` (**the last of all 44**).
- **No `audioUrl` field on this record.**
- `prompt` (id `chaaw-chooe`):
  > A young sapling tree tied to its supporting stake beside a harbour wall, one branch flicking up above the rest, on a fishing harbour quay, moored wooden longtail boats and drying nets behind.
- `narration`:
  > The tree. [pause] Low class, so it lives down at the harbour. [pause] A low arch first, then the taller stroke of the elephant's letter, with its flicked tail — a sapling planted beside its stake at the harbor wall. [pause] A breathy ch surviving in a handful of borrowed spellings — and its own name is an old word for tree.
- `shapeCue`:
  > A low arch first, then the taller ช-style stroke with its flicked tail — a sapling planted beside its stake at the harbor wall.
- `soundCue`:
  > A breathy ch surviving in a handful of borrowed spellings — เฌอ itself is an old word for tree.
- **Shape ≈ ช** (lesson 4). Stated by shapeCue ("the taller ช-style stroke"). **No `confusablePairs` entry for ฌ.**
- **Sound ≈ ช** (lesson 4). Stated explicitly: `"ch (same as ช)"`. The `ch` group is ช(Low/L4) ฉ(High/L12) ฌ(Low/L14); ช shares ฌ's class and district.
- Note the `soundCue` in `symbols.ts` prints **เฌอ** — the letter's own name, which contains เ, ฌ and อ. The `consonant-scenes.json` narration paraphrases it away ("its own name is an old word for tree"), so the palace narration avoids the spelling and the symbols.ts cue does not.

### Summary table

| letter | class / district | shape ≈ (already taught) | stated where | sound ≈ (already taught) | stated where |
| --- | --- | --- | --- | --- | --- |
| ฐ | High / temple | จ (L9) | shapeCue only (no confusablePairs entry) | ถ (L12) | `initialSound` |
| ฎ | Mid / market | ด (L3) | shapeCue only | ด (L3) | `initialSound` |
| ฏ | Mid / market | **none already taught** — only ฎ, same lesson | shapeCue + confusablePairs `ฎ~ฏ` | ต (L9) | `initialSound` |
| ฑ | Low / harbor | ท (L7) | shapeCue + confusablePairs | ท (L7) | `initialSound` |
| ฒ | Low / harbor | ต (L9) + ม (L1), composed | shapeCue only (no confusablePairs entry) | ท (L7), via ฑ | `initialSound` |
| ฬ | Low / harbor | พ (L5) | shapeCue + confusablePairs | ล (L8) | `initialSound` |
| ฆ | Low / harbor | ม (L1) | shapeCue + confusablePairs | ค (L6) / ข (L12) | `initialSound` |
| ฃ | High / temple | ข (L12) | shapeCue + confusablePairs | ข (L12) | `initialSound` |
| ฅ | Low / harbor | ค (L6) | shapeCue + confusablePairs | ค (L6) | `initialSound` |
| ฌ | Low / harbor | ช (L4) | shapeCue only (no confusablePairs entry) | ช (L4) | `initialSound` |

**Every one of the ten states its sound cousin explicitly in `initialSound`** — unlike lessons 12 and 13, where most sound links had to be derived. **Five of the ten name the same letter for both shape and sound** — ฎ↔ด, ฑ↔ท, ฃ↔ข, ฅ↔ค, ฌ↔ช — which makes them the cheapest half of the lesson to state. The other five split: ฐ (shape จ / sound ถ), ฏ (shape ฎ / sound ต), ฒ (shape ต+ม / sound ท), **ฬ (shape พ / sound ล)** and **ฆ (shape ม / sound ค)**. ฬ and ฆ are the sharpest of those splits: their shape neighbour is phonetically unrelated in both cases, so a learner who reads them by shape gets the sound wrong.

Three letters have **no `confusablePairs` entry at all**: ฐ, ฒ, ฌ.

---

## Shipped recordings (each path confirmed with `ls`)

**Seven of ten exist. Three do not.**

| letter | scene id | expected path | `ls` result |
| --- | --- | --- | --- |
| ฐ | tho-than | `public/audio/consonant-tho-than.mp3` | EXISTS |
| ฎ | do-chada | `public/audio/consonant-do-chada.mp3` | EXISTS |
| ฏ | to-patak | `public/audio/consonant-to-patak.mp3` | EXISTS |
| ฑ | tho-montho | `public/audio/consonant-tho-montho.mp3` | EXISTS |
| ฒ | tho-phuthau | `public/audio/consonant-tho-phuthau.mp3` | EXISTS |
| ฬ | lo-jula | `public/audio/consonant-lo-jula.mp3` | EXISTS |
| ฆ | kho-rakhang | `public/audio/consonant-kho-rakhang.mp3` | EXISTS |
| **ฃ** | khaaw-khuat | `public/audio/consonant-khaaw-khuat.mp3` | **MISSING** |
| **ฅ** | khaaw-khon | `public/audio/consonant-khaaw-khon.mp3` | **MISSING** |
| **ฌ** | chaaw-chooe | `public/audio/consonant-chaaw-chooe.mp3` | **MISSING** |

**There is no `public/audio/consonant-*.mp3` for ฃ, ฅ or ฌ.** This is not a naming guess on my part — those three `ThaiConsonant` records carry **no `audioUrl` field at all**, which is consistent: `public/audio/` holds 42 `consonant-*.mp3` files for 44 letters, and these are the missing entries. Do not invent a path for any of the three.

Variants also checked with `ls` and confirmed absent: `consonant-kho-khuat.mp3`, `consonant-kho-khon.mp3`.

**One unreferenced file exists: `public/audio/consonant-cho-cho.mp3`.** It is present on disk (added in commit `069ade83 "feat: add audio"`) and is referenced by **nothing** in `src/` or `scripts/`. It is plausibly ฌ under an older romanisation, but **no shipped data claims that**, and I could not determine which letter it holds. Treat it as unidentified: do not wire it to ฌ without listening to it or finding a manifest that maps it.

**Vowel recordings** — all four exist: `public/audio/sara-eua-long.mp3`, `public/audio/sara-eua-short.mp3`, `public/audio/sara-ua-long.mp3`, `public/audio/sara-ua-short.mp3`.

**No recordings exist for the rare vowel signs ฤ, ๅ, ฦ.** There is no `public/audio/` file for any of them; the `rareVowels` records carry no `audioUrl` field.

**Palace assets — all ten letters have both an image and a narration clip, including the three with no `consonant-*.mp3`:**

`public/palace/consonants/{tho-than,do-chada,to-patak,tho-montho,tho-phuthau,lo-jula,kho-rakhang,khaaw-khuat,khaaw-khon,chaaw-chooe}.jpg` — all 10 confirmed present.
`public/palace/consonants/audio/{same ten}.mp3` — all 10 confirmed present, and all ten are listed in `public/palace/consonants/audio/manifest.json` with byte counts and digests (e.g. `"chaaw-chooe": {"bytes": 170780, "char": "ฌ", "digest": "77f095fa7c1b2d93", "file": "chaaw-chooe.mp3"}`).

So **the palace narration audio for ฃ ฅ ฌ exists and is manifest-verified; only the letter-name clip under `public/audio/` is missing.** These are two different asset stores serving different things — do not substitute one path for the other without checking what the consumer expects.

**Lesson-level assets:** `public/lessons/lesson-14/manifest.json` has `"assets": []`; no deck slide carries `audio` or `image`. Nothing generated yet.

---

## Example words and ranks

Declared window: **1-2700** — the widest of the three, and it is needed: two words sit above 1900.

| word | romanisation (corpus) | English (corpus) | rank | Thai chars | in window? |
| --- | --- | --- | --- | --- | --- |
| ตัว | dtua | body | 92 | 3 | yes |
| เดือน | duuean | month | 129 | 5 | yes |
| เมือง | muueang | town | 201 | 5 | yes |
| พัฒนา | phát thá naa | develop | 336 | 5 | yes |
| อังกฤษ | ang-grìt | England | 409 | 6 | yes |
| รัฐ | rát | state | 462 | 3 | yes |
| ปฏิบัติ | bpà dtì bàt | practice; perform | 497 | 7 | yes |
| เรือ | ruuea | boat | 516 | 4 | yes |
| หัว | hǔua | head | 553 | 3 | yes |
| ฐาน | thǎan | base | 1051 | 3 | yes |
| โฆษณา | khôot sà naa | commercial | 1146 | 5 | yes |
| เสือ | sǔuea | tiger | 1260 | 4 | yes |
| ฤดู | rúe duu | season | 1315 | 3 | yes |
| กีฬา | gii-laa | sports | 1966 | 4 | yes |
| บัณฑิต | ban dìt | graduate | 2340 | 6 | yes |
| เมฆ | mêek | cloud | 2638 | 3 | yes |

**No word is outside the window and none is absent from the corpus.** 16 words — the most of the three lessons.

**Window headroom is thin.** เมฆ at 2638 sits 62 ranks below the declared ceiling of 2700, and บัณฑิต at 2340 is the next. If the window is ever narrowed, or if a rewrite substitutes a rarer word for either, the gate fails. The two words carrying ฆ and ฑ are the two closest to the edge, and each is that letter's only example.

Duplicate-key caveat — **one** of the sixteen has a duplicated `thai` key: **เมือง** has rank 200 `"city"` and rank 201 `"town"`. The last wins, so the test sees 201, which is what the table above reports. The skeleton glosses it "city or town", covering both. No other word in this lesson is duplicated.

Gloss notes: corpus **เมือง** = `"town"` (skeleton: "city or town"); corpus **อังกฤษ** = `"England"` (skeleton: "English"); corpus **กีฬา** = `"sports"` (skeleton: "sport"); corpus **บัณฑิต** carries `word_class: "v"` despite the gloss `"graduate"`.

---

## Risks

### 1. Declared symbols with NO example word — **four of ten**

This is the lesson's defining risk. Checked programmatically against `public/lessons/lesson-14/deck.json`: every `≥2`-character Thai run that resolves to a `vocabulary.json` entry, mapped back to the declared letters.

| letter | corpus words in the skeleton containing it |
| --- | --- |
| ฐ | ฐาน (1051), รัฐ (462) |
| ฏ | ปฏิบัติ (497) |
| ฑ | บัณฑิต (2340) |
| ฒ | พัฒนา (336) |
| ฬ | กีฬา (1966) |
| ฆ | เมฆ (2638), โฆษณา (1146) |
| **ฎ** | **NONE — bare glyph mentions only** |
| **ฃ** | **NONE — bare glyph mentions only** |
| **ฅ** | **NONE — bare glyph mentions only** |
| **ฌ** | **NONE — bare glyph mentions only** |

What the skeleton says about each of the four:

- ฎ: *"ฎ is its market d twin, and both wear a crown-like base."* Named beside ฏ, never exemplified.
- ฃ / ฅ: *"ฃ (temple kh) and ฅ (harbor kh) sit in every alphabet chart and in no modern word."*
- ฌ: *"ฌ is the rarest consonant in the alphabet; outside a handful of ceremonial words you will meet it on charts and nowhere else."*

**Which of the four are fixable:**

- **ฎ is fixable.** The corpus holds 14 ranked words containing ฎ; two are inside the 1-2700 window: `กฎหมาย` (rank 515, `gòt mǎai`, `"law"`, 6 chars) and `กฎ` (rank 1058, `gòt`, `"rule; regulation"`, **2 chars — short-word risk**). `กฎหมาย` is the safe choice on both counts. Caution: `กฎ` is the shipped example on the `โ-ะ` conditional-form record (`sceneGrammar.ts`, `withFinalForm: "--"`, `example: "กฎ"`) and on the `unwritten-vowels` special rule, both filed under lesson 26 — using it here would preview that pattern.
- **ฃ, ฅ and ฌ are NOT fixable.** Corpus occurrences: **ฃ = 0, ฅ = 0, ฌ = 0** ranked words. There is no Thai word in `vocabulary.json` containing any of the three. For ฃ and ฅ that is the point of the lesson — the `obsolete-consonants` rule states it as fact. For ฌ it is a corpus limit, not a language fact (เฌอ exists but is not in the corpus).

**What the shipped tests do and do not assert:**

`sequenceClosure.test.ts` — the test that covers lessons 12-14 — has **no "uses everything it declares" assertion.** That check exists only in `middleBand.test.ts`, whose `BAND` is `lesson-06` … `lesson-11`. What `sequenceClosure.test.ts` does assert for these lessons is:

- every declared word resolves inside the rank window (`"the authored lessons resolve their example words inside the declared rank window"`, `checked > 4`);
- no forward reference (AC6), which scans **characters**, so a bare glyph mention satisfies it;
- every consonant is filed under exactly one lessons-table row, and each of the ten demoted letters generates review cards (`AC2`, `AC3`).

So the current four-letter gap **does not fail any shipped test today** — but the brief's premise is right that a symbol-usage assertion would catch it, and `middleBand.test.ts` contains exactly that assertion for the neighbouring band. If the final band is ever brought under the same check, ฎ ฃ ฅ ฌ would each need a Thai run of length ≥ 1 in the deck prose — which the character-level check already has (all ten glyphs are printed), so even that check would pass. **The gap is pedagogical, not test-breaking.** Recording it here so the decision is deliberate.

Character-level coverage confirmed against the deck: **DECLARED-BUT-UNUSED = none** — all 19 declared characters (ฃ ฅ ฆ ฌ ฎ ฏ ฐ ฑ ฒ ฤ ฦ ว ฬ อ ะ ั ื เ ๅ) appear in the deck prose.

**Rare vowel signs:** ฤ has two examples (ฤดู 1315, อังกฤษ 409). **ๅ and ฦ have none** — the skeleton mentions both only in the abstract ("Lengthen it with ๅ and you get the long form; ฦ and its long form are its l-shaped mates"). ฦ has **0** corpus occurrences, so no example is possible. ๅ occurs only inside ฤๅ/ฦๅ and in the letter name ฤๅษี.

**Vowels:** -ัว has two examples (ตัว 92, หัว 553); เ-ือ has four (เสือ 1260, เรือ 516, เดือน 129, เมือง 201). **-ัวะ and เ-ือะ have none** — the skeleton says "Each has a clipped short mate, -ัวะ and เ-ือะ, both rare on the page."

**The closed form of -ัว is neither taught nor exemplified.** `conditionalVowelForms` ships `-ัว` → `-ว-` with `example: "สวน"`, and the `-ัว` shapeCue states it ("when a final consonant joins, the curl vanishes and ว sits sandwiched between"). The skeleton's `ua-uea` slide teaches only the open form. This is a shipped fact the lesson currently drops — and the parallel case in lesson 13 (เ-อ → เ-ิ) *is* taught there, so the omission is inconsistent across the band.

### 2. SHORT-WORD RISK (under 3 Thai characters)

**None.** Every one of the sixteen example words is 3 Thai characters or longer. The shortest are ตัว, รัฐ, ฐาน, เมฆ, ฤดู and หัว at 3 each.

This is the only one of the three final-band lessons with no short-word exposure — lesson 12 has three 2-character words and lesson 13 has three.

Caveat for any rewrite: the obvious ฎ fix has a short trap. `กฎ` (rank 1058) is 2 characters and would introduce the risk this lesson currently avoids; `กฎหมาย` (rank 515, 6 characters) does not. The mechanics, for reference: `vendor.py` carriers any Thai under `CARRIER_LIMIT = 12` normalised characters, so short words synthesise; the exposure is `pipeline.py:transcript_matches` at `TRANSCRIPT_MATCH_RATIO = 0.9`, which on a 2-character string admits no partial credit (one of two matching scores 0.5), against `RETRY_SEEDS` of 8 attempts.

### 3. Genuinely rare or archaic letters — **all ten, in three tiers**

This lesson *is* the rare tail. The data separates it into three distinct tiers, and the skeleton treats them differently.

**Tier 1 — rare but live (7 letters).** Present in modern spelling, mostly inside borrowings.

| letter | scheduling priority (of 44) | corpus occurrences (any position) | ranked corpus words |
| --- | --- | --- | --- |
| ฐ | 34 | 30 | 28 |
| ฎ | 36 | 16 | 14 |
| ฏ | 37 | 15 | 13 |
| ฬ | 38 | 13 | 5 |
| ฆ | 39 | 11 | 9 |
| ฑ | 40 | 10 | 8 |
| ฒ | 41 | 8 | 8 |

(Occurrence counts from the same any-position sweep `symbolPriority.ts` uses — every character slot in every entry's `characters` array. Denominator across all characters counted: 31,960 slots. For scale: ส is 807, ห is 703, ข is 370.)

**Tier 2 — retired (2 letters).** ฃ (priority 42) and ฅ (priority 43): **0 corpus occurrences each**, and the `obsolete-consonants` rule states outright that they "are not used in any modern Thai words". The skeleton's treatment: *"They are still letters of the alphabet, so they are still in your deck — at the very back of the queue."*

**Tier 3 — rarest of all (1 letter).** ฌ, priority **44 of 44**, **0 corpus occurrences**. Unlike ฃ and ฅ it is not formally obsolete — it survives in a few borrowed spellings — but this corpus does not contain one. The skeleton: *"ฌ is the rarest consonant in the alphabet; outside a handful of ceremonial words you will meet it on charts and nowhere else."*

**How much attention the skeleton says they deserve:** the header calls them *"under one percent of running text between them, which is why the old course's four lessons here were the misallocation this phase removes"* and *"They are taught once, honestly, at the lowest scheduling priority"*. The opening slide: *"ten letters that together carry less than one word in a hundred. You need to recognise them; you will rarely write them."* and *"The review queue schedules these at the lowest priority. They stay in the deck forever, but they will never crowd out the letters that carry the language."*

That claim is backed by the data, though the shipped measure is not quite "one word in a hundred": the ten letters account for **103 of 31,960 character slots** in the corpus's `characters` arrays (0.32%). `sequenceClosure.test.ts` encodes the claim as a floor — every demoted letter must have `getSchedulingPriority(letter) > 33` — and all ten satisfy it (34, 36, 37, 38, 39, 40, 41, 42, 43, 44; 35 is ฮ, which is not demoted).

The rare **vowel** signs get the same treatment and the skeleton is explicit: *"Treat all four as spellings to recognise, not machinery to learn rules for."* ฦ has 0 corpus occurrences; ฤ has 15 ranked corpus words, five of them inside the 1-2700 window.

### 4. Additional findings not in the three required categories

- **Vowel-pattern fragments are exempted by the shipped test, conditionally.** Printing this lesson's four vowel patterns produces four Thai runs that the naive word-extractor reads as words and that are **absent from vocabulary.json**: `ัว` (from `-ัว`), `ัวะ` (from `-ัวะ`), `ือ` (from `เ-ือ`), `ือะ` (from `เ-ือะ`). All four contain a `ก-ฮ` character (ว or อ). `sequenceClosure.test.ts:145` `patternFragments()` exempts them by deriving the exempt set from `lessons[].vowels` and `rareVowels`. **This holds only while each pattern is written exactly as its lessons-table row spells it** — `-ัว`, `-ัวะ`, `เ-ือ`, `เ-ือะ`. Any other placeholder spelling turns the fragment into an unresolvable word and fails the rank gate. This lesson has four such patterns, more than lesson 12 (two) or lesson 13 (one), so it is the most exposed to that spelling constraint.
  `ฤ`, `ๅ` and `ฦ` written singly and space-separated produce length-1 runs and are safe either way; `ฤๅ` written as one token would be a 2-character run, exempt only because `rareVowels` declares `"ฤๅ"` as a character.
- **ฐ, ฒ and ฌ have no `confusablePairs` entry**, so their shape story rests on the `shapeCue` alone. ฒ's cue is a two-letter composition (ต + ม) rather than a single resemblance, which is the hardest of the ten to state briefly.
- **ฏ has no already-taught shape anchor.** Both its `shapeCue` and its `confusablePairs` entry anchor it on ฎ, introduced in the same lesson. ฎ must be presented before ฏ for the shape claim to be available — which the skeleton does, but only in passing ("ฎ is its market d twin").
- **ฑ's sound is not single-valued.** `initialSound: "th (usually same as ท, sometimes d)"`. The lesson's own example บัณฑิต (*ban-dìt*) uses the **d** reading, which the skeleton does not flag; a learner applying the stated "th of ท" rule to บัณฑิต gets the wrong reading.
- **The skeleton's crown-twins retrieval asserts a claim the data confirms.** `"ฏ is dt, exactly as ต is, and it sits in the market. The twins change no sound and no class"` — verified: ฏ is `Mid`/`market`/`"dt (same as ต)"`, ต is `Mid`/`market`; ฎ is `Mid`/`market`/`"d (same as ด)"`, ด is `Mid`/`market`. Correct on both counts.
- **`ฌ`'s `soundCue` in `symbols.ts` prints the spelling เฌอ**, whereas the `consonant-scenes.json` narration deliberately avoids it. Whichever is rendered, เฌอ is spelled entirely from characters taught by this point (เ from lesson 7, ฌ here, อ from lesson 11), so it does not forward-reference — but it is not a corpus word, so printing it in deck prose would produce an unresolvable 3-character run and **fail** the rank gate. Do not put เฌอ in the lesson prose.

---

## Grouping proposal

Ten letters — the largest group in the course — plus four vowels and three rare signs. Five groupings are supported by shipped data.

### A. By district — **4-way-ish split; the only grouping that separates all three classes**

Unlike lessons 12 (all temple) and 13 (2 temple / 4 harbor), this lesson spans **all three districts**:

| district | class | letters |
| --- | --- | --- |
| temple | High | ฐ, ฃ |
| market | Mid | ฎ, ฏ |
| harbor | Low | ฑ, ฒ, ฬ, ฆ, ฅ, ฌ |

Evidence: `classType` and `sceneMnemonic.district` on each `ThaiConsonant`; `sceneGrammar.ts:districtForClass`; the palace prompts in `consonant-scenes.json` stage ฐ and ฃ in the temple courtyard, ฎ and ฏ at market stalls, and the other six on the harbour quay — so the shipped artwork already carries this split and it is the only grouping the images themselves encode.

Weakness: the harbor bucket holds six of ten, which is not much of a reduction.

### B. By sound cousin (phoneme group) — **complete, and stated in every record**

This lesson is the one where the data does the work for you: **all ten `initialSound` fields name their cousin explicitly.** Derived the same way `middleBand.test.ts:cousinPairs()` derives it:

| phoneme | this lesson | already taught |
| --- | --- | --- |
| th | ฐ, ฑ, ฒ | ท (L7), ถ (L12), ธ (L13) |
| kh | ฆ, ฃ, ฅ | ค (L6), ข (L12) |
| d | ฎ | ด (L3) |
| dt | ฏ | ต (L9) |
| l | ฬ | ล (L8) |
| ch | ฌ | ช (L4) |

Six groups; the two largest (th with 3, kh with 3) account for six of the ten letters. This is the tightest grouping available and it covers every letter with a data-stated anchor.

### C. By shape family — supported for seven of ten

`sceneGrammar.ts:confusablePairs` `feature` values, restricted to this lesson:

| feature | pairs |
| --- | --- |
| bump | ฎ~ฏ, ฑ~ท, ข~ฃ, ค~ฅ |
| added-stroke | พ~ฬ, ฆ~ม |
| *(no entry)* | **ฐ, ฒ, ฌ** |

The `bump` family is strikingly coherent: **four of the ten letters differ from a neighbour by exactly one bump or notch**, and two of those four (ฃ, ฅ) are the retired pair whose details are worded identically ("cuts a notch into the top stroke that X keeps smooth"). ฏ's bump is against ฎ, same-lesson.

Three letters (ฐ ฒ ฌ) cannot be placed from `confusablePairs` at all; their `shapeCue`s name จ, ต+ม and ช respectively.

### D. By status — **the three-tier split the lesson's own rule requires**

Not a field, but derivable from two shipped sources and the only grouping that separates what the `obsolete-consonants` rule is about:

| tier | letters | evidence |
| --- | --- | --- |
| rare but live | ฐ ฎ ฏ ฑ ฒ ฬ ฆ | non-zero corpus occurrence; priorities 34-41 |
| retired | ฃ ฅ | `specialRules` `obsolete-consonants` (`lesson: 14`) names exactly these two; 0 corpus occurrences |
| rarest surviving | ฌ | priority 44 of 44; 0 corpus occurrences; not named by `obsolete-consonants` |

Evidence: `symbols.ts:629-636` for the two-letter obsolete set; `symbolPriority.ts` derivation and the `priority` field for the ordering; the corpus counts above. The skeleton already uses a 3/2-ish version of this on `the-long-tail` ("ฐ ฎ ฏ ฑ ฒ (mostly inside borrowed spellings), ฬ ฆ ฌ (rare doubles of ล ค ช), and ฃ ฅ — two letters modern Thai has retired outright"), but it files ฌ with the "rare doubles" rather than as its own tier.

### E. By scheduling priority — a strict order, fully derived

`priority` on each record, which `symbolPriority.ts` derives from any-position corpus frequency with deterministic tie-breaking: **ฐ 34, ฎ 36, ฏ 37, ฬ 38, ฆ 39, ฑ 40, ฒ 41, ฃ 42, ฅ 43, ฌ 44.** (35 is ฮ, not in this lesson.) This is an ordering rather than a grouping, but it is the only one the review queue actually consumes, and `sequenceClosure.test.ts` asserts every one of the ten is `> 33`.

### Recommendation

**Group by status (D) at the top level — three tiers — and by sound cousin (B) inside the first tier.**

(D) is the grouping the lesson's single declared rule is about: `obsolete-consonants` names ฃ and ฅ and nothing else, so a lesson that does not separate them from the other eight is teaching its own rule against the grain. It also lets each tier state the right promise: recognise-and-move-on for tier 1, chart-only for tiers 2 and 3.

(B) is the right inner grouping because **every one of the ten names its cousin in `initialSound`** — no derivation, no authored claim. It also compresses the six tier-1 letters into four lines (th×3, kh×1, d×1, dt×1, l×1, ch — with ฆ's kh and ฌ's ch falling into tiers 1 and 3 respectively).

Use (A) only where the artwork is shown — it is what the palace images encode, and it is the only grouping in which this lesson touches the market district at all (ฎ, ฏ are the course's last two Mid-class letters).

Use (C) for the `where-they-hide` / shape-telling material, but note it covers only seven of ten and that ฏ's anchor is same-lesson. Do **not** promise a shape rule for ฐ, ฒ or ฌ — the data has none.

**Ordering within any grouping should follow (E)**, since that is the order the review queue will actually present them in, and the lesson explicitly promises "at the very back of the queue" for ฃ and ฅ — a promise (E) makes literally true (42, 43) and ฌ makes truer still (44).

---

## Assets

**Images:** `content/lessons/images/lesson-14/` **does not exist**. Image directories exist only for `lesson-01` … `lesson-06` and `orientation`.

**`scene:` lines in the script: 0.** `grep -n '^scene:' content/lessons/lesson-14.md` returns nothing; there are also no `image:` lines. (For contrast, `content/lessons/lesson-06.md` has 10 `image:` lines and 9 `scene:` lines, with 10 `.jpg` files in its directory.)

**Slide count: 11** — 6 `exposition`, 1 `rule`, 2 `retrieval`, 2 `reveal`.

Slide ids in order: `the-long-tail`, `where-they-hide`, `obsolete-rule`, `the-retired-two`, `ua-uea`, `rare-vowel-signs`, `spot-the-rare`, `spot-the-rare-answer`, `crown-twins`, `crown-twins-answer`, `close`.

Note the density: 11 slides carry 10 consonants, 4 vowels and 3 rare signs — 17 declared symbols, against lesson 12's 9 over 11 slides and lesson 13's 10 over 15 slides. Two exposition slides (`where-they-hide`, `rare-vowel-signs`) carry eight of the ten consonants and all three rare signs between them.

**Deck manifest:** `public/lessons/lesson-14/manifest.json` → `"assets": []`. Voice spec present (`voiceId: "JBFqnCBsd6RMkjVDRZzb"`, `modelId: "eleven_multilingual_v2"`, stability 0.5 / similarity_boost 0.75 / speed 1.0). No slide carries `audio` or `image`. Nothing generated yet.

**Reusable assets that do exist:**
- All 10 palace consonant scene images at `public/palace/consonants/<id>.jpg`, with prompts and seeds recorded in `public/palace/consonants/manifest.json`.
- All 10 palace narration clips at `public/palace/consonants/audio/<id>.mp3`, with bytes and digests in `public/palace/consonants/audio/manifest.json`.
- 7 of 10 letter-name clips under `public/audio/consonant-*.mp3` — **ฃ, ฅ and ฌ have none.**
- All 4 vowel clips under `public/audio/sara-*.mp3`.
- **No audio exists for ฤ, ๅ or ฦ.**
