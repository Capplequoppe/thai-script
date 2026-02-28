# Atomic Design Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the presentation layer into atomic design layers (atoms / molecules / organisms / layout) while simultaneously fixing all broken Thai Royal color token usage introduced during the color palette refactor.

**Architecture:** Bottom-up extraction — create shared atomic primitives first, compose them into molecules, rewrite affected organisms to consume the new primitives with correct tokens, then move all component files into their new layer folders and update every import.

**Tech Stack:** React + TypeScript, Tailwind v4, `var(--color-*)` design tokens, Biome for lint/format, Vitest for tests.

---

## Verification command (run after each task)

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/ && pnpm vitest run
```

Expected: 0 TypeScript errors, 0 Biome errors, 430 tests pass.

---

## Phase 1 — Atoms

### Task 1: PlayAudioButton atom

**Files:**
- Create: `src/presentation/components/atoms/PlayAudioButton.tsx`

**Step 1: Create the file**

```tsx
interface Props {
	audioUrl: string;
	className?: string;
}

export function PlayAudioButton({ audioUrl, className }: Props) {
	return (
		<button
			type="button"
			onClick={() => new Audio(audioUrl).play()}
			className={`inline-flex items-center justify-center rounded-full transition-colors ${className ?? "w-10 h-10"}`}
			style={{
				background: "var(--color-surface-2)",
				color: "var(--color-text-muted)",
			}}
			aria-label="Play pronunciation"
		>
			🔊
		</button>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```
Expected: no errors (new file only, nothing imports it yet).

**Step 3: Commit**

```bash
git add src/presentation/components/atoms/PlayAudioButton.tsx
git commit -m "feat(atoms): add PlayAudioButton atom"
```

---

### Task 2: ThaiCharDisplay atom

This replaces the duplicated `<span className="thai …">{char}</span>` + audio button pattern found in `Flashcard`, `MultipleChoice`, and `SymbolCard`.

**Files:**
- Create: `src/presentation/components/atoms/ThaiCharDisplay.tsx`

**Step 1: Create the file**

```tsx
import { PlayAudioButton } from "./PlayAudioButton";

interface Props {
	character: string;
	/** Tailwind size class, e.g. "text-8xl" or "text-[10rem]" */
	className?: string;
	audioUrl?: string;
	hideAudio?: boolean;
}

export function ThaiCharDisplay({
	character,
	className,
	audioUrl,
	hideAudio,
}: Props) {
	return (
		<div className="flex items-center justify-center">
			<span
				className={`thai leading-none font-normal ${className ?? "text-8xl"}`}
			>
				{character}
			</span>
			{audioUrl && !hideAudio && (
				<PlayAudioButton audioUrl={audioUrl} className="ml-3 w-10 h-10" />
			)}
		</div>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/atoms/ThaiCharDisplay.tsx
git commit -m "feat(atoms): add ThaiCharDisplay atom"
```

---

### Task 3: StageDot atom

Extracted from `Flashcard.tsx` — the small colored dot that shows SRS stage.

**Files:**
- Create: `src/presentation/components/atoms/StageDot.tsx`

**Step 1: Create the file**

```tsx
const COLORS: Record<string, string> = {
	Apprentice: "var(--color-apprentice)",
	Guru: "var(--color-guru)",
	Master: "var(--color-master)",
	Enlightened: "var(--color-enlightened)",
	Burned: "var(--color-burned)",
};

interface Props {
	stageName: string;
}

export function StageDot({ stageName }: Props) {
	return (
		<div
			className="w-3 h-3 rounded-full"
			style={{ background: COLORS[stageName] ?? "var(--color-border)" }}
			title={stageName}
		/>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/atoms/StageDot.tsx
git commit -m "feat(atoms): add StageDot atom"
```

---

### Task 4: SectionHeader atom

Turns the `.section-header` CSS class into a typed component, giving it a single source of truth.

**Files:**
- Create: `src/presentation/components/atoms/SectionHeader.tsx`

**Step 1: Create the file**

```tsx
import type { ReactNode } from "react";

interface Props {
	children: ReactNode;
	className?: string;
}

export function SectionHeader({ children, className }: Props) {
	return <div className={`section-header ${className ?? ""}`}>{children}</div>;
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/atoms/SectionHeader.tsx
git commit -m "feat(atoms): add SectionHeader atom"
```

---

### Task 5: ClassBadge atom (with token fix)

Extracted from `SymbolCard.tsx`. **Token fix:** replaces `bg-blue-100 text-blue-700` etc. with Thai Royal `var(--color-*)` tokens.

**Files:**
- Create: `src/presentation/components/atoms/ClassBadge.tsx`

**Step 1: Create the file**

```tsx
import type { CSSProperties } from "react";

const STYLES: Record<string, CSSProperties> = {
	low: {
		background:
			"color-mix(in srgb, var(--color-enlightened) 15%, var(--color-surface))",
		color: "var(--color-enlightened)",
	},
	mid: {
		background:
			"color-mix(in srgb, var(--color-master) 15%, var(--color-surface))",
		color: "var(--color-master)",
	},
	high: {
		background:
			"color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))",
		color: "var(--color-accent-h)",
	},
};

const FALLBACK_STYLE: CSSProperties = {
	background: "var(--color-surface-2)",
	color: "var(--color-text-muted)",
};

interface Props {
	classType: string;
}

export function ClassBadge({ classType }: Props) {
	return (
		<span
			className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
			style={STYLES[classType] ?? FALLBACK_STYLE}
		>
			{classType} class
		</span>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/atoms/ClassBadge.tsx
git commit -m "feat(atoms): add ClassBadge atom with Thai Royal tokens"
```

---

## Phase 2 — Molecules

### Task 6: SymbolInfoRow molecule

Extracted from the private `Row` component in `SymbolCard.tsx`. Also fixes token usage on the value text — callers pass a `valueStyle` for semantic coloring instead of raw Tailwind color classes.

**Files:**
- Create: `src/presentation/components/molecules/SymbolInfoRow.tsx`

**Step 1: Create the file**

```tsx
import type { CSSProperties, ReactNode } from "react";

interface Props {
	label: string;
	value: ReactNode;
	valueStyle?: CSSProperties;
}

export function SymbolInfoRow({ label, value, valueStyle }: Props) {
	return (
		<div
			className="flex justify-between items-center py-1.5 border-b last:border-0"
			style={{ borderColor: "var(--color-border)" }}
		>
			<span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
				{label}
			</span>
			<span className="text-sm font-medium" style={valueStyle}>
				{value}
			</span>
		</div>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/molecules/SymbolInfoRow.tsx
git commit -m "feat(molecules): add SymbolInfoRow molecule"
```

---

### Task 7: MnemonicBlock molecule

Extracted from `ConsonantCard` and `VowelCard` in `SymbolCard.tsx`.

**Files:**
- Create: `src/presentation/components/molecules/MnemonicBlock.tsx`

**Step 1: Create the file**

```tsx
interface Props {
	text: string;
}

export function MnemonicBlock({ text }: Props) {
	return (
		<div
			className="rounded-xl p-3"
			style={{
				background:
					"color-mix(in srgb, var(--color-accent) 15%, var(--color-surface))",
			}}
		>
			<p className="text-sm" style={{ color: "var(--color-text)" }}>
				💡 {text}
			</p>
		</div>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/molecules/MnemonicBlock.tsx
git commit -m "feat(molecules): add MnemonicBlock molecule"
```

---

### Task 8: AnswerOptionButton molecule

Extracted from `MultipleChoice.tsx`. Encapsulates the single answer choice button with all reveal/correct/wrong state logic.

**Files:**
- Create: `src/presentation/components/molecules/AnswerOptionButton.tsx`

**Step 1: Create the file**

```tsx
import type { CSSProperties } from "react";

const THAI_NUMERALS = ["๑", "๒", "๓", "๔"] as const;

interface Props {
	choice: string;
	index: number;
	isRevealed: boolean;
	isSelected: boolean;
	isCorrect: boolean;
	onClick: () => void;
}

export function AnswerOptionButton({
	choice,
	index,
	isRevealed,
	isSelected,
	isCorrect,
	onClick,
}: Props) {
	let style: CSSProperties = {
		background: "var(--color-surface)",
		borderColor: "var(--color-border)",
	};

	if (isRevealed) {
		if (isCorrect) {
			style = {
				background: "var(--color-accent)",
				color: "var(--color-text)",
				borderColor: "var(--color-accent)",
			};
		} else if (isSelected) {
			style = {
				background: "rgba(192, 57, 43, 0.12)",
				borderColor: "var(--color-danger)",
			};
		}
	}

	const hasThaiChar = /[\u0E00-\u0E7F]/.test(choice);

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={isRevealed}
			className="w-full flex flex-col items-center justify-center px-3 py-4 rounded-xl border transition-colors min-h-[5rem]"
			style={style}
		>
			<span
				className="flex items-center gap-2 text-sm mb-1"
				style={{ color: "var(--color-text-muted)" }}
			>
				<span className="text-base opacity-50 font-normal">
					{THAI_NUMERALS[index]}
				</span>
				{index + 1}
			</span>
			<span
				className={`text-center leading-tight ${hasThaiChar ? "thai text-5xl" : "text-base"}`}
			>
				{choice}
			</span>
		</button>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/molecules/AnswerOptionButton.tsx
git commit -m "feat(molecules): add AnswerOptionButton molecule"
```

---

### Task 9: StageBadge molecule

Extracted from `StagePromotionPanel.tsx`. Consolidates `STAGE_COLORS` + `STAGE_LABELS` + `<Badge>` into one place.

**Files:**
- Create: `src/presentation/components/molecules/StageBadge.tsx`

**Step 1: Create the file**

```tsx
import { Badge } from "@/presentation/components/ui/badge";

const STAGE_COLORS: Record<string, string> = {
	Apprentice: "var(--color-apprentice)",
	Guru: "var(--color-guru)",
	Master: "var(--color-master)",
	Enlightened: "var(--color-enlightened)",
	Burned: "var(--color-burned)",
};

const STAGE_LABELS: Record<string, string> = {
	Apprentice: "Apprentice",
	Guru: "Guru",
	Master: "Master",
	Enlightened: "Enlightened",
	Burned: "Burned ✸",
};

interface Props {
	stage: string;
	className?: string;
}

export function StageBadge({ stage, className }: Props) {
	return (
		<Badge
			className={className}
			style={{
				background: STAGE_COLORS[stage] ?? "var(--color-primary)",
				color: "white",
			}}
		>
			{STAGE_LABELS[stage] ?? stage}
		</Badge>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/presentation/components/molecules/StageBadge.tsx
git commit -m "feat(molecules): add StageBadge molecule"
```

---

## Phase 3 — Rewrite affected organisms (in-place)

Each file is updated in its current location to consume atoms/molecules and fix broken tokens. The actual file moves happen in Phase 4.

### Task 10: Update SymbolCard.tsx

Replaces the private `Row`, `ClassBadge`, and `PlayAudioButton` helpers with the new atoms/molecules. Also fixes `text-red-600` / `text-green-600` / `text-blue-600` / `text-orange-600` with token-based inline styles.

**Files:**
- Modify: `src/presentation/components/SymbolCard.tsx`

**Step 1: Rewrite the file**

```tsx
import type {
	ConsonantSummary,
	ToneMarkSummary,
	VowelSummary,
} from "../../domain/script/services/ScriptLessonService";
import { ClassBadge } from "./atoms/ClassBadge";
import { ThaiCharDisplay } from "./atoms/ThaiCharDisplay";
import { MnemonicBlock } from "./molecules/MnemonicBlock";
import { SymbolInfoRow } from "./molecules/SymbolInfoRow";

export function ConsonantCard({
	c,
	compact,
}: {
	c: ConsonantSummary;
	compact?: boolean;
}) {
	return (
		<div className="space-y-3">
			<div className="text-center">
				<ThaiCharDisplay
					character={c.character}
					className="text-[96px]"
					audioUrl={c.audioUrl}
				/>
				<h2 className="text-2xl font-semibold mt-2">{c.nameRomanized}</h2>
				<p className="thai text-lg" style={{ color: "var(--color-text-muted)" }}>
					{c.name}
				</p>
				<p className="text-sm italic" style={{ color: "var(--color-text-muted)" }}>
					"{c.nameMeaning}"
				</p>
			</div>

			<div
				className="rounded-xl p-4 space-y-0.5"
				style={{ background: "var(--color-surface-2)" }}
			>
				<div
					className="flex justify-between items-center py-1.5 border-b last:border-0"
					style={{ borderColor: "var(--color-border)" }}
				>
					<span
						className="text-xs"
						style={{ color: "var(--color-text-muted)" }}
					>
						Class
					</span>
					<ClassBadge classType={c.classType} />
				</div>
				<SymbolInfoRow label="Initial sound" value={c.initialSound} />
				<SymbolInfoRow label="Final sound" value={c.finalSound} />
				<SymbolInfoRow
					label="Ending type"
					value={c.hasDeadEnding ? "Dead" : "Live"}
					valueStyle={{
						color: c.hasDeadEnding
							? "var(--color-danger)"
							: "var(--color-master)",
					}}
				/>
				{c.isAspirated && <SymbolInfoRow label="Aspirated" value="Yes" />}
			</div>

			{!compact && c.mnemonic && <MnemonicBlock text={c.mnemonic} />}
		</div>
	);
}

export function VowelCard({
	v,
	compact,
}: {
	v: VowelSummary;
	compact?: boolean;
}) {
	return (
		<div className="space-y-3">
			<div className="text-center">
				<ThaiCharDisplay
					character={v.character}
					className="text-[96px]"
					audioUrl={v.audioUrl}
				/>
				<h2 className="text-2xl font-semibold mt-2">{v.name}</h2>
				<p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
					{v.sound}
				</p>
			</div>

			<div
				className="rounded-xl p-4 space-y-0.5"
				style={{ background: "var(--color-surface-2)" }}
			>
				<SymbolInfoRow
					label="Length"
					value={v.length}
					valueStyle={{
						color:
							v.length === "long"
								? "var(--color-enlightened)"
								: "var(--color-guru)",
					}}
				/>
				<SymbolInfoRow label="Position" value={v.position} />
			</div>

			{!compact && v.mnemonic && <MnemonicBlock text={v.mnemonic} />}
		</div>
	);
}

export function ToneMarkCard({ t }: { t: ToneMarkSummary }) {
	return (
		<div className="space-y-3">
			<div className="text-center">
				<ThaiCharDisplay
					character={t.character}
					className="text-[96px]"
					audioUrl={t.audioUrl}
				/>
				<h2 className="text-2xl font-semibold mt-2">{t.name}</h2>
			</div>

			<div
				className="rounded-xl p-4 space-y-0.5"
				style={{ background: "var(--color-surface-2)" }}
			>
				<SymbolInfoRow label="Mid class →" value={t.midClassTone} />
				{t.highClassTone && (
					<SymbolInfoRow label="High class →" value={t.highClassTone} />
				)}
				{t.lowClassTone && (
					<SymbolInfoRow label="Low class →" value={t.lowClassTone} />
				)}
			</div>
		</div>
	);
}

export function ToneRuleCard({ description }: { description: string }) {
	return (
		<div className="space-y-3">
			<div className="text-center py-4">
				<span className="text-6xl">📏</span>
				<h2 className="text-2xl font-semibold mt-4">Tone Rule</h2>
			</div>

			<div
				className="rounded-xl p-4"
				style={{
					background:
						"color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))",
				}}
			>
				<p className="text-sm" style={{ color: "var(--color-text)" }}>
					{description}
				</p>
			</div>
		</div>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/components/SymbolCard.tsx
```

**Step 3: Commit**

```bash
git add src/presentation/components/SymbolCard.tsx
git commit -m "refactor(organisms): update SymbolCard to use atoms/molecules, fix tokens"
```

---

### Task 11: Update MultipleChoice.tsx

Replaces the inline Thai char display with `ThaiCharDisplay` and the `choices.map` button with `AnswerOptionButton`.

**Files:**
- Modify: `src/presentation/components/MultipleChoice.tsx`

**Step 1: Rewrite the file**

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { ThaiCharDisplay } from "./atoms/ThaiCharDisplay";
import { AnswerOptionButton } from "./molecules/AnswerOptionButton";

interface QuizCardView {
	id: string;
	question: string;
	correctAnswer: string;
	choices: readonly string[];
	audioUrl?: string;
}

interface Props {
	card: QuizCardView;
	onAnswer: (correct: boolean, responseTimeMs: number) => void;
}

export function MultipleChoice({ card, onAnswer }: Props) {
	const [selected, setSelected] = useState<string | null>(null);
	const [revealed, setRevealed] = useState(false);
	const displayedAtRef = useRef(Date.now());

	const cardProperty =
		"property" in card ? (card as Record<string, unknown>).property : null;
	const isAudioRecognition = cardProperty === "audioRecognition";
	const hideAudioHint =
		cardProperty === "recognition" || cardProperty === "initialSound";
	const symbolChar =
		"symbolCharacter" in card
			? ((card as Record<string, unknown>).symbolCharacter as string)
			: "";
	const wordThai =
		"wordThai" in card
			? ((card as Record<string, unknown>).wordThai as string)
			: "";

	// biome-ignore lint/correctness/useExhaustiveDependencies: card.id resets state when the card changes
	useEffect(() => {
		setSelected(null);
		setRevealed(false);
		displayedAtRef.current = Date.now();
	}, [card.id]);

	useEffect(() => {
		if (isAudioRecognition && card.audioUrl) {
			new Audio(card.audioUrl).play();
		}
	}, [isAudioRecognition, card.audioUrl]);

	const handleSelect = useCallback(
		(choice: string) => {
			if (revealed) return;
			const elapsed = Date.now() - displayedAtRef.current;
			setSelected(choice);
			setRevealed(true);
			setTimeout(() => onAnswer(choice === card.correctAnswer, elapsed), 500);
		},
		[card.correctAnswer, onAnswer, revealed],
	);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (revealed) return;
			const idx = parseInt(e.key, 10) - 1;
			const choice = card.choices[idx];
			if (idx >= 0 && idx < card.choices.length && choice !== undefined) {
				handleSelect(choice);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [card.choices, handleSelect, revealed]);

	return (
		<div className="space-y-6">
			{isAudioRecognition && card.audioUrl ? (
				<div className="text-center">
					<button
						type="button"
						onClick={() => {
							if (card.audioUrl) new Audio(card.audioUrl).play();
						}}
						className="inline-flex items-center justify-center w-24 h-24 rounded-full transition-colors text-5xl"
						style={{
							background: "var(--color-surface-2)",
							color: "var(--color-primary)",
						}}
						aria-label="Replay pronunciation"
					>
						🔊
					</button>
				</div>
			) : symbolChar ? (
				<div
					className="text-center rounded-2xl py-6"
					style={{
						border: "2px solid var(--color-accent)",
						background: "var(--color-surface)",
					}}
				>
					<ThaiCharDisplay
						character={symbolChar}
						className="text-[10rem]"
						audioUrl={card.audioUrl}
						hideAudio={hideAudioHint}
					/>
				</div>
			) : wordThai ? (
				<div
					className="text-center rounded-2xl py-6"
					style={{
						border: "2px solid var(--color-accent)",
						background: "var(--color-surface)",
					}}
				>
					<ThaiCharDisplay
						character={wordThai}
						className="text-[7rem]"
						audioUrl={card.audioUrl}
					/>
				</div>
			) : null}

			<p
				className="text-center text-lg"
				style={{ color: "var(--color-text-muted)" }}
			>
				{card.question}
			</p>

			<div className="grid grid-cols-2 gap-3">
				{card.choices.map((choice, idx) => (
					<AnswerOptionButton
						key={choice}
						choice={choice}
						index={idx}
						isRevealed={revealed}
						isSelected={selected === choice}
						isCorrect={choice === card.correctAnswer}
						onClick={() => handleSelect(choice)}
					/>
				))}
			</div>
		</div>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/components/MultipleChoice.tsx
```

**Step 3: Commit**

```bash
git add src/presentation/components/MultipleChoice.tsx
git commit -m "refactor(organisms): update MultipleChoice to use atoms/molecules"
```

---

### Task 12: Rewrite Flashcard.tsx (token fixes + atoms)

**This is the main token fix task.** Replaces all `bg-gray-*`, `dark:*`, `bg-indigo-*`, `text-indigo-*` classes with Thai Royal tokens. Uses `ThaiCharDisplay` and `StageDot` atoms.

**Files:**
- Modify: `src/presentation/components/Flashcard.tsx`

**Step 1: Rewrite the file**

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import type { RecallRating } from "../../domain/shared/types";
import { SrsStage } from "../../domain/srs/value-objects/SrsStage";
import { StageDot } from "./atoms/StageDot";
import { ThaiCharDisplay } from "./atoms/ThaiCharDisplay";
import { RatingButtons } from "./RatingButtons";

interface SrsData {
	learningStep: number | null;
	interval: number;
}

interface QuizCardView {
	id: string;
	question: string;
	correctAnswer: string;
	choices: readonly string[];
	audioUrl?: string;
	srs?: SrsData;
}

interface Props {
	card: QuizCardView;
	onRate: (rating: RecallRating, responseTimeMs: number) => void;
}

export function Flashcard({ card, onRate }: Props) {
	const [revealed, setRevealed] = useState(false);
	const revealedAtRef = useRef(0);

	const cardProperty =
		"property" in card ? (card as Record<string, unknown>).property : null;
	const hideAudioHint =
		cardProperty === "recognition" || cardProperty === "initialSound";
	const symbolChar =
		"symbolCharacter" in card
			? ((card as Record<string, unknown>).symbolCharacter as string)
			: "";
	const wordThai =
		"wordThai" in card
			? ((card as Record<string, unknown>).wordThai as string)
			: "";

	const stage = card.srs
		? SrsStage.fromScheduleData(card.srs.learningStep, card.srs.interval)
		: null;

	useEffect(() => {
		setRevealed(false);
	}, []);

	const handleReveal = useCallback(() => {
		setRevealed(true);
		revealedAtRef.current = Date.now();
	}, []);

	const handleRate = useCallback(
		(rating: RecallRating) => {
			const elapsed = Date.now() - revealedAtRef.current;
			onRate(rating, elapsed);
		},
		[onRate],
	);

	useEffect(() => {
		if (revealed) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === " ") {
				e.preventDefault();
				handleReveal();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [revealed, handleReveal]);

	return (
		<div className="space-y-6">
			<div
				className="relative rounded-xl p-4"
				style={{
					border: "1px solid var(--color-border)",
					background: "var(--color-surface)",
				}}
			>
				{stage && (
					<div className="absolute top-3 right-3">
						<StageDot stageName={stage.name} />
					</div>
				)}

				{symbolChar ? (
					<div className="text-center">
						<ThaiCharDisplay
							character={symbolChar}
							className="text-8xl"
							audioUrl={card.audioUrl}
							hideAudio={hideAudioHint}
						/>
					</div>
				) : wordThai ? (
					<div className="text-center">
						<ThaiCharDisplay
							character={wordThai}
							className="text-6xl"
							audioUrl={card.audioUrl}
						/>
					</div>
				) : null}

				<p
					className="text-center text-lg"
					style={{ color: "var(--color-text-muted)" }}
				>
					{card.question}
				</p>
			</div>

			{!revealed ? (
				<button
					type="button"
					onClick={handleReveal}
					className="w-full py-4 rounded-xl text-lg font-semibold transition-colors"
					style={{
						background: "var(--color-surface-2)",
						color: "var(--color-text)",
					}}
				>
					Show Answer{" "}
					<span className="text-xs opacity-50 ml-1">(Space)</span>
				</button>
			) : (
				<div
					style={{ animation: "slideUp 0.25s ease-out" }}
					className="space-y-6"
				>
					<div
						className="text-center py-4 rounded-xl"
						style={{ background: "var(--color-surface-2)" }}
					>
						<p
							className="text-2xl font-bold"
							style={{ color: "var(--color-primary)" }}
						>
							{card.correctAnswer}
						</p>
					</div>
					<RatingButtons onRate={handleRate} />
				</div>
			)}
		</div>
	);
}
```

**Step 2: Verify — pay attention to zero Biome raw-color-class violations**

```bash
pnpm tsc --noEmit && pnpm biome check src/presentation/components/Flashcard.tsx
```

**Step 3: Commit**

```bash
git add src/presentation/components/Flashcard.tsx
git commit -m "refactor(organisms): rewrite Flashcard with correct tokens and atoms"
```

---

### Task 13: Update StagePromotionPanel.tsx

Replaces inline `STAGE_COLORS` + `STAGE_LABELS` with the new `StageBadge` molecule.

**Files:**
- Modify: `src/presentation/components/StagePromotionPanel.tsx`

**Step 1: Rewrite the file**

```tsx
import { SectionHeader } from "./atoms/SectionHeader";
import { StageBadge } from "./molecules/StageBadge";

export interface Promotion {
	cardQuestion: string;
	newStage: string;
}

interface Props {
	promotions: Promotion[];
}

export function StagePromotionPanel({ promotions }: Props) {
	if (promotions.length === 0) return null;

	return (
		<div
			className="rounded-2xl p-4"
			style={{
				background: "var(--color-surface)",
				border: "1px solid var(--color-accent)",
			}}
		>
			<SectionHeader className="mb-3">Stage Promotions</SectionHeader>
			<div className="space-y-2">
				{promotions.map((p) => (
					<div
						key={p.cardQuestion}
						className="flex items-center justify-between gap-4"
					>
						<span
							className="thai text-xl font-semibold truncate"
							style={{ color: "var(--color-text)" }}
						>
							{p.cardQuestion}
						</span>
						<StageBadge stage={p.newStage} className="flex-shrink-0" />
					</div>
				))}
			</div>
		</div>
	);
}
```

**Step 2: Verify**

```bash
pnpm tsc --noEmit && pnpm vitest run
```
Expected: 0 errors, 430 tests pass.

**Step 3: Commit**

```bash
git add src/presentation/components/StagePromotionPanel.tsx
git commit -m "refactor(organisms): update StagePromotionPanel to use StageBadge molecule"
```

---

## Phase 4 — Move components to their layer folders

**Note:** All moves follow the same pattern — create the `organisms/` or `layout/` directory (if it doesn't exist), copy the file to the new path, delete the old file, then immediately update all imports. Tasks are grouped to keep related imports together.

### Task 14: Create layer directories and move layout components

**Files:**
- Move: `src/presentation/components/Layout.tsx` → `src/presentation/components/layout/Layout.tsx`
- Move: `src/presentation/components/BottomTabBar.tsx` → `src/presentation/components/layout/BottomTabBar.tsx`
- Move: `src/presentation/components/HudStrip.tsx` → `src/presentation/components/layout/HudStrip.tsx`

**Step 1: Create directories and move files (bash)**

```bash
mkdir -p src/presentation/components/layout
mkdir -p src/presentation/components/organisms

# Move layout components (content is unchanged)
cp src/presentation/components/Layout.tsx src/presentation/components/layout/Layout.tsx
cp src/presentation/components/BottomTabBar.tsx src/presentation/components/layout/BottomTabBar.tsx
cp src/presentation/components/HudStrip.tsx src/presentation/components/layout/HudStrip.tsx

# Delete old files
rm src/presentation/components/Layout.tsx
rm src/presentation/components/BottomTabBar.tsx
rm src/presentation/components/HudStrip.tsx
```

**Step 2: Update internal import in `layout/Layout.tsx`**

`layout/Layout.tsx` imports `./BottomTabBar` and `./HudStrip`. Those are now in the same folder — no change needed. BUT `../hooks/useApp` path is correct from `layout/` (`../../hooks/useApp` would be wrong — check). `layout/Layout.tsx` is at `src/presentation/components/layout/Layout.tsx`. `useApp` is at `src/presentation/hooks/useApp.ts`. Relative path: `../../hooks/useApp`. Update it:

In `src/presentation/components/layout/Layout.tsx`, change:
```tsx
import { useApp } from "../hooks/useApp";
```
to:
```tsx
import { useApp } from "../../hooks/useApp";
```

**Step 3: Update `App.tsx`**

In `src/presentation/App.tsx`, change:
```tsx
import { Layout } from "./components/Layout";
```
to:
```tsx
import { Layout } from "./components/layout/Layout";
```

**Step 4: Verify**

```bash
pnpm tsc --noEmit
```
Expected: 0 errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(layout): move Layout, BottomTabBar, HudStrip to components/layout/"
```

---

### Task 15: Move organisms to organisms/ folder

Move all organism components. Their content was already updated in Phase 3.

**Files to move:**
- `Flashcard.tsx` → `organisms/Flashcard.tsx`
- `MultipleChoice.tsx` → `organisms/MultipleChoice.tsx`
- `SymbolCard.tsx` → `organisms/SymbolCard.tsx`
- `StagePromotionPanel.tsx` → `organisms/StagePromotionPanel.tsx`
- `LessonIntro.tsx` → `organisms/LessonIntro.tsx`
- `RatingButtons.tsx` → `organisms/RatingButtons.tsx`
- `WordCard.tsx` → `organisms/WordCard.tsx`
- `HeatmapWidget.tsx` → `organisms/HeatmapWidget.tsx`
- `LessonPath.tsx` → `organisms/LessonPath.tsx`
- `AchievementBadge.tsx` → `organisms/AchievementBadge.tsx`
- `NotificationBanner.tsx` → `organisms/NotificationBanner.tsx`

**Step 1: Move files (bash)**

```bash
ORGS="Flashcard MultipleChoice SymbolCard StagePromotionPanel LessonIntro RatingButtons WordCard HeatmapWidget LessonPath AchievementBadge NotificationBanner"
for name in $ORGS; do
  cp src/presentation/components/${name}.tsx src/presentation/components/organisms/${name}.tsx
  rm src/presentation/components/${name}.tsx
done
```

**Step 2: Fix intra-organism imports**

`organisms/Flashcard.tsx` imports `./RatingButtons` → now same folder, no change.
`organisms/LessonIntro.tsx` imports `./SymbolCard` → now same folder, no change.
`organisms/Flashcard.tsx`, `MultipleChoice.tsx`, `SymbolCard.tsx`, `StagePromotionPanel.tsx` import atoms/molecules at `./atoms/X` and `./molecules/X` → these paths are now **wrong** because the files moved one level deeper.

Update all atom/molecule imports inside the organism files that were rewritten in Phase 3:

In `organisms/Flashcard.tsx`, change:
- `from "./atoms/StageDot"` → `from "../atoms/StageDot"`
- `from "./atoms/ThaiCharDisplay"` → `from "../atoms/ThaiCharDisplay"`
- `from "./RatingButtons"` → `from "./RatingButtons"` *(same folder, unchanged)*

In `organisms/MultipleChoice.tsx`, change:
- `from "./atoms/ThaiCharDisplay"` → `from "../atoms/ThaiCharDisplay"`
- `from "./molecules/AnswerOptionButton"` → `from "../molecules/AnswerOptionButton"`

In `organisms/SymbolCard.tsx`, change:
- `from "./atoms/ClassBadge"` → `from "../atoms/ClassBadge"`
- `from "./atoms/ThaiCharDisplay"` → `from "../atoms/ThaiCharDisplay"`
- `from "./molecules/MnemonicBlock"` → `from "../molecules/MnemonicBlock"`
- `from "./molecules/SymbolInfoRow"` → `from "../molecules/SymbolInfoRow"`

In `organisms/StagePromotionPanel.tsx`, change:
- `from "./atoms/SectionHeader"` → `from "../atoms/SectionHeader"`
- `from "./molecules/StageBadge"` → `from "../molecules/StageBadge"`

**Step 3: Verify TypeScript compiles — it will catch any missed import**

```bash
pnpm tsc --noEmit
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(organisms): move all organism components to components/organisms/"
```

---

## Phase 5 — Update imports in pages

### Task 16: Update all page imports

Every page that imports from `../components/X` where `X` is now in `organisms/` needs updating.

**Files to modify:**

`src/presentation/pages/Dashboard.tsx` — change:
```tsx
import { AchievementBadge, ACHIEVEMENT_DEFS } from "../components/AchievementBadge";
import { HeatmapWidget } from "../components/HeatmapWidget";
import { NotificationBanner } from "../components/NotificationBanner";
```
to:
```tsx
import { AchievementBadge, ACHIEVEMENT_DEFS } from "../components/organisms/AchievementBadge";
import { HeatmapWidget } from "../components/organisms/HeatmapWidget";
import { NotificationBanner } from "../components/organisms/NotificationBanner";
```

`src/presentation/pages/ReviewPage.tsx` — change:
```tsx
import { AchievementBadge } from "../components/AchievementBadge";
import { Flashcard } from "../components/Flashcard";
import { MultipleChoice } from "../components/MultipleChoice";
import { StagePromotionPanel } from "../components/StagePromotionPanel";
import type { Promotion } from "../components/StagePromotionPanel";
```
to:
```tsx
import { AchievementBadge } from "../components/organisms/AchievementBadge";
import { Flashcard } from "../components/organisms/Flashcard";
import { MultipleChoice } from "../components/organisms/MultipleChoice";
import { StagePromotionPanel } from "../components/organisms/StagePromotionPanel";
import type { Promotion } from "../components/organisms/StagePromotionPanel";
```

`src/presentation/pages/LessonPage.tsx` — change:
```tsx
import { AchievementBadge } from "../components/AchievementBadge";
import { LessonIntro } from "../components/LessonIntro";
import { MultipleChoice } from "../components/MultipleChoice";
```
to:
```tsx
import { AchievementBadge } from "../components/organisms/AchievementBadge";
import { LessonIntro } from "../components/organisms/LessonIntro";
import { MultipleChoice } from "../components/organisms/MultipleChoice";
```

`src/presentation/pages/VocabularyPage.tsx` — change:
```tsx
import { AchievementBadge } from "../components/AchievementBadge";
import { Flashcard } from "../components/Flashcard";
import { MultipleChoice } from "../components/MultipleChoice";
import { WordCard } from "../components/WordCard";
```
to:
```tsx
import { AchievementBadge } from "../components/organisms/AchievementBadge";
import { Flashcard } from "../components/organisms/Flashcard";
import { MultipleChoice } from "../components/organisms/MultipleChoice";
import { WordCard } from "../components/organisms/WordCard";
```

`src/presentation/pages/GrammarPage.tsx` — change:
```tsx
import { AchievementBadge } from "../components/AchievementBadge";
import { Flashcard } from "../components/Flashcard";
import { MultipleChoice } from "../components/MultipleChoice";
```
to:
```tsx
import { AchievementBadge } from "../components/organisms/AchievementBadge";
import { Flashcard } from "../components/organisms/Flashcard";
import { MultipleChoice } from "../components/organisms/MultipleChoice";
```

`src/presentation/pages/ProgressPage.tsx` — change:
```tsx
import { AchievementBadge, ACHIEVEMENT_DEFS } from "../components/AchievementBadge";
import { HeatmapWidget } from "../components/HeatmapWidget";
import { LessonPath } from "../components/LessonPath";
```
to:
```tsx
import { AchievementBadge, ACHIEVEMENT_DEFS } from "../components/organisms/AchievementBadge";
import { HeatmapWidget } from "../components/organisms/HeatmapWidget";
import { LessonPath } from "../components/organisms/LessonPath";
```

`src/presentation/pages/LearnedItemsPage.tsx` — change:
```tsx
} from "../components/SymbolCard";
```
to:
```tsx
} from "../components/organisms/SymbolCard";
```

**Step 1: Apply all changes above to the 7 files listed**

**Step 2: Full verification**

```bash
pnpm tsc --noEmit && pnpm biome check src/ && pnpm vitest run
```
Expected: 0 TS errors, 0 Biome errors, 430 tests pass.

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: update all page imports to use atomic design folder structure"
```

---

## Phase 6 — Final verification

### Task 17: Full sweep

**Step 1: Confirm no raw color classes remain in any non-ui component**

```bash
grep -r "bg-gray-\|bg-indigo-\|text-gray-\|text-indigo-\|bg-blue-\|text-blue-\|bg-green-\|text-green-\|bg-purple-\|text-purple-\|dark:" \
  src/presentation/components/atoms/ \
  src/presentation/components/molecules/ \
  src/presentation/components/organisms/ \
  src/presentation/components/layout/ \
  2>/dev/null
```
Expected: **no output** (zero matches).

**Step 2: Run full test and lint suite**

```bash
pnpm tsc --noEmit && pnpm biome check src/ && pnpm vitest run
```
Expected: 0 errors, 430 tests pass.

**Step 3: Final commit**

```bash
git add -A
git commit -m "refactor(ui): complete atomic design restructure + Thai Royal token cleanup"
```
