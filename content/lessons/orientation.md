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
scene: A bed of deep red coals glowing low inside a ring of stones, covered in soft grey ash, with the blackened stub ends of two burnt logs lying among them. A single thin thread of smoke drifts upward. Deep blue night all around, the coals the only light.
narration: en Something you learn today will be mostly gone in two days. It does not drain away slowly, the way most people picture forgetting. Most of it goes early and goes fast. Then the small remainder still standing hangs on for years.
narration: en I spent four years studying precisely this, as it happens — a doctorate on how adults take on a second writing system — and I picked the subject for the least noble reason there is. I wanted to know why it had been so hard for me.
narration: en Reading it again will not save it. That is the trap almost everybody falls into. Something you half know looks familiar while you are staring straight at it, and familiarity feels a great deal like knowing, right up to the moment somebody takes the page away.
narration: en The only thing that genuinely holds knowledge in place is pulling it back out of your own head at a moment when there is nothing in front of you to look at.
narration: en Look at that fire for a moment. An hour ago it stood three times that height. The big flames are the part that goes fast, while everybody is still sitting around watching it. What you can see now is most of the way to coals, and coals will sit there half the night.
narration: en That is the shape of what you learned today: nearly all of it gone in the first rush, a thin remainder glowing on for years. My job is to get to you while there is still something to catch.
- Most of what you learn fades within days — a rush, then a thin remainder, like flames going to embers.
- Re-reading doesn't stop it. Recognising something isn't the same as knowing it.
- What stops it is **recall** — pulling it out of your head, at the right moment.

## exposition the-appointment
heading: When it tells you to review, review
image: images/orientation/appointment.jpg
scene: A woman reaches up to push a wooden swing at the top of its arc, her arms extended and her weight on her toes, the swing high above her against a bright sky. A sunlit garden behind her, warm afternoon light.
narration: en Here is the picture I want you to hold for the rest of the course. A swing.
narration: en It starts dead still, with somebody sitting on it. You want it going as high as it will go. So you push. It comes back almost at once, because the arc is tiny, and you push again. Then again, close together, small pushes into a short swing.
narration: en Then the arc opens out. The returns start taking longer. You are pushing further and further apart now. The odd thing is that each push still costs you about the same — it is the waiting between them that keeps growing. Eventually it is swinging high and you are barely touching it. A hand out, once in a while, and it stays up there.
narration: en Notice what you could not do. You could not get it to full height in one enormous shove. It does not matter how strong you are; the swing will not take it. Height is built by many small pushes with the right gaps between them, and no single effort substitutes for that.
narration: en Your reviews are those pushes. A letter you met once comes back at you almost immediately, because the arc is short. Get it right and the gap stretches, then stretches again. Each review still takes you about the same few seconds. The application keeps a running estimate, for every single thing you know, of when the swing is coming back to you.
narration: en Timing is the whole of it. Meet the swing as it reaches you and a touch adds height. Put your hand out at the wrong moment and you are stopping it instead — and stopping a loaded swing takes real force, as anybody who has tried it knows. Ten minutes inside the window the application gives you buys more than an hour of catching up afterwards.
narration: en Once it is high it is genuinely hard to stop, which is the reward for building it properly. But nobody pushing it for long enough and it comes down anyway. You walk back expecting to carry on where you left off. What is actually waiting is a swing barely moving. Now you either start from a standstill or shove much harder than you ever had to before.
narration: en Both of those are the moment people quit. And almost nobody says *I let the momentum go*. They say Thai is too hard. I would rather you knew in advance which one it actually was.
narration: en So yes, being told when to review is inconvenient. Five or ten items, every so often, is a small thing. A hundred that have piled up while you were away is a different afternoon entirely, and every one of them will be harder to reach than it would have been.
narration: en Treat that notification as an appointment with somebody you would be embarrassed to keep waiting.
- A swing is built by **many small pushes with growing gaps**, never by one big shove. The app times the pushes.
- Ten minutes in that window beats an hour of catching up later.
- Skipping isn't a delay. The swing comes down, and you restart from a standstill — which is where people quit and blame Thai.

## retrieval when-review
reveal: when-review-answer
prompt: So — when is the single best moment to review something you've learned? Answer out loud before you move on.
narration: en This is the first question I have asked you, so let me say how these go, because the shape repeats for the rest of the course. A question sits on the screen. You work out your answer before you go anywhere — and only then does the next screen offer to show you it.
narration: en Everything I just told you about reaching for a thing happens in those few seconds. Go straight past them and the question has taught you nothing; the answer will look obvious, the way answers do, and none of it will be there in a week.
narration: en One more habit while I am at it, because it comes back on every card in this application. When something asks you what a word means, how it is spelled, how it is said, which tone it carries — answer it out loud. At the volume you would use talking to somebody across a table, rather than under your breath.
narration: en The temptation is to skip that when you are unsure, because saying a wrong answer into an empty room is a peculiar feeling, and because it is quicker to think the answer and move on. Unsure is when it is worth the most. I did it silently for months before anyone told me, so I am telling you at the start instead.
narration: en So — have a go, out loud, even if you are only half sure.

## reveal when-review-answer
retrieval: when-review
narration-before: en There is the question again, and underneath it the button that shows you the answer. Say yours first — then press it, and see how close you were. That order is the whole of it, here and on every card after this one.
narration: en The answer, when you are ready for it: right as the thing begins to go. That slightly awkward moment where you have to reach for something and it just about arrives. That awkward second is worth more than any other moment in your day, and finding it for you is the whole job of this application.
- **Just as you begin to forget it** — when recall takes effort but still works.
- Too early and you learn nothing. Too late and you're starting over.

## exposition struggle
heading: Notice what just happened
image: images/orientation/struggle.jpg
scene: A young woman hauls hard on a thick rope, leaning right back with her whole weight and her heels dug into wet sand, dragging a small wooden boat up the beach. Spray catches the light around her. Warm low sun, long shadows, cool blue water behind.
narration: en Notice what just happened there. You were asked before you were told anything at all. I did that on purpose, and everything from here onward will do the same to you — so I want to spend a minute on what it felt like, because that feeling is the whole method and most people never learn to recognise it.
narration: en Try another one. This one costs you nothing at all. What is my name? [pause] I told you at the very start.
narration: en If it came straight back, good. If it did not, stop the lesson here for a second and genuinely go looking for it. Do not move on and do not scroll back. It is in there — you heard it a few slides ago, in the same breath as a grandmother and an alphabet song.
narration: en Whether you found it does not matter in the slightest. What I want is for you to notice the *looking*. That pulling sensation, that thing sitting just out of reach on the tip of your tongue, the small frustration of knowing you know it.
narration: en That sensation is your brain under load, in the same sense a muscle is under load. And the comparison is closer than it sounds. When you reach for something and get there, the connections in your brain that carried you to it come back thicker and faster — not as a figure of speech, but as a physical change in the cells, the way a muscle you use is physically a different muscle by the end of the month. Brains do that all your life, and the word for it is neuroplasticity. It is the whole reason this course is built as a series of demands rather than a list to read.
narration: en Anything that makes you reach will do it. Working an answer out, reasoning from a rule you half remember, joining two things you already knew, saying it aloud, writing it with a pen, explaining it to somebody who does not speak a word of Thai. The reaching is the active ingredient in all of them.
narration: en Which is why a wrong guess followed by a correction beats *I do not know, show me* by a distance. The reach is what opens the door. The correction then walks through it. Give up before you have reached and the correction arrives to find nothing open.
narration: en I learned to read my own language at twenty-six, and I was bad at it. Properly bad. Sounding out a menu with my finger under the line while a waiter stood there being polite about it. What carried me through was getting it wrong out loud, over and over, in front of people who would correct me.
narration: en So when the quizzes start, go looking for that strain on purpose. If you cannot feel it, hunt for it — because feeling it is how you know the right part of you has turned up for work.
- Every lesson asks before it shows.
- **The strain of reaching is the active ingredient.** Notice it, and go looking for it when it's absent.
- Reaching and finding strengthens the path, physically. Enough of it restructures the brain — neuroplasticity.
- A wrong guess you then correct beats an answer you were simply handed.
- Working it out, saying it aloud, writing it, teaching it — all of them are the same reach.

## exposition mnemonics
heading: Nobody remembers squiggles. Everybody remembers a strange picture.
image: images/orientation/mnemonics.jpg
scene: An enormous orange cat sits calmly on a market stall roof wearing a tiny brass crown, one paw raised above the crowd below. Shoppers stop and look up, astonished. Warm golden afternoon light, bright striped awnings, dust motes drifting in the air.
narration: en Try to memorise that one particular squiggle makes an m sound and it will be gone again inside a week. Your memory was never built for that kind of work. Hand that same memory a cat in a crown sitting on a market roof and next year the cat is still up there.
narration: en Let me show you what it *was* built for. Think of a room you know well. You can walk through it in your head right now — which side the door opens, the drawer that sticks, where the light is. Nobody made you learn that room. It went in on its own and it has stayed for years.
narration: en Now try to recall twenty words you read yesterday. [pause] Nothing at all. You were paying attention at the time, too.
narration: en Neither of those is a failure. Your memory is superb at places, at faces, and at things that happened to somebody — because for almost all of the time there have been people, those were the only things worth keeping. Writing is about five thousand years old. The equipment you are reading this with is very much older. Nobody has updated it since.
narration: en So the answer is not to try harder at the squiggle. It is to hand the squiggle to the part of you that already works for free — to turn a shape into something that happened, somewhere, to somebody.
narration: en That is all a mnemonic is. Not a trick, and not a crutch for people with poor memories. It is a way of filing a new thing under an old system that has never let you down.
narration: en It also explains why everything in here is slightly wrong in the head. You have seen a great many cats. They have all blurred into one another. You have seen exactly one wearing a brass crown on a market roof. Ordinary things stack up and cancel out; the odd one has nothing to be confused with.
narration: en Every picture in this course was built by me, deliberately, out of things I could not shake loose. None of it is folklore. I went and read the oldest memory research there is, then made the images myself, because the ones printed in books belonged to somebody else's childhood and slid straight off mine.
narration: en So you will never be asked to store a bare shape. Every letter arrives already attached to something you can picture — a horse rearing on a quay, a mouse working away at a knotted cord in a doorway.
narration: en And you will not be doing this forever. The picture is scaffolding, and you have taken scaffolding down before without noticing. When you first learned to read, you sounded words out one letter at a time, slowly, out loud. You do not do that now. You did not decide to stop, and you could not say which week it happened. The support came away on its own once the wall could stand. These pictures go the same way.
- Your memory is built for **places, faces and events** — not for marks on a page.
- A mnemonic files the new thing under the old system. It isn't a crutch.
- **The odder the better.** Ordinary things blur together; the strange one has nothing to blur with.
- You'll never be asked to memorise a bare shape.
- The picture is **scaffolding**, and it comes away on its own — the way sounding words out did.

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
narration: en Now come up with me. From the quay the road turns inland and after a few minutes it starts to climb.
narration: en You will pass straight through the market on the way — awnings, crates, the flat ground between the water and the hill. Keep walking for now. I will bring you back down there in a moment, because that one has a trick hidden in it and I want the hill first.
narration: en Then the steps, and they are a real climb: a long flight of stone, and by the time the gold starts showing through the trees you can hear the harbour behind you rather than see it. Temples here are built high on purpose, which suits me very well, because *up* is the thing I want lodged in your head. Bells along the rail, and quiet.
narration: en Only eleven letters live up here. A short list sits in your head far more easily than a long one, so this small and rather exclusive neighbourhood is cheap to learn and you will be glad of that in a moment.
narration: en Before you come back down, one honest warning, and I need to hand you one small fact to make it land. Thai has five tones, and somebody long ago gave one of them the name *high*. These eleven letters are also called the high class. Those two things have nothing whatever to do with each other.
narration: en The hill is a hook for the name of the class, and that is the entire job it does. A letter from up here will produce a different tone depending on the word it lands in, and working out which is the whole of lesson two. Whenever you catch yourself thinking *high letter, therefore high sound*, that is the one thing this hill was never saying.
- The **temple** is the high class — only **11 letters**.
- Up the hill. Gold, bells, quiet, a long climb from the water.
- One of Thai's five tones is also called *high*. **The two are unrelated** — the hill only keeps the class's name straight.

## exposition tour-market
heading: The market — and the trick this buys you
image: images/orientation/tour-market.jpg
scene: A covered street market on level ground between the harbour and the hill, stalls of fruit and cloth under striped awnings, crates stacked along the walkway, scales hanging from a beam. No people. Warm afternoon light filtering through the awnings, dust hanging in the air, cool shadow at the back of the stalls.
narration: en Back down the steps, then, to the place I walked you through without stopping. The market, on the flat ground between the hill and the water. Awnings, crates, fruit, scales hanging from a beam. Nine letters live here, the smallest of the three neighbourhoods.
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
narration: en I made you do this a few minutes ago and did not tell you why. Here is why, because it is the habit that separates the people who get there from the people who give up, and it costs you nothing.
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
narration: en Stroke order matters more in Thai than you would expect. Nearly every letter begins at a small loop, and that loop is where your pen goes down. Get the order into your fingers and two letters that looked identical when you met them will stop looking anything like each other.
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
prompt: Three habits matter more than everything else in this course put together. Name all three out loud, and then we will see how you did.
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
narration: en Before you go, let me tell you what the hard part is, so it does not take you by surprise. The alphabet is the steepest section of this entire course and it is sitting right at the start. The opening stretch is the slowest going you will have, and somewhere in it you will privately decide the whole thing has stalled.
narration: en It is working. Then the whole thing flips over. Once the letters go automatic, everything new you meet hooks onto something you already own, and the pace picks up sharply.
narration: en Vocabulary that would have been meaningless noise to you at the start turns into words you can half read before anybody has told you what they mean.
narration: en So please do not judge this course while you are still in the alphabet. Judge it on the day you catch yourself reading a word before you meant to. Keep the three habits, answer before you reveal, show up when the application asks. That is the deal I am offering you.
narration: en Right. Pen, paper, somewhere you can speak out loud without anybody minding. Your first two letters are waiting down at the harbour. Shall we go and meet them?
- The alphabet is the hardest part and it comes **first**. That's on purpose.
- The opening stretch feels slow. That's the shape of the climb, not a warning.
- After that it compounds — new things hook onto what you already own.
- **Don't judge this from inside the alphabet.** Judge it when the letters go automatic.
