# Vowels that are not written

lesson: lesson-unwritten-vowels

<!--
Phase 3, promoted lesson 1 of 3. Introduces no new symbol, so its lessons-table
row declares none; it teaches the readings a written word gives you for free.
previews: none

The example pairs on the rule slides are load-bearing. `promotedLessons.test.ts`
derives each rule's vowel from them by stripping the onset and the final it can
already read off the alphabet, so an example removed here is a rule the lesson
no longer states.

ADDITION IS AS LOAD-BEARING AS REMOVAL, and the original note did not say so.
The derivation scoops up every `word (romanisation)` pair in a rule slide's
bullets and refuses if the qualifying ones disagree, so a new example on the
wrong slide breaks the same test a deleted one does. Two examples in
particular have to stay bare: `นน` on the implicit-a slide and `วง` on the
w-as-vowel slide are spelling fragments quoted mid-sentence, and putting a
romanisation in brackets after either would enter it as an example of the very
rule it is a counter-case to.

Each rule slide also has to state its vowel's length in words, and the first
`short` or `long` in heading-plus-bullets is the one taken — which is why four
of the six headings carry the length themselves rather than leaving it to a
bullet that sits below `ลง (long)`.

THREE PHRASES ARE MATCHED LITERALLY: `อ is a consonant only at the front of a
word` on the o-as-vowel slide, and `fewer of them`, `where that ties` and
`bare ร ending beats the short o` on the closing slide.

TWO EXAMPLES RUN AHEAD OF THE SEQUENCE, DELIBERATELY. ทรง and ทราย both turn
their opening pair into an s, which is a cluster rule two lessons away, and
the reveal now says so out loud rather than letting a learner derive a wrong
reading in silence. สนใจ is a leading-consonant word and is used only to count
syllables, which is fair at this position.

MNEMONICS ARE TAKEN, NOT FORCED; PEN AND PAPER EVERY LESSON; A CHALLENGE AND
ITS ANSWER NEVER SHARE A SLIDE. All unchanged from lesson 3. No symbol is
declared here, so the pen work is marking the gaps in written-out words.
-->

## exposition what-is-here
image: images/lesson-unwritten-vowels/what-is-here.jpg
scene: A carpenter at a workbench easing a shaped wooden peg into a mortice cut in a heavy beam, shavings gathered around his hands, afternoon light through the window behind him.
heading: The vowels the page leaves out
narration: en You have the whole alphabet now. Forty-four consonants, every vowel spelling the language uses, and every room of the house they lodge in. So here is the awkward part of Thai spelling, and it is the first of four things still standing between you and ordinary written text. A great many perfectly common words carry a vowel sound that nobody bothered to write down. You have run into three of those words already, and each time you were told a lesson was coming. This is that lesson. There are six ways a Thai word hands you a vowel it never spells, and by the end of the morning you will have all six. Every one of them is simple on its own. What they ask of you is a habit: look at a bare row of consonants, and ask what belongs in the gaps. Shall we?
- Six readings that supply a vowel the spelling leaves out.
- Ordinary, common words, and three of them already behind you.
- A bare row of consonants has gaps, and the gaps have rules.

## exposition pen-still-there
image: images/lesson-01/get-a-pen.jpg
heading: Pen and paper
narration: en Pen and paper, as always, though today you will use them differently. No new symbol arrives this morning, so instead of drilling a shape you will write words out and mark where the missing vowel belongs. Go and fetch them, and I will wait.
- Real paper, a real pen.
- Today you mark the gaps rather than drill a shape.

## exposition every-syllable-has-one
heading: Every syllable has a vowel, and some of them hide it
narration: en Start with the thing that stays true whatever the page does. Every Thai syllable has a vowel inside it. A syllable of consonants with the mouth doing nothing in between exists in no language on earth. Thai keeps that rule as faithfully as English does. What varies from word to word is whether the vowel got written down. And the words that leave it out are entirely ordinary. The word for a person sits at rank forty-seven in the language, and on the page it is two consonants with a gap between them. So the skill here is a small one, and you will use it in almost every sentence you read. When the vowel is missing from the page, you work out what it was from where the consonants are standing.
- So far a vowel has always been on the page: you found the symbol, you read its sound, you were done.
- A great many ordinary Thai words spell no vowel at all, and คน at rank 47 is one of them.
- Two consonants, nothing written between them, and it is still one syllable with a vowel inside it.
- Six readings fill in a missing vowel, and this lesson is all six of them.

## exposition implicit-o
image: images/lesson-unwritten-vowels/implicit-o.jpg
scene: A stonemason on a scaffold board setting the keystone into the crown of a narrow brick archway, mortar on his trowel, the finished curve of the arch running away beside him.
heading: Two consonants together hold a short o
narration: en The first reading is the commonest, and lesson nine gave you most of it already. Two consonants written side by side with nothing between them, and the whole word is those two letters. Whenever that happens, a short o is sitting in the gap. It is the o of the English word on, cut off quickly. The first letter opens the syllable, the vowel fills the middle, and the second letter closes it. One syllable, three jobs, two symbols on the page. Work down the list and say each word out loud with that vowel wedged into it. And notice what the page is doing here. An empty gap between two consonants is itself a spelling, as reliable as any vowel symbol you have learned to recognise.
- คน (khon) is a person. ลง (long) is to go down. ตก (dtòk) is to fall. จบ (jòp) is to finish. นก (nók) is a bird. ผล (phǒn) is a result.
- Every one of those is the same shape: first letter, short o, second letter.
- The first consonant opens the syllable and the second one closes it.
- Nothing on the page marks the o, so the empty gap is what you read it from.

## retrieval read-a-bare-pair
reveal: read-a-bare-pair-answer
prompt: ยก puts two letters on the page and no vowel among them, and ย is low class. Say it aloud, then decide its tone.
narration: en One question before we go on. Two letters on the page, nothing written between them, and the first of the two lives down at the harbour. Say the syllable out loud with the missing vowel put back where it belongs. Then take the harder half. What tone does that syllable come out on, and which two facts told you? Both out loud before you turn it over.

## reveal read-a-bare-pair-answer
retrieval: read-a-bare-pair
narration: en The short o goes into the middle, and the second letter shuts the syllable hard. That stop makes the ending dead, and the vowel you supplied is a short one. A harbour letter, a dead ending, a short vowel — which is the rule from lesson four, and it hands you a high tone.
- yók — a short o between the two letters, and ก closes the syllable.
- ก stops the air, so the ending is dead and the vowel is short.
- Harbour letter, dead ending, short vowel: high tone.

## rule unwritten-vowels
rule: unwritten-vowels
narration: en There is the rule as the course states it, and it carries two cases rather than one. Read the second half of it now, because that is where the rest of the morning goes. When three consonants turn up in a row, the short o still lands between the last two of them. The leftover consonant at the front picks up a vowel of its own. That leftover is the next thing to look at.

## exposition implicit-a
image: images/lesson-unwritten-vowels/implicit-a.jpg
scene: A market porter shouldering a single leftover sack after a cart has been emptied, the bare cart standing on the cobbles behind him, early evening light.
heading: A leftover consonant takes a short a of its own
narration: en Now three consonants in a row, which is where people come unstuck. Try the last reading on one and it falls apart in your hands. Take the first two letters and put the short o between them. You have now spent two of your three letters, and the third is standing on its own with no syllable to belong to. So turn the word round and work from the back instead. The last two letters make a bare pair and are read as a pair, exactly as before. That leaves the first letter alone at the front. A consonant standing alone takes a short a. The two of them together become a light, quick syllable that runs straight into the main one. Say the examples with that little run-up in front and listen to how much faster it goes than the syllable it leads into.
- ถนน (thà-nǒn) is a street. ขนม (khà-nǒm) is a snack. ตลก (dtà-lòk) is funny.
- Try the last reading on ถนน and it breaks: ถ and น make thǒn, and the second น is left over with nothing to belong to.
- So work from the back. นน is a bare pair and reads nǒn, which leaves ถ standing alone at the front.
- นคร (ná-khaawn) is a city, and it is the same move again: คร read as a pair, น left over in front of it.

## exposition read-dtalaat
thai: ตลาด
heading: Read this one
narration: en Four symbols, and you own every one of them. The turtle's letter, the monkey's letter, the long vowel from lesson one, and the child's letter shutting the word. Count the syllables before you say anything. The long vowel belongs to the letters around it, which leaves one consonant at the front with nothing of its own. Give that one the short a and the light, quick delivery, and then say the whole word out loud before you turn it over.
- Turtle, monkey, the long vowel, and the child's letter closing it.
- One consonant is left over in front. Out loud before you turn it over.

## exposition read-dtalaat-answer
thai: ตลาด
heading: That one
narration: th ตลาด
narration: en A market. The place half your consonants live, and a word you will read off a street sign within an hour of landing. Two syllables: a short, light one on the turtle, and then the monkey with the long vowel and a hard stop shutting it.
- ตลาด — a market.
- A light, short syllable on the turtle, then the monkey, the long vowel and a hard stop.

## exposition bare-final-ro
image: images/lesson-unwritten-vowels/bare-final-ro.jpg
scene: A thick mooring rope trailing off the edge of a stone quay into flat still water at dusk, its far end lost beneath the surface.
heading: A word ending on a bare ร ends on a long -aawn
narration: en The third reading is a small one, and it is worth taking early because it overrules the first. When the boat's letter shuts a two-letter word and nothing is written in front of it, the gap goes long rather than short. It takes the vowel of the English word saw, drawn right out. Then the boat's letter lands as an n, the way it always does in last position. So the tail of the word is a long open note with a hum closing it. You met the city a minute ago in the three-letter list, and its back half is exactly this pattern. Two letters, and the pair of them together says the long version.
- กร (gaawn) is a hand. พร (phaawn) is a blessing.
- The ร on the back of นคร (ná-khaawn) is doing this very thing.
- The vowel filling the gap is long, and the ร is heard as n, so the word tails off into a long -aawn.
- This is the one reading that overrules the short o. Given a choice between gon and gaawn for กร, take gaawn.

## exposition ro-han
image: images/lesson-unwritten-vowels/ro-han.jpg
scene: A weathered temple door with two heavy iron ring-handles set side by side, the wood worn pale around them, low afternoon light across the grain.
heading: Double ร is a vowel, short a
narration: en The fourth reading is the strangest thing in this lesson, so take it slowly. Two of the boat's letter written side by side, immediately after the opening consonant. When you see that pair, it has stopped being consonants and turned into a vowel. A short a, the one in the English word cup, and no r anywhere in the sound. Whatever letter comes after the pair is the final consonant of the syllable. The whole thing is one syllable, however crowded it looks on the page. And if nothing follows the pair at all, they supply an n themselves and the word finishes on a hum. Two examples, both of them words you will meet in real Thai, and both of them one syllable each.
- กรรม (gam) is karma, or a deed. พรรค (phák) is a political party.
- Two ร side by side spell no r at all. They are a short a, and whatever consonant follows them is the final.
- With nothing following, the pair supplies its own n, so a word ending in รร ends -an.

## exposition o-as-vowel
image: images/lesson-01/the-vowel-house.jpg
heading: อ after a consonant is a long aaw
narration: en The fifth reading arrived in lesson eleven, and this is where it gets nailed down. The silent post is a consonant only when it opens a word, and its job there is to give a vowel something to lean on. Put it anywhere after the first letter and it stops being silent. It becomes a vowel in its own right — the long open aw of the English word saw, jaw dropped and held there. So a three-letter word with the post in the middle is one syllable: opening consonant, long vowel, closing consonant. And the restriction on it earns its keep. Without that one word about position, a longer word can be carved up with the post treated as the start of a syllable. What comes out of your mouth then is nonsense.
- ของ (khǎawng) is a thing. ชอบ (châawp) is to like. บอก (bàawk) is to tell. สอง (sǎawng) is two.
- อ is a consonant only at the front of a word, where it is the silent post a vowel hangs on.
- Anywhere after the first letter it is the long vowel -aaw instead.
- So ตลอด (dtà-làawt) comes apart cleanly: ต on its own, then ล with its own long aaw, then ด closing it.

## exposition read-saawn
thai: สอน
heading: And this one
narration: en Three symbols. The tiger's letter from lesson twelve opens it, the silent post stands in the middle, and the mouse's letter closes it with a hum. The post has a consonant in front of it, so you know which of its two jobs it is doing here. Read the word, and then work out its tone as well. The tiger lives up at the temple, and the ending hums. Out loud before you turn it over.
- Tiger, the post in the middle, and the mouse's letter closing it.
- Temple letter, live ending. Out loud before you turn it over.

## exposition read-saawn-answer
thai: สอน
heading: That one
narration: th สอน
narration: en To teach. The post in the middle is the long open vowel. The mouse's letter hums the syllable shut, and a temple letter on a live ending rises. So the word climbs from the bottom of your range to the top across those three symbols.
- สอน — to teach.
- Temple letter, live ending, and the tone rises.

## exposition w-as-vowel
heading: ว between two consonants is the long vowel ua
narration: en And the sixth, which works the way the fifth does with a different letter. The ring's letter from lesson two is a consonant when it opens a syllable. Wedge it between two consonants, with no other vowel written anywhere in that syllable, and it turns into a vowel instead. The sound is an oo sliding into an a, run together into a single glide rather than two beats. It counts as a long vowel, so a syllable built on it stays live, and that matters the moment you go looking for the tone. Say the four examples and listen for the glide in the middle of each one.
- รวม (ruam) is to combine. ดวง (duang) is a round object. ขวด (khùat) is a bottle. ตรวจ (dtrùat) is to inspect.
- With a consonant on each side and no other vowel in the syllable, ว is the vowel ua rather than a w.
- ua counts as long, so a syllable closing on it stays live.
- Opening a syllable, ว is still the consonant w, as in วง, and after a vowel it closes the syllable.

## retrieval two-readings
reveal: two-readings-answer
prompt: ทร sits inside ทรง and inside ทราย. In one of them a vowel is written and in the other none is. Which word gets a short o supplied, and where does its o go?
narration: en Two words, and they open with the same two letters. One of them writes a vowel out in full. The other writes nothing after those two letters except a consonant shutting the word. So which of the two needs a vowel supplied? And once you have picked it, say whereabouts in the word the supplied vowel lands. Out loud before you turn it over.

## reveal two-readings-answer
retrieval: two-readings
narration: en The first writes no vowel, so the short o is supplied, and it goes between the last two letters. The second spells its vowel out in full, so there is nothing to fill in. And one honest thing before you move on. Both of those words also do something unexpected to the sound of their opening pair, and the clusters lesson takes that up next. For today, read them for their vowels and leave the pair at the front alone.
- ทรง writes no vowel, so the short o is supplied, and it sits between ร and ง.
- ทราย spells า out in full, so nothing needs supplying.
- Both words also change the sound of ทร, and the clusters lesson handles that next.

## exposition which-reading-wins
heading: When two readings both work, take the shorter one
narration: en Last thing, and it is the tiebreak. Every so often a row of consonants can be carved up two ways, and both ways obey a rule you learned this morning. The way to choose is simple. Count the syllables each reading produces, and take the reading that produces fewer. Thai words are shorter than a beginner expects, and the light run-up syllable is the piece people over-use. Where two readings come out level on syllable count, take the one with fewer of those run-ups in it. And one exception sits above both. The boat's letter closing a two-letter word beats the short o, which is the single place where the longer reading is the right one.
- Count syllables first: the reading that produces fewer of them is the one to take. สน inside สนใจ is one syllable, sǒn, rather than two.
- Where that ties, prefer the reading with fewer of those light a syllables at the front.
- And the bare ร ending beats the short o, which is the one place a longer reading wins.

## exposition read-close
heading: Where that leaves you
narration: en Six readings, and no new symbol to carry any of them. A bare row of consonants now comes apart the same way every time. Look for a written vowel first. If there is none, count the letters and work from the back of the word, and give the leftover at the front its short a. Watch for the boat's letter shutting a two-letter word. Watch for two of them standing side by side, and for the post or the ring wedged between two consonants. Before you stop, write this morning's examples out in a column and mark the missing vowel into each gap with your pen. Next lesson: two consonants at the front of a syllable that are spoken together rather than pulled apart.
- Six readings, and no new symbol to carry them.
- Look for a written vowel, then count the letters and work from the back.
- Next: two consonants at the front of a syllable, spoken together.
