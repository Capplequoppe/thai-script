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
-->

## exposition every-syllable-has-one
heading: Every syllable has a vowel. Not every syllable shows you one.
- So far a vowel has always been on the page: you found the symbol, you read its sound, you were done.
- A great many ordinary Thai words spell no vowel at all, and คน at rank 47 is one of them. Two consonants, nothing between them, and it is still two sounds and a vowel.
- There are six readings that fill in a missing vowel, and this lesson is all six. Once you have them, a bare string of consonants stops being a puzzle.

## exposition implicit-o
heading: Two consonants together hold a short o
- คน (khon) is a person. ลง (long) is to go down. ตก (dtòk) is to fall. จบ (jòp) is to finish. นก (nók) is a bird. ผล (phǒn) is a result.
- Every one of those is the same shape: first letter, short o, second letter. The first consonant opens the syllable and the second one closes it.
- Nothing on the page tells you the o is there. The absence of a vowel is itself the instruction.

## retrieval read-a-bare-pair
reveal: read-a-bare-pair-answer
prompt: ยก puts two letters on the page and no vowel among them, and ย is low class. Say it aloud, then decide its tone.

## reveal read-a-bare-pair-answer
retrieval: read-a-bare-pair
- yók — a short o between the two letters, and ก closes it.
- ก stops the air, which makes this a dead syllable on a short vowel. Low class, dead, short: high tone.

## rule unwritten-vowels
rule: unwritten-vowels

## exposition implicit-a
heading: A consonant that will not fit takes a short a of its own
- ถนน (thà-nǒn) is a street. ขนม (khà-nǒm) is a snack. ตลก (dtà-lòk) is funny.
- Try the previous reading on ถนน and it breaks: ถ and น make thǒn, and then the second น is left over with nothing to belong to.
- So work from the back. นน is a bare pair and reads nǒn. That leaves ถ standing alone at the front, and a lone consonant takes a short a and becomes a light, quick syllable ahead of the main one.
- นคร (ná-khaawn) is a city, and it is the same move with three letters: คร at the back, น left over at the front.

## exposition bare-final-ro
heading: A word that ends on a bare ร ends -aawn
- กร (gaawn) is a hand. พร (phaawn) is a blessing. The ร at the end of นคร (ná-khaawn) is doing the same thing.
- The vowel is long, and the ร is heard as n, so the tail of the word is a long -aawn whatever consonant came first.
- This is the one reading that overrides the short o. Given the choice between gon and gaawn for กร, take gaawn.

## exposition ro-han
heading: Double ร is a vowel, short a
- กรรม (gam) is karma or a deed. พรรค (phák) is a political party.
- Two ร side by side spell no r at all. They are a short a, and whatever consonant follows them is the final: กรรม is g, a, m.
- With nothing following, the pair supplies its own n. So a word ending in รร ends -an.

## exposition o-as-vowel
heading: อ after a consonant is a long aaw
- ของ (khǎawng) is a thing or possession. ชอบ (châawp) is to like. บอก (bàawk) is to tell. สอง (sǎawng) is two.
- อ is a consonant only at the front of a word, where it is the silent post a vowel hangs on. Anywhere after the first letter it is the long vowel -aaw.
- That is why ตลอด (dtà-làawt) is not three consonants and a puzzle. It is ต, then ล with its own long aaw, then ด closing the syllable.

## exposition w-as-vowel
heading: ว wedged between two consonants is ua
- รวม (ruam) is to combine. ดวง (duang) is a round object. ขวด (khùat) is a bottle. ตรวจ (dtrùat) is to inspect.
- With a consonant on each side and no other vowel in the syllable, ว is the vowel ua rather than a w.
- ua counts as long, so a syllable closing on it stays live.
- At the front of a syllable it is still the consonant w, as in วง, and after a vowel it is a final.

## retrieval two-readings
reveal: two-readings-answer
prompt: ทร sits inside ทรง and inside ทราย. In one of them a vowel is written and in the other none is. Which word gets a short o supplied, and where does its o go?

## reveal two-readings-answer
retrieval: two-readings
- ทรง gets the short o: it has no written vowel, so the o sits before its last letter, ง.
- ทราย spells า out loud, so nothing needs supplying.

## exposition which-reading-wins
heading: When two readings both work, take the shorter one
- Count syllables first: the reading that produces fewer of them is the right one. สน in สนใจ is one syllable, sǒn, and not two.
- Where that ties, prefer the reading with fewer of those light a syllables at the front.
- And the bare ร ending beats the short o, which is the only place a longer reading wins.
