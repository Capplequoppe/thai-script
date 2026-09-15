<!--
TWO RULES GOVERN THIS FILE.

1. An `en` narration line contains no Thai — no glyphs, and no romanisation
   either. "maaw maa" read by an English voice is an English mouth making a
   Thai sound badly, and in a tonal language that is worse than useless: the
   learner's ear encodes the wrong target and then practises against it. The
   English voice describes, names roles, and points. Every Thai sound the
   learner hears comes from a `th` clip in the Thai voice.

   The consequence, on purpose: English can never say "this letter is called
   X". It says "listen to its name", and the Thai clip says the name.

2. Bare open syllables are voiced twice, as one token: `นานา`, not `นา`.
   Measured, not stylistic. `eleven_v3` — the only ElevenLabs model that speaks
   Thai at all — rendered `นา` as น่า on six seeds out of six, at stability 0.5
   and 1.0, on both Thai voices the account can reach. `นานา` is correct five
   times in six, and a closed syllable such as `นาน` never failed. A space
   re-isolates the syllables and brings the failure back (`นา นา` scored 1 in
   4), so the repetition is written as one token. The learner hears the
   syllable drilled twice, which is what a teacher does anyway.

TEACHING ORDER. Sound before symbol, always. A Thai teacher does not open a
first lesson with a glyph; they make you produce the sound, then hang the shape
on a sound you already own. The letter *names* do the heavy lifting, because a
Thai name is itself a mnemonic — consonant sound, then a word beginning with
it. Teaching that pattern in lesson one hands the learner the key to all
forty-four rather than to two.

Scene grammar is inherited from symbols.ts, not reinvented: the harbour is the
low class.

BOTH LETTERS HAVE TWO LOOPS, AND THEY ARE NOT MIRRORS. symbols.ts used to say
that each had one loop and that น was ม mirrored, and this lesson repeated it.
Render the glyphs and the claim collapses: ม stacks both loops on the left,
น puts one high-left and one low-right. Mirroring ม would move both loops to
the right, which is no letter at all. The shared upper-left loop is the head
(หัว) that nearly every Thai consonant starts with, so it can never be the
thing that tells two of them apart. The lower loop is the only discriminator.

ILLUSTRATIONS CARRY MEANING, NEVER LETTERFORM. A scene must not be asked to
draw the shape of a glyph. Three attempts at "a post whose top curls over like
a shepherd's crook" — the mnemonic for า — came back as a post with a rounded
knob every time, and CLIP scored all three around 0.30 because the nouns it
checks (post, meadow, light) were all present. It scores subjects, not
geometry, so it cannot catch this and will wave it through.

The glyph itself, set large in the app's own font, draws the shape perfectly
and exactly. The picture's job is the sound and the meaning — for า, someone
calling out across a valley, because the sound is long, open and held.

Confirmed twice more, with a prop rather than a shape. A horseshoe nailed to
the post through two holes down its left limb is a genuinely good anchor for
ม — a horse's own object, carrying the letter's two stacked left loops. It
will not render. Asked with the horse leading, no horseshoe appeared at all;
asked with the horseshoe leading and named in close view, the model produced a
vague ring and pushed the horse out of frame, dropping the CLIP score to its
lowest of the set. A prop whose *meaning* depends on small internal geometry is
letterform in a costume, and fails the same way letterform does.

Getting a prop to trace a letter needs structural conditioning — ControlNet or
img2img, neither of which PixArt supports. Until then, scenes stay atmospheric
and the glyph carries its own shape.
-->

# The harbour's two hums

lesson: lesson-01

## exposition welcome
image: images/lesson-01/welcome.jpg
scene: A grey horse throws its head back and whinnies with its mouth wide open, standing on a stone harbour quay beside a tall wooden mooring post. A thick rope hangs from the post in one large round loop. Warm golden dawn light, moored fishing boats behind.
glyph: ม
anchor: MMM
gloss: horse letter
cue: MAAA — the horse's long call
heading: Start with a sound you already own
narration: en Before you look at anything, make a sound. Close your lips, and let a hum out through your nose. Hold it. That is today's first letter — you have owned that sound your whole life, and Thai does nothing surprising with it.
narration: en Now listen to how a Thai teacher would say its name.
narration: th มอ ม้า
narration: en Two parts. The first part is the sound itself. The second is an ordinary Thai word that begins with that sound — and the word means horse. The name is not a label to memorise. It is a sound with a picture already attached.
- Close your lips and hum through your nose. You already own this sound.
- ม is that hum.
- Its full name is the sound, then a word that begins with it — and that word means *horse*. Listen to the name; you will learn to write it later.

## exposition name-pattern
heading: The trick that covers all forty-four
narration: en This is the single most useful thing in the lesson, so listen to both names one after the other and try to hear what they share.
narration: th มอ ม้า
narration: th นอ หนู
narration: en Every consonant in Thai is named this way, and every first part ends on the same vowel. Forty-four letters, one naming pattern. That means you are never learning a name from scratch — you only have to catch the consonant at the very front and let the rest fall into place.
narration: en It pays twice. The example word in each name is a real word, so learning the alphabet quietly teaches you vocabulary at the same time.
- Every Thai consonant is named the same way: **its sound + a word that starts with it**.
- Every first part ends on the same vowel — so you only ever listen for the consonant at the front.
- ม is the **horse** letter.  น is the **mouse** letter.

## exposition second-letter
image: images/lesson-01/second-letter.jpg
scene: A small brown mouse sits upright inside a single large round coil of mooring rope on a stone quay, nose lifted and whiskers forward. A tall wooden post stands beside the coil. Warm low sunlight, harbour water glittering softly out of focus behind.
glyph: น
anchor: NNN
gloss: mouse letter
cue: NNN — a mouse nibbling the rope
heading: The second hum
narration: en The second letter is the other hum you already make. This time your lips stay open and your tongue touches the ridge just behind your top teeth. Try it now, and hold it.
narration: th นอ หนู
narration: en Its example word means mouse. Both of today's letters are hums, and neither one has any puff of air after it. If you hear yourself adding a small breath, you have imported an English habit — take it out.
- น is the hum made with your tongue at the ridge behind your top teeth.
- Its name follows the same pattern, and its word means *mouse*.
- Neither letter takes a puff of air. No breath after it.

## exposition shapes
image: images/lesson-01/shapes.jpg
scene: A dockworker in a heavy jacket swings a thick mooring rope over an iron bollard at the edge of a stone quay, arms raised wide with the rope arcing above him. Fishing boats crowd the water behind. Warm golden evening light throws long shadows across the wet stone.
heading: Two loops, and where the second one lands
narration: en Only now, the shapes — and they are far more alike than they are different. Both letters begin with the same small loop, high on the left. Nearly every Thai consonant does. That is simply where the pen starts, so it tells you nothing at all about which letter you are looking at.
narration: en The second loop is the whole question. The horse letter drops its second loop straight down beneath the first, so both sit on the left, one above the other. The mouse letter throws its second loop across to the far corner instead, low and to the right.
- Both letters start with the same loop, high on the **left**. That part never tells them apart.
- **ม** — the second loop drops **straight down the left**. Two loops, one side.
- **น** — the second loop is thrown **across to the bottom right**. A diagonal.

## retrieval spot-the-loop
reveal: spot-the-loop-answer
prompt: Both letters carry a loop high on the left. Where does each one put its *second* loop — and which of the two is the horse?
narration: en Answer out loud before you turn this over. Saying it wrong and then being corrected will fix it in your memory far harder than reading the right answer would.

## reveal spot-the-loop-answer
retrieval: spot-the-loop
narration: en The horse stacks both of its loops down the left. The mouse sends its second one across to the bottom right.
- **ม** — both loops down the **left** — the *horse* letter.
- **น** — high left, then low **right** — the *mouse* letter.

## exposition harbour
image: images/lesson-01/harbour.jpg
scene: A lone fisherman stands at the end of a long stone pier looking out over a wide calm harbour at sunrise, hands in his pockets. Dozens of small wooden boats lie at anchor with their masts still. Warm golden light floods low across flat water and mist hangs at the far shore.
heading: Both letters live in the harbour
narration: en Every Thai consonant belongs to one of three classes, and the class is what decides the tone of any syllable it starts. That is the machinery of the whole writing system, and it arrives properly in the next lesson.
narration: en For today, one thing only: both of these letters belong to the same class, and in this course that class is the harbour. Put them there in your mind now — the rope, the water, the low idling drone of the place. When the tone rules arrive, you will not be learning where these two live. You will already know.
- Both ม and น are **low class**.
- Class decides tone. That is the engine of Thai spelling, and it starts in lesson 2.
- In this course, low class is the **harbour** — keep both letters there.

## exposition vowel
image: images/lesson-01/vowel.jpg
scene: A young woman stands alone on a high grassy ridge with her head tipped back and her hands cupped around her mouth, calling out across a wide open valley. Her whole body leans into the shout. Warm golden late afternoon light, hazy blue hills receding into the distance.
glyph: า
anchor: AAH
gloss: long open ah
cue: AAH — held to the end of the breath
heading: The crook that follows its letter
narration: en Now a vowel, and in Thai a vowel is a thing with a position. Picture a post planted just after the consonant, its top curling over like a shepherd's crook. That is today's vowel. Listen to its name.
narration: th สระอา
narration: en The sound is a long, open ah — the one a doctor asks for, drawn right out to the end of your breath. Long is not decoration here. Length changes meaning in Thai, so a short version of this sound is a different vowel and often a different word.
narration: en And it never stands alone. It always rides behind a consonant, because it is the consonant that starts the syllable and the vowel that finishes it.
- า is a **long** vowel: an open *ah*, held.
- It follows its consonant on the page, and never stands alone.
- Vowel length changes meaning in Thai. Long and short are different vowels.

## exposition tone-flag
image: images/lesson-01/tone-flag.jpg
scene: A woman stands alone on an empty beach at dawn with her arms held straight out level at her sides, facing a perfectly flat sea. The horizon runs unbroken behind her and the water lies like glass. Cool blue shadow on the sand, warm gold light along the horizon.
heading: Listen to how flat it is
narration: en One warning before you build anything. Every Thai syllable carries a tone, and tone is part of the word — not expression, not mood. Change it and you have said something else.
narration: en Everything you are about to hear sits on a flat, level tone in the middle of your voice. Copy that flatness exactly. The strongest instinct you will have to fight is the English one: letting your pitch rise because a word feels like a question, or fall because it feels like the end of a sentence. Do not let it move.
narration: en Why these syllables come out flat is the whole subject of the next lesson. For now, just match what you hear.
- Every Thai syllable has a tone. Tone is part of the word's identity.
- Today's syllables are all **mid tone** — flat and level.
- Resist letting your pitch rise or fall. Copy the flat line exactly.

## exposition word-naa
image: images/lesson-01/word-naa.jpg
scene: A farmer in a wide straw hat wades knee deep through a flooded rice paddy, bending to press a seedling into the water with ripples spreading around him. Terraced green fields stretch away behind. Warm golden morning light, mist rising off the water, distant palms.
glyph: นา
anchor: NAA
gloss: a rice field
heading: Your first word
narration: en Put the mouse letter in front of the long vowel. Consonant first, vowel after — that is the order a Thai syllable is built in, and it is the order you will use for every word from here on.
narration: th นานา
narration: en That word means a rice field. It is about as ordinary a word as Thai has, and you built it out of two pieces you learned four minutes ago.
- น + า = **นา**
- นา — a rice field, a paddy.
- Consonant first, vowel second. This is how every Thai syllable is assembled.

## retrieval build-naa
reveal: build-naa-answer
prompt: Build it yourself: the letter whose loop is on the right, followed by the long vowel. Say the syllable aloud — flat and level — and say what it means.
narration: en Say it out loud, on a flat tone, before you turn this over.

## reveal build-naa-answer
retrieval: build-naa
narration: th นานา
narration: en A rice field. If your pitch moved while you said it, say it once more and hold it level.
- **นา** — a rice field.
- Flat, mid tone. No rise, no fall.

## exposition word-maa
image: images/lesson-01/word-maa.jpg
scene: A young woman walks toward the viewer along a wooden dock with a travel bag over one shoulder, smiling, one arm raised overhead in greeting. Boats and harbour buildings blur softly behind her. Warm golden light from behind catches the edge of her hair.
glyph: มา
anchor: MAA
gloss: to come
heading: Swap the front, keep the back
narration: en Now change only the first piece. Take the same long vowel, and put the horse letter in front of it instead of the mouse.
narration: th มา
narration: en That one is a verb: to come. It turns up everywhere — in greetings, in directions, in asking where somebody is from.
narration: en Notice what just happened. You did not learn a new word. You swapped one letter in a word you already had, and Thai handed you a second one. That is the whole payoff of learning the script instead of memorising phrases.
- ม + า = **มา**
- มา — *to come*. You will meet this verb constantly.
- Same vowel, different consonant, different word.

## retrieval build-maa
reveal: build-maa-answer
prompt: Take the word for a rice field and swap its first letter for the one whose loop hangs on the left. Say the new syllable aloud, and say what it means.
narration: en Out loud first, flat and level. Then turn it over.

## reveal build-maa-answer
retrieval: build-maa
narration: th มา
narration: en To come.
- **มา** — *to come*.

## exposition word-naan
image: images/lesson-01/word-naan.jpg
scene: An old fisherman sits alone on an upturned crate mending a net spread across his knees, hands working, face deeply lined. Behind him the same harbour lies still under a long low sun. Warm amber light and very long shadows stretch across the worn stone.
glyph: นาน
anchor: NAAN
gloss: a long time
heading: Close the syllable
narration: en One more, and this time nothing new is added — you will use a letter you already have, in a place you have not used it yet. Take your first word, the rice field, and put the mouse letter on the end of it as well as the front.
narration: th นาน
narration: en That means a long time. The same letter did two different jobs in one syllable: it started the sound, and it stopped it. Thai consonants do that routinely, and which job a letter is doing depends only on where it sits.
narration: en Listen to the ending. The sound closes cleanly and stays where it is. It does not trail off, and it does not pick up an extra vowel on the way out.
- น + า + น = **นาน**
- นาน — *a long time*.
- The same consonant can both **open** and **close** a syllable. Position decides its job.

## retrieval build-naan
reveal: build-naan-answer
prompt: Put the mouse letter on both ends of the long vowel. Say the syllable aloud, close the ending cleanly, and say what it means.
narration: en Say it, close it cleanly, then turn it over.

## reveal build-naan-answer
retrieval: build-naan
narration: th นาน
narration: en A long time. Two letters and one vowel, and you have three words — that is what the alphabet buys you.
- **นาน** — *a long time*.
- Two consonants, one vowel, three words: นา, มา, นาน.
