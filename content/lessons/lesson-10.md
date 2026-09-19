# Three ways of saying a short vowel that counts as long

lesson: lesson-10

<!--
Middle band, lesson 5 of 6. Declares no consonant; the vowels are เ-า, ไ and ใ.
previews: none
teaches: ๆ — mai yamok is one of the three rules this lesson's row declares,
and the symbol is the rule. The lessons table records it under
`specialRulesIntroduced` rather than in `vowels` or `toneMarks`, so there is no
row entry for the glyph to arrive through; it is declared here instead.
ranks: 1-2000

The clusters rule slide renders from `specialRules`, states the inventory and
stops there. True and false clusters — ทร reading as s, the silent ร — belong
to `lesson-clusters`, which this lesson names. Stating half of it here and the
other half twelve lessons away is the split phase three exists to repair.

THE `teaches:` LINE ABOVE IS LOAD-BEARING. `middleBand.test.ts` parses it for
an em dash with text after it, and a reworded header that loses the `—` stops
declaring ๆ, at which point the glyph fails the forward-reference sweep. Leave
the dash where it is.

ๆ IS WRITTEN SPACE-SEPARATED, with a plain ASCII space: `เด็ก ๆ`, `ใคร ๆ`.
Closed up, the run becomes a five- or four-character "word" that is not in
vocabulary.json and the rank sweep fails on it.

THE MID-DEAD TONE IS NOT ANTICIPATED HERE. The obvious contrast for the
ao-ai exception is ไป against ตก, and it is tempting to say ตก drops low —
but `mid-dead-short` is lesson eleven's and lesson nine deliberately withheld
it. So the contrast is drawn structurally: ไป ends on its vowel with nothing
stopping it and ตก stops dead on the chicken's letter. No tone is claimed for
the dead one.

เอา IS PRINTED ONCE, IN THE WORD LIST, AND NEVER SET AS A READING CHALLENGE.
Its opening ring is อ, which lesson six put on the page as the prop and which
lesson eleven turns into a letter. The learner cannot yet derive it, so the
bullet says whose it is and hands it forward rather than asking for it.

ใ's GUEST LIST CANNOT BE ENUMERATED FROM THIS REPOSITORY. Nothing here holds
the canonical twenty; the corpus yields sixteen monosyllables and most of
those need letters or marks from later lessons. So five are named — ใน ใจ ใบ
ใด ใคร — and the rest are handed to the learner as words to meet, which is
the only claim the data supports.

MNEMONICS ARE TAKEN, NOT FORCED; PEN AND PAPER EVERY LESSON; A CHALLENGE AND
ITS ANSWER NEVER SHARE A SLIDE. All unchanged from lesson 3.
-->

## exposition what-is-here
image: images/lesson-10/what-is-here.jpg
scene: A wooden Thai house on stilts seen from the front at the foot of its steps, the front door standing open at the top, late afternoon light across the veranda.
heading: No new letters, and three arrivals on the steps
narration: en Something different today. No consonant at all. You have twenty letters and today you get none, which means every reading you do this lesson is done with letters you already own. What arrives instead is three vowels, all of them at the front steps, and a rule about them that will look wrong when you first read it. All three are over quickly in the mouth, and all three are counted long when the tone is worked out. Then a mark that tells you to say a word twice. And at the end, your first look at two consonants that run together into a single sound.
- No new consonant. Every word today is built from letters you have.
- Three vowels, all of them at the front steps.
- Short in the mouth, counted long for the tone.
- A repeat mark, and two consonants run together.

## exposition pen-still-there
image: images/lesson-01/get-a-pen.jpg
heading: Pen and paper
narration: en Pen and paper, as always, and the names out loud while you write. Vowels have two-part names too, and you have been saying them since lesson one. Go and get them, and come back when they are in front of you.
- Real paper, a real pen.
- Both halves of the name, out loud, every time.

## exposition back-to-the-steps
image: images/lesson-10/back-to-the-steps.jpg
scene: A flight of wooden front steps running up to the veranda of a Thai house on stilts, worn smooth in the middle of each tread, late afternoon light.
heading: The busiest room in the house
narration: en The front steps have been open since lesson seven, and by the end of today they will be the most crowded part of the house. One mast came first. Then two masts side by side. Then a mast with its top curled over into a lean, last lesson. Today three more arrive, and every one of them keeps the habit the steps are famous for. The mark goes down ahead of the consonant, your eye reaches it first, and the consonant still comes out of your mouth first. The order on the page and the order in your mouth part company here, and today is the third lesson running where that costs you something.
- The steps opened in lesson seven and have been filling ever since.
- Three more lodgers arrive today.
- Written ahead of the consonant, spoken after it.

## exposition meet-ao
image: images/lesson-10/meet-ao.jpg
scene: A man standing at the top of the wooden front steps of a Thai house on stilts with one hand raised in surprise, the open door behind him, late afternoon light.
glyph: เ-า
gloss: the pair who bracket the letter
cue: a yelp of surprise
heading: The first one comes in two pieces
teaches: sara-ao
narration: en The first of the three is written in two halves, with the consonant sitting between them. A single mast in front, the one you met in lesson seven. And behind the consonant, the long post from lesson one, standing in the back yard where it always stands. One vowel, two marks, two rooms. Listen to it.
recording: th สระเอา public/audio/sara-au.mp3
narration: en That is the vowel in the English word how, and it comes out as a yelp. It is over fast. Hold on to that, because in about ten minutes I am going to tell you that Thai counts it as long, and you will want to have heard how short it really is.
- A mast in front, the consonant, then the long post from lesson one.
- One vowel written in two pieces, in two rooms.
- The sound is the vowel in *how*, and it goes by fast.

## exposition write-ao
heading: Write it
teaches: sara-ao
narration: en Write the mast first, because that is the order your pen goes in. Your mouth takes the two of them in the opposite order. Then the consonant. Then the post behind it. Try it with the boat's letter from lesson eight in the middle and say the syllable out loud. The consonant leaves your mouth first and the yelp follows it, exactly as the steps have taught you twice already.
- Mast, then consonant, then the long post. In that order on the page.
- Say it aloud with the consonant leaving your mouth first.
- Put the boat's letter in the middle and try it.

## exposition read-rao
thai: เรา
heading: Read this one
teaches: sara-ao
narration: en Three marks, and the middle one is the boat. Take the two outer marks together as one vowel, put the boat between them, and say it out loud before you turn it over.
- The mast, the boat's letter, the long post.
- One vowel wrapped round one consonant. Out loud before you turn it over.

## exposition read-rao-answer
thai: เรา
heading: That one
teaches: sara-ao
narration: th เรา
narration: en We, or us. It is how a Thai speaker says we, and it is also how a great many people say I in ordinary conversation, depending on who they are talking to.
- **เรา** — we, or us.
- Also a very common everyday word for *I*.

## exposition meet-ai-malai
image: images/lesson-10/meet-ai-malai.jpg
scene: A tall wooden post standing at the foot of the front steps of a Thai house on stilts with its top broken into a sharp zigzag, late afternoon light.
glyph: ไ
gloss: the zigzag mast
cue: the English word I
heading: The second one, and the common one
teaches: sara-ai-mai-malaai
narration: en The second arrival is a single mast again, and it stands on the steps like the others. What marks it out is the top, which breaks into a small sharp zigzag instead of a smooth curve. Listen to its name.
recording: th สระไอ ไม้มลาย public/audio/sara-ay-may-malay.mp3
narration: en The sound is the English word I, said quickly. This one is the ordinary, everyday spelling of that sound, and it will turn up several times on every page of Thai you ever read.
- A single mast with a zigzag broken into its top.
- The sound is the English word *I*, said fast.
- This is the ordinary spelling, and you will meet it constantly.

## exposition write-ai-malai
thai: ไ
heading: Write it
teaches: sara-ai-mai-malaai
narration: en One upright, and the zigzag goes on at the top as a small sharp flick rather than a curl. Write it a few times. Then write it ahead of the fish's letter from last lesson and say what comes out, with the consonant first.
- One upright with a sharp zigzag on top.
- Write it ahead of the fish's letter and say it aloud.
- Consonant out of the mouth first, then the vowel.

## exposition read-bpai
thai: ไป
heading: Read this one
teaches: sara-ai-mai-malaai
narration: en Two marks. The zigzag mast, and the fish's letter you learned last lesson. It is one of the commonest words in the language and you have everything you need for it. Out loud before you turn it over.
- The zigzag mast, then the fish's letter.
- Out loud before you turn it over.

## exposition read-bpai-answer
thai: ไป
heading: That one
teaches: sara-ai-mai-malaai
narration: th ไป
narration: en To go. It is the thirty-fourth commonest word in Thai, and it does far more work than the English word does, turning up inside directions, inside tenses, and on the end of verbs to mean away from here.
- **ไป** — to go.
- The 34th commonest word in the language.

## exposition meet-ai-muan
image: images/lesson-10/meet-ai-muan.jpg
scene: A tall wooden post standing at the foot of the front steps of a Thai house on stilts with its top rolled over into a tight curl, late afternoon light.
glyph: ใ
gloss: the curled mast
cue: the same sound, a different door
heading: The third one, which sounds exactly like the second
teaches: sara-ai-mai-muuan
narration: en Now the strange one. Here is a mast whose top rolls over into a curl instead of breaking into a zigzag. Listen to its name.
recording: th สระไอ ไม้ม้วน public/audio/sara-ay-may-muan.mp3
narration: en Different name, different mark, and the same sound coming out of your mouth. These two are the one place in the entire vowel system where two spellings share a single sound with nothing to separate them. They never turn up in the same word, and no word gives you a choice between them. The spelling of the word decides which of the two answers the door, and your ear will never tell you. So how are you supposed to know which one a word takes?
- A single mast with its top rolled into a curl.
- The same sound as the zigzag, with nothing in the sound to separate them.
- The word's spelling decides which one it takes.

## exposition write-ai-muan
thai: ใ
heading: Write it
teaches: sara-ai-mai-muuan
narration: en One upright again, and the top rolls over into a closed curl this time. Write the two of them next to each other on the page and look at what your hand has made. A flick, and a curl. That difference is all the page will ever give you.
- One upright with a rolled curl on top.
- Write it beside the zigzag and compare the two tops.
- A flick against a curl. Nothing else separates them.

## exposition the-guest-list
image: images/lesson-10/the-guest-list.jpg
scene: A short handwritten guest list pinned to the wooden doorframe of a Thai house on stilts, corners lifting in the air, late afternoon light.
heading: Which words take the curl
teaches: sara-ai-mai-muuan
narration: en Here is the useful part, and it makes this much smaller than it first sounds. The curl is used in a closed list of about twenty common words and nowhere else in the language. Every other word with this sound in it takes the zigzag. So the curl works like a guest list pinned to the door. About twenty houses, twenty named visitors, and everybody else goes round the other way. You have four of them today, and they are all words you will use constantly.
- **ใน** — in. The 23rd commonest word in Thai.
- **ใจ** — the heart, or the mind.
- **ใบ** — a leaf.
- **ใด** — any.

## retrieval two-spellings
reveal: two-spellings-answer
prompt: You hear a Thai word with this sound in it and you have to write it down. Which of the two spellings do you reach for, and how confident should you be?
teaches: sara-ai-mai-muuan, sara-ai-mai-malaai
narration: en So here is the question, and it is the practical one. Somebody says a Thai word to you with that sound in it, and you have to write the word down. Which of the two masts do you reach for? And then the second half: how confident are you allowed to be about it? Say both out loud before you turn it over.

## reveal two-spellings-answer
retrieval: two-spellings
teaches: sara-ai-mai-muuan, sara-ai-mai-malaai
narration: en The zigzag, every time, unless you happen to know the word is on the list. The curl covers about twenty words and the zigzag covers the rest of the language, so guessing the zigzag will be right far more often than it is wrong. And when you meet one of the twenty, you learn it as a word rather than as a rule.
- Reach for the zigzag **ไ**, unless you know the word is on the list.
- The curl **ใ** covers roughly twenty words, and the zigzag covers everything else.
- Learn the twenty as words, one at a time, as you meet them.

## rule ao-ai-tone-exception
rule: ao-ai-tone-exception
teaches: sara-ao, sara-ai-mai-malaai, sara-ai-mai-muuan

## exposition short-but-live
image: images/lesson-10/short-but-live.jpg
scene: A brass handbell standing upright on the wooden veranda rail of a Thai house on stilts, late afternoon light behind it.
heading: Short in the mouth, long for the tone
teaches: sara-ao, sara-ai-mai-malaai, sara-ai-mai-muuan
narration: en Now the rule that looks wrong. Say the three vowels you have just learned, and time them against the two hooks from lesson four. They are quick. Short, by any honest measure of how long your mouth spends on them. And yet when you go to work out the tone, Thai counts all three of them as long, and treats every syllable they end as live. So is this simply an exception you have to memorise and carry around with you? It is worth a minute to see why it is far less arbitrary than it looks.
- The three vowels today are genuinely short in the mouth.
- For working out a tone, all three are counted long.
- A syllable ending on one of them is live.

## exposition what-makes-a-syllable-dead
image: images/lesson-10/what-makes-a-syllable-dead.jpg
scene: A wooden shutter swinging wide open on the side wall of a Thai house on stilts, the room beyond dark, late afternoon light.
heading: What the live and dead rule is actually measuring
narration: en Go back to lesson three for a moment and look at what live and dead were ever about. A syllable is dead when something stops it — a consonant at the back that shuts the air off and leaves nothing ringing. A syllable is live when nothing does that, and the sound is free to carry on. The back of the syllable is the whole of it. Take the word for to go, which you read five minutes ago. It ends on its vowel, and there is nothing behind that vowel to shut it off, so nothing makes it dead. Now take the word for to fall from last lesson, which stops on the chicken's letter, and the air goes nowhere. One of those is live and the other is dead, and the difference lies entirely in what sits behind the vowel.
- **Dead** means something at the back stopped the air.
- **ไป** ends on its vowel, with nothing behind it to stop anything.
- **ตก** stops on the chicken's letter, and the air goes nowhere.
- What stops the syllable is the whole of what the rule measures.

## retrieval short-or-live
reveal: short-or-live-answer
prompt: ไป is over as fast as any short vowel you know. Say why it still takes the live rule rather than the dead one.
narration: en A question, then. The word for to go is over as fast as any short vowel you have learned, and yet it takes the live rule. Say why, out loud, before you turn it over. And say what you would have to add to that word to make it dead.

## reveal short-or-live-answer
retrieval: short-or-live
narration: en Because nothing stops it. The syllable runs out on the vowel, with no consonant behind it shutting the air off, so there is nothing there to make it dead. To make it dead you would have to put a stopping consonant on the back of it, and then the ending would be doing the deciding rather than the vowel. That leaves the market's rule for a live syllable, which lesson three gave you, and it is the one you reach for here.
- Nothing stops it, so the syllable is live.
- Put a stopping consonant behind the vowel and it becomes dead.
- **ไป** opens on a market letter and ends live, so lesson three's rule settles it.

## rule mai-yamok
rule: mai-yamok

## exposition the-repeat-mark
image: images/lesson-10/the-repeat-mark.jpg
scene: A row of identical woven baskets standing side by side along a shop front in a Thai street, warm afternoon light.
glyph: ๆ
gloss: say the word again
cue: one mark, one repetition
heading: The mark that means say it twice
narration: en Something completely different for two minutes. This mark is punctuation rather than a letter, and it carries no sound of its own. It stands after a word and it means: say that word again. Listen to what it is called.
recording: th ไม้ยมก public/audio/other-mayyamok.mp3
narration: en One mark instead of writing the whole word out twice, which saves the ink and saves your eye. It goes after the word with a space in front of it, so the mark stands slightly apart from the word it is repeating.
- Punctuation rather than a letter, and no sound of its own.
- It stands after a word and tells you to say that word again.
- A space is left in front of it.

## exposition what-doubling-does
image: images/lesson-10/what-doubling-does.jpg
scene: A group of young children running together down a narrow Thai street past shop fronts, late afternoon light.
heading: What doubling a word actually does
narration: en Here is the word for a child, from lesson seven, with the mark behind it. Say it twice out loud — that is the whole of what the mark asks for, and the voice this course uses runs the two together, so this one is yours to say rather than mine. It means children. And this is the part worth knowing, because English does the opposite. When English repeats a word it usually means more of it, or a stronger version. Thai usually goes the other way and makes the word vaguer, broader, less exact. Children in general rather than any particular children. Keep that direction in your head and doubled words will stop surprising you.
- **เด็ก ๆ** — children, from the word for a child.
- English doubling usually intensifies.
- Thai doubling usually broadens, and makes the word less exact.

## rule consonant-clusters
rule: consonant-clusters

## exposition clusters-named
image: images/lesson-10/clusters-named.jpg
scene: A thick twisted mooring line running along a stone harbour quay, its strands wound tightly into one rope, late afternoon light on the stone.
heading: Two consonants that run together into one sound
narration: en Last thing today. You met two bare consonants side by side last lesson, and you were told to put an unwritten vowel between them. There is a second thing two consonants can do when they stand side by side. Sometimes they take no vowel between them at all. They run together into a single sound at the front of one syllable, the way the English word tree runs a t and an r together without anything in between. Thai keeps this very tight. Only three letters in the whole alphabet can be the second one, and the rule above names all three. English will let a dozen different letters ride second, and Thai lets three.
- Two consonants can also run straight together into one sound.
- One syllable, with the two letters sharing a single onset.
- Only three letters can stand second, and the rule names all three.
- Last lesson gave you the other reading of two bare consonants.

## exposition read-khrai
thai: ใคร
heading: Read this one
teaches: sara-ai-mai-muuan
narration: en Three marks. The curled mast, the buffalo's letter, and the boat's letter — and those last two are a cluster, so run them together as one sound. It is one syllable. Say it out loud before you turn it over.
- The curled mast, the buffalo's letter, the boat's letter.
- The last two run together into a single syllable.
- Out loud before you turn it over.

## exposition read-khrai-answer
thai: ใคร
heading: That one
teaches: sara-ai-mai-muuan
narration: th ใคร
narration: en Who. And it is one of the twenty words on the curl's guest list, so it is a fifth one for your collection. Put the repeat mark behind it and it means anyone at all, which is the broadening from a moment ago, applied to a question word.
- **ใคร** — who, and a fifth word taking the curl.
- **ใคร ๆ** — anyone at all.

## exposition read-thai
thai: ไทย
heading: One more, and you have been waiting for it
teaches: sara-ai-mai-malaai
narration: en Three marks, and every one of them has been yours for a while. The zigzag mast from today, the soldier's letter from lesson seven, and the giant's letter from lesson two. Out loud before you turn it over.
- The zigzag mast, the soldier's letter, the giant's letter.
- Out loud before you turn it over.

## exposition read-thai-answer
thai: ไทย
heading: That one
teaches: sara-ai-mai-malaai
narration: th ไทย
narration: en Thai. The name of the language you are learning and the country it is spoken in. Its consonants have been readable since lesson seven, and the zigzag mast was the one piece it was still missing.
- **ไทย** — Thai, and Thailand.
- The last piece it needed was today's zigzag mast.

## exposition more-words
heading: Words you can read with them
teaches: sara-ai-mai-malaai, sara-ao, sara-ai-mai-muuan
narration: en A handful more before we finish. The zigzag gives you fire. The two-piece vowel gives you a very common verb whose opening mark is that ring you met in lesson six, propping up a bare vowel — silent here, holding an empty slot, and getting a lesson of its own next time. And the words for glad and for frightened are each two syllables you already have, stuck together.
- **ไฟ** — fire.
- **เอา** — to take, or to want. The ring at its front is silent.
- **ดีใจ** — glad. Good, and a heart.
- **ตกใจ** — frightened. A heart that falls.

## exposition read-close
heading: Twenty letters, eighteen vowels
narration: en Twenty letters still, and eighteen vowel spellings. Today cost you no new consonants at all and it bought you three vowels, a mark, and the beginning of clusters. And look at the shape of what you learned about tone, because it will come back. The rule that sounded like an exception turned out to be lesson three's live and dead rule, applied without a stopwatch. Next lesson is the last of this run, and it is the one that finishes the market: a letter you have been looking at since lesson six without being told its name, which is silent in one place and a vowel in another.
- Eighteen vowel spellings, and no new letters today.
- A vowel at the back of a syllable stops nothing, so the syllable is live.
- Next: the letter from lesson six gets its name, and the market's grid closes.
