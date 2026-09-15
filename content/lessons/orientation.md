<!--
The orientation deck. Deliberately NOT a lesson.

It teaches no symbol, so it declares none, generates no review cards, holds no
position in `lessonSequence` and gates nothing. Positions are the join key the
persisted stores are written against — inserting this at the front would shift
every stored position by one and silently re-point the progress of anyone
already part-way through the course. And `startLesson` requires every earlier
position complete, so as a lesson this would become a wall a returning learner
had to climb before reaching the material they came back for.

It is built by the ordinary deck pipeline, so it gets the renderer, the
narration, the illustrations and the retrieval slides for free, and it is
reached by its own route rather than by a lesson number.

IT PRACTISES WHAT IT PREACHES. The retrieval slides are real: the first time a
learner meets retrieval practice is while being told why it works, and the
first question is asked before its answer has been given anywhere. A deck that
explained spaced repetition by lecturing would be arguing against itself.

VOICE. This is a teacher talking, not a document being read aloud. Contractions
throughout — "you'll", "don't", "here's" — because a narrator who says "do not"
and "it is" sounds like a form letter. Sentence lengths vary hard: some of four
words, some of thirty. At most one memorable line per slide, because a maxim
every twenty seconds stops landing. Say the student's objection back to them in
their own words before answering it. Give instructions, not epigrams — "get a
cheap notebook" beats "the hand learns what the eye cannot".

English only. Nothing here is a Thai sound, so nothing here costs a metered
Thai voice — every clip is local.
-->

# Before you start

lesson: orientation

## exposition welcome
heading: Where this is going, and how you get there
image: images/orientation/welcome.jpg
scene: A young traveller stands at the foot of a long stone stairway winding up a green hillside, one hand shading her eyes as she looks up at the path ahead. Mist lies in the valley behind her. Warm golden morning light, distant temple roofs high above.
narration: en You're not here to read Thai. You're here to speak it — to stand in front of someone, say what you mean, and have them understand you. Reading is just how we get there.
narration: en So let me show you the whole staircase before you start climbing it. First the script. Then words. Then the grammar that holds words together. Then full sentences, which you'll hear and then say back — and when you say them, the app is listening. It compares the shape of your pitch to a native speaker's and tells you how close you landed. Get to two hundred words and five grammar points, and conversation practice opens up. Then you're talking to something that talks back.
narration: en Now, the bit everyone asks about. If this is about speaking, why do the first few weeks look like an alphabet?
narration: en Because of tone. Thai spelling tells you the tone of every syllable, and tone isn't decoration in Thai — it's part of the word. Get the tone wrong and you've said a different word. So the letters aren't a detour. They're the thing that makes the speaking possible.
narration: en Give me five minutes first. This app doesn't work the way most language apps work, and nearly everything that decides whether you make it to the top comes down to a few habits. None of them are hard. All of them are easy to skip.
- The goal is **speaking** Thai, not only reading it.
- The route: script → words → grammar → whole sentences, heard *and* spoken aloud.
- Your pronunciation is scored — the app matches your pitch against a native speaker's.
- **Conversation practice unlocks at 200 words and 5 grammar points.**
- The script comes first because Thai spelling carries the tone, and the tone *is* the word.

## exposition forgetting
heading: You don't forget slowly. You forget in a rush.
image: images/orientation/forgetting.jpg
scene: A lamplighter reaches up with a long brass pole to relight a street lamp at dusk, his whole body stretched upward. Along the street behind him a row of lamps has already gone dark. Cool blue evening shadow, one warm pool of gold beneath the single lit lamp.
narration: en Something you learn today is mostly gone by Thursday. Not drifting away gently — most of it goes early and fast, and then the little that's left hangs on for ages.
narration: en Reading it again won't save it. That's the trap. When you look at something you half-know, it feels familiar, and familiar feels like knowing. It isn't. The only thing that actually holds it in place is pulling it back out of your head when there's nothing in front of you.
narration: en Look at the lamplighter. He's not relighting lamps that are still burning — that would be pointless. He's getting to each one just as it starts to gutter. That timing is the whole job, and it's the whole idea behind this app.
- Most of what you learn fades within days.
- Re-reading doesn't stop it. Recognising something isn't the same as knowing it.
- What stops it is **recall** — pulling it out of your head, at the right moment.

## exposition the-appointment
heading: When it tells you to review, review
image: images/orientation/appointment.jpg
scene: A lamplighter touches his flame to a lamp whose light has shrunk to a dying ember, the glass barely glowing, his arm stretched high above his head. He is alone on an empty street at nightfall. Cool blue dark all around, one small warm circle of gold at the lamp.
narration: en So the app keeps a running estimate for every single thing you've learned: roughly when that one is about to slip. And when a batch of them is close, it tells you.
narration: en I want to be blunt about this part, because it's where most people quietly lose the whole thing. Ten minutes in that window will do more for you than an hour on Sunday afternoon. That's not motivational talk, it's just how the timing works.
narration: en And skipping isn't free. It isn't a delay. The work you already put into those cards starts leaking away while they sit there, and when you finally come back, they're harder than when you left them. You end up paying twice.
narration: en Treat it like an appointment with someone you'd be embarrassed to stand up.
- The app tracks, per item, when *you* are about to forget it.
- Ten minutes in that window beats an hour at the weekend.
- Skipping isn't a delay. You lose work you already did, and the cards come back harder.

## retrieval when-review
reveal: when-review-answer
prompt: So — when is the single best moment to review something you've learned? Say your answer out loud before you turn this over.
narration: en Out loud. Not in your head. Even if you're not sure, especially if you're not sure. Then turn it over.

## reveal when-review-answer
retrieval: when-review
narration: en Right as it starts to go. That awkward moment where you have to reach for it and it just about comes. That's the one worth the most, and finding it for you is basically the app's whole job.
- **Just as you begin to forget it** — when recall takes effort but still works.
- Too early and you learn nothing. Too late and you're starting over.

## exposition struggle
heading: Notice what just happened
image: images/orientation/struggle.jpg
scene: A young woman hauls hard on a thick rope, leaning right back with her whole weight and her heels dug into wet sand, dragging a small wooden boat up the beach. Spray catches the light around her. Warm low sun, long shadows, cool blue water behind.
narration: en That slide asked you before it told you. I did that on purpose, and everything from here on will do the same.
narration: en Reaching for an answer and coming up empty, and then being shown it, puts the thing in your head far more firmly than just reading the answer ever will. The straining bit isn't a test of whether you learned it. The straining bit is you learning it.
narration: en Which means that horrible not-quite-sure feeling is the sound of it working. So answer first, every time. Guess badly if you have to. A wrong guess you then correct sticks better than a right answer you were handed.
- Every lesson asks before it shows.
- Guessing wrong, then being corrected, beats reading the right answer.
- **That unsure feeling is the method working, not failing.**
- Don't skip ahead to the answer.

## exposition mnemonics
heading: Nobody remembers squiggles. Everybody remembers a strange picture.
image: images/orientation/mnemonics.jpg
scene: An enormous orange cat sits calmly on a market stall roof wearing a tiny brass crown, one paw raised above the crowd below. Shoppers stop and look up, astonished. Warm golden afternoon light, bright striped awnings, dust motes drifting in the air.
narration: en Try to memorise that a particular squiggle makes an m sound and you'll lose it by Friday. Your memory just isn't built for that. Hand it a cat in a crown on a market roof, though, and you'll still have that next year without trying.
narration: en So we never ask you to store a bare shape. Every letter turns up already stuck to something you can see — a horse at a harbour, a mouse curled up in a coil of rope. Odd and specific is good. Odd and specific is what sticks.
narration: en And you won't be doing this forever. The picture is scaffolding. In a few weeks you'll read the letter straight through without it ever showing up, the same way you don't think about a curved line when you read a C.
- You'll never be asked to memorise a bare shape.
- Every letter arrives attached to a picture, and the odder the better.
- The picture is **scaffolding**. It falls away by itself.

## exposition districts
heading: Every letter has an address
image: images/orientation/districts.jpg
scene: A woman stands on a high balcony looking down over a town divided into distinct quarters, each roofed in a different colour and separated by narrow canals. She rests both hands on the stone railing. Warm golden late light, long shadows between the rooftops, hazy hills beyond.
narration: en Putting things in places is the oldest memory trick there is, and it's still the best one. We use it here for the single most important fact about any Thai letter.
narration: en Thai consonants come in three classes. The class decides the tone. That makes it the engine of the entire writing system — you can't say a word out loud correctly without knowing it, and there are forty-four letters to keep straight.
narration: en So each class gets its own part of town. When you need a letter's class, you won't be scanning a list of forty-four. You'll be asking which neighbourhood it lives in, and the answer arrives with the picture attached. Later on the same trick gets used for word types, so verbs live in one place and nouns in another.
- Thai consonants have three **classes**, and class decides tone.
- Each class has its own **place** — you'll meet the first one in lesson 1.
- Recall becomes "which part of town?" instead of searching forty-four letters.

## exposition aloud
heading: Say it out loud. Every single time.
image: images/orientation/aloud.jpg
scene: A young man stands alone in a sunlit courtyard with his head lifted and his mouth open, speaking aloud to nobody, hands loose at his sides. Washing hangs on lines strung above him. Warm afternoon light slanting between the buildings, dust hanging in the air.
narration: en Out loud. Properly out loud, where you can hear yourself. Not mouthed, not muttered.
narration: en Two reasons. The first is that recognising a sound and making one are separate skills, and it's the second one that gets you understood by an actual person. Practise silently and you're training the half you won't be using.
narration: en The second reason matters more. Thai has five tones, and the same syllable at a different pitch is a different word. You cannot hear your own tone when it's only happening in your head. Say it aloud and the mistake becomes something you can actually hear, and once you can hear it you can fix it.
narration: en Yes, you'll feel daft talking to yourself. Feel daft now, alone in a room. It's much cheaper than feeling daft in Bangkok.
- Say every word, every letter name and every answer **out loud**.
- Recognising and producing are different skills. Only one gets you understood.
- You can't hear your own tone errors silently.

## exposition pen
heading: Get a notebook. A cheap one.
image: images/orientation/pen.jpg
scene: An old scribe sits cross-legged at a low wooden table drawing a careful stroke with a bamboo pen, his whole upper body bent over the paper. Loose written sheets are stacked beside his knee. Warm lamplight from one side, deep cool shadow behind him.
narration: en Go and find a pen and some paper, and keep them next to you while you work. Not a stylus on a screen. Paper.
narration: en Write each letter out as you meet it. Your hand picks up a shape in a way your eye never manages on its own, and a letter you've drawn thirty times stops being something you have to identify. It becomes a movement you already know, and movements come back fast.
narration: en This matters more in Thai than you'd expect, because Thai letters have a set stroke order. Most of them start at that little loop — that's where the pen goes down. Get the order into your fingers and letters that looked identical last week stop looking alike at all.
narration: en Ten minutes with a pen beats an hour of staring. I'd put money on it.
- Pen. Paper. Actually writing, not tracing on glass.
- The hand picks up shapes the eye doesn't.
- Thai letters have a **stroke order**, and most start at the loop.
- **Ten minutes writing beats an hour looking.**

## exposition ears
heading: Your eyes and your ears learn separately
image: images/orientation/ears.jpg
scene: A young woman sits very still on a wooden verandah with her eyes closed and her head tilted to one side, listening to rain falling beyond the eaves. Her hands rest loosely in her lap. Cool blue-grey rain light, one warm lamp glowing in the doorway behind her.
narration: en This one catches nearly everybody. You'll get to a point where you can read a Thai word off the page perfectly well, and then someone says that exact word to you and you have no idea what you just heard. Reading and listening are trained separately. Neither comes free with the other.
narration: en So the listening work isn't a bonus round. Every clip you'll hear is a native speaker, and you'll be asked to pick out tones by ear.
narration: en It'll feel impossible early on, and there's a reason for that which has nothing to do with you being bad at it. Whatever language you grew up with taught you, as a baby, that pitch differences like these don't change what a word means. You learned to filter them out. You're not building a new skill here so much as switching an old filter off, and that takes a few weeks of your ears being confused.
narration: en So do the listening exercises on the days they feel hopeless. Those are the days it's actually moving.
- Reading well and hearing well are **separate skills**.
- Every clip is a native speaker. Tone exercises train the ear on purpose.
- It feels impossible at first because your first language taught you to ignore these differences.
- Do them anyway — especially then.

## retrieval three-habits
reveal: three-habits-answer
prompt: Three habits matter more than everything else in this course put together. Name all three out loud before you turn this over.
narration: en Three of them. All three, out loud, then turn it over.

## reveal three-habits-answer
retrieval: three-habits
narration: en Review when it tells you to. Write the letters by hand. Say everything out loud. That's it. Everything else here is built to work, but only while those three are actually happening.
- **Review when notified** — in the window, not later.
- **Write by hand**, with a pen, on paper.
- **Say it out loud**, every time.

## exposition expect
heading: What this is actually going to feel like
image: images/orientation/expect.jpg
scene: A hiker stands on a high ridge looking back down at the long winding path she has already climbed, hands on her hips and a pack on her back. The valley falls away below her. Warm golden evening light, blue haze layering the distant hills.
narration: en One last thing, so the hard part doesn't blindside you. The alphabet is the steepest bit of this entire course and it's sitting right at the start. Your first few weeks will be the slowest weeks you'll have, and somewhere in week two you'll probably decide this isn't working.
narration: en It is working. What happens next is that it flips. Once the letters go automatic, every new thing you meet hooks onto something you already own, and the whole thing speeds up. Vocabulary that would've been noise in week one turns into words you can half read before anyone tells you what they mean.
narration: en So don't judge this in week one. Judge it in week six. Keep those three habits, answer before you reveal, and show up when the app asks you to. That's the deal.
- The alphabet is the hardest part and it comes **first**. That's on purpose.
- Weeks one to three feel slow. That's the shape of the climb, not a warning.
- After that it compounds — new things hook onto what you already own.
- **Don't judge this in week one. Judge it in week six.**
