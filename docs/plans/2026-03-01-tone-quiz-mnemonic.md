# Tone Quiz & Mnemonic Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a tone-identification quiz card type and surface the mnemonic during both the intro and quiz phases of vocabulary learning.

**Architecture:** Domain types and card generator live in `src/domain/vocabulary/`; presentation components live in `src/presentation/components/organisms/`; routing changes go in `src/presentation/pages/VocabularyPage.tsx`. Each domain change is test-driven; UI components follow the existing organism pattern.

**Tech Stack:** TypeScript, React 18, Vitest (run via `pnpm vitest run`), Tailwind + CSS custom properties.

---

### Task 1: Extend VocabularyCard types

**Files:**
- Modify: `src/domain/vocabulary/types.ts`

**Step 1: Write failing test — verify `toneIdentification` is a valid property**

Open `src/domain/vocabulary/services/VocabCardGenerator.test.ts` and add at the top of the `describe` block:

```ts
it("toneIdentification is a recognised VocabProperty at compile time", () => {
  const prop: import("../types").VocabProperty = "toneIdentification";
  expect(prop).toBe("toneIdentification");
});
```

**Step 2: Run to verify it fails (type error)**

```bash
pnpm vitest run src/domain/vocabulary/services/VocabCardGenerator.test.ts
```

Expected: TypeScript compile error — `"toneIdentification"` is not assignable to `VocabProperty`.

**Step 3: Update types**

In `src/domain/vocabulary/types.ts`, change:

```ts
export type VocabProperty =
  | "thaiToEnglish"
  | "englishToThai"
  | "audioRecognition";

export interface VocabularyCard extends SrsCard {
  wordThai: string;
  property: VocabProperty;
}
```

to:

```ts
export type VocabProperty =
  | "thaiToEnglish"
  | "englishToThai"
  | "audioRecognition"
  | "toneIdentification";

export interface VocabularyCard extends SrsCard {
  wordThai: string;
  property: VocabProperty;
  mnemonic?: string | null;
  syllables?: { text: string; tone: string }[];
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/domain/vocabulary/services/VocabCardGenerator.test.ts
```

Expected: all tests pass (no type error on `toneIdentification`).

**Step 5: Commit**

```bash
git add src/domain/vocabulary/types.ts src/domain/vocabulary/services/VocabCardGenerator.test.ts
git commit -m "feat(vocab): add toneIdentification property and mnemonic/syllables to VocabularyCard"
```

---

### Task 2: Update VocabCard entity to carry mnemonic and syllables

**Files:**
- Modify: `src/domain/vocabulary/entities/VocabCard.ts`
- Modify: `src/domain/vocabulary/entities/VocabCard.test.ts`

**Step 1: Write failing tests**

Add to `src/domain/vocabulary/entities/VocabCard.test.ts`:

```ts
it("toDTO includes mnemonic when provided", () => {
  const card = new VocabCard(
    "id-1", "Q?", "A", ["A", "B"],
    SrsSchedule.initial(NOW),
    "คำ", "thaiToEnglish",
    undefined,
    "sounds like 'come'",
  );
  expect(card.toDTO().mnemonic).toBe("sounds like 'come'");
});

it("toDTO includes syllables when provided", () => {
  const syllables = [{ text: "คำ", tone: "mid" }];
  const card = new VocabCard(
    "id-1", "Q?", "A", [],
    SrsSchedule.initial(NOW),
    "คำ", "toneIdentification",
    undefined, undefined, syllables,
  );
  expect(card.toDTO().syllables).toEqual(syllables);
});

it("fromDTO roundtrips mnemonic and syllables", () => {
  const syllables = [{ text: "คำ", tone: "mid" }];
  const card = new VocabCard(
    "id-2", "Q?", "A", [],
    SrsSchedule.initial(NOW),
    "คำ", "toneIdentification",
    undefined, "tip", syllables,
  );
  const restored = VocabCard.fromDTO(card.toDTO());
  expect(restored.mnemonic).toBe("tip");
  expect(restored.syllables).toEqual(syllables);
});
```

**Step 2: Run to verify failure**

```bash
pnpm vitest run src/domain/vocabulary/entities/VocabCard.test.ts
```

Expected: FAIL — constructor doesn't accept mnemonic/syllables arguments.

**Step 3: Update VocabCard entity**

Replace `src/domain/vocabulary/entities/VocabCard.ts` with:

```ts
import type { CardPool } from "../../shared/CardPool";
import { ReviewableCard } from "../../srs/entities/ReviewableCard";
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";

export class VocabCard extends ReviewableCard {
  constructor(
    id: string,
    question: string,
    correctAnswer: string,
    choices: readonly string[],
    schedule: SrsSchedule,
    readonly wordThai: string,
    readonly property: string,
    audioUrl?: string,
    readonly mnemonic?: string | null,
    readonly syllables?: { text: string; tone: string }[],
  ) {
    super(id, question, correctAnswer, choices, schedule, audioUrl);
  }

  get pool(): CardPool {
    return "vocab";
  }

  toDTO() {
    return {
      id: this.id,
      question: this.question,
      correctAnswer: this.correctAnswer,
      choices: this.choices,
      srs: this.schedule.toDTO(),
      audioUrl: this.audioUrl,
      wordThai: this.wordThai,
      property: this.property,
      ...(this.mnemonic != null && { mnemonic: this.mnemonic }),
      ...(this.syllables != null && { syllables: this.syllables }),
    };
  }

  static fromDTO(dto: {
    id: string;
    question: string;
    correctAnswer: string;
    choices: readonly string[];
    srs: ReturnType<SrsSchedule["toDTO"]>;
    wordThai: string;
    property: string;
    audioUrl?: string;
    mnemonic?: string | null;
    syllables?: { text: string; tone: string }[];
  }): VocabCard {
    return new VocabCard(
      dto.id,
      dto.question,
      dto.correctAnswer,
      dto.choices,
      SrsSchedule.fromDTO(dto.srs),
      dto.wordThai,
      dto.property,
      dto.audioUrl,
      dto.mnemonic,
      dto.syllables,
    );
  }
}
```

**Step 4: Run all vocab entity tests**

```bash
pnpm vitest run src/domain/vocabulary/entities/VocabCard.test.ts
```

Expected: all tests pass including the new ones.

**Step 5: Commit**

```bash
git add src/domain/vocabulary/entities/VocabCard.ts src/domain/vocabulary/entities/VocabCard.test.ts
git commit -m "feat(vocab): extend VocabCard entity with mnemonic and syllables"
```

---

### Task 3: Update VocabCardGenerator to copy mnemonic and generate tone cards

**Files:**
- Modify: `src/domain/vocabulary/services/VocabCardGenerator.ts`
- Modify: `src/domain/vocabulary/services/VocabCardGenerator.test.ts`

**Step 1: Write failing tests**

Add to `src/domain/vocabulary/services/VocabCardGenerator.test.ts`:

```ts
const testWordWithMnemonic: VocabEntry = {
  ...testWord,
  mnemonic: "tea tree → falling tone",
};

const testWordWithTones: VocabEntry = {
  ...testWord,
  thai: "สวัสดี",
  english: "hello",
  syllables: [
    {
      text: "สวัส",
      initialConsonant: "ส",
      vowel: "วั",
      finalConsonant: "ส",
      toneMark: null,
      consonantClass: "high",
      syllableType: "dead",
      tone: "low",
    },
    {
      text: "ดี",
      initialConsonant: "ด",
      vowel: "ี",
      finalConsonant: null,
      toneMark: null,
      consonantClass: "mid",
      syllableType: "live",
      tone: "mid",
    },
  ],
};

it("all card types carry mnemonic from source word", () => {
  const cards = generateVocabCards(testWordWithMnemonic, allWords);
  for (const card of cards) {
    expect(card.mnemonic).toBe("tea tree → falling tone");
  }
});

it("produces a toneIdentification card when syllables have tones", () => {
  const cards = generateVocabCards(testWordWithTones, [testWordWithTones]);
  const toneCard = cards.find((c) => c.property === "toneIdentification");
  expect(toneCard).toBeDefined();
  expect(toneCard?.id).toBe("vocab:สวัสดี:toneIdentification");
  expect(toneCard?.correctAnswer).toBe("low|mid");
  expect(toneCard?.syllables).toEqual([
    { text: "สวัส", tone: "low" },
    { text: "ดี", tone: "mid" },
  ]);
});

it("does not produce a toneIdentification card when no syllable tones", () => {
  const cards = generateVocabCards(testWord, allWords);
  const toneCard = cards.find((c) => c.property === "toneIdentification");
  expect(toneCard).toBeUndefined();
});
```

**Step 2: Run to verify failure**

```bash
pnpm vitest run src/domain/vocabulary/services/VocabCardGenerator.test.ts
```

Expected: FAIL — mnemonic not copied, tone cards not generated.

**Step 3: Update VocabCardGenerator**

Replace `src/domain/vocabulary/services/VocabCardGenerator.ts` with:

```ts
import { SrsSchedule } from "../../srs/value-objects/SrsSchedule";
import type { VocabEntry, VocabularyCard } from "../types";

function pickChoices(correct: string, pool: string[], count = 4): string[] {
  const distractors = pool.filter((item) => item !== correct);
  const needed = Math.min(count - 1, distractors.length);

  const copy = [...distractors];
  for (let i = copy.length - 1; i > copy.length - 1 - needed && i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as string, copy[i] as string];
  }
  const picked = copy.slice(copy.length - needed);

  const choices = [...picked, correct];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j] as string, choices[i] as string];
  }
  return choices;
}

export function generateVocabCards(
  word: VocabEntry,
  allWords: VocabEntry[],
): VocabularyCard[] {
  const thaiPool = allWords.map((w) => w.thai);
  const englishPool = allWords.map((w) => w.english);

  const cards: VocabularyCard[] = [];

  // Thai -> English
  cards.push({
    id: `vocab:${word.thai}:thaiToEnglish`,
    wordThai: word.thai,
    property: "thaiToEnglish",
    question: "What does this word mean?",
    correctAnswer: word.english,
    choices: pickChoices(word.english, englishPool),
    mnemonic: word.mnemonic,
    srs: SrsSchedule.initial().toDTO(),
  });

  // English -> Thai
  cards.push({
    id: `vocab:${word.thai}:englishToThai`,
    wordThai: word.thai,
    property: "englishToThai",
    question: `Which Thai word means "${word.english}"?`,
    correctAnswer: word.thai,
    choices: pickChoices(word.thai, thaiPool),
    mnemonic: word.mnemonic,
    srs: SrsSchedule.initial().toDTO(),
  });

  // Audio recognition (only if audio exists)
  if (word.thai_audio_file) {
    cards.push({
      id: `vocab:${word.thai}:audioRecognition`,
      wordThai: word.thai,
      property: "audioRecognition",
      question: "Listen to the audio. Which word is this?",
      correctAnswer: word.thai,
      choices: pickChoices(word.thai, thaiPool),
      mnemonic: word.mnemonic,
      srs: SrsSchedule.initial().toDTO(),
      audioUrl: word.thai_audio_file,
    });
  }

  // Tone identification (only if at least one syllable has a tone)
  const toneSyllables = word.syllables
    .filter((s) => s.tone)
    .map((s) => ({ text: s.text, tone: s.tone as string }));

  if (toneSyllables.length > 0) {
    cards.push({
      id: `vocab:${word.thai}:toneIdentification`,
      wordThai: word.thai,
      property: "toneIdentification",
      question: "What is the tone of each syllable?",
      correctAnswer: toneSyllables.map((s) => s.tone).join("|"),
      choices: [],
      mnemonic: word.mnemonic,
      syllables: toneSyllables,
      srs: SrsSchedule.initial().toDTO(),
    });
  }

  return cards;
}
```

**Step 4: Run all generator tests**

```bash
pnpm vitest run src/domain/vocabulary/services/VocabCardGenerator.test.ts
```

Expected: all tests pass including the existing count/content tests.

**Step 5: Run full test suite to check for regressions**

```bash
pnpm vitest run
```

Expected: all tests pass.

**Step 6: Commit**

```bash
git add src/domain/vocabulary/services/VocabCardGenerator.ts src/domain/vocabulary/services/VocabCardGenerator.test.ts
git commit -m "feat(vocab): copy mnemonic to all cards; generate toneIdentification cards"
```

---

### Task 4: Reposition mnemonic in WordCard

**Files:**
- Modify: `src/presentation/components/organisms/WordCard.tsx`

> Note: This is a pure UI change. No domain tests. Verify visually or via the running dev server.

**Step 1: Locate the mnemonic block**

In `WordCard.tsx`, find section `{/* 4. Mnemonic */}` (near line 284).

Cut the entire mnemonic block:

```tsx
{/* 4. Mnemonic */}
{word.mnemonic && (
  <div
    className="rounded-xl p-3"
    style={{
      background:
        "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
    }}
  >
    <p className="text-sm" style={{ color: "var(--color-accent)" }}>
      💡 {word.mnemonic}
    </p>
  </div>
)}
```

**Step 2: Insert it as section 2 (after the hero `</div>`, before syllable breakdown)**

The hero section ends at `{/* 2. Syllable Breakdown */}`. Insert the mnemonic between those two blocks, with a "Memory tip" label for prominence:

```tsx
{/* 2. Mnemonic */}
{word.mnemonic && (
  <div
    className="rounded-xl p-4"
    style={{
      background:
        "color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))",
    }}
  >
    <p
      className="text-xs font-semibold mb-1"
      style={{ color: "var(--color-accent)" }}
    >
      Memory tip
    </p>
    <p className="text-sm" style={{ color: "var(--color-accent)" }}>
      💡 {word.mnemonic}
    </p>
  </div>
)}
```

**Step 3: Renumber the remaining comment headers**

- Old `{/* 2. Syllable Breakdown */}` → `{/* 3. Syllable Breakdown */}`
- Old `{/* 3. Example Sentences */}` → `{/* 4. Example Sentences */}`
- Remove old `{/* 4. Mnemonic */}` (already deleted).

**Step 4: Run full test suite to catch regressions**

```bash
pnpm vitest run
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add src/presentation/components/organisms/WordCard.tsx
git commit -m "feat(vocab): move mnemonic to position 2 in WordCard for immediate reinforcement"
```

---

### Task 5: Add mnemonic hint to MultipleChoice

**Files:**
- Modify: `src/presentation/components/organisms/MultipleChoice.tsx`

> UI-only change; no new unit tests required.

**Step 1: Add `mnemonicExpanded` prop to the interface**

In `MultipleChoice.tsx`, find:

```ts
interface Props {
  card: QuizCardView;
  onAnswer: (correct: boolean, responseTimeMs: number) => void;
}
```

Change to:

```ts
interface Props {
  card: QuizCardView;
  onAnswer: (correct: boolean, responseTimeMs: number) => void;
  mnemonicExpanded?: boolean;
}
```

**Step 2: Destructure the new prop and sniff mnemonic**

In `MultipleChoice` function signature:

```ts
export function MultipleChoice({ card, onAnswer, mnemonicExpanded = false }: Props) {
```

After the existing `const wordThai = ...` line, add:

```ts
const mnemonic =
  "mnemonic" in card
    ? ((card as Record<string, unknown>).mnemonic as string | null | undefined)
    : null;
```

Add a local state for the hint toggle (used when `mnemonicExpanded` is false):

```ts
const [hintVisible, setHintVisible] = useState(false);
```

Also reset `hintVisible` when the card changes — add to the existing `useEffect` that resets `selected`/`revealed`:

```ts
useEffect(() => {
  setSelected(null);
  setRevealed(false);
  setHintVisible(false);
  displayedAtRef.current = Date.now();
}, [card.id]);
```

**Step 3: Render the mnemonic panel between question `<p>` and answer grid `<div>`**

Between `</p>` (question) and `<div className="grid grid-cols-2 gap-3">`, insert:

```tsx
{mnemonic && (
  <div>
    {mnemonicExpanded ? (
      <div
        className="rounded-xl p-3"
        style={{
          background:
            "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
        }}
      >
        <p className="text-sm" style={{ color: "var(--color-accent)" }}>
          💡 {mnemonic}
        </p>
      </div>
    ) : (
      <div className="text-center">
        {hintVisible ? (
          <div
            className="rounded-xl p-3"
            style={{
              background:
                "color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))",
            }}
          >
            <p className="text-sm" style={{ color: "var(--color-accent)" }}>
              💡 {mnemonic}
            </p>
          </div>
        ) : (
          <button
            type="button"
            className="text-xs underline"
            style={{ color: "var(--color-text-muted)" }}
            onClick={() => setHintVisible(true)}
          >
            Show hint
          </button>
        )}
      </div>
    )}
  </div>
)}
```

**Step 4: Run full test suite**

```bash
pnpm vitest run
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add src/presentation/components/organisms/MultipleChoice.tsx
git commit -m "feat(vocab): add mnemonic hint to MultipleChoice; always-on for lessons, toggle for reviews"
```

---

### Task 6: Create ToneQuiz component

**Files:**
- Create: `src/presentation/components/organisms/ToneQuiz.tsx`

> Pure UI component; no unit tests (consistent with other organisms). Verify behaviour in browser.

**Step 1: Create the file**

Create `src/presentation/components/organisms/ToneQuiz.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import type { VocabularyCard } from "../../../domain/vocabulary/types";

const TONES = ["mid", "low", "high", "falling", "rising"] as const;
type Tone = (typeof TONES)[number];

interface ToneQuizProps {
  card: VocabularyCard;
  onAnswer: (correct: boolean, responseTimeMs: number) => void;
}

export function ToneQuiz({ card, onAnswer }: ToneQuizProps) {
  const syllables = card.syllables ?? [];
  const [selections, setSelections] = useState<(Tone | null)[]>(
    () => syllables.map(() => null),
  );
  const [revealed, setRevealed] = useState(false);
  const displayedAtRef = useRef(Date.now());

  // Reset on new card
  // biome-ignore lint/correctness/useExhaustiveDependencies: card.id resets state when card changes
  useEffect(() => {
    setSelections(syllables.map(() => null));
    setRevealed(false);
    displayedAtRef.current = Date.now();
  }, [card.id]);

  const allSelected = selections.every((s) => s !== null);
  const correctTones = card.correctAnswer.split("|");

  const handleSelect = useCallback(
    (syllableIdx: number, tone: Tone) => {
      if (revealed) return;
      setSelections((prev) => {
        const next = [...prev];
        next[syllableIdx] = tone;
        return next;
      });
    },
    [revealed],
  );

  const handleCheck = useCallback(() => {
    if (!allSelected || revealed) return;
    setRevealed(true);
    const elapsed = Date.now() - displayedAtRef.current;
    const allCorrect = selections.every(
      (sel, i) => sel === correctTones[i],
    );
    setTimeout(() => onAnswer(allCorrect, elapsed), 600);
  }, [allSelected, revealed, selections, correctTones, onAnswer]);

  return (
    <div className="space-y-6">
      {/* Word display */}
      <div
        className="text-center rounded-2xl py-6"
        style={{
          border: "2px solid var(--color-accent)",
          background: "var(--color-surface)",
        }}
      >
        <span
          className="thai leading-none font-normal"
          style={{ fontSize: "7rem" }}
        >
          {card.wordThai}
        </span>
      </div>

      <p
        className="text-center text-lg"
        style={{ color: "var(--color-text-muted)" }}
      >
        {card.question}
      </p>

      {/* Syllable rows */}
      <div className="space-y-4">
        {syllables.map((syl, i) => {
          const selected = selections[i];
          const isCorrect = revealed && selected === correctTones[i];
          const isWrong = revealed && selected !== correctTones[i];

          return (
            <div
              key={`${syl.text}-${i}`}
              className="rounded-xl p-4 space-y-2"
              style={{ background: "var(--color-surface-2)" }}
            >
              <div className="flex items-center justify-between">
                <span className="thai text-xl">{syl.text}</span>
                {revealed && (
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: isCorrect
                        ? "var(--color-master)"
                        : "var(--color-danger)",
                    }}
                  >
                    {isCorrect ? "✓" : `✗ → ${correctTones[i]}`}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {TONES.map((tone) => {
                  const isSelected = selected === tone;
                  const isToneCorrect =
                    revealed && tone === correctTones[i];
                  const isToneWrong =
                    revealed && isSelected && tone !== correctTones[i];

                  return (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => handleSelect(i, tone)}
                      disabled={revealed}
                      className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: isToneCorrect
                          ? "color-mix(in srgb, var(--color-master) 20%, var(--color-surface))"
                          : isToneWrong
                            ? "color-mix(in srgb, var(--color-danger) 20%, var(--color-surface))"
                            : isSelected
                              ? "var(--color-accent)"
                              : "var(--color-surface)",
                        color: isToneCorrect
                          ? "var(--color-master)"
                          : isToneWrong
                            ? "var(--color-danger)"
                            : isSelected
                              ? "var(--color-surface)"
                              : "var(--color-text-muted)",
                        border: isSelected
                          ? "2px solid transparent"
                          : "2px solid var(--color-border)",
                      }}
                    >
                      {tone}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Check button */}
      <Button
        type="button"
        className="w-full"
        disabled={!allSelected || revealed}
        onClick={handleCheck}
      >
        Check
      </Button>
    </div>
  );
}
```

**Step 2: Run full test suite to catch any import/type issues**

```bash
pnpm vitest run
```

Expected: all tests pass (new file is UI-only, no test file).

**Step 3: Commit**

```bash
git add src/presentation/components/organisms/ToneQuiz.tsx
git commit -m "feat(vocab): add ToneQuiz component for syllable tone identification"
```

---

### Task 7: Update VocabularyPage to route tone cards and pass mnemonicExpanded

**Files:**
- Modify: `src/presentation/pages/VocabularyPage.tsx`

> UI routing change; verify in browser.

**Step 1: Import ToneQuiz**

At the top of `VocabularyPage.tsx`, add:

```ts
import { ToneQuiz } from "../components/organisms/ToneQuiz";
```

**Step 2: Update the quiz phase block**

Find the quiz phase render (around line 407):

```tsx
<MultipleChoice card={currentVocabCard} onAnswer={flow.advance} />
```

Replace with:

```tsx
{currentVocabCard.property === "toneIdentification" ? (
  <ToneQuiz card={currentVocabCard} onAnswer={flow.advance} />
) : (
  <MultipleChoice card={currentVocabCard} onAnswer={flow.advance} mnemonicExpanded />
)}
```

**Step 3: Update the review phase block**

Find the review render (around line 524–528):

```tsx
{current.mode === "multipleChoice" ? (
  <MultipleChoice card={current.card} onAnswer={handleMcAnswer} />
) : (
  <Flashcard card={current.card} onRate={handleReviewAdvance} />
)}
```

Replace with:

```tsx
{current.card.property === "toneIdentification" ? (
  <ToneQuiz card={current.card} onAnswer={handleMcAnswer} />
) : current.mode === "multipleChoice" ? (
  <MultipleChoice card={current.card} onAnswer={handleMcAnswer} />
) : (
  <Flashcard card={current.card} onRate={handleReviewAdvance} />
)}
```

**Step 4: Run full test suite**

```bash
pnpm vitest run
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add src/presentation/pages/VocabularyPage.tsx
git commit -m "feat(vocab): route toneIdentification cards to ToneQuiz; pass mnemonicExpanded in lesson quiz"
```

---

### Task 8: Full regression check and persistence validation

**Step 1: Run complete test suite**

```bash
pnpm vitest run
```

Expected: all tests pass with zero failures.

**Step 2: Check for TypeScript errors**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

**Step 3: Check linting**

```bash
pnpm biome check src/
```

Expected: no errors.

**Step 4: Verify persistence contract**

The `StorageCardRepository` serialises/deserialises cards via `VocabCard.toDTO()` / `VocabCard.fromDTO()`. Run:

```bash
pnpm vitest run src/infrastructure/persistence/
```

Expected: all storage tests pass (mnemonic and syllables round-trip via the spread in `toDTO`).
