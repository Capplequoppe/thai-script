# PWA + Scheduled Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert Thai SRS into an installable PWA with offline support and client-side scheduled review notifications.

**Architecture:** Use `vite-plugin-pwa` with `injectManifest` strategy for precaching + custom service worker logic. NotificationScheduler communicates with the SW via `postMessage`. SW stores due dates in IndexedDB and uses `setTimeout` for notification timing, with recovery on wake-up.

**Tech Stack:** vite-plugin-pwa, Workbox (via injectManifest), Notification API, IndexedDB, Service Worker API

---

### Task 1: Clean up stale tsconfig paths

**Files:**
- Modify: `tsconfig.json`

**Step 1: Remove stale paths alias and parent directory includes**

The `paths` alias `@services/*` points to `../*` and `include` references `../*.ts` — both are leftovers from the old monorepo structure. Remove them.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

**Step 2: Verify build still works**

Run: `pnpm build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: remove stale tsconfig paths from old monorepo"
```

---

### Task 2: Install vite-plugin-pwa

**Files:**
- Modify: `package.json`

**Step 1: Install the dependency**

Run: `pnpm add -D vite-plugin-pwa`

**Step 2: Verify installation**

Run: `pnpm ls vite-plugin-pwa`
Expected: Shows installed version

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add vite-plugin-pwa dependency"
```

---

### Task 3: Create PWA manifest and icons

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-192x192.png`
- Create: `public/icons/icon-512x512.png`
- Modify: `index.html`

**Step 1: Create manifest.json**

```json
{
  "name": "Thai SRS",
  "short_name": "Thai SRS",
  "description": "Learn the Thai alphabet with spaced repetition",
  "start_url": "/thai-script/",
  "scope": "/thai-script/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "icons": [
    {
      "src": "icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Step 2: Generate icons**

Generate simple Thai-themed icons (a Thai character on indigo background) at 192x192 and 512x512. Use a canvas script or any image tool. Place in `public/icons/`.

**Step 3: Add manifest link and theme-color meta to index.html**

Add inside `<head>`, after the viewport meta:

```html
<link rel="manifest" href="/thai-script/manifest.json" />
<meta name="theme-color" content="#4f46e5" />
<link rel="apple-touch-icon" href="/thai-script/icons/icon-192x192.png" />
```

**Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds, `dist/manifest.json` exists

**Step 5: Commit**

```bash
git add public/manifest.json public/icons/ index.html
git commit -m "feat: add PWA manifest and icons"
```

---

### Task 4: Configure vite-plugin-pwa with injectManifest

**Files:**
- Modify: `vite.config.ts`
- Create: `src/sw.ts`
- Modify: `src/main.tsx`

**Step 1: Update vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/thai-script/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: false,
      manifest: false,
      injectManifest: {
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
});
```

**Step 2: Create minimal service worker at src/sw.ts**

```typescript
/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "thai-srs-v1";
const ASSETS_TO_CACHE = [
  "/thai-script/",
  "/thai-script/index.html",
  "/thai-script/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});

export {};
```

**Step 3: Register the service worker in src/main.tsx**

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/thai-script/sw.js", {
    scope: "/thai-script/",
  });
}
```

**Step 4: Add TypeScript webworker lib for SW types**

Add to `tsconfig.json` under `compilerOptions`:

```json
"lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"]
```

Note: The SW file may need its own tsconfig or a `/// <reference>` directive. Verify the build handles it. If `tsc` complains about SW-specific types conflicting with DOM types, create a `src/tsconfig.sw.json` that extends the base and targets only `src/sw.ts`.

**Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds, `dist/sw.js` exists

**Step 6: Test locally**

Run: `pnpm preview`
Open browser, check DevTools > Application > Service Workers: SW should be registered.

**Step 7: Commit**

```bash
git add vite.config.ts src/sw.ts src/main.tsx tsconfig.json
git commit -m "feat: add service worker with offline caching"
```

---

### Task 5: Create NotificationScheduler service

**Files:**
- Create: `src/notification-scheduler.ts`
- Create: `src/notification-scheduler.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotificationScheduler } from "./notification-scheduler";

describe("NotificationScheduler", () => {
  let scheduler: NotificationScheduler;

  beforeEach(() => {
    scheduler = new NotificationScheduler();
  });

  describe("scheduleNext", () => {
    it("should send SCHEDULE_NOTIFICATION message to service worker", async () => {
      const mockController = {
        postMessage: vi.fn(),
      };
      Object.defineProperty(navigator, "serviceWorker", {
        value: { controller: mockController },
        configurable: true,
      });

      const dueDate = new Date(Date.now() + 60_000);
      scheduler.scheduleNext(dueDate, 5);

      expect(mockController.postMessage).toHaveBeenCalledWith({
        type: "SCHEDULE_NOTIFICATION",
        dueDate: dueDate.toISOString(),
        cardCount: 5,
      });
    });

    it("should not throw when service worker is not available", () => {
      Object.defineProperty(navigator, "serviceWorker", {
        value: { controller: null },
        configurable: true,
      });

      const dueDate = new Date(Date.now() + 60_000);
      expect(() => scheduler.scheduleNext(dueDate, 5)).not.toThrow();
    });
  });

  describe("cancel", () => {
    it("should send CANCEL_NOTIFICATION message to service worker", () => {
      const mockController = {
        postMessage: vi.fn(),
      };
      Object.defineProperty(navigator, "serviceWorker", {
        value: { controller: mockController },
        configurable: true,
      });

      scheduler.cancel();

      expect(mockController.postMessage).toHaveBeenCalledWith({
        type: "CANCEL_NOTIFICATION",
      });
    });
  });

  describe("requestPermission", () => {
    it("should return the notification permission state", async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue("granted");
      Object.defineProperty(globalThis, "Notification", {
        value: { requestPermission: mockRequestPermission, permission: "default" },
        configurable: true,
      });

      const result = await scheduler.requestPermission();
      expect(result).toBe("granted");
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/notification-scheduler.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
export class NotificationScheduler {
  scheduleNext(dueDate: Date, cardCount: number): void {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return;

    sw.postMessage({
      type: "SCHEDULE_NOTIFICATION",
      dueDate: dueDate.toISOString(),
      cardCount,
    });
  }

  cancel(): void {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return;

    sw.postMessage({ type: "CANCEL_NOTIFICATION" });
  }

  async requestPermission(): Promise<NotificationPermission> {
    return Notification.requestPermission();
  }

  get permission(): NotificationPermission {
    return Notification.permission;
  }

  get isSupported(): boolean {
    return "Notification" in globalThis && "serviceWorker" in navigator;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/notification-scheduler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/notification-scheduler.ts src/notification-scheduler.test.ts
git commit -m "feat: add NotificationScheduler service"
```

---

### Task 6: Add notification handling to service worker

**Files:**
- Modify: `src/sw.ts`

**Step 1: Add IndexedDB helper and message handler to sw.ts**

Add after the existing fetch listener:

```typescript
// --- IndexedDB helpers for notification state ---

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("thai-srs-sw", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("state");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredNotification(): Promise<{ dueDate: string; cardCount: number } | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readonly");
    const request = tx.objectStore("state").get("pendingNotification");
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function storeNotification(data: { dueDate: string; cardCount: number }): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put(data, "pendingNotification");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearNotification(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").delete("pendingNotification");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Notification scheduling ---

let notificationTimer: ReturnType<typeof setTimeout> | null = null;

async function showReviewNotification(cardCount: number): Promise<void> {
  await self.registration.showNotification("Thai SRS", {
    body: `You have ${cardCount} card${cardCount === 1 ? "" : "s"} due for review`,
    icon: "/thai-script/icons/icon-192x192.png",
    tag: "review-reminder",
  });
  await clearNotification();
}

async function scheduleNotification(dueDate: string, cardCount: number): Promise<void> {
  if (notificationTimer) {
    clearTimeout(notificationTimer);
    notificationTimer = null;
  }

  await storeNotification({ dueDate, cardCount });

  const delay = new Date(dueDate).getTime() - Date.now();

  if (delay <= 0) {
    await showReviewNotification(cardCount);
  } else {
    notificationTimer = setTimeout(() => {
      showReviewNotification(cardCount);
    }, delay);
  }
}

async function checkMissedNotification(): Promise<void> {
  const stored = await getStoredNotification();
  if (!stored) return;

  const delay = new Date(stored.dueDate).getTime() - Date.now();
  if (delay <= 0) {
    await showReviewNotification(stored.cardCount);
  }
}

// --- Message handler ---

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data?.type === "SCHEDULE_NOTIFICATION") {
    scheduleNotification(data.dueDate, data.cardCount);
  } else if (data?.type === "CANCEL_NOTIFICATION") {
    if (notificationTimer) {
      clearTimeout(notificationTimer);
      notificationTimer = null;
    }
    clearNotification();
  }
});

// --- Notification click handler ---

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/thai-script/") && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow("/thai-script/");
    })
  );
});
```

**Step 2: Add missed notification check to activate handler**

Update the existing `activate` listener to also call `checkMissedNotification()`:

```typescript
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      ),
      checkMissedNotification(),
    ])
  );
  self.clients.claim();
});
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/sw.ts
git commit -m "feat: add notification scheduling to service worker"
```

---

### Task 7: Create NotificationBanner component

**Files:**
- Create: `src/components/NotificationBanner.tsx`

**Step 1: Write the component**

```tsx
import { useCallback, useEffect, useState } from "react";
import { NotificationScheduler } from "../notification-scheduler";

const DISMISSED_KEY = "thai-srs-notification-banner-dismissed";

const scheduler = new NotificationScheduler();

export function NotificationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!scheduler.isSupported) return;
    if (scheduler.permission !== "default") return;
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;
    setVisible(true);
  }, []);

  const handleEnable = useCallback(async () => {
    const result = await scheduler.requestPermission();
    if (result === "granted" || result === "denied") {
      setVisible(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex items-start gap-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
          Enable notifications?
        </p>
        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
          Get reminded when cards are due for review.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleEnable}
          className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Enable
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-lg transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/NotificationBanner.tsx
git commit -m "feat: add notification permission banner component"
```

---

### Task 8: Integrate notification scheduling into AppContext

**Files:**
- Modify: `src/context/AppContext.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Step 1: Add notification scheduling to AppContext**

Add a `scheduleNotification` helper that reads the next review date and sends it to the SW. Call it after lesson completion, review completion, and on mount.

In `src/context/AppContext.tsx`, add after line 10 (`const reviewService = ...`):

```typescript
import { NotificationScheduler } from "../notification-scheduler";

const notificationScheduler = new NotificationScheduler();

function scheduleNextNotification() {
  if (notificationScheduler.permission !== "granted") return;
  const nextDate = reviewService.getNextReviewDate();
  const dueCount = reviewService.getNumDueCards();
  if (nextDate && dueCount > 0) {
    notificationScheduler.scheduleNext(nextDate, dueCount);
  } else if (nextDate) {
    // Cards exist but none due yet — schedule for next due date
    // Need to count how many will be due at that time (approximate with 1)
    notificationScheduler.scheduleNext(nextDate, 1);
  } else {
    notificationScheduler.cancel();
  }
}
```

Update the `wrap` function to also schedule notifications after state changes:

```typescript
const wrap = useCallback(
  <T,>(fn: () => T): T => {
    const result = fn();
    refresh();
    scheduleNextNotification();
    return result;
  },
  [refresh]
);
```

Add a `useEffect` in the `AppProvider` to schedule on mount and on visibility change:

```typescript
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

// Inside AppProvider, after the useMemo:
useEffect(() => {
  scheduleNextNotification();

  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      refresh();
      scheduleNextNotification();
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);
  return () => document.removeEventListener("visibilitychange", handleVisibility);
}, [refresh]);
```

**Step 2: Add NotificationBanner to Dashboard**

In `src/pages/Dashboard.tsx`, add the banner at the top of the content area, after the heading:

```tsx
import { NotificationBanner } from "../components/NotificationBanner";

// Inside the return, after the closing </div> of the heading section (line 19):
<NotificationBanner />
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 4: Test locally**

Run: `pnpm preview`
- Open the app, notification banner should appear on Dashboard
- Click "Enable", browser permission prompt should appear
- After granting permission, banner should disappear
- Complete a lesson or review, check DevTools > Application > Service Workers — message should be sent

**Step 5: Run all existing tests**

Run: `pnpm vitest run`
Expected: All tests pass (existing tests should be unaffected)

**Step 6: Commit**

```bash
git add src/context/AppContext.tsx src/pages/Dashboard.tsx
git commit -m "feat: integrate notification scheduling into app lifecycle"
```

---

### Task 9: Create index.css

**Files:**
- Create: `src/index.css`

**Step 1: Create the CSS file**

The build currently fails because `src/main.tsx` imports `./index.css` which doesn't exist. Create it with the Tailwind import:

```css
@import "tailwindcss";
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add index.css with Tailwind import"
```

---

### Task 10: End-to-end verification

**Step 1: Run full build**

Run: `pnpm build`
Expected: Build succeeds, `dist/` contains `sw.js`, `manifest.json`, `icons/`

**Step 2: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass

**Step 3: Test PWA locally**

Run: `pnpm preview`
Check in browser DevTools:
- Application > Manifest: Valid manifest shown
- Application > Service Workers: SW registered and active
- Application > Cache Storage: Assets cached
- Lighthouse > PWA audit: Passes installability checks

**Step 4: Commit any remaining changes and push**

```bash
git add -A
git commit -m "feat: complete PWA with offline support and review notifications"
git push
```
