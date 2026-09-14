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
-->

## exposition one-table
heading: One table, twelve cells, three districts
- Every consonant already carries a class — market, harbor or temple — and that class alone decides a syllable's tone with no mark written at all.
- A tone mark changes that outcome, and there are only four shapes: mai ek (่), mai tho (้), mai tri (๊) and mai chattawa (๋).
- Lay all three classes against all four marks and you get twelve cells. Eight occur in standard spelling. The other four do not, and that absence is a fact worth learning, not a gap to skip past.

## exposition mid-class-marks
heading: The market takes all four, in order
- mai ek (่) gives low tone. ไก่ (gài) is chicken.
- mai tho (้) gives falling tone. เก้า (gâo) is nine.
- mai tri (๊) gives high tone, and the market is the only district that ever takes this mark. โต๊ะ (dtó) is a table.
- mai chattawa (๋) gives rising tone, market only again. เดี๋ยว (dǐao) is "in a moment."
- Four marks, and each lands on a different tone of its own — the market is the whole set, spoken for.

## exposition high-class-marks
heading: The temple takes two
- mai ek (่) gives low tone here too. ข่าว (khàao) is news.
- mai tho (้) gives falling tone. ให้ (hâi) is to give.
- mai tri and mai chattawa never sit over a temple letter in standard spelling. The shapes are writable — they turn up in loanwords and informal spelling — but no standard word pairs either one with a temple letter.

## exposition low-class-marks
heading: The harbor takes two, and swaps them
- mai ek (่) gives falling tone here — the opposite of what it gave the temple. ล่าง (lâang) is below.
- mai tho (้) gives high tone here — again the opposite of the temple's falling. ม้า (máa) is horse.
- The harbor is the odd one out in the whole table: the same two marks that gave the temple low-then-falling give the harbor falling-then-high.
- Mai tri and mai chattawa never sit over a harbor letter either, for the same reason as the temple: not used in standard spelling.

## retrieval which-tone-a
reveal: which-tone-a-answer
prompt: ตั๋ว (dtǔua, ticket) carries mai chattawa over ต. What tone does it give, and why does the answer not need the temple or harbor rows at all?

## reveal which-tone-a-answer
retrieval: which-tone-a
- Rising. ต is market class, and the market is the only district mai chattawa ever appears in — so there is only one row to check, and the other two districts never come up.

## retrieval which-tone-b
reveal: which-tone-b-answer
prompt: ล่าง (lâang, below) carries mai ek over ล, a harbor letter. The market's mai ek gives low tone. Does ล่าง come out low too?

## reveal which-tone-b-answer
retrieval: which-tone-b
- No. The harbor is the exception: its mai ek gives falling, not low. ล่าง is falling tone — the opposite of what the same mark gives the temple.

## rule tone-mark-placement
rule: tone-mark-placement

## rule mai-tri-chattawa-scope
rule: mai-tri-chattawa-middle-only

## exposition the-shape-of-the-table
heading: What makes eight cells memorable
- The market takes all four marks, each one a different tone: mai ek for low, mai tho for falling, mai tri for high, mai chattawa for rising.
- The temple and the harbor only ever take mai ek and mai tho — the other two marks belong to the market alone.
- And the harbor is the one that flips: the same two marks that give the temple low-then-falling give the harbor falling-then-high.
