/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// Bumped from v2: `activate` deletes every cache whose key is not
// CACHE_NAME, so the bump also evicts the unbounded v2 cache that the old
// always-revalidate fetch handler had been growing.
const CACHE_NAME = "thai-srs-v3";
const ASSETS_TO_CACHE = [
	"/thai-script/",
	"/thai-script/index.html",
	"/thai-script/manifest.json",
	"/thai-script/icons/icon-192x192.png",
	"/thai-script/icons/icon-512x512.png",
];

// --- Caching ---

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		Promise.all([
			caches
				.keys()
				.then((keys) =>
					Promise.all(
						keys
							.filter((key) => key !== CACHE_NAME)
							.map((key) => caches.delete(key)),
					),
				),
			checkMissedNotification(),
		]),
	);
	self.clients.claim();
});

/**
 * Assets whose bytes never change without the URL changing: Vite's
 * hash-named `/assets/*` bundles, and the generated vocabulary media. These
 * are served cache-first with **no network request at all** on a hit.
 *
 * The previous handler built `fetch(request)` before testing the cache, so
 * every asset was re-downloaded and re-written to the cache on every hit
 * even when the cached copy was already being returned. On a phone that
 * kept the radio in its high-power tail state continuously through a review
 * session — the dominant battery cost of the old handler — and rewrote
 * identical bytes to flash on every card.
 */
const IMMUTABLE_ASSET =
	/(?:\/assets\/)|\.(?:js|css|png|jpe?g|webp|gif|svg|ico|woff2?|mp3|wav|ogg|m4a)$/i;

/** Media served through Range requests; far too large to hold in the cache. */
const NEVER_CACHE = /\.(?:mp4|webm|mov|m3u8)$/i;

function putInCache(request: Request, response: Response): void {
	// Only full, final 200s are storable: `cache.put` rejects 206 partials
	// and opaque responses, and an unhandled rejection here would surface as
	// a service-worker error on every media seek.
	if (response.status !== 200 || response.type === "opaque") return;
	const clone = response.clone();
	caches
		.open(CACHE_NAME)
		.then((cache) => cache.put(request, clone))
		.catch(() => {});
}

/** Cached copy if there is one, otherwise the network (and cache the result). */
async function cacheFirst(request: Request): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	putInCache(request, response);
	return response;
}

/** Cached copy immediately, with a background refresh for the next load. */
async function staleWhileRevalidate(request: Request): Promise<Response> {
	const cached = await caches.match(request);
	const network = fetch(request)
		.then((response) => {
			putInCache(request, response);
			return response;
		})
		.catch((error) => {
			if (cached) return cached;
			throw error;
		});
	return cached ?? network;
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;

	const url = new URL(request.url);
	// Leave anything we cannot meaningfully cache to the browser: other
	// origins (the conversation backend on :8000), non-http schemes,
	// Range requests (audio/video seeking), and the lesson videos.
	if (url.origin !== self.location.origin) return;
	if (url.protocol !== "http:" && url.protocol !== "https:") return;
	if (request.headers.has("range")) return;
	if (NEVER_CACHE.test(url.pathname)) return;

	event.respondWith(
		IMMUTABLE_ASSET.test(url.pathname)
			? cacheFirst(request)
			: staleWhileRevalidate(request),
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

async function getStoredNotification(): Promise<{
	dueDate: string;
	cardCount: number;
} | null> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction("state", "readonly");
		const request = tx.objectStore("state").get("pendingNotification");
		request.onsuccess = () => resolve(request.result ?? null);
		request.onerror = () => reject(request.error);
	});
}

async function storeNotification(data: {
	dueDate: string;
	cardCount: number;
}): Promise<void> {
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

/**
 * True while at least one window running the app is on screen.
 *
 * A reminder exists to pull the learner back to an app they are not looking
 * at. Firing one over a live review session is pure interruption — on iOS it
 * costs a sound and a banner across the top of the card being answered — and
 * the due count it would report is already rendered on the page behind it.
 */
async function hasVisibleClient(): Promise<boolean> {
	const clients = await self.clients.matchAll({
		type: "window",
		includeUncontrolled: true,
	});
	return clients.some((client) => client.visibilityState === "visible");
}

async function showReviewNotification(cardCount: number): Promise<void> {
	if (await hasVisibleClient()) {
		// Drop it rather than defer it: the app reschedules from the live card
		// state on every rating, so the next reminder is already being armed.
		await clearNotification();
		return;
	}

	await self.registration.showNotification("Thai SRS", {
		body: `You have ${cardCount} card${cardCount === 1 ? "" : "s"} due for review`,
		icon: "/thai-script/icons/icon-192x192.png",
		tag: "review-reminder",
	});
	await clearNotification();
}

async function scheduleNotification(
	dueDate: string,
	cardCount: number,
): Promise<void> {
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
		}),
	);
});

export {};
