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

VOICE. Ajarn Pim — see `docs/the-teacher.md`, which is who is speaking here and
everywhere else in the course. This deck is where she introduces herself, and
the later lessons are written assuming the learner has met her: the harbour is
Songkhla, she could sing the alphabet for twenty years without reading a sign,
and she learned to read at twenty-six. Her life arrives a sentence at a time,
in service of the thing being taught, never as a set piece.

An enthusiastic teacher explaining something they genuinely believe in,
speaking to one student. The `welcome` slide is the reference for this — match
it rather than this description if the two ever disagree.

  - Full sentences, not clipped fragments. "You are here to speak Thai", not
    "You're not here to read Thai. You're here to speak it."
  - Write the positive. `docs/lesson-voice.md` rejected three "X is not Y"
    constructions from this file by name; the shape is the fault wherever it
    appears, so do not reintroduce one to gain an emphasis.
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

LENGTH. Keep a narration line comfortably under `MAX_MERGED_WORDS` in
`script_parser.py`, currently 150. A slide's consecutive English lines are
packed into clips up to that cap and always flushed at an authored line break,
so one line is never split across a seam with its neighbour. The English engine
accelerates as a clip runs on, and past roughly two hundred words in a single
clip it has been measured inventing whole sentences that appear nowhere in this
file. See `scripts/lesson_deck/reference/ENGINES.md`.

English only. Nothing here is a Thai sound, so nothing here costs a metered
Thai voice — every clip is local.
-->

# Before you start

lesson: orientation

## exposition welcome
heading: Why this will work when other apps haven't
image: images/orientation/welcome.jpg
scene: An old scholar walks slowly along a vast stone colonnade with one hand trailing across the pillars as he passes them, his eyes closed, reciting from memory. Shafts of warm golden light fall between the columns onto the worn floor. Cool blue shadow lies in the depths behind him.
narration: en [short pause] Welcome to this Accelerated Thai Course! [pause] My name is Pim. Before we begin any of the lessons, I would like to tell you why this application works — and one thing about myself that explains why I built it in the first place.
narration: en Thai was the language of my house growing up. I spoke it every day of my childhood and I never learned to read a word of it. My grandmother taught me the alphabet song before my parents took me abroad, the same song every Thai child learns, so by the age of seven I could sing all forty-four letter names in order. I sang them for twenty years. I still could not read a shop sign.
narration: en Singing the names turned out to be a completely different thing from reading them. Nobody had ever shown me the difference. That gap is what this whole application exists to close, using techniques that are partly ancient and partly very recent — among them the finding that a quiz taken just as you are about to lose something will fix it far harder than another hour of reading ever could.
narration: en [short pause] Sadly, almost none of that reached you at school. Instead, you were probably taught to read new material over and over, perhaps while underlining the important parts. [short pause] Ironically, that is close to the worst possible use of the hours you put in, because by repeating the same material with almost no delay in between, you were teaching your brain NOT to remember it. Your brain could see the material was kept somewhere else, which was perfectly true. It was kept in the book. You were wasting time, and nobody ever told you!
narration: en My alphabet song was the same trap wearing a nicer costume. The names were safe inside the tune, so my head never troubled itself to hold them anywhere else.
narration: en Because this course leans on the techniques that genuinely work, you will get through Thai considerably faster than most people who attempt it. I'll walk you through them now and show you what the journey actually looks like, so that when you meet your first Thai letter you already know how to learn it.
image-prompt: An old thai scholar walks slowly along a vast stone colonnade with one hand trailing across the pillars as he passes them, his eyes closed, reciting from memory. Shafts of warm golden light fall between the columns onto the worn floor. Cool blue shadow lies in the depths behind him. Anime illustration with clean confident ink linework and a soft watercolour wash. Warm golden key light against cool blue shadows, drifting dust motes, visible paper grain, rich saturated colour. Expressive faces, cinematic composition, detailed background. No text, letters, numbers or signage anywhere in the image.
image-seed: 42
- Your teacher: **Pim**. Knew all forty-four letter names at seven, could not read a word until twenty-six.
- This course uses **proven rapid-learning techniques** — some ancient, some recent.
- School taught you to re-read and underline. That is close to the worst use of the hours.
- Re-reading teaches your brain the material lives in the book, so it does not keep it.
- Used properly, these techniques get you through Thai far faster than most people manage.

## exposition the-route
heading: Where this is going, and how you get there
image: images/orientation/the-route.jpg
scene: A young traveller stands at the foot of a long stone stairway winding up a green hillside, one hand shading her eyes as she looks up at the path ahead. Mist lies in the valley behind her. Warm golden morning light, distant temple roofs high above.
narration: en Let me be clear about where all of this is heading before we go a step further. You are here to speak Thai. To stand in front of another person and say exactly what you mean and be understood by them. Reading is the road we take to get there.
narration: en There is one thing I am firmly against. You may as well hear it early. A great many courses will hand you ten phrases for a holiday — hello, thank you, where is the station, plus a smile to cover everything else. I have taught rooms full of people who arrived with exactly that. They could order lunch. They could not read the sign above the shop they ordered it in. A country stays shut to you until you can read it. Almost nobody bothers.
narration: en So let me show you the whole staircase before you start climbing. First comes the script. Then words. Then the grammar that holds those words together. Then complete sentences, which you will hear first and say back afterwards.
narration: en And when you say them, the application is listening. It compares the shape of your pitch against a native speaker and tells you how close you landed. Once you reach two hundred words and five grammar points, conversation practice unlocks. From that moment you are talking with something that answers you back.
narration: en Which brings me to the question almost everybody asks at this point. If this course is about speaking, why do the first few weeks look like an alphabet?
narration: en The answer is tone. Thai spelling tells you the tone of every single syllable you read, and the tone belongs to the word as surely as the vowel does. Move it and you have said something else entirely, to somebody who is listening carefully. So the letters are the shortest road to speaking rather than a detour away from it.
narration: en Almost everything that decides whether you reach the top of those stairs comes down to a small handful of habits. None of them are difficult. All of them are easy to skip, which is exactly why I am spending these next few minutes on them.
- The goal is **speaking** Thai, not only reading it.
- Ten phrases for a holiday makes a tourist. Reading makes a guest.
- The route: script → words → grammar → whole sentences, heard *and* spoken aloud.
- Your pronunciation is scored — the app matches your pitch against a native speaker's.
- **Conversation practice unlocks at 200 words and 5 grammar points.**
- The script comes first because Thai spelling carries the tone, and the tone *is* the word.

## exposition forgetting
heading: You don't forget slowly. You forget in a rush.
image: images/orientation/forgetting.jpg
scene: A lamplighter reaches up with a long brass pole to relight a street lamp at dusk, his whole body stretched upward. Along the street behind him a row of lamps has already gone dark. Cool blue evening shadow, one warm pool of gold beneath the single lit lamp.
narration: en Something you learn today will be mostly gone in two days. It does not drain away slowly, the way most people picture forgetting. Most of it goes early and goes fast. Then the small remainder still standing hangs on for years.
narration: en I spent four years studying precisely this, as it happens — a doctorate on how adults take on a second writing system — and I picked the subject for the least noble reason there is. I wanted to know why it had been so hard for me.
narration: en Reading it again will not save it. That is the trap almost everybody falls into. Something you half know looks familiar while you are staring straight at it, and familiarity feels a great deal like knowing, right up to the moment somebody takes the page away.
narration: en The only thing that genuinely holds knowledge in place is pulling it back out of your own head at a moment when there is nothing in front of you to look at.
narration: en Look at the lamplighter for a moment. He walks past every lamp still burning well, because stopping at those would cost him his entire evening. He reaches each one just as it begins to gutter. That timing is his whole job. It is also the whole idea behind this application.
- Most of what you learn fades within days.
- Re-reading doesn't stop it. Recognising something isn't the same as knowing it.
- What stops it is **recall** — pulling it out of your head, at the right moment.

## exposition the-appointment
heading: When it tells you to review, review
image: images/orientation/appointment.jpg
scene: A lamplighter touches his flame to a lamp whose light has shrunk to a dying ember, the glass barely glowing, his arm stretched high above his head. He is alone on an empty street at nightfall. Cool blue dark all around, one small warm circle of gold at the lamp.
narration: en The application keeps a running estimate, for every single thing you have learned, of roughly when you are about to lose it. When a batch of them is close to going, it tells you.
narration: en I will be blunt about this part, because this is where most people quietly lose everything they have built. Ten minutes inside that window buys you more than a full hour of catching up later. A card you catch in time costs you one look. The same card a week late costs you most of the way back to where you started with it.
narration: en Skipping costs you more than the ten minutes it saved. The work you already put into those cards leaks away while they sit there waiting for you, so when you finally come back they are harder than the day you left them. You pay for the same work twice.
narration: en Treat that notification as an appointment with somebody you would be embarrassed to keep waiting.
- The app tracks, per item, when *you* are about to forget it.
- Ten minutes in that window beats an hour of catching up later.
- Skipping isn't a delay. You lose work you already did, and the cards come back harder.

## retrieval when-review
reveal: when-review-answer
prompt: So — when is the single best moment to review something you've learned? Say your answer out loud before you turn this over.
narration: en Out loud, please. Say it to the room, even if you are only half sure — especially if you are only half sure. Then turn it over.

## reveal when-review-answer
retrieval: when-review
narration: en Right as it begins to go. That slightly awkward moment where you have to reach for something and it just about arrives. That awkward second is worth more than any other moment in your day, and finding it for you is the whole job of this application.
- **Just as you begin to forget it** — when recall takes effort but still works.
- Too early and you learn nothing. Too late and you're starting over.

## exposition struggle
heading: Notice what just happened
image: images/orientation/struggle.jpg
scene: A young woman hauls hard on a thick rope, leaning right back with her whole weight and her heels dug into wet sand, dragging a small wooden boat up the beach. Spray catches the light around her. Warm low sun, long shadows, cool blue water behind.
narration: en Notice what just happened there. You were asked before you were told anything at all. Did you feel that small scrape as you reached for it? I did that on purpose, and everything from here onward will do the same to you.
narration: en I learned to read my own language at twenty-six, and I was bad at it. Properly bad. Sounding out a menu with my finger under the line while a waiter stood there being polite about it. What carried me through was getting it wrong out loud, over and over, in front of people who would correct me.
narration: en Reaching for an answer, coming up empty and only then being shown it will fix that thing in your head far harder than reading the answer ever could. The straining IS the learning.
narration: en Which means that uncomfortable, half-sure feeling is the sound of the method working. So answer first, every time. Guess badly if you must! A wrong guess that you then correct will stay with you better than a correct answer somebody simply handed you.
- Every lesson asks before it shows.
- Guessing wrong, then being corrected, beats reading the right answer.
- **That unsure feeling is the method working, not failing.**
- Don't skip ahead to the answer.

## exposition mnemonics
heading: Nobody remembers squiggles. Everybody remembers a strange picture.
image: images/orientation/mnemonics.jpg
scene: An enormous orange cat sits calmly on a market stall roof wearing a tiny brass crown, one paw raised above the crowd below. Shoppers stop and look up, astonished. Warm golden afternoon light, bright striped awnings, dust motes drifting in the air.
narration: en Try to memorise that one particular squiggle makes an m sound and it will be gone again inside a week. Your memory was never built for that kind of work. Hand that same memory a cat in a crown sitting on a market roof and next year the cat is still up there.
narration: en Every picture in this course was built by me, deliberately, out of things I could not shake loose. None of it is folklore. I went and read the oldest memory research there is, then made the images myself, because the ones printed in books belonged to somebody else's childhood and slid straight off mine.
narration: en You will never be asked to store a bare shape. Every letter arrives already attached to something you can picture — a horse at a harbour, a mouse curled up inside a coil of rope. Strange and specific is good. Strange and specific is what stays.
narration: en And you will not be doing this forever. The picture is scaffolding. Within a few weeks you will read the letter directly, without the image appearing at all, in the same way that you never think about a curved line when you read the letter C.
- You'll never be asked to memorise a bare shape.
- Every letter arrives attached to a picture, and the odder the better.
- The picture is **scaffolding**. It falls away by itself.

## exposition districts
heading: Every letter has an address
image: images/orientation/districts.jpg
scene: A woman stands on a high balcony looking down over a town divided into distinct quarters, each roofed in a different colour and separated by narrow canals. She rests both hands on the stone railing. Warm golden late light, long shadows between the rooftops, hazy hills beyond.
narration: en Putting things into places is the oldest memory technique we have, and two thousand years of people with no books to lean on never found a better one. Here it carries the single most important fact about any Thai letter.
narration: en Thai consonants come in three classes. The class decides the tone, which makes it the engine of the entire writing system — you cannot say a word correctly aloud without knowing which class its letters belong to. There are forty-four letters to keep straight.
narration: en So each class gets its own part of town. When you need a letter's class you will be asking which neighbourhood it lives in, and the answer arrives with the picture already stuck to it.
narration: en I built that town myself, and it seems only fair to say so rather than let it sit there looking like something ancient that was handed down to me. The place is Songkhla, where I was born, remembered by a child who left at seven. Half the detail is probably wrong. All of it is vivid, which turns out to be the half that does the work.
narration: en Words receive places of their own a little further along, though they work somewhat differently. Every word's mnemonic is staged in one of six rooms — people, things, actions, connectors, particles, counting words.
narration: en That is what keeps the cast and the props consistent, so the small stories build on one another instead of fighting. The room stays hidden while you are answering, though. Ask for a hint and it appears. It shows up again beside the answer afterwards. Telling you a word was a verb before you had answered would be handing you half of it.
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
narration: en Down at the water is the harbour. Ropes, boats, wet stone, a low engine hum you can feel through the soles of your shoes. Twenty-four of the forty-four consonants live down here, more than half of the entire alphabet! It is the busiest and most ordinary part of town, the one you will be walking through constantly.
narration: en I grew up over a harbour very like this one. My family's house in Songkhla stood above a working quay, and I left it at seven when my parents went abroad for work, so I remember almost nothing about the town and everything about how that quay smelled at six in the morning. That is why the low class lives on the water. You never forget how a place smelled.
narration: en Stand here for a moment and look at it properly. Your first two letters move in during lesson one.
- The **harbour** is the low class — **24 letters**, more than half the alphabet.
- Down at the water. Ropes, boats, wet stone, a low hum.
- Your first two letters move in here in lesson 1.

## exposition tour-temple
heading: The temple — up the hill
image: images/orientation/tour-temple.jpg
scene: A golden temple standing at the top of a long flight of stone steps on a hillside, seen from the bottom looking up, with bells hanging along the balustrade and gilded spires catching the light. No people. Warm golden afternoon light on the gold, cool blue-green shade in the trees below.
narration: en Now climb. The temple stands above the town, up a long flight of stone steps. Gold, quiet, bells along the rail, a very long way from the water.
narration: en Only eleven letters live up here. A short list sits in your head far more easily than a long one, so this small and rather exclusive neighbourhood is cheap to learn and you will be glad of that in a moment.
narration: en Before you come back down, one honest warning. These letters are the high class, and the temple up on its hill is a hook to keep that name stuck to them. It does NOT mean these letters make high tones. The class is a label. What that label actually does to a tone is the whole of lesson two.
- The **temple** is the high class — only **11 letters**.
- Up the hill. Gold, bells, quiet, a long climb from the water.
- The height keeps the *name* straight. It does **not** mean these letters sound high.

## exposition tour-market
heading: The market — and the trick this buys you
image: images/orientation/tour-market.jpg
scene: A covered street market on level ground between the harbour and the hill, stalls of fruit and cloth under striped awnings, crates stacked along the walkway, scales hanging from a beam. No people. Warm afternoon light filtering through the awnings, dust hanging in the air, cool shadow at the back of the stalls.
narration: en Between the two, on flat ground, sits the market. Awnings, crates, fruit, scales hanging from a beam. Nine letters live here, the smallest of the three neighbourhoods.
narration: en Now, work out what that arrangement has just bought you. Nine at the market. Eleven at the temple. How many of the forty-four addresses do you actually have to learn?
narration: en Twenty of them. Everything else is down at the harbour, which means those twenty-four letters need no memorising whatsoever. You learn the two short lists, and anything missing from both has already told you where it lives.
narration: en Anything not nailed to the hill or to the market stalls has rolled down to the water, the way that everything eventually does.
- The **market** is the mid class — just **9 letters**.
- Flat ground between the two. Awnings, crates, hanging scales.
- **Learn the short lists only**: 9 at the market, 11 at the temple.
- Anything on neither list is at the harbour. That's 24 letters you never memorise.

## exposition aloud
heading: Say it out loud. Every single time.
image: images/orientation/aloud.jpg
scene: A young man stands alone in a sunlit courtyard with his head lifted and his mouth open, speaking aloud to nobody, hands loose at his sides. Washing hangs on lines strung above him. Warm afternoon light slanting between the buildings, dust hanging in the air.
narration: en Say it aloud. Properly aloud, at a volume where you can hear yourself — a mumble into your collar will do nothing for you at all.
narration: en There are two reasons, and the first one is about your mouth. Recognising a sound and producing one are separate skills. Producing is the half that gets you understood by a real person, so practise silently and you have trained the half you will never use.
narration: en The second reason matters more. Thai has five tones. The same syllable at a different pitch is a completely different word, and you cannot hear your own pitch while the word is still inside your head. Say it where your ears can reach it and the mistake turns into something you can fix.
narration: en Yes, you will feel slightly foolish talking to yourself. Feel foolish now, alone in a room. It is considerably cheaper than feeling foolish in Bangkok!
- Say every word, every letter name and every answer **out loud**.
- Recognising and producing are different skills. Only one gets you understood.
- You can't hear your own tone errors silently.

## exposition pen
heading: Get a notebook. A cheap one.
image: images/orientation/pen.jpg
scene: An old scribe sits cross-legged at a low wooden table drawing a careful stroke with a bamboo pen, his whole upper body bent over the paper. Loose written sheets are stacked beside his knee. Warm lamplight from one side, deep cool shadow behind him.
narration: en Go and find a pen and some paper now, then keep both beside you while you work. Real paper, the kind you can tear. A pen that will eventually run out of ink. Have you got them? I will wait.
narration: en Write each letter out as you meet it. Your hand picks up a shape in a way your eye never quite manages alone, and a letter you have drawn thirty times stops being something you identify. It becomes a movement you already own, and movements come back fast.
narration: en My nephew is six and he is doing this at a kitchen table in Songkhla right now, properly, an hour at a sitting. He will be reading twenty years earlier than I managed. I find that far funnier than I find it sad, though I mention it because a six-year-old with a pencil beats an adult with a phone every single time.
narration: en Stroke order matters more in Thai than you would expect. Nearly every letter begins at a small loop, and that loop is where your pen goes down. Get the order into your fingers and two letters that looked identical to you last week will stop looking anything like each other.
narration: en Give it ten minutes with a pen and you will be further along than an hour of staring at a screen would ever take you.
- Pen. Paper. Actually writing, not tracing on glass.
- The hand picks up shapes the eye doesn't.
- Thai letters have a **stroke order**, and most start at the loop.
- **Ten minutes writing beats an hour looking.**

## exposition ears
heading: Your eyes and your ears learn separately
image: images/orientation/ears.jpg
scene: A young woman sits very still on a wooden verandah with her eyes closed and her head tilted to one side, listening to rain falling beyond the eaves. Her hands rest loosely in her lap. Cool blue-grey rain light, one warm lamp glowing in the doorway behind her.
narration: en This one catches very nearly everybody. You will reach a point where you can read a Thai word off the page perfectly well, and then somebody says that same word to you and you have no idea what you just heard. Reading and listening train separately. Neither comes free with the other.
narration: en The listening work carries its own weight in this course. Every clip you hear is a native speaker, and you will be asked to pick the tones out by ear with nothing written in front of you.
narration: en It will feel impossible early on, for a reason that has nothing whatever to do with you being bad at languages. Whatever language you grew up in taught you, while you were still a baby, that pitch differences like these do not change what a word means. So you learned to filter them out.
narration: en So you are undoing something here rather than building it. Switching off an old filter takes a few weeks of your ears being thoroughly confused, and there is no shortcut through that part. Do the listening exercises hardest on the days they feel most hopeless. Those are the days the filter is actually shifting.
- Reading well and hearing well are **separate skills**.
- Every clip is a native speaker. Tone exercises train the ear on purpose.
- It feels impossible at first because your first language taught you to ignore these differences.
- Do them anyway — especially then.

## retrieval three-habits
reveal: three-habits-answer
prompt: Three habits matter more than everything else in this course put together. Name all three out loud before you turn this over.
narration: en Say them to the room. All three, even if the third one takes you a moment to find — especially then.

## reveal three-habits-answer
retrieval: three-habits
narration: en Review when the application tells you to. Write the letters by hand. Say everything out loud. The rest of this course is machinery, and machinery only turns while those three things are happening.
- **Review when notified** — in the window, not later.
- **Write by hand**, with a pen, on paper.
- **Say it out loud**, every time.

## exposition expect
heading: What this is actually going to feel like
image: images/orientation/expect.jpg
scene: A hiker stands on a high ridge looking back down at the long winding path she has already climbed, hands on her hips and a pack on her back. The valley falls away below her. Warm golden evening light, blue haze layering the distant hills.
narration: en Before you go, let me tell you what the hard part is, so it does not take you by surprise. The alphabet is the steepest section of this entire course and it is sitting right at the start. Your first few weeks will be the slowest weeks you have, and somewhere around week two you will privately decide the whole thing has stalled.
narration: en It is working. Then the whole thing flips over. Once the letters go automatic, everything new you meet hooks onto something you already own, and the pace picks up sharply.
narration: en Vocabulary that would have been meaningless noise to you in week one turns into words you can half read before anybody has told you what they mean.
narration: en So please do not judge this course in week one. Judge it in week six. Keep the three habits, answer before you reveal, show up when the application asks. That is the deal I am offering you.
narration: en Right. Pen, paper, somewhere you can speak out loud without anybody minding. Your first two letters are waiting down at the harbour. Shall we go and meet them?
- The alphabet is the hardest part and it comes **first**. That's on purpose.
- Weeks one to three feel slow. That's the shape of the climb, not a warning.
- After that it compounds — new things hook onto what you already own.
- **Don't judge this in week one. Judge it in week six.**
