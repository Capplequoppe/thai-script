import type { JsonShapeGuard, JsonStore } from "../persistence/JsonStore";
import { LocalStorageJsonStore } from "../persistence/JsonStore";

/**
 * Deliberately its own key, never a field on `thai-srs-state`: this is a
 * device/network-local pointer to where *this browser* should look for a
 * conversation backend, not learner progress — it must survive "Reset All
 * Progress" and never travel inside an exported/imported progress file
 * (importing a friend's export would otherwise silently repoint your app
 * at their LAN backend, or leak an auth token into a progress file the
 * learner might share). Mirrors `StorageGameHistoryRepository`'s own key,
 * for the same reason.
 */
export const CONVERSATION_BACKEND_URL_STORAGE_KEY =
	"thai-conversation-backend-url";

/**
 * The same-machine address every documented dev/e2e flow assumes
 * (`backend/README.md`) — used whenever nothing else overrides it.
 */
const SAME_MACHINE_BACKEND_URL = "http://localhost:8000";

/**
 * The default for a browser that has never changed this setting.
 * `VITE_CONVERSATION_BACKEND_URL` is baked in at build time by
 * `.github/workflows/deploy-thai-srs.yml`, from a repo variable
 * `backend/scripts/run_with_tunnel.sh` keeps current — so the *deployed*
 * PWA can default straight to whatever Cloudflare Tunnel URL the backend
 * machine is currently running, with no per-device Settings visit
 * required. Local dev never sets this env var, so it falls back to the
 * same-machine address exactly as before this existed.
 *
 * Deliberately just the address, never the auth token: this value ships
 * inside a public static bundle (GitHub Pages) that anyone can read the
 * source of, so nothing that needs to stay secret can ever live here —
 * `getConversationBackendToken` has no build-time counterpart for
 * exactly that reason, and stays something each device enters once, by
 * hand, into Settings.
 */
export const DEFAULT_CONVERSATION_BACKEND_URL: string =
	import.meta.env.VITE_CONVERSATION_BACKEND_URL?.trim() ||
	SAME_MACHINE_BACKEND_URL;

/**
 * `baseUrl` absent means "no override — follow `DEFAULT_CONVERSATION_BACKEND_URL`,
 * including whatever it becomes after a future redeploy", not "the default
 * happened to be saved". Storing a concrete copy of today's default would
 * freeze a device onto it forever, defeating the whole point of a
 * CI-updated default: a device that has never touched this setting (or
 * has explicitly reset it) must keep tracking the *live* default across
 * reloads, not a snapshot from whenever it last saved. `authToken` is
 * likewise optional (blobs written before it existed have none) — absent
 * or empty means "send no auth header", the same no-op state the
 * backend's own `CONVERSATION_BACKEND_TOKEN` check treats an unset env
 * var as.
 */
interface StoredConversationBackendSettings {
	readonly baseUrl?: string;
	readonly authToken?: string;
}

const isStoredConversationBackendSettings: JsonShapeGuard<
	StoredConversationBackendSettings
> = (value): value is StoredConversationBackendSettings => {
	if (value === null || typeof value !== "object") return false;
	const { baseUrl, authToken } = value as Record<string, unknown>;
	if (
		baseUrl !== undefined &&
		(typeof baseUrl !== "string" || baseUrl.trim().length === 0)
	) {
		return false;
	}
	return authToken === undefined || typeof authToken === "string";
};

const store: JsonStore<StoredConversationBackendSettings> =
	new LocalStorageJsonStore(
		CONVERSATION_BACKEND_URL_STORAGE_KEY,
		isStoredConversationBackendSettings,
	);

function load(): StoredConversationBackendSettings {
	const result = store.load();
	return result.status === "ok" ? result.value : {};
}

/**
 * Where this browser should send conversation-practice requests.
 * `DEFAULT_CONVERSATION_BACKEND_URL` whenever no override has been saved —
 * a fresh browser, `localStorage` unavailable, a corrupt/invalid stored
 * value, or an explicit `clearConversationBackendUrl()` — never throws
 * and never returns a blank string.
 */
export function getConversationBackendUrl(): string {
	return load().baseUrl ?? DEFAULT_CONVERSATION_BACKEND_URL;
}

/**
 * The raw saved override, or `null` when none exists — distinct from
 * `getConversationBackendUrl()`, which always resolves to *something*.
 * Settings UI uses this (not the resolved value) to decide what to show
 * in the address field: pre-filling it with today's resolved default
 * would make an unmodified "Save" silently freeze that value in as an
 * explicit override, defeating automatic tracking for a device that
 * never meant to opt out of it.
 */
export function getConversationBackendUrlOverride(): string | null {
	return load().baseUrl ?? null;
}

/**
 * The shared secret to send as `X-Conversation-Backend-Token` — an empty
 * string means "send nothing", the correct behavior against a backend
 * with no `CONVERSATION_BACKEND_TOKEN` configured (the same-machine/LAN
 * default). Only meaningful once the backend is reachable from outside a
 * trusted network (e.g. a Cloudflare Tunnel) and its own token is set —
 * see `backend/README.md`.
 */
export function getConversationBackendToken(): string {
	return load().authToken ?? "";
}

/**
 * Persists `baseUrl` as an explicit override, preserving whatever auth
 * token is already saved. A blank/whitespace-only value is the same as
 * `clearConversationBackendUrl()` — it removes the override rather than
 * freezing in whatever the default happens to be right now.
 */
export function setConversationBackendUrl(baseUrl: string): void {
	const trimmed = baseUrl.trim();
	const current = load();
	store.save({
		...(trimmed.length > 0 ? { baseUrl: trimmed } : {}),
		authToken: current.authToken ?? "",
	});
}

/**
 * Drops a saved URL override. After this, `getConversationBackendUrl()`
 * tracks `DEFAULT_CONVERSATION_BACKEND_URL` again on every call — so a
 * later redeploy that changes the compiled-in default reaches this
 * device on its next reload with no further action. Leaves the auth
 * token untouched: going back to the automatic address doesn't imply
 * the token that address needs has changed too.
 */
export function clearConversationBackendUrl(): void {
	setConversationBackendUrl("");
}

/**
 * Persists the auth token for future requests, preserving whatever
 * backend URL is already saved (an override, or none). An empty string
 * is a real, valid state (no token sent), not rejected back to anything.
 */
export function setConversationBackendToken(authToken: string): void {
	const current = load();
	store.save({
		...(current.baseUrl !== undefined ? { baseUrl: current.baseUrl } : {}),
		authToken: authToken.trim(),
	});
}
