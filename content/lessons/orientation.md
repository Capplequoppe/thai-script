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

English only. Nothing here is a Thai sound, so nothing here costs a metered
Thai voice — every clip is local.
-->

# Before you start

lesson: orientation

## exposition welcome
heading: Five minutes that will save you months
image: images/orientation/welcome.jpg
scene: A young traveller stands at the foot of a long stone stairway winding up a green hillside, one hand shading her eyes as she looks up at the path ahead. Mist lies in the valley behind her. Warm golden morning light, distant temple roofs high above.
narration: en This course will take you from knowing nothing to reading Thai. Before any of that, spend five minutes here, because the way this app works is not the way most language apps work, and knowing why will change how much you get out of it.
narration: en Almost everything that decides whether you succeed comes down to a handful of habits. They are not difficult. They are just easy to skip, and skipping them quietly wastes the work you have already done.
- This is not a course you get through by putting in hours.
- It is one you get through by putting in the *right* minutes, at the *right* times.
- Five minutes here first.

## exposition forgetting
heading: You don't forget slowly — you forget in a rush
image: images/orientation/forgetting.jpg
scene: A lamplighter reaches up with a long brass pole to relight a street lamp at dusk, his whole body stretched upward. Along the street behind him a row of lamps has already gone dark. Cool blue evening shadow, one warm pool of gold beneath the single lit lamp.
narration: en Here is the uncomfortable fact this whole app is built around. Something you learn today is mostly gone within a few days, unless something happens in between. Not slowly, and not evenly — most of the loss happens early, in a rush.
narration: en Reading a thing again does not stop it. Recognising it on the page feels like knowing, and it is not the same thing at all. What actually stops the fade is pulling the thing back out of your head from nothing, and doing it at the right moment.
narration: en Think of the lamps. They do not all go out at once, and relighting one that is still burning brightly achieves nothing. The skill is getting there just as it starts to dim.
- Most of what you learn fades within days.
- Re-reading does not stop it — recognising something is not the same as knowing it.
- What stops it is **recall**: dragging it back out of your head, at the right moment.

## exposition the-appointment
heading: The notification is an appointment
image: images/orientation/appointment.jpg
scene: A lamplighter touches his flame to a lamp whose light has shrunk to a dying ember, the glass barely glowing, his arm stretched high above his head. He is alone on an empty street at nightfall. Cool blue dark all around, one small warm circle of gold at the lamp.
narration: en So the app keeps track. For every single thing you learn, it estimates when that particular fact is about to slip out of reach, and it tells you then. Not on a schedule that suits the app. On the schedule that suits your memory.
narration: en This is the part people get wrong, so let me be blunt about it. When you are notified that reviews are due, doing them in that window is worth more than ten sessions at some other random time. And skipping them is not a neutral delay. The work you already put into those items starts draining away, and the items come back harder than they left.
narration: en Ten minutes when prompted will beat an hour on a Sunday, every time. Treat the notification like an appointment you have made with somebody you respect.
- The app calculates, per item, when *you* are about to forget it.
- Reviewing in that window is worth more than many sessions at any other time.
- Skipping is not a delay. It is losing work you already did.
- **Ten minutes when prompted beats an hour at the weekend.**

## retrieval when-review
reveal: when-review-answer
prompt: So: when is the single best moment to review something you have learned? Say your answer out loud before you turn this over.
narration: en Say it out loud. Not in your head — out loud, even if you are not sure. Then turn it over.

## reveal when-review-answer
retrieval: when-review
narration: en Just as you are beginning to forget it. The moment when recall takes real effort, but still just works. That is the moment worth the most, and it is the moment the app is trying to find for you.
- **Just as you begin to forget it** — when recall takes effort but still works.
- Too early and you learn nothing. Too late and you are starting over.

## exposition struggle
heading: Notice what just happened
image: images/orientation/struggle.jpg
scene: A young woman hauls hard on a thick rope, leaning right back with her whole weight and her heels dug into wet sand, dragging a small wooden boat up the beach. Spray catches the light around her. Warm low sun, long shadows, cool blue water behind.
narration: en Look at what that slide just did. It asked you before it told you. That is deliberate, and it will happen constantly from here on.
narration: en Trying to remember something and failing, and only then being shown the answer, builds a far stronger memory than simply reading the answer would have. The effort is not a test of the learning. The effort is the learning.
narration: en Which means the feeling of not being sure is not a sign that this is going badly. It is the sign that it is working. Answer before you reveal, every time, even when you are guessing. Especially when you are guessing.
- Every lesson asks before it shows.
- Guessing wrong, then being corrected, beats reading the right answer.
- **Feeling unsure is the method working, not failing.**
- Never skip ahead to the answer.

## exposition mnemonics
heading: Your memory is bad at shapes and brilliant at stories
image: images/orientation/mnemonics.jpg
scene: An enormous orange cat sits calmly on a market stall roof wearing a tiny brass crown, one paw raised above the crowd below. Shoppers stop and look up, astonished. Warm golden afternoon light, bright striped awnings, dust motes drifting in the air.
narration: en Nobody is good at memorising abstract shapes. Everybody is good at remembering a strange picture. So this course never asks you to memorise that a particular squiggle makes a particular sound. It hangs the letter on a picture instead — a horse standing at a harbour, a mouse curled inside a coil of rope.
narration: en The stranger and more specific the picture, the better it sticks. That is not decoration and it is not whimsy; it is the only part of your memory that reliably works without effort.
narration: en And it is scaffolding. It comes down on its own. After a few weeks you will read the letter straight, without the picture ever surfacing — the same way you do not think about curved lines when you read the letter C.
- You will never be asked to memorise a bare shape.
- Every letter arrives attached to a concrete picture, and the odder the better.
- The picture is **scaffolding**. It falls away by itself once the letter is automatic.

## exposition districts
heading: Every letter has an address
image: images/orientation/districts.jpg
scene: A woman stands on a high balcony looking down over a town divided into distinct quarters, each roofed in a different colour and separated by narrow canals. She rests both hands on the stone railing. Warm golden late light, long shadows between the rooftops, hazy hills beyond.
narration: en Putting things in places is the oldest memory technique there is, and it is unreasonably effective. This course uses it for the single most important fact about a Thai letter.
narration: en Thai consonants come in three classes, and the class is what decides the tone of the syllable. That makes class the engine of the entire writing system — you cannot read a word aloud correctly without it.
narration: en So every class gets a place of its own. When you need to know a letter's class, you will not be searching a list of forty-four. You will be asking which part of town it lives in, and the answer arrives with the picture. Later on, word types get places too, so that verbs live in one location and nouns in another.
- Thai consonants have three **classes**, and class decides tone.
- Each class has its own **place** — you will meet the first one in lesson 1.
- Recall becomes "which part of town?" instead of searching a list of forty-four.

## exposition aloud
heading: Say it out loud. Every time.
image: images/orientation/aloud.jpg
scene: A young man stands alone in a sunlit courtyard with his head lifted and his mouth open, speaking aloud to nobody, hands loose at his sides. Washing hangs on lines strung above him. Warm afternoon light slanting between the buildings, dust hanging in the air.
narration: en Read everything out loud. Not muttered, not in your head — actually out loud, in a voice you can hear.
narration: en There are two reasons, and both matter. Recognising a sound and producing one are genuinely different skills, and only the second one gets you understood by another person. Practising silently trains the half you will not be using in a conversation.
narration: en The second reason is sharper. Thai is a tonal language: the same syllable said at a different pitch is a different word. You cannot hear your own tone while you are only thinking it. Say it aloud and the mistake becomes audible, and an audible mistake is one you can fix. Feel silly now, in a room on your own. It is much cheaper than feeling silly later.
- Say every word, every letter name and every answer **out loud**.
- Recognising and producing are different skills. Only one of them gets you understood.
- You cannot hear your own tone errors silently.

## exposition pen
heading: Write it by hand, on paper
image: images/orientation/pen.jpg
scene: An old scribe sits cross-legged at a low wooden table drawing a careful stroke with a bamboo pen, his whole upper body bent over the paper. Loose written sheets are stacked beside his knee. Warm lamplight from one side, deep cool shadow behind him.
narration: en Keep a pen and a sheet of paper beside you, and write the letters by hand as you meet them. Not typed. Not traced on a screen with a finger. Written.
narration: en Your hand learns a shape in a way your eye simply does not. A letter you have drawn thirty times stops being a picture you have to identify and becomes a movement you already know, and recognition comes back much faster from a movement than from a picture.
narration: en It matters more in Thai than in most scripts, because Thai letters are drawn in a set order — most of them starting from the little loop, which is where the pen goes down first. Get that order into your fingers and the letters stop looking alike. Ten minutes of writing will do more than an hour of looking.
- Pen. Paper. Actually writing, not tracing on glass.
- The hand learns shapes the eye cannot.
- Thai letters have a **stroke order**, and most start at the loop.
- **Ten minutes writing beats an hour looking.**

## exposition ears
heading: Your eyes and your ears learn separately
image: images/orientation/ears.jpg
scene: A young woman sits very still on a wooden verandah with her eyes closed and her head tilted to one side, listening to rain falling beyond the eaves. Her hands rest loosely in her lap. Cool blue-grey rain light, one warm lamp glowing in the doorway behind her.
narration: en Here is something that surprises almost everyone. You can reach the point of reading a Thai word correctly off the page and still completely fail to recognise that same word when somebody says it to you. Reading and hearing are trained separately, and neither one comes free with the other.
narration: en So the listening exercises are not a bonus round. Every clip you hear is a native voice, and the app will ask you to pick out tones by ear. At first this will feel impossible, and there is a particular reason for that: the tone distinctions Thai uses are ones your language taught you to ignore years ago. You are not learning a new skill so much as switching an old filter off.
narration: en Do the listening work especially on the days it feels hopeless. That is the sound of the filter coming off.
- Reading well and hearing well are **separate skills**.
- Every clip is a native speaker. Tone exercises train the ear on purpose.
- It feels impossible at first because your own language trained you to ignore these differences.
- Do them anyway — especially then.

## retrieval three-habits
reveal: three-habits-answer
prompt: Three habits matter more than everything else in this course put together. Name all three out loud before you turn this over.
narration: en Three of them. Say all three out loud, then turn it over.

## reveal three-habits-answer
retrieval: three-habits
narration: en Review when you are notified. Write the letters by hand. Say everything out loud. Everything else in this course is built to work, but only if those three are happening.
- **Review when notified** — in the window, not later.
- **Write by hand**, with a pen, on paper.
- **Say it out loud**, every time.

## exposition expect
heading: What this will actually feel like
image: images/orientation/expect.jpg
scene: A hiker stands on a high ridge looking back down at the long winding path she has already climbed, hands on her hips and a pack on her back. The valley falls away below her. Warm golden evening light, blue haze layering the distant hills.
narration: en One last thing, so that the hard part does not take you by surprise. The alphabet is the steepest section of this whole course, and it comes first. The first few weeks are the slowest you will ever have, and during them it is very easy to conclude that this is not working.
narration: en What happens after that is the opposite. Once the letters are automatic, everything you learn attaches to something you already own, and the pace picks up sharply. Vocabulary that would have been meaningless noise becomes words you can already half read.
narration: en So do not judge the method in your first week. Judge it in your sixth. Keep the three habits, answer before you reveal, and turn up when the app asks you to.
- The alphabet is the hardest part and it comes **first**. That is on purpose.
- Weeks one to three feel slow. That is the shape of the climb, not a warning sign.
- After that it compounds, because everything new attaches to something you own.
- **Don't judge this in week one. Judge it in week six.**
