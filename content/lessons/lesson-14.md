# The rare tail

lesson: lesson-14

<!--
Task 4.3, final band 3 of 3. The ten rarest letters in one sitting — under one
percent of running text between them, which is why the old course's four
lessons here were the misallocation this phase removes. They are taught once,
honestly, at the lowest scheduling priority, and the review queue carries them
from here (AC2, AC3). The lesson also finishes the written vowels: the ua and
uea families, and the four rare vowel signs.
previews: none
ranks: 1-2700
teaches: ฤ ๅ ฦ — the rare vowel signs; they live in rareVowels, not in a lessons-table row

STATUS TIERS FIRST, SOUND COUSIN INSIDE THE FIRST TIER. The lesson's single
declared rule, `obsolete-consonants`, names ฃ and ฅ and nothing else, so a
lesson that files those two among the other eight teaches its own rule against
the grain. Three tiers: seven rare but live (ฐ ฎ ฏ ฑ ฒ ฬ ฆ, all with non-zero
corpus occurrence), two retired (ฃ ฅ, zero occurrences, named by the rule), and
ฌ on its own at priority 44 of 44 — not formally obsolete, and absent from this
corpus all the same.

Inside tier one the split is by sound cousin, which every one of the ten states
outright in `initialSound`: the two market crowns (ฎ→ด, ฏ→ต), the three
breathed t's (ฐ→ถ, ฑ→ท, ฒ→ท), and then ฬ and ฆ, the two whose shape neighbour
and sound cousin are different letters. ฬ looks like พ and says l; ฆ looks like
ม and says kh. Those two are the only places in this lesson where reading by
shape gets the sound wrong, so they are grouped and named as such.

ฎ IS PRESENTED BEFORE ฏ, and must be. ฏ's shapeCue and its only
`confusablePairs` entry both anchor it on ฎ; it has no already-taught shape
anchor of its own.

THREE LETTERS HAVE NO RECORDING AND NO WORD. `public/audio/` holds 42
`consonant-*.mp3` files for 44 letters: ฃ, ฅ and ฌ carry no `audioUrl` field at
all, and `vocabulary.json` contains zero words for any of the three. So those
three slides carry no `recording:` line, and the narration says why out loud
rather than papering over it. `public/audio/consonant-cho-cho.mp3` exists,
is referenced by nothing, and is plausibly ฌ under an older romanisation — it
is NOT wired up here, because no shipped data claims it.

ฎ'S GAP IS FIXED, and it was the one of the four that could be. กฎหมาย (rank
515, six characters) is inside the window and safe for synthesis, where กฎ at
1058 is two characters and lands in the transcriber's high-variance band. Its
second half needs the leading-ห trick from lesson 28, so the narration says so
and reads only the first half analytically.

ฑ'S SOUND IS NOT SINGLE-VALUED: `initialSound: "th (usually same as ท,
sometimes d)"`. บัณฑิต, the lesson's own ฑ word, uses the d reading — ban-dìt,
not ban-thìt. Stated, because a learner applying the th rule to that word gets
it wrong.

-ัv'S CLOSED FORM IS TAUGHT. `conditionalVowelForms` ships -ัว → -ว- with
example สวน (rank 840), and the vowel's shapeCue states it. The parallel case
in lesson 13 (เ-อ → เ-ิ) is taught there, so dropping this one would be
inconsistent across the band.

-ัวะ AND เ-ือะ HAVE NO EXAMPLE WORDS, and neither do ๅ and ฦ. All four gaps are
stated rather than filled with invention.

VOWEL PATTERNS MUST BE SPELLED AS THE LESSONS ROW SPELLS THEM — -ัว, -ัวะ,
เ-ือ, เ-ือะ — or `patternFragments()` stops exempting the Thai run they leave
behind and the rank gate fails on it. Four patterns here, more than either
neighbouring lesson.

MNEMONICS ARE TAKEN, NOT FORCED; PEN AND PAPER EVERY LESSON; A CHALLENGE AND
ITS ANSWER NEVER SHARE A SLIDE. All unchanged from lesson 3.
-->

## exposition what-is-here
image: images/lesson-14/what-is-here.jpg
scene: A narrow wooden pier tapering away into mist over still water at dawn, the last few posts barely visible.
heading: The last ten letters, and how little they weigh
narration: en Ten consonants today, which finishes the alphabet. And I am going to be straight with you about them from the first sentence, because the honest framing is the whole value of this lesson. These ten are the rarest letters in Thai. All ten of them together account for about three characters in every thousand of running text. You need to recognise every one of them, because they do turn up, and a letter you cannot name stops you dead in the middle of a sentence. You will almost never write them. So this is a lesson about recognition and about proportion. By the end of it, every shape on a Thai page will be one you can name.
- Ten consonants, and the alphabet is finished.
- Together they are about three characters in a thousand.
- Recognise all ten. Expect to write almost none of them.

## exposition pen-still-there
image: images/lesson-01/get-a-pen.jpg
heading: Pen and paper
narration: en Pen and paper even for these, and both halves of each name out loud. Writing a rare letter once by hand is what makes it recognisable a year later when it turns up in the middle of something you are reading. Go and get them.
- Real paper, a real pen.
- Both halves of the name, out loud.
- Writing it once is what makes it recognisable a year later.

## exposition how-rare-is-rare
image: images/lesson-14/how-rare-is-rare.jpg
scene: A single grain of rice lying alone on a wide dark wooden table under a hanging lamp.
heading: What "rare" is actually worth here
narration: en Some numbers first, so you can decide how much of your attention these deserve. Take the whole vocabulary this course is built on and count every character in it. The tiger's letter turns up eight hundred times. The chest's letter, seven hundred. The egg's letter, three hundred and seventy. All ten of today's letters, added together, turn up about a hundred times. That is the scale you are working at. The review system knows it too. Every one of these ten sits at the very back of the scheduling queue. They will stay in your deck forever, and the working letters will always come up ahead of them. Spend the next half hour learning to recognise them, and then let the deck do the rest. Fair enough?
- The tiger's letter: eight hundred appearances. The chest's: seven hundred.
- All ten of today's letters together: about a hundred.
- They sit at the back of the review queue and stay there.

## exposition three-tiers
image: images/lesson-14/three-tiers.jpg
scene: A stack of wooden crates standing on a stone quay in morning light, coiled rope resting on the top one.
heading: Ten letters in three tiers
narration: en The ten vary a great deal in how rare they are, and the differences are big enough to be worth sorting. Seven of them are rare but alive. You will meet those seven inside borrowed spellings, in legal and official words, in the names of things. Two of them are retired. Modern Thai has stopped using them altogether — they sit in every alphabet chart and in no word anybody writes. And then one letter sits on its own at the very bottom. It is still technically in use, and it is so scarce that this course's entire vocabulary holds no word with it in. Seven, two, and one. Take them in that order. Ready?
- **Seven** rare but alive, inside borrowed and official words.
- **Two** retired, kept in the chart and used nowhere.
- **One** alone at the bottom, scarcer than either of those.

## exposition the-two-crowns
image: images/lesson-14/the-two-crowns.jpg
scene: A silversmith's stall hung with worked silver under a striped awning in a Thai open-air market, baskets of produce around.
heading: First tier, first pair — two letters wearing crowns
narration: en Start in the market, which you have not visited since lesson eleven. Two of the seven live there, mid class, and they are twins of two letters you have had for a long time. One is a second d and the other is a second unpuffed t. Both are kept for royal and religious spellings, which is why both of them look like the ordinary letter dressed up. Take them in that order, because the second one is defined against the first.
- Two in the market, mid class, no new tone rules.
- A second d, and a second unpuffed t.
- Both kept for royal and religious spellings.

## exposition meet-chada
image: images/lesson-14/meet-chada.jpg
scene: An ornate pointed golden Thai crown resting on a velvet cushion at a silversmith's stall, a loop of chain hanging below it, in a Thai open-air market of wooden stalls under striped awnings.
glyph: ฎ
gloss: crown letter
cue: the child's d, in regalia
heading: The pointed crown on its cushion
teaches: do-chada
narration: en The first letter. Listen to its name.
recording: th ฎอ ชฎา public/audio/consonant-do-chada.mp3
narration: en That word means the tall pointed crown that dancers and figures in the old stories wear. The sound is a plain d — the same d as the child's letter from lesson three. Same sound, same class, same district. The shape is the child's letter in regalia. The same pointed bowl, and then the base line runs on smoothly into a loop hung below it. A chain looped under the crown on its cushion.
- The word means a **pointed crown**.
- The child's d, and the market again. Mid class.
- The child's bowl, with **a loop hung below the base line**.

## exposition meet-patak
image: images/lesson-14/meet-patak.jpg
scene: A long wooden cattle goad with an iron spear tip leaning against a stall in a Thai open-air market, a thick knuckle worked into the shaft near its base, striped awnings above.
glyph: ฏ
gloss: goad letter
cue: the turtle's dt, in regalia
heading: The goad with the knuckle in it
teaches: to-patak
narration: en The second letter. Listen.
recording: th ฏอ ปฏัก public/audio/consonant-to-patak.mp3
narration: en That word means a goad — the long wooden pole with an iron spear tip on it that drovers use on cattle. The sound is dt, unpuffed, and it is the turtle's sound from lesson nine. Market again, mid class again. And the shape is the only one in this lesson that leans on a letter you met sixty seconds ago. It is the crown with a bump worked into the base line before the loop. A knuckle worked into the goad's shaft, near the base.
- The word means a **goad**.
- The turtle's dt, and the market. Mid class.
- The crown, with **a bump worked into the base line**.

## exposition write-the-crowns
thai: ฎ ฏ
heading: Write the two of them
teaches: do-chada, to-patak, do-dek, to-tau
narration: en Pen down. Draw the child's letter from lesson three, and then instead of finishing the base line flat, carry it on into a loop that hangs below. That is the crown. Then draw it again with one bump raised in the base line before the loop starts, and that is the goad. Write each one several times with the name out loud. Then write the child's letter and the turtle's letter beside them, so each crowned letter stands next to the plain one it shares a sound with.
- The crown: **the child's bowl, with a loop hung below**.
- The goad: **the same again, with a bump in the base line**.
- Put the child's letter and the turtle's letter beside them.

## exposition read-gotmaai
thai: กฎหมาย
heading: Read the first half of this one
teaches: do-chada
narration: en Six marks, and I want you to do half of this one and take the other half on trust. Look at the first two characters. The chicken's letter, then the crown, and nothing written between them. You met that arrangement in lesson nine: two bare consonants side by side are read with a short o that nobody writes down. So the first syllable is a market letter, a short o, and a stop. Work out the tone of that syllable before you turn this over. The second half uses a trick that has a lesson of its own later. A silent letter stands in front of the horse's letter and changes what it does. So read the first half, and let me give you the rest.
- Chicken, crown, and nothing written between them.
- Lesson nine: two bare consonants take the **unwritten short o**.
- **Work out the first syllable's tone** before you turn it over.

## exposition read-gotmaai-answer
thai: กฎหมาย
heading: That one
teaches: do-chada
narration: th กฎหมาย
narration: en It means law, and it is the commonest word in the language containing the crown's letter. The first syllable is a market letter on a dead short syllable, which gives a low tone — lesson eleven's rule, unchanged. The second syllable has a silent letter in front of the horse's, and that whole arrangement gets a lesson of its own near the end of the course. For now, note where the crown turned up: inside a legal word, closing a syllable, doing a plain t-stop.
- **กฎหมาย** — law.
- First syllable: market letter, dead, short — low.
- The crown appears **inside a legal word**, closing a syllable.

## exposition three-more-breathed-t
image: images/lesson-14/three-more-breathed-t.jpg
scene: A tall empty stone plinth standing in the middle of a swept temple hall, light falling across it from a high window.
heading: Next, three more breathed t letters
narration: en Three of the seven write a breathed t, which brings that sound's collection up to six letters. You have three of them already: the soldier at the harbour, the bag at the temple, and the flag from last lesson. These three are the last of the set. One lives at the temple and takes the high class rules, and the other two live at the harbour and take the low class ones. So the only thing you have to hold for each is a shape and a district. One of them also has a second sound you learn word by word, and I will point at it when it comes.
- Three more breathed t letters, and the set is then complete.
- One at the temple, two at the harbour.
- A shape and a district each, and the tone rules stay as they are.

## exposition meet-thaan
image: images/lesson-14/meet-thaan.jpg
scene: A carved stone pedestal standing empty in a temple hall, an ornate curve floating above its footed base, white walls and tiered golden roofs beyond.
glyph: ฐ
gloss: pedestal letter
cue: the bag's th, raised on a base
heading: The pedestal in the hall
teaches: tho-than
narration: en Listen.
recording: th ฐอ ฐาน public/audio/consonant-tho-than.mp3
narration: en That word means a base, or a pedestal — the block an image stands on in a temple hall. The sound is th — the same th as the bag's letter from lesson twelve. High class, and up at the temple with it. The shape is the plate's letter from lesson nine used as an upper curve, floating above a separate footed base with a head and a curl beneath it. A pedestal in two parts, waiting for something to stand on it.
- The word means a **base**, or a pedestal.
- The bag's th, and the temple. High class.
- The plate's curve **floating over a separate footed base**.

## exposition meet-montho
image: images/lesson-14/meet-montho.jpg
scene: Queen Montho in a tall gilded Thai crown and court dress standing on a stone quay, shoulders squared and chin raised, moored longtail boats behind.
glyph: ฑ
gloss: queen letter
cue: the soldier's th, with squared shoulders
heading: The queen on the quay
teaches: tho-montho
narration: en Listen.
recording: th ฑอ มณโฑ public/audio/consonant-tho-montho.mp3
narration: en That word is a name — Montho, a queen out of the old epic, and the letter is called after her. The sound is th, the soldier's th from lesson seven, and it lives at the harbour with him. The shape is the soldier's letter with a bump swelling in just after the head, before the upright starts. Where the soldier's back climbs dead straight, hers is squared off under a tall gilded crown. And here is the warning I promised. This letter sometimes comes out as a plain d instead, and which reading a word takes is a fact about that word. The one I will show you at the end does exactly that, so learn it as a word.
- The word is a **queen's name** out of the old epic.
- The soldier's th, at the harbour. Low class.
- The soldier's letter, with **a bump just after the head**.
- Sometimes it says **d** instead, and the word itself is what tells you.

## exposition meet-phuthao
image: images/lesson-14/meet-phuthao.jpg
scene: A stooped elderly man leaning on two walking canes on a stone quay, back bent and face deeply lined, moored longtail boats behind.
glyph: ฒ
gloss: elder letter
cue: the soldier's th, stooped
heading: The elder on the canes
teaches: tho-phuthau
narration: en Listen.
recording: th ฒอ ผู้เฒ่า public/audio/consonant-tho-phuthau.mp3
narration: en That word means an elder — an old man, respected for it. The sound is th again, the same one the queen carries and the soldier carries. Harbour, low class, same rules as always. This is the one shape in the lesson built out of two letters rather than one. It opens as the turtle's notched bowl from lesson nine, and closes into the horse's shouldered loop from lesson one. An elder stooped over two canes, bent in the middle.
- The word means an **elder**.
- The soldier's th again, at the harbour.
- **The turtle's notched bowl**, closing into **the horse's loop**.

## exposition write-the-three-t
thai: ฐ ฑ ฒ
heading: Write all three
teaches: tho-than, tho-montho, tho-phuthau
narration: en Pen again. The pedestal is the plate's curve set above a separate footed base. The queen is the soldier with a bump swelling just after the head. The elder opens like the turtle and closes like the horse. Write each one several times with the name out loud. Then write the soldier and the bag underneath them, and read the whole column as one sound with six spellings, because that is what it is.
- The pedestal: **the plate's curve over a footed base**.
- The queen: **the soldier, with a bump after the head**.
- The elder: **the turtle's bowl into the horse's loop**.
- Six spellings, one sound. Read the column.

## exposition read-rat
thai: รัฐ
heading: Read this one
teaches: tho-than
narration: en Three marks. The boat's letter from lesson eight, the curl on the roof from lesson four, and then the pedestal's letter sealing it. Think about what the pedestal is doing back there. It is a breathed t at the front of a syllable, and a breathed letter closing one has behaved the same way since lesson seven. So: which district opens it, is the syllable alive or dead, and is the vowel long or short? Then say it out loud before you turn it over.
- Boat, the curl on the roof, the pedestal closing it.
- **A breathed letter at the back loses its breath.** Lesson seven.
- District, alive or dead, long or short. Then say it.

## exposition read-rat-answer
thai: รัฐ
heading: That one
teaches: tho-than
narration: th รัฐ
narration: en It means a state, in the political sense, and you will see it in newspaper headlines constantly. The boat lives at the harbour, the pedestal stops the air dead, and the curl on the roof is a short vowel. Harbour, dead, short — which has been the high tone since lesson four. And the pedestal is doing a plain t-stop back there, with no breath on it at all.
- **รัฐ** — a state.
- Harbour letter, dead ending, short vowel — high tone.
- The pedestal closes it as a **plain t-stop**.

## exposition two-that-mislead
image: images/lesson-14/two-that-mislead.jpg
scene: A tangled heap of mooring rope lying on the stones of a harbour quay in flat afternoon light.
heading: And two whose shape points the wrong way
teaches: lo-jula, kho-rakhang
narration: en The last two of the seven go together for a reason worth stating plainly, because it is where guessing costs you most. Shape and sound have already come apart once or twice this morning. With these two the gap is at its widest, and the letters they are built on are two you read every day. One of them is the offering tray with something added, and it comes out as an l. The other is the horse with something added, and it comes out as a breathed k. Read either of them by shape and the wrong sound arrives before you have had time to think. These are the two to learn by name rather than by resemblance.
- Both are harbour letters, low class.
- One looks like the **offering tray** and says **l**.
- The other looks like the **horse** and says **kh**.
- Learn these two by name, because the shape misleads.

## exposition meet-jula
image: images/lesson-14/meet-jula.jpg
scene: A star-shaped kite flying high above the masts of a harbour, its long tail snapping and coiling into an extra curl at the end.
glyph: ฬ
gloss: kite letter
cue: the monkey's l, on a string
heading: The star kite above the masts
teaches: lo-jula
narration: en Listen.
recording: th ฬอ จุฬา public/audio/consonant-lo-jula.mp3
narration: en That word means a star-shaped kite, the big one flown in the traditional kite contests. The sound is l, the monkey's l from lesson eight, and it lives at the harbour with him. But the shape comes from somewhere else entirely. It is the offering tray from lesson five with the last stroke carrying on into an extra curled tail. A kite's tail snapping and coiling above the masts. Tray to look at, monkey to say.
- The word means a **star-shaped kite**.
- The monkey's l, at the harbour. Low class.
- The offering tray with **an extra curled tail on the last stroke**.

## exposition meet-rakhang
image: images/lesson-14/meet-rakhang.jpg
scene: A big bronze ship's bell slung on a rope beside a mooring post, swinging mid-strike, on a fishing harbour quay.
glyph: ฆ
gloss: bell letter
cue: the buffalo's kh, in bronze
heading: The bell beside the mooring post
teaches: kho-rakhang
narration: en Listen.
recording: th ฆอ ระฆัง public/audio/consonant-kho-rakhang.mp3
narration: en That word means a bell, the big bronze kind. The sound is kh, breathed, and it belongs to the water buffalo from lesson six. Harbour, low class, and the same tone behaviour the buffalo has always had. The shape is the horse's letter from your very first lesson with an extra bumped curve swelling in after the head. A ship's bell slung beside the mooring rope, caught in the middle of a swing. Horse to look at, buffalo to say.
- The word means a **bell**.
- The buffalo's kh, at the harbour. Low class.
- The horse's letter with **a bumped curve after the head**.

## exposition write-the-two-that-mislead
thai: ฬ ฆ
heading: Write them, and label them
teaches: lo-jula, kho-rakhang
narration: en Pen. The kite is the offering tray with the last stroke coiling on into a tail. The bell is the horse with an extra bump swelling after the head. Write each one several times. And this time, as you write, say the sound out loud rather than the shape. With these two your eye and your mouth pull in opposite directions, and the mouth is the one that has to win.
- The kite: **the tray, with the last stroke coiled into a tail**.
- The bell: **the horse, with a bump after the head**.
- Say the **sound** aloud as you write, rather than the shape.

## rule obsolete-rule
rule: obsolete-consonants
teaches: khaaw-khuat, khaaw-khon

## exposition the-retired-bottle
image: images/lesson-14/the-retired-bottle.jpg
scene: A glass bottle with a chipped rim standing alone on a dusty temple storeroom shelf.
glyph: ฃ
gloss: bottle letter
cue: a kh nobody spells any more
heading: The first of the two retired letters
teaches: khaaw-khuat
narration: en Now the second tier, and this is where I have to tell you something I have not had to say about any letter so far. This one is out of use. Its name is the word for a bottle. It is a high class letter and it belongs at the temple, and it said the same kh as the egg's letter. Exactly the same, from the same district, with the same tones. Every word that was once spelled with it is now spelled with the egg instead. So there is no modern pronunciation for me to teach you here, and no recording of its name in this course to play you, because no living word needs one. What there is, is a shape. It is the egg's letter with a notch cut into its top stroke, like the chipped rim of a bottle left on a storeroom shelf.
- **ฃ** — the bottle, and **no modern Thai word is spelled with it**.
- It said the same kh as the egg's letter, from the same district.
- **The egg's letter, with a notch cut into the top stroke**.
- There is no recording of its name here, because no living word needs one.

## exposition the-retired-cap
image: images/lesson-14/the-retired-cap.jpg
scene: A weathered old person in a dented flat cap sitting on a crate watching the water, hands on their knees, on a fishing harbour quay.
glyph: ฅ
gloss: flat-cap letter
cue: the other kh nobody spells any more
heading: And the second one, which is its mirror
teaches: khaaw-khon, khaaw-khuat
narration: en The other retired letter does the same thing one district down. Its name is the ordinary word for a person. It is low class, it lives at the harbour, and it said the same kh as the water buffalo. The word for person moved on to the buffalo's letter and left this one behind. And the shape is the exact counterpart of the bottle's: the buffalo's letter with a notch cut into its top stroke. So the two retired letters are one idea done twice. A notch in the top stroke of a living letter, once at the temple and once at the harbour. The usual account of why they went is that the first Thai typewriters had no room for them, and the spellings had already been drifting.
- **ฅ** — the flat cap. Low class, at the harbour, saying the buffalo's kh.
- **The buffalo's letter, with a notch cut into the top stroke**.
- The same idea as the bottle, one district down.
- Again, no recording, because no modern word spells it.

## exposition still-in-the-alphabet
image: images/lesson-14/still-in-the-alphabet.jpg
scene: An old wooden classroom desk with a worn and ink-stained lid standing alone in an empty schoolroom, morning light through the shutters.
heading: So why are they still counted
teaches: khaaw-khuat, khaaw-khon
narration: en Which raises the obvious question. If nobody writes them, why does Thai still say it has forty-four consonants? Partly because the alphabet is recited as a fixed list and has been for a very long time, and a recited list does not shed members easily. Partly because they are still there in older printing, in old documents, and in the chart on every classroom wall in the country. And partly because the alphabet is a cultural object as much as a working tool. So they stay in your deck as well, at the very back of the queue. Your job with both of them is this: see one, recognise it, know it is retired, and keep reading.
- The alphabet is a recited list, and lists shed members slowly.
- They survive in old printing, old documents, and every classroom chart.
- Your job is to recognise one and keep reading.

## exposition the-last-letter
image: images/lesson-14/the-last-letter.jpg
scene: A young sapling tree tied to its supporting stake beside a harbour wall, one branch flicking up above the rest, moored longtail boats behind.
glyph: ฌ
gloss: sapling letter
cue: a ch you will meet on charts
heading: The rarest letter in the alphabet
teaches: chaaw-chooe
narration: en And then one letter on its own, at the very bottom of the queue. Forty-fourth out of forty-four. This one is different from the two retired letters, because it is technically still in use. It survives in a handful of borrowed and ceremonial spellings, and its own name is an old word for a tree. But I have to be straight with you twice here. There is no recording of its name in this course, so I cannot play it to you. And the whole vocabulary this course is built on runs thousands of words deep with no instance of this letter anywhere in it, so I have no example to show you either. What I can give you is its sound, its district and its shape. It is a breathed ch — the elephant's sound from lesson four. It lives at the harbour and it is low class. And it is drawn as a low arch first, then the taller elephant stroke with its flicked tail. A sapling tied up against the stake that is holding it straight.
- **ฌ** — the sapling. Forty-fourth of forty-four, and still technically in use.
- A breathed **ch** — the elephant's sound. Harbour, low class.
- **A low arch first, then the elephant's taller stroke with its flick.**
- No recording here, and no word in this course's vocabulary.

## exposition ua-vowel
image: images/lesson-01/the-vowel-house.jpg
glyph: -ัว
gloss: the curl and the ring
cue: oo swinging open into ah
heading: -ัว, and the vowels are finished after this
teaches: sara-uua
narration: en Now the vowels, and there are only two families left in the whole written system. Here is the first. A curl goes up on the roof above the consonant, and the ring letter from lesson two stands behind it in the back yard. Two rooms again, and one vowel. Shall we hear it?
recording: th สระอัว public/audio/sara-ua-long.mp3
narration: en An oo swinging open into an ah, in one long movement.
narration: th ตัว
narration: en That is the turtle's letter with this vowel on it. It means a body, and it is also the counting word Thai uses for animals and for clothes.
narration: th หัว
narration: en And that is the chest's letter from lesson twelve in the same frame. It means a head, and it rises, because the chest is a temple letter and nothing stops the syllable.
- A curl on the roof, and the ring letter in the back yard.
- An **oo swinging open into ah**, held long.
- Two rooms, one vowel, and the consonant between them.

## exposition ua-closed
image: images/lesson-14/ua-closed.jpg
scene: A gardener pulling a wooden gate closed behind him in the wall of a vegetable garden, late afternoon light.
heading: And what it does when something follows
teaches: sara-uua
narration: en You know this move by heart now, and this vowel does its own version of it. Put a final consonant after it and the curl on the roof disappears completely. The ring letter stays where it is and ends up sandwiched between the opening consonant and the closing one. So three consonants in a row on the page, and the middle one is the vowel.
narration: th ควร
narration: en The buffalo, the ring, and the boat. It means should, as in you should do a thing, and it is the same vowel you just heard, at the same length, with the curl simply gone. Listen to the end of it as well — the boat's letter is last, so it lands as an n, exactly as lesson eight said it would.
- With a final consonant, the **curl vanishes**.
- The ring letter sits between the opening and closing consonants.
- Three consonants in a row, and the middle one is the vowel.

## exposition uea-vowel
image: images/lesson-14/uea-vowel.jpg
scene: A wooden Thai house on stilts seen from the front at dusk with lamps lit on the veranda and behind two upper windows.
glyph: เ-ือ
gloss: the three-room lodger, again
cue: the grin vowel opening into ah
heading: เ-ือ, the last written vowel family
teaches: sara-uuea
narration: en And the last one, which takes three rooms the way the ia vowel did in lesson twelve. A mast on the front steps. The long grin mark from lesson six up on the roof, the one with a second upright pinned beside it. And the empty basin standing in the back yard. Shall we hear it?
recording: th สระเอือ public/audio/sara-eua-long.mp3
narration: en That is the tight-lipped ue from lesson six, opening out into an ah. One glide, one beat.
narration: th เรือ
narration: en The boat's letter, and it means a boat — the letter's own name, finally spelled out in front of you.
narration: th เสือ
narration: en The tiger's letter, and it means a tiger. That is two letters in a row spelling out their own names.
narration: th เมือง
narration: en And the horse's letter with the snake closing it, which means a city or a town.
- The mast in front, the long grin mark above, the basin behind.
- The tight-lipped **ue opening out into ah**, in one beat.
- Three rooms, one vowel, built like the ia vowel.

## exposition the-short-mates
glyph: เ-ือะ
gloss: the same glides, clipped
cue: the hooks on the end of each
heading: Both of them have short mates, spelled as you would guess
teaches: sara-ua, sara-uea, sara-uua, sara-uuea
narration: en Each of those two vowels has a short version, and you can guess both spellings. The curl and the ring with the two hooks behind it. The three-room one with the same two hooks on the end. Here they are.
recording: th สระอัวะ public/audio/sara-ua-short.mp3
recording: th สระเอือะ public/audio/sara-eua-short.mp3
narration: en And the honest part. Neither of them has a word in this course's vocabulary. They exist, they are spelled exactly as you would predict, and they turn up in exclamations and in a small number of uncommon words. Recognise the two hooks, know what they are doing, and put your time somewhere else.
- **-ัวะ** — the curl and the ring, with the two hooks behind.
- **เ-ือะ** — the three-room spelling, with the same two hooks.
- Neither has a word in this course. Recognise the shape and move on.

## exposition read-duuean
thai: เดือน
heading: Read this one
teaches: sara-uuea
narration: en Five marks, and the vowel is the one you met ninety seconds ago. A mast out in front, the child's letter from lesson three, the long grin mark above it, the basin behind, and the mouse closing the whole thing. Name the vowel first. Then the district, then whether the ending stops the air. Out loud before you turn it over.
- Mast, child's letter, the grin mark above, the basin, the mouse.
- **Name the vowel first**, then the district, then the ending.

## exposition read-duuean-answer
thai: เดือน
heading: That one
teaches: sara-uuea
narration: th เดือน
narration: en A month, and it is also the word for the moon. The child's letter stands in the market. The mouse closes the syllable with a hum, so it is alive, and a market letter on a syllable that ends alive is flat. Five marks and one syllable. Count the marks again, then say it as a single beat.
- **เดือน** — a month, and also the moon.
- Market letter, the syllable alive — flat.
- Five marks, one syllable.

## exposition rare-vowel-signs
image: images/lesson-14/rare-vowel-signs.jpg
scene: Heavy monsoon rain falling straight down onto the flooded green of a rice paddy, hills faint behind.
heading: Three more signs, and only one you will meet
narration: en One last set, and they are odd enough that I want to tell you what they are rather than drill them. Thai has a few signs that are counted as vowels and that behave more like a consonant and a vowel welded together. The first of them writes the boat's sound followed by a short tight vowel, all in one mark. It is the only one of the group you will actually meet.
narration: th ฤดู
narration: en That means a season, and it is that sign followed by two letters you have had for lessons.
narration: th อังกฤษ
narration: en And that is the word for England, with the same sign hiding in the middle of it. Then there is a lengthener, written after that sign to make a long version of it. And there is a pair of l-shaped mates, a short one and its own long form, kept for completeness and effectively gone from the language. I have no example for any of those three, because the vocabulary this course uses contains none.
- **ฤ** writes the boat's sound plus a short tight vowel, in one mark.
- **ฤดู** is a season. **อังกฤษ** is England, with the sign mid-word.
- **ๅ** lengthens it, and **ฦ** is its l-shaped mate.
- The last three have no example here, because no common word uses them.

## retrieval spot-the-rare
reveal: spot-the-rare-answer
prompt: เมฆ is read mêek, and it falls. The letter closing it is one of today's ten, standing where you would normally expect the chicken. Which letter is it, and what does its presence tell you about the word?
teaches: kho-rakhang, low-dead-long
narration: en Two questions to finish on. Here is the first. You are reading, and you meet a short word that comes out as a falling mêek and means a cloud. It opens with a mast and the horse's letter, and one of today's ten is closing it, standing where you would normally expect the chicken. Which one is it — and beyond the sound it makes, what does the fact that it is there tell you about the word you are looking at?

## reveal spot-the-rare-answer
retrieval: spot-the-rare
teaches: kho-rakhang, low-dead-long
narration: en It is the bell's letter, the rare harbour kh. As a final it does exactly what any k does back there: it stops the air and makes the syllable dead. The horse lives at the harbour and the vowel is long. A harbour letter on a long dead syllable falls, which is lesson five's rule, unchanged. The extra thing it tells you is where the word comes from. A spelling that reaches for one of today's letters is a bookish or borrowed spelling. So a rare letter is a signal about the word's register, sitting on top of the sound it makes.
- The bell's letter — the rare harbour kh.
- As a final it is a plain k-stop, so the syllable is dead.
- Harbour, dead, long vowel — falling.
- Its presence marks the word as bookish or borrowed.

## retrieval crown-twins
reveal: crown-twins-answer
prompt: The two market letters you met first today are crowned twins of two letters you have had since lessons three and nine. Say which sound each twin carries, which district it sits in, and what its crown actually changes.
teaches: do-chada, to-patak
narration: en And the second, which is about the pair you met at the beginning. Two letters in the market, both of them wearing a crown, both of them twins of letters you have had for a long time. Say which sound each of the two carries. Say which district each sits in. And then say what the crown actually changes about the letter it is sitting on.

## reveal crown-twins-answer
retrieval: crown-twins
teaches: do-chada, to-patak
narration: en The crown's letter is a plain d, exactly as the child's letter is. The goad's letter is an unpuffed dt, exactly as the turtle's is. Both are mid class and both stand in the market, alongside the letters they double. And the crown leaves the sound and the class exactly as they were. Its one job is to mark the word as an old, royal or religious borrowing.
- The crown: a plain **d**, like the child's letter. Market, mid class.
- The goad: an unpuffed **dt**, like the turtle's. Market, mid class.
- The sound stays the same, and so does the class.
- The crown's one job is marking where the word came from.

## exposition ten-words
image: images/lesson-14/ten-words.jpg
scene: A shallow wooden drawer of small brass weights standing open on a workbench under a hanging lamp.
heading: Where the seven live ones actually turn up
teaches: tho-than, to-patak, tho-montho, tho-phuthau, lo-jula, kho-rakhang, do-chada
narration: en One word each for the seven that are alive, so you have seen every one of them at work. Read them for recognition rather than for memorising, and notice how many are official, legal or technical. That is where this whole tier of the alphabet lives.
- **ฐาน** — a base. **รัฐ** — a state, in the political sense.
- **ปฏิบัติ** — to carry out, or to put into practice. The goad's letter, mid-word.
- **บัณฑิต** — a graduate. The queen's letter here says **d**, not th.
- **พัฒนา** — to develop. The elder's letter, mid-word.
- **กีฬา** — sport. The kite's letter, doing the monkey's l.
- **โฆษณา** — advertising. The bell's letter opening it.
- **เมฆ** — a cloud. The bell's letter closing it.
- **กฎหมาย** — law. The crown's letter, the one word you will meet it in.

## exposition read-close
heading: Forty-four out of forty-four
narration: en That is the alphabet. All forty-four consonants, every written vowel family, and the rare signs on top of them. Every shape on a Thai page is now a shape you can name, which was the thing standing between you and reading at all. What is left in this course is machinery rather than letters. The vowels that get left out of the spelling entirely. The tone marks, which take the four rules you have and let a writer override them. Consonants that run together into one sound, and consonants that stand silently in front of another letter and change its class. Before you stop, write today's ten out in one column, and beside each one write the letter it doubles. Seven of them will have a partner. Three of them will have a note instead, and those three are the honest edge of the alphabet.
- Today's ten: **ฐ** **ฎ** **ฏ** **ฬ** **ฆ** **ฑ** **ฒ** alive, **ฃ** **ฅ** retired, **ฌ** alone at the bottom.
- **Forty-four consonants**, and every written vowel family.
- Every shape on a Thai page is now one you can name.
- Next: unwritten vowels, tone marks, clusters, and leading consonants.
- Write the ten in a column, with the letter each one doubles beside it.
