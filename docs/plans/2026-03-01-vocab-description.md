# Vocabulary Description Field Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional `description` field to `VocabEntry` and render it in `WordCard` below the English heading.

**Architecture:** Pure display-only change — `description` lives on `VocabEntry` (the data type) and is rendered conditionally in `WordCard`. No card generation, SRS, or review flow is touched. Both surfaces that render `WordCard` (VocabularyPage intro and VocabListPage detail) pick it up automatically.

**Tech Stack:** TypeScript, React, Vitest, pnpm, Biome

---

### Task 1: Add `description` to `VocabEntry`

**Files:**
- Modify: `src/domain/vocabulary/types.ts:27-49`
- Test: `src/domain/vocabulary/services/VocabCardGenerator.test.ts`

**Context:** `VocabEntry` is the domain type for a vocabulary word. It lives in `types.ts`. The generator tests already define `VocabEntry` fixtures — add one with a description to prove the field is accepted by TypeScript.

**Step 1: Write the failing test**

In `src/domain/vocabulary/services/VocabCardGenerator.test.ts`, after the existing `testWordWithTones` fixture (around line 41), add:

```ts
const testWordWithDescription: VocabEntry = {
	...testWord,
	description: "A versatile preposition meaning \"at\", \"in\", \"on\", or \"of\". Also used as a relative clause marker and nominalizer.",
};
```

Then add a test in the existing `describe` block:

```ts
it("generates cards for word with description (description is ignored by generator)", () => {
	const cards = generateVocabCards(testWordWithDescription, allWords);
	expect(cards.length).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/domain/vocabulary/services/VocabCardGenerator.test.ts
```

Expected: TypeScript error — `description` does not exist on `VocabEntry`.

**Step 3: Add `description` to `VocabEntry`**

In `src/domain/vocabulary/types.ts`, add `description` after `mnemonic`:

```ts
export interface VocabEntry {
	thai: string;
	romanization: string;
	word_class: string;
	english: string;
	rank: number | null;
	frequency: number;
	mnemonic: string | null;
	description?: string | null;   // ← add this line
	characters: string[];
	syllables: SyllableInfo[];
	toneRules: string[];
	thai_audio_file: string | null;
	english_audio_file: string | null;
	image_file: string | null;
	samples: Array<{
		thai: string;
		romanization: string;
		english: string;
		thai_audio_file: string | null;
		english_audio_file: string | null;
	}>;
	source: string;
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/domain/vocabulary/services/VocabCardGenerator.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/domain/vocabulary/types.ts src/domain/vocabulary/services/VocabCardGenerator.test.ts
git commit -m "feat(vocab): add optional description field to VocabEntry"
```

---

### Task 2: Render description in WordCard

**Files:**
- Modify: `src/presentation/components/organisms/WordCard.tsx:96-114`

**Context:** `WordCard` renders the full word view. The hero section (lines ~85–115) shows: Thai text, audio button, `english` heading, `romanization`, `word_class` badge. Add `description` as a paragraph after the `word_class` badge.

Current hero section (simplified):
```tsx
<span className="thai text-[72px] leading-none">{word.thai}</span>
{word.thai_audio_file && <PlayAudioButton ... />}
<p className="text-2xl font-semibold mt-2">{word.english}</p>
<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{word.romanization}</p>
{word.word_class && <span ...>{word.word_class}</span>}
```

**Step 1: No unit test needed** — `WordCard` has no existing component tests. TypeScript compilation and `pnpm vitest run` (no regressions) serve as verification.

**Step 2: Add description rendering**

In `src/presentation/components/organisms/WordCard.tsx`, after the `word_class` badge block (after the closing `}`  of `{word.word_class && (...)}`, before the closing `</div>` of the hero section):

```tsx
{word.description && (
    <p
        className="text-sm mt-3 text-center"
        style={{ color: "var(--color-text-muted)" }}
    >
        {word.description}
    </p>
)}
```

The full hero section after the change (lines ~85–116):

```tsx
{/* 1. Hero — Image + Word + Audio */}
<div className="text-center">
    {word.image_file && (
        <div className="flex justify-center mb-4">
            <img
                src={word.image_file}
                alt={word.english}
                className="rounded-xl object-contain max-h-64 w-full"
                style={{ background: "var(--color-surface-2)" }}
            />
        </div>
    )}
    <span className="thai text-[72px] leading-none">{word.thai}</span>
    {word.thai_audio_file && (
        <PlayAudioButton audioUrl={word.thai_audio_file} />
    )}
    <p className="text-2xl font-semibold mt-2">{word.english}</p>
    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        {word.romanization}
    </p>
    {word.word_class && (
        <span
            className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold"
            style={{
                background: "var(--color-surface-2)",
                color: "var(--color-text-muted)",
            }}
        >
            {word.word_class}
        </span>
    )}
    {word.description && (
        <p
            className="text-sm mt-3 text-center"
            style={{ color: "var(--color-text-muted)" }}
        >
            {word.description}
        </p>
    )}
</div>
```

**Step 3: Run full test suite and type check**

```bash
pnpm vitest run
pnpm tsc --noEmit
```

Expected: all tests pass, no TypeScript errors.

**Step 4: Commit**

```bash
git add src/presentation/components/organisms/WordCard.tsx
git commit -m "feat(vocab): render description in WordCard hero section"
```

---

### Task 3: Add a sample description to vocabulary.json

**Files:**
- Modify: `src/domain/vocabulary/data/vocabulary.json` (first entry, rank 1: `ที่`)

**Context:** Smoke-test the field end-to-end by adding a description to the first word. This lets you visually verify the display before populating more words.

**Step 1: Add description to rank-1 entry**

In `src/domain/vocabulary/data/vocabulary.json`, find the `ที่` entry (rank 1) and add the `description` field after `mnemonic`:

```json
"mnemonic": "There is no better place...",
"description": "A highly versatile word with several roles. As a preposition it marks location (at, in, on, of). As a relative clause marker it connects a noun to a describing phrase, similar to \"that\" or \"which\" in English. It can also nominalize verbs or adjectives, turning them into noun phrases.",
```

**Step 2: Run full test suite**

```bash
pnpm vitest run
pnpm tsc --noEmit
```

Expected: all tests pass (JSON is consumed at runtime, TypeScript validates the interface).

**Step 3: Commit**

```bash
git add src/domain/vocabulary/data/vocabulary.json
git commit -m "feat(vocab): add description to ที่ as smoke-test entry"
```
