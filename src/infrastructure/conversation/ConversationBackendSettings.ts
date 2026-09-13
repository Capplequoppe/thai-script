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
 * Every documented dev/e2e flow, and the default for a browser that has
 * never changed this setting, assumes the backend runs on the same
 * machine (see `backend/README.md`).
 */
export const DEFAULT_CONVERSATION_BACKEND_URL = "http://localhost:8000";

/**
 * `authToken` is optional in storage (blobs written before it existed have
 * none) — an absent or empty token means "send no auth header", the same
 * no-op state the backend's own `CONVERSATION_BACKEND_TOKEN` check treats
 * an unset env var as.
 */
interface StoredConversationBackendSettings {
	readonly baseUrl: string;
	readonly authToken?: string;
}

const isStoredConversationBackendSettings: JsonShapeGuard<
	StoredConversationBackendSettings
> = (value): value is StoredConversationBackendSettings => {
	if (value === null || typeof value !== "object") return false;
	const { baseUrl, authToken } = value as Record<string, unknown>;
	if (typeof baseUrl !== "string" || baseUrl.trim().length === 0) return false;
	return authToken === undefined || typeof authToken === "string";
};

const store: JsonStore<StoredConversationBackendSettings> =
	new LocalStorageJsonStore(
		CONVERSATION_BACKEND_URL_STORAGE_KEY,
		isStoredConversationBackendSettings,
	);

function load(): StoredConversationBackendSettings {
	const result = store.load();
	return result.status === "ok"
		? result.value
		: { baseUrl: DEFAULT_CONVERSATION_BACKEND_URL, authToken: "" };
}

/**
 * Where this browser should send conversation-practice requests.
 * `DEFAULT_CONVERSATION_BACKEND_URL` whenever nothing has been saved yet —
 * a fresh browser, `localStorage` unavailable, or a corrupt/invalid stored
 * value — never throws and never returns a blank string.
 */
export function getConversationBackendUrl(): string {
	return load().baseUrl;
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
 * Persists `baseUrl` for future requests, preserving whatever auth token
 * is already saved. A blank/whitespace-only value resets to the default
 * rather than saving something `getConversationBackendUrl` would just
 * reject back to the default anyway.
 */
export function setConversationBackendUrl(baseUrl: string): void {
	const trimmed = baseUrl.trim();
	const current = load();
	store.save({
		baseUrl: trimmed.length > 0 ? trimmed : DEFAULT_CONVERSATION_BACKEND_URL,
		authToken: current.authToken ?? "",
	});
}

/**
 * Persists the auth token for future requests, preserving the already
 * saved backend URL. An empty string is a real, valid state (no token
 * sent), not rejected back to some default.
 */
export function setConversationBackendToken(authToken: string): void {
	const current = load();
	store.save({ baseUrl: current.baseUrl, authToken: authToken.trim() });
}
