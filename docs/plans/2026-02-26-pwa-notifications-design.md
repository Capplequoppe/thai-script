# PWA + Scheduled Notifications Design

## Overview

Convert the Thai SRS app into a Progressive Web App with full offline support and scheduled review notifications. Notifications are client-side only (no server), triggered by `setTimeout` in the service worker with a recovery mechanism for missed timers.

## Approach

**Service Worker + `setTimeout` with wake-up recovery (Approach 3)**

- `setTimeout` in the service worker handles short-to-medium intervals
- On SW activation and fetch events, check if a notification was missed and show it immediately
- On app open, always recalculate and reschedule to the next earliest due date
- Accepts that very long delays (days without opening) may miss the exact time, but fires on next activation

## 1. PWA Manifest & Installability

- `public/manifest.json` with app name "Thai SRS", standalone display, start URL `/thai-script/`
- Icon set in `public/icons/` (192x192, 512x512)
- `<link rel="manifest">` in `index.html`

## 2. Service Worker — Offline Caching

- Use `vite-plugin-pwa` with `injectManifest` strategy (Workbox-based)
- Precache all app assets (JS, CSS, HTML) automatically from build output
- Runtime cache for dynamic assets (videos) with cache-first strategy
- Custom SW logic for notification scheduling

## 3. Notification System

### Permission Flow

- Dismissable banner on Dashboard prompts for notification permission
- Permission decision stored in localStorage to avoid re-prompting
- No notification logic runs if permission is denied

### NotificationScheduler Service

- `scheduleNext(nextReviewDate: Date, cardCount: number)` — sends message to SW
- `cancel()` — cancels pending notification timer
- Communicates with SW via `postMessage`:
  - App sends `{ type: 'SCHEDULE_NOTIFICATION', dueDate: string, cardCount: number }`
  - SW sets `setTimeout` and stores due date in IndexedDB
  - SW calls `self.registration.showNotification(...)` when timer fires

### Trigger Points

Reschedule on:
- App opens (`visibilitychange` to visible)
- Lesson completed
- Review completed

Each trigger: `reviewService.getNextReviewDate()` + `reviewService.getNumDueCards()` → send to SW

### Missed Notification Recovery

- On SW `activate` and `fetch` events, read stored `nextDueDate` from IndexedDB
- If past due, immediately show notification
- On app open, the app always recalculates and reschedules

### Notification Content

- Title: "Thai SRS"
- Body: "You have X cards due for review"
- Click action: opens `/thai-script/`

## 4. Data Flow

```
App opens / Lesson completes / Review completes
  -> AppContext calls notificationScheduler.scheduleNext(nextReviewDate, dueCount)
    -> postMessage to Service Worker
      -> SW stores dueDate in IndexedDB
      -> SW sets setTimeout for (dueDate - now)
      -> On timeout: showNotification("You have X cards due")

SW wakes up (activate/fetch)
  -> Reads dueDate from IndexedDB
  -> If past due -> showNotification immediately

User clicks notification
  -> Opens /thai-script/ -> App recalculates -> Reschedules
```

## 5. File Changes

### Modified Files

- `vite.config.ts` — Add `vite-plugin-pwa` plugin with `injectManifest` config
- `index.html` — Add `<link rel="manifest">`
- `src/AppContext.tsx` — Add notification scheduling calls on mount, lesson complete, review complete

### New Files

- `public/manifest.json` — PWA manifest
- `public/icons/icon-192x192.png` — App icon
- `public/icons/icon-512x512.png` — App icon
- `src/notification-scheduler.ts` — NotificationScheduler service
- `src/sw.ts` — Custom service worker (Workbox precaching + notification logic)
- `src/components/NotificationBanner.tsx` — Permission prompt banner

### Unchanged

- `src/srs.ts` — No changes
- `src/learning-service.ts` — No changes
- `src/review-service.ts` — No changes
- `src/storage.ts` — No changes
- `src/types.ts` — No changes

## 6. Dependencies

- `vite-plugin-pwa` — Vite plugin for PWA support (Workbox-based)
- `idb` — Lightweight IndexedDB wrapper for SW storage (optional, can use raw IndexedDB)
