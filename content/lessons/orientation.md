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

VOICE. An enthusiastic teacher explaining something they genuinely believe in,
speaking to one student. The `welcome` slide is the reference for this, and it
was written by hand — match it rather than this description if the two ever
disagree.

  - Full sentences, not clipped fragments. "You are not here simply to read
    Thai", not "You're not here to read Thai. You're here to speak it."
  - Contractions are allowed but not wall to wall. "I'll" and "you'll" are
    fine; a run of "isn't / won't / doesn't" reads as a different, terser
    person.
  - Explain the mechanism, don't assert a maxim. Say *why* re-reading fails —
    the brain files the material under "stored in the book" — rather than
    declaring that it does.
  - Adverbial openers carry the argument: "Sadly," "Ironically," "Instead,"
    "Which means," "So."
  - Enthusiasm may show. An exclamation mark is allowed where the teacher is
    genuinely pleased, and at most one capitalised word per slide may carry an
    emphatic negation, as "NOT to remember" does on the welcome slide.
  - Be gentle about the student's past: "you were probably taught", "you may
    have tried". The villain is the method they were given, never them.
  - Avoid regional idiom and slang. A learner reading this may not be British.

LENGTH. Keep a narration line under about sixty words. Consecutive English
lines are merged by the parser and split at sentence boundaries, but the
English engine accelerates as a clip runs on, and past roughly two hundred
words in a single clip it has been measured inventing whole sentences that
appear nowhere in this file. See `scripts/lesson_deck/reference/ENGINES.md`.

English only. Nothing here is a Thai sound, so nothing here costs a metered
Thai voice — every clip is local.
-->

# Before you start

lesson: orientation

## exposition welcome
heading: Why this will work when other apps haven't
image: images/orientation/welcome.jpg
scene: An old scholar walks slowly along a vast stone colonnade with one hand trailing across the pillars as he passes them, his eyes closed, reciting from memory. Shafts of warm golden light fall between the columns onto the worn floor. Cool blue shadow lies in the depths behind him.
narration: en Welcome to this Accelerated Thai Course! Before we begin any of the lessons, I would like to explain why this application is so effective and how it differs from other courses you may have tried.
narration: en What makes this course unique is that it applies proven techniques for rapid learning that have been used for millennia! Other techniques were discovered relatively recently, for example how performing recall or quizzes just when you are about to forget some new concept will reinforce that thing many times stronger in your mind. All techniques have been adapted to the latest technological advancements in order to getting things into your head and keeping them there.
narration: en Sadly, many of these techniques have probably never reached you at school. Instead, you were probably taught to read new material over and over, perhaps while underlining the important parts. Ironically, that is close to the worst possible use of the hours you put in, because by repeating the same material over and over with almost no controlled delays in between, you were effectively teaching your brain NOT to remember anything because the brain recognized that the material is stored somewhere else, which is true. It was stored in the book. You were wasting time, and nobody ever told you!
narration: en Because we use these proven techniques as much as possible in this course, you will learn Thai significantly faster than most people who attempt it.
narration: en I'll walk you through the techniques and show you what the journey actually looks like, so that when you meet your first Thai letter you already know how to learn it.
- This course uses **proven rapid-learning techniques** — some ancient, some recent.
- School taught you to re-read and underline. That is close to the worst use of the hours.
- Re-reading teaches your brain the material lives in the book, so it does not keep it.
- Used properly, these techniques get you through Thai far faster than most people manage.

## exposition the-route
heading: Where this is going, and how you get there
image: images/orientation/the-route.jpg
scene: A young traveller stands at the foot of a long stone stairway winding up a green hillside, one hand shading her eyes as she looks up at the path ahead. Mist lies in the valley behind her. Warm golden morning light, distant temple roofs high above.
narration: en Before we go any further, let me be clear about where all of this is heading. You are not here simply to read Thai. You are here to speak it, to stand in front of another person, say exactly what you mean, and be understood. Reading is the road we take to get there.
narration: en So let me show you the whole staircase before you begin climbing it. First comes the script. Then words. Then the grammar that holds those words together. Then complete sentences, which you will first hear and then say back.
narration: en And when you say them, the application is listening. It compares the shape of your pitch against a native speaker and tells you how close you landed. Once you reach two hundred words and five grammar points, conversation practice unlocks, and from that moment you are talking with something that answers you back.
narration: en Now for the question almost everybody asks at this point. If this course is about speaking, why do the first few weeks look like an alphabet?
narration: en The answer is tone. Thai spelling tells you the tone of every single syllable, and in Thai the tone is not decoration. It is part of the word itself. Get the tone wrong and you have said a different word entirely. So the letters are not a detour on the way to speaking. They are precisely what makes correct speaking possible.
narration: en And almost everything that decides whether you reach the top of those stairs comes down to a small handful of habits. None of them are difficult. All of them are easy to skip, which is exactly why I am spending these next few minutes on them.
- The goal is **speaking** Thai, not only reading it.
- The route: script → words → grammar → whole sentences, heard *and* spoken aloud.
- Your pronunciation is scored — the app matches your pitch against a native speaker's.
- **Conversation practice unlocks at 200 words and 5 grammar points.**
- The script comes first because Thai spelling carries the tone, and the tone *is* the word.

## exposition forgetting
heading: You don't forget slowly. You forget in a rush.
image: images/orientation/forgetting.jpg
scene: A lamplighter reaches up with a long brass pole to relight a street lamp at dusk, his whole body stretched upward. Along the street behind him a row of lamps has already gone dark. Cool blue evening shadow, one warm pool of gold beneath the single lit lamp.
narration: en Something you learn today will be mostly gone by Thursday. And it does not drift away gently, the way most people imagine that forgetting works. Most of it disappears early and fast, and then the small amount that survives hangs on for a very long time.
narration: en Reading it again will not save it, and this is the trap that catches almost everybody. When you look at something you half know, it feels familiar, and familiarity feels a great deal like knowing. It is not the same thing at all.
narration: en The only thing that genuinely holds knowledge in place is pulling it back out of your own head at a moment when there is nothing in front of you to look at.
narration: en Look at the lamplighter for a moment. He is not relighting lamps that are still burning brightly, because that would be a waste of his entire evening. He reaches each lamp just as it begins to gutter. That timing is his whole job, and it is also the whole idea behind this application.
- Most of what you learn fades within days.
- Re-reading doesn't stop it. Recognising something isn't the same as knowing it.
- What stops it is **recall** — pulling it out of your head, at the right moment.

## exposition the-appointment
heading: When it tells you to review, review
image: images/orientation/appointment.jpg
scene: A lamplighter touches his flame to a lamp whose light has shrunk to a dying ember, the glass barely glowing, his arm stretched high above his head. He is alone on an empty street at nightfall. Cool blue dark all around, one small warm circle of gold at the lamp.
narration: en So the application keeps a running estimate for every single thing you have learned, of roughly when that particular item is about to slip away from you. And when a batch of them is close to going, it tells you.
narration: en I would like to be blunt about this part, because this is where most people quietly lose everything they have built. Ten minutes inside that window will do more for you than a full hour on a Sunday afternoon. That is not motivational talk. It is simply how the timing works.
narration: en And skipping is not free! It is not even a delay. The work you already invested in those cards begins leaking away while they sit there waiting for you, so when you finally return, they are harder than they were when you left them. You end up paying for the same work twice.
narration: en So please treat that notification as an appointment with someone you would be embarrassed to keep waiting.
- The app tracks, per item, when *you* are about to forget it.
- Ten minutes in that window beats an hour at the weekend.
- Skipping isn't a delay. You lose work you already did, and the cards come back harder.

## retrieval when-review
reveal: when-review-answer
prompt: So — when is the single best moment to review something you've learned? Say your answer out loud before you turn this over.
narration: en Out loud, please. Not inside your head. Even if you are not certain, and especially if you are not certain. Then turn it over.

## reveal when-review-answer
retrieval: when-review
narration: en Right as it begins to go. That slightly awkward moment where you have to reach for something and it just about arrives. That moment is worth more to you than any other, and finding it for you is essentially this entire application's job.
- **Just as you begin to forget it** — when recall takes effort but still works.
- Too early and you learn nothing. Too late and you're starting over.

## exposition struggle
heading: Notice what just happened
image: images/orientation/struggle.jpg
scene: A young woman hauls hard on a thick rope, leaning right back with her whole weight and her heels dug into wet sand, dragging a small wooden boat up the beach. Spray catches the light around her. Warm low sun, long shadows, cool blue water behind.
narration: en Notice what just happened there. That slide asked you before it told you anything at all, and I did that deliberately. Everything from this point onward will do exactly the same.
narration: en Reaching for an answer, coming up empty, and only then being shown it will place that thing in your head far more firmly than simply reading the answer ever could. The straining is not a test of whether you have learned something. The straining IS the learning.
narration: en Which means that uncomfortable, not-quite-sure feeling is the sound of the method working. So always answer first, every single time. Guess badly if you must! A wrong guess that you then correct will stay with you better than a correct answer you were simply handed.
- Every lesson asks before it shows.
- Guessing wrong, then being corrected, beats reading the right answer.
- **That unsure feeling is the method working, not failing.**
- Don't skip ahead to the answer.

## exposition mnemonics
heading: Nobody remembers squiggles. Everybody remembers a strange picture.
image: images/orientation/mnemonics.jpg
scene: An enormous orange cat sits calmly on a market stall roof wearing a tiny brass crown, one paw raised above the crowd below. Shoppers stop and look up, astonished. Warm golden afternoon light, bright striped awnings, dust motes drifting in the air.
narration: en Try to memorise that one particular squiggle makes an m sound, and you will have lost it again by Friday. Your memory is simply not built for that kind of work. Hand that same memory a cat in a crown sitting on a market roof, however, and you will still have it next year without any effort at all.
narration: en So we will never ask you to store a bare shape. Every letter arrives already attached to something you can picture — a horse at a harbour, a mouse curled up inside a coil of rope. Strange and specific is good. Strange and specific is what stays.
narration: en And you will not be doing this forever. The picture is scaffolding. Within a few weeks you will read the letter directly, without the image appearing at all, in the same way that you never think about a curved line when you read the letter C.
- You'll never be asked to memorise a bare shape.
- Every letter arrives attached to a picture, and the odder the better.
- The picture is **scaffolding**. It falls away by itself.

## exposition districts
heading: Every letter has an address
image: images/orientation/districts.jpg
scene: A woman stands on a high balcony looking down over a town divided into distinct quarters, each roofed in a different colour and separated by narrow canals. She rests both hands on the stone railing. Warm golden late light, long shadows between the rooftops, hazy hills beyond.
narration: en Putting things into places is the oldest memory technique there is, and it is still the most powerful one we have. We use it here for the single most important fact about any Thai letter.
narration: en Thai consonants come in three classes, and the class decides the tone. That makes the class the engine of the entire writing system. You cannot say a word aloud correctly without knowing it, and there are forty-four letters to keep straight.
narration: en So each class receives its own part of town. When you need a letter's class, you will not be scanning a list of forty-four. You will be asking which neighbourhood that letter lives in, and the answer arrives with the picture already attached to it.
narration: en Words receive places of their own a little further along, although they work somewhat differently. Every word's mnemonic is staged in one of six rooms: people, things, actions, connectors, particles, and counting words.
narration: en That is what keeps the cast and the props consistent, so the small stories build upon one another instead of fighting each other. But the room stays hidden while you are answering. It is there if you ask for a hint, and it appears alongside the answer. Telling you that a word was a verb before you had answered would be handing you half of it.
- Thai consonants have three **classes**, and class decides tone.
- Each class has its own **place** in one imaginary town.
- Recall becomes "which part of town?" instead of searching forty-four letters.
- Words get **rooms** later — people, things, actions, connectors, particles, counting words.
- A room is a *hint and a confirmation*, never a free clue before you answer.

## exposition tour-harbour
heading: The harbour — where most letters live
image: images/orientation/tour-harbour.jpg
scene: A wide working harbour at dawn seen from the quayside, fishing boats crowded along the water, thick mooring ropes coiled on wet stone and nets hung to dry on wooden posts. No people. Warm golden light low across flat water, cool blue shadow under the hulls.
narration: en Let us walk around the town now, before anybody lives here. It is far easier to move into a place later if you already know the streets.
narration: en Down at the water is the harbour. Ropes, boats, wet stone, and a low engine hum you can feel through your feet. Twenty-four of the forty-four consonants live down here, which is more than half of the entire alphabet! It is the busiest and most ordinary part of town, and the one you will be walking through constantly.
narration: en Stand here for a moment and look at it properly. Your first two letters move in during lesson one.
- The **harbour** is the low class — **24 letters**, more than half the alphabet.
- Down at the water. Ropes, boats, wet stone, a low hum.
- Your first two letters move in here in lesson 1.

## exposition tour-temple
heading: The temple — up the hill
image: images/orientation/tour-temple.jpg
scene: A golden temple standing at the top of a long flight of stone steps on a hillside, seen from the bottom looking up, with bells hanging along the balustrade and gilded spires catching the light. No people. Warm golden afternoon light on the gold, cool blue-green shade in the trees below.
narration: en Now climb. Up the steps on the hill above the town stands the temple. Gold, quiet, bells along the rail, and a very long way up from the water.
narration: en Only eleven letters live here, and that is worth noticing. It is a small and rather exclusive neighbourhood, and a short list is very much easier to hold in your head than a long one.
narration: en One honest warning while you are up here. This is the high class, and the temple standing high on the hill is simply a hook to keep that name attached to it. It does NOT mean that these letters make high tones. The class is a label, and what it actually does to the tone is something you will learn properly in lesson two.
- The **temple** is the high class — only **11 letters**.
- Up the hill. Gold, bells, quiet, a long climb from the water.
- The height keeps the *name* straight. It does **not** mean these letters sound high.

## exposition tour-market
heading: The market — and the trick this buys you
image: images/orientation/tour-market.jpg
scene: A covered street market on level ground between the harbour and the hill, stalls of fruit and cloth under striped awnings, crates stacked along the walkway, scales hanging from a beam. No people. Warm afternoon light filtering through the awnings, dust hanging in the air, cool shadow at the back of the stalls.
narration: en Between the two, on flat ground, is the market. Awnings, crates, fruit, and hanging scales. Nine letters live here, which makes it the smallest neighbourhood of the three.
narration: en Now, here is what this arrangement buys you, and it is the single biggest shortcut in the entire course. Nine letters at the market. Eleven at the temple. That gives you twenty letters whose address is genuinely worth learning.
narration: en Everything else is at the harbour. Which means you never have to memorise those twenty-four harbour letters at all! You learn the two short lists, and anything that does not appear on either of them has already told you where it lives.
narration: en Anything not nailed to the hill or to the market stalls has rolled down to the water, the way that everything eventually does.
- The **market** is the mid class — just **9 letters**.
- Flat ground between the two. Awnings, crates, hanging scales.
- **Learn the short lists only**: 9 at the market, 11 at the temple.
- Anything on neither list is at the harbour. That's 24 letters you never memorise.

## exposition aloud
heading: Say it out loud. Every single time.
image: images/orientation/aloud.jpg
scene: A young man stands alone in a sunlit courtyard with his head lifted and his mouth open, speaking aloud to nobody, hands loose at his sides. Washing hangs on lines strung above him. Warm afternoon light slanting between the buildings, dust hanging in the air.
narration: en Out loud. Properly out loud, where you can actually hear yourself. Not mouthed, and not muttered under your breath.
narration: en There are two reasons for this. The first is that recognising a sound and producing one are separate skills, and it is the second of those that gets you understood by a real person. Practise silently and you are training the half of the skill you will not be using.
narration: en The second reason matters even more. Thai has five tones, and the same syllable at a different pitch is a completely different word. You cannot possibly hear your own tone while it is only happening inside your head. Say it aloud and the mistake becomes something you can hear, and once you can hear it, you can correct it.
narration: en Yes, you will feel slightly foolish talking to yourself. Feel foolish now, alone in a room. It is considerably cheaper than feeling foolish in Bangkok!
- Say every word, every letter name and every answer **out loud**.
- Recognising and producing are different skills. Only one gets you understood.
- You can't hear your own tone errors silently.

## exposition pen
heading: Get a notebook. A cheap one.
image: images/orientation/pen.jpg
scene: An old scribe sits cross-legged at a low wooden table drawing a careful stroke with a bamboo pen, his whole upper body bent over the paper. Loose written sheets are stacked beside his knee. Warm lamplight from one side, deep cool shadow behind him.
narration: en Go and find a pen and some paper, and keep them beside you while you work. Not a stylus on a screen. Actual paper.
narration: en Write each letter out as you meet it. Your hand picks up a shape in a way that your eye never quite manages on its own, and a letter you have drawn thirty times stops being something you have to identify. It becomes a movement you already know, and movements come back to you very quickly.
narration: en This matters more in Thai than you might expect, because Thai letters have a set stroke order. Most of them begin at that little loop, and that is where the pen goes down. Get the order into your fingers and letters that looked identical to you last week will stop looking alike at all.
narration: en Ten minutes with a pen will do more for you than an hour of staring at a screen.
- Pen. Paper. Actually writing, not tracing on glass.
- The hand picks up shapes the eye doesn't.
- Thai letters have a **stroke order**, and most start at the loop.
- **Ten minutes writing beats an hour looking.**

## exposition ears
heading: Your eyes and your ears learn separately
image: images/orientation/ears.jpg
scene: A young woman sits very still on a wooden verandah with her eyes closed and her head tilted to one side, listening to rain falling beyond the eaves. Her hands rest loosely in her lap. Cool blue-grey rain light, one warm lamp glowing in the doorway behind her.
narration: en This one catches very nearly everybody. You will reach a point where you can read a Thai word off the page perfectly well, and then somebody says that exact same word to you and you have no idea what you have just heard. Reading and listening are trained separately, and neither one of them comes free with the other.
narration: en So the listening work is not a bonus round. Every clip you will hear is a native speaker, and you will be asked to pick out the tones by ear alone.
narration: en It will feel impossible early on, and there is a reason for that which has nothing whatsoever to do with you being bad at languages. Whatever language you grew up with taught you, when you were a baby, that pitch differences like these do not change what a word means. So you learned to filter them out.
narration: en Which means you are not really building a new skill here. You are switching off an old filter, and that takes a few weeks of your ears being thoroughly confused. So do the listening exercises on the days when they feel most hopeless. Those are precisely the days on which it is actually moving.
- Reading well and hearing well are **separate skills**.
- Every clip is a native speaker. Tone exercises train the ear on purpose.
- It feels impossible at first because your first language taught you to ignore these differences.
- Do them anyway — especially then.

## retrieval three-habits
reveal: three-habits-answer
prompt: Three habits matter more than everything else in this course put together. Name all three out loud before you turn this over.
narration: en Three of them. All three, out loud, and then turn it over.

## reveal three-habits-answer
retrieval: three-habits
narration: en Review when the application tells you to. Write the letters by hand. Say everything out loud. That is all there is to it. Everything else here is built to work, but it only works while those three things are actually happening.
- **Review when notified** — in the window, not later.
- **Write by hand**, with a pen, on paper.
- **Say it out loud**, every time.

## exposition expect
heading: What this is actually going to feel like
image: images/orientation/expect.jpg
scene: A hiker stands on a high ridge looking back down at the long winding path she has already climbed, hands on her hips and a pack on her back. The valley falls away below her. Warm golden evening light, blue haze layering the distant hills.
narration: en One last thing, so that the hard part does not take you by surprise. The alphabet is the steepest section of this entire course, and it is sitting right at the start. Your first few weeks will be the slowest weeks you will have, and somewhere around week two you will probably decide that this is not working.
narration: en It is working. What happens next is that the whole thing flips. Once the letters become automatic, every new thing you meet hooks onto something you already own, and the pace picks up dramatically.
narration: en Vocabulary that would have been meaningless noise to you in week one turns into words you can half read before anybody has told you what they mean.
narration: en So please do not judge this course in week one. Judge it in week six. Keep those three habits, answer before you reveal, and show up when the application asks you to. That is the deal.
- The alphabet is the hardest part and it comes **first**. That's on purpose.
- Weeks one to three feel slow. That's the shape of the climb, not a warning.
- After that it compounds — new things hook onto what you already own.
- **Don't judge this in week one. Judge it in week six.**
