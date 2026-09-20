# The eight-cell tone-mark table, at once

lesson: lesson-tone-marks

<!--
Phase 4, task 4.2. The source course spread these eight cells across six
lessons with unrelated letters between them — mid class in lessons 17-18,
temple (high) class in 21-22, harbor (low) class in 23-24. Stated together the
whole table is one pattern: the market takes all four marks in order, the
temple and the harbor only ever take two, and the harbor is the one that
swaps them. This lesson states it in one place.
previews: none
ranks: 1-1500

toneMarkLesson.test.ts derives the twelve cells, the corpus-word resolver and
the rank window straight out of this deck's own text — never out of
toneMarkTable.ts — so a lesson that states the table incompletely fails even
though the underlying data is correct. Thinning any one class's slide is
enough to break the resolver test, by design.

THE THREE CLASS SLIDES ARE A TABLE THE SUITE READS, NOT PROSE. Each resolved
cell has to be stated in one bullet shaped `mai <name> ... gives ... <tone>`
with no full stop anywhere between the name, the word "gives" and the tone.
A reworded bullet is skipped in silence and the cell simply vanishes, which
surfaces twelve steps later as "the lesson never states it". The unreachable
sentence is fixed the same way, word for word up to `letter`, and it must
appear on the high slide and the low slide both. Those four marks and the
three district words also have to appear somewhere in the deck's headings,
prompts, bullets or answers — narration reaches none of that.

THE DISTRICT IS SPELLED `harbour` THROUGHOUT, as it is everywhere else in the
course. Three assertions used to require the American spelling — AC2's literal
`/harbor/` here, `UNREACHABLE_LINE` here, and the pair-slide regex in
`middleBand.test.ts` — and each has been softened to `harbou?r`. The district
is an identifier in the data and English prose in a lesson, and these checks
ask whether the lesson names it, not which side of the Atlantic wrote it.

NARRATION NAMES THE MARKS BY NUMBER. An `en` line carries no Thai and no
romanisation, and all four names are romanisation — so the spoken lesson calls
them mark one to mark four, which is what the Thai names mean anyway, and the
recordings say the names themselves. The bullets print them, because written
text is where a name can be looked at.

LESSON ONE'S PROMISE IS PAID HERE. `lesson-01.md:477` tells the learner that
the rule producing the difference between the verb and the animal, and the
mark that spells it, are both coming. The animal is this lesson's low-class
mai tho example, so the circle closes on its own example word rather than on
an aside.

PEN AND PAPER EVERY LESSON; A CHALLENGE AND ITS ANSWER NEVER SHARE A SLIDE.
Unchanged from lesson 3. There is no new letter here, so the pen work is the
four marks themselves, written over letters the learner already owns.
-->

## exposition what-is-here
image: images/lesson-tone-marks/what-is-here.jpg
scene: A woman at a covered market stall before opening, lifting a small brass weight out of a fitted wooden box, more weights still nested in their slots beside it, lamps strung above the awning.
heading: Four marks, and the twelve boxes they fill
narration: en Lesson one left you holding a promise. The word for horse and the verb meaning to come are built from the same two symbols in the same order. The tone is the whole of what separates them. And I told you then that the mark which writes that difference was on its way. It arrives here. Thai has four tone marks, and you will have met all four inside ten minutes. Each one is a single small stroke written above the first letter of a syllable. What takes the rest of the lesson is what they do once they are up there, which depends on the district the letter underneath them lives in. Three districts, four marks, twelve boxes in the grid. Eight of those boxes hold a tone and four of them stay empty. Knowing which four are empty saves you as much reading time as knowing the eight.
- Four tone marks, each one a single stroke above a letter.
- Three districts underneath them, so twelve boxes in all.
- Eight boxes hold a tone. Four stay empty in every standard spelling.

## exposition pen-still-there
image: images/lesson-01/get-a-pen.jpg
heading: Pen and paper
narration: en Pen and paper before anything else, and today you will be writing marks rather than letters. Four shapes, one stroke each. Every one of them lands above a letter your hand knows well by now. Go and fetch them, and I will wait.
- Real paper, a real pen.
- Four marks, one stroke each, written above a letter.

## exposition the-horse-and-the-verb
image: images/lesson-01/ma-story-7.jpg
heading: The word on the plaque, and the word beside it
teaches: low-mai-tho
narration: en Go back to the end of that pier for a moment and put your hand on the wooden horse. The plaque on its flank carries the one sound the whole harbour came to know, and the letter's own name carries the same word on the end of it. Now set the verb down beside it. To come and horse are the horse's letter and the long vowel, in that order, in both words. A Thai speaker hears two entirely different words, because the pitch of the voice goes somewhere different in each of them. The verb runs flat and level, the way every syllable in lesson one ran. The animal starts high in your range and stays up there for the length of the word. What holds it up there is a small hooked mark written above the first letter, and that mark is the second thing you meet today.
- มา is the verb, flat and level, and it means to come.
- ม้า is the animal, held high, and one small mark above the letter is the difference.
- That mark is the second of the four, and its name is mai tho.

## exposition one-table
heading: One table, twelve cells, three districts
narration: en Here is the frame, before any of the detail goes into it. Every consonant you know belongs to a district, and with nothing written above it that district and the shape of the syllable settle the tone between them. You have been doing exactly that since lesson two. A tone mark arrives on top of all of it and answers the question outright. So what you have to learn is a grid. Four marks down one side, three districts across the other, and a tone written into each box where the two meet. Twelve boxes. Eight of them carry a tone. The other four stay blank, because two of the marks only ever turn up in one district. Learn the blanks alongside the tones, because a blank box is a spelling you will never be asked to read.
- Every consonant carries a district, and with no mark written the district decides the tone.
- Four marks across three districts leaves twelve cells to account for.
- Eight cells carry a tone. Four stay blank, because two of the marks keep to one district.

## exposition the-first-two-marks
image: images/lesson-tone-marks/the-first-two-marks.jpg
scene: A signwriter's fine brush lying across the lip of a small ink pot on a bare plank table, a folded rag beside it, warm afternoon light raking across the wood.
heading: The two marks any district can take
teaches: mid-mai-ek, mid-mai-tho, high-mai-ek, high-mai-tho, low-mai-ek, low-mai-tho
narration: en The four marks are numbered one to four in Thai, and their names are simply those numbers. So I will call them by number throughout, and the recordings will give you the names themselves. The first mark is a single short stroke, a small tick standing above the letter. Listen to its name.
recording: th ไม้เอก public/audio/tone-mayek.mp3
narration: en The second is a stroke that doubles back on itself, a little hook with two bends in it. Here is its name.
recording: th ไม้โท public/audio/tone-maytho.mp3
narration: en These two are the ones that go anywhere. A market letter, a temple letter, a harbour letter — all three of them will carry either mark. Six of the eight filled boxes in the table belong to this pair. Write them both a few times now. One tick, then one hook, each of them landing above a letter rather than beside it, and each of them a single movement of the pen.
- mai ek (่) is mark one: one short tick above the letter.
- mai tho (้) is mark two: a hook with two bends in it.
- Either mark goes over a letter from any of the three districts.
- Write each of them above a letter you already know.

## exposition the-market-only-marks
image: images/lesson-tone-marks/the-market-only-marks.jpg
scene: A hand-painted wooden noodle cart parked at the edge of a market lane at midday, its shutters propped open and folding stools stacked underneath.
heading: The two marks that stay among the stalls
teaches: mid-mai-tri, mid-mai-chattawa
narration: en Marks three and four behave differently, and that difference is the most useful thing in this lesson. The third mark is a small kinked peak, floating clear above the letter. Listen.
recording: th ไม้ตรี public/audio/tone-maytri.mp3
narration: en The fourth is a tiny cross with four points to it, which is a pleasant accident given where it comes in the order. Here it is.
recording: th ไม้จัตวา public/audio/tone-mayjattawa.mp3
narration: en Now the useful part. Both of these marks appear over market letters and nowhere else in standard spelling. Walk up the hill to the temple and you will search for weeks without finding one; go down to the water and it is the same story. The third mark turns up most often on a menu, because it does a great deal of the work in words Thai has borrowed from other languages. The fourth is the rarest sight the tone system has. So when either of them lands in front of you, the district question has answered itself before you asked it. Shall we put all that into the grid?
- mai tri (๊) is mark three: a small kinked peak above the letter.
- mai chattawa (๋) is mark four: a little cross with four points.
- Both appear over market letters and nowhere else in standard spelling.
- Spot either one and the district is settled already.

## exposition mid-class-marks
image: images/lesson-tone-marks/mid-class-marks.jpg
scene: A market trader standing among stacked baskets of fruit under a canvas awning at midday, one hand resting on the edge of a crate.
heading: The market takes all four, in order
teaches: mid-mai-ek, mid-mai-tho, mid-mai-tri, mid-mai-chattawa
narration: en Start at the market, because the market is the tidy row. All four marks go over a market letter, and each one lands the syllable on a tone of its own, in the order the marks are numbered. Mark one takes the voice down and holds it along the floor of your range. Mark two starts it high and tips it over into a fall. Mark three parks it up high and leaves it there. Mark four dips it and swings it back up. Four marks, four tones, and no two of them overlapping. Learn this row properly and the other two districts come down to a short list of differences from it.
- mai ek (่) gives low tone, and ไก่ (gài) is a chicken.
- mai tho (้) gives falling tone, and เก้า (gâo) is nine.
- mai tri (๊) gives high tone, and โต๊ะ (dtó) is a table.
- mai chattawa (๋) gives rising tone, and เดี๋ยว (dǐao) means in a moment.
- Four marks, four tones, and the market is the one district that holds the whole set.

## exposition high-class-marks
image: images/lesson-tone-marks/high-class-marks.jpg
scene: A whitewashed temple standing alone on a wooded hillside above a valley in the early morning, its stairway climbing out of the trees.
heading: The temple takes two
teaches: high-mai-ek, high-mai-tho
narration: en Up at the temple the row gets shorter. Only the first two marks ever go over a temple letter, so the temple has two filled boxes and two empty ones. Mark one gives the same low tone it gave the market. Mark two gives falling, again the same as the market. So the whole temple row is the top half of the market row, copied straight across, and you have already learned it. The two empty boxes are marks three and four, which keep to the stalls.
- mai ek (่) gives low tone here as well, and ข่าว (khàao) is the news.
- mai tho (้) gives falling tone, and ให้ (hâi) is to give.
- mai tri and mai chattawa never sit over a temple letter, so the temple's other two boxes stay empty.
- The temple's filled boxes hold the same two tones the market's first two hold.

## exposition low-class-marks
image: images/lesson-01/the-harbour.jpg
heading: The harbour takes two, and swaps them
teaches: low-mai-ek, low-mai-tho
narration: en Down at the water the row is two boxes again, and this is where the table stops being tidy. The same two marks go over a harbour letter, and both of them come out somewhere else. Mark one gave low at the market and low at the temple; over a harbour letter it gives falling. Mark two gave falling at the market and falling at the temple; over a harbour letter it gives high. So the harbour takes the same two marks and hands back the other two tones. That swap is the one piece of this table you will have to sit down with. And there is the animal from the pier. It is a harbour letter with mark two above it. That is exactly why it comes out high and held, while the verb with nothing above it runs flat.
- mai ek (่) gives falling tone here, and ล่าง (lâang) means lower.
- mai tho (้) gives high tone here, and ม้า (máa) is the animal on the plaque from lesson one.
- Where the temple got low and then falling, the water gets falling and then high.
- Mai tri and mai chattawa never sit over a harbour letter either, so two boxes stay empty down here as well.

## exposition mark-one-at-the-well
image: images/palace/well-speared-once.jpg
heading: Mark one, and where it leaves the pair of them
teaches: mid-mai-ek, high-mai-ek, well-speared-once
narration: en So the grid is full. Now the pictures for it, because a table is a thing you look up and a picture is a thing you have. Four marks, and each one turns out to be a weapon with the right number of points on it — which is a piece of luck, given that the marks are numbered one to four and counting points is a great deal easier than holding a row in your head.
narration: en Start where the vendor and the monk ended up.
recording: en The well again, and now there is a spear. One shaft, one point, driven into the rim and left standing there — and the vendor and the monk are already down in the dark below it. Count the points: one. Mai ek is the first of the four tone marks, and one point is how you will know it. Mai ek over a mid-class or a high-class letter gives a low tone. The spear settles it. Alive, dead, short, long — once that mark is written, the answer comes from the mark. public/palace/scenes/audio/well-speared-once.mp3
- One point, one shaft: **mai ek**, the first mark.
- Over a market letter or a temple letter it gives **low**.
- The two of them are down the well, which is where a low tone sits.

## exposition mark-one-at-the-waterfall
image: images/palace/waterfall-fisherman-speared.jpg
heading: The same spear, down at the water
teaches: low-mai-ek, waterfall-fisherman-speared
narration: en Now the swap, and this is the part of the lesson worth sitting down with. Same mark, same single point — but it finds the fisherman instead, and it does not take him anywhere near the well.
recording: en The waterfall, and the one-pointed spear is back. This time it is the fisherman it finds, and instead of standing him at a well rim it sends him straight over the falls. One point, mai ek — the same mark that put the vendor and the monk down the well. Mai ek over a low-class letter gives a falling tone. The mark is the one you already know; the class is what changed the ending. Read the mark, then read the class, and answer from the two of them together. public/palace/scenes/audio/waterfall-fisherman-speared.mp3
- The **same** one-pointed mark, over a harbour letter instead.
- It sends him over the falls, not down the shaft: **falling**, not low.
- Count the points for the mark, then look at the class for the ending.

## exposition mark-two-at-the-waterfall
image: images/palace/waterfall-hooked-twice.jpg
heading: Mark two, and where it leaves the other two
teaches: mid-mai-tho, high-mai-tho, waterfall-hooked-twice
narration: en Mark two next, and the same pair of pictures again — the market and the temple first, then the water. Two prongs this time, and it is the vendor and the monk who meet it.
recording: en The waterfall, and a spear with two prongs. It comes in from behind and pitches the vendor and the monk over the lip together, the pair of them going down the drop side by side. Two prongs. Mai tho is the second mark, and two is what you count. Mai tho over a mid-class or a high-class letter gives a falling tone. The same two people as the well, a different spear, and this one sent them over the edge instead of down the shaft. public/palace/scenes/audio/waterfall-hooked-twice.mp3
- Two prongs: **mai tho**, the second mark.
- Over a market or a temple letter it gives **falling**.
- The same two people as the well, and a different spear takes them over an edge.

## exposition mark-two-on-the-rooftop
image: images/palace/rooftop-fisherman-hooked.jpg
heading: The same hook, and the harbour goes up
teaches: low-mai-tho, rooftop-fisherman-hooked
narration: en And the swap a second time. Everything the harbour does with these two marks is upside down from everywhere else, so watch which way he goes.
recording: en The rooftop, and the two-pronged spear. It hooks the fisherman under the arms and lifts him — up past the eaves and onto the roof, where it sets him down and leaves him standing there. Two prongs, mai tho. Mai tho over a low-class letter gives a high tone. That same spear dragged the vendor and the monk over a waterfall. Under a low-class letter it hauls upward instead, so the class is what tells you which direction. public/palace/scenes/audio/rooftop-fisherman-hooked.mp3
- The **same** two-pronged mark, over a harbour letter.
- It lifts him instead of dropping him: **high**, where the others fell.
- Mark one sends the harbour down the falls; mark two hauls it up to the roof.

## exposition mark-three-on-the-rooftop
image: images/palace/rooftop-vendor-three-flags.jpg
heading: Mark three, and why the vendor is alone
teaches: mid-mai-tri, rooftop-vendor-three-flags
narration: en Neither of the last two marks has a swap to learn, and the reason why is the useful thing about them. Look at who is holding this one, and, rather more to the point, at who is not.
recording: en The rooftop again, and the vendor is up there on his own, holding a trident with its three points against the sky. Three. Mai tri — tri is three in Thai the way it is three in English, and the three points are up on the roof. Mai tri over a mid-class letter gives a high tone. He is alone up there because mai tri only ever sits on a mid-class letter. Seeing that mark answers the class question for you. public/palace/scenes/audio/rooftop-vendor-three-flags.mp3
- Three points: **mai tri**, and *tri* is three.
- Over a market letter it gives **high**.
- Nobody else is up there, because this mark only ever sits on a market letter.

## exposition mark-four-on-the-hill
image: images/palace/hill-vendor-four-poles.jpg
heading: Mark four, on somebody else's path
teaches: mid-mai-chattawa, hill-vendor-four-poles
narration: en And the fourth, which is the rarest thing in the tone system and the easiest of the lot to count. The vendor is out of the market again, and this time he has borrowed the monk's road.
recording: en The hill path, and the vendor is climbing it with a four-tined pitchfork over his shoulder. Four tines. Mai chattawa is the fourth mark, and chattawa is four. Mai chattawa over a mid-class letter gives a rising tone. He is walking the monk's path, dipping at the start and climbing all the rest of the way, and his voice goes with him. Like mai tri, this mark only ever lands on a mid-class letter, so seeing it settles the class. public/palace/scenes/audio/hill-vendor-four-poles.mp3
narration: en All four, then. One spear at the well, two prongs over the edge, three points on the roof, four tines up the hill — and the harbour taking the first two marks and handing back the other two tones.
- Four tines: **mai chattawa**, and *chattawa* is four.
- Over a market letter it gives **rising**.
- He is on the monk's dipping, climbing path, and his voice climbs with him.
- Market only, like mark three — so seeing either one settles the class for you.

## retrieval which-tone-a
reveal: which-tone-a-answer
prompt: ตั๋ว (dtǔua, a ticket) carries mai chattawa over ต. What tone does that give, and why did one row of the table settle it?
teaches: mid-mai-chattawa
narration: en A question before you read anything. A word turns up with mark four written above its opening letter, and that letter is the market's own hard t, the turtle. What tone does the word come out on? And then the second half, which is the half worth having: why did you only have to look at one row of the table to answer? Both out loud before you turn it over.

## reveal which-tone-a-answer
retrieval: which-tone-a
teaches: mid-mai-chattawa
narration: en Rising. The letter tells you the row, the mark tells you the column, and the box where the two meet holds a rising tone. And one row was enough because of the empty boxes. Mark four goes over market letters and nowhere else, so the moment it appeared, the temple and the harbour were out of the running.
- Rising. ต is a market letter, and mark four only ever appears there.
- One row settles it, because the other two districts are blank in that column.

## retrieval which-tone-b
reveal: which-tone-b-answer
prompt: ล่าง (lâang, lower) carries mai ek over ล, a harbour letter. The market's mai ek gives low tone. Does ล่าง come out low as well?
teaches: low-mai-ek
narration: en One more, and this one is the trap the whole lesson exists to spring safely. A word carries mark one above its opening letter, and that letter lives down at the harbour. You know what mark one does at the market and what it does at the temple, because both districts gave you the same answer. So does the water give you that answer too? Say yes or no out loud, and then say the tone.

## reveal which-tone-b-answer
retrieval: which-tone-b
teaches: low-mai-ek
narration: en It comes out falling. The harbour is the district that swaps the pair, so mark one tips the voice over instead of holding it down. Mark two makes the matching move in the other direction and lands high. The two remaining marks keep to the stalls, so the harbour row finishes with the same two blanks the temple row has.
- Falling. The harbour swaps the pair, so mai ek tips the voice over rather than holding it low.
- mai tho makes the matching move and lands high.

## exposition read-dtoh
thai: โต๊ะ
heading: Read this one
teaches: mid-mai-tri
narration: en Four symbols, and every one of them is yours. The leaning mast out in front, the turtle's letter, the two hooks behind cutting the vowel short, and mark three sitting above the turtle. Work it in that order. The turtle lives among the stalls, the mark is mark three, so go to the market row and the third column. Say the whole word out loud before you turn it over.
- Leaning mast, the turtle's letter, two hooks behind, and mai tri above.
- Market row, third column. Out loud before you turn it over.

## exposition read-dtoh-answer
thai: โต๊ะ
heading: That one
teaches: mid-mai-tri
narration: th โต๊ะ
narration: en High, and clipped short by the hooks. It means a table — the kind you eat at, which is a fair clue to where this mark spends its time. A market letter under mark three gives a high tone, and there is no other district you could have been reading.
- โต๊ะ — high tone, and it means a table.
- A market letter under mai tri, which is the one column the market has to itself.

## exposition read-khaao
thai: ข่าว
heading: And this one
teaches: high-mai-ek
narration: en Three symbols and a mark. The egg's letter from lesson twelve opens it, the long vowel follows, and the ring's letter closes the syllable with a hum. Mark one sits above the egg. The egg lives up the hill at the temple, so this time you want the temple row and the first column. Take your time, and say it out loud before you turn it over.
- The egg's letter, the long vowel, the ring closing it, and mai ek above.
- Temple row, first column. Out loud before you turn it over.

## exposition read-khaao-answer
thai: ข่าว
heading: That one
teaches: high-mai-ek
narration: th ข่าว
narration: en Low. It means the news, the sort that comes on in the evening. A temple letter under mark one gives a low tone. The market gives the same answer under that mark. That agreement is what makes the temple row the cheap one to learn.
- ข่าว — low tone, and it means the news.
- The temple and the market agree under mai ek. The water is the one that differs.

## exposition read-maa
thai: ม้า
heading: And the one lesson one promised you
teaches: low-mai-tho
narration: en Two symbols, and a mark you have been waiting three months of lessons for. The horse's letter, the long vowel behind it, and mark two above the first of the two. The horse's letter berths at the harbour, and the mark is mark two, so you want the bottom row and the second column. Say the word out loud, on the tone that box gives you, before you turn it over.
- The horse's letter, the long vowel, and mai tho above.
- Harbour row, second column. Out loud before you turn it over.

## exposition read-maa-answer
thai: ม้า
heading: That one, and the circle closes
teaches: low-mai-tho
recording: th มอ ม้า public/audio/consonant-mo-ma.mp3
narration: en That is the letter's own name, and the second half of it is the word — which is how you heard the animal for the first time in lesson one, before you had any idea what the mark above it was doing. High, and held up there for the whole of the word. That is the animal, and the word on the plaque at the end of the pier. Now say the verb again, with nothing written above the letter and the voice running level. Two spellings, two tones, one difference on the page. You have the name of the mark now, and the box that holds the tone. That is the thing lesson one said was coming.
- ม้า — high tone, and it means a horse.
- มา with nothing above it stays flat, and it means to come.
- A harbour letter under mai tho is the box that separates them.

## exposition where-the-mark-goes
image: images/lesson-tone-marks/where-the-mark-goes.jpg
scene: A workman standing on the upper rung of a ladder propped against a shophouse balcony, reaching up to hang a paper lantern from the eave above him, late afternoon light.
heading: Where the mark is written
narration: en One practical matter before the rules go up, because a mark has to land somewhere and Thai is particular about the somewhere. A tone mark belongs above the opening consonant of its syllable. If that consonant already has a vowel sitting over it, the mark climbs one storey higher and rides above the vowel. That is why you will sometimes see two things stacked over a single letter. And if the syllable opens with two consonants run together, the mark goes above the second of the two. The district that decides the tone still comes from the first. That last case matters properly next lesson. For now: look above the opening letter, and look above whatever is already sitting there.
- A tone mark belongs above the opening consonant of its syllable.
- If a vowel is already sitting there, the mark rides above the vowel.
- Over two consonants run together, the mark goes above the second one.
- The district deciding the tone still comes from the first of the two.

## rule tone-mark-placement
rule: tone-mark-placement
narration: en There is the placement rule in full. One line of it is worth reading twice. A tone mark overrules the tone that the district and the ending would have produced on their own. That may sound like the spelling rules being thrown out of the window, so let me put it the other way round. The mark is written down on the page along with everything else, so it belongs to the spelling as much as the letters do. What it overrules is your first guess, made before your eye went up a storey.

## rule mai-tri-chattawa-scope
rule: mai-tri-chattawa-middle-only
teaches: mid-mai-tri, mid-mai-chattawa
narration: en And the second rule is the one that empties four of the twelve boxes. Marks three and four are market property. Standard Thai spelling puts them over market letters and leaves them there, which is why the temple row and the harbour row both finish two boxes short. You will see the shapes elsewhere occasionally, in a loanword or in somebody writing the way they speak. That is a different kind of writing from the kind this course teaches you to read.

## exposition the-shape-of-the-table
heading: What makes eight cells memorable
narration: en Now put the whole thing back together, because the table is smaller than twelve boxes makes it sound. The market row is the one you learn properly: four marks against four tones, in numbered order. The temple row is the first half of the market row said over again. The harbour row is the first half of the market row with its two answers exchanged. And the right-hand end of both of those rows is empty, because marks three and four stay among the stalls. So what you actually carry away is one row of four, one word for the district that repeats it, and one word for the district that swaps it. Three things, and the twelve boxes fall out of them.
- The market row is four marks against four tones, in numbered order.
- The temple repeats the market's first two.
- The harbour exchanges them: falling under mai ek, high under mai tho.
- Marks three and four keep to the market, so both other rows finish blank.

## exposition read-close
heading: Where that leaves you
narration: en Four marks, and the tone system is in front of you rather than ahead of you. Take a written Thai syllable. Find the district its opening letter lives in. Decide whether the ending runs alive or stops dead. Look above the letter for a mark. Then say the word on the right tone. That is what lesson one promised in its opening minute, and this is the lesson that finishes paying for it. Before you stop, write the four marks out once more over a letter of your own choosing, and say aloud the tone each one produces there. Next lesson: two consonants run together at the front of a syllable, and what the pair of them does to the sound that comes out.
- Four marks, and every box of the table accounted for.
- District, ending, and the mark above the letter. The tone follows from those three.
- Next: two consonants run together at the front of a syllable.
