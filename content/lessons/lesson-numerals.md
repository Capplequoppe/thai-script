# Thai numerals, ๐ through ๙

lesson: lesson-numerals

<!--
Task 4.3. The optional track. The source course spent the front halves of
three lessons on these digits; they are genuinely rare in running text and
genuinely present on price signs, tickets, house numbers and official
documents, so they are one honest lesson a learner may take or skip. The
sequence marks this lesson required: false — skipping it leaves the course
complete (AC4).
previews: none
ranks: 1-1600
teaches: ๐ ๑ ๒ ๓ ๔ ๕ ๖ ๗ ๘ ๙ — the digit glyphs; they live in thaiNumerals, not in a lessons-table row

NARRATION, ADDED AFTER THE SKELETON.

THE TEN CLIPS IN public/audio/digit-0.mp3 … digit-9.mp3 ARE LEFT ALONE. They
exist, they are referenced by nothing in the app, `ThaiNumeral` has no audioUrl
field, and no manifest or transcript in this repository records what they say —
the mapping "digit-0 is ๐" is inferred from a filename and nothing else. A
`recording:` line pointing at an unverified clip is the one kind of error
nothing downstream can catch, so the ten number words are taught from the prose
here and the clips are left for someone who has listened to them. If they do
say the number words, the ten `narration: th` lines belong on `zero-to-four`
and `five-to-nine`, one per digit, and that is the whole change.

The two Thai clips this lesson does ask for are both answer-slide words and
both corpus entries: ยี่สิบ at rank 404 and เก้า at rank 402. A bare digit is
the case to avoid — `normalise_thai` is not digit-aware and a transcriber
handed ๙ returns either the number word or an Arabic 9, so the carrier's cut
would have nothing to find.

THE SHAPE CUES ARE THE AUTHOR'S, NOT THE DATA'S. `ThaiNumeral` carries thai,
arabic, word and romanization and no shape field at all, unlike the consonants
and vowels with their sceneMnemonic. The ring, the shared base, the fork, the
coil, the matched hooks and the climbing tail are all claims made here; the
narration repeats them and adds no new ones.

ROMANISATION DRIFT, FLAGGED IN SCOPING AND NOT FIXABLE HERE. The auto-generated
review card `<digit>:romanization` is marked against thaiNumerals' untoned
strings while the prose writes the toned corpus forms. The prose stays with the
corpus, which is what every other lesson does.

RANK WINDOW 1-1600 IS ENFORCED on headings, prompts, bullets and answers.
Every Thai word printed below is a corpus word inside it; the digit strings are
outside ก-ฮ and are exempt by construction.
-->

## exposition what-is-here
heading: Ten glyphs, and permission to walk away
narration: en One more lesson, and this one is optional in a way that none of the others were. Ten glyphs — Thailand's own digits, zero through nine. You can close the course right now without them and nothing behind you comes undone. So let me tell you what the ten are worth, and then you decide. They are rare in running text and common on exactly the things a visitor has to read. A price board, a date on a government form, the number over a door. And they cost about twenty minutes, because the ten words behind them are ordinary Thai spellings with no new letters in them. So — worth twenty minutes?
- Ten glyphs, and an honest choice about whether to learn them.
- Rare in running text, and common on signs, forms and doors.
- The words behind the digits are words you can read already.

## exposition pen-still-there
image: images/lesson-01/get-a-pen.jpg
heading: Pen and paper
narration: en Pen and paper, and for the first time in three lessons there are real shapes to draw. Ten of them, and every habit from lesson one applies here without a change — most of these begin at a loop in the same way the letters do, and the pen goes down where the loop starts. Write each digit several times as it arrives, and say its number word out loud while your hand is moving. Go and get them.
- Real paper, a real pen.
- Ten new shapes, and the same stroke habits as the letters.
- Say the number word out loud as you write each one.

## exposition why-optional
heading: Ten glyphs, entirely optional
narration: en Here is the honest case, both ways, and then I will stop pressing. Thailand runs on Arabic digits. Bus numbers, telephone numbers, most prices in most shops, every keyboard — all the digits you have used your whole life. What stayed with the Thai forms is the official and the formal. Government paperwork. Temple boards. The year printed on a banknote. Older house numbers. Museum labels. And the price written on a stall board by somebody who learned to write before the till did. None of it is daily, and all of it is the kind of thing you meet on the day it matters most.
- Thailand writes numbers with Arabic digits almost everywhere. The Thai digits survive on official documents, temple signs, some price boards — and anywhere a date wants to look formal.
- Skipping this lesson skips nothing else: no later material depends on it, and the course is complete without it. It waits here if a menu ever charges you the Thai-digit price.

## exposition zero-to-four
heading: Zero through four: ๐ ๑ ๒ ๓ ๔
narration: en The first five, and each one comes with an ordinary Thai word you can read. Zero is a plain ring, and its word starts on a temple letter and ends on a letter switched off by the silencer from lesson thirteen. One, two and three come next, and two and three are worth looking at together, because they are built on the same base and the three carries an extra hump on top of it. Four forks at the top like a small flag. Read the words in the bullets as you go, out loud, and copy each glyph onto your page beside its word.
- ๐ is zero, a plain ring — ศูนย์ (sǔun), a word you already can read: temple ศ up front and a silenced ย at the end.
- ๑ is one, หนึ่ง (nùeng). ๒ is two, สอง (sǎawng). ๓ is three, สาม (sǎam) — the two and three share a base; three carries an extra hump.
- ๔ is four, สี่ (sìi), and its glyph forks like a flag.

## exposition five-to-nine
heading: Five through nine, ๕ to ๙
narration: en The second five, and then the units above ten. Five coils back on itself, and six follows it. Seven and eight are the pair to be careful with — a matched set of hooks, facing opposite ways, and the two that a tired eye confuses. Nine finishes with a tail that climbs. Then the bigger units, and they need no new glyphs at all. Ten, a hundred, a thousand and a million are ordinary words, spelled out of letters you have owned for lessons.
- ๕ is five, ห้า (hâa) — the glyph coils back on itself. ๖ is six, หก (hòk).
- ๗ is seven, เจ็ด (jèt), and ๘ is eight, แปด (bpàaet) — a matched pair of hooks facing opposite ways.
- ๙ is nine, เก้า (gâo), with a tail that climbs. Larger units are ordinary words: สิบ (sìp) ten, ร้อย (ráawi) hundred, พัน (phan) thousand, ล้าน (láan) million.

## exposition reading-a-number
heading: Reading a number you meet on a sign
narration: en Now the good part, and it is short, because there is nothing to learn. Thai digits work positionally, exactly as Arabic ones do. Same order, same columns, same reading from left to right. A two-digit number is tens then units. A three-digit number is hundreds, tens, units. Nothing is reversed and nothing is grouped differently. So once the ten shapes are in your eye, every number in the language is readable, however long it runs. Which leaves what, exactly? The shapes, and nothing else at all.
- Thai digits combine exactly as Arabic ones do — position by position, nothing reordered.
- ๒๕ is 25. ๑๐๐ is 100. A ticket stamped ๗๕ is asking for 75, and the only new skill is glyph recognition.
- The word เลข (lêek) — number — is what signs use to label them.

## exposition say-the-number
thai: ๒๐
heading: Read it, and then say it
narration: en Two glyphs, and you have met both. Work out the number first, which should take you a second or two. Then say it in Thai, which is the harder half, because Thai has a word for twenty that does not simply put two in front of ten. Have a go anyway, out loud, and then turn it over.
- Two digits. Work out the number first.
- Then say it in Thai, out loud.
- Turn it over afterwards.

## exposition say-the-number-answer
thai: ๒๐
heading: That one
narration: th ยี่สิบ
narration: en Twenty. And the front half of that word is a one-off worth knowing early, because twenty is the only ten that gets its own name. Thirty onwards go back to being predictable — the digit word, then the word for ten, in that order, all the way up to ninety.
- **๒๐** — twenty, ยี่สิบ (yîi-sìp).
- Twenty is the one ten with a name of its own.
- From thirty up: the digit word, then สิบ (sìp).

## retrieval read-price
reveal: read-price-answer
prompt: A market stall lists a price as ๓๕. What number is that, and which two digit glyphs did you just read?
narration: en A stall board now, with a price chalked on it in Thai digits. Two glyphs, both from this lesson. Read the number, and then say which two digits you read and how you told each one from its neighbours. Out loud before you turn it over.

## reveal read-price-answer
retrieval: read-price
narration: en Thirty-five. The humped one is the three and the coiled one is the five, and they sit in the order you would expect, tens then units. Read the next board you walk past the same way, straight through, without translating it digit by digit first.
- 35. ๓ is three — the humped glyph — and ๕ is five, the one that coils back on itself. Position works exactly as in Arabic digits.

## retrieval spot-digit
reveal: spot-digit-answer
prompt: ๙ and ๗ both rise to a point. A date stamp reads ๙. Which number is it, and what tells the two glyphs apart?
narration: en One more, and this is the confusable pair of the ten. Two glyphs that both rise to a point, on a date stamp where there is no second digit to help you. Name the number, and then say what your eye should have gone to first. Out loud, then turn it over.

## reveal spot-digit-answer
retrieval: spot-digit
narration: th เก้า
narration: en Nine. The tail is the thing to look for, because it climbs above the line and the seven's does not. Everything else about the two shapes is close enough that checking the tail first will save you a second every time.
- Nine. ๙ finishes with a tail that climbs above the line, while ๗ keeps a straight neck with a small hook.

## exposition close
heading: Done — or happily skipped
narration: en That is the ten, and that is the course. Ten glyphs, ten ordinary words behind them, and positional reading you already had. Write the ten out one more time before you go, each with its word said out loud, and then go and find a temple board or a banknote and read a real number off it. Whether you took this lesson or walked past it, everything behind you is finished and the whole writing system is yours.
- Ten glyphs, their number words, and positional reading.
- Larger numbers need no new shapes, only the words you already read.
- Taken or skipped, the course stands complete behind you.
