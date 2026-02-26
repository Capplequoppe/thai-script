/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "thai-srs-v1";
const ASSETS_TO_CACHE = [
  "/thai-script/",
  "/thai-script/index.html",
  "/thai-script/manifest.json",
];

// --- Caching ---

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

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

export {};
