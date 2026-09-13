import type { JsonShapeGuard, JsonStore } from "../persistence/JsonStore";
import { LocalStorageJsonStore } from "../persistence/JsonStore";

/**
 * Deliberately its own key, never a field on `thai-srs-state`: this is a
 * device/network-local pointer to where *this browser* should look for a
 * conversation backend, not learner progress — it must survive "Reset All
 * Progress" and never travel inside an exported/imported progress file
 * (importing a friend's export would otherwise silently repoint your app
 * at their LAN backend). Mirrors `StorageGameHistoryRepository`'s own key,
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

interface ConversationBackendSettings {
	readonly baseUrl: string;
}

const isConversationBackendSettings: JsonShapeGuard<
	ConversationBackendSettings
> = (value): value is ConversationBackendSettings => {
	if (value === null || typeof value !== "object") return false;
	const { baseUrl } = value as Record<string, unknown>;
	return typeof baseUrl === "string" && baseUrl.trim().length > 0;
};

const store: JsonStore<ConversationBackendSettings> = new LocalStorageJsonStore(
	CONVERSATION_BACKEND_URL_STORAGE_KEY,
	isConversationBackendSettings,
);

/**
 * Where this browser should send conversation-practice requests.
 * `DEFAULT_CONVERSATION_BACKEND_URL` whenever nothing has been saved yet —
 * a fresh browser, `localStorage` unavailable, or a corrupt/invalid stored
 * value — never throws and never returns a blank string.
 */
export function getConversationBackendUrl(): string {
	const result = store.load();
	return result.status === "ok"
		? result.value.baseUrl
		: DEFAULT_CONVERSATION_BACKEND_URL;
}

/**
 * Persists `baseUrl` for future requests. A blank/whitespace-only value
 * resets to the default rather than saving something
 * `getConversationBackendUrl` would just reject back to the default
 * anyway.
 */
export function setConversationBackendUrl(baseUrl: string): void {
	const trimmed = baseUrl.trim();
	store.save({
		baseUrl: trimmed.length > 0 ? trimmed : DEFAULT_CONVERSATION_BACKEND_URL,
	});
}
