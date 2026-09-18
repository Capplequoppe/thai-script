# The vowel house — a draft

How to teach thirty vowels the way lessons 1 and 2 teach consonants, given
that the consonant recipe cannot transfer unchanged.

Draft. Nothing here is built. The data model underneath it — `vowelParts.ts`,
`vowelAnalogies.ts` — is built and tested; this is the story that sits on top.

---

## Why the consonant recipe does not transfer

Lessons 1 and 2 use one recipe, and it works because of a gift the alphabet
gives for free:

> something happens to a person, and it matters; the letter's **sound** comes
> out of that event; the letter's **word** is the thing at the centre of it;
> and it ends with an object left behind, so the letter has an address.

The third beat is the load-bearing one. `ม` is not a shape — it is **ม้า**, a
horse, and a horse can be ridden into the sea. Every consonant arrives with a
noun attached, because that is how Thai names its letters.

**Vowels have no noun.** `สระอา` is "vowel aa". There is no horse. Writing
thirty stories would mean inventing thirty nouns out of nothing but a sound,
and invented nouns are exactly the weak mnemonics we already found once, when
the old symbol cards described shapes nobody could picture.

So the recipe changes at that beat, and only that beat.

## Nine voices

Thirty vowels are **nineteen parts** placed around the consonant:

```
[ front ]   CONSONANT   [ above / below ]   [ back ]
```

A part gets a lodger, and **the lodger's name starts with the sound the part
makes — as the name is said, not as it is spelled.** Recalling the person
recalls the vowel, with nothing to look up in between.

One rule keeps the cast small: **a name is a sound, not a shape.** Length is a
state a lodger is in, never a second person. Ivar short and Ivar long are Ivar.

That leaves **nine voices**:

| voice | parts | sound |
|---|---|---|
| **Erik** | `เ` `เ-ะ` | *e* |
| **Ängla** | `แ` `แ-ะ` | *ä* |
| **Åke** | `โ` `โ-ะ` | *å* |
| **Aina / Aino** | `ไ` `ใ` | *aj* |
| **Ivar** | `ิ` `ี` | *i* |
| **Urban** | `ึ` `ื` | Swedish *u* |
| **Ove** | `ุ` `ู` | *oo* |
| **Amanda** | `ำ` | *am* |
| **Arnold** | `า` `ะ` `ั` `็` | *a* |

Ten names for nine voices, because Aina and Aino share one — the only place two
people sound alike, and there is a reason for it below.

Add the three consonants that moonlight as vowel parts — `อ` the basin, `ว` the
ring, `ย` the giant — and every one of the nineteen parts is accounted for,
with nothing doubled and nothing left over.

## Two cheat codes do the work of twenty mnemonics

Most of the thirty need no mnemonic at all, because two rules cover them.

**At the back and on the steps, Arnold tells you it is short.** `เ-ะ` is Erik
with Arnold behind him. `แ-ะ`, `โ-ะ`, `เ-าะ` — same. Nine vowels, and not a
story each: a voice you already know, with Arnold at the end.

**On the roof and in the cellar, the stroke tells you it is long.** Upstairs
and downstairs nobody announces length — the lodger simply reaches further. In
the cellar `ู` is `ุ` with a longer tail hanging down. On the roof the mark
stands a flag up:

|  | short | long |
|---|---|---|
| **Ivar** — *i* | `ิ` a bar | `ี` the bar with a flag up |
| **Urban** — Swedish *u* | `ึ` the bar with a circle | `ื` the circle **and** the flag |

Two marks, two meanings, and they compose. **The flag means long. The circle
means Urban rather than Ivar.** Four shapes for the price of two, and Urban's
pair is Ivar's pair with a circle added — so lesson 6 costs almost nothing.

Checked by rendering the glyphs in `Noto Serif Thai`, which is the face
`src/index.css` gives Thai text, so this is the shape a learner actually sees.
The circle is faint in low-contrast sans faces, where it can flatten into a
tick — worth knowing before anyone changes the font.

Between them that is most of the alphabet, and what is left is a short list of
genuine exceptions that each earn a story:

| exception | why it needs one |
|---|---|
| `ั` `็` | short, but no `ะ` in sight — Arnold's climb |
| `ำ` | short, and brings its own ending — Amanda |
| `ไ` `ใ` | short with no long form at all — the couple |
| `เ-า` | short, and spelled like a compound — one scene |

Four of the thirty need a story of their own, plus Arnold's two marks. **Teach
those, and let the two rules carry the other twenty-six.**

## Arnold, who is the first cheat code

`า` is long *a*, and it is Arnold with his full name — **Arnold**, as it is
said. `ะ` is the same person cut short.

That shape then does one more job, and it is the same job: **wherever `ะ`
turns up, that is the end of it.** Attached to Erik or Åke it does not change
their sound, it cuts it off. Nine of nine carry it and are short, with no
counterexamples — so the rule is worth stating in the direction it runs:

> **Seeing `ะ` tells you the vowel is short. Not seeing it tells you nothing.**

And then the piece that usually arrives as an unexplained extra mark:

> **When the back yard is occupied, Arnold climbs onto the roof.**

`กะ` has nothing after the vowel, so Arnold stands at the back. `กัน` has a
final consonant standing there already, so he goes up and leaves his mark on
the roof instead: `ั`. Same short *a*, same person, different seat. Mai han
akat stops being a new symbol and becomes a consequence.

`็` is the same token for the front-steps family — `เก็ง`, `แข็ง`. Erik's
visit, cut short, with the back yard occupied.

So the silent marks are **not characters**. They are what a character leaves
behind when he cannot stand where he usually stands. That keeps the rule clean:
if it has a name, it has a sound.

## Amanda brings her own ending

`ำ` is one character carrying two sounds — `สระ อะ` plus a final `ม`. Her name
says so: **Am**anda, and the *m* is already in it before she has finished
introducing herself.

That *m* is not decoration. A syllable ending in `ม` is **live**, so a syllable
written with `ำ` is always live, whatever else is in it — which feeds straight
into the tone rules lesson 1 already starts. Most vowels leave the live-or-dead
question to whatever comes after them. Amanda answers it herself.

## Aina and Aino are never in the room together

They are the one exception to a name being a sound, and they earn it: `ไ` and
`ใ` are not a length pair, they are two spellings of one short sound with
nothing in the shape to tell you which a word takes.

So they are a couple with one voice, and only ever one of them turns up. There
is no word where both appear, and none where it is a choice — the spelling
decides who answers the door, and they sound identical.

That makes the twenty `ใ` words **a guest list** rather than an exception list:
the twenty houses where Aino is the one who comes. A set of specific words with
a person attached is an easier thing to learn than an irregularity.

## The two U families

Both of these get called "u" in every transliteration, which is why beginners
flatten them into one sound and stay flattened:

| | written | who | sound |
|---|---|---|---|
| **roof** | `ึ` `ื` | **Urban** | Swedish *u* — *hus*, *ut*; English has nothing |
| **cellar** | `ุ` `ู` | **Ove** | *oo* — English *boot*, Swedish *bok* |

The house sorts them by floor: **the U you have to learn lives upstairs; the U
you already own lives downstairs.** One name each rather than four, and the
contrast is sharper for it.

`symbols.ts` offers *"try making 'uu' with lips spread wide"* for `ึ` and
reaches for German *über* on `ื` — and *über* is the wrong vowel, front and
rounded where Thai is back and unrounded. Urban now starts from **hus, ut**
instead, with one correction: *say it with your lips unrounded.* A word the
learner already says, changed in one way, rather than a sound built from
scratch out of an instruction.

## The house

Consonants are placed by class, because class decides tone. Vowels have no
class — which is exactly why they never fitted the districts, and why the
answer is a building of their own.

**It stands where the three districts meet.** A vowel attaches to any
consonant regardless of class, so the house serves the temple, the market and
the harbour alike, and belongs to none of them. That placement is itself the
fact that vowels carry no class.

**They are lodgers, not residents.** A vowel never stands alone; it attaches
to a consonant. The metaphor carries the other thing beginners get wrong,
without a rule being stated.

**Where a vowel is written is where it lives:**

| written | room |
|---|---|
| before the consonant | the **front steps** |
| above | the **roof** |
| below | the **cellar** |
| after | the **back yard** |
| both sides | the **veranda** that wraps the house |
| roof and both sides | the **whole house** |

The page layout is the floor plan, so position is never a separate fact —
`positionFromParts` derives it and a test holds the two together.

## Compounds are scenes

A compound vowel is several lodgers in the room at once, and what you hear is
what they make together:

| vowel | who is in the room | the sound |
|---|---|---|
| `เ-อ` | Erik and the basin | **ö** — *Örjan* |
| `เ-ีย` | Erik, Ivar and the giant | *ia* — *Ian* |
| `เ-ือ` | Erik, Urban and the basin | Urban sliding into the basin |
| `-ัว` | Arnold's roof mark and the ring | *ua* |
| `เ-า` | Erik and Arnold, both at once | *ao*, and short |

The scene can carry a name of its own where the sound has one — Örjan, Ian —
and that name is what the learner recalls first. The cast in the scene is what
tells them how to write it. Twelve compounds, and no new parts in any of them.

`-ัว` is the wrinkle: the roof mark there is part of the *ua* spelling rather
than Arnold shortening anything. Worth saying plainly once instead of letting
a learner notice the exception on their own.

## The house is built room by room, in the order already taught

This is the part that makes it cheap. The curriculum already introduces vowels
in an order, and that order **is** a tour of the house — one arrival per
lesson:

| lesson | vowels | who arrives |
|---|---|---|
| 1 | `า` | **Arnold** takes the back yard — *plant the house in one line* |
| 3 | `ี` | **Ivar** goes up to the roof |
| 4 | `ะ` `ั` `ิ` | **Arnold cut short**, and his climb — the first cheat code |
| 5 | `ุ` `ู` | **Ove** moves into the cellar — the second cheat code |
| 6 | `ึ` `ื` | **Urban**, the U English cannot say |
| 7 | `เ` `เ-ะ` `็` | **Erik opens the front steps** — the big one |
| 8 | `แ` `แ-ะ` | **Ängla** stands beside him |
| 9 | `โ` `โ-ะ` | **Åke** |
| 10 | `เ-า` `ไ` `ใ` | **Aina and Aino** take turns |
| 11 | `อ` `เ-าะ` | the basin comes indoors |
| 12–14 | the compounds, `ำ` | **Amanda** in lesson 13, and everyone on stage |

No lesson has to carry the house alone. Each one opens the room it needs, and
lessons 8 and 9 cost almost nothing because Ängla and Åke arrive into a house
whose two rules are already standing.

**Lesson 1 already ships** and teaches `า` without any of this. It needs one
sentence, not a rewrite — it already says the vowel "always sits just after
the consonant it belongs to", which is the back yard in all but name.

## The three arrivals that carry real weight

Most lessons are one room and one lodger. Three set up the rules everything
else leans on.

**Lesson 4 — Arnold cut short.** The first cheat code, stated one way only,
and the climb that explains mai han akat.

**Lesson 5 — Ove in the cellar.** The first clean length pair, so the second
cheat code lands here: `ู` is `ุ` with a longer tail. Ivar arrived in lesson 3
with only his long form, so lesson 5 is where the pair makes the rule visible —
and lesson 6 then gets Urban for a circle.

**Lesson 7 — Erik opens the front steps.** The single most disorienting fact
in the script: **a vowel written before the consonant is spoken after it.** A
beginner reads left to right, says the vowel first, and everything after that
is wrong.

The story has to be about that and nothing else. Erik is already on the steps
holding the door when you arrive — you see him before anyone — and he does not
say a word until the consonant has gone inside. *Written first, spoken second.*
Everyone who arrives on the steps afterwards inherits the habit.

## What a single vowel's slide looks like

Same shape as a consonant's, with the noun beat replaced by the lodger:

> **`ี` sara ii — Ivar, long.**
> Sound: *ee* as in **green**.
> On the roof of the house, above the door. The short `ิ` is Ivar too, with
> less stroke — upstairs, length is in the stroke.
> *(then the glyph, large, on its own slide — then paper and a pen)*

And a short vowel marked with `ะ` needs no slide of its own at all. It is a
voice already introduced, with Arnold behind it.

The sound line takes a Swedish equivalent where Swedish is **better** than the
English gloss, which is six of the thirty (`vowelAnalogies.ts`):

| | English gloss | why it is worse | Swedish |
|---|---|---|---|
| `เ` | *EY in British grey* | a diphthong; it glides | **e** — *hel*, *ek* |
| `แ` | *A in cat* | a different vowel | **ä** — *äta*, *läsa* |
| `โ` | *O in go* | a diphthong; it glides | **å** — *båt*, *gå* |
| `ื` | *German über* | front and rounded; Thai is back and unrounded | **u** — *hus*, *ut* |
| `ู` | *OO in boot* | exact, but says nothing about Ove | **o** — *bok*, *sol* |
| `เ-อ` | *ER in her with relaxed throat* | a compromise, not a sound | **ö** — *öra*, *söt* |

The three glides are the quiet failure: *grey*, *go* and *cat* are close enough
to read past, so a learner copies them, glides where Thai holds steady, and
nothing in the lesson says otherwise. Swedish has all three as pure vowels.

`า`, `ี` and `อ` keep their English on purpose — *father*, *green* and *saw*
are exact, and a second way to say the same thing is one more thing to read.
Unmapped vowels get no guess.

## Open questions

**Does the house need pictures?** Nine lodgers and five rooms might need five
establishing shots and nothing more, with the lodgers drawn in them. Far less
rendering than thirty scenes, and it is the reason this scheme is affordable.

**Aino's guest list.** Twenty words, and the couple framing makes them worth
teaching rather than looking up — but twenty is still twenty, and they need
somewhere to live. Probably one later lesson rather than a drip.
