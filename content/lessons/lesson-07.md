# The soldier and the owl, a mast in front, and the seven pairs

lesson: lesson-07

<!--
Middle band, lesson 2 of 6. Declares ท and ฮ and the vowels เ and เ-ะ.
ranks: 1-2500

The window is wider here than the rest of the band by five hundred ranks, and
ฮ is the whole reason: its commonest word in the corpus is ฮา at rank 2394,
and there is no second one before rank 3478. A letter is not droppable for
being rare — ฮ is what completes the seventh pair, and the seventh pair is ห,
the fourth commonest syllable initial in the language.

previews: ข ฉ ถ ผ ฝ ส ห — ฮ is the last of the seven hummed-and-breathed
letters whose sound is shared with a temple letter, so this is the first point
in the sequence where the whole pairing can be shown at once. The glyphs are
shown as the far half of a pair and nothing is asked of them; each is taught,
named and drilled in its own lesson later. Showing the map costs seven glyphs
and saves fourteen facts, which is the entire argument for teaching class as
pairs.

`middleBand.test.ts` reads the pair inventory off the `cousin-pairs` slide:
every bullet of the form "<letter> is <district>" is one half of a pair, and
the pairs it finds must be exactly the sound groups that hold both a high and
a low letter. Delete a bullet and the lesson stops claiming that pair.

ๆ is not used here. เ-ะ brings ็ with it through `conditionalVowelForms`.
-->

## exposition thaaw-thahaan
heading: thaaw thá-hǎan, a soldier on the bridge
- ท has a head that curls in, a back that climbs straight up, and an arch that marches back down — a soldier pacing the harbor bridge.
- Harbor again: ท is low class, like ค last lesson. The sound is th, a t carried out on a breath, so ทาง (thaang), a way or a direction, puffs where an English t would not.
- Watch it in final position instead and the breath disappears: บาท (bàat) is the baht, and the ท there is a plain t-stop. That is the dead-ending rule from lesson three, unchanged.

## exposition haaw-nok-huuk
heading: haaw nók-hûuk, an owl on the water
- ฮ is a single round eye with a zigzag crest over it — an owl's ear-tufts, blinking at the night harbor.
- It says h, and ฮา (haa) is to laugh. It is the rarest letter you will meet in this course: barely one character in ten thousand of running Thai.
- Learn it anyway, and learn it now. It is the last piece of a pattern that covers seven sounds, and without it the pattern has a hole in exactly the place a beginner most needs it.

## exposition cousin-pairs
heading: Seven sounds, two letters each
- Every letter below breathes or hisses — none of them can be hummed, and none of them is a plain stop. That is the one group where class is not derivable from the sound, and Thai gives each of those sounds two letters: one at the harbor, one at the temple.
- ค is harbor and ข is temple. Both say kh.
- ช is harbor and ฉ is temple. Both say ch.
- ท is harbor and ถ is temple. Both say th.
- พ is harbor and ผ is temple. Both say ph, and the two are the same figure with the head turned the other way.
- ฟ is harbor and ฝ is temple. Both say f, and they differ by the same head turn.
- ซ is harbor and ส is temple. Both say s.
- ฮ is harbor and ห is temple. Both say h.
- Seven rows, not fourteen letters. You already hold the whole harbor column; the temple column arrives one lesson at a time, and each one you meet is a letter whose sound you can already make.

## retrieval why-two
reveal: why-two-answer
prompt: The two letters in a row sound identical. Say what the second one is for, and what you would lose if Thai had only one of them.

## reveal why-two-answer
retrieval: why-two
- The district is the difference: one is low class, the other high class, and class is half of every tone decision.
- With one letter per sound, those syllables could only carry the tones the low class can reach. The second letter is how Thai writes the other tones for the same sound.

## exposition mast-vowels
heading: เ and เ-ะ, the mast raised in front
- เ is a single mast written before its consonant and sounded after it. Reading order and writing order come apart here for the first time: เท is read thee, not ee-th.
- Held long it is ee, the vowel of a level gaze. เท (thee) is to pour.
- เ-ะ is the same mast with two stacked hooks behind it — the short, clipped version of the same vowel. It is rarely written out in full, and the next slide is why.

## exposition e-with-a-final
heading: What the hooks turn into
- The stacked hooks of เ-ะ only survive when nothing follows. Add a final consonant and they collapse into a small ็ perched over it.
- เด็ก (dèk) is a child. เย็น (yen) is cool or evening. เก็บ (gèp) is to keep or put away.
- ก็ (gâaw) is the odd one out and worth knowing on sight: a bare ก wearing the same roof, meaning then or also, and one of the commonest words in the language.
- This is the second vowel you have met that is written differently depending on what follows it. ะ was the first, back in lesson four, when it became a curl over the consonant.

## retrieval hooks-or-roof
reveal: hooks-or-roof-answer
prompt: You want to write the short e sound twice — once in a syllable ending in k, once in a syllable ending in nothing. What changes between them?

## reveal hooks-or-roof-answer
retrieval: hooks-or-roof
- With a final consonant the hooks become the ็ roof: เด็ก.
- With nothing following, the hooks stay written out after the consonant.
- The sound does not change at all. Only the spelling reacts to what comes next.

## exposition more-words
heading: Words you can read now
- ทุก (thúk) is every. ทันที (than thii) is at once. นาที (naa-thii) is a minute, and บางที (baang thii) is perhaps.
- ทาน (thaan) is to eat. ทีม (thiim) is a team and เกม (geem) is a game — both borrowed, both spelled exactly as they sound.
- บทบาท (bòt bàat) is a role. ทับ (tháp) is to lie on top of something.
