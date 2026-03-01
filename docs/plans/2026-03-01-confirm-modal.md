# Confirm Modal + Settings Nav Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all native `confirm()` dialogs with a reusable `ConfirmDialog` modal component, and add a Settings link to the navigation.

**Architecture:** A new `ConfirmDialog` molecule wraps the existing Radix UI `Dialog` primitives already in the codebase. Each page that previously called `confirm()` now holds a boolean `open` state and renders `<ConfirmDialog>`. The `BottomTabBar` gains a fourth tab for `/settings` (the route already exists in `App.tsx:24`).

**Tech Stack:** React 18, TypeScript, Radix UI Dialog (`@/presentation/components/ui/dialog`), Tailwind CSS, pnpm, Vitest, Biome

---

## Task 1: Create `ConfirmDialog` molecule

**Files:**
- Create: `src/presentation/components/molecules/ConfirmDialog.tsx`

`ConfirmDialog` is a pure presentational component — no domain logic. No unit test is needed (no pure functions to test); manual verification is sufficient.

**Step 1: Create the component**

```tsx
// src/presentation/components/molecules/ConfirmDialog.tsx
import { Button } from "@/presentation/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/presentation/components/ui/dialog";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	onConfirm: () => void;
	confirmLabel?: string;
	isDestructive?: boolean;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	onConfirm,
	confirmLabel = "Confirm",
	isDestructive = false,
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						type="button"
						variant="secondary"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant={isDestructive ? "destructive" : "default"}
						onClick={() => {
							onConfirm();
							onOpenChange(false);
						}}
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
```

**Step 2: Run lint to verify no issues**

```bash
pnpm biome check src/presentation/components/molecules/ConfirmDialog.tsx
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/presentation/components/molecules/ConfirmDialog.tsx
git commit -m "feat: add ConfirmDialog molecule"
```

---

## Task 2: Replace `confirm()` in `ProgressPage`

**Files:**
- Modify: `src/presentation/pages/ProgressPage.tsx`

**Step 1: Add `useState` import and `resetOpen` state**

At the top of `ProgressPage.tsx`, add `useState` to the React import (it's not imported yet — check line 1; `useNavigate` and others are imported but not `useState`).

Add to imports:
```tsx
import { useState } from "react";
import { ConfirmDialog } from "../components/molecules/ConfirmDialog";
```

Add inside the component body (after the existing `const` declarations):
```tsx
const [resetOpen, setResetOpen] = useState(false);
```

**Step 2: Replace the `confirm()` button**

Find the reset button block (lines 243–258):
```tsx
<button
  type="button"
  onClick={() => {
    if (confirm("This will erase all progress. Are you sure?")) {
      data.reset()
      refresh()
      navigate("/")
    }
  }}
  className="text-sm"
  style={{ color: "var(--color-danger)" }}
>
  Reset All Progress
</button>
```

Replace with:
```tsx
<button
  type="button"
  onClick={() => setResetOpen(true)}
  className="text-sm"
  style={{ color: "var(--color-danger)" }}
>
  Reset All Progress
</button>
```

**Step 3: Add `ConfirmDialog` to the JSX**

Add inside the outermost `<div>`, after the reset section:
```tsx
<ConfirmDialog
  open={resetOpen}
  onOpenChange={setResetOpen}
  title="Reset All Progress"
  description="This will erase all progress. This action cannot be undone."
  confirmLabel="Reset"
  isDestructive
  onConfirm={() => {
    data.reset();
    refresh();
    navigate("/");
  }}
/>
```

**Step 4: Run lint**

```bash
pnpm biome check src/presentation/pages/ProgressPage.tsx
```

Expected: No errors.

**Step 5: Commit**

```bash
git add src/presentation/pages/ProgressPage.tsx
git commit -m "feat: replace confirm() with ConfirmDialog in ProgressPage"
```

---

## Task 3: Replace `confirm()` in `SettingsPage`

**Files:**
- Modify: `src/presentation/pages/SettingsPage.tsx`

**Step 1: Add `ConfirmDialog` import and `resetOpen` state**

Add to imports at top of `SettingsPage.tsx`:
```tsx
import { ConfirmDialog } from "../components/molecules/ConfirmDialog";
```

Add inside the component body (after the `importStatus` state):
```tsx
const [resetOpen, setResetOpen] = useState(false);
```

(`useState` is already imported on line 1.)

**Step 2: Replace the `confirm()` Button**

Find the destructive Button (lines 122–135):
```tsx
<Button
  type="button"
  variant="destructive"
  size="sm"
  onClick={() => {
    if (confirm("This will erase all progress. Are you sure?")) {
      data.reset();
      refresh();
      navigate("/");
    }
  }}
>
  Reset All Progress
</Button>
```

Replace with:
```tsx
<Button
  type="button"
  variant="destructive"
  size="sm"
  onClick={() => setResetOpen(true)}
>
  Reset All Progress
</Button>
```

**Step 3: Add `ConfirmDialog` to the JSX**

Add after the closing `</section>` of the Danger Zone section, before the outermost closing `</div>`:
```tsx
<ConfirmDialog
  open={resetOpen}
  onOpenChange={setResetOpen}
  title="Reset All Progress"
  description="This will erase all progress. This action cannot be undone."
  confirmLabel="Reset"
  isDestructive
  onConfirm={() => {
    data.reset();
    refresh();
    navigate("/");
  }}
/>
```

**Step 4: Run lint**

```bash
pnpm biome check src/presentation/pages/SettingsPage.tsx
```

Expected: No errors.

**Step 5: Commit**

```bash
git add src/presentation/pages/SettingsPage.tsx
git commit -m "feat: replace confirm() with ConfirmDialog in SettingsPage"
```

---

## Task 4: Add Settings tab to `BottomTabBar`

**Files:**
- Modify: `src/presentation/components/layout/BottomTabBar.tsx`

The `/settings` route already exists in `App.tsx:24`. The tab bar currently has three tabs: Home, Items, Progress.

**Step 1: Add a `GearIcon` component**

Add this function alongside the other icon functions at the top of `BottomTabBar.tsx` (after `PagodaIcon`):

```tsx
function GearIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className="w-6 h-6"
			aria-hidden="true"
		>
			<title>Settings</title>
			<path
				d="M12 15a3 3 0 100-6 3 3 0 000 6z"
				opacity="0.9"
			/>
			<path
				d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
				opacity="0.5"
			/>
		</svg>
	);
}
```

**Step 2: Add Settings to the `tabs` array**

In the `BottomTabBar` component body, find the `tabs` array and add the Settings entry:

```ts
const tabs = [
  { to: "/", end: true, label: "Home", icon: <LotusIcon />, badge: dueCount > 0 ? dueCount : undefined },
  { to: "/items", end: false, label: "Items", icon: <GemIcon /> },
  { to: "/progress", end: false, label: "Progress", icon: <PagodaIcon /> },
  { to: "/settings", end: false, label: "Settings", icon: <GearIcon /> },
];
```

**Step 3: Run lint**

```bash
pnpm biome check src/presentation/components/layout/BottomTabBar.tsx
```

Expected: No errors.

**Step 4: Run all tests to confirm nothing broken**

```bash
pnpm test --run
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/presentation/components/layout/BottomTabBar.tsx
git commit -m "feat: add Settings tab to BottomTabBar"
```

---

## Task 5: Manual verification

Start the dev server and verify:

```bash
pnpm dev
```

1. Navigate to **Progress** page → click "Reset All Progress" → modal appears with Cancel and red Reset button → Cancel dismisses → Reset executes and redirects to home
2. Navigate to **Settings** page (via new Settings tab) → click "Reset All Progress" → same modal behavior
3. On mobile viewport (DevTools), Settings appears as the rightmost bottom tab
4. On desktop viewport, Settings appears as a nav link in the header

---

## Task 6: Final lint + format pass

```bash
pnpm biome check --write src/presentation/components/molecules/ConfirmDialog.tsx src/presentation/pages/ProgressPage.tsx src/presentation/pages/SettingsPage.tsx src/presentation/components/layout/BottomTabBar.tsx
```

If any files were auto-fixed, stage and commit:

```bash
git add -p
git commit -m "style: biome format fixes"
```
