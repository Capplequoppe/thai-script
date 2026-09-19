# The Sanskrit set

lesson: lesson-13

<!--
Task 4.3, final band 2 of 3. Six letters Thai keeps for words it borrowed —
two more temple s letters and four harbour letters that double sounds the
learner has — plus สระ อำ, the oe vowels with their เ-ิ written change, and
การันต์. The old course put these in lessons 13 and 16 with the rationale
never stated; stating it (loanword spelling) is what makes the set cohere.
previews: none
ranks: 1-1500
teaches: ์ — the gaaran sign this lesson introduces; no lessons-table row lists it

DISTRICT FIRST, THEN COUSIN. Six letters split 2 temple / 4 harbour, and that
split is the one the lesson's two declared tone rules need: `high-dead-short`
and `high-dead-long` apply to ศ and ษ and to nothing else here. The shipped
artwork carries the same split — `consonant-scenes.json` stages ศ and ษ in the
temple courtyard and the other four on the quay. Inside each group every letter
gets one line of "this doubles a letter you already read", which the data
states outright for ณ ("n, same as น") and ญ ("y, same as ย") and which the
phoneme groups derive for the other four.

ณ MUST BE TAUGHT BEFORE ญ. ญ has no already-taught shape anchor anywhere in
the data: its `shapeCue` names no letter and its only `confusablePairs` entry
is `ญ~ณ`, same lesson. So ณ is presented first and ญ is stated against it. Do
not restore the earlier skeleton's claim that ญ is ย over a small base — the
data does not carry it, and the palace image is built from the hair-and-ringlet
cue instead.

THE SHIPPED SHAPE CUES ARE FOLLOWED, NOT REPLACED. The earlier skeleton gave ศ
a "split head", ษ a "broken crown", ภ a "steep sail" and ธ a "flag on a pole",
none of which names a reference letter and none of which matches the mnemonic
the palace artwork and the review deck are built from. The data's anchors are
ค, บ, ก/ถ and ร; ถ is used for ภ because ถ was taught last lesson and the
contrast is the sharper of the two.

THE ย EXCEPTION IS TAUGHT. `conditionalVowelForms` ships เ-อ with an exception
entry — before a final ย the อ drops and no สระ อิ is written, example เลย —
and the vowel's own shapeCue states it. เลย is rank 81, so it is both legal
here and one of the hundred commonest words in the language. Teaching the
closed form without it leaves the learner unable to read it.

เ-อะ HAS NO EXAMPLE and cannot have one: `conditionalVowelForms` ships it with
an explicit comment that common Thai has no closed short เ-อะ syllable to
cite. Stated, and the absence stated with it.

ญ's FINAL IS n, NOT y. `finalSound: "n"`. ปัญหา (rank 253) demonstrates it and
สำคัญ (342) repeats it, so the claim is worked rather than asserted.

ศ AND ษ REST ON MORE THAN ONE WORD EACH HERE. The earlier skeleton had both
letters resting on ศึกษา alone, so one substitution would have removed two
declared letters at once. อากาศ (269) carries a final ศ, ศูนย์ (251) carries an
initial ศ with the gaaran sign, พิเศษ (481) carries both letters and is the
lesson's cleanest high-dead-long word, and ภาษา (471) carries ษ beside ภ.

MNEMONICS ARE TAKEN, NOT FORCED; PEN AND PAPER EVERY LESSON; A CHALLENGE AND
ITS ANSWER NEVER SHARE A SLIDE. All unchanged from lesson 3.
-->

## exposition what-is-here
image: images/lesson-13/what-is-here.jpg
scene: A heavy wooden merchant chest bound with iron standing alone on a stone quay in the early morning, mist on the water behind it.
heading: Six letters that tell you where a word came from
narration: en Six consonants today, and all six of them are doubles. Every one writes a sound you already read, from a letter you already have. So the question worth answering first is why the language bothered. The short answer is that Thai imported a great many words from Sanskrit and from Pali. When it did, it kept the spelling those words arrived in. These six are what is left of that. They carry no sound of their own, and they carry something else instead. Seeing one tells you the word in front of you is old, or formal, or borrowed. Then a vowel that comes with its own ending built in. Then a sign that switches a letter off entirely, and the other half of the temple's tone behaviour.
- Six consonants, and every one doubles a sound you have.
- They mark a word as old, formal, or borrowed.
- A vowel with a built-in ending, and a sign that silences a letter.

## exposition pen-still-there
image: images/lesson-01/get-a-pen.jpg
heading: Pen and paper
narration: en Pen and paper, and both halves of every name out loud as your hand moves. These six are shapes before they are anything else, because you already own the sounds. Go and get them.
- Real paper, a real pen.
- Both halves of the name, out loud.
- Six shapes, and the sounds are already yours.

## exposition why-thai-kept-them
image: images/lesson-13/why-thai-kept-them.jpg
scene: A bundle of palm-leaf manuscript pages tied with cord resting on a low wooden table in a dim temple library, warm lamplight from one side.
heading: Why Thai kept six letters it could have dropped
narration: en Here is the thing to understand before the letters arrive, because it makes all six of them cheap. English does exactly the same thing. You write "psychology" with a p you never say. You write "debt" with a b that has been silent for five hundred years. In both cases the word came in from somewhere else and brought its spelling with it. Thai did that on a large scale with the religious and scholarly vocabulary it took from India. The words came with letters Thai had no use for, and rather than reshaping them, the script grew room for them. So each of these six sits in modern Thai doing a job the alphabet had already covered. What they buy you is information about the word rather than information about the sound. Makes sense?
- English keeps the p in *psychology* for exactly this reason.
- Thai took religious and scholarly words from Sanskrit and Pali.
- The words kept their spelling, and the script made room.
- Each of the six tells you about the word rather than the sound.

## exposition the-two-at-the-temple
image: images/lesson-13/the-two-at-the-temple.jpg
scene: A brass hand bell standing alone on the swept flagstones of a temple courtyard in morning light, white walls behind.
heading: Two of them live up at the temple
narration: en The six split two ways, and the split is worth taking first because it decides everything about their tones. Two of them live up at the temple, high class, alongside the seven you met last lesson. The other four live down at the harbour, low class. Start with the temple pair, because they share a job with the tiger you learned yesterday. Both of them write s. Which means Thai has three letters for a single s sound, and all three live up the hill. You are holding the first of the three already.
- Two at the temple, four at the harbour.
- The temple pair both write **s**.
- Thai has three s letters at the temple, and you already have one.

## exposition meet-saalaa
image: images/lesson-13/meet-saalaa.jpg
scene: An open wooden pavilion with a pointed roof standing in a temple courtyard, a single pennant planted upright on the roof ridge, white walls and tiered golden roofs behind.
glyph: ศ
gloss: pavilion letter
cue: an s with a flag on the roof
heading: The pavilion with a pennant
teaches: so-sala
narration: en The first letter. Listen to its name.
recording: th ศอ ศาลา public/audio/consonant-so-sala.mp3
narration: en That word means a pavilion, the open-sided kind with a pointed roof that stands in temple grounds for people to sit under. The sound is s, the same s as the tiger's. High class, temple, and every tone rule you learned last lesson carries straight over. The shape is the water buffalo's letter from lesson six with one extra stroke planted on top. A flag flying from the ridge of the pavilion's roof.
- Its name is the sound, then a word beginning with that sound.
- The word means a **pavilion**.
- The tiger's s, from a second temple letter.
- The buffalo's letter with **a flag stroke planted on top**.

## exposition meet-ruesii
image: images/lesson-13/meet-ruesii.jpg
scene: A bearded hermit in a tiger-skin robe carrying a woven basket with a long wooden staff laid across it, in the courtyard of a Thai temple with tiered golden roofs and white walls.
glyph: ษ
gloss: hermit letter
cue: an s with a staff across it
heading: The hermit carrying his basket
teaches: so-risi
narration: en The second letter. Listen.
recording: th ษอ ฤๅษี public/audio/consonant-so-risi.mp3
narration: en That word means a hermit — the forest kind, in a tiger-skin robe, who turns up all through the old stories. The sound is s again, and the class is high again, so this is the third and last of the temple's s letters. The shape is the leaf's letter from lesson three with a single line crossed through it. The hermit's staff, laid flat across the basket he carries up to the temple.
- Its name is the sound, then a word beginning with that sound.
- The word means a **hermit**.
- The third and last temple s.
- The leaf's letter, **crossed with one line**.

## exposition write-the-two-s
thai: ศ ษ
heading: Write both, and put the third one beside them
teaches: so-sala, so-risi, so-sia
narration: en Pen down. For the pavilion, draw the water buffalo exactly as you did in lesson six, then add the extra stroke standing up on top of it. For the hermit, draw the leaf's letter from lesson three and put one line straight across it. Write each of them several times with the name out loud. Then write the tiger from last lesson underneath both. All three temple s letters in one column, and look at how little they share to the eye.
- The pavilion: **the buffalo, with a stroke planted on top**.
- The hermit: **the leaf's letter, crossed once**.
- Put the tiger under them both, and look at the column.

## rule high-dead-short-rule
rule: high-dead-short
teaches: high-dead-short

## rule high-dead-long-rule
rule: high-dead-long
teaches: high-dead-long

## exposition temple-dead
image: images/lesson-13/temple-dead.jpg
scene: A closed wooden temple door with an iron ring handle, set in a white wall, flat morning light across it.
heading: The temple's other half, and it is one tone for both lengths
teaches: high-dead-short, high-dead-long, low-dead-short, low-dead-long
narration: en Two rules on the screen, and they say the same thing twice. A temple letter on a dead syllable gives a low tone. Long vowel, short vowel, the tone is low either way. Last lesson gave you what the temple does when the syllable runs alive. This is the other half of it, so the temple's tone behaviour is finished as of this slide. Compare it with the harbour, which needed two separate dead rules because the lengths disagree — short goes high and long falls. The temple behaves like the market instead, and gives you one answer for both. Three words you already have. The first is a temple letter stopped by a k with a long vowel in between, and it means cheap. The second is a temple letter stopped by a d with a short vowel, and it means wrong. The third is a temple letter stopped by a d with a long vowel, and it means to lack something.
narration: th ถูก
narration: th ผิด
narration: th ขาด
narration: en All three low, and only the middle one has a short vowel.
- Temple letter, dead syllable, **low tone**.
- Long vowel or short, the tone comes out the same.
- The harbour needed two rules here. The temple needs one.

## exposition read-phiseet
thai: พิเศษ
heading: Read this one
teaches: so-sala, so-risi, high-dead-long
narration: en Five marks, two syllables, and everything in it is yours. The first syllable is the offering tray from lesson five with the short ee under it, and nothing closes it. The second is a mast, the pavilion's letter, and then the hermit's letter stopping it dead. Work both tones out before you speak. Remember what the tray's letter is, and what the pavilion's letter is, and which rule each half needs. Out loud before you turn it over.
- Tray plus short ee, then mast, pavilion, hermit.
- Two syllables, and a different rule for each.
- **Out loud before you turn it over.**

## exposition read-phiseet-answer
thai: พิเศษ
heading: That one
teaches: so-sala, so-risi, high-dead-long
narration: th พิเศษ
narration: en It means special. The first half is a harbour letter on a short dead syllable, which goes high — that is lesson four's rule. The second half is a temple letter on a long dead syllable, which goes low, and that is the rule you met four slides ago. Two of this lesson's six letters in one word, and the hermit's letter doing the stopping rather than the speaking.
- **พิเศษ** — special.
- First half: harbour, dead, short — high.
- Second half: temple, dead, long — low.
- The hermit's letter closes the word instead of opening it.

## exposition four-at-the-harbour
image: images/lesson-13/four-at-the-harbour.jpg
scene: A long wooden pier running out into a calm harbour at first light, mooring posts down one side, water flat and grey.
heading: And four of them live down at the water
narration: en Down the hill now for the other four, and these are cheaper still, because a low class letter brings no new tone rules with it at all. You have had every one of the harbour's rules since lesson five. So for each of these four the entire job is a shape and a sound you already own. One of them is a second n. One is a second y. One is a second breathed p, and one is a second breathed t. Can you name the four letters they are doubling before I show you?
- Four at the harbour, low class, and no new tone rules.
- A second n, a second y, a second breathed p, a second breathed t.
- Shape and sound each, and both are already familiar.

## exposition meet-neen
image: images/lesson-13/meet-neen.jpg
scene: A young novice monk in orange robes walking away down a wooden pier on a fishing harbour quay, moored longtail boats and drying nets behind.
glyph: ณ
gloss: novice letter
cue: a second n at the water
heading: The novice on the pier
teaches: no-nen
narration: en Listen.
recording: th ณอ เณร public/audio/consonant-no-nen.mp3
narration: en That word means a novice monk, a boy ordained young, in orange robes. The sound is n. It is the same n as the mouse's letter from lesson one, and the two sound identical coming out of your mouth. It ends a syllable the same way too, with a hum that leaves the syllable alive. The shape opens with a whole chicken frame from lesson three, and only at the end of it does the mouse's loop arrive. So the novice walks ahead and the mouse comes along behind him, down the length of the pier.
- The word means a **novice monk**.
- The mouse's n, and the two sound identical.
- It closes a syllable with a hum, so the syllable stays alive.
- A whole **chicken frame first**, and the mouse's loop last.

## exposition meet-ying
image: images/lesson-13/meet-ying.jpg
scene: A tall woman striding along a harbour wall with her long black hair streaming out behind her, one loose ringlet drifting below the hem of her skirt, moored longtail boats behind.
glyph: ญ
gloss: woman letter
cue: a second y, with an n for an ending
heading: The woman on the harbour wall
teaches: yo-ying
narration: en Listen.
recording: th ญอ หญิง public/audio/consonant-yo-ying.mp3
narration: en That word means a woman. The sound at the front of a syllable is y, the giant's sound from lesson two, and again the data states it outright. The shape is the closest thing in this lesson to the letter beside it, so look at the two together. The novice ends in a loop attached to the rest of the letter. This one hangs a separate curl underneath, floating free. A tall woman striding the harbour wall, her hair streaming out behind her, and one loose ringlet drifting down below the hem of her skirt. And she does one thing on her own account. Put her at a syllable's end and she comes out as n, the way the boat and the monkey did in lesson eight.
- The word means a **woman**.
- The giant's y at the front of a syllable.
- The novice's loop is attached; this one hangs **a free curl underneath**.
- Put it last in a syllable and it lands as **n**.

## exposition meet-samphao
image: images/lesson-13/meet-samphao.jpg
scene: A Chinese junk ship with battened sails moored at a harbour quay, its heavy iron anchor swung right out over the port side on a chain.
glyph: ภ
gloss: junk-ship letter
cue: the tray's ph, with the head hung outside
heading: The junk with its anchor out
teaches: pho-samphau
narration: en Listen.
recording: th ภอ สำเภา public/audio/consonant-pho-samphau.mp3
narration: en That word means a Chinese junk, the big trading ship with battened sails that brought half of this vocabulary here in the first place. The sound is ph, breathed, and it belongs to the offering tray from lesson five. The shape is easiest against the bag you learned last lesson. The bag coils its head inside the frame. This one hangs its head outside, off the left leg, the way the junk's anchor swings out over the port side on its chain.
- The word means a **Chinese junk ship**.
- The tray's breathed ph, from the harbour.
- The bag coils its head inside the frame. This one **hangs it outside**.

## exposition meet-thong
image: images/lesson-13/meet-thong.jpg
scene: A cloth flag knotted shut around its line above a stone quay, a crossbar run through the knot, moored boats below.
glyph: ธ
gloss: flag letter
cue: the soldier's th, with the top tied shut
heading: The flag knotted shut
teaches: tho-thong
narration: en Listen.
recording: th ธอ ธง public/audio/consonant-tho-thong.mp3
narration: en That word means a flag. The sound is th, breathed open, and it is the soldier's sound from lesson seven. The shape is the boat's letter from lesson eight with its open top closed into a loop and a crossbar run through it. A flag knotted shut on its line above the quay, so the wind cannot get into it.
- The word means a **flag**.
- The soldier's breathed th, from the harbour.
- The boat's letter with **its top tied into a crossed loop**.

## exposition write-the-four
thai: ณ ญ ภ ธ
heading: Write all four
teaches: no-nen, yo-ying, pho-samphau, tho-thong
narration: en Pen again, one at a time, and say both halves of each name while your hand is on it. The novice is a chicken frame with the mouse's loop landing at the end. The woman is the same idea with a separate curl hanging loose underneath instead. The junk is the bag with its head swung out to the left. The flag is the boat with the top tied shut and a bar through the knot. Then write the mouse, the giant, the tray and the soldier in a second column beside them. Each new letter sits next to the sound it shares.
- The novice: **chicken frame, then the mouse's loop**.
- The woman: **the same frame, with a free curl underneath**.
- The junk: **the bag, with its head swung outside**.
- The flag: **the boat, with its top tied shut**.

## exposition read-phaasaa
thai: ภาษา
heading: Read this one
teaches: pho-samphau, so-risi
narration: en Four marks, two syllables, two of today's letters. The junk opens it, then the long post from lesson one. Then the hermit's letter, and the long post again. One of those letters lives at the harbour and the other lives at the temple. Both syllables end open on a long vowel, with nothing stopping either of them. So the two halves take different rules. Work them out and say the whole word before you turn it over.
- Junk, long post, hermit, long post.
- One harbour letter and one temple letter, in one word.
- Both halves run alive. **Out loud before you turn it over.**

## exposition read-phaasaa-answer
thai: ภาษา
heading: That one
teaches: pho-samphau, so-risi
narration: th ภาษา
narration: en It means a language, and it is the word you would use to say Thai language or English language. The first half is a harbour letter on a syllable that ends alive, so it comes out flat. The second half is a temple letter on a syllable that ends alive, so it rises. One word, one letter from each district, and two different tones out of the same kind of ending.
- **ภาษา** — a language.
- First half: harbour, alive — flat.
- Second half: temple, alive — rising.

## exposition sara-am
image: images/lesson-01/the-vowel-house.jpg
glyph: ำ
gloss: the vowel that brought its own ending
cue: a ring above, a post behind
heading: ำ, the vowel with an ending packed inside it
teaches: sara-am
narration: en Now the first of the vowels, and it is unlike anything you have met. It is written as a small ring sitting up on the roof, with the long post from lesson one standing right behind it. Ring first, post second, and the two of them together are one vowel sign. Want to hear it?
recording: th สระอำ public/audio/sara-am.mp3
narration: en What you just heard was a short ah followed by an m. And here is the strange part: there is no horse's letter anywhere in the spelling. The m is packed inside the vowel itself. So this sign does the work of a vowel and a final consonant at the same time, which no other vowel in the language does. Play it again and listen for the m on the end of it.
narration: th ทำ
narration: en That means to do, or to make, and it is two marks on the page.
narration: th คำ
narration: en And that means a word — the buffalo, and this vowel doing everything else.
- A small ring on the roof, and the long post behind it.
- It says a short ah, and then an **m**.
- The m is built in. Nothing is written for it.

## rule sara-am-rule
rule: sara-am-properties
teaches: sara-am

## exposition am-is-always-live
image: images/lesson-13/am-is-always-live.jpg
scene: A brass temple gong hanging from a wooden frame in a courtyard, still humming after a strike, morning light on the metal.
heading: Which means every syllable it finishes is alive
teaches: sara-am
narration: en That built-in m has a consequence, and it falls straight out of the rules you already have. A syllable is dead when the air stops at the end of it. This vowel ends on a hum, and a hum cannot stop the air. So every syllable this vowel finishes is alive, whatever letter opened it, and it stays alive however short it sounds. Take the plate's letter from lesson nine with this vowel behind it. Market letter, the syllable alive, so the tone is flat, straight off lesson three's rule.
narration: th จำ
narration: en That means to remember.
- The syllable ends on a hum, so the air keeps running.
- Every syllable this vowel finishes is **alive**.
- Short as it is, the hum keeps the air running, so the syllable lives.

## exposition read-samkhan
thai: สำคัญ
heading: Read this one
teaches: sara-am, yo-ying
narration: en Two syllables, and the second one uses a letter you met twenty minutes ago in the job it does least often. The tiger from last lesson, with the new vowel over and behind it. Then the water buffalo, the curl on the roof from lesson four, and the woman's letter closing the word. Remember what the woman's letter does in last position. Work out both tones, and say the whole thing before you turn it over.
- Tiger plus the new vowel, then buffalo, the curl on the roof, and the woman's letter.
- **Remember what she does last in a syllable.**
- Both tones before you speak.

## exposition read-samkhan-answer
thai: สำคัญ
heading: That one
teaches: sara-am, yo-ying
narration: th สำคัญ
narration: en It means important, and it is among the four hundred commonest words in Thai. The first half rises: a temple letter, and the new vowel keeping the syllable alive. The second half is flat: a harbour letter, and the woman's letter closing it as an n, which is a hum, which keeps it alive too. She is a y at the front of a syllable and an n at the back of one.
- **สำคัญ** — important.
- First half: temple, alive — rising.
- Second half: harbour, alive — flat.
- The woman's letter lands as **n**, and the hum keeps it alive.

## exposition oe-vowel
image: images/lesson-13/oe-vowel.jpg
scene: A wooden Thai house on stilts seen from the side at dusk, a single lamp burning behind one shuttered window, dry grass around the posts.
glyph: เ-อ
gloss: the lodger who wraps around
cue: an er with no r in it
heading: เ-อ, which stands on both sides at once
teaches: sara-ooe
narration: en The second vowel, and this one wraps its consonant. A mast on the front steps ahead of it, and the empty basin from lesson eleven standing in the back yard behind it. Two rooms, one vowel, and the consonant sitting between them. Shall we hear it?
recording: th สระเออ public/audio/sara-uh-long.mp3
narration: en It is the vowel in the English word "her" with the r taken out and the throat left loose. Long, and held.
narration: th เธอ
narration: en That is the flag's letter with this vowel around it, and it means her, or you, depending on who is talking to whom.
narration: th เจอ
narration: en And that is the plate's letter in the same frame. It means to find something, or to run into somebody.
- The mast on the front steps, the basin in the back yard.
- One vowel standing on **both sides** of its consonant.
- An **er with no r in it**, throat loose, held long.

## exposition oe-closed
image: images/lesson-13/oe-closed.jpg
scene: A man crouched on the ridge of a Thai house roof fitting a small tile into place, the veranda and open front door below him, late afternoon light.
heading: And what happens when something follows it
teaches: sara-ooe
narration: en You can guess this one, because you have watched it happen three times. That basin stands in the back yard, and a final consonant wants to stand there too. There is only room for one. So the basin gives way, and a small brim climbs up onto the roof over the consonant instead. The mast stays where it is out in front. Same vowel, same length, and one of its two rooms has changed.
narration: th เงิน
narration: en The snake's letter with the brim above it and the mouse closing it, and it means money.
narration: th เดิน
narration: en The child's letter in the same shape, and it means to walk.
- The basin steps aside, and a **brim appears on the roof**.
- The mast in front stays exactly where it was.
- Same vowel, same length, one room different.

## exposition oe-before-y
image: images/lesson-13/oe-before-y.jpg
scene: A single wooden shutter standing propped open against the wall of a Thai house on stilts, evening light on the boards.
heading: Except when the final is the giant's letter
teaches: sara-ooe
narration: en One exception, and it is worth the thirty seconds because it hides inside a word you will meet on your first day in the country. When the consonant closing the syllable is the giant's letter, the basin drops out and nothing climbs onto the roof to replace it. The mast stands in front, the consonant, then the giant. Two marks around one, and the vowel is written nowhere.
narration: th เลย
narration: en The monkey's letter, with the mast ahead of it and the giant behind. It means "at all", and it means "therefore", and Thai speakers put it at the end of half the sentences they say. It is the eighty-first commonest word in the language and there is nothing on the page to tell you the vowel is there.
- Before the giant's letter, the basin drops and **nothing replaces it**.
- Mast, consonant, giant — and the vowel is unwritten.
- **เลย** is the 81st commonest word in Thai and spelled exactly that way.

## exposition oe-short
glyph: เ-อะ
gloss: the same vowel, clipped
cue: mast, basin, and the hooks behind
heading: The short one, and an honest gap
teaches: sara-oe
narration: en There is a short version, spelled the way you would expect: the mast, the consonant, the basin, and then the two hooks to cut it off. The same shortener you have used since lesson four.
recording: th สระเออะ public/audio/sara-uh-short.mp3
narration: en And I have to be straight with you about this one, because the gap is in the language rather than in the lesson. Common Thai has no word that closes a short version of this vowel with a final consonant. So the rule exists, the spelling exists, and I have nothing real to show you doing it. Learn the open shape, recognise it on sight, and put your practice into the long one.
- **เ-อะ** — mast, consonant, basin, then the two hooks.
- Common Thai has no closed example of it.
- Learn the open shape and move on.

## exposition read-doen
thai: เดิน
heading: Read this one
teaches: sara-ooe
narration: en Four marks. A mast out in front, the child's letter from lesson three, the small brim up over it, and the mouse closing the word with a hum. Name the vowel before you say anything, because the shape it is wearing here is the one it puts on when something follows it. Then the district, then the tone. Out loud before you turn it over.
- Mast, the child's letter, the brim above, the mouse closing it.
- **Name the vowel first**, then the district, then the tone.

## exposition read-doen-answer
thai: เดิน
heading: That one
teaches: sara-ooe
narration: th เดิน
narration: en To walk. The vowel is the long one you just met, in its closed spelling with the brim on the roof. The child's letter stands in the market. The mouse closes the syllable with a hum, so it is alive. A market letter on a syllable that ends alive has been flat since lesson three.
- **เดิน** — to walk.
- The long vowel in its closed shape, brim on the roof.
- Market letter, the syllable alive, flat.

## rule gaaran-rule
rule: gaaran

## exposition gaaran
image: images/lesson-13/gaaran.jpg
scene: A small brass padlock hanging closed on the hasp of a carved wooden cabinet in a temple hall, lamplight on the metal.
heading: The sign that switches a letter off
narration: en Last thing, and it is the neatest piece of machinery in the lesson. A borrowed word arrives carrying letters Thai has no intention of pronouncing. The script needed a way to keep them on the page and out of the mouth. So it puts a small sign above the letter, and the letter goes silent. Think of it as a padlock hung on that one character.
narration: th สัตว์
narration: en That means an animal. Look at what is written. The tiger, the curl on the roof from lesson four, the turtle from lesson nine, and then the ring letter from lesson two with the padlock over it. Three consonants written, two of them spoken. The word ends on the turtle, which stops the air dead. So the syllable is dead and short, and a temple letter on a dead syllable gives a low tone.
narration: th ศูนย์
narration: en And that is zero. The pavilion, the long oo underneath, the mouse, and then the giant's letter locked shut. The mouse closes the syllable with a hum, and the giant just stands there being silent.
- A small sign above a letter, and the letter goes silent.
- The spelling survives on the page, and the mouth ignores it.
- **สัตว์** — animal. Three consonants written, two spoken.
- **ศูนย์** — zero, with the giant's letter locked shut.

## exposition six-words
image: images/lesson-13/six-words.jpg
scene: A row of small ceramic ink pots standing on a wooden desk under a hanging lamp, the glaze catching the light.
heading: One word for each of the six
teaches: so-sala, so-risi, no-nen, yo-ying, pho-samphau, tho-thong
narration: en Before the questions, a word apiece, so that none of the six leaves here as a shape with nothing attached. Read each one aloud and say where its new letter is sitting — at the front of a syllable or at the back of one. Three of these six turn up mostly as finals, which is the part people are slowest to spot.
- **อากาศ** — air, or the weather. The pavilion's letter closing it as a t-stop.
- **ศูนย์** — zero. The pavilion opening a word instead, with the giant locked shut behind.
- **พิเศษ** — special. The hermit's letter stopping the word dead.
- **คุณ** — you, politely. The novice's letter closing it with a hum.
- **ญาติ** — a relative. The woman's letter opening it, and the vowel written last is never said.
- **ภาพ** — a picture. The junk opening it, and the tray stopping it dead.
- **วิธี** — a method, or a way of doing something. The flag's letter opens the second half.

## retrieval two-halves
reveal: two-halves-answer
prompt: ศึกษา is read sùek-sǎa — low, then rising. Both halves open with a temple s letter. So what makes the two tones come out different?
teaches: so-sala, so-risi, high-dead-short, high-live
narration: en Two questions. The first is about a word you have not read yet, and everything in it is yours. It is spelled with the pavilion's letter, a short vowel, the chicken closing it, and then the hermit's letter with a long post after it. It means to study. The first half comes out low and the second half rises, and both of them open with a temple letter. So what is producing the difference?

## reveal two-halves-answer
retrieval: two-halves
teaches: so-sala, so-risi, high-dead-short, high-live
narration: en Alive against dead. The first syllable is stopped by the chicken, so the air ends there, and a temple letter on a dead syllable gives a low tone. The second syllable finishes on a long open vowel with nothing to stop it, so it is alive, and a temple letter on a syllable that ends alive rises. One word, one class, and the two temple rules sitting next to each other.
- **ศึกษา** — to study.
- First half: stopped by the chicken, so dead — low.
- Second half: open long vowel, so alive — rising.
- Both temple rules in a single word.

## retrieval silent-letter
reveal: silent-letter-answer
prompt: สัตว์ is read sàt, one closed syllable. Its spelling ends on the buffalo's letter under a small sign. What is that sign doing, and what would be lost without it?
narration: en And the second. You read a word that comes out as one short closed syllable. Its spelling has four consonants in it, and the last one carries a small mark above it. What is that mark doing to the letter underneath it? And what would the language lose if it simply dropped that letter instead of silencing it?

## reveal silent-letter-answer
retrieval: silent-letter
narration: en The mark silences the letter it sits over. Without it, the spelling would be asking you to pronounce the buffalo, and the word would come out wrong. And dropping the letter altogether would cost the word its history. The spelling is a record of where the word came from, and Thai readers use that record. A word spelled this way comes off a particular shelf of the vocabulary. The mark is how the script keeps both things at once.
- It silences the letter beneath it.
- Left unmarked, the letter would be read, and the word would be wrong.
- Dropped, the word would lose the spelling it arrived with.
- The mark keeps the history on the page and out of the mouth.

## exposition read-close
heading: Thirty-four letters, and the temple finished
narration: en Six letters, and every one of them a shape rather than a sound. Thirty-four of the forty-four consonants are now yours. The temple's tone behaviour is complete: rising when the syllable runs alive, low when it stops. Every one of the three classes is now closed. Before you stop, write the six out and write the letter each one doubles beside it. Then read the two n letters and the two y letters as small columns of their own. That is how they will come at you on the page. Next lesson is the last of the consonants: ten of them, all rare, and two that modern Thai stopped using altogether.
- **ศ** pavilion, **ษ** hermit, **ณ** novice, **ญ** woman, **ภ** junk, **ธ** flag.
- Thirty-four consonants, and every tone class now complete.
- **ำ** carries its own m, **เ-อ** wraps around, and **์** silences.
- Next: the last ten letters, and two the language has retired.
