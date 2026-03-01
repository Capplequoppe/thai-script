# Design: Replace `confirm()` with Modals + Add Settings to Nav

**Date:** 2026-03-01

## Problem

Two places in the app use the browser's native `confirm()` dialog for the "Reset All Progress" destructive action (`ProgressPage` and `SettingsPage`). Native browser dialogs are visually inconsistent with the app's design system and block the main thread. Additionally, `SettingsPage` exists but is unreachable — it has no entry in the navigation.

## Scope

- Replace both `confirm()` calls with a reusable modal dialog
- Add Settings to the bottom tab bar and desktop nav

## Solution

### New Component — `ConfirmDialog` molecule

**File:** `src/presentation/components/molecules/ConfirmDialog.tsx`

```tsx
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmLabel?: string;   // default: "Confirm"
  isDestructive?: boolean; // default: false
}
```

Composes the existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, and `Button` components. Footer has two buttons: Cancel (secondary) and Confirm (destructive variant when `isDestructive` is true).

### ProgressPage

- Add `resetOpen` boolean state
- Replace inline `confirm()` button with a button that opens the dialog
- Render `<ConfirmDialog>` at page bottom; `onConfirm` calls `data.reset()`, `refresh()`, `navigate("/")`

### SettingsPage

Same pattern as ProgressPage.

### Navigation

`BottomTabBar` gains a Settings tab:

```ts
{ to: "/settings", label: "Settings", icon: <GearIcon /> }
```

A gear SVG icon inline, matching the style of existing hand-crafted icons. Settings appears as the rightmost tab on mobile and as a nav link in the desktop header. The `/settings` route must be verified to exist in the router config.

## Trade-offs Considered

| Approach | Verdict |
|---|---|
| Reusable `ConfirmDialog` molecule | ✅ Chosen — zero new deps, DRY, fits atomic design |
| Inline dialogs per page | ❌ Duplicates ~30 lines JSX across two pages |
| `@radix-ui/react-alert-dialog` | ❌ New dependency, overkill for scope |

## Files to Touch

| File | Change |
|---|---|
| `src/presentation/components/molecules/ConfirmDialog.tsx` | **Create** |
| `src/presentation/pages/ProgressPage.tsx` | Replace `confirm()` with `ConfirmDialog` |
| `src/presentation/pages/SettingsPage.tsx` | Replace `confirm()` with `ConfirmDialog` |
| `src/presentation/components/layout/BottomTabBar.tsx` | Add Settings tab + GearIcon |
| Router config | Verify `/settings` route exists |
